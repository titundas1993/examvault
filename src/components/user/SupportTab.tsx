"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Mail,
  Phone,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Bug,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Instagram,
  Youtube,
  Globe,
  Send as TelegramIcon,
  ChevronRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { createTicket, getTickets, addTicketReply, getAppSettings, AppSettingsData } from "@/lib/services/firestore";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

const faqs = [
  {
    q: "How do I start a mock test?",
    a: "Go to the Mock Tests section, browse available tests, and click 'Start Test' on any test card. Make sure you have a stable internet connection before starting.",
  },
  {
    q: "Are the mock tests free?",
    a: "We offer both free and premium mock tests. Free tests are marked with a 'FREE' badge. Premium tests require a subscription or one-time purchase.",
  },
  {
    q: "How can I track my progress?",
    a: "After completing a test, you can view your results including score, time taken, and correct/wrong answers. Your progress is saved in your profile.",
  },
  {
    q: "Can I access tests offline?",
    a: "Currently, all tests require an internet connection. Offline mode is coming soon in a future update.",
  },
  {
    q: "How do I reset my password?",
    a: "Go to the Login screen and click 'Forgot Password'. Enter your email address and we'll send you a password reset link.",
  },
  {
    q: "How do I change the app language?",
    a: "Go to Settings > Language and select your preferred language. We support English, Hindi, Bengali, and Assamese.",
  },
  {
    q: "Is my data secure?",
    a: "Yes! We use industry-standard encryption and secure servers. Your personal information is never shared with third parties.",
  },
  {
    q: "How to report a bug or issue?",
    a: "You can use the 'Report Bug' form below to submit any issues. Our team will review and respond within 24-48 hours.",
  },
];

const ticketCategories = [
  { value: "question", label: "General Question" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "complaint", label: "Complaint" },
];

export default function SupportTab() {
  const { language, user, firebaseUser, setShowGuestModal, appSettings, setAppSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<"faq" | "contact" | "ticket" | "bug" | "my-tickets">("faq");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("question");
  const [ticketMessage, setTicketMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bugSubject, setBugSubject] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugSubmitted, setBugSubmitted] = useState(false);

  // My Tickets state
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Load app settings from Firestore on mount - robust with fallbacks
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getAppSettings();
        if (settings) {
          setAppSettings(settings);
        } else {
          console.warn("AppSettings document not found in Firestore, using store defaults");
        }
      } catch (err) {
        console.error("Error loading app settings:", err);
        try {
          const cached = localStorage.getItem('ev_app_settings');
          if (cached) {
            const parsed = JSON.parse(cached);
            setAppSettings(parsed);
          }
        } catch (e) { /* ignore */ }
      }
    };
    loadSettings();
  }, [setAppSettings]);

  // Load user's tickets
  const loadMyTickets = useCallback(async () => {
    const uid = firebaseUser?.uid || user?.uid;
    if (!uid) return;
    setTicketsLoading(true);
    try {
      const tickets = await getTickets(uid);
      setMyTickets(tickets);
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setTicketsLoading(false);
    }
  }, [firebaseUser?.uid, user?.uid]);

  // Real-time Firestore listener for user's support tickets
  useEffect(() => {
    const uid = firebaseUser?.uid || user?.uid;
    if (!uid) return;

    const q = query(
      collection(db, "supportTickets"),
      where("userId", "==", uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map((d) => {
        const data = d.data();
        // Convert Firestore Timestamps to ISO strings
        const converted = { ...data, id: d.id };
        if (data.createdAt?.toDate) converted.createdAt = data.createdAt.toDate().toISOString();
        if (data.updatedAt?.toDate) converted.updatedAt = data.updatedAt.toDate().toISOString();
        return converted;
      });
      // Sort client-side by createdAt desc
      tickets.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setMyTickets(tickets);
      setTicketsLoading(false);
    }, (error) => {
      console.error("Error listening to tickets:", error);
      // Fallback: load once
      loadMyTickets();
    });

    return () => unsubscribe();
  }, [firebaseUser?.uid, user?.uid, loadMyTickets]);

  // After creating a ticket, refresh the list
  useEffect(() => {
    if (submitted || bugSubmitted) {
      loadMyTickets();
    }
  }, [submitted, bugSubmitted, loadMyTickets]);

  // Build social links from appSettings (dynamic)
  const socialLinks = [];
  if (appSettings.contactEmail) {
    socialLinks.push({ name: "Email", icon: Mail, value: appSettings.contactEmail, href: `mailto:${appSettings.contactEmail}`, color: "text-ev-orange", bg: "bg-ev-orange-light dark:bg-ev-orange/15" });
  }
  if (appSettings.contactPhone) {
    const telHref = `tel:${appSettings.contactPhone.replace(/[^+\d]/g, "")}`;
    socialLinks.push({ name: "Phone", icon: Phone, value: appSettings.contactPhone, href: telHref, color: "text-ev-green", bg: "bg-green-50 dark:bg-ev-green/15" });
  }
  if (appSettings.whatsappNumber) {
    const waPhone = appSettings.whatsappNumber.replace(/[^+\d]/g, "").replace("+", "");
    socialLinks.push({ name: "WhatsApp", icon: MessageSquare, value: "Chat with us", href: `https://wa.me/${waPhone}`, color: "text-green-600", bg: "bg-green-50 dark:bg-green-600/15" });
  }
  if (appSettings.instagramUrl) {
    socialLinks.push({ name: "Instagram", icon: Instagram, value: "Follow us", href: appSettings.instagramUrl, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-600/15" });
  }
  if (appSettings.youtubeUrl) {
    socialLinks.push({ name: "YouTube", icon: Youtube, value: "Subscribe", href: appSettings.youtubeUrl, color: "text-red-600", bg: "bg-red-50 dark:bg-red-600/15" });
  }
  if (appSettings.telegramUrl) {
    socialLinks.push({ name: "Telegram", icon: MessageSquare, value: "Join Channel", href: appSettings.telegramUrl, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/15" });
  }
  if (appSettings.websiteUrl) {
    socialLinks.push({ name: "Website", icon: Globe, value: "Visit", href: appSettings.websiteUrl, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-600/15" });
  }

  // WhatsApp chat link
  const whatsappChatHref = appSettings.whatsappNumber
    ? `https://wa.me/${appSettings.whatsappNumber.replace(/[^+\d]/g, "").replace("+", "")}`
    : null;

  const isGuest = !user || user.role === "guest";

  const handleTicketSubmit = async () => {
    if (!ticketSubject || !ticketMessage) return;
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }
    setSubmitting(true);
    try {
      await createTicket({
        userId: firebaseUser?.uid || user?.uid || "",
        userName: user?.name || "User",
        userEmail: user?.email || "",
        subject: ticketSubject,
        message: ticketMessage,
        category: ticketCategory as "bug" | "feature" | "question" | "complaint",
        status: "open",
        priority: "medium",
      });
      setSubmitted(true);
      setTicketSubject("");
      setTicketMessage("");
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error("Error creating ticket:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBugSubmit = async () => {
    if (!bugSubject || !bugSteps) return;
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }
    setBugSubmitting(true);
    try {
      await createTicket({
        userId: firebaseUser?.uid || user?.uid || "",
        userName: user?.name || "User",
        userEmail: user?.email || "",
        subject: `[BUG] ${bugSubject}`,
        message: bugSteps,
        category: "bug",
        status: "open",
        priority: "high",
      });
      setBugSubmitted(true);
      setBugSubject("");
      setBugSteps("");
      setTimeout(() => setBugSubmitted(false), 3000);
    } catch (err) {
      console.error("Error submitting bug:", err);
    } finally {
      setBugSubmitting(false);
    }
  };

  // Handle user reply to a ticket
  const handleUserReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const newReply = await addTicketReply(selectedTicketId, replyText.trim(), false);
      // Update local state
      setMyTickets(prev => prev.map(t => {
        if (t.id === selectedTicketId) {
          const updatedReplies = [...(t.replies || []), newReply];
          return { ...t, replies: updatedReplies, lastReplyAt: newReply.sentAt };
        }
        return t;
      }));
      setReplyText("");
    } catch (err) {
      console.error("Error sending reply:", err);
    } finally {
      setSendingReply(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  // Count unread admin replies across all tickets
  const unreadAdminReplies = myTickets.reduce((count, ticket) => {
    const replies = ticket.replies || [];
    const adminReplies = replies.filter((r: any) => r.fromAdmin);
    return count + adminReplies.length;
  }, 0);

  const tabs = [
    { key: "faq" as const, label: "FAQ", icon: HelpCircle },
    { key: "contact" as const, label: "Contact", icon: Phone },
    { key: "my-tickets" as const, label: "My Tickets", icon: MessageSquare, badge: unreadAdminReplies > 0 ? unreadAdminReplies : undefined },
    { key: "ticket" as const, label: "Raise Ticket", icon: Send },
    { key: "bug" as const, label: "Report Bug", icon: Bug },
  ];

  // Get the currently selected ticket
  const selectedTicket = selectedTicketId ? myTickets.find(t => t.id === selectedTicketId) : null;

  return (
    <div className="min-h-screen bg-ev-light dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-b border-border">
        <div className="p-4 pb-3">
          <h1 className="text-lg font-bold text-ev-navy dark:text-white">
            {t("support", language)}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            We&apos;re here to help you succeed
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedTicketId(null); // reset ticket detail view when switching tabs
              }}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-ev-navy text-white shadow-sm"
                  : "bg-ev-light dark:bg-white/10 text-ev-navy dark:text-white/70 hover:bg-ev-blue-light dark:hover:bg-white/15"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.badge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-ev-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* FAQ Section */}
          {activeTab === "faq" && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.map((faq, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`faq-${idx}`}
                    className="bg-white dark:bg-gray-900 rounded-xl border border-border px-4 overflow-hidden"
                  >
                    <AccordionTrigger className="text-sm font-medium text-ev-navy dark:text-white text-left hover:no-underline py-4">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          )}

          {/* Contact Section */}
          {activeTab === "contact" && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {socialLinks.map((link, idx) => (
                <motion.a
                  key={idx}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-xl border border-border p-4 hover:shadow-md hover:border-ev-orange/30 transition-all"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${link.bg} flex items-center justify-center`}
                  >
                    <link.icon className={`w-5 h-5 ${link.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ev-navy dark:text-white">
                      {link.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{link.value}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </motion.a>
              ))}

              {/* WhatsApp Chat Button */}
              {whatsappChatHref && (
                <a
                  href={whatsappChatHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-4"
                >
                  <Button className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat on WhatsApp
                  </Button>
                </a>
              )}
            </motion.div>
          )}

          {/* My Tickets Section */}
          {activeTab === "my-tickets" && (
            <motion.div
              key="my-tickets"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {isGuest ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-ev-orange mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-ev-navy dark:text-white mb-1">Login Required</h3>
                  <p className="text-xs text-muted-foreground">Please login to view your support tickets</p>
                </div>
              ) : selectedTicket ? (
                /* ========= TICKET DETAIL / CONVERSATION VIEW ========= */
                <div className="space-y-3">
                  {/* Back button */}
                  <button
                    onClick={() => setSelectedTicketId(null)}
                    className="flex items-center gap-1 text-ev-orange text-xs font-medium mb-1 hover:underline"
                  >
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                    Back to My Tickets
                  </button>

                  {/* Ticket Header Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-bold text-ev-navy dark:text-white leading-tight">
                        {selectedTicket.subject || "No Subject"}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${
                        selectedTicket.status === "open" ? "bg-amber-50 text-amber-600" :
                        selectedTicket.status === "in-progress" ? "bg-blue-50 text-blue-600" :
                        "bg-green-50 text-emerald-600"
                      }`}>
                        {selectedTicket.status === "in-progress" ? "In Progress" : selectedTicket.status?.charAt(0).toUpperCase() + selectedTicket.status?.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(selectedTicket.createdAt)}
                      {selectedTicket.category && (
                        <>
                          <span className="text-border">|</span>
                          <span>{selectedTicket.category}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Conversation Thread */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 space-y-4">
                    {/* Original message */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-ev-navy flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] font-bold">{(user?.name || "U").charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-ev-navy dark:text-white">You</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(selectedTicket.createdAt)}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {selectedTicket.message || "No message content"}
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {(selectedTicket.replies || []).map((reply: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          reply.fromAdmin ? "bg-ev-orange" : "bg-ev-navy"
                        }`}>
                          <span className="text-white text-[10px] font-bold">{reply.fromAdmin ? "A" : (user?.name || "U").charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-ev-navy dark:text-white">
                              {reply.fromAdmin ? "Admin" : "You"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{formatDate(reply.sentAt)}</span>
                          </div>
                          <div className={`rounded-xl p-3 text-xs whitespace-pre-wrap leading-relaxed ${
                            reply.fromAdmin
                              ? "bg-ev-orange/5 dark:bg-ev-orange/10 border border-ev-orange/20 text-gray-700 dark:text-gray-300"
                              : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          }`}>
                            {reply.message}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Reply Input */}
                    <div className="border-t border-border pt-3 mt-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-ev-navy flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">{(user?.name || "U").charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply..."
                            rows={3}
                            className="rounded-xl bg-ev-light dark:bg-gray-800 resize-none text-xs"
                          />
                          <Button
                            onClick={handleUserReply}
                            disabled={!replyText.trim() || sendingReply}
                            size="sm"
                            className="bg-ev-orange hover:bg-ev-orange/90 text-white font-semibold rounded-xl text-xs"
                          >
                            {sendingReply ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5 mr-1" />
                                Send Reply
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : ticketsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-ev-orange" />
                </div>
              ) : myTickets.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6 text-center">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-ev-navy dark:text-white mb-1">No Tickets Yet</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    You haven&apos;t raised any support tickets yet
                  </p>
                  <Button
                    onClick={() => setActiveTab("ticket")}
                    size="sm"
                    className="bg-ev-orange hover:bg-ev-orange/90 text-white font-semibold rounded-xl text-xs"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Raise a Ticket
                  </Button>
                </div>
              ) : (
                /* ========= TICKETS LIST VIEW ========= */
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{myTickets.length} ticket{myTickets.length !== 1 ? "s" : ""}</p>
                    <button
                      onClick={loadMyTickets}
                      className="text-ev-orange text-xs font-medium flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>
                  {myTickets.map((ticket) => {
                    const adminReplies = (ticket.replies || []).filter((r: any) => r.fromAdmin);
                    return (
                      <motion.div
                        key={ticket.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`bg-white dark:bg-gray-900 rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                          ticket.status === "resolved" ? "border-green-100 dark:border-green-900/30 opacity-75" :
                          ticket.status === "in-progress" ? "border-blue-100 dark:border-blue-900/30" :
                          "border-amber-100 dark:border-amber-900/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-xs font-bold text-ev-navy dark:text-white truncate">
                                {ticket.subject || "No Subject"}
                              </h4>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${
                                ticket.status === "open" ? "bg-amber-50 text-amber-600" :
                                ticket.status === "in-progress" ? "bg-blue-50 text-blue-600" :
                                "bg-green-50 text-emerald-600"
                              }`}>
                                {ticket.status === "in-progress" ? "In Progress" : ticket.status?.charAt(0).toUpperCase() + ticket.status?.slice(1)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1">
                              {ticket.message || ""}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatDate(ticket.createdAt)}
                              {adminReplies.length > 0 && (
                                <>
                                  <span className="text-border">|</span>
                                  <span className="text-ev-orange font-medium">
                                    {adminReplies.length} admin {adminReplies.length === 1 ? "reply" : "replies"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}

          {/* Raise Ticket Section */}
          {activeTab === "ticket" && (
            <motion.div
              key="ticket"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {submitted ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-ev-green/30 p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-ev-green mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-ev-navy dark:text-white mb-1">
                    Ticket Submitted!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll get back to you within 24-48 hours
                  </p>
                  <Button
                    onClick={() => setActiveTab("my-tickets")}
                    size="sm"
                    className="mt-3 bg-ev-navy hover:bg-ev-dark text-white font-semibold rounded-xl text-xs"
                  >
                    View My Tickets
                  </Button>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-ev-navy dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-ev-orange" />
                    Raise a Support Ticket
                  </h3>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Subject</Label>
                    <Input
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                      className="h-10 rounded-xl bg-ev-light dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Category</Label>
                    <Select value={ticketCategory} onValueChange={setTicketCategory}>
                      <SelectTrigger className="h-10 rounded-xl bg-ev-light dark:bg-gray-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Message</Label>
                    <Textarea
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Describe your issue in detail..."
                      rows={4}
                      className="rounded-xl bg-ev-light dark:bg-gray-800 resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleTicketSubmit}
                    disabled={submitting || !ticketSubject || !ticketMessage}
                    className="w-full h-11 bg-gradient-to-r from-ev-orange to-ev-gold hover:from-ev-orange/90 hover:to-ev-gold/90 text-white font-semibold rounded-xl shadow-lg shadow-ev-orange/20"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {t("submit", language)}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Report Bug Section */}
          {activeTab === "bug" && (
            <motion.div
              key="bug"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {bugSubmitted ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-ev-green/30 p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-ev-green mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-ev-navy dark:text-white mb-1">
                    Bug Reported!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Thanks for helping us improve. We&apos;ll investigate this issue.
                  </p>
                  <Button
                    onClick={() => setActiveTab("my-tickets")}
                    size="sm"
                    className="mt-3 bg-ev-navy hover:bg-ev-dark text-white font-semibold rounded-xl text-xs"
                  >
                    View My Tickets
                  </Button>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-9 h-9 rounded-lg bg-ev-red/10 flex items-center justify-center">
                      <Bug className="w-4 h-4 text-ev-red" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ev-navy dark:text-white">
                        {t("reportBug", language)}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Help us fix issues faster
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Bug Title</Label>
                    <Input
                      value={bugSubject}
                      onChange={(e) => setBugSubject(e.target.value)}
                      placeholder="What went wrong?"
                      className="h-10 rounded-xl bg-ev-light dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Steps to Reproduce</Label>
                    <Textarea
                      value={bugSteps}
                      onChange={(e) => setBugSteps(e.target.value)}
                      placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                      rows={5}
                      className="rounded-xl bg-ev-light dark:bg-gray-800 resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleBugSubmit}
                    disabled={bugSubmitting || !bugSubject || !bugSteps}
                    className="w-full h-11 bg-ev-red hover:bg-ev-red/90 text-white font-semibold rounded-xl"
                  >
                    {bugSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Bug className="w-4 h-4 mr-2" />
                        Submit Bug Report
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
