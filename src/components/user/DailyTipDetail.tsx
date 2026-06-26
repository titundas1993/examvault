"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  CheckCircle2,
  BookOpen,
  Target,
  Clock,
  Sparkles,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { getTipById, TipData } from "@/lib/services/firestore";

const tipCategoryConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string; gradient: string }
> = {
  study: {
    label: "Study Tips",
    icon: BookOpen,
    color: "text-ev-navy",
    bg: "bg-ev-blue-light dark:bg-ev-navy/30",
    border: "border-ev-blue-light dark:border-ev-navy/40",
    gradient: "from-ev-blue-light to-white dark:from-ev-navy/20 dark:to-gray-950",
  },
  "exam-strategy": {
    label: "Exam Strategy",
    icon: Target,
    color: "text-ev-orange",
    bg: "bg-ev-orange-light dark:bg-ev-orange/15",
    border: "border-ev-orange-light dark:border-ev-orange/30",
    gradient: "from-ev-orange-light to-white dark:from-ev-orange/10 dark:to-gray-950",
  },
  "time-management": {
    label: "Time Management",
    icon: Clock,
    color: "text-ev-gold",
    bg: "bg-ev-gold-light dark:bg-ev-gold/15",
    border: "border-ev-gold-light dark:border-ev-gold/30",
    gradient: "from-ev-gold-light to-white dark:from-ev-gold/10 dark:to-gray-950",
  },
  motivation: {
    label: "Motivation",
    icon: Sparkles,
    color: "text-ev-purple",
    bg: "bg-purple-50 dark:bg-ev-purple/15",
    border: "border-purple-100 dark:border-ev-purple/30",
    gradient: "from-purple-50 to-white dark:from-ev-purple/10 dark:to-gray-950",
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

export default function DailyTipDetail() {
  const { selectedTipId, setView, language } = useAppStore();
  const [tip, setTip] = useState<TipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedTipId) return;
    getTipById(selectedTipId)
      .then((data) => setTip(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedTipId]);

  const handleShare = async () => {
    const shareText = `${tip?.title}\n\n${tip?.description}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: tip?.title, text: shareText });
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
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  if (!tip) {
    return (
      <div className="min-h-screen bg-ev-light dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-ev-gold-light dark:bg-ev-gold/10 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-ev-gold/50" />
        </div>
        <h3 className="font-semibold text-ev-navy dark:text-white mb-1">Tip not found</h3>
        <p className="text-sm text-muted-foreground mb-4">This tip may have been removed.</p>
        <Button variant="outline" onClick={() => setView("daily-tips")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("back", language)}
        </Button>
      </div>
    );
  }

  const catConfig = tipCategoryConfig[tip.category] || tipCategoryConfig.study;
  const IconComp = catConfig.icon;

  return (
    <div className="min-h-screen bg-ev-light dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setView("daily-tips")}
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
        {/* Category Badge & Date */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Badge
            variant="outline"
            className={`flex items-center gap-1 text-xs px-3 py-1 ${catConfig.bg} ${catConfig.border} ${catConfig.color}`}
          >
            <IconComp className="w-3.5 h-3.5" />
            {catConfig.label}
          </Badge>
          {tip.createdAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(tip.createdAt)}
            </span>
          )}
        </motion.div>

        {/* Image */}
        {tip.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl overflow-hidden border border-border"
          >
            <img
              src={tip.imageUrl}
              alt={tip.title}
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
          {tip.title}
        </motion.h1>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4"
        >
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {tip.description}
          </p>
        </motion.div>

        {/* Reference Link */}
        {tip.referenceLink && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={() => window.open(tip.referenceLink, "_blank", "noopener")}
              className="w-full bg-gradient-to-r from-ev-orange to-ev-gold hover:from-ev-orange/90 hover:to-ev-gold/90 text-white font-semibold rounded-xl h-11 shadow-lg shadow-ev-orange/20"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Read More →
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
