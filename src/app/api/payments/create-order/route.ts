import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

// Lazily create the Razorpay client so we don't crash at boot when keys are absent.
let razorpayInstance: Razorpay | null = null;
function getRazorpay() {
  if (razorpayInstance !== null) return razorpayInstance;
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpayInstance;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency = "INR", receipt, notes, userId, planId, planName, type } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate minimum amount (Razorpay minimum is ₹1 = 100 paise)
    if (amount < 1) {
      return NextResponse.json({ error: "Minimum amount is ₹1" }, { status: 400 });
    }

    // Validate that Razorpay keys are configured before attempting order creation.
    // Without these the Razorpay SDK throws a cryptic error which is hard to debug.
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay keys not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
      return NextResponse.json(
        {
          error:
            "Payment gateway is not configured. Please contact support or set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env",
        },
        { status: 500 }
      );
    }

    const razorpay = getRazorpay();

    // Create Razorpay order
    // Amount in Razorpay is in paise (1 INR = 100 paise)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        userId,
        planId: planId || "",
        planName: planName || "",
        type: type || "one_time", // one_time or subscription
        ...notes,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      keyId: process.env.RAZORPAY_KEY_ID, // Send key_id for client-side checkout
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
