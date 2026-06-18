"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Building2,
  Users,
  DollarSign,
  BookOpen,
  ExternalLink,
  Share2,
  GraduationCap,
  Landmark,
  Briefcase,
  Shield,
  Stethoscope,
  Scale,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe,
  Link2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { getExamById, ExamData } from "@/lib/services/firestore";

const categoryMeta: Record<string, { emoji: string; gradient: string }> = {
  government: { emoji: "🏛️", gradient: "from-ev-navy to-blue-800" },
  banking: { emoji: "🏦", gradient: "from-ev-orange to-amber-600" },
  railway: { emoji: "🚂", gradient: "from-ev-green to-emerald-700" },
  ssc: { emoji: "📋", gradient: "from-ev-purple to-purple-800" },
  upsc: { emoji: "🎓", gradient: "from-ev-dark to-ev-navy" },
  defence: { emoji: "🛡️", gradient: "from-ev-navy to-ev-dark" },
  medical: { emoji: "🏥", gradient: "from-ev-red to-rose-700" },
  law: { emoji: "⚖️", gradient: "from-ev-gold to-amber-600" },
  teaching: { emoji: "📚", gradient: "from-ev-orange to-ev-gold" },
  engineering: { emoji: "⚙️", gradient: "from-gray-700 to-gray-900" },
  insurance: { emoji: "🛡️", gradient: "from-blue-600 to-blue-800" },
  state: { emoji: "🏛️", gradient: "from-ev-dark to-ev-navy" },
};

