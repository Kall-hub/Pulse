'use client';
import { useState } from 'react';
import { BiShieldQuarter, BiPlusCircle, BiBuildingHouse } from 'react-icons/bi';

export default function InspectionForm({ onAddInspection }) {
  const [type, setType] = useState('Move-Out Inspection');
  const [property, setProperty] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Completed');
  const [proof, setProof] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!property.trim()) return;
    
    const randomId = `${type.includes('Viewing') ? 'VIE' : 'INS'}-${Math.floor(100 + Math.random() * 900)}`;
    
    onAddInspection({
      id: randomId,
      type,
      property: property.trim(),
      date,
      status,
      proof
    });

    setProperty('');
    setProof('');
  };

  return (
    <div className="bg-slate-800/40 border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
        <BiPlusCircle size={16} /> Log New Viewing / Inspection
      </h4>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Inspection / Viewing Type</label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="Move-Out Inspection">Move-Out Inspection</option>
            <option value="Move-In Inspection">Move-In Inspection</option>
            <option value="Client Property Viewing">Client Property Viewing</option>
            <option value="Routine Maintenance Check">Routine Maintenance Check</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Property Address / Unit</label>
            <input 
              type="text" 
              value={property} 
              onChange={(e) => setProperty(e.target.value)} 
              placeholder="e.g., Oak Avenue 12" 
              className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="Completed">Completed</option>
              <option value="Successful">Successful</option>
              <option value="Pending Approval">Pending Approval</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Verification Proof</label>
            <input 
              type="text" 
              value={proof} 
              onChange={(e) => setProof(e.target.value)} 
              placeholder="e.g., Signed & Logged" 
              className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all">
          + Record Inspection / Viewing
        </button>
      </form>
    </div>
  );
}
