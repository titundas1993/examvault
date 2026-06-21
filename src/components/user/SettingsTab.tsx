"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Moon,
  Sun,
  User,
  Phone,
  KeyRound,
  Bell,
  Info,
  Shield,
  FileText,
  LogOut,
  Trash2,
  ChevronRight,
  ChevronDown,
  Loader2,
  Mail,
  Check,
  AlertTriangle,
  CreditCard,
  Camera,
  Crown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { logout as authLogout, sendPasswordReset, getCurrentUser } from "@/lib/services/auth";
import { updateUserProfile, getAppSettings } from "@/lib/services/firestore";
import { db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const languages = [
  { code: "en", label: "EN", native: "English" },
  { code: "hi", label: "हि", native: "हिन्दी" },
  { code: "bn", label: "বা", native: "বাংলা" },
  { code: "as", label: "অ", native: "অসমীয়া" },
];

export default function SettingsTab() {
  const {
    language,
    setLanguage,
    isDark,
    toggleDark,
    user,
    setUser,
    setFirebaseUser,
    setView,
    firebaseUser,
    setShowGuestModal,
    appSettings,
    setAppSettings,
  } = useAppStore();

  const userProfile = useAppStore((s) => s.userProfile);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(userProfile?.phone || "");
  const [editPhotoURL, setEditPhotoURL] = useState(userProfile?.photoUrl || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // Load app settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getAppSettings();
        if (settings) {
          setAppSettings(settings);
        }
      } catch (err) {
        console.error("Error loading app settings:", err);
      }
    };
    loadSettings();
  }, [setAppSettings]);

  // Load payment history
  useEffect(() => {
    const loadPaymentHistory = async () => {
      if (!firebaseUser?.uid) return;
      setLoadingHistory(true);
      try {
        const paymentsRef = collection(db, "payments");
        const q = query(paymentsRef, where("userId", "==", firebaseUser.uid), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const payments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setPaymentHistory(payments);
      } catch (err) {
        console.error("Error loading payment history:", err);
      }
      setLoadingHistory(false);
    };
    loadPaymentHistory();
  }, [firebaseUser?.uid]);

  const isGuest = !user || user.role === "guest";

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser?.uid) return;
    setUploadingPhoto(true);
    try {
      const fileRef = ref(storage, `users/${firebaseUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setEditPhotoURL(url);
      await updateUserProfile(firebaseUser.uid, { photoURL: url });
      useAppStore.getState().setUserProfile({ ...userProfile, photoUrl: url });
    } catch (err) {
      console.error("Error uploading photo:", err);
    }
    setUploadingPhoto(false);
  };

  const handleSaveProfile = async () => {
    if (!firebaseUser?.uid) return;
    setSavingProfile(true);
    try {
      const updateData: Record<string, any> = {
        name: editName,
        phone: editPhone,
      };
      if (editPhotoURL) updateData.photoURL = editPhotoURL;
      await updateUserProfile(firebaseUser.uid, updateData);
      setUser({ ...user!, name: editName, phone: editPhone, photoURL: editPhotoURL } as any);
      useAppStore.getState().setUserProfile({ ...userProfile, phone: editPhone, photoUrl: editPhotoURL });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError("Please fill in both password fields");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    try {
      const user = getCurrentUser();
      if (user && user.email) {
        await sendPasswordReset(user.email);
        setShowPasswordDialog(false);
        alert(`Password reset email sent to ${user.email}. Please check your inbox.`);
      } else {
        setPasswordError("No email associated with this account");
      }
    } catch (err: any) {
      setPasswordError(err.message || "Failed to send reset email");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authLogout();
      setUser(null);
      setFirebaseUser(null);
      setView("login");
    } catch (err) {
      console.error("Error logging out:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await authLogout();
      setUser(null);
      setFirebaseUser(null);
      setView("login");
      localStorage.clear();
    } catch (err) {
      console.error("Error deleting account:", err);
    }
  };

  if (isGuest) {
    return (
      <div className="min-h-screen bg-ev-light dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-20 h-20 rounded-full bg-ev-blue-light dark:bg-white/10 flex items-center justify-center mb-5"
        >
          <User className="w-9 h-9 text-ev-navy/40 dark:text-white/40" />
        </motion.div>
        <h3 className="text-lg font-bold text-ev-navy dark:text-white mb-2">
          Login to access settings
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Sign in to customize your experience, change language, and manage your account
        </p>
        <Button
          onClick={() => setView("login")}
          className="bg-gradient-to-r from-ev-orange to-ev-gold hover:from-ev-orange/90 hover:to-ev-gold/90 text-white font-semibold rounded-xl shadow-lg shadow-ev-orange/20 px-8"
        >
          Login Now
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ev-light dark:bg-gray-950">
      <div className="p-4 space-y-4 pb-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold text-ev-navy dark:text-white">
            {t("settings", language)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customize your experience
          </p>
        </motion.div>

        {/* Profile Section with Photo */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-ev-navy dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-ev-orange" />
            Profile
          </h3>
          <Separator />
          {/* Photo Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {editPhotoURL ? (
                <img src={editPhotoURL} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-ev-orange/30" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-ev-navy/10 dark:bg-white/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-ev-navy/30 dark:text-white/30" />
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-ev-orange text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-ev-orange/90 transition-colors">
                {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ev-navy dark:text-white">{editName || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email || editPhone || "Tap photo to change"}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1">{t("name", language)}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 rounded-xl bg-ev-light dark:bg-gray-800"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">{t("phone", language)}</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="h-10 rounded-xl bg-ev-light dark:bg-gray-800"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">{t("email", language)}</Label>
              <Input
                value={user?.email || ""}
                disabled
                className="h-10 rounded-xl bg-ev-light dark:bg-gray-800 opacity-60"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full h-10 bg-ev-navy hover:bg-ev-dark text-white rounded-xl"
            >
              {savingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : profileSaved ? (
                <>
                  <Check className="w-4 h-4 mr-1" /> Saved
                </>
              ) : (
                t("saveProfile", language) || "Save Profile"
              )}
            </Button>
          </div>
        </motion.section>

        {/* Payment History */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-border"
        >
          <button
            onClick={() => setShowPaymentHistory(!showPaymentHistory)}
            className="w-full flex items-center justify-between p-4 hover:bg-ev-light dark:hover:bg-gray-800 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-ev-green/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-ev-green" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-ev-navy dark:text-white">Payment History</p>
                <p className="text-[11px] text-muted-foreground">{paymentHistory.length} transaction{paymentHistory.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showPaymentHistory ? "rotate-180" : ""}`} />
          </button>
          {showPaymentHistory && (
            <div className="px-4 pb-4 space-y-2">
              {loadingHistory ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-ev-orange" /></div>
              ) : paymentHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No payment history yet</p>
              ) : (
                paymentHistory.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-ev-light dark:bg-gray-800 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-ev-navy dark:text-white">{p.planName || "Payment"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ev-navy dark:text-white">₹{(p.amount || 0) / 100}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === "captured" || p.verified ? "bg-green-100 text-ev-green" : p.status === "failed" ? "bg-red-100 text-ev-red" : "bg-yellow-100 text-yellow-600"}`}>
                        {p.status === "captured" || p.verified ? "Success" : p.status === "failed" ? "Failed" : p.status || "Pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.section>

        {/* Premium Status */}
        {useAppStore.getState().subscription.isPremium && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-gradient-to-r from-ev-navy to-blue-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-ev-gold" />
              <div>
                <p className="text-sm font-bold text-white">Premium Member</p>
                <p className="text-[11px] text-white/60">
                  {useAppStore.getState().subscription.planName || "Active"} • Expires {useAppStore.getState().subscription.premiumExpiry ? new Date(useAppStore.getState().subscription.premiumExpiry).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* Change Password */}
        {firebaseUser?.email && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-900 rounded-xl border border-border"
          >
            <button
              onClick={() => setShowPasswordDialog(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-ev-light dark:hover:bg-gray-800 transition-colors rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-ev-orange-light dark:bg-ev-orange/15 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-ev-orange" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-ev-navy dark:text-white">Change Password</p>
                  <p className="text-[11px] text-muted-foreground">Update your account password</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.section>
        )}

        {/* Language Selector */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-ev-navy dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-ev-orange" />
            {t("language", language)}
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`flex flex-col items-center gap-0.5 py-3 rounded-xl text-center transition-all ${
                  language === lang.code
                    ? "bg-ev-navy text-white shadow-sm"
                    : "bg-ev-light dark:bg-gray-800 text-ev-navy dark:text-white/70 hover:bg-ev-blue-light dark:hover:bg-white/10"
                }`}
              >
                <span className="text-lg font-bold">{lang.label}</span>
                <span className="text-[9px] opacity-70">{lang.native}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Dark Mode Toggle */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-ev-navy/10 dark:bg-white/10 flex items-center justify-center">
                {isDark ? (
                  <Moon className="w-4 h-4 text-ev-gold" />
                ) : (
                  <Sun className="w-4 h-4 text-ev-orange" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-ev-navy dark:text-white">
                  {t("darkMode", language)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isDark ? "Dark theme active" : "Light theme active"}
                </p>
              </div>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleDark} />
          </div>
        </motion.section>

        {/* Notification Preferences */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-ev-green/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-ev-green" />
              </div>
              <div>
                <p className="text-sm font-medium text-ev-navy dark:text-white">
                  Notifications
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Receive push notifications
                </p>
              </div>
            </div>
            <Switch
              checked={notificationEnabled}
              onCheckedChange={setNotificationEnabled}
            />
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-ev-navy dark:text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-ev-orange" />
            {t("about", language)}
          </h3>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">App Version</span>
              <span className="text-ev-navy dark:text-white font-medium">{appSettings.appVersion || "1.0.0"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Developer</span>
              <span className="text-ev-navy dark:text-white font-medium">{appSettings.appName || "EXAMVAULT"} Team</span>
            </div>
          </div>
        </motion.section>

        {/* Links */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-border divide-y divide-border"
        >
          <SettingLink
            icon={<Shield className="w-4 h-4 text-ev-purple" />}
            iconBg="bg-ev-purple/10 dark:bg-ev-purple/15"
            label="Privacy Policy"
            onClick={() => window.open("https://examvault.app/privacy", "_blank", "noopener")}
          />
          <SettingLink
            icon={<FileText className="w-4 h-4 text-ev-orange" />}
            iconBg="bg-ev-orange-light dark:bg-ev-orange/15"
            label="Terms of Service"
            onClick={() => window.open("https://examvault.app/terms", "_blank", "noopener")}
          />
        </motion.section>

        {/* Logout Button */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="outline"
            className="w-full h-11 border-ev-red/30 text-ev-red hover:bg-ev-red hover:text-white rounded-xl"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                {t("logout", language)}
              </>
            )}
          </Button>
        </motion.section>

        {/* Delete Account */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full h-11 text-ev-red/70 hover:text-ev-red hover:bg-ev-red/10 rounded-xl"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-ev-red" />
                  Delete Account?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-ev-red hover:bg-ev-red/90 text-white"
                >
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.section>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-ev-orange" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
              className="rounded-xl"
            >
              {t("cancel", language)}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={passwordLoading}
              className="bg-ev-navy hover:bg-ev-dark text-white rounded-xl"
            >
              {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingLink({
  icon,
  iconBg,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-ev-light dark:hover:bg-gray-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-ev-navy dark:text-white">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
