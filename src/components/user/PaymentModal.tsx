"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { createPaymentOrder, verifyPayment } from "@/lib/services/firestore";
import { db } from "@/lib/firebase";
import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Shield, CreditCard, Loader2, CheckCircle, Crown } from "lucide-react";

// Extend Window interface
declare global {
  interface Window {
    Razorpay: any;
    AndroidBridge?: {
      onActionComplete: (actionType: string) => void;
      onNavigate: () => void;
      isNetworkAvailable: () => boolean;
      startPayment?: (
        keyId: string, orderId: string, amount: string,
        currency: string, planName: string, userName: string,
        userEmail: string, userPhone: string,
        userId: string, planId: string, type: string
      ) => void;
      openInBrowser?: (url: string) => void;
    };
    __EV_ANDROID_WEBVIEW?: boolean;
    __EV_WEBVIEW?: boolean;
    __EV_PAYMENT_SUCCESS?: (
      razorpayPaymentId: string, razorpayOrderId: string,
      razorpaySignature: string, userId: string, planId: string,
      planName: string, amount: number, type: string
    ) => void;
    __EV_PAYMENT_ERROR?: (errorMsg: string) => void;
  }
}

function isAndroidWebView(): boolean {
  if (typeof window === "undefined") return false;
  if (window.__EV_ANDROID_WEBVIEW || window.__EV_WEBVIEW) return true;
  return /wv/.test(navigator.userAgent);
}

