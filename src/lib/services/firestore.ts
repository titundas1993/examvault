import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// ============================================================
// Helper: Convert Firestore Timestamp fields to ISO strings
// ============================================================

function convertTimestamps<T extends Record<string, unknown>>(
  data: T
): T {
  const converted = { ...data };
  for (const key of Object.keys(converted)) {
    const value = converted[key];
    if (value instanceof Timestamp) {
      (converted as Record<string, unknown>)[key] = value.toDate().toISOString();
    }
  }
  return converted;
}

// ============================================================
// 1. upcomingExams Collection
// ============================================================

export interface ExamData {
  id?: string;
  name: string;
  organizingBody: string;
  examDate: string;
  lastApplyDate: string;
  eligibility: string;
  ageLimit: string;
  applicationFee: string;
  syllabus: string;
  applyLink: string;
  officialLink: string;
  imageUrl: string;
  category: string;
  status: "upcoming" | "ongoing" | "closed";
  createdAt?: string;
}

const EXAMS_COLLECTION = "upcomingExams";

export async function addExam(data: Omit<ExamData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, EXAMS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding exam:", error);
    return null;
  }
}

export async function updateExam(id: string, data: Partial<Omit<ExamData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, EXAMS_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating exam:", error);
    return null;
  }
}

export async function deleteExam(id: string) {
  try {
    const docRef = doc(db, EXAMS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting exam:", error);
    throw error;
  }
}

export async function getExams() {
  try {
    const q = query(
      collection(db, EXAMS_COLLECTION),
      orderBy("examDate", "asc")
    );
    const snapshot = await getDocs(q);
    const exams = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    return exams as ExamData[];
  } catch (error) {
    console.error("Error getting exams:", error);
    throw error;
  }
}

export async function getExamById(id: string) {
  try {
    const docRef = doc(db, EXAMS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    return convertTimestamps({ ...data, id: snapshot.id }) as ExamData;
  } catch (error) {
    console.error("Error getting exam by ID:", error);
    throw error;
  }
}

// ============================================================
// 2. dailyTips Collection
// ============================================================

export interface TipData {
  id?: string;
  title: string;
  description: string;
  category: "study" | "exam-strategy" | "time-management" | "motivation";
  referenceLink: string;
  imageUrl: string;
  isActive: boolean;
  createdAt?: string;
}

const TIPS_COLLECTION = "dailyTips";

export async function addTip(data: Omit<TipData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, TIPS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding tip:", error);
    throw error;
  }
}

export async function updateTip(id: string, data: Partial<Omit<TipData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, TIPS_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating tip:", error);
    throw error;
  }
}

