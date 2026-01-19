"use client";
import { useState } from 'react';
import { 
  FaUserCircle, FaBell, FaTools, FaClipboardCheck, FaHeadset, 
  FaPaperPlane, FaHome, FaKey, FaTicketAlt, FaChevronRight 
} from "react-icons/fa";

const StudentPortal = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* FULL-WIDTH HEADER */}
      <header className="bg-white px-6 py-5 flex justify-between items-center border-b border-slate-100 sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg">P</div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Student Hub</h1>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em]">Duncan Court • A612</p>
          </div>
        </div>
        <div className="flex items-center space-x-5">
           <button className="relative text-slate-400 p-1">
             <FaBell size={20} />
             <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
           </button>
           <FaUserCircle className="text-slate-200" size={32} />
        </div>
      </header>

      <main className="w-full p-4 space-y-4 pb-32">
        
        {/* FLUID STATUS GRID */}
        <div className="grid grid-cols-2 gap-4 w-full">
          
          <GridCard 
            icon={<FaClipboardCheck />}
            label="Inspection"
            value="10 JAN"
            sub="Visual Audit: Clear"
            statusColor="bg-green-500"
            iconColor="text-blue-500"
          />

          <GridCard 
            icon={<FaTools />}
            label="Maintenance"
            value="PENDING"
            sub="Stove Repair #402"
            statusColor="bg-orange-500"
            iconColor="text-orange-500"
            active
          />

          <GridCard 
            icon={<FaKey />}
            label="Security"
            value="3/3"
            sub="Keys & Remotes"
            statusColor="bg-green-500"
            iconColor="text-yellow-500"
          />

          <GridCard 
            icon={<FaTicketAlt />}
            label="Tickets"
            value="01"
            sub="Help Desk Active"
            statusColor="bg-purple-500"
            iconColor="text-purple-500"
          />
        </div>

        {/* FULL-WIDTH NOTIFICATION BOX */}
        <div className="w-full bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative group">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 blur-[80px] rounded-full"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Live Notifications</h3>
                <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="text-[8px] font-black text-blue-500 uppercase">System Active</span>
                </div>
            </div>

            <div className="space-y-6 relative z-10">
                <div className="flex items-start space-x-4">
                    <div className="mt-1 w-1 h-8 bg-blue-600 rounded-full"></div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-tight italic">Ticket #402 Updated</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-medium">
                            Rasta is scheduled for unit entry tomorrow (12 Jan) at 10:00 AM.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* CHAT ACTION - FULL WIDTH */}
        <button className="w-full bg-blue-600 rounded-[2.5rem] p-7 text-white flex justify-between items-center shadow-xl shadow-blue-200 active:scale-[0.97] transition-all">
            <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-white/10 rounded-[1.5rem] flex items-center justify-center border border-white/10">
                    <FaHeadset size={24} />
                </div>
                <div className="text-left">
                    <h3 className="text-base font-black uppercase italic tracking-tighter leading-none mb-1.5">Help Desk</h3>
                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">Message the Office</p>
                </div>
            </div>
            <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
                <FaChevronRight size={12} />
            </div>
        </button>

      </main>

      {/* FLOATING BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent">
        <nav className="w-full bg-white/90 backdrop-blur-xl border border-white rounded-[2.5rem] p-3 flex justify-around items-center shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
            <NavIcon icon={<FaHome size={20} />} label="Hub" active />
            <NavIcon icon={<FaTools size={20} />} label="Repair" />
            <NavIcon icon={<FaHeadset size={20} />} label="Chat" />
            <NavIcon icon={<FaUserCircle size={20} />} label="Profile" />
        </nav>
      </div>
    </div>
  );
};

/* COMPONENT: GRID CARD */
const GridCard = ({ icon, label, value, sub, statusColor, iconColor, active = false }) => (
  <div className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between h-44 transition-all active:scale-[0.98]`}>
    <div className="flex justify-between items-start">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-slate-50 ${iconColor}`}>
            {icon}
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${statusColor} ${active ? 'animate-ping' : ''}`}></div>
    </div>
    <div className="mt-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
        <p className="text-xl font-black text-slate-900 uppercase leading-none tracking-tighter italic mb-1.5">{value}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase italic opacity-50 tracking-tight">{sub}</p>
    </div>
  </div>
);

const NavIcon = ({ icon, label, active = false }) => (
    <button className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-2xl transition-all ${active ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}>
        {icon}
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </button>
);

export default StudentPortal;