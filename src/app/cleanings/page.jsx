"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';
import { 
  FaSoap, FaPlus, FaUserAlt, FaTimes, FaCheck, FaTrash, 
  FaGhost, FaChevronDown, FaBroom, FaSprayCan, FaHandSparkles,
  FaPlusCircle, FaBars
} from "react-icons/fa";
import { MdCleaningServices, MdOutlineBedroomParent } from "react-icons/md";
import { GiBathtub, GiKitchenTap } from "react-icons/gi";

/* --- 1. CONFIGURATION --- */
const LEVEL_CONFIG = {
  'quick': { label: 'Quick', color: 'bg-green-100 text-green-700 border-green-200', active: 'bg-green-600 text-white shadow-md ring-2 ring-green-200', icon: <FaHandSparkles /> },
  'std':   { label: 'Std',   color: 'bg-blue-100 text-blue-700 border-blue-200',   active: 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200',   icon: <FaBroom /> },
  'deep':  { label: 'Deep',  color: 'bg-purple-100 text-purple-700 border-purple-200', active: 'bg-purple-600 text-white shadow-md ring-2 ring-purple-200', icon: <FaSprayCan /> }
};

const ZONES = {
  bath: { name: "Bathroom", icon: <GiBathtub /> },
  kit: { name: "Kitchen", icon: <GiKitchenTap /> },
  bed: { name: "Bedroom", icon: <MdOutlineBedroomParent /> },
  lounge: { name: "Lounge", icon: <MdCleaningServices /> }
};

const SUGGESTIONS = {
  bath: ["Shower", "Toilet", "Basin", "Mirror", "Floors"],
  kit: ["Stove Top", "Oven", "Sink", "Cupboards", "Fridge", "Floors"],
  bed: ["Make Bed", "Dusting", "Windows", "Vacuum"],
  lounge: ["Vacuum", "Dust TV", "Windows", "Skirting"]
};

const CleaningPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState('ongoing'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [customInputs, setCustomInputs] = useState({}); 

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

  const [jobs, setJobs] = useState([]);

  // Fetch cleanings from database
  useEffect(() => {
    const fetchCleanings = async () => {
      try {
        const cleaningsSnapshot = await getDocs(collection(db, "cleanings"));
        const cleaningsData = cleaningsSnapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure all tasks have done property
          const updatedZones = data.zones?.map(zone => ({
            ...zone,
            tasks: zone.tasks?.map(task => ({
              ...task,
              done: task.done || false
            })) || []
          })) || [];
          
          return {
            id: doc.id,
            ...data,
            zones: updatedZones
          };
        });
        setJobs(cleaningsData);
      } catch (error) {
        console.error("Error fetching cleanings:", error);
      }
    };
    fetchCleanings();
  }, []);

  const [formData, setFormData] = useState({ unit: '', cleaner: 'Lindiwe', serviceDate: '', time: '', selectedZones: [] });
  const cleaners = ["Lindiwe", "Sarah", "Regina", "Thembi", "Precious"];

  // --- ACTIONS ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.selectedZones.length === 0) return alert("Please select at least one zone.");
    const payload = { ...formData, unit: formData.unit.toUpperCase(), zones: formData.selectedZones };

    try {
      if (editingId) {
        // Update existing cleaning
        await updateDoc(doc(db, "cleanings", editingId), payload);
        setJobs(jobs.map(j => j.id === editingId ? { ...j, ...payload } : j));
      } else {
        // Add new cleaning
        const newCleaning = { 
          ...payload, 
          bookedOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase(), 
          status: 'Booked' 
        };
        const docRef = await addDoc(collection(db, "cleanings"), newCleaning);
        setJobs([{ id: docRef.id, ...newCleaning }, ...jobs]);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving cleaning:", error);
    }
  };

  const deleteCleaning = async (cleaningId) => {
    try {
      await deleteDoc(doc(db, "cleanings", cleaningId));
      setJobs(prev => prev.filter(j => j.id !== cleaningId));
    } catch (error) {
      console.error("Error deleting cleaning:", error);
    }
  };

  const toggleTaskDone = async (cleaningId, zoneId, taskIdx) => {
    try {
      const job = jobs.find(j => j.id === cleaningId);
      if (!job) return;

      const updatedZones = job.zones.map(zone => {
        if (zone.id === zoneId) {
          const updatedTasks = zone.tasks.map((task, idx) =>
            idx === taskIdx ? { ...task, done: !task.done } : task
          );
          return { ...zone, tasks: updatedTasks };
        }
        return zone;
      });

      // Check if all tasks are done
      const allTasksDone = updatedZones.every(zone =>
        zone.tasks.every(task => task.done)
      );

      const updatedJob = { ...job, zones: updatedZones };
      if (allTasksDone && job.status !== 'Completed') {
        updatedJob.status = 'Completed';
      }

      await updateDoc(doc(db, "cleanings", cleaningId), updatedJob);
      setJobs(jobs.map(j => j.id === cleaningId ? updatedJob : j));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const toggleZone = (zoneId) => {
    const exists = formData.selectedZones.find(z => z.id === zoneId);
    if (exists) {
        setFormData(prev => ({ ...prev, selectedZones: prev.selectedZones.filter(z => z.id !== zoneId) }));
    } else {
        const newZone = { id: zoneId, name: ZONES[zoneId].name, tasks: [] };
        setFormData(prev => ({ ...prev, selectedZones: [...prev.selectedZones, newZone] }));
    }
  };

  const addTask = (zoneId, taskName) => {
    if (!taskName.trim()) return;
    setFormData(prev => ({
        ...prev,
        selectedZones: prev.selectedZones.map(z => {
            if (z.id !== zoneId) return z;
            if (z.tasks.some(t => t.name === taskName)) return z;
            return { ...z, tasks: [...z.tasks, { name: taskName, level: 'std', done: false }] };
        })
    }));
    setCustomInputs(prev => ({ ...prev, [zoneId]: '' }));
  };

  const removeTask = (zoneId, taskName) => {
    setFormData(prev => ({
        ...prev,
        selectedZones: prev.selectedZones.map(z => {
            if (z.id !== zoneId) return z;
            return { ...z, tasks: z.tasks.filter(t => t.name !== taskName) };
        })
    }));
  };

  const setTaskLevel = (zoneId, taskName, level) => {
    setFormData(prev => ({
        ...prev,
        selectedZones: prev.selectedZones.map(z => {
            if (z.id !== zoneId) return z;
            return {
                ...z,
                tasks: z.tasks.map(t => t.name === taskName ? { ...t, level: level } : t)
            };
        })
    }));
  };

  const startEdit = (job) => {
    setFormData({ unit: job.unit, cleaner: job.cleaner, serviceDate: job.serviceDate, time: job.time, selectedZones: job.zones });
    setEditingId(job.id);
    setCustomInputs({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ unit: '', cleaner: 'Lindiwe', serviceDate: '', time: '', selectedZones: [] });
  };

  const filteredJobs = jobs.filter(j => filter === 'ongoing' ? j.status !== 'Completed' : j.status === 'Completed');

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans relative">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8 max-w-7xl mx-auto`}>
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div className="flex flex-col gap-4 w-full md:w-auto">
             <div className="flex items-center gap-4">
                {/* HAMBURGER MENU */}
                <button onClick={() => setIsOpen(!isOpen)} className="md:hidden bg-white p-2 rounded-lg shadow-sm text-slate-600 border border-slate-200">
                    <FaBars size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Housekeeping</h1>
                    <div className="flex bg-slate-200 p-1 rounded-xl mt-2 md:mt-4 w-fit shadow-inner scale-95 origin-left">
                      <button onClick={() => setFilter('ongoing')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === 'ongoing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Ongoing</button>
                      <button onClick={() => setFilter('complete')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === 'complete' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Complete</button>
                    </div>
                </div>
             </div>
          </div>
          
          <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto bg-slate-900 text-white py-4 px-8 rounded-2xl shadow-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-3 active:scale-95 border-b-4 border-blue-600">
            <FaPlus size={12} /> <span>Book Cleaning</span>
          </button>
        </header>

        <div className="space-y-6 md:space-y-8">
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 italic">
              <FaGhost size={40} className="mb-4 opacity-20" />
              <p className="text-xs font-black uppercase tracking-widest">No tasks found</p>
            </div>
          ) : (
            filteredJobs.map(job => (
              <CleaningCard 
                key={job.id} 
                {...job} 
                onDelete={() => { if(confirm("Delete?")) deleteCleaning(job.id) }}
                onEdit={() => startEdit(job)}
                onComplete={async () => {
                  try {
                    await updateDoc(doc(db, "cleanings", job.id), { status: 'Completed' });
                    setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'Completed' } : j));
                  } catch (error) {
                    console.error("Error completing cleaning:", error);
                  }
                }}
                onTaskToggle={(zoneId, taskIdx) => toggleTaskDone(job.id, zoneId, taskIdx)}
                view={filter}
              />
            ))
          )}
        </div>
      </main>

      {/* --- BOOKING MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">{editingId ? 'Edit Work Order' : 'New Work Order'}</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-white"><FaTimes size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
              {/* BASIC INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Unit</label>
                    <input required placeholder="A612" className="w-full bg-slate-100 p-4 rounded-2xl font-black uppercase text-xs outline-none focus:ring-2 ring-blue-600" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Housekeeper</label>
                    <div className="relative">
                        <select className="w-full bg-slate-100 p-4 rounded-2xl font-black uppercase text-xs appearance-none outline-none focus:ring-2 ring-blue-600" value={formData.cleaner} onChange={e => setFormData({...formData, cleaner: e.target.value})}>
                        {cleaners.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} />
                    </div>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required type="date" className="bg-slate-100 p-4 rounded-2xl text-[10px] font-black outline-none w-full" value={formData.serviceDate} onChange={e => setFormData({...formData, serviceDate: e.target.value})} />
                <input required type="time" className="bg-slate-100 p-4 rounded-2xl text-[10px] font-black outline-none w-full" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
              </div>

              <div className="border-t border-slate-100 pt-2"></div>

              {/* AREA SELECTION */}
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-2 block">1. Enable Zones</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(ZONES).map(([key, config]) => {
                    const isSelected = formData.selectedZones.some(z => z.id === key);
                    return (
                        <button type="button" key={key} onClick={() => toggleZone(key)}
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-400'}`}>
                        <span className="text-lg">{config.icon}</span>
                        <span className="text-[8px] font-black uppercase hidden sm:inline">{config.name}</span>
                        </button>
                    )
                  })}
                </div>
              </div>

              {/* TASKS */}
              {formData.selectedZones.length > 0 && (
                  <div className="space-y-6">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 block">2. Build Your Task List</label>
                    {formData.selectedZones.map((zone) => (
                        <div key={zone.id} className="bg-slate-50 border border-slate-200 p-4 md:p-5 rounded-3xl animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-blue-600 text-lg">{ZONES[zone.id].icon}</span>
                                <span className="text-xs font-black uppercase text-slate-800">{zone.name}</span>
                            </div>
                            <div className="mb-4">
                                <div className="flex gap-2 mb-3">
                                    <input placeholder={`Add task...`} className="flex-1 bg-white p-3 rounded-xl text-[10px] font-bold outline-none border border-slate-200 focus:border-blue-500"
                                        value={customInputs[zone.id] || ''} onChange={(e) => setCustomInputs({...customInputs, [zone.id]: e.target.value})}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask(zone.id, customInputs[zone.id]))} />
                                    <button type="button" onClick={() => addTask(zone.id, customInputs[zone.id])} className="bg-blue-600 text-white px-4 rounded-xl hover:bg-blue-700 transition-colors"><FaPlus size={10} /></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {SUGGESTIONS[zone.id].map(s => (
                                        <button key={s} type="button" onClick={() => addTask(zone.id, s)} className="text-[8px] font-bold bg-white text-slate-400 px-2 py-1 rounded-lg border border-slate-200 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center gap-1">
                                            <FaPlusCircle size={8} /> {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {zone.tasks.map(task => (
                                    <div key={task.name} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm gap-3">
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => removeTask(zone.id, task.name)} className="text-slate-300 hover:text-red-500"><FaTimes size={10} /></button>
                                            <span className="text-[10px] font-bold text-slate-800">{task.name}</span>
                                        </div>
                                        <div className="flex gap-1 justify-end">
                                            {Object.entries(LEVEL_CONFIG).map(([lvlKey, config]) => (
                                                <button key={lvlKey} type="button" onClick={() => setTaskLevel(zone.id, task.name, lvlKey)}
                                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all flex items-center gap-1 ${task.level === lvlKey ? config.active : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                                    {config.icon} <span className="hidden sm:inline">{config.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                  </div>
              )}
              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/10 active:scale-95 transition-all">Save Work Order</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* CLEANING CARD */
const CleaningCard = ({ unit, cleaner, bookedOn, serviceDate, time, status, zones, onEdit, onDelete, onComplete, onTaskToggle, view }) => (
  <div className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-2 ${status === 'Completed' ? 'opacity-80 grayscale-[0.5]' : ''}`}>
    <div className="px-6 md:px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-[#F8FAFC] gap-4">
      <div className="flex items-start space-x-5 w-full">
        <div className={`p-4 rounded-2xl shadow-lg text-white shrink-0 ${status === 'Completed' ? 'bg-slate-400' : 'bg-blue-600'}`}><FaSoap size={20} /></div>
        <div className="w-full">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2 break-words">{unit}</h2>
          <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <FaUserAlt size={8} className="text-blue-500" />
            <span>{cleaner}</span>
          </div>
        </div>
      </div>
      <div className="text-left md:text-right w-full md:w-auto border-t md:border-t-0 border-slate-200 pt-2 md:pt-0">
          <p className="text-sm font-black text-blue-600 uppercase leading-none">{serviceDate}</p>
          <p className="text-[10px] font-black text-slate-400 mt-1 italic tracking-tight">@ {time}</p>
      </div>
    </div>

    <div className="p-6 space-y-3">
        {zones.map((zone, i) => (
            <div key={i} className="flex flex-col md:flex-row justify-between p-4 rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] gap-3">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 text-lg">{ZONES[zone.id]?.icon || <FaSoap/>}</div>
                    <span className="text-[10px] font-black uppercase text-slate-900">{zone.name}</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-start md:justify-end md:max-w-[60%]">
                    {zone.tasks.map((task, idx) => {
                        const lvl = LEVEL_CONFIG[task.level];
                        return (
                            <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${task.done ? 'bg-green-50 border-green-200' : lvl.color} transition-all`}>
                                {view === 'ongoing' && (
                                    <input
                                        type="checkbox"
                                        checked={task.done || false}
                                        onChange={() => onTaskToggle(zone.id, idx)}
                                        className="w-3 h-3 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                                    />
                                )}
                                <span className="text-[7px]">{lvl.icon}</span>
                                <span className={`text-[8px] font-bold uppercase ${task.done ? 'line-through text-green-700' : ''}`}>{task.name} ({lvl.label})</span>
                                {task.done && <FaCheck className="text-green-600 text-[6px]" />}
                            </div>
                        )
                    })}
                </div>
            </div>
        ))}
    </div>

    <div className="px-6 md:px-8 py-5 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4">
        <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'Completed' ? 'text-green-600' : 'text-blue-500 animate-pulse'}`}>{status}</span>
        <div className="flex space-x-3 w-full md:w-auto justify-end">
            {view === 'ongoing' ? (
                <>
                    <button onClick={onDelete} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><FaTrash size={12}/></button>
                    <button onClick={onEdit} className="px-4 py-2 rounded-xl bg-slate-100 text-[9px] font-black uppercase text-slate-500 hover:bg-slate-200 transition-colors">Edit</button>
                    <button onClick={onComplete} className="px-5 py-2 rounded-xl bg-slate-900 text-white text-[9px] font-black uppercase flex items-center space-x-2 shadow-lg hover:bg-blue-600 transition-all">
                        <FaCheck /> <span>Done</span>
                    </button>
                </>
            ) : (
                <button onClick={onDelete} className="flex items-center space-x-1 text-slate-300 hover:text-red-500 text-[9px] font-black uppercase"><FaTrash size={10} /> <span>Remove</span></button>
            )}
        </div>
    </div>
  </div>
);

export default CleaningPage;