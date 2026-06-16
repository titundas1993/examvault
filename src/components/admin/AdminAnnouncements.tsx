"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, Edit, Trash2, Megaphone, Upload, X, Loader2,
  Link as LinkIcon, Image as ImageIcon, CheckCircle, AlertTriangle
} from "lucide-react";
import { storage, db } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
  addAnnouncement, updateAnnouncement, deleteAnnouncement, AnnouncementData,
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

const ANNOUNCEMENT_TYPES: AnnouncementData["type"][] = ["new", "alert", "offer"];

const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
  "new": { label: "New", color: "bg-ev-green/15 text-ev-green border-ev-green/30", icon: "🆕" },
  "alert": { label: "Alert", color: "bg-ev-red/15 text-ev-red border-ev-red/30", icon: "⚠️" },
  "offer": { label: "Offer", color: "bg-ev-gold/15 text-ev-gold border-ev-gold/30", icon: "🎁" },
};

const emptyForm: Omit<AnnouncementData, "id" | "createdAt"> = {
  title: "",
  description: "",
  type: "new",
  link: "",
  linkText: "",
  imageUrl: "",
  isActive: true,
};

async function getAllAnnouncements(): Promise<AnnouncementData[]> {
  try {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return { ...data, id: d.id } as AnnouncementData;
    });
  } catch (error) {
    console.error("Error getting all announcements:", error);
    return [];
  }
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
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

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const data = await getAllAnnouncements();
    setAnnouncements(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImagePreview("");
    setDialogOpen(true);
  };

  const openEdit = (item: AnnouncementData) => {
    setEditingId(item.id ?? null);
    setForm({
      title: item.title,
      description: item.description,
      type: item.type,
      link: item.link,
      linkText: item.linkText,
      imageUrl: item.imageUrl,
      isActive: item.isActive,
    });
    setImagePreview(item.imageUrl);
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
      const fileRef = ref(storage, `announcements/${Date.now()}_${file.name}`);
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

  const handleToggleActive = async (item: AnnouncementData) => {
    const result = await updateAnnouncement(item.id!, { isActive: !item.isActive });
    if (result) {
      showToast("success", `Announcement ${item.isActive ? "deactivated" : "activated"}`);
      fetchAnnouncements();
    } else {
      showToast("error", "Failed to update status");
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast("error", "Title is required");
      return;
    }
    if (!form.description.trim()) {
      showToast("error", "Description is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const result = await updateAnnouncement(editingId, form);
        if (result) {
          showToast("success", "Announcement updated!");
        } else {
          showToast("error", "Failed to update announcement");
        }
      } else {
        const result = await addAnnouncement(form);
        if (result) {
          showToast("success", "Announcement created!");
        } else {
          showToast("error", "Failed to create announcement");
        }
      }
      setDialogOpen(false);
      fetchAnnouncements();
    } catch {
      showToast("error", "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteAnnouncement(deleteId);
    if (result) {
      showToast("success", "Announcement deleted!");
    } else {
      showToast("error", "Failed to delete announcement");
    }
    setDeleteOpen(false);
    setDeleteId(null);
    fetchAnnouncements();
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ev-green to-emerald-600 flex items-center justify-center shadow-lg">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ev-navy">Announcements</h1>
            <p className="text-gray-500 text-sm">Manage app announcements and alerts</p>
          </div>
        </div>
        <Button
          onClick={openAdd}
          className="bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Announcement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", count: announcements.length, color: "text-ev-navy" },
          { label: "Active", count: announcements.filter(a => a.isActive).length, color: "text-ev-green" },
          { label: "Alerts", count: announcements.filter(a => a.type === "alert").length, color: "text-ev-red" },
          { label: "Offers", count: announcements.filter(a => a.type === "offer").length, color: "text-ev-gold" },
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
              <Loader2 className="w-8 h-8 animate-spin text-ev-green" />
              <span className="ml-3 text-gray-500">Loading announcements...</span>
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Megaphone className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-semibold">No announcements</p>
              <p className="text-sm">Create your first announcement</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="font-bold text-ev-navy">Title</TableHead>
                    <TableHead className="font-bold text-ev-navy">Type</TableHead>
                    <TableHead className="font-bold text-ev-navy">Status</TableHead>
                    <TableHead className="font-bold text-ev-navy">Link</TableHead>
                    <TableHead className="font-bold text-ev-navy text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((item) => (
                    <TableRow key={item.id} className="hover:bg-ev-green/5 transition-colors">
                      <TableCell>
                        <div className="max-w-[220px]">
                          <p className="font-semibold text-ev-navy truncate">{item.title}</p>
                          <p className="text-xs text-gray-400 truncate">{item.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${typeConfig[item.type]?.color || "bg-gray-100 text-gray-600"}`}>
                          {typeConfig[item.type]?.icon} {typeConfig[item.type]?.label || item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={() => handleToggleActive(item)}
                            className="data-[state=checked]:bg-ev-green"
                          />
                          <span className={`text-xs font-medium ${item.isActive ? "text-ev-green" : "text-gray-400"}`}>
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.link ? (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-ev-orange text-xs hover:underline flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" /> {item.linkText || "Link"}
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-8 w-8 p-0 hover:bg-ev-orange/10">
                            <Edit className="w-4 h-4 text-ev-orange" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDelete(item.id!)} className="h-8 w-8 p-0 hover:bg-ev-red/10">
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
              {editingId ? "Edit Announcement" : "Add Announcement"}
            </DialogTitle>
            <DialogDescription>
              {editingId ? "Update announcement details" : "Create a new announcement for users"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="grid gap-4 py-2 px-1">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Title *</Label>
                <Input
                  placeholder="e.g. New mock tests available!"
                  value={form.title}
                  onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                  className="border-gray-200 focus:border-ev-green focus:ring-ev-green/20"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Description *</Label>
                <Textarea
                  placeholder="Write the announcement details..."
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="border-gray-200 focus:border-ev-green focus:ring-ev-green/20 resize-none"
                />
              </div>

              {/* Type + Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v as AnnouncementData["type"] }))}>
                    <SelectTrigger className="w-full border-gray-200 focus:border-ev-green">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNOUNCEMENT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {typeConfig[type]?.icon} {typeConfig[type]?.label}
                        </SelectItem>
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

              {/* Link + Link Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Link (optional)</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={form.link}
                      onChange={(e) => setForm(p => ({ ...p, link: e.target.value }))}
                      className="pl-9 border-gray-200 focus:border-ev-green focus:ring-ev-green/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Link Text (optional)</Label>
                  <Input
                    placeholder="e.g. Register Now"
                    value={form.linkText}
                    onChange={(e) => setForm(p => ({ ...p, linkText: e.target.value }))}
                    className="border-gray-200 focus:border-ev-green focus:ring-ev-green/20"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Announcement Image</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-ev-green/50 transition-colors">
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
                      <div className="bg-ev-green h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
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
                <><Edit className="w-4 h-4 mr-2" /> Update</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Create</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ev-navy">Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The announcement will be permanently removed.
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
