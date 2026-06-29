"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { onAuthChange, logout as authLogout } from "@/lib/services/auth";
import {
  getMockTests, getMockTestById, getQuestions, getLeaderboard,
  getAppSettings, getCategories, getSubcategories, getPlansByScope,
  saveTestResult, getUserTestResults,
  checkSubscriptionStatus,
  getBanners, getAnnouncements,
  type CategoryData, type PremiumPlan,
  BannerData, AnnouncementData, QuestionData, LeaderboardData, TestResultData,
} from "@/lib/services/firestore";
import {
  Home, BookOpen, Award, User, Settings, HelpCircle,
  ChevronRight, Bell, Search, Clock, Star, Zap, Award as TrophyIcon,
  Target, TrendingUp, Crown, Menu, X, LogOut, ArrowLeft,
  Timer, AlertTriangle, Loader2,
  CheckCircle, Bookmark, SkipForward, Grid3X3, ShoppingCart,
  FileText,
} from "lucide-react";

// User Components
import LoginScreen from "@/components/user/LoginScreen";
import SettingsTab from "@/components/user/SettingsTab";
import PaymentModal from "@/components/user/PaymentModal";
import GuestLockModal from "@/components/shared/GuestLockModal";
import NotificationPanel from "@/components/user/NotificationPanel";

// ==================== HELPERS ====================

function isItemFree(item: any): boolean {
  if (item.accessType === "free") return true;
  if (item.accessType === "premium") {
    const price = Number(item.price || 0);
    return price <= 0;
  }
  if (item.isFree === true) return true;
  if (item.isFree === false) return false;
  if (item.price && Number(item.price) > 0) return false;
  return true;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, BookOpen, Award, User, Settings, HelpCircle, Crown,
  FileText, Zap, TrophyIcon, Target,
};

function useRequireAuth() {
  const { user, setView } = useAppStore();
  return (action: () => void) => {
    if (!user || user.role === "guest") { setView("login"); return; }
    action();
  };
}

function useRequirePremium() {
  const { subscription, setView, setShowPaymentModal, setPaymentModalData, user } = useAppStore();
  return (testId: string, isFree: boolean, action: () => void, buyInfo?: { name: string; price: number }) => {
    if (isFree) { action(); return; }
    if (!user || user.role === "guest") { setView("login"); return; }
    if (subscription.isPremium) { action(); return; }
    if (subscription.purchasedItemIds.includes(testId)) { action(); return; }
    if (buyInfo && buyInfo.price > 0) {
      setPaymentModalData({ planId: testId, planName: buyInfo.name, amount: buyInfo.price, type: "one_time" });
      setShowPaymentModal(true);
      return;
    }
    setView("pricing");
  };
}

// ==================== DEFAULT NAV ====================

const DEFAULT_BOTTOM_NAV = [
  { label: "Home", icon: "Home", targetView: "home", location: "bottomnav", order: 0, isActive: true, color: "text-blue-600", requireAuth: false },
  { label: "Tests", icon: "BookOpen", targetView: "mocktests", location: "bottomnav", order: 1, isActive: true, color: "text-indigo-600", requireAuth: false },
  { label: "Leaderboard", icon: "Award", targetView: "leaderboard", location: "bottomnav", order: 2, isActive: true, color: "text-amber-600", requireAuth: false },
  { label: "Profile", icon: "User", targetView: "profile", location: "bottomnav", order: 3, isActive: true, color: "text-[#0B1437]", requireAuth: false },
];

const DEFAULT_SIDE_MENU = [
  { label: "Home", icon: "Home", targetView: "home", location: "sidemenu", order: 0, isActive: true, color: "text-blue-600", requireAuth: false },
  { label: "Mock Tests", icon: "BookOpen", targetView: "mocktests", location: "sidemenu", order: 1, isActive: true, color: "text-indigo-600", requireAuth: false },
  { label: "Premium Plans", icon: "Crown", targetView: "pricing", location: "sidemenu", order: 2, isActive: true, color: "text-amber-500", requireAuth: false },
  { label: "My Purchases", icon: "ShoppingCart", targetView: "my-purchases", location: "sidemenu", order: 3, isActive: true, color: "text-blue-600", requireAuth: true },
  { label: "Settings", icon: "Settings", targetView: "settings", location: "sidemenu", order: 4, isActive: true, color: "text-gray-600", requireAuth: false },
  { label: "Support", icon: "HelpCircle", targetView: "support", location: "sidemenu", order: 5, isActive: true, color: "text-gray-500", requireAuth: false },
];

// ==================== HEADER ====================

