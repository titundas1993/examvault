"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Target,
  Clock,
  Sparkles,
  ExternalLink,
  Search,
  RefreshCw,
  Lightbulb,
  Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { getTips, TipData } from "@/lib/services/firestore";

const tipCategoryConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  study: {
    label: "Study Tips",
    icon: BookOpen,
    color: "text-ev-navy",
    bg: "bg-ev-blue-light dark:bg-ev-navy/30",
    border: "border-ev-blue-light dark:border-ev-navy/40",
  },
  "exam-strategy": {
    label: "Exam Strategy",
    icon: Target,
    color: "text-ev-orange",
    bg: "bg-ev-orange-light dark:bg-ev-orange/15",
    border: "border-ev-orange-light dark:border-ev-orange/30",
  },
  "time-management": {
    label: "Time Management",
    icon: Clock,
    color: "text-ev-gold",
    bg: "bg-ev-gold-light dark:bg-ev-gold/15",
    border: "border-ev-gold-light dark:border-ev-gold/30",
  },
  motivation: {
    label: "Motivation",
    icon: Sparkles,
    color: "text-ev-purple",
    bg: "bg-purple-50 dark:bg-ev-purple/15",
    border: "border-purple-100 dark:border-ev-purple/30",
  },
};

const filterChips = [
  { key: "all", label: "All" },
  { key: "study", label: "Study Tips" },
  { key: "exam-strategy", label: "Exam Strategy" },
  { key: "time-management", label: "Time Management" },
  { key: "motivation", label: "Motivation" },
];

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function DailyTipsTab() {
  const { language, setSelectedTipId, setView } = useAppStore();
  const [tips, setTips] = useState<TipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchTips = useCallback(async () => {
    try {
      const data = await getTips();
      setTips(data || []);
    } catch (err) {
      console.error("Error fetching tips:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const handleRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    fetchTips();
  };

  const filtered = tips.filter((tip) => {
    const matchSearch =
      !search ||
      tip.title?.toLowerCase().includes(search.toLowerCase()) ||
      tip.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === "all" || tip.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleTipClick = (id: string) => {
    setSelectedTipId(id);
    setView("daily-tip-detail");
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full flex-shrink-0" />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
            <div className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ev-light dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-b border-border">
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ev-gold to-ev-orange flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-ev-navy dark:text-white">
                {t("dailyTips", language) || "Daily Tips"}
              </h1>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-ev-blue-light dark:hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-ev-navy dark:text-white ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-ev-light dark:bg-gray-900 border-0 rounded-xl h-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filterChips.map((chip) => {
              const catConfig = tipCategoryConfig[chip.key];
              const isActive = selectedCategory === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setSelectedCategory(chip.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-ev-navy text-white shadow-sm"
                      : "bg-ev-light dark:bg-white/10 text-ev-navy dark:text-white/70 hover:bg-ev-orange-light dark:hover:bg-white/15"
                  }`}
                >
                  {catConfig?.icon && <catConfig.icon className="w-3 h-3" />}
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tips List */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-ev-gold-light dark:bg-ev-gold/10 flex items-center justify-center mb-4">
                <Lightbulb className="w-9 h-9 text-ev-gold/50" />
              </div>
              <h3 className="text-base font-semibold text-ev-navy dark:text-white mb-1">
                No Tips Found
              </h3>
              <p className="text-sm text-muted-foreground">
                Check back later for new tips and strategies
              </p>
            </motion.div>
          ) : (
            filtered.map((tip, idx) => {
              const catConfig = tipCategoryConfig[tip.category] || tipCategoryConfig.study;
              const IconComp = catConfig.icon;

              return (
                <motion.div
                  key={tip.id || idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleTipClick(tip.id!)}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 cursor-pointer hover:shadow-md hover:border-ev-gold/30 transition-all active:scale-[0.99]"
                >
                  <div className="flex gap-3">
                    {/* Category Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl ${catConfig.bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <IconComp className={`w-5 h-5 ${catConfig.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-ev-navy dark:text-white line-clamp-1">
                        {tip.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {tip.description}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 ${catConfig.bg} ${catConfig.border} ${catConfig.color}`}
                        >
                          {catConfig.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {tip.createdAt ? formatDate(tip.createdAt) : ""}
                        </span>
                        {tip.referenceLink && (
                          <span className="text-[10px] text-ev-orange flex items-center gap-0.5">
                            <ExternalLink className="w-3 h-3" />
                            Link
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
