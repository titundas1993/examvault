"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, Edit, Trash2, CalendarDays, Upload, X, Loader2,
  ExternalLink, Link as LinkIcon, Image as ImageIcon, CheckCircle, AlertTriangle
} from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  getExams, addExam, updateExam, deleteExam, ExamData,
} from "@/lib/services/firestore";
import { Button } from "@/components/ui/button";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORIES = ["WBCS", "SSC", "Railway", "Banking", "UPSC", "JEXPO", "Other"];
const STATUSES: ExamData["status"][] = ["upcoming", "ongoing", "closed"];

const emptyForm: Omit<ExamData, "id" | "createdAt"> = {
  name: "",
  organizingBody: "",
  category: "WBCS",
  examDate: "",
  lastApplyDate: "",
  eligibility: "",
  ageLimit: "",
  applicationFee: "",
  syllabus: "",
  applyLink: "",
  officialLink: "",
  imageUrl: "",
  status: "upcoming",
};

export default function AdminUpcomingExams() {
  const [exams, setExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    const data = await getExams();
    if (data) setExams(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImagePreview("");
    setDialogOpen(true);
  };

  const openEdit = (exam: ExamData) => {
    setEditingId(exam.id ?? null);
    setForm({
      name: exam.name,
      organizingBody: exam.organizingBody,
      category: exam.category,
      examDate: exam.examDate,
      lastApplyDate: exam.lastApplyDate,
      eligibility: exam.eligibility,
      ageLimit: exam.ageLimit,
      applicationFee: exam.applicationFee,
      syllabus: exam.syllabus,
      applyLink: exam.applyLink,
      officialLink: exam.officialLink,
      imageUrl: exam.imageUrl,
      status: exam.status,
    });
    setImagePreview(exam.imageUrl);
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const fileRef = ref(storage, `exams/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      setUploadProgress(50);
      const url = await getDownloadURL(snapshot.ref);
      setUploadProgress(100);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      setImagePreview(url);
      showToast("success", "Image uploaded successfully!");
    } catch {
      showToast("error", "Failed to upload image");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("error", "Exam name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const result = await updateExam(editingId, form);
        if (result) {
          showToast("success", "Exam updated successfully!");
        } else {
          showToast("error", "Failed to update exam");
        }
      } else {
        const result = await addExam(form);
        if (result) {
          showToast("success", "Exam added successfully!");
        } else {
          showToast("error", "Failed to add exam");
        }
      }
      setDialogOpen(false);
      fetchExams();
    } catch {
      showToast("error", "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteExam(deleteId);
    if (result) {
      showToast("success", "Exam deleted successfully!");
    } else {
      showToast("error", "Failed to delete exam");
    }
    setDeleteOpen(false);
    setDeleteId(null);
    fetchExams();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-ev-gold/15 text-ev-gold border-ev-gold/30";
      case "ongoing": return "bg-ev-green/15 text-ev-green border-ev-green/30";
      case "closed": return "bg-ev-red/15 text-ev-red border-ev-red/30";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      WBCS: "bg-ev-navy/10 text-ev-navy border-ev-navy/20",
      SSC: "bg-ev-orange/10 text-ev-orange border-ev-orange/20",
      Railway: "bg-ev-purple/10 text-ev-purple border-ev-purple/20",
      Banking: "bg-ev-green/10 text-ev-green border-ev-green/20",
      UPSC: "bg-ev-gold/10 text-ev-gold border-ev-gold/20",
      JEXPO: "bg-ev-red/10 text-ev-red border-ev-red/20",
      Other: "bg-gray-100 text-gray-600 border-gray-200",
    };
    return map[cat] || map.Other;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up ${
          toast.type === "success" ? "bg-ev-green text-white" : "bg-ev-red text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ev-navy">Upcoming Exams</h1>
            <p className="text-gray-500 text-sm">Manage exam listings and details</p>
          </div>
        </div>
        <Button
          onClick={openAdd}
          className="bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> Add New Exam
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Exams", count: exams.length, color: "text-ev-navy" },
          { label: "Upcoming", count: exams.filter(e => e.status === "upcoming").length, color: "text-ev-gold" },
          { label: "Ongoing", count: exams.filter(e => e.status === "ongoing").length, color: "text-ev-green" },
          { label: "Closed", count: exams.filter(e => e.status === "closed").length, color: "text-ev-red" },
        ].map(stat => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-ev-orange" />
              <span className="ml-3 text-gray-500">Loading exams...</span>
            </div>
          ) : exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <CalendarDays className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-semibold">No exams found</p>
              <p className="text-sm">Click &quot;Add New Exam&quot; to create one</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="font-bold text-ev-navy">Exam Name</TableHead>
                    <TableHead className="font-bold text-ev-navy">Category</TableHead>
                    <TableHead className="font-bold text-ev-navy">Exam Date</TableHead>
                    <TableHead className="font-bold text-ev-navy">Status</TableHead>
                    <TableHead className="font-bold text-ev-navy text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id} className="hover:bg-ev-orange/5 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-ev-navy">{exam.name}</p>
                          <p className="text-xs text-gray-400">{exam.organizingBody}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${categoryColor(exam.category)}`}>
                          {exam.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{exam.examDate || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${statusColor(exam.status)}`}>
                          {exam.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(exam)} className="h-8 w-8 p-0 hover:bg-ev-orange/10">
                            <Edit className="w-4 h-4 text-ev-orange" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDelete(exam.id!)} className="h-8 w-8 p-0 hover:bg-ev-red/10">
                            <Trash2 className="w-4 h-4 text-ev-red" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-ev-navy text-xl font-black">
              {editingId ? "Edit Exam" : "Add New Exam"}
            </DialogTitle>
            <DialogDescription>
              {editingId ? "Update exam information below" : "Fill in the exam details below"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="grid gap-4 py-2 px-1">
              {/* Row 1: Name + Organizing Body */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Exam Name *</Label>
                  <Input
                    placeholder="e.g. WBCS 2026 Prelims"
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Organizing Body</Label>
                  <Input
                    placeholder="e.g. WBPSC"
                    value={form.organizingBody}
                    onChange={(e) => setForm(p => ({ ...p, organizingBody: e.target.value }))}
                    className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20"
                  />
                </div>
              </div>

              {/* Row 2: Category + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="w-full border-gray-200 focus:border-ev-orange">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v as ExamData["status"] }))}>
                    <SelectTrigger className="w-full border-gray-200 focus:border-ev-orange">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Exam Date + Last Apply Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Exam Date</Label>
                  <Input
                    type="date"
                    value={form.examDate}
                    onChange={(e) => setForm(p => ({ ...p, examDate: e.target.value }))}
                    className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Last Apply Date</Label>
                  <Input
                    type="date"
                    value={form.lastApplyDate}
                    onChange={(e) => setForm(p => ({ ...p, lastApplyDate: e.target.value }))}
                    className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20"
                  />
                </div>
              </div>

              {/* Row 4: Eligibility */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Eligibility</Label>
                <Textarea
                  placeholder="e.g. Graduate from any recognized university"
                  value={form.eligibility}
                  onChange={(e) => setForm(p => ({ ...p, eligibility: e.target.value }))}
                  rows={3}
                  className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20 resize-none"
                />
              </div>

              {/* Row 5: Age Limit + Application Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Age Limit</Label>
                  <Input
                    placeholder="e.g. 21-36 years"
                    value={form.ageLimit}
                    onChange={(e) => setForm(p => ({ ...p, ageLimit: e.target.value }))}
                    className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Application Fee</Label>
                  <Input
                    placeholder="e.g. ₹200 for General, ₹0 for SC/ST"
                    value={form.applicationFee}
                    onChange={(e) => setForm(p => ({ ...p, applicationFee: e.target.value }))}
                    className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20"
                  />
                </div>
              </div>

              {/* Row 6: Syllabus */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Syllabus / Exam Pattern</Label>
                <Textarea
                  placeholder="Describe the syllabus and exam pattern..."
                  value={form.syllabus}
                  onChange={(e) => setForm(p => ({ ...p, syllabus: e.target.value }))}
                  rows={3}
                  className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20 resize-none"
                />
              </div>

              {/* Row 7: Apply Link + Official Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Apply Link</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={form.applyLink}
                      onChange={(e) => setForm(p => ({ ...p, applyLink: e.target.value }))}
                      className="pl-9 border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Official Link</Label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={form.officialLink}
                      onChange={(e) => setForm(p => ({ ...p, officialLink: e.target.value }))}
                      className="pl-9 border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20"
                    />
                  </div>
                </div>
              </div>

              {/* Row 8: Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Exam Image</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-ev-orange/50 transition-colors">
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg object-cover" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setImagePreview(""); setForm(p => ({ ...p, imageUrl: "" })); }}
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-ev-red text-white rounded-full hover:bg-ev-red/80"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <ImageIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">
                        {uploading ? `Uploading... ${uploadProgress}%` : "Click to upload image"}
                      </p>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                    </label>
                  )}
                  {uploading && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-ev-orange h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold hover:shadow-lg"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : editingId ? (
                <><Edit className="w-4 h-4 mr-2" /> Update Exam</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Add Exam</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ev-navy">Delete Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The exam record will be permanently removed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-ev-red hover:bg-ev-red/80 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