export default function PaymentModal() {
  const {
    showPaymentModal,
    setShowPaymentModal,
    paymentModalData,
    setPaymentModalData,
    user,
    firebaseUser,
    setSubscription,
    setView,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const inWebView = isAndroidWebView();
  const hasNativeSDK = inWebView && typeof window !== "undefined" && !!window.AndroidBridge?.startPayment;

  // Load Razorpay checkout script (only for browser flow, not native SDK)
  useEffect(() => {
    if (!inWebView && typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => setError("Failed to load payment gateway");
      document.body.appendChild(script);
    } else if (typeof window !== "undefined" && window.Razorpay) {
      setScriptLoaded(true);
    }
  }, [inWebView]);

  // Register native payment callbacks (called from MainActivity.java)
  useEffect(() => {
    if (!inWebView) return;

    // Success callback — called by MainActivity.onPaymentSuccess()
    window.__EV_PAYMENT_SUCCESS = async (
      razorpayPaymentId: string,
      razorpayOrderId: string,
      razorpaySignature: string,
      userId: string,
      planId: string,
      planName: string,
      amount: number,
      type: string
    ) => {
      console.log("Native payment success!", razorpayPaymentId);

      try {
        const verification = await verifyPayment({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
          userId,
          planId,
          planName,
          amount,
          type,
        });

        if (verification.verified) {
          setSuccess(true);
          setLoading(false);

          // Save to Firestore if server couldn't
          if (verification._saveToFirestore && verification._paymentData) {
            try {
              const payRef = doc(collection(db, "payments"));
              await setDoc(payRef, {
                ...verification._paymentData,
                id: payRef.id,
                createdAt: serverTimestamp(),
              });

              if (verification._subscriptionData) {
                const subRef = doc(collection(db, "subscriptions"));
                await setDoc(subRef, {
                  ...verification._subscriptionData,
                  id: subRef.id,
                  autoRenew: false,
                  createdAt: serverTimestamp(),
                });
              }

              if (type === "one_time") {
                const purchaseRef = doc(collection(db, "purchases"));
                await setDoc(purchaseRef, {
                  id: purchaseRef.id,
                  userId,
                  itemId: planId,
                  itemType: "test",
                  itemName: planName,
                  amount,
                  status: "active",
                  purchasedAt: serverTimestamp(),
                });
              }
            } catch (fsErr) {
              console.error("Client-side Firestore save error:", fsErr);
            }
          }

          // Update subscription state — always set isPremium for subscription type
          // For one_time purchases, add to purchasedItemIds
          const storeUpdates: any = {};

          if (verification.premiumExpiry) {
            storeUpdates.isPremium = true;
            storeUpdates.premiumExpiry = verification.premiumExpiry;
            storeUpdates.planName = verification.planName || planName;
          } else if (type === "subscription") {
            // Subscription verified but no premiumExpiry returned (native SDK flow)
            // Still mark as premium — server saved the subscription data
            storeUpdates.isPremium = true;
            storeUpdates.planName = planName;
          }

          if (type === "one_time") {
            const currentPurchased = useAppStore.getState().subscription.purchasedItemIds;
            storeUpdates.purchasedItemIds = [...currentPurchased, planId];
          }

          if (Object.keys(storeUpdates).length > 0) {
            setSubscription(storeUpdates);
          }

          // Also refresh subscription status from server to ensure consistency
          if (firebaseUser) {
            try {
              const freshStatus = await checkSubscriptionStatus(firebaseUser.uid);
              if (freshStatus.isPremium) {
                setSubscription({
                  isPremium: true,
                  premiumExpiry: freshStatus.premiumExpiry,
                  planName: freshStatus.planName,
                  purchasedItemIds: freshStatus.purchasedItems?.map((p: any) => p.itemId) ||
                    useAppStore.getState().subscription.purchasedItemIds,
                });
              }
            } catch (refreshErr) {
              console.error("Subscription refresh error:", refreshErr);
            }
          }

          setTimeout(() => {
            handleClose();
            setView("home");
          }, 2000);
        } else {
          setError("Payment verification failed. Please contact support.");
          setLoading(false);
        }
      } catch (verifyErr: any) {
        console.error("Verification error:", verifyErr);
        setError("Payment verification failed. Please contact support.");
        setLoading(false);
      }
    };

    // Error callback — called by MainActivity.onPaymentError()
    window.__EV_PAYMENT_ERROR = (errorMsg: string) => {
      console.error("Native payment error:", errorMsg);
      setError(errorMsg || "Payment failed");
      setLoading(false);
    };

    return () => {
      window.__EV_PAYMENT_SUCCESS = undefined as any;
      window.__EV_PAYMENT_ERROR = undefined as any;
    };
  }, [inWebView]);

  const handleClose = () => {
    if (!loading) {
      setShowPaymentModal(false);
      setPaymentModalData(null);
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  };

  // ==================== Native SDK Payment (Android WebView) ====================
  const handleNativePayment = async () => {
    if (!paymentModalData || !user || !firebaseUser) {
      setError("Please login first");
      return;
    }

    if (!window.AndroidBridge?.startPayment) {
      setError("Payment not available. Please update the app.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create order on server
      const order = await createPaymentOrder({
        amount: paymentModalData.amount,
        userId: firebaseUser.uid,
        planId: paymentModalData.planId,
        planName: paymentModalData.planName,
        type: paymentModalData.type,
      });

      if (!order.orderId) {
        throw new Error(order.error || "Failed to create order");
      }

      console.log("Native Razorpay payment — Order:", order.orderId, "Mode:", order._mode);

      // Step 2: Call native Razorpay SDK via JS Bridge
      window.AndroidBridge.startPayment(
        order.keyId,
        order.orderId,
        order.amount.toString(), // in paise
        order.currency || "INR",
        paymentModalData.planName,
        user.name || "",
        user.email || "",
        (user as any)?.phone || firebaseUser?.phoneNumber || "",
        firebaseUser.uid,
        paymentModalData.planId,
        paymentModalData.type
      );

      // Loading stays true — will be cleared by __EV_PAYMENT_SUCCESS or __EV_PAYMENT_ERROR callbacks

    } catch (err: any) {
      console.error("Native payment error:", err);
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  // ==================== Browser: Open Razorpay inline ====================
  const handleBrowserPayment = async () => {
    if (!paymentModalData || !user || !firebaseUser) {
      setError("Please login first");
      return;
    }

    if (!scriptLoaded) {
      setError("Payment gateway is loading. Please wait...");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const order = await createPaymentOrder({
        amount: paymentModalData.amount,
        userId: firebaseUser.uid,
        planId: paymentModalData.planId,
        planName: paymentModalData.planName,
        type: paymentModalData.type,
      });

      if (!order.orderId) {
        throw new Error(order.error || "Failed to create order");
      }

      console.log("Razorpay mode:", order._mode);

      const options: any = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "ExamVault",
        description: paymentModalData.planName,
        image: "/logo.png",
        order_id: order.orderId,
        prefill: {
          name: user.name || "",
          email: user.email || "",
          contact: (user as any)?.phone || firebaseUser?.phoneNumber || "",
        },
        notes: {
          userId: firebaseUser.uid,
          planId: paymentModalData.planId,
        },
        theme: {
          color: "#1e3a5f",
        },
        upi: {
          flow: "intent",
        },
        handler: async function (response: any) {
          try {
            const verification = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: firebaseUser.uid,
              planId: paymentModalData.planId,
              planName: paymentModalData.planName,
              amount: paymentModalData.amount,
              type: paymentModalData.type,
            });

            if (verification.verified) {
              setSuccess(true);

              if (verification._saveToFirestore && verification._paymentData) {
                try {
                  const payRef = doc(collection(db, "payments"));
                  await setDoc(payRef, {
                    ...verification._paymentData,
                    id: payRef.id,
                    createdAt: serverTimestamp(),
                  });

                  if (verification._subscriptionData) {
                    const subRef = doc(collection(db, "subscriptions"));
                    await setDoc(subRef, {
                      ...verification._subscriptionData,
                      id: subRef.id,
                      autoRenew: false,
                      createdAt: serverTimestamp(),
                    });
                  }

                  if (paymentModalData.type === "one_time") {
                    const purchaseRef = doc(collection(db, "purchases"));
                    await setDoc(purchaseRef, {
                      id: purchaseRef.id,
                      userId: firebaseUser.uid,
                      itemId: paymentModalData.planId,
                      itemType: "test",
                      itemName: paymentModalData.planName,
                      amount: paymentModalData.amount,
                      status: "active",
                      purchasedAt: serverTimestamp(),
                    });
                  }
                } catch (fsErr) {
                  console.error("Client-side Firestore save error:", fsErr);
                }
              }

              if (verification.premiumExpiry) {
                setSubscription({
                  isPremium: true,
                  premiumExpiry: verification.premiumExpiry,
                  planName: verification.planName || paymentModalData.planName,
                });
              } else if (paymentModalData.type === "subscription") {
                // Subscription verified but no premiumExpiry — still mark as premium
                setSubscription({
                  isPremium: true,
                  planName: paymentModalData.planName,
                });
              }
              if (paymentModalData.type === "one_time") {
                const currentPurchased = useAppStore.getState().subscription.purchasedItemIds;
                setSubscription({
                  purchasedItemIds: [...currentPurchased, paymentModalData.planId],
                });
              }

              // Refresh subscription status from server for consistency
              if (firebaseUser) {
                checkSubscriptionStatus(firebaseUser.uid).then((freshStatus) => {
                  if (freshStatus.isPremium) {
                    setSubscription({
                      isPremium: true,
                      premiumExpiry: freshStatus.premiumExpiry,
                      planName: freshStatus.planName,
                      purchasedItemIds: freshStatus.purchasedItems?.map((p: any) => p.itemId) ||
                        useAppStore.getState().subscription.purchasedItemIds,
                    });
                  }
                }).catch(console.error);
              }
              setTimeout(() => {
                handleClose();
                setView("home");
              }, 2000);
            } else {
              setError("Payment verification failed. Please contact support.");
            }
          } catch (verifyErr: any) {
            console.error("Verification error:", verifyErr);
            setError("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        console.error("Payment failed:", response.error);
        setError(`Payment failed: ${response.error.description || "Unknown error"}`);
        setLoading(false);
      });
      razorpay.open();
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  // Unified payment handler
  const handlePayment = () => {
    if (hasNativeSDK) {
      handleNativePayment();
    } else {
      handleBrowserPayment();
    }
  };

  if (!showPaymentModal || !paymentModalData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-ev-navy to-blue-800 p-5 relative">
            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-ev-gold/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-ev-gold" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Premium Access</h3>
                <p className="text-white/60 text-xs">Unlock all features</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {success ? (
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                >
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-ev-green" />
                  </div>
                </motion.div>
                <h4 className="text-xl font-black text-ev-navy mb-2">
                  Payment Successful!
                </h4>
                <p className="text-gray-500 text-sm">
                  You now have premium access. Enjoy!
                </p>
              </div>
            ) : (
              <>
                {/* Plan Details */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-ev-navy">
                      {paymentModalData.planName}
                    </span>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-ev-gold-light text-ev-gold">
                      {paymentModalData.type === "subscription"
                        ? "Subscription"
                        : "One-time"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ev-navy">
                      ₹{paymentModalData.amount}
                    </span>
                    {paymentModalData.type === "subscription" && (
                      <span className="text-gray-400 text-sm">/period</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-ev-green flex-shrink-0" />
                    <span>Access all premium mock tests</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-ev-green flex-shrink-0" />
                    <span>Detailed explanations & solutions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-ev-green flex-shrink-0" />
                    <span>Performance analytics & insights</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-ev-green flex-shrink-0" />
                    <span>Ad-free experience</span>
                  </div>
                </div>

                {/* Security badges */}
                <div className="flex items-center justify-center gap-4 mb-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Secure Payment
                  </span>
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" /> SSL Encrypted
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Razorpay
                  </span>
                </div>

                {/* Payment Methods */}
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Accepted Payment Methods</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">UPI</span>
                    <span className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">GPay</span>
                    <span className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">PhonePe</span>
                    <span className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">BHIM</span>
                    <span className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">Paytm</span>
                    <span className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">Card</span>
                    <span className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">Net Banking</span>
                    <span className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">Wallet</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Pay Button */}
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-base shadow-lg shadow-ev-orange/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay ₹{paymentModalData.amount}
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-gray-400 mt-3">
                  By proceeding, you agree to our Terms of Service. Payments are processed securely via Razorpay.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
