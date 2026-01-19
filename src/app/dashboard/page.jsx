"use client";
import { useState } from 'react';
import Sidebar from '@/app/components/Sidebar'; 
import Link from 'next/link';
import { 
  FaCar, FaHeadset, FaSoap, FaUserFriends, FaBell, 
  FaTools, FaClipboardCheck, FaBuilding, FaChevronRight, FaCircle, 
  FaTimes, FaUser, FaBars
} from "react-icons/fa";

/* --- MOCK DATA: FLEET LOG --- */
const FLEET_DATA = [
  { id: 'C1', model: 'VW Polo (FP 22)', status: 'ACTIVE', driver: 'Kally', job: 'Unit 408: Leaking Sink', tripsToday: 2 },
  { id: 'C2', model: 'Isuzu Bakkie', status: 'ACTIVE', driver: 'Rasta', job: 'Hardware: Tiles', tripsToday: 3 },
  { id: 'C3', model: 'Mahindra PikUp', status: 'ACTIVE', driver: 'Johannes', job: 'Unit 102: Paint', tripsToday: 5 }, // Most Used
  { id: 'C4', model: 'Toyota Hilux', status: 'PARKED', driver: null, job: null, tripsToday: 1 },
  { id: 'C5', model: 'Nissan NP200', status: 'PARKED', driver: null, job: null, tripsToday: 0 },
  { id: 'C6', model: 'Hyundai i10', status: 'PARKED', driver: null, job: null, tripsToday: 0 },
  { id: 'C7', model: 'Ford Ranger', status: 'ACTIVE', driver: 'Peter', job: 'Commune 4: Garden', tripsToday: 1 },
];

