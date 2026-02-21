"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar'; 
import { FaCheckDouble } from "react-icons/fa";
import { BiGhost } from "react-icons/bi";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';

// IMPORT YOUR NEW CLEAN COMPONENTS
import PulseLoader from '../components/PulseLoader';
import NotificationCard from '../components/NotificationCard';
import NotificationModal from '../components/NotificationModal';

const NotificationsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); 
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Fetch real data from Firebase
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [maintenanceSnap, cleaningsSnap, inspectionsSnap, invoicesSnap, buildingsSnap] = await Promise.all([
          getDocs(collection(db, 'maintenance')),
          getDocs(collection(db, 'cleanings')),
          getDocs(collection(db, 'inspections')),
          getDocs(collection(db, 'invoices')),
          getDocs(collection(db, 'buildings'))
        ]);

        const maintenance = maintenanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const cleanings = cleaningsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const inspections = inspectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const buildings = buildingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Create building name map
        const buildingMap = {};
        buildings.forEach(b => {
          if (b.units && Array.isArray(b.units)) {
            b.units.forEach(unit => {
              buildingMap[unit] = b.name;
            });
          }
        });

        const generatedNotifications = [];
        let notifId = 1;

        // Add maintenance notifications
        maintenance.forEach(m => {
          if (m.status === 'completed') {
            generatedNotifications.push({
              id: notifId++,
              type: 'JOB_DONE',
              title: 'Maintenance Completed',
              message: `Unit ${buildingMap[m.apartment] || m.apartment} ${m.apartment}: "${m.title || 'Maintenance task'}" marked as complete. Status verified. Ready for final inspection.`,
              time: new Date(m.createdAt?.seconds * 1000).toLocaleDateString(),
              priority: 'Normal',
              read: false
            });
          } else if (m.status === 'in-progress') {
            generatedNotifications.push({
              id: notifId++,
              type: 'JOB_ACTIVE',
              title: 'Maintenance In Progress',
              message: `Unit ${buildingMap[m.apartment] || m.apartment} ${m.apartment}: "${m.title || 'Maintenance task'}" is currently being addressed. Estimated completion: ${m.dueDate || 'TBD'}`,
              time: 'In Progress',
              priority: 'Normal',
              read: false
            });
          } else if (m.status === 'not-started') {
            generatedNotifications.push({
              id: notifId++,
              type: 'URGENT_MAINTENANCE',
              title: 'Pending Maintenance',
              message: `Unit ${buildingMap[m.apartment] || m.apartment} ${m.apartment}: "${m.title || 'Maintenance task'}" requires attention. Priority level: ${m.priority || 'Normal'}.`,
              time: 'Pending',
              priority: m.priority === 'High' ? 'Critical' : 'Normal',
              read: false
            });
          }
        });

        // Add inspection notifications
        inspections.forEach(i => {
          if (i.status === 'completed') {
            generatedNotifications.push({
              id: notifId++,
              type: 'INSPECTION_DONE',
              title: 'Inspection Completed',
              message: `Unit ${buildingMap[i.apartment] || i.apartment} ${i.apartment}: Inspection conducted by ${i.inspector || 'Inspector'}. Rooms inspected: ${i.selectedRooms?.join(', ') || 'General'}. All findings documented.`,
              time: new Date(i.createdAt?.seconds * 1000).toLocaleDateString(),
              priority: 'Normal',
              read: false
            });
          } else if (i.status !== 'completed') {
            generatedNotifications.push({
              id: notifId++,
              type: 'SCHEDULE_OVERRIDE',
              title: 'Inspection Scheduled',
              message: `Unit ${buildingMap[i.apartment] || i.apartment} ${i.apartment}: Inspection booked for ${i.date || 'TBD'} at ${i.time || 'TBD'}. Inspector: ${i.inspector || 'TBD'}.`,
              time: 'Upcoming',
              priority: 'Normal',
              read: false
            });
          }
        });

        // Add cleaning notifications
        cleanings.forEach(c => {
          if (c.status === 'Completed') {
            generatedNotifications.push({
              id: notifId++,
              type: 'CLEANING_DONE',
              title: 'Cleaning Completed',
              message: `Unit ${buildingMap[c.apartment] || c.apartment} ${c.apartment}: Cleaning completed by ${c.cleaner || 'Cleaner'}. Service level: ${c.level || 'Standard'}. Quality verified.`,
              time: new Date(c.createdAt?.seconds * 1000).toLocaleDateString(),
              priority: 'Normal',
              read: false
            });
          } else if (c.status === 'Booked') {
            generatedNotifications.push({
              id: notifId++,
              type: 'CLEANING_SCHEDULED',
              title: 'Cleaning Booked',
              message: `Unit ${buildingMap[c.apartment] || c.apartment} ${c.apartment}: Cleaning scheduled for ${c.serviceDate || 'TBD'} at ${c.time || 'TBD'}. Assigned to: ${c.cleaner || 'TBD'}.`,
              time: 'Upcoming',
              priority: 'Normal',
              read: false
            });
          }
        });

        // Add invoice notifications
        invoices.forEach(inv => {
          if (inv.status === 'Paid') {
            generatedNotifications.push({
              id: notifId++,
              type: 'PAYMENT_RECEIVED',
              title: 'Invoice Paid',
              message: `Invoice #${inv.invoiceNumber || 'N/A'} for ${inv.unit || 'Service'}: Payment received (R${inv.totalAmount || '0'}). Funds cleared and recorded.`,
              time: new Date(inv.createdAt?.seconds * 1000).toLocaleDateString(),
              priority: 'Normal',
              read: false
            });
          } else if (inv.status === 'Sent') {
            generatedNotifications.push({
              id: notifId++,
              type: 'INVOICE_SENT',
              title: 'Invoice Sent',
              message: `Invoice #${inv.invoiceNumber || 'N/A'} for ${inv.unit || 'Service'}: Amount R${inv.totalAmount || '0'} sent to client. Payment due by ${inv.dueDate || 'TBD'}.`,
              time: 'Awaiting Payment',
              priority: 'Normal',
              read: false
            });
          } else if (inv.status === 'Draft') {
            generatedNotifications.push({
              id: notifId++,
              type: 'DRAFT_INVOICE',
              title: 'Invoice Pending Review',
              message: `Invoice #${inv.invoiceNumber || 'N/A'} draft for ${inv.unit || 'Service'}: Amount R${inv.totalAmount || '0'}. Awaiting final review and dispatch.`,
              time: 'Draft',
              priority: 'Normal',
              read: false
            });
          }
        });

        // Sort by recency (newest first)
        generatedNotifications.sort((a, b) => {
          const timeA = new Date(a.time).getTime() || 0;
          const timeB = new Date(b.time).getTime() || 0;
          return timeB - timeA;
        });

        setNotifications(generatedNotifications);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setLoading(false);
      }
    };

    fetchNotifications();
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
    if (filter === 'system') return ['MAINTENANCE', 'INSPECTION', 'CLEANING', 'INVOICE'].some(type => n.type.includes(type));
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