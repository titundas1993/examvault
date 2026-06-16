import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
