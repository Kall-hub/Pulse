"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { 
    FaKey, FaClipboardCheck, FaTools, FaSoap, FaUserShield, 
    FaExclamationTriangle, FaCheckCircle, FaClock,
    FaSearch, FaCamera, FaTimes, FaBars,
    FaEye
} from "react-icons/fa";
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';

const ClearancePage = () => {
  const [isOpen, setIsOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // DATA STATE
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    // MODAL STATES
    const [activeReport, setActiveReport] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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

    const normalizeUnit = (unit) => (unit || '').toUpperCase().trim();

    const toDateValue = (value) => {
        if (!value) return null;
        if (typeof value?.toDate === 'function') return value.toDate();
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const getLatestByDate = (items = []) => {
        if (!items.length) return null;
        return [...items].sort((a, b) => {
            const aDate = toDateValue(a.completedAt || a.updatedAt || a.createdAt || a.date || a.bookedOn || a.serviceDate);
            const bDate = toDateValue(b.completedAt || b.updatedAt || b.createdAt || b.date || b.bookedOn || b.serviceDate);
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return bDate.getTime() - aDate.getTime();
        })[0];
    };

    const extractInspectionIssues = (inspection) => {
        const entries = Object.entries(inspection?.results || {});
        return entries
            .filter(([, data]) => Array.isArray(data.tags) && data.tags.some(tag => ['Maintenance Req', 'Replace', 'Cleaning Req'].includes(tag)))
            .map(([key, data]) => {
                const parts = key.split('-');
                const room = parts[0] || 'General';
                const item = parts.slice(1).join('-') || key;
                return {
                    room,
                    item,
                    tags: data.tags || [],
                    note: data.note || ''
                };
            });
    };

    const buildKeysCheck = (inspection) => {
        if (!inspection?.keys) {
            return { status: 'pending', note: 'No key handover recorded', cost: 0 };
        }
        const setsExpected = Number(inspection.keys.setsExpected || 0);
        const setsReceived = Number(inspection.keys.setsReceived || 0);
        const remotes = inspection.keys.remotes || 'N/A';
        const tags = inspection.keys.tags || 'N/A';

        const status = setsExpected > 0 && setsReceived < setsExpected ? 'issue' : 'complete';
        const note = setsExpected > 0
            ? `Sets ${setsReceived}/${setsExpected} returned · Remotes: ${remotes} · Tags: ${tags}`
            : `Remotes: ${remotes} · Tags: ${tags}`;

        return { status, note, cost: 0 };
    };

    const buildInspectionCheck = (inspection) => {
        if (!inspection) {
            return { status: 'pending', note: 'No inspection record', cost: 0 };
        }
        const issues = extractInspectionIssues(inspection);
        const status = issues.length > 0 ? 'issue' : 'complete';
        const note = issues.length > 0 ? `${issues.length} fault${issues.length === 1 ? '' : 's'} flagged` : 'No faults noted';
        return { status, note, cost: 0 };
    };

    const buildMaintenanceCheck = (tickets) => {
        if (!tickets || tickets.length === 0) {
            return { status: 'complete', note: 'No maintenance logged', cost: 0 };
        }
        const openTickets = tickets.filter(t => !['closed', 'completed', 'done'].includes(String(t.status || '').toLowerCase()));
        const status = openTickets.length > 0 ? 'issue' : 'complete';
        const note = openTickets.length > 0
            ? `${openTickets.length} open job${openTickets.length === 1 ? '' : 's'}`
            : `${tickets.length} job${tickets.length === 1 ? '' : 's'} closed`;
        return { status, note, cost: 0 };
    };

    const buildCleaningCheck = (jobs) => {
        if (!jobs || jobs.length === 0) {
            return { status: 'pending', note: 'No cleaning logged', cost: 0 };
        }
        const pending = jobs.filter(j => String(j.status || '').toLowerCase() !== 'completed');
        const status = pending.length > 0 ? 'pending' : 'complete';
        const note = pending.length > 0
            ? `${pending.length} pending job${pending.length === 1 ? '' : 's'}`
            : `${jobs.length} completed`;
        return { status, note, cost: 0 };
    };

    const buildStatus = (checks) => {
        if (Object.values(checks).some(check => check.status === 'issue')) return 'Action Required';
        if (Object.values(checks).some(check => check.status === 'pending')) return 'Pending';
        return 'Ready';
    };

    const openReportModal = (report) => {
        setActiveReport(report);
        setIsReportModalOpen(true);
    };

    useEffect(() => {
        const fetchClearanceData = async () => {
            try {
                setLoading(true);
                const [clearanceSnap, inspectionsSnap, maintenanceSnap, cleaningsSnap, invoicesSnap] = await Promise.all([
                    getDocs(query(collection(db, 'clearanceReports'), orderBy('createdAt', 'desc'))),
                    getDocs(collection(db, 'inspections')),
                    getDocs(collection(db, 'maintenance')),
                    getDocs(collection(db, 'cleanings')),
                    getDocs(collection(db, 'invoices'))
                ]);

                const clearanceBase = clearanceSnap.docs.map(docItem => ({ reportId: docItem.id, ...docItem.data() }));
                const inspections = inspectionsSnap.docs.map(docItem => ({ id: docItem.id, ...docItem.data() }));
                const maintenance = maintenanceSnap.docs.map(docItem => ({ id: docItem.id, ...docItem.data() }));
                const cleanings = cleaningsSnap.docs.map(docItem => ({ id: docItem.id, ...docItem.data() }));
                const invoices = invoicesSnap.docs.map(docItem => ({ id: docItem.id, ...docItem.data() }));

                const groupByUnit = (items, unitKey = 'unit') => items.reduce((acc, item) => {
                    const unitVal = normalizeUnit(item[unitKey] || item.unit || item.inspectionUnit);
                    if (!unitVal) return acc;
                    if (!acc[unitVal]) acc[unitVal] = [];
                    acc[unitVal].push(item);
                    return acc;
                }, {});

                const inspectionsByUnit = groupByUnit(inspections);
                const maintenanceByUnit = groupByUnit(maintenance);
                const cleaningsByUnit = groupByUnit(cleanings);
                const invoicesByUnit = groupByUnit(invoices);

                const derivedBase = clearanceBase.length > 0
                    ? clearanceBase
                    : Array.from(new Set([
                            ...Object.keys(inspectionsByUnit),
                            ...Object.keys(maintenanceByUnit),
                            ...Object.keys(cleaningsByUnit),
                            ...Object.keys(invoicesByUnit)
                        ])).map(unit => ({ unit }));

                const mappedReports = derivedBase.map(base => {
                    const unit = normalizeUnit(base.unit);
                    const inspectionsForUnit = inspectionsByUnit[unit] || [];
                    const maintenanceForUnit = maintenanceByUnit[unit] || [];
                    const cleaningsForUnit = cleaningsByUnit[unit] || [];
                    const invoicesForUnit = invoicesByUnit[unit] || [];

                    const latestInspection = getLatestByDate(inspectionsForUnit);
                    const keysCheck = buildKeysCheck(latestInspection);
                    const inspectionCheck = buildInspectionCheck(latestInspection);
                    const maintenanceCheck = buildMaintenanceCheck(maintenanceForUnit);
                    const cleaningCheck = buildCleaningCheck(cleaningsForUnit);

                    const totalInvoiced = invoicesForUnit.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
                    const checks = { keys: keysCheck, inspection: inspectionCheck, maintenance: maintenanceCheck, cleaning: cleaningCheck };
                    const status = buildStatus(checks);
                    const issues = extractInspectionIssues(latestInspection);

                    return {
                        reportId: base.reportId || null,
                        unit,
                        tenant: base.tenant || base.tenantName || 'Unknown Tenant',
                        exitDate: base.exitDate || base.exit || base.moveOutDate || 'N/A',
                        status,
                        checks,
                        totalInvoiced,
                        invoices: invoicesForUnit,
                        maintenance: maintenanceForUnit,
                        cleanings: cleaningsForUnit,
                        inspection: latestInspection,
                        inspectionIssues: issues
                    };
                });

                setReports(mappedReports);
            } catch (error) {
                console.error("Error loading clearance tracker:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClearanceData();
    }, []);

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
                                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Clearance Tracker</h1>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Read-only clearance summary · Maintenance, inspection, keys, cleaning, invoicing</p>
                                </div>
                         </div>
                    </div>

                    <div className="relative group w-full md:w-64 self-end md:self-auto">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={12} />
                            <input
                                type="text"
                                placeholder="Search unit or tenant..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 ring-blue-500 shadow-sm"
                            />
                    </div>
                </header>

                {/* --- VIEW: CLEARANCE TRACKER --- */}
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    {loading ? (
                        <div className="text-center py-20 text-slate-400 italic font-bold">Loading clearance data...</div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 italic font-bold">No clearance reports found.</div>
                    ) : (
                        reports
                            .filter(report => {
                                const query = searchQuery.trim().toLowerCase();
                                if (!query) return true;
                                return report.unit?.toLowerCase().includes(query) || report.tenant?.toLowerCase().includes(query);
                            })
                            .map(report => (
                                <ClearanceCard
                                    key={report.reportId || report.unit}
                                    data={report}
                                    onOpenModal={() => openReportModal(report)}
                                />
                            ))
                    )}
                </div>

      </main>

      {/* --- CLEARANCE REPORT MODAL --- */}
      {isReportModalOpen && activeReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">

                {/* HEADER */}
                <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Clearance Report</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeReport.unit} · {activeReport.tenant}</p>
                    </div>
                    <button onClick={() => setIsReportModalOpen(false)} className="text-slate-500 hover:text-white"><FaTimes size={20}/></button>
                </div>

                {/* BODY */}
                <div className="p-6 md:p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tenant</p>
                            <p className="text-sm font-black text-slate-900">{activeReport.tenant}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit</p>
                            <p className="text-sm font-black text-blue-600">{activeReport.unit}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Exit Date</p>
                            <p className="text-sm font-black text-slate-900">{activeReport.exitDate}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Checklist</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AuditStep icon={<FaKey />} title="Keys" data={activeReport.checks.keys} />
                            <AuditStep icon={<FaClipboardCheck />} title="Inspection" data={activeReport.checks.inspection} />
                            <AuditStep icon={<FaTools />} title="Maintenance" data={activeReport.checks.maintenance} />
                            <AuditStep icon={<FaSoap />} title="Cleaning" data={activeReport.checks.cleaning} />
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Invoiced</p>
                                <p className="text-xs text-slate-500 font-bold">Based on invoices linked to this unit</p>
                            </div>
                            <p className="text-2xl font-black text-slate-900">R{activeReport.totalInvoiced.toFixed(0)}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deduct from Deposit</span>
                            <span className="text-2xl font-black text-red-600">R{activeReport.totalInvoiced.toFixed(0)}</span>
                        </div>
                    </div>

                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Inspection Faults Noted</p>
                        {activeReport.inspectionIssues.length === 0 ? (
                            <div className="bg-green-50 text-green-700 rounded-2xl p-4 border border-green-100 text-xs font-bold">No inspection faults recorded.</div>
                        ) : (
                            <div className="space-y-3">
                                {activeReport.inspectionIssues.map((issue, idx) => (
                                    <div key={`${issue.room}-${issue.item}-${idx}`} className="bg-white border border-slate-100 rounded-2xl p-4">
                                        <p className="text-xs font-black text-slate-800">{issue.room} · {issue.item}</p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {issue.tags.map(tag => (
                                                <span key={tag} className="text-[8px] font-black uppercase bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">{tag}</span>
                                            ))}
                                        </div>
                                        {issue.note && <p className="text-[10px] text-slate-500 mt-2">{issue.note}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Maintenance Jobs</p>
                        {activeReport.maintenance.length === 0 ? (
                            <div className="bg-slate-50 text-slate-500 rounded-2xl p-4 border border-slate-100 text-xs font-bold">No maintenance jobs linked.</div>
                        ) : (
                            <div className="space-y-3">
                                {activeReport.maintenance.map(job => (
                                    <div key={job.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-black text-slate-800">{job.issue || 'Maintenance job'}</p>
                                            <p className="text-[10px] text-slate-500">Status: {job.status || 'Unknown'}</p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase text-slate-400">{job.displayId || 'JOB'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Cleaning Jobs</p>
                        {activeReport.cleanings.length === 0 ? (
                            <div className="bg-slate-50 text-slate-500 rounded-2xl p-4 border border-slate-100 text-xs font-bold">No cleaning jobs linked.</div>
                        ) : (
                            <div className="space-y-3">
                                {activeReport.cleanings.map(job => (
                                    <div key={job.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-black text-slate-800">{job.cleaner || 'Cleaner'} · {job.status || 'Unknown'}</p>
                                            <p className="text-[10px] text-slate-500">Booked: {job.bookedOn || job.serviceDate || 'N/A'}</p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase text-slate-400">{job.unit}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Invoices</p>
                        {activeReport.invoices.length === 0 ? (
                            <div className="bg-slate-50 text-slate-500 rounded-2xl p-4 border border-slate-100 text-xs font-bold">No invoices found.</div>
                        ) : (
                            <div className="space-y-3">
                                {activeReport.invoices.map(inv => (
                                    <div key={inv.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-black text-slate-800">{inv.status || 'Draft'} · {inv.date || 'No date'}</p>
                                            <p className="text-[10px] text-slate-500">Items: {(inv.items || []).length}</p>
                                        </div>
                                        <span className="text-sm font-black text-slate-900">R{Number(inv.total || 0).toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                    <button onClick={() => setIsReportModalOpen(false)} className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest">Close</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

/* --- SUB-COMPONENTS --- */
const ClearanceCard = ({ data, onOpenModal }) => {
    const { unit, tenant, exitDate, checks, status, totalInvoiced } = data;
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
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Deduct From Deposit</p>
                    {totalInvoiced > 0 ? (
                        <p className="text-2xl font-black text-red-500 italic">R{totalInvoiced.toLocaleString()}</p>
                    ) : (
                        <p className="text-2xl font-black text-green-500 italic">R0</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button onClick={onOpenModal} className="w-full md:w-auto bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-blue-600 transition-all active:scale-95">
                    <FaEye size={14} /> <span>View Summary</span>
                </button>
            </div>
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