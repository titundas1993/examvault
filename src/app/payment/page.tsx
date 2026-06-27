"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, ArrowLeft, Shield, Lock, CreditCard } from "lucide-react";

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

function PaymentPageContent() {
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"loading" | "checkout" | "success" | "failed" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [planName, setPlanName] = useState("");

  useEffect(() => {
    initPayment();
  }, []);

  const initPayment = async () => {
    try {
      // Get payment details from URL params
      const orderId = searchParams.get("orderId");
      const keyId = searchParams.get("keyId");
      const amount = searchParams.get("amount");
      const currency = searchParams.get("currency") || "INR";
      const pName = searchParams.get("planName") || "Premium Plan";
      const userName = searchParams.get("userName") || "";
      const userEmail = searchParams.get("userEmail") || "";
      const userPhone = searchParams.get("userPhone") || "";
      const userId = searchParams.get("userId") || "";
      const planId = searchParams.get("planId") || "";
      const type = searchParams.get("type") || "one_time";

      setPlanName(decodeURIComponent(pName));

      if (!orderId || !keyId || !amount) {
        setStatus("error");
        setErrorMsg("Missing payment details. Please go back to the app and try again.");
        return;
      }

      // Load Razorpay checkout script
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load payment gateway"));
          document.body.appendChild(script);
        });
      }

      // Open Razorpay checkout — this runs in Chrome, so UPI intent/collect both work!
      const options: any = {
        key: keyId,
        amount: parseInt(amount),
        currency,
        name: "ExamVault",
        description: decodeURIComponent(pName),
        image: "/logo.png",
        order_id: orderId,
        // UPI intent works in Chrome — GPay, PhonePe, BHIM all supported
        upi: {
          flow: "intent",
        },
        prefill: {
          name: decodeURIComponent(userName),
          email: decodeURIComponent(userEmail),
          contact: decodeURIComponent(userPhone),
        },
        notes: {
          userId,
          planId,
        },
        theme: {
          color: "#1e3a5f",
        },
        handler: async function (response: any) {
          try {
            // Verify payment on server
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId,
                planId,
                planName: decodeURIComponent(pName),
                amount: parseFloat(amount) / 100,
                type,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.verified) {
              setStatus("success");

              // Try to save to Firestore via client SDK if server couldn't (no Admin SDK)
              if (verifyData._saveToFirestore) {
                try {
                  const { db } = await import("@/lib/firebase");
                  const { doc, collection, setDoc, serverTimestamp } = await import("firebase/firestore");

                  const payRef = doc(collection(db, "payments"));
                  await setDoc(payRef, {
                    ...verifyData._paymentData,
                    id: payRef.id,
                    createdAt: serverTimestamp(),
                  });

                  if (verifyData._subscriptionData) {
                    const subRef = doc(collection(db, "subscriptions"));
                    await setDoc(subRef, {
                      ...verifyData._subscriptionData,
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
                      itemName: decodeURIComponent(pName),
                      amount: parseFloat(amount) / 100,
                      status: "active",
                      purchasedAt: serverTimestamp(),
                    });
                  }
                } catch (fsErr) {
                  console.error("Client-side Firestore save error:", fsErr);
                }
              }
            } else {
              setStatus("failed");
              setErrorMsg(verifyData.error || "Payment verification failed");
            }
          } catch (verifyErr: any) {
            console.error("Verification error:", verifyErr);
            setStatus("failed");
            setErrorMsg("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function () {
            setStatus("error");
            setErrorMsg("Payment was cancelled.");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        console.error("Payment failed:", response.error);
        setStatus("failed");
        setErrorMsg(response.error.description || "Payment failed");
      });

      setStatus("checkout");
      razorpay.open();
    } catch (err: any) {
      console.error("Payment init error:", err);
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#1e3a5f] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-blue-800 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">ExamVault Payment</h3>
              <p className="text-white/60 text-xs">Secure checkout</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === "loading" && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-[#1e3a5f] animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Preparing payment...</p>
              <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
            </div>
          )}

          {status === "checkout" && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-[#1e3a5f] animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Payment in progress...</p>
              <p className="text-gray-400 text-sm mt-1">Complete the payment in the checkout window</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h4 className="text-xl font-bold text-[#1e3a5f] mb-2">Payment Successful!</h4>
              <p className="text-gray-500 text-sm mb-4">
                Your {planName} plan is now active.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <p className="text-green-700 text-sm font-medium">
                  You can now return to the ExamVault app. Your premium access is ready!
                </p>
              </div>
              <button
                onClick={() => {
                  // Try deep link back to app, fallback to instructions
                  window.location.href = "examvault://payment-success";
                  setTimeout(() => {
                    // If deep link didn't work, show instructions
                  }, 1000);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#EB6301] to-amber-500 text-white font-bold text-base shadow-lg"
              >
                Return to ExamVault
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Or simply switch back to the ExamVault app manually
              </p>
            </div>
          )}

          {status === "failed" && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h4 className="text-xl font-bold text-[#1e3a5f] mb-2">Payment Failed</h4>
              <p className="text-gray-500 text-sm mb-4">{errorMsg}</p>
              <button
                onClick={() => {
                  setStatus("loading");
                  initPayment();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#EB6301] to-amber-500 text-white font-bold text-base shadow-lg"
              >
                Try Again
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Return to the ExamVault app and try again
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h4 className="text-xl font-bold text-[#1e3a5f] mb-2">Payment Cancelled</h4>
              <p className="text-gray-500 text-sm mb-4">{errorMsg || "No payment was processed."}</p>
              <button
                onClick={() => {
                  setStatus("loading");
                  initPayment();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#EB6301] to-amber-500 text-white font-bold text-base shadow-lg"
              >
                Try Again
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Return to the ExamVault app and try again
              </p>
            </div>
          )}

          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> Secure
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" /> SSL Encrypted
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Razorpay
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#1e3a5f] flex items-center justify-center">
          <div className="text-white text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p>Loading payment...</p>
          </div>
        </div>
      }
    >
      <PaymentPageContent />
    </Suspense>
  );
}
