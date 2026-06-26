import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "../login/route";

// Firebase Admin SDK for Firestore + Credential ONLY (not Auth — Auth has ESM issues on Vercel)
let adminApp: any = null;
let adminDb: any = null;

async function getAdminApp() {
  if (adminApp) return adminApp;

  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");

    if (getApps().length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.FIREBASE_PROJECT_ID || "examvault-7fba8";

      if (privateKey && clientEmail) {
        adminApp = initializeApp({
          credential: cert({ privateKey, clientEmail, projectId }),
          projectId,
        });
      } else {
        const fs = await import("fs");
        const path = await import("path");
        const keyPath = path.join(process.cwd(), "firebase-admin-key.json");
        if (fs.existsSync(keyPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
          adminApp = initializeApp({ credential: cert(serviceAccount) });
        } else {
          throw new Error("No Firebase Admin credentials found.");
        }
      }
    } else {
      adminApp = getApps()[0];
    }

    return adminApp;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error;
  }
}

async function getAdminDb() {
  if (adminDb) return adminDb;
  const app = await getAdminApp();
  const { getFirestore } = await import("firebase-admin/firestore");
  adminDb = getFirestore(app);
  return adminDb;
}

/**
 * Get a Google OAuth2 access token using the Firebase Admin credential.
 * Uses firebase-admin/credential (which works fine on Vercel) — NOT firebase-admin/auth.
 */
async function getAccessToken(): Promise<string> {
  const app = await getAdminApp();
  const credential = app.options.credential;
  if (!credential || typeof credential.getAccessToken !== "function") {
    throw new Error("No credential available — check FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL env vars");
  }
  const tokenInfo = await credential.getAccessToken();
  // tokenInfo can be {accessToken, expiresInSeconds} or {access_token, expires_in}
  return tokenInfo.accessToken || tokenInfo.access_token;
}

/**
 * List ALL Firebase Auth users via the Identity Toolkit REST API.
 * Paginates through all users using pageToken.
 */
async function listAllAuthUsers(accessToken: string, projectId: string) {
  const allUsers: any[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = new URL(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet`);
    url.searchParams.set("maxResults", "1000");
    if (nextPageToken) url.searchParams.set("nextPageToken", nextPageToken);

    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Identity Toolkit API error: ${resp.status} ${errText}`);
    }

    const data = await resp.json() as { users?: any[]; nextPageToken?: string };
    if (data.users) {
      allUsers.push(...data.users);
    }
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return allUsers;
}

/**
 * Sync all Firebase Auth users into the Firestore `users` collection.
 * Uses firebase-admin/credential + REST API (NOT firebase-admin/auth) to avoid ESM issues.
 */
export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!verifyAdminToken(token)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — please login again" },
      { status: 401 }
    );
  }

  try {
    const db = await getAdminDb();
    const projectId = process.env.FIREBASE_PROJECT_ID || "examvault-7fba8";

    // Step 1: Get a Google OAuth2 access token using the Firebase Admin credential
    const accessToken = await getAccessToken();

    // Step 2: List all Firebase Auth users via REST API
    const authUsers = await listAllAuthUsers(accessToken, projectId);

    let syncedCount = 0;
    let existingCount = 0;

    // Step 3: For each Auth user, check if a Firestore profile exists; create if missing
    for (const userRecord of authUsers) {
      const uid = userRecord.localId;
      if (!uid) continue;

      const docRef = db.collection("users").doc(uid);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        existingCount++;
        continue;
      }

      // Profile missing — create one from Auth user data
      const email = userRecord.email || "";
      const profile = {
        uid: uid,
        name: userRecord.displayName || email?.split("@")[0] || "User",
        email: email,
        phone: userRecord.phoneNumber || "",
        photoURL: userRecord.photoUrl || "",
        role: "user",
        language: "en",
        isDarkMode: false,
        notificationEnabled: true,
        createdAt: userRecord.createdAt
          ? new Date(parseInt(userRecord.createdAt, 10)).toISOString()
          : new Date().toISOString(),
      };

      await docRef.set(profile);
      syncedCount++;
      console.log(`[SyncUsers] Created profile for uid=${uid} name=${profile.name}`);
    }

    return NextResponse.json({
      success: true,
      totalAuthUsers: authUsers.length,
      existingInFirestore: existingCount,
      syncedNew: syncedCount,
    });
  } catch (error: any) {
    console.error("Sync users error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync users" },
      { status: 500 }
    );
  }
}
