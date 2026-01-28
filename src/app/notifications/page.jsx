"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar'; 
import { FaCheckDouble } from "react-icons/fa";
import { BiGhost } from "react-icons/bi";

// IMPORT YOUR NEW CLEAN COMPONENTS
import PulseLoader from '../components/PulseLoader';
import NotificationCard from '../components/NotificationCard';
import NotificationModal from '../components/NotificationModal';

const NotificationsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); 
  const [selectedNotif, setSelectedNotif] = useState(null);

  // MOCK DATA (You will replace this with Supabase Fetch later)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "SCHEDULE_OVERRIDE",
      title: "Viewing Schedule Update",
      message: "Viewing for Unit A402 confirmed at 14:00. Note: Falls within standard travel buffer for the maintenance team. Tenant has been notified via SMS.",
      time: "10 mins ago",
      priority: "Normal",
      read: false
    },
    {
      id: 2,
      type: "JOB_DONE",
      title: "Maintenance Completed",
      message: "Unit B12: Kitchen Sink repair marked as complete by Lindiwe. Verification pending. Please review the attached photos in the unit log to authorize vendor payment.",
      time: "45 mins ago",
      priority: "Normal",
      read: true
    },
    {
      id: 3,
      type: "URGENT_MAINTENANCE",
      title: "Urgent: Water Leak Reported",
      message: "Unit C09: Tenant reported burst pipe. Automatic alert sent to plumbing vendor (Rasta). Water main shutoff instructed via Pulse Chatbot. Immediate site visit required to assess floor damage.",
      time: "2 hours ago",
      priority: "Critical",
      read: false
    },
    {
      id: 4,
      type: "SYSTEM",
      title: "Lease Renewal Reminder",
      message: "Unit 404 lease expiring in 60 days. Renewal notice queued for dispatch. System recommendation: Review current market rates for Pretoria Hatfield area before confirming R7k rental price.",
      time: "5 hours ago",
      priority: "Normal",
      read: true
    }
  ]);

  // Simulate "Cooking" Effect
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500); 
    return () => clearTimeout(timer);
  }, []);

  const markAllRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));
  const markAsRead = (id) => setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  
  const deleteNotif = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
    if (selectedNotif?.id === id) setSelectedNotif(null);
  };

  const handleOpenSession = (notif) => {
    setSelectedNotif(notif);
    markAsRead(notif.id); 
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'urgent') return n.priority === 'High' || n.priority === 'Critical';
    if (filter === 'system') return n.type === 'SYSTEM' || n.type === 'SCHEDULE_OVERRIDE';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // The Loader
  if (loading) return <PulseLoader />;

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8`}>
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4 max-w-4xl mx-auto">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2">Pulse Feed</h1>
            <p className="text-[10px] text-blue-600 font-black tracking-[0.3em] uppercase">System Activity Log</p>
          </div>
          
          <div className="flex items-center gap-4">
             {unreadCount > 0 && (
                 <button onClick={markAllRead} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors tracking-widest flex items-center gap-2">
                    <FaCheckDouble /> Mark all read
                 </button>
             )}
          </div>
        </header>

        {/* FILTERS */}
        <div className="max-w-4xl mx-auto mb-8 flex overflow-x-auto gap-3 no-scrollbar pb-2">
            {[
                { key: 'all', label: 'All Activity' },
                { key: 'unread', label: `Unread (${unreadCount})` },
                { key: 'urgent', label: 'High Priority' },
                { key: 'system', label: 'System Updates' }
            ].map(f => (
                <button 
                    key={f.key} 
                    onClick={() => setFilter(f.key)}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all border ${
                        filter === f.key 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                    }`}
                >
                    {f.label}
                </button>
            ))}
        </div>

        {/* FEED LIST */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center opacity-40">
               <BiGhost size={56} className="mb-4 text-slate-400" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No updates found</p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <NotificationCard 
                key={n.id} 
                data={n} 
                onClick={() => handleOpenSession(n)} 
              />
            ))
          )}
        </div>
      </main>

      {/* THE SESSION WINDOW (MODAL) */}
      <NotificationModal 
          data={selectedNotif} 
          onClose={() => setSelectedNotif(null)} 
          onDelete={deleteNotif}
      />
    </div>
  );
};

export default NotificationsPage;