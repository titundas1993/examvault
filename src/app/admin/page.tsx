"use client";
// Admin Panel v1.0.32

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, BookOpen, Trophy, FileText, Notebook, Settings,
  ChevronRight, Bell, Clock, Star, Zap, Award, Target, TrendingUp,
  Users, BarChart3, Megaphone, Layout,
  CalendarDays, Shield, Smartphone,
  Brain, Flame, Sparkles,
  Menu, X, LogOut,
  Plus, Edit, Trash2, Eye, Globe,
  Moon, Sun, Lock, Monitor,
  LayoutDashboard, FileQuestion, Image, BellRing, Sliders,
  BookMarked, Headphones, UserCog,
  Activity, PieChart, RefreshCw, ExternalLink, CheckCircle,
  Mail, Search, Loader2, Upload, FileUp, Download, Tag, Link as LinkIcon, Phone,
  Crown, CreditCard, IndianRupee, Compass, Database,
  Grid3X3, ArrowLeft, ShoppingCart, ChevronUp, ChevronDown, ChevronLeft, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import QuestionPickerDialog from "@/components/admin/QuestionPickerDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  getExams, addExam, updateExam, deleteExam, ExamData,
  getTips, getAllTips, addTip, updateTip, deleteTip, TipData,
  getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement, AnnouncementData,
  getNotifications, addNotification, NotificationData,
  getMockTests, addMockTest, updateMockTest, deleteMockTest, MockTestData,
  getPreviousPapers, addPreviousPaper, updatePreviousPaper, deletePreviousPaper,
  getNotes, addNote, updateNote, deleteNote,
  getBanners, addBanner, updateBanner, deleteBanner,
  getTestSeries, addTestSeries, updateTestSeries, deleteTestSeries,
  getFreeTests, addFreeTest, updateFreeTest, deleteFreeTest,
  getDailyQuiz, addDailyQuiz, updateDailyQuiz, deleteDailyQuiz,
  getPopularTests, addPopularTest, updatePopularTest, deletePopularTest,
  getAllPlans, PlanData,
  getAllPayments, getAllSubscriptions, PaymentData, SubscriptionData,
} from "@/lib/services/firestore";
import {
  adminAddDoc, adminUpdateDoc, adminDeleteDoc, adminClearCollection,
  adminClearAll, adminUpdateAppSettings, adminGetAppSettings, adminGetCollection,
  adminImportCollection, adminLogin, adminLogout, hasAdminToken, adminSyncUsers, adminSeedDatabase,
} from "@/lib/services/admin-api";

// ==================== ADMIN VIEWS ====================
type AdminView =
  | "dashboard" | "mock-tests" | "questions" | "test-series"
  | "banners" | "announcements" | "upcoming-exams" | "daily-tips"
  | "notifications" | "previous-papers" | "notes" | "free-tests"
  | "daily-quiz" | "popular-tests" | "support" | "users" | "settings"
  | "bulk-import" | "categories" | "plans" | "payments" | "navigation";

// Dynamic categories — loaded from Firestore, with defaults as fallback
// These are mutable so all admin components see updated categories
let EXAM_CATEGORIES = [
  { label: "WBCS", value: "WBCS" }, { label: "SSC", value: "SSC" }, { label: "Railway", value: "Railway" },
  { label: "Banking", value: "Banking" }, { label: "UPSC", value: "UPSC" }, { label: "JEXPO", value: "JEXPO" },
  { label: "VOCLET", value: "VOCLET" }, { label: "PSC", value: "PSC" }, { label: "Others", value: "Others" },
];

let SUBJECT_CATEGORIES = [
  { label: "History", value: "History" }, { label: "Geography", value: "Geography" }, { label: "Math", value: "Math" },
  { label: "English", value: "English" }, { label: "Science", value: "Science" }, { label: "Polity", value: "Polity" },
  { label: "Economy", value: "Economy" }, { label: "Reasoning", value: "Reasoning" }, { label: "GK", value: "GK" },
  { label: "Computer", value: "Computer" }, { label: "Others", value: "Others" },
];

// Default categories as fallback
const DEFAULT_EXAM_CATEGORIES = [
  { label: "WBCS", value: "WBCS" }, { label: "SSC", value: "SSC" }, { label: "Railway", value: "Railway" },
  { label: "Banking", value: "Banking" }, { label: "UPSC", value: "UPSC" }, { label: "JEXPO", value: "JEXPO" },
  { label: "VOCLET", value: "VOCLET" }, { label: "PSC", value: "PSC" }, { label: "Others", value: "Others" },
];

const DEFAULT_SUBJECT_CATEGORIES = [
  { label: "History", value: "History" }, { label: "Geography", value: "Geography" }, { label: "Math", value: "Math" },
  { label: "English", value: "English" }, { label: "Science", value: "Science" }, { label: "Polity", value: "Polity" },
  { label: "Economy", value: "Economy" }, { label: "Reasoning", value: "Reasoning" }, { label: "GK", value: "GK" },
  { label: "Computer", value: "Computer" }, { label: "Others", value: "Others" },
];

async function loadCategoriesIntoGlobals() {
  try {
    const data = await adminGetCollection("categories");
    if (Array.isArray(data) && data.length > 0) {
      const exams = data.filter((c: any) => c.type === "exam");
      const subjects = data.filter((c: any) => c.type === "subject");
      // Use Firestore categories if available, otherwise keep defaults
      EXAM_CATEGORIES = exams.length > 0
        ? exams.map((c: any) => ({ label: c.name, value: c.name }))
        : [...DEFAULT_EXAM_CATEGORIES];
      SUBJECT_CATEGORIES = subjects.length > 0
        ? subjects.map((c: any) => ({ label: c.name, value: c.name }))
        : [...DEFAULT_SUBJECT_CATEGORIES];
    } else {
      // No categories in Firestore — reset to defaults
      EXAM_CATEGORIES = [...DEFAULT_EXAM_CATEGORIES];
      SUBJECT_CATEGORIES = [...DEFAULT_SUBJECT_CATEGORIES];
    }
  } catch (e) {
    console.error(e);
    // On error, fall back to defaults
    EXAM_CATEGORIES = [...DEFAULT_EXAM_CATEGORIES];
    SUBJECT_CATEGORIES = [...DEFAULT_SUBJECT_CATEGORIES];
  }
}

const ADMIN_SIDEBAR_ITEMS: { icon: React.ComponentType<{ className?: string }>; label: string; view: AdminView; color: string }[] = [
  { icon: LayoutDashboard, label: "Dashboard", view: "dashboard", color: "from-ev-navy to-blue-800" },
  { icon: BookOpen, label: "Mock Tests", view: "mock-tests", color: "from-ev-orange to-orange-600" },
  { icon: FileQuestion, label: "Questions", view: "questions", color: "from-blue-500 to-indigo-600" },
  { icon: Trophy, label: "Test Series", view: "test-series", color: "from-ev-gold to-amber-500" },
  { icon: Zap, label: "Free Tests", view: "free-tests", color: "from-green-500 to-emerald-600" },
  { icon: Brain, label: "Daily Quiz", view: "daily-quiz", color: "from-purple-500 to-purple-600" },
  { icon: Star, label: "Popular Tests", view: "popular-tests", color: "from-amber-500 to-yellow-600" },
  { icon: Image, label: "Banners", view: "banners", color: "from-ev-orange to-red-500" },
  { icon: Megaphone, label: "Announcements", view: "announcements", color: "from-pink-500 to-rose-600" },
  { icon: CalendarDays, label: "Upcoming Exams", view: "upcoming-exams", color: "from-cyan-500 to-blue-600" },
  { icon: Sparkles, label: "Daily Tips", view: "daily-tips", color: "from-amber-500 to-orange-500" },
  { icon: BellRing, label: "Notifications", view: "notifications", color: "from-indigo-500 to-purple-600" },
  { icon: FileText, label: "Previous Papers", view: "previous-papers", color: "from-ev-orange to-amber-500" },
  { icon: Notebook, label: "Notes", view: "notes", color: "from-teal-500 to-teal-600" },
  { icon: Users, label: "Users", view: "users", color: "from-ev-navy to-blue-800" },
  { icon: Headphones, label: "Support", view: "support", color: "from-ev-green to-teal-600" },
  { icon: Sliders, label: "App Settings", view: "settings", color: "from-gray-600 to-gray-800" },
  { icon: Tag, label: "Categories", view: "categories", color: "from-violet-500 to-purple-700" },
  { icon: Crown, label: "Plans & Pricing", view: "plans", color: "from-ev-gold to-amber-500" },
  { icon: CreditCard, label: "Payments", view: "payments", color: "from-green-500 to-emerald-600" },
  { icon: Trash2, label: "Data Mgmt", view: "bulk-import", color: "from-red-500 to-rose-600" },
  { icon: Compass, label: "Navigation", view: "navigation", color: "from-cyan-600 to-blue-700" },
];

