'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import MaintenanceHub from '@/app/components/maintenance/maintenanceHub';
import EmailAuditLog from '@/app/components/maintenance/EmailAuditLog';
import TaskNotebook from '@/app/components/maintenance/TaskNotebook';
import InspectionForm from '@/app/components/maintenance/InspectionForm';
import { db } from '@/app/Config/firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  BiWrench, BiDollarCircle, BiChart, 
  BiEnvelope, BiBuildingHouse, BiShieldQuarter, 
  BiTrendingUp, BiTrendingDown, BiPrinter, BiStore, BiTrash 
} from 'react-icons/bi';

// Helper: Given any date string, find that week's Monday and Friday
const getMondayAndFriday = (dateInput) => {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  return { monday, friday };
};

export default function OperationsHubPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState('overview');
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  // Firestore Data States
  const [emailLogs, setEmailLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Comparative Week States (Default: Current week vs Last week)
  const today = new Date().toISOString().split('T')[0];
  const [primaryMonday, setPrimaryMonday] = useState(today);
  const [compareMonday, setCompareMonday] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });

  // Fetch data from Firestore on mount
  useEffect(() => {
    async function fetchHubData() {
      try {
        setLoadingData(true);
        const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
        const ticketsData = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTickets(ticketsData);

        const logsSnapshot = await getDocs(collection(db, 'emailLogs'));
        const logsData = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEmailLogs(logsData);

        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        const tasksData = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTasks(tasksData);

        const inspSnapshot = await getDocs(collection(db, 'inspections'));
        const inspData = inspSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInspections(inspData);
      } catch (error) {
        console.error("Error fetching Firestore data:", error);
      } finally {
        setLoadingData(false);
      }
    }
    fetchHubData();
  }, []);

  const handleAddEmailLog = async (noteText) => {
    const nowTime = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toISOString().split('T')[0];
    if (!noteText?.trim()) return;
    try {
      const ref = await addDoc(collection(db, 'emailLogs'), { time: nowTime, date: nowDate, note: noteText.trim() });
      setEmailLogs(current => [{ id: ref.id, time: nowTime, date: nowDate, note: noteText.trim() }, ...current]);
    }
    catch (error) { console.error('Failed to save email log:', error); }
  };

  const handleAddTask = async (newTaskData) => {
    try {
      const task = { ...newTaskData, completed: false, timestamp: null };
      const ref = await addDoc(collection(db, 'tasks'), task);
      setTasks(current => [{ id: ref.id, ...task }, ...current]);
    }
    catch (error) { console.error('Failed to save task:', error); }
  };

  const toggleTaskCompletion = async (id) => {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    const now = new Date().toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
    try {
      const completed = !task.completed;
      await updateDoc(doc(db, 'tasks', id), { completed, timestamp: completed ? now : null });
      setTasks(current => current.map(item => item.id === id ? { ...item, completed, timestamp: completed ? now : null } : item));
    }
    catch (error) { console.error('Failed to update task:', error); }
  };

  const handleAddInspection = async (newInsp) => {
    const { id: displayId, ...inspection } = newInsp;
    try {
      const ref = await addDoc(collection(db, 'inspections'), { ...inspection, displayId });
      setInspections(current => [{ id: ref.id, ...inspection, displayId }, ...current]);
    }
    catch (error) { console.error('Failed to save inspection:', error); }
  };

  // --- Safe Deletion Handler with Firestore Sync ---
  const handleDeleteItem = async (collectionName, id, setStateFn, currentList) => {
    if (!window.confirm(`Are you sure you want to delete this item from ${collectionName}?`)) return;
    
    try {
      await deleteDoc(doc(db, collectionName, id));
      setStateFn(current => current.filter(item => item.id !== id));
    } catch (error) {
      console.error(`Error deleting from ${collectionName}:`, error);
      alert('Failed to delete item. Please check console.');
    }
  };

  // --- Day-by-Day Breakdown Calculations (Mon - Fri) ---
  const pWindow = getMondayAndFriday(primaryMonday);
  const cWindow = getMondayAndFriday(compareMonday);

  const filterByRange = (items, start, end) => {
    return items.filter(item => {
      const rawDate = item.date || item.createdDate || item.createdAt || (item.timestamp ? item.timestamp.split(' ')[0] : null);
      const itemDateStr = rawDate?.toDate ? rawDate.toDate() : rawDate;
      if (!itemDateStr) return false;
      const d = new Date(itemDateStr);
      return d >= start && d <= end;
    });
  };

  const primaryWeekTickets = filterByRange(tickets, pWindow.monday, pWindow.friday);
  const compareWeekTickets = filterByRange(tickets, cWindow.monday, cWindow.friday);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const dailyComparisonData = daysOfWeek.map((dayName, index) => {
    const targetDayDate = new Date(pWindow.monday);
    targetDayDate.setDate(targetDayDate.getDate() + index);
    const targetDateStr = targetDayDate.toISOString().split('T')[0];

    const compareDayDate = new Date(cWindow.monday);
    compareDayDate.setDate(compareDayDate.getDate() + index);
    const compareDateStr = compareDayDate.toISOString().split('T')[0];

    const targetDayTickets = tickets.filter(t => {
      const dStr = t.date || t.createdDate || t.createdAt || (t.timestamp ? t.timestamp.split(' ')[0] : null);
      return dStr === targetDateStr;
    });

    const compareDayTickets = tickets.filter(t => {
      const dStr = t.date || t.createdDate || t.createdAt || (t.timestamp ? t.timestamp.split(' ')[0] : null);
      return dStr === compareDateStr;
    });

    const effectiveTargetTickets = targetDayTickets;
    const effectiveCompareTickets = compareDayTickets;

    const targetCount = effectiveTargetTickets.length;
    const compareCount = effectiveCompareTickets.length;

    const targetInvoices = effectiveTargetTickets.reduce((acc, t) => acc + (Number(t.invoiceAmount ?? t.amount) || 0), 0);
    const compareInvoices = effectiveCompareTickets.reduce((acc, t) => acc + (Number(t.invoiceAmount ?? t.amount) || 0), 0);

    return { day: dayName, targetCount, compareCount, targetInvoices, compareInvoices };
  });

  // Overall Totals for Stats
  const primaryCount = dailyComparisonData.reduce((acc, d) => acc + d.targetCount, 0);
  const compareCount = dailyComparisonData.reduce((acc, d) => acc + d.compareCount, 0);
  const primaryInvoiceTotal = dailyComparisonData.reduce((acc, d) => acc + d.targetInvoices, 0);
  const compareInvoiceTotal = dailyComparisonData.reduce((acc, d) => acc + d.compareInvoices, 0);

  const growthPercent = compareCount === 0 ? 100 : Math.round(((primaryCount - compareCount) / compareCount) * 100);
  const isGrowthPositive = growthPercent >= 0;

  // --- Supplier Day-by-Day Mapping (Mon-Fri) ---
  const targetSuppliersByDay = daysOfWeek.map((dayName, index) => {
    const targetDayDate = new Date(pWindow.monday);
    targetDayDate.setDate(targetDayDate.getDate() + index);
    const targetDateStr = targetDayDate.toISOString().split('T')[0];

    const dayTickets = primaryWeekTickets.filter(t => {
      const dStr = t.date || t.createdAt || (t.timestamp ? t.timestamp.split(' ')[0] : null);
      return dStr === targetDateStr;
    });

    const suppliers = dayTickets.flatMap(t => Array.isArray(t.suppliersList) ? t.suppliersList.map(s => s.name) : [t.supplier || t.vendor]);
    const builderCount = suppliers.filter(name => name === 'Builder').length;
    const plumblinkCount = suppliers.filter(name => name === 'Plumblink').length;
    const chamberlainsCount = suppliers.filter(name => name === 'Chamberlains').length;

    return { day: dayName, Builder: builderCount, Plumblink: plumblinkCount, Chamberlains: chamberlainsCount };
  });

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex font-sans text-slate-100">
      
      {/* Print CSS Fixes */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #0f172a !important;
            color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          main, aside, nav, .print\\:hidden {
            display: none !important;
          }
          .fixed.inset-0.z-50 {
            position: absolute !important;
            inset: auto !important;
            background: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            max-height: none !important;
            width: 100% !important;
          }
          .no-scrollbar {
            overflow: visible !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'} p-6 md:p-10`}>
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/65 p-6 rounded-3xl border border-white/5 backdrop-blur-md shadow-xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Pulse Operations & Firestore Live Hub</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">Operations & Daily Log</h1>
              <p className="text-xs text-slate-400 mt-1">Multi-sweep email audit trail, ticket tracking, and verified daily productivity.</p>
            </div>

            <button 
              onClick={() => setIsPresentationOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/35 transition-all flex items-center gap-2.5 active:scale-95"
            >
              <BiChart size={18} /> 🚀 Executive Briefing & Stats
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveMainTab('overview')} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeMainTab === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-white border border-white/5'}`}>
              <BiEnvelope size={16} /> Smart Overview & Email Logs
            </button>
            <button onClick={() => setActiveMainTab('maintenance')} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeMainTab === 'maintenance' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-white border border-white/5'}`}>
              <BiWrench size={16} /> Maintenance & Ticket Hub
            </button>
            <button onClick={() => setActiveMainTab('inspections')} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeMainTab === 'inspections' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-white border border-white/5'}`}>
              <BiShieldQuarter size={16} /> Viewings & Inspections
            </button>
            <button onClick={() => setActiveMainTab('finance')} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeMainTab === 'finance' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-white border border-white/5'}`}>
              <BiDollarCircle size={16} /> Finance & Invoices
            </button>
          </div>

          {/* Tab Content */}
          <div className="transition-all duration-300">
            {activeMainTab === 'overview' && (
              <div className="space-y-6">
                {/* Email Logs with Delete Button Option */}
                <div className="bg-slate-800/40 border border-white/5 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Email Audit Logs</h3>
                    <span className="text-xs text-slate-400">{emailLogs.length} logged entries</span>
                  </div>
                  <div className="space-y-2">
                    {emailLogs.map((log) => (
                      <div key={log.id} className="flex justify-between items-center bg-slate-900/60 p-3.5 rounded-2xl border border-white/5">
                        <div>
                          <p className="text-xs text-white font-medium">{log.note}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{log.date} at {log.time}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteItem('emailLogs', log.id, setEmailLogs, emailLogs)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all"
                          title="Delete Email Log"
                        >
                          <BiTrash size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <EmailAuditLog emailLogs={emailLogs} onAddLog={handleAddEmailLog} />
                
                {/* Task Notebook with Delete Button Option */}
                <div className="bg-slate-800/40 border border-white/5 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Tasks Ledger</h3>
                    <span className="text-xs text-slate-400">{tasks.length} total tasks</span>
                  </div>
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex justify-between items-center bg-slate-900/60 p-3.5 rounded-2xl border border-white/5">
                        <div>
                          <p className={`text-xs font-medium ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>{task.text}</p>
                          <span className="text-[10px] text-blue-400 font-mono">{task.property} • {task.issue || 'General'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleTaskCompletion(task.id)} 
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold ${task.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}
                          >
                            {task.completed ? 'Completed' : 'Mark Done'}
                          </button>
                          <button 
                            onClick={() => handleDeleteItem('tasks', task.id, setTasks, tasks)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all"
                            title="Delete Task"
                          >
                            <BiTrash size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <TaskNotebook tasks={tasks} onAddTask={handleAddTask} onToggleTask={toggleTaskCompletion} />
              </div>
            )}

            {activeMainTab === 'maintenance' && <MaintenanceHub />}

            {activeMainTab === 'inspections' && (
              <div className="space-y-6">
                <InspectionForm onAddInspection={handleAddInspection} />
                <div className="bg-slate-800/40 border border-white/5 p-6 rounded-3xl space-y-6 shadow-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-white">Recorded Viewings & Inspections Ledger</h3>
                      <p className="text-xs text-slate-400">Verifiable proof of daily operational workload and property management diligence.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inspections.map((item, idx) => (
                      <div key={item.id || idx} className="bg-slate-900/70 border border-white/5 p-5 rounded-2xl space-y-3 shadow-md relative group">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">{item.displayId || item.id}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-emerald-400">{item.status}</span>
                            <button 
                              onClick={() => handleDeleteItem('inspections', item.id, setInspections, inspections)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
                              title="Delete Inspection Record"
                            >
                              <BiTrash size={14} />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-xs font-black text-white uppercase">{item.type}</h4>
                        <p className="text-xs text-slate-300 flex items-center gap-1.5"><BiBuildingHouse className="text-slate-400"/> {item.property}</p>
                        <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[11px] text-slate-400 font-mono">
                          <span>Date: {item.date}</span>
                          <span className="text-emerald-300 font-bold">{item.proof}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeMainTab === 'finance' && (
              <div className="bg-slate-800/40 border border-white/5 p-12 rounded-3xl text-center space-y-4">
                <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">💰</div>
                <h3 className="text-sm font-black uppercase tracking-wider">Finance & Invoicing</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">Maintenance ticket invoice totals are drawn from saved Firestore tickets.</p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Executive Presentation Modal */}
      {isPresentationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col my-8 max-h-[92vh]">
            
            <div className="p-6 md:p-8 border-b border-white/10 bg-slate-800/50 flex justify-between items-center print:hidden flex-shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Executive Briefing & Performance View</span>
                <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-white">Pulse Operations Intelligence Deck</h3>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrintPDF} 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
                >
                  <BiPrinter size={16} /> Print / Export PDF
                </button>
                <button onClick={() => setIsPresentationOpen(false)} className="text-slate-400 hover:text-white font-bold text-xl p-2">✕</button>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8 overflow-y-auto flex-1">
              {/* Week Range Picker Controls */}
              <div className="bg-slate-800/60 p-6 rounded-3xl border border-white/5 space-y-4 print:hidden shadow-inner">
                <h4 className="text-xs font-black uppercase text-blue-400 tracking-wider">🗓 Select Comparative Week Ranges (Mon - Fri Auto-Lock)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Target Week (Pick any Monday):</label>
                    <input 
                      type="date" 
                      value={primaryMonday} 
                      onChange={(e) => setPrimaryMonday(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Range: {pWindow.monday.toLocaleDateString()} to {pWindow.friday.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Comparison Week (Pick any Monday):</label>
                    <input 
                      type="date" 
                      value={compareMonday} 
                      onChange={(e) => setCompareMonday(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Range: {cWindow.monday.toLocaleDateString()} to {cWindow.friday.toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
