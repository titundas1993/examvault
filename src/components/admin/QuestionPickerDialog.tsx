"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, CheckSquare, Square, Loader2, BookOpen, AlertTriangle } from "lucide-react";
import { adminGetCollection, adminUpdateDoc } from "@/lib/services/admin-api";

// ─── Filter Options ───────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  "All", "WBCS", "SSC", "Railway", "Banking", "UPSC", "JEXPO", "VOCLET", "PSC", "Others",
];
const SUBJECT_OPTIONS = [
  "All", "History", "Geography", "Math", "English", "Science", "Polity", "Economy", "Reasoning", "GK", "Computer", "Others",
];
const DIFFICULTY_OPTIONS = ["All", "easy", "medium", "hard"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionItem {
  id: string;
  question?: string;
  category?: string;
  subject?: string;
  difficulty?: string;
  testId?: string;
  [key: string]: unknown;
}

interface QuestionPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  testTitle: string;
  onSave: () => void;
}

// ─── Difficulty Badge Helpers ──────────────────────────────────────────────────

function getDifficultyStyles(difficulty: string): string {
  switch (difficulty) {
    case "easy":
      return "bg-green-50 text-green-600 border-green-200";
    case "hard":
      return "bg-red-50 text-red-600 border-red-200";
    case "medium":
    default:
      return "bg-amber-50 text-amber-600 border-amber-200";
  }
}

