import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "../login/route";

// Firebase Admin SDK - bypasses Firestore security rules

// Auth check helper — returns error response if unauthorized
function checkAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!verifyAdminToken(token)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — please login again" },
      { status: 401 }
    );
  }
  return null; // Auth passed
}
let adminApp: any = null;
let adminDb: any = null;

async function getAdminDb() {
  if (adminDb) return adminDb;

  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    if (getApps().length === 0) {
      // Try environment variable first, then fallback to file
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.FIREBASE_PROJECT_ID || "examvault-7fba8";

      if (privateKey && clientEmail) {
        adminApp = initializeApp({
          credential: cert({ privateKey, clientEmail, projectId }),
        });
      } else {
        // Fallback: try to read from file
        const fs = await import("fs");
        const path = await import("path");
        const keyPath = path.join(process.cwd(), "firebase-admin-key.json");

        if (fs.existsSync(keyPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
          adminApp = initializeApp({
            credential: cert(serviceAccount),
          });
        } else {
          throw new Error("No Firebase Admin credentials found. Set env vars or provide key file.");
        }
      }
    } else {
      adminApp = getApps()[0];
    }

    adminDb = getFirestore(adminApp);
    return adminDb;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error;
  }
}

/**
 * Convert Firestore Timestamps (both class instances and raw objects)
 * to ISO strings for safe JSON serialization.
 */
function convertTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object") {
      // Firestore Timestamp class instance (has toDate method)
      if (typeof (value as any).toDate === "function") {
        converted[key] = (value as any).toDate().toISOString();
      }
      // Raw Firestore Timestamp object {_seconds, _nanoseconds}
      else if ("_seconds" in (value as any) && "_nanoseconds" in (value as any)) {
        const ts = value as { _seconds: number; _nanoseconds: number };
        converted[key] = new Date(ts._seconds * 1000 + ts._nanoseconds / 1e6).toISOString();
      }
      // Nested object — recurse
      else if (!Array.isArray(value)) {
        converted[key] = convertTimestamps(value as Record<string, unknown>);
      }
      // Array — convert each item if it's an object
      else {
        converted[key] = (value as unknown[]).map(item =>
          item && typeof item === "object" && !Array.isArray(item)
            ? convertTimestamps(item as Record<string, unknown>)
            : item
        );
      }
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

function serializeDoc(docSnap: any): Record<string, unknown> {
  const data = docSnap.data();
  if (!data) return { id: docSnap.id };
  // Spread data first, then override id with the authoritative Firestore document ID
  // (data.id might be stale/wrong if the doc was created with addDoc and a different id was stored)
  return { ...convertTimestamps(data), id: docSnap.id };
}

export async function POST(request: NextRequest) {
  // Auth check
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    const db = await getAdminDb();
    const body = await request.json();
    const { action, collection: collectionName, docId, data, merge } = body;

    switch (action) {
      case "set": {
        // Create or overwrite a document
        if (docId) {
          await db.collection(collectionName).doc(docId).set(data, { merge: merge !== false });
        } else {
          const newRef = db.collection(collectionName).doc();
          await newRef.set({ ...data, id: newRef.id });
          return NextResponse.json({ success: true, id: newRef.id });
        }
        return NextResponse.json({ success: true });
      }

      case "update": {
        // Update an existing document
        if (!docId) {
          return NextResponse.json({ success: false, error: "docId required for update" }, { status: 400 });
        }
        await db.collection(collectionName).doc(docId).update(data);
        return NextResponse.json({ success: true });
      }

      case "delete": {
        // Delete a single document
        if (!docId) {
          return NextResponse.json({ success: false, error: "docId required for delete" }, { status: 400 });
        }
        await db.collection(collectionName).doc(docId).delete();
        return NextResponse.json({ success: true });
      }

      case "clearCollection": {
        // Delete all documents in a collection
        const snapshot = await db.collection(collectionName).get();
        const batch = db.batch();
        let count = 0;
        snapshot.docs.forEach((doc: any) => {
          batch.delete(doc.ref);
          count++;
        });
        if (count > 0) {
          await batch.commit();
        }
        return NextResponse.json({ success: true, deleted: count });
      }

      case "clearAll": {
        // Clear all known collections (including new ones)
        const collections = [
          "upcomingExams", "dailyTips", "announcements", "notifications",
          "mockTests", "supportTickets", "users", "previousPapers", "notes",
          "banners", "testSeries", "freeTests", "dailyQuiz", "popularTests",
          "questions", "leaderboard", "appSettings",
          "plans", "payments", "subscriptions", "purchases", "categories",
          "navigation", "paymentWebhookLogs",
        ];
        let totalDeleted = 0;
        for (const col of collections) {
          if (col === "appSettings") {
            try {
              await db.collection(col).doc("main").delete();
              totalDeleted++;
            } catch (e) { /* ignore */ }
          } else {
            // Delete all documents in batches (no 500 limit — repeat until empty)
            let hasMore = true;
            while (hasMore) {
              const snapshot = await db.collection(col).limit(500).get();
              if (snapshot.docs.length === 0) {
                hasMore = false;
              } else {
                const batch = db.batch();
                snapshot.docs.forEach((doc: any) => {
                  batch.delete(doc.ref);
                  totalDeleted++;
                });
                await batch.commit();
              }
            }
          }
        }
        return NextResponse.json({ success: true, deleted: totalDeleted });
      }

      case "importCollection": {
        // Import multiple items into a collection
        if (!Array.isArray(data)) {
          return NextResponse.json({ success: false, error: "data must be an array" }, { status: 400 });
        }
        const batch = db.batch();
        const imported: string[] = [];
        for (const item of data) {
          const newRef = db.collection(collectionName).doc();
          const { id, uid, ...cleanItem } = item as any;
          batch.set(newRef, {
            ...cleanItem,
            id: newRef.id,
            createdAt: new Date().toISOString(),
          });
          imported.push(newRef.id);
        }
        await batch.commit();
        return NextResponse.json({ success: true, imported: imported.length });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin Firestore API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Auth check
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    const db = await getAdminDb();
    const { searchParams } = new URL(request.url);
    const collectionName = searchParams.get("collection");
    const docId = searchParams.get("docId");

    if (!collectionName) {
      return NextResponse.json({ success: false, error: "collection required" }, { status: 400 });
    }

    if (docId) {
      // Get single document
      const docSnap = await db.collection(collectionName).doc(docId).get();
      if (!docSnap.exists) {
        return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: serializeDoc(docSnap) });
    }

    // Get all documents in collection
    const snapshot = await db.collection(collectionName).get();
    const docs = snapshot.docs.map((doc: any) => serializeDoc(doc));
    return NextResponse.json({ success: true, data: docs });
  } catch (error: any) {
    console.error("Admin Firestore API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}
