import { create } from "zustand";
import { User } from "firebase/auth";

export type AppView = 
  | "splash" | "onboarding" | "login" | "register"
  | "home" | "mocktests" | "test-series" | "free-tests" | "free-quizzes"
  | "previous-papers" | "notes" | "profile" | "settings" | "support"
  | "test-info" | "exam" | "result" | "leaderboard" | "pricing"
  | "upcoming-exams" | "upcoming-exam-detail" | "daily-tips" | "daily-tip-detail"
  | "announcement-detail" | "notifications" | "note-detail" | "previous-paper-detail"
  | "my-purchases";

// Test source collection type — tells ExamPage which collection to query
export type TestSourceType = "mockTest" | "freeTest" | "dailyQuiz" | "testSeries" | "popularTest";

// Views that are "root" views — pressing back on these should exit the app
const ROOT_VIEWS: AppView[] = ["home"];

// Views that should not be added to history (transient)
const SKIP_HISTORY_VIEWS: AppView[] = ["splash", "onboarding"];

interface UserProfile {
  photoUrl: string;
  gender: string;
  qualification: string;
  phone: string;
  targetExam: string;
  state: string;
  dob: string;
}

interface AppSettings {
  appName: string;
  appVersion: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  instagramUrl: string;
  youtubeUrl: string;
  telegramUrl: string;
  websiteUrl: string;
  maintenanceMode: boolean;
  forceUpdate: boolean;
}

interface SubscriptionState {
  isPremium: boolean;
  premiumExpiry: string | null;
  planName: string | null;
  purchasedItemIds: string[];
}

