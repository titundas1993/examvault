/**
 * Admin Firestore API - Client-side functions that call server-side API routes
 * These use Firebase Admin SDK on the server to bypass Firestore security rules.
 * All admin write operations should go through these functions.
 * 
 * SECURITY: Every request now sends an auth token in the Authorization header.
 * The token is obtained from /api/admin/login and stored in localStorage.
 */

const API_BASE = "/api/admin/firestore";
const LOGIN_API = "/api/admin/login";
const TOKEN_KEY = "ev_admin_token";
const PERSISTENT_TOKEN_KEY = "ev_admin_persistent_token";

// Admin credentials cache for auto re-login after serverless cold start
const ADMIN_CREDS_KEY = "ev_admin_creds";

// NOTE: Admin credentials are stored encoded (not encrypted) for auto re-login.
// This is a trade-off for UX convenience. In production, consider using
// session-only cookies or a more secure credential storage mechanism.
function saveAdminCreds(email: string, password: string) {
  try {
    localStorage.setItem(ADMIN_CREDS_KEY, btoa(JSON.stringify({ e: email, p: password })));
  } catch { /* ignore */ }
}

function getAdminCreds(): { email: string; password: string } | null {
  try {
    const raw = localStorage.getItem(ADMIN_CREDS_KEY);
    if (!raw) return null;
    return JSON.parse(atob(raw));
  } catch { return null; }
}

function clearAdminCreds() {
  try { localStorage.removeItem(ADMIN_CREDS_KEY); } catch { /* ignore */ }
}

// Attempt silent re-login if token is expired (serverless cold start)
async function tryAutoReLogin(): Promise<string | null> {
  const creds = getAdminCreds();
  if (!creds) return null;
  try {
    const response = await fetch(LOGIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    });
    const result = await response.json();
    if (result.success && result.token) {
      setAdminToken(result.token);
      if (result.persistentToken) {
        setPersistentToken(result.persistentToken);
      }
      return result.token;
    }
  } catch { /* ignore */ }
  return null;
}

// Get the stored admin token — prefer persistent token over dynamic one
function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  // Persistent token is always valid, prefer it
  const persistent = localStorage.getItem(PERSISTENT_TOKEN_KEY);
  if (persistent) return persistent;
  return localStorage.getItem(TOKEN_KEY);
}

// Store the admin token
export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Store the persistent token (survives server restarts)
export function setPersistentToken(token: string) {
  try { localStorage.setItem(PERSISTENT_TOKEN_KEY, token); } catch { /* ignore */ }
}

// Get the persistent token
function getPersistentToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PERSISTENT_TOKEN_KEY);
}

// Remove the admin token (logout)
export function removeAdminToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(PERSISTENT_TOKEN_KEY); } catch { /* ignore */ }
}

// Check if we have a token (check both dynamic and persistent tokens)
export function hasAdminToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(PERSISTENT_TOKEN_KEY));
}

// Login to admin API — returns token on success
export async function adminLogin(email: string, password: string) {
  const response = await fetch(LOGIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();
  if (result.success && result.token) {
    setAdminToken(result.token);
    // Save persistent token if server provided one
    if (result.persistentToken) {
      setPersistentToken(result.persistentToken);
    }
    saveAdminCreds(email, password);
    return { success: true, token: result.token };
  }
  return { success: false, error: result.error || "Login failed" };
}

// Logout — invalidate token on server and remove from client
export async function adminLogout() {
  const token = getAdminToken();
  if (token) {
    try {
      await fetch(LOGIN_API, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch { /* ignore network errors */ }
  }
  removeAdminToken();
  clearAdminCreds();
}

async function apiPost(action: string, collection: string, data?: any, docId?: string, _retry = false) {
  let token = getAdminToken();
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, collection, docId, data }),
  });

  // If unauthorized, try auto re-login once
  if (response.status === 401) {
    if (!_retry) {
      const newToken = await tryAutoReLogin();
      if (newToken) {
        return apiPost(action, collection, data, docId, true);
      }
    }
    removeAdminToken();
    clearAdminCreds();
    throw new Error("Session expired — please login again");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "API request failed");
  }
  return result;
}

