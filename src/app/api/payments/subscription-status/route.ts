import { NextRequest, NextResponse } from "next/server";

// Lazy Firebase Admin initialization
let adminDb: any = null;

function getAdminDb() {
  if (adminDb !== null) return adminDb;
  
  try {
    const { initializeApp, getApps, cert } = require("firebase-admin/app");
    const { getFirestore } = require("firebase-admin/firestore");
    
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!clientEmail || !privateKey) {
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
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const db = getAdminDb();

    if (!db) {
      // Without Admin SDK, tell client to use client-side Firestore
      return NextResponse.json({
        isPremium: false,
        premiumExpiry: null,
        planName: null,
        subscription: null,
        purchasedItems: [],
        _useClientSDK: true,
      });
    }

    // Check active subscription
    const subSnapshot = await db
      .collection("subscriptions")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    let subscription: { id: any; planId: any; planName: any; status: any; startDate: any; endDate: any } | null = null;
    let isPremium = false;
    let premiumExpiry: string | null = null;
    let planName: string | null = null;

    if (!subSnapshot.empty) {
      const subDoc = subSnapshot.docs[0];
      const subData = subDoc.data();
      
      const endDate = new Date(subData.endDate);
      const now = new Date();
      
      if (endDate > now) {
        isPremium = true;
        premiumExpiry = subData.endDate;
        planName = subData.planName;
        subscription = {
          id: subData.id,
          planId: subData.planId,
          planName: subData.planName,
          status: subData.status,
          startDate: subData.startDate,
          endDate: subData.endDate,
        };
      } else {
        // Subscription expired - update status
        await subDoc.ref.update({ status: "expired" });
      }
    }

    // Get purchased items — only filter by userId (avoids composite index requirement)
    const purchaseSnapshot = await db
      .collection("purchases")
      .where("userId", "==", userId)
      .get();

    const purchasedItems = purchaseSnapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          itemId: data.itemId,
          itemType: data.itemType,
          itemName: data.itemName,
          status: data.status,
        };
      })
      .filter((item: any) => item.status === "active");

    // isPremium is ONLY true for subscription users (access to ALL content)
    // One-time purchase = access to THAT specific item only
    // hasAnyPurchase is returned separately for ad suppression
    const hasAnyPurchase = purchasedItems.length > 0;

    return NextResponse.json({
      isPremium,
      premiumExpiry,
      planName,
      subscription,
      purchasedItems,
      hasAnyPurchase,
    });
  } catch (error: any) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check subscription" },
      { status: 500 }
    );
  }
}
