"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import InspectionPicker from '../components/InspectionPicker';
import Loading from './loading';
import SuccessToast from '../components/SuccessToast';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { db, auth } from '../Config/firebaseConfig';
import inspectionLayout from '../Data/inspection_questions';
import { 
  FaCheck, FaTimes, FaPlus, FaBuilding, 
  FaGhost, FaArrowRight, FaTrash, FaSearch, 
  FaCamera, FaCommentAlt, FaBars, FaClipboardList,
  FaCheckCircle, FaExclamationTriangle, FaTimesCircle,
  FaBroom, FaTools, FaQuestionCircle, FaHistory, FaBan, FaKey
} from "react-icons/fa";

const InspectionHub = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState('booked'); 
  const [searchQuery, setSearchQuery] = useState(""); 
  const [userData, setUserData] = useState({ firstName: 'Inspector', lastName: '' }); 
  
  // MODAL STATES
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isGamingOpen, setIsGamingOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);
  const [showSubmitAlert, setShowSubmitAlert] = useState(false);
  const [reportTab, setReportTab] = useState('overview'); // 'overview', 'cleaning', 'maintenance', 'responsibility'
  
  // JOB LOGGING STATES
  const [cleaningJobs, setCleaningJobs] = useState({});
  const [maintenanceJobs, setMaintenanceJobs] = useState({});
  const [showCleaningForm, setShowCleaningForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [cleaningFormData, setCleaningFormData] = useState({ serviceType: 'std', notes: '', contactName: '', time: '' });
  const [maintenanceFormData, setMaintenanceFormData] = useState({ contractor: '', date: '', priority: 'medium', notes: '' });
  const [selectedCleaningItem, setSelectedCleaningItem] = useState(null);
  const [selectedMaintenanceItem, setSelectedMaintenanceItem] = useState(null);
  
  // DATA STATE
  const [inspections, setInspections] = useState([]);
  const [inspectionKeys, setInspectionKeys] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // ENGINE STATE
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeUnit, setActiveUnit] = useState(null);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [results, setResults] = useState({});
  const [customItems, setCustomItems] = useState({});
  const [newItemInput, setNewItemInput] = useState("");
  const [successMessage, setSuccessMessage] = useState(null);

  // KEY HANDOVER STATE
  const [keyData, setKeyData] = useState({
      setsReceived: 0,
      setsExpected: 0,
      remotes: 'Working',
      tags: 'Working'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const inspectionsSnapshot = await getDocs(collection(db, "inspections"));
        const inspectionsData = inspectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInspections(inspectionsData);

        const keysSnapshot = await getDocs(collection(db, "inspectionKeys"));
        const keysData = keysSnapshot.docs.map(doc => doc.data().key);
        setInspectionKeys(keysData);
        setPageLoading(false);
      } catch (error) {
        console.error("Error fetching inspections:", error);
        setPageLoading(false);
      }
    };
    fetchData();

    // Fetch User Data
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "stuff", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              firstName: data.firstName || 'Inspector',
              lastName: data.lastName || ''
            });
            setUserRole(data.role);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // --- ACTIONS ---

  const handleNewBooking = async (bookingData) => {
    const newBooking = {
      unit: bookingData.unit,
      rooms: bookingData.rooms,
      status: 'booked',
      date: bookingData.date,
      time: bookingData.time,
      inspector: bookingData.inspector,
      results: {}
    };
    try {
      const docRef = await addDoc(collection(db, "inspections"), newBooking);
      setInspections([{ id: docRef.id, ...newBooking }, ...inspections]);
      setIsPickerOpen(false);
    } catch (error) {
      console.error("Error adding inspection:", error);
    }
  };

  const deleteInspection = async (inspectionId) => {
    try {
      await deleteDoc(doc(db, "inspections", inspectionId));
      setInspections(prev => prev.filter(x => x.id !== inspectionId));
    } catch (error) {
      console.error("Error deleting inspection:", error);
    }
  };

  const startInspection = (inspection) => {
    setActiveUnit(inspection);
    // Add "Keys" as the first step if not present
    const rooms = ['Keys', ...inspection.rooms.filter(r => r !== 'Keys')];
    setSelectedRooms(rooms);
    setCustomItems({}); 
    setResults(inspection.results || {});
    setKeyData(inspection.keys || { setsReceived: 0, setsExpected: 0, remotes: 'Working', tags: 'Working' });
    setIsGamingOpen(true);
  };

  const getQuestions = (room) => {
    if (room === 'Keys') return {};
    const layout = inspectionLayout[room] || {};
    const qs = { ...layout };
    if (customItems[room] && customItems[room].length > 0) {
      qs["Custom Additions"] = customItems[room];
    }
    return qs;
  };

  const handleAddCustomItem = () => {
    if (!newItemInput.trim()) return;
    const room = selectedRooms[currentIdx];
    setCustomItems(prev => ({ ...prev, [room]: [...(prev[room] || []), newItemInput] }));
    setNewItemInput("");
  };

  const toggleTag = (room, question, tag) => {
    const key = `${room}-${question}`;
    const currentEntry = results[key] || { tags: [], note: '' };
    let newTags = [...currentEntry.tags];

    // Exclusivity rules
    const remove = (arr, list) => arr.filter(t => !list.includes(t));

    if (tag === 'N/A') {
      newTags = ['N/A'];
    } else {
      // remove N/A if selecting something else
      newTags = remove(newTags, ['N/A']);

      if (newTags.includes(tag)) {
        newTags = newTags.filter(t => t !== tag);
      } else {
        switch (tag) {
          case 'Good Condition':
            // Good Condition can coexist with Cleaning Req
            if (newTags.includes('Cleaning Req')) {
              newTags = ['Good Condition', 'Cleaning Req'];
            } else {
              newTags = ['Good Condition'];
            }
            break;
          case 'Replace':
            // Replace is mutually exclusive with everything
            newTags = ['Replace'];
            break;
          case 'Maintenance Req':
            // Maintenance Req is mutually exclusive with everything
            newTags = ['Maintenance Req'];
            break;
          case 'Minor Wear':
            // Minor Wear can coexist with Cleaning Req
            newTags = remove(newTags, ['Replace', 'Maintenance Req']);
            if (!newTags.includes('Minor Wear')) newTags.push('Minor Wear');
            break;
          case 'Cleaning Req':
            // Cleaning Req can coexist with Good Condition and Minor Wear, but not Replace/Maintenance Req
            newTags = remove(newTags, ['Replace', 'Maintenance Req']);
            if (!newTags.includes('Cleaning Req')) newTags.push('Cleaning Req');
            break;
          default:
            newTags.push(tag);
        }
      }
    }

    // Limit to 3 tags max (oldest dropped)
    if (newTags.length > 3) {
      newTags = newTags.slice(newTags.length - 3);
    }

    setResults(prev => ({ ...prev, [key]: { ...prev[key], tags: newTags } }));
  };

  const addNote = (room, question, text) => {
    const key = `${room}-${question}`;
    setResults(prev => ({ ...prev, [key]: { ...prev[key], note: text } }));
  };

  // RESPONSIBILITY MAPPING - Determine who pays
  const getResponsibility = (item, tag) => {
    const ownerItems = ['Water Heater', 'Electrical Panel', 'Gas Meter', 'Structural', 'Roof', 'Foundation', 'Major Plumbing'];
    const tenantItems = ['Broken Window', 'Damaged Door', 'Broken Blinds', 'Stained Carpets', 'Damaged Paint'];
    
    if (ownerItems.some(own => item.toLowerCase().includes(own.toLowerCase()))) return 'Owner';
    if (tenantItems.some(ten => item.toLowerCase().includes(ten.toLowerCase()))) return 'Tenant';
    
    // Default responsibility by issue type
    if (tag === 'Replace') return 'Owner'; // Major issues default to owner
    if (tag === 'Maintenance Req') return 'Owner'; // Maintenance usually owner
    if (tag === 'Cleaning Req') return 'Tenant'; // Cleaning usually tenant
    
    return 'Owner'; // Conservative default
  };

  // JOB LOGGING FUNCTIONS
  const addCleaningJob = async () => {
    if (!selectedCleaningItem || !cleaningFormData.serviceType || !viewingReport?.unit) return;
    
    const jobId = `${viewingReport.id}-cleaning-${Date.now()}`;
    const newJob = {
      id: jobId,
      unit: viewingReport.unit,
      ...selectedCleaningItem,
      ...cleaningFormData,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const zoneTaskName = `${selectedCleaningItem.room} - ${selectedCleaningItem.item}`;
    const payload = {
      unit: viewingReport.unit.toUpperCase(),
      cleaner: cleaningFormData.contactName || 'Unassigned',
      serviceDate: '',
      time: cleaningFormData.time || '',
      zones: [
        {
          id: 'inspection',
          name: 'Inspection Items',
          tasks: [{ name: zoneTaskName, level: cleaningFormData.serviceType || 'std', done: false }]
        }
      ],
      bookedOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase(),
      status: 'Booked',
      fromInspection: true,
      inspectionUnit: viewingReport.unit.toUpperCase(),
      inspectionId: viewingReport.id,
      notes: cleaningFormData.notes || ''
    };
    
    try {
      const docRef = await addDoc(collection(db, "cleanings"), payload);
      setCleaningJobs(prev => ({ ...prev, [docRef.id]: { ...newJob, id: docRef.id } }));
      setShowCleaningForm(false);
      setCleaningFormData({ serviceType: 'std', notes: '', contactName: '', time: '' });
      setSelectedCleaningItem(null);
    } catch (error) {
      console.error("Error booking cleaning from inspection:", error);
      alert("Failed to book cleaning. Please retry.");
    }
  };

  const addMaintenanceJob = async () => {
    if (!selectedMaintenanceItem || !maintenanceFormData.contractor || !maintenanceFormData.date || !viewingReport?.unit) return;
    
    const jobId = `${viewingReport.id}-maintenance-${Date.now()}`;
    const newJob = {
      id: jobId,
      unit: viewingReport.unit,
      ...selectedMaintenanceItem,
      ...maintenanceFormData,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const issueSummary = `${selectedMaintenanceItem.room}: ${selectedMaintenanceItem.item}`;
    const payload = {
      unit: viewingReport.unit.toUpperCase(),
      status: 'request',
      issue: issueSummary,
      rawFaults: [
        {
          area: selectedMaintenanceItem.room,
          description: selectedMaintenanceItem.item,
          note: maintenanceFormData.notes || selectedMaintenanceItem.data?.note || ''
        }
      ],
      loggedAt: new Date().toLocaleString(),
      createdAt: serverTimestamp(),
      areas: [selectedMaintenanceItem.room],
      displayId: `REQ-${Math.floor(Math.random() * 900) + 100}`,
      requestedContractor: maintenanceFormData.contractor,
      requestedDate: maintenanceFormData.date,
      requestedPriority: maintenanceFormData.priority || 'medium'
    };
    
    try {
      const docRef = await addDoc(collection(db, "maintenance"), payload);
      setMaintenanceJobs(prev => ({ ...prev, [docRef.id]: { ...newJob, id: docRef.id } }));
      setShowMaintenanceForm(false);
      setMaintenanceFormData({ contractor: '', date: '', priority: 'medium', notes: '' });
      setSelectedMaintenanceItem(null);
    } catch (error) {
      console.error("Error booking maintenance from inspection:", error);
      alert("Failed to book maintenance. Please retry.");
    }
  };

  const deleteJob = (jobId, type) => {
    if (type === 'cleaning') {
      setCleaningJobs(prev => {
        const updated = { ...prev };
        delete updated[jobId];
        return updated;
      });
    } else {
      setMaintenanceJobs(prev => {
        const updated = { ...prev };
        delete updated[jobId];
        return updated;
      });
    }
  };

  const finalizeInspection = async () => {
    setShowSubmitAlert(true);
  };

  const confirmFinalize = async () => {
    try {
      if (activeUnit?.id) {
        await updateDoc(doc(db, "inspections", activeUnit.id), {
          status: 'completed',
          results: results,
          keys: keyData
        });
      }
      setInspections(prev => prev.map(ins => 
        ins.id === activeUnit.id ? { ...ins, status: 'completed', results: results, keys: keyData } : ins
      ));
      setShowSubmitAlert(false);
      closeGame();
    } catch (error) {
      console.error("Error finalizing inspection:", error);
      alert("Failed to submit inspection. Please retry.");
    }
  };

  const closeGame = () => {
    if(Object.keys(results).length > 0 && !confirm("Exit without submitting?")) return;
    setIsGamingOpen(false);
    setResults({});
    setCurrentIdx(0);
    setActiveUnit(null);
  };

  const filteredInspections = inspections
    .filter(i => i.status === filter)
    .filter(i => i.unit.toLowerCase().includes(searchQuery.toLowerCase()));

  const STATUS_OPTIONS = [
    { label: "Good Condition", color: "bg-green-500", icon: <FaCheckCircle/> },
    { label: "Cleaning Req", color: "bg-blue-500", icon: <FaBroom/> },
    { label: "Minor Wear", color: "bg-yellow-500", icon: <FaHistory/> },
    { label: "Maintenance Req", color: "bg-orange-500", icon: <FaTools/> },
    { label: "Replace", color: "bg-red-600", icon: <FaTimesCircle/> },
    { label: "N/A", color: "bg-slate-400", icon: <FaBan/> }, 
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      
      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8`}>
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsOpen(true)} className="md:hidden bg-white p-3 rounded-xl shadow-sm text-slate-600 border border-slate-200"><FaBars /></button>
             <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Inspections</h1>
               <div className="bg-slate-200 p-1 rounded-xl flex scale-90 origin-left mt-2 shadow-inner w-fit">
                 {['booked', 'completed'].map(type => (
                   <button key={type} onClick={() => setFilter(type)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{type}</button>
                 ))}
               </div>
             </div>
          </div>
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={12} />
              <input type="text" placeholder="Search Unit..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 ring-blue-500 shadow-sm" />
            </div>
            {(userRole === 'Agent' || userRole === 'Maintenance Admin') && (
              <button onClick={() => setIsPickerOpen(true)} className="bg-slate-900 text-white py-3.5 px-6 rounded-2xl shadow-xl flex items-center space-x-3 active:scale-95 border-b-4 border-blue-600 shrink-0 hover:bg-slate-800 transition-all">
                <FaPlus size={12} /> <span className="text-[10px] font-black uppercase tracking-widest">Book</span>
              </button>
            )}
          </div>
        </header>

        {/* LISTING VIEW */}
        {pageLoading ? (
          <Loading />
        ) : filteredInspections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-300">
            <FaGhost size={60} className="mb-4 opacity-20" />
            <h3 className="text-sm font-black uppercase italic tracking-widest text-center">No records found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInspections.map(ins => (
              <div key={ins.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative group overflow-hidden hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg"><FaClipboardList size={14}/></div>
                  <div className="text-right">
                     <span className="block text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase italic mb-1">{ins.date} {ins.time && `@ ${ins.time}`}</span>
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Insp: {ins.inspector || `${userData.firstName} ${userData.lastName}`.trim()}</span>
                  </div>
                </div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{ins.unit}</h2>
                <div className="flex flex-wrap gap-1 mt-3">
                    {ins.rooms.slice(0, 3).map(r => <span key={r} className="text-[7px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase">{r}</span>)}
                    {ins.rooms.length > 3 && <span className="text-[7px] font-black text-slate-400">+{ins.rooms.length - 3}</span>}
                </div>
                <div className="mt-8 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <button onClick={() => { if(confirm("Delete?")) deleteInspection(ins.id)}} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><FaTrash size={12}/></button>
                  {filter === 'booked' ? (
                    <button onClick={() => startInspection(ins)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                      <span>Start Mission</span> <FaArrowRight />
                    </button>
                  ) : (
                    <button onClick={() => setViewingReport(ins)} className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">View Report</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <InspectionPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSubmit={handleNewBooking} />

      {/* SUBMIT ALERT CARD */}
      {showSubmitAlert && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full animate-in scale-in-95 space-y-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto">
              <FaCheckCircle className="text-blue-600" size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black uppercase italic text-slate-900 mb-2">Submit Report?</h3>
              <p className="text-sm text-slate-600 font-bold">This action cannot be undone. All inspection data will be saved.</p>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setShowSubmitAlert(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmFinalize}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW REPORT MODAL */}
      {viewingReport && (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-[90vh]">
            <header className="flex justify-between items-center p-6 md:p-8 bg-white border-b border-slate-100 shadow-sm shrink-0">
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{viewingReport?.unit}</p>
                <h2 className="text-2xl md:text-3xl font-black italic uppercase text-slate-900">Inspection Report</h2>
              </div>
              <button onClick={() => { setViewingReport(null); setReportTab('overview'); }} className="bg-slate-100 p-3 rounded-full text-slate-400 hover:bg-red-500 hover:text-white transition-colors"><FaTimes size={16} /></button>
            </header>
            
            {/* REPORT TABS */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex gap-2 flex-wrap shrink-0">
              <button 
                onClick={() => setReportTab('overview')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                🔑 Overview
              </button>
              {viewingReport?.results && Object.entries(viewingReport.results).some(([, data]) => data.tags?.includes('Cleaning Req')) && (
                <button 
                  onClick={() => setReportTab('cleaning')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportTab === 'cleaning' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                  🧹 Cleaning
                </button>
              )}
              {viewingReport?.results && Object.entries(viewingReport.results).some(([, data]) => data.tags?.some(t => ['Maintenance Req', 'Replace'].includes(t))) && (
                <button 
                  onClick={() => setReportTab('maintenance')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportTab === 'maintenance' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                  🔧 Maintenance
                </button>
              )}
              {viewingReport?.results && Object.entries(viewingReport.results).some(([, data]) => data.tags?.some(t => ['Maintenance Req', 'Replace', 'Cleaning Req'].includes(t))) && (
                <button 
                  onClick={() => setReportTab('responsibility')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportTab === 'responsibility' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                  👤 Accountability
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
              
              {/* OVERVIEW TAB */}
              {reportTab === 'overview' && (
                <>
                  {/* KEY SUMMARY */}
                  {viewingReport?.keys && (
                    <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100">
                      <h3 className="text-lg font-black uppercase italic text-blue-900 mb-4 flex items-center gap-2"><FaKey /> Key Handover Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Sets Received</p>
                          <p className="text-2xl font-black text-slate-900">{viewingReport.keys.setsReceived || 0}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Sets Expected</p>
                          <p className="text-2xl font-black text-slate-900">{viewingReport.keys.setsExpected || 0}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Remotes</p>
                          <p className="text-sm font-black text-slate-900">{viewingReport.keys.remotes || 'N/A'}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Tags/Fobs</p>
                          <p className="text-sm font-black text-slate-900">{viewingReport.keys.tags || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* FULL ROOM-BY-ROOM RESULTS */}
                  {viewingReport?.rooms && viewingReport.rooms.map(room => {
                    const roomResults = Object.entries(viewingReport.results || {}).filter(([key]) => key.startsWith(room + '-'));
                    if (roomResults.length === 0) return null;
                    return (
                      <div key={room} className="space-y-3">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
                          <h3 className="text-xl font-black uppercase italic text-slate-900">{room}</h3>
                        </div>
                        {roomResults.map(([key, data]) => {
                          const question = key.split('-').slice(1).join('-');
                          return (
                            <div key={key} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <div className="flex justify-between items-start gap-4 mb-3">
                                <p className="text-sm font-bold text-slate-800">{question}</p>
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {data.tags && data.tags.map(tag => {
                                    const tagOpt = STATUS_OPTIONS.find(o => o.label === tag);
                                    return (
                                      <span key={tag} className={`${tagOpt?.color || 'bg-slate-400'} text-white text-[8px] font-black px-2 py-1 rounded-lg flex items-center gap-1`}>
                                        {tagOpt?.icon} {tag}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                              {data.note && <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">📝 {data.note}</p>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
              
              {/* CLEANING REPORT TAB */}
              {reportTab === 'cleaning' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-12 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-black uppercase italic text-slate-900">🧹 Cleaning Required</h2>
                      <p className="text-xs text-slate-500 font-bold">Items that need cleaning service</p>
                    </div>
                    {viewingReport?.results && Object.entries(viewingReport.results).some(([, data]) => data.tags?.includes('Cleaning Req')) && !Object.values(cleaningJobs).some(j => !j.id) && (
                      <button
                        onClick={async () => {
                          const cleaningItems = [];
                          viewingReport?.rooms?.forEach(room => {
                            Object.entries(viewingReport.results || {})
                              .filter(([key, data]) => key.startsWith(room + '-') && data.tags?.includes('Cleaning Req'))
                              .forEach(([key]) => {
                                const item = key.split('-').slice(1).join('-');
                                cleaningItems.push({ room, item });
                              });
                          });
                          
                          if (window.bookCleaningFromInspection) {
                            const result = await window.bookCleaningFromInspection(viewingReport.unit, cleaningItems);
                            if (result.success) {
                              setSuccessMessage("Cleaning job booked! Go to Housekeeping to schedule date/time.");
                            } else {
                              setSuccessMessage(`Error: ${result.error}`);
                            }
                          }
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all shrink-0 whitespace-nowrap"
                      >
                        📋 Book All Cleaning
                      </button>
                    )}
                  </div>
                  
                  {/* SCHEDULED CLEANING JOBS */}
                  {Object.keys(cleaningJobs).length > 0 && (
                    <div className="bg-green-50 p-5 rounded-2xl border border-green-200">
                      <h3 className="text-sm font-black text-green-900 mb-4">✅ Scheduled Cleaning ({Object.keys(cleaningJobs).length})</h3>
                      <div className="space-y-3">
                        {Object.values(cleaningJobs).map(job => (
                          <div key={job.id} className="bg-white p-3 rounded-xl border border-green-100 flex justify-between items-start">
                            <div>
                              <p className="text-xs font-black text-slate-900">{job.room} - {job.item}</p>
                              <p className="text-[10px] text-slate-600">Type: <span className="font-black">{job.serviceType === 'std' ? 'Standard' : job.serviceType === 'deep' ? 'Deep Clean' : 'Quick'}</span></p>
                              <p className="text-[10px] text-slate-600">Contact: <span className="font-black">{job.contactName || 'TBD'}</span> {job.time && `at ${job.time}`}</p>
                            </div>
                            <button onClick={() => deleteJob(job.id, 'cleaning')} className="text-slate-300 hover:text-red-500 transition-colors"><FaTimes size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* ITEMS TO SCHEDULE */}
                  {viewingReport?.rooms && viewingReport.rooms.map(room => {
                    const cleaningItems = Object.entries(viewingReport.results || {})
                      .filter(([key, data]) => key.startsWith(room + '-') && data.tags?.includes('Cleaning Req'))
                      .filter(([key, data]) => !Object.values(cleaningJobs).some(j => j.room === room && j.item === key.split('-').slice(1).join('-')));
                    
                    if (cleaningItems.length === 0) return null;
                    
                    return (
                      <div key={room} className="space-y-3">
                        <h3 className="text-lg font-black text-slate-900 mt-6 mb-3">{room}</h3>
                        {cleaningItems.map(([key, data]) => {
                          const item = key.split('-').slice(1).join('-');
                          return (
                            <div key={key} className="bg-blue-50 p-5 rounded-2xl border border-blue-200 shadow-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm font-black text-slate-900 leading-relaxed">
                                    The <span className="text-blue-600">{item.toLowerCase()}</span> in the <span className="text-blue-600">{room.toLowerCase()}</span> requires <span className="font-black text-blue-600">cleaning</span>.
                                  </p>
                                  {data.note && <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-blue-200">📝 {data.note}</p>}
                                </div>
                                <button 
                                  onClick={() => { setSelectedCleaningItem({ room, item, data }); setShowCleaningForm(true); }}
                                  className="ml-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase hover:bg-blue-700 transition-all shrink-0"
                                >
                                  Schedule
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* MAINTENANCE/REPLACE REPORT TAB */}
              {reportTab === 'maintenance' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-12 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-black uppercase italic text-slate-900">🔧 Maintenance/Replace Required</h2>
                      <p className="text-xs text-slate-500 font-bold">Items that need professional service</p>
                    </div>
                    {viewingReport?.results && Object.entries(viewingReport.results).some(([, data]) => data.tags?.some(t => ['Maintenance Req', 'Replace'].includes(t))) && (
                      <button
                        onClick={async () => {
                          const maintenanceItems = [];
                          viewingReport?.rooms?.forEach(room => {
                            Object.entries(viewingReport.results || {})
                              .filter(([key, data]) => key.startsWith(room + '-') && data.tags?.some(t => ['Maintenance Req', 'Replace'].includes(t)))
                              .forEach(([key, data]) => {
                                const item = key.split('-').slice(1).join('-');
                                const status = data.tags?.find(t => ['Maintenance Req', 'Replace'].includes(t));
                                maintenanceItems.push({ room, item, status });
                              });
                          });
                          
                          if (window.bookMaintenanceFromInspection) {
                            const result = await window.bookMaintenanceFromInspection(viewingReport.unit, maintenanceItems);
                            if (result.success) {
                              setSuccessMessage("Maintenance request created! Go to Maintenance to assign contractor and priority.");
                            } else {
                              setSuccessMessage(`Error: ${result.error}`);
                            }
                          }
                        }}
                        className="bg-orange-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-orange-700 transition-all shrink-0 whitespace-nowrap"
                      >
                        📋 Book All Maintenance
                      </button>
                    )}
                  </div>
                  
                  {/* SCHEDULED JOBS */}
                  {Object.keys(maintenanceJobs).length > 0 && (
                    <div className="bg-green-50 p-5 rounded-2xl border border-green-200">
                      <h3 className="text-sm font-black text-green-900 mb-4">✅ Scheduled Jobs ({Object.keys(maintenanceJobs).length})</h3>
                      <div className="space-y-3">
                        {Object.values(maintenanceJobs).map(job => (
                          <div key={job.id} className="bg-white p-3 rounded-xl border border-green-100 flex justify-between items-start">
                            <div>
                              <p className="text-xs font-black text-slate-900">{job.room} - {job.item}</p>
                              <p className="text-[10px] text-slate-600">Contractor: <span className="font-black">{job.contractor}</span></p>
                              <p className="text-[10px] text-slate-600">Date: <span className="font-black">{job.date}</span> | Priority: <span className={`font-black ${job.priority === 'high' ? 'text-red-600' : job.priority === 'medium' ? 'text-orange-600' : 'text-blue-600'}`}>{job.priority}</span></p>
                            </div>
                            <button onClick={() => deleteJob(job.id, 'maintenance')} className="text-slate-300 hover:text-red-500 transition-colors"><FaTimes size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* ITEMS TO SCHEDULE */}
                  {viewingReport?.rooms && viewingReport.rooms.map(room => {
                    const maintenanceItems = Object.entries(viewingReport.results || {})
                      .filter(([key, data]) => key.startsWith(room + '-') && data.tags?.some(t => ['Maintenance Req', 'Replace'].includes(t)))
                      .filter(([key, data]) => !Object.values(maintenanceJobs).some(j => j.room === room && j.item === key.split('-').slice(1).join('-')));
                    
                    if (maintenanceItems.length === 0) return null;
                    
                    return (
                      <div key={room} className="space-y-3">
                        <h3 className="text-lg font-black text-slate-900 mt-6 mb-3">{room}</h3>
                        {maintenanceItems.map(([key, data]) => {
                          const item = key.split('-').slice(1).join('-');
                          const status = data.tags?.find(t => ['Maintenance Req', 'Replace'].includes(t));
                          const statusColor = status === 'Replace' ? 'text-red-600' : 'text-orange-600';
                          
                          return (
                            <div key={key} className={`${status === 'Replace' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'} p-5 rounded-2xl border shadow-sm`}>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="text-sm font-black text-slate-900 leading-relaxed">
                                    The <span className={`${statusColor}`}>{item.toLowerCase()}</span> in the <span className={`${statusColor}`}>{room.toLowerCase()}</span> requires <span className={`font-black ${statusColor}`}>{status === 'Replace' ? 'replacement' : 'maintenance'}</span>.
                                  </p>
                                  {data.note && <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-current opacity-50">📝 {data.note}</p>}
                                </div>
                                <button 
                                  onClick={() => { setSelectedMaintenanceItem({ room, item, status, data }); setShowMaintenanceForm(true); }}
                                  className="ml-4 bg-orange-600 text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase hover:bg-orange-700 transition-all shrink-0"
                                >
                                  Schedule
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* ACCOUNTABILITY TAB */}
              {reportTab === 'responsibility' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-12 bg-purple-500 rounded-full"></div>
                    <div>
                      <h2 className="text-2xl font-black uppercase italic text-slate-900">👤 Accountability</h2>
                      <p className="text-xs text-slate-500 font-bold">Who is responsible for each issue</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 text-center">
                      <p className="text-3xl font-black text-blue-600 mb-2">
                        {viewingReport?.rooms && viewingReport.rooms.reduce((acc, room) => {
                          const roomItems = Object.entries(viewingReport.results || {})
                            .filter(([key, data]) => key.startsWith(room + '-') && data.tags?.some(t => ['Maintenance Req', 'Replace', 'Cleaning Req'].includes(t))
                              && getResponsibility(key.split('-').slice(1).join('-'), data.tags?.find(t => ['Maintenance Req', 'Replace', 'Cleaning Req'].includes(t))) === 'Owner');
                          return acc + roomItems.length;
                        }, 0)}
                      </p>
                      <p className="text-xs font-black text-blue-900 uppercase">Owner Issues</p>
                    </div>
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 text-center">
                      <p className="text-3xl font-black text-amber-600 mb-2">
                        {viewingReport?.rooms && viewingReport.rooms.reduce((acc, room) => {
                          const roomItems = Object.entries(viewingReport.results || {})
                            .filter(([key, data]) => key.startsWith(room + '-') && data.tags?.some(t => ['Maintenance Req', 'Replace', 'Cleaning Req'].includes(t))
                              && getResponsibility(key.split('-').slice(1).join('-'), data.tags?.find(t => ['Maintenance Req', 'Replace', 'Cleaning Req'].includes(t))) === 'Tenant');
                          return acc + roomItems.length;
                        }, 0)}
                      </p>
                      <p className="text-xs font-black text-amber-900 uppercase">Tenant Issues</p>
                    </div>
                  </div>
                  
                  {viewingReport?.rooms && viewingReport.rooms.map(room => {
                    const ownerItems = Object.entries(viewingReport.results || {})
                      .filter(([key, data]) => key.startsWith(room + '-') && data.tags?.some(t => ['Maintenance Req', 'Replace', 'Cleaning Req'].includes(t))
                        && getResponsibility(key.split('-').slice(1).join('-'), data.tags?.find(t => ['Maintenance Req', 'Replace', 'Cleaning Req'].includes(t))) === 'Owner');
                    
                    const tenantItems = Object.entries(viewingReport.results || {})
                      .filter(([key, data]) => key.startsWith(room + '-') && data.tags?.some(t => ['Maintenance Req', 'Replace', 'Cleaning Req'].includes(t))
                        && getResponsibility(key.split('-').slice(1).join('-'), data.tags?.find(t => ['Maintenance Req', 'Replace', 'Cleaning Req'].includes(t))) === 'Tenant');
                    
                    if (ownerItems.length === 0 && tenantItems.length === 0) return null;
                    
                    return (
                      <div key={room} className="space-y-4">
                        <h3 className="text-lg font-black text-slate-900 mt-6 mb-3">{room}</h3>
                        
                        {ownerItems.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-black text-blue-600 uppercase">👨‍⚙️ Owner Responsibility</p>
                            {ownerItems.map(([key, data]) => {
                              const item = key.split('-').slice(1).join('-');
                              return (
                                <div key={key} className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                  <p className="text-sm font-bold text-slate-900">{item}</p>
                                  <p className="text-xs text-blue-700 mt-1">{data.tags?.join(', ')}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {tenantItems.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-black text-amber-600 uppercase">👤 Tenant Responsibility</p>
                            {tenantItems.map(([key, data]) => {
                              const item = key.split('-').slice(1).join('-');
                              return (
                                <div key={key} className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                                  <p className="text-sm font-bold text-slate-900">{item}</p>
                                  <p className="text-xs text-amber-700 mt-1">{data.tags?.join(', ')}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            
            {/* CLEANING JOB FORM MODAL */}
            {showCleaningForm && selectedCleaningItem && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[2.5rem] overflow-hidden">
                <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full space-y-4">
                  <div>
                    <p className="text-xs font-black text-blue-600 uppercase">Schedule Cleaning</p>
                    <h3 className="text-lg font-black text-slate-900">{selectedCleaningItem.item}</h3>
                    <p className="text-xs text-slate-600">{selectedCleaningItem.room}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-black text-slate-700 uppercase block mb-1">Service Type</label>
                      <select 
                        value={cleaningFormData.serviceType}
                        onChange={(e) => setCleaningFormData({...cleaningFormData, serviceType: e.target.value})}
                        className="w-full bg-slate-100 p-2 rounded-lg text-xs font-bold outline-none focus:ring-2 ring-blue-500"
                      >
                        <option value="std">Standard Cleaning</option>
                        <option value="deep">Deep Clean</option>
                        <option value="quick">Quick Clean</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs font-black text-slate-700 uppercase block mb-1">Contact Name</label>
                      <input 
                        type="text" 
                        placeholder="Cleaner name" 
                        value={cleaningFormData.contactName}
                        onChange={(e) => setCleaningFormData({...cleaningFormData, contactName: e.target.value})}
                        className="w-full bg-slate-100 p-2 rounded-lg text-xs font-bold outline-none focus:ring-2 ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-black text-slate-700 uppercase block mb-1">Time</label>
                      <input 
                        type="time" 
                        value={cleaningFormData.time}
                        onChange={(e) => setCleaningFormData({...cleaningFormData, time: e.target.value})}
                        className="w-full bg-slate-100 p-2 rounded-lg text-xs font-bold outline-none focus:ring-2 ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-black text-slate-700 uppercase block mb-1">Notes (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="Additional details..." 
                        value={cleaningFormData.notes}
                        onChange={(e) => setCleaningFormData({...cleaningFormData, notes: e.target.value})}
                        className="w-full bg-slate-100 p-2 rounded-lg text-xs font-bold outline-none focus:ring-2 ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <button 
                      onClick={() => setShowCleaningForm(false)}
                      className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-black uppercase text-[9px] hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={addCleaningJob}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-black uppercase text-[9px] hover:bg-blue-700"
                    >
                      Schedule Job
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* MAINTENANCE JOB FORM MODAL */}
            {showMaintenanceForm && selectedMaintenanceItem && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[2.5rem] overflow-hidden">
                <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full space-y-4">
                  <div>
                    <p className="text-xs font-black text-orange-600 uppercase">Schedule Maintenance</p>
                    <h3 className="text-lg font-black text-slate-900">{selectedMaintenanceItem.item}</h3>
                    <p className="text-xs text-slate-600">{selectedMaintenanceItem.room}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-black text-slate-700 uppercase block mb-1">Contractor</label>
                      <input 
                        type="text" 
                        placeholder="Contractor name" 
                        value={maintenanceFormData.contractor}
                        onChange={(e) => setMaintenanceFormData({...maintenanceFormData, contractor: e.target.value})}
                        className="w-full bg-slate-100 p-2 rounded-lg text-xs font-bold outline-none focus:ring-2 ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-black text-slate-700 uppercase block mb-1">Date</label>
                      <input 
                        type="date" 
                        value={maintenanceFormData.date}
                        onChange={(e) => setMaintenanceFormData({...maintenanceFormData, date: e.target.value})}
                        className="w-full bg-slate-100 p-2 rounded-lg text-xs font-bold outline-none focus:ring-2 ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-black text-slate-700 uppercase block mb-1">Priority</label>
                      <select 
                        value={maintenanceFormData.priority}
                        onChange={(e) => setMaintenanceFormData({...maintenanceFormData, priority: e.target.value})}
                        className="w-full bg-slate-100 p-2 rounded-lg text-xs font-bold outline-none focus:ring-2 ring-orange-500"
                      >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs font-black text-slate-700 uppercase block mb-1">Notes (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="Additional details..." 
                        value={maintenanceFormData.notes}
                        onChange={(e) => setMaintenanceFormData({...maintenanceFormData, notes: e.target.value})}
                        className="w-full bg-slate-100 p-2 rounded-lg text-xs font-bold outline-none focus:ring-2 ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <button 
                      onClick={() => setShowMaintenanceForm(false)}
                      className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-black uppercase text-[9px] hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={addMaintenanceJob}
                      className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-black uppercase text-[9px] hover:bg-orange-700"
                    >
                      Schedule Job
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- GAMING ENGINE --- */}
      {isGamingOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-[90vh]">
               <div className="flex flex-col h-full bg-[#F8FAFC]">
                  
                  {/* HEADER */}
                  <header className="flex justify-between items-center p-6 md:p-8 bg-white border-b border-slate-100 shadow-sm shrink-0">
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{activeUnit?.unit}</p>
                      <h2 className="text-2xl md:text-3xl font-black italic uppercase text-slate-900">{selectedRooms[currentIdx]}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-xs font-black text-slate-300">{currentIdx + 1} / {selectedRooms.length}</p>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${((currentIdx + 1) / selectedRooms.length) * 100}%` }}></div>
                            </div>
                        </div>
                        <button onClick={closeGame} className="bg-slate-100 p-3 rounded-full text-slate-400 hover:bg-red-500 hover:text-white transition-colors"><FaTimes size={16} /></button>
                    </div>
                  </header>
                  
                  {/* SCROLL AREA */}
                  <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                     
                     {/* SPECIAL KEY HANDOVER SCREEN */}
                     {selectedRooms[currentIdx] === 'Keys' ? (
                        <div className="space-y-6">
                            

[Image of Keys]

                            <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100">
                                <h3 className="text-lg font-black uppercase italic text-blue-900 mb-4 flex items-center gap-2"><FaKey /> Key Handover Audit</h3>
                                
                                {/* SETS COUNTER */}
                                <div className="bg-white p-4 rounded-2xl mb-4 flex justify-between items-center shadow-sm">
                                    <span className="text-xs font-bold uppercase text-slate-500">Sets Received</span>
                                    <input 
                                        type="number" 
                                        value={keyData.setsReceived} 
                                        onChange={(e) => setKeyData({...keyData, setsReceived: parseInt(e.target.value) || 0})} 
                                        className="w-16 text-center text-xl font-black text-slate-900 border rounded-lg px-2 py-1" 
                                        min="0"
                                    />
                                </div>

                                {/* EXPECTED */}
                                <div className="bg-white p-4 rounded-2xl mb-4 flex justify-between items-center shadow-sm">
                                    <span className="text-xs font-bold uppercase text-slate-500">Sets Expected</span>
                                    <input 
                                        type="number" 
                                        value={keyData.setsExpected} 
                                        onChange={(e) => setKeyData({...keyData, setsExpected: parseInt(e.target.value) || 0})} 
                                        className="w-16 text-center text-xl font-black text-slate-900 border rounded-lg px-2 py-1" 
                                        min="0"
                                    />
                                </div>

                                {/* REMOTES */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Remotes</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {['Working', 'Dead', 'Missing', 'N/A'].map(status => (
                                                <button key={status} onClick={() => setKeyData({...keyData, remotes: status})} 
                                                    className={`py-2 text-[8px] font-black uppercase rounded-lg border ${keyData.remotes === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'} ${status === 'N/A' ? 'line-through' : ''}`}>
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Tags/Fobs</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {['Working', 'Dead', 'Missing', 'N/A'].map(status => (
                                                <button key={status} onClick={() => setKeyData({...keyData, tags: status})} 
                                                    className={`py-2 text-[8px] font-black uppercase rounded-lg border ${keyData.tags === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'} ${status === 'N/A' ? 'line-through' : ''}`}>
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                     ) : (
                        // STANDARD INSPECTION QUESTIONS
                        Object.entries(getQuestions(selectedRooms[currentIdx])).map(([category, questions]) => (
                            <div key={category} className="space-y-3">
                               <div className="flex items-center gap-2 ml-2">
                                   <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{category}</p>
                               </div>
                               
                               {questions.map(q => {
                                 const key = `${selectedRooms[currentIdx]}-${q}`;
                                 const activeTags = results[key]?.tags || [];
                                 const isNA = activeTags.includes('N/A');
                                 const hasNegative = activeTags.some(t => ['Maintenance Req', 'Replace', 'Minor Wear', 'Can\'t Verify'].includes(t));

                                 return (
                                   <div key={q} className={`bg-white p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md ${isNA ? 'opacity-50 border-slate-100 bg-slate-50' : 'border-slate-100'}`}>
                                      <div className="flex flex-col gap-4">
                                          <span className={`text-xs font-black uppercase ${isNA ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{q}</span>
                                          
                                          <div className="flex flex-wrap gap-2">
                                             {STATUS_OPTIONS.map(opt => {
                                               const isActive = activeTags.includes(opt.label);
                                               return (
                                                  <button key={opt.label} onClick={() => toggleTag(selectedRooms[currentIdx], q, opt.label)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all active:scale-95
                                                      ${isActive 
                                                        ? `${opt.color} text-white border-transparent shadow-md` 
                                                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                                                      }`}>
                                                     {opt.icon} <span>{opt.label}</span>
                                                  </button>
                                               )
                                             })}
                                          </div>
                                      </div>

                                      {hasNegative && !isNA && (
                                         <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <FaCommentAlt className="absolute top-3 left-3 text-slate-300" size={10} />
                                                    <input placeholder="Add details / notes..." className="w-full bg-slate-50 pl-8 pr-4 py-3 rounded-xl text-[10px] font-bold uppercase text-slate-700 outline-none focus:ring-1 ring-slate-200"
                                                        onChange={(e) => addNote(selectedRooms[currentIdx], q, e.target.value)} />
                                                </div>
                                                <button className="bg-slate-900 text-white px-5 rounded-xl hover:bg-blue-600 transition-colors shadow-lg active:scale-95"><FaCamera size={14} /></button>
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                 );
                               })}
                            </div>
                         ))
                     )}

                     {selectedRooms[currentIdx] !== 'Keys' && (
                        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 border-dashed">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3">Flexibility: Missing Something?</p>
                            <div className="flex gap-2">
                                <input value={newItemInput} onChange={(e) => setNewItemInput(e.target.value)} placeholder="E.g. Vintage Chandelier" className="flex-1 bg-white p-4 rounded-xl text-xs font-bold outline-none border border-blue-100 focus:ring-2 ring-blue-500" onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()} />
                                <button onClick={handleAddCustomItem} className="bg-blue-600 text-white px-6 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-colors"><FaPlus /> Add</button>
                            </div>
                        </div>
                     )}
                     
                     <div className="h-24"></div>
                  </div>

                  {/* FOOTER */}
                  <div className="p-6 bg-white border-t border-slate-200 flex gap-4 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
                     <button disabled={currentIdx === 0} onClick={() => setCurrentIdx(currentIdx - 1)} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-0 hover:bg-slate-200 transition-all">Back</button>
                     <button onClick={() => currentIdx === selectedRooms.length - 1 ? finalizeInspection() : setCurrentIdx(currentIdx + 1)} className="flex-2 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-500/10 active:scale-95 hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                        {currentIdx === selectedRooms.length - 1 ? "Submit Report" : "Next Zone"} <FaArrowRight />
                     </button>
                  </div>
               </div>
          </div>
        </div>
      )}

      {successMessage && (
        <SuccessToast message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}
    </div>
  );
};

export default InspectionHub;