function capitalizeDifficulty(difficulty: string): string {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function QuestionPickerDialog({
  open,
  onOpenChange,
  testId,
  testTitle,
  onSave,
}: QuestionPickerDialogProps) {
  // Data state
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Tracks which IDs were originally linked to this test (for undo on cancel)
  const [originalLinkedIds, setOriginalLinkedIds] = useState<Set<string>>(new Set());

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  // Toast state (inline, inside dialog)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ─── Fetch questions when dialog opens ────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function fetchQuestions() {
      setLoading(true);
      try {
        const data = await adminGetCollection("questions");
        if (cancelled) return;

        const items: QuestionItem[] = Array.isArray(data)
          ? data.map((doc: any) => ({
              id: doc.id || doc._id || "",
              question: doc.question || "",
              category: doc.category || "",
              subject: doc.subject || "",
              difficulty: doc.difficulty || "medium",
              testId: doc.testId || "",
              ...doc,
            }))
          : [];

        setQuestions(items);

        // Pre-select questions already linked to this test
        const linked = new Set<string>();
        items.forEach((q) => {
          if (q.testId === testId) {
            linked.add(q.id);
          }
        });
        setSelectedIds(new Set(linked));
        setOriginalLinkedIds(new Set(linked));

        // Reset filters
        setSearchQuery("");
        setCategoryFilter("All");
        setSubjectFilter("All");
        setDifficultyFilter("All");
        setToast(null);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
        setToast({ message: "Failed to load questions.", type: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuestions();

    return () => {
      cancelled = true;
    };
  }, [open, testId]);

  // ─── Filtered questions (memoized) ────────────────────────────────────────

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = (q.question || "").toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      // Category filter
      if (categoryFilter !== "All") {
        if ((q.category || "") !== categoryFilter) return false;
      }

      // Subject filter
      if (subjectFilter !== "All") {
        if ((q.subject || "") !== subjectFilter) return false;
      }

      // Difficulty filter
      if (difficultyFilter !== "All") {
        if ((q.difficulty || "medium") !== difficultyFilter) return false;
      }

      return true;
    });
  }, [questions, searchQuery, categoryFilter, subjectFilter, difficultyFilter]);

  // Counts
  const totalCount = questions.length;
  const selectedCount = selectedIds.size;
  const filteredCount = filteredQuestions.length;
  const allFilteredSelected =
    filteredQuestions.length > 0 &&
    filteredQuestions.every((q) => selectedIds.has(q.id));

  // ─── Toggle selection ────────────────────────────────────────────────────

  const toggleQuestion = useCallback((questionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredQuestions.forEach((q) => next.add(q.id));
      return next;
    });
  }, [filteredQuestions]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredQuestions.forEach((q) => next.delete(q.id));
      return next;
    });
  }, [filteredQuestions]);

  // ─── Save changes ───────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setToast(null);

    try {
      // Determine newly added and removed questions
      const toAdd: string[] = [];
      const toRemove: string[] = [];

      selectedIds.forEach((id) => {
        if (!originalLinkedIds.has(id)) {
          toAdd.push(id);
        }
      });

      originalLinkedIds.forEach((id) => {
        if (!selectedIds.has(id)) {
          toRemove.push(id);
        }
      });

      // Execute updates in parallel batches
      const updates: Promise<unknown>[] = [];

      for (const id of toAdd) {
        updates.push(adminUpdateDoc("questions", id, { testId }));
      }

      for (const id of toRemove) {
        updates.push(adminUpdateDoc("questions", id, { testId: "" }));
      }

      await Promise.all(updates);

      const addedCount = toAdd.length;
      const removedCount = toRemove.length;

      const parts: string[] = [];
      if (addedCount > 0) parts.push(`${addedCount} added`);
      if (removedCount > 0) parts.push(`${removedCount} removed`);

      const summary = parts.length > 0 ? parts.join(", ") : "No changes";
      setToast({ message: `✅ Saved successfully — ${summary}`, type: "success" });

      // Notify parent to refetch
      onSave();

      // Close dialog after a brief delay so the user sees the success toast
      setTimeout(() => {
        onOpenChange(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to save question selections:", err);
      setToast({
        message: `❌ Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [saving, selectedIds, originalLinkedIds, testId, onSave, onOpenChange]);

  // ─── Cancel — discard changes ───────────────────────────────────────────

  const handleCancel = useCallback(() => {
    setSelectedIds(new Set(originalLinkedIds));
    onOpenChange(false);
  }, [originalLinkedIds, onOpenChange]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); else onOpenChange(true); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span>Questions for: {testTitle}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select questions to link to this test. Changes are saved when you click Save.
          </DialogDescription>
        </DialogHeader>

        {/* ── Search & Filter Bar ─────────────────────────────────────── */}
        <div className="px-6 pb-3 space-y-3 border-b">
          {/* Search row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={allFilteredSelected ? "default" : "outline"}
              size="sm"
              onClick={allFilteredSelected ? handleDeselectAll : handleSelectAll}
              className="shrink-0 gap-1.5"
            >
              {allFilteredSelected ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select All
                </>
              )}
            </Button>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat === "All" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_OPTIONS.map((subj) => (
                  <SelectItem key={subj} value={subj} className="text-xs">
                    {subj === "All" ? "All Subjects" : subj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((diff) => (
                  <SelectItem key={diff} value={diff} className="text-xs">
                    {diff === "All" ? "All Levels" : capitalizeDifficulty(diff)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto text-xs font-medium text-muted-foreground flex items-center gap-2">
              <span>
                Selected: <span className="text-blue-600 font-bold">{selectedCount}</span> / {totalCount}
              </span>
              {filteredCount !== totalCount && (
                <span className="text-muted-foreground">
                  (Showing {filteredCount})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Question List (scrollable) ───────────────────────────────── */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-sm text-muted-foreground">Loading questions...</span>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No questions found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Custom scrollbar styles */}
              <style>{`
                .question-picker-list::-webkit-scrollbar {
                  width: 6px;
                }
                .question-picker-list::-webkit-scrollbar-track {
                  background: transparent;
                }
                .question-picker-list::-webkit-scrollbar-thumb {
                  background: #d1d5db;
                  border-radius: 3px;
                }
                .question-picker-list::-webkit-scrollbar-thumb:hover {
                  background: #9ca3af;
                }
              `}</style>
              <ul className="question-picker-list divide-y divide-border">
                {filteredQuestions.map((q) => {
                  const isSelected = selectedIds.has(q.id);
                  const isAlreadyLinkedToOther =
                    q.testId && q.testId !== testId && q.testId !== "";

                  return (
                    <li
                      key={q.id}
                      className={`
                        flex items-start gap-3 px-6 py-3 cursor-pointer transition-colors
                        hover:bg-gray-50
                        ${isSelected ? "bg-blue-50/60" : ""}
                      `}
                      onClick={() => toggleQuestion(q.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleQuestion(q.id);
                        }
                      }}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                    >
                      {/* Checkbox icon */}
                      <div className="mt-0.5 shrink-0">
                        {isSelected ? (
                          <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
                        ) : (
                          <Square className="h-4.5 w-4.5 text-gray-300" />
                        )}
                      </div>

                      {/* Question content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Question text */}
                        <p className="text-sm leading-relaxed line-clamp-2 text-foreground">
                          {q.question || "(No question text)"}
                        </p>

                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {q.category && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                              {q.category}
                            </span>
                          )}

                          {q.difficulty && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${getDifficultyStyles(q.difficulty)}`}
                            >
                              {capitalizeDifficulty(q.difficulty)}
                            </span>
                          )}

                          {isAlreadyLinkedToOther && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="h-3 w-3" />
                              Already linked
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* ── Inline Toast ─────────────────────────────────────────────── */}
        {toast && (
          <div
            className={`
              mx-6 mb-0 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2
              ${toast.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
              }
            `}
          >
            {toast.message}
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between w-full gap-4">
            <span className="text-xs text-muted-foreground">
              {selectedCount} question{selectedCount !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save ({selectedCount} selected)
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
