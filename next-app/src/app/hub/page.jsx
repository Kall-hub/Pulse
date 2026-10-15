'use client';
import { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/app/components/Sidebar';
import MaintenanceHub from '@/app/components/maintenance/maintenanceHub';
import EmailAuditLog from '@/app/components/maintenance/EmailAuditLog';
import TaskNotebook from '@/app/components/maintenance/TaskNotebook';
import InspectionForm from '@/app/components/maintenance/InspectionForm';
import FinanceInvoiceHub from '@/app/components/maintenance/FinanceInvoiceHub';
import { db, auth } from '@/app/Config/firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  BiWrench, BiDollarCircle, BiChart,
  BiEnvelope, BiBuildingHouse, BiShieldQuarter,
  BiPrinter, BiTrash
} from 'react-icons/bi';

const toLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ticketDateKey = (ticket) => {
  const rawDate = ticket.createdDate || ticket.createdAt || ticket.date;
  if (!rawDate) return '';
  if (typeof rawDate === 'string') return rawDate.slice(0, 10);
  const date = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
  return Number.isNaN(date.getTime()) ? '' : toLocalDateInput(date);
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
  const [currentUser, setCurrentUser] = useState(null);

  // Executive report defaults to this month through today.
  const today = toLocalDateInput(new Date());
  const [reportStartDate, setReportStartDate] = useState(() => toLocalDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [reportEndDate, setReportEndDate] = useState(today);

  // Load maintenance figures only for the signed-in Firebase account.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) { setCurrentUser(null); setTickets([]); setEmailLogs([]); setLoadingData(false); return; }
      try {
        setCurrentUser(user);
        setTickets([]);
        setEmailLogs([]);
        setLoadingData(true);
        const profile = await getDoc(doc(db, 'stuff', user.uid));
        const isPqa = profile.exists() && profile.data().role === 'PQA';
        const ticketQuery = isPqa ? collection(db, 'tickets') : query(collection(db, 'tickets'), where('ownerUid', '==', user.uid));
        const logQuery = isPqa ? collection(db, 'emailLogs') : query(collection(db, 'emailLogs'), where('ownerUid', '==', user.uid));
        const [ticketsSnapshot, logsSnapshot, tasksSnapshot, inspSnapshot] = await Promise.all([
          getDocs(ticketQuery),
          getDocs(logQuery),
          getDocs(collection(db, 'tasks')),
          getDocs(collection(db, 'inspections'))
        ]);
        const legacyTickets = isPqa ? ticketsSnapshot.docs.filter(item => !item.data().ownerUid) : [];
        const legacyLogs = isPqa ? logsSnapshot.docs.filter(item => !item.data().ownerUid) : [];
        await Promise.all([
          ...legacyTickets.map(item => updateDoc(doc(db, 'tickets', item.id), { ownerUid: user.uid })),
          ...legacyLogs.map(item => updateDoc(doc(db, 'emailLogs', item.id), { ownerUid: user.uid }))
        ]);
        const visibleTickets = isPqa
          ? ticketsSnapshot.docs.filter(item => !item.data().ownerUid || item.data().ownerUid === user.uid)
          : ticketsSnapshot.docs;
        const visibleLogs = isPqa
          ? logsSnapshot.docs.filter(item => !item.data().ownerUid || item.data().ownerUid === user.uid)
          : logsSnapshot.docs;
        setTickets(visibleTickets.map(ticketDoc => ({ id: ticketDoc.id, ...ticketDoc.data(), ...(isPqa && !ticketDoc.data().ownerUid ? { ownerUid: user.uid } : {}) })));
        setEmailLogs(visibleLogs.map(item => ({ id: item.id, ...item.data(), ...(isPqa && !item.data().ownerUid ? { ownerUid: user.uid } : {}) })));
        setTasks(tasksSnapshot.docs.map(item => ({ id: item.id, ...item.data() })));
        setInspections(inspSnapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      } catch (error) {
        console.error('Error fetching Firestore data:', error);
      } finally { setLoadingData(false); }
    });
    return unsubscribe;
  }, []);

  const handleAddEmailLog = async (noteText) => {
    const nowTime = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toISOString().split('T')[0];
    if (!noteText?.trim()) return;
    try {
      if (!currentUser) return;
      const log = { time: nowTime, date: nowDate, note: noteText.trim(), ownerUid: currentUser.uid };
      const ref = await addDoc(collection(db, 'emailLogs'), log);
      setEmailLogs(current => [{ id: ref.id, ...log }, ...current]);
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

  const reportRangeValid = reportStartDate && reportEndDate && reportStartDate <= reportEndDate;
  const reportTickets = useMemo(() => tickets
    .filter(ticket => {
      const dateKey = ticketDateKey(ticket);
      return reportRangeValid && dateKey >= reportStartDate && dateKey <= reportEndDate;
    })
    .sort((a, b) => ticketDateKey(a).localeCompare(ticketDateKey(b)) || String(a.displayId || '').localeCompare(String(b.displayId || ''))),
  [tickets, reportStartDate, reportEndDate, reportRangeValid]);

  const reportStats = useMemo(() => {
    const closedTickets = reportTickets.filter(ticket => String(ticket.status || '').toLowerCase() === 'closed');
    const openTickets = reportTickets.filter(ticket => String(ticket.status || '').toLowerCase() === 'open');
    const otherActiveTickets = reportTickets.filter(ticket => !['open', 'closed'].includes(String(ticket.status || '').toLowerCase()));
    const suppliers = new Map();

    reportTickets.forEach(ticket => {
      const entries = Array.isArray(ticket.suppliersList) && ticket.suppliersList.length
        ? ticket.suppliersList
        : (ticket.supplier || ticket.vendor ? [{ name: ticket.supplier || ticket.vendor, visits: 1 }] : []);
      entries.forEach(entry => {
        const name = String(entry.name || '').trim();
        if (!name) return;
        const current = suppliers.get(name) || { name, assignments: 0, visits: 0 };
        current.assignments += 1;
        current.visits += Math.max(0, Number(entry.visits) || 1);
        suppliers.set(name, current);
      });
    });

    return {
      total: reportTickets.length,
      open: openTickets.length,
      closed: closedTickets.length,
      otherActive: otherActiveTickets.length,
      closeRate: reportTickets.length ? Math.round((closedTickets.length / reportTickets.length) * 100) : 0,
      amount: reportTickets.reduce((total, ticket) => total + (Number(ticket.amount) || 0), 0),
      suppliers: [...suppliers.values()].sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name))
    };
  }, [reportTickets]);

  const handlePrintPDF = () => {
    const originalTitle = document.title;
    document.title = `Pulse-Ticket-Report-${reportStartDate}-to-${reportEndDate}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex font-sans text-slate-100">
      
      {/* Print CSS Fixes */}
      <style jsx global>{`
        @page { size: landscape; margin: 10mm; }
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
          .fixed.inset-0.z-50 > div {
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
          }
          .fixed.inset-0.z-50 > div > div.overflow-y-auto {
            overflow: visible !important;
          }
          .no-scrollbar {
            overflow: visible !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .report-ticket {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .report-ledger tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .report-ledger thead {
            display: table-header-group;
          }
          .briefing-report {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .briefing-report, .briefing-report * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
                <p className="text-xs text-slate-400 max-w-md mx-auto">Create invoice entries, track Finance processing, and print by entry date.</p>
                <FinanceInvoiceHub />
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
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Maintenance performance report</span>
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">Executive Briefing</h3>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrintPDF} 
                  disabled={!reportRangeValid}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
                >
                  <BiPrinter size={16} /> Print / Save as PDF
                </button>
                <button onClick={() => setIsPresentationOpen(false)} className="text-slate-400 hover:text-white font-bold text-xl p-2">✕</button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 bg-slate-950 p-4 md:p-8">
              <div className="mb-5 rounded-2xl border border-white/10 bg-slate-800/80 p-5 print:hidden">
                <div className="mb-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-300">Choose report dates</h4>
                  <p className="mt-1 text-xs text-slate-400">The report includes tickets created on either date, including both endpoints.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From
                    <input type="date" value={reportStartDate} max={today} onChange={event => setReportStartDate(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" />
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To
                    <input type="date" value={reportEndDate} max={today} onChange={event => setReportEndDate(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" />
                  </label>
                  <div className="text-xs font-bold text-slate-300">{reportRangeValid ? `${reportTickets.length} tickets in range` : 'End date must be on or after start date'}</div>
                </div>
              </div>

              {reportRangeValid && <article className="briefing-report mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-100 text-slate-900 shadow-2xl">
                <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-7 text-white md:p-10">
                  <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
                  <div className="relative">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">Pulse · Operations</p>
                        <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Ticket Activity Report</h1>
                        <p className="mt-2 text-sm text-blue-100">A date based summary of maintenance work and supplier activity.</p>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200">Report period</p>
                        <p className="mt-1 text-sm font-black">{new Date(`${reportStartDate}T00:00:00`).toLocaleDateString('en-ZA')} – {new Date(`${reportEndDate}T00:00:00`).toLocaleDateString('en-ZA')}</p>
                      </div>
                    </div>
                    <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-white/15 pt-4 text-[11px] text-blue-100">
                      <span>Prepared for {currentUser?.displayName || currentUser?.email || 'Signed-in user'}</span>
                      <span>Generated {new Date().toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                </header>

                <div className="space-y-7 p-5 md:p-8">
                  <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      { label: 'Tickets logged', value: reportStats.total, tone: 'from-blue-800 to-blue-950', accent: 'text-blue-200' },
                      { label: 'Open', value: reportStats.open, tone: 'from-amber-700 to-amber-950', accent: 'text-amber-200' },
                      { label: 'Closed', value: reportStats.closed, tone: 'from-emerald-700 to-emerald-950', accent: 'text-emerald-200' },
                      { label: 'Supplier visits', value: reportStats.suppliers.reduce((total, supplier) => total + supplier.visits, 0), tone: 'from-indigo-800 to-indigo-950', accent: 'text-indigo-200' }
                    ].map(card => <div key={card.label} className={`rounded-2xl bg-gradient-to-br ${card.tone} p-4 text-white shadow-lg`}>
                      <p className={`text-[9px] font-black uppercase tracking-wider ${card.accent}`}>{card.label}</p>
                      <p className="mt-2 text-3xl font-black">{card.value}</p>
                    </div>)}
                  </section>

                  <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-700">Work summary</p><h2 className="mt-1 text-base font-black text-slate-900">Period at a glance</h2></div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-800">{reportStats.closeRate}% closed</span>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {reportStats.total === 0 ? 'No maintenance tickets were logged during this reporting period.' : `You logged ${reportStats.total} ticket${reportStats.total === 1 ? '' : 's'}: ${reportStats.closed} closed, ${reportStats.open} open${reportStats.otherActive ? `, and ${reportStats.otherActive} in other active statuses` : ''}. Supplier and ticket activity for this period is detailed below.`}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                        <span className="font-bold text-slate-500">Recorded ticket amounts</span>
                        <span className="font-black text-slate-900">R {reportStats.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-700">Supplier activity</p>
                      <h2 className="mt-1 text-base font-black text-slate-900">Usage in this period</h2>
                      {reportStats.suppliers.length === 0 ? <p className="mt-4 text-xs text-slate-500">No suppliers recorded for these tickets.</p> : <div className="mt-3 divide-y divide-slate-100">
                        {reportStats.suppliers.map(supplier => <div key={supplier.name} className="flex items-center justify-between gap-3 py-2 text-xs">
                          <span className="font-bold text-slate-700">{supplier.name}</span>
                          <span className="text-right text-slate-500"><b className="text-slate-900">{supplier.visits}</b> visit{supplier.visits === 1 ? '' : 's'} · {supplier.assignments} ticket{supplier.assignments === 1 ? '' : 's'}</span>
                        </div>)}
                      </div>}
                    </div>
                  </section>

                  <section>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b-2 border-slate-900 pb-2">
                      <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-700">Detailed ledger</p><h2 className="text-lg font-black text-slate-900">Tickets worked</h2></div>
                      <p className="text-[10px] font-bold text-slate-500">{reportTickets.length} record{reportTickets.length === 1 ? '' : 's'}</p>
                    </div>
                    {reportTickets.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No tickets to show for the selected dates.</div> : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="report-ledger w-full min-w-[950px] border-collapse text-left text-[10px]">
                        <thead className="bg-slate-900 text-[9px] font-black uppercase tracking-wider text-white"><tr>
                          <th className="p-3">Date</th><th className="p-3">Property</th><th className="p-3">Ticket No.</th><th className="p-3">Status</th><th className="p-3">Faults</th><th className="p-3">Suppliers</th><th className="p-3 text-right">Invoice</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {reportTickets.map(ticket => {
                            const isClosed = String(ticket.status || '').toLowerCase() === 'closed';
                            const suppliers = Array.isArray(ticket.suppliersList) && ticket.suppliersList.length
                              ? ticket.suppliersList.map(item => `${item.name}${item.visits ? ` (${item.visits} visit${Number(item.visits) === 1 ? '' : 's'})` : ''}`).join(', ')
                              : ticket.supplier || ticket.vendor || '—';
                            const faults = (ticket.faults || []).join('; ') || ticket.description || '—';
                            const invoice = ticket.invoiceNumber || ticket.invoice || '';
                            const amount = Number(ticket.invoiceAmount ?? ticket.amount) || 0;
                            return <tr key={ticket.id} className="report-ticket align-top odd:bg-white even:bg-slate-50">
                              <td className="whitespace-nowrap p-3 font-medium">{ticketDateKey(ticket) || '—'}</td>
                              <td className="p-3 font-bold text-slate-900">{ticket.property || '—'}</td>
                              <td className="p-3 font-mono font-bold text-blue-900">{ticket.title || ticket.displayId || ticket.ticketNumber || ticket.id}</td>
                              <td className="p-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-[8px] font-black uppercase ${isClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{ticket.status || 'Open'}</span></td>
                              <td className="max-w-[240px] p-3 leading-4">{faults}</td>
                              <td className="max-w-[180px] p-3 leading-4">{suppliers}</td>
                              <td className="whitespace-nowrap p-3 text-right font-bold text-slate-900">{invoice && <span className="mr-1 text-slate-500">{invoice}</span>}{amount ? `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : invoice ? '' : '—'}</td>
                            </tr>;
                          })}
                        </tbody>
                      </table>
                    </div>}
                  </section>
                  <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4 text-[9px] font-medium text-slate-500">
                    <span>Pulse Operations · Maintenance activity record</span><span>Includes tickets logged within the selected date range</span>
                  </footer>
                </div>
              </article>}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
