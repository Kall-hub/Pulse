"use client";
import { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import MaintenanceForm from '@/app/components/MaintenanceForm'; // The Smart Component
import { 
  FaHammer, FaCheck, FaTimes, FaPen, FaPlus, FaTools, 
  FaBuilding, FaCalendarCheck, FaGhost, FaClock, FaSearch, 
  FaMapMarkerAlt, FaCamera, FaCheckCircle, FaChevronRight, FaBars,
  FaFileSignature, FaFingerprint, FaExclamationCircle
} from "react-icons/fa";

/* --- MOCK DATA --- */
const INITIAL_TICKETS = [
  // 1. REQUESTS (Raw Complaints)
  { 
    id: 'REQ-101', unit: 'HILLCREST VIEW 23', status: 'request', 
    issue: 'Bathroom: Shower handle broken | Kitchen: Bulb blown', // Combined string for display
    rawFaults: [ // The raw data structure
      { id: 1, area: 'Bathroom', description: 'Shower handle broken' },
      { id: 2, area: 'Kitchen', description: 'Bulb blown' }
    ],
    loggedAt: '2026-01-18 09:30', areas: ['Bathroom', 'Kitchen'] 
  },
  { 
    id: 'REQ-102', unit: 'DUNCAN COURT 505', status: 'request', 
    issue: 'Lounge: Wifi router beeping loudly', 
    rawFaults: [
       { id: 1, area: 'Lounge', description: 'Wifi router beeping loudly' }
    ],
    loggedAt: '2026-01-18 10:15', areas: ['Lounge'] 
  },

  // 2. ACTIVE MISSIONS (Job Cards)
  {
    id: "JC-9921", unit: "HILLCREST VIEW 28", status: 'active',
    contractor: "Lindiwe", priority: "High", issueDate: "2026-01-16",
    tasks: [
      { id: 1, desc: "Kitchen sink loose / leaking", area: "Kitchen", done: false },
      { id: 2, desc: "Extractor fan dirty & noisy", area: "Bathroom", done: true }
    ]
  },

  // 3. HISTORY (Completed)
  {
    id: "JC-8800", unit: "SOUTH POINT 101", status: 'completed',
    contractor: "Johannes", priority: "Low", issueDate: "2026-01-10", completedAt: "2026-01-12 14:30",
    tasks: [
        { id: 1, desc: "Repaint bedroom wall (Dulux White)", area: "Bedroom", done: true },
        { id: 2, desc: "Replace door stopper", area: "Bedroom", done: true }
    ]
  }
];

const MaintenancePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  
  // MODAL STATES
  const [viewingReport, setViewingReport] = useState(null); 
  const [isLogModalOpen, setIsLogModalOpen] = useState(false); 

  // --- ACTIONS ---

  // 1. ADD NEW REQUEST (Received from Child Component)
  const addRequest = (data) => {
    // Combine faults into a summary string for the list view
    const summaryIssue = data.faults.map(f => `${f.area}: ${f.description}`).join(' | ');
    const uniqueAreas = [...new Set(data.faults.map(f => f.area))];

    const newTicket = {
      id: `REQ-${Math.floor(Math.random() * 900) + 100}`, 
      unit: data.unit,
      status: 'request',
      issue: summaryIssue,
      rawFaults: data.faults, // Store the array so we can convert to tasks later
      loggedAt: new Date().toLocaleString(),
      areas: uniqueAreas
    };

    setTickets([newTicket, ...tickets]); 
    setIsLogModalOpen(false); 
    setActiveTab('requests'); 
  };

  // 2. PROMOTE TO JOB CARD (Smart Conversion)
  const promoteToJobCard = (ticketId) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        // Convert the Request's "rawFaults" into Job Card "Tasks"
        const jobTasks = t.rawFaults ? t.rawFaults.map((f, index) => ({
            id: index + 1,
            desc: f.description,
            area: f.area,
            done: false
        })) : [{ id: 1, desc: t.issue, area: t.areas[0] || 'General', done: false }];

        return { 
          ...t, 
          id: `JC-${Math.floor(Math.random() * 9000) + 1000}`, 
          status: 'active', 
          contractor: 'Unassigned', // In a real app, you'd select this
          priority: 'Medium',
          issueDate: new Date().toISOString().split('T')[0],
          tasks: jobTasks // The cart items become checklists!
        };
      }
      return t;
    }));
    setActiveTab('active'); 
  };

  // 3. CHECKLIST TOGGLE
  const toggleTask = (jobId, taskId) => {
    setTickets(prev => prev.map(t => {
      if (t.id === jobId) {
        return { ...t, tasks: t.tasks.map(task => task.id === taskId ? { ...task, done: !task.done } : task) };
      }
      return t;
    }));
  };

  // 4. FINALIZE JOB
  const finalizeJob = (jobId) => {
    // Check if all tasks are done? (Optional rule)
    if(confirm("Mark this job card as complete and archive it?")) {
      const timestamp = new Date().toLocaleString();
      setTickets(prev => prev.map(t => t.id === jobId ? { ...t, status: 'completed', completedAt: timestamp } : t));
    }
  };

  // --- FILTERING ---
  const filteredTickets = tickets.filter(t => {
    if (t.status !== activeTab) return false;
    const query = searchQuery.toLowerCase();
    if (activeTab === 'requests') return t.unit.toLowerCase().includes(query);
    return t.id.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8`}>
        
        {/* HEADER & TABS */}
        <header className="mb-8">
           <div className="flex justify-between items-end mb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsOpen(true)} className="md:hidden bg-white p-3 rounded-xl shadow-sm text-slate-600 border border-slate-200"><FaBars /></button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none">Maintenance Hub</h1>
                  <p className="text-slate-400 font-bold mt-1 tracking-widest text-[9px] uppercase italic"> Lifecycle Management</p>
                </div>
              </div>
              
              {/* OPEN ADD MODAL BUTTON */}
              <button 
                onClick={() => setIsLogModalOpen(true)}
                className="hidden md:flex bg-slate-900 text-white py-3 px-6 rounded-xl shadow-xl items-center space-x-2 active:scale-95 border-b-4 border-blue-600 transition-all hover:bg-slate-800"
              >
                <FaPlus size={12} /> <span className="text-[10px] font-black uppercase tracking-widest">Log Request</span>
              </button>
           </div>

           {/* CONTROLS (TABS & SEARCH) */}
           <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-[1.5rem] shadow-sm border border-slate-200">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                 {['requests', 'active', 'completed'].map(tab => (
                    <button key={tab} onClick={() => { setActiveTab(tab); setSearchQuery(''); }} className={`flex-1 md:flex-none px-6 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                      {tab === 'requests' ? 'New Requests' : tab === 'active' ? 'Active Jobs' : 'History'}
                    </button>
                 ))}
              </div>
              <div className="relative w-full md:w-96 group">
                 <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                 <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={activeTab === 'requests' ? "Search by UNIT..." : "Search by JOB ID..."} className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500/20 pl-10 pr-4 py-3 rounded-xl text-xs font-bold uppercase outline-none transition-all" />
              </div>
           </div>
        </header>

        {/* CONTENT */}
        <div className="max-w-5xl mx-auto space-y-6">
           {filteredTickets.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[40vh] text-slate-300">
                  <FaGhost size={50} className="mb-4 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest">No records found</p>
              </div>
           )}

           {/* 1. REQUESTS VIEW */}
           {activeTab === 'requests' && filteredTickets.map(ticket => (
              <div key={ticket.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group hover:border-blue-300 transition-all shadow-sm">
                 <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center shrink-0"><FaExclamationCircle /></div>
                    <div>
                       <h3 className="text-lg font-black uppercase italic text-slate-900">{ticket.unit}</h3>
                       <div className="flex flex-wrap gap-2 mt-1">
                          {ticket.areas.map(a => <span key={a} className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{a}</span>)}
                          <span className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-1"><FaClock size={8}/> {ticket.loggedAt}</span>
                       </div>
                       <p className="mt-3 text-sm font-medium text-slate-600 italic">"{ticket.issue}"</p>
                    </div>
                 </div>
                 <button onClick={() => promoteToJobCard(ticket.id)} className="w-full md:w-auto bg-slate-900 text-white px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg">Approve & Assign</button>
              </div>
           ))}

           {/* 2. ACTIVE JOBS VIEW */}
           {activeTab === 'active' && filteredTickets.map(job => (
              <div key={job.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">{job.id}</span>
                    <span className="hidden md:inline text-[10px] font-bold text-slate-400 uppercase">Issued: {job.issueDate}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${job.priority === 'High' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-2 leading-none">{job.unit}</h2>
                      <div className="space-y-3 mt-6">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Task Checklist</p>
                        {job.tasks.map(task => (
                           <button key={task.id} onClick={() => toggleTask(job.id, task.id)} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${task.done ? 'bg-green-50 border-green-200 opacity-60' : 'bg-slate-50 border-transparent hover:border-blue-500'}`}>
                              <div className="flex items-center space-x-4">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${task.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{task.done && <FaCheckCircle size={14} />}</div>
                                <div className="text-left">
                                   <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{task.area}</p>
                                   <p className={`text-xs font-bold uppercase ${task.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.desc}</p>
                                </div>
                              </div>
                           </button>
                        ))}
                      </div>
                   </div>
                   <div className="bg-slate-50 rounded-[2rem] p-6 flex flex-col justify-between border border-slate-100">
                      <div>
                         <div className="flex items-center space-x-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white"><FaTools size={20} /></div>
                            <div>
                               <p className="text-[8px] font-black text-slate-400 uppercase">Assigned Tech</p>
                               <p className="text-sm font-black text-slate-900 uppercase italic">{job.contractor}</p>
                            </div>
                         </div>
                         <button className="w-full bg-white border border-slate-200 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center space-x-3 text-slate-700 hover:bg-blue-600 hover:text-white transition-all"><FaCamera /> <span>Add Proof Photo</span></button>
                      </div>
                      <div className="pt-6 border-t border-slate-200 mt-6">
                         <button onClick={() => finalizeJob(job.id)} className="w-full bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-green-200 active:scale-95 transition-all">Finalize Job Card</button>
                      </div>
                   </div>
                </div>
              </div>
           ))}

           {/* 3. HISTORY VIEW */}
           {activeTab === 'completed' && filteredTickets.map(job => (
              <div key={job.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 flex justify-between items-center group hover:shadow-md transition-all">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-2xl"><FaFileSignature /></div>
                    <div>
                       <h3 className="text-lg font-black uppercase italic text-slate-900">{job.unit}</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <span>Ref: {job.id}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span>{job.completedAt}</span>
                       </p>
                    </div>
                 </div>
                 <button onClick={() => setViewingReport(job)} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-colors">View Report</button>
              </div>
           ))}
        </div>
      </main>

      {/* --- ADD REQUEST MODAL (IMPORTED COMPONENT) --- */}
      <MaintenanceForm 
        isOpen={isLogModalOpen} 
        onClose={() => setIsLogModalOpen(false)} 
        onSubmit={addRequest} 
      />

      {/* --- DIGITAL REPORT MODAL (VIEW ONLY) --- */}
      {viewingReport && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                      <FaFingerprint className="text-slate-500" size={24} />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Official Job Record</p>
                   </div>
                   <h2 className="text-3xl font-black uppercase italic tracking-tighter">{viewingReport.unit}</h2>
                   <p className="text-xs font-bold text-blue-400 uppercase mt-1">Ticket ID: {viewingReport.id}</p>
                </div>
                <button onClick={() => setViewingReport(null)} className="bg-white/10 p-3 rounded-full hover:bg-red-500 transition-colors"><FaTimes /></button>
             </div>
             <div className="p-8 space-y-8">
                <div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Execution Log</h3>
                   <div className="space-y-3">
                      {viewingReport.tasks.map(task => (
                         <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-xs font-bold text-slate-700 uppercase">{task.desc}</span>
                            <div className="flex items-center gap-2 text-green-600">
                               <span className="text-[9px] font-black uppercase">Verified</span>
                               <FaCheckCircle />
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contractor</p>
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-black">{viewingReport.contractor[0]}</div>
                         <p className="text-sm font-black text-slate-900 uppercase">{viewingReport.contractor}</p>
                      </div>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Completion Date</p>
                      <p className="text-sm font-black text-slate-900 uppercase">{viewingReport.completedAt || 'N/A'}</p>
                   </div>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Digital Evidence</p>
                    <div className="w-full h-32 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center gap-2 text-slate-400">
                        <FaCamera />
                        <span className="text-[10px] font-black uppercase">No images uploaded to secure storage</span>
                    </div>
                </div>
             </div>
             <div className="bg-slate-50 p-4 text-center border-t border-slate-200">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Generated by OC Pulse System • {new Date().getFullYear()}</p>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MaintenancePage;