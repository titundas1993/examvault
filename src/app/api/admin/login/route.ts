import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";

// Admin credentials stored SERVER-SIDE only — never exposed to client
// IMPORTANT: Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables in production!
// The fallback values below are for development only and should NOT be used in production.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "titundas1993@gmail.com";
const ADMIN_PASSWORD_HASH = getHash(process.env.ADMIN_PASSWORD || "Titun@43");

// Persistent admin token — stored in env so it survives serverless cold starts
// If not set, a stable token is derived from the password hash
const PERSISTENT_TOKEN = process.env.ADMIN_TOKEN || createHmac("sha256", "examvault-admin-secret-key").update(ADMIN_EMAIL + ":persistent").digest("hex");

// In-memory token store for dynamically generated tokens (still supported for backward compat)
// Tokens expire after 24 hours
const activeTokens = new Map<string, { createdAt: number }>();
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function getHash(input: string): string {
  return createHmac("sha256", "examvault-admin-secret-key").update(input).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of activeTokens.entries()) {
    if (now - data.createdAt > TOKEN_EXPIRY_MS) {
      activeTokens.delete(token);
    }
  }
}

// Simple rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Firebase Admin SDK lazy initializer
let adminApp: any = null;

async function getFirebaseAdminApp() {
  if (adminApp) return adminApp;

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID || "examvault-7fba8";

    if (privateKey && clientEmail) {
      adminApp = initializeApp({
        credential: cert({ privateKey, clientEmail, projectId }),
      });
    } else {
      adminApp = initializeApp({ projectId });
    }
  } else {
    adminApp = getApps()[0];
  }

  return adminApp;
}

async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email: string } | null> {
  try {
    const adminApp = await getFirebaseAdminApp();
    const { getAuth } = await import("firebase-admin/auth");
    const adminAuth = getAuth(adminApp);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return { uid: decodedToken.uid, email: decodedToken.email || "" };
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    return null;
  }
}

async function checkAdminRoleInFirestore(uid: string): Promise<boolean> {
  try {
    const adminApp = await getFirebaseAdminApp();
    const { getFirestore } = await import("firebase-admin/firestore");
    const adminDb = getFirestore(adminApp);
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      return data?.role === "admin";
    }
    return false;
  } catch (error) {
    console.error("Firestore admin role check failed:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const attemptData = loginAttempts.get(clientIp);
    if (attemptData && attemptData.count >= MAX_LOGIN_ATTEMPTS && Date.now() - attemptData.lastAttempt < LOGIN_WINDOW_MS) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, firebaseIdToken } = body;

    // ============================================================
    // METHOD 1: Firebase-based login (preferred)
    // Client sends Firebase ID token → we verify it → check Firestore role
    // ============================================================
    if (firebaseIdToken) {
      const firebaseUser = await verifyFirebaseToken(firebaseIdToken);
      if (!firebaseUser) {
        return NextResponse.json(
          { success: false, error: "Invalid Firebase session. Please login again." },
          { status: 401 }
        );
      }

      // Check if this user has admin role in Firestore
      const isAdmin = await checkAdminRoleInFirestore(firebaseUser.uid);
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: "Access denied. Your account does not have admin privileges. Contact the administrator to get admin access." },
          { status: 403 }
        );
      }

      // Clear rate limit on successful login
      loginAttempts.delete(clientIp);

      // Generate admin tokens
      cleanExpiredTokens();
      const token = generateToken();
      activeTokens.set(token, { createdAt: Date.now() });

      return NextResponse.json({
        success: true,
        token,
        persistentToken: PERSISTENT_TOKEN,
        expiresIn: TOKEN_EXPIRY_MS,
        adminEmail: firebaseUser.email,
        method: "firebase",
      });
    }

    // ============================================================
    // METHOD 2: Hardcoded credentials (fallback / legacy)
    // ============================================================
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    // Verify credentials on the server
    const inputHash = getHash(password);
    if (email !== ADMIN_EMAIL || inputHash !== ADMIN_PASSWORD_HASH) {
      // Track failed attempt
      const current = loginAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
      loginAttempts.set(clientIp, { count: current.count + 1, lastAttempt: Date.now() });
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Clear rate limit on successful login
    loginAttempts.delete(clientIp);

    // Generate a new dynamic token
    cleanExpiredTokens();
    const token = generateToken();
    activeTokens.set(token, { createdAt: Date.now() });

    // Also return the persistent token — client should prefer this
    // It never expires and survives server restarts
    return NextResponse.json({
      success: true,
      token,
      persistentToken: PERSISTENT_TOKEN,
      expiresIn: TOKEN_EXPIRY_MS,
      method: "hardcoded",
    });
  } catch (error: any) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Verify a token — can be called from other API routes
export function verifyAdminToken(token: string | null): boolean {
  if (!token) return false;

  // Check persistent token first — always valid if it matches
  if (token === PERSISTENT_TOKEN) return true;

  // Then check dynamic tokens
  cleanExpiredTokens();
  const tokenData = activeTokens.get(token);
  if (!tokenData) return false;

  // Check expiry
  if (Date.now() - tokenData.createdAt > TOKEN_EXPIRY_MS) {
    activeTokens.delete(token);
    return false;
  }

  return true;
}

// Logout — remove token and persistent token
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, persistentToken } = body;
    if (token) {
      activeTokens.delete(token);
    }
    // Note: Persistent tokens can't be truly invalidated server-side without
    // a persistent store (database). For now, the client removes it from localStorage.
    // For production, consider adding a deny-list in Firestore.
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