const DashboardPage = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      
      {/* GLOBAL STYLE FOR NO SCROLLBAR */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* MAIN CONTENT WRAPPER 
          - Mobile: ml-0 (Sidebar is overlay)
          - Desktop: ml-64 (Sidebar pushes content)
      */}
      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8`}>
        
        {/* HEADER */}
        <header className="flex justify-between items-end mb-6">
          <div className="flex items-center gap-4">
            {/* MOBILE HAMBURGER BUTTON */}
            <button 
              onClick={() => setIsOpen(true)} 
              className="md:hidden bg-white p-3 rounded-xl shadow-sm text-slate-600 border border-slate-200"
            >
              <FaBars />
            </button>
            
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none">Executive Pulse</h1>
              <p className="text-slate-400 font-bold mt-1 tracking-widest text-[9px] uppercase italic">Real-Time Operational Ratios</p>
            </div>
          </div>

          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-2 hidden md:flex">
             <FaCircle className="text-green-500 text-[8px] animate-pulse" />
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Pretoria Central Hub</span>
          </div>
        </header>

        {/* BENTO GRID LAYOUT 
            - Mobile: grid-cols-2 (Stacking)
            - Desktop: grid-cols-12 (Bento)
        */}
        <div className="grid grid-cols-2 md:grid-cols-12 auto-rows-min md:grid-rows-6 gap-4 h-auto md:h-[650px]">
          
          {/* 1. INSPECTIONS */}
          <ActiveJobTile 
            col="col-span-1 md:col-span-3" row="row-span-2"
            icon={<FaClipboardCheck />} title="Inspections" count={12} color="bg-blue-600" subtext="Booked"
          />

          {/* 2. MAINTENANCE */}
          <ActiveJobTile 
            col="col-span-1 md:col-span-3" row="row-span-2"
            icon={<FaTools />} title="Maintenance" count={15} color="bg-red-500" subtext="Active"
          />

          {/* 3. FLEET CARD (POP-OUT) - Full Width on Mobile */}
          <div className="col-span-2 md:col-span-6 row-span-2 relative z-10 h-[250px] md:h-auto">
             <SmartFleetCard fleet={FLEET_DATA} />
          </div>

          {/* 4. CLEANING - Full Width on Mobile */}
          <ActiveJobTile 
            col="col-span-2 md:col-span-4" row="row-span-2"
            icon={<FaSoap />} title="Cleaning" count={20} color="bg-green-600" subtext="Units in queue"
          />

          {/* 5. VIEWINGS */}
          <ActiveJobTile 
            col="col-span-1 md:col-span-3" row="row-span-2"
            icon={<FaUserFriends />} title="Viewings" count={8} color="bg-purple-600" subtext="Pending"
          />

          {/* 6. INVENTORY BLOCK - Full Width on Mobile */}
          <div className="col-span-2 md:col-span-5 row-span-2 bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[180px]">
             <div className="flex items-center space-x-2 mb-2">
                <FaBuilding size={14} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Overview</h3>
             </div>
             <div className="flex justify-between items-end">
                <div>
                    <p className="text-3xl font-black tracking-tighter italic leading-none">316</p>
                    <p className="text-[8px] font-black uppercase text-slate-400">Total Units</p>
                </div>
                <div className="text-right space-y-1">
                    <p className="text-xs font-black italic uppercase">Flats: <span className="text-blue-600">16</span></p>
                    <p className="text-xs font-black italic uppercase">Commune: <span className="text-orange-500">300</span></p>
                </div>
             </div>
          </div>

          {/* 7. HELP DESK */}
          <Link href="/helpdesk" className="col-span-1 md:col-span-2 row-span-2 block">
            <div className="h-full bg-blue-500 rounded-[2rem] p-5 text-white flex flex-col justify-between group cursor-pointer hover:bg-blue-600 transition-all min-h-[160px]">
               <div className="flex justify-between items-start">
                  <FaHeadset size={20} />
                  <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg">LIVE</span>
               </div>
               <div>
                  <p className="text-2xl font-black italic leading-none mb-1">24</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-80 italic">Unread</p>
               </div>
            </div>
          </Link>

          {/* 8. NOTIFICATIONS */}
          <Link href="/notifications" className="col-span-1 md:col-span-2 row-span-2 block">
            <div className="h-full bg-slate-900 rounded-[2rem] p-5 text-white flex flex-col justify-between border-b-4 border-red-600 group cursor-pointer hover:bg-slate-800 transition-all min-h-[160px]">
               <div className="flex justify-between items-start">
                  <FaBell size={20} className="text-slate-500" />
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
               </div>
               <div>
                  <p className="text-2xl font-black italic leading-none mb-1 text-red-500">03</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">Alerts</p>
               </div>
            </div>
          </Link>

        </div>
      </main>
    </div>
  );
};

/* --- COMPONENT: ACTIVE JOB TILE --- */
const ActiveJobTile = ({ col, row, icon, title, count, color, subtext }) => {
  return (
    <div className={`${col} ${row} bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-400 transition-all min-h-[160px]`}>
      <div className="flex justify-between items-start">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg ${color} shadow-lg shadow-${color.replace('bg-', '')}/30`}>
          {icon}
        </div>
        <div className="bg-slate-100 px-2 py-1 rounded-md">
           <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Active</p>
        </div>
      </div>
      <div>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline space-x-2">
            <span className="text-3xl md:text-4xl font-black italic tracking-tighter text-slate-900">{count}</span>
            <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{subtext}</span>
        </div>
      </div>
    </div>
  );
};