function Header() {
  const { setView, setSidebarOpen, unreadNotificationCount, user } = useAppStore();
  const subscription = useAppStore(s => s.subscription);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-white/10">
              <Menu className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <span className="text-lg">📚</span>
              </div>
              <h1 className="text-lg font-black text-white tracking-tight">EXAM<span className="text-amber-400">VAULT</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(subscription.isPremium || subscription.purchasedItemIds?.length > 0) ? (
              <button onClick={() => setView("my-purchases")} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-400 text-xs font-bold border border-amber-400/30">
                <Crown className="w-3 h-3" /> PRO
              </button>
            ) : user?.role !== "guest" ? (
              <button onClick={() => setView("pricing")} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-400 text-xs font-bold border border-amber-400/30 animate-pulse">
                <Crown className="w-3 h-3" /> Upgrade
              </button>
            ) : null}
            <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-xl hover:bg-white/10">
              <Search className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => setShowNotifications(true)} className="p-2 rounded-xl hover:bg-white/10 relative">
              <Bell className="w-5 h-5 text-white" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-[#0B1437] text-[10px] text-white font-bold flex items-center justify-center px-1">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {showSearch && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-3" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim()) { setShowSearch(false); setView("mocktests"); } }}
                placeholder="Search tests, exams, categories..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 text-white placeholder-white/50 rounded-xl border border-white/20 focus:outline-none focus:border-amber-400/50 text-sm"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-white/50">
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
  const { sidebarOpen, setSidebarOpen, setView, navigationItems } = useAppStore();
  const menuItems = navigationItems.filter(i => i.location === "sidemenu").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const fallback = menuItems.length === 0 ? DEFAULT_SIDE_MENU : menuItems;

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50" onClick={() => setSidebarOpen(false)} />
          <motion.div
            initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-[#F8FAFC] z-50 shadow-2xl overflow-y-auto scrollbar-hide"
          >
            {/* Slim EXAMVAULT logo header — no user card, no PRO badge */}
            <div className="bg-gradient-to-br from-[#0B1437] via-[#1E2A5E] to-[#0B1437] p-5 pb-5 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-5"><Crown className="w-32 h-32 text-amber-400 -mr-8 -mt-8" /></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <span className="text-xl">📚</span>
                  </div>
                  <div>
                    <h2 className="text-white font-black text-base tracking-tight">EXAM<span className="text-amber-400">VAULT</span></h2>
                    <p className="text-white/50 text-[10px]">Premium Exam Prep</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Menu items only — no Exam Categories grid, no user info, no logout */}
            <div className="px-3 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1">Menu</p>
              {fallback.map((item, idx) => {
                const IconComp = ICON_MAP[item.icon] || HelpCircle;
                return (
                  <button key={item.id || idx}
                    onClick={() => { setSidebarOpen(false); setView(item.targetView as any); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 group">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center">
                      <IconComp className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                    </div>
                    <span className="font-medium text-sm text-gray-700 group-hover:text-blue-700">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 ml-auto" />
                  </button>
                );
              })}
            </div>

            <div className="px-5 py-4 text-center">
              <p className="text-[10px] text-gray-400">ExamVault v2.0</p>
              <p className="text-[10px] text-gray-300 mt-0.5">Made with ❤️ for aspirants</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== HOME TAB ====================

function HomeTab() {
  const { setView } = useAppStore();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [cats, anns, bnrs] = await Promise.all([getCategories(), getAnnouncements(), getBanners()]);
        setCategories(cats || []);
        setAnnouncements(anns || []);
        setBanners(bnrs || []);
      } catch (e) { console.error("Home fetch error:", e); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  // Categories & banners & announcements from Firestore only — NO fallbacks
  const displayCategories = categories;
  const displayBanners = banners;
  const scrollText = announcements.length > 0
    ? announcements.map(a => a.title || a.description || "").filter(Boolean).join("  •  ")
    : "";

  // Auto banner rotation
  const [bannerIdx, setBannerIdx] = useState(0);
  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => setBannerIdx(prev => (prev + 1) % displayBanners.length), 4000);
    return () => clearInterval(timer);
  }, [displayBanners.length]);

  return (
    <div className="pb-6 bg-[#F8FAFC] min-h-screen">
      {/* Scrolling Text Banner at TOP — sticky, always visible */}
      {scrollText ? (
        <div className="sticky top-0 z-30 bg-[#0B1437] py-2.5 overflow-hidden border-b border-amber-400/20">
          <div className="flex whitespace-nowrap animate-marquee">
            <span className="text-amber-400 text-xs font-bold px-4 tracking-wide uppercase">{scrollText}</span>
            <span className="text-amber-400 text-xs font-bold px-4 tracking-wide uppercase">{scrollText}</span>
          </div>
        </div>
      ) : (
        <div className="sticky top-0 z-30 bg-[#0B1437] py-2.5 border-b border-amber-400/20">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <span className="text-[10px]">📚</span>
            </div>
            <h2 className="text-sm font-black text-white tracking-tight">EXAM<span className="text-amber-400">VAULT</span></h2>
          </div>
        </div>
      )}

      {/* Banner Slider — only if admin has added banners */}
      {displayBanners.length > 0 && (
        <div className="px-4 pt-4 mb-0">
          <div className="relative h-36 rounded-2xl overflow-hidden shadow-lg">
            {displayBanners.map((banner: any, i) => {
              const handleClick = () => {
                const linkType = banner.linkType;
                const targetView = banner.targetView;
                const link = banner.link;
                if (linkType === "internal" && targetView) {
                  setView(targetView as any);
                } else if (linkType === "external" && link) {
                  try { window.open(link, "_blank", "noopener,noreferrer"); } catch (e) {}
                } else if (linkType === "detail") {
                  useAppStore.getState().setSelectedAnnouncementId?.(banner.id);
                  setView("announcement-detail" as any);
                }
                // linkType === "none" — no action
              };
              const isClickable = banner.linkType && banner.linkType !== "none" && (
                (banner.linkType === "internal" && banner.targetView) ||
                (banner.linkType === "external" && banner.link) ||
                (banner.linkType === "detail")
              );
              return (
                <div key={banner.id || i}
                  onClick={isClickable ? handleClick : undefined}
                  className={"absolute inset-0 transition-opacity duration-500 " + (i === bannerIdx ? "opacity-100" : "opacity-0") + (isClickable ? " cursor-pointer active:scale-[0.99]" : "")}>
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0B1437] via-[#1E2A5E] to-[#3B82F6] flex flex-col justify-center px-5">
                      <h3 className="text-white font-bold text-lg">{banner.title}</h3>
                      <p className="text-white/60 text-xs mt-1">{banner.subtitle}</p>
                      {banner.linkText && (
                        <span className="mt-2 inline-block self-start px-3 py-1 rounded-lg bg-white/20 text-white text-xs font-semibold">
                          {banner.linkText} →
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {displayBanners.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {displayBanners.map((_: any, i: number) => (
                  <button key={i} onClick={() => setBannerIdx(i)}
                    className={"h-1.5 rounded-full transition-all " + (i === bannerIdx ? "w-6 bg-amber-400" : "w-1.5 bg-white/30")} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Grid — from Firestore only */}
      <div className="px-4 pt-4">
        <h3 className="text-base font-bold text-[#0B1437] mb-3">Exam Categories</h3>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0B1437]" /></div>
        ) : displayCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Grid3X3 className="w-8 h-8 text-gray-300" /></div>
            <p className="text-[#0B1437] font-bold text-sm">No categories yet</p>
            <p className="text-gray-400 text-xs mt-1">Admin will add categories soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayCategories.map((cat, i) => (
              <motion.button key={cat.id || i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { useAppStore.getState().setSelectedCategory(cat.id!); setView("subcategory-list"); }}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-95 transition-transform text-left relative overflow-hidden">
                <div className={"absolute -right-2 -top-2 w-16 h-16 rounded-full opacity-10 bg-gradient-to-br " + (cat.color || "from-blue-500 to-indigo-600")} />
                <div className={"w-12 h-12 rounded-xl bg-gradient-to-br " + (cat.color || "from-blue-500 to-indigo-600") + " flex items-center justify-center shadow-md mb-2"}>
                  <span className="text-2xl">{cat.icon || "📚"}</span>
                </div>
                <h4 className="font-bold text-[#0B1437] text-sm">{cat.name}</h4>
                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{cat.description || "Tap to explore"}</p>
                <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-blue-500">Explore <ChevronRight className="w-3 h-3" /></div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== SUBCATEGORY LIST ====================

function SubcategoryListScreen() {
  const goBack = useAppStore(s => s.goBack);
  const setView = useAppStore(s => s.setView);
  const selectedCategory = useAppStore(s => s.selectedCategory);
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [subcategories, setSubcategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!selectedCategory) { setLoading(false); return; }
      try {
        const [allCats, subs] = await Promise.all([
          getCategories(),
          getSubcategories(selectedCategory),
        ]);
        setCategory(allCats?.find(c => c.id === selectedCategory) || null);
        setSubcategories(subs || []);
      } catch (e) {
        console.error("SubcategoryList error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedCategory]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-8 h-8 animate-spin text-[#0B1437]" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-6">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category?.icon || "📚"}</span>
            <div><h1 className="text-white font-bold text-lg">{category?.name || "Category"}</h1><p className="text-white/50 text-xs">Select your exam</p></div>
          </div>
        </div>
      </div>
      <div className="px-4 pt-4">
        {subcategories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><BookOpen className="w-8 h-8 text-gray-300" /></div>
            <p className="text-[#0B1437] font-bold text-sm">No subcategories yet</p>
            <p className="text-gray-400 text-xs mt-1">Admin will add subcategories soon</p>
            <button onClick={() => setView("category-detail")} className="mt-4 px-5 py-2 rounded-xl bg-[#0B1437] text-white text-xs font-bold">View All Tests</button>
          </div>
        ) : (
          <div className="space-y-2">
            {subcategories.map((sub, i) => (
              <motion.button key={sub.id || i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { useAppStore.getState().setSelectedSubcategory(sub.id!); setView("category-detail"); }}
                className="w-full bg-white rounded-2xl p-3 border border-gray-100 shadow-sm active:scale-95 transition-transform flex items-center gap-3">
                <div className={"w-11 h-11 rounded-xl bg-gradient-to-br " + (sub.color || "from-blue-500 to-indigo-600") + " flex items-center justify-center shadow-sm flex-shrink-0"}>
                  <span className="text-xl">{sub.icon || "📝"}</span>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-[#0B1437] text-sm">{sub.name}</h4>
                  <p className="text-[10px] text-gray-400">{sub.description || "View plans & tests"}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== CATEGORY DETAIL SCREEN ====================

function CategoryDetailScreen() {
  const goBack = useAppStore(s => s.goBack);
  const setView = useAppStore(s => s.setView);
  const selectedCategory = useAppStore(s => s.selectedCategory);
  const selectedSubcategory = useAppStore(s => s.selectedSubcategory);
  const subscription = useAppStore(s => s.subscription);
  const firebaseUser = useAppStore(s => s.firebaseUser);
  const requirePremium = useRequirePremium();
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [subcategory, setSubcategory] = useState<CategoryData | null>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const cats = await getCategories();
        const cat = cats.find(c => c.id === selectedCategory) || null;
        setCategory(cat);

        // Always fetch subcategories of this parent — needed for both branches below
        const allSubs = selectedCategory ? await getSubcategories(selectedCategory) : [];
        const sub = selectedSubcategory ? allSubs.find(s => s.id === selectedSubcategory) || null : null;
        setSubcategory(sub);

        const allTests = await getMockTests();

        // Build matching sets — ID-based (preferred) + name-based (backward compat)
        const possibleNames = new Set<string>();
        const possibleSubIds = new Set<string>();

        if (sub) {
          // Subcategory selected — narrow to just this subcategory
          if (sub.name) possibleNames.add(sub.name);
          if (sub.examCategory) possibleNames.add(sub.examCategory);
          if (sub.id) possibleSubIds.add(sub.id);
        } else if (cat) {
          // Only parent category selected — show tests for parent + ALL its subcategories
          if (cat.name) possibleNames.add(cat.name);
          if (cat.examCategory) possibleNames.add(cat.examCategory);
          allSubs.forEach(s => {
            if (s.name) possibleNames.add(s.name);
            if (s.examCategory) possibleNames.add(s.examCategory);
            if (s.id) possibleSubIds.add(s.id);
          });
        }

        const filtered = (allTests || []).filter((t) => {
          // 1) ID-based matching (preferred — for tests created with new admin form)
          if (selectedSubcategory && t.subcategoryId === selectedSubcategory) return true;
          if (!selectedSubcategory && selectedCategory) {
            if (t.categoryId === selectedCategory) return true;
            // Show tests assigned to any subcategory of this parent
            if (t.subcategoryId && possibleSubIds.has(t.subcategoryId)) return true;
          }
          // 2) Name-based matching (backward compat — for old tests with only `category` field)
          const testCat = (t.category || '').trim();
          if (testCat && possibleNames.has(testCat)) return true;
          if (testCat) {
            for (const name of possibleNames) {
              if (typeof name === 'string' && testCat.toLowerCase() === name.toLowerCase()) return true;
            }
          }
          return false;
        });
        setTests(filtered);
      } catch (e) { console.error('CategoryDetail error:', e); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [selectedCategory, selectedSubcategory]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-8 h-8 animate-spin text-[#0B1437]" /></div>;

  const displayName = subcategory?.name || category?.name || "Tests";
  const displayIcon = subcategory?.icon || category?.icon || "📝";

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{displayIcon}</span>
            <div>
              <h1 className="text-white font-bold text-lg">{displayName}</h1>
              <p className="text-white/50 text-xs">{tests.length} tests available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tests List */}
      <div className="px-4 pt-4">
        {tests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><FileText className="w-8 h-8 text-gray-300" /></div>
            <p className="text-[#0B1437] font-bold text-sm">No tests available yet</p>
            <p className="text-gray-400 text-xs mt-1">Tests will appear here when admin adds them</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((test: any, i) => {
              const free = isItemFree(test);
              const purchased = subscription.purchasedItemIds.includes(test.id) || subscription.isPremium;
              return (
                <motion.div key={test.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => requirePremium(test.id, free, () => { useAppStore.getState().setSelectedTest(test.id); useAppStore.getState().setSelectedTestType("mockTest"); setView("test-info"); }, { name: test.title, price: test.price || 0 })}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
                  <div className="p-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      {test.imageUrl ? <img src={test.imageUrl} alt={test.title} className="w-full h-full object-cover" /> : free ? <Zap className="w-7 h-7 text-emerald-500" /> : <Crown className="w-7 h-7 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#0B1437] text-sm truncate">{test.title}</h4>
                      {test.subject && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md mt-1 inline-block">{test.subject}</span>}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                        <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{test.duration || 0} min</span>
                        <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{test.questions || 0} Q</span>
                        <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />{test.marks || 0} marks</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {free ? <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold">FREE</span> :
                       purchased ? <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Active</span> :
                       <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold">₹{test.price || 0}</span>}
                    </div>
                  </div>
                  {/* Action Button */}
                  {!free && !purchased && (
                    <button onClick={(e) => { e.stopPropagation(); requirePremium(test.id, false, () => {}, { name: test.title, price: Number(test.price) > 0 ? Number(test.price) : 0 }); }}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95">
                      <ShoppingCart className="w-3.5 h-3.5" /> Buy Now — ₹{Number(test.price) > 0 ? Number(test.price) : 0}
                    </button>
                  )}
                  {(free || purchased) && (
                    <button onClick={(e) => { e.stopPropagation(); useAppStore.getState().setSelectedTest(test.id); useAppStore.getState().setSelectedTestType("mockTest"); setView("test-info"); }}
                      className={"w-full py-2.5 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 " + (free ? "bg-[#0B1437]" : "bg-emerald-500")}>
                      <Zap className="w-3.5 h-3.5" /> Start Test
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== PREMIUM PLANS SCREEN ====================

function PremiumPlansScreen() {
  const goBack = useAppStore(s => s.goBack);
  const selectedCategory = useAppStore(s => s.selectedCategory);
  const selectedSubcategory = useAppStore(s => s.selectedSubcategory);
  const subscription = useAppStore(s => s.subscription);
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [subcategory, setSubcategory] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const cats = await getCategories();
        const cat = cats.find(c => c.id === selectedCategory);
        setCategory(cat || null);
        if (selectedSubcategory && selectedCategory) {
          const subs = await getSubcategories(selectedCategory);
          setSubcategory(subs.find(s => s.id === selectedSubcategory) || null);
        }
        const allPlans = await getPlansByScope();
        setPlans(allPlans);
      } catch (e) { console.error("Plans fetch error:", e); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [selectedCategory, selectedSubcategory]);

  // Plans from Firestore only — NO fallbacks
  const displayPlans = plans;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-8 h-8 animate-spin text-[#0B1437]" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-6">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div><h1 className="text-white font-bold text-lg">Premium Plans</h1><p className="text-white/50 text-xs">{subcategory?.name || category?.name || "Choose your plan"}</p></div>
        </div>
      </div>
      <div className="px-4 pt-4 space-y-3">
        {displayPlans.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Crown className="w-8 h-8 text-gray-300" /></div>
            <p className="text-[#0B1437] font-bold text-sm">No premium plans yet</p>
            <p className="text-gray-400 text-xs mt-1">Admin will add plans soon</p>
          </div>
        ) : displayPlans.map((plan, i) => (
          <motion.div key={plan.id || i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={"bg-white rounded-2xl p-4 border-2 shadow-sm " + (plan.isPopular ? "border-amber-400 ring-2 ring-amber-400/10" : "border-gray-100")}>
            {plan.isPopular && <div className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-white text-[9px] font-bold mb-2">⭐ MOST POPULAR</div>}
            <div className="flex items-start justify-between mb-2">
              <div><h4 className="font-bold text-[#0B1437] text-base">{plan.name}</h4><p className="text-[10px] text-gray-400 mt-0.5">{plan.description}</p></div>
              <div className={"w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 " + (plan.isPopular ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gray-100")}>
                <Crown className={"w-5 h-5 " + (plan.isPopular ? "text-white" : "text-gray-400")} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-black text-[#0B1437]">₹{plan.price}</span>
              {plan.originalPrice && <span className="text-sm text-gray-400 line-through">₹{plan.originalPrice}</span>}
              <span className="text-xs text-gray-500">/{plan.durationDays} days</span>
            </div>
            <div className="space-y-1.5 mb-3">
              {plan.features.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /><span>{f}</span></div>
              ))}
            </div>
            <button onClick={() => { useAppStore.getState().setPaymentModalData({ planId: plan.id!, planName: plan.name, amount: plan.price, type: plan.type }); useAppStore.getState().setShowPaymentModal(true); }}
              disabled={subscription.isPremium}
              className={"w-full py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform " + (subscription.isPremium ? "bg-gray-100 text-gray-400" : plan.isPopular ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" : "bg-[#0B1437] text-white")}>
              {subscription.isPremium ? "✓ Subscribed" : `Get ${plan.name}`}
            </button>
          </motion.div>
        ))}
      </div>
      {displayPlans.length > 0 && (
        <div className="px-4 mt-4 text-center"><p className="text-[10px] text-gray-400">🔒 Secure payment via Razorpay  •  UPI, Card, NetBanking accepted  •  Cancel anytime</p></div>
      )}
    </div>
  );
}

// ==================== MOCK TESTS TAB ====================

function MockTestsTab() {
  const { setView } = useAppStore();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories().then(cats => { setCategories(cats || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Categories from Firestore only — NO fallbacks
  const displayCategories = categories;

  return (
    <div className="pb-6 bg-[#F8FAFC] min-h-screen">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-5">
        <h2 className="text-white font-bold text-lg">Browse Tests</h2>
        <p className="text-white/50 text-xs">Select your exam category</p>
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0B1437]" /></div> :
      <div className="px-4 pt-4">
        {displayCategories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Grid3X3 className="w-8 h-8 text-gray-300" /></div>
            <p className="text-[#0B1437] font-bold text-sm">No categories yet</p>
            <p className="text-gray-400 text-xs mt-1">Admin will add categories soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayCategories.map((cat, i) => (
              <motion.button key={cat.id || i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { useAppStore.getState().setSelectedCategory(cat.id!); setView("subcategory-list"); }}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-95 transition-transform text-left relative overflow-hidden">
                <div className={"absolute -right-2 -top-2 w-16 h-16 rounded-full opacity-10 bg-gradient-to-br " + (cat.color || "from-blue-500 to-indigo-600")} />
                <div className={"w-12 h-12 rounded-xl bg-gradient-to-br " + (cat.color || "from-blue-500 to-indigo-600") + " flex items-center justify-center shadow-md mb-2"}>
                  <span className="text-2xl">{cat.icon || "📚"}</span>
                </div>
                <h4 className="font-bold text-[#0B1437] text-sm">{cat.name}</h4>
                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{cat.description || "Tap to explore"}</p>
                <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-blue-500">Explore <ChevronRight className="w-3 h-3" /></div>
              </motion.button>
            ))}
          </div>
        )}
      </div>}
    </div>
  );
}

// ==================== TEST INFO SCREEN ====================

function TestInfoScreen() {
  const goBack = useAppStore(s => s.goBack);
  const setView = useAppStore(s => s.setView);
  const subscription = useAppStore(s => s.subscription);
  const firebaseUser = useAppStore(s => s.firebaseUser);
  const setShowPaymentModal = useAppStore(s => s.setShowPaymentModal);
  const setPaymentModalData = useAppStore(s => s.setPaymentModalData);
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testId = useAppStore.getState().selectedTest;
    if (!testId) { setLoading(false); return; }
    getMockTestById(testId).then(data => { setTestData(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (!testData) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6"><p className="text-gray-500 mb-4">Test not found</p><button onClick={() => goBack()} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Go Back</button></div>;

  const itemIsFree = isItemFree(testData);
  const testId = useAppStore.getState().selectedTest;
  const hasAccess = itemIsFree || subscription.isPremium || subscription.purchasedItemIds.includes(testId);
  const price = Number(testData.price) > 0 ? Number(testData.price) : 0;

  const handleStartTest = () => {
    if (hasAccess) { setView("exam"); return; }
    if (price > 0) { setPaymentModalData({ planId: testId, planName: testData.title, amount: price, type: "one_time" }); setShowPaymentModal(true); }
    else { setView("pricing"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] p-5 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div className="flex-1"><h1 className="text-white font-bold text-lg">{testData.title}</h1><p className="text-white/60 text-xs">{testData.category}</p></div>
        </div>
      </div>
      <div className="p-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" /><p className="text-xs text-gray-400">Duration</p><p className="font-bold text-[#0B1437] text-sm">{testData.duration} min</p></div>
            <div><FileText className="w-5 h-5 text-amber-500 mx-auto mb-1" /><p className="text-xs text-gray-400">Questions</p><p className="font-bold text-[#0B1437] text-sm">{testData.questions}</p></div>
            <div><Star className="w-5 h-5 text-purple-500 mx-auto mb-1" /><p className="text-xs text-gray-400">Marks</p><p className="font-bold text-[#0B1437] text-sm">{testData.marks || 0}</p></div>
          </div>
        </div>
        {testData.description && <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4"><h3 className="font-bold text-[#0B1437] text-sm mb-2">Description</h3><p className="text-xs text-gray-500">{testData.description}</p></div>}
        {testData.instructions && <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-4"><h3 className="font-bold text-amber-700 text-sm mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Instructions</h3><p className="text-xs text-amber-600">{testData.instructions}</p></div>}
      </div>
      <div className="px-4 mt-6">
        {hasAccess ? (
          <button onClick={() => setView("exam")} className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"><Zap className="w-5 h-5" /> Start Test</button>
        ) : price > 0 ? (
          <button onClick={handleStartTest} className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"><ShoppingCart className="w-5 h-5" /> Buy — ₹{price}</button>
        ) : (
          <button onClick={handleStartTest} className="w-full py-4 rounded-2xl bg-[#0B1437] text-white font-bold text-lg shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"><Crown className="w-5 h-5" /> Get Premium</button>
        )}
      </div>
    </div>
  );
}

// ==================== EXAM PAGE ====================

function ExamPage() {
  const { goBack, selectedTest, user, firebaseUser } = useAppStore();
  const setView = useAppStore(s => s.setView);
  const setLastTestResult = useAppStore(s => s.setLastTestResult);
  const [currentQ, setCurrentQ] = useState(0);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(2700);
  const [testTitle, setTestTitle] = useState("Test");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const examBackWarning = useAppStore(s => s.examBackWarning);
  const setExamBackWarning = useAppStore(s => s.setExamBackWarning);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  useEffect(() => {
    if (!selectedTest) { setLoading(false); return; }
    getMockTestById(selectedTest).then(test => {
      if (test) { setTestTitle(test.title); setTimeLeft((test.duration || 45) * 60); }
      getQuestions(selectedTest).then(qs => { setQuestions(qs || []); setLoading(false); }).catch(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, [selectedTest]);

  useEffect(() => {
    if (submitted || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => { if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; } return prev - 1; }), 1000);
    return () => clearInterval(timer);
  }, [submitted, timeLeft]);

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);
    let correct = 0, wrong = 0, skipped = 0;
    questions.forEach((q, i) => {
      if (!answers[i]) { skipped++; return; }
      if (answers[i] === q.correctAnswer) correct++; else wrong++;
    });
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const scoredMarks = questions.reduce((sum, q, i) => sum + (answers[i] === q.correctAnswer ? (q.marks || 1) : 0), 0);
    const accuracy = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const result: any = { userId: firebaseUser?.uid || "", userName: user?.name || "User", testId: selectedTest || "", testTitle, testCategory: "", totalQuestions: questions.length, correctAnswers: correct, wrongAnswers: wrong, skipped, totalMarks, scoredMarks, accuracy, timeUsedSeconds: 2700 - timeLeft, answers, createdAt: new Date().toISOString() };
    if (firebaseUser?.uid) { try { await saveTestResult(result as any); } catch (e) { console.error("Save result error:", e); } }
    setLastTestResult(result);
    setView("result");
  }, [submitted, answers, questions, selectedTest, testTitle, firebaseUser, user, timeLeft]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (questions.length === 0) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6"><p className="text-gray-500 mb-4">No questions found</p><button onClick={() => goBack()} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Go Back</button></div>;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const q = questions[currentQ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0B1437] px-4 py-3 flex items-center gap-3">
        <button onClick={() => setExamBackWarning(true)} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <div className="flex-1 min-w-0"><h1 className="text-white font-bold text-sm truncate">{testTitle}</h1></div>
        <div className={"flex items-center gap-1 px-3 py-1.5 rounded-xl " + (timeLeft < 300 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white")}>
          <Timer className="w-4 h-4" /><span className="font-bold text-sm tabular-nums">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Question */}
      <div className="p-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Q {currentQ + 1} of {questions.length}</span>
            <button onClick={() => { const newMarked = new Set(markedForReview); if (newMarked.has(currentQ)) newMarked.delete(currentQ); else newMarked.add(currentQ); setMarkedForReview(newMarked); }}
              className={"text-xs font-bold px-3 py-1 rounded-full " + (markedForReview.has(currentQ) ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400")}>
              <Bookmark className="w-3 h-3 inline mr-1" />{markedForReview.has(currentQ) ? "Marked" : "Mark"}
            </button>
          </div>
          <p className="text-[#0B1437] font-medium text-sm leading-relaxed mb-4">{q.question}</p>
          <div className="space-y-2">
            {q.options?.map((opt: string, i: number) => (
              <button key={i} onClick={() => setAnswers({ ...answers, [currentQ]: opt })}
                className={"w-full text-left p-3 rounded-xl border-2 transition-all " + (answers[currentQ] === opt ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-gray-300")}>
                <span className={"font-bold text-sm mr-2 " + (answers[currentQ] === opt ? "text-blue-600" : "text-gray-400")}>{String.fromCharCode(65 + i)}.</span>
                <span className="text-sm text-gray-700">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4 flex gap-2">
        <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm disabled:opacity-30">Previous</button>
        <button onClick={() => setShowQuestionNav(true)} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm"><Grid3X3 className="w-4 h-4" /></button>
        {currentQ < questions.length - 1 ? (
          <button onClick={() => setCurrentQ(currentQ + 1)} className="flex-1 py-3 rounded-xl bg-[#0B1437] text-white font-bold text-sm">Next</button>
        ) : (
          <button onClick={() => setShowSubmitConfirm(true)} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm">Submit</button>
        )}
      </div>

      {/* Submit Confirm */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowSubmitConfirm(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4"><div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-8 h-8 text-emerald-500" /></div>
            <h3 className="text-lg font-bold text-[#0B1437]">Submit Test?</h3>
            <p className="text-gray-500 text-sm mt-1">Answered: {Object.keys(answers).length}/{questions.length} • Skipped: {questions.length - Object.keys(answers).length}</p></div>
            <button onClick={() => { setShowSubmitConfirm(false); handleSubmit(); }} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm mb-2">Submit Now</button>
            <button onClick={() => setShowSubmitConfirm(false)} className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Question Palette */}
      {showQuestionNav && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setShowQuestionNav(false)}>
          <div className="bg-white rounded-t-3xl p-4 w-full max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-[#0B1437]">Question Palette</h3><button onClick={() => setShowQuestionNav(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="grid grid-cols-6 gap-2">
              {questions.map((_, i) => (
                <button key={i} onClick={() => { setCurrentQ(i); setShowQuestionNav(false); }}
                  className={"aspect-square rounded-xl font-bold text-sm " + (answers[i] ? "bg-emerald-500 text-white" : markedForReview.has(i) ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500")}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Exam Back Warning */}
      {examBackWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={() => setExamBackWarning(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4"><div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
            <h3 className="text-xl font-black text-[#0B1437]">Leave Test?</h3><p className="text-gray-500 text-sm mt-1">Your progress will be lost!</p></div>
            <div className="flex gap-3">
              <button onClick={() => setExamBackWarning(false)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm">Continue Test</button>
              <button onClick={() => { setExamBackWarning(false); goBack(); }} className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm">Yes, Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== RESULT PAGE ====================

function ResultPage() {
  const goBack = useAppStore(s => s.goBack);
  const setView = useAppStore(s => s.setView);
  const lastTestResult = useAppStore(s => s.lastTestResult);

  if (!lastTestResult) { return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6"><p className="text-gray-500 mb-4">No result found</p><button onClick={() => setView("home")} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Go Home</button></div>; }

  const r = lastTestResult;
  const percentage = r.totalMarks > 0 ? Math.round((r.scoredMarks / r.totalMarks) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-6">
      <div className="bg-gradient-to-br from-[#0B1437] to-[#1E2A5E] px-4 pt-8 pb-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="w-20 h-20 rounded-full bg-amber-400 flex items-center justify-center mx-auto mb-4">
          <TrophyIcon className="w-10 h-10 text-[#0B1437]" />
        </motion.div>
        <h1 className="text-white font-bold text-xl">{percentage >= 80 ? "Excellent! 🎉" : percentage >= 60 ? "Good Job! 👏" : "Keep Practicing! 💪"}</h1>
        <p className="text-white/60 text-xs mt-1">{r.testTitle}</p>
      </div>
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg mb-4">
          <div className="text-center mb-4"><p className="text-xs text-gray-400 uppercase">Your Score</p><p className="text-4xl font-black text-[#0B1437]">{r.scoredMarks}<span className="text-lg text-gray-400">/{r.totalMarks}</span></p></div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-emerald-50 rounded-xl p-3"><CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" /><p className="text-lg font-bold text-emerald-600">{r.correctAnswers}</p><p className="text-[10px] text-gray-400">Correct</p></div>
            <div className="bg-red-50 rounded-xl p-3"><X className="w-5 h-5 text-red-500 mx-auto mb-1" /><p className="text-lg font-bold text-red-600">{r.wrongAnswers}</p><p className="text-[10px] text-gray-400">Wrong</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><SkipForward className="w-5 h-5 text-gray-400 mx-auto mb-1" /><p className="text-lg font-bold text-gray-500">{r.skipped}</p><p className="text-[10px] text-gray-400">Skipped</p></div>
          </div>
          <div className="mt-4 flex items-center justify-between"><span className="text-xs text-gray-400">Accuracy</span><span className="font-bold text-[#0B1437]">{r.accuracy}%</span></div>
          <div className="mt-1 flex items-center justify-between"><span className="text-xs text-gray-400">Time</span><span className="font-bold text-[#0B1437]">{Math.floor(r.timeUsedSeconds / 60)}m {r.timeUsedSeconds % 60}s</span></div>
        </div>
      </div>
      <div className="px-4 space-y-2">
        <button onClick={() => setView("home")} className="w-full py-3.5 rounded-xl bg-[#0B1437] text-white font-bold text-sm flex items-center justify-center gap-2"><Home className="w-4 h-4" /> Go Home</button>
        <button onClick={() => setView("mocktests")} className="w-full py-3.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm">More Tests</button>
      </div>
    </div>
  );
}

// ==================== LEADERBOARD TAB ====================

function LeaderboardTab() {
  const firebaseUser = useAppStore(s => s.firebaseUser);
  const [leaders, setLeaders] = useState<LeaderboardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then(data => { setLeaders(data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-8 h-8 animate-spin text-[#0B1437]" /></div>;

  return (
    <div className="pb-6 bg-[#F8FAFC] min-h-screen">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-5">
        <h2 className="text-white font-bold text-lg">Leaderboard 🏆</h2>
        <p className="text-white/50 text-xs">Top rankers this week</p>
      </div>
      <div className="px-4 pt-4">
        {leaders.length === 0 ? <div className="text-center py-16"><p className="text-gray-400 text-sm">No leaderboard data yet</p></div> :
         <div className="space-y-2">
           {leaders.map((entry, idx) => (
             <div key={entry.id || idx} className={"bg-white rounded-2xl p-3 border shadow-sm flex items-center gap-3 " + (idx < 3 ? "border-amber-200" : "border-gray-100")}>
               <div className={"w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm " + (idx === 0 ? "bg-amber-400 text-white" : idx === 1 ? "bg-gray-300 text-white" : idx === 2 ? "bg-orange-400 text-white" : "bg-gray-100 text-gray-500")}>{idx + 1}</div>
               <div className="flex-1 min-w-0"><h4 className="font-bold text-[#0B1437] text-sm truncate">{entry.name}</h4><p className="text-[10px] text-gray-400">{entry.score || 0} points</p></div>
               {entry.userId === firebaseUser?.uid && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">You</span>}
             </div>
           ))}
         </div>}
      </div>
    </div>
  );
}

// ==================== PROFILE TAB ====================

function ProfileTab() {
  const { user, userProfile, setUserProfile, firebaseUser, setView, setUser, setFirebaseUser } = useAppStore();
  const subscription = useAppStore(s => s.subscription);
  const [testHistory, setTestHistory] = useState<TestResultData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    setLoadingHistory(true);
    getUserTestResults(firebaseUser.uid).then(results => { setTestHistory(results as any[] || []); setLoadingHistory(false); }).catch(() => setLoadingHistory(false));
  }, [firebaseUser?.uid]);

  const totalTests = testHistory.length;
  const avgScore = totalTests > 0 ? Math.round(testHistory.reduce((sum, r) => sum + (r.scoredMarks || 0), 0) / totalTests) : 0;
  const avgAccuracy = totalTests > 0 ? Math.round(testHistory.reduce((sum, r) => sum + (r.accuracy || 0), 0) / totalTests) : 0;

  const isGuest = !user || user.role === "guest";

  const handleLogout = async () => {
    try { await authLogout(); } catch (e) {}
    setUser(null);
    setFirebaseUser(null);
    setView("home");
  };

  return (
    <div className="pb-6 bg-[#F8FAFC] min-h-screen">
      <div className="bg-gradient-to-br from-[#0B1437] via-[#1E2A5E] to-[#0B1437] px-4 pt-6 pb-8">
        <div className="flex flex-col items-center">
          {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-20 h-20 rounded-full border-4 border-amber-400/30 object-cover mb-3" /> :
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3"><User className="w-10 h-10 text-white" /></div>}
          <h2 className="text-white font-bold text-lg">{user?.name || "Guest User"}</h2>
          <p className="text-white/50 text-xs">{user?.email || "Not logged in"}</p>
          {(subscription.isPremium || subscription.purchasedItemIds?.length > 0) && (
            <span className="mt-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold border border-amber-400/30 flex items-center gap-1"><Crown className="w-3 h-3" /> PRO Member</span>
          )}
        </div>
      </div>
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center"><p className="text-2xl font-black text-[#0B1437]">{totalTests}</p><p className="text-[10px] text-gray-400">Tests</p></div>
          <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center"><p className="text-2xl font-black text-[#0B1437]">{avgAccuracy}%</p><p className="text-[10px] text-gray-400">Accuracy</p></div>
          <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center"><p className="text-2xl font-black text-[#0B1437]">{avgScore}</p><p className="text-[10px] text-gray-400">Avg Score</p></div>
        </div>
      </div>

      {/* Auth Section — login/register for guests, logout for logged-in users */}
      <div className="px-4 mt-4">
        {isGuest ? (
          <button onClick={() => setView("login")} className="w-full p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl text-white text-left shadow-lg active:scale-[0.98] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><User className="w-5 h-5 text-white" /></div>
            <div className="flex-1">
              <p className="font-bold text-sm">Login / Register</p>
              <p className="text-xs text-white/80">Unlock tests, save progress & sync across devices</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80" />
          </button>
        ) : (
          <button onClick={handleLogout} className="w-full p-4 bg-white rounded-2xl text-left shadow-sm active:scale-[0.98] flex items-center gap-3 border border-red-100">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><LogOut className="w-5 h-5 text-red-500" /></div>
            <div className="flex-1">
              <p className="font-bold text-sm text-red-600">Logout</p>
              <p className="text-xs text-gray-500">Sign out of your account</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        )}
      </div>

      {/* Performance Analytics Button */}
      <div className="px-4 mt-4">
        <button onClick={() => setView("performance")} className="w-full p-4 bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] rounded-2xl text-white text-left shadow-lg active:scale-[0.98] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-amber-400" /></div>
          <div className="flex-1"><p className="font-bold text-sm">Performance Analytics</p><p className="text-xs text-white/60">View detailed stats</p></div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>
      </div>
      {/* Test History */}
      {totalTests > 0 && (
        <div className="px-4 mt-6">
          <h3 className="font-bold text-[#0B1437] text-sm mb-3">Recent Tests</h3>
          <div className="space-y-2">
            {testHistory.slice(0, 5).map((r, i) => (
              <div key={r.id || i} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#0B1437] truncate">{r.testTitle}</p><p className="text-[10px] text-gray-400">{r.testCategory} • {r.accuracy}%</p></div>
                <span className="font-bold text-[#0B1437] text-sm">{r.scoredMarks}/{r.totalMarks}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== BOTTOM NAV ====================

function BottomNav() {
  const { currentView, setView, navigationItems } = useAppStore();
  const requireAuth = useRequireAuth();
  const tabs = navigationItems.filter(i => i.location === "bottomnav").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const fallback = tabs.length === 0 ? DEFAULT_BOTTOM_NAV : tabs;
  const items = fallback.slice(0, 4);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around py-1.5 px-2 max-w-lg mx-auto">
          {items.map((item, idx) => {
            const IconComp = ICON_MAP[item.icon] || Home;
            const isActive = currentView === item.targetView;
            return (
              <button key={item.id || idx} onClick={() => { if (item.requireAuth) requireAuth(() => setView(item.targetView as any)); else setView(item.targetView as any); }}
                className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all active:scale-90">
                <div className={"p-1 rounded-lg " + (isActive ? "bg-[#0B1437]" : "")}>
                  <IconComp className={"w-5 h-5 " + (isActive ? "text-amber-400" : "text-gray-400")} />
                </div>
                <span className={"text-[10px] font-bold " + (isActive ? "text-[#0B1437]" : "text-gray-400")}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== EXIT CONFIRM ====================

function ExitConfirmDialog() {
  const { exitConfirmVisible, setExitConfirmVisible } = useAppStore();
  if (!exitConfirmVisible) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl p-6 mx-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
          <h3 className="text-lg font-bold text-[#0B1437]">Exit ExamVault?</h3>
          <p className="text-gray-500 text-sm mt-1">Are you sure you want to close the app?</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setExitConfirmVisible(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-[#0B1437] font-semibold text-sm">Cancel</button>
          <button onClick={() => { setExitConfirmVisible(false); if (typeof window !== "undefined" && (window as any).AndroidBridge?.exitApp) (window as any).AndroidBridge.exitApp(); else { try { window.close(); } catch {} window.history.back(); } }}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm">Exit</button>
        </div>
      </div>
    </div>
  );
}

// ==================== SUPPORT TAB ====================

function SupportTab() {
  const goBack = useAppStore(s => s.goBack);
  const [appSettings, setAppSettings] = useState<any>(null);
  useEffect(() => { getAppSettings().then(s => setAppSettings(s)).catch(() => {}); }, []);
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-6">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-5">
        <div className="flex items-center gap-3"><button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button><h1 className="text-white font-bold text-lg">Support</h1></div>
      </div>
      <div className="px-4 pt-4 space-y-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-[#0B1437] text-sm mb-3">Contact Us</h3>
          <div className="space-y-2 text-sm text-gray-600">
            {appSettings?.contactEmail && <p>📧 {appSettings.contactEmail}</p>}
            {appSettings?.contactPhone && <p>📱 {appSettings.contactPhone}</p>}
            {appSettings?.whatsappNumber && <p>💬 WhatsApp: {appSettings.whatsappNumber}</p>}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-[#0B1437] text-sm mb-3">Follow Us</h3>
          <div className="flex gap-3">
            {appSettings?.instagramUrl && <a href={appSettings.instagramUrl} target="_blank" className="px-3 py-2 rounded-xl bg-pink-50 text-pink-600 text-xs font-bold">Instagram</a>}
            {appSettings?.youtubeUrl && <a href={appSettings.youtubeUrl} target="_blank" className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold">YouTube</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== PERFORMANCE SCREEN ====================

function PerformanceAnalyticsScreen() {
  const goBack = useAppStore(s => s.goBack);
  const setView = useAppStore(s => s.setView);
  const firebaseUser = useAppStore(s => s.firebaseUser);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser?.uid) { setLoading(false); return; }
    getUserTestResults(firebaseUser.uid).then(data => { setResults(data as any[] || []); setLoading(false); }).catch(() => setLoading(false));
  }, [firebaseUser?.uid]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  const totalTests = results.length;
  const avgAccuracy = totalTests > 0 ? Math.round(results.reduce((sum, r) => sum + (r.accuracy || 0), 0) / totalTests) : 0;
  const bestScore = totalTests > 0 ? Math.max(...results.map(r => r.scoredMarks || 0)) : 0;
  const totalCorrect = results.reduce((sum, r) => sum + (r.correctAnswers || 0), 0);
  const totalWrong = results.reduce((sum, r) => sum + (r.wrongAnswers || 0), 0);
  const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] p-5 pt-6">
        <div className="flex items-center gap-3"><button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <div><h1 className="text-white font-bold text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-400" /> Performance</h1></div></div>
      </div>
      {totalTests === 0 ? <div className="p-6 text-center"><p className="text-gray-500 text-sm mb-4">Take your first test to see analytics</p><button onClick={() => setView("mocktests")} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm">Browse Tests</button></div> :
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="flex items-center gap-2 mb-1"><TrophyIcon className="w-4 h-4 text-amber-500" /><p className="text-xs text-gray-500">Total Tests</p></div><p className="text-2xl font-black text-[#0B1437]">{totalTests}</p></div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-emerald-500" /><p className="text-xs text-gray-500">Avg Accuracy</p></div><p className="text-2xl font-black text-[#0B1437]">{avgAccuracy}%</p></div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-[#0B1437] text-sm mb-3">Answer Distribution</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-xs text-gray-600 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> Correct</span><span className="text-xs font-bold text-[#0B1437]">{totalCorrect}</span></div>
            <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${totalCorrect / (totalCorrect + totalWrong + totalSkipped) * 100}%` }} /></div>
            <div className="flex items-center justify-between"><span className="text-xs text-gray-600 flex items-center gap-1"><X className="w-3 h-3 text-red-500" /> Wrong</span><span className="text-xs font-bold text-[#0B1437]">{totalWrong}</span></div>
            <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: `${totalWrong / (totalCorrect + totalWrong + totalSkipped) * 100}%` }} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-[#0B1437] text-sm mb-3">Recent Tests</h3>
          <div className="space-y-2">{results.slice(0, 5).map((r, i) => (
            <div key={r.id || i} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#0B1437] truncate">{r.testTitle}</p><p className="text-[10px] text-gray-500">{r.accuracy}% accuracy</p></div>
              <span className="text-sm font-bold text-[#0B1437]">{r.scoredMarks}/{r.totalMarks}</span>
            </div>
          ))}</div>
        </div>
      </div>}
    </div>
  );
}

// ==================== MY PURCHASES SCREEN ====================

function MyPurchasesScreen() {
  const goBack = useAppStore(s => s.goBack);
  const subscription = useAppStore(s => s.subscription);
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-6">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] p-5 pt-6">
        <div className="flex items-center gap-3"><button onClick={() => goBack()} className="p-2 rounded-xl bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <h1 className="text-white font-bold text-lg flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" /> My Premium</h1></div>
      </div>
      <div className="p-4">
        {subscription.isPremium ? (
          <div className="bg-gradient-to-r from-amber-400/10 to-orange-500/10 rounded-2xl p-4 border border-amber-200 mb-4">
            <div className="flex items-center gap-3 mb-2"><div className="w-12 h-12 rounded-2xl bg-amber-400/20 flex items-center justify-center"><Crown className="w-6 h-6 text-amber-500" /></div>
            <div><h3 className="font-bold text-[#0B1437]">Premium Active</h3><p className="text-xs text-gray-500">{subscription.planName || "Premium Plan"}{subscription.premiumExpiry && ` • Expires: ${new Date(subscription.premiumExpiry).toLocaleDateString()}`}</p></div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2"><p className="text-xs text-emerald-700 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Full access to ALL content</p></div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-2xl p-4 border border-gray-200 mb-4"><p className="text-sm text-gray-600 mb-3">No active subscription</p>
          <button onClick={() => useAppStore.getState().setView("pricing")} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm">View Plans</button></div>
        )}
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================

export default function ExamVaultApp() {
  const {
    currentView, authLoading, user, firebaseUser,
    setView, setUser, setFirebaseUser, setAuthLoading,
    setSubscription,
  } = useAppStore();
  const subscription = useAppStore(s => s.subscription);
  const _isAndroidWebView = typeof window !== "undefined" && /wv/.test(navigator.userAgent);

  // Expose store for Android back button
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__ZUSTAND_STORE__ = useAppStore;
      (window as any).__EV_PREMIUM = subscription.isPremium || (subscription.purchasedItemIds?.length > 0);
    }
  }, [subscription.isPremium, subscription.purchasedItemIds]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange((fbUser) => {
      const store = useAppStore.getState();
      store.setFirebaseUser(fbUser);
      store.setAuthLoading(false);
      if (fbUser) {
        store.setUser({ name: fbUser.displayName || "User", email: fbUser.email || "", role: "user", uid: fbUser.uid, phone: fbUser.phoneNumber || "" });
        checkSubscriptionStatus(fbUser.uid).then(status => {
          store.setSubscription({ isPremium: status.isPremium || false, premiumExpiry: status.premiumExpiry || null, planName: status.planName || null, purchasedItemIds: status.purchasedItems?.map((p: any) => p.itemId) || [] });
        }).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  // Load app settings
  useEffect(() => {
    getAppSettings().then(s => { if (s) useAppStore.getState().setAppSettings(s); }).catch(() => {});
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1437]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">📚</span>
          </div>
          <h1 className="text-white font-black text-2xl tracking-tight">EXAM<span className="text-amber-400">VAULT</span></h1>
          <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  if (!user || user.role === "guest") {
    if (currentView !== "home" && currentView !== "login") {
      // Allow browsing for guests
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      <SideMenu />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="pb-16"
        >
          {currentView === "login" && <LoginScreen />}
          {currentView === "home" && <HomeTab />}
          {currentView === "subcategory-list" && <SubcategoryListScreen />}
          {currentView === "premium-plans" && <PremiumPlansScreen />}
          {currentView === "category-detail" && <CategoryDetailScreen />}
          {currentView === "mocktests" && <MockTestsTab />}
          {currentView === "test-info" && <TestInfoScreen />}
          {currentView === "exam" && <ExamPage />}
          {currentView === "result" && <ResultPage />}
          {currentView === "leaderboard" && <LeaderboardTab />}
          {currentView === "profile" && <ProfileTab />}
          {currentView === "settings" && <SettingsTab />}
          {currentView === "support" && <SupportTab />}
          {currentView === "performance" && <PerformanceAnalyticsScreen />}
          {currentView === "my-purchases" && <MyPurchasesScreen />}
          {currentView === "pricing" && <PremiumPlansScreen />}
        </motion.div>
      </AnimatePresence>

      <BottomNav />
      <GuestLockModal />
      <PaymentModal />
      <ExitConfirmDialog />
    </div>
  );
}