// ==================== UPLOAD HELPER ====================
async function uploadImage(file: File, folder: string): Promise<string | null> {
  try {
    const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}

async function uploadFile(file: File, folder: string): Promise<string | null> {
  try {
    const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error("File upload error:", error);
    return null;
  }
}

// ==================== MAIN ADMIN PAGE ====================
export default function AdminPage() {
  const [currentView, setCurrentView] = useState<AdminView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Session persistence: check for existing token on mount
  // Auto re-login is handled by admin-api.ts when 401 is received
  useEffect(() => {
    if (hasAdminToken()) {
      setIsLoggedIn(true);
    }
    setInitializing(false);
  }, []);

  const handleLogin = useCallback(async () => {
    if (!email || !password) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const result = await adminLogin(email, password);
      if (result.success) {
        setIsLoggedIn(true);
      } else {
        setLoginError(result.error || "Invalid credentials");
      }
    } catch (err: any) {
      setLoginError("Connection error — please try again");
    } finally {
      setLoginLoading(false);
    }
  }, [email, password]);

  const handleLogout = useCallback(async () => {
    await adminLogout();
    setIsLoggedIn(false);
    setEmail("");
    setPassword("");
    setCurrentView("dashboard");
  }, []);

  // Load dynamic categories from Firestore on mount
  useEffect(() => {
    if (isLoggedIn) loadCategoriesIntoGlobals();
  }, [isLoggedIn]);

  // Support browser back button by pushing state and listening to popstate
  const navigateTo = useCallback((view: AdminView) => {
    setCurrentView(view);
    window.history.pushState({ view }, "", `/admin#${view}`);
  }, []);

  useEffect(() => {
    // Read initial view from URL hash
    const hash = window.location.hash.replace("#", "") as AdminView;
    const validViews: AdminView[] = ["dashboard", "mock-tests", "questions", "test-series", "banners", "announcements", "upcoming-exams", "daily-tips", "notifications", "previous-papers", "notes", "free-tests", "daily-quiz", "popular-tests", "support", "users", "settings", "bulk-import", "categories", "plans", "payments", "navigation"];
    if (hash && validViews.includes(hash)) {
      setCurrentView(hash);
    } else {
      window.history.replaceState({ view: "dashboard" }, "", "/admin#dashboard");
    }

    const handlePopState = (e: PopStateEvent) => {
      const view = e.state?.view as AdminView;
      if (view) {
        setCurrentView(view);
      } else {
        setCurrentView("dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-ev-dark to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-ev-dark to-gray-900 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-ev-navy flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8 text-ev-orange" />
              </div>
              <h1 className="text-2xl font-black text-ev-navy">Admin Panel</h1>
              <p className="text-gray-500 text-sm">EXAMVAULT Administration</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-700 text-sm font-medium mb-1 block">Admin Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-ev-navy focus:ring-2 focus:ring-ev-navy/10" placeholder="admin@examvault.com" />
              </div>
              <div>
                <label className="text-gray-700 text-sm font-medium mb-1 block">Password</label>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-ev-navy focus:ring-2 focus:ring-ev-navy/10" placeholder="Enter password" onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} />
              </div>
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 text-center font-medium">
                  {loginError}
                </div>
              )}
              <button onClick={handleLogin} disabled={loginLoading || !email || !password} className="w-full py-3.5 rounded-xl bg-ev-navy text-white font-bold text-lg hover:bg-ev-dark transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loginLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : "Login to Admin Panel"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-64" : "w-16"} bg-ev-navy min-h-screen transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center flex-shrink-0">
            <span className="text-xl">📚</span>
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-white font-black text-sm">EXAM<span className="text-ev-orange">VAULT</span></h1>
              <p className="text-white/50 text-xs">Admin Panel</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-white/50 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <nav className="py-2 flex-1 overflow-y-auto">
          {ADMIN_SIDEBAR_ITEMS.map(item => (
            <button
              key={item.view}
              onClick={() => navigateTo(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${currentView === item.view ? "bg-white/10 text-ev-orange border-r-3 border-ev-orange" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              title={item.label}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-2 py-2 text-red-400 hover:text-red-300 text-sm font-medium">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-screen bg-gray-50">
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-lg font-bold text-ev-navy">{ADMIN_SIDEBAR_ITEMS.find(i => i.view === currentView)?.label || "Admin"}</h2>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl hover:bg-gray-100 relative">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center text-white font-bold text-sm">A</div>
          </div>
        </div>
        <div className="p-6 max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div key={currentView} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {currentView === "dashboard" && <DashboardView navigateTo={navigateTo} />}
              {currentView === "mock-tests" && <MockTestsAdmin />}
              {currentView === "questions" && <QuestionsAdmin />}
              {currentView === "test-series" && <TestSeriesAdmin />}
              {currentView === "free-tests" && <FreeTestsAdmin />}
              {currentView === "daily-quiz" && <DailyQuizAdmin />}
              {currentView === "popular-tests" && <PopularTestsAdmin />}
              {currentView === "banners" && <BannersAdmin />}
              {currentView === "announcements" && <AnnouncementsAdmin />}
              {currentView === "upcoming-exams" && <UpcomingExamsAdmin />}
              {currentView === "daily-tips" && <DailyTipsAdmin />}
              {currentView === "notifications" && <NotificationsAdmin />}
              {currentView === "previous-papers" && <PreviousPapersAdmin />}
              {currentView === "notes" && <NotesAdmin />}
              {currentView === "users" && <UsersAdmin />}
              {currentView === "support" && <SupportAdmin />}
              {currentView === "settings" && <SettingsAdmin />}
              {currentView === "bulk-import" && <BulkImportAdmin />}
              {currentView === "categories" && <CategoriesAdmin />}
              {currentView === "plans" && <PlansAdmin />}
              {currentView === "payments" && <PaymentsAdmin />}
              {currentView === "navigation" && <NavigationAdmin />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ==================== DASHBOARD VIEW ====================
function DashboardView({ navigateTo }: { navigateTo: (view: AdminView) => void }) {
  const [stats, setStats] = useState({ users: 0, tests: 0, questions: 0, exams: 0, tips: 0, announcements: 0, papers: 0, notes: 0, banners: 0, series: 0, payments: 0, revenue: 0, activeSubs: 0 });
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const handleSeed = async () => {
    if (!confirm("This will add sample Indian competitive exam data to your app. Continue?")) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const data = await adminSeedDatabase();
      setSeedResult("✅ Data seeded! " + data.total + " items added. Refresh to see updated counts.");
      // Reload stats
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setSeedResult("❌ Failed: " + e.message);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersData, tests, exams, tips, announcements, papers, notes, banners, series, questionsData, paymentsData, subsData] = await Promise.all([
          adminGetCollection("users"),
          getMockTests(),
          getExams(),
          getTips(),
          getAnnouncements(),
          getPreviousPapers(),
          getNotes(),
          getBanners(),
          getTestSeries(),
          adminGetCollection("questions"),
          getAllPayments(),
          getAllSubscriptions(),
        ]);
        const payments = Array.isArray(paymentsData) ? paymentsData : [];
        const subs = Array.isArray(subsData) ? subsData : [];
        const totalRevenue = payments.filter((p: any) => p.status === "captured" || p.verified).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const activeSubs = subs.filter((s: any) => s.status === "active").length;
        setStats({
          users: Array.isArray(usersData) ? usersData.length : 0,
          tests: tests?.length || 0,
          questions: Array.isArray(questionsData) ? questionsData.length : 0,
          exams: exams?.length || 0,
          tips: tips?.length || 0,
          announcements: announcements?.length || 0,
          papers: papers?.length || 0,
          notes: notes?.length || 0,
          banners: banners?.length || 0,
          series: series?.length || 0,
          payments: payments.length,
          revenue: totalRevenue,
          activeSubs,
        });
      } catch (e) { console.error(e); }
    }
    loadStats();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "from-ev-navy to-blue-800" },
    { label: "Revenue", value: `₹${stats.revenue}`, icon: IndianRupee, color: "from-green-500 to-emerald-600" },
    { label: "Active Subs", value: stats.activeSubs, icon: Crown, color: "from-ev-gold to-amber-500" },
    { label: "Mock Tests", value: stats.tests, icon: BookOpen, color: "from-ev-orange to-orange-600" },
    { label: "Upcoming Exams", value: stats.exams, icon: CalendarDays, color: "from-cyan-500 to-blue-600" },
    { label: "Previous Papers", value: stats.papers, icon: FileText, color: "from-ev-orange to-amber-500" },
    { label: "Notes", value: stats.notes, icon: Notebook, color: "from-teal-500 to-teal-600" },
    { label: "Questions", value: stats.questions, icon: FileQuestion, color: "from-blue-500 to-indigo-600" },
    { label: "Daily Tips", value: stats.tips, icon: Sparkles, color: "from-amber-500 to-orange-500" },
    { label: "Announcements", value: stats.announcements, icon: Megaphone, color: "from-pink-500 to-rose-600" },
    { label: "Banners", value: stats.banners, icon: Image, color: "from-ev-orange to-red-500" },
    { label: "Test Series", value: stats.series, icon: Trophy, color: "from-ev-gold to-amber-500" },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {cards.map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white shadow-lg`}>
            <s.icon className="w-8 h-8 text-white/70 mb-3" />
            <p className="text-white/70 text-sm">{s.label}</p>
            <p className="text-2xl font-black">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-ev-navy mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: BookOpen, label: "Add Mock Test", color: "bg-ev-orange", view: "mock-tests" as AdminView },
            { icon: CalendarDays, label: "Add Exam", color: "bg-cyan-600", view: "upcoming-exams" as AdminView },
            { icon: Crown, label: "Manage Plans", color: "bg-ev-gold", view: "plans" as AdminView },
            { icon: Megaphone, label: "Send Notice", color: "bg-ev-green", view: "notifications" as AdminView },
          ].map((a, i) => (
            <button key={i} onClick={() => navigateTo(a.view)} className={`${a.color} rounded-xl p-4 text-white font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all`}>
              <a.icon className="w-5 h-5" /> {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seed Data Section */}
      <div className="mt-6 bg-gradient-to-r from-ev-navy to-blue-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Database className="w-5 h-5" /> Seed Sample Data
            </h3>
            <p className="text-white/60 text-sm mt-1">Populate your app with real Indian competitive exam data (WBCS, SSC, Railway, Banking, UPSC)</p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {seeding ? <><Loader2 className="w-4 h-4 animate-spin" /> Seeding...</> : <><Zap className="w-4 h-4" /> Seed Data</>}
          </button>
        </div>
        {seedResult && (
          <div className={"mt-4 p-3 rounded-lg text-sm font-medium " + (seedResult.startsWith("✅") ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200")}>
            {seedResult}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== GENERIC CRUD ADMIN ====================
interface CrudField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "switch" | "number" | "url" | "image" | "file" | "date";
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  dependsOn?: { field: string; value: string | string[] };
  allowOther?: boolean; // If true, shows custom text input when "Others" is selected
}

function CrudAdminPanel<T extends Record<string, any>>({
  title, subtitle, icon: Icon, color, collectionName,
  fields, fetchData, onAdd, onUpdate, onDelete, renderExtra, rowActions,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  collectionName: string;
  fields: CrudField[];
  fetchData: () => Promise<T[] | null>;
  onAdd: (data: any) => Promise<any>;
  onUpdate: (id: string, data: any) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  renderExtra?: (item: T, onEdit: (item: T) => void, onDelete: (id: string) => void) => React.ReactNode;
  rowActions?: (item: T) => React.ReactNode;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Bulk import state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>("");
  const [bulkEditValue, setBulkEditValue] = useState<any>("");
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // File upload state
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // "Others" custom input state — tracks custom text for fields with allowOther
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fields that can be imported via text (exclude image, file, switch)
  const importableFields = fields.filter(f => f.type !== "image" && f.type !== "file" && f.type !== "switch");
  // Default values for non-importable fields
  const defaultFieldValues: Record<string, any> = {};
  fields.forEach(f => {
    if (f.type === "switch") defaultFieldValues[f.key] = true;
    else if (f.type === "number") defaultFieldValues[f.key] = 0;
    else if (f.type === "image" || f.type === "file") defaultFieldValues[f.key] = "";
  });

  // Generate sample format text for download
  const generateSampleFormat = () => {
    const header = importableFields.map(f => f.label).join(" | ");
    const sampleValues = importableFields.map(f => {
      if (f.type === "select" && f.options?.length) return f.options[0].value;
      if (f.type === "number") return "0";
      if (f.type === "date") return "2025-01-01";
      if (f.type === "url") return "https://...";
      return `sample_${f.key}`;
    }).join(" | ");
    return `${header}\n${sampleValues}\n${sampleValues}`;
  };

  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDataRef.current();
      if (data) setItems(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openAddDialog = () => {
    setEditingItem(null);
    const initial: Record<string, any> = {};
    fields.forEach(f => {
      if (f.type === "switch") initial[f.key] = true;
      else if (f.type === "number") initial[f.key] = 0;
      else if (f.key === "targetUsers") initial[f.key] = "all";
      else if (f.key === "linkType") initial[f.key] = "internal";
      else if (f.key === "accessType") initial[f.key] = "free";
      else initial[f.key] = "";
    });
    setFormData(initial);
    setOtherValues({});
    setDialogOpen(true);
  };

  const openEditDialog = (item: T) => {
    setEditingItem(item);
    const initial: Record<string, any> = {};
    const detectedOthers: Record<string, string> = {};
    fields.forEach(f => {
      if (f.allowOther && f.type === "select" && f.options) {
        const val = item[f.key] ?? "";
        const isInOptions = f.options.some(o => o.value === val);
        if (val && !isInOptions) {
          // This is a custom value not in the dropdown — set to "Others" and store the custom text
          initial[f.key] = "Others";
          detectedOthers[f.key] = val;
        } else {
          initial[f.key] = val || (f.type === "switch" ? true : f.type === "number" ? 0 : "");
        }
      } else {
        // For accessType, fallback from isFree or price
        if (f.key === "accessType") {
          const existingAccess = item[f.key];
          if (existingAccess === "free" || existingAccess === "premium") {
            initial[f.key] = existingAccess;
          } else if (item.isFree) {
            initial[f.key] = "free";
          } else if (item.price && Number(item.price) > 0) {
            initial[f.key] = "premium";
          } else {
            initial[f.key] = "free";
          }
        } else {
          initial[f.key] = item[f.key] ?? (f.type === "switch" ? true : f.type === "number" ? 0 : "");
        }
      }
    });
    setFormData(initial);
    setOtherValues(detectedOthers);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Check allowOther fields where "Others" is selected but custom text is empty
    const missingOther = fields.filter(f => f.allowOther && formData[f.key] === "Others" && !otherValues[f.key]?.trim());
    if (missingOther.length > 0) {
      showToast(`Please fill in custom value for: ${missingOther.map(f => f.label).join(", ")}`, "error");
      return;
    }
    setSaving(true);
    try {
      // Replace "Others" with custom values for allowOther fields
      let saveData = { ...formData };
      fields.forEach(f => {
        if (f.allowOther && saveData[f.key] === "Others" && otherValues[f.key]?.trim()) {
          saveData[f.key] = otherValues[f.key].trim();
        }
      });
      if (editingItem) {
        const itemId = editingItem.id || editingItem.uid || "";
        const { id, uid, createdAt, updatedAt, ...cleanData } = saveData as any;
        await onUpdate(itemId, cleanData);
        showToast(`${title.slice(0, -1)} updated successfully!`, "success");
      } else {
        const { id, uid, createdAt, updatedAt, ...cleanData } = saveData as any;
        await onAdd(cleanData);
        showToast(`${title.slice(0, -1)} created successfully!`, "success");
      }
      setDialogOpen(false);
      setOtherValues({});
      loadItems();
    } catch (e) {
      console.error(e);
      showToast(`Error saving ${title.slice(0, -1).toLowerCase()}`, "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await onDelete(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
      loadItems();
      showToast(`${title.slice(0, -1)} deleted successfully!`, "success");
    } catch (e) {
      console.error(e);
      showToast(`Error deleting ${title.slice(0, -1).toLowerCase()}`, "error");
    }
    setSaving(false);
  };

  // Bulk import handler for generic CrudAdminPanel
  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setBulkImporting(true);
    try {
      const itemsList: any[] = [];
      let parseErrors = 0;
      const lines = bulkText.trim().split("\n").map(l => l.trim()).filter(l => l);

      // Skip header line if it looks like a header (contains field labels)
      let startIndex = 0;
      if (lines.length > 0 && importableFields.some(f => lines[0].toLowerCase().includes(f.label.toLowerCase()))) {
        startIndex = 1;
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Parse pipe-separated values
        const parts = line.split("|").map(p => p.trim());
        const item: any = { ...defaultFieldValues };

        importableFields.forEach((field, idx) => {
          if (idx < parts.length) {
            const val = parts[idx];
            if (field.type === "number") {
              item[field.key] = Number(val) || 0;
            } else if (field.type === "select") {
              // Try to match by value or label
              const match = field.options?.find(o => o.value === val || o.label.toLowerCase() === val.toLowerCase());
              item[field.key] = match ? match.value : val;
            } else {
              item[field.key] = val;
            }
          }
        });

        // Check if at least the first required field has a value
        const hasRequired = importableFields.filter(f => f.required).every(f => item[f.key]);
        if (hasRequired) {
          itemsList.push(item);
        } else {
          parseErrors++;
        }
      }

      if (itemsList.length === 0) {
        showToast("No valid items found. Check the format.", "error");
        setBulkImporting(false);
        return;
      }

      const result = await adminImportCollection(collectionName, itemsList);
      const imported = result?.imported || 0;
      let msg = `${imported} ${title.toLowerCase()} imported!`;
      if (parseErrors > 0) msg += ` (${parseErrors} skipped due to errors)`;
      showToast(msg, "success");
      setBulkDialogOpen(false);
      setBulkText("");
      loadItems();
    } catch (e: any) {
      showToast(`Import failed: ${e.message}`, "error");
    }
    setBulkImporting(false);
  };

  // Toggle selection for a single item
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select all on current filtered view
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id || item.uid || "").filter(Boolean)));
    }
  };

  // Bulk delete selected items
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      let deleted = 0;
      for (const id of selectedIds) {
        try { await onDelete(id); deleted++; } catch (e) { console.error(`Delete failed for ${id}:`, e); }
      }
      showToast(`${deleted} ${title.toLowerCase()} deleted!`, "success");
      setSelectedIds(new Set());
      setBulkDeleteDialogOpen(false);
      loadItems();
    } catch (e: any) {
      showToast(`Bulk delete failed: ${e.message}`, "error");
    }
    setBulkActionLoading(false);
  };

  // Bulk edit selected items — update a single field for all selected
  const handleBulkEdit = async () => {
    if (selectedIds.size === 0 || !bulkEditField) return;
    setBulkActionLoading(true);
    try {
      let updated = 0;
      for (const id of selectedIds) {
        try { await onUpdate(id, { [bulkEditField]: bulkEditValue }); updated++; } catch (e) { console.error(`Update failed for ${id}:`, e); }
      }
      showToast(`${updated} ${title.toLowerCase()} updated!`, "success");
      setSelectedIds(new Set());
      setBulkEditDialogOpen(false);
      setBulkEditField("");
      setBulkEditValue("");
      loadItems();
    } catch (e: any) {
      showToast(`Bulk edit failed: ${e.message}`, "error");
    }
    setBulkActionLoading(false);
  };

  const filteredItems = items.filter(item =>
    Object.values(item).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const displayFields = fields.filter(f => f.type !== "image" && f.type !== "switch" && f.type !== "file" && f.type !== "textarea" && f.key !== "accessType").slice(0, 4);

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}
          >
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-ev-navy">{title}</h2>
            <p className="text-gray-500 text-sm">{subtitle} • {items.length} items</p>
          </div>
        </div>
        <button onClick={openAddDialog} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-sm shadow-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add New
        </button>
        <button onClick={() => setBulkDialogOpen(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg flex items-center gap-2">
          <Upload className="w-4 h-4" /> Bulk Import
        </button>
      </div>

      {/* Search + Bulk Actions Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-ev-orange text-sm"
            placeholder="Search..."
          />
        </div>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
            <span className="text-sm font-bold text-ev-navy bg-blue-50 px-3 py-2 rounded-xl">{selectedIds.size} selected</span>
            <button onClick={() => setBulkEditDialogOpen(true)} className="px-3 py-2 rounded-xl bg-blue-500 text-white font-bold text-sm flex items-center gap-1.5 hover:bg-blue-600 transition-colors">
              <Edit className="w-3.5 h-3.5" /> Bulk Edit
            </button>
            <button onClick={() => setBulkDeleteDialogOpen(true)} className="px-3 py-2 rounded-xl bg-red-500 text-white font-bold text-sm flex items-center gap-1.5 hover:bg-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedIds.size})
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </motion.div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ev-orange" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-4 shadow-lg`}><Icon className="w-10 h-10 text-white" /></div>
          <h3 className="text-lg font-bold text-ev-navy mb-2">{title} Management</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">Add, edit, and manage {title.toLowerCase()} from this panel.</p>
          <button onClick={openAddDialog} className="px-6 py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg">
            <Plus className="w-4 h-4 inline mr-1" /> Add Your First {title.slice(0, -1)}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-ev-orange focus:ring-ev-orange cursor-pointer"
                  />
                </TableHead>
                {displayFields.map(f => <TableHead key={f.key} className="font-semibold text-ev-navy">{f.label}</TableHead>)}
                <TableHead className="font-semibold text-ev-navy">Status</TableHead>
                <TableHead className="font-semibold text-ev-navy">Free/Premium</TableHead>
                <TableHead className="font-semibold text-ev-navy text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map(item => {
                const itemId = item.id || item.uid || "";
                const isSelected = selectedIds.has(itemId);
                return (
                <TableRow key={itemId} className={isSelected ? "bg-blue-50/50" : ""}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(itemId)}
                      className="w-4 h-4 rounded border-gray-300 text-ev-orange focus:ring-ev-orange cursor-pointer"
                    />
                  </TableCell>
                  {displayFields.map(f => (
                    <TableCell key={f.key} className="max-w-[200px] truncate">
                      {f.type === "select" ? (
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600`}>
                          {String(item[f.key])}
                        </span>
                      ) : f.type === "number" ? (
                        String(item[f.key] ?? 0)
                      ) : (
                        String(item[f.key] || "-")
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${item.isActive !== false && item.status !== "closed" ? "bg-green-50 text-ev-green" : "bg-red-50 text-ev-red"}`}>
                      {item.isActive !== false && item.status !== "closed" ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const accessVal = item.accessType || (item.isFree ? "free" : item.price && item.price > 0 ? "premium" : null);
                      if (accessVal === "free") {
                        return <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700">🆓 Free</span>;
                      } else if (accessVal === "premium") {
                        return <span className="px-2 py-1 rounded-lg text-xs font-bold bg-ev-orange/10 text-ev-orange">👑 Premium</span>;
                      } else {
                        return <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-500">—</span>;
                      }
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {rowActions && rowActions(item)}
                      <button onClick={() => openEditDialog(item)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => { setDeletingId(item.id || item.uid); setDeleteDialogOpen(true); }} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}</DialogTitle>
            <DialogDescription>Fill in the details below.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {fields.map(field => {
              // Conditional field visibility
              if (field.dependsOn) {
                const currentVal = String(formData[field.dependsOn.field] || "");
                const allowed = Array.isArray(field.dependsOn.value) ? field.dependsOn.value : [field.dependsOn.value];
                if (!allowed.includes(currentVal)) return null;
              }
              return (
              <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <Label className="mb-1.5 block text-sm font-medium">{field.label}{field.required && <span className="text-red-500">*</span>}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={formData[field.key] || ""}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : field.type === "select" ? (
                  <>
                    <Select value={formData[field.key] || ""} onValueChange={v => {
                      setFormData({ ...formData, [field.key]: v });
                      if (v !== "Others") {
                        setOtherValues(prev => { const next = { ...prev }; delete next[field.key]; return next; });
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder={field.placeholder || "Select..."} /></SelectTrigger>
                      <SelectContent>
                        {field.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {field.allowOther && formData[field.key] === "Others" && (
                      <Input
                        className="mt-2"
                        value={otherValues[field.key] || ""}
                        onChange={e => setOtherValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={`Type custom ${field.label.toLowerCase()} name...`}
                      />
                    )}
                  </>
                ) : field.type === "switch" ? (
                  <div className="flex items-center gap-3">
                    <Switch checked={formData[field.key] ?? true} onCheckedChange={v => setFormData({ ...formData, [field.key]: v })} />
                    <span className="text-sm text-gray-600">{formData[field.key] ? "Active" : "Inactive"}</span>
                  </div>
                ) : field.type === "image" ? (
                  <div>
                    {formData[field.key] && (
                      <img src={formData[field.key]} alt="Preview" className="w-24 h-24 object-cover rounded-xl mb-2 border" />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await uploadImage(file, collectionName);
                          if (url) setFormData({ ...formData, [field.key]: url });
                        }
                      }}
                    />
                    <Input
                      value={formData[field.key] || ""}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder="Or paste image URL"
                      className="mt-2"
                    />
                  </div>
                ) : field.type === "file" ? (
                  <div>
                    {formData[field.key] && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <a
                          href={formData[field.key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-700 hover:underline truncate"
                        >
                          {formData[field.key].split("/").pop()?.split("?")[0] || "File uploaded"}
                        </a>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, [field.key]: "" })}
                          className="ml-auto text-gray-400 hover:text-red-500 flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {uploadError === field.key && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">Upload failed! Check Firebase Storage rules or try pasting a URL below.</p>
                      </div>
                    )}
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        disabled={uploadingField === field.key}
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadingField(field.key);
                            setUploadError(null);
                            try {
                              const url = await uploadFile(file, collectionName);
                              if (url) {
                                setFormData({ ...formData, [field.key]: url });
                              } else {
                                setUploadError(field.key);
                              }
                            } catch {
                              setUploadError(field.key);
                            }
                            setUploadingField(null);
                            e.target.value = "";
                          }
                        }}
                      />
                      {uploadingField === field.key && (
                        <div className="absolute inset-0 bg-white/80 rounded-md flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-ev-orange animate-spin" />
                          <span className="ml-2 text-sm text-ev-orange font-medium">Uploading...</span>
                        </div>
                      )}
                    </div>
                    <Input
                      value={formData[field.key] || ""}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder="Or paste download URL directly"
                      className="mt-2"
                    />
                  </div>
                ) : field.type === "date" ? (
                  <Input
                    type="date"
                    value={formData[field.key] || ""}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                  />
                ) : field.type === "number" ? (
                  <Input
                    type="number"
                    value={formData[field.key] || 0}
                    onChange={e => setFormData({ ...formData, [field.key]: Number(e.target.value) })}
                    placeholder={field.placeholder}
                  />
                ) : field.type === "url" ? (
                  <Input
                    value={formData[field.key] || ""}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder || "https://..."}
                  />
                ) : (
                  <Input
                    value={formData[field.key] || ""}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-ev-orange to-ev-gold text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import {title}</DialogTitle>
            <DialogDescription>Upload a text file or paste data in pipe-separated format.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-ev-navy">Upload Text File (.txt)</Label>
                <button
                  onClick={() => {
                    const sampleText = generateSampleFormat();
                    const blob = new Blob([sampleText], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `sample_${collectionName}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download Sample File
                </button>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                <div className="flex flex-col items-center justify-center pt-4 pb-5">
                  <FileUp className="w-7 h-7 text-gray-400 group-hover:text-blue-500 transition-colors mb-1" />
                  <p className="text-sm text-gray-500 group-hover:text-blue-600 font-medium">Click to upload .txt file</p>
                  <p className="text-xs text-gray-400 mt-0.5">or drag & drop</p>
                </div>
                <input
                  type="file"
                  accept=".txt,.text"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      if (text) setBulkText(text);
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {/* Format Guide */}
            <div className="bg-gray-50 rounded-xl p-4 text-xs font-mono text-gray-600 border border-gray-200">
              <p className="font-sans font-bold text-gray-700 mb-2">Format (pipe-separated, one item per line):</p>
              <p className="text-gray-400 mb-1">{"  "}{importableFields.map(f => f.label).join(" | ")}</p>
              <p>{"  "}{importableFields.map(f => {
                if (f.type === "select" && f.options?.length) return f.options[0].value;
                if (f.type === "number") return "0";
                if (f.type === "date") return "2025-01-01";
                if (f.type === "url") return "https://...";
                return `sample`;
              }).join(" | ")}</p>
              <p className="font-sans text-gray-400 mt-2">First line can be a header (will be auto-skipped). Image/file fields are set to empty. Switch fields default to Active.</p>
            </div>

            {/* Text Area */}
            <div>
              <Label className="font-medium text-gray-600">Or paste data below:</Label>
              <Textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={`Paste ${title.toLowerCase()} data here or upload a file above...`}
                rows={8}
                className="font-mono text-sm mt-1"
              />
              {bulkText.trim() && (
                <p className="text-xs text-gray-400 mt-1">
                  {bulkText.trim().split("\n").filter(l => l.trim()).length} line(s) detected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkDialogOpen(false); setBulkText(""); }}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={!bulkText.trim() || bulkImporting} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              {bulkImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Import {title}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit {title}</DialogTitle>
            <DialogDescription>Update a field for {selectedIds.size} selected item(s).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="font-medium">Select Field to Update</Label>
              <Select value={bulkEditField} onValueChange={v => { setBulkEditField(v); setBulkEditValue(""); }}>
                <SelectTrigger><SelectValue placeholder="Choose a field..." /></SelectTrigger>
                <SelectContent>
                  {fields.filter(f => f.type !== "image" && f.type !== "file").map(f => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {bulkEditField && (
              <div>
                <Label className="font-medium">New Value</Label>
                {(() => {
                  const field = fields.find(f => f.key === bulkEditField);
                  if (!field) return null;
                  if (field.type === "select" && field.options) {
                    return (
                      <Select value={String(bulkEditValue)} onValueChange={v => setBulkEditValue(v)}>
                        <SelectTrigger><SelectValue placeholder="Select value..." /></SelectTrigger>
                        <SelectContent>
                          {field.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    );
                  }
                  if (field.type === "switch") {
                    return (
                      <div className="flex items-center gap-3">
                        <Switch checked={bulkEditValue === true || bulkEditValue === "true"} onCheckedChange={v => setBulkEditValue(v)} />
                        <span className="text-sm text-gray-600">{bulkEditValue ? "Active / On" : "Inactive / Off"}</span>
                      </div>
                    );
                  }
                  if (field.type === "number") {
                    return <Input type="number" value={bulkEditValue || 0} onChange={e => setBulkEditValue(Number(e.target.value))} />;
                  }
                  if (field.type === "textarea") {
                    return <Textarea value={bulkEditValue || ""} onChange={e => setBulkEditValue(e.target.value)} rows={3} />;
                  }
                  if (field.type === "date") {
                    return <Input type="date" value={bulkEditValue || ""} onChange={e => setBulkEditValue(e.target.value)} />;
                  }
                  if (field.type === "url") {
                    return <Input value={bulkEditValue || ""} onChange={e => setBulkEditValue(e.target.value)} placeholder="https://..." />;
                  }
                  return <Input value={bulkEditValue || ""} onChange={e => setBulkEditValue(e.target.value)} placeholder={`Enter ${field.label}...`} />;
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkEditDialogOpen(false); setBulkEditField(""); setBulkEditValue(""); }}>Cancel</Button>
            <Button onClick={handleBulkEdit} disabled={!bulkEditField || bulkActionLoading} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
              Update {selectedIds.size} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirm */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} {title}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. {selectedIds.size} item(s) will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkActionLoading} className="bg-red-600 text-white hover:bg-red-700">
              {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete All ({selectedIds.size})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete this item.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== HELPER: Test Admin with Question Picker ====================
function TestAdminWithPicker({
  title, subtitle, icon, color, collectionName, fields, fetchData, onAdd, onUpdate, onDelete,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  collectionName: string;
  fields: CrudField[];
  fetchData: () => Promise<any[] | null>;
  onAdd: (data: any) => Promise<any>;
  onUpdate: (id: string, data: any) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTestId, setPickerTestId] = useState("");
  const [pickerTestTitle, setPickerTestTitle] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [postCreatePrompt, setPostCreatePrompt] = useState<{ show: boolean; title: string }>({ show: false, title: "" });
  const [subTestDialogItem, setSubTestDialogItem] = useState<any>(null);

  // Fetch question counts for each test
  const fetchQuestionCounts = useCallback(async () => {
    try {
      const data = await adminGetCollection("questions");
      const counts: Record<string, number> = {};
      const items = Array.isArray(data) ? data : [];
      items.forEach((q: any) => {
        const tid = q.testId || "";
        if (tid) {
          counts[tid] = (counts[tid] || 0) + 1;
        }
      });
      setQuestionCounts(counts);
    } catch (err) {
      console.error("Failed to fetch question counts:", err);
    }
  }, [refreshKey]);

  useEffect(() => {
    fetchQuestionCounts();
  }, [fetchQuestionCounts]);

  const openPicker = (item: any) => {
    setPickerTestId(item.id || "");
    setPickerTestTitle(item.title || item.name || "Test");
    setPickerOpen(true);
  };

  // Wrap fetchData to trigger refresh after question save
  const wrappedFetchData = useCallback(async () => {
    const result = await fetchData();
    return result;
  }, [fetchData, refreshKey]);

  // Wrap onAdd to show post-creation prompt
  const wrappedOnAdd = useCallback(async (data: any) => {
    const result = await onAdd(data);
    // Show prompt to add questions after creation
    const newTitle = data.title || data.name || "Test";
    setPostCreatePrompt({ show: true, title: newTitle });
    return result;
  }, [onAdd]);

  return (
    <>
      {/* ── How-to-Add Banner ── */}
      <div className="mb-4 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/60 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
            <FileQuestion className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-purple-800">Question kaise add karein?</h4>
            <p className="text-xs text-purple-600 mt-1 leading-relaxed">
              Pehle test create karein → Phir table mein us test ke row ke paas <span className="inline-flex items-center gap-1 font-bold text-purple-700">"Add Questions"</span> button dabayein → Questions select karein → Save karein.
            </p>
          </div>
        </div>
      </div>

      <CrudAdminPanel
        key={refreshKey}
        title={title}
        subtitle={subtitle}
        icon={icon}
        color={color}
        collectionName={collectionName}
        fields={fields}
        fetchData={wrappedFetchData}
        onAdd={wrappedOnAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        rowActions={(item: any) => {
          const qCount = questionCounts[item.id || ""] || 0;
          const subCount = (item.subTests || []).length;
          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); setSubTestDialogItem(item); }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm"
                title="Manage Sub-Tests"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                Sub-Tests
                {subCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[10px] font-bold">{subCount}</span>}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openPicker(item); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
                title="Questions add/remove karein"
              >
                <FileQuestion className="w-3.5 h-3.5" />
                Add Questions
                {qCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/25 text-[10px] font-bold">
                    {qCount}
                  </span>
                )}
              </button>
            </div>
          );
        }}
      />

      <QuestionPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        testId={pickerTestId}
        testTitle={pickerTestTitle}
        collectionName={collectionName}
        onSave={() => { setRefreshKey(k => k + 1); fetchQuestionCounts(); }}
      />

      {/* ── Post-Creation Prompt ── */}
      <Dialog open={postCreatePrompt.show} onOpenChange={(open) => { if (!open) setPostCreatePrompt({ show: false, title: "" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              Test Created!
            </DialogTitle>
            <DialogDescription className="pt-2">
              <span className="font-semibold text-foreground">"{postCreatePrompt.title}"</span> successfully create ho gaya.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
            <p className="text-sm text-purple-800 font-medium">
              Ab is test mein questions add karein?
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Aap table mein us test ke row ke paas <b>"Add Questions"</b> button se bhi questions add kar sakte hain.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPostCreatePrompt({ show: false, title: "" })}>
              Baad Mein
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              onClick={() => {
                setPostCreatePrompt({ show: false, title: "" });
              }}
            >
              <FileQuestion className="w-4 h-4 mr-1" />
              Samajh Gaya
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Tests Dialog */}
      <SubTestsDialog open={!!subTestDialogItem} onClose={() => setSubTestDialogItem(null)} parentItem={subTestDialogItem || {}} collectionName={collectionName} />
    </>
  );
}

// ==================== MOCK TESTS ADMIN ====================
function MockTestsAdmin() {
  return (
    <TestAdminWithPicker
      title="Mock Tests"
      subtitle="Manage all mock tests"
      icon={BookOpen}
      color="from-ev-orange to-orange-600"
      collectionName="mockTests"
      fields={[
        { key: "title", label: "Test Title", type: "text", placeholder: "e.g. WBCS Prelims 2026", required: true },
        { key: "category", label: "Category", type: "select", options: EXAM_CATEGORIES, required: true, allowOther: true },
        { key: "subject", label: "Subject", type: "select", options: SUBJECT_CATEGORIES, allowOther: true },
        { key: "duration", label: "Duration (min)", type: "number", placeholder: "60" },
        { key: "marks", label: "Total Marks", type: "number", placeholder: "100" },
        { key: "questions", label: "No. of Questions", type: "number", placeholder: "50" },
        { key: "difficulty", label: "Difficulty", type: "select", options: [
          { label: "Easy", value: "easy" }, { label: "Medium", value: "medium" }, { label: "Hard", value: "hard" },
        ] },
        { key: "price", label: "Price (₹)", type: "number", placeholder: "99" },
        { key: "accessType", label: "Free/Premium", type: "select", options: [
          { label: "🆓 Free", value: "free" }, { label: "👑 Premium", value: "premium" },
        ], required: true },
        { key: "isActive", label: "Active", type: "switch" },
        { key: "description", label: "Description", type: "textarea", placeholder: "Test description..." },
        { key: "instructions", label: "Instructions", type: "textarea", placeholder: "Test instructions..." },
        { key: "imageUrl", label: "Thumbnail Image", type: "image" },
      ]}
      fetchData={() => adminGetCollection("mockTests")}
      onAdd={async (data) => adminAddDoc("mockTests", { ...data, attempts: 0, rating: 0 })}
      onUpdate={(id, data) => adminUpdateDoc("mockTests", id, data)}
      onDelete={(id) => adminDeleteDoc("mockTests", id)}
    />
  );
}

// ==================== SUB-TESTS DIALOG ====================
function SubTestsDialog({ open, onClose, parentItem, collectionName }: { open: boolean; onClose: () => void; parentItem: any; collectionName: string }) {
  const [subTests, setSubTests] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState(30);
  const [newTotalQ, setNewTotalQ] = useState(50);
  const [newSubject, setNewSubject] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (open && parentItem) {
      setSubTests(parentItem.subTests || []);
      setNewTitle(""); setNewDuration(30); setNewTotalQ(50); setNewSubject(""); setNewDesc("");
    }
  }, [open, parentItem]);

  const showToast = (msg: string, type: "success" | "error") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const addSubTest = () => {
    if (!newTitle.trim()) { showToast("Title is required!", "error"); return; }
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setSubTests(prev => [...prev, { id, title: newTitle.trim(), duration: newDuration, totalQuestions: newTotalQ, subject: newSubject.trim(), description: newDesc.trim() }]);
    setNewTitle(""); setNewDuration(30); setNewTotalQ(50); setNewSubject(""); setNewDesc("");
  };

  const removeSubTest = (id: string) => { setSubTests(prev => prev.filter(st => st.id !== id)); };

  const saveSubTests = async () => {
    setSaving(true);
    try {
      await adminUpdateDoc(collectionName, parentItem.id, { subTests });
      showToast(`Saved ${subTests.length} sub-tests!`, "success");
      setTimeout(() => onClose(), 1000);
    } catch (e: any) { showToast(`Error: ${e.message}`, "error"); }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {toast && <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${toast.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{toast.message}</div>}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-ev-navy">Sub-Tests: {parentItem?.title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {/* Add Sub-Test Form */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-bold text-sm text-ev-navy">Add New Sub-Test</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="font-medium text-xs">Title *</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Test 1 - General Knowledge" className="text-sm" /></div>
            <div><Label className="font-medium text-xs">Duration (min)</Label><Input type="number" value={newDuration} onChange={e => setNewDuration(Number(e.target.value))} className="text-sm" /></div>
            <div><Label className="font-medium text-xs">Total Questions</Label><Input type="number" value={newTotalQ} onChange={e => setNewTotalQ(Number(e.target.value))} className="text-sm" /></div>
            <div><Label className="font-medium text-xs">Subject</Label><Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="e.g. GK" className="text-sm" /></div>
            <div><Label className="font-medium text-xs">Description</Label><Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description..." className="text-sm" /></div>
          </div>
          <button onClick={addSubTest} className="px-4 py-2 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Sub-Test</button>
        </div>

        {/* Sub-Tests List */}
        {subTests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Grid3X3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No sub-tests yet. Add one above!</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {subTests.map((st, idx) => (
              <div key={st.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <span className="w-8 h-8 rounded-lg bg-ev-navy text-white text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-ev-navy text-sm truncate">{st.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>⏱️ {st.duration}min</span>
                    <span>📝 {st.totalQuestions}Q</span>
                    {st.subject && <span>📖 {st.subject}</span>}
                  </div>
                </div>
                <button onClick={() => removeSubTest(st.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm font-bold">Cancel</button>
          <button onClick={saveSubTests} disabled={saving} className="px-6 py-2 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-sm flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Sub-Tests ({subTests.length})
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== QUESTIONS ADMIN (Drill-Down) ====================
function QuestionsAdmin() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [freeTests, setFreeTests] = useState<any[]>([]);
  const [dailyQuiz, setDailyQuiz] = useState<any[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [popularTests, setPopularTests] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Drill-down navigation state
  const [navLevel, setNavLevel] = useState<"types" | "tests" | "subtests" | "questions">("types");
  const [activeTestType, setActiveTestType] = useState<string>("");
  const [activeTestId, setActiveTestId] = useState<string>("");
  const [activeSubTestId, setActiveSubTestId] = useState<string>("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkCategory, setBulkCategory] = useState("WBCS");
  const [bulkSubject, setBulkSubject] = useState("GK");
  const [bulkDifficulty, setBulkDifficulty] = useState("medium");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [bulkCustomCategory, setBulkCustomCategory] = useState("");
  const [bulkCustomSubject, setBulkCustomSubject] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getTestsForType = (testType: string): any[] => {
    switch (testType) {
      case "mockTests": return mockTests;
      case "freeTests": return freeTests;
      case "dailyQuiz": return dailyQuiz;
      case "testSeries": return testSeries;
      case "popularTests": return popularTests;
      default: return [];
    }
  };

  const TEST_TYPE_OPTIONS = [
    { value: "mockTests", label: "Mock Tests", icon: BookOpen, color: "from-ev-orange to-orange-600" },
    { value: "freeTests", label: "Free Tests", icon: Zap, color: "from-green-500 to-emerald-600" },
    { value: "dailyQuiz", label: "Daily Quiz", icon: Brain, color: "from-purple-500 to-purple-600" },
    { value: "testSeries", label: "Test Series", icon: Trophy, color: "from-ev-gold to-amber-500" },
    { value: "popularTests", label: "Popular Tests", icon: Star, color: "from-amber-500 to-yellow-600" },
  ];

  const getTestTypeLabel = (value: string) => TEST_TYPE_OPTIONS.find(t => t.value === value)?.label || value;

  const getQuestionCountForTest = (testId: string): number => {
    return questions.filter((q: any) => q.testId === testId).length;
  };

  // Get current test data
  const getActiveTest = () => {
    if (!activeTestType || !activeTestId) return null;
    return getTestsForType(activeTestType).find((t: any) => t.id === activeTestId) || null;
  };

  // Get current sub-test data
  const getActiveSubTest = () => {
    const test = getActiveTest();
    if (!test || !test.subTests || !activeSubTestId) return null;
    return test.subTests.find((st: any) => st.id === activeSubTestId) || null;
  };

  // Get questions for current view
  const getCurrentQuestions = () => {
    const test = getActiveTest();
    if (!test) return [];

    if (activeSubTestId) {
      return questions.filter((q: any) => q.testId === activeSubTestId);
    }

    if (test.subTests && test.subTests.length > 0) {
      return [];
    }

    return questions.filter((q: any) => q.testId === activeTestId);
  };

  // Get questions filtered by search
  const getFilteredQuestions = () => {
    const qs = getCurrentQuestions();
    if (!searchTerm) return qs;
    return qs.filter(q =>
      Object.values(q).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Navigation helpers
  const navigateToTests = (testType: string) => {
    setActiveTestType(testType);
    setActiveTestId("");
    setActiveSubTestId("");
    setNavLevel("tests");
  };

  const navigateToTest = (testId: string) => {
    setActiveTestId(testId);
    setActiveSubTestId("");
    const test = getTestsForType(activeTestType).find((t: any) => t.id === testId);
    if (test && test.subTests && test.subTests.length > 0) {
      setNavLevel("subtests");
    } else {
      setNavLevel("questions");
    }
  };

  const navigateToSubTest = (subTestId: string) => {
    setActiveSubTestId(subTestId);
    setNavLevel("questions");
  };

  const goBack = () => {
    if (navLevel === "questions" && activeSubTestId) {
      setActiveSubTestId("");
      setNavLevel("subtests");
    } else if (navLevel === "questions") {
      setActiveTestId("");
      setNavLevel("tests");
    } else if (navLevel === "subtests") {
      setActiveTestId("");
      setNavLevel("tests");
    } else if (navLevel === "tests") {
      setActiveTestType("");
      setNavLevel("types");
    }
  };

  // Load data
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const [data, mockTestsData, freeTestsData, dailyQuizData, testSeriesData, popularTestsData] = await Promise.all([
        adminGetCollection("questions"),
        adminGetCollection("mockTests"),
        adminGetCollection("freeTests"),
        adminGetCollection("dailyQuiz"),
        adminGetCollection("testSeries"),
        adminGetCollection("popularTests"),
      ]);
      if (Array.isArray(data)) {
        data.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setQuestions(data);
      }
      if (Array.isArray(mockTestsData)) setMockTests(mockTestsData);
      if (Array.isArray(freeTestsData)) setFreeTests(freeTestsData);
      if (Array.isArray(dailyQuizData)) setDailyQuiz(dailyQuizData);
      if (Array.isArray(testSeriesData)) setTestSeries(testSeriesData);
      if (Array.isArray(popularTestsData)) setPopularTests(popularTestsData);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  // Save question
  const handleSave = async () => {
    setSaving(true);
    try {
      let saveData = { ...formData };
      if (saveData.category === "Others" && customCategory.trim()) {
        saveData.category = customCategory.trim();
      }
      if (saveData.subject === "Others" && customSubject.trim()) {
        saveData.subject = customSubject.trim();
      }
      // Auto-assign testId based on current drill-down position
      if (!saveData.testId && activeSubTestId) {
        saveData.testId = activeSubTestId;
      } else if (!saveData.testId && activeTestId) {
        saveData.testId = activeTestId;
      }
      if (editingItem) {
        const { id, createdAt, ...rest } = saveData;
        await adminUpdateDoc("questions", editingItem.id, rest);
      } else {
        await adminAddDoc("questions", saveData);
      }
      setDialogOpen(false);
      setCustomCategory("");
      setCustomSubject("");
      loadQuestions();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  // Delete question
  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await adminDeleteDoc("questions", deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
      loadQuestions();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  // Bulk import
  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setBulkImporting(true);
    try {
      const effectiveBulkCategory = bulkCategory === "Others" && bulkCustomCategory.trim() ? bulkCustomCategory.trim() : bulkCategory;
      const effectiveBulkSubject = bulkSubject === "Others" && bulkCustomSubject.trim() ? bulkCustomSubject.trim() : bulkSubject;
      const questionsList: any[] = [];
      let parseErrors: string[] = [];
      const text = bulkText.trim();
      const targetTestId = activeSubTestId || activeTestId || "";

      const pipeLines = text.split("\n").map(l => l.trim()).filter(l => l && l.includes("|") && l.split("|").length >= 6);

      if (pipeLines.length > 0) {
        for (let i = 0; i < pipeLines.length; i++) {
          const parts = pipeLines[i].split("|").map(p => p.trim());
          if (parts.length >= 6) {
            const ans = parts[5].toUpperCase().trim();
            if (parts[0] && parts[1] && parts[2] && parts[3] && parts[4] && ["A", "B", "C", "D"].includes(ans)) {
              questionsList.push({
                category: effectiveBulkCategory, subject: effectiveBulkSubject,
                difficulty: bulkDifficulty, marks: 1, testId: targetTestId,
                question: parts[0], optionA: parts[1], optionB: parts[2],
                optionC: parts[3], optionD: parts[4], correctAnswer: ans, explanation: parts[6] || "",
              });
            } else {
              parseErrors.push(`Line ${i + 1}: Invalid pipe format`);
            }
          }
        }
      } else {
        const blocks = text.split(/\n\s*\n/);
        for (let i = 0; i < blocks.length; i++) {
          const lines = blocks[i].trim().split("\n").map(l => l.trim()).filter(l => l);
          let q: any = {
            category: effectiveBulkCategory, subject: effectiveBulkSubject,
            difficulty: bulkDifficulty, marks: 1, testId: targetTestId,
            question: "", optionA: "", optionB: "", optionC: "", optionD: "",
            correctAnswer: "A", explanation: "",
          };
          for (const line of lines) {
            if (/^Q\d*[\s.：)]/i.test(line)) { q.question = line.replace(/^Q\d*[\s.：)]+/i, "").trim(); }
            else if (/^\d+[\s.)\]]/.test(line) && !q.question) { q.question = line.replace(/^\d+[\s.)\]]+/, "").trim(); }
            else if (/^Q[\s：]/i.test(line) && !q.question) { q.question = line.replace(/^Q[\s：]+/i, "").trim(); }
            else if (/^[Aa][\s.：)]/.test(line) && !/^Ans/i.test(line)) { q.optionA = line.replace(/^[Aa][\s.：)]+/, "").trim(); }
            else if (/^[Bb][\s.：)]/.test(line)) { q.optionB = line.replace(/^[Bb][\s.：)]+/, "").trim(); }
            else if (/^[Cc][\s.：)]/.test(line)) { q.optionC = line.replace(/^[Cc][\s.：)]+/, "").trim(); }
            else if (/^[Dd][\s.：)]/.test(line)) { q.optionD = line.replace(/^[Dd][\s.：)]+/, "").trim(); }
            else if (/^Ans[\s.：)]/i.test(line) || /^Answer[\s.：)]/i.test(line)) {
              const ans = line.replace(/^(Ans|Answer)[\s.：)]+/i, "").trim().toUpperCase();
              const ansLetter = ans.charAt(0);
              if (["A", "B", "C", "D"].includes(ansLetter)) q.correctAnswer = ansLetter;
            }
            else if (/^Exp[\s.：)]/i.test(line) || /^Explanation[\s.：)]/i.test(line)) {
              q.explanation = line.replace(/^(Exp|Explanation)[\s.：)]+/i, "").trim();
            }
            else if (!q.question) { q.question = line; }
          }
          if (q.question && q.optionA && q.optionB && q.optionC && q.optionD) {
            questionsList.push(q);
          } else {
            parseErrors.push(`Block ${i + 1}: Missing fields`);
          }
        }
      }

      if (questionsList.length === 0) {
        showToast("No valid questions found. Check the format.", "error");
        setBulkImporting(false);
        return;
      }

      // Enforce question count limit
      if (targetTestId) {
        const test = getActiveTest();
        const subTest = activeSubTestId ? test?.subTests?.find((st: any) => st.id === activeSubTestId) : null;
        const limitQ = subTest ? (subTest.totalQuestions || 0) : (test?.questions || test?.totalQuestions || 0);
        if (limitQ > 0) {
          const alreadyUploaded = getQuestionCountForTest(targetTestId);
          const remaining = limitQ - alreadyUploaded;
          if (remaining <= 0) {
            showToast(`Already has all ${limitQ} questions!`, "error");
            setBulkImporting(false);
            return;
          }
          if (questionsList.length > remaining) {
            showToast(`Only ${remaining} questions remaining. You tried to upload ${questionsList.length}.`, "error");
            setBulkImporting(false);
            return;
          }
        }
      }

      const result = await adminImportCollection("questions", questionsList);
      const imported = result?.imported || 0;
      let msg = `${imported} questions imported!`;
      if (parseErrors.length > 0) msg += ` (${parseErrors.length} skipped)`;
      showToast(msg, "success");
      setBulkDialogOpen(false);
      setBulkText("");
      loadQuestions();
    } catch (e: any) {
      showToast(`Import failed: ${e.message}`, "error");
    }
    setBulkImporting(false);
  };

  // Open add question dialog with auto-assigned testId
  const openAddDialog = () => {
    setEditingItem(null);
    const testId = activeSubTestId || activeTestId || "";
    setFormData({
      question: "", optionA: "", optionB: "", optionC: "", optionD: "",
      correctAnswer: "A", explanation: "", category: "WBCS", subject: "GK",
      difficulty: "medium", marks: 1, testId
    });
    setCustomCategory("");
    setCustomSubject("");
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ev-orange" /></div>;
  }

  return (
    <div>
      {/* Header with breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <FileQuestion className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-0.5">
              <button onClick={() => { setNavLevel("types"); setActiveTestType(""); setActiveTestId(""); setActiveSubTestId(""); }} className="hover:text-ev-orange transition-colors">Questions</button>
              {activeTestType && <><ChevronRight className="w-3 h-3" /><button onClick={() => { setNavLevel("tests"); setActiveTestId(""); setActiveSubTestId(""); }} className="hover:text-ev-orange transition-colors">{getTestTypeLabel(activeTestType)}</button></>}
              {activeTestId && <><ChevronRight className="w-3 h-3" /><button onClick={goBack} className="hover:text-ev-orange transition-colors truncate max-w-[150px]">{getActiveTest()?.title || "Test"}</button></>}
              {activeSubTestId && <><ChevronRight className="w-3 h-3" /><span className="text-ev-navy font-semibold truncate max-w-[150px]">{getActiveSubTest()?.title || "Sub-Test"}</span></>}
            </div>
            <h2 className="text-2xl font-black text-ev-navy">
              {navLevel === "types" ? "Questions" : navLevel === "tests" ? getTestTypeLabel(activeTestType) : navLevel === "subtests" ? (getActiveTest()?.title || "Test") : (getActiveSubTest()?.title || getActiveTest()?.title || "Questions")}
            </h2>
            <p className="text-gray-500 text-sm">{questions.length} total questions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {navLevel !== "types" && (
            <button onClick={goBack} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm flex items-center gap-1.5 hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          {navLevel === "questions" && (
            <>
              <button onClick={openAddDialog} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-sm shadow-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Add Question</button>
              <button onClick={() => { setBulkDialogOpen(true); }} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg flex items-center gap-2"><Upload className="w-4 h-4" /> Bulk Import</button>
            </>
          )}
        </div>
      </div>

      {/* LEVEL 1: TEST TYPES */}
      {navLevel === "types" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEST_TYPE_OPTIONS.map(tt => {
            const tests = getTestsForType(tt.value);
            const totalQ = tests.reduce((sum: number, t: any) => {
              const direct = getQuestionCountForTest(t.id);
              const subQ = (t.subTests || []).reduce((s: number, st: any) => s + getQuestionCountForTest(st.id), 0);
              return sum + direct + subQ;
            }, 0);
            const Icon = tt.icon;
            return (
              <div key={tt.value} onClick={() => navigateToTests(tt.value)} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-ev-orange/30 transition-all active:scale-[0.98] group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tt.color} flex items-center justify-center shadow-lg mb-4 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-ev-navy mb-1">{tt.label}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>{tests.length} tests</span>
                  <span className="text-gray-300">|</span>
                  <span className="font-bold text-ev-orange">{totalQ} questions</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LEVEL 2: TESTS LIST */}
      {navLevel === "tests" && (
        <div className="space-y-3">
          {getTestsForType(activeTestType).map((test: any) => {
            const directQ = getQuestionCountForTest(test.id);
            const subTestQ = (test.subTests || []).reduce((sum: number, st: any) => sum + getQuestionCountForTest(st.id), 0);
            const totalQ = directQ + subTestQ;
            const hasSubTests = test.subTests && test.subTests.length > 0;
            const accessType = test.accessType || (test.isFree ? "free" : "premium");
            return (
              <div key={test.id} onClick={() => navigateToTest(test.id)} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-ev-orange/30 transition-all active:scale-[0.99]">
                <div className="flex items-center gap-3">
                  {test.imageUrl ? (
                    <img src={test.imageUrl} alt={test.title} className="w-14 h-14 rounded-xl object-cover shadow-md flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                      <FileQuestion className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-ev-navy truncate">{test.title}</h4>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${accessType === "free" ? "bg-green-50 text-ev-green" : "bg-amber-50 text-amber-600"}`}>{accessType === "free" ? "FREE" : "PREMIUM"}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                      <span className="font-bold text-ev-orange">{totalQ} questions</span>
                      {hasSubTests && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-bold text-xs">
                          <Grid3X3 className="w-3 h-3" /> {test.subTests.length} sub-tests
                        </span>
                      )}
                      {test.category && <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs">{test.category}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            );
          })}
          {getTestsForType(activeTestType).length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <FileQuestion className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No tests in this category yet</p>
            </div>
          )}
        </div>
      )}

      {/* LEVEL 3: SUB-TESTS LIST */}
      {navLevel === "subtests" && (() => {
        const test = getActiveTest();
        if (!test) return null;
        return (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 border-2 border-ev-orange/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-ev-navy">{test.title}</h4>
                  <p className="text-sm text-gray-500">{test.subTests?.length || 0} sub-tests • Click any sub-test to manage its questions</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${(test.accessType || "premium") === "free" ? "bg-green-50 text-ev-green" : "bg-amber-50 text-amber-600"}`}>{(test.accessType || "premium") === "free" ? "FREE" : "PREMIUM"}</span>
              </div>
            </div>
            {(test.subTests || []).map((st: any, idx: number) => {
              const stQ = getQuestionCountForTest(st.id);
              const stTotal = st.totalQuestions || 0;
              const stIsFull = stTotal > 0 && stQ >= stTotal;
              const pct = stTotal > 0 ? Math.min(100, (stQ / stTotal) * 100) : 0;
              return (
                <div key={st.id} onClick={() => navigateToSubTest(st.id)} className={`bg-white rounded-2xl p-4 border-2 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99] ${stIsFull ? "border-red-200 hover:border-red-300" : "border-gray-100 hover:border-ev-orange/30"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${stIsFull ? "bg-red-100 text-red-600" : "bg-ev-navy/10 text-ev-navy"}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-ev-navy text-sm truncate">{st.title}</h4>
                        {stIsFull && <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-xs font-bold">FULL</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="font-bold text-ev-orange">{stQ} questions</span>
                        {stTotal > 0 && <span>of {stTotal}</span>}
                        {st.duration > 0 && <span>⏱️ {st.duration} min</span>}
                        {st.subject && <span>📖 {st.subject}</span>}
                      </div>
                      {stTotal > 0 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${stIsFull ? "bg-red-500" : stQ > 0 ? "bg-gradient-to-r from-ev-orange to-ev-gold" : "bg-gray-300"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 text-right">{stQ}/{stTotal} ({Math.round(pct)}%)</p>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* LEVEL 4: QUESTIONS LIST */}
      {navLevel === "questions" && (() => {
        const filtered = getFilteredQuestions();
        const currentTargetId = activeSubTestId || activeTestId;
        const currentTarget = getActiveSubTest() || getActiveTest();
        const currentQCount = getQuestionCountForTest(currentTargetId);
        const limitQ = currentTarget?.totalQuestions || currentTarget?.questions || 0;
        const isFull = limitQ > 0 && currentQCount >= limitQ;
        const pct = limitQ > 0 ? Math.min(100, (currentQCount / limitQ) * 100) : 0;

        return (
          <div>
            {currentTarget && (
              <div className={`rounded-xl p-4 border-2 mb-4 ${isFull ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-ev-navy text-sm">
                      {activeSubTestId ? getActiveSubTest()?.title : getActiveTest()?.title}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {currentQCount}{limitQ > 0 ? `/${limitQ}` : ""} questions uploaded
                      {activeSubTestId && getActiveSubTest()?.duration ? ` • ⏱️ ${getActiveSubTest()!.duration} min` : ""}
                      {activeSubTestId && getActiveSubTest()?.subject ? ` • 📖 ${getActiveSubTest()!.subject}` : ""}
                    </p>
                  </div>
                  {isFull && <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-bold">⚠️ FULL</span>}
                </div>
                {limitQ > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${isFull ? "bg-red-500" : currentQCount > 0 ? "bg-gradient-to-r from-ev-orange to-ev-gold" : "bg-gray-300"}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            )}

            <div className="relative mb-4">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-ev-orange text-sm" placeholder="Search questions..." />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <FileQuestion className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium mb-2">No questions yet</p>
                <p className="text-gray-400 text-sm mb-4">Add questions using the button above or bulk import</p>
                <button onClick={openAddDialog} className="px-4 py-2 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-sm shadow-lg"><Plus className="w-4 h-4 inline mr-1" /> Add Question</button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="font-semibold text-ev-navy">#</TableHead>
                    <TableHead className="font-semibold text-ev-navy">Question</TableHead>
                    <TableHead className="font-semibold text-ev-navy">Category</TableHead>
                    <TableHead className="font-semibold text-ev-navy">Subject</TableHead>
                    <TableHead className="font-semibold text-ev-navy">Difficulty</TableHead>
                    <TableHead className="font-semibold text-ev-navy text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filtered.map((q: any, idx: number) => (
                      <TableRow key={q.id}>
                        <TableCell className="text-xs text-gray-400 font-bold">{idx + 1}</TableCell>
                        <TableCell className="max-w-[300px] truncate font-medium">{q.question}</TableCell>
                        <TableCell><span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold">{q.category}</span></TableCell>
                        <TableCell>{q.subject}</TableCell>
                        <TableCell><span className={`px-2 py-1 rounded-lg text-xs font-bold ${q.difficulty === "easy" ? "bg-green-50 text-green-600" : q.difficulty === "hard" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{q.difficulty}</span></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => {
                              setEditingItem(q);
                              const catInList = EXAM_CATEGORIES.some(c => c.value === q.category);
                              const subInList = SUBJECT_CATEGORIES.some(c => c.value === q.subject);
                              setFormData({
                                question: q.question, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
                                correctAnswer: q.correctAnswer, explanation: q.explanation || "",
                                category: catInList ? q.category : "Others", subject: subInList ? q.subject : "Others",
                                difficulty: q.difficulty, marks: q.marks || 1, testId: q.testId || ""
                              });
                              setCustomCategory(catInList ? "" : q.category);
                              setCustomSubject(subInList ? "" : q.subject);
                              setDialogOpen(true);
                            }} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => { setDeletingId(q.id); setDeleteDialogOpen(true); }} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ADD/EDIT QUESTION DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Question" : "Add Question"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="font-medium">Question *</Label><Textarea value={formData.question || ""} onChange={e => setFormData({ ...formData, question: e.target.value })} placeholder="Enter the question..." rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="font-medium">Option A *</Label><Input value={formData.optionA || ""} onChange={e => setFormData({ ...formData, optionA: e.target.value })} placeholder="Option A" /></div>
              <div><Label className="font-medium">Option B *</Label><Input value={formData.optionB || ""} onChange={e => setFormData({ ...formData, optionB: e.target.value })} placeholder="Option B" /></div>
              <div><Label className="font-medium">Option C *</Label><Input value={formData.optionC || ""} onChange={e => setFormData({ ...formData, optionC: e.target.value })} placeholder="Option C" /></div>
              <div><Label className="font-medium">Option D *</Label><Input value={formData.optionD || ""} onChange={e => setFormData({ ...formData, optionD: e.target.value })} placeholder="Option D" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="font-medium">Correct Answer</Label><Select value={formData.correctAnswer || "A"} onValueChange={v => setFormData({ ...formData, correctAnswer: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["A", "B", "C", "D"].map(a => <SelectItem key={a} value={a}>Option {a}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="font-medium">Category</Label><Select value={formData.category || "WBCS"} onValueChange={v => { setFormData({ ...formData, category: v }); if (v !== "Others") setCustomCategory(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXAM_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="font-medium">Subject</Label><Select value={formData.subject || "GK"} onValueChange={v => { setFormData({ ...formData, subject: v }); if (v !== "Others") setCustomSubject(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SUBJECT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {(formData.category === "Others" || formData.subject === "Others") && (
              <div className="grid grid-cols-2 gap-4">
                {formData.category === "Others" && <div><Label className="font-medium">Custom Category *</Label><Input value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Custom category..." /></div>}
                {formData.subject === "Others" && <div><Label className="font-medium">Custom Subject *</Label><Input value={customSubject} onChange={e => setCustomSubject(e.target.value)} placeholder="Custom subject..." /></div>}
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="font-medium">Difficulty</Label><Select value={formData.difficulty || "medium"} onValueChange={v => setFormData({ ...formData, difficulty: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent></Select></div>
              <div><Label className="font-medium">Marks</Label><Input type="number" value={formData.marks || 1} onChange={e => setFormData({ ...formData, marks: Number(e.target.value) })} /></div>
            </div>
            {(activeSubTestId || activeTestId) && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                <span className="font-bold text-blue-700">Auto-assigned to:</span>{" "}
                <span className="text-blue-600">
                  {activeSubTestId ? `${getActiveTest()?.title} → ${getActiveSubTest()?.title}` : getActiveTest()?.title}
                </span>
              </div>
            )}
            <div><Label className="font-medium">Explanation</Label><Textarea value={formData.explanation || ""} onChange={e => setFormData({ ...formData, explanation: e.target.value })} placeholder="Explain the correct answer..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-ev-orange to-ev-gold text-white">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Question?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Questions</DialogTitle>
            <DialogDescription>
              Questions will be added to: <span className="font-bold text-ev-navy">{activeSubTestId ? `${getActiveTest()?.title} → ${getActiveSubTest()?.title}` : getActiveTest()?.title || "current test"}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="font-medium">Category</Label><Select value={bulkCategory} onValueChange={v => { setBulkCategory(v); if (v !== "Others") setBulkCustomCategory(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXAM_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="font-medium">Subject</Label><Select value={bulkSubject} onValueChange={v => { setBulkSubject(v); if (v !== "Others") setBulkCustomSubject(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SUBJECT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="font-medium">Difficulty</Label><Select value={bulkDifficulty} onValueChange={setBulkDifficulty}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent></Select></div>
            </div>
            {(bulkCategory === "Others" || bulkSubject === "Others") && (
              <div className="grid grid-cols-2 gap-4">
                {bulkCategory === "Others" && <div><Label className="font-medium">Custom Category *</Label><Input value={bulkCustomCategory} onChange={e => setBulkCustomCategory(e.target.value)} placeholder="Custom category..." /></div>}
                {bulkSubject === "Others" && <div><Label className="font-medium">Custom Subject *</Label><Input value={bulkCustomSubject} onChange={e => setBulkCustomSubject(e.target.value)} placeholder="Custom subject..." /></div>}
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-ev-navy">Upload Text File (.txt)</Label>
                <button onClick={() => {
                  const sampleText = `Q: What is the capital of India?\nA: Mumbai\nB: New Delhi\nC: Kolkata\nD: Chennai\nAns: B\nExp: New Delhi is the capital of India\n\nQ: Which planet is known as the Red Planet?\nA: Venus\nB: Jupiter\nC: Mars\nD: Saturn\nAns: C\nExp: Mars appears red due to iron oxide`;
                  const blob = new Blob([sampleText], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "sample_questions.txt"; a.click();
                  URL.revokeObjectURL(url);
                }} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"><Download className="w-3.5 h-3.5" /> Download Sample</button>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileUp className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
                  <p className="text-sm text-gray-500 group-hover:text-blue-600 font-medium">Click to upload .txt file</p>
                </div>
                <input type="file" accept=".txt,.text" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => { const text = ev.target?.result as string; if (text) setBulkText(text); };
                  reader.readAsText(file); e.target.value = "";
                }} />
              </label>
            </div>
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-gray-600 hover:text-ev-navy flex items-center gap-2">
                <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" /> View Format Guide
              </summary>
              <div className="mt-3 bg-gray-50 rounded-xl p-4 text-xs font-mono text-gray-600 border border-gray-200 space-y-2">
                <p className="font-sans font-bold text-gray-700">Format — Q/A/B/C/D/Ans/Exp:</p>
                <p>Q: What is the capital?</p><p>A: Mumbai</p><p>B: New Delhi</p><p>C: Kolkata</p><p>D: Chennai</p><p>Ans: B</p><p>Exp: New Delhi is the capital</p>
                <p className="font-sans text-gray-500 mt-2">Or pipe-separated: Question | OptA | OptB | OptC | OptD | Answer | Explanation</p>
              </div>
            </details>
            <div>
              <Label className="font-medium text-gray-600">Or paste questions below:</Label>
              <Textarea value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Paste questions here..." rows={8} className="font-mono text-sm mt-1" />
              {bulkText.trim() && <p className="text-xs text-gray-400 mt-1">{bulkText.trim().split(/\n\s*\n/).filter(b => b.trim()).length} question block(s) detected</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkDialogOpen(false); setBulkText(""); }}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={!bulkText.trim() || bulkImporting} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              {bulkImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}Import Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}
          >
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== TEST SERIES ADMIN ====================
function TestSeriesAdmin() {
  return (
    <TestAdminWithPicker
      title="Test Series"
      subtitle="Manage test series packages"
      icon={Trophy}
      color="from-ev-gold to-amber-500"
      collectionName="testSeries"
      fields={[
        { key: "title", label: "Series Title", type: "text", placeholder: "e.g. WBCS Complete Pack", required: true },
        { key: "category", label: "Category", type: "select", options: EXAM_CATEGORIES, required: true, allowOther: true },
        { key: "subject", label: "Subject", type: "select", options: SUBJECT_CATEGORIES, allowOther: true },
        { key: "price", label: "Price (₹)", type: "number", placeholder: "499" },
        { key: "accessType", label: "Free/Premium", type: "select", options: [
          { label: "🆓 Free", value: "free" }, { label: "👑 Premium", value: "premium" },
        ], required: true },
        { key: "isActive", label: "Active", type: "switch" },
        { key: "description", label: "Description", type: "textarea", placeholder: "Series description..." },
        { key: "imageUrl", label: "Thumbnail", type: "image" },
      ]}
      fetchData={() => adminGetCollection("testSeries")}
      onAdd={(data) => adminAddDoc("testSeries", data)}
      onUpdate={(id, data) => adminUpdateDoc("testSeries", id, data)}
      onDelete={(id) => adminDeleteDoc("testSeries", id)}
    />
  );
}

// ==================== FREE TESTS ADMIN ====================
function FreeTestsAdmin() {
  return (
    <TestAdminWithPicker
      title="Free Tests"
      subtitle="Manage free practice tests"
      icon={Zap}
      color="from-green-500 to-emerald-600"
      collectionName="freeTests"
      fields={[
        { key: "title", label: "Test Title", type: "text", placeholder: "e.g. Free GK Test", required: true },
        { key: "category", label: "Category", type: "select", options: EXAM_CATEGORIES, required: true, allowOther: true },
        { key: "subject", label: "Subject", type: "select", options: SUBJECT_CATEGORIES, allowOther: true },
        { key: "duration", label: "Duration (min)", type: "number" },
        { key: "questions", label: "Questions", type: "number" },
        { key: "marks", label: "Total Marks", type: "number" },
        { key: "difficulty", label: "Difficulty", type: "select", options: [{ label: "Easy", value: "easy" }, { label: "Medium", value: "medium" }, { label: "Hard", value: "hard" }] },
        { key: "accessType", label: "Free/Premium", type: "select", options: [
          { label: "🆓 Free", value: "free" }, { label: "👑 Premium", value: "premium" },
        ], required: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "isActive", label: "Active", type: "switch" },
        { key: "imageUrl", label: "Thumbnail", type: "image" },
      ]}
      fetchData={() => adminGetCollection("freeTests")}
      onAdd={async (data) => adminAddDoc("freeTests", { ...data, accessType: data.accessType || "free" })}
      onUpdate={(id, data) => adminUpdateDoc("freeTests", id, data)}
      onDelete={(id) => adminDeleteDoc("freeTests", id)}
    />
  );
}

// ==================== DAILY QUIZ ADMIN ====================
function DailyQuizAdmin() {
  return (
    <TestAdminWithPicker
      title="Daily Quiz"
      subtitle="Manage daily quiz challenges"
      icon={Brain}
      color="from-purple-500 to-purple-600"
      collectionName="dailyQuiz"
      fields={[
        { key: "title", label: "Quiz Title", type: "text", placeholder: "e.g. Daily GK Quiz", required: true },
        { key: "category", label: "Category", type: "select", options: EXAM_CATEGORIES, required: true, allowOther: true },
        { key: "subject", label: "Subject", type: "select", options: SUBJECT_CATEGORIES, allowOther: true },
        { key: "questions", label: "Questions", type: "number" },
        { key: "duration", label: "Duration (min)", type: "number" },
        { key: "participants", label: "Participants", type: "number" },
        { key: "accessType", label: "Free/Premium", type: "select", options: [
          { label: "🆓 Free", value: "free" }, { label: "👑 Premium", value: "premium" },
        ], required: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "isActive", label: "Active", type: "switch" },
      ]}
      fetchData={() => adminGetCollection("dailyQuiz")}
      onAdd={(data) => adminAddDoc("dailyQuiz", data)}
      onUpdate={(id, data) => adminUpdateDoc("dailyQuiz", id, data)}
      onDelete={(id) => adminDeleteDoc("dailyQuiz", id)}
    />
  );
}

// ==================== POPULAR TESTS ADMIN ====================
function PopularTestsAdmin() {
  return (
    <TestAdminWithPicker
      title="Popular Tests"
      subtitle="Manage featured/popular tests on home"
      icon={Star}
      color="from-amber-500 to-yellow-600"
      collectionName="popularTests"
      fields={[
        { key: "title", label: "Test Title", type: "text", placeholder: "e.g. WBCS Prelims 2026", required: true },
        { key: "category", label: "Category", type: "select", options: EXAM_CATEGORIES, allowOther: true },
        { key: "subject", label: "Subject", type: "select", options: SUBJECT_CATEGORIES, allowOther: true },
        { key: "duration", label: "Duration (min)", type: "number" },
        { key: "marks", label: "Total Marks", type: "number" },
        { key: "questions", label: "Questions", type: "number" },
        { key: "attempts", label: "Attempts", type: "number" },
        { key: "rating", label: "Rating", type: "number" },
        { key: "price", label: "Price (₹)", type: "number", placeholder: "99" },
        { key: "accessType", label: "Free/Premium", type: "select", options: [
          { label: "🆓 Free", value: "free" }, { label: "👑 Premium", value: "premium" },
        ], required: true },
        { key: "isActive", label: "Active", type: "switch" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "imageUrl", label: "Thumbnail", type: "image" },
      ]}
      fetchData={() => adminGetCollection("popularTests")}
      onAdd={(data) => adminAddDoc("popularTests", data)}
      onUpdate={(id, data) => adminUpdateDoc("popularTests", id, data)}
      onDelete={(id) => adminDeleteDoc("popularTests", id)}
    />
  );
}

// ==================== BANNERS ADMIN ====================
const NAVIGATION_VIEWS = [
  { label: "Mock Tests", value: "mocktests" },
  { label: "Test Series", value: "test-series" },
  { label: "Free Tests", value: "free-tests" },
  { label: "Free Quizzes", value: "free-quizzes" },
  { label: "Previous Papers", value: "previous-papers" },
  { label: "Study Notes", value: "notes" },
  { label: "Upcoming Exams", value: "upcoming-exams" },
  { label: "Daily Tips", value: "daily-tips" },
  { label: "Premium Plans", value: "pricing" },
  { label: "Leaderboard", value: "leaderboard" },
  { label: "My Profile", value: "profile" },
  { label: "Help & Support", value: "support" },
];

const LINK_ACTION_OPTIONS = [
  { label: "📂 Internal Page (navigate within app)", value: "internal" },
  { label: "🌐 External URL (open in browser)", value: "external" },
  { label: "📄 Show Detail (open announcement/banner detail)", value: "detail" },
  { label: "🚫 No Action", value: "none" },
];

function BannersAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetCollection("banners");
      if (data) {
        data.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        setItems(data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData({ title: "", subtitle: "", linkType: "internal", targetView: "", link: "", linkText: "", gradient: "from-ev-navy to-blue-800", order: items.length, isActive: true, imageUrl: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) { showToast("Title is required", "error"); return; }
    setSaving(true);
    try {
      const { id, uid, createdAt, updatedAt, ...cleanData } = formData as any;
      if (editingItem) {
        await adminUpdateDoc("banners", editingItem.id || editingItem.uid, cleanData);
        showToast("Banner updated successfully!", "success");
      } else {
        await adminAddDoc("banners", cleanData);
        showToast("Banner created successfully!", "success");
      }
      setDialogOpen(false);
      loadItems();
    } catch (e) { console.error(e); showToast("Error saving banner", "error"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await adminDeleteDoc("banners", deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
      loadItems();
      showToast("Banner deleted successfully!", "success");
    } catch (e) { console.error(e); showToast("Error deleting banner", "error"); }
    setSaving(false);
  };

  const handleToggleActive = async (item: any) => {
    try {
      await adminUpdateDoc("banners", item.id || item.uid, { isActive: !item.isActive });
      loadItems();
      showToast(`Banner ${!item.isActive ? "activated" : "deactivated"}`, "success");
    } catch (e) { showToast("Error updating banner", "error"); }
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    // Update order values
    for (let i = 0; i < newItems.length; i++) {
      newItems[i] = { ...newItems[i], order: i };
    }
    setItems(newItems);
    try {
      for (const item of [newItems[index - 1], newItems[index]]) {
        await adminUpdateDoc("banners", item.id || item.uid, { order: item.order });
      }
    } catch (e) { console.error(e); loadItems(); }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    for (let i = 0; i < newItems.length; i++) {
      newItems[i] = { ...newItems[i], order: i };
    }
    setItems(newItems);
    try {
      for (const item of [newItems[index], newItems[index + 1]]) {
        await adminUpdateDoc("banners", item.id || item.uid, { order: item.order });
      }
    } catch (e) { console.error(e); loadItems(); }
  };

  const filteredItems = items.filter(item =>
    Object.values(item).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const gradientLabels: Record<string, string> = {
    "from-ev-navy to-blue-800": "Navy Blue",
    "from-ev-orange to-orange-700": "Orange",
    "from-ev-gold to-yellow-600": "Gold",
    "from-green-500 to-emerald-600": "Green",
    "from-purple-500 to-purple-600": "Purple",
    "from-cyan-500 to-blue-600": "Cyan",
  };

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}>
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ev-orange to-red-500 flex items-center justify-center shadow-lg">
            <Image className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-ev-navy">Top Banners</h2>
            <p className="text-gray-500 text-sm">Manage home page banner carousel • {items.length} banners</p>
          </div>
        </div>
        <button onClick={openAddDialog} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold text-sm shadow-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-ev-orange text-sm"
            placeholder="Search banners..." />
        </div>
      </div>

      {/* Banner Cards with Live Preview */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ev-orange" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-ev-orange to-red-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Image className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-lg font-bold text-ev-navy mb-2">Top Banner Management</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">Create and manage the banner carousel that appears at the top of the home page. Banners auto-rotate every 3 seconds.</p>
          <button onClick={openAddDialog} className="px-6 py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg">
            <Plus className="w-4 h-4 inline mr-1" /> Add Your First Banner
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, idx) => (
            <motion.div key={item.id || item.uid || idx}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Live Banner Preview */}
              <div className={"bg-gradient-to-r " + (item.gradient || "from-ev-navy to-blue-800") + " p-5 flex items-center justify-between"}>
                <div>
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Featured</span>
                  <h3 className="text-lg font-bold text-white mt-1">{item.title || "Untitled Banner"}</h3>
                  {item.subtitle && <p className="text-white/70 text-sm mt-1">{item.subtitle}</p>}
                  <span className="mt-2 inline-block px-4 py-1.5 rounded-lg bg-white/20 text-white text-sm font-semibold">
                    {item.linkText || "Explore →"}
                  </span>
                </div>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-20 h-20 rounded-xl object-cover shadow-lg" />
                ) : (
                  <span className="text-5xl">🎯</span>
                )}
              </div>
              {/* Controls Bar */}
              <div className="px-5 py-3 flex items-center justify-between bg-gray-50/80">
                <div className="flex items-center gap-3">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleMoveUp(items.indexOf(item))} disabled={items.indexOf(item) === 0}
                      className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-ev-orange disabled:opacity-30 transition-colors">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-gray-500 min-w-[2rem] text-center">#{item.order ?? idx + 1}</span>
                    <button onClick={() => handleMoveDown(items.indexOf(item))} disabled={items.indexOf(item) === items.length - 1}
                      className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-ev-orange disabled:opacity-30 transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Info Tags */}
                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600">{gradientLabels[item.gradient] || item.gradient || "Default"}</span>
                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-600">
                    {item.linkType === "internal" ? `→ ${NAVIGATION_VIEWS.find(v => v.value === item.targetView)?.label || item.targetView}` :
                     item.linkType === "external" ? "🌐 External" :
                     item.linkType === "detail" ? "📄 Detail" : "🚫 No Action"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Active Toggle */}
                  <button onClick={() => handleToggleActive(item)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${item.isActive !== false ? "bg-green-100 text-ev-green" : "bg-red-100 text-ev-red"}`}>
                    {item.isActive !== false ? "● Active" : "○ Inactive"}
                  </button>
                  {/* Edit */}
                  <button onClick={() => openEditDialog(item)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit className="w-4 h-4" /></button>
                  {/* Delete */}
                  <button onClick={() => { setDeletingId(item.id || item.uid); setDeleteDialogOpen(true); }} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog with Live Preview */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Banner" : "Add New Banner"}</DialogTitle>
            <DialogDescription>Design your home page top banner with live preview</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            {/* Form Side */}
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Banner Title <span className="text-red-500">*</span></Label>
                <Input value={formData.title || ""} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. WBCS 2026 Preparation" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Subtitle</Label>
                <Input value={formData.subtitle || ""} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} placeholder="Start your preparation now" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Gradient Color</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Navy Blue", value: "from-ev-navy to-blue-800", preview: "bg-gradient-to-r from-ev-navy to-blue-800" },
                    { label: "Orange", value: "from-ev-orange to-orange-700", preview: "bg-gradient-to-r from-ev-orange to-orange-700" },
                    { label: "Gold", value: "from-ev-gold to-yellow-600", preview: "bg-gradient-to-r from-ev-gold to-yellow-600" },
                    { label: "Green", value: "from-green-500 to-emerald-600", preview: "bg-gradient-to-r from-green-500 to-emerald-600" },
                    { label: "Purple", value: "from-purple-500 to-purple-600", preview: "bg-gradient-to-r from-purple-500 to-purple-600" },
                    { label: "Cyan", value: "from-cyan-500 to-blue-600", preview: "bg-gradient-to-r from-cyan-500 to-blue-600" },
                  ].map(g => (
                    <button key={g.value} onClick={() => setFormData({ ...formData, gradient: g.value })}
                      className={`p-2 rounded-xl border-2 transition-all text-white text-xs font-bold ${formData.gradient === g.value ? "border-ev-orange shadow-lg scale-105" : "border-transparent"}`}>
                      <div className={`${g.preview} rounded-lg h-8 mb-1`} />
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Click Action</Label>
                <Select value={formData.linkType || "internal"} onValueChange={v => setFormData({ ...formData, linkType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LINK_ACTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(formData.linkType === "internal") && (
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">Navigate To</Label>
                  <Select value={formData.targetView || ""} onValueChange={v => setFormData({ ...formData, targetView: v })}>
                    <SelectTrigger><SelectValue placeholder="Select page..." /></SelectTrigger>
                    <SelectContent>
                      {NAVIGATION_VIEWS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(formData.linkType === "external") && (
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">External URL</Label>
                  <Input value={formData.link || ""} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="https://example.com" />
                </div>
              )}
              {(formData.linkType === "internal" || formData.linkType === "external") && (
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">Button Text</Label>
                  <Input value={formData.linkText || ""} onChange={e => setFormData({ ...formData, linkText: e.target.value })} placeholder="e.g. Explore Now, Learn More" />
                </div>
              )}
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Display Order</Label>
                <Input type="number" value={formData.order ?? 0} onChange={e => setFormData({ ...formData, order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">Active</Label>
                <Switch checked={formData.isActive ?? true} onCheckedChange={v => setFormData({ ...formData, isActive: v })} />
                <span className="text-sm text-gray-600">{formData.isActive !== false ? "Active" : "Inactive"}</span>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Banner Image</Label>
                {formData.imageUrl && (
                  <img src={formData.imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-xl mb-2 border" />
                )}
                <Input type="file" accept="image/*" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file) { const url = await uploadImage(file, "banners"); if (url) setFormData({ ...formData, imageUrl: url }); }
                }} />
                <Input value={formData.imageUrl || ""} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="Or paste image URL" className="mt-2" />
              </div>
            </div>
            {/* Live Preview Side */}
            <div className="space-y-3">
              <Label className="text-sm font-bold text-ev-navy">Live Preview</Label>
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-xs text-gray-400 mb-2 text-center">How it looks on the home page</p>
                <div className={"rounded-2xl bg-gradient-to-r " + (formData.gradient || "from-ev-navy to-blue-800") + " p-5 flex items-center justify-between shadow-lg"}>
                  <div>
                    <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Featured</span>
                    <h3 className="text-lg font-bold text-white mt-1">{formData.title || "Banner Title"}</h3>
                    {formData.subtitle && <p className="text-white/70 text-sm mt-1">{formData.subtitle}</p>}
                    <span className="mt-2 inline-block px-4 py-1.5 rounded-lg bg-white/20 text-white text-sm font-semibold">
                      {formData.linkText || "Explore →"}
                    </span>
                  </div>
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt={formData.title} className="w-20 h-20 rounded-xl object-cover shadow-lg" />
                  ) : (
                    <span className="text-5xl">🎯</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <p><b>Click:</b> {formData.linkType === "internal" ? `Navigate to ${NAVIGATION_VIEWS.find(v => v.value === formData.targetView)?.label || formData.targetView || "—"}` :
                  formData.linkType === "external" ? `Open ${formData.link || "URL"}` :
                  formData.linkType === "detail" ? "Show detail view" : "No action"}</p>
                <p><b>Order:</b> #{formData.order ?? 0} • <b>Status:</b> {formData.isActive !== false ? "Active" : "Inactive"}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-ev-orange to-ev-gold text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {editingItem ? "Update Banner" : "Create Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This banner will be permanently removed from the carousel.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== ANNOUNCEMENTS ADMIN ====================
function AnnouncementsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetCollection("announcements");
      if (data) {
        data.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setItems(data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData({ title: "", description: "", type: "new", priority: "medium", linkType: "detail", targetView: "", link: "", linkText: "", isActive: true, imageUrl: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) { showToast("Title is required", "error"); return; }
    setSaving(true);
    try {
      const { id, uid, createdAt, updatedAt, ...cleanData } = formData as any;
      if (editingItem) {
        await adminUpdateDoc("announcements", editingItem.id || editingItem.uid, cleanData);
        showToast("Announcement updated successfully!", "success");
      } else {
        await adminAddDoc("announcements", cleanData);
        showToast("Announcement created successfully!", "success");
      }
      setDialogOpen(false);
      loadItems();
    } catch (e) { console.error(e); showToast("Error saving announcement", "error"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await adminDeleteDoc("announcements", deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
      loadItems();
      showToast("Announcement deleted successfully!", "success");
    } catch (e) { console.error(e); showToast("Error deleting announcement", "error"); }
    setSaving(false);
  };

  const handleToggleActive = async (item: any) => {
    try {
      await adminUpdateDoc("announcements", item.id || item.uid, { isActive: !item.isActive });
      loadItems();
      showToast(`Announcement ${!item.isActive ? "activated" : "deactivated"}`, "success");
    } catch (e) { showToast("Error updating announcement", "error"); }
  };

  const filteredItems = items.filter(item =>
    Object.values(item).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const announcementTypeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    new: { icon: <Sparkles className="w-4 h-4" />, color: "text-ev-green", bg: "bg-green-100", label: "New" },
    alert: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-ev-orange", bg: "bg-orange-100", label: "Alert" },
    offer: { icon: <Flame className="w-4 h-4" />, color: "text-ev-red", bg: "bg-red-100", label: "Offer" },
    info: { icon: <Bell className="w-4 h-4" />, color: "text-blue-500", bg: "bg-blue-100", label: "Info" },
    warning: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-yellow-500", bg: "bg-yellow-100", label: "Warning" },
    urgent: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-500", bg: "bg-red-100", label: "Urgent" },
    update: { icon: <Sparkles className="w-4 h-4" />, color: "text-purple-500", bg: "bg-purple-100", label: "Update" },
  };

  const priorityConfig: Record<string, { color: string; label: string }> = {
    low: { color: "bg-gray-100 text-gray-600", label: "Low" },
    medium: { color: "bg-blue-100 text-blue-600", label: "Medium" },
    high: { color: "bg-red-100 text-red-600", label: "High" },
  };

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}>
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-ev-navy">Announcements</h2>
            <p className="text-gray-500 text-sm">Manage app announcement carousel • {items.length} announcements</p>
          </div>
        </div>
        <button onClick={openAddDialog} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Announcement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-black text-ev-navy">{items.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-black text-ev-green">{items.filter(i => i.isActive !== false).length}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-black text-ev-orange">{items.filter(i => i.type === "alert" || i.type === "urgent" || i.type === "warning").length}</p>
          <p className="text-xs text-gray-500">Alerts</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-black text-ev-red">{items.filter(i => i.type === "offer").length}</p>
          <p className="text-xs text-gray-500">Offers</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-pink-400 text-sm"
            placeholder="Search announcements..." />
        </div>
      </div>

      {/* Announcement Cards with Live Preview */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Megaphone className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-lg font-bold text-ev-navy mb-2">Announcement Management</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">Create and manage announcements that appear in the home page carousel. Announcements auto-scroll every 3 seconds.</p>
          <button onClick={openAddDialog} className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold shadow-lg">
            <Plus className="w-4 h-4 inline mr-1" /> Add Your First Announcement
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, idx) => {
            const typeConf = announcementTypeConfig[item.type] || announcementTypeConfig.info;
            const prioConf = priorityConfig[item.priority] || priorityConfig.medium;
            return (
              <motion.div key={item.id || item.uid || idx}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Preview Row */}
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Type Badge */}
                    <div className={`w-9 h-9 rounded-xl ${typeConf.bg} ${typeConf.color} flex items-center justify-center flex-shrink-0`}>
                      {typeConf.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-ev-navy truncate">{item.title || "Untitled"}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${typeConf.bg} ${typeConf.color} flex-shrink-0`}>{typeConf.label}</span>
                        {item.priority && <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${prioConf.color} flex-shrink-0`}>{prioConf.label}</span>}
                      </div>
                      {item.description && <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {item.linkType === "internal" ? `→ ${NAVIGATION_VIEWS.find(v => v.value === item.targetView)?.label || item.targetView}` :
                           item.linkType === "external" ? "🌐 External Link" :
                           item.linkType === "detail" ? "📄 Detail View" : "🚫 No Action"}
                        </span>
                        {item.createdAt && <span className="text-xs text-gray-300">• {new Date(item.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                    <button onClick={() => handleToggleActive(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${item.isActive !== false ? "bg-green-100 text-ev-green" : "bg-red-100 text-ev-red"}`}>
                      {item.isActive !== false ? "● Active" : "○ Inactive"}
                    </button>
                    <button onClick={() => openEditDialog(item)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { setDeletingId(item.id || item.uid); setDeleteDialogOpen(true); }} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog with Live Preview */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Announcement" : "Add New Announcement"}</DialogTitle>
            <DialogDescription>Create announcements that appear in the home page carousel</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            {/* Form Side */}
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Title <span className="text-red-500">*</span></Label>
                <Input value={formData.title || ""} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Announcement title" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Description</Label>
                <Textarea value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Announcement details..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">Type</Label>
                  <Select value={formData.type || "new"} onValueChange={v => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(announcementTypeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">Priority</Label>
                  <Select value={formData.priority || "medium"} onValueChange={v => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Click Action</Label>
                <Select value={formData.linkType || "detail"} onValueChange={v => setFormData({ ...formData, linkType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LINK_ACTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(formData.linkType === "internal") && (
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">Navigate To</Label>
                  <Select value={formData.targetView || ""} onValueChange={v => setFormData({ ...formData, targetView: v })}>
                    <SelectTrigger><SelectValue placeholder="Select page..." /></SelectTrigger>
                    <SelectContent>
                      {NAVIGATION_VIEWS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(formData.linkType === "external") && (
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">External URL</Label>
                  <Input value={formData.link || ""} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="https://example.com" />
                </div>
              )}
              {(formData.linkType === "internal" || formData.linkType === "external") && (
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">Link Button Text</Label>
                  <Input value={formData.linkText || ""} onChange={e => setFormData({ ...formData, linkText: e.target.value })} placeholder="e.g. Open Now, Check It" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">Active</Label>
                <Switch checked={formData.isActive ?? true} onCheckedChange={v => setFormData({ ...formData, isActive: v })} />
                <span className="text-sm text-gray-600">{formData.isActive !== false ? "Active" : "Inactive"}</span>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Image</Label>
                {formData.imageUrl && (
                  <img src={formData.imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-xl mb-2 border" />
                )}
                <Input type="file" accept="image/*" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file) { const url = await uploadImage(file, "announcements"); if (url) setFormData({ ...formData, imageUrl: url }); }
                }} />
                <Input value={formData.imageUrl || ""} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="Or paste image URL" className="mt-2" />
              </div>
            </div>
            {/* Live Preview Side */}
            <div className="space-y-3">
              <Label className="text-sm font-bold text-ev-navy">Live Preview</Label>
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-xs text-gray-400 mb-2 text-center">How it looks on the home page</p>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  {/* Simulate the announcement carousel item */}
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const conf = announcementTypeConfig[formData.type] || announcementTypeConfig.info;
                      return <span className={`${conf.bg} ${conf.color} p-1.5 rounded-lg`}>{conf.icon}</span>;
                    })()}
                    <span className="text-sm text-gray-700 truncate">{formData.title || "Announcement Title"}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-auto" />
                  </div>
                  {formData.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1 pl-8">{formData.description}</p>
                  )}
                </div>
              </div>
              {/* Expanded Preview */}
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-xs text-gray-400 mb-2 text-center">Expanded detail view</p>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  {formData.imageUrl && <img src={formData.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />}
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const conf = announcementTypeConfig[formData.type] || announcementTypeConfig.info;
                      return <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${conf.bg} ${conf.color}`}>{conf.label}</span>;
                    })()}
                    {formData.priority && <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${priorityConfig[formData.priority]?.color || "bg-gray-100 text-gray-600"}`}>{priorityConfig[formData.priority]?.label || formData.priority}</span>}
                  </div>
                  <h3 className="font-bold text-ev-navy text-lg mb-1">{formData.title || "Announcement Title"}</h3>
                  {formData.description && <p className="text-sm text-gray-600 whitespace-pre-line">{formData.description}</p>}
                  {(formData.linkType === "internal" || formData.linkType === "external") && formData.linkText && (
                    <button className="mt-3 px-4 py-2 rounded-lg bg-gradient-to-r from-ev-orange to-ev-gold text-white text-sm font-bold">
                      {formData.linkText}
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <p><b>Type:</b> {formData.type || "new"} • <b>Priority:</b> {formData.priority || "medium"}</p>
                <p><b>Click:</b> {formData.linkType === "internal" ? `Navigate to ${NAVIGATION_VIEWS.find(v => v.value === formData.targetView)?.label || "—"}` :
                  formData.linkType === "external" ? `Open ${formData.link || "URL"}` :
                  formData.linkType === "detail" ? "Show detail view" : "No action"}</p>
                <p><b>Status:</b> {formData.isActive !== false ? "Active" : "Inactive"}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {editingItem ? "Update Announcement" : "Create Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This announcement will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== UPCOMING EXAMS ADMIN ====================
function UpcomingExamsAdmin() {
  return (
    <CrudAdminPanel
      title="Upcoming Exams"
      subtitle="Manage upcoming exam notifications"
      icon={CalendarDays}
      color="from-cyan-500 to-blue-600"
      collectionName="upcomingExams"
      fields={[
        { key: "name", label: "Exam Name", type: "text", placeholder: "e.g. WBCS Prelims 2026", required: true },
        { key: "organizingBody", label: "Organizing Body", type: "text", placeholder: "e.g. PSC West Bengal" },
        { key: "category", label: "Category", type: "select", options: EXAM_CATEGORIES, required: true, allowOther: true },
        { key: "subject", label: "Subject", type: "select", options: SUBJECT_CATEGORIES, allowOther: true },
        { key: "examDate", label: "Exam Date", type: "date" },
        { key: "lastApplyDate", label: "Last Apply Date", type: "date" },
        { key: "eligibility", label: "Eligibility", type: "text", placeholder: "e.g. Graduate" },
        { key: "ageLimit", label: "Age Limit", type: "text", placeholder: "e.g. 21-36 years" },
        { key: "applicationFee", label: "Application Fee", type: "text", placeholder: "e.g. ₹200" },
        { key: "syllabus", label: "Syllabus", type: "textarea", placeholder: "Exam syllabus..." },
        { key: "applyLink", label: "Apply Link", type: "url", placeholder: "https://..." },
        { key: "officialLink", label: "Official Link", type: "url", placeholder: "https://..." },
        { key: "status", label: "Status", type: "select", options: [{ label: "Upcoming", value: "upcoming" }, { label: "Ongoing", value: "ongoing" }, { label: "Closed", value: "closed" }] },
        { key: "isActive", label: "Active", type: "switch" },
        { key: "imageUrl", label: "Image", type: "image" },
      ]}
      fetchData={() => adminGetCollection("upcomingExams")}
      onAdd={(data) => adminAddDoc("upcomingExams", data)}
      onUpdate={(id, data) => adminUpdateDoc("upcomingExams", id, data)}
      onDelete={(id) => adminDeleteDoc("upcomingExams", id)}
    />
  );
}

// ==================== DAILY TIPS ADMIN ====================
function DailyTipsAdmin() {
  return (
    <CrudAdminPanel
      title="Daily Tips"
      subtitle="Manage daily study tips & strategies"
      icon={Sparkles}
      color="from-amber-500 to-orange-500"
      collectionName="dailyTips"
      fields={[
        { key: "title", label: "Title", type: "text", placeholder: "Tip title", required: true },
        { key: "description", label: "Description", type: "textarea", placeholder: "Full tip content..." },
        { key: "category", label: "Category", type: "select", options: EXAM_CATEGORIES, allowOther: true },
        { key: "subject", label: "Subject", type: "select", options: SUBJECT_CATEGORIES, allowOther: true },
        { key: "tipType", label: "Tip Type", type: "select", options: [
          { label: "Study", value: "study" }, { label: "Exam Strategy", value: "exam-strategy" },
          { label: "Time Management", value: "time-management" }, { label: "Motivation", value: "motivation" },
          { label: "Others", value: "Others" },
        ], allowOther: true },
        { key: "referenceLink", label: "Reference Link", type: "url", placeholder: "https://..." },
        { key: "isActive", label: "Active", type: "switch" },
        { key: "imageUrl", label: "Image", type: "image" },
      ]}
      fetchData={() => adminGetCollection("dailyTips")}
      onAdd={(data) => adminAddDoc("dailyTips", data)}
      onUpdate={(id, data) => adminUpdateDoc("dailyTips", id, data)}
      onDelete={(id) => adminDeleteDoc("dailyTips", id)}
    />
  );
}

// ==================== NOTIFICATIONS ADMIN ====================
function NotificationsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [notifData, usersData] = await Promise.all([
        adminGetCollection("notifications"),
        adminGetCollection("users"),
      ]);
      if (Array.isArray(notifData)) setItems(notifData);
      if (Array.isArray(usersData)) setUsers(usersData);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ title: "", message: "", type: "info", targetUsers: "all", linkType: "internal", targetView: "", link: "", imageUrl: "", targetUserIds: [] });
    setSelectedUserIds([]);
    setUserSearch("");
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ title: item.title || "", message: item.message || "", type: item.type || "info", targetUsers: item.targetUsers || "all", linkType: item.linkType || "internal", targetView: item.targetView || "", link: item.link || "", imageUrl: item.imageUrl || "" });
    setSelectedUserIds(item.targetUserIds || []);
    setUserSearch("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title) { showToast("Title is required", "error"); return; }
    setSaving(true);
    try {
      const data = { ...formData, targetUserIds: formData.targetUsers === "specific" ? selectedUserIds : [] };
      if (editingItem) {
        await adminUpdateDoc("notifications", editingItem.id, data);
        showToast("Notification updated", "success");
      } else {
        await adminAddDoc("notifications", data);
        showToast("Notification created", "success");
      }
      setDialogOpen(false);
      loadData();
    } catch (e) { showToast("Save failed", "error"); console.error(e); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await adminDeleteDoc("notifications", deletingId);
      showToast("Notification deleted");
      setDeleteDialogOpen(false);
      loadData();
    } catch (e) { showToast("Delete failed", "error"); }
  };

  const toggleUser = (uid: string) => {
    setSelectedUserIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const filteredUsers = users.filter((u: any) =>
    !userSearch || (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) || (u.email || "").toLowerCase().includes(userSearch.toLowerCase()) || (u.phone || "").includes(userSearch)
  );

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-ev-orange" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-ev-navy flex items-center gap-2"><BellRing className="w-7 h-7" /> Notifications</h2><p className="text-gray-500 text-sm">Manage push notifications</p></div>
        <button onClick={openAdd} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Add Notification</button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-gray-50"><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Target</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell><span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${item.type === "promo" ? "bg-ev-gold-light text-ev-gold" : item.type === "warning" ? "bg-red-50 text-red-600" : item.type === "success" ? "bg-green-50 text-ev-green" : "bg-blue-50 text-blue-600"}`}>{item.type}</span></TableCell>
                <TableCell>
                  {item.targetUsers === "all" ? <span className="text-sm font-medium text-gray-600">All Users</span> : (
                    <span className="text-sm font-medium text-purple-600">
                      {(item.targetUserIds || []).length} user{(item.targetUserIds || []).length !== 1 ? "s" : ""} selected
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { setDeletingId(item.id); setDeleteDialogOpen(true); }} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-400">No notifications yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Notification" : "New Notification"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="font-medium">Title *</Label><Input value={formData.title || ""} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Notification title" /></div>
            <div><Label className="font-medium">Message</Label><Textarea value={formData.message || ""} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="Notification message..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="font-medium">Type</Label><Select value={formData.type || "info"} onValueChange={v => setFormData({ ...formData, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="promo">Promo</SelectItem></SelectContent></Select></div>
              <div><Label className="font-medium">Target</Label><Select value={formData.targetUsers || "all"} onValueChange={v => { setFormData({ ...formData, targetUsers: v }); if (v === "all") setSelectedUserIds([]); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Users</SelectItem><SelectItem value="specific">Specific Users</SelectItem></SelectContent></Select></div>
            </div>

            {/* User Selection — only when "Specific Users" */}
            {formData.targetUsers === "specific" && (
              <div className="space-y-2">
                <Label className="font-medium">Select Users ({selectedUserIds.length} selected)</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name, email, phone..." className="pl-9" />
                </div>
                <div className="border rounded-xl max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 && <div className="p-3 text-center text-sm text-gray-400">No users found</div>}
                  {filteredUsers.map((u: any) => {
                    const isChecked = selectedUserIds.includes(u.id);
                    return (
                      <label key={u.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors ${isChecked ? "bg-indigo-50" : ""}`}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isChecked ? "bg-indigo-500 border-indigo-500" : "border-gray-300"}`}>
                          {isChecked && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ev-navy truncate">{u.name || "Unknown"}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email || u.phone || "—"}</p>
                        </div>
                        {u.role === "admin" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-500">ADMIN</span>}
                      </label>
                    );
                  })}
                </div>
                {selectedUserIds.length > 0 && (
                  <button onClick={() => setSelectedUserIds([])} className="text-xs text-red-500 hover:text-red-600 font-medium">Clear selection ({selectedUserIds.length})</button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><Label className="font-medium">Click Action</Label><Select value={formData.linkType || "internal"} onValueChange={v => setFormData({ ...formData, linkType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LINK_ACTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
              {formData.linkType === "internal" && (
                <div><Label className="font-medium">Navigate To</Label><Select value={formData.targetView || ""} onValueChange={v => setFormData({ ...formData, targetView: v })}><SelectTrigger><SelectValue placeholder="Select page..." /></SelectTrigger><SelectContent>{NAVIGATION_VIEWS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent></Select></div>
              )}
              {formData.linkType === "external" && (
                <div><Label className="font-medium">External URL</Label><Input value={formData.link || ""} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="https://..." /></div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Notification?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {toast && <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg text-white font-medium text-sm z-50 ${toast.type === "success" ? "bg-ev-green" : "bg-red-500"}`}>{toast.message}</div>}
    </div>
  );
}

// ==================== PREVIOUS PAPERS ADMIN (ENHANCED) ====================
function PreviousPapersAdmin() {
  return (
    <CrudAdminPanel
      title="Previous Papers"
      subtitle="Manage PYQ papers & downloads"
      icon={FileText}
      color="from-ev-orange to-amber-500"
      collectionName="previousPapers"
      fields={[
        { key: "name", label: "Paper Name", type: "text", placeholder: "e.g. WBCS 2025 Prelims", required: true },
        { key: "year", label: "Year", type: "number", placeholder: "2025" },
        { key: "category", label: "Category", type: "select", options: EXAM_CATEGORIES, required: true, allowOther: true },
        { key: "subject", label: "Subject", type: "select", options: SUBJECT_CATEGORIES, allowOther: true },
        { key: "examType", label: "Exam Type", type: "select", options: [
          { label: "Prelims", value: "Prelims" }, { label: "Mains", value: "Mains" },
          { label: "Tier I", value: "Tier I" }, { label: "Tier II", value: "Tier II" },
          { label: "Full", value: "Full" }, { label: "Others", value: "Others" },
        ], allowOther: true },
        { key: "totalQuestions", label: "Total Questions", type: "number" },
        { key: "totalMarks", label: "Total Marks", type: "number" },
        { key: "duration", label: "Duration (min)", type: "number" },
        { key: "description", label: "Description", type: "textarea", placeholder: "Paper description, topics covered..." },
        { key: "downloadUrl", label: "Download URL / File", type: "file" },
        { key: "solutionUrl", label: "Solution URL", type: "url", placeholder: "Solution PDF link" },
        { key: "price", label: "Price (₹)", type: "number", placeholder: "49" },
        { key: "accessType", label: "Free/Premium", type: "select", options: [
          { label: "🆓 Free", value: "free" }, { label: "👑 Premium", value: "premium" },
        ], required: true },
        { key: "isActive", label: "Active", type: "switch" },
        { key: "imageUrl", label: "Thumbnail", type: "image" },
      ]}
      fetchData={() => adminGetCollection("previousPapers")}
      onAdd={(data) => adminAddDoc("previousPapers", data)}
      onUpdate={(id, data) => adminUpdateDoc("previousPapers", id, data)}
      onDelete={(id) => adminDeleteDoc("previousPapers", id)}
    />
  );
}

// ==================== NOTES ADMIN (ENHANCED) ====================
function NotesAdmin() {
  return (
    <CrudAdminPanel
      title="Notes"
      subtitle="Manage study materials & notes"
      icon={Notebook}
      color="from-teal-500 to-teal-600"
      collectionName="notes"
      fields={[
        { key: "title", label: "Title", type: "text", placeholder: "e.g. Indian History Notes", required: true },
        { key: "category", label: "Category", type: "select", options: SUBJECT_CATEGORIES, required: true, allowOther: true },
        { key: "examCategory", label: "Exam Category", type: "select", options: EXAM_CATEGORIES, allowOther: true },
        { key: "author", label: "Author", type: "text", placeholder: "e.g. ExamVault Team" },
        { key: "pages", label: "Pages", type: "number" },
        { key: "language", label: "Language", type: "select", options: [
          { label: "English", value: "English" }, { label: "Hindi", value: "Hindi" },
          { label: "Bengali", value: "Bengali" }, { label: "Assamese", value: "Assamese" },
        ] },
        { key: "description", label: "Description", type: "textarea", placeholder: "What's covered in these notes..." },
        { key: "topics", label: "Topics Covered", type: "textarea", placeholder: "Ancient India, Medieval India, etc." },
        { key: "downloadUrl", label: "Download URL / File", type: "file" },
        { key: "price", label: "Price (₹)", type: "number", placeholder: "49" },
        { key: "accessType", label: "Free/Premium", type: "select", options: [
          { label: "🆓 Free", value: "free" }, { label: "👑 Premium", value: "premium" },
        ], required: true },
        { key: "isActive", label: "Active", type: "switch" },
        { key: "imageUrl", label: "Thumbnail", type: "image" },
      ]}
      fetchData={() => adminGetCollection("notes")}
      onAdd={(data) => adminAddDoc("notes", data)}
      onUpdate={(id, data) => adminUpdateDoc("notes", id, data)}
      onDelete={(id) => adminDeleteDoc("notes", id)}
    />
  );
}

// ==================== USERS ADMIN ====================
function UsersAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetCollection("users");
      if (Array.isArray(data)) {
        data.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setUsers(data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSyncUsers = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await adminSyncUsers();
      const msg = `Synced! Total Auth users: ${result.totalAuthUsers}, Already in Firestore: ${result.existingInFirestore}, Newly created: ${result.syncedNew}`;
      setSyncResult(msg);
      // Reload users after sync
      await loadUsers();
    } catch (e: any) {
      setSyncResult(`Sync failed: ${e.message}`);
    }
    setSyncing(false);
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return "-"; }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ev-navy to-blue-800 flex items-center justify-center shadow-lg"><Users className="w-6 h-6 text-white" /></div>
          <div><h2 className="text-2xl font-black text-ev-navy">Users</h2><p className="text-gray-500 text-sm">{users.length} registered users</p></div>
        </div>
        <Button
          onClick={handleSyncUsers}
          disabled={syncing}
          className="bg-gradient-to-r from-ev-navy to-blue-800 text-white hover:opacity-90 gap-2"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? "Syncing..." : "Sync from Auth"}
        </Button>
      </div>

      {syncResult && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${syncResult.startsWith("Sync failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {syncResult}
        </div>
      )}

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ev-orange" /></div> : users.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-ev-navy mb-2">No Users Yet</h3>
          <p className="text-gray-400 text-sm mb-4">Registered users will appear here</p>
          <Button onClick={handleSyncUsers} disabled={syncing} className="bg-ev-orange text-white hover:opacity-90 gap-2">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync from Firebase Auth
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table><TableHeader><TableRow><TableHead className="font-semibold text-ev-navy">Name</TableHead><TableHead className="font-semibold text-ev-navy">Email</TableHead><TableHead className="font-semibold text-ev-navy">Role</TableHead><TableHead className="font-semibold text-ev-navy">Phone</TableHead><TableHead className="font-semibold text-ev-navy">Joined</TableHead></TableRow></TableHeader>
          <TableBody>{users.map(u => (<TableRow key={u.id}><TableCell className="font-medium">{u.name || u.displayName || "-"}</TableCell><TableCell>{u.email || "-"}</TableCell><TableCell><span className={`px-2 py-1 rounded-lg text-xs font-bold ${u.role === "admin" ? "bg-ev-orange/10 text-ev-orange" : "bg-blue-50 text-blue-600"}`}>{u.role || "user"}</span></TableCell><TableCell>{u.phone || u.phoneNumber || "-"}</TableCell><TableCell className="text-gray-500 text-xs">{formatDate(u.createdAt)}</TableCell></TableRow>))}</TableBody></Table>
        </div>
      )}
    </div>
  );
}

// ==================== SUPPORT ADMIN ====================
function SupportAdmin() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [resolvingTicket, setResolvingTicket] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetCollection("supportTickets");
      if (Array.isArray(data)) {
        data.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setTickets(data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleResolve = async (ticketId: string) => {
    setResolvingTicket(ticketId);
    try {
      await adminUpdateDoc("supportTickets", ticketId, {
        status: "resolved",
        resolvedAt: new Date().toISOString(),
      });
      showToast("Ticket marked as resolved!", "success");
      // Update local state
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "resolved", resolvedAt: new Date().toISOString() } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev: any) => ({ ...prev, status: "resolved", resolvedAt: new Date().toISOString() }));
      }
    } catch (e: any) {
      showToast(`Failed to resolve: ${e.message}`, "error");
    }
    setResolvingTicket(null);
  };

  const handleReopen = async (ticketId: string) => {
    setResolvingTicket(ticketId);
    try {
      await adminUpdateDoc("supportTickets", ticketId, {
        status: "open",
        resolvedAt: null,
      });
      showToast("Ticket reopened!", "success");
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "open", resolvedAt: null } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev: any) => ({ ...prev, status: "open", resolvedAt: null }));
      }
    } catch (e: any) {
      showToast(`Failed to reopen: ${e.message}`, "error");
    }
    setResolvingTicket(null);
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const existingReplies = selectedTicket.replies || [];
      const newReply = {
        message: replyText.trim(),
        fromAdmin: true,
        sentAt: new Date().toISOString(),
      };
      await adminUpdateDoc("supportTickets", selectedTicket.id, {
        replies: [...existingReplies, newReply],
        lastReplyAt: new Date().toISOString(),
        status: selectedTicket.status === "resolved" ? "resolved" : "in-progress",
      });
      showToast("Reply sent!", "success");
      // Update local state
      const updatedTicket = {
        ...selectedTicket,
        replies: [...existingReplies, newReply],
        lastReplyAt: new Date().toISOString(),
        status: selectedTicket.status === "resolved" ? "resolved" : "in-progress",
      };
      setSelectedTicket(updatedTicket);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
      setReplyText("");
    } catch (e: any) {
      showToast(`Failed to send reply: ${e.message}`, "error");
    }
    setSendingReply(false);
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return "-"; }
  };

  const openTickets = tickets.filter(t => t.status !== "resolved").length;
  const resolvedTickets = tickets.filter(t => t.status === "resolved").length;

  // ==================== TICKET DETAIL VIEW ====================
  if (selectedTicket) {
    return (
      <div>
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}
            >
              {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back button */}
        <button
          onClick={() => setSelectedTicket(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-ev-navy mb-4 text-sm font-medium transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Tickets
        </button>

        {/* Ticket Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-black text-ev-navy">{selectedTicket.subject || "No Subject"}</h2>
              <p className="text-sm text-gray-500 mt-1">
                From: <span className="font-medium text-ev-navy">{selectedTicket.userName || selectedTicket.userEmail || "Unknown User"}</span>
                {selectedTicket.userEmail && selectedTicket.userName && (
                  <span className="text-gray-400"> ({selectedTicket.userEmail})</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                selectedTicket.status === "open" ? "bg-amber-50 text-amber-600" :
                selectedTicket.status === "in-progress" ? "bg-blue-50 text-blue-600" :
                "bg-green-50 text-emerald-600"
              }`}>
                {selectedTicket.status === "in-progress" ? "In Progress" : selectedTicket.status?.charAt(0).toUpperCase() + selectedTicket.status?.slice(1)}
              </span>
              {selectedTicket.priority && (
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  selectedTicket.priority === "high" ? "bg-red-50 text-red-600" :
                  selectedTicket.priority === "medium" ? "bg-amber-50 text-amber-600" :
                  "bg-blue-50 text-blue-600"
                }`}>
                  {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)} Priority
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>Created: {formatDate(selectedTicket.createdAt)}</span>
            {selectedTicket.category && <span>Category: {selectedTicket.category}</span>}
            {selectedTicket.resolvedAt && <span>Resolved: {formatDate(selectedTicket.resolvedAt)}</span>}
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h3 className="font-bold text-ev-navy mb-4">Conversation</h3>

          {/* Original message */}
          <div className="mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-ev-navy flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{(selectedTicket.userName || "U").charAt(0)}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-ev-navy">{selectedTicket.userName || "User"}</span>
                  <span className="text-xs text-gray-400">{formatDate(selectedTicket.createdAt)}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedTicket.message || selectedTicket.description || "No message content"}
                </div>
              </div>
            </div>
          </div>

          {/* Replies */}
          {(selectedTicket.replies || []).map((reply: any, idx: number) => (
            <div key={idx} className="mb-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  reply.fromAdmin ? "bg-ev-orange" : "bg-ev-navy"
                }`}>
                  <span className="text-white text-xs font-bold">{reply.fromAdmin ? "A" : (selectedTicket.userName || "U").charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-ev-navy">
                      {reply.fromAdmin ? "Admin" : selectedTicket.userName || "User"}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(reply.sentAt)}</span>
                  </div>
                  <div className={`rounded-xl p-4 text-sm whitespace-pre-wrap ${
                    reply.fromAdmin ? "bg-ev-orange/5 border border-ev-orange/20 text-gray-700" : "bg-gray-50 text-gray-700"
                  }`}>
                    {reply.message}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Reply input */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-ev-orange flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-ev-navy mb-2 block">Reply to this ticket</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={3}
                  className="mb-3 resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleReply}
                    disabled={!replyText.trim() || sendingReply}
                    className="bg-ev-orange hover:bg-ev-orange/90 text-white"
                  >
                    {sendingReply ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</> : <><Mail className="w-4 h-4 mr-2" />Send Reply</>}
                  </Button>
                  {selectedTicket.status !== "resolved" ? (
                    <Button
                      onClick={() => handleResolve(selectedTicket.id)}
                      disabled={resolvingTicket === selectedTicket.id}
                      variant="outline"
                      className="border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                    >
                      {resolvingTicket === selectedTicket.id ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Resolving...</> : <><CheckCircle className="w-4 h-4 mr-2" />Resolve Ticket</>}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleReopen(selectedTicket.id)}
                      disabled={resolvingTicket === selectedTicket.id}
                      variant="outline"
                      className="border-amber-300 text-amber-600 hover:bg-amber-50"
                    >
                      {resolvingTicket === selectedTicket.id ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Reopening...</> : <><RefreshCw className="w-4 h-4 mr-2" />Reopen Ticket</>}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== TICKETS LIST VIEW ====================
  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}
          >
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ev-green to-teal-600 flex items-center justify-center shadow-lg"><Headphones className="w-6 h-6 text-white" /></div>
          <div>
            <h2 className="text-2xl font-black text-ev-navy">Support Tickets</h2>
            <p className="text-gray-500 text-sm">{tickets.length} tickets ({openTickets} open, {resolvedTickets} resolved)</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadTickets} className="text-sm">
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ev-orange" /></div> : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <Headphones className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-ev-navy mb-2">No Support Tickets</h3>
          <p className="text-gray-400 text-sm">Tickets from users will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <motion.div
              key={t.id}
              whileHover={{ scale: 1.005 }}
              onClick={() => setSelectedTicket(t)}
              className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${
                t.status === "resolved" ? "border-green-100 opacity-75" : t.status === "in-progress" ? "border-blue-100" : "border-amber-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-ev-navy text-sm truncate">{t.subject || "No Subject"}</h3>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${
                      t.status === "open" ? "bg-amber-50 text-amber-600" :
                      t.status === "in-progress" ? "bg-blue-50 text-blue-600" :
                      "bg-green-50 text-emerald-600"
                    }`}>
                      {t.status === "in-progress" ? "In Progress" : t.status?.charAt(0).toUpperCase() + t.status?.slice(1)}
                    </span>
                    {t.priority && (
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${
                        t.priority === "high" ? "bg-red-50 text-red-600" :
                        t.priority === "medium" ? "bg-amber-50 text-amber-600" :
                        "bg-blue-50 text-blue-600"
                      }`}>
                        {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{t.userName || t.userEmail || "Unknown"}</span>
                    <span>{t.category || "General"}</span>
                    <span>{formatDate(t.createdAt)}</span>
                    {t.replies?.length > 0 && <span className="text-ev-orange font-medium">{t.replies.length} {t.replies.length === 1 ? "reply" : "replies"}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {t.status !== "resolved" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); handleResolve(t.id); }}
                      disabled={resolvingTicket === t.id}
                      className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 text-xs"
                    >
                      {resolvingTicket === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                      Resolve
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); handleReopen(t.id); }}
                      disabled={resolvingTicket === t.id}
                      className="border-amber-300 text-amber-600 hover:bg-amber-50 text-xs"
                    >
                      {resolvingTicket === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                      Reopen
                    </Button>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== CATEGORIES ADMIN ====================
function CategoriesAdmin() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExamCategory, setNewExamCategory] = useState("");
  const [newSubjectCategory, setNewSubjectCategory] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetCollection("categories");
      if (Array.isArray(data)) {
        setCategories(data);
        // Update globals
        const exams = data.filter((c: any) => c.type === "exam");
        const subjects = data.filter((c: any) => c.type === "subject");
        if (exams.length > 0) EXAM_CATEGORIES = exams.map((c: any) => ({ label: c.name, value: c.name }));
        if (subjects.length > 0) SUBJECT_CATEGORIES = subjects.map((c: any) => ({ label: c.name, value: c.name }));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const handleAddCategory = async (type: "exam" | "subject", name: string) => {
    if (!name.trim()) return;
    setAdding(type);
    try {
      // Check if already exists
      const exists = categories.some(c => c.type === type && c.name.toLowerCase() === name.trim().toLowerCase());
      if (exists) {
        showToast(`${type === "exam" ? "Exam" : "Subject"} category "${name}" already exists!`, "error");
        setAdding(null);
        return;
      }
      await adminAddDoc("categories", { name: name.trim(), type, createdAt: new Date().toISOString() });
      showToast(`${type === "exam" ? "Exam" : "Subject"} category "${name}" added!`, "success");
      if (type === "exam") setNewExamCategory("");
      else setNewSubjectCategory("");
      loadCategories();
    } catch (e: any) {
      showToast(`Failed to add: ${e.message}`, "error");
    }
    setAdding(null);
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    try {
      await adminDeleteDoc("categories", catId);
      showToast(`Category "${catName}" deleted!`, "success");
      loadCategories();
    } catch (e: any) {
      showToast(`Failed to delete: ${e.message}`, "error");
    }
  };

  const examCategories = categories.filter(c => c.type === "exam");
  const subjectCategories = categories.filter(c => c.type === "subject");

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}
          >
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
            <Tag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-ev-navy">Categories</h2>
            <p className="text-gray-500 text-sm">Manage exam & subject categories</p>
          </div>
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ev-orange" /></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exam Categories */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ev-orange to-amber-500 flex items-center justify-center shadow">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-ev-navy">Exam Categories</h3>
                <p className="text-xs text-gray-400">{examCategories.length} categories</p>
              </div>
            </div>
            {/* Add new */}
            <div className="flex gap-2 mb-4">
              <Input
                value={newExamCategory}
                onChange={e => setNewExamCategory(e.target.value)}
                placeholder="New exam category..."
                onKeyDown={e => { if (e.key === "Enter") handleAddCategory("exam", newExamCategory); }}
                className="flex-1"
              />
              <Button
                onClick={() => handleAddCategory("exam", newExamCategory)}
                disabled={!newExamCategory.trim() || adding === "exam"}
                className="bg-ev-orange hover:bg-ev-orange/90 text-white"
              >
                {adding === "exam" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
            {/* List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {examCategories.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No exam categories yet</p>
              ) : examCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-ev-orange" />
                    <span className="font-medium text-sm text-ev-navy">{cat.name}</span>
                  </div>
                  <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Categories */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-ev-navy">Subject Categories</h3>
                <p className="text-xs text-gray-400">{subjectCategories.length} categories</p>
              </div>
            </div>
            {/* Add new */}
            <div className="flex gap-2 mb-4">
              <Input
                value={newSubjectCategory}
                onChange={e => setNewSubjectCategory(e.target.value)}
                placeholder="New subject category..."
                onKeyDown={e => { if (e.key === "Enter") handleAddCategory("subject", newSubjectCategory); }}
                className="flex-1"
              />
              <Button
                onClick={() => handleAddCategory("subject", newSubjectCategory)}
                disabled={!newSubjectCategory.trim() || adding === "subject"}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {adding === "subject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
            {/* List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {subjectCategories.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No subject categories yet</p>
              ) : subjectCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-medium text-sm text-ev-navy">{cat.name}</span>
                  </div>
                  <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SETTINGS ADMIN ====================
function SettingsAdmin() {
  const [appName, setAppName] = useState("EXAMVAULT");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [contactEmail, setContactEmail] = useState("support@examvault.app");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Use admin API to load settings (bypasses Firestore security rules)
        const settings = await adminGetAppSettings();
        if (settings) {
          setAppName(settings.appName || "EXAMVAULT");
          setAppVersion(settings.appVersion || "1.0.0");
          setContactEmail(settings.contactEmail || "support@examvault.app");
          setContactPhone(settings.contactPhone || "");
          setWhatsappNumber(settings.whatsappNumber || "");
          setInstagramUrl(settings.instagramUrl || "");
          setYoutubeUrl(settings.youtubeUrl || "");
          setTelegramUrl(settings.telegramUrl || "");
          setWebsiteUrl(settings.websiteUrl || "");
          setMaintenanceMode(settings.maintenanceMode || false);
          setForceUpdate(settings.forceUpdate || false);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const settingsData = {
        appName, maintenanceMode, forceUpdate, appVersion, contactEmail,
        contactPhone, whatsappNumber, instagramUrl, youtubeUrl, telegramUrl, websiteUrl,
      };
      await adminUpdateAppSettings(settingsData);
      // Also update the Zustand store and localStorage so user app reflects changes immediately
      try {
        const { useAppStore } = await import('@/lib/store');
        useAppStore.getState().setAppSettings(settingsData);
      } catch (storeErr) { console.warn('Could not update store:', storeErr); }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("Error saving settings:", e);
      setSaveError(msg);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ev-orange" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shadow-lg"><Sliders className="w-6 h-6 text-white" /></div>
          <div><h2 className="text-2xl font-black text-ev-navy">App Settings</h2><p className="text-gray-500 text-sm">Configure app appearance & behavior</p></div>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* General Settings */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-ev-navy mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"><Settings className="w-4 h-4 text-white" /></div>
            General
          </h3>
          <div className="space-y-4">
            <div><Label className="mb-1.5 block font-medium">App Name</Label><Input value={appName} onChange={e => setAppName(e.target.value)} className="max-w-md" /></div>
            <div><Label className="mb-1.5 block font-medium">App Version</Label><Input value={appVersion} onChange={e => setAppVersion(e.target.value)} className="max-w-md" /></div>
            <div className="flex items-center justify-between"><div><Label className="font-medium">Maintenance Mode</Label><p className="text-gray-500 text-xs">Temporarily disable app for users</p></div><Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} /></div>
            <div className="flex items-center justify-between"><div><Label className="font-medium">Force Update</Label><p className="text-gray-500 text-xs">Require users to update the app</p></div><Switch checked={forceUpdate} onCheckedChange={setForceUpdate} /></div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-ev-navy mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center"><Phone className="w-4 h-4 text-white" /></div>
            Contact Information
          </h3>
          <div className="space-y-4">
            <div><Label className="mb-1.5 block font-medium">Support Email</Label><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="support@example.com" className="max-w-md" /><p className="text-gray-400 text-xs mt-1">This email will be shown in Support tab</p></div>
            <div><Label className="mb-1.5 block font-medium">Support Phone Number</Label><Input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+91 98765 43210" className="max-w-md" /><p className="text-gray-400 text-xs mt-1">Phone number shown to users for support</p></div>
            <div><Label className="mb-1.5 block font-medium">WhatsApp Number</Label><Input type="tel" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+91 98765 43210" className="max-w-md" /><p className="text-gray-400 text-xs mt-1">WhatsApp number for chat support (include country code)</p></div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-ev-navy mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center"><Globe className="w-4 h-4 text-white" /></div>
            Social Media & Links
          </h3>
          <div className="space-y-4">
            <div><Label className="mb-1.5 block font-medium">Instagram URL</Label><Input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." className="max-w-md" /></div>
            <div><Label className="mb-1.5 block font-medium">YouTube URL</Label><Input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." className="max-w-md" /></div>
            <div><Label className="mb-1.5 block font-medium">Telegram URL</Label><Input type="url" value={telegramUrl} onChange={e => setTelegramUrl(e.target.value)} placeholder="https://t.me/..." className="max-w-md" /></div>
            <div><Label className="mb-1.5 block font-medium">Website URL</Label><Input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://examvault.app" className="max-w-md" /></div>
          </div>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
            <strong>Save Error:</strong> {saveError}
            {saveError.includes("permission") && (
              <p className="mt-1 text-xs text-red-600">
                Fix: Go to Firebase Console → Firestore Database → Rules → Change to allow read/write for authenticated users
              </p>
            )}
          </div>
        )}
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-ev-orange to-ev-gold text-white px-8">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><CheckCircle className="w-4 h-4 mr-2" />Saved!</> : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

// ==================== DATA MANAGEMENT ADMIN ====================
function BulkImportAdmin() {
  const [clearingCollection, setClearingCollection] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clearingAll, setClearingAll] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [firebaseCounts, setFirebaseCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm });
  };

  const COLLECTIONS = [
    { key: "mockTests", label: "Mock Tests", icon: BookOpen, color: "from-ev-orange to-orange-600" },
    { key: "previousPapers", label: "Previous Papers", icon: FileText, color: "from-ev-orange to-amber-500" },
    { key: "notes", label: "Notes", icon: Notebook, color: "from-teal-500 to-teal-600" },
    { key: "dailyQuiz", label: "Daily Quiz", icon: Brain, color: "from-purple-500 to-purple-600" },
    { key: "testSeries", label: "Test Series", icon: Trophy, color: "from-ev-gold to-amber-500" },
    { key: "banners", label: "Banners", icon: Image, color: "from-ev-orange to-red-500" },
    { key: "upcomingExams", label: "Upcoming Exams", icon: CalendarDays, color: "from-cyan-500 to-blue-600" },
    { key: "dailyTips", label: "Daily Tips", icon: Sparkles, color: "from-amber-500 to-orange-500" },
    { key: "announcements", label: "Announcements", icon: Megaphone, color: "from-pink-500 to-rose-600" },
    { key: "notifications", label: "Notifications", icon: BellRing, color: "from-indigo-500 to-purple-600" },
    { key: "freeTests", label: "Free Tests", icon: Zap, color: "from-green-500 to-emerald-600" },
    { key: "popularTests", label: "Popular Tests", icon: Star, color: "from-amber-500 to-yellow-600" },
    { key: "questions", label: "Questions", icon: FileQuestion, color: "from-blue-500 to-indigo-600" },
    { key: "supportTickets", label: "Support Tickets", icon: Headphones, color: "from-ev-green to-teal-600" },
  ];

  // Fetch real document counts from Firebase on mount (using admin API)
  const fetchCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const counts: Record<string, number> = {};
      for (const col of COLLECTIONS) {
        try {
          const data = await adminGetCollection(col.key);
          counts[col.key] = Array.isArray(data) ? data.length : 0;
        } catch (e) {
          counts[col.key] = 0;
        }
      }
      setFirebaseCounts(counts);
    } catch (e) { console.error(e); }
    setLoadingCounts(false);
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const clearCollection = async (colKey: string) => {
    setClearingCollection(colKey);
    setErrors(prev => { const n = {...prev}; delete n[colKey]; return n; });
    try {
      const result = await adminClearCollection(colKey);
      const deleted = result?.deleted || 0;
      showToast(`🗑️ ${deleted} items deleted from ${colKey}`, "success");
      fetchCounts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error(`Clear error for ${colKey}:`, msg);
      setErrors(prev => ({ ...prev, [colKey]: msg }));
      showToast(`❌ Failed to clear ${colKey}: ${msg}`, "error");
    }
    setClearingCollection(null);
  };

  const clearAllData = async () => {
    setClearingAll(true);
    setErrors({});
    try {
      const result = await adminClearAll();
      const deleted = result?.deleted || 0;
      showToast(`🗑️ All data cleared! (${deleted} documents deleted)`, "success");
      fetchCounts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("Clear all error:", msg);
      showToast(`❌ Failed to clear all data: ${msg}`, "error");
    }
    setClearingAll(false);
  };

  const totalDocs = Object.values(firebaseCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}
          >
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
            <Trash2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-ev-navy">Data Management</h2>
            <p className="text-gray-500 text-sm">View & manage Firebase collections</p>
          </div>
        </div>
      </div>

      {/* Firebase Data Overview */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-ev-navy">Firebase Data Overview</span>
          <span className="text-sm font-bold text-emerald-600">{loadingCounts ? "Loading..." : `${totalDocs} total documents`}</span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mt-2">
          {COLLECTIONS.map(col => {
            const count = firebaseCounts[col.key] ?? 0;
            return (
              <div key={col.key} className="text-center">
                <div className={`w-full h-2.5 rounded-full transition-all ${count > 0 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                <p className="text-[10px] text-gray-500 mt-1.5 truncate">{col.label}</p>
                <p className="text-sm font-bold text-ev-navy">{loadingCounts ? "..." : count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collection Cards Grid - Clear only */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {COLLECTIONS.map(col => {
          const Icon = col.icon;
          const isClearing = clearingCollection === col.key;
          const count = firebaseCounts[col.key] ?? 0;
          const hasError = !!errors[col.key];

          return (
            <motion.div
              key={col.key}
              whileHover={{ scale: 1.02 }}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${hasError ? "border-red-200" : count > 0 ? "border-emerald-100" : "border-gray-100"}`}
            >
              <div className={`h-2 bg-gradient-to-r ${col.color}`} />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${col.color} flex items-center justify-center shadow`}><Icon className="w-5 h-5 text-white" /></div>
                  <div>
                    <h3 className="font-bold text-ev-navy text-sm">{col.label}</h3>
                    <p className="text-xs text-gray-400">{loadingCounts ? "..." : `${count} documents in DB`}</p>
                  </div>
                </div>
                {hasError && <p className="text-xs text-red-500 mb-3 truncate">Error: {errors[col.key]}</p>}
                <Button
                  onClick={() => showConfirm(
                    `Clear ${col.label}?`,
                    `This will permanently delete all ${count} items in "${col.label}" from Firebase. This cannot be undone.`,
                    () => clearCollection(col.key)
                  )}
                  disabled={isClearing || clearingAll || count === 0}
                  variant="outline"
                  className="w-full text-sm font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                >
                  {isClearing ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Clearing...</>
                  ) : (
                    <><Trash2 className="w-4 h-4 mr-2" />Clear {count} Items</>
                  )}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Clear All Button */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-ev-navy text-lg">Clear All Data</h3>
            <p className="text-gray-500 text-sm">Permanently delete all data from all collections in Firebase</p>
          </div>
          <Button
            onClick={() => showConfirm(
              "⚠️ Clear ALL Data?",
              `This will permanently delete ALL ${totalDocs} documents from ALL collections in Firebase. This action CANNOT be undone! Are you sure?`,
              clearAllData
            )}
            disabled={clearingAll || totalDocs === 0}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 font-semibold px-6 py-3 disabled:opacity-40"
          >
            {clearingAll ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" />Clearing...</>
            ) : (
              <><Trash2 className="w-5 h-5 mr-2" />Clear All Data ({totalDocs} docs)</>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-ev-navy mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-gray-600 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDialog(null)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    action();
                  }}
                  className="px-6 bg-red-600 text-white hover:bg-red-700"
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== PLANS ADMIN ====================
function PlansAdmin() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", price: 0, originalPrice: 0,
    durationDays: 30, type: "subscription" as "subscription" | "one_time", planType: "premium" as "free" | "premium", subject: "",
    features: "", isActive: true, isPopular: false, order: 0,
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPlans = useCallback(async () => {
    try {
      const data = await getAllPlans();
      // Normalize: ensure features is always an array (seed data may store it as a string)
      const normalized = data.map((p: any) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : typeof p.features === "string" ? p.features.split(",") : [],
        durationDays: p.durationDays ?? p.duration ?? 0,
        type: p.type === "subscription" || p.type === "one_time" ? p.type : "subscription",
        planType: p.planType === "free" || p.planType === "premium" ? p.planType : (p.price === 0 ? "free" : "premium"),
        isPopular: p.isPopular ?? false,
        order: p.order ?? 0,
      }));
      setPlans(normalized);
    } catch (e) { console.error("Load plans error:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const resetForm = () => {
    setFormData({ name: "", description: "", price: 0, originalPrice: 0, durationDays: 30, type: "subscription", planType: "premium", subject: "", features: "", isActive: true, isPopular: false, order: 0 });
    setEditingPlan(null);
    setShowForm(false);
  };

  const handleEdit = (plan: PlanData) => {
    setEditingPlan(plan);
    const resolvedPlanType = (plan as any).planType || (plan.price === 0 ? "free" : "premium");
    setFormData({
      name: plan.name, description: plan.description, price: plan.price,
      originalPrice: plan.originalPrice || 0, durationDays: plan.durationDays ?? plan.duration ?? 0,
      type: plan.type, planType: resolvedPlanType as "free" | "premium", subject: plan.subject || "", features: Array.isArray(plan.features) ? plan.features.join("\n") : String(plan.features || ""),
      isActive: plan.isActive, isPopular: plan.isPopular ?? false, order: plan.order ?? 0,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const planData: any = {
        name: formData.name,
        description: formData.description,
        price: formData.planType === "free" ? 0 : Number(formData.price),
        durationDays: Number(formData.durationDays),
        type: formData.type,
        planType: formData.planType,
        subject: formData.subject || "",
        features: formData.features.split("\n").filter(f => f.trim()),
        isActive: formData.isActive,
        isPopular: formData.planType === "premium" ? formData.isPopular : false,
        order: Number(formData.order),
      };
      // Only include originalPrice if it has a value (avoid undefined in Firestore)
      if (formData.originalPrice && Number(formData.originalPrice) > 0) {
        planData.originalPrice = Number(formData.originalPrice);
      }
      if (editingPlan?.id) {
        await adminUpdateDoc("plans", editingPlan.id, planData);
        showToast("Plan updated successfully!", "success");
      } else {
        await adminAddDoc("plans", planData);
        showToast("Plan created successfully!", "success");
      }
      resetForm();
      loadPlans();
    } catch (e) {
      console.error("Save plan error:", e);
      showToast("Error saving plan: " + (e instanceof Error ? e.message : "Unknown error"), "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    try { await adminDeleteDoc("plans", id); loadPlans(); }
    catch (e) { console.error("Delete plan error:", e); showToast("Error deleting plan", "error"); }
  };

  const handleSeedDefaultPlans = async () => {
    if (!confirm("This will add 3 default plans (Weekly ₹49, Monthly ₹149, Yearly ₹999). Continue?")) return;
    try {
      const defaultPlans = [
        {
          name: "Weekly Plan",
          description: "Try premium for a week",
          price: 49,
          originalPrice: 99,
          durationDays: 7,
          type: "subscription" as const,
          planType: "premium" as const,
          features: ["All premium mock tests", "Detailed explanations", "Performance analytics", "Ad-free experience"],
          isActive: true,
          isPopular: false,
          order: 1,
        },
        {
          name: "Monthly Plan",
          description: "Best value for regular users",
          price: 149,
          originalPrice: 299,
          durationDays: 30,
          type: "subscription" as const,
          planType: "premium" as const,
          features: ["All premium mock tests", "Detailed explanations", "Performance analytics", "Ad-free experience", "Priority support", "Download test reports"],
          isActive: true,
          isPopular: true,
          order: 2,
        },
        {
          name: "Yearly Plan",
          description: "Save big with annual plan",
          price: 999,
          originalPrice: 3588,
          durationDays: 365,
          type: "subscription" as const,
          planType: "premium" as const,
          features: ["All premium mock tests", "Detailed explanations", "Performance analytics", "Ad-free experience", "Priority support", "Download test reports", "Early access to new tests", "Personalized study plan"],
          isActive: true,
          isPopular: false,
          order: 3,
        },
      ];
      for (const plan of defaultPlans) {
        await adminAddDoc("plans", plan as any);
      }
      loadPlans();
      showToast("3 default plans added successfully!", "success");
    } catch (e) { console.error("Seed plans error:", e); showToast("Error adding default plans", "error"); }
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-bold ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.message}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ev-navy">Plans & Pricing</h2>
        <div className="flex gap-2">
          {plans.length === 0 && (
            <Button onClick={handleSeedDefaultPlans} variant="outline" className="border-ev-gold text-ev-gold hover:bg-ev-gold-light">
              <Crown className="w-4 h-4 mr-1" /> Add Default Plans
            </Button>
          )}
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-gradient-to-r from-ev-orange to-ev-gold text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Plan
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ev-orange" /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-ev-gold-light flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-ev-gold" />
          </div>
          <h3 className="text-lg font-bold text-ev-navy mb-2">No Plans Yet</h3>
          <p className="text-gray-500 text-sm mb-6">Add your first subscription plan or use the default plans to get started.</p>
          <Button onClick={handleSeedDefaultPlans} className="bg-gradient-to-r from-ev-orange to-ev-gold text-white">
            <Crown className="w-4 h-4 mr-2" /> Add Default Plans (₹49 / ₹149 / ₹999)
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-white rounded-xl border-2 p-4 shadow-sm ${plan.isPopular ? "border-ev-orange" : "border-gray-100"} ${!plan.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-ev-navy">{plan.name}</h3>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(() => {
                      const pType = (plan as any).planType || (plan.price === 0 ? "free" : "premium");
                      const isFree = pType === "free";
                      return (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isFree ? "bg-green-100 text-green-700" : "bg-gradient-to-r from-ev-orange to-ev-gold text-white"}`}>
                          {isFree ? "🆓 FREE" : "👑 PREMIUM"}
                        </span>
                      );
                    })()}
                    {plan.isPopular && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ev-orange text-white">POPULAR</span>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${plan.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {plan.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-2">{plan.description}</p>
              <div className="flex items-baseline gap-2 mb-2">
                {(() => {
                  const pType = (plan as any).planType || (plan.price === 0 ? "free" : "premium");
                  const isFree = pType === "free";
                  return (
                    <>
                      <span className="text-2xl font-black text-ev-navy">{isFree ? "Free" : `₹${plan.price}`}</span>
                      {!isFree && plan.originalPrice && <span className="text-sm text-gray-400 line-through">₹{plan.originalPrice}</span>}
                    </>
                  );
                })()}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                <span className="font-semibold px-2 py-0.5 rounded bg-gray-100">{plan.durationDays} days</span>
                <span className="font-semibold px-2 py-0.5 rounded bg-gray-100">{plan.type === "subscription" ? "Subscription" : "One-time"}</span>
                {(plan as any).subject && <span className="font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">{(plan as any).subject}</span>}
              </div>
              <div className="space-y-1 mb-3">
                {plan.features.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs text-gray-600">
                    <CheckCircle className="w-3 h-3 text-ev-green" /> {f}
                  </div>
                ))}
                {plan.features.length > 3 && <span className="text-xs text-gray-400">+{plan.features.length - 3} more</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(plan)}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(plan.id!)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Add New Plan"}</DialogTitle>
            <DialogDescription>{editingPlan ? "Update plan details" : "Create a new subscription/purchase plan"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Plan Name *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Monthly Plan" /></div>
            <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Best value for regular users" /></div>
            {/* Plan Type Selector - Free or Premium */}
            <div>
              <Label className="font-semibold text-sm">Plan Type *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, planType: "free", price: 0, originalPrice: 0, isPopular: false })}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    formData.planType === "free"
                      ? "border-green-500 bg-green-50 text-green-700 shadow-md"
                      : "border-gray-200 bg-white text-gray-500 hover:border-green-300"
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  FREE Plan
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, planType: "premium" })}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    formData.planType === "premium"
                      ? "border-ev-orange bg-ev-orange/5 text-ev-orange shadow-md"
                      : "border-gray-200 bg-white text-gray-500 hover:border-ev-orange/30"
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  PREMIUM Plan
                </button>
              </div>
            </div>
            {/* Price fields - shown for Premium, auto 0 for Free */}
            {formData.planType === "premium" ? (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (₹) *</Label><Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} placeholder="e.g. 149" /></div>
                <div><Label>Original Price (₹)</Label><Input type="number" value={formData.originalPrice} onChange={e => setFormData({ ...formData, originalPrice: Number(e.target.value) })} placeholder="e.g. 299" /></div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-semibold text-sm">This is a FREE plan — users can access without payment.</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Duration (Days) *</Label><Input type="number" value={formData.durationDays} onChange={e => setFormData({ ...formData, durationDays: Number(e.target.value) })} /></div>
              <div><Label>Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Subject</Label><Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. WBCS, SSC" /></div>
            </div>
            <div><Label>Features (one per line)</Label><Textarea value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })} placeholder={"All premium mock tests\nDetailed explanations\nPerformance analytics"} rows={4} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2"><Switch checked={formData.isActive} onCheckedChange={v => setFormData({ ...formData, isActive: v })} /><Label>Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={formData.isPopular} onCheckedChange={v => setFormData({ ...formData, isPopular: v })} disabled={formData.planType === "free"} /><Label className={formData.planType === "free" ? "text-gray-400" : ""}>Popular</Label></div>
              <div><Label>Order</Label><Input type="number" value={formData.order} onChange={e => setFormData({ ...formData, order: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-ev-orange to-ev-gold text-white">{editingPlan ? "Update" : "Create"} Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== PAYMENTS ADMIN ====================
function PaymentsAdmin() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"payments" | "subscriptions">("payments");

  useEffect(() => {
    async function load() {
      try {
        const [payData, subData] = await Promise.all([getAllPayments(), getAllSubscriptions()]);
        setPayments(payData);
        setSubscriptions(subData);
      } catch (e) { console.error("Load payments error:", e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const totalRevenue = payments.filter(p => p.status === "captured" || p.verified).reduce((sum, p) => sum + (p.amount || 0), 0);
  const activeSubs = subscriptions.filter(s => s.status === "active").length;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-ev-navy">Payments & Subscriptions</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-r from-ev-orange to-orange-600 rounded-xl p-4 text-white">
          <IndianRupee className="w-5 h-5 mb-1" />
          <p className="text-2xl font-black">₹{totalRevenue}</p>
          <p className="text-xs text-white/70">Total Revenue</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <CheckCircle className="w-5 h-5 mb-1" />
          <p className="text-2xl font-black">{payments.length}</p>
          <p className="text-xs text-white/70">Total Payments</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
          <Crown className="w-5 h-5 mb-1" />
          <p className="text-2xl font-black">{activeSubs}</p>
          <p className="text-xs text-white/70">Active Subs</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <CreditCard className="w-5 h-5 mb-1" />
          <p className="text-2xl font-black">{subscriptions.length}</p>
          <p className="text-xs text-white/70">Total Subscriptions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("payments")} className={`px-4 py-2 rounded-lg font-semibold text-sm ${activeTab === "payments" ? "bg-ev-navy text-white" : "bg-gray-100 text-gray-600"}`}>
          Payments ({payments.length})
        </button>
        <button onClick={() => setActiveTab("subscriptions")} className={`px-4 py-2 rounded-lg font-semibold text-sm ${activeTab === "subscriptions" ? "bg-ev-navy text-white" : "bg-gray-100 text-gray-600"}`}>
          Subscriptions ({subscriptions.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ev-orange" /></div>
      ) : activeTab === "payments" ? (
        payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No payments yet</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="text-xs font-mono">{p.userId?.slice(0, 8)}...</TableCell>
                    <TableCell className="text-sm font-medium">{p.planName || "-"}</TableCell>
                    <TableCell className="font-bold">₹{p.amount}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded ${p.status === "captured" ? "bg-green-100 text-green-700" : p.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{p.type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No subscriptions yet</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs font-mono">{s.userId?.slice(0, 8)}...</TableCell>
                  <TableCell className="text-sm font-medium">{s.planName}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded ${s.status === "active" ? "bg-green-100 text-green-700" : s.status === "expired" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{s.startDate ? new Date(s.startDate).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="text-xs">{s.endDate ? new Date(s.endDate).toLocaleDateString() : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ==================== NAVIGATION ADMIN ====================
const NAV_ICON_OPTIONS = [
  { label: "Home", value: "Home" },
  { label: "Book Open (Mock Tests)", value: "BookOpen" },
  { label: "Trophy (Test Series)", value: "Trophy" },
  { label: "Crown (Premium)", value: "Crown" },
  { label: "Zap (Free Tests)", value: "Zap" },
  { label: "Brain (Quizzes)", value: "Brain" },
  { label: "File Text (Papers)", value: "FileText" },
  { label: "Notebook (Notes)", value: "Notebook" },
  { label: "Calendar (Upcoming Exams)", value: "CalendarDays" },
  { label: "Sparkles (Daily Tips)", value: "Sparkles" },
  { label: "Award (Leaderboard)", value: "Award" },
  { label: "User (Profile)", value: "User" },
  { label: "Settings", value: "Settings" },
  { label: "Help Circle (Support)", value: "HelpCircle" },
  { label: "Megaphone", value: "Megaphone" },
  { label: "Bell (Notifications)", value: "Bell" },
  { label: "Star", value: "Star" },
  { label: "Target", value: "Target" },
  { label: "Trending Up", value: "TrendingUp" },
];

const NAV_COLOR_OPTIONS = [
  { label: "Navy", value: "text-ev-navy" },
  { label: "Orange", value: "text-ev-orange" },
  { label: "Gold", value: "text-ev-gold" },
  { label: "Green", value: "text-ev-green" },
  { label: "Purple", value: "text-purple-600" },
  { label: "Blue", value: "text-blue-600" },
  { label: "Cyan", value: "text-cyan-600" },
  { label: "Red", value: "text-ev-red" },
  { label: "Amber", value: "text-amber-600" },
  { label: "Teal", value: "text-teal-600" },
  { label: "Gray", value: "text-gray-600" },
];

function NavigationAdmin() {
  return (
    <CrudAdminPanel
      title="Navigation"
      subtitle="Control Bottom Nav, Side Menu & Quick Links"
      icon={Compass}
      color="from-cyan-600 to-blue-700"
      collectionName="navigation"
      fields={[
        { key: "label", label: "Label", type: "text", placeholder: "e.g. Mock Tests", required: true },
        { key: "icon", label: "Icon", type: "select", options: NAV_ICON_OPTIONS, required: true },
        { key: "targetView", label: "Navigate To", type: "select", options: NAVIGATION_VIEWS, required: true },
        { key: "location", label: "Show In", type: "select", options: [
          { label: "\ud83d\udcf1 Bottom Nav Bar", value: "bottomnav" },
          { label: "\ud83d\udccb Side Menu", value: "sidemenu" },
          { label: "\u26a1 Home Quick Links", value: "quicklinks" },
        ], required: true },
        { key: "color", label: "Color", type: "select", options: NAV_COLOR_OPTIONS },
        { key: "order", label: "Display Order", type: "number" },
        { key: "requireAuth", label: "Require Login", type: "switch" },
        { key: "isActive", label: "Active", type: "switch" },
      ]}
      fetchData={() => adminGetCollection("navigation")}
      onAdd={(data) => adminAddDoc("navigation", data)}
      onUpdate={(id, data) => adminUpdateDoc("navigation", id, data)}
      onDelete={(id) => adminDeleteDoc("navigation", id)}
    />
  );
}