/* --- COMPONENT: SMART FLEET CARD (POP-OUT + NO SCROLLBAR) --- */
const SmartFleetCard = ({ fleet }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Stats Logic
  const totalCars = fleet.length;
  const activeCars = fleet.filter(c => c.status === 'ACTIVE').length;
  const mostUsedCar = fleet.reduce((prev, current) => (prev.tripsToday > current.tripsToday) ? prev : current);

  return (
    <>
      {/* 1. THE SMALL TILE (Visible in Grid) */}
      <div 
        onClick={() => setIsExpanded(true)}
        className="w-full h-full bg-[#0F172A] text-white rounded-[2rem] p-6 flex flex-col justify-between cursor-pointer border border-slate-800 hover:border-blue-500 transition-all shadow-xl relative z-10"
      >
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
               <div className="p-2 bg-blue-600 rounded-lg">
                  <FaCar className="text-white" />
               </div>
               <div>
                  <h3 className="text-[12px] font-black uppercase tracking-widest">Fleet Active</h3>
                  <p className="text-[8px] text-blue-400 font-bold uppercase">{activeCars} / {totalCars} Vehicles Out</p>
               </div>
            </div>
            <FaChevronRight className="text-slate-600 animate-pulse" />
        </div>

        <div className="space-y-2 mt-2">
             {/* Simple preview list */}
             {fleet.filter(c => c.status === 'ACTIVE').slice(0, 2).map((car) => (
                <div key={car.id} className="flex justify-between items-center opacity-80">
                   <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{car.model}</p>
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                </div>
             ))}
             {activeCars > 2 && <p className="text-[8px] text-slate-500 uppercase font-black italic">+ {activeCars - 2} others...</p>}
        </div>
      </div>

      {/* 2. THE EXPANDED MODAL (Pop-Up) */}
      {isExpanded && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0F172A] w-full max-w-4xl h-[85vh] rounded-[3rem] border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* MODAL HEADER */}
            <div className="p-8 pb-4 flex justify-between items-start border-b border-white/10">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">Fleet Command Log</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-Time Vehicle Status</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                  className="bg-white/10 p-3 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                >
                    <FaTimes size={16} />
                </button>
            </div>

            {/* DASHBOARD STATS ROW */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 p-4 md:p-8 md:py-6 bg-white/5 border-b border-white/5">
                <div className="flex flex-col items-center justify-center border-r border-white/10">
                    <span className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Fleet</span>
                    <span className="text-2xl md:text-4xl font-black text-white italic">{totalCars}</span>
                </div>
                <div className="flex flex-col items-center justify-center border-r border-white/10">
                    <span className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Active Now</span>
                    <span className="text-2xl md:text-4xl font-black text-blue-400 italic">{activeCars}</span>
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Busiest</span>
                    <span className="text-sm md:text-xl font-black text-orange-500 italic leading-none">{mostUsedCar.model}</span>
                    <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase">{mostUsedCar.tripsToday} Trips</span>
                </div>
            </div>

            {/* THE SCROLLABLE LIST (With .no-scrollbar class) */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 no-scrollbar">
                <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-4">Detailed Vehicle Register</h3>
                
                {fleet.map((car) => (
                    <div key={car.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center transition-all gap-4 ${car.status === 'ACTIVE' ? 'bg-blue-900/20 border-blue-500/30' : 'bg-white/5 border-white/10'}`}>
                        
                        {/* LEFT: CAR & DRIVER INFO */}
                        <div className="flex items-center gap-6 w-full md:w-auto">
                            {/* Icon Box */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${car.status === 'ACTIVE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-700 text-slate-400'}`}>
                                <FaCar />
                            </div>

                            <div>
                                <h4 className="text-lg font-black text-white uppercase italic tracking-wide">{car.model}</h4>
                                {car.status === 'ACTIVE' ? (
                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                        <span className="flex items-center gap-1 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                            <FaUser size={8} /> {car.driver}
                                        </span>
                                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-tight">
                                            → {car.job}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest mt-1 block">
                                        ✅ Available for booking
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: STATUS BADGE */}
                        <div className="w-full md:w-auto text-left md:text-right pl-[4.5rem] md:pl-0">
                             {car.status === 'ACTIVE' ? (
                                <div className="flex flex-col items-start md:items-end gap-1">
                                    <span className="px-3 py-1 rounded bg-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-widest border border-green-500/20">
                                        IN USE
                                    </span>
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-100"></span>
                                    </div>
                                </div>
                             ) : (
                                <span className="px-3 py-1 rounded bg-slate-700/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-white/5">
                                    PARKED
                                </span>
                             )}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardPage;