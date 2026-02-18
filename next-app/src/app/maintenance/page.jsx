"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import MaintenanceForm from '../components/MaintenanceForm';
import Loading from '../loading'; 

import { 
  FaPlus, FaTools, FaClock, FaSearch, 
  FaCheckCircle, FaBars,
  FaFileSignature, FaExclamationCircle, 
  FaTrash, FaPrint, FaArrowRight, FaCheck, FaTimes, FaUserCircle
} from "react-icons/fa";

import { db, auth } from '../Config/firebaseConfig';
import { 
  collection, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, query, orderBy, getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const MaintenancePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewingReport, setViewingReport] = useState(null); 
  const [isLogModalOpen, setIsLogModalOpen] = useState(false); 
  const [viewingImage, setViewingImage] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  const [printTicket, setPrintTicket] = useState(null);

  // --- 1. READ DATA ---
  useEffect(() => {
    const q = query(collection(db, "maintenance"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTickets(prevTickets => {
        // Merge fresh Firestore data with existing local state to preserve liability values
        return data.map(newTicket => {
          const oldTicket = prevTickets.find(t => t.id === newTicket.id);
          if (oldTicket && oldTicket.tasks && newTicket.tasks) {
            // Preserve liability field from old tasks
            const updatedTasks = newTicket.tasks.map(newTask => {
              const oldTask = oldTicket.tasks.find(t => t.id === newTask.id);
              return {
                ...newTask,
                liability: oldTask?.liability ?? newTask.liability
              };
            });
            return { ...newTicket, tasks: updatedTasks };
          }
          return newTicket;
        });
      });
      setLoading(false);
    }, (error) => console.error("DB Error:", error));

    // Fetch User Role
    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "stuff", currentUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
    });

    return () => {
      unsubscribe();
      authUnsubscribe();
    };
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

  const toggleLiability = (ticket, taskId) => {
    // Optimistic update - update UI immediately
    const updatedTickets = tickets.map(t => {
      if (t.id === ticket.id) {
        const updatedTasks = t.tasks.map(task => {
          if (task.id === taskId) {
            let newLiability = 'Owner';
            if (task.liability === 'Owner') newLiability = 'Tenant';
            else if (task.liability === 'Tenant') newLiability = null;
            return { ...task, liability: newLiability };
          }
          return task;
        });
        return { ...t, tasks: updatedTasks };
      }
      return t;
    });
    
    // Update state immediately for instant UI feedback
    setTickets(updatedTickets);
    
    // Update Firestore in background
    const updatedTicket = updatedTickets.find(t => t.id === ticket.id);
    updateDoc(doc(db, "maintenance", ticket.id), { tasks: updatedTicket.tasks }).catch(error => {
      console.error('Error updating liability:', error);
    });
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
    // Get the latest version of the ticket from state
    const latestTicket = tickets.find(t => t.id === ticket.id) || ticket;
    setPrintTicket(latestTicket);
    setTimeout(() => { window.print(); }, 200);
  };

  const filteredTickets = tickets.filter(t => {
    const requiredStatus = activeTab === 'requests' ? 'request' : activeTab;
    if (t.status !== requiredStatus) return false;
    const query = searchQuery.toLowerCase();
    const searchableId = t.displayId || t.id;
    if (activeTab === 'requests') return t.unit.toLowerCase().includes(query);
    return searchableId.toLowerCase().includes(query) || t.unit.toLowerCase().includes(query);
  });

  const printIssues = printTicket?.tasks?.length
    ? printTicket.tasks.map((task, index) => ({
        id: task.id ?? `task-${index}`,
        desc: task.desc,
        area: task.area || 'General',
        liability: task.liability || null,
        done: task.done === true
      }))
    : printTicket?.rawFaults?.length
      ? printTicket.rawFaults.map((fault, index) => ({
          id: `fault-${index}`,
          desc: fault.description,
          area: fault.area || 'General',
          liability: null,
          done: false
        }))
      : printTicket
        ? [{
            id: 'issue',
            desc: printTicket.issue,
            area: printTicket.areas?.[0] || 'General',
            liability: null,
            done: false
          }]
        : [];

  if (loading) {
    return <Loading />;
  }

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
                  {(userRole === 'Maintenance Admin' || userRole === 'PQA') && (
                    <button onClick={() => setIsLogModalOpen(true)} className="w-full md:w-auto bg-slate-900 text-white py-4 md:py-3 px-6 rounded-xl shadow-xl flex items-center justify-center space-x-2 active:scale-95 border-b-4 border-blue-600 transition-all hover:bg-slate-800">
                      <FaPlus size={12} /> <span className="text-[10px] font-black uppercase tracking-widest">Log Request</span>
                    </button>
                  )}
               </div>

               <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-2 rounded-3xl shadow-sm border border-slate-200">
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
               {/* TAB 1: REQUESTS */}
               {activeTab === 'requests' && (
                  <>
                     {filteredTickets.length > 0 ? (
                        filteredTickets.map(ticket => (
                           <div key={ticket.id} className="bg-white rounded-4xl border border-slate-200 p-4 md:p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group hover:border-blue-300 transition-all shadow-sm">
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
                        ))
                     ) : (
                        <div className="bg-white rounded-4xl border border-slate-200 p-12 text-center">
                           <p className="text-xl font-black uppercase text-slate-400">No maintenance requests</p>
                           <p className="text-sm text-slate-500 mt-2">All systems are clear</p>
                        </div>
                     )}
                  </>
               )}

               {/* TAB 2: ACTIVE JOBS */}
               {activeTab === 'active' && (
                  <>
                     {filteredTickets.length > 0 ? (
                        filteredTickets.map(job => (
                  <div key={job.id} className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 md:px-8 py-5 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center space-x-4">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">{job.displayId}</span>
                        <span className="hidden md:inline text-[10px] font-bold text-slate-400 uppercase">Issued: {job.issueDate}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2">
                            <FaTools className="text-slate-400 mr-2" size={12}/>
                            <select 
                                value={job.contractor || 'Unassigned'}
                                onChange={(e) => updateTicketField(job.id, 'contractor', e.target.value)}
                                className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 w-28"
                            >
                                <option value="Unassigned">Assign Tech</option>
                                <option value="Rasta">Rasta</option>
                                <option value="Johannes">Johannes</option>
                                <option value="Other">Other</option>
                                <option value="External">External</option>
                            </select>
                          </div>

                          <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2">
                            <FaTools className="text-slate-400 mr-2" size={12}/>
                            <select 
                                value={job.externalContractor || ''}
                                onChange={(e) => updateTicketField(job.id, 'externalContractor', e.target.value)}
                                disabled={job.contractor !== 'External'}
                                className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 w-28 disabled:text-slate-300"
                            >
                                <option value="">External</option>
                                <option value="Terry">Terry</option>
                                <option value="Kobus">Kobus</option>
                                <option value="Chris">Chris</option>
                                <option value="Derick">Derick</option>
                            </select>
                          </div>

                          <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2">
                            <FaClock className="text-slate-400 mr-2" size={12}/>
                            <input
                                type="date"
                                value={job.appointmentDate || ''}
                                onChange={(e) => updateTicketField(job.id, 'appointmentDate', e.target.value)}
                                className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 w-28"
                            />
                          </div>

                          <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2">
                            <FaUserCircle className="text-slate-400 mr-2" size={12}/>
                            <input
                                type="tel"
                                placeholder="Tenant #"
                                value={job.tenantPhone || ''}
                                onChange={(e) => updateTicketField(job.id, 'tenantPhone', e.target.value)}
                                className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 w-28"
                            />
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
                                  <div className="flex items-center space-x-4 flex-1">
                                    <button onClick={() => toggleTask(job, task.id)} className="flex items-center space-x-4">
                                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${task.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{task.done && <FaCheckCircle size={14} />}</div>
                                    </button>
                                    <div className="flex-1">
                                       <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{task.area}</p>
                                       <p className={`text-xs font-bold uppercase ${task.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.desc}</p>
                                       {task.completedAt && (
                                         <p className="text-[9px] text-green-600 font-bold mt-1">{task.completedAt}</p>
                                       )}
                                       {task.images && task.images.length > 0 && (
                                         <div className="flex gap-1 mt-2 print:hidden" style={{ position: 'relative', zIndex: 10 }}>
                                           {task.images.map((url, idx) => (
                                             <div
                                               key={idx}
                                               onClick={(e) => {
                                                 e.preventDefault();
                                                 e.stopPropagation();
                                                 console.log('IMAGE CLICKED!', url);
                                                 setViewingImage(url);
                                               }}
                                               className="w-12 h-12 rounded-lg overflow-hidden border-2 border-green-400 cursor-pointer hover:border-blue-500 transition-all active:scale-95 bg-white"
                                               style={{ position: 'relative', zIndex: 11 }}
                                             >
                                               <img 
                                                 src={url} 
                                                 alt="" 
                                                 className="w-full h-full object-cover" 
                                                 style={{ pointerEvents: 'none' }}
                                               />
                                             </div>
                                           ))}
                                         </div>
                                       )}
                                    </div>
                                  </div>
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
                        <div className="bg-slate-50 rounded-4xl p-6 flex flex-col justify-between border border-slate-100">
                           <div>
                              <div className="flex items-center space-x-4 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white"><FaTools size={20} /></div>
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase">Assigned Tech</p>
                                  <p className="text-sm font-black text-slate-900 uppercase italic">
                                    {job.contractor === 'External'
                                     ? `External · ${job.externalContractor || 'Unassigned'}`
                                     : (job.contractor || 'Unassigned')}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-3 text-xs font-bold text-slate-600">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black uppercase text-slate-400">Appointment</span>
                                  <span>{job.appointmentDate || ''}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black uppercase text-slate-400">Tenant Phone</span>
                                  <span>{job.tenantPhone || 'Not set'}</span>
                                </div>
                              </div>
                           </div>
                           <div className="pt-6 border-t border-slate-200 mt-6">
                              <button onClick={() => finalizeJob(job.id)} className="w-full bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-green-200 active:scale-95 transition-all">Finalize Job Card</button>
                           </div>
                        </div>
                    </div>
                  </div>
                        ))
                     ) : (
                        <div className="bg-white rounded-4xl border border-slate-200 p-12 text-center">
                           <p className="text-xl font-black uppercase text-slate-400">No active jobs</p>
                           <p className="text-sm text-slate-500 mt-2">All maintenance is booked</p>
                        </div>
                     )}
                  </>
               )}

               {/* TAB 3: HISTORY */}
               {activeTab === 'completed' && (
                  <>
                     {filteredTickets.length > 0 ? (
                        filteredTickets.map(job => (
                           <div key={job.id} className="bg-white rounded-4xl border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center group hover:shadow-md transition-all gap-4">
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
                        ))
                     ) : (
                        <div className="bg-white rounded-4xl border border-slate-200 p-12 text-center">
                           <p className="text-xl font-black uppercase text-slate-400">No completed jobs</p>
                           <p className="text-sm text-slate-500 mt-2">Maintenance history will appear here</p>
                        </div>
                     )}
                  </>
               )}
            </div>
          </main>

          {/* MODALS */}
          <MaintenanceForm isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} onSubmit={addRequest} />
          
          {viewingReport && (
            <div className="fixed inset-0 z-200 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:hidden">
              <div className="bg-white w-full max-w-4xl rounded-4xl shadow-2xl overflow-hidden my-8">
                  <div className="bg-slate-900 p-6 md:p-8 text-white flex justify-between items-start">
                     <div>
                        <h2 className="text-2xl font-black uppercase italic">{viewingReport.unit}</h2>
                        <p className="text-xs font-bold text-blue-400 uppercase mt-1">Ticket ID: {viewingReport.displayId}</p>
                     </div>
                     <button onClick={() => setViewingReport(null)} className="bg-white/10 p-3 rounded-full hover:bg-red-500 transition-colors"><FaTrash /></button>
                  </div>
                  <div className="p-6 md:p-8 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                           <p className="text-sm font-black text-slate-900 uppercase">{viewingReport.status || 'Unknown'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contractor</p>
                           <p className="text-sm font-black text-slate-900 uppercase">{viewingReport.contractor || 'Unassigned'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority</p>
                           <p className={`text-sm font-black uppercase ${viewingReport.priority === 'High' ? 'text-red-600' : viewingReport.priority === 'Low' ? 'text-green-600' : 'text-orange-600'}`}>{viewingReport.priority || 'Medium'}</p>
                        </div>
                     </div>

                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Issue Summary</p>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4">
                           <p className="text-sm font-bold text-slate-700">{viewingReport.issue || 'No issue description'}</p>
                        </div>
                     </div>

                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Task Checklist</p>
                        {viewingReport.tasks && viewingReport.tasks.length > 0 ? (
                           <div className="space-y-2">
                              {viewingReport.tasks.map((task, idx) => (
                                 <div key={idx} className={`p-4 rounded-2xl border flex items-start gap-3 ${task.done ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${task.done ? 'bg-green-500 text-white' : 'bg-slate-300'}`}>
                                       {task.done && <FaCheck size={12} />}
                                    </div>
                                    <div className="flex-1">
                                       <p className="text-[9px] font-black text-slate-400 uppercase">{task.area}</p>
                                       <p className={`text-xs font-bold ${task.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.desc}</p>
                                       {task.completedAt && (
                                         <p className="text-[9px] text-green-600 font-bold mt-1">{task.completedAt}</p>
                                       )}
                                       {task.images && task.images.length > 0 && (
                                         <div className="flex gap-1 mt-2 print:hidden" style={{ position: 'relative', zIndex: 10 }}>
                                           {task.images.map((url, idx) => (
                                             <div
                                               key={idx}
                                               onClick={(e) => {
                                                 e.preventDefault();
                                                 e.stopPropagation();
                                                 console.log('MODAL IMAGE CLICKED!', url);
                                                 setViewingImage(url);
                                               }}
                                               className="w-16 h-16 rounded-lg overflow-hidden border-2 border-green-400 cursor-pointer hover:border-blue-500 transition-all active:scale-95 bg-white"
                                               style={{ position: 'relative', zIndex: 11 }}
                                             >
                                               <img 
                                                 src={url} 
                                                 alt="" 
                                                 className="w-full h-full object-cover"
                                                 style={{ pointerEvents: 'none' }}
                                               />
                                             </div>
                                           ))}
                                         </div>
                                       )}
                                    </div>
                                    <div className="text-right">
                                       <p className="text-[8px] font-black text-slate-400 uppercase">Bill To</p>
                                       <p className="text-[10px] font-black text-slate-900">{task.liability || '—'}</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        ) : viewingReport.rawFaults && viewingReport.rawFaults.length > 0 ? (
                           <div className="space-y-2">
                              {viewingReport.rawFaults.map((fault, idx) => (
                                 <div key={idx} className="p-4 rounded-2xl border bg-slate-50 border-slate-200">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">{fault.area}</p>
                                    <p className="text-xs font-bold text-slate-900">{fault.description}</p>
                                    {fault.note && <p className="text-[10px] text-slate-600 mt-1">Note: {fault.note}</p>}
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 text-sm text-slate-500 font-bold uppercase">No tasks logged</div>
                        )}
                     </div>

                     <div className="flex gap-3">
                        <button onClick={() => setViewingReport(null)} className="flex-1 px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200">Close</button>
                        <button onClick={() => handlePrint(viewingReport)} className="flex-1 px-6 py-3 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 flex items-center justify-center gap-2"><FaPrint size={12} /> Print</button>
                     </div>
                  </div>
               </div>
            </div>
          )}
      </div>

      {/* =================================================================
           3. THE "REGINA" BLOCKY PRINT VIEW (Only Visible on Print)
          ================================================================= */}
      <div className="hidden print:block bg-white text-black w-full min-h-screen font-sans">
         <style jsx global>{`
           @media print {
             @page { margin: 10mm; size: A4; }
             body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
             img { display: none !important; }
             .print\\:hidden { display: none !important; }
           }
         `}</style>
         
         {printTicket && (
            <div className="mx-auto h-full flex flex-col border-2 border-slate-900 p-6 max-w-5xl relative">
               {/* Watermark */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                 <div className="transform rotate-[-45deg]">
                   <p className="text-[120px] font-black uppercase text-slate-900/5 tracking-widest whitespace-nowrap">OC PULSE</p>
                 </div>
               </div>
               
               <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 relative z-10">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">OC Pulse</p>
                    <h1 className="text-3xl font-black uppercase">OC PULSE</h1>
                    <p className="text-xs font-bold uppercase text-slate-500">Maintenance Report</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-slate-500">Appointment Date</p>
                    <p className="text-2xl font-black uppercase">{printTicket.appointmentDate || ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-500">Date</p>
                    <p className="text-4xl font-black">
                      {printTicket.issueDate ? new Date(printTicket.issueDate).toLocaleDateString() : new Date().toLocaleDateString()}
                    </p>
                  </div>
               </div>

               <div className="grid grid-cols-12 gap-6 mt-6 relative z-10">
                  <div className="col-span-3">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Owner Approved Date</p>
                    <div className="border-2 border-slate-900 rounded-lg h-10 mt-1"></div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mt-3">Tenant Phone</p>
                    <div className="border-2 border-slate-900 rounded-lg h-10 mt-1 flex items-center px-2">
                      <span className="text-sm font-black uppercase">{printTicket.tenantPhone || ''}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Property</p>
                    <h2 className="text-2xl font-black uppercase">{printTicket.unit}</h2>
                  </div>
                  <div className="col-span-3 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Contractor Assigned</p>
                    <p className="text-xl font-black uppercase">
                      {printTicket.contractor === 'External'
                        ? `External · ${printTicket.externalContractor || 'Unassigned'}`
                        : (printTicket.contractor || 'Unassigned')}
                    </p>
                  </div>
                  <div className="col-span-3 text-right space-y-2 flex flex-col items-end">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Ticket Number</p>
                      <p className="text-xl font-black">{printTicket.displayId}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">LMS Ticket</p>
                      <div className="border-2 border-slate-900 rounded-lg h-5 w-20"></div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Invoice</p>
                      <div className="border-2 border-slate-900 rounded-lg h-5 w-20"></div>
                    </div>
                  </div>
               </div>

               <div className="mt-6 flex-1 relative z-10 flex flex-col gap-6">
                  <h3 className="text-sm font-black uppercase tracking-widest">Maintenance Issues</h3>
                  
                  <div className="space-y-3">
                    {printIssues.map(issue => (
                      <div key={issue.id} className={`border rounded-xl p-3 flex items-start justify-between gap-4 ${issue.done ? 'border-slate-900/40 bg-slate-50' : 'border-slate-900/20'}`}>
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-5 h-5 rounded flex-shrink-0 mt-1 flex items-center justify-center ${issue.done ? 'bg-slate-900 border-2 border-slate-900' : 'border-2 border-slate-900'}`}>
                            {issue.done && <span className="text-white text-xs font-black">✓</span>}
                          </div>
                          <div className="flex-1">
                            <p className={`text-[10px] font-black uppercase ${issue.done ? 'text-slate-500' : 'text-slate-400'}`}>{issue.area}</p>
                            <p className={`text-sm font-black uppercase ${issue.done ? 'line-through text-slate-400' : ''}`}>{issue.desc}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {issue.liability ? (
                            <>
                              <p className="text-[10px] font-black uppercase text-slate-400">Bill To</p>
                              <p className="text-xs font-black uppercase mt-1">{issue.liability}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-[10px] font-black uppercase text-slate-400">Bill To</p>
                              <div className="flex items-center gap-2 mt-2 justify-end">
                                <div className="w-4 h-4 border border-slate-900"></div>
                                <span className="text-[10px] font-black uppercase">Owner</span>
                                <div className="w-4 h-4 border border-slate-900"></div>
                                <span className="text-[10px] font-black uppercase">Tenant</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {printIssues.length === 0 && (
                      <div className="border border-slate-200 rounded-xl p-4 text-sm text-slate-400 uppercase font-bold">
                        No issues listed.
                      </div>
                    )}
                  </div>

                  <div className="border-2 border-slate-900 p-0 relative w-full">
                    <p className="text-[10px] font-black uppercase text-slate-500 absolute -top-2 left-4 bg-white px-2">Receipt Details</p>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-900">
                          <th className="p-2 text-left border-r border-slate-900"><p className="text-[8px] font-black uppercase text-slate-600">Store</p></th>
                          <th className="p-2 text-left border-r border-slate-900"><p className="text-[8px] font-black uppercase text-slate-600">Items</p></th>
                          <th className="p-2 text-left"><p className="text-[8px] font-black uppercase text-slate-600">Price</p></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5].map(num => (
                          <tr key={num} className="border-b border-slate-900 h-8">
                            <td className="p-2 border-r border-slate-900"></td>
                            <td className="p-2 border-r border-slate-900"></td>
                            <td className="p-2"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>

               <div className="grid grid-cols-12 gap-4 mt-6 relative z-10">
                  <div className="col-span-4">
                    <p className="text-[10px] font-black uppercase text-slate-500">Contractor Signature</p>
                    <div className="mt-2 h-10 border-b-2 border-slate-900"></div>
                  </div>
                  <div className="col-span-4">
                    <p className="text-[10px] font-black uppercase text-slate-500">Assigned By Signature</p>
                    <div className="mt-2 h-10 border-b-2 border-slate-900"></div>
                  </div>
                  <div className="col-span-4">
                    <p className="text-[10px] font-black uppercase text-slate-500">Tenant Signature (Optional)</p>
                    <div className="mt-2 h-10 border-b-2 border-slate-900"></div>
                  </div>
               </div>

               <div className="mt-6 border-t border-slate-200 pt-3 relative z-10">
                  <p className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">
                    Disclaimer: This document is confidential and may not be misused, copied, or distributed without owner rights or written permission from OC Pulse.
                  </p>
               </div>
            </div>
         )}

         {viewingImage && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 print:hidden" style={{ zIndex: 9999 }} onClick={() => setViewingImage(null)}>
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 bg-white text-slate-900 rounded-full p-3 hover:bg-slate-100"
            >
              <FaTimes size={20} />
            </button>
            <img
              src={viewingImage}
              alt="Full view"
              className="max-w-full max-h-full object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenancePage;