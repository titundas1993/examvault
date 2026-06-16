"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Calendar,
  Building2,
  Clock,
  Filter,
  RefreshCw,
  GraduationCap,
  Briefcase,
  Shield,
  Stethoscope,
  Scale,
  Landmark,
  Flame,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { getExams, ExamData } from "@/lib/services/firestore";

const categoryEmojis: Record<string, { emoji: string; icon: React.ElementType; gradient: string }> = {
  "government": { emoji: "🏛️", icon: Landmark, gradient: "from-ev-navy to-blue-800" },
  "banking": { emoji: "🏦", icon: Landmark, gradient: "from-ev-orange to-amber-600" },
  "railway": { emoji: "🚂", icon: Briefcase, gradient: "from-ev-green to-emerald-700" },
  "ssc": { emoji: "📋", icon: Shield, gradient: "from-ev-purple to-purple-800" },
  "upsc": { emoji: "🎓", icon: GraduationCap, gradient: "from-ev-dark to-ev-navy" },
  "defence": { emoji: "🛡️", icon: Shield, gradient: "from-ev-navy to-ev-dark" },
  "medical": { emoji: "🏥", icon: Stethoscope, gradient: "from-ev-red to-rose-700" },
  "law": { emoji: "⚖️", icon: Scale, gradient: "from-ev-gold to-amber-600" },
  "teaching": { emoji: "📚", icon: GraduationCap, gradient: "from-ev-orange to-ev-gold" },
  "engineering": { emoji: "⚙️", icon: Briefcase, gradient: "from-gray-700 to-gray-900" },
  "insurance": { emoji: "🛡️", icon: Shield, gradient: "from-blue-600 to-blue-800" },
  "state": { emoji: "🏛️", icon: Landmark, gradient: "from-ev-dark to-ev-navy" },
};

function getCategoryInfo(category: string) {
  const lower = category?.toLowerCase() || "";
  for (const key of Object.keys(categoryEmojis)) {
    if (lower.includes(key)) return categoryEmojis[key];
  }
  return { emoji: "📝", icon: GraduationCap, gradient: "from-ev-navy to-ev-dark" };
}

function getDaysLeft(dateStr: string): number {
  if (!dateStr) return -1;
  const examDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const statusConfig = {
  upcoming: { label: "Upcoming", color: "bg-ev-green/15 text-ev-green border-ev-green/30" },
  ongoing: { label: "Ongoing", color: "bg-ev-orange/15 text-ev-orange border-ev-orange/30" },
  closed: { label: "Closed", color: "bg-ev-red/15 text-ev-red border-ev-red/30" },
};

export default function UpcomingExamsTab() {
  const { language, setSelectedExamId, setView } = useAppStore();
  const [exams, setExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchExams = useCallback(async () => {
    try {
      const data = await getExams();
      setExams(data || []);
    } catch (err) {
      console.error("Error fetching exams:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    fetchExams();
  };

  // Extract unique categories
  const categories = ["all", ...Array.from(new Set(exams.map((e) => e.category).filter(Boolean)))];

  // Filter exams
  const filtered = exams.filter((exam) => {
    const matchSearch =
      !search ||
      exam.name?.toLowerCase().includes(search.toLowerCase()) ||
      exam.organizingBody?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === "all" || exam.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleExamClick = (id: string) => {
    setSelectedExamId(id);
    setView("upcoming-exam-detail");
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex gap-3">
              <Skeleton className="w-14 h-14 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
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
            <h1 className="text-lg font-bold text-ev-navy dark:text-white">
              {t("upcomingExams", language)}
            </h1>
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
              placeholder={t("searchTests", language)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-ev-light dark:bg-gray-900 border-0 rounded-xl h-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 pb-3">
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-ev-navy text-white shadow-sm"
                      : "bg-ev-blue-light dark:bg-white/10 text-ev-navy dark:text-white/70 hover:bg-ev-orange-light dark:hover:bg-white/15"
                  }`}
                >
                  {cat === "all"
                    ? t("viewAll", language) || "All"
                    : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Exam List */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-ev-blue-light dark:bg-white/10 flex items-center justify-center mb-4">
                <Calendar className="w-9 h-9 text-ev-navy/40 dark:text-white/40" />
              </div>
              <h3 className="text-base font-semibold text-ev-navy dark:text-white mb-1">
                {t("noExamsFound", language) || "No Exams Found"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("noExamsDesc", language) || "Check back later for new exam updates"}
              </p>
            </motion.div>
          ) : (
            filtered.map((exam, idx) => {
              const catInfo = getCategoryInfo(exam.category);
              const daysLeft = getDaysLeft(exam.examDate);
              const status = statusConfig[exam.status] || statusConfig.upcoming;

              return (
                <motion.div
                  key={exam.id || idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleExamClick(exam.id!)}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 cursor-pointer hover:shadow-md hover:border-ev-orange/30 transition-all active:scale-[0.99]"
                >
                  <div className="flex gap-3">
                    {/* Image or Emoji */}
                    {exam.imageUrl ? (
                      <img
                        src={exam.imageUrl}
                        alt={exam.name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${catInfo.gradient} flex items-center justify-center flex-shrink-0 text-2xl`}
                      >
                        {catInfo.emoji}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-ev-navy dark:text-white truncate">
                        {exam.name}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        {exam.organizingBody}
                      </p>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(exam.examDate)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {daysLeft > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-ev-orange">
                          <Clock className="w-3 h-3" />
                          {daysLeft}d left
                        </span>
                      )}
                      {daysLeft === 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-ev-red">
                          <Flame className="w-3 h-3" />
                          Today!
                        </span>
                      )}

                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 border ${status.color}`}
                      >
                        {status.label}
                      </Badge>

                      {exam.category && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5 bg-ev-blue-light dark:bg-white/10 text-ev-navy dark:text-white/70 border-ev-blue-light dark:border-white/20"
                        >
                          {exam.category}
                        </Badge>
                      )}
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
