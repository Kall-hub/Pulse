"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  FaKey, FaClipboardCheck, FaTools, FaSoap, FaUserShield, 
  FaExclamationTriangle, FaCheckCircle, FaClock,
  FaFileInvoiceDollar, FaSearch, FaChevronRight, FaCamera, FaTimes, FaPaperPlane,
  FaHistory, FaArchive, FaEye, FaBars
} from "react-icons/fa";

const ClearancePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); 
  
  // MODAL STATES
  const [activeAudit, setActiveAudit] = useState(null);
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);

  // Responsive Sidebar Logic
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsOpen(false);
      else setIsOpen(true);
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. ACTIVE AUDITS
  const [audits, setAudits] = useState([
    {
      id: 1, unit: "DUNCAN COURT A612", tenant: "Sipho Khumalo", exitDate: "2026-01-10", status: "Action Required",
      checks: {
        keys: { status: 'complete', note: '3/3 Sets Returned', cost: 0 },
        inspection: { status: 'complete', note: 'Exit Inspection Done', cost: 0 },
        maintenance: { status: 'issue', note: 'Broken Window Latch', cost: 450 },
        cleaning: { status: 'issue', note: 'Deep Clean & Carpet Wash', cost: 850 }
      }
    },
    {
      id: 3, unit: "HILLCREST B201", tenant: "Mark Zulu", exitDate: "2026-01-15", status: "Pending",
      checks: {
        keys: { status: 'pending', note: 'Waiting for handover', cost: 0 },
        inspection: { status: 'complete', note: 'Inspection Done', cost: 0 },
        maintenance: { status: 'complete', note: 'Paint Touch-ups Done', cost: 0 },
        cleaning: { status: 'pending', note: 'Scheduled for tomorrow', cost: 0 }
      }
    }
  ]);

  // 2. HISTORY
  const [history, setHistory] = useState([
    {
      id: 99, unit: "THE WALL 407", tenant: "Jessica Smith", exitDate: "2026-01-05", status: "Closed",
      finalAction: "Full Refund", dateSent: "06 Jan 2026",
      checks: {
        keys: { status: 'complete', note: 'Returned', cost: 0 },
        inspection: { status: 'complete', note: 'Clean', cost: 0 },
        maintenance: { status: 'complete', note: 'None', cost: 0 },
        cleaning: { status: 'complete', note: 'Clean', cost: 0 }
      }
    }
  ]);

  // OPEN FINANCE MEMO
  const openFinanceModal = (audit) => {
    setActiveAudit(audit);
    setIsFinanceModalOpen(true);
  };

  // SEND & MOVE TO HISTORY
  const sendToFinance = () => {
    const totalDeductions = Object.values(activeAudit.checks).reduce((acc, curr) => acc + curr.cost, 0);
    const action = totalDeductions > 0 ? `Deduct R${totalDeductions}` : "Full Refund";

    const completedAudit = {
        ...activeAudit,
        status: "Closed",
        finalAction: action,
        dateSent: new Date().toLocaleDateString('en-GB')
    };

    setHistory([completedAudit, ...history]); 
    setAudits(prev => prev.filter(a => a.id !== activeAudit.id)); 
    
    setIsFinanceModalOpen(false);
    setActiveAudit(null);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans relative">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8`}>
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 w-full md:w-auto">
             <div className="flex items-center gap-4">
                <button onClick={() => setIsOpen(!isOpen)} className="md:hidden bg-white p-3 rounded-xl shadow-sm text-slate-600 border border-slate-200">
                    <FaBars size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Clearance Hub</h1>
                </div>
             </div>
             
             {/* Scrollable Tabs */}
             <div className="w-full overflow-x-auto pb-1">
                <div className="flex bg-slate-200 p-1 rounded-xl w-fit shadow-inner scale-95 origin-left whitespace-nowrap">
                   <button onClick={() => setActiveTab('active')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Active Audits</button>
                   <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Archive / History</button>
                </div>
             </div>
          </div>
          
          {activeTab === 'active' && (
            <div className="relative group w-full md:w-64 self-end md:self-auto">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={12} />
                <input type="text" placeholder="Search Tenant..." className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 ring-blue-500 shadow-sm" />
            </div>
          )}
        </header>

        {/* --- VIEW: ACTIVE AUDITS --- */}
        {activeTab === 'active' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {audits.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic font-bold">No active clearances.</div>
            ) : (
                audits.map(audit => (
                    <ClearanceCard key={audit.id} data={audit} onOpenModal={() => openFinanceModal(audit)} />
                ))
            )}
            </div>
        )}

        {/* --- VIEW: HISTORY --- */}
        {activeTab === 'history' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                {history.map(item => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 opacity-90 hover:opacity-100 transition-all hover:shadow-md">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="p-3 bg-white rounded-xl text-slate-300 shadow-sm"><FaArchive /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-700 uppercase italic">{item.unit}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.tenant} · Sent {item.dateSent}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Instruction</p>
                                    <span className={`text-sm font-black px-3 py-1 rounded-lg uppercase ${item.finalAction === 'Full Refund' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {item.finalAction}
                                    </span>
                                </div>
                                <button onClick={() => openFinanceModal(item)} className="bg-white border border-slate-200 text-slate-500 p-3 rounded-xl hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                                    <FaEye />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

      </main>

      {/* --- THE FINANCE MEMO MODAL --- */}
      {isFinanceModalOpen && activeAudit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                
                {/* HEADER */}
                <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Finance Instruction</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {activeAudit.status === 'Closed' ? 'Archived Record' : 'Official Deduction Memo'}
                        </p>
                    </div>
                    <button onClick={() => setIsFinanceModalOpen(false)} className="text-slate-500 hover:text-white"><FaTimes size={20}/></button>
                </div>
                
                {/* BODY */}
                <div className="p-6 md:p-8">
                    <div className="flex justify-between items-end border-b border-slate-100 pb-4 mb-4">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tenant</p>
                            <h3 className="text-lg font-black text-slate-900">{activeAudit.tenant}</h3>
                        </div>
                        <div className="text-right">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit</p>
                             <h3 className="text-lg font-black text-blue-600">{activeAudit.unit}</h3>
                        </div>
                    </div>

                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Deduction Breakdown</p>
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
                        {Object.values(activeAudit.checks).filter(c => c.cost > 0).length === 0 ? (
                            <div className="flex items-center gap-3 text-green-600">
                                <FaCheckCircle />
                                <span className="text-xs font-bold uppercase">No Deductions - Full Refund</span>
                            </div>
                        ) : (
                            Object.entries(activeAudit.checks).map(([key, check]) => {
                                if(check.cost <= 0) return null;
                                return (
                                    <div key={key} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase text-slate-500">{key}</span>
                                            <span className="text-[9px] font-bold text-slate-400 italic">({check.note})</span>
                                        </div>
                                        <span className="text-sm font-black text-red-500">R{check.cost.toLocaleString()}</span>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    <div className="mt-6 flex justify-between items-end">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total to Deduct</span>
                        <span className="text-3xl font-black text-slate-900 tracking-tighter">
                            R{Object.values(activeAudit.checks).reduce((acc, curr) => acc + curr.cost, 0).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                    {activeAudit.status === 'Closed' ? (
                        <div className="w-full py-4 bg-slate-200 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 cursor-default">
                            <FaCheckCircle /> <span>Record Archived</span>
                        </div>
                    ) : (
                        <button onClick={sendToFinance} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                            <FaPaperPlane /> <span>Send Memo & Archive</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

/* --- SUB-COMPONENTS --- */
const ClearanceCard = ({ data, onOpenModal }) => {
  const { unit, tenant, exitDate, checks, status } = data;
  const totalDeductions = Object.values(checks).reduce((acc, curr) => acc + curr.cost, 0);
  const isReady = status === 'Ready';
  const isPending = status === 'Pending';
  const statusColor = isReady ? 'bg-green-100 text-green-700' : isPending ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
  const statusIcon = isReady ? <FaCheckCircle /> : isPending ? <FaClock /> : <FaExclamationTriangle />;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom-4">
        <div className="px-6 md:px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><FaUserShield size={20}/></div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{unit}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tenant}</span>
                        <span className="text-slate-300 hidden md:inline">|</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exit: {exitDate}</span>
                    </div>
                </div>
            </div>
            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${statusColor} w-full md:w-auto justify-center md:justify-start`}>
                {statusIcon}
                <span>{status === 'Ready' ? 'Ready for Finance' : status === 'Pending' ? 'Work in Progress' : 'Deductions Found'}</span>
            </div>
        </div>

        {/* RESPONSIVE GRID FOR AUDIT STEPS */}
        <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50">
            <AuditStep icon={<FaKey />} title="Keys" data={checks.keys} />
            <AuditStep icon={<FaClipboardCheck />} title="Inspection" data={checks.inspection} />
            <AuditStep icon={<FaTools />} title="Maintenance" data={checks.maintenance} />
            <AuditStep icon={<FaSoap />} title="Cleaning" data={checks.cleaning} />
        </div>

        <div className="px-6 md:px-8 py-6 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
                 <div className="text-center md:text-left">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Instruction</p>
                    {totalDeductions > 0 ? (
                        <p className="text-2xl font-black text-red-500 italic">Deduct R{totalDeductions.toLocaleString()}</p>
                    ) : (
                        <p className="text-2xl font-black text-green-500 italic">Full Refund</p>
                    )}
                </div>
            </div>
            {isPending ? (
                 <button disabled className="w-full md:w-auto bg-slate-100 text-slate-400 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
                    <FaClock /> <span>Complete Tasks First</span>
                 </button>
            ) : (
                <button onClick={onOpenModal} className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-blue-600 transition-all active:scale-95 group">
                    <FaFileInvoiceDollar size={16} /> <span>Submit to Finance</span> <FaChevronRight className="group-hover:translate-x-1 transition-transform" />
                </button>
            )}
        </div>
    </div>
  );
};

const AuditStep = ({ icon, title, data }) => {
  const isComplete = data.status === 'complete';
  const isIssue = data.status === 'issue';
  return (
    <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden group ${
        isIssue ? 'bg-red-50 border-red-100' : isComplete ? 'bg-white border-slate-100' : 'bg-slate-50 border-dashed border-slate-200'
    }`}>
        <div className="flex justify-between items-start mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                isIssue ? 'bg-red-500 text-white' : isComplete ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-400'
            }`}>{icon}</div>
            {isIssue && <button className="text-[9px] font-bold text-red-500 underline flex items-center gap-1"><FaCamera/> Evidence</button>}
        </div>
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
        <p className={`text-xs font-bold leading-tight ${isIssue ? 'text-red-700' : 'text-slate-700'}`}>{data.note}</p>
        {data.cost > 0 && (
            <div className="mt-3 pt-3 border-t border-red-100 flex justify-between items-center">
                <span className="text-[8px] font-black text-red-400 uppercase">Cost</span>
                <span className="text-xs font-black text-red-600">R{data.cost}</span>
            </div>
        )}
    </div>
  );
};

export default ClearancePage;