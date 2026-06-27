import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDumulPADTU0YigQ_w96-shb5i2ch6w8FY",
  authDomain: "examvault-7fba8.firebaseapp.com",
  projectId: "examvault-7fba8",
  storageBucket: "examvault-7fba8.firebasestorage.app",
  messagingSenderId: "134227461460",
  appId: "1:134227461460:web:f8e6c4b012fce4c8f734c1",
  measurementId: "G-73WTWNYXSX",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Enable offline persistence so the app works without internet.
// Firestore will cache documents in IndexedDB and serve them when offline,
// then automatically sync when connectivity is restored.
const db = getApps().length === 0
  ? initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    })
  : getFirestore(app);

// Enable IndexedDB persistence for offline access
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err: any) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open — persistence only works in one tab
      console.warn('Firestore offline: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support persistence
      console.warn('Firestore offline: not supported');
    }
  });
}

export const auth = getAuth(app);
export { db };
export const storage = getStorage(app);
export default app;
