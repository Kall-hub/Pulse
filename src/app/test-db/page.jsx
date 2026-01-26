"use client";
import { useState } from 'react';
import { db } from '@/app/Config/firebaseConfig'; 
import { doc, setDoc } from "firebase/firestore";

export default function TestDB() {
  const [status, setStatus] = useState("Waiting...");

  const runTest = async () => {
    setStatus("Testing Connection...");
    console.log("Starting DB Write...");
    try {
      // Try to write a simple word to a 'test' collection
      await setDoc(doc(db, "test", "connection_check"), {
        message: "Pulse is connected!",
        time: new Date().toString()
      });
      console.log("Write finished!");
      setStatus("✅ SUCCESS! Go check Firebase Console.");
    } catch (error) {
      console.error("DB Error:", error);
      setStatus("❌ FAILED: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-6">
      <h1 className="text-2xl font-bold">Database Connection Test</h1>
      
      <div className="p-4 border border-white/20 rounded-xl bg-white/10 text-xl font-mono">
        Status: <span className={status.includes("SUCCESS") ? "text-green-400" : "text-yellow-400"}>{status}</span>
      </div>

      <button 
        onClick={runTest}
        className="px-8 py-4 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-all"
      >
        PING DATABASE
      </button>
    </div>
  );
}