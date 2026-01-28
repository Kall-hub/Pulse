"use client";
import { useState } from 'react';
import { FaTimes, FaPlus, FaTrash, FaCheck } from "react-icons/fa";

const MaintenanceForm = ({ isOpen, onClose, onSubmit }) => {
  const [unit, setUnit] = useState('');
  
  // Staging Area (What is currently being typed)
  const [currentArea, setCurrentArea] = useState('General');
  const [currentNote, setCurrentNote] = useState('');

  // The "Cart" (List of faults ready to submit)
  const [faultList, setFaultList] = useState([]);

  // 1. Add current note to the list
  const addFault = () => {
    if (!currentNote.trim()) return;

    const newFault = {
      id: Date.now(),
      area: currentArea,
      description: currentNote
    };

    setFaultList([...faultList, newFault]);
    setCurrentNote(''); // Clear text
    // Keep area selected or reset? Let's keep it so they can add another note for same room if needed.
  };

  // 2. Remove item from list
  const removeFault = (id) => {
    setFaultList(faultList.filter(f => f.id !== id));
  };

  // 3. Final Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!unit.trim()) {
        alert("Please enter a Unit Number");
        return;
    }
    if (faultList.length === 0) {
        alert("Please add at least one fault description.");
        return;
    }

    // Send the whole package
    onSubmit({ unit, faults: faultList });
    
    // Reset Everything
    setUnit('');
    setFaultList([]);
    setCurrentNote('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
       <div className="bg-[#0F172A] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-800 flex flex-col max-h-[90vh]">
          
          {/* HEADER */}
          <div className="p-8 pb-4 flex justify-between items-start border-b border-white/10 shrink-0">
             <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Log Issue</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Multi-Area Maintenance Request</p>
             </div>
             <button type="button" onClick={onClose} className="bg-white/10 p-3 rounded-full text-white hover:bg-red-500 transition-colors">
                <FaTimes />
             </button>
          </div>
          
          {/* SCROLLABLE CONTENT */}
          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
             
             {/* 1. UNIT INPUT */}
             <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Apartment / Unit</p>
                <input 
                  required 
                  autoFocus
                  type="text" 
                  placeholder="e.g. HILLCREST 204"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 text-white p-5 rounded-2xl text-sm font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700"
                />
             </div>

             {/* 2. FAULT BUILDER */}
             <div className="bg-slate-900/50 p-4 rounded-3xl border border-slate-700/50 space-y-4">
                
                {/* Area Selector */}
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Where is the problem?</p>
                    <div className="flex flex-wrap gap-2">
                    {['Kitchen', 'Bathroom', 'Bedroom', 'Lounge', 'General'].map(area => (
                        <button 
                            key={area}
                            type="button"
                            onClick={() => setCurrentArea(area)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${currentArea === area ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                        >
                            {area}
                        </button>
                    ))}
                    </div>
                </div>

                {/* Note Input */}
                <div className="flex gap-2">
                    <input 
                        type="text"
                        placeholder={`Describe ${currentArea} issue...`}
                        value={currentNote}
                        onChange={(e) => setCurrentNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFault())}
                        className="flex-1 bg-slate-800 text-white p-4 rounded-xl text-xs font-bold outline-none border border-slate-700 focus:border-blue-500"
                    />
                    <button 
                        type="button" 
                        onClick={addFault}
                        disabled={!currentNote.trim()}
                        className="bg-slate-700 text-white px-4 rounded-xl disabled:opacity-50 hover:bg-green-600 transition-colors"
                    >
                        <FaPlus />
                    </button>
                </div>

                {/* THE "CART" LIST */}
                {faultList.length > 0 && (
                    <div className="space-y-2 pt-2">
                        {faultList.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-blue-900/20 p-3 rounded-xl border border-blue-500/20">
                                <div className="flex items-center gap-3">
                                    <span className="text-[8px] font-black bg-blue-600 text-white px-2 py-0.5 rounded uppercase">{item.area}</span>
                                    <span className="text-xs font-bold text-slate-300 italic">{item.description}</span>
                                </div>
                                <button onClick={() => removeFault(item.id)} className="text-slate-500 hover:text-red-400">
                                    <FaTrash size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
             </div>

             {/* 3. SUBMIT BUTTON */}
             <button 
                onClick={handleSubmit}
                disabled={faultList.length === 0 || !unit}
                className="w-full bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
                <FaCheck /> Transmit Request ({faultList.length} Items)
             </button>
          </div>
       </div>
    </div>
  );
};

export default MaintenanceForm;