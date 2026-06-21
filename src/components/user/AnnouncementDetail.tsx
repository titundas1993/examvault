"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  CheckCircle2,
  Calendar,
  Megaphone,
  AlertTriangle,
  Gift,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { getAnnouncementById, AnnouncementData } from "@/lib/services/firestore";

const typeConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string; heroGradient: string }
> = {
  new: {
    label: "New",
    icon: Megaphone,
    color: "text-ev-green",
    bg: "bg-ev-green/10 dark:bg-ev-green/15",
    border: "border-ev-green/30",
    heroGradient: "from-ev-green/90 to-emerald-700",
  },
  alert: {
    label: "Alert",
    icon: AlertTriangle,
    color: "text-ev-orange",
    bg: "bg-ev-orange/10 dark:bg-ev-orange/15",
    border: "border-ev-orange/30",
    heroGradient: "from-ev-orange/90 to-amber-700",
  },
  offer: {
    label: "Offer",
    icon: Gift,
    color: "text-ev-red",
    bg: "bg-ev-red/10 dark:bg-ev-red/15",
    border: "border-ev-red/30",
    heroGradient: "from-ev-red/90 to-rose-700",
  },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AnnouncementDetail() {
  const { selectedAnnouncementId, setView, language } = useAppStore();
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedAnnouncementId) return;
    getAnnouncementById(selectedAnnouncementId)
      .then((data) => setAnnouncement(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAnnouncementId]);

  const handleShare = async () => {
    const shareText = `${announcement?.title}\n\n${announcement?.description}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: announcement?.title, text: shareText });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ev-light dark:bg-gray-950 p-4 space-y-4">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="min-h-screen bg-ev-light dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-ev-orange-light dark:bg-ev-orange/10 flex items-center justify-center mb-4">
          <Megaphone className="w-8 h-8 text-ev-orange/50" />
        </div>
        <h3 className="font-semibold text-ev-navy dark:text-white mb-1">Announcement not found</h3>
        <p className="text-sm text-muted-foreground mb-4">This announcement may have been removed.</p>
        <Button variant="outline" onClick={() => setView("home")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("back", language)}
        </Button>
      </div>
    );
  }

  const tc = typeConfig[announcement.type] || typeConfig.new;
  const IconComp = tc.icon;

  return (
    <div className="min-h-screen bg-ev-light dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setView("home")}
            className="flex items-center gap-1 text-sm font-medium text-ev-navy dark:text-white hover:text-ev-orange transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("back", language)}
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-lg hover:bg-ev-light dark:hover:bg-white/10 transition-colors"
          >
            {copied ? (
              <CheckCircle2 className="w-5 h-5 text-ev-green" />
            ) : (
              <Share2 className="w-5 h-5 text-ev-navy dark:text-white" />
            )}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Type Badge & Date */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Badge
            variant="outline"
            className={`flex items-center gap-1 text-xs px-3 py-1 ${tc.bg} ${tc.border} ${tc.color}`}
          >
            <IconComp className="w-3.5 h-3.5" />
            {tc.label}
          </Badge>
          {announcement.createdAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(announcement.createdAt)}
            </span>
          )}
        </motion.div>

        {/* Image */}
        {announcement.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl overflow-hidden border border-border"
          >
            <img
              src={announcement.imageUrl}
              alt={announcement.title}
              className="w-full h-48 object-cover"
            />
          </motion.div>
        )}

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-bold text-ev-navy dark:text-white leading-snug"
        >
          {announcement.title}
        </motion.h1>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4"
        >
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {announcement.description}
          </p>
        </motion.div>

        {/* Link Button */}
        {announcement.link && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={() => window.open(announcement.link, "_blank", "noopener")}
              className="w-full bg-gradient-to-r from-ev-navy to-ev-dark hover:from-ev-navy/90 hover:to-ev-dark/90 text-white font-semibold rounded-xl h-11"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {announcement.linkText || "Open Link"}
            </Button>
          </motion.div>
        )}

        {/* Timestamp detail */}
        {announcement.createdAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <Clock className="w-3 h-3" />
            <span>Published on {formatDate(announcement.createdAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
