"use client";
import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../Config/firebaseConfig';
import { FaTimes, FaBell, FaTools, FaBroom, FaClipboardCheck, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import PulseBotAvatar from './PulseBotAvatar';

const PulseCheckInSmart = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [userName, setUserName] = useState('User');
  const [statusData, setStatusData] = useState(null);
  const [message, setMessage] = useState('');
  const [alertType, setAlertType] = useState('status');
  const [stage, setStage] = useState('initial'); // 'initial', 'followup', 'question'
  const [pendingItem, setPendingItem] = useState(null);
  const [acknowledgedItems, setAcknowledgedItems] = useState({});
  const [dismissedItems, setDismissedItems] = useState({});

  const hideTimeoutRef = useRef(null);
  const checkInIntervalRef = useRef(null);
  const progressCheckIntervalRef = useRef(null);
  const isVisibleRef = useRef(false);
  const dismissedUntilRef = useRef(null);

  // Load dismissed timestamp on mount
  useEffect(() => {
    const stored = localStorage.getItem('pulseGlobalDismissed');
    if (stored) {
      dismissedUntilRef.current = parseInt(stored);
    }
  }, []);

  // Load acknowledged and dismissed items from localStorage
  useEffect(() => {
    const storedAck = localStorage.getItem('pulseAcknowledged');
    if (storedAck) {
      setAcknowledgedItems(JSON.parse(storedAck));
    }
    const storedDism = localStorage.getItem('pulseDismissed');
    if (storedDism) {
      setDismissedItems(JSON.parse(storedDism));
    }
  }, []);

  // Save acknowledged items to localStorage
  useEffect(() => {
    localStorage.setItem('pulseAcknowledged', JSON.stringify(acknowledgedItems));
  }, [acknowledgedItems]);

  // Save dismissed items to localStorage
  useEffect(() => {
    localStorage.setItem('pulseDismissed', JSON.stringify(dismissedItems));
  }, [dismissedItems]);

  // Sync isVisible state with ref for use in intervals
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // Fetch user name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDocs(
            collection(db, 'stuff')
          );
          userDoc.forEach(doc => {
            if (doc.id === currentUser.uid) {
              const userData = doc.data();
              const firstName = userData.firstName || 'User';
              setUserName(firstName);
            }
          });
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

      // Create a building name map
      const buildingMap = {};
      buildings.forEach(b => {
        if (b.units && Array.isArray(b.units)) {
          b.units.forEach(unit => {
            buildingMap[unit] = b.name;
          });
        }
      });

      // Categorize by status
      const pending = maintenance.filter(m => m.status !== 'completed');
      const completed = maintenance.filter(m => m.status === 'completed');
      
      const bookedCleanings = cleanings.filter(c => c.status === 'Booked');
      const completedCleanings = cleanings.filter(c => c.status === 'Completed');
      
      const pendingInspections = inspections.filter(i => i.status !== 'completed');
      const completedInspections = inspections.filter(i => i.status === 'completed');
      
      const draftInvoices = invoices.filter(i => i.status === 'Draft');
      const sentInvoices = invoices.filter(i => i.status === 'Sent');
      const paidInvoices = invoices.filter(i => i.status === 'Paid');

      return {
        maintenance,
        cleanings,
        inspections,
        invoices,
        buildings,
        buildingMap,
        stats: {
          pendingMaintenance: pending.length,
          completedMaintenance: completed.length,
          pendingCleanings: bookedCleanings.length,
          completedCleanings: completedCleanings.length,
          pendingInspections: pendingInspections.length,
          completedInspections: completedInspections.length,
          draftInvoices: draftInvoices.length,
          sentInvoices: sentInvoices.length,
          paidInvoices: paidInvoices.length
        },
        details: {
          pending,
          bookedCleanings,
          completedCleanings,
          pendingInspections,
          completedInspections,
          draftInvoices,
          sentInvoices,
          paidInvoices
        }
      };
    } catch (error) {
      console.error('Error fetching status:', error);
      return null;
    }
  };

  // Check if there's a follow-up needed
  const checkForFollowUp = async (status) => {
    const { stats } = status;
    const now = Date.now();

    // Check each category for follow-ups (acknowledged or dismissed)
    for (const [key, count] of Object.entries(stats)) {
      if (count > 0) {
        const ackData = acknowledgedItems[key];
        const dismData = dismissedItems[key];
        
        // Check acknowledged items
        if (ackData && (now - ackData.timestamp) > 3600000) { // 60 minutes
          return {
            key,
            count,
            previousCount: ackData.count,
            hasChanged: ackData.count !== count
          };
        }
        
        // Check dismissed items (also after 60 minutes)
        if (dismData && (now - dismData.timestamp) > 3600000) {
          return {
            key,
            count,
            previousCount: dismData.count,
            hasChanged: dismData.count !== count,
            wasDismissed: true
          };
        }
      }
    }

    return null;
  };

  // Check for progress (count decreased)
  const checkForProgress = async (status) => {
    const { stats } = status;

    // Check each category for progress
    for (const [key, count] of Object.entries(stats)) {
      if (count > 0) {
        const ackData = acknowledgedItems[key];
        const dismData = dismissedItems[key] || ackData; // Use either if exists
        const lastRecordedCount = ackData?.count || dismData?.count;
        
        // If count decreased by at least 1
        if (lastRecordedCount && count < lastRecordedCount) {
          return {
            key,
            count,
            previousCount: lastRecordedCount,
            reduced: lastRecordedCount - count
          };
        }
      }
    }

    return null;
  };

  // Generate initial message with real detailed data
  const generateInitialMessage = (status) => {
    const { stats, details, buildingMap } = status;
    const messages = [];

    // Show completed items for celebration
    if (stats.completedMaintenance > 0) {
      const recent = details.pending.slice(0, 2);
      const items = recent.map(m => `${m.title || 'Task'} @ ${buildingMap[m.apartment] || m.apartment}`).join(', ');
      messages.push({
        icon: <FaCheckCircle className="text-green-500" />,
        text: `✨ Great work! ${stats.completedMaintenance} maintenance task${stats.completedMaintenance !== 1 ? 's' : ''} completed. Current: ${items}`,
        key: 'completedMaintenance',
        priority: 0,
        type: 'status'
      });
    }

    if (stats.pendingMaintenance > 0) {
      const urgent = details.pending.slice(0, 1);
      const item = urgent[0];
      messages.push({
        icon: <FaTools className="text-red-400" />,
        text: `⚙️ ${stats.pendingMaintenance} maintenance pending. Priority: "${item.title || 'Maintenance'}" @ ${buildingMap[item.apartment] || item.apartment}`,
        key: 'pendingMaintenance',
        priority: 1,
        type: 'warning'
      });
    }

    if (stats.pendingInspections > 0) {
      const upcoming = details.pendingInspections.slice(0, 1);
      const item = upcoming[0];
      messages.push({
        icon: <FaClipboardCheck className="text-blue-400" />,
        text: `📋 ${stats.pendingInspections} inspection${stats.pendingInspections !== 1 ? 's' : ''} booked. Next: ${buildingMap[item.apartment] || item.apartment}${item.date ? ` on ${item.date}` : ''}`,
        key: 'pendingInspections',
        priority: 2,
        type: 'info'
      });
    }

    if (stats.completedInspections > 0) {
      messages.push({
        icon: <FaCheckCircle className="text-cyan-400" />,
        text: `✅ ${stats.completedInspections} inspection${stats.completedInspections !== 1 ? 's' : ''} conducted successfully`,
        key: 'completedInspections',
        priority: 1.5,
        type: 'status'
      });
    }

    if (stats.pendingCleanings > 0) {
      const booked = details.bookedCleanings.slice(0, 1);
      const item = booked[0];
      messages.push({
        icon: <FaBroom className="text-green-400" />,
        text: `🧹 ${stats.pendingCleanings} cleaning job${stats.pendingCleanings !== 1 ? 's' : ''} booked. Next: ${buildingMap[item.apartment] || item.apartment}${item.date ? ` on ${item.date}` : ''}`,
        key: 'pendingCleanings',
        priority: 3,
        type: 'info'
      });
    }

    if (stats.completedCleanings > 0) {
      messages.push({
        icon: <FaCheckCircle className="text-green-600" />,
        text: `✨ ${stats.completedCleanings} cleaning${stats.completedCleanings !== 1 ? 's' : ''} completed this week`,
        key: 'completedCleanings',
        priority: 3.5,
        type: 'status'
      });
    }

    if (stats.draftInvoices > 0) {
      const drafts = details.draftInvoices.slice(0, 1);
      const item = drafts[0];
      messages.push({
        icon: <FaBell className="text-purple-400" />,
        text: `💰 ${stats.draftInvoices} draft invoice${stats.draftInvoices !== 1 ? 's' : ''} waiting. Total: ${item.totalAmount ? `$${item.totalAmount}` : 'TBD'}`,
        key: 'draftInvoices',
        priority: 4,
        type: 'info'
      });
    }

    if (stats.sentInvoices > 0) {
      messages.push({
        icon: <FaCheckCircle className="text-yellow-500" />,
        text: `📤 ${stats.sentInvoices} invoice${stats.sentInvoices !== 1 ? 's' : ''} sent - awaiting payment`,
        key: 'sentInvoices',
        priority: 4.5,
        type: 'info'
      });
    }

    if (stats.paidInvoices > 0) {
      messages.push({
        icon: <FaCheckCircle className="text-emerald-500" />,
        text: `💵 ${stats.paidInvoices} invoice${stats.paidInvoices !== 1 ? 's' : ''} paid - revenue flowing!`,
        key: 'paidInvoices',
        priority: 0.5,
        type: 'status'
      });
    }

    messages.sort((a, b) => a.priority - b.priority);

    return messages.length > 0 ? messages[0] : null;
  };

  // Show check-in notification
  const showCheckIn = async () => {
    // Check if globally dismissed (user clicked X to dismiss for 45 minutes)
    if (dismissedUntilRef.current && Date.now() < dismissedUntilRef.current) {
      return;
    }

    const status = await fetchSystemStatus();
    if (!status) return;

    setStatusData(status);

    // Declare variables at function scope
    let progress = null;
    let followUp = null;
    let shouldShow = false;

    // Check for progress FIRST (highest priority)
    progress = await checkForProgress(status);
    if (progress) {
      // Show detailed progress based on category
      let progressMessage = '';
      if (progress.key === 'pendingMaintenance') {
        progressMessage = `💪 Maintenance progress! ${progress.reduced} task${progress.reduced !== 1 ? 's' : ''} completed. Only ${progress.count} remaining!`;
      } else if (progress.key === 'pendingInspections') {
        progressMessage = `✅ Inspection progress! ${progress.reduced} inspection${progress.reduced !== 1 ? 's' : ''} done. ${progress.count} left to schedule.`;
      } else if (progress.key === 'pendingCleanings') {
        progressMessage = `🧹 Cleaning crew on fire! ${progress.reduced} job${progress.reduced !== 1 ? 's' : ''} finished. ${progress.count} more booked.`;
      } else if (progress.key === 'draftInvoices') {
        progressMessage = `🎯 Invoice momentum! ${progress.reduced} issued. ${progress.count} draft${progress.count !== 1 ? 's' : ''} remaining.`;
      } else {
        progressMessage = `🚀 We're moving! ${progress.reduced} ${progress.reduced === 1 ? 'task' : 'tasks'} down. Only ${progress.count} left!`;
      }
      setMessage(progressMessage);
      setStage('progress');
      setAlertType('status');
      setPendingItem(progress.key);
      shouldShow = true;
    } else {
      // Check for follow-ups
      followUp = await checkForFollowUp(status);
      if (followUp) {
        // Show follow-up message
        const hasDifferentCount = followUp.hasChanged;
        setMessage(
          hasDifferentCount
            ? `Still ${followUp.count} pending on this. Progress?`
            : `We're still on ${followUp.count}. Everything okay?`
        );
        setStage('followup');
        setAlertType('warning');
        setPendingItem(followUp.key);
        shouldShow = true;
      } else {
        // Show initial message
        const messageData = generateInitialMessage(status);
        if (messageData) {
          setMessage(messageData.text);
          setAlertType(messageData.type);
          setPendingItem(messageData.key);
          setStage('initial');
          shouldShow = true;
        }
      }
    }

    // Only show if there's actually something to display
    if (!shouldShow) return;

    setIsVisible(true);

    // Auto-hide after appropriate delay based on what we're showing
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    let hideDelay = 10000; // Default 10 seconds
    if (progress) hideDelay = 8000; // Progress gets 8 seconds
    else if (followUp) hideDelay = 15000; // Follow-up gets 15 seconds
    
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);
  };

  // Handle acknowledgement
  const handleAttending = (item) => {
    setAcknowledgedItems(prev => ({
      ...prev,
      [item]: {
        timestamp: Date.now(),
        count: statusData.stats[item]
      }
    }));
    setStage('acknowledged');
    setMessage("Got it! I'll check back in an hour. 👍");
    
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  };

  // Handle follow-up response
  const handleFollowUpResponse = (answer) => {
    if (answer === 'yes') {
      // Issue resolved
      setMessage("Excellent! Keep up the great work! 🎉");
      setAcknowledgedItems(prev => ({
        ...prev,
        [pendingItem]: undefined
      }));
    } else {
      // Ask why
      setStage('question');
      setMessage("No worries, what's holding you up? (Optional feedback)");
    }

    setTimeout(() => {
      setIsVisible(false);
    }, 2500);
  };

  // Cancel/close
  const handleDismiss = () => {
    // Globally dismiss for 45 minutes (2700000 ms)
    const dismissUntil = Date.now() + 2700000;
    dismissedUntilRef.current = dismissUntil;
    localStorage.setItem('pulseGlobalDismissed', dismissUntil.toString());
    setIsVisible(false);
  };

  // Set up periodic check-ins
  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      showCheckIn();
    }, 3000);

    // Regular check-ins every 45 seconds
    checkInIntervalRef.current = setInterval(() => {
      if (isVisibleRef.current) return; // Don't interrupt if notification is already showing
      showCheckIn();
    }, 45000);

    // Fast progress detection every 8 seconds (so progress appears immediately)
    progressCheckIntervalRef.current = setInterval(async () => {
      if (isVisibleRef.current) return; // Don't show while already visible
      
      const status = await fetchSystemStatus();
      if (!status) return;

      const progress = await checkForProgress(status);
      if (progress) {
        // Trigger the notification immediately
        setStatusData(status);
        const messages = [
          `We're moving! ${progress.reduced} ${progress.reduced === 1 ? 'task' : 'tasks'} down! 🎉`,
          `Awesome! Down to ${progress.count} now. Keep it up! 💪`,
          `Progress! That's ${progress.reduced} resolved. Let's go! 🚀`,
          `Great work! ${progress.count} left to tackle.`
        ];
        setMessage(messages[Math.floor(Math.random() * messages.length)]);
        setStage('progress');
        setAlertType('status');
        setPendingItem(progress.key);
        setIsVisible(true);

        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 8000);
      }
    }, 8000);

    return () => {
      clearTimeout(initialTimeout);
      if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
      if (progressCheckIntervalRef.current) clearInterval(progressCheckIntervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-8 right-8 z-[8888] max-w-sm animate-in slide-in-from-top-4 fade-in">
      <div className={`bg-gradient-to-r ${
        alertType === 'warning' ? 'from-red-900/40 to-red-800/40 border-red-600/30' :
        alertType === 'info' ? 'from-blue-900/40 to-blue-800/40 border-blue-600/30' :
        stage === 'progress' ? 'from-green-900/40 to-emerald-800/40 border-green-600/30' :
        'from-slate-900/40 to-slate-800/40 border-slate-600/30'
      } backdrop-blur-2xl rounded-[1.5rem] p-6 border shadow-2xl`}>
        
        {/* CLOSE BUTTON */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <FaTimes size={16} />
        </button>

        {/* HEADER WITH BOT AVATAR */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-600/30 rounded-full flex items-center justify-center border border-blue-500/30">
            <PulseBotAvatar size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Pulse Check-in</p>
            <p className="text-xs font-black text-white italic">Hey {userName.split(' ')[0]} 👋</p>
          </div>
        </div>

        {/* MESSAGE */}
        <div className="mb-4">
          <p className="text-sm font-bold text-white leading-relaxed">
            {message}
          </p>
        </div>

        {/* ACTION BUTTONS */}
        {stage === 'initial' && (
          <div className="flex gap-3">
            <button
              onClick={() => handleAttending(pendingItem)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors"
            >
              ✓ Attending
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {stage === 'followup' && (
          <div className="flex gap-3">
            <button
              onClick={() => handleFollowUpResponse('yes')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors"
            >
              Yes ✓
            </button>
            <button
              onClick={() => handleFollowUpResponse('no')}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors"
            >
              Still Working
            </button>
          </div>
        )}

        {stage === 'progress' && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setMessage("Keep crushing it! 💪");
                setTimeout(() => setIsVisible(false), 1500);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors"
            >
              Awesome!
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors"
            >
              Thanks
            </button>
          </div>
        )}

        {/* PROGRESS BAR */}
        <div className="mt-4 h-1 bg-slate-700/20 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              alertType === 'warning' ? 'bg-red-500' :
              alertType === 'info' ? 'bg-blue-500' :
              stage === 'progress' ? 'bg-green-500' :
              'bg-slate-500'
            }`}
            style={{
              animation: stage === 'followup' 
                ? 'shrinkWidth 15s ease-in-out forwards'
                : stage === 'progress'
                ? 'shrinkWidth 8s ease-in-out forwards'
                : 'shrinkWidth 10s ease-in-out forwards'
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

export default PulseCheckInSmart;
