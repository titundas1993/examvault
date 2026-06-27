"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  User,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import {
  emailPasswordLogin,
  emailPasswordRegister,
  googleLogin,
  phoneOTPLogin,
  sendPasswordReset,
  isWebViewEnv,
} from "@/lib/services/auth";
import { RecaptchaVerifier, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";

type AuthMode = "login" | "register" | "phone" | "forgot";

export default function LoginScreen() {
  const { setView, setUser, setFirebaseUser, language } = useAppStore();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [recaptchaKey, setRecaptchaKey] = useState(0); // forces new DOM element on change
  const recaptchaVerifierRef = useRef<any>(null);
  const [phoneAuthUser, setPhoneAuthUser] = useState<any>(null); // temporary hold after OTP verify
  const [showNameStep, setShowNameStep] = useState(false); // name prompt after phone login

  // Auto OTP fill from Android SMS Retriever
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__EV_OTP_CALLBACK = (receivedOtp: string) => {
        if (receivedOtp && receivedOtp.length === 6 && otpSent) {
          setOtp(receivedOtp);
        }
      };
      // Tell Android to start listening for SMS
      if ((window as any).AndroidOtp?.requestOtp) {
        (window as any).AndroidOtp.requestOtp();
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__EV_OTP_CALLBACK;
      }
    };
  }, [otpSent]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Clean up recaptcha on unmount
  useEffect(() => {
    return () => {
      try {
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
      } catch (e) { /* ignore */ }
    };
  }, []);

  // Show account deleted success message (set by SettingsTab before navigating here)
  const [accountDeletedMsg, setAccountDeletedMsg] = useState("");
  useEffect(() => {
    try {
      const flag = sessionStorage.getItem("account_deleted");
      if (flag === "1") {
        setAccountDeletedMsg("Your account has been deleted successfully.");
        sessionStorage.removeItem("account_deleted");
        setTimeout(() => setAccountDeletedMsg(""), 5000);
      }
    } catch (e) { /* ignore */ }
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleEmailLogin = async () => {
    clearMessages();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const result = await emailPasswordLogin(email, password);
      if (result) {
        setFirebaseUser(result.user);
        setUser({
          name: result.profile?.name || result.user.displayName || "User",
          email: result.user.email || email,
          role: result.profile?.role || "user",
          uid: result.user.uid,
        });
        setView("home");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    clearMessages();
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const result = await emailPasswordRegister(email, password, name);
      if (result) {
        setFirebaseUser(result.user);
        setUser({
          name: result.profile?.name || name,
          email: result.user.email || email,
          role: result.profile?.role || "user",
          uid: result.user.uid,
        });
        setView("home");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearMessages();
    setLoading(true);
    try {
      const result = await googleLogin();
      if (result) {
        setFirebaseUser(result.user);
        setUser({
          name: result.profile?.name || result.user.displayName || "User",
          email: result.user.email || "",
          role: result.profile?.role || "user",
          uid: result.user.uid,
        });
        setView("home");
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    clearMessages();
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    // Auto-prepend +91 if not present
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + formattedPhone.replace(/^0+/, "");
    }
    setLoading(true);
    try {
      // Clear previous reCAPTCHA completely
      try {
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
      } catch (e) { /* ignore */ }
      // Increment key to force React to create a brand new DOM element
      // This is crucial — Firebase SDK internally tracks container IDs,
      // so we must use a UNIQUE ID each time to avoid "already rendered" error
      const newKey = recaptchaKey + 1;
      setRecaptchaKey(newKey);
      const containerId = `recaptcha-container-${newKey}`;
      // Wait for React to render the new DOM element
      await new Promise(resolve => setTimeout(resolve, 100));
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
        callback: () => {},
      });
      recaptchaVerifierRef.current = verifier;
      const result = await phoneOTPLogin(formattedPhone, verifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setResendTimer(60); // 60 second cooldown before resend
      setSuccess("OTP sent successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    clearMessages();
    if (!otp || otp.length < 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }
    if (!confirmationResult) {
      setError("Please send OTP first");
      return;
    }
    setLoading(true);
    try {
      const credential = await confirmationResult.confirm(otp);
      setFirebaseUser(credential.user);
      // Check if user profile already exists in Firestore
      const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const profileDoc = await getDoc(doc(db, "users", credential.user.uid));
      if (profileDoc.exists()) {
        // Existing user — use their saved name
        const profileData = profileDoc.data();
        setUser({
          name: profileData.name || credential.user.displayName || "User",
          email: profileData.email || credential.user.email || "",
          role: profileData.role || "user",
          uid: credential.user.uid,
          phone: profileData.phone || credential.user.phoneNumber || "",
          photoURL: profileData.photoURL || "",
        });
        setView("home");
      } else {
        // New user — show name input step
        setPhoneAuthUser(credential.user);
        setShowNameStep(true);
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneNameSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setLoading(true);
    try {
      // Create Firestore profile with the entered name
      const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const profileData = {
        uid: phoneAuthUser.uid,
        name: name.trim(),
        email: phoneAuthUser.email || "",
        phone: phoneAuthUser.phoneNumber || "",
        photoURL: phoneAuthUser.photoURL || "",
        role: "user",
        language: "en",
        isDarkMode: false,
        notificationEnabled: true,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, "users", phoneAuthUser.uid), profileData);
      setUser({
        name: name.trim(),
        email: phoneAuthUser.email || "",
        role: "user",
        uid: phoneAuthUser.uid,
        phone: phoneAuthUser.phoneNumber || "",
      });
      setView("home");
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    clearMessages();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccess("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    setUser({ name: "Guest", email: "", role: "guest" });
    setView("home");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-ev-navy via-ev-dark to-blue-900" />
      <div className="absolute inset-0 bg-gradient-to-t from-ev-orange/10 via-transparent to-ev-gold/5" />

      {/* Decorative elements */}
      <div className="absolute top-20 -left-20 w-60 h-60 bg-ev-orange/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-20 w-60 h-60 bg-ev-gold/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Section */}
        <div className="pt-12 pb-6 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-white mb-1">
              {mode === "login"
                ? t("welcomeBack", language)
                : mode === "register"
                ? t("welcome", language)
                : mode === "forgot"
                ? "Reset Password"
                : "Phone Login"}
            </h1>
            <p className="text-white/60 text-sm">
              {mode === "login"
                ? t("startLearning", language)
                : mode === "register"
                ? "Create your account to get started"
                : mode === "forgot"
                ? "Enter your email to reset password"
                : "Login with your phone number"}
            </p>
          </motion.div>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex-1 bg-white dark:bg-gray-900 rounded-t-3xl px-6 pt-8 pb-6 shadow-2xl"
        >
          <AnimatePresence mode="wait">
            {/* LOGIN FORM */}
            {mode === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <InputField
                  icon={<Mail className="w-4 h-4 text-muted-foreground" />}
                  placeholder={t("email", language)}
                  type="email"
                  value={email}
                  onChange={(v) => { setEmail(v); clearMessages(); }}
                />
                <div className="relative">
                  <InputField
                    icon={<Lock className="w-4 h-4 text-muted-foreground" />}
                    placeholder={t("password", language)}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(v) => { setPassword(v); clearMessages(); }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ev-navy dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="text-right">
                  <button
                    onClick={() => { setMode("forgot"); clearMessages(); }}
                    className="text-xs text-ev-orange hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <SubmitButton
                  onClick={handleEmailLogin}
                  loading={loading}
                  text={t("login", language)}
                />
              </motion.div>
            )}

            {/* REGISTER FORM */}
            {mode === "register" && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <InputField
                  icon={<User className="w-4 h-4 text-muted-foreground" />}
                  placeholder={t("name", language)}
                  type="text"
                  value={name}
                  onChange={(v) => { setName(v); clearMessages(); }}
                />
                <InputField
                  icon={<Mail className="w-4 h-4 text-muted-foreground" />}
                  placeholder={t("email", language)}
                  type="email"
                  value={email}
                  onChange={(v) => { setEmail(v); clearMessages(); }}
                />
                <div className="relative">
                  <InputField
                    icon={<Lock className="w-4 h-4 text-muted-foreground" />}
                    placeholder={t("password", language)}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(v) => { setPassword(v); clearMessages(); }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ev-navy dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <SubmitButton
                  onClick={handleRegister}
                  loading={loading}
                  text={t("register", language)}
                />
              </motion.div>
            )}

            {/* PHONE LOGIN FORM */}
            {mode === "phone" && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {!otpSent ? (
                  <>
                    <InputField
                      icon={<Phone className="w-4 h-4 text-muted-foreground" />}
                      placeholder="9876543210"
                      type="tel"
                      value={phone}
                      onChange={(v) => { setPhone(v); clearMessages(); }}
                    />
                    <SubmitButton
                      onClick={handleSendOTP}
                      loading={loading}
                      text="Send OTP"
                    />
                  </>
                ) : showNameStep ? (
                  <>
                    <div className="text-center mb-3">
                      <div className="w-14 h-14 rounded-full bg-ev-orange-light dark:bg-ev-orange/15 flex items-center justify-center mx-auto mb-3">
                        <User className="w-7 h-7 text-ev-orange" />
                      </div>
                      <p className="text-sm font-semibold text-ev-navy dark:text-white">What&apos;s your name?</p>
                      <p className="text-xs text-muted-foreground mt-1">This will be displayed on your profile</p>
                    </div>
                    <InputField
                      icon={<User className="w-4 h-4 text-muted-foreground" />}
                      placeholder="Enter your full name"
                      type="text"
                      value={name}
                      onChange={(v) => { setName(v); clearMessages(); }}
                    />
                    <SubmitButton
                      onClick={handlePhoneNameSubmit}
                      loading={loading}
                      text="Continue"
                    />
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Enter the 6-digit code sent to <span className="font-semibold text-ev-navy dark:text-white">{phone}</span>
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <SubmitButton
                      onClick={handleVerifyOTP}
                      loading={loading}
                      text="Verify OTP"
                    />
                    {/* Resend OTP */}
                    <div className="text-center">
                      {resendTimer > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Resend OTP in <span className="font-semibold text-ev-navy dark:text-white">{resendTimer}s</span>
                        </p>
                      ) : (
                        <button
                          onClick={handleSendOTP}
                          disabled={loading}
                          className="text-xs text-ev-orange hover:underline font-semibold disabled:opacity-50"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => { setOtpSent(false); setOtp(""); setResendTimer(0); clearMessages(); }}
                      className="w-full text-center text-xs text-ev-orange hover:underline"
                    >
                      Change phone number
                    </button>
                  </>
                )}

                <div id={`recaptcha-container-${recaptchaKey}`} key={`recaptcha-${recaptchaKey}`} />
              </motion.div>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === "forgot" && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center mb-2">
                  <div className="w-14 h-14 rounded-full bg-ev-orange-light dark:bg-ev-orange/15 flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-7 h-7 text-ev-orange" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter your email and we&apos;ll send you a reset link
                  </p>
                </div>
                <InputField
                  icon={<Mail className="w-4 h-4 text-muted-foreground" />}
                  placeholder={t("email", language)}
                  type="email"
                  value={email}
                  onChange={(v) => { setEmail(v); clearMessages(); }}
                />
                <SubmitButton
                  onClick={handleForgotPassword}
                  loading={loading}
                  text="Send Reset Link"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error / Success Messages */}
          <AnimatePresence>
            {accountDeletedMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-green-700 text-xs font-medium">{accountDeletedMsg}</p>
              </motion.div>
            )}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-ev-red text-xs text-center mt-3 bg-ev-red/10 rounded-lg p-2"
              >
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-ev-green text-xs text-center mt-3 bg-ev-green/10 rounded-lg p-2"
              >
                {success}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Divider */}
          {mode !== "forgot" && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{t("orLoginWith", language)}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-3">
                {/* Google login button — hidden in WebView (not supported) */}
                {!isWebViewEnv() && (
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border hover:bg-ev-light dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-sm font-medium text-ev-navy dark:text-white">
                    {t("continueWithGoogle", language)}
                  </span>
                </button>
                )}

                <button
                  onClick={() => { setMode("phone"); clearMessages(); setOtpSent(false); setOtp(""); }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border hover:bg-ev-light dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <Phone className="w-5 h-5 text-ev-green" />
                  <span className="text-sm font-medium text-ev-navy dark:text-white">
                    Continue with Phone
                  </span>
                </button>
              </div>

              {/* Toggle login/register */}
              <div className="text-center mt-5">
                {mode === "login" ? (
                  <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <button
                      onClick={() => { setMode("register"); clearMessages(); }}
                      className="text-ev-orange font-semibold hover:underline"
                    >
                      {t("register", language)}
                    </button>
                  </p>
                ) : mode !== "phone" ? (
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      onClick={() => { setMode("login"); clearMessages(); }}
                      className="text-ev-orange font-semibold hover:underline"
                    >
                      {t("login", language)}
                    </button>
                  </p>
                ) : null}
              </div>

              {/* Back to login from phone */}
              {mode === "phone" && (
                <button
                  onClick={() => { setMode("login"); clearMessages(); }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-ev-navy dark:hover:text-white mt-3 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to {t("login", language)}
                </button>
              )}

              {/* Guest */}
              <div className="flex items-center gap-4 mt-4 justify-center">
                <button
                  onClick={handleGuest}
                  className="text-xs text-muted-foreground hover:text-ev-navy dark:hover:text-white transition-colors"
                >
                  Continue as Guest
                </button>
              </div>
            </>
          )}

          {/* Back from forgot password */}
          {mode === "forgot" && (
            <button
              onClick={() => { setMode("login"); clearMessages(); }}
              className="w-full text-center text-sm text-ev-orange hover:underline mt-4 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// =========================
// Sub-components
// =========================

function InputField({
  icon,
  placeholder,
  type,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  placeholder: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 h-11 rounded-xl bg-ev-light dark:bg-gray-800 border-border focus:border-ev-orange focus:ring-ev-orange/20"
      />
    </div>
  );
}

function SubmitButton({
  onClick,
  loading,
  text,
}: {
  onClick: () => void;
  loading: boolean;
  text: string;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={loading}
      className="w-full h-11 bg-gradient-to-r from-ev-orange to-ev-gold hover:from-ev-orange/90 hover:to-ev-gold/90 text-white font-semibold rounded-xl shadow-lg shadow-ev-orange/20 disabled:opacity-70"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {text}
          <ArrowRight className="w-4 h-4 ml-2" />
        </>
      )}
    </Button>
  );
}
