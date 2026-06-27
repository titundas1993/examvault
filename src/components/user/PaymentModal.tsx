"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { createPaymentOrder, verifyPayment } from "@/lib/services/firestore";
import { db } from "@/lib/firebase";
import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Shield, CreditCard, Loader2, CheckCircle, Crown } from "lucide-react";

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
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
  const lang = useAppStore((s) => s.language);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay checkout script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => setError("Failed to load payment gateway");
      document.body.appendChild(script);
    } else if (typeof window !== "undefined" && window.Razorpay) {
      setScriptLoaded(true);
    }
  }, []);

  const handleClose = () => {
    if (!loading) {
      setShowPaymentModal(false);
      setPaymentModalData(null);
      setError(null);
      setSuccess(false);
    }
  };

  const handlePayment = async () => {
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
      // Step 1: Create order on server
      const order = await createPaymentOrder({
        amount: paymentModalData.amount,
        userId: firebaseUser.uid,
        planId: paymentModalData.planId,
        planName: paymentModalData.planName,
        type: paymentModalData.type,
      });

      if (!order.orderId) {
        throw new Error("Failed to create order");
      }

      // Step 2: Open Razorpay checkout with all payment methods enabled
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "ExamVault",
        description: paymentModalData.planName,
        image: "/logo.png",
        order_id: order.orderId,
        // Enable all payment methods for Indian users
        method: {
          upi: true,           // UPI (GPay, PhonePe, Paytm, etc.)
          card: true,          // Credit/Debit cards
          netbanking: true,    // Net Banking
          wallet: true,        // Paytm, Amazon Pay, etc.
          emi: false,          // EMI (disable for small amounts)
          paylater: false,     // PayLater (disable)
        },
        // UPI intent flow — opens UPI apps directly on mobile
        upi: {
          flow: "intent",      // "intent" opens UPI apps directly on mobile
        },
        // Configure which wallets to show
        wallets: [
          "paytm", "amazonpay", "phonepe", "freecharge", "mobikwik", "olamoney"
        ],
        handler: async function (response: any) {
          // Step 3: Verify payment on server
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

              // If server couldn't save to Firestore (no Admin SDK), save via client SDK
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

              // Update subscription state in store
              if (verification.premiumExpiry) {
                setSubscription({
                  isPremium: true,
                  premiumExpiry: verification.premiumExpiry,
                  planName: verification.planName || paymentModalData.planName,
                });
              }
              // If one-time purchase, add to purchased items
              if (paymentModalData.type === "one_time") {
                const currentPurchased = useAppStore.getState().subscription.purchasedItemIds;
                setSubscription({
                  purchasedItemIds: [...currentPurchased, paymentModalData.planId],
                });
              }
              // Auto close after 2 seconds
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
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        console.error("Payment failed:", response.error);
        setError(
          `Payment failed: ${response.error.description || "Unknown error"}`
        );
        setLoading(false);
      });
      razorpay.open();
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "Something went wrong");
      setLoading(false);
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
                      <span className="text-gray-400 text-sm">
                        /period
                      </span>
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
                  disabled={loading || !scriptLoaded}
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
                  By proceeding, you agree to our Terms of Service. Payments are
                  processed securely via Razorpay.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
