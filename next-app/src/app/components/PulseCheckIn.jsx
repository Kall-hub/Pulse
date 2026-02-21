"use client";
import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../Config/firebaseConfig';
import { FaRobot, FaTimes, FaBell, FaTools, FaBroom, FaClipboardCheck } from 'react-icons/fa';

const PulseCheckIn = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [userName, setUserName] = useState('User');
  const [statusData, setStatusData] = useState(null);
  const [message, setMessage] = useState('');
  const [alertType, setAlertType] = useState('status'); // 'status', 'warning', 'info'
  const hideTimeoutRef = useRef(null);
  const checkInIntervalRef = useRef(null);
  const dismissedUntilRef = useRef(null);

  // Load dismissed timestamp on mount
  useEffect(() => {
    const stored = localStorage.getItem('pulseCheckInDismissed');
    if (stored) {
      dismissedUntilRef.current = parseInt(stored);
    }
  }, []);

  // Fetch user name on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Try to get user data from "stuff" collection (your user collection)
          const userDoc = await getDocs(
            query(collection(db, 'stuff'), where('__name__', '==', currentUser.uid))
          );
          if (userDoc.docs.length > 0) {
            const userData = userDoc.docs[0].data();
            const firstName = userData.firstName || 'User';
            setUserName(firstName);
          }
        } catch (error) {
          console.error('Error fetching user name:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch system status
  const fetchSystemStatus = async () => {
    try {
      const [maintenanceSnap, cleaningsSnap, inspectionsSnap, invoicesSnap] = await Promise.all([
        getDocs(collection(db, 'maintenance')),
        getDocs(collection(db, 'cleanings')),
        getDocs(collection(db, 'inspections')),
        getDocs(collection(db, 'invoices'))
      ]);

      const maintenance = maintenanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const cleanings = cleaningsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const inspections = inspectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return {
        maintenance,
        cleanings,
        inspections,
        invoices,
        stats: {
          pendingMaintenance: maintenance.filter(m => m.status !== 'completed').length,
          pendingCleanings: cleanings.filter(c => c.status === 'Booked').length,
          pendingInspections: inspections.filter(i => i.status !== 'completed').length,
          draftInvoices: invoices.filter(i => i.status === 'Draft').length
        }
      };
    } catch (error) {
      console.error('Error fetching status:', error);
      return null;
    }
  };

  // Generate contextual message based on status
  const generateMessage = (status) => {
    if (!status) return null;

    const { stats } = status;
    const messages = [];

    if (stats.pendingMaintenance > 0) {
      messages.push({
        icon: <FaTools className="text-red-400" />,
        text: `${stats.pendingMaintenance} maintenance ${stats.pendingMaintenance === 1 ? 'task' : 'tasks'} pending`,
        priority: 1,
        type: 'warning'
      });
    }

    if (stats.pendingCleanings > 0) {
      messages.push({
        icon: <FaBroom className="text-green-400" />,
        text: `${stats.pendingCleanings} cleaning ${stats.pendingCleanings === 1 ? 'job' : 'jobs'} scheduled`,
        priority: 2,
        type: 'info'
      });
    }

    if (stats.pendingInspections > 0) {
      messages.push({
        icon: <FaClipboardCheck className="text-blue-400" />,
        text: `${stats.pendingInspections} inspection${stats.pendingInspections === 1 ? '' : 's'} booked`,
        priority: 3,
        type: 'info'
      });
    }

    if (stats.draftInvoices > 0) {
      messages.push({
        icon: <FaBell className="text-purple-400" />,
        text: `${stats.draftInvoices} draft invoice${stats.draftInvoices === 1 ? '' : 's'} waiting`,
        priority: 4,
        type: 'info'
      });
    }

    // Sort by priority (lowest number = highest priority)
    messages.sort((a, b) => a.priority - b.priority);
    
    // Return top message (highest priority)
    return messages.length > 0 ? messages[0] : {
      icon: <FaRobot className="text-blue-400" />,
      text: 'All systems operational. Everything looks good!',
      priority: 5,
      type: 'status'
    };
  };

  // Show check-in notification
  const showCheckIn = async () => {
    // Check if dismissed recently (within 45 minutes)
    if (dismissedUntilRef.current && Date.now() < dismissedUntilRef.current) {
      return;
    }

    const status = await fetchSystemStatus();
    setStatusData(status);

    const messageData = generateMessage(status);
    if (messageData) {
      setMessage(messageData.text);
      setAlertType(messageData.type);
      setIsVisible(true);

      // Auto-hide after 10 seconds
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 150000);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    // Don't show for 45 minutes (2700000 ms)
    const dismissUntil = Date.now() + 2700000;
    dismissedUntilRef.current = dismissUntil;
    localStorage.setItem('pulseCheckInDismissed', dismissUntil.toString());
    setIsVisible(false);
  };

  // Set up periodic check-ins
  useEffect(() => {
    // First check-in after 15 minutes
    const initialTimeout = setTimeout(() => {
      showCheckIn();
    }, 900000);

    // Then check every 45 seconds
    checkInIntervalRef.current = setInterval(() => {
      showCheckIn();
    }, 45000);

    return () => {
      clearTimeout(initialTimeout);
      if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  if (!isVisible) return null;

  const bgColor = {
    warning: 'from-red-900/40 to-red-800/40 border-red-600/30',
    info: 'from-blue-900/40 to-blue-800/40 border-blue-600/30',
    status: 'from-slate-900/40 to-slate-800/40 border-slate-600/30'
  }[alertType];

  const icon = message.includes('maintenance') ? <FaTools /> :
               message.includes('cleaning') ? <FaBroom /> :
               message.includes('inspection') ? <FaClipboardCheck /> :
               message.includes('invoice') ? <FaBell /> :
               <FaRobot />;

  return (
    <div className="fixed top-8 right-8 z-[8888] max-w-sm animate-in slide-in-from-top-4 fade-in">
      <div className={`bg-gradient-to-r ${bgColor} backdrop-blur-2xl rounded-[1.5rem] p-6 border shadow-2xl`}>
        
        {/* CLOSE BUTTON */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          title="Dismiss for 45 minutes"
        >
          <FaTimes size={16} />
        </button>

        {/* HEADER WITH GREETING */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600/30 rounded-full flex items-center justify-center border border-blue-500/30 animate-pulse">
            <FaRobot className="text-blue-400" size={14} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Pulse Check-in</p>
            <p className="text-xs font-black text-white italic">Hello, {userName.split(' ')[0]} 👋</p>
          </div>
        </div>

        {/* STATUS MESSAGE */}
        <div className="flex items-start gap-2 mt-4">
          <div className="mt-1">
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-relaxed">
              {message}
            </p>
            <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-2 italic">
              {alertType === 'warning' ? '⚠️ Requires attention' : '✨ Keeping you informed'}
            </p>
          </div>
        </div>

        {/* VISUAL INDICATOR BAR */}
        <div className="mt-4 h-1 bg-slate-700/20 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full animate-pulse ${
              alertType === 'warning' ? 'bg-red-500' :
              alertType === 'info' ? 'bg-blue-500' :
              'bg-slate-500'
            }`}
            style={{
              animation: 'shrinkWidth 10s ease-in-out forwards'
            }}
          ></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default PulseCheckIn;