export async function deleteTip(id: string) {
  try {
    const docRef = doc(db, TIPS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting tip:", error);
    throw error;
  }
}

export async function getTips() {
  try {
    const q = query(
      collection(db, TIPS_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const tips = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side to avoid composite index requirement
    tips.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return tips as TipData[];
  } catch (error) {
    console.error("Error getting tips:", error);
    throw error;
  }
}

export async function getAllTips() {
  try {
    const q = query(
      collection(db, TIPS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const tips = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    return tips as TipData[];
  } catch (error) {
    console.error("Error getting all tips:", error);
    throw error;
  }
}

export async function getTipById(id: string) {
  try {
    const docRef = doc(db, TIPS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    return convertTimestamps({ ...data, id: snapshot.id }) as TipData;
  } catch (error) {
    console.error("Error getting tip by ID:", error);
    throw error;
  }
}

// ============================================================
// 3. announcements Collection
// ============================================================

export interface AnnouncementData {
  id?: string;
  title: string;
  description: string;
  type: "new" | "alert" | "offer";
  link: string;
  linkText: string;
  imageUrl: string;
  isActive: boolean;
  createdAt?: string;
}

const ANNOUNCEMENTS_COLLECTION = "announcements";

export async function addAnnouncement(data: Omit<AnnouncementData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, ANNOUNCEMENTS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding announcement:", error);
    throw error;
  }
}

export async function updateAnnouncement(id: string, data: Partial<Omit<AnnouncementData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating announcement:", error);
    throw error;
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting announcement:", error);
    throw error;
  }
}

export async function getAnnouncements() {
  try {
    const q = query(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const announcements = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side to avoid composite index requirement
    announcements.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return announcements as AnnouncementData[];
  } catch (error) {
    console.error("Error getting announcements:", error);
    throw error;
  }
}

export async function getAnnouncementById(id: string) {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    return convertTimestamps({ ...data, id: snapshot.id }) as AnnouncementData;
  } catch (error) {
    console.error("Error getting announcement by ID:", error);
    throw error;
  }
}

// ============================================================
// 4. notifications Collection
// ============================================================

export interface NotificationData {
  id?: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "promo";
  link: string;
  imageUrl: string;
  targetUsers: "all" | "specific";
  isRead: boolean;
  createdAt?: string;
}

const NOTIFICATIONS_COLLECTION = "notifications";

export async function addNotification(data: Omit<NotificationData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding notification:", error);
    throw error;
  }
}

export async function getNotifications(userId?: string) {
  try {
    // Use only where clause to avoid composite index requirement
    // Sort and limit client-side instead
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("targetUsers", "==", "all")
    );
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side by createdAt desc
    notifications.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return notifications.slice(0, 50) as NotificationData[];
  } catch (error) {
    console.error("Error getting notifications:", error);
    throw error;
  }
}

export async function markAsRead(id: string) {
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, id);
    await updateDoc(docRef, { isRead: true });
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

export async function markAllAsRead(userId?: string) {
  try {
    // Use only one where to avoid composite index requirement
    // Filter isRead client-side instead
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("targetUsers", "==", "all")
    );
    const snapshot = await getDocs(q);

    // Filter unread notifications client-side
    const unreadDocs = snapshot.docs.filter(d => !(d.data() as Record<string, unknown>).isRead);
    const updatePromises = unreadDocs.map((d) =>
      updateDoc(doc(db, NOTIFICATIONS_COLLECTION, d.id), { isRead: true })
    );

    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

// ============================================================
// 5. mockTests Collection
// ============================================================

export interface MockTestData {
  id?: string;
  title: string;
  category: string;
  duration: number;
  marks: number;
  questions: number;
  isFree: boolean;
  attempts: number;
  rating: number;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  instructions: string;
  isActive: boolean;
  createdAt?: string;
}

const MOCK_TESTS_COLLECTION = "mockTests";

export async function addMockTest(data: Omit<MockTestData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, MOCK_TESTS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding mock test:", error);
    throw error;
  }
}

export async function updateMockTest(id: string, data: Partial<Omit<MockTestData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, MOCK_TESTS_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating mock test:", error);
    throw error;
  }
}

export async function deleteMockTest(id: string) {
  try {
    const docRef = doc(db, MOCK_TESTS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting mock test:", error);
    throw error;
  }
}

export async function getMockTests() {
  try {
    const q = query(
      collection(db, MOCK_TESTS_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const mockTests = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side to avoid composite index requirement
    mockTests.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return mockTests as MockTestData[];
  } catch (error) {
    console.error("Error getting mock tests:", error);
    throw error;
  }
}

export async function getMockTestById(id: string) {
  try {
    const docRef = doc(db, MOCK_TESTS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    return convertTimestamps({ ...data, id: snapshot.id }) as MockTestData;
  } catch (error) {
    console.error("Error getting mock test by ID:", error);
    throw error;
  }
}

// ============================================================
// 6. supportTickets Collection
// ============================================================

export interface SupportTicketData {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  category: "bug" | "feature" | "question" | "complaint";
  createdAt?: string;
  updatedAt?: string;
}

const SUPPORT_TICKETS_COLLECTION = "supportTickets";

export async function createTicket(data: Omit<SupportTicketData, "id" | "createdAt" | "updatedAt">) {
  try {
    const newDocRef = doc(collection(db, SUPPORT_TICKETS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      status: data.status ?? "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, SUPPORT_TICKETS_COLLECTION), docData);
    return {
      id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error creating support ticket:", error);
    throw error;
  }
}

export async function updateTicket(id: string, data: Partial<Omit<SupportTicketData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, SUPPORT_TICKETS_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { id, ...data, updatedAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error updating support ticket:", error);
    throw error;
  }
}

export async function getTickets(userId?: string) {
  try {
    let q;
    if (userId) {
      // Use only where to avoid composite index requirement
      q = query(
        collection(db, SUPPORT_TICKETS_COLLECTION),
        where("userId", "==", userId)
      );
    } else {
      q = query(
        collection(db, SUPPORT_TICKETS_COLLECTION),
        orderBy("createdAt", "desc")
      );
    }
    const snapshot = await getDocs(q);
    const tickets = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side if using userId filter
    if (userId) {
      tickets.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
        return dateB - dateA;
      });
    }
    return tickets as SupportTicketData[];
  } catch (error) {
    console.error("Error getting support tickets:", error);
    throw error;
  }
}

// Add a reply to a support ticket (for user-side replies)
export async function addTicketReply(ticketId: string, message: string, fromAdmin: boolean = false) {
  try {
    const docRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticketId);
    const ticketSnap = await getDoc(docRef);
    if (!ticketSnap.exists()) throw new Error("Ticket not found");

    const existingReplies = ticketSnap.data().replies || [];
    const newReply = {
      message,
      fromAdmin,
      sentAt: new Date().toISOString(),
    };
    await updateDoc(docRef, {
      replies: [...existingReplies, newReply],
      lastReplyAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
    return newReply;
  } catch (error) {
    console.error("Error adding ticket reply:", error);
    throw error;
  }
}

// ============================================================
// 7. users Collection
// ============================================================

export interface UserProfileData {
  uid?: string;
  name: string;
  email: string;
  phone: string;
  photoURL: string;
  role: "user" | "admin" | "guest";
  language: string;
  isDarkMode: boolean;
  notificationEnabled: boolean;
  createdAt?: string;
}

const USERS_COLLECTION = "users";

export async function createUserProfile(uid: string, data: Omit<UserProfileData, "uid" | "createdAt">) {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const { setDoc } = await import("firebase/firestore");
    await setDoc(docRef, {
      uid,
      ...data,
      createdAt: serverTimestamp(),
    });
    return { uid, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

export async function updateUserProfile(uid: string, data: Partial<Omit<UserProfileData, "uid" | "createdAt">>) {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(docRef, { ...data });
    return { uid, ...data };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

export async function getUserProfile(uid: string) {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    return convertTimestamps({ ...data, uid }) as UserProfileData;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
}

// ============================================================
// 8. previousPapers Collection
// ============================================================

export interface PreviousPaperData {
  id?: string;
  name: string;
  year: number;
  category: string;
  downloadUrl: string;
  isActive: boolean;
  imageUrl: string;
  createdAt?: string;
}

const PREVIOUS_PAPERS_COLLECTION = "previousPapers";

export async function getPreviousPapers() {
  try {
    const q = query(
      collection(db, PREVIOUS_PAPERS_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const papers = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side to avoid composite index requirement
    papers.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return papers as PreviousPaperData[];
  } catch (error) {
    console.error("Error getting previous papers:", error);
    throw error;
  }
}

export async function getPreviousPaperById(id: string) {
  try {
    const docRef = doc(db, PREVIOUS_PAPERS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    return convertTimestamps({ ...data, id: snapshot.id }) as PreviousPaperData;
  } catch (error) {
    console.error("Error getting previous paper by ID:", error);
    throw error;
  }
}

export async function addPreviousPaper(data: Omit<PreviousPaperData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, PREVIOUS_PAPERS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding previous paper:", error);
    throw error;
  }
}

export async function updatePreviousPaper(id: string, data: Partial<Omit<PreviousPaperData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, PREVIOUS_PAPERS_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating previous paper:", error);
    throw error;
  }
}

export async function deletePreviousPaper(id: string) {
  try {
    const docRef = doc(db, PREVIOUS_PAPERS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting previous paper:", error);
    throw error;
  }
}

// ============================================================
// 9. notes Collection
// ============================================================

export interface NotesData {
  id?: string;
  title: string;
  category: string;
  pages: number;
  downloadUrl: string;
  isActive: boolean;
  imageUrl: string;
  description: string;
  createdAt?: string;
}

const NOTES_COLLECTION = "notes";

export async function getNotes() {
  try {
    const q = query(
      collection(db, NOTES_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const notes = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side to avoid composite index requirement
    notes.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return notes as NotesData[];
  } catch (error) {
    console.error("Error getting notes:", error);
    throw error;
  }
}

export async function getNoteById(id: string) {
  try {
    const docRef = doc(db, NOTES_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    return convertTimestamps({ ...data, id: snapshot.id }) as NotesData;
  } catch (error) {
    console.error("Error getting note by ID:", error);
    throw error;
  }
}

export async function addNote(data: Omit<NotesData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, NOTES_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding note:", error);
    throw error;
  }
}

export async function updateNote(id: string, data: Partial<Omit<NotesData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, NOTES_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating note:", error);
    throw error;
  }
}

export async function deleteNote(id: string) {
  try {
    const docRef = doc(db, NOTES_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
}

// ============================================================
// 10. banners Collection
// ============================================================

export interface BannerData {
  id?: string;
  title: string;
  subtitle: string;
  link: string;
  gradient: string;
  imageUrl: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
}

const BANNERS_COLLECTION = "banners";

export async function getBanners() {
  try {
    const q = query(
      collection(db, BANNERS_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const banners = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side by order asc to avoid composite index requirement
    banners.sort((a, b) => {
      const orderA = (a as Record<string, unknown>).order as number ?? 0;
      const orderB = (b as Record<string, unknown>).order as number ?? 0;
      return orderA - orderB;
    });
    return banners as BannerData[];
  } catch (error) {
    console.error("Error getting banners:", error);
    throw error;
  }
}

export async function addBanner(data: Omit<BannerData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, BANNERS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding banner:", error);
    throw error;
  }
}

export async function updateBanner(id: string, data: Partial<Omit<BannerData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, BANNERS_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating banner:", error);
    throw error;
  }
}

export async function deleteBanner(id: string) {
  try {
    const docRef = doc(db, BANNERS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting banner:", error);
    throw error;
  }
}

// ============================================================
// 11. testSeries Collection
// ============================================================

export interface TestSeriesData {
  id?: string;
  title: string;
  category: string;
  totalTests: number;
  price: number;
  isFree: boolean;
  isActive: boolean;
  description: string;
  imageUrl: string;
  createdAt?: string;
}

const TEST_SERIES_COLLECTION = "testSeries";

export async function getTestSeries() {
  try {
    const q = query(
      collection(db, TEST_SERIES_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const testSeries = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side to avoid composite index requirement
    testSeries.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return testSeries as TestSeriesData[];
  } catch (error) {
    console.error("Error getting test series:", error);
    throw error;
  }
}

export async function addTestSeries(data: Omit<TestSeriesData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, TEST_SERIES_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding test series:", error);
    throw error;
  }
}

export async function updateTestSeries(id: string, data: Partial<Omit<TestSeriesData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, TEST_SERIES_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating test series:", error);
    throw error;
  }
}

export async function deleteTestSeries(id: string) {
  try {
    const docRef = doc(db, TEST_SERIES_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting test series:", error);
    throw error;
  }
}

// ============================================================
// 12. freeTests Collection
// ============================================================

export interface FreeTestData {
  id?: string;
  title: string;
  category: string;
  duration: number;
  questions: number;
  marks: number;
  isActive: boolean;
  description: string;
  createdAt?: string;
}

const FREE_TESTS_COLLECTION = "freeTests";

export async function getFreeTests() {
  try {
    const q = query(
      collection(db, FREE_TESTS_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const freeTests = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side to avoid composite index requirement
    freeTests.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return freeTests as FreeTestData[];
  } catch (error) {
    console.error("Error getting free tests:", error);
    throw error;
  }
}

export async function addFreeTest(data: Omit<FreeTestData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, FREE_TESTS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding free test:", error);
    throw error;
  }
}

export async function updateFreeTest(id: string, data: Partial<Omit<FreeTestData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, FREE_TESTS_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating free test:", error);
    throw error;
  }
}

export async function deleteFreeTest(id: string) {
  try {
    const docRef = doc(db, FREE_TESTS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting free test:", error);
    throw error;
  }
}

// ============================================================
// 13. dailyQuiz Collection
// ============================================================

export interface DailyQuizData {
  id?: string;
  title: string;
  category: string;
  questions: number;
  duration: number;
  participants: number;
  isActive: boolean;
  description: string;
  createdAt?: string;
}

const DAILY_QUIZ_COLLECTION = "dailyQuiz";

export async function getDailyQuiz() {
  try {
    const q = query(
      collection(db, DAILY_QUIZ_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const quizzes = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side to avoid composite index requirement
    quizzes.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return quizzes as DailyQuizData[];
  } catch (error) {
    console.error("Error getting daily quiz:", error);
    throw error;
  }
}

export async function addDailyQuiz(data: Omit<DailyQuizData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, DAILY_QUIZ_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding daily quiz:", error);
    throw error;
  }
}

export async function updateDailyQuiz(id: string, data: Partial<Omit<DailyQuizData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, DAILY_QUIZ_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating daily quiz:", error);
    throw error;
  }
}

export async function deleteDailyQuiz(id: string) {
  try {
    const docRef = doc(db, DAILY_QUIZ_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting daily quiz:", error);
    throw error;
  }
}

// ============================================================
// 14. popularTests Collection
// ============================================================

export interface PopularTestData {
  id?: string;
  title: string;
  category: string;
  duration: number;
  marks: number;
  questions: number;
  isFree: boolean;
  attempts: number;
  rating: number;
  difficulty: string;
  isActive: boolean;
  imageUrl: string;
  createdAt?: string;
}

const POPULAR_TESTS_COLLECTION = "popularTests";

export async function getPopularTests() {
  try {
    const q = query(
      collection(db, POPULAR_TESTS_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const popularTests = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side to avoid composite index requirement
    popularTests.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return popularTests.slice(0, 10) as PopularTestData[];
  } catch (error) {
    console.error("Error getting popular tests:", error);
    throw error;
  }
}

export async function addPopularTest(data: Omit<PopularTestData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, POPULAR_TESTS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding popular test:", error);
    throw error;
  }
}

export async function updatePopularTest(id: string, data: Partial<Omit<PopularTestData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, POPULAR_TESTS_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating popular test:", error);
    throw error;
  }
}

export async function deletePopularTest(id: string) {
  try {
    const docRef = doc(db, POPULAR_TESTS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting popular test:", error);
    throw error;
  }
}

// ============================================================
// 15. questions Collection
// ============================================================

export interface QuestionData {
  id?: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  category: string;
  subject: string;
  difficulty: string;
  marks: number;
  testId?: string;
  createdAt?: string;
}

const QUESTIONS_COLLECTION = "questions";

export async function getQuestions(testId?: string, category?: string) {
  try {
    let q;
    if (testId) {
      // First try to get questions linked by testId
      q = query(
        collection(db, QUESTIONS_COLLECTION),
        where("testId", "==", testId)
      );
      const snapshot = await getDocs(q);
      let questions = snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
      });
      // Sort client-side
      questions.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
        return dateA - dateB;
      });
      // If we found questions by testId, return them
      if (questions.length > 0) {
        return questions as QuestionData[];
      }
      // Fallback: if no questions with this testId, try category-based fetch
      // This handles questions that were added before testId linking was implemented
    }
    if (category) {
      // Fetch questions by category
      q = query(
        collection(db, QUESTIONS_COLLECTION),
        where("category", "==", category)
      );
      const snapshot = await getDocs(q);
      const questions = snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
      });
      questions.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
        return dateA - dateB;
      });
      return questions as QuestionData[];
    }
    // No filters — return recent questions
    q = query(
      collection(db, QUESTIONS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const snapshot = await getDocs(q);
    const questions = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    return questions as QuestionData[];
  } catch (error) {
    console.error("Error getting questions:", error);
    throw error;
  }
}

export async function getQuestionById(id: string) {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    return convertTimestamps({ ...data, id: snapshot.id }) as QuestionData;
  } catch (error) {
    console.error("Error getting question by ID:", error);
    throw error;
  }
}

export async function addQuestion(data: Omit<QuestionData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, QUESTIONS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding question:", error);
    throw error;
  }
}

export async function updateQuestion(id: string, data: Partial<Omit<QuestionData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating question:", error);
    throw error;
  }
}

export async function deleteQuestion(id: string) {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting question:", error);
    throw error;
  }
}

// ============================================================
// 16. leaderboard Collection
// ============================================================

export interface LeaderboardData {
  id?: string;
  uid: string;
  name: string;
  photoUrl: string;
  score: number;
  totalTests: number;
  avgAccuracy: number;
  rank?: number;
  createdAt?: string;
}

const LEADERBOARD_COLLECTION = "leaderboard";

export async function getLeaderboard() {
  try {
    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      orderBy("score", "desc"),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map((d, idx) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id, rank: idx + 1 } as Record<string, unknown>);
    });
    return entries as LeaderboardData[];
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    throw error;
  }
}

export async function addLeaderboardEntry(data: Omit<LeaderboardData, "id" | "createdAt" | "rank">) {
  try {
    const newDocRef = doc(collection(db, LEADERBOARD_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding leaderboard entry:", error);
    throw error;
  }
}

export async function updateLeaderboardEntry(id: string, data: Partial<Omit<LeaderboardData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, LEADERBOARD_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating leaderboard entry:", error);
    throw error;
  }
}

// ============================================================
// 17. testResults Collection — Persistent test results
// ============================================================

export interface TestResultData {
  id?: string;
  userId: string;
  userName: string;
  testId: string;
  testTitle: string;
  testCategory: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skipped: number;
  totalMarks: number;
  scoredMarks: number;
  accuracy: number;
  timeUsedSeconds: number;
  answers: Record<number, string>; // questionIndex -> selected option
  createdAt?: string;
}

const TEST_RESULTS_COLLECTION = "testResults";

export async function saveTestResult(data: Omit<TestResultData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, TEST_RESULTS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() } as TestResultData;
  } catch (error) {
    console.error("Error saving test result:", error);
    throw error;
  }
}

export async function getUserTestResults(userId: string) {
  try {
    const q = query(
      collection(db, TEST_RESULTS_COLLECTION),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => {
      const data = d.data();
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    // Sort client-side by createdAt desc
    results.sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return results as TestResultData[];
  } catch (error) {
    console.error("Error getting user test results:", error);
    throw error;
  }
}

export async function getTestLeaderboard(testId: string) {
  try {
    const q = query(
      collection(db, TEST_RESULTS_COLLECTION),
      where("testId", "==", testId),
      orderBy("scoredMarks", "desc"),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d, idx) => {
      const data = d.data();
      return convertTimestamps({ ...data, id: d.id, rank: idx + 1 } as Record<string, unknown>);
    });
    return results as (TestResultData & { rank: number })[];
  } catch (error) {
    console.error("Error getting test leaderboard:", error);
    // Fallback: try without orderBy (may need index)
    try {
      const q2 = query(
        collection(db, TEST_RESULTS_COLLECTION),
        where("testId", "==", testId),
        limit(50)
      );
      const snapshot = await getDocs(q2);
      const results = snapshot.docs.map((d, idx) => {
        const data = d.data();
        return convertTimestamps({ ...data, id: d.id, rank: idx + 1 } as Record<string, unknown>);
      });
      // Sort client-side
      results.sort((a: any, b: any) => (b.scoredMarks || 0) - (a.scoredMarks || 0));
      return results.map((r: any, i: number) => ({ ...r, rank: i + 1 })) as (TestResultData & { rank: number })[];
    } catch (e2) {
      throw e2;
    }
  }
}

// ============================================================
// 14. appSettings Collection (Global App Configuration)
// ============================================================

export interface AppSettingsData {
  appName: string;
  appVersion: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  instagramUrl: string;
  youtubeUrl: string;
  telegramUrl: string;
  websiteUrl: string;
  maintenanceMode: boolean;
  forceUpdate: boolean;
  updatedAt?: string;
}

const APP_SETTINGS_COLLECTION = "appSettings";
const APP_SETTINGS_DOC = "main";

export async function getAppSettings(): Promise<AppSettingsData | null> {
  try {
    const docRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    const settings = convertTimestamps({ ...data }) as AppSettingsData;
    // Cache to localStorage for offline/fallback access
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ev_app_settings', JSON.stringify(settings));
      } catch (e) { /* ignore storage errors */ }
    }
    return settings;
  } catch (error) {
    console.error("Error getting app settings:", error);
    // Try localStorage fallback before throwing
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ev_app_settings');
        if (cached) {
          return JSON.parse(cached) as AppSettingsData;
        }
      } catch (e) { /* ignore */ }
    }
    throw error;
  }
}

export async function updateAppSettings(data: Partial<AppSettingsData>) {
  try {
    const docRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    } else {
      await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
    }
    return true;
  } catch (error) {
    console.error("Error updating app settings:", error);
    throw error;
  }
}

// ============================================================
// 18. plans Collection — Subscription/Pricing Plans
// ============================================================

export interface PlanData {
  id?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  durationDays: number;
  type: "subscription" | "one_time";
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  order: number;
  createdAt?: string;
}

const PLANS_COLLECTION = "plans";

export async function getPlans() {
  try {
    const q = query(
      collection(db, PLANS_COLLECTION),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const plans = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    plans.sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0));
    return plans as PlanData[];
  } catch (error) {
    console.error("Error getting plans:", error);
    throw error;
  }
}

export async function getAllPlans() {
  try {
    const snapshot = await getDocs(collection(db, PLANS_COLLECTION));
    const plans = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    plans.sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0));
    return plans as PlanData[];
  } catch (error) {
    console.error("Error getting all plans:", error);
    throw error;
  }
}

export async function addPlan(data: Omit<PlanData, "id" | "createdAt">) {
  try {
    const newDocRef = doc(collection(db, PLANS_COLLECTION));
    const id = newDocRef.id;
    const docData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };
    await setDoc(newDocRef, docData);
    return { id, ...data, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error adding plan:", error);
    throw error;
  }
}

export async function updatePlan(id: string, data: Partial<Omit<PlanData, "id" | "createdAt">>) {
  try {
    const docRef = doc(db, PLANS_COLLECTION, id);
    await updateDoc(docRef, { ...data });
    return { id, ...data };
  } catch (error) {
    console.error("Error updating plan:", error);
    throw error;
  }
}

export async function deletePlan(id: string) {
  try {
    const docRef = doc(db, PLANS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting plan:", error);
    throw error;
  }
}

// ============================================================
// 19. subscriptions Collection — User Subscription Records
// ============================================================

export interface SubscriptionData {
  id?: string;
  userId: string;
  planId: string;
  planName: string;
  status: "active" | "expired" | "cancelled";
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  createdAt?: string;
}

const SUBSCRIPTIONS_COLLECTION = "subscriptions";

export async function getUserSubscription(userId: string) {
  try {
    const q = query(
      collection(db, SUBSCRIPTIONS_COLLECTION),
      where("userId", "==", userId),
      where("status", "==", "active")
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data() as Record<string, unknown>;
    return convertTimestamps({ ...data, id: snapshot.docs[0].id }) as SubscriptionData;
  } catch (error) {
    console.error("Error getting user subscription:", error);
    throw error;
  }
}

export async function getAllSubscriptions() {
  try {
    const snapshot = await getDocs(collection(db, SUBSCRIPTIONS_COLLECTION));
    const subs = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    subs.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return subs as SubscriptionData[];
  } catch (error) {
    console.error("Error getting all subscriptions:", error);
    throw error;
  }
}

// ============================================================
// 20. payments Collection — Payment Records (client-side read)
// ============================================================

export interface PaymentData {
  id?: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  verified: boolean;
  createdAt?: string;
}

const PAYMENTS_COLLECTION = "payments";

export async function getUserPayments(userId: string) {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    payments.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return payments as PaymentData[];
  } catch (error) {
    console.error("Error getting user payments:", error);
    throw error;
  }
}

export async function getAllPayments() {
  try {
    const snapshot = await getDocs(collection(db, PAYMENTS_COLLECTION));
    const payments = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    });
    payments.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
    return payments as PaymentData[];
  } catch (error) {
    console.error("Error getting all payments:", error);
    throw error;
  }
}

