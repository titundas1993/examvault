"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, Trash2, BellRing, Send, Upload, X, Loader2,
  Image as ImageIcon, CheckCircle, AlertTriangle, Info, AlertOctagon, PartyPopper
} from "lucide-react";
import { storage, db } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, getDocs, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import {
  addNotification, getNotifications, NotificationData,
} from "@/lib/services/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

const NOTIF_TYPES: NotificationData["type"][] = ["info", "warning", "success", "promo"];
const TARGET_OPTIONS: NotificationData["targetUsers"][] = ["all", "specific"];

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  "info": { label: "Info", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Info className="w-3.5 h-3.5" /> },
  "warning": { label: "Warning", color: "bg-ev-gold/15 text-ev-gold border-ev-gold/30", icon: <AlertOctagon className="w-3.5 h-3.5" /> },
  "success": { label: "Success", color: "bg-ev-green/15 text-ev-green border-ev-green/30", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  "promo": { label: "Promo", color: "bg-ev-purple/15 text-ev-purple border-ev-purple/30", icon: <PartyPopper className="w-3.5 h-3.5" /> },
};

const emptyForm: Omit<NotificationData, "id" | "createdAt"> = {
  title: "",
  message: "",
  type: "info",
  link: "",
  imageUrl: "",
  targetUsers: "all",
  isRead: false,
};

async function getAllNotifications(): Promise<NotificationData[]> {
  try {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return { ...data, id: d.id } as NotificationData;
    });
  } catch (error) {
    console.error("Error getting all notifications:", error);
    return [];
  }
}

async function deleteNotification(id: string) {
  try {
    const docRef = doc(db, "notifications", id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return null;
  }
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const data = await getAllNotifications();
    setNotifications(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const openSend = () => {
    setForm(emptyForm);
    setImagePreview("");
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
      const fileRef = ref(storage, `notifications/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      setUploadProgress(50);
      const url = await getDownloadURL(snapshot.ref);
      setUploadProgress(100);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      setImagePreview(url);
      showToast("success", "Image uploaded!");
    } catch {
      showToast("error", "Failed to upload image");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSend = async () => {
    if (!form.title.trim()) {
      showToast("error", "Title is required");
      return;
    }
    if (!form.message.trim()) {
      showToast("error", "Message is required");
      return;
    }
    setSaving(true);
    try {
      const result = await addNotification(form);
      if (result) {
        showToast("success", "Notification sent successfully!");
      } else {
        showToast("error", "Failed to send notification");
      }
      setDialogOpen(false);
      fetchNotifications();
    } catch {
      showToast("error", "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteNotification(deleteId);
    if (result) {
      showToast("success", "Notification deleted!");
    } else {
      showToast("error", "Failed to delete notification");
    }
    setDeleteOpen(false);
    setDeleteId(null);
    fetchNotifications();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
            <BellRing className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ev-navy">Notifications</h1>
            <p className="text-gray-500 text-sm">Send and manage push notifications</p>
          </div>
        </div>
        <Button
          onClick={openSend}
          className="bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold shadow-lg hover:shadow-xl transition-all"
        >
          <Send className="w-4 h-4 mr-2" /> Send Notification
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Sent", count: notifications.length, color: "text-ev-navy" },
          { label: "Info", count: notifications.filter(n => n.type === "info").length, color: "text-blue-600" },
          { label: "Warning", count: notifications.filter(n => n.type === "warning").length, color: "text-ev-gold" },
          { label: "Promo", count: notifications.filter(n => n.type === "promo").length, color: "text-ev-purple" },
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
              <span className="ml-3 text-gray-500">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <BellRing className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-semibold">No notifications sent</p>
              <p className="text-sm">Send your first notification to users</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="font-bold text-ev-navy">Title</TableHead>
                    <TableHead className="font-bold text-ev-navy">Type</TableHead>
                    <TableHead className="font-bold text-ev-navy">Target</TableHead>
                    <TableHead className="font-bold text-ev-navy">Date</TableHead>
                    <TableHead className="font-bold text-ev-navy text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notif) => (
                    <TableRow key={notif.id} className="hover:bg-ev-orange/5 transition-colors">
                      <TableCell>
                        <div className="max-w-[220px]">
                          <p className="font-semibold text-ev-navy truncate">{notif.title}</p>
                          <p className="text-xs text-gray-400 truncate">{notif.message}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs gap-1 ${typeConfig[notif.type]?.color || "bg-gray-100 text-gray-600"}`}>
                          {typeConfig[notif.type]?.icon}
                          {typeConfig[notif.type]?.label || notif.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 capitalize">
                          {notif.targetUsers === "all" ? "All Users" : "Specific"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500">{formatDate(notif.createdAt)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDelete(notif.id!)} className="h-8 w-8 p-0 hover:bg-ev-red/10">
                          <Trash2 className="w-4 h-4 text-ev-red" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Send Notification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-ev-navy text-xl font-black flex items-center gap-2">
              <Send className="w-5 h-5 text-ev-orange" /> Send Notification
            </DialogTitle>
            <DialogDescription>
              Create a new notification to send to users
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="grid gap-4 py-2 px-1">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Title *</Label>
                <Input
                  placeholder="e.g. New test series available!"
                  value={form.title}
                  onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                  className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20"
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Message *</Label>
                <Textarea
                  placeholder="Write the notification message..."
                  value={form.message}
                  onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                  rows={4}
                  className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20 resize-none"
                />
              </div>

              {/* Type + Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v as NotificationData["type"] }))}>
                    <SelectTrigger className="w-full border-gray-200 focus:border-ev-orange">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIF_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          <span className="flex items-center gap-2">
                            {typeConfig[type]?.icon} {typeConfig[type]?.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-ev-navy">Target</Label>
                  <Select value={form.targetUsers} onValueChange={(v) => setForm(p => ({ ...p, targetUsers: v as NotificationData["targetUsers"] }))}>
                    <SelectTrigger className="w-full border-gray-200 focus:border-ev-orange">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>
                          {opt === "all" ? "All Users" : "Specific Users"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Link */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Link (optional)</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={form.link}
                  onChange={(e) => setForm(p => ({ ...p, link: e.target.value }))}
                  className="border-gray-200 focus:border-ev-orange focus:ring-ev-orange/20"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ev-navy">Image (optional)</Label>
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
              onClick={handleSend}
              disabled={saving || uploading}
              className="bg-gradient-to-r from-ev-orange to-ev-gold text-white font-bold hover:shadow-lg"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Notification</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ev-navy">Delete Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the notification record. Users who already received it will not be affected.
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
