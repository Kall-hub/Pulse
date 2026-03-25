"use client";
import { useEffect, useState } from 'react';
import { FaTimes, FaPlus, FaTrash, FaCheck } from "react-icons/fa";
import ApartmentAutocomplete from './ApartmentAutocomplete';
import VehicleSelector from './VehicleSelector';

const defaultAreas = ['Kitchen', 'Bathroom', 'Bedroom', 'Lounge', 'General'];

const MaintenanceForm = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  submitLabel = 'Transmit Request',
  title = 'Log Issue',
  subtitle = 'Multi-Area Maintenance Request',
  lockUnit = false,
  hideVehicle = false
}) => {
  const [unit, setUnit] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  // Staging Area (What is currently being typed)
  const [currentArea, setCurrentArea] = useState('General');
  const [currentNote, setCurrentNote] = useState('');

  // The "Cart" (List of faults ready to submit)
  const [faultList, setFaultList] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    setUnit(initialData?.unit || '');
    setSelectedVehicle(initialData?.vehicle || null);
    setFaultList(initialData?.faults || []);
    setCurrentArea(initialData?.faults?.[0]?.area || 'General');
    setCurrentNote('');
  }, [initialData, isOpen]);

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

  const updateFault = (id, field, value) => {
    setFaultList(faultList.map(fault => (
      fault.id === id ? { ...fault, [field]: value } : fault
    )));
  };

  // 3. Final Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedFaults = faultList
      .map(fault => ({ ...fault, description: fault.description.trim() }))
      .filter(fault => fault.description);

    if (!unit.trim()) {
        alert("Please enter a Unit Number");
        return;
    }
    if (cleanedFaults.length === 0) {
        alert("Please add at least one fault description.");
        return;
    }

    // Send the whole package INCLUDING vehicle assignment
    onSubmit({ unit, faults: cleanedFaults, vehicle: selectedVehicle });
    
    // Reset Everything
    setUnit('');
    setFaultList([]);
    setCurrentNote('');
    setSelectedVehicle(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
       <div className="bg-[#0F172A] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-800 flex flex-col max-h-[90vh]">
          
          {/* HEADER */}
          <div className="p-8 pb-4 flex justify-between items-start border-b border-white/10 shrink-0">
             <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{title}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
             </div>
             <button type="button" onClick={onClose} className="bg-white/10 p-3 rounded-full text-white hover:bg-red-500 transition-colors">
                <FaTimes />
             </button>
          </div>
          
          {/* SCROLLABLE CONTENT */}
          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
             
             {/* 1. UNIT INPUT WITH AUTOCOMPLETE */}
             <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Apartment / Unit</p>
                <ApartmentAutocomplete 
                  value={unit}
                  onChange={setUnit}
                  placeholder="e.g. HILLCREST 204"
                  autoFocus={true}
                  disabled={lockUnit}
                />
             </div>

             {/* 2. FAULT BUILDER */}
             <div className="bg-slate-900/50 p-4 rounded-3xl border border-slate-700/50 space-y-4">
                
                {/* Area Selector */}
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Where is the problem?</p>
                    <div className="flex flex-wrap gap-2">
                    {defaultAreas.map(area => (
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
                            <div key={item.id} className="bg-blue-900/20 p-3 rounded-xl border border-blue-500/20 space-y-3">
                                <div className="flex justify-between items-center gap-3">
                                    <select
                                      value={item.area}
                                      onChange={(e) => updateFault(item.id, 'area', e.target.value)}
                                      className="text-[8px] font-black bg-blue-600 text-white px-2 py-1 rounded uppercase border border-blue-400 outline-none"
                                    >
                                      {defaultAreas.map(area => (
                                        <option key={area} value={area}>{area}</option>
                                      ))}
                                    </select>
                                    <button onClick={() => removeFault(item.id)} className="text-slate-500 hover:text-red-400">
                                        <FaTrash size={10} />
                                    </button>
                                </div>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateFault(item.id, 'description', e.target.value)}
                                  className="w-full bg-slate-800 text-white p-3 rounded-xl text-xs font-bold outline-none border border-slate-700 focus:border-blue-500"
                                />
                            </div>
                        ))}
                    </div>
                )}
             </div>

             {/* 3. VEHICLE ASSIGNMENT */}
             {!hideVehicle && (
               <VehicleSelector 
                 selectedVehicle={selectedVehicle}
                 onChange={setSelectedVehicle}
               />
             )}

             {/* 4. SUBMIT BUTTON */}
             <button 
                onClick={handleSubmit}
                disabled={faultList.length === 0 || !unit}
                className="w-full bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
                <FaCheck /> {submitLabel} ({faultList.length} Items)
             </button>
          </div>
       </div>
    </div>
  );
};

export default MaintenanceForm;