function getCategoryMeta(category: string) {
  const lower = category?.toLowerCase() || "";
  for (const key of Object.keys(categoryMeta)) {
    if (lower.includes(key)) return categoryMeta[key];
  }
  return { emoji: "📝", gradient: "from-ev-navy to-ev-dark" };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDaysLeft(dateStr: string): number {
  if (!dateStr) return -1;
  const examDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function UpcomingExamDetail() {
  const { selectedExamId, setView, language, user, setShowGuestModal } = useAppStore();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syllabusOpen, setSyllabusOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedExamId) return;
    getExamById(selectedExamId)
      .then((data) => setExam(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedExamId]);

  const handleApply = () => {
    if (!user || user.role === "guest") {
      setShowGuestModal(true);
      return;
    }
    if (exam?.applyLink) {
      window.open(exam.applyLink, "_blank", "noopener");
    }
  };

  const handleShare = async () => {
    const shareText = `${exam?.name} - ${exam?.organizingBody}\nExam Date: ${formatDate(exam?.examDate || "")}\nApply: ${exam?.applyLink || ""}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: exam?.name, text: shareText, url: exam?.applyLink });
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
      <div className="min-h-screen bg-ev-light dark:bg-gray-950">
        <div className="h-48 bg-gradient-to-br from-ev-navy to-ev-dark animate-pulse" />
        <div className="p-4 space-y-4 -mt-6">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-ev-light dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-ev-red/10 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-ev-red" />
        </div>
        <h3 className="font-semibold text-ev-navy dark:text-white mb-1">Exam not found</h3>
        <p className="text-sm text-muted-foreground mb-4">The exam you&apos;re looking for doesn&apos;t exist.</p>
        <Button variant="outline" onClick={() => setView("upcoming-exams")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("back", language)}
        </Button>
      </div>
    );
  }

  const catMeta = getCategoryMeta(exam.category);
  const daysLeft = getDaysLeft(exam.examDate);
  return (
    <div className="min-h-screen bg-ev-light dark:bg-gray-950 pb-20">
      {/* Hero Section */}
      <div className="relative">
        {exam.imageUrl ? (
          <div className="relative h-48 overflow-hidden">
            <img
              src={exam.imageUrl}
              alt={exam.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ev-navy/90 via-ev-navy/40 to-transparent" />
          </div>
        ) : (
          <div className={`h-48 bg-gradient-to-br ${catMeta.gradient} flex items-center justify-center`}>
            <span className="text-6xl">{catMeta.emoji}</span>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => setView("upcoming-exams")}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-colors"
        >
          {copied ? (
            <CheckCircle2 className="w-5 h-5 text-ev-green" />
          ) : (
            <Share2 className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h1 className="text-xl font-bold text-white drop-shadow-lg">{exam.name}</h1>
          <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
            <Building2 className="w-3.5 h-3.5" />
            {exam.organizingBody}
          </p>
        </div>
      </div>

      {/* Days Left Badge */}
      {daysLeft > 0 && (
        <div className="px-4 -mt-4 relative z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 rounded-full px-4 py-2 shadow-lg border border-border"
          >
            <Clock className="w-4 h-4 text-ev-orange" />
            <span className="text-sm font-semibold text-ev-navy dark:text-white">
              {daysLeft} days left
            </span>
          </motion.div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Info Cards — Date & Fee in grid */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard
            icon={<Calendar className="w-4 h-4 text-ev-orange" />}
            label="Exam Date"
            value={formatDate(exam.examDate)}
          />
          <InfoCard
            icon={<Clock className="w-4 h-4 text-ev-gold" />}
            label="Last Apply Date"
            value={formatDate(exam.lastApplyDate)}
          />
        </div>

        {/* Eligibility — full width so long text is readable */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-ev-green" />
            <span className="text-xs font-medium text-muted-foreground">Eligibility</span>
          </div>
          <p className="text-sm font-semibold text-ev-navy dark:text-white whitespace-pre-line leading-relaxed">{exam.eligibility || "—"}</p>
        </div>

        {/* Age Limit — full width so long text is readable */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-ev-purple" />
            <span className="text-xs font-medium text-muted-foreground">Age Limit</span>
          </div>
          <p className="text-sm font-semibold text-ev-navy dark:text-white whitespace-pre-line leading-relaxed">{exam.ageLimit || "—"}</p>
        </div>

        {/* Application Fee */}
        {(exam.applicationFee) && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-ev-green" />
              <span className="text-xs font-medium text-muted-foreground">Application Fee</span>
            </div>
            <p className="text-sm font-semibold text-ev-navy dark:text-white">{exam.applicationFee}</p>
          </div>
        )}

        {/* Syllabus / Exam Pattern */}
        {exam.syllabus && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setSyllabusOpen(!syllabusOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-ev-light dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-ev-navy dark:text-white" />
                <span className="text-sm font-semibold text-ev-navy dark:text-white">
                  Syllabus / Exam Pattern
                </span>
              </div>
              {syllabusOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {syllabusOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="px-4 pb-4"
              >
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {exam.syllabus}
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* Apply Link — INLINE display so it's always visible */}
        {exam.applyLink && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4 text-ev-orange" />
              <span className="text-xs font-medium text-muted-foreground">Apply Link</span>
            </div>
            <a
              href={exam.applyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ev-orange hover:underline break-all font-medium"
            >
              {exam.applyLink}
            </a>
            <Button
              onClick={handleApply}
              className="w-full mt-3 bg-gradient-to-r from-ev-orange to-ev-gold hover:from-ev-orange/90 hover:to-ev-gold/90 text-white font-semibold shadow-lg shadow-ev-orange/20 rounded-xl h-10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Apply Now
            </Button>
          </div>
        )}

        {/* Official Link — INLINE display so it's always visible */}
        {exam.officialLink && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-ev-navy dark:text-white" />
              <span className="text-xs font-medium text-muted-foreground">Official Website</span>
            </div>
            <a
              href={exam.officialLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ev-orange hover:underline break-all font-medium"
            >
              {exam.officialLink}
            </a>
            <Button
              onClick={() => window.open(exam.officialLink, "_blank", "noopener")}
              variant="outline"
              className="w-full mt-3 border-ev-navy dark:border-white/30 text-ev-navy dark:text-white hover:bg-ev-navy hover:text-white rounded-xl h-10"
            >
              <Globe className="w-4 h-4 mr-2" />
              Visit Official Site
            </Button>
          </div>
        )}

        {/* Category Badge */}
        {exam.category && (
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Category:</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-ev-blue-light dark:bg-white/10 text-ev-navy dark:text-white/70 border border-ev-blue-light dark:border-white/20">
              {exam.category}
            </span>
          </div>
        )}

        {/* Status Badge */}
        {exam.status && (
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
              exam.status === "upcoming" ? "bg-ev-green/15 text-ev-green border-ev-green/30" :
              exam.status === "ongoing" ? "bg-ev-orange/15 text-ev-orange border-ev-orange/30" :
              "bg-ev-red/15 text-ev-red border-ev-red/30"
            }`}>
              {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
            </span>
          </div>
        )}
      </div>


    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 mb-1.5">{icon}</div>
      <span className="text-[10px] text-muted-foreground block mb-0.5">{label}</span>
      <p className="text-xs font-semibold text-ev-navy dark:text-white line-clamp-2">{value}</p>
    </div>
  );
}