// ============================================================
// 21. purchases Collection — One-time Purchase Records
// ============================================================

export interface PurchaseData {
  id?: string;
  userId: string;
  itemId: string;
  itemType: string;
  itemName: string;
  amount: number;
  status: string;
  purchasedAt?: string;
  createdAt?: string;
}

const PURCHASES_COLLECTION = "purchases";

export async function getUserPurchases(userId: string) {
  try {
    const q = query(
      collection(db, PURCHASES_COLLECTION),
      where("userId", "==", userId),
      where("status", "==", "active")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return convertTimestamps({ ...data, id: d.id } as Record<string, unknown>);
    }) as PurchaseData[];
  } catch (error) {
    console.error("Error getting user purchases:", error);
    throw error;
  }
}

export async function hasPurchasedItem(userId: string, itemId: string) {
  try {
    const q = query(
      collection(db, PURCHASES_COLLECTION),
      where("userId", "==", userId),
      where("itemId", "==", itemId),
      where("status", "==", "active")
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking purchase:", error);
    return false;
  }
}

// ============================================================
// Payment API helpers (client-side)
// ============================================================

export async function checkSubscriptionStatus(userId: string) {
  try {
    const res = await fetch(`/api/payments/subscription-status?userId=${userId}`);
    if (!res.ok) throw new Error("Failed to check subscription");
    const data = await res.json();

    // If server couldn't check (no Admin SDK), fall back to client-side Firestore
    if (data._useClientSDK) {
      return await checkSubscriptionClientSide(userId);
    }

    return data;
  } catch (error) {
    console.error("Error checking subscription status via API, trying client-side:", error);
    // Fallback: check directly via client-side Firestore
    return await checkSubscriptionClientSide(userId);
  }
}

async function checkSubscriptionClientSide(userId: string) {
  try {
    // Check active subscription in Firestore using client SDK
    const subQ = query(
      collection(db, "subscriptions"),
      where("userId", "==", userId),
      where("status", "==", "active")
    );
    const subSnap = await getDocs(subQ);

    let isPremium = false;
    let premiumExpiry: string | null = null;
    let planName: string | null = null;
    let subscription: any = null;

    if (!subSnap.empty) {
      const subData = subSnap.docs[0].data() as Record<string, unknown>;
      const converted = convertTimestamps(subData);
      const endDate = new Date(converted.endDate as string);
      const now = new Date();

      if (endDate > now) {
        isPremium = true;
        premiumExpiry = converted.endDate as string;
        planName = converted.planName as string;
        subscription = {
          id: subSnap.docs[0].id,
          planId: converted.planId,
          planName: converted.planName,
          status: converted.status,
          startDate: converted.startDate,
          endDate: converted.endDate,
        };
      } else {
        // Mark expired
        try {
          await updateDoc(subSnap.docs[0].ref, { status: "expired" });
        } catch (e) { /* ignore */ }
      }
    }

    // Check purchased items
    const purchaseQ = query(
      collection(db, "purchases"),
      where("userId", "==", userId),
      where("status", "==", "active")
    );
    const purchaseSnap = await getDocs(purchaseQ);
    const purchasedItems = purchaseSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        itemId: data.itemId,
        itemType: data.itemType,
        itemName: data.itemName,
      };
    });

    return { isPremium, premiumExpiry, planName, subscription, purchasedItems };
  } catch (error) {
    console.error("Client-side subscription check failed:", error);
    return { isPremium: false, premiumExpiry: null, planName: null, subscription: null, purchasedItems: [] };
  }
}

export async function createPaymentOrder(data: {
  amount: number;
  userId: string;
  planId: string;
  planName: string;
  type: string;
  currency?: string;
}) {
  try {
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create order");
    return await res.json();
  } catch (error) {
    console.error("Error creating payment order:", error);
    throw error;
  }
}

export async function verifyPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  type: string;
}) {
  try {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Payment verification failed");
    return await res.json();
  } catch (error) {
    console.error("Error verifying payment:", error);
    throw error;
  }
}
