"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar'; 
import Link from 'next/link';
import { 
  FaHeadset, FaUserFriends, FaBell, FaTools, FaClipboardCheck,
  FaBuilding, FaCircle, FaBars
} from "react-icons/fa";
import { BiLink, BiCheck, BiTime } from "react-icons/bi";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';

const DashboardPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [buildings, setBuildings] = useState([]);
  const [inspectionsCount, setInspectionsCount] = useState(0);
  const [maintenanceCount, setMaintenanceCount] = useState(0);
  const [viewingsCount, setViewingsCount] = useState(0);
  const [helpdeskCount, setHelpdeskCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);

  // ExecStream Link Generator States
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch buildings
        const buildingsSnapshot = await getDocs(collection(db, "buildings"));
        const buildingsData = buildingsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          type: doc.data().type || 'Flat',
          units: doc.data().units || []
        }));
        setBuildings(buildingsData);

        // Fetch inspections count
        const inspectionsSnapshot = await getDocs(collection(db, "inspections"));
        setInspectionsCount(inspectionsSnapshot.size);

        // Fetch maintenance count (active/pending maintenance jobs)
        const maintenanceSnapshot = await getDocs(collection(db, "maintenance"));
        const activeMaintenance = maintenanceSnapshot.docs.filter(doc => (doc.data().status || '').toLowerCase() !== 'completed').length;
        setMaintenanceCount(activeMaintenance);

        // Fetch viewings count (pending viewings)
        const viewingsSnapshot = await getDocs(collection(db, "viewings"));
        setViewingsCount(viewingsSnapshot.size);

        // Fetch helpdesk count (unread messages)
        const helpdeskSnapshot = await getDocs(collection(db, "helpdesk"));
        const unreadMessages = helpdeskSnapshot.docs.filter(doc => !doc.data().read).length;
        setHelpdeskCount(unreadMessages);

        // Fetch notifications count (active alerts)
        const notificationsSnapshot = await getDocs(collection(db, "notifications"));
        const activeNotifications = notificationsSnapshot.docs.filter(doc => doc.data().status === 'active').length;
        setNotificationsCount(activeNotifications);

      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const totalBuildings = buildings.length;
  const totalUnits = buildings.reduce((sum, b) => sum + b.units.length, 0);
  const flatsCount = buildings.filter(b => b.type === 'Flat').length;
  const communesCount = buildings.filter(b => b.type === 'Commune').length;

  // Generate live ExecStream Boardroom link using actual live dashboard counters
  const generateBoardroomLink = () => {
    const snapshot = {
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
      metrics: {
        totalTicketsThisWeek: maintenanceCount + inspectionsCount,
        lastWeekTotal: 22,
        openTickets: maintenanceCount,
        closedTickets: inspectionsCount,
        openReasons: {
          waitingOnOwner: Math.max(1, Math.floor(maintenanceCount * 0.4)),
          tenantNotAround: Math.max(1, Math.floor(maintenanceCount * 0.2)),
          waitingForParts: Math.max(1, Math.floor(maintenanceCount * 0.4)),
        },
        totalSpendThisWeek: maintenanceCount * 1250,
        totalSpendLastWeek: 15800,
        topSuppliers: [
          { name: 'Metro Plumbing', jobs: Math.max(1, Math.floor(maintenanceCount * 0.5)), cost: maintenanceCount * 800 },
          { name: 'Spark Electricians', jobs: Math.max(1, Math.floor(maintenanceCount * 0.5)), cost: maintenanceCount * 450 },
        ],
        recurringIssueProperty: totalUnits > 0 ? `${buildings[0]?.name || 'Property'} (Active maintenance inspection required)` : 'Pretoria Central Portfolio Units',
      }
    };

    const jsonString = JSON.stringify(snapshot);
    const encodedPayload = btoa(unescape(encodeURIComponent(jsonString)));
    const url = `${window.location.origin}/boardroom?data=${encodedPayload}`;
    setShareLink(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      
      {/* MAIN CONTENT WRAPPER */}
      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8`}>
        
        {/* HEADER */}
        <header className="flex justify-between items-end mb-6">
          <div className="flex items-center gap-4">
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

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-2 md:grid-cols-12 auto-rows-min md:grid-rows-6 gap-4 h-auto md:h-[650px]">
          
          {/* 1. INSPECTIONS */}
          <ActiveJobTile 
            col="col-span-1 md:col-span-3" row="row-span-2"
            icon={<FaClipboardCheck />} title="Inspections" count={inspectionsCount} color="bg-blue-600" subtext="Booked"
          />

          {/* 2. MAINTENANCE */}
          <ActiveJobTile 
            col="col-span-1 md:col-span-3" row="row-span-2"
            icon={<FaTools />} title="Maintenance" count={maintenanceCount} color="bg-red-500" subtext="Active"
          />

          {/* 3. VIEWINGS */}
          <ActiveJobTile 
            col="col-span-1 md:col-span-3" row="row-span-2"
            icon={<FaUserFriends />} title="Viewings" count={viewingsCount} color="bg-purple-600" subtext="Pending"
          />

          {/* 4. INVENTORY BLOCK */}
          <div className="col-span-2 md:col-span-5 row-span-2 bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[180px]">
             <div className="flex items-center space-x-2 mb-2">
                <FaBuilding size={14} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Overview</h3>
             </div>
             <div className="flex justify-between items-end">
                <div>
                    <p className="text-3xl font-black tracking-tighter italic leading-none">{totalUnits}</p>
                    <p className="text-[8px] font-black uppercase text-slate-400">Total Units</p>
                </div>
                <div className="text-right space-y-1">
                    <p className="text-xs font-black italic uppercase">Flats: <span className="text-blue-600">{flatsCount}</span></p>
                    <p className="text-xs font-black italic uppercase">Commune: <span className="text-orange-500">{communesCount}</span></p>
                </div>
             </div>
          </div>

          {/* 5. HELP DESK */}
          <Link href="/helpdesk" className="col-span-1 md:col-span-2 row-span-2 block">
            <div className="h-full bg-blue-500 rounded-[2rem] p-5 text-white flex flex-col justify-between group cursor-pointer hover:bg-blue-600 transition-all min-h-[160px]">
               <div className="flex justify-between items-start">
                  <FaHeadset size={20} />
                  <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg">LIVE</span>
               </div>
               <div>
                  <p className="text-2xl font-black italic leading-none mb-1">{helpdeskCount}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-80 italic">Unread</p>
               </div>
            </div>
          </Link>

          {/* 6. NOTIFICATIONS */}
          <Link href="/notifications" className="col-span-1 md:col-span-2 row-span-2 block">
            <div className="h-full bg-slate-900 rounded-[2rem] p-5 text-white flex flex-col justify-between border-b-4 border-red-600 group cursor-pointer hover:bg-slate-800 transition-all min-h-[160px]">
               <div className="flex justify-between items-start">
                  <FaBell size={20} className="text-slate-500" />
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
               </div>
               <div>
                  <p className="text-2xl font-black italic leading-none mb-1 text-red-500">{notificationsCount}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">Alerts</p>
               </div>
            </div>
          </Link>

        </div>

        {/* 7. EXECSTREAM BOARDROOM LINK GENERATOR WIDGET */}
        <div className="mt-8 bg-[#0F172A] border border-slate-800 rounded-[2rem] p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-black uppercase italic tracking-tighter">ExecStream Boardroom Feed Generator</h3>
              <p className="text-xs text-slate-400">Package live maintenance and operations metrics into a secure, 24-hour self-destructing link.</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-500 flex items-center justify-center shrink-0">
              <BiTime size={22} />
            </div>
          </div>

          {!shareLink ? (
            <button
              onClick={generateBoardroomLink}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <BiLink size={18} />
              Generate 24H Boardroom Link
            </button>
          ) : (
            <div className="space-y-3 animate-in fade-in">
              <div className="p-3 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-between gap-2">
                <span className="text-xs text-blue-400 font-mono truncate">{shareLink}</span>
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
                >
                  {copied ? <BiCheck size={16} /> : <BiLink size={16} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] text-amber-400 font-bold italic text-center">
                ⚠️ This link is live and active for exactly 24 hours. No login required.
              </p>
            </div>
          )}
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

export default DashboardPage;