async function apiGet(params: string, _retry = false) {
  let token = getAdminToken();
  const response = await fetch(`${API_BASE}?${params}`, {
    headers: {
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
  });

  // If unauthorized, try auto re-login once
  if (response.status === 401) {
    if (!_retry) {
      const newToken = await tryAutoReLogin();
      if (newToken) {
        return apiGet(params, true);
      }
    }
    removeAdminToken();
    clearAdminCreds();
    throw new Error("Session expired — please login again");
  }

  const result = await response.json();
  if (!result.success && result.data === undefined) {
    // adminGetAppSettings returns {success, data} or {success, error}
    // adminGetCollection returns {success, data}
    // Only throw if there's an actual error
    if (result.error) throw new Error(result.error);
  }
  return result;
}

// ==================== Generic CRUD ====================

export async function adminAddDoc(collection: string, data: Record<string, unknown>) {
  const { id, uid, createdAt, updatedAt, ...cleanData } = data as any;
  return apiPost("set", collection, cleanData);
}

export async function adminUpdateDoc(collection: string, docId: string, data: Record<string, unknown>) {
  const { id, uid, createdAt, updatedAt, ...cleanData } = data as any;
  return apiPost("update", collection, cleanData, docId);
}

export async function adminDeleteDoc(collection: string, docId: string) {
  return apiPost("delete", collection, undefined, docId);
}

export async function adminClearCollection(collection: string) {
  return apiPost("clearCollection", collection);
}

export async function adminClearAll() {
  return apiPost("clearAll", "");
}

export async function adminImportCollection(collection: string, data: Record<string, unknown>[]) {
  return apiPost("importCollection", collection, data);
}

// ==================== App Settings (specific) ====================

const APP_SETTINGS_COLLECTION = "appSettings";
const APP_SETTINGS_DOC = "main";

export async function adminUpdateAppSettings(data: Record<string, unknown>) {
  return apiPost("set", APP_SETTINGS_COLLECTION, data, APP_SETTINGS_DOC);
}

export async function adminGetAppSettings() {
  const result = await apiGet(`collection=${APP_SETTINGS_COLLECTION}&docId=${APP_SETTINGS_DOC}`);
  if (result.success && result.data) {
    return result.data;
  }
  return null;
}

export async function adminGetCollection(collectionName: string) {
  const result = await apiGet(`collection=${collectionName}`);
  if (result.success && result.data) {
    return result.data;
  }
  return [];
}

// ==================== Sync Users from Firebase Auth ====================

const SYNC_USERS_API = "/api/admin/sync-users";

export async function adminSyncUsers() {
  const token = getAdminToken();
  const response = await fetch(SYNC_USERS_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401) {
    const newToken = await tryAutoReLogin();
    if (newToken) {
      // Use getAdminToken() which prefers the persistent token (always valid across serverless instances)
      const retryToken = getAdminToken() || newToken;
      const retryResponse = await fetch(SYNC_USERS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${retryToken}`,
        },
      });
      const result = await retryResponse.json();
      if (!result.success) throw new Error(result.error || "Sync failed");
      return result;
    }
    removeAdminToken();
    clearAdminCreds();
    throw new Error("Session expired — please login again");
  }

  const result = await response.json();
  if (!result.success) throw new Error(result.error || "Sync failed");
  return result;
}

// ==================== Seed Database ====================

const SEED_API = "/api/admin/seed";

export async function adminSeedDatabase() {
  let token = getAdminToken();
  if (!token) {
    throw new Error("Not authenticated — please log in again");
  }
  const response = await fetch(SEED_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    const newToken = await tryAutoReLogin();
    if (newToken) {
      const retryToken = getAdminToken() || newToken;
      const retryResponse = await fetch(SEED_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${retryToken}`,
        },
      });
      const result = await retryResponse.json();
      if (!result.success) throw new Error(result.error || "Seed failed");
      return result;
    }
    removeAdminToken();
    clearAdminCreds();
    throw new Error("Session expired — please login again");
  }

  const result = await response.json();
  if (!result.success) throw new Error(result.error || "Seed failed");
  return result;
}
