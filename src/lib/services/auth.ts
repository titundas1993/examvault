"use client";

import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithPhoneNumber,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  User,
  AuthError,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useState, useEffect, useCallback } from "react";

// ============================================================
// VAPID Key for Push Messaging
// ============================================================

export const VAPID_KEY = "boaw-M3SKxsl72jctheH9gWWuI4Qy7Jehd2sIf72p8w";

// ============================================================
// User Profile Interface
// ============================================================

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  role: "user" | "admin" | "guest";
  language?: string;
  isDarkMode?: boolean;
  notificationEnabled?: boolean;
  createdAt?: string;
}

// ============================================================
// Auth Error Handler
// ============================================================

function getAuthErrorMessage(error: AuthError): string {
  const code = error.code;

  const errorMap: Record<string, string> = {
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/operation-not-allowed": "This sign-in method is not enabled.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/invalid-credential": "Invalid credentials. Please try again.",
    "auth/invalid-verification-code": "Invalid verification code. Please try again.",
    "auth/invalid-verification-id": "Invalid verification ID. Please restart.",
    "auth/invalid-phone-number": "Invalid phone number format.",
    "auth/popup-closed-by-user": "Sign-in popup was closed before completing.",
    "auth/cancelled-popup-request": "Only one popup request is allowed at a time.",
    "auth/popup-blocked": "Popup was blocked by the browser. Please allow popups.",
    "auth/unauthorized-domain": "This domain is not authorized for sign-in.",
  };

  return errorMap[code] || error.message || "An unexpected authentication error occurred.";
}

// ============================================================
// Firestore Profile Helpers
// ============================================================

const USERS_COLLECTION = "users";

async function createUserProfileInFirestore(
  user: User,
  name: string
): Promise<UserProfile | null> {
  try {
    const profile: Omit<UserProfile, "createdAt"> & { createdAt: unknown } = {
      uid: user.uid,
      name,
      email: user.email ?? "",
      phone: user.phoneNumber ?? "",
      photoURL: user.photoURL ?? "",
      role: "user",
      language: "en",
      isDarkMode: false,
      notificationEnabled: true,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, USERS_COLLECTION, user.uid), profile);

    return {
      ...profile,
      createdAt: new Date().toISOString(),
    } as UserProfile;
  } catch (error) {
    console.error("Error creating user profile in Firestore:", error);
    return null;
  }
}

/**
 * Fetch a user profile from Firestore. If the profile doesn't exist,
 * auto-create one from the Firebase Auth user data so that every
 * authenticated user is guaranteed to appear in the `users` collection
 * (and thus in the admin panel).
 */
async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        uid: data.uid ?? uid,
        name: data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        photoURL: data.photoURL ?? "",
        role: data.role ?? "user",
        language: data.language ?? "en",
        isDarkMode: data.isDarkMode ?? false,
        notificationEnabled: data.notificationEnabled ?? true,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? undefined,
      } as UserProfile;
    }

    // Profile doesn't exist — try to create one from the current Auth user
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      console.log(`[Auth] Profile missing for uid=${uid}, auto-creating...`);
      const profile = await createUserProfileInFirestore(currentUser, currentUser.displayName || "User");
      return profile;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

// ============================================================
// Auth Service Functions
// ============================================================

/**
 * Sign in with email and password.
 */
export async function emailPasswordLogin(
  email: string,
  password: string
): Promise<{ user: User; profile: UserProfile | null } | null> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchUserProfile(credential.user.uid);
    return { user: credential.user, profile };
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(getAuthErrorMessage(authError));
  }
}

/**
 * Register with email and password, then create a Firestore user profile.
 */
export async function emailPasswordRegister(
  email: string,
  password: string,
  name: string
): Promise<{ user: User; profile: UserProfile | null } | null> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const profile = await createUserProfileInFirestore(credential.user, name);
    return { user: credential.user, profile };
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(getAuthErrorMessage(authError));
  }
}

/**
 * Sign in with Google using a popup.
 */
export async function googleLogin(): Promise<{
  user: User;
  profile: UserProfile | null;
  isNewUser: boolean;
} | null> {
  try {
    const provider = new GoogleAuthProvider();
    // Request additional scopes if needed
    provider.addScope("profile");
    provider.addScope("email");

    const credential = await signInWithPopup(auth, provider);
    const isNewUser = credential._tokenResponse?.isNewUser ?? false;

    let profile: UserProfile | null = null;

    if (isNewUser) {
      // Create a new profile for first-time Google sign-in
      const displayName = credential.user.displayName ?? "User";
      profile = await createUserProfileInFirestore(credential.user, displayName);
    } else {
      profile = await fetchUserProfile(credential.user.uid);
    }

    return { user: credential.user, profile, isNewUser };
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(getAuthErrorMessage(authError));
  }
}

/**
 * Sign in with phone number using OTP.
 * Returns a confirmation result that can be used to verify the OTP.
 */
export async function phoneOTPLogin(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
) {
  try {
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );
    return confirmationResult;
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(getAuthErrorMessage(authError));
  }
}

/**
 * Send a password reset email.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(getAuthErrorMessage(authError));
  }
}

/**
 * Sign out the current user.
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(getAuthErrorMessage(authError));
  }
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current signed-in user (synchronous).
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// ============================================================
// useAuth Hook
// ============================================================

interface UseAuthReturn {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Listen to auth state changes and fetch profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const fetchedProfile = await fetchUserProfile(firebaseUser.uid);
          setProfile(fetchedProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Error in auth state change listener:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load user profile."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Email/password login
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const result = await emailPasswordLogin(email, password);
      if (result) {
        setUser(result.user);
        setProfile(result.profile);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Email/password registration
  const register = useCallback(
    async (email: string, password: string, name: string) => {
      setError(null);
      setLoading(true);
      try {
        const result = await emailPasswordRegister(email, password, name);
        if (result) {
          setUser(result.user);
          setProfile(result.profile);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Registration failed. Please try again.";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Google login
  const loginWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await googleLogin();
      if (result) {
        setUser(result.user);
        setProfile(result.profile);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Google sign-in failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Phone OTP login
  const loginWithPhone = useCallback(
    async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
      setError(null);
      try {
        // This returns a confirmation result; the caller must verify the OTP
        const confirmationResult = await phoneOTPLogin(
          phoneNumber,
          recaptchaVerifier
        );

        // Verify the OTP — caller should handle this via confirmationResult.confirm(code)
        // For now, we return the confirmation result through the hook flow.
        // The actual sign-in completes after OTP verification.
        return confirmationResult;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Phone sign-in failed. Please try again.";
        setError(message);
        throw err;
      }
    },
    []
  );

  // Password reset
  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordReset(email);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to send password reset email.";
      setError(message);
      throw err;
    }
  }, []);

  // Logout
  const logoutFn = useCallback(async () => {
    setError(null);
    try {
      await logout();
      setUser(null);
      setProfile(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Logout failed. Please try again.";
      setError(message);
      throw err;
    }
  }, []);

  return {
    user,
    profile,
    loading,
    error,
    login,
    register,
    loginWithGoogle,
    loginWithPhone,
    resetPassword,
    logout: logoutFn,
    clearError,
  };
}
