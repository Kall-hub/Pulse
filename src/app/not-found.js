import Link from 'next/link';
import { BiRadar, BiWifiOff } from "react-icons/bi";
import { FaSatellite } from "react-icons/fa";

export default function NotFound() {
  return (
    // Main Container - Dark Theme for high contrast "Tech" feel
    <div className="h-screen flex flex-col items-center justify-center bg-[#0F172A] relative overflow-hidden">
      
      {/* --- BACKGROUND EFFECTS --- */}
      {/* The "Lost Signal" Radar Pings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         <div className="w-[300px] h-[300px] border-2 border-blue-500/20 rounded-full animate-ping absolute" style={{ animationDuration: '3s' }}></div>
         <div className="w-[500px] h-[500px] border-2 border-blue-500/10 rounded-full animate-ping absolute" style={{ animationDelay: '0.5s', animationDuration: '4s' }}></div>
         <div className="w-[800px] h-[800px] border border-blue-500/5 rounded-full animate-ping absolute" style={{ animationDelay: '1s', animationDuration: '5s' }}></div>
      </div>
      
      {/* Faint Grid Overlay */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02] pointer-events-none"></div>


      {/* --- MAIN CONTENT --- */}
      <div className="relative z-10 text-center p-6">
         
         {/* The Icon Assembly */}
         <div className="mb-8 relative inline-block">
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700 relative z-10 backdrop-blur-md">
                <BiWifiOff size={40} className="text-red-500 animate-pulse" />
            </div>
            {/* Satellite Orbiting */}
            <div className="absolute top-0 left-0 w-full h-full animate-spin-slow pointer-events-none">
                <FaSatellite size={20} className="text-blue-600 absolute -top-4 left-1/2 -translate-x-1/2" />
            </div>
         </div>

         {/* The Glitchy 404 Text */}
         <h1 className="text-[120px] md:text-[160px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 relative select-none">
            404
            {/* Simulated Glitch Layer */}
            <span className="absolute inset-0 text-blue-600 opacity-20 blur-sm animate-pulse" style={{ animationDuration: '0.2s' }}>404</span>
         </h1>

         {/* The "System" Message */}
         <div className="mb-8">
            <h2 className="text-lg font-black text-white uppercase tracking-[0.3em] mb-2">
               Signal Lost // Node Invalid
            </h2>
            <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed font-medium">
               The Pretoria coordinates you are trying to access do not exist in the Pulse network grid. The link might be corrupted or outdated.
            </p>
         </div>

         {/* The CTA Button */}
         <Link 
            href="/dashboard" 
            className="group relative inline-flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
         >
            {/* Button Glitch Effect on Hover */}
            <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 skew-y-12 transition-transform duration-300"></span>
            
            <BiRadar size={16} className="group-hover:animate-spin relative z-10" />
            <span className="relative z-10">Re-Establish Connection</span>
         </Link>
         
         {/* Footer info */}
         <div className="mt-12 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
            Pulse System Protocol v1.2.4 | Pretoria Sector
         </div>
      </div>
    </div>
  );
}