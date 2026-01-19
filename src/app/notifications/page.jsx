"use client";
import { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { 
  FaClipboardList, FaTools, FaCheckCircle, 
  FaExclamationTriangle, FaClock, FaTrash, FaFilter, FaCheckDouble, FaCalendarCheck
} from "react-icons/fa";
import { BiBell, BiGhost } from "react-icons/bi";

const NotificationsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'urgent', 'system'

  // MOCK DATA - PROFESSIONAL TONE
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "SCHEDULE_OVERRIDE",
      title: "Viewing Schedule Update",
      message: "Viewing for Unit A402 confirmed at 14:00. Note: Falls within standard travel buffer.",
      time: "10 mins ago",
      priority: "Normal",
      read: false
    },
    {
      id: 2,
      type: "JOB_DONE",
      title: "Maintenance Completed",
      message: "Unit B12: Kitchen Sink repair marked as complete by Lindiwe. Verification pending.",
      time: "45 mins ago",
      priority: "Normal",
      read: true
    },
    {
      id: 3,
      type: "URGENT_MAINTENANCE",
      title: "Urgent: Water Leak Reported",
      message: "Unit C09: Tenant reported burst pipe. Automatic alert sent to plumbing vendor.",
      time: "2 hours ago",
      priority: "Critical",
      read: false
    },
    {
      id: 4,
      type: "SYSTEM",
      title: "Lease Renewal Reminder",
      message: "Unit 404 lease expiring in 60 days. Renewal notice queued for dispatch.",
      time: "5 hours ago",
      priority: "Normal",
      read: true
    }
  ]);

  // ACTIONS
  const markAllRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));
  const markAsRead = (id) => setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  const deleteNotif = (id) => setNotifications(notifications.filter(n => n.id !== id));

  // FILTER LOGIC
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'urgent') return n.priority === 'High' || n.priority === 'Critical';
    if (filter === 'system') return n.type === 'SYSTEM' || n.type === 'SCHEDULE_OVERRIDE';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8`}>
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4 max-w-4xl mx-auto">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Pulse Feed</h1>
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
        <div className="max-w-4xl mx-auto mb-8 flex overflow-x-auto gap-2 no-scrollbar pb-2">
            {[
                { key: 'all', label: 'All Activity' },
                { key: 'unread', label: `Unread (${unreadCount})` },
                { key: 'urgent', label: 'High Priority' },
                { key: 'system', label: 'System Updates' }
            ].map(f => (
                <button 
                    key={f.key} 
                    onClick={() => setFilter(f.key)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all border ${
                        filter === f.key 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {f.label}
                </button>
            ))}
        </div>

        {/* FEED LIST */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center opacity-50">
               <BiGhost size={48} className="mb-4 text-slate-300" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No updates found</p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <NotificationCard 
                key={n.id} 
                data={n} 
                onRead={() => markAsRead(n.id)} 
                onDelete={() => deleteNotif(n.id)} 
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

/* --- CARD COMPONENT --- */
const NotificationCard = ({ data, onRead, onDelete }) => {
  const { type, title, message, time, priority, read } = data;

  // ICON & COLOR LOGIC
  let icon = <BiBell />;
  let colorClass = "bg-blue-100 text-blue-600";
  let borderClass = "border-l-4 border-l-blue-500"; 

  if (type === 'SCHEDULE_OVERRIDE') {
      icon = <FaCalendarCheck />;
      colorClass = "bg-orange-100 text-orange-600";
      borderClass = "border-l-4 border-l-orange-500";
  } else if (type === 'URGENT_MAINTENANCE' || priority === 'Critical') {
      icon = <FaExclamationTriangle />;
      colorClass = "bg-red-100 text-red-600";
      borderClass = "border-l-4 border-l-red-500";
  } else if (type === 'JOB_DONE') {
      icon = <FaCheckCircle />;
      colorClass = "bg-green-100 text-green-600";
      borderClass = "border-l-4 border-l-green-500";
  } else if (type === 'SYSTEM') {
      icon = <FaClipboardList />;
      colorClass = "bg-slate-100 text-slate-600";
      borderClass = "border-l-4 border-l-slate-500";
  }

  return (
    <div className={`relative group p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-2 ${read ? 'opacity-70 bg-slate-50' : 'opacity-100'}`}>
      
      {/* LEFT BORDER ACCENT */}
      <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${borderClass.split(' ')[1]}`}></div>

      <div className="flex items-start gap-5 ml-2">
        {/* ICON */}
        <div className={`p-3 rounded-xl shrink-0 ${colorClass}`}>
           {icon}
        </div>

        {/* CONTENT */}
        <div className="flex-1">
           <div className="flex justify-between items-start">
              <h3 className={`text-xs font-black uppercase tracking-tight mb-1 ${read ? 'text-slate-500' : 'text-slate-900'}`}>
                  {title}
              </h3>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <FaClock size={8} /> {time}
              </span>
           </div>
           
           <p className="text-[11px] font-medium text-slate-600 leading-relaxed max-w-xl">
              {message}
           </p>

           {/* BADGES */}
           <div className="flex gap-2 mt-3">
               {(priority === 'High' || priority === 'Critical') && (
                   <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">High Priority</span>
               )}
               {!read && (
                   <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">New</span>
               )}
           </div>
        </div>

        {/* HOVER ACTIONS */}
        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!read && (
                <button onClick={onRead} className="p-2 bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors" title="Mark Read">
                    <FaCheckDouble size={12} />
                </button>
            )}
            <button onClick={onDelete} className="p-2 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors" title="Delete">
                <FaTrash size={12} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;