"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import MaintenanceForm from '../components/MaintenanceForm';
import Loading from '../loading'; 

import { 
  FaPlus, FaTools, FaClock, FaSearch, 
  FaCamera, FaCheckCircle, FaBars,
  FaFileSignature, FaFingerprint, FaExclamationCircle, 
  FaTimes, FaTrash, FaPrint, FaBuilding, FaPhone
} from "react-icons/fa";

// FIX: Updated to lowercase 'f' as requested
import { db } from '../Config/firebaseConfig';
import { 
  collection, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, query, orderBy 
} from 'firebase/firestore';

const MaintenancePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewingReport, setViewingReport] = useState(null); 
  const [isLogModalOpen, setIsLogModalOpen] = useState(false); 
  
  const [printTicket, setPrintTicket] = useState(null);

  // --- 1. READ DATA ---
  useEffect(() => {
    const q = query(collection(db, "maintenance"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTickets(data);
      setLoading(false);
    }, (error) => console.error("DB Error:", error));
    return () => unsubscribe();
  }, []);

  // Responsive Sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsOpen(false);
      else setIsOpen(true);
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- ACTIONS ---
  const addRequest = async (data) => {
    const summaryIssue = data.faults.map(f => `${f.area}: ${f.description}`).join(' | ');
    const uniqueAreas = [...new Set(data.faults.map(f => f.area))];

    try {
      await addDoc(collection(db, "maintenance"), {
        unit: data.unit.toUpperCase(),
        status: 'request',
        issue: summaryIssue,
        rawFaults: data.faults,
        loggedAt: new Date().toLocaleString(),
        createdAt: serverTimestamp(),
        areas: uniqueAreas,
        displayId: `REQ-${Math.floor(Math.random() * 900) + 100}`
      });
      setIsLogModalOpen(false); 
      setActiveTab('requests');
    } catch (error) {
      alert("Failed to log request.");
    }
  };

  const promoteToJobCard = async (ticket) => {
    const jobTasks = ticket.rawFaults ? ticket.rawFaults.map((f, index) => ({
        id: index + 1,
        desc: f.description,
        area: f.area,
        done: false,
        liability: null 
    })) : [{ id: 1, desc: ticket.issue, area: ticket.areas[0] || 'General', done: false, liability: null }];

    try {
      await updateDoc(doc(db, "maintenance", ticket.id), {
        status: 'active',
        contractor: 'Unassigned',
        priority: 'Medium',
        issueDate: new Date().toISOString().split('T')[0],
        tasks: jobTasks,
        displayId: `JC-${Math.floor(Math.random() * 9000) + 1000}`
      });
      setActiveTab('active');
    } catch (error) { console.error(error); }
  };

  const updateTicketField = async (ticketId, field, value) => {
    try { await updateDoc(doc(db, "maintenance", ticketId), { [field]: value }); } catch (error) {}
  };

  const toggleTask = async (ticket, taskId) => {
    const updatedTasks = ticket.tasks.map(task => 
      task.id === taskId ? { ...task, done: !task.done } : task
    );
    try { await updateDoc(doc(db, "maintenance", ticket.id), { tasks: updatedTasks }); } catch (error) {}
  };

  const toggleLiability = async (ticket, taskId) => {
    const updatedTasks = ticket.tasks.map(task => {
        if (task.id === taskId) {
            let newLiability = 'Owner';
            if (task.liability === 'Owner') newLiability = 'Tenant';
            else if (task.liability === 'Tenant') newLiability = null;
            return { ...task, liability: newLiability };
        }
        return task;
    });
    try { await updateDoc(doc(db, "maintenance", ticket.id), { tasks: updatedTasks }); } catch (error) {}
  };

  const finalizeJob = async (ticketId) => {
    if(confirm("Mark this job card as complete and archive it?")) {
      try { await updateDoc(doc(db, "maintenance", ticketId), { status: 'completed', completedAt: new Date().toLocaleString() }); } catch (error) {}
    }
  };

  const deleteTicket = async (id) => {
    if(confirm("Permanently delete this record?")) {
      try { await deleteDoc(doc(db, "maintenance", id)); } catch (error) { alert("Failed to delete."); }
    }
  };

  const handlePrint = (ticket) => {
    setPrintTicket(ticket);
    setTimeout(() => { window.print(); }, 100);
  };

  const filteredTickets = tickets.filter(t => {
    const requiredStatus = activeTab === 'requests' ? 'request' : activeTab;
    if (t.status !== requiredStatus) return false;
    const query = searchQuery.toLowerCase();
    const searchableId = t.displayId || t.id;
    if (activeTab === 'requests') return t.unit.toLowerCase().includes(query);
    return searchableId.toLowerCase().includes(query) || t.unit.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans relative">
      
      {/* 1. SCREEN VIEW (Hidden when printing) */}
      <div className="print:hidden">
          <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
          <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>

          <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8 max-w-7xl mx-auto`}>
            {/* HEADER */}
            <header className="mb-8">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={() => setIsOpen(!isOpen)} className="md:hidden bg-white p-3 rounded-xl shadow-sm text-slate-600 border border-slate-200">
                        <FaBars />
                    </button>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none">Maintenance Hub</h1>
                      <p className="text-slate-400 font-bold mt-1 tracking-widest text-[9px] uppercase italic"> Lifecycle Management</p>
                    </div>
                  </div>
                  <button onClick={() => setIsLogModalOpen(true)} className="w-full md:w-auto bg-slate-900 text-white py-4 md:py-3 px-6 rounded-xl shadow-xl flex items-center justify-center space-x-2 active:scale-95 border-b-4 border-blue-600 transition-all hover:bg-slate-800">
                    <FaPlus size={12} /> <span className="text-[10px] font-black uppercase tracking-widest">Log Request</span>
                  </button>
               </div>

               <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-2 rounded-[1.5rem] shadow-sm border border-slate-200">
                  <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar">
                     {['requests', 'active', 'completed'].map(tab => (
                        <button key={tab} onClick={() => { setActiveTab(tab); setSearchQuery(''); }} 
                            className={`flex-1 lg:flex-none px-4 md:px-6 py-3 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                          {tab === 'requests' ? 'New Requests' : tab === 'active' ? 'Active Jobs' : 'History'}
                        </button>
                     ))}
                  </div>
                  <div className="relative w-full lg:w-96 group">
                     <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                     <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder={activeTab === 'requests' ? "Search by UNIT..." : "Search by JOB ID..."} 
                        className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500/20 pl-10 pr-4 py-3 rounded-xl text-xs font-bold uppercase outline-none transition-all" />
                  </div>
               </div>
            </header>

            {/* CONTENT */}
            <div className="space-y-6">
               {loading && <Loading />}
               {!loading && filteredTickets.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[40vh] text-slate-300">
                      <FaExclamationCircle size={50} className="mb-4 opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest">No records found</p>
                  </div>
               )}

               {/* TAB 1: REQUESTS */}
               {activeTab === 'requests' && filteredTickets.map(ticket => (
                  <div key={ticket.id} className="bg-white rounded-[2rem] border border-slate-200 p-4 md:p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group hover:border-blue-300 transition-all shadow-sm">
                     <div className="flex gap-4 items-start md:items-center w-full">
                        <div className="w-12 h-12 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center shrink-0"><FaExclamationCircle /></div>
                        <div className="w-full">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-black uppercase italic text-slate-900">{ticket.unit}</h3>
                                <button onClick={() => deleteTicket(ticket.id)} className="text-slate-300 hover:text-red-500 p-2"><FaTrash size={12}/></button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                               {ticket.areas && ticket.areas.map(a => <span key={a} className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{a}</span>)}
                               <span className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-1"><FaClock size={8}/> {ticket.loggedAt}</span>
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-600 italic">"{ticket.issue}"</p>
                        </div>
                     </div>
                     <button onClick={() => promoteToJobCard(ticket)} className="w-full md:w-auto bg-slate-900 text-white px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg">Approve & Assign</button>
                  </div>
               ))}

               {/* TAB 2: ACTIVE JOBS */}
               {activeTab === 'active' && filteredTickets.map(job => (
                  <div key={job.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 md:px-8 py-5 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center space-x-4">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">{job.displayId}</span>
                        <span className="hidden md:inline text-[10px] font-bold text-slate-400 uppercase">Issued: {job.issueDate}</span>
                      </div>
                      
                      {/* --- JOB CONTROLS --- */}
                      <div className="flex flex-wrap items-center gap-3">
                         <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2">
                            <FaTools className="text-slate-400 mr-2" size={12}/>
                            <select 
                                value={job.contractor || 'Unassigned'}
                                onChange={(e) => updateTicketField(job.id, 'contractor', e.target.value)}
                                className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 w-24"
                            >
                                <option value="Unassigned">Assign Tech</option>
                                <option value="Rasta">Rasta</option>
                                <option value="Johannes">Johannes</option>
                            </select>
                         </div>

                         <select 
                            value={job.priority || 'Medium'}
                            onChange={(e) => updateTicketField(job.id, 'priority', e.target.value)}
                            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase outline-none ${
                                job.priority === 'High' ? 'bg-red-100 text-red-600' : 
                                job.priority === 'Low' ? 'bg-green-100 text-green-600' : 
                                'bg-orange-100 text-orange-600'
                            }`}
                         >
                            <option value="Low">Low Priority</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High Priority</option>
                         </select>

                         <button onClick={() => handlePrint(job)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600"><FaPrint /> Print</button>
                         <button onClick={() => deleteTicket(job.id)} className="text-slate-300 hover:text-red-500 transition-colors"><FaTrash size={12}/></button>
                      </div>
                    </div>

                    <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                       <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-2 leading-none">{job.unit}</h2>
                          <div className="space-y-3 mt-6">
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Task Checklist</p>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mr-1">Bill To</p>
                            </div>
                            
                            {job.tasks && job.tasks.map(task => (
                               <div key={task.id} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${task.done ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-transparent hover:border-blue-500'}`}>
                                  {/* LEFT: Task Done Toggle */}
                                  <button onClick={() => toggleTask(job, task.id)} className="flex items-center space-x-4 flex-1 text-left">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${task.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{task.done && <FaCheckCircle size={14} />}</div>
                                    <div>
                                       <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{task.area}</p>
                                       <p className={`text-xs font-bold uppercase ${task.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.desc}</p>
                                    </div>
                                  </button>
                                  
                                  {/* RIGHT: Liability Toggle */}
                                  <button 
                                    onClick={() => toggleLiability(job, task.id)} 
                                    className={`ml-4 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                        task.liability === 'Owner' ? 'bg-blue-600 text-white border-blue-600' : 
                                        task.liability === 'Tenant' ? 'bg-orange-500 text-white border-orange-500' :
                                        'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                                    }`}
                                  >
                                    {task.liability || 'Select'}
                                  </button>
                               </div>
                            ))}
                          </div>
                       </div>
                       <div className="bg-slate-50 rounded-[2rem] p-6 flex flex-col justify-between border border-slate-100">
                          <div>
                              <div className="flex items-center space-x-4 mb-4">
                                 <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white"><FaTools size={20} /></div>
                                 <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Assigned Tech</p>
                                    <p className="text-sm font-black text-slate-900 uppercase italic">{job.contractor || 'Unassigned'}</p>
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

               {/* TAB 3: HISTORY */}
               {activeTab === 'completed' && filteredTickets.map(job => (
                  <div key={job.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center group hover:shadow-md transition-all gap-4">
                     <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-2xl shrink-0"><FaFileSignature /></div>
                        <div>
                           <h3 className="text-lg font-black uppercase italic text-slate-900">{job.unit}</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex flex-wrap items-center gap-2">
                              <span>Ref: {job.displayId}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full hidden md:block"></span>
                              <span>{job.completedAt}</span>
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={() => setViewingReport(job)} className="w-full md:w-auto bg-slate-100 text-slate-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-colors">View Report</button>
                        <button onClick={() => deleteTicket(job.id)} className="bg-red-50 text-red-500 px-4 py-3 rounded-xl hover:bg-red-500 hover:text-white transition-colors"><FaTrash/></button>
                     </div>
                  </div>
               ))}
            </div>
          </main>

          {/* MODALS */}
          <MaintenanceForm isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} onSubmit={addRequest} />
          
          {viewingReport && (
            <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
               <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
                  <div className="bg-slate-900 p-6 md:p-8 text-white flex justify-between items-start">
                     <div>
                        <h2 className="text-2xl font-black uppercase italic">{viewingReport.unit}</h2>
                        <p className="text-xs font-bold text-blue-400 uppercase mt-1">Ticket ID: {viewingReport.displayId}</p>
                     </div>
                     <div className="flex gap-2">
                         <button onClick={() => handlePrint(viewingReport)} className="bg-white/10 p-3 rounded-full hover:bg-blue-600 transition-colors"><FaPrint /></button>
                         <button onClick={() => setViewingReport(null)} className="bg-white/10 p-3 rounded-full hover:bg-red-500 transition-colors"><FaTimes /></button>
                     </div>
                  </div>
                  {/* ... Report Content ... */}
                  <div className="p-6 md:p-8 space-y-8">
                     <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Execution Log</h3>
                        <div className="space-y-3">
                           {viewingReport.tasks && viewingReport.tasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                 <div>
                                     <span className="text-xs font-bold text-slate-700 uppercase block">{task.desc}</span>
                                     <span className={`text-[9px] font-black uppercase mt-1 px-2 py-0.5 rounded ${task.liability === 'Owner' ? 'bg-blue-100 text-blue-600' : task.liability === 'Tenant' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>Bill To: {task.liability || 'Unassigned'}</span>
                                 </div>
                                 <div className="flex items-center gap-2 text-green-600">
                                    <span className="text-[9px] font-black uppercase hidden md:inline">Verified</span>
                                    <FaCheckCircle />
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
      </div>

      {/* ==========================
          2. PREMIUM PRINTABLE PAPER VIEW
         ========================== */}
      <div className="hidden print:block bg-white text-black w-full h-full font-sans absolute top-0 left-0 z-[10000]">
         <style jsx global>{`
           @media print {
             @page { margin: 0; size: A4; }
             body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
           }
         `}</style>
         
         {printTicket && (
            <div className="max-w-[210mm] mx-auto p-12 h-screen relative bg-white flex flex-col">
                
                {/* 1. PREMIUM HEADER */}
                <div className="flex justify-between items-start border-b-[4px] border-blue-600 pb-8 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                           <div className="bg-blue-600 text-white p-3 rounded-xl"><FaBuilding size={24}/></div>
                           <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900">OC PULSE<span className="text-blue-600">.</span></h1>
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-slate-500 pl-1">Property Maintenance Division</p>
                    </div>
                    <div className="text-right">
                        <div className="inline-block bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 mb-2">
                            <p className="text-3xl font-black uppercase text-slate-900">{printTicket.unit}</p>
                        </div>
                        <p className="text-sm font-mono font-bold text-slate-500">REF: {printTicket.displayId}</p>
                        <p className="text-xs font-bold uppercase mt-1 text-blue-600">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* 2. INFO GRID & STATUS BADGE */}
                <div className="grid grid-cols-4 gap-6 mb-8 items-stretch">
                    <div className="col-span-1 bg-slate-50 p-4 rounded-xl border-l-4 border-blue-600">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Assigned To</p>
                        <p className="text-lg font-black uppercase text-slate-900">{printTicket.contractor || 'Unassigned'}</p>
                    </div>
                    <div className="col-span-1 bg-slate-50 p-4 rounded-xl border-l-4 border-purple-600">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Priority</p>
                        <p className="text-lg font-black uppercase text-slate-900">{printTicket.priority || 'Standard'}</p>
                    </div>
                    {/* STATUS BADGE - Shows 'Active' if not complete */}
                    <div className={`col-span-2 p-4 rounded-xl border-l-4 flex items-center justify-center ${printTicket.status === 'completed' ? 'bg-green-100 border-green-600 text-green-800' : 'bg-orange-100 border-orange-600 text-orange-800'}`}>
                        <div>
                            <p className="text-[9px] font-black uppercase mb-1 opacity-60 text-center">Current Status</p>
                            <p className="text-2xl font-black uppercase tracking-widest">
                                {printTicket.status === 'completed' ? 'Active' : 'Closed'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. TASK TABLE */}
                <div className="mb-10">
                    <div className="flex justify-between items-end mb-4 border-b border-slate-300 pb-2">
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Job Requirements & Liability</h3>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Section 01</span>
                    </div>
                    
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-900">
                                <th className="py-2 text-[10px] font-black uppercase text-slate-500 w-12">Done</th>
                                <th className="py-2 text-[10px] font-black uppercase text-slate-500">Task Description</th>
                                <th className="py-2 text-[10px] font-black uppercase text-slate-500">Area</th>
                                <th className="py-2 text-[10px] font-black uppercase text-blue-600 text-right">Bill To (Assignment)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printTicket.tasks && printTicket.tasks.map((task, i) => (
                                <tr key={task.id} className="border-b border-slate-200">
                                    <td className="py-4">
                                        <div className="w-6 h-6 border-2 border-slate-300 rounded flex items-center justify-center">
                                            {/* Show checkmark ONLY if done in app, otherwise blank for pen */}
                                            {task.done && <FaCheckCircle className="text-slate-900"/>}
                                        </div>
                                    </td>
                                    <td className="py-4 text-sm font-bold uppercase text-slate-900">{task.desc}</td>
                                    <td className="py-4 text-xs font-mono uppercase text-slate-500">{task.area}</td>
                                    <td className="py-4 text-right">
                                        <div className="inline-flex gap-4">
                                            <div className="flex items-center gap-1">
                                                <div className={`w-4 h-4 border border-slate-400 flex items-center justify-center text-[10px] ${task.liability === 'Owner' ? 'bg-slate-900 text-white' : ''}`}>
                                                    {task.liability === 'Owner' && 'X'}
                                                </div>
                                                <span className="text-[9px] font-bold uppercase text-slate-500">Owner</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className={`w-4 h-4 border border-slate-400 flex items-center justify-center text-[10px] ${task.liability === 'Tenant' ? 'bg-slate-900 text-white' : ''}`}>
                                                    {task.liability === 'Tenant' && 'X'}
                                                </div>
                                                <span className="text-[9px] font-bold uppercase text-slate-500">Tenant</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. NOTES & SIGNATURES GRID (UPDATED PER REQUEST) */}
                <div className="mt-auto">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 h-24 mb-8">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Contractor Notes / Materials Used:</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                        {/* Row 1: Execution */}
                        <div>
                            <div className="border-b-2 border-slate-900 h-8"></div>
                            <p className="text-[10px] font-black uppercase mt-1">Contractor Signature</p>
                        </div>
                        <div>
                            <div className="border-b-2 border-slate-900 h-8"></div>
                            <p className="text-[10px] font-black uppercase mt-1">Tenant Signature (Work Verified)</p>
                        </div>

                        {/* Row 2: Approval (OWNER SECTION UPDATED) */}
                        <div>
                            <p className="text-[10px] font-black uppercase mb-1">Owner Approval</p>
                            <div className="flex gap-4 mb-2">
                                <span className="text-[10px] font-bold">[ ] APPROVED</span>
                                <span className="text-[10px] font-bold">[ ] DECLINED</span>
                            </div>
                            <div className="border-b border-slate-300 h-4 mb-1"></div>
                            <p className="text-[8px] text-slate-400 uppercase mb-4">Reason / Notes</p>

                            
                        </div>
                        
                        {/* MANAGER SECTION UPDATED */}
                        <div className="flex flex-col justify-end">
                            <div className="border-b-2 border-slate-900 h-8"></div>
                            <p className="text-[10px] font-black uppercase mt-1">Job assigned by:</p>
                        </div>
                    </div>
                </div>

                {/* LEGAL FOOTER (UPDATED) */}
                <div className="border-t border-slate-300 pt-2 mt-8 text-[8px] text-slate-400 text-center leading-tight">
                    <p className="font-bold uppercase text-slate-600 mb-1">Confidential & Proprietary • Official OC Pulse Document</p>
                    <p>This document is generated by the OC Pulse System. Unauthorized distribution, reproduction, or modification of this digital asset is strictly prohibited.</p>
                    <p>System Architect: Kally | © {new Date().getFullYear()} OC Rental. All Rights Reserved.</p>
                </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default MaintenancePage;