"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { onAuthChange, logout as authLogout } from "@/lib/services/auth";
import {
  getNotifications,
  getMockTests, getPopularTests, getFreeTests, getDailyQuiz,
  getPreviousPapers, getPreviousPaperById, getNotes, getNoteById, getBanners, getTestSeries,
  getAnnouncements, getQuestions, getLeaderboard, getAppSettings,
  getCategories, getSubcategories, getPlansByScope, trackPdfDownload, hasUserDownloadedPdf,
  type CategoryData, type PremiumPlan,
  saveTestResult, getUserTestResults, getTestLeaderboard,
  addLeaderboardEntry, updateLeaderboardEntry,
  checkSubscriptionStatus, hasPurchasedItem,
  BannerData, AnnouncementData, QuestionData, LeaderboardData, TestResultData,
  NotesData, PreviousPaperData,
  getMockTestById, getFreeTestById, getDailyQuizById, getTestSeriesById, getPopularTestById,
} from "@/lib/services/firestore";
import { db } from "@/lib/firebase";
import { onSnapshot, query, where, collection, getDoc, doc, getDocs } from "firebase/firestore";
import {
  Home, BookOpen, Trophy, FileText, Notebook, User, Settings, HelpCircle,
  ChevronRight, ChevronLeft, Bell, Search, Clock, Star, Zap, Award, Target, TrendingUp,
  Users, Megaphone,
  CalendarDays, Smartphone, Mail,
  Brain, Flame, Sparkles,
  Menu, X, LogOut, ArrowLeft,
  Edit, Download, Crown, Timer, AlertTriangle, Camera, Loader2,
  CheckCircle, Bookmark, SkipForward, Grid3X3, Trash2, ExternalLink, ShoppingCart
} from "lucide-react";

// User Components
import LoginScreen from "@/components/user/LoginScreen";
import UpcomingExamsTab from "@/components/user/UpcomingExamsTab";
import UpcomingExamDetail from "@/components/user/UpcomingExamDetail";
import DailyTipsTab from "@/components/user/DailyTipsTab";
import DailyTipDetail from "@/components/user/DailyTipDetail";
import AnnouncementDetail from "@/components/user/AnnouncementDetail";
import NotificationPanel from "@/components/user/NotificationPanel";
import SettingsTab from "@/components/user/SettingsTab";
import SupportTab from "@/components/user/SupportTab";
import PricingPage from "@/components/user/PricingPage";
import PaymentModal from "@/components/user/PaymentModal";

// Shared Components
import GuestLockModal from "@/components/shared/GuestLockModal";

// ==================== ACCESS TYPE HELPER ====================
// Resolves whether an item is free or premium based on:
// 1. accessType field (new, explicitly set by admin)
// 2. isFree field (legacy fallback)
// 3. price field (if price > 0, it's premium)
function isItemFree(item: any): boolean {
  if (item.accessType === "free") return true;
  if (item.accessType === "premium") {
    // Premium item — but if no price, treat as FREE (admin's responsibility)
    const price = Number(item.price || 0);
    return price <= 0;
  }
  // Fallback for old data without accessType
  if (item.isFree === true) return true;
  if (item.isFree === false) return false;
  // Last resort: check price
  if (item.price && Number(item.price) > 0) return false;
  // No accessType, no isFree, no price = FREE
  return true;
}

// ==================== PROGRESS TRACKING ====================
// Track which items a user has viewed/completed
function getViewedItems(category: string): Set<string> {
  try {
    const uid = useAppStore.getState().firebaseUser?.uid || "guest";
    const key = `ev_progress_${uid}_${category}`;
    const data = localStorage.getItem(key);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch { return new Set(); }
}

function markItemViewed(category: string, itemId: string) {
  try {
    const uid = useAppStore.getState().firebaseUser?.uid || "guest";
    const key = `ev_progress_${uid}_${category}`;
    const existing = getViewedItems(category);
    existing.add(itemId);
    localStorage.setItem(key, JSON.stringify([...existing]));
  } catch {}
}

function getProgressText(category: string, total: number, lang: string): string | null {
  if (total <= 0) return null;
  const viewed = getViewedItems(category).size;
  if (lang === "bn") return `${viewed}/${total} সম্পন্ন`;
  return `${viewed}/${total} completed`;
}

function getProgressPercent(category: string, total: number): number {
  if (total <= 0) return 0;
  const viewed = getViewedItems(category).size;
  return Math.round((viewed / total) * 100);
}

// ==================== BACK BUTTON HANDLER (Module-level) ====================
// MUST run ONCE at module load time, NOT inside useEffect.
// Running inside useEffect caused timing issues on mobile PWA — the popstate
// listener wasn't registered before the user could press back, and the
// __evPopstateDone guard could block re-registration after HMR.
// Module-level code runs synchronously when the JS bundle loads, so the
// sentinel entries and listener are always in place before any user interaction.

// Detect if running inside Android WebView — back button is handled natively there
const _isAndroidWebView = typeof window !== 'undefined' && /wv/.test(navigator.userAgent);

if (typeof window !== 'undefined' && !(window as any).__evBackInit) {
  (window as any).__evBackInit = true;

  // Expose Zustand store globally so Android WebView can call goBack() via JS
  (window as any).__ZUSTAND_STORE__ = useAppStore;

  // In Android WebView, the native back button calls __ZUSTAND_STORE__.goBack()
  // via evaluateJavascript — no popstate listener needed (it caused double-back).
  // We only register popstate for PWA / browser mode.
  if (!_isAndroidWebView) {
    // Push TWO sentinel entries for buffer.
    // On Android PWA, when the user presses back and there are zero history entries
    // ahead of the current position, the system closes the app WITHOUT firing popstate.
    // Two sentinels guarantee the browser always has at least one pushState entry to
    // navigate back through, giving our handler a chance to re-push and intercept.
    window.history.pushState({ appState: true }, '');
    window.history.pushState({ appState: true }, '');

    // Debounce flag — some mobile browsers fire popstate twice for a single back press.
    let _popstateDebounce = false;

    const handlePopstate = () => {
      // Skip if this is a rapid double-fire
      if (_popstateDebounce) return;
      _popstateDebounce = true;
      setTimeout(() => { _popstateDebounce = false; }, 250);

      const store = useAppStore.getState();

      // If the app is in the process of exiting, don't interfere
      if (store.isExitingApp) return;

      // Re-push sentinel IMMEDIATELY so the browser can't run out of history entries.
      window.history.pushState({ appState: true }, '');

      // Decide what to do based on app navigation state
      if (store.examBackWarning !== undefined && store.currentView === 'exam') {
        // During exam, show warning dialog instead of going back
        store.setExamBackWarning(true);
        return;
      }
      if (store.canGoBack()) {
        // There's a previous view in the app's history — go back
        store.goBack();
      } else if (store.currentView === 'home') {
        // At home with no history — show exit confirmation dialog
        store.setExitConfirmVisible(true);
      } else {
        // On a non-home root view (edge case) — go to home first
        store.setView('home');
      }
    };

    window.addEventListener('popstate', handlePopstate);

    // Handle back-forward cache (bfcache) restore — when the browser restores
    // the page from cache, the sentinel entries may be gone.
    window.addEventListener('pageshow', (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.history.pushState({ appState: true }, '');
        window.history.pushState({ appState: true }, '');
      }
    });
  }
}

// ==================== IN-FILE ERROR BOUNDARY ====================
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("AppErrorBoundary:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-5">
            <span className="text-3xl">💥</span>
          </div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Something Crashed</h2>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 max-w-md w-full">
            <p className="text-sm text-red-700 font-mono" style={{wordBreak:'break-word'}}>
              {this.state.error.message}
            </p>
            {this.state.error.stack && (
              <pre className="mt-3 text-xs text-red-500 overflow-auto max-h-40 whitespace-pre-wrap" style={{wordBreak:'break-word'}}>
                {this.state.error.stack.split('\n').slice(0, 15).join('\n')}
              </pre>
            )}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, BookOpen, Trophy, Crown, Zap, Brain, FileText, Notebook,
  CalendarDays, Sparkles, Award, User, Settings, HelpCircle,
  Megaphone, Bell, Star, Target, TrendingUp,
};

// Quick link gradient/bg mapping
const QUICKLINK_BG: Record<string, string> = {
  "text-ev-navy": "bg-gradient-to-br from-ev-navy to-blue-800 shadow-ev-navy/30",
  "text-ev-orange": "bg-gradient-to-br from-ev-orange to-orange-600 shadow-ev-orange/30",
  "text-ev-gold": "bg-gradient-to-br from-ev-gold to-amber-500 shadow-amber-500/30",
  "text-ev-green": "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30",
  "text-purple-600": "bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/30",
  "text-blue-600": "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30",
  "text-cyan-600": "bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-cyan-500/30",
  "text-amber-600": "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30",
  "text-teal-600": "bg-gradient-to-br from-teal-500 to-teal-600 shadow-teal-500/30",
  "text-ev-red": "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30",
  "text-gray-600": "bg-gradient-to-br from-gray-500 to-gray-600 shadow-gray-500/30",
};

// Default nav items (fallback when no Firestore data)
const DEFAULT_BOTTOM_NAV = [
  { label: "Home", icon: "Home", targetView: "home", location: "bottomnav", order: 0, isActive: true, color: "text-ev-navy", requireAuth: false },
  { label: "Mock Tests", icon: "BookOpen", targetView: "mocktests", location: "bottomnav", order: 1, isActive: true, color: "text-blue-600", requireAuth: false },
  { label: "Leaderboard", icon: "Award", targetView: "leaderboard", location: "bottomnav", order: 2, isActive: true, color: "text-amber-600", requireAuth: false },
  { label: "Notes", icon: "Notebook", targetView: "notes", location: "bottomnav", order: 3, isActive: true, color: "text-teal-600", requireAuth: false },
  { label: "Profile", icon: "User", targetView: "profile", location: "bottomnav", order: 4, isActive: true, color: "text-ev-navy", requireAuth: false },
];

const DEFAULT_SIDE_MENU = [
  { label: "Home", icon: "Home", targetView: "home", location: "sidemenu", order: 0, isActive: true, color: "text-ev-navy", requireAuth: false },
  { label: "Mock Tests", icon: "BookOpen", targetView: "mocktests", location: "sidemenu", order: 1, isActive: true, color: "text-blue-600", requireAuth: false },
  { label: "Premium Plans", icon: "Crown", targetView: "pricing", location: "sidemenu", order: 2, isActive: true, color: "text-ev-gold", requireAuth: false },
  { label: "Free Tests", icon: "Zap", targetView: "free-tests", location: "sidemenu", order: 3, isActive: true, color: "text-ev-green", requireAuth: false },
  { label: "Free Quizzes", icon: "Brain", targetView: "free-quizzes", location: "sidemenu", order: 4, isActive: true, color: "text-purple-600", requireAuth: false },
  { label: "Previous Papers", icon: "FileText", targetView: "previous-papers", location: "sidemenu", order: 5, isActive: true, color: "text-ev-orange", requireAuth: false },
  { label: "Upcoming Exams", icon: "CalendarDays", targetView: "upcoming-exams", location: "sidemenu", order: 6, isActive: true, color: "text-cyan-600", requireAuth: false },
  { label: "Daily Tips", icon: "Sparkles", targetView: "daily-tips", location: "sidemenu", order: 7, isActive: true, color: "text-amber-600", requireAuth: false },
  { label: "Notes", icon: "Notebook", targetView: "notes", location: "sidemenu", order: 8, isActive: true, color: "text-teal-600", requireAuth: false },
  { label: "Leaderboard", icon: "Award", targetView: "leaderboard", location: "sidemenu", order: 9, isActive: true, color: "text-amber-600", requireAuth: false },
  { label: "Profile", icon: "User", targetView: "profile", location: "sidemenu", order: 10, isActive: true, color: "text-ev-navy", requireAuth: false },
  { label: "Settings", icon: "Settings", targetView: "settings", location: "sidemenu", order: 11, isActive: true, color: "text-gray-600", requireAuth: false },
  { label: "Support", icon: "HelpCircle", targetView: "support", location: "sidemenu", order: 12, isActive: true, color: "text-ev-orange", requireAuth: false },
];

const DEFAULT_QUICK_LINKS = [
  { label: "Free Tests", icon: "Zap", targetView: "free-tests", location: "quicklinks", order: 0, isActive: true, color: "text-ev-green", requireAuth: false },
  { label: "Test Series", icon: "Trophy", targetView: "test-series", location: "quicklinks", order: 1, isActive: true, color: "text-ev-gold", requireAuth: false },
  { label: "Previous Papers", icon: "FileText", targetView: "previous-papers", location: "quicklinks", order: 2, isActive: true, color: "text-ev-orange", requireAuth: false },
  { label: "Notes", icon: "Notebook", targetView: "notes", location: "quicklinks", order: 3, isActive: true, color: "text-purple-600", requireAuth: false },
];

// ==================== ALL DATA FROM FIREBASE ====================
// ==================== HEADER ====================
function Header() {
  const { setView, setSidebarOpen, language, setLanguage, unreadNotificationCount, user } = useAppStore();
  const subscription = useAppStore(s => s.subscription);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const lang = language;

  return (
    <>
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] shadow-lg">
        {/* Top Row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Menu className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <span className="text-lg">📚</span>
              </div>
              <h1 className="text-lg font-black text-white leading-tight tracking-tight">
                EXAM<span className="text-amber-400">VAULT</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(subscription.isPremium || (subscription.purchasedItemIds?.length > 0)) ? (
              <button onClick={() => setView("my-purchases")} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-400 text-xs font-bold border border-amber-400/30">
                <Crown className="w-3 h-3" /> PRO
              </button>
            ) : user?.role !== "guest" ? (
              <button onClick={() => setView("pricing")} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-400 text-xs font-bold border border-amber-400/30 animate-pulse">
                <Crown className="w-3 h-3" /> Upgrade
              </button>
            ) : null}
            <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Search className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => setShowNotifications(true)} className="p-2 rounded-xl hover:bg-white/10 transition-colors relative">
              <Bell className="w-5 h-5 text-white" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-[#0B1437] text-[10px] text-white font-bold flex items-center justify-center px-1">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar (expandable) */}
        {showSearch && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    setShowSearch(false);
                    setView("mocktests");
                  }
                }}
                placeholder="Search tests, exams, categories..."
                className="w-full pl-10 pr-10 py-2.5 bg-white/10 text-white placeholder-white/50 rounded-xl border border-white/20 focus:outline-none focus:border-amber-400/50 text-sm"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-white/50 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}

