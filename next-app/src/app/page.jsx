"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import DashboardPage from "./dashboard/page";

// Firebase config (same as in login)
const firebaseConfig = {
  apiKey: "AIzaSyD0ipZd4Cpf1T9kc69PXSq89rcFonmksCc",
  authDomain: "ocpulse-9e668.firebaseapp.com",
  projectId: "ocpulse-9e668",
  storageBucket: "ocpulse-9e668.firebasestorage.app",
  messagingSenderId: "1030631401344",
  appId: "1:1030631401344:web:a0c7b4130538b7d0b50365"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    // Inactivity logout
    let timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        signOut(auth);
        router.push('/login');
      }, 10 * 60 * 1000); // 10 min
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimeout));

    resetTimeout();

    return () => {
      unsubscribe();
      clearTimeout(timeout);
      events.forEach(event => document.removeEventListener(event, resetTimeout));
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div>
      <DashboardPage />
    </div>
  );
}
