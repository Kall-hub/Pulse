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
  const [selectingMode, setSelectingMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

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

        // Create building name map (string keys)
        const buildingMap = {};
        buildings.forEach(b => {
          if (b.units && Array.isArray(b.units)) {
            b.units.forEach(unit => {
              buildingMap[String(unit)] = b.name;
            });
          }
        });

        // Helpers to normalize fields and timestamps
        const getUnitField = (obj) => obj?.unit || obj?.apartment || obj?.unitNumber || obj?.apartmentNumber || 'Unknown';
        const formatDateString = (ts) => {
          if (!ts) return 'Unknown';
          try {
            if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString();
            if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
            return new Date(ts).toLocaleDateString();
          } catch (e) {
            return String(ts);
          }
        };
        const timestampMs = (ts) => {
          if (!ts) return 0;
          try {
            if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate().getTime();
            if (ts.seconds) return ts.seconds * 1000;
            const n = Date.parse(String(ts));
            return Number.isNaN(n) ? 0 : n;
          } catch (e) {
            return 0;
          }
        };

        const generatedNotifications = [];
        // Local persistence key for read/delete state
        const LOCAL_KEY = 'pulse.notifications.v1';
        const loadLocal = () => {
          try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch (e) { return {}; }
        };
        const saveLocal = (obj) => {
          try { localStorage.setItem(LOCAL_KEY, JSON.stringify(obj)); } catch (e) {}
        };
        const localState = loadLocal();
        let notifId = 1;

        // Add maintenance notifications (use normalized unit field and robust timestamps)
        maintenance.forEach(m => {
          const unitVal = getUnitField(m);
          const displayUnit = buildingMap[unitVal] ? `${buildingMap[unitVal]} ${unitVal}` : unitVal;
          const created = formatDateString(m.createdAt);
          const ms = timestampMs(m.createdAt);

          if (m.status === 'completed') {
            const nid = `maintenance-${m.id || notifId++}`;
            if (localState[nid]?.deleted) return;
            generatedNotifications.push({
              id: nid,
              type: 'JOB_DONE',
              title: 'Maintenance Completed',
              message: `Unit ${displayUnit}: "${m.title || m.issue || 'Maintenance task'}" marked as complete. Status verified. Ready for final inspection.`,
              time: created,
              sortTime: ms,
              priority: 'Normal',
              read: localState[nid]?.read ?? false
            });
          } else if (m.status === 'in-progress' || m.status === 'active') {
            const nid = `maintenance-${m.id || notifId++}`;
            if (localState[nid]?.deleted) return;
            generatedNotifications.push({
              id: nid,
              type: 'JOB_ACTIVE',
              title: 'Maintenance In Progress',
              message: `Unit ${displayUnit}: "${m.title || m.issue || 'Maintenance task'}" is currently being addressed. Estimated completion: ${m.dueDate || 'TBD'}`,
              time: 'In Progress',
              sortTime: ms || Date.now(),
              priority: 'Normal',
              read: localState[nid]?.read ?? false
            });
          } else if (m.status === 'not-started' || m.status === 'request') {
            const nid = `maintenance-${m.id || notifId++}`;
            if (localState[nid]?.deleted) return;
            generatedNotifications.push({
              id: nid,
              type: 'URGENT_MAINTENANCE',
              title: 'Pending Maintenance',
              message: `Unit ${displayUnit}: "${m.title || m.issue || 'Maintenance task'}" requires attention. Priority level: ${m.priority || 'Normal'}.`,
              time: 'Pending',
              sortTime: ms || Date.now(),
              priority: m.priority === 'High' ? 'Critical' : 'Normal',
              read: localState[nid]?.read ?? false
            });
          }
        });

        // Add inspection notifications
        inspections.forEach(i => {
          const unitVal = getUnitField(i);
          const displayUnit = buildingMap[unitVal] ? `${buildingMap[unitVal]} ${unitVal}` : unitVal;
          const created = formatDateString(i.createdAt);
          const ms = timestampMs(i.createdAt);

          if (i.status === 'completed') {
            const nid = `inspection-${i.id || notifId++}`;
            if (localState[nid]?.deleted) return;
            generatedNotifications.push({
              id: nid,
              type: 'INSPECTION_DONE',
              title: 'Inspection Completed',
              message: `Unit ${displayUnit}: Inspection conducted by ${i.inspector || 'Inspector'}. Rooms inspected: ${i.selectedRooms?.join(', ') || 'General'}. All findings documented.`,
              time: created,
              sortTime: ms,
              priority: 'Normal',
              read: localState[nid]?.read ?? false
            });
          } else if (i.status !== 'completed') {
            const nid = `inspection-${i.id || notifId++}`;
            if (localState[nid]?.deleted) return;
            generatedNotifications.push({
              id: nid,
              type: 'SCHEDULE_OVERRIDE',
              title: 'Inspection Scheduled',
              message: `Unit ${displayUnit}: Inspection booked for ${i.date || 'TBD'} at ${i.time || 'TBD'}. Inspector: ${i.inspector || 'TBD'}.`,
              time: 'Upcoming',
              sortTime: ms || Date.now(),
              priority: 'Normal',
              read: localState[nid]?.read ?? false
            });
          }
        });

        // Add cleaning notifications
        cleanings.forEach(c => {
          const unitVal = getUnitField(c);
          const displayUnit = buildingMap[unitVal] ? `${buildingMap[unitVal]} ${unitVal}` : unitVal;
          const created = formatDateString(c.createdAt);
          const ms = timestampMs(c.createdAt);

          if ((c.status || '').toLowerCase() === 'completed') {
            const nid = `cleaning-${c.id || notifId++}`;
            if (localState[nid]?.deleted) return;
            generatedNotifications.push({
              id: nid,
              type: 'CLEANING_DONE',
              title: 'Cleaning Completed',
              message: `Unit ${displayUnit}: Cleaning completed by ${c.cleaner || 'Cleaner'}. Service level: ${c.level || 'Standard'}. Quality verified.`,
              time: created,
              sortTime: ms,
              priority: 'Normal',
              read: localState[nid]?.read ?? false
            });
          } else if ((c.status || '').toLowerCase() === 'booked') {
            const nid = `cleaning-${c.id || notifId++}`;
            if (localState[nid]?.deleted) return;
            generatedNotifications.push({
              id: nid,
              type: 'CLEANING_SCHEDULED',
              title: 'Cleaning Booked',
              message: `Unit ${displayUnit}: Cleaning scheduled for ${c.serviceDate || 'TBD'} at ${c.time || 'TBD'}. Assigned to: ${c.cleaner || 'TBD'}.`,
              time: 'Upcoming',
              sortTime: ms || Date.now(),
              priority: 'Normal',
              read: localState[nid]?.read ?? false
            });
          }
        });

        // Add invoice notifications
        invoices.forEach(inv => {
          const unitVal = getUnitField(inv);
          const displayUnit = unitVal === 'Unknown' ? (inv.unit || 'Service') : unitVal;
          const created = formatDateString(inv.createdAt);
          const ms = timestampMs(inv.createdAt);

          if ((inv.status || '').toLowerCase() === 'paid') {
            const nid = `invoice-${inv.id || notifId++}`;
            if (localState[nid]?.deleted) return;
            generatedNotifications.push({
              id: nid,
              type: 'PAYMENT_RECEIVED',
              title: 'Invoice Paid',
              message: `Invoice #${inv.invoiceNumber || 'N/A'} for ${displayUnit}: Payment received (R${inv.totalAmount || '0'}). Funds cleared and recorded.`,
              time: created,
              sortTime: ms,
              priority: 'Normal',
              read: localState[nid]?.read ?? false
            });
          } else if ((inv.status || '').toLowerCase() === 'sent') {
            const nid = `invoice-${inv.id || notifId++}`;
            if (localState[nid]?.deleted) return;
            generatedNotifications.push({
              id: nid,
              type: 'INVOICE_SENT',
              title: 'Invoice Sent',
              message: `Invoice #${inv.invoiceNumber || 'N/A'} for ${displayUnit}: Amount R${inv.totalAmount || '0'} sent to client. Payment due by ${inv.dueDate || 'TBD'}.`,
              time: 'Awaiting Payment',
              sortTime: ms || Date.now(),
              priority: 'Normal',
              read: localState[nid]?.read ?? false
            });
          } else if ((inv.status || '').toLowerCase() === 'draft') {
            const nid = `invoice-${inv.id || notifId++}`;
            if (localState[nid]?.deleted) return;
            generatedNotifications.push({
              id: nid,
              type: 'DRAFT_INVOICE',
              title: 'Invoice Pending Review',
              message: `Invoice #${inv.invoiceNumber || 'N/A'} draft for ${displayUnit}: Amount R${inv.totalAmount || '0'}. Awaiting final review and dispatch.`,
              time: 'Draft',
              sortTime: ms || Date.now(),
              priority: 'Normal',
              read: localState[nid]?.read ?? false
            });
          }
        });

        // Sort by provided numeric sortTime (fallback to 0)
        generatedNotifications.sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0));

        setNotifications(generatedNotifications);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAllRead = () => {
    const local = (() => { try { return JSON.parse(localStorage.getItem('pulse.notifications.v1') || '{}'); } catch { return {}; }})();
    const updated = notifications.map(n => {
      local[n.id] = { ...(local[n.id] || {}), read: true };
      return { ...n, read: true };
    });
    try { localStorage.setItem('pulse.notifications.v1', JSON.stringify(local)); } catch (e) {}
    setNotifications(updated);
  };

  const markAsRead = (id) => {
    const local = (() => { try { return JSON.parse(localStorage.getItem('pulse.notifications.v1') || '{}'); } catch { return {}; }})();
    local[id] = { ...(local[id] || {}), read: true };
    try { localStorage.setItem('pulse.notifications.v1', JSON.stringify(local)); } catch (e) {}
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const deleteNotif = (id) => {
    const local = (() => { try { return JSON.parse(localStorage.getItem('pulse.notifications.v1') || '{}'); } catch { return {}; }})();
    local[id] = { ...(local[id] || {}), deleted: true };
    try { localStorage.setItem('pulse.notifications.v1', JSON.stringify(local)); } catch (e) {}
    setNotifications(notifications.filter(n => n.id !== id));
    if (selectedNotif?.id === id) setSelectedNotif(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const exists = prev.includes(id);
      if (exists) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  const selectAllVisible = () => {
    const ids = filteredNotifications.map(n => n.id);
    setSelectedIds(ids);
  };

  const clearSelection = () => setSelectedIds([]);

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    const localKey = 'pulse.notifications.v1';
    const local = (() => { try { return JSON.parse(localStorage.getItem(localKey) || '{}'); } catch { return {}; }})();
    selectedIds.forEach(id => {
      local[id] = { ...(local[id] || {}), deleted: true };
    });
    try { localStorage.setItem(localKey, JSON.stringify(local)); } catch (e) {}
    setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
    if (selectedNotif && selectedIds.includes(selectedNotif.id)) setSelectedNotif(null);
    setSelectedIds([]);
    setSelectingMode(false);
  };

  const handleOpenSession = (notif) => {
    if (selectingMode) {
      toggleSelect(notif.id);
      return;
    }
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

        {/* SELECTION BAR */}
        <div className="max-w-4xl mx-auto mb-4 flex items-center gap-3">
          {!selectingMode ? (
            <button onClick={() => { setSelectingMode(true); setSelectedIds([]); }} className="px-4 py-2 bg-slate-900 text-white rounded-full text-[12px] font-bold uppercase shadow-sm">Select</button>
          ) : (
            <>
              <button onClick={selectAllVisible} className="px-3 py-2 bg-blue-600 text-white rounded-full text-[12px] font-bold uppercase shadow-sm">Select All</button>
              <button onClick={clearSelection} className="px-3 py-2 bg-white text-slate-700 rounded-full text-[12px] font-bold uppercase border border-slate-200">Clear</button>
              <button onClick={deleteSelected} disabled={selectedIds.length===0} className={`px-3 py-2 rounded-full text-[12px] font-bold uppercase ${selectedIds.length===0 ? 'bg-red-100 text-red-400 border border-red-200' : 'bg-red-600 text-white shadow-sm'}`}>Delete Selected ({selectedIds.length})</button>
              <button onClick={() => { setSelectingMode(false); setSelectedIds([]); }} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-full text-[12px] font-bold uppercase">Cancel</button>
            </>
          )}
        </div>

        {/* FEED LIST */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center opacity-40">
               <BiGhost size={56} className="mb-4 text-slate-400" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No updates found</p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const dataWithMeta = { 
                ...n, 
                __meta: { showCheckbox: selectingMode, checked: selectedIds.includes(n.id), onToggleSelect: () => toggleSelect(n.id) }
              };
              return (
                <NotificationCard 
                  key={n.id} 
                  data={dataWithMeta} 
                  onClick={() => handleOpenSession(n)} 
                />
              );
            })
          )}
        </div>
      </main>

      {/* THE SESSION WINDOW (MODAL) */}
      <NotificationModal 
          data={selectedNotif} 
          onClose={() => setSelectedNotif(null)} 
          onDelete={deleteNotif}
          onAcknowledge={markAsRead}
      />
    </div>
  );
};

export default NotificationsPage;
