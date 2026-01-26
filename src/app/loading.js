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

      {/* The Psychological Text */}
      <h2 className="text-base font-black text-white uppercase tracking-[0.4em] animate-pulse">
        OC PULSE
      </h2>
      
      {/* Rotating Messages */}
      <div className="mt-3 flex flex-col items-center gap-1">
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
          Synchronizing System Nodes...
        </p>
        
        {/* Progress Bar */}
        <div className="w-32 h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-blue-600 w-1/2 animate-[progress_1s_ease-in-out_infinite]"></div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
        @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .animate-scan {
            animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}