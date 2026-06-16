"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { onAuthChange } from "@/lib/services/auth";
import {
  getNotifications,
  getMockTests, getPopularTests, getFreeTests, getDailyQuiz,
  getPreviousPapers, getPreviousPaperById, getNotes, getNoteById, getBanners, getTestSeries,
  getAnnouncements, getQuestions, getLeaderboard, getAppSettings,
  saveTestResult, getUserTestResults, getTestLeaderboard,
  addLeaderboardEntry, updateLeaderboardEntry,
  checkSubscriptionStatus, hasPurchasedItem,
  BannerData, AnnouncementData, QuestionData, LeaderboardData, TestResultData,
  NotesData, PreviousPaperData,
} from "@/lib/services/firestore";
import { db } from "@/lib/firebase";
import { onSnapshot, query, where, collection } from "firebase/firestore";
import {
  Home, BookOpen, Trophy, FileText, Notebook, User, Settings, HelpCircle,
  ChevronRight, ChevronLeft, Bell, Search, Clock, Star, Zap, Award, Target, TrendingUp,
  Users, Megaphone,
  CalendarDays, Smartphone, Mail,
  Brain, Flame, Sparkles,
  Menu, X, LogOut, ArrowLeft,
  Edit, Download, Crown, Timer, AlertTriangle, Camera, Loader2,
  CheckCircle, Bookmark, SkipForward, Grid3X3, Trash2, ExternalLink
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
// ==================== SPLASH SCREEN ====================
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-ev-navy flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="mb-6"
      >
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center shadow-2xl shadow-ev-orange/30">
          <span className="text-5xl">📚</span>
        </div>
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-4xl font-black text-white tracking-tight"
      >
        EXAM<span className="text-ev-orange">VAULT</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-ev-gold/80 text-sm mt-2 tracking-wide"
      >
        Mock Tests, PYQs & Exam Updates
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-10"
      >
        <div className="w-8 h-8 border-3 border-ev-orange border-t-transparent rounded-full animate-spin" />
      </motion.div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 1.5 }}
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-ev-orange via-ev-gold to-ev-orange origin-left"
        style={{ width: "100%" }}
      />
    </div>
  );
}

// ==================== ONBOARDING ====================
function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const slides = [
    { emoji: "📝", title: "Practice Mock Tests", desc: "Thousands of questions for all competitive exams", color: "from-ev-navy to-blue-700" },
    { emoji: "📄", title: "Previous Year Papers", desc: "Solve actual exam papers from past years", color: "from-ev-orange to-red-600" },
    { emoji: "🏆", title: "Track Your Progress", desc: "Leaderboard, analytics & performance reports", color: "from-ev-gold to-amber-600" },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${slides[step].color} flex flex-col items-center justify-center p-6`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="text-center"
        >
          <div className="text-8xl mb-8 animate-float">{slides[step].emoji}</div>
          <h2 className="text-3xl font-bold text-white mb-3">{slides[step].title}</h2>
          <p className="text-white/80 text-lg">{slides[step].desc}</p>
        </motion.div>
      </AnimatePresence>
      <div className="flex gap-2 mt-12 mb-8">
        {slides.map((_, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-white" : "bg-white/40"}`} />
        ))}
      </div>
      <div className="flex gap-3 w-full max-w-sm">
        <button onClick={onComplete} className="flex-1 py-3 rounded-xl text-white/80 border border-white/30 font-medium">
          Skip
        </button>
        <button
          onClick={() => step < 2 ? setStep(step + 1) : onComplete()}
          className="flex-1 py-3 rounded-xl bg-white text-ev-navy font-bold shadow-lg"
        >
          {step < 2 ? "Next" : "Get Started"}
        </button>
      </div>
    </div>
  );
}



