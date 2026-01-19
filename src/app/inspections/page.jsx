"use client";
import { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import InspectionPicker from '@/app/components/InspectionPicker';
import { inspectionLayout } from '@/app/Data/inspection_questions';
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
  
  // MODAL STATES
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isGamingOpen, setIsGamingOpen] = useState(false);
  
  // DATA STATE
  const [inspections, setInspections] = useState([
    { id: 101, unit: 'HILLCREST 404', date: '12/02/2026', status: 'booked', rooms: ['Kitchen', 'Bathroom', 'Lounge'] },
  ]);

  // ENGINE STATE
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeUnit, setActiveUnit] = useState(null);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [results, setResults] = useState({});
  const [customItems, setCustomItems] = useState({});
  const [newItemInput, setNewItemInput] = useState("");

  // KEY HANDOVER STATE
  const [keyData, setKeyData] = useState({
      setsReceived: 0,
      setsExpected: 2,
      remotes: 'Working',
      tags: 'Working'
  });

  // --- ACTIONS ---

  const handleNewBooking = (bookingData) => {
    const newBooking = {
      id: Date.now(),
      unit: bookingData.unit,
      rooms: bookingData.rooms, // "Keys" is auto-added
      status: 'booked',
      date: bookingData.date,
      time: bookingData.time,
      inspector: bookingData.inspector,
      results: {}
    };
    setInspections([newBooking, ...inspections]);
    setIsPickerOpen(false);
  };

  const startInspection = (inspection) => {
    setActiveUnit(inspection);
    // Add "Keys" as the first step if not present
    const rooms = ['Keys', ...inspection.rooms.filter(r => r !== 'Keys')];
    setSelectedRooms(rooms);
    setCustomItems({}); 
    setIsGamingOpen(true);
  };

  const getQuestions = (room) => {
    if (room === 'Keys') return {}; // Handled by custom UI
    let qs = { ...inspectionLayout.essentials };
    const key = Object.keys(inspectionLayout.extras).find(k => room.includes(k));
    if (key) qs = { ...qs, ...inspectionLayout.extras[key] };
    if (customItems[room] && customItems[room].length > 0) {
        qs = { ...qs, "Custom Additions": customItems[room] };
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

    if (tag === 'N/A') {
        newTags = ['N/A'];
    } else if (newTags.includes('N/A')) {
        newTags = [tag];
    } else if (newTags.includes(tag)) {
        newTags = newTags.filter(t => t !== tag);
    } else {
        if (tag === 'Good Condition') newTags = newTags.filter(t => !['Maintenance Req', 'Replace', 'Minor Wear', 'Can\'t Verify'].includes(t));
        if (['Maintenance Req', 'Replace', 'Minor Wear', 'Can\'t Verify'].includes(tag)) newTags = newTags.filter(t => t !== 'Good Condition');
        if (newTags.length >= 2) newTags.shift();
        newTags.push(tag);
    }
    setResults(prev => ({ ...prev, [key]: { ...prev[key], tags: newTags } }));
  };

  const addNote = (room, question, text) => {
    const key = `${room}-${question}`;
    setResults(prev => ({ ...prev, [key]: { ...prev[key], note: text } }));
  };

  const finalizeInspection = () => {
    if(confirm("Submit Inspection Report? This cannot be undone.")) {
      setInspections(prev => prev.map(ins => 
        ins.id === activeUnit.id ? { ...ins, status: 'completed', results: results, keys: keyData } : ins
      ));
      closeGame();
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
            <button onClick={() => setIsPickerOpen(true)} className="bg-slate-900 text-white py-3.5 px-6 rounded-2xl shadow-xl flex items-center space-x-3 active:scale-95 border-b-4 border-blue-600 shrink-0 hover:bg-slate-800 transition-all">
              <FaPlus size={12} /> <span className="text-[10px] font-black uppercase tracking-widest">Book</span>
            </button>
          </div>
        </header>

        {/* LISTING VIEW */}
        {filteredInspections.length === 0 ? (
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
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Insp: {ins.inspector || 'Kally'}</span>
                  </div>
                </div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{ins.unit}</h2>
                <div className="flex flex-wrap gap-1 mt-3">
                    {ins.rooms.slice(0, 3).map(r => <span key={r} className="text-[7px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase">{r}</span>)}
                    {ins.rooms.length > 3 && <span className="text-[7px] font-black text-slate-400">+{ins.rooms.length - 3}</span>}
                </div>
                <div className="mt-8 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <button onClick={() => { if(confirm("Delete?")) setInspections(prev => prev.filter(x => x.id !== ins.id))}} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><FaTrash size={12}/></button>
                  {filter === 'booked' ? (
                    <button onClick={() => startInspection(ins)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                      <span>Start Mission</span> <FaArrowRight />
                    </button>
                  ) : (
                    <button className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">View Report</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <InspectionPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSubmit={handleNewBooking} />

      {/* --- GAMING ENGINE --- */}
      {isGamingOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
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
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setKeyData({...keyData, setsReceived: Math.max(0, keyData.setsReceived - 1)})} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold">-</button>
                                        <span className="text-xl font-black text-slate-900">{keyData.setsReceived}</span>
                                        <button onClick={() => setKeyData({...keyData, setsReceived: keyData.setsReceived + 1})} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold">+</button>
                                    </div>
                                </div>

                                {/* EXPECTED */}
                                <div className="bg-white p-4 rounded-2xl mb-4 flex justify-between items-center shadow-sm">
                                    <span className="text-xs font-bold uppercase text-slate-500">Sets Expected</span>
                                    <span className="text-xl font-black text-slate-900">{keyData.setsExpected}</span>
                                </div>

                                {/* REMOTES */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Remotes</p>
                                        <div className="flex gap-2">
                                            {['Working', 'Dead', 'Missing'].map(status => (
                                                <button key={status} onClick={() => setKeyData({...keyData, remotes: status})} 
                                                    className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border ${keyData.remotes === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Tags/Fobs</p>
                                        <div className="flex gap-2">
                                            {['Working', 'Dead', 'Missing'].map(status => (
                                                <button key={status} onClick={() => setKeyData({...keyData, tags: status})} 
                                                    className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border ${keyData.tags === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
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
                     <button onClick={() => currentIdx === selectedRooms.length - 1 ? finalizeInspection() : setCurrentIdx(currentIdx + 1)} className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-500/10 active:scale-95 hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                        {currentIdx === selectedRooms.length - 1 ? "Submit Report" : "Next Zone"} <FaArrowRight />
                     </button>
                  </div>
               </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionHub;