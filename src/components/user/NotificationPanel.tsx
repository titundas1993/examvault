"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  Info,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  CheckCheck,
  X,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  NotificationData,
} from "@/lib/services/firestore";

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/15" },
  warning: { icon: AlertTriangle, color: "text-ev-orange", bg: "bg-ev-orange-light dark:bg-ev-orange/15" },
  success: { icon: CheckCircle2, color: "text-ev-green", bg: "bg-green-50 dark:bg-ev-green/15" },
  promo: { icon: Megaphone, color: "text-ev-purple", bg: "bg-purple-50 dark:bg-ev-purple/15" },
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { language, unreadNotificationCount, setUnreadNotificationCount, setNotifications } = useAppStore();
  const [notifications, setLocalNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      if (data) {
        setLocalNotifications(data);
        setNotifications(data);
        const unread = data.filter((n) => !n.isRead).length;
        setUnreadNotificationCount(unread);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [setNotifications, setUnreadNotificationCount]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: NotificationData) => {
    if (!notification.isRead && notification.id) {
      try {
        await markAsRead(notification.id);
        setLocalNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }
    if (notification.link) {
      window.open(notification.link, "_blank", "noopener");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-lg font-bold text-ev-navy dark:text-white">
                {t("notification", language)}
              </SheetTitle>
              {unreadNotificationCount > 0 && (
                <Badge className="bg-ev-orange text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {unreadNotificationCount}
                </Badge>
              )}
            </div>
            {unreadNotificationCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-xs text-ev-orange hover:text-ev-orange/80"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                {markingAll ? "..." : "Mark all read"}
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Notification List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl">
                  <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              // Empty state
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-ev-blue-light dark:bg-white/10 flex items-center justify-center mb-4">
                  <BellOff className="w-9 h-9 text-ev-navy/30 dark:text-white/30" />
                </div>
                <h3 className="text-base font-semibold text-ev-navy dark:text-white mb-1">
                  No Notifications
                </h3>
                <p className="text-sm text-muted-foreground">
                  You&apos;re all caught up! Check back later for updates.
                </p>
              </motion.div>
            ) : (
              // Notification items
              <AnimatePresence>
                {notifications.map((notification, idx) => {
                  const tc = typeConfig[notification.type] || typeConfig.info;
                  const IconComp = tc.icon;

                  return (
                    <motion.div
                      key={notification.id || idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        notification.isRead
                          ? "bg-transparent hover:bg-ev-light dark:hover:bg-white/5"
                          : "bg-ev-blue-light/50 dark:bg-ev-navy/20 hover:bg-ev-blue-light dark:hover:bg-ev-navy/30"
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl ${tc.bg} flex items-center justify-center flex-shrink-0`}
                      >
                        <IconComp className={`w-5 h-5 ${tc.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-semibold text-ev-navy dark:text-white line-clamp-1 ${
                              notification.isRead ? "font-medium opacity-70" : ""
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 rounded-full bg-ev-orange flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notification.createdAt ? timeAgo(notification.createdAt) : ""}
                          </span>
                          {notification.link && (
                            <span className="text-[10px] text-ev-orange flex items-center gap-0.5">
                              <ExternalLink className="w-3 h-3" />
                              Link
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
