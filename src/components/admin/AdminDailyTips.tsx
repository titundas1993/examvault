"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, Edit, Trash2, Lightbulb, Upload, X, Loader2,
  Link as LinkIcon, Image as ImageIcon, CheckCircle, AlertTriangle
} from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection, getDocs, orderBy, query, deleteDoc, doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  addTip, updateTip, deleteTip, TipData,
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
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const TIP_CATEGORIES: TipData["category"][] = ["study", "exam-strategy", "time-management", "motivation"];

const categoryLabels: Record<string, string> = {
  "study": "Study",
  "exam-strategy": "Exam Strategy",
  "time-management": "Time Management",
  "motivation": "Motivation",
};

const categoryColors: Record<string, string> = {
  "study": "bg-ev-navy/10 text-ev-navy border-ev-navy/20",
  "exam-strategy": "bg-ev-orange/10 text-ev-orange border-ev-orange/20",
  "time-management": "bg-ev-purple/10 text-ev-purple border-ev-purple/20",
  "motivation": "bg-ev-green/10 text-ev-green border-ev-green/20",
};

const emptyForm: Omit<TipData, "id" | "createdAt"> = {
  title: "",
  description: "",
  category: "study",
  referenceLink: "",
  imageUrl: "",
  isActive: true,
};

async function getAllTips(): Promise<TipData[]> {
  try {
    const q = query(collection(db, "dailyTips"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return { ...data, id: d.id } as TipData;
    });
  } catch (error) {
    console.error("Error getting all tips:", error);
    return [];
  }
}

export default function AdminDailyTips() {
  const [tips, setTips] = useState<TipData[]>([]);
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

  const fetchTips = useCallback(async () => {
    setLoading(true);
    const data = await getAllTips();
    setTips(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTips(); }, [fetchTips]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImagePreview("");
    setDialogOpen(true);
  };

  const openEdit = (tip: TipData) => {
    setEditingId(tip.id ?? null);
    setForm({
      title: tip.title,
      description: tip.description,
      category: tip.category,
      referenceLink: tip.referenceLink,
      imageUrl: tip.imageUrl,
      isActive: tip.isActive,
    });
    setImagePreview(tip.imageUrl);
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
      const fileRef = ref(storage, `tips/${Date.now()}_${file.name}`);
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

  const handleToggleActive = async (tip: TipData) => {
    const result = await updateTip(tip.id!, { isActive: !tip.isActive });
    if (result) {
      showToast("success", `Tip ${tip.isActive ? "deactivated" : "activated"}`);
      fetchTips();
    } else {
      showToast("error", "Failed to update tip status");
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast("error", "Tip title is required");
      return;
    }
    if (!form.description.trim()) {
      showToast("error", "Tip description is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const result = await updateTip(editingId, form);
        if (result) {
          showToast("success", "Tip updated successfully!");
        } else {
          showToast("error", "Failed to update tip");
        }
      } else {
        const result = await addTip(form);
        if (result) {
          showToast("success", "Tip added successfully!");
        } else {
          showToast("error", "Failed to add tip");
        }
      }
      setDialogOpen(false);
      fetchTips();
    } catch {
      showToast("error", "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteTip(deleteId);
    if (result) {
      showToast("success", "Tip deleted successfully!");
    } else {
      showToast("error", "Failed to delete tip");
    }
    setDeleteOpen(false);
    setDeleteId(null);
    fetchTips();
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ev-gold to-amber-500 flex items-center justify-center shadow-lg">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ev-navy">Daily Tips</h1>
            <p className="text-gray-500 text-sm">Manage study tips and strategies</p>
          </div>
        </div>
        <Button
          onClick={openAdd}
          className="bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> Add New Tip
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Tips", count: tips.length, color: "text-ev-navy" },
          { label: "Active", count: tips.filter(t => t.isActive).length, color: "text-ev-green" },
          { label: "Inactive", count: tips.filter(t => !t.isActive).length, color: "text-ev-red" },
          { label: "Categories", count: new Set(tips.map(t => t.category)).size, color: "text-ev-purple" },
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
              <Loader2 className="w-8 h-8 animate-spin text-ev-gold" />
              <span className="ml-3 text-gray-500">Loading tips...</span>
            </div>
          ) : tips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Lightbulb className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-semibold">No tips found</p>
              <p className="text-sm">Click &quot;Add New Tip&quot; to create one</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="font-bold text-ev-navy">Title</TableHead>
                    <TableHead className="font-bold text-ev-navy">Category</TableHead>
                    <TableHead className="font-bold text-ev-navy">Status</TableHead>
                    <TableHead className="font-bold text-ev-navy text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tips.map((tip) => (
                    <TableRow key={tip.id} className="hover:bg-ev-gold/5 transition-colors">
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-semibold text-ev-navy truncate">{tip.title}</p>
                          <p className="text-xs text-gray-400 truncate">{tip.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${categoryColors[tip.category] || "bg-gray-100 text-gray-600"}`}>
                          {categoryLabels[tip.category] || tip.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tip.isActive}
                            onCheckedChange={() => handleToggleActive(tip)}
                            className="data-[state=checked]:bg-ev-green"
                          />
                          <span className={`text-xs font-medium ${tip.isActive ? "text-ev-green" : "text-gray-400"}`}>
                            {tip.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(tip)} className="h-8 w-8 p-0 hover:bg-ev-orange/10">
                            <Edit className="w-4 h-4 text-ev-orange" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDelete(tip.id!)} className="h-8 w-8 p-0 hover:bg-ev-red/10">
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-ev-navy text-xl font-black">
              {editingId ? "Edit Tip" : "Add New Tip"}
            </DialogTitle>
            <DialogDescription>
              {editingId ? "Update tip details below" : "Create a new daily tip for students"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="grid gap-4 py-2 px-1">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Title *</Label>
                <Input
                  placeholder="e.g. Pomodoro Technique for Better Focus"
                  value={form.title}
                  onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                  className="border-gray-200 focus:border-ev-gold focus:ring-ev-gold/20"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Description *</Label>
                <Textarea
                  placeholder="Write the tip description in detail..."
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="border-gray-200 focus:border-ev-gold focus:ring-ev-gold/20 resize-none"
                />
              </div>

              {/* Category + Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v as TipData["category"] }))}>
                    <SelectTrigger className="w-full border-gray-200 focus:border-ev-gold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIP_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Active Status</Label>
                  <div className="flex items-center gap-3 h-9">
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(v) => setForm(p => ({ ...p, isActive: v }))}
                      className="data-[state=checked]:bg-ev-green"
                    />
                    <span className={`text-sm font-medium ${form.isActive ? "text-ev-green" : "text-gray-400"}`}>
                      {form.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reference Link */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Reference Link (optional)</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={form.referenceLink}
                    onChange={(e) => setForm(p => ({ ...p, referenceLink: e.target.value }))}
                    className="pl-9 border-gray-200 focus:border-ev-gold focus:ring-ev-gold/20"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Tip Image</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-ev-gold/50 transition-colors">
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
                      <div className="bg-ev-gold h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
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
                <><Edit className="w-4 h-4 mr-2" /> Update Tip</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Add Tip</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ev-navy">Delete Tip?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The tip will be permanently removed.
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
