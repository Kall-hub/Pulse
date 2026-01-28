'use client'

import { BiPulse } from "react-icons/bi";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617] backdrop-blur-sm">
      {/* The Pulsing Core */}
      <div className="relative w-28 h-28 mb-8">
        {/* Outer Glow Effect */}
        <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-xl opacity-40 animate-pulse"></div>

        {/* Inner Box */}
        <div className="relative w-full h-full bg-[#0F172A] border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden">
          {/* Scanning Line Animation */}
          <div className="absolute top-0 w-full h-full bg-gradient-to-b from-transparent via-blue-500/10 to-transparent animate-scan"></div>

          <BiPulse size={48} className="text-blue-500 animate-pulse" />
        </div>
      </div>

      {/* Loading Text */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Loading Pulse Admin</h2>
        <p className="text-sm text-gray-400">Authenticating and fetching data...</p>
      </div>
    </div>
  );
}