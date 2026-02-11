// Config/FirebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD0ipZd4Cpf1T9kc69PXSq89rcFonmksCc",
  authDomain: "ocpulse-9e668.firebaseapp.com",
  projectId: "ocpulse-9e668",
  storageBucket: "ocpulse-9e668.firebasestorage.app",
  messagingSenderId: "1030631401344",
  appId: "1:1030631401344:web:a0c7b4130538b7d0b50365"
};

// 1. Initialize App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. Export Auth
export const auth = getAuth(app);

// 3. Export Database (Using default database)
// We check if Firestore is already initialized to prevent crashes
export const db = getFirestore(app);

// 4. Export Storage
export const storage = getStorage(app);