import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";

// Admin credentials stored SERVER-SIDE only — never exposed to client
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    // Verify credentials on the server
    const inputHash = getHash(password);
    if (email !== ADMIN_EMAIL || inputHash !== ADMIN_PASSWORD_HASH) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

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

// Logout — remove token
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    if (token) {
      activeTokens.delete(token);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