// ==================== HEADER ====================
function Header() {
  const { setView, setSidebarOpen, language, setLanguage, unreadNotificationCount, user } = useAppStore();
  const subscription = useAppStore(s => s.subscription);
  const [showNotifications, setShowNotifications] = useState(false);
  const lang = language;

  return (
    <>
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100">
              <Menu className="w-5 h-5 text-ev-navy" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center">
                <span className="text-lg">📚</span>
              </div>
              <h1 className="text-lg font-black text-ev-navy leading-tight">EXAM<span className="text-ev-orange">VAULT</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {subscription.isPremium && (
              <button onClick={() => setView("pricing")} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-ev-gold-light text-ev-gold text-xs font-bold">
                <Crown className="w-3 h-3" /> PRO
              </button>
            )}
            {!subscription.isPremium && user?.role !== "guest" && (
              <button onClick={() => setView("pricing")} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-ev-gold-light text-ev-gold text-xs font-bold animate-pulse">
                <Crown className="w-3 h-3" /> Upgrade
              </button>
            )}
            <select value={language} onChange={e => setLanguage(e.target.value)} className="text-xs bg-gray-100 rounded-lg px-2 py-1.5 border-0 focus:outline-none font-medium text-ev-navy">
              <option value="en">EN</option>
              <option value="hi">हि</option>
              <option value="bn">বা</option>
              <option value="as">অ</option>
            </select>
            <button onClick={() => setShowNotifications(true)} className="p-2 rounded-xl hover:bg-gray-100 relative">
              <Bell className="w-5 h-5 text-ev-navy" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-ev-red rounded-full border-2 border-white text-[10px] text-white font-bold flex items-center justify-center px-1">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
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
              {user?.role === "guest" && (
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
                    <IconComp className={`w-5 h-5 ${item.color}`} />
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>
                );
              })}
              {user?.role !== "guest" && (
                <button onClick={() => { setUser(null); setView("login"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-6 py-3 text-red-600 font-semibold hover:bg-red-50 transition-colors">
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== GUEST CHECK HOOK ====================
function useRequireAuth(): (action: () => void) => void {
  const { user, setShowGuestModal } = useAppStore();
  return (action: () => void) => {
    if (user?.role === "guest") {
      setShowGuestModal(true);
    } else {
      action();
    }
  };
}

// Premium access checker - shows pricing if not premium
function useRequirePremium(): (testId: string, isFree: boolean, action: () => void) => void {
  const { subscription, setView, setShowPaymentModal, setPaymentModalData, user, setShowGuestModal } = useAppStore();
  return (testId: string, isFree: boolean, action: () => void) => {
    // Guest check first
    if (user?.role === "guest") {
      setShowGuestModal(true);
      return;
    }
    // Free tests — always allow
    if (isFree) {
      action();
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
      // Fallback: fetch once
      getBanners().then(data => { if (data) setBanners(data); });
    });
    return () => unsubscribe();
  }, []);

  // Auto-rotate every 3 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Scroll to current index
  useEffect(() => {
    if (scrollRef.current) {
      const child = scrollRef.current.children[currentIndex] as HTMLElement;
      if (child) {
        scrollRef.current.scrollTo({
          left: child.offsetLeft - 16,
          behavior: "smooth",
        });
      }
    }
  }, [currentIndex]);

  const gradients = ["from-ev-navy to-blue-800", "from-ev-orange to-orange-700", "from-ev-gold to-yellow-600", "from-green-500 to-emerald-600", "from-purple-500 to-purple-600"];

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-3 overflow-hidden scroll-smooth">
        {banners.map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: i === currentIndex ? 1 : 0.5, scale: i === currentIndex ? 1 : 0.95 }}
            transition={{ duration: 0.4 }}
            className={`min-w-full rounded-2xl bg-gradient-to-r ${b.gradient || b.color || gradients[i % gradients.length]} p-5 flex items-center justify-between shadow-lg cursor-pointer`}
            onClick={() => handleBannerClick(b, setView)}
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
      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? "bg-ev-orange w-6" : "bg-gray-300"}`}
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

  // Auto-scroll every 3 seconds
  useEffect(() => {
    if (announcements.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [announcements.length, isPaused]);

  if (announcements.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-2">No announcements yet</p>;
  }

  const a = announcements[currentIndex];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={a.id || currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          onClick={() => handleAnnouncementClick(a, setView)}
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
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + announcements.length) % announcements.length); }} className="p-1 rounded-lg hover:bg-ev-orange/10 text-gray-400 hover:text-ev-orange transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            {announcements.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }} className={`rounded-full transition-all ${i === currentIndex ? "w-4 h-1.5 bg-ev-orange" : "w-1.5 h-1.5 bg-ev-orange/30"}`} />
            ))}
          </div>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % announcements.length); }} className="p-1 rounded-lg hover:bg-ev-orange/10 text-gray-400 hover:text-ev-orange transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== HOME TAB ====================
function HomeTab() {
  const { setView, user, currentView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const requireAuth = useRequireAuth();
  const requirePremium = useRequirePremium();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [popularTests, setPopularTests] = useState<any[]>([]);
  const [dailyQuizzes, setDailyQuizzes] = useState<any[]>([]);
  const [mockTests, setMockTests] = useState<any[]>([]);

  // Fetch data from Firestore — re-fetch when user comes back to home
  // Announcements use real-time listener
  useEffect(() => {
    const q = query(collection(db, "announcements"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => {
        const raw = d.data();
        return { ...raw, id: d.id } as AnnouncementData;
      });
      data.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
        return dateB - dateA;
      });
      setAnnouncements(data);
    }, (error) => {
      console.error("Announcement real-time error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Other data (popular tests, quizzes, mock tests) fetch on home view
  useEffect(() => {
    if (currentView !== "home") return;
    async function fetchData() {
      try {
        const [popData, quizData, testData] = await Promise.all([
          getPopularTests(),
          getDailyQuiz(),
          getMockTests(),
        ]);
        if (popData && popData.length > 0) setPopularTests(popData);
        if (quizData && quizData.length > 0) setDailyQuizzes(quizData);
        if (testData && testData.length > 0) setMockTests(testData);
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, [currentView]);

  const navQuickLinks = navigationItems.filter(i => i.location === "quicklinks").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const quickLinksData = navQuickLinks.length === 0 ? DEFAULT_QUICK_LINKS : navQuickLinks.slice(0, 4);

  return (
    <div className="pb-6">
      {/* Welcome */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xl font-bold text-ev-navy">
          {user?.role === "guest" ? `${t("welcome", lang)} 👋` : `${t("welcomeBack", lang)} 👋`}
        </h2>
        <p className="text-gray-500 text-sm">{t("startLearning", lang)}</p>
      </div>

      {/* Banner Carousel - Auto Rotating */}
      <div className="px-4 mb-5">
        <AutoRotatingBanners />
      </div>

      {/* Quick Links Grid */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-4 gap-3">
          {quickLinksData.map((item, i) => {
            const IconComp = ICON_MAP[item.icon] || Zap;
            const bgClass = QUICKLINK_BG[item.color] || "bg-gradient-to-br from-gray-500 to-gray-600 shadow-gray-500/30";
            return (
            <motion.button
              key={item.id || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => {
                if (item.requireAuth) requireAuth(() => setView(item.targetView as any));
                else requireAuth(() => setView(item.targetView as any));
              }}
              className="flex flex-col items-center gap-2"
            >
              <div className={`w-14 h-14 rounded-2xl ${bgClass} shadow-lg flex items-center justify-center`}>
                <IconComp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{item.label}</span>
            </motion.button>
            );
          })}
        </div>
      </div>

      {/* Announcements - Auto-scrolling Carousel */}
      <div className="px-4 mb-5">
        <div className="bg-ev-orange/10 rounded-2xl p-4 border border-ev-orange/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-ev-orange" />
              <span className="text-sm font-bold text-ev-orange uppercase tracking-wider">{t("announcements", lang)}</span>
            </div>
            <div className="flex items-center gap-1" id="announcement-dots">
              {announcements.map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all announcement-dot-${i} ${i === 0 ? "bg-ev-orange w-3" : "bg-ev-orange/30"}`} />
              ))}
            </div>
          </div>
          <AnnouncementCarousel announcements={announcements} />
        </div>
      </div>

      {/* Upcoming Exams */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-ev-navy">Upcoming Exams 🔔</h3>
          <button onClick={() => setView("upcoming-exams")} className="text-ev-orange text-sm font-semibold">View All →</button>
        </div>
        <button onClick={() => setView("upcoming-exams")} className="w-full bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-5 shadow-lg shadow-cyan-500/20 text-left">
          <div className="flex items-center gap-3 mb-2">
            <CalendarDays className="w-8 h-8 text-white/80" />
            <div>
              <h4 className="text-lg font-bold text-white">Check Upcoming Exams</h4>
              <p className="text-white/70 text-sm">WBCS, SSC, Railway, Banking & more</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <span>Apply Link</span>
            <span>•</span>
            <span>Official Website</span>
            <span>•</span>
            <span>Full Details</span>
          </div>
        </button>
      </div>

      {/* Daily Tips */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-ev-navy">Daily Tips 💡</h3>
          <button onClick={() => setView("daily-tips")} className="text-ev-orange text-sm font-semibold">View All →</button>
        </div>
        <button onClick={() => setView("daily-tips")} className="w-full bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 shadow-lg shadow-amber-500/20 text-left">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-white/80" />
            <div>
              <h4 className="text-lg font-bold text-white">Today's Study Tips</h4>
              <p className="text-white/70 text-sm">Expert strategies & exam tips</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <span>Study Tips</span>
            <span>•</span>
            <span>Exam Strategy</span>
            <span>•</span>
            <span>Motivation</span>
          </div>
        </button>
      </div>

      {/* Popular Tests */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-ev-navy">{t("popularTests", lang)} 🔥</h3>
          <button onClick={() => setView("mocktests")} className="text-ev-orange text-sm font-semibold">{t("viewAll", lang)} →</button>
        </div>
        <div className="space-y-3">
          {popularTests.slice(0, 3).map((test, i) => (
            <motion.div
              key={test.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => requirePremium(test.id, test.isFree, () => { useAppStore.getState().setSelectedTest(test.id); setView("exam"); })}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-ev-blue-light text-ev-navy">{test.category}</span>
                    {test.isFree && <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-green-50 text-ev-green">{t("free", lang)}</span>}
                    {!test.isFree && <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-ev-gold-light text-ev-gold">{t("premium", lang)}</span>}
                  </div>
                  <h4 className="font-bold text-ev-navy">{test.title}</h4>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{test.duration} min</span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" />{test.marks || 0} marks</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{test.questions} Q</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 text-ev-gold fill-ev-gold" />
                    <span className="text-sm font-bold text-ev-navy">{test.rating || 0}</span>
                  </div>
                  <span className="text-xs text-gray-400">{test.attempts || 0}+</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Daily Quiz */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-ev-navy">{t("dailyQuiz", lang)} 🧠</h3>
          <button onClick={() => setView("free-quizzes")} className="text-ev-orange text-sm font-semibold">{t("viewAll", lang)} →</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {dailyQuizzes.map(q => (
            <div key={q.id} onClick={() => requireAuth(() => { useAppStore.getState().setSelectedTest(q.id); setView("exam"); })} className="min-w-[160px] bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 shadow-lg shadow-purple-500/20 cursor-pointer active:scale-95 transition-transform">
              <Brain className="w-8 h-8 text-white/80 mb-2" />
              <h4 className="text-sm font-bold text-white">{q.title}</h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-white/70">
                <span>{q.questions} Q</span>
                <span>•</span>
                <span>{q.duration} min</span>
              </div>
              <div className="mt-2 text-xs text-white/60">{q.participants || 0} joined</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== MOCK TESTS TAB ====================
function MockTestsTab() {
  const { setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const [filter, setFilter] = useState("All");
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

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("mockTests", lang)}</h2>
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-ev-orange text-sm" placeholder={t("searchTests", lang)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3">
          {categories.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${filter === f ? "bg-ev-navy text-white" : "bg-gray-100 text-gray-600"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 space-y-3">
        {tests.filter((t: any) => filter === "All" || t.category === filter).map((test: any) => (
          <div key={test.id} onClick={() => requirePremium(test.id, test.isFree, () => { useAppStore.getState().setSelectedTest(test.id); setView("exam"); })} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${test.isFree ? "bg-green-50" : "bg-ev-gold-light"}`}>
                {test.isFree ? <Zap className="w-6 h-6 text-ev-green" /> : <Crown className="w-6 h-6 text-ev-gold" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-ev-navy">{test.title}</h4>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="font-bold px-2 py-0.5 rounded-md bg-ev-blue-light text-ev-navy">{test.category}</span>
                  <span>{test.duration} min</span>
                  <span>{test.questions} Q</span>
                  <span>{test.marks || 0} marks</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-0.5"><Star className="w-3 h-3 text-ev-gold fill-ev-gold" /><span className="text-sm font-bold">{test.rating || 0}</span></div>
                <span className="text-xs text-gray-400">{test.attempts || 0}+</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== TEST SERIES TAB ====================
function TestSeriesTab() {
  const { setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const requireAuth = useRequireAuth();
  const requirePremium = useRequirePremium();
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getTestSeries();
        if (data && data.length > 0) setSeries(data);
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, []);

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("testSeries", lang)}</h2>
      </div>
      <div className="px-4 space-y-3">
        {series.map(s => (
          <div key={s.id} onClick={() => requirePremium(s.id, s.isFree, () => { useAppStore.getState().setSelectedTest(s.id); setView("exam"); })} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-ev-gold-light flex items-center justify-center"><Trophy className="w-6 h-6 text-ev-gold" /></div>
              <div className="flex-1">
                <h4 className="font-bold text-ev-navy">{s.title}</h4>
                <p className="text-sm text-gray-500">{s.totalTests || s.tests || 0} Tests</p>
              </div>
              <div className="text-right">
                {s.isFree ? <span className="text-ev-green font-bold">FREE</span> : <span className="text-ev-orange font-bold">₹{s.price || 0}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== FREE TESTS TAB ====================
function FreeTestsTab() {
  const { setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const requireAuth = useRequireAuth();
  const [freeTests, setFreeTests] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getFreeTests();
        if (data && data.length > 0) setFreeTests(data);
        else {
          // Fallback: use mock tests that are free
          const mockData = await getMockTests();
          if (mockData && mockData.length > 0) setFreeTests(mockData.filter((t: any) => t.isFree));
        }
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, []);

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("freeTests", lang)}</h2>
      </div>
      <div className="px-4 space-y-3">
        {freeTests.map(test => (
          <div key={test.id} onClick={() => requireAuth(() => { useAppStore.getState().setSelectedTest(test.id); setView("exam"); })} className="bg-white rounded-2xl p-4 border border-green-100 shadow-sm cursor-pointer active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center"><Zap className="w-6 h-6 text-ev-green" /></div>
              <div className="flex-1">
                <h4 className="font-bold text-ev-navy">{test.title}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-500"><span>{test.duration} min</span><span>{test.questions} Q</span><span>{test.marks || 0} marks</span></div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-green-50 text-ev-green text-xs font-bold">FREE</span>
            </div>
          </div>
        ))}
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

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getDailyQuiz();
        if (data && data.length > 0) setQuizzes(data);
      } catch (e) { console.error("Firestore fetch error:", e); }
    }
    fetchData();
  }, []);

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("freeQuizzes", lang)}</h2>
      </div>
      <div className="px-4 space-y-3">
        {quizzes.map(q => (
          <div key={q.id} onClick={() => requireAuth(() => { useAppStore.getState().setSelectedTest(q.id); setView("exam"); })} className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 shadow-lg cursor-pointer active:scale-95">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-white/80" />
              <div className="flex-1">
                <h4 className="font-bold text-white">{q.title}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-white/70"><span>{q.questions} Q</span><span>•</span><span>{q.duration} min</span></div>
              </div>
              <div className="text-right text-white/60 text-xs">{q.participants || 0} joined</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== PREVIOUS PAPERS TAB ====================
function PreviousPapersTab() {
  const { setView } = useAppStore();
  const lang = useAppStore(s => s.language);
  const requireAuth = useRequireAuth();
  const [papers, setPapers] = useState<any[]>([]);

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
    <div className="pb-6">
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("previousPapers", lang)}</h2>
      </div>
      <div className="px-4 space-y-3">
        {papers.map(p => (
          <div key={p.id} onClick={() => requireAuth(() => { useAppStore.getState().setSelectedPaperId(p.id); setView("previous-paper-detail"); })} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-ev-orange-light flex items-center justify-center"><FileText className="w-6 h-6 text-ev-orange" /></div>
              <div className="flex-1">
                <h4 className="font-bold text-ev-navy">{p.name || p.title}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500"><span className="font-bold px-2 py-0.5 rounded-md bg-ev-blue-light text-ev-navy">{p.category}</span><span>Year: {p.year}</span></div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        ))}
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
                {paper.category}{paper.year ? ` • ${paper.year}` : ""}
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
  const requireAuth = useRequireAuth();
  const [notesData, setNotesData] = useState<any[]>([]);

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
    <div className="pb-6">
      <div className="px-4 pt-4">
        <h2 className="text-xl font-bold text-ev-navy mb-3">{t("notes", lang)}</h2>
      </div>
      <div className="px-4 space-y-3">
        {notesData.map(n => (
          <div key={n.id} onClick={() => requireAuth(() => { useAppStore.getState().setSelectedNoteId(n.id!); setView("note-detail"); })} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center"><Notebook className="w-6 h-6 text-purple-600" /></div>
              <div className="flex-1">
                <h4 className="font-bold text-ev-navy">{n.title}</h4>
                <p className="text-xs text-gray-500">{n.category} • {n.pages || 0} pages</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        ))}
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
      {((note as any).author || (note as any).language || (note as any).isFree !== undefined) ? (
        <div className="px-4 mb-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(note as any).author && <div><span className="text-gray-500">Author:</span> <span className="font-semibold text-ev-navy">{(note as any).author}</span></div>}
              {(note as any).language && <div><span className="text-gray-500">Language:</span> <span className="font-semibold text-ev-navy">{(note as any).language}</span></div>}
              <div><span className="text-gray-500">Access:</span> <span className={`font-semibold ${(note as any).isFree ? "text-ev-green" : "text-ev-orange"}`}>{(note as any).isFree ? "Free" : "Premium"}</span></div>
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
  const { goBack, user, userProfile, setUserProfile, firebaseUser } = useAppStore();
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
      
      const fileRef = ref(storage, `profilePhotos/${user.uid}_${Date.now()}_${file.name}`);
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

        {/* Test History Section */}
        {user?.role !== "guest" && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-ev-orange/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-ev-orange" />
              </div>
              <h3 className="text-sm font-bold text-ev-navy">Test History</h3>
              <span className="text-xs text-gray-400 ml-auto">{testHistory.length} tests</span>
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
                <div key={entry.id} className={`flex flex-col items-center ${rank === 1 ? "-mt-4" : ""}`}>
                  <div className={`${rank === 1 ? "w-16 h-16 text-2xl" : "w-12 h-12 text-lg"} rounded-full bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center shadow-xl ring-2 ring-white/30 mb-2`}>
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

// ==================== EXAM PAGE ====================
function ExamPage() {
  const { goBack, selectedTest, user, firebaseUser } = useAppStore();
  const { setLastTestResult } = useAppStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(2700); // 45 min default
  const [testTitle, setTestTitle] = useState("Mock Test");
  const lang = useAppStore(s => s.language);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false); // view-only after submit
  const [initialDuration, setInitialDuration] = useState(2700); // track original duration for time calc
  const [savingResult, setSavingResult] = useState(false);

  // Answer state: maps question index to selected option key
  const [answers, setAnswers] = useState<Record<number, string>>({});
  // Marked for review: set of question indices
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());

  // Fetch questions from Firestore — try testId first, then fallback to category
  useEffect(() => {
    async function fetchQuestions() {
      try {
        // First, get the mock test details to find its category
        let testCategory: string | undefined;
        if (selectedTest) {
          try {
            const { getMockTestById } = await import("@/lib/services/firestore");
            const testData = await getMockTestById(selectedTest);
            if (testData) {
              testCategory = testData.category;
              setTestTitle(testData.title || "Mock Test");
              // Set timer from test duration
              if (testData.duration) {
                const durationSec = testData.duration * 60;
                setTimeLeft(durationSec);
                setInitialDuration(durationSec);
              }
            }
          } catch (e) { console.error("MockTest fetch error:", e); }
        }
        // Fetch questions: testId first, then category fallback
        const data = await getQuestions(selectedTest || undefined, testCategory);
        if (data && data.length > 0) {
          setQuestions(data);
        }
      } catch (e) { console.error("Questions fetch error:", e); }
      finally { setLoading(false); }
    }
    fetchQuestions();
  }, [selectedTest]);

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
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
          <button onClick={() => { if (isReviewMode) { setIsReviewMode(false); setSubmitted(true); } else { setShowSubmitConfirm(true); } }} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <h2 className="text-white font-bold text-sm truncate max-w-[180px]">{isReviewMode ? "Review Answers" : testTitle}</h2>
          {isReviewMode ? <span className="text-xs font-bold text-ev-gold bg-ev-gold/20 px-2 py-1 rounded-lg">VIEW ONLY</span> : <div className="flex items-center gap-1 text-ev-gold text-sm font-bold"><Timer className="w-4 h-4" /> {formatTime(timeLeft)}</div>}
        </div>
        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-2 mb-1">
          <div className="bg-gradient-to-r from-ev-orange to-ev-gold h-2 rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
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
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showQuestionNav ? "rotate-90" : ""}`} />
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
                      <button key={i} onClick={() => { setCurrentQ(i); setShowQuestionNav(false); }} className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center ${bgClass} transition-all active:scale-95`}>
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
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${q.difficulty === "easy" ? "bg-green-50 text-green-600" : q.difficulty === "hard" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{q.difficulty}</span>
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
              <button key={opt.key} onClick={() => selectAnswer(opt.key)} className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                isWrong ? "border-red-400 bg-red-50 text-red-700" :
                isCorrect ? "border-green-400 bg-green-50 text-green-700" :
                isSelected ? "border-ev-orange bg-ev-orange/10 text-ev-navy" :
                "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isWrong ? "bg-red-400 text-white" :
                    isCorrect ? "bg-green-400 text-white" :
                    isSelected ? "bg-ev-orange text-white" :
                    "bg-gray-100 text-gray-500"
                  }`}>{opt.key}</span>
                  <span className="flex-1">{opt.text}</span>
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
            <button onClick={goPrev} disabled={currentQ === 0} className={`py-3 px-5 rounded-xl font-bold text-sm flex items-center gap-1 ${currentQ === 0 ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-gray-100 text-ev-navy hover:bg-gray-200"}`}>
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
          <button onClick={toggleMark} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isMarked ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-500"}`}>
            <Bookmark className={`w-3.5 h-3.5 ${isMarked ? "fill-purple-600" : ""}`} /> {isMarked ? "Marked" : "Mark for Review"}
          </button>
          {currentQ < questions.length - 1 && (
            <button onClick={goNext} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
          )}
        </div>
        {/* Prev / Submit / Next */}
        <div className="flex gap-2">
          <button onClick={goPrev} disabled={currentQ === 0} className={`py-3 px-5 rounded-xl font-bold text-sm flex items-center gap-1 ${currentQ === 0 ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-gray-100 text-ev-navy hover:bg-gray-200"}`}>
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

      {/* Submit Confirmation Dialog */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
          { label: "Score", value: `${score}/${total}`, icon: Target, color: "text-ev-green" },
          { label: "Correct", value: `${lastTestResult?.correctAnswers ?? 0}`, icon: CheckCircle, color: "text-green-400" },
          { label: "Wrong", value: `${lastTestResult?.wrongAnswers ?? 0}`, icon: X, color: "text-red-400" },
          { label: "Time", value: `${mins}m ${secs}s`, icon: Clock, color: "text-ev-gold" },
          { label: "Accuracy", value: `${accuracy}%`, icon: TrendingUp, color: "text-ev-orange" },
        ].map((s, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-xl rounded-xl p-4 flex items-center gap-3">
            <s.icon className={`w-6 h-6 ${s.color}`} />
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

// ==================== BOTTOM NAV ====================
function BottomNav() {
  const { currentView, setView, navigationItems, user } = useAppStore();
  const requireAuth = useRequireAuth();

  const tabs = navigationItems.filter(i => i.location === "bottomnav").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const fallback = tabs.length === 0 ? DEFAULT_BOTTOM_NAV : tabs;
  const items = fallback.slice(0, 5); // Max 5 bottom nav items

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 z-40 pb-safe">
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
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${isActive ? "text-ev-orange" : "text-gray-400 hover:text-gray-600"}`}
            >
              <IconComp className={`w-5 h-5 ${isActive ? "text-ev-orange" : ""}`} />
              <span className={`text-[10px] font-semibold ${isActive ? "text-ev-orange" : ""}`}>{item.label}</span>
              {isActive && <div className="w-1 h-1 rounded-full bg-ev-orange" />}
            </button>
          );
        })}
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
              setIsExitingApp(true);
              try { window.close(); } catch {}
              window.history.back();
              setTimeout(() => {
                const store = useAppStore.getState();
                if (store.isExitingApp) {
                  window.location.replace("about:blank");
                }
              }, 500);
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

// ==================== MAIN APP ====================
export default function ExamVaultApp() {
  const { currentView, goBack, canGoBack, setExitConfirmVisible, isExitingApp, setIsExitingApp, appSettings } = useAppStore();
  const [showSplash, setShowSplash] = useState(true);
  // Check localStorage — if onboarding already completed, skip it
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ev_onboarding_done') !== 'true';
    }
    return false;
  });
  // Track if view change came from popstate (back button) to avoid double pushState
  const isBackNavigation = useRef(false);
  // Track if the initial sentinel has been set up
  const sentinelReady = useRef(false);

  // Load user profile from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ev_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        useAppStore.getState().setUserProfile(parsed);
      }
      // Load app settings from localStorage cache first (fast)
      const savedSettings = localStorage.getItem('ev_app_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        useAppStore.getState().setAppSettings(parsedSettings);
      }
    } catch (e) { /* ignore */ }
    // Then fetch fresh settings from Firestore (async)
    const fetchSettings = async () => {
      try {
        const settings = await getAppSettings();
        if (settings) {
          useAppStore.getState().setAppSettings(settings);
        }
      } catch (e) { /* ignore - will use localStorage cache */ }
    };
    fetchSettings();
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      useAppStore.getState().setFirebaseUser(user);
      useAppStore.getState().setAuthLoading(false);
      if (user) {
        useAppStore.getState().setUser({
          name: user.displayName || "User",
          email: user.email || "",
          role: "user",
          uid: user.uid,
        });
        // Check subscription status after login
        checkSubscriptionStatus(user.uid).then((status) => {
          if (status.isPremium) {
            useAppStore.getState().setSubscription({
              isPremium: true,
              premiumExpiry: status.premiumExpiry,
              planName: status.planName,
              purchasedItemIds: status.purchasedItems?.map((p: any) => p.itemId) || [],
            });
          }
        }).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time navigation items from admin
  useEffect(() => {
    const q = query(collection(db, "navigation"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      useAppStore.getState().setNavigationItems(items);
    }, () => {
      // On error, navigation will use defaults (empty array → defaults kick in)
    });
    return () => unsubscribe();
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      const notifs = await getNotifications();
      if (notifs) {
        useAppStore.getState().setNotifications(notifs);
        useAppStore.getState().setUnreadNotificationCount(notifs.filter((n: any) => !n.isRead).length);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle hardware back button — CRITICAL FOR PWA
  // Strategy: Keep only ONE history entry (sentinel) above the real page entry.
  // On every popstate, re-push the sentinel so the browser never navigates away.
  // All in-app navigation is handled via Zustand store, not browser history.
  useEffect(() => {
    // Set up the sentinel — push one entry above the current page
    // When back is pressed, browser goes to this sentinel → popstate fires → we re-push
    window.history.pushState({ appState: true }, "");
    sentinelReady.current = true;

    const handlePopState = (_event: PopStateEvent) => {
      const store = useAppStore.getState();

      // If the user explicitly clicked Exit, let the browser handle the back navigation naturally
      if (store.isExitingApp) {
        return;
      }

      // CRITICAL: Re-push sentinel immediately so the browser can't navigate away
      // This must happen synchronously BEFORE any async operations
      window.history.pushState({ appState: true }, "");

      // Mark this as back navigation so the currentView effect doesn't pushState again
      isBackNavigation.current = true;

      // If we can go back in our internal view history, do that
      if (store.viewHistory.length > 0) {
        // Don't go back to a root view — that should show exit dialog
        const prevView = store.viewHistory[store.viewHistory.length - 1];
        const ROOT_VIEWS = ["home"];
        if (ROOT_VIEWS.includes(prevView) && store.viewHistory.length === 1) {
          // Only root left — show exit dialog instead of going to home from home
          store.setExitConfirmVisible(true);
        } else {
          store.goBack();
        }
      } else {
        // We're at root (home) — show exit confirmation dialog
        store.setExitConfirmVisible(true);
      }

      // Reset the flag after React has processed the state update
      setTimeout(() => { isBackNavigation.current = false; }, 100);
    };

    // Handle pageshow event — when browser restores page from bfcache
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.history.pushState({ appState: true }, "");
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  // Keep the sentinel updated with current view info (replaceState, NOT pushState)
  // This ensures we never add extra history entries during forward navigation
  useEffect(() => {
    if (currentView === "splash" || currentView === "onboarding") return;
    if (!sentinelReady.current) return;
    if (isBackNavigation.current) return;
    // Only replace the current top entry — never push new ones
    window.history.replaceState({ appState: true, view: currentView }, "");
  }, [currentView]);

  // Restore scroll position when view changes (goBack restores from store, forward nav scrolls to top)
  useEffect(() => {
    if (currentView === "splash" || currentView === "onboarding") return;
    const { scrollPositions } = useAppStore.getState();
    const savedY = scrollPositions[currentView];
    // If there's a saved scroll position for this view, restore it; otherwise scroll to top
    if (savedY !== undefined && savedY > 0) {
      // Delay to let the DOM render the view first
      const timer = setTimeout(() => window.scrollTo(0, savedY), 50);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo(0, 0);
    }
  }, [currentView]);

  // Splash → Onboarding → Home
  if (showSplash) {
    return (
      <>
        <SplashScreen onComplete={() => {
          // Only show onboarding if user hasn't completed it before
          const onboardingDone = localStorage.getItem('ev_onboarding_done') === 'true';
          if (onboardingDone) {
            setShowSplash(false);
            useAppStore.getState().setView("home");
          } else {
            setShowSplash(false);
            setShowOnboarding(true);
          }
        }} />
        <ExitConfirmDialog />
      </>
    );
  }

  if (showOnboarding) {
    return (
      <>
        <OnboardingScreen onComplete={() => {
          // Mark onboarding as completed so it never shows again
          localStorage.setItem('ev_onboarding_done', 'true');
          setShowOnboarding(false);
          useAppStore.getState().setView("home");
        }} />
        <ExitConfirmDialog />
      </>
    );
  }

  // If currentView is still splash after onboarding, go home
  if (currentView === "splash") {
    useAppStore.getState().setView("home");
  }

  // Auth screens
  if (currentView === "login" || currentView === "register") {
    return <><LoginScreen /><GuestLockModal /><ExitConfirmDialog /></>;
  }

  // Exam/Result screens (full screen)
  if (currentView === "exam") {
    return <><ExamPage /><ExitConfirmDialog /></>;
  }

  if (currentView === "result") {
    return <><ResultPage /><ExitConfirmDialog /></>;
  }

  // User App
  return (
    <div className={`min-h-screen ${useAppStore.getState().isDark ? "dark bg-gray-900" : "bg-gray-50"} pb-16`}>
      {/* Maintenance Mode Overlay */}
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
        <motion.div key={currentView} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
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
        </motion.div>
      </AnimatePresence>
      <BottomNav />
      <GuestLockModal />
      <PaymentModal />
      <ExitConfirmDialog />
    </div>
  );
}