interface AppState {
  currentView: AppView;
  viewHistory: AppView[];
  scrollPositions: Record<string, number>;
  setView: (view: AppView) => void;
  goBack: () => AppView;
  canGoBack: () => boolean;
  isDark: boolean;
  toggleDark: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  selectedTest: string | null;
  setSelectedTest: (id: string | null) => void;
  selectedTestType: TestSourceType | null;
  setSelectedTestType: (type: TestSourceType | null) => void;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  selectedPaperId: string | null;
  setSelectedPaperId: (id: string | null) => void;
  selectedExamId: string | null;
  setSelectedExamId: (id: string | null) => void;
  selectedTipId: string | null;
  setSelectedTipId: (id: string | null) => void;
  selectedAnnouncementId: string | null;
  setSelectedAnnouncementId: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  user: { name: string; email: string; role: string; uid?: string; phone?: string; photoURL?: string } | null;
  setUser: (user: { name: string; email: string; role: string; uid?: string; phone?: string; photoURL?: string } | null) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  firebaseUser: User | null;
  setFirebaseUser: (user: User | null) => void;
  authLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  notifications: any[];
  setNotifications: (notifications: any[]) => void;
  unreadNotificationCount: number;
  setUnreadNotificationCount: (count: number) => void;
  showGuestModal: boolean;
  setShowGuestModal: (show: boolean) => void;
  showOnboarding: boolean | null;
  setShowOnboarding: (show: boolean | null) => void;
  showSplash: boolean;
  setShowSplash: (show: boolean) => void;
  exitConfirmVisible: boolean;
  setExitConfirmVisible: (visible: boolean) => void;
  isExitingApp: boolean;
  setIsExitingApp: (exiting: boolean) => void;
  examBackWarning: boolean;
  setExamBackWarning: (show: boolean) => void;
  appSettings: AppSettings;
  setAppSettings: (settings: Partial<AppSettings>) => void;
  lastTestResult: any | null;
  setLastTestResult: (result: any | null) => void;
  subscription: SubscriptionState;
  setSubscription: (sub: Partial<SubscriptionState>) => void;
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  paymentModalData: { planId: string; planName: string; amount: number; type: string } | null;
  setPaymentModalData: (data: { planId: string; planName: string; amount: number; type: string } | null) => void;
  navigationItems: { id?: string; label: string; icon: string; targetView: string; location: string; order: number; isActive: boolean; color: string; requireAuth: boolean }[];
  setNavigationItems: (items: { id?: string; label: string; icon: string; targetView: string; location: string; order: number; isActive: boolean; color: string; requireAuth: boolean }[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: "home",
  viewHistory: [],
  scrollPositions: {},
  setView: (view) => {
    const { currentView, viewHistory, scrollPositions } = get();
    // If navigating to a root view (home), clear the history stack
    // so back button exits the app instead of going through old pages
    if (ROOT_VIEWS.includes(view)) {
      const currentScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      const newPositions = { ...scrollPositions, [currentView]: currentScrollY };
      delete newPositions[view];
      set({ currentView: view, viewHistory: [], scrollPositions: newPositions });
      return;
    }
    // Don't push if same view
    if (currentView === view) return;
    // Save current scroll position before navigating away
    const currentScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    const newPositions = { ...scrollPositions, [currentView]: currentScrollY };
    // Clear saved position of the target view so it starts from top on fresh navigation
    delete newPositions[view];
    // Don't add transient views to history
    if (SKIP_HISTORY_VIEWS.includes(currentView)) {
      set({ currentView: view, viewHistory: [view], scrollPositions: newPositions });
    } else {
      set({ currentView: view, viewHistory: [...viewHistory, currentView], scrollPositions: newPositions });
    }
  },
  goBack: () => {
    const { viewHistory, currentView, scrollPositions } = get();
    // Save current scroll position before going back
    const currentScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    const updatedPositions = { ...scrollPositions, [currentView]: currentScrollY };
    if (viewHistory.length > 0) {
      const prevView = viewHistory[viewHistory.length - 1];
      set({
        currentView: prevView,
        viewHistory: viewHistory.slice(0, -1),
        scrollPositions: updatedPositions,
      });
      return prevView;
    }
    // No history — go to home as fallback (shouldn't normally happen)
    if (currentView !== "home") {
      set({
        currentView: "home",
        viewHistory: [],
        scrollPositions: updatedPositions,
      });
      return "home";
    }
    return currentView;
  },
  canGoBack: () => {
    const { viewHistory, currentView } = get();
    return viewHistory.length > 0 || !ROOT_VIEWS.includes(currentView);
  },
  isDark: typeof window !== 'undefined' ? localStorage.getItem('ev_is_dark') === 'true' : false,
  toggleDark: () => {
    const newDark = !get().isDark;
    set({ isDark: newDark });
    if (typeof window !== 'undefined') {
      localStorage.setItem('ev_is_dark', String(newDark));
      if (newDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },
  language: typeof window !== "undefined" ? (localStorage.getItem("ev_language") || "en") : "en",
  setLanguage: (lang) => {
    set({ language: lang });
    try { localStorage.setItem("ev_language", lang); } catch (e) { /* ignore */ }
  },
  selectedTest: null,
  setSelectedTest: (id) => set({ selectedTest: id }),
  selectedTestType: null,
  setSelectedTestType: (type) => set({ selectedTestType: type }),
  selectedNoteId: null,
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  selectedPaperId: null,
  setSelectedPaperId: (id) => set({ selectedPaperId: id }),
  selectedExamId: null,
  setSelectedExamId: (id) => set({ selectedExamId: id }),
  selectedTipId: null,
  setSelectedTipId: (id) => set({ selectedTipId: id }),
  selectedAnnouncementId: null,
  setSelectedAnnouncementId: (id) => set({ selectedAnnouncementId: id }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  user: null,
  setUser: (user) => set({ user }),
  userProfile: { photoUrl: "", gender: "", qualification: "", phone: "", targetExam: "", state: "", dob: "" },
  setUserProfile: (profile) => {
    const { userProfile } = get();
    const updated = { ...userProfile, ...profile };
    set({ userProfile: updated });
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('ev_user_profile', JSON.stringify(updated));
    }
  },
  firebaseUser: null,
  setFirebaseUser: (user) => set({ firebaseUser: user }),
  authLoading: true,
  setAuthLoading: (loading) => set({ authLoading: loading }),
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  unreadNotificationCount: 0,
  setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),
  showGuestModal: false,
  setShowGuestModal: (show) => set({ showGuestModal: show }),
  showOnboarding: null,
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  showSplash: true,
  setShowSplash: (show) => set({ showSplash: show }),
  exitConfirmVisible: false,
  setExitConfirmVisible: (visible) => set({ exitConfirmVisible: visible }),
  isExitingApp: false,
  setIsExitingApp: (exiting) => set({ isExitingApp: exiting }),
  examBackWarning: false,
  setExamBackWarning: (show) => set({ examBackWarning: show }),
  appSettings: {
    appName: "EXAMVAULT",
    appVersion: "1.0.0",
    contactEmail: "support@examvault.app",
    contactPhone: "",
    whatsappNumber: "",
    instagramUrl: "",
    youtubeUrl: "",
    telegramUrl: "",
    websiteUrl: "",
    maintenanceMode: false,
    forceUpdate: false,
  },
  setAppSettings: (settings) => {
    const { appSettings } = get();
    const updated = { ...appSettings, ...settings };
    set({ appSettings: updated });
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('ev_app_settings', JSON.stringify(updated));
    }
  },
  lastTestResult: null,
  setLastTestResult: (result) => set({ lastTestResult: result }),
  subscription: {
    isPremium: false,
    premiumExpiry: null,
    planName: null,
    purchasedItemIds: [],
  },
  setSubscription: (sub) => {
    const { subscription } = get();
    const updated = { ...subscription, ...sub };
    set({ subscription: updated });
    if (typeof window !== 'undefined') {
      localStorage.setItem('ev_subscription', JSON.stringify(updated));
    }
  },
  showPaymentModal: false,
  setShowPaymentModal: (show) => set({ showPaymentModal: show }),
  paymentModalData: null,
  setPaymentModalData: (data) => set({ paymentModalData: data }),
  navigationItems: [],
  setNavigationItems: (items) => set({ navigationItems: items }),
}));
