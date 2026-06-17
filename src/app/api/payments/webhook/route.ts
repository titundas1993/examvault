import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Lazy Firebase Admin initialization
let adminDb: any = null;

function getAdminDb() {
  if (adminDb !== null) return adminDb;
  try {
    const { initializeApp, getApps, cert } = require("firebase-admin/app");
    const { getFirestore } = require("firebase-admin/firestore");
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!clientEmail || !privateKey) return null;
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
    console.error("Firebase Admin init error in webhook:", e);
    return null; 
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature — MANDATORY for security
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("CRITICAL: RAZORPAY_WEBHOOK_SECRET is not set! Webhook verification is impossible. Rejecting request.");
      return NextResponse.json({ error: "Webhook secret not configured. Payment verification disabled for security." }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Webhook signature mismatch — possible fraudulent request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    console.log(`Razorpay webhook received: ${eventType}`);

    const db = getAdminDb();
    if (db) {
      // Log the webhook event
      const logRef = db.collection("paymentWebhookLogs").doc();
      await logRef.set({
        id: logRef.id,
        event: eventType,
        data: event,
        processedAt: new Date().toISOString(),
      });

      // Handle events
      if (eventType === "payment.captured") {
        const payment = event.payload.payment.entity;
        const paymentQuery = await db
          .collection("payments")
          .where("razorpayPaymentId", "==", payment.id)
          .limit(1)
          .get();
        if (!paymentQuery.empty) {
          await paymentQuery.docs[0].ref.update({
            status: "captured",
            capturedAt: new Date().toISOString(),
          });
        } else {
          // Payment record doesn't exist yet (webhook arrived before verify call)
          // Create a payment record from webhook data
          const paymentRef = db.collection("payments").doc();
          await paymentRef.set({
            id: paymentRef.id,
            razorpayOrderId: payment.order_id,
            razorpayPaymentId: payment.id,
            userId: payment.notes?.userId || "",
            planId: payment.notes?.planId || "",
            planName: payment.notes?.planName || "",
            amount: payment.amount / 100, // Convert from paise to INR
            currency: payment.currency,
            type: payment.notes?.type || "one_time",
            status: "captured",
            verified: false, // Will be verified when verify endpoint is called
            capturedAt: new Date().toISOString(),
            source: "webhook",
            createdAt: new Date().toISOString(),
          });
        }
      } else if (eventType === "payment.failed") {
        const payment = event.payload.payment.entity;
        const paymentQuery = await db
          .collection("payments")
          .where("razorpayPaymentId", "==", payment.id)
          .limit(1)
          .get();
        if (!paymentQuery.empty) {
          await paymentQuery.docs[0].ref.update({
            status: "failed",
            failedAt: new Date().toISOString(),
            errorCode: payment.error_code || "",
            errorDescription: payment.error_description || "",
          });
        } else {
          // Create failed payment record
          const paymentRef = db.collection("payments").doc();
          await paymentRef.set({
            id: paymentRef.id,
            razorpayOrderId: payment.order_id,
            razorpayPaymentId: payment.id,
            userId: payment.notes?.userId || "",
            planId: payment.notes?.planId || "",
            planName: payment.notes?.planName || "",
            amount: payment.amount / 100,
            currency: payment.currency,
            type: payment.notes?.type || "one_time",
            status: "failed",
            errorCode: payment.error_code || "",
            errorDescription: payment.error_description || "",
            source: "webhook",
            createdAt: new Date().toISOString(),
          });
        }
      } else if (eventType === "refund.processed") {
        const refund = event.payload.refund.entity;
        const paymentQuery = await db
          .collection("payments")
          .where("razorpayPaymentId", "==", refund.payment_id)
          .limit(1)
          .get();
        if (!paymentQuery.empty) {
          await paymentQuery.docs[0].ref.update({
            status: "refunded",
            refundedAt: new Date().toISOString(),
            refundAmount: refund.amount / 100,
            refundId: refund.id,
          });

          // Also update subscription status if it was a subscription payment
          const paymentData = paymentQuery.docs[0].data();
          if (paymentData.userId) {
            const subQuery = await db
              .collection("subscriptions")
              .where("userId", "==", paymentData.userId)
              .where("status", "==", "active")
              .limit(1)
              .get();
            if (!subQuery.empty) {
              await subQuery.docs[0].ref.update({ status: "cancelled" });
            }

            // Update user premium status
            const userQuery = await db
              .collection("users")
              .where("uid", "==", paymentData.userId)
              .limit(1)
              .get();
            if (!userQuery.empty) {
              await userQuery.docs[0].ref.update({
                isPremium: false,
                premiumExpiry: null,
              });
            }
          }
        }
      }
    } else {
      console.warn("Webhook received but Firebase Admin SDK not available - event not processed");
    }

    // Always return 200 to Razorpay so they don't retry
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    // Still return 200 to prevent Razorpay retries
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}
