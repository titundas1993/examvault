import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
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

// Disable offline persistence so admin edits are always visible immediately.
// Without this, the client SDK caches data in IndexedDB and may serve stale
// documents after the admin panel writes via the Admin SDK.
const db = getApps().length === 0
  ? initializeFirestore(app, { persistence: false })
  : getFirestore(app);

export const auth = getAuth(app);
export { db };
export const storage = getStorage(app);
export default app;