// ==================== SIDE MENU ====================
function SideMenu() {
  const { sidebarOpen, setSidebarOpen, setView, setUser, user, navigationItems } = useAppStore();
  const requireAuth = useRequireAuth();

  const menuItems = navigationItems.filter(i => i.location === "sidemenu").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const fallback = menuItems.length === 0 ? DEFAULT_SIDE_MENU : menuItems;

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50" onClick={() => setSidebarOpen(false)} />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 shadow-2xl overflow-y-auto"
          >
            <div className="bg-gradient-to-br from-ev-navy to-blue-800 p-6 pb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center shadow-lg">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">EXAM<span className="text-ev-orange">VAULT</span></h2>
                    <p className="text-white/60 text-xs">{user?.name || "Guest User"}</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl bg-white/10">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              {(!user || user.role === "guest") && (
                <button onClick={() => { setView("login"); setSidebarOpen(false); }} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-semibold text-sm">
                  Login / Register
                </button>
              )}
            </div>
            <div className="py-4">
              {fallback.map((item, idx) => {
                const IconComp = ICON_MAP[item.icon] || HelpCircle;
                return (
                  <button
                    key={item.id || idx}
                    onClick={() => {
                      setSidebarOpen(false);
                      if (item.requireAuth) requireAuth(() => setView(item.targetView as any));
                      else setView(item.targetView as any);
                    }}
                    className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <IconComp className={"w-5 h-5 " + (item.color || "")} />
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>
                );
              })}
              {user?.role === "user" && (
                <button onClick={async () => { try { await authLogout(); } catch(e) { console.error(e); } setUser(null); setFirebaseUser(null); setView("login"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-6 py-3 text-red-600 font-semibold hover:bg-red-50 transition-colors">
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              )}
              {user?.role === "guest" && (
                <button onClick={() => { setUser(null); setView("login"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-6 py-3 text-red-600 font-semibold hover:bg-red-50 transition-colors">
                  <LogOut className="w-5 h-5" /> Exit Guest Mode
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== AUTH CHECK HOOK ====================
function useRequireAuth(): (action: () => void) => void {
  const { user, setView } = useAppStore();
  return (action: () => void) => {
    // No user or guest → go to login page directly
    if (!user || user.role === "guest") {
      setView("login");
    } else {
      action();
    }
  };
}

// Premium access checker - shows pricing if not premium
function useRequirePremium(): (testId: string, isFree: boolean, action: () => void, buyInfo?: { name: string; price: number }) => void {
  const { subscription, setView, setShowPaymentModal, setPaymentModalData, user, setShowGuestModal } = useAppStore();
  return (testId: string, isFree: boolean, action: () => void, buyInfo?: { name: string; price: number }) => {
    // Free tests — always allow (even without login)
    if (isFree) {
      action();
      return;
    }
    // No user or guest → go to login page
    if (!user || user.role === "guest") {
      setView("login");
      return;
    }
    // Premium test — check subscription
    if (subscription.isPremium) {
      action();
      return;
    }
    // Check if purchased individually
    if (subscription.purchasedItemIds.includes(testId)) {
      action();
      return;
    }
    // If buyInfo provided, open direct payment modal for this item
    if (buyInfo && buyInfo.price > 0) {
      setPaymentModalData({
        planId: testId,
        planName: buyInfo.name,
        amount: buyInfo.price,
        type: "one_time",
      });
      setShowPaymentModal(true);
      return;
    }
    // Not premium — show pricing page
    setView("pricing");
  };
}

// ==================== AUTO ROTATING BANNERS ====================
function handleBannerClick(b: BannerData, setView: (v: string) => void) {
  const linkType = b.linkType || "none";
  if (linkType === "internal" && b.targetView) {
    setView(b.targetView);
  } else if (linkType === "external" && b.link) {
    window.open(b.link, "_blank");
  } else if (linkType === "detail") {
    // No detail view for banners yet, fallback to mocktests
    setView("mocktests");
  } else {
    // "none" or fallback
    if (b.link) {
      window.open(b.link, "_blank");
    } else if (b.targetView) {
      setView(b.targetView);
    } else {
      setView("mocktests");
    }
  }
}

function AutoRotatingBanners() {
  const { setView } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  // Real-time listener for banners
  useEffect(() => {
    const q = query(collection(db, "banners"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => {
        const raw = d.data();
        return { ...raw, id: d.id } as BannerData;
      });
      data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setBanners(data);
    }, (error) => {
      console.error("Banner real-time error:", error);
      getBanners().then(data => { if (data) setBanners(data); });
    });
    return () => unsubscribe();
  }, []);

  // Auto-rotate every 3 seconds (pause on interaction)
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  // Scroll to current index using CSS transform
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.style.transform = `translateX(-${currentIndex * 100}%)`;
      scrollRef.current.style.transition = 'transform 0.4s ease';
    }
  }, [currentIndex]);

  // Native touch handlers for reliable swipe in WebView (non-passive)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
      setIsPaused(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = touchStartX.current - e.touches[0].clientX;
      const dy = touchStartY.current - e.touches[0].clientY;
      // If horizontal swipe is dominant, prevent vertical scroll and mark as swiping
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
        isSwiping.current = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const diff = touchStartX.current - endX;
      if (Math.abs(diff) > 30 && banners.length > 1) {
        isSwiping.current = true;
        if (diff > 0) {
          setCurrentIndex(prev => (prev + 1) % banners.length);
        } else {
          setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
        }
      }
      setTimeout(() => setIsPaused(false), 3000);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [banners.length]);

  const gradients = ["from-ev-navy to-blue-800", "from-ev-orange to-orange-700", "from-ev-gold to-yellow-600", "from-green-500 to-emerald-600", "from-purple-500 to-purple-600"];

  if (banners.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div ref={scrollRef} className="flex" style={{ transform: `translateX(-${currentIndex * 100}%)`, transition: 'transform 0.4s ease' }}>
        {banners.map((b, i) => (
          <motion.div
            key={b.id || i}
            className={"min-w-full flex-shrink-0 rounded-2xl bg-gradient-to-r " + (b.gradient || b.color || gradients[i % gradients.length]) + " p-5 flex items-center justify-between shadow-lg cursor-pointer"}
            onClick={() => { if (!isSwiping.current) handleBannerClick(b, setView); }}
          >
            <div>
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Featured</span>
              <h3 className="text-lg font-bold text-white mt-1">{b.title}</h3>
              {b.subtitle && <p className="text-white/70 text-sm mt-1">{b.subtitle}</p>}
              <button className="mt-2 px-4 py-1.5 rounded-lg bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-all">
                {b.linkText || "Explore →"}
              </button>
            </div>
            {b.imageUrl ? (
              <img src={b.imageUrl} alt={b.title} className="w-20 h-20 rounded-xl object-cover shadow-lg" />
            ) : (
              <span className="text-5xl">🎯</span>
            )}
          </motion.div>
        ))}
      </div>
      {/* Left/Right Arrow Buttons */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % banners.length); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setIsPaused(true); setTimeout(() => setIsPaused(false), 3000); }}
              className={"w-2 h-2 rounded-full transition-all " + (i === currentIndex ? "bg-ev-orange w-6" : "bg-gray-300")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== ANNOUNCEMENT CAROUSEL ====================
function handleAnnouncementClick(a: AnnouncementData, setView: (v: string) => void) {
  const linkType = a.linkType || "detail";
  if (linkType === "internal" && a.targetView) {
    setView(a.targetView);
  } else if (linkType === "external" && a.link) {
    window.open(a.link, "_blank");
  } else if (linkType === "detail") {
    // Show announcement detail
    useAppStore.getState().setSelectedAnnouncementId(a.id);
    setView("announcement-detail");
  }
  // "none" → do nothing
}

function AnnouncementCarousel({ announcements }: { announcements: AnnouncementData[] }) {
  const { setView } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  // Auto-scroll every 3 seconds
  useEffect(() => {
    if (announcements.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [announcements.length, isPaused]);

  // Native touch handlers for reliable swipe in WebView (non-passive)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
      setIsPaused(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = touchStartX.current - e.touches[0].clientX;
      const dy = touchStartY.current - e.touches[0].clientY;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
        isSwiping.current = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const diff = touchStartX.current - endX;
      if (Math.abs(diff) > 30 && announcements.length > 1) {
        isSwiping.current = true;
        if (diff > 0) {
          setCurrentIndex(prev => (prev + 1) % announcements.length);
        } else {
          setCurrentIndex(prev => (prev - 1 + announcements.length) % announcements.length);
        }
      }
      setTimeout(() => setIsPaused(false), 2000);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [announcements.length]);

  if (announcements.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-2">No announcements yet</p>;
  }

  const a = announcements[currentIndex];

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={a.id || currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          onClick={() => { if (!isSwiping.current) handleAnnouncementClick(a, setView); }}
          className="cursor-pointer hover:bg-ev-orange/5 rounded-lg px-1 py-1.5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {a.type === "new" && <Sparkles className="w-3.5 h-3.5 text-ev-green flex-shrink-0" />}
              {a.type === "alert" && <AlertTriangle className="w-3.5 h-3.5 text-ev-orange flex-shrink-0" />}
              {a.type === "offer" && <Flame className="w-3.5 h-3.5 text-ev-red flex-shrink-0" />}
              {a.type === "info" && <Bell className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
              {a.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
              {a.type === "urgent" && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
              {a.type === "update" && <Sparkles className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />}
              {(!a.type || (a.type !== "new" && a.type !== "alert" && a.type !== "offer" && a.type !== "info" && a.type !== "warning" && a.type !== "urgent" && a.type !== "update")) && <Megaphone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
              <span className="text-sm text-gray-700 truncate">{a.title}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
          </div>
          {a.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1 pl-6">{a.description}</p>
          )}
        </motion.div>
      </AnimatePresence>
      {/* Navigation arrows for multiple announcements */}
      {announcements.length > 1 && (
        <div className="flex items-center justify-between mt-2">
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + announcements.length) % announcements.length); setIsPaused(true); setTimeout(() => setIsPaused(false), 2000); }} className="p-1 rounded-lg hover:bg-ev-orange/10 text-gray-400 hover:text-ev-orange transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            {announcements.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); setIsPaused(true); setTimeout(() => setIsPaused(false), 2000); }} className={"rounded-full transition-all " + (i === currentIndex ? "w-4 h-1.5 bg-ev-orange" : "w-1.5 h-1.5 bg-ev-orange/30")} />
            ))}
          </div>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % announcements.length); setIsPaused(true); setTimeout(() => setIsPaused(false), 2000); }} className="p-1 rounded-lg hover:bg-ev-orange/10 text-gray-400 hover:text-ev-orange transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== HOME TAB ====================
function HomeTab() {
  const { setView, user, currentView, navigationItems, subscription, firebaseUser } = useAppStore();
  const lang = useAppStore(s => s.language);
  const requireAuth = useRequireAuth();
  const requirePremium = useRequirePremium();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [popularTests, setPopularTests] = useState<any[]>([]);
  const [dailyQuizzes, setDailyQuizzes] = useState<any[]>([]);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);

  // Fetch data from Firestore
  useEffect(() => {
    const q = query(collection(db, "announcements"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as AnnouncementData));
      data.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
        return dateB - dateA;
      });
      setAnnouncements(data);
    }, (error) => { console.error("Announcement real-time error:", error); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentView !== "home") return;
    async function fetchData() {
      try {
        const [popData, quizData, testData, seriesData, catData] = await Promise.all([
          getPopularTests(), getDailyQuiz(), getMockTests(), getTestSeries(), getCategories(),
        ]);
        if (popData) setPopularTests(popData);
        if (quizData) setDailyQuizzes(quizData);
        if (testData) setMockTests(testData);
        if (seriesData) setTestSeries(seriesData);
        if (catData) setCategories(catData);
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, [currentView]);

  // Fetch recent test results for "Continue Learning"
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    import("@/lib/services/firestore").then(({ getUserTestResults }) => {
      getUserTestResults(firebaseUser.uid).then(results => {
        setRecentResults((results as any[])?.slice(0, 3) || []);
      }).catch(() => {});
    });
  }, [firebaseUser?.uid]);

  // Unique categories from all tests
  const allTests = [...mockTests, ...popularTests, ...testSeries];
  // Use categories from Firestore, fallback to test-derived categories
  const displayCategories = categories.length > 0 ? categories : Array.from(new Set(allTests.map((t: any) => t.category).filter(Boolean))).slice(0, 8).map((cat: string, i: number) => ({
    id: cat,
    name: cat,
    icon: ["🏦", "🚂", "📋", "🎓", "👮", "📊", "⚖️", "📝"][i % 8],
    color: "from-blue-500 to-indigo-600",
  } as CategoryData));

  const navQuickLinks = navigationItems.filter(i => i.location === "quicklinks").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const quickLinksData = navQuickLinks.length === 0 ? DEFAULT_QUICK_LINKS : navQuickLinks.slice(0, 4);

  return (
    <div className="pb-6 bg-[#F8FAFC] min-h-screen">
      {/* 1. Welcome (inside header gradient extension) */}
      <div className="bg-gradient-to-b from-[#0B1437] to-[#1E2A5E] px-4 pb-6 pt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-xs">{new Date().toLocaleDateString(lang === "bn" ? "bn-IN" : lang === "hi" ? "hi-IN" : lang === "as" ? "as-IN" : "en-IN", { weekday: "long", day: "numeric", month: "short" })}</p>
            <h2 className="text-xl font-bold text-white">
              {user?.role === "guest" ? `${t("welcome", lang)} 👋` : `Hi, ${user?.name?.split(" ")[0] || "User"} 👋`}
            </h2>
          </div>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-amber-400/50 object-cover" />
          ) : (
            <button onClick={() => setView("profile")} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border-2 border-amber-400/30">
              <User className="w-5 h-5 text-white/70" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Auto Banner Slider */}
      <div className="px-4 -mt-4 mb-5">
        <AutoRotatingBanners />
      </div>

      {/* 3. Quick Links Grid (Categories) */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-4 gap-3">
          {quickLinksData.map((item, i) => {
            const IconComp = ICON_MAP[item.icon] || Zap;
            const bgClass = QUICKLINK_BG[item.color] || "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30";
            return (
            <motion.button
              key={item.id || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => {
                if (item.requireAuth) requireAuth(() => setView(item.targetView as any));
                else setView(item.targetView as any);
              }}
              className="flex flex-col items-center gap-2"
            >
              <div className={"w-14 h-14 rounded-2xl " + bgClass + " shadow-lg flex items-center justify-center"}>
                <IconComp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{item.label}</span>
            </motion.button>
            );
          })}
        </div>
      </div>

      {/* 4. Popular Categories Pills */}
      {displayCategories.length > 0 && (
        <div className="px-4 mb-5">
          <h3 className="text-base font-bold text-[#0B1437] mb-3">Popular Categories</h3>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {displayCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  useAppStore.getState().setSelectedCategory(cat.id!);
                  setView("category-detail");
                }}
                className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-semibold text-gray-700 whitespace-nowrap shadow-sm hover:border-blue-500 hover:text-blue-600 transition-colors active:scale-95 flex items-center gap-1.5"
              >
                {cat.icon && <span>{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Premium Banner */}
      {!(subscription.isPremium || subscription.purchasedItemIds?.length > 0) && user?.role !== "guest" && (
        <div className="px-4 mb-5">
          <button
            onClick={() => setView("pricing")}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 shadow-lg shadow-amber-500/30 text-left active:scale-[0.98] transition-transform relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 opacity-20">
              <Crown className="w-24 h-24 text-white -mr-4 -mt-4" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-white" />
                <span className="text-white font-black text-sm uppercase tracking-wide">Premium</span>
              </div>
              <h4 className="text-white font-bold text-lg">Unlock All Tests & Features</h4>
              <p className="text-white/80 text-xs mt-1">Get unlimited access to mock tests, previous papers & more</p>
              <div className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-lg text-white text-xs font-bold">
                View Plans →
              </div>
            </div>
          </button>
        </div>
      )}

      {/* 6. Continue Learning */}
      {recentResults.length > 0 && (
        <div className="px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#0B1437]">Continue Learning</h3>
            <button onClick={() => setView("profile")} className="text-blue-600 text-xs font-semibold">View All →</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {recentResults.map((r, i) => (
              <button
                key={r.id || i}
                onClick={() => { useAppStore.getState().setSelectedTest(r.testId); useAppStore.getState().setSelectedTestType("mockTest"); setView("test-info"); }}
                className="min-w-[200px] bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-left active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{r.testCategory}</span>
                </div>
                <h4 className="text-sm font-bold text-[#0B1437] truncate">{r.testTitle}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-bold text-emerald-600">{r.scoredMarks}/{r.totalMarks}</span>
                  <span className="text-[10px] text-gray-400">• {r.accuracy}% accuracy</span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${r.accuracy}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 7. Announcements - Auto-scrolling */}
      {announcements.length > 0 && (
        <div className="px-4 mb-5">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-orange-600 uppercase tracking-wider">{t("announcements", lang)}</span>
              </div>
              <div className="flex items-center gap-1" id="announcement-dots">
                {announcements.map((_, i) => (
                  <span key={i} className={"w-1.5 h-1.5 rounded-full transition-all announcement-dot-" + i + " " + (i === 0 ? "bg-orange-500 w-3" : "bg-orange-200")} />
                ))}
              </div>
            </div>
            <AnnouncementCarousel announcements={announcements} />
          </div>
        </div>
      )}

      {/* 8. Latest Updates - Upcoming Exams + Daily Tips */}
      <div className="px-4 mb-5">
        <h3 className="text-base font-bold text-[#0B1437] mb-3">Latest Updates</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setView("upcoming-exams")} className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-4 shadow-md text-left active:scale-95 transition-transform">
            <CalendarDays className="w-7 h-7 text-white/90 mb-2" />
            <h4 className="text-sm font-bold text-white">Upcoming Exams</h4>
            <p className="text-white/70 text-[10px] mt-0.5">WBCS, SSC & more</p>
          </button>
          <button onClick={() => setView("daily-tips")} className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 shadow-md text-left active:scale-95 transition-transform">
            <Sparkles className="w-7 h-7 text-white/90 mb-2" />
            <h4 className="text-sm font-bold text-white">Daily Tips</h4>
            <p className="text-white/70 text-[10px] mt-0.5">Expert strategies</p>
          </button>
        </div>
      </div>

      {/* 9. Popular Tests */}
      {popularTests.length > 0 && (
        <div className="px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#0B1437]">{t("popularTests", lang)} 🔥</h3>
            <button onClick={() => setView("mocktests")} className="text-blue-600 text-xs font-semibold">{t("viewAll", lang)} →</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {popularTests.slice(0, 5).map((test, i) => (
              <motion.div
                key={test.id || i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => requirePremium(test.id, isItemFree(test), () => { useAppStore.getState().setSelectedTest(test.id); useAppStore.getState().setSelectedTestType("popularTest"); setView("test-info"); }, { name: test.title, price: test.price || 0 })}
                className="min-w-[220px] bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 overflow-hidden"
              >
                <div className={"h-24 flex items-center justify-center relative " + (isItemFree(test) ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-gradient-to-br from-amber-400 to-orange-500")}>
                  {test.imageUrl ? (
                    <img src={test.imageUrl} alt={test.title} className="w-full h-full object-cover" />
                  ) : (
                    isItemFree(test) ? <Zap className="w-10 h-10 text-white/80" /> : <Crown className="w-10 h-10 text-white/80" />
                  )}
                  <span className={"absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold " + (isItemFree(test) ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>
                    {isItemFree(test) ? t("free", lang) : t("premium", lang)}
                  </span>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{test.category}</span>
                  <h4 className="font-bold text-[#0B1437] text-sm mt-1.5 line-clamp-2">{test.title}</h4>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{test.duration}m</span>
                    <span className="flex items-center gap-0.5"><BookOpen className="w-3 h-3" />{test.questions}Q</span>
                    {!isItemFree(test) && <span className="flex items-center gap-0.5 text-amber-600 font-bold">₹{test.price || 0}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 10. Daily Quiz */}
      {dailyQuizzes.length > 0 && (
        <div className="px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#0B1437]">{t("dailyQuiz", lang)} 🧠</h3>
            <button onClick={() => setView("free-quizzes")} className="text-blue-600 text-xs font-semibold">{t("viewAll", lang)} →</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {dailyQuizzes.map(q => (
              <div
                key={q.id}
                onClick={() => requireAuth(() => { useAppStore.getState().setSelectedTest(q.id); useAppStore.getState().setSelectedTestType("dailyQuiz"); setView("test-info"); })}
                className="min-w-[170px] bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 shadow-lg shadow-purple-500/20 cursor-pointer active:scale-95 transition-transform"
              >
                <Brain className="w-8 h-8 text-white/80 mb-2" />
                <h4 className="text-sm font-bold text-white">{q.title}</h4>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-white/70 flex-wrap">
                  <span>{q.questions} Q</span>
                  <span>•</span>
                  <span>{q.duration} min</span>
                </div>
                <div className="mt-2 text-[10px] text-white/60">{q.participants || 0} joined</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MOCK TESTS TAB ====================
function MockTestsTab() {
  const { setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const subscription = useAppStore(s => s.subscription);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [tests, setTests] = useState<any[]>([]);
  const requireAuth = useRequireAuth();
  const requirePremium = useRequirePremium();

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getMockTests();
        if (data && data.length > 0) setTests(data);
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, []);

  // Extract unique categories from test data for dynamic filters
  const categories = ["All", ...Array.from(new Set(tests.map((t: any) => t.category).filter(Boolean)))];

  // Filter tests by category + search term
  const filteredTests = tests.filter((t: any) => {
    const matchesCategory = filter === "All" || t.category === filter;
    const matchesSearch = !searchTerm ||
      (t.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("mockTests", lang)}</h2>
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-ev-orange text-sm"
            placeholder={t("searchTests", lang)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3">
          {categories.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={"px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all " + (filter === f ? "bg-ev-navy text-white" : "bg-gray-100 text-gray-600")}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 space-y-3">
        {filteredTests.length === 0 ? (
          <div className="text-center py-10">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No tests found</p>
            <p className="text-gray-400 text-xs mt-1">Try a different search or category</p>
          </div>
        ) : (
        filteredTests.map((test: any) => (
          <div key={test.id} onClick={() => requirePremium(test.id, isItemFree(test), () => { useAppStore.getState().setSelectedTest(test.id); useAppStore.getState().setSelectedTestType("mockTest"); setView("test-info"); }, { name: test.title, price: test.price || 0 })} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              {test.imageUrl ? (
                <img src={test.imageUrl} alt={test.title} className="min-w-[5.5rem] w-[5.5rem] aspect-square rounded-2xl object-cover shadow-md" />
              ) : (
                <div className={"min-w-[5.5rem] w-[5.5rem] aspect-square rounded-2xl flex items-center justify-center " + (isItemFree(test) ? "bg-green-50" : "bg-ev-gold-light")}>
                  {isItemFree(test) ? <Zap className="w-9 h-9 text-ev-green" /> : <Crown className="w-9 h-9 text-ev-gold" />}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-ev-navy">{test.title}</h4>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span className="font-bold px-2 py-0.5 rounded-md bg-ev-blue-light text-ev-navy">{test.category}</span>
                  <span>{test.duration} min</span>
                  <span>{test.questions} Q</span>
                  <span>{test.marks || 0} marks</span>
                  {test.subTests && test.subTests.length > 0 && <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-ev-orange/10 text-ev-orange font-bold"><Grid3X3 className="w-3 h-3" />{test.subTests.length}</span>}
                </div>
              </div>
            </div>
            {!isItemFree(test) && (
              subscription.purchasedItemIds.includes(test.id) || subscription.isPremium ? (
                <div className="mt-3 w-full py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 font-bold text-xs flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Active
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); requirePremium(test.id, false, () => {}, { name: test.title, price: Number(test.price) > 0 ? Number(test.price) : 0 }); }} className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition-transform">
                  <ShoppingCart className="w-3.5 h-3.5" /> Buy — ₹{Number(test.price) > 0 ? Number(test.price) : 0}
                </button>
              )
            )}
          </div>
        )))}
      </div>
    </div>
  );
}

// ==================== TEST SERIES TAB ====================
function TestSeriesTab() {
  const { setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const subscription = useAppStore(s => s.subscription);
  const requireAuth = useRequireAuth();
  const requirePremium = useRequirePremium();
  const [series, setSeries] = useState<any[]>([]);
  const [progressKey, setProgressKey] = useState(0);
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());

  // Re-read progress when progressKey changes
  useEffect(() => {
    setViewedItems(getViewedItems("testSeries"));
  }, [progressKey]);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getTestSeries();
        if (data && data.length > 0) setSeries(data);
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, []);

  const progressText = getProgressText("testSeries", series.length, lang);
  const progressPercent = getProgressPercent("testSeries", series.length);

  return (
    <div className="pb-6" key={progressKey}>
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("testSeries", lang)}</h2>
        {series.length > 0 && progressText && (
          <div className="mb-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-ev-navy">{lang === "bn" ? "আপনার অগ্রগতি" : "Your Progress"}</span>
              <span className="text-xs font-bold text-ev-orange">{progressText}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-ev-orange to-ev-gold h-2 rounded-full transition-all" style={{ width: progressPercent + "%" }} />
            </div>
          </div>
        )}
      </div>
      <div className="px-4 space-y-3">
        {series.map(s => {
          const isViewed = viewedItems.has(s.id || "");
          return (
            <div key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3" onClick={() => requirePremium(s.id, isItemFree(s), () => { markItemViewed("testSeries", s.id || ""); setProgressKey(k => k + 1); useAppStore.getState().setSelectedTest(s.id); useAppStore.getState().setSelectedTestType("testSeries"); setView("test-info"); }, { name: s.title, price: s.price || 0 })}>
                {s.imageUrl ? (
                  <img src={s.imageUrl} alt={s.title} className="min-w-[5.5rem] w-[5.5rem] aspect-square rounded-2xl object-cover shadow-md flex-shrink-0" />
                ) : (
                  <div className="min-w-[5.5rem] w-[5.5rem] aspect-square rounded-2xl bg-ev-gold-light flex items-center justify-center flex-shrink-0"><Trophy className="w-9 h-9 text-ev-gold" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-ev-navy truncate">{s.title}</h4>
                    {isViewed && <CheckCircle className="w-4 h-4 text-ev-green flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {s.subTests && s.subTests.length > 0 ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ev-orange/10 text-ev-orange font-bold text-sm"><Grid3X3 className="w-3.5 h-3.5" />{s.subTests.length} {s.subTests.length === 1 ? (lang === "bn" ? "সাব-টেস্ট" : "Sub-Test") : (lang === "bn" ? "সাব-টেস্ট" : "Sub-Tests")}</span>
                    ) : (
                      <p className="text-sm text-gray-500">{s.category || ""}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {isItemFree(s) ? <span className="text-ev-green font-bold">FREE</span> : <span className="text-ev-orange font-bold">₹{s.price || 0}</span>}
                </div>
              </div>
              {!isItemFree(s) && (
                (() => {
                  const price = Number(s.price) > 0 ? Number(s.price) : 0;
                  return subscription.purchasedItemIds.includes(s.id) || subscription.isPremium ? (
                    <div className="mt-3 w-full py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 font-bold text-sm flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Active
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); requirePremium(s.id, false, () => {}, { name: s.title, price }); }}
                      className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
                    >
                      <ShoppingCart className="w-4 h-4" /> Buy Now — ₹{price}
                    </button>
                  );
                })()
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== FREE TESTS TAB ====================
function FreeTestsTab() {
  const { setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const [freeTests, setFreeTests] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getFreeTests();
        if (data && data.length > 0) setFreeTests(data);
        else {
          // Fallback: use mock tests that are free
          const mockData = await getMockTests();
          if (mockData && mockData.length > 0) setFreeTests(mockData.filter((t: any) => isItemFree(t)));
        }
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, []);

  // Extract unique categories from test data
  const categories = ["All", ...Array.from(new Set(freeTests.map((t: any) => t.category).filter(Boolean)))];
  const filteredTests = freeTests.filter((t: any) => filter === "All" || t.category === filter);

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("freeTests", lang)}</h2>
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
            {categories.map(f => (
              <button key={f} onClick={() => setFilter(f)} className={"px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all " + (filter === f ? "bg-ev-green text-white" : "bg-gray-100 text-gray-600")}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 space-y-3">
        {filteredTests.map(test => (
          <div key={test.id} onClick={() => { useAppStore.getState().setSelectedTest(test.id); useAppStore.getState().setSelectedTestType("freeTest"); setView("test-info"); }} className="bg-white rounded-2xl p-4 border border-green-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              {test.imageUrl ? (
                <img src={test.imageUrl} alt={test.title} className="min-w-[5.5rem] w-[5.5rem] aspect-square rounded-2xl object-cover shadow-md" />
              ) : (
                <div className="min-w-[5.5rem] w-[5.5rem] aspect-square rounded-2xl bg-green-50 flex items-center justify-center"><Zap className="w-9 h-9 text-ev-green" /></div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-ev-navy">{test.title}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  {test.category && <span className="font-bold px-2 py-0.5 rounded-md bg-green-50 text-ev-green">{test.category}</span>}
                  <span>{test.duration} min</span>
                  <span>{test.questions} Q</span>
                  <span>{test.marks || 0} marks</span>
                  {test.subTests && test.subTests.length > 0 && <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-ev-orange/10 text-ev-orange font-bold"><Grid3X3 className="w-3 h-3" />{test.subTests.length}</span>}
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-green-50 text-ev-green text-xs font-bold">FREE</span>
            </div>
          </div>
        ))}
        {filteredTests.length === 0 && (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {freeTests.length === 0 ? "No free tests available yet" : ("No tests found in \"" + filter + "\"")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== FREE QUIZZES TAB ====================
function FreeQuizzesTab() {
  const { setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const requireAuth = useRequireAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getDailyQuiz();
        if (data && data.length > 0) setQuizzes(data);
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, []);

  const categories = ["All", ...Array.from(new Set(quizzes.map((q: any) => q.category).filter(Boolean)))];
  const filteredQuizzes = quizzes.filter((q: any) => filter === "All" || q.category === filter);

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("freeQuizzes", lang)}</h2>
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
            {categories.map(f => (
              <button key={f} onClick={() => setFilter(f)} className={"px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all " + (filter === f ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600")}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 space-y-3">
        {filteredQuizzes.map(q => (
          <div key={q.id} onClick={() => requireAuth(() => { useAppStore.getState().setSelectedTest(q.id); useAppStore.getState().setSelectedTestType("dailyQuiz"); setView("test-info"); })} className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 shadow-lg cursor-pointer active:scale-95">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-white/80" />
              <div className="flex-1">
                <h4 className="font-bold text-white">{q.title}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-white/70 flex-wrap">
                  {q.category && <span className="px-2 py-0.5 rounded-md bg-white/20">{q.category}</span>}
                  <span>{q.questions} Q</span><span>•</span><span>{q.duration} min</span>
                  {q.subTests && q.subTests.length > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-white/90 font-bold"><Grid3X3 className="w-3 h-3" />{q.subTests.length}</span>}
                </div>
              </div>
              <div className="text-right text-white/60 text-xs">{q.participants || 0} joined</div>
            </div>
          </div>
        ))}
        {filteredQuizzes.length === 0 && (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {quizzes.length === 0 ? "No quizzes available yet" : ("No quizzes found in \"" + filter + "\"")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== PREVIOUS PAPERS TAB ====================
function PreviousPapersTab() {
  const { setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const subscription = useAppStore(s => s.subscription);
  const requireAuth = useRequireAuth();
  const requirePremium = useRequirePremium();
  const [papers, setPapers] = useState<any[]>([]);
  const [progressKey, setProgressKey] = useState(0);
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());

  // Re-read progress when progressKey changes
  useEffect(() => {
    setViewedItems(getViewedItems("papers"));
  }, [progressKey]);

  const progressText = getProgressText("papers", papers.length, lang);
  const progressPercent = getProgressPercent("papers", papers.length);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getPreviousPapers();
        if (data && data.length > 0) setPapers(data);
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, []);

  return (
    <div className="pb-6" key={progressKey}>
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("previousPapers", lang)}</h2>
        {papers.length > 0 && progressText && (
          <div className="mb-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-ev-navy">{lang === "bn" ? "আপনার অগ্রগতি" : "Your Progress"}</span>
              <span className="text-xs font-bold text-ev-orange">{progressText}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-ev-orange to-ev-gold h-2 rounded-full transition-all" style={{ width: progressPercent + "%" }} />
            </div>
          </div>
        )}
      </div>
      <div className="px-4 space-y-3">
        {papers.map(p => {
          const isViewed = viewedItems.has(p.id || "");
          return (
            <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3" onClick={() => requirePremium(p.id, isItemFree(p), () => { markItemViewed("papers", p.id || ""); setProgressKey(k => k + 1); useAppStore.getState().setSelectedPaperId(p.id); setView("previous-paper-detail"); }, { name: p.name || p.title, price: p.price || 0 })}>
                <div className="w-12 h-12 rounded-xl bg-ev-orange-light flex items-center justify-center flex-shrink-0"><FileText className="w-6 h-6 text-ev-orange" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-ev-navy">{p.name || p.title}</h4>
                    {isViewed && <CheckCircle className="w-4 h-4 text-ev-green flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500"><span className="font-bold px-2 py-0.5 rounded-md bg-ev-blue-light text-ev-navy">{p.category}</span><span>Year: {p.year}</span></div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {isItemFree(p) ? <span className="text-ev-green text-xs font-bold">FREE</span> : <span className="text-ev-orange text-sm font-bold">₹{p.price || 0}</span>}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
              {!isItemFree(p) && (
                (() => {
                  const price = Number(p.price) > 0 ? Number(p.price) : 0;
                  return subscription.purchasedItemIds.includes(p.id) || subscription.isPremium ? (
                    <div className="mt-3 w-full py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 font-bold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Active
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); requirePremium(p.id, false, () => {}, { name: p.name || p.title, price }); }} className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition-transform">
                      <ShoppingCart className="w-3.5 h-3.5" /> Buy — ₹{price}
                    </button>
                  );
                })()
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== PREVIOUS PAPER DETAIL (Reader) ====================
function PreviousPaperDetail() {
  const { goBack, selectedPaperId } = useAppStore();
  const lang = useAppStore((s) => s.language);
  const [paper, setPaper] = useState<PreviousPaperData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!selectedPaperId) {
        setError("No paper selected.");
        setLoading(false);
        return;
      }
      try {
        const data = await getPreviousPaperById(selectedPaperId);
        if (cancelled) return;
        if (!data) {
          setError("Paper not found.");
        } else {
          setPaper(data);
        }
      } catch (e) {
        console.error("Previous paper fetch error:", e);
        if (!cancelled) setError("Failed to load paper.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedPaperId]);

  const handleOpenPdf = () => {
    if (paper?.downloadUrl) {
      window.open(paper.downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-ev-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="px-4 pt-6">
        <button onClick={goBack} className="flex items-center gap-2 text-ev-navy mb-4">
          <ArrowLeft className="w-5 h-5" /> {lang === "bn" ? "ফিরে যান" : "Back"}
        </button>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{error || "Paper unavailable."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Back */}
      <div className="px-4 pt-4">
        <button onClick={goBack} className="flex items-center gap-2 text-ev-navy mb-3">
          <ArrowLeft className="w-5 h-5" /> <span className="font-semibold text-sm">{lang === "bn" ? "ফিরে যান" : "Back"}</span>
        </button>
      </div>

      {/* Cover + Title */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-ev-orange to-amber-500 rounded-2xl p-5 shadow-lg shadow-ev-orange/20 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-white/80 text-xs font-medium">{paper.category}</span>
              <h2 className="text-white font-bold text-lg leading-tight">{paper.name}</h2>
            </div>
          </div>
          {paper.year ? (
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <Clock className="w-4 h-4" /> {lang === "bn" ? "বছর" : "Year"}: {paper.year}
            </div>
          ) : null}
        </div>
      </div>

      {/* Cover image (if any) */}
      {paper.imageUrl ? (
        <div className="px-4 mb-4">
          <img
            src={paper.imageUrl}
            alt={paper.name}
            className="w-full h-48 object-cover rounded-2xl shadow-sm"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      ) : null}

      {/* Info */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ev-orange-light flex items-center justify-center">
              <FileText className="w-5 h-5 text-ev-orange" />
            </div>
            <div>
              <p className="text-ev-navy font-bold text-sm">{paper.name}</p>
              <p className="text-gray-500 text-xs">
                {paper.category}{paper.year ? (" \u2022 " + paper.year) : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Extra Info */}
      {(paper as any).subject || (paper as any).examType || (paper as any).totalQuestions ? (
        <div className="px-4 mb-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(paper as any).subject && <div><span className="text-gray-500">Subject:</span> <span className="font-semibold text-ev-navy">{(paper as any).subject}</span></div>}
              {(paper as any).examType && <div><span className="text-gray-500">Type:</span> <span className="font-semibold text-ev-navy">{(paper as any).examType}</span></div>}
              {(paper as any).totalQuestions && <div><span className="text-gray-500">Questions:</span> <span className="font-semibold text-ev-navy">{(paper as any).totalQuestions}</span></div>}
              {(paper as any).totalMarks && <div><span className="text-gray-500">Marks:</span> <span className="font-semibold text-ev-navy">{(paper as any).totalMarks}</span></div>}
              {(paper as any).duration && <div><span className="text-gray-500">Duration:</span> <span className="font-semibold text-ev-navy">{(paper as any).duration} min</span></div>}
            </div>
          </div>
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="px-4 space-y-3">
        {paper.downloadUrl ? (
          <>
            <button
              onClick={handleOpenPdf}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-base shadow-lg shadow-ev-orange/20 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              {lang === "bn" ? "পেপার খুলুন" : "Open Paper"}
            </button>
            <a
              href={paper.downloadUrl}
              download
              className="w-full py-3 rounded-xl bg-white border border-gray-200 text-ev-navy font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Download className="w-4 h-4" /> {lang === "bn" ? "ডাউনলোড করুন" : "Download"}
            </a>
          </>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-amber-700">
              {lang === "bn" ? "এই পেপারের জন্য কোনো ফাইল আপলোড করা হয়নি।" : "No file attached to this paper yet."}
            </p>
          </div>
        )}
      </div>

      {/* Solution URL */}
      {(paper as any).solutionUrl && (
        <div className="px-4 mt-2">
          <a
            href={(paper as any).solutionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-white border-2 border-dashed border-ev-orange/40 text-ev-orange font-semibold text-sm flex items-center justify-center gap-2 hover:bg-ev-orange/5 transition-colors"
          >
            <FileText className="w-4 h-4" />
            View Solution
          </a>
        </div>
      )}
    </div>
  );
}

// ==================== NOTES TAB ====================
function NotesTab() {
  const { setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const subscription = useAppStore(s => s.subscription);
  const requireAuth = useRequireAuth();
  const requirePremium = useRequirePremium();
  const [notesData, setNotesData] = useState<any[]>([]);
  const [progressKey, setProgressKey] = useState(0);
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());

  // Re-read progress when progressKey changes
  useEffect(() => {
    setViewedItems(getViewedItems("notes"));
  }, [progressKey]);

  const progressText = getProgressText("notes", notesData.length, lang);
  const progressPercent = getProgressPercent("notes", notesData.length);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getNotes();
        if (data && data.length > 0) setNotesData(data);
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, []);

  return (
    <div className="pb-6" key={progressKey}>
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("notes", lang)}</h2>
        {notesData.length > 0 && progressText && (
          <div className="mb-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-ev-navy">{lang === "bn" ? "আপনার অগ্রগতি" : "Your Progress"}</span>
              <span className="text-xs font-bold text-ev-orange">{progressText}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-ev-orange to-ev-gold h-2 rounded-full transition-all" style={{ width: progressPercent + "%" }} />
            </div>
          </div>
        )}
      </div>
      <div className="px-4 space-y-3">
        {notesData.map(n => {
          const isViewed = viewedItems.has(n.id || "");
          return (
            <div key={n.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3" onClick={() => requirePremium(n.id, isItemFree(n), () => { markItemViewed("notes", n.id || ""); setProgressKey(k => k + 1); useAppStore.getState().setSelectedNoteId(n.id!); setView("note-detail"); }, { name: n.title, price: n.price || 0 })}>
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0"><Notebook className="w-6 h-6 text-purple-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-ev-navy">{n.title}</h4>
                    {isViewed && <CheckCircle className="w-4 h-4 text-ev-green flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500">{n.category} • {n.pages || 0} pages</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {isItemFree(n) ? <span className="text-ev-green text-xs font-bold">FREE</span> : <span className="text-ev-orange text-sm font-bold">₹{n.price || 0}</span>}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
              {!isItemFree(n) && (
                (() => {
                  const price = Number(n.price) > 0 ? Number(n.price) : 0;
                  return subscription.purchasedItemIds.includes(n.id) || subscription.isPremium ? (
                    <div className="mt-3 w-full py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 font-bold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Active
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); requirePremium(n.id, false, () => {}, { name: n.title, price }); }} className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition-transform">
                      <ShoppingCart className="w-3.5 h-3.5" /> Buy — ₹{price}
                    </button>
                  );
                })()
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== NOTE DETAIL (Reader) ====================
function NoteDetail() {
  const { goBack, selectedNoteId } = useAppStore();
  const lang = useAppStore((s) => s.language);
  const [note, setNote] = useState<NotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!selectedNoteId) {
        setError("No note selected.");
        setLoading(false);
        return;
      }
      try {
        const data = await getNoteById(selectedNoteId);
        if (cancelled) return;
        if (!data) {
          setError("Note not found.");
        } else {
          setNote(data);
        }
      } catch (e) {
        console.error("Note fetch error:", e);
        if (!cancelled) setError("Failed to load note.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedNoteId]);

  const handleOpenPdf = () => {
    if (note?.downloadUrl) {
      window.open(note.downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-ev-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="px-4 pt-6">
        <button onClick={goBack} className="flex items-center gap-2 text-ev-navy mb-4">
          <ArrowLeft className="w-5 h-5" /> {lang === "bn" ? "ফিরে যান" : "Back"}
        </button>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{error || "Note unavailable."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Back */}
      <div className="px-4 pt-4">
        <button onClick={goBack} className="flex items-center gap-2 text-ev-navy mb-3">
          <ArrowLeft className="w-5 h-5" /> <span className="font-semibold text-sm">{lang === "bn" ? "ফিরে যান" : "Back"}</span>
        </button>
      </div>

      {/* Cover + Title */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 shadow-lg shadow-purple-500/20 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Notebook className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-white/80 text-xs font-medium">{note.category}</span>
              <h2 className="text-white font-bold text-lg leading-tight">{note.title}</h2>
            </div>
          </div>
          {note.pages ? (
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <FileText className="w-4 h-4" /> {note.pages} {lang === "bn" ? "পৃষ্ঠা" : "pages"}
            </div>
          ) : null}
        </div>
      </div>

      {/* Cover image (if any) */}
      {note.imageUrl ? (
        <div className="px-4 mb-4">
          <img
            src={note.imageUrl}
            alt={note.title}
            className="w-full h-48 object-cover rounded-2xl shadow-sm"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      ) : null}

      {/* Extra Info */}
      {((note as any).author || (note as any).language || (note as any).accessType || (note as any).isFree !== undefined) ? (
        <div className="px-4 mb-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(note as any).author && <div><span className="text-gray-500">Author:</span> <span className="font-semibold text-ev-navy">{(note as any).author}</span></div>}
              {(note as any).language && <div><span className="text-gray-500">Language:</span> <span className="font-semibold text-ev-navy">{(note as any).language}</span></div>}
              <div><span className="text-gray-500">Access:</span> <span className={"font-semibold " + (isItemFree(note) ? "text-ev-green" : "text-ev-orange")}>{isItemFree(note) ? "Free" : "Premium"}</span></div>
            </div>
            {(note as any).topics && <div className="mt-2 text-sm"><span className="text-gray-500">Topics:</span> <span className="text-ev-navy">{(note as any).topics}</span></div>}
          </div>
        </div>
      ) : null}

      {/* Description */}
      {note.description ? (
        <div className="px-4 mb-4">
          <h3 className="font-bold text-ev-navy mb-2 text-sm">{lang === "bn" ? "বিবরণ" : "Description"}</h3>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{note.description}</p>
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="px-4 space-y-3">
        {note.downloadUrl ? (
          <>
            <button
              onClick={handleOpenPdf}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-base shadow-lg shadow-ev-orange/20 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              {lang === "bn" ? "নোট খুলুন" : "Open Notes"}
            </button>
            <a
              href={note.downloadUrl}
              download
              className="w-full py-3 rounded-xl bg-white border border-gray-200 text-ev-navy font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Download className="w-4 h-4" /> {lang === "bn" ? "ডাউনলোড করুন" : "Download"}
            </a>
          </>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-amber-700">
              {lang === "bn" ? "এই নোটের জন্য কোনো ফাইল আপলোড করা হয়নি।" : "No file attached to this note yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== PROFILE TAB ====================
function ProfileTab() {
  const { goBack, user, userProfile, setUserProfile, firebaseUser, setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [testHistory, setTestHistory] = useState<TestResultData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const startEdit = (field: string, current: string) => {
    if (user?.role === "guest") return;
    setEditing(field);
    setEditValue(current);
  };

  const saveEdit = (field: string) => {
    setUserProfile({ [field]: editValue });
    setEditing(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || user?.role === "guest") return;
    
    // Validate file
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const { storage } = await import("@/lib/firebase");
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { db } = await import("@/lib/firebase");
      const { doc, updateDoc } = await import("firebase/firestore");
      
      const fileRef = ref(storage, "profilePhotos/" + user.uid + "_" + Date.now() + "_" + file.name);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      
      // Update local profile
      setUserProfile({ photoUrl: downloadUrl });
      
      // Update Firestore user profile if user has a UID
      if (user?.uid) {
        try {
          await updateDoc(doc(db, "users", user.uid), { photoURL: downloadUrl });
        } catch (e) {
          console.error("Failed to update photo in Firestore:", e);
        }
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      alert("Failed to upload photo. Please try again.");
    }
    setUploadingPhoto(false);
  };

  const profileFields = [
    { key: "gender", label: "Gender", value: userProfile.gender, icon: User, placeholder: "e.g. Male/Female/Other" },
    { key: "qualification", label: "Qualification", value: userProfile.qualification, icon: Award, placeholder: "e.g. Graduate, Post Graduate" },
    { key: "phone", label: "Phone", value: userProfile.phone, icon: Smartphone, placeholder: "+91 XXXXX XXXXX" },
    { key: "targetExam", label: "Target Exam", value: userProfile.targetExam, icon: Target, placeholder: "e.g. WBCS, SSC, Banking" },
    { key: "state", label: "State", value: userProfile.state, icon: BookOpen, placeholder: "e.g. West Bengal" },
    { key: "dob", label: "Date of Birth", value: userProfile.dob, icon: CalendarDays, placeholder: "DD/MM/YYYY" },
  ];

  // Load test history
  useEffect(() => {
    const uid = firebaseUser?.uid || user?.uid;
    if (!uid) return;
    setLoadingHistory(true);
    getUserTestResults(uid)
      .then(setTestHistory)
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [firebaseUser?.uid, user?.uid]);

  const formatDate = (date: any) => {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return ""; }
  };

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-br from-ev-navy to-blue-800 px-4 pt-6 pb-10 rounded-b-[2rem]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <h2 className="text-xl font-bold text-white">{t("profile", lang)}</h2>
        </div>
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center text-3xl shadow-xl ring-4 ring-white/20 overflow-hidden">
              {userProfile.photoUrl ? <img src={userProfile.photoUrl} alt="" className="w-full h-full object-cover" /> : (user?.name?.charAt(0) || "U")}
            </div>
            {user?.role !== "guest" && (
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors border-2 border-white">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 text-ev-orange animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-ev-navy" />
                )}
              </label>
            )}
          </div>
          <h3 className="text-lg font-bold text-white mt-2">{user?.name || "User"}</h3>
          <p className="text-white/60 text-sm">{user?.email || "Guest User"}</p>
        </div>
      </div>
      <div className="px-4 -mt-6 space-y-3">
        {/* Name & Email (read-only from auth) */}
        {[
          { label: t("name", lang), value: user?.name, icon: User },
          { label: t("email", lang), value: user?.email, icon: Mail },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ev-blue-light flex items-center justify-center">
              <item.icon className="w-5 h-5 text-ev-navy" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="font-semibold text-ev-navy text-sm">{item.value || "Not set"}</p>
            </div>
          </div>
        ))}
        {/* Editable profile fields (local) */}
        {profileFields.map((item) => (
          <div key={item.key} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ev-blue-light flex items-center justify-center">
              <item.icon className="w-5 h-5 text-ev-navy" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">{item.label}</p>
              {editing === item.key ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={item.placeholder}
                    className="text-sm font-semibold text-ev-navy border-b border-ev-orange outline-none flex-1 bg-transparent"
                    autoFocus
                  />
                  <button onClick={() => saveEdit(item.key)} className="text-xs text-ev-orange font-bold">Save</button>
                  <button onClick={() => setEditing(null)} className="text-xs text-gray-400 font-bold">Cancel</button>
                </div>
              ) : (
                <p
                  className="font-semibold text-ev-navy text-sm cursor-pointer"
                  onClick={() => startEdit(item.key, item.value)}
                >
                  {item.value || "Tap to add"}
                </p>
              )}
            </div>
            {editing !== item.key && user?.role !== "guest" && <Edit className="w-4 h-4 text-ev-orange" />}
          </div>
        ))}
        {user?.role === "guest" && (
          <button onClick={() => useAppStore.getState().setView("login")} className="w-full py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg mt-4">
            Login to Edit Profile
          </button>
        )}

        {/* Performance Analytics Button */}
        {user?.role !== "guest" && (
          <button
            onClick={() => setView("performance")}
            className="w-full mt-4 p-4 bg-gradient-to-r from-ev-navy to-blue-800 rounded-2xl text-white text-left shadow-lg active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-ev-gold" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{t("performanceAnalytics", lang)}</p>
                <p className="text-xs text-white/60">{t("viewDetailedStats", lang)}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </button>
        )}

        {/* Test History Section */}
        {user?.role !== "guest" && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-ev-orange/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-ev-orange" />
              </div>
              <h3 className="text-sm font-bold text-ev-navy">{t("testHistory", lang)}</h3>
              <span className="text-xs text-gray-400 ml-auto">{testHistory.length} {t("tests", lang)}</span>
            </div>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-ev-orange" />
              </div>
            ) : testHistory.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No tests taken yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {testHistory.slice(0, 10).map((result) => (
                  <div key={result.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-ev-navy truncate max-w-[200px]">{result.testTitle || "Mock Test"}</h4>
                      <span className="text-xs font-bold text-ev-green">{result.scoredMarks}/{result.totalMarks}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" />{result.correctAnswers} correct</span>
                      <span className="flex items-center gap-1"><X className="w-3 h-3 text-red-400" />{result.wrongAnswers} wrong</span>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-ev-orange" />{result.accuracy}%</span>
                      <span className="ml-auto">{formatDate(result.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== LEADERBOARD TAB ====================
function LeaderboardTab() {
  const { setView, goBack } = useAppStore();
  const lang = useAppStore(s => s.language);
  const requireAuth = useRequireAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getLeaderboard();
        if (data && data.length > 0) setLeaderboard(data);
      } catch (e) { console.error("Leaderboard fetch error:", e); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const top3 = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-br from-ev-navy to-blue-800 px-4 pt-6 pb-10 rounded-b-[2rem]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <h2 className="text-xl font-bold text-white">{t("leaderboard", lang)}</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-3 border-ev-orange border-t-transparent rounded-full animate-spin" /></div>
        ) : top3.length > 0 ? (
          <div className="flex items-end justify-center gap-4">
            {[1, 0, 2].map(idx => {
              if (!top3[idx]) return null;
              const entry = top3[idx];
              const rank = idx + 1;
              return (
                <div key={entry.id} className={"flex flex-col items-center " + (rank === 1 ? "-mt-4" : "")}>
                  <div className={(rank === 1 ? "w-16 h-16 text-2xl" : "w-12 h-12 text-lg") + " rounded-full bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center shadow-xl ring-2 ring-white/30 mb-2"}>
                    {entry.photoUrl ? <img src={entry.photoUrl} alt="" className="w-full h-full rounded-full object-cover" /> : entry.name?.charAt(0) || "?"}
                  </div>
                  <p className="text-white font-bold text-sm">{entry.name?.split(" ")[0] || "User"}</p>
                  <p className="text-ev-gold text-xs font-bold">{entry.score}%</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-white/60 text-sm">No leaderboard data yet</div>
        )}
      </div>
      <div className="px-4 -mt-4 space-y-2">
        {others.map(entry => (
          <div key={entry.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-ev-navy text-sm">{entry.rank}</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center text-white text-sm font-bold">
              {entry.photoUrl ? <img src={entry.photoUrl} alt="" className="w-full h-full rounded-full object-cover" /> : entry.name?.charAt(0) || "?"}
            </div>
            <div className="flex-1"><p className="font-semibold text-ev-navy text-sm">{entry.name}</p></div>
            <span className="font-bold text-ev-orange text-sm">{entry.score}%</span>
          </div>
        ))}
      </div>
      <div className="px-4 mt-4">
        <button onClick={() => requireAuth(() => setView("mocktests"))} className="w-full py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg">
          Start Test to Rank
        </button>
      </div>
    </div>
  );
}

// ==================== TEST INFO SCREEN ====================
function TestInfoScreen() {
  const goBack = useAppStore(s => s.goBack);
  const setView = useAppStore(s => s.setView);
  const lang = useAppStore(s => s.language);
  const subscription = useAppStore(s => s.subscription);
  const user = useAppStore(s => s.user);
  const setShowPaymentModal = useAppStore(s => s.setShowPaymentModal);
  const setPaymentModalData = useAppStore(s => s.setPaymentModalData);
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubTest, setSelectedSubTest] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTest() {
      const testId = useAppStore.getState().selectedTest;
      const testType = useAppStore.getState().selectedTestType;
      if (!testId) { setLoading(false); return; }
      try {
        let data: any = null;
        switch (testType) {
          case "freeTest": data = await getFreeTestById(testId); break;
          case "dailyQuiz": data = await getDailyQuizById(testId); break;
          case "testSeries": data = await getTestSeriesById(testId); break;
          case "popularTest": data = await getPopularTestById(testId); break;
          case "mockTest": default: data = await getMockTestById(testId); break;
        }
        // Fallback: if not found in primary collection, try mockTests (e.g. free tests from mockTests collection)
        if (!data) {
          data = await getMockTestById(testId);
        }
        if (data) setTestData(data);
      } catch (e) { console.error("Test info fetch error:", e); }
      finally { setLoading(false); }
    }
    fetchTest();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-ev-orange" />
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-500 mb-4">Test not found</p>
        <button onClick={() => goBack()} className="px-6 py-2 bg-ev-orange text-white rounded-xl font-bold">Go Back</button>
      </div>
    );
  }

  // PREMIUM GATE — verify access before allowing test start
  const itemIsFree = isItemFree(testData);
  const testId = useAppStore.getState().selectedTest;
  const hasAccess = itemIsFree ||
    subscription.isPremium ||
    subscription.purchasedItemIds.includes(testId);

  const handleStartTest = () => {
    if (hasAccess) {
      setView("exam");
      return;
    }
    // No access — open Buy modal
    const price = Number(testData.price) > 0 ? Number(testData.price) : 0;
    if (price > 0) {
      setPaymentModalData({
        planId: testId,
        planName: testData.title || testData.name || "Premium Test",
        amount: price,
        type: "one_time",
      });
      setShowPaymentModal(true);
    } else {
      setView("pricing");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-ev-navy to-blue-800 p-5 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-white font-bold text-lg flex-1 truncate">{testData.title || "Test"}</h2>
        </div>
        {/* Thumbnail + Info */}
        <div className="flex items-center gap-4">
          {testData.imageUrl ? (
            <img src={testData.imageUrl} alt={testData.title} className="w-24 h-24 rounded-2xl object-cover shadow-lg border-2 border-white/20" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center border-2 border-white/20">
              {isItemFree(testData) ? <Zap className="w-10 h-10 text-green-300" /> : <Crown className="w-10 h-10 text-ev-gold" />}
            </div>
          )}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {testData.category && <span className="px-3 py-1 rounded-lg bg-white/20 text-white text-xs font-bold">{testData.category}</span>}
              {testData.subject && <span className="px-3 py-1 rounded-lg bg-white/20 text-white text-xs font-bold">{testData.subject}</span>}
            </div>
            <div className="flex items-center gap-2">
              {isItemFree(testData) ? (
                <span className="px-3 py-1 rounded-lg bg-green-500/30 text-green-200 text-xs font-bold">FREE</span>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-ev-gold/30 text-ev-gold text-xs font-bold">PREMIUM</span>
              )}
              {testData.difficulty && (
                <span className={"px-3 py-1 rounded-lg text-xs font-bold " + (testData.difficulty === "easy" ? "bg-green-500/30 text-green-200" : testData.difficulty === "hard" ? "bg-red-500/30 text-red-200" : "bg-amber-500/30 text-amber-200")}>
                  {testData.difficulty === "easy" ? "Easy" : testData.difficulty === "hard" ? "Hard" : "Medium"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Test Details */}
      <div className="px-4 mt-4 space-y-4">
        {/* Quick Stats */}
        {(() => {
          const subTestsExist = testData.subTests && testData.subTests.length > 0;
          const subTestTotalQ = subTestsExist ? testData.subTests.reduce((sum: number, st: any) => sum + (st.totalQuestions || 0), 0) : 0;
          const displayQ = subTestsExist && testData.questions === 0 ? subTestTotalQ : (testData.questions || 0);
          const totalDuration = subTestsExist ? testData.subTests.reduce((sum: number, st: any) => sum + (st.duration || 0), 0) : 0;
          const displayDuration = subTestsExist && !testData.duration ? totalDuration : (testData.duration || 0);
          return (
            <div className={`grid gap-3 ${subTestsExist ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <Clock className="w-5 h-5 text-ev-orange mx-auto mb-1" />
                <p className="text-lg font-bold text-ev-navy">{displayDuration}</p>
                <p className="text-xs text-gray-500">{lang === "bn" ? "মিনিট" : "Minutes"}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <BookOpen className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-ev-navy">{displayQ}</p>
                <p className="text-xs text-gray-500">{lang === "bn" ? "প্রশ্ন" : "Questions"}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <Target className="w-5 h-5 text-ev-green mx-auto mb-1" />
                <p className="text-lg font-bold text-ev-navy">{testData.marks || 0}</p>
                <p className="text-xs text-gray-500">{lang === "bn" ? "মার্কস" : "Marks"}</p>
              </div>
              {subTestsExist && (
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-ev-orange/20">
                  <Grid3X3 className="w-5 h-5 text-ev-orange mx-auto mb-1" />
                  <p className="text-lg font-bold text-ev-orange">{testData.subTests.length}</p>
                  <p className="text-xs text-gray-500">{lang === "bn" ? "সাব-টেস্ট" : "Sub-Tests"}</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Description */}
        {testData.description && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-ev-navy mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-ev-orange" /> {lang === "bn" ? "বিবরণ" : "Description"}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{testData.description}</p>
          </div>
        )}

        {/* Instructions */}
        {testData.instructions && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-ev-navy mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> {lang === "bn" ? "নির্দেশনা" : "Instructions"}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{testData.instructions}</p>
          </div>
        )}
      </div>

      {/* Sub-Tests List or Start Button — premium gated */}
      <div className="px-4 mt-4">
        {testData.subTests && testData.subTests.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-bold text-ev-navy flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-ev-orange" />
              {lang === "bn" ? "সাব-টেস্টসমূহ" : "Sub-Tests"} ({testData.subTests.length})
            </h3>
            {testData.subTests.map((st: any, idx: number) => {
              const isSelected = selectedSubTest === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedSubTest(st.id)}
                  className={`w-full text-left bg-white rounded-2xl p-4 border-2 shadow-sm transition-all active:scale-[0.98] ${isSelected ? "border-ev-orange bg-ev-orange/5" : "border-gray-100 hover:border-gray-200"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isSelected ? "bg-ev-orange text-white" : "bg-ev-navy/10 text-ev-navy"}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-ev-navy text-sm truncate">{st.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        {st.duration > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {st.duration} min</span>}
                        {st.totalQuestions > 0 && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {st.totalQuestions} Q</span>}
                        {st.subject && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {st.subject}</span>}
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-ev-orange flex-shrink-0" />}
                  </div>
                  {st.description && <p className="text-xs text-gray-400 mt-2 ml-13">{st.description}</p>}
                </button>
              );
            })}
            {hasAccess ? (
              <button
                onClick={() => {
                  if (selectedSubTest) {
                    useAppStore.getState().setSelectedTest(selectedSubTest);
                    setView("exam");
                  }
                }}
                disabled={!selectedSubTest}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${selectedSubTest ? "bg-gradient-to-r from-ev-orange to-ev-gold text-white shadow-ev-orange/30 active:scale-[0.98]" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
              >
                <Zap className="w-5 h-5" /> {t("startTestBtn", lang)}
              </button>
            ) : (
              <button
                onClick={handleStartTest}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-lg shadow-lg shadow-ev-orange/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" /> {t("buy", lang)} — ₹{testData.price}
              </button>
            )}
          </div>
        ) : hasAccess ? (
          <button
            onClick={() => setView("exam")}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-lg shadow-lg shadow-ev-orange/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" /> {t("startTestBtn", lang)}
          </button>
        ) : (
          <button
            onClick={handleStartTest}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-lg shadow-lg shadow-ev-orange/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" /> {t("buy", lang)} — ₹{testData.price}
          </button>
        )}
        {!hasAccess && !user && (
          <p className="text-center text-xs text-gray-500 mt-2">
            {t("pleaseLoginToAccess", lang)}
          </p>
        )}
      </div>
    </div>
  );
}

// ==================== EXAM PAGE ====================
function ExamPage() {
  const { goBack, selectedTest, selectedTestType, user, firebaseUser } = useAppStore();
  const { setLastTestResult } = useAppStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(2700); // 45 min default
  const [testTitle, setTestTitle] = useState("Test");
  const lang = useAppStore(s => s.language);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const examBackWarning = useAppStore(s => s.examBackWarning);
  const setExamBackWarning = useAppStore(s => s.setExamBackWarning);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false); // view-only after submit
  const [initialDuration, setInitialDuration] = useState(2700); // track original duration for time calc
  const [savingResult, setSavingResult] = useState(false);

  // Answer state: maps question index to selected option key
  const [answers, setAnswers] = useState<Record<number, string>>({});
  // Marked for review: set of question indices
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());

  // Fetch questions from Firestore — use testType to fetch metadata from correct collection
  useEffect(() => {
    async function fetchQuestions() {
      try {
        // Get test metadata from the correct collection based on testType
        let testCategory: string | undefined;

        if (selectedTest) {
          try {
            let testData: any = null;
            switch (selectedTestType) {
              case "freeTest":
                testData = await getFreeTestById(selectedTest);
                break;
              case "dailyQuiz":
                testData = await getDailyQuizById(selectedTest);
                break;
              case "testSeries":
                testData = await getTestSeriesById(selectedTest);
                break;
              case "popularTest":
                testData = await getPopularTestById(selectedTest);
                break;
              case "mockTest":
              default:
                testData = await getMockTestById(selectedTest);
                break;
            }

            // Fallback: if not found in primary collection, try mockTests
            if (!testData) {
              testData = await getMockTestById(selectedTest);
            }

            if (testData) {
              testCategory = testData.category;
              setTestTitle(testData.title || "Test");
              if (testData.duration) {
                const durationSec = testData.duration * 60;
                setTimeLeft(durationSec);
                setInitialDuration(durationSec);
              }
            }
          } catch (e) { console.error("Test data fetch error:", e); }
        }
        // Fetch questions for this specific test only
        const data = await getQuestions(selectedTest || undefined, testCategory);
        if (data && data.length > 0) {
          setQuestions(data);
        }
      } catch (e) { console.error("Questions fetch error:", e); }
      finally { setLoading(false); }
    }
    fetchQuestions();
  }, [selectedTest, selectedTestType]);

  // Timer
  useEffect(() => {
    if (loading || questions.length === 0 || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, questions.length, submitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return (m.toString().padStart(2, "0") + ":" + s.toString().padStart(2, "0"));
  };

  // Answer tracking
  const answeredCount = Object.keys(answers).length;
  const markedCount = markedForReview.size;
  const unansweredCount = questions.length - answeredCount;

  // Select answer for current question (blocked in review mode)
  const selectAnswer = (key: string) => {
    if (submitted || isReviewMode) return;
    setAnswers(prev => ({ ...prev, [currentQ]: key }));
  };

  // Clear answer for current question (blocked in review mode)
  const clearAnswer = () => {
    if (isReviewMode) return;
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentQ];
      return next;
    });
  };

  // Toggle mark for review (blocked in review mode)
  const toggleMark = () => {
    if (isReviewMode) return;
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(currentQ)) next.delete(currentQ);
      else next.add(currentQ);
      return next;
    });
  };

  // Navigate
  const goNext = () => {
    if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
  };
  const goPrev = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  };

  // Save test result to Firestore when submitted
  const handleSubmit = useCallback(async () => {
    setSubmitted(true);
    setShowSubmitConfirm(false);
    setSavingResult(true);
    try {
      const results = calculateResults();
      const uid = firebaseUser?.uid || user?.uid || "";
      const resultData = {
        userId: uid,
        userName: user?.name || "User",
        testId: selectedTest || "",
        testTitle,
        testCategory: questions[0]?.category || "",
        totalQuestions: questions.length,
        correctAnswers: results.correct,
        wrongAnswers: results.wrong,
        skipped: results.skipped,
        totalMarks: results.totalMarks,
        scoredMarks: results.scoredMarks,
        accuracy: results.accuracy,
        timeUsedSeconds: results.timeUsed,
        answers,
      };
      const saved = await saveTestResult(resultData);
      setLastTestResult({ ...resultData, id: saved.id, createdAt: saved.createdAt });

      // Update leaderboard entry (upsert)
      try {
        const { collection, getDocs, query, where } = await import("firebase/firestore");
        const lbSnap = await getDocs(query(collection(db, "leaderboard"), where("uid", "==", uid)));
        const photoUrl = useAppStore.getState().userProfile?.photoUrl || "";
        if (lbSnap.empty) {
          // First test — create new leaderboard entry
          await addLeaderboardEntry({
            uid,
            name: user?.name || "User",
            photoUrl,
            score: results.scoredMarks,
            totalTests: 1,
            avgAccuracy: results.accuracy,
          });
        } else {
          // Update existing entry with cumulative stats
          const existing = lbSnap.docs[0];
          const old = existing.data();
          const newTotalTests = (old.totalTests || 0) + 1;
          const newScore = (old.score || 0) + results.scoredMarks;
          const oldTotalAcc = (old.avgAccuracy || 0) * (old.totalTests || 1);
          const newAvgAccuracy = Math.round((oldTotalAcc + results.accuracy) / newTotalTests);
          await updateLeaderboardEntry(existing.id, {
            name: user?.name || old.name || "User",
            photoUrl: photoUrl || old.photoUrl || "",
            score: newScore,
            totalTests: newTotalTests,
            avgAccuracy: newAvgAccuracy,
          });
        }
      } catch (lbErr) {
        console.error("Error updating leaderboard:", lbErr);
      }
    } catch (err) {
      console.error("Error saving test result:", err);
      // Still show results even if save fails
      const results = calculateResults();
      setLastTestResult({
        testTitle,
        totalQuestions: questions.length,
        correctAnswers: results.correct,
        wrongAnswers: results.wrong,
        scoredMarks: results.scoredMarks,
        totalMarks: results.totalMarks,
        accuracy: results.accuracy,
      });
    } finally {
      setSavingResult(false);
    }
  }, [answers, firebaseUser, initialDuration, isReviewMode, questions, selectedTest, testTitle, timeLeft, user, setLastTestResult]);
  const calculateResults = () => {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    questions.forEach((q, i) => {
      if (!answers[i]) {
        skipped++;
      } else if (answers[i] === q.correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    });
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const scoredMarks = questions.reduce((sum, q, i) => {
      if (answers[i] === q.correctAnswer) return sum + (q.marks || 1);
      return sum;
    }, 0);
    const accuracy = answeredCount > 0 ? Math.round((correct / answeredCount) * 100) : 0;
    const timeUsed = initialDuration - timeLeft;
    return { correct, wrong, skipped, totalMarks, scoredMarks, accuracy, answeredCount, timeUsed };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-ev-orange border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><BookOpen className="w-10 h-10 text-gray-400" /></div>
          <h3 className="text-lg font-bold text-ev-navy mb-2">No Questions Available</h3>
          <p className="text-gray-500 text-sm mb-4">Questions for this test will be added soon.</p>
          <button onClick={() => goBack()} className="px-6 py-2 rounded-xl bg-ev-orange text-white font-bold">Go Back</button>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  const currentAnswer = answers[currentQ];
  const isMarked = markedForReview.has(currentQ);

  // ===================== SUBMITTED VIEW (Results) =====================
  // Show results ONLY when submitted AND NOT in review mode
  if (submitted && !isReviewMode) {
    const results = calculateResults();
    const timeUsedSec = results.timeUsed > 0 ? results.timeUsed : (2700 - timeLeft);
    const mins = Math.floor(timeUsedSec / 60);
    const secs = timeUsedSec % 60;

    return (
      <div className="min-h-screen bg-gradient-to-br from-ev-navy to-blue-800 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center mx-auto mb-4 shadow-2xl"><Trophy className="w-12 h-12 text-white" /></div>
            <h2 className="text-3xl font-black text-white">Test Complete!</h2>
            <p className="text-white/60 mt-1">{testTitle}</p>
          </motion.div>
          <div className="w-full max-w-sm space-y-3 mb-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 flex items-center gap-3">
              <Target className="w-6 h-6 text-ev-green" />
              <span className="text-white/80">Score</span>
              <span className="ml-auto font-bold text-white text-lg">{results.scoredMarks}/{results.totalMarks}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span className="text-white/80">Correct</span>
              <span className="ml-auto font-bold text-green-400 text-lg">{results.correct}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 flex items-center gap-3">
              <X className="w-6 h-6 text-red-400" />
              <span className="text-white/80">Wrong</span>
              <span className="ml-auto font-bold text-red-400 text-lg">{results.wrong}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 flex items-center gap-3">
              <SkipForward className="w-6 h-6 text-yellow-400" />
              <span className="text-white/80">Skipped</span>
              <span className="ml-auto font-bold text-yellow-400 text-lg">{results.skipped}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-ev-orange" />
              <span className="text-white/80">Accuracy</span>
              <span className="ml-auto font-bold text-ev-orange text-lg">{results.accuracy}%</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 flex items-center gap-3">
              <Clock className="w-6 h-6 text-ev-gold" />
              <span className="text-white/80">Time</span>
              <span className="ml-auto font-bold text-ev-gold text-lg">{mins}m {secs}s</span>
            </div>
          </div>
          <div className="flex gap-3 w-full max-w-sm">
            <button onClick={() => { setIsReviewMode(true); setCurrentQ(0); }} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-semibold border border-white/20">Review Answers</button>
            <button onClick={() => { useAppStore.getState().setView("home"); }} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg"><Home className="w-4 h-4 inline mr-1" /> Home</button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== EXAM TAKING VIEW =====================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-ev-navy px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => { if (isReviewMode) { setIsReviewMode(false); setSubmitted(true); } else { setExamBackWarning(true); } }} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <h2 className="text-white font-bold text-sm truncate max-w-[180px]">{isReviewMode ? "Review Answers" : testTitle}</h2>
          {isReviewMode ? <span className="text-xs font-bold text-ev-gold bg-ev-gold/20 px-2 py-1 rounded-lg">VIEW ONLY</span> : <div className="flex items-center gap-1 text-ev-gold text-sm font-bold"><Timer className="w-4 h-4" /> {formatTime(timeLeft)}</div>}
        </div>
        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-2 mb-1">
          <div className="bg-gradient-to-r from-ev-orange to-ev-gold h-2 rounded-full transition-all" style={{ width: (((currentQ + 1) / questions.length) * 100) + "%" }} />
        </div>
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>Q{currentQ + 1}/{questions.length}</span>
          <span>{answeredCount} answered · {markedCount} marked · {unansweredCount} left</span>
        </div>
      </div>

      {/* Question Nav Toggle */}
      <div className="px-4 pt-3 flex-shrink-0">
        <button onClick={() => setShowQuestionNav(!showQuestionNav)} className="flex items-center gap-2 text-sm font-semibold text-ev-navy bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm w-full justify-between">
          <span className="flex items-center gap-2"><Grid3X3 className="w-4 h-4 text-ev-orange" /> Question Navigator</span>
          <ChevronRight className={"w-4 h-4 text-gray-400 transition-transform " + (showQuestionNav ? "rotate-90" : "")} />
        </button>
      </div>

      {/* Question Navigator Grid */}
      <AnimatePresence>
        {showQuestionNav && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 py-3">
              <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                <div className="grid grid-cols-8 gap-2">
                  {questions.map((_, i) => {
                    const isAnswered = answers[i] !== undefined;
                    const isMarkedQ = markedForReview.has(i);
                    const isCurrent = i === currentQ;
                    let bgClass = "bg-gray-100 text-gray-500"; // not visited
                    if (isCurrent) bgClass = "bg-ev-navy text-white ring-2 ring-ev-orange";
                    else if (isMarkedQ && isAnswered) bgClass = "bg-purple-500 text-white";
                    else if (isMarkedQ) bgClass = "bg-purple-300 text-white";
                    else if (isAnswered) bgClass = "bg-ev-green text-white";
                    return (
                      <button key={i} onClick={() => { setCurrentQ(i); setShowQuestionNav(false); }} className={"w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center " + bgClass + " transition-all active:scale-95"}>
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Not Visited</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-ev-green" /> Answered</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-300" /> Marked</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500" /> Marked+Answered</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-ev-navy text-white">Q{currentQ + 1}</span>
          <span className={"text-xs font-bold px-2 py-0.5 rounded-md " + (q.difficulty === "easy" ? "bg-green-50 text-green-600" : q.difficulty === "hard" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>{q.difficulty}</span>
          <span className="text-xs text-gray-400">{q.marks || 1} mark{(q.marks || 1) > 1 ? "s" : ""}</span>
          {isMarked && <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-600">Marked</span>}
        </div>
        <h3 className="text-lg font-bold text-ev-navy mb-5 leading-relaxed">{q.question}</h3>
        <div className="space-y-3">
          {[{ key: "A", text: q.optionA }, { key: "B", text: q.optionB }, { key: "C", text: q.optionC }, { key: "D", text: q.optionD }].map(opt => {
            const isSelected = currentAnswer === opt.key;
            const isCorrect = (submitted || isReviewMode) && q.correctAnswer === opt.key;
            const isWrong = (submitted || isReviewMode) && isSelected && q.correctAnswer !== opt.key;
            return (
              <button key={opt.key} onClick={() => selectAnswer(opt.key)} className={"w-full p-4 rounded-xl border-2 text-left font-medium transition-all " + (
                isWrong ? "border-red-400 bg-red-50 text-red-700" :
                isCorrect ? "border-green-400 bg-green-50 text-green-700" :
                isSelected ? "border-ev-orange bg-ev-orange/10 text-ev-navy" :
                "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              )}>
                <div className="flex items-center gap-3">
                  <span className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 " + (
                    isWrong ? "bg-red-400 text-white" :
                    isCorrect ? "bg-green-400 text-white" :
                    isSelected ? "bg-ev-orange text-white" :
                    "bg-gray-100 text-gray-500"
                  )}>{opt.key}</span>
                  <span className="flex-1">{opt.text}</span>
                  {isSelected && !submitted && !isReviewMode && <CheckCircle className="w-5 h-5 text-ev-orange flex-shrink-0" />}
                  {isCorrect && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                  {isWrong && <X className="w-5 h-5 text-red-500 flex-shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Clear Response button — hidden in review mode */}
        {currentAnswer && !submitted && !isReviewMode && (
          <button onClick={clearAnswer} className="mt-4 flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" /> Clear Response
          </button>
        )}

        {/* Explanation in review mode */}
        {(submitted || isReviewMode) && q.explanation && (
          <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-sm font-semibold text-blue-700 mb-1">Explanation:</p>
            <p className="text-sm text-blue-600">{q.explanation}</p>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {isReviewMode ? (
        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe">
          {/* Review mode: only Prev/Next navigation + Back to Results */}
          <div className="flex gap-2">
            <button onClick={goPrev} disabled={currentQ === 0} className={"py-3 px-5 rounded-xl font-bold text-sm flex items-center gap-1 " + (currentQ === 0 ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-gray-100 text-ev-navy hover:bg-gray-200")}>
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button onClick={() => { setIsReviewMode(false); setSubmitted(true); }} className="flex-1 py-3 rounded-xl bg-ev-navy text-white font-bold shadow-lg text-sm">Back to Results</button>
            {currentQ < questions.length - 1 ? (
              <button onClick={goNext} className="py-3 px-5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg text-sm flex items-center gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => { setIsReviewMode(false); setSubmitted(true); }} className="py-3 px-5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg text-sm flex items-center gap-1">
                <Home className="w-4 h-4" /> Done
              </button>
            )}
          </div>
        </div>
      ) : (
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe">
        {/* Mark for review + Skip */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={toggleMark} className={"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (isMarked ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-500")}>
            <Bookmark className={"w-3.5 h-3.5 " + (isMarked ? "fill-purple-600" : "")} /> {isMarked ? "Marked" : "Mark for Review"}
          </button>
          {currentQ < questions.length - 1 && (
            <button onClick={goNext} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
          )}
        </div>
        {/* Prev / Submit / Next */}
        <div className="flex gap-2">
          <button onClick={goPrev} disabled={currentQ === 0} className={"py-3 px-5 rounded-xl font-bold text-sm flex items-center gap-1 " + (currentQ === 0 ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-gray-100 text-ev-navy hover:bg-gray-200")}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          {currentQ === questions.length - 1 ? (
            <button onClick={() => setShowSubmitConfirm(true)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg text-sm">Submit Test</button>
          ) : (
            <button onClick={goNext} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg text-sm flex items-center justify-center gap-1">
              Save & Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      )}

      {/* Exit Warning Dialog */}
      {examBackWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={() => setExamBackWarning(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
              <h3 className="text-xl font-black text-ev-navy">{t("examOver", lang)}</h3>
              <p className="text-gray-500 text-sm mt-1">{t("examWarning", lang)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-700 font-medium text-center">
                {lang === "bn"
                  ? `আপনি ${Object.keys(answers).length}/${questions.length} টি প্রশ্নের উত্তর দিয়েছেন`
                  : `You answered ${Object.keys(answers).length}/${questions.length} questions`}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setExamBackWarning(false)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg text-sm">{t("continueTest", lang)}</button>
              <button onClick={() => { setExamBackWarning(false); goBack(); }} className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm">{t("leave", lang)}</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSubmitConfirm(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-ev-orange/10 flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-8 h-8 text-ev-orange" /></div>
                <h3 className="text-xl font-black text-ev-navy">Submit Test?</h3>
                <p className="text-gray-500 text-sm mt-1">Are you sure you want to submit?</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-ev-green">{answeredCount}</p>
                  <p className="text-[10px] text-gray-500">Answered</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-purple-600">{markedCount}</p>
                  <p className="text-[10px] text-gray-500">Marked</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-red-500">{unansweredCount}</p>
                  <p className="text-[10px] text-gray-500">Unanswered</p>
                </div>
              </div>
              {unansweredCount > 0 && (
                <p className="text-center text-xs text-red-500 font-semibold mb-3">⚠️ You have {unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}!</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-ev-navy font-bold text-sm">Continue Test</button>
                <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg text-sm">Submit</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// ==================== RESULT PAGE ====================
function ResultPage() {
  const { goBack, lastTestResult } = useAppStore();

  const score = lastTestResult?.scoredMarks ?? 0;
  const total = lastTestResult?.totalMarks ?? 0;
  const accuracy = lastTestResult?.accuracy ?? 0;
  const timeUsedSec = lastTestResult?.timeUsedSeconds ?? 0;
  const mins = Math.floor(timeUsedSec / 60);
  const secs = timeUsedSec % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-ev-navy to-blue-800 flex flex-col items-center justify-center p-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center mx-auto mb-4 shadow-2xl"><Trophy className="w-12 h-12 text-white" /></div>
        <h2 className="text-3xl font-black text-white">Test Complete!</h2>
        <p className="text-white/60 mt-1">{lastTestResult?.testTitle || "Great effort!"}</p>
      </motion.div>
      <div className="w-full max-w-sm space-y-3 mb-6">
        {[
          { label: "Score", value: (score + "/" + total), icon: Target, color: "text-ev-green" },
          { label: "Correct", value: (lastTestResult?.correctAnswers ?? 0).toString(), icon: CheckCircle, color: "text-green-400" },
          { label: "Wrong", value: (lastTestResult?.wrongAnswers ?? 0).toString(), icon: X, color: "text-red-400" },
          { label: "Time", value: (mins + "m " + secs + "s"), icon: Clock, color: "text-ev-gold" },
          { label: "Accuracy", value: (accuracy + "%"), icon: TrendingUp, color: "text-ev-orange" },
        ].map((s, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-xl rounded-xl p-4 flex items-center gap-3">
            <s.icon className={"w-6 h-6 " + s.color} />
            <span className="text-white/80">{s.label}</span>
            <span className="ml-auto font-bold text-white text-lg">{s.value}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3 w-full max-w-sm">
        <button onClick={() => useAppStore.getState().setView("leaderboard")} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-semibold border border-white/20">Leaderboard</button>
        <button onClick={() => { useAppStore.getState().setView("home"); }} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg"><Home className="w-4 h-4 inline mr-1" /> Home</button>
      </div>
    </div>
  );
}

// ==================== MY PURCHASES SCREEN ====================
// Shows user's premium subscriptions + individually purchased items
// User can directly access each purchased item from here
function MyPurchasesScreen() {
  const goBack = useAppStore(s => s.goBack);
  const setView = useAppStore(s => s.setView);
  const subscription = useAppStore(s => s.subscription);
  const firebaseUser = useAppStore(s => s.firebaseUser);
  const [purchasedItems, setPurchasedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPurchases() {
      if (!firebaseUser?.uid) {
        setLoading(false);
        return;
      }
      try {
        // Fetch user's purchases directly from Firestore
        const q = query(
          collection(db, "purchases"),
          where("userId", "==", firebaseUser.uid)
        );
        const snap = await getDocs(q);
        const items = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((item: any) => item.status === "active");

        // For each purchased itemId, fetch the actual test/notes/paper data
        const enrichedItems = await Promise.all(
          items.map(async (item: any) => {
            try {
              // Try mockTests first
              let testDoc = await getDoc(doc(db, "mockTests", item.itemId));
              if (!testDoc.exists()) {
                testDoc = await getDoc(doc(db, "testSeries", item.itemId));
              }
              if (!testDoc.exists()) {
                testDoc = await getDoc(doc(db, "previousPapers", item.itemId));
              }
              if (!testDoc.exists()) {
                testDoc = await getDoc(doc(db, "notes", item.itemId));
              }
              if (testDoc.exists()) {
                return {
                  ...item,
                  testData: { id: testDoc.id, ...testDoc.data() },
                };
              }
              return item;
            } catch (e) {
              return item;
            }
          })
        );
        setPurchasedItems(enrichedItems);
      } catch (err) {
        console.error("Error fetching purchases:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPurchases();
  }, [firebaseUser?.uid]);

  const openItem = (item: any) => {
    const testData = item.testData;
    if (!testData) return;
    useAppStore.getState().setSelectedTest(testData.id);
    // Determine test type from category
    const cat = (testData.category || "").toLowerCase();
    let testType: any = "mockTest";
    if (cat.includes("series")) testType = "testSeries";
    useAppStore.getState().setSelectedTestType(testType);
    setView("test-info");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-ev-navy to-blue-800 p-5 pt-6">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-ev-gold" />
              My Premium Access
            </h1>
            <p className="text-white/60 text-xs">Your purchased items & subscription</p>
          </div>
        </div>
      </div>

      {/* Subscription Status Card */}
      <div className="p-4">
        {subscription.isPremium ? (
          <div className="bg-gradient-to-r from-ev-gold-light to-amber-100 rounded-2xl p-4 border border-amber-200 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-ev-gold/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-ev-gold" />
              </div>
              <div>
                <h3 className="font-bold text-ev-navy">Premium Subscription Active</h3>
                <p className="text-xs text-gray-600">
                  {subscription.planName || "Premium Plan"}
                  {subscription.premiumExpiry &&
                    ` • Expires: ${new Date(subscription.premiumExpiry).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-2 mt-2">
              <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Full access to ALL premium content
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-2xl p-4 border border-gray-200 mb-4">
            <p className="text-sm text-gray-600 mb-3">
              No active subscription. Get full access to all premium content.
            </p>
            <button
              onClick={() => setView("pricing")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-sm shadow-lg"
            >
              View Subscription Plans
            </button>
          </div>
        )}

        {/* Purchased Items Section */}
        <div className="mb-2">
          <h2 className="font-bold text-ev-navy text-sm flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-ev-orange" />
            Individually Purchased Items
            {purchasedItems.length > 0 && (
              <span className="text-xs font-normal text-gray-500">({purchasedItems.length})</span>
            )}
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-ev-orange" />
            </div>
          ) : purchasedItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">No individual purchases yet</p>
              <button
                onClick={() => setView("mocktests")}
                className="px-4 py-2 rounded-xl bg-ev-orange text-white text-sm font-bold"
              >
                Browse Mock Tests
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {purchasedItems.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-ev-navy text-sm">
                        {item.testData?.title || item.itemName || "Premium Item"}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.testData?.category || "Test"} • ₹{item.amount || 0}
                      </p>
                      {item.purchasedAt && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Purchased: {new Date(item.purchasedAt?.toDate?.()?.toISOString?.() || item.purchasedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  </div>
                  {item.testData && (
                    <button
                      onClick={() => openItem(item)}
                      className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-ev-navy to-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" /> Open Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== CATEGORY DETAIL SCREEN ====================
// Shows subcategories, tests, papers, notes for a selected category
function CategoryDetailScreen() {
  const goBack = useAppStore(s => s.goBack);
  const setView = useAppStore(s => s.setView);
  const lang = useAppStore(s => s.language);
  const selectedCategory = useAppStore(s => s.selectedCategory);
  const subscription = useAppStore(s => s.subscription);
  const requirePremium = useRequirePremium();
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [subcategories, setSubcategories] = useState<CategoryData[]>([]);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [previousPapers, setPreviousPapers] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tests" | "papers" | "notes" | "plans">("tests");

  useEffect(() => {
    if (!selectedCategory) { setLoading(false); return; }
    async function fetchData() {
      try {
        // Fetch category details
        const cats = await getCategories();
        const cat = cats.find(c => c.id === selectedCategory);
        setCategory(cat || null);

        // Fetch subcategories
        const subs = await getSubcategories(selectedCategory);
        setSubcategories(subs);

        // Fetch content filtered by category
        const examCat = cat?.examCategory || cat?.name || "";
        const [tests, series, papers, notesData, plansData] = await Promise.all([
          getMockTests(), getTestSeries(), getPreviousPapers(), getNotes(),
          getPlansByScope("category", selectedCategory),
        ]);
        setMockTests((tests || []).filter((t: any) => t.category === examCat || t.category === cat?.name));
        setTestSeries((series || []).filter((s: any) => s.category === examCat || s.category === cat?.name));
        setPreviousPapers((papers || []).filter((p: any) => p.category === examCat || p.category === cat?.name));
        setNotes((notesData || []).filter((n: any) => n.category === examCat || n.category === cat?.name));
        setPlans(plansData);
      } catch (e) {
        console.error("Category detail fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-500 mb-4">Category not found</p>
        <button onClick={() => goBack()} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Go Back</button>
      </div>
    );
  }

  const tabs = [
    { key: "tests" as const, label: "Mock Tests", count: mockTests.length },
    { key: "papers" as const, label: "Papers", count: previousPapers.length },
    { key: "notes" as const, label: "Notes", count: notes.length },
    { key: "plans" as const, label: "Premium", count: plans.length },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] p-5 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-xl flex items-center gap-2">
              <span className="text-2xl">{category.icon || "📚"}</span>
              {category.name}
            </h1>
            {category.description && <p className="text-white/60 text-xs mt-0.5">{category.description}</p>}
          </div>
        </div>

        {/* Subcategories Pills */}
        {subcategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveTab("tests")}
              className="px-3 py-1.5 rounded-full bg-amber-400 text-[#0B1437] text-xs font-bold whitespace-nowrap"
            >
              All {category.name}
            </button>
            {subcategories.map(sub => (
              <button
                key={sub.id}
                onClick={() => {
                  useAppStore.getState().setSelectedCategory(sub.id);
                  setView("category-detail");
                }}
                className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold whitespace-nowrap border border-white/20 hover:bg-white/20"
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Premium Banner (if plans exist) */}
      {plans.length > 0 && !(subscription.isPremium) && (
        <div className="px-4 mt-4 mb-4">
          <button
            onClick={() => setActiveTab("plans")}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-3 shadow-lg text-left active:scale-[0.98] flex items-center gap-3"
          >
            <Crown className="w-8 h-8 text-white flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-white font-bold text-sm">Unlock {category.name} Premium</h4>
              <p className="text-white/80 text-xs">Get access to all {category.name} tests & papers</p>
            </div>
            <span className="text-white text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">from ₹{Math.min(...plans.map(p => p.price))}</span>
          </button>
        </div>
      )}

      {/* Tab Bar */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.key ? "bg-white shadow-sm text-[#0B1437]" : "text-gray-500"}`}
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {activeTab === "tests" && (
          mockTests.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No tests available for {category.name}</p>
          ) : (
            mockTests.map((test: any) => (
              <div
                key={test.id}
                onClick={() => requirePremium(test.id, isItemFree(test), () => { useAppStore.getState().setSelectedTest(test.id); useAppStore.getState().setSelectedTestType("mockTest"); setView("test-info"); }, { name: test.title, price: test.price || 0 })}
                className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm cursor-pointer active:scale-95 transition-transform flex items-center gap-3"
              >
                <div className={"w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 " + (isItemFree(test) ? "bg-emerald-50" : "bg-amber-50")}>
                  {isItemFree(test) ? <Zap className="w-6 h-6 text-emerald-500" /> : <Crown className="w-6 h-6 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#0B1437] text-sm truncate">{test.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{test.duration}m</span>
                    <span className="flex items-center gap-0.5"><BookOpen className="w-3 h-3" />{test.questions}Q</span>
                    {!isItemFree(test) && <span className="text-amber-600 font-bold">₹{test.price || 0}</span>}
                  </div>
                </div>
                {subscription.purchasedItemIds.includes(test.id) || subscription.isPremium ? (
                  <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold">Active</span>
                ) : isItemFree(test) ? (
                  <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold">FREE</span>
                ) : (
                  <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold">Buy</span>
                )}
              </div>
            ))
          )
        )}

        {activeTab === "papers" && (
          previousPapers.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No previous papers for {category.name}</p>
          ) : (
            previousPapers.map((paper: any) => {
              const hasAccess = subscription.isPremium || subscription.purchasedItemIds.includes(paper.id) || isItemFree(paper);
              return (
                <div
                  key={paper.id}
                  onClick={() => {
                    if (hasAccess) {
                      useAppStore.getState().setSelectedPaperId(paper.id);
                      setView("previous-paper-detail");
                    } else {
                      requirePremium(paper.id, false, () => {}, { name: paper.title || paper.name, price: paper.price || 0 });
                    }
                  }}
                  className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm cursor-pointer active:scale-95 transition-transform flex items-center gap-3"
                >
                  <div className={"w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 " + (hasAccess ? "bg-blue-50" : "bg-gray-100")}>
                    {hasAccess ? <FileText className="w-6 h-6 text-blue-500" /> : <Lock className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#0B1437] text-sm truncate">{paper.title || paper.name}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Year: {paper.year || "N/A"}</p>
                  </div>
                  {hasAccess ? (
                    <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold">Open</span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold">₹{paper.price || 0}</span>
                  )}
                </div>
              );
            })
          )
        )}

        {activeTab === "notes" && (
          notes.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No notes for {category.name}</p>
          ) : (
            notes.map((note: any) => {
              const hasAccess = subscription.isPremium || subscription.purchasedItemIds.includes(note.id) || isItemFree(note);
              return (
                <div
                  key={note.id}
                  onClick={() => {
                    if (hasAccess) {
                      useAppStore.getState().setSelectedNoteId(note.id);
                      setView("note-detail");
                    } else {
                      requirePremium(note.id, false, () => {}, { name: note.title, price: note.price || 0 });
                    }
                  }}
                  className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm cursor-pointer active:scale-95 transition-transform flex items-center gap-3"
                >
                  <div className={"w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 " + (hasAccess ? "bg-teal-50" : "bg-gray-100")}>
                    {hasAccess ? <Notebook className="w-6 h-6 text-teal-500" /> : <Lock className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#0B1437] text-sm truncate">{note.title}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">{note.pages || 0} pages</p>
                  </div>
                  {hasAccess ? (
                    <span className="px-2 py-1 rounded-lg bg-teal-50 text-teal-600 text-[10px] font-bold">Open</span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold">₹{note.price || 0}</span>
                  )}
                </div>
              );
            })
          )
        )}

        {activeTab === "plans" && (
          plans.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No premium plans for {category.name}</p>
          ) : (
            plans.map(plan => (
              <div
                key={plan.id}
                className={"bg-white rounded-2xl p-4 border shadow-sm " + (plan.isPopular ? "border-amber-400 ring-2 ring-amber-400/20" : "border-gray-100")}
              >
                {plan.isPopular && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-bold mb-2">MOST POPULAR</span>
                )}
                <h4 className="font-bold text-[#0B1437]">{plan.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-[#0B1437]">₹{plan.price}</span>
                  {plan.originalPrice && <span className="text-sm text-gray-400 line-through">₹{plan.originalPrice}</span>}
                  <span className="text-xs text-gray-500">/{plan.durationDays} days</span>
                </div>
                <div className="space-y-1 mt-3">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    useAppStore.getState().setPaymentModalData({
                      planId: plan.id!,
                      planName: plan.name,
                      amount: plan.price,
                      type: plan.type,
                    });
                    useAppStore.getState().setShowPaymentModal(true);
                  }}
                  className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg active:scale-95 transition-transform"
                >
                  {subscription.isPremium ? "Subscribed" : `Get ${plan.name}`}
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}

// ==================== PERFORMANCE ANALYTICS SCREEN ====================
// Shows topic-wise strength/weakness, test history, progress charts
function PerformanceAnalyticsScreen() {
  const goBack = useAppStore(s => s.goBack);
  const setView = useAppStore(s => s.setView);
  const lang = useAppStore(s => s.language);
  const firebaseUser = useAppStore(s => s.firebaseUser);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      if (!firebaseUser?.uid) { setLoading(false); return; }
      try {
        const data = await getUserTestResults(firebaseUser.uid);
        setResults(data as any[]);
      } catch (e) {
        console.error("Error fetching test results:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [firebaseUser?.uid]);

  // Calculate stats
  const totalTests = results.length;
  const avgScore = totalTests > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.scoredMarks || 0), 0) / totalTests)
    : 0;
  const avgAccuracy = totalTests > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.accuracy || 0), 0) / totalTests)
    : 0;
  const bestScore = totalTests > 0
    ? Math.max(...results.map(r => r.scoredMarks || 0))
    : 0;
  const totalCorrect = results.reduce((sum, r) => sum + (r.correctAnswers || 0), 0);
  const totalWrong = results.reduce((sum, r) => sum + (r.wrongAnswers || 0), 0);
  const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);
  const totalTime = results.reduce((sum, r) => sum + (r.timeUsedSeconds || 0), 0);

  // Category-wise analysis
  const categoryStats: Record<string, { tests: number; totalAccuracy: number; totalScore: number; count: number }> = {};
  results.forEach(r => {
    const cat = r.testCategory || "Uncategorized";
    if (!categoryStats[cat]) {
      categoryStats[cat] = { tests: 0, totalAccuracy: 0, totalScore: 0, count: 0 };
    }
    categoryStats[cat].tests++;
    categoryStats[cat].totalAccuracy += r.accuracy || 0;
    categoryStats[cat].totalScore += r.scoredMarks || 0;
    categoryStats[cat].count++;
  });

  const categoryList = Object.entries(categoryStats).map(([cat, stats]) => ({
    category: cat,
    tests: stats.tests,
    avgAccuracy: Math.round(stats.totalAccuracy / stats.count),
    avgScore: Math.round(stats.totalScore / stats.count),
  })).sort((a, b) => b.avgAccuracy - a.avgAccuracy);

  // Strengths (top 3 categories by accuracy)
  const strengths = categoryList.slice(0, 3);
  // Weaknesses (bottom 3 categories by accuracy)
  const weaknesses = categoryList.slice(-3).reverse();

  // Format time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-ev-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-ev-navy to-blue-800 p-5 pt-6">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-ev-gold" />
              {t("performanceAnalytics", lang)}
            </h1>
            <p className="text-white/60 text-xs">{t("yourProgress", lang)}</p>
          </div>
        </div>
      </div>

      {totalTests === 0 ? (
        <div className="p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-bold text-ev-navy mb-2">{t("noDataYet", lang)}</h3>
          <p className="text-gray-500 text-sm mb-4">{t("takeFirstTest", lang)}</p>
          <button
            onClick={() => setView("mocktests")}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-sm shadow-lg"
          >
            {t("browseMockTests", lang)}
          </button>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-ev-orange" />
                <p className="text-xs text-gray-500">{t("totalTests", lang)}</p>
              </div>
              <p className="text-2xl font-black text-ev-navy">{totalTests}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-ev-green" />
                <p className="text-xs text-gray-500">{t("avgAccuracy", lang)}</p>
              </div>
              <p className="text-2xl font-black text-ev-navy">{avgAccuracy}%</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-ev-gold" />
                <p className="text-xs text-gray-500">{t("bestScore", lang)}</p>
              </div>
              <p className="text-2xl font-black text-ev-navy">{bestScore}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-gray-500">{t("totalTime", lang)}</p>
              </div>
              <p className="text-2xl font-black text-ev-navy">{formatTime(totalTime)}</p>
            </div>
          </div>

          {/* Answer Distribution */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-ev-navy text-sm mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-ev-orange" />
              {t("answerDistribution", lang)}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-ev-green" /> {t("correct", lang)}
                </span>
                <span className="text-xs font-bold text-ev-navy">{totalCorrect}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-ev-green h-2 rounded-full" style={{ width: `${(totalCorrect / (totalCorrect + totalWrong + totalSkipped)) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <X className="w-3 h-3 text-ev-red" /> {t("wrong", lang)}
                </span>
                <span className="text-xs font-bold text-ev-navy">{totalWrong}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-ev-red h-2 rounded-full" style={{ width: `${(totalWrong / (totalCorrect + totalWrong + totalSkipped)) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <SkipForward className="w-3 h-3 text-gray-400" /> {t("skipped", lang)}
                </span>
                <span className="text-xs font-bold text-ev-navy">{totalSkipped}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: `${(totalSkipped / (totalCorrect + totalWrong + totalSkipped)) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-ev-navy text-sm mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-ev-green" />
                {t("yourStrengths", lang)}
              </h3>
              <div className="space-y-2">
                {strengths.map((s, idx) => (
                  <div key={s.category} className="flex items-center justify-between p-2 bg-ev-green/5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-ev-green text-white text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                      <span className="text-sm font-medium text-ev-navy">{s.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-ev-green">{s.avgAccuracy}%</span>
                      <p className="text-[10px] text-gray-500">{s.tests} {t("tests", lang)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses */}
          {weaknesses.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-ev-navy text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-ev-orange" />
                {t("needsImprovement", lang)}
              </h3>
              <div className="space-y-2">
                {weaknesses.map((w, idx) => (
                  <div key={w.category} className="flex items-center justify-between p-2 bg-ev-orange/5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-ev-orange text-white text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                      <span className="text-sm font-medium text-ev-navy">{w.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-ev-orange">{w.avgAccuracy}%</span>
                      <p className="text-[10px] text-gray-500">{w.tests} {t("tests", lang)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Tests */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-ev-navy text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-ev-navy" />
              {t("recentTests", lang)}
            </h3>
            <div className="space-y-2">
              {results.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ev-navy truncate">{r.testTitle}</p>
                    <p className="text-[10px] text-gray-500">
                      {r.testCategory} • {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-ev-navy">{r.scoredMarks}/{r.totalMarks}</p>
                    <p className="text-[10px] text-gray-500">{r.accuracy}% {t("accuracy", lang)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== BOTTOM NAV ====================
function BottomNav() {
  const { currentView, setView, navigationItems, user } = useAppStore();
  const requireAuth = useRequireAuth();

  const tabs = navigationItems.filter(i => i.location === "bottomnav").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const fallback = tabs.length === 0 ? DEFAULT_BOTTOM_NAV : tabs;
  const items = fallback.slice(0, 5);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around py-1.5 px-2 max-w-lg mx-auto">
          {items.map((item, idx) => {
            const IconComp = ICON_MAP[item.icon] || Home;
            const isActive = currentView === item.targetView;
            return (
              <button
                key={item.id || idx}
                onClick={() => {
                  if (item.requireAuth) requireAuth(() => setView(item.targetView as any));
                  else setView(item.targetView as any);
                }}
                className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-90"
              >
                <div className={`p-1 rounded-lg transition-all duration-200 ${isActive ? "bg-[#0B1437]" : ""}`}>
                  <IconComp className={`w-5 h-5 transition-all duration-200 ${isActive ? "text-amber-400" : "text-gray-400"}`} />
                </div>
                <span className={`text-[10px] font-bold transition-all duration-200 ${isActive ? "text-[#0B1437]" : "text-gray-400"}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== EXIT CONFIRM DIALOG ====================
function ExitConfirmDialog() {
  const { exitConfirmVisible, setExitConfirmVisible, setIsExitingApp } = useAppStore();

  if (!exitConfirmVisible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', pointerEvents: 'auto' }}
    >
      <div
        className="bg-white rounded-2xl p-6 mx-6 max-w-sm w-full shadow-2xl"
        style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-ev-navy">Exit ExamVault?</h3>
          <p className="text-gray-500 text-sm mt-1">Are you sure you want to close the app?</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setExitConfirmVisible(false); }}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-ev-navy font-semibold text-sm active:scale-95 transition-transform cursor-pointer"
            style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setExitConfirmVisible(false);
              // Try native Android exit first
              if (typeof window !== "undefined" && (window as any).AndroidBridge?.exitApp) {
                (window as any).AndroidBridge.exitApp();
              } else {
                // Fallback for browser/PWA
                try { window.close(); } catch {}
                window.history.back();
              }
            }}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm active:scale-95 transition-transform cursor-pointer"
            style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP (INNER) ====================
// Split into inner/outer so the ErrorBoundary wraps ALL hooks + rendering

function ExamVaultAppInner() {
  const { currentView, goBack, canGoBack, setExitConfirmVisible, isExitingApp, setIsExitingApp, appSettings } = useAppStore();
  const isDark = useAppStore(s => s.isDark);
  const authLoading = useAppStore(s => s.authLoading);
  const user = useAppStore(s => s.user);
  const subscription = useAppStore(s => s.subscription);

  // ══════════════════════════════════════════════════════════
  // PREMIUM STATUS — communicate to Android WebView for AdMob
  // If user is premium OR has any purchase, hide ads
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      // Premium = subscription user (full access)
      // hasAnyPurchase = one-time buyer (specific items only)
      // Both should NOT see ads
      (window as any).__EV_PREMIUM = subscription.isPremium || (subscription.purchasedItemIds?.length > 0);
    } catch (e) {}
  }, [subscription.isPremium, subscription.purchasedItemIds]);

  // ══════════════════════════════════════════════════════════
  // NOTIFY ANDROID WEBVIEW ON VIEW CHANGE (for AdMob interstitial)
  // When user navigates between views, tell Android native code
  // so it can count navigations and show ads at intervals.
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      // Check if premium - if premium, don't trigger ads
      const isPremium = subscription.isPremium;
      if (isPremium) return;

      // Android WebView: call native bridge to show ad
      const bridge = (window as any).AndroidBridge;
      if (bridge && bridge.onNavigate) {
        bridge.onNavigate();
      }
    } catch (e) {}
  }, [currentView, subscription.isPremium]);

  // ══════════════════════════════════════════════════════════
  // BACK BUTTON HANDLER is now at MODULE LEVEL (see top of file).
  // It was moved out of useEffect to fix timing issues on mobile PWA.
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // SCROLL HANDLER — also before early returns
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const s = useAppStore.getState();
        if (window.scrollY > 0) s.scrollPositions[s.currentView] = window.scrollY;
      }, 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, []);

  // Restore scroll on view change
  useEffect(() => {
    const savedY = useAppStore.getState().scrollPositions[currentView];
    if (savedY > 0) {
      const go = () => window.scrollTo({ top: savedY, behavior: "instant" as ScrollBehavior });
      requestAnimationFrame(go);
      setTimeout(go, 50);
      setTimeout(go, 150);
      setTimeout(go, 300);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [currentView]);

  // ══════════════════════════════════════════════════════════
  // Android WebView: Set premium flag + Smart ad trigger
  // Ads only show after meaningful actions, NOT on every navigation
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    // Update premium flag for native ad logic
    const sub = useAppStore.getState().subscription;
    // No ads for: subscription users OR anyone who bought something
    (window as any).__EV_PREMIUM = sub?.isPremium === true || (sub?.purchasedItemIds?.length > 0);

    // Smart ad trigger: only on action completion views
    if (_isAndroidWebView && (window as any).AndroidBridge?.onActionComplete) {
      const actionType = getAdTriggerAction(currentView);
      if (actionType) {
        try {
          (window as any).AndroidBridge.onActionComplete(actionType);
        } catch (e) { /* silently fail */ }
      }
    }
  }, [currentView, subscription.isPremium, subscription.purchasedItemIds]);

  // Maps views to ad trigger actions — null means "don't trigger ad"
  function getAdTriggerAction(view: string): string | null {
    switch (view) {
      case 'result':          return 'exam_end';      // Finished exam, viewing result
      case 'home':            return 'back_to_home';   // Returned to home (after browsing)
      case 'note-detail':     return 'note_read';      // Reading a note
      case 'previous-paper-detail': return 'paper_read'; // Reading a paper
      case 'test-info':       return 'test_selected';   // Selected a test to view
      default:                return null;             // No ad for other views
    }
  }

  // ══════════════════════════════════════════════════════════
  // OTHER HOOKS
  // ══════════════════════════════════════════════════════════

  // Load user profile from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ev_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        useAppStore.getState().setUserProfile(parsed);
      }
      const savedSettings = localStorage.getItem('ev_app_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        useAppStore.getState().setAppSettings(parsedSettings);
      }
      // Restore subscription state from localStorage — critical for:
      // - Showing premium badge immediately (not "Buy" button)
      // - Blocking ads for premium users (__EV_PREMIUM flag)
      const savedSubscription = localStorage.getItem('ev_subscription');
      if (savedSubscription) {
        const parsedSub = JSON.parse(savedSubscription);
        useAppStore.getState().setSubscription(parsedSub);
      }
    } catch (e) { /* ignore */ }
    const fetchSettings = async () => {
      try {
        const settings = await getAppSettings();
        if (settings) useAppStore.getState().setAppSettings(settings);
      } catch (e) { /* ignore */ }
    };
    fetchSettings();
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      const store = useAppStore.getState();
      store.setFirebaseUser(firebaseUser);
      store.setAuthLoading(false);
      if (firebaseUser) {
        // User is signed in via Firebase — set basic info immediately
        store.setUser({
          name: firebaseUser.displayName || "User",
          email: firebaseUser.email || "",
          role: "user",
          uid: firebaseUser.uid,
          phone: firebaseUser.phoneNumber || "",
        });
        // Then fetch real role from Firestore profile
        (async () => {
          try {
            const { doc, getDoc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            if (profileDoc.exists()) {
              const profileData = profileDoc.data();
              const currentStore = useAppStore.getState();
              // Only update if still the same user
              if (currentStore.firebaseUser?.uid === firebaseUser.uid) {
                currentStore.setUser({
                  name: profileData.name || firebaseUser.displayName || "User",
                  email: firebaseUser.email || "",
                  role: profileData.role || "user",
                  uid: firebaseUser.uid,
                  phone: profileData.phone || firebaseUser.phoneNumber || "",
                  photoURL: profileData.photoURL || firebaseUser.photoURL || "",
                });
              }
            }
          } catch (e) {
            console.error("Error fetching user role:", e);
          }
        })();
        checkSubscriptionStatus(firebaseUser.uid).then((status) => {
          // ALWAYS set isPremium from server — clear stale localStorage value
          store.setSubscription({
            isPremium: status.isPremium || false,
            premiumExpiry: status.premiumExpiry || null,
            planName: status.planName || null,
            purchasedItemIds: status.purchasedItems?.map((p: any) => p.itemId) || [],
          });
        }).catch(console.error);
      } else {
        // No Firebase user — if user was logged in (not guest/null), clear and go home
        const currentUser = store.user;
        if (currentUser && currentUser.role === "user") {
          // User was logged in via Firebase but now signed out — go to home (not login)
          store.setUser(null);
          store.setView("home");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time navigation items from admin
  useEffect(() => {
    try {
      const q = query(collection(db, "navigation"), where("isActive", "==", true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        useAppStore.getState().setNavigationItems(items);
      }, () => { /* use defaults */ });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Navigation listener failed, using defaults");
    }
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const notifs = await getNotifications();
        if (notifs) {
          useAppStore.getState().setNotifications(notifs);
          useAppStore.getState().setUnreadNotificationCount(notifs.filter((n: any) => !n.isRead).length);
        }
      } catch (e) { /* ignore */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  // Show loading spinner while auth state is being determined
  if (authLoading) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center shadow-lg mb-4 animate-pulse">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-ev-orange" />
        </div>
      </>
    );
  }

  // No user? Allow browsing home page — login only when they try restricted actions
  // (Free Tests accessible without login, other features redirect to login on click)

  // Auth screens
  if (currentView === "login" || currentView === "register") {
    return <><LoginScreen /><GuestLockModal /><ExitConfirmDialog /></>;
  }

  // Test Info screen
  if (currentView === "test-info") {
    return <><TestInfoScreen /><ExitConfirmDialog /></>;
  }

  // Exam/Result screens (full screen)
  if (currentView === "exam") {
    return <><ExamPage /><ExitConfirmDialog /></>;
  }

  if (currentView === "result") {
    return <><ResultPage /><ExitConfirmDialog /></>;
  }

  // Main App
  return (
    <>
      <div className={"min-h-screen " + (isDark ? "dark bg-gray-900" : "bg-gray-50") + " pb-16"}>
      {appSettings.maintenanceMode && (
        <div className="fixed inset-0 z-[100] bg-ev-navy/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-ev-orange/20 flex items-center justify-center mb-6">
            <Settings className="w-10 h-10 text-ev-orange animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Under Maintenance</h2>
          <p className="text-gray-400 text-sm max-w-xs">We&apos;re making some improvements. Please check back in a little while.</p>
        </div>
      )}
      <Header />
      <SideMenu />
      <AnimatePresence mode="wait">
        <motion.div key={currentView} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pb-20">
          {currentView === "home" && <HomeTab />}
          {currentView === "mocktests" && <MockTestsTab />}
          {currentView === "test-series" && <TestSeriesTab />}
          {currentView === "free-tests" && <FreeTestsTab />}
          {currentView === "free-quizzes" && <FreeQuizzesTab />}
          {currentView === "previous-papers" && <PreviousPapersTab />}
          {currentView === "previous-paper-detail" && <PreviousPaperDetail />}
          {currentView === "notes" && <NotesTab />}
          {currentView === "note-detail" && <NoteDetail />}
          {currentView === "profile" && <ProfileTab />}
          {currentView === "settings" && <SettingsTab />}
          {currentView === "support" && <SupportTab />}
          {currentView === "leaderboard" && <LeaderboardTab />}
          {currentView === "upcoming-exams" && <UpcomingExamsTab />}
          {currentView === "upcoming-exam-detail" && <UpcomingExamDetail />}
          {currentView === "daily-tips" && <DailyTipsTab />}
          {currentView === "daily-tip-detail" && <DailyTipDetail />}
          {currentView === "announcement-detail" && <AnnouncementDetail />}
          {currentView === "notifications" && <NotificationPanel open={true} onClose={() => useAppStore.getState().setView("home")} />}
          {currentView === "pricing" && <PricingPage />}
          {currentView === "my-purchases" && <MyPurchasesScreen />}
          {currentView === "performance" && <PerformanceAnalyticsScreen />}
          {currentView === "category-detail" && <CategoryDetailScreen />}
        </motion.div>
      </AnimatePresence>
      <BottomNav />
      <GuestLockModal />
      <PaymentModal />
      <ExitConfirmDialog />
    </div>
    </>
  );
}

// ==================== MAIN APP (OUTER — Error Boundary wrapper) ====================
export default function ExamVaultApp() {
  return (
    <AppErrorBoundary>
      <ExamVaultAppInner />
    </AppErrorBoundary>
  );
}
