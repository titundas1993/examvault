import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Lazy Firebase Admin initialization - only when credentials are available
let adminDb: any = null;

function getAdminDb() {
  if (adminDb !== null) return adminDb;
  
  try {
    const { initializeApp, getApps, cert } = require("firebase-admin/app");
    const { getFirestore } = require("firebase-admin/firestore");
    
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!clientEmail || !privateKey) {
      console.warn("Firebase Admin credentials not configured - using client SDK fallback");
      return null;
    }
    
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || "examvault-7fba8",
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    }
    adminDb = getFirestore();
    return adminDb;
  } catch (e) {
    console.error("Firebase Admin init error:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      planId,
      planName,
      amount,
      type,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment verification fields" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || "";
    // Without the secret we cannot securely verify the payment. Refuse to mark
    // it as verified (fail-closed) and return a clear configuration error.
    if (!secret) {
      console.error("RAZORPAY_KEY_SECRET not configured - cannot verify payment signature.");
      return NextResponse.json(
        {
          error:
            "Payment verification is not configured (RAZORPAY_KEY_SECRET missing). Please contact support.",
        },
        { status: 500 }
      );
    }
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isVerified = expectedSignature === razorpay_signature;

    if (!isVerified) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    
    if (db) {
      // Save payment record to Firestore using Admin SDK
      const paymentRef = db.collection("payments").doc();
      const paymentData = {
        id: paymentRef.id,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        userId,
        planId: planId || "",
        planName: planName || "",
        amount,
        currency: "INR",
        type: type || "one_time",
        status: "captured",
        verified: true,
        createdAt: new Date().toISOString(),
      };
      await paymentRef.set(paymentData);

      // Update or create user subscription record
      if (type === "subscription" && planId) {
        // First check if plan exists in Firestore to get duration
        let durationDays = 30; // default
        const planDoc = await db.collection("plans").doc(planId).get();
        const planData = planDoc.exists ? planDoc.data() : null;
        
        if (planData?.durationDays) {
          durationDays = planData.durationDays;
        } else {
          // Fallback: determine duration from plan ID or name
          if (planId.includes("weekly") || planName?.toLowerCase().includes("week")) {
            durationDays = 7;
          } else if (planId.includes("yearly") || planName?.toLowerCase().includes("year") || planId.includes("annual")) {
            durationDays = 365;
          } else if (planId.includes("quarter") || planName?.toLowerCase().includes("quarter")) {
            durationDays = 90;
          }
        }

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);

        // Check for existing active subscription and extend it
        const existingSubQuery = await db
          .collection("subscriptions")
          .where("userId", "==", userId)
          .where("status", "==", "active")
          .limit(1)
          .get();

        let subId;
        if (!existingSubQuery.empty) {
          // Extend existing subscription
          const existingDoc = existingSubQuery.docs[0];
          const existingData = existingDoc.data();
          const existingEndDate = new Date(existingData.endDate);
          // If subscription is still active, extend from current end date; otherwise from now
          const baseDate = existingEndDate > startDate ? existingEndDate : startDate;
          const newEndDate = new Date(baseDate);
          newEndDate.setDate(newEndDate.getDate() + durationDays);

          await existingDoc.ref.update({
            planId,
            planName: planName || planData?.name || existingData.planName,
            endDate: newEndDate.toISOString(),
            razorpay_payment_id,
            updatedAt: startDate.toISOString(),
          });
          subId = existingDoc.id;
        } else {
          // Create new subscription
          const subRef = db.collection("subscriptions").doc();
          await subRef.set({
            id: subRef.id,
            userId,
            planId,
            planName: planName || planData?.name || "",
            razorpay_payment_id,
            status: "active",
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            autoRenew: false,
            createdAt: startDate.toISOString(),
          });
          subId = subRef.id;
        }

        // Update user profile with premium status
        const userQuery = await db
          .collection("users")
          .where("uid", "==", userId)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];
          const currentSub = existingSubQuery.empty ? endDate : (() => {
            const existingDoc = existingSubQuery.docs[0];
            const existingData = existingDoc.data();
            const existingEndDate = new Date(existingData.endDate);
            const baseDate = existingEndDate > startDate ? existingEndDate : startDate;
            const newEndDate = new Date(baseDate);
            newEndDate.setDate(newEndDate.getDate() + durationDays);
            return newEndDate;
          })();
          
          await userDoc.ref.update({
            isPremium: true,
            premiumExpiry: currentSub.toISOString(),
            subscriptionId: subId,
            planId,
          });
        }

        return NextResponse.json({
          verified: true,
          subscriptionId: subId,
          premiumExpiry: endDate.toISOString(),
          planName: planName || planData?.name || "",
        });
      } else if (type === "one_time") {
        const purchaseRef = db.collection("purchases").doc();
        await purchaseRef.set({
          id: purchaseRef.id,
          userId,
          itemId: planId,
          itemType: "test",
          itemName: planName || "",
          razorpay_payment_id,
          amount,
          status: "active",
          purchasedAt: new Date().toISOString(),
        });

        return NextResponse.json({
          verified: true,
          purchaseId: purchaseRef.id,
          itemName: planName || "",
        });
      }
    } else {
      // Fallback: Without Admin SDK, still verify the payment but can't write to Firestore
      // Client-side will handle Firestore writes using client SDK
      let durationDays = 30;
      if (planId?.includes("weekly") || planName?.toLowerCase().includes("week")) {
        durationDays = 7;
      } else if (planId?.includes("yearly") || planName?.toLowerCase().includes("year") || planId?.includes("annual")) {
        durationDays = 365;
      } else if (planId?.includes("quarter") || planName?.toLowerCase().includes("quarter")) {
        durationDays = 90;
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      if (type === "subscription") {
        return NextResponse.json({
          verified: true,
          premiumExpiry: endDate.toISOString(),
          planName: planName || "",
          // Client needs to save these records
          _saveToFirestore: true,
          _paymentData: {
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            userId,
            planId,
            planName,
            amount,
            type,
            status: "captured",
            verified: true,
          },
          _subscriptionData: {
            userId,
            planId,
            planName,
            status: "active",
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        });
      } else {
        return NextResponse.json({
          verified: true,
          purchaseId: `purchase_${Date.now()}`,
          itemName: planName || "",
          _saveToFirestore: true,
          _paymentData: {
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            userId,
            planId,
            planName,
            amount,
            type,
            status: "captured",
            verified: true,
          },
        });
      }
    }

    return NextResponse.json({ verified: true });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
