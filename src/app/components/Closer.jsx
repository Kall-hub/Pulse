"use client";
import { useState } from 'react';
import { FaSearch, FaCheck, FaTimes, FaKey, FaTools, FaSoap, FaClipboardCheck, FaLink } from "react-icons/fa";

const LoopCloser = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
        
        {/* HEADER */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Close the Loop</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verify & Link Unit Data</p>
            </div>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-all">
                <FaTimes size={20} />
            </button>
        </div>

        <div className="p-8">
            {/* PROGRESS BAR */}
            <div className="flex justify-between mb-10 px-4">
                {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className={`h-1.5 flex-1 mx-1 rounded-full transition-all ${step >= s ? 'bg-blue-600' : 'bg-slate-100'}`} />
                ))}
            </div>

            {/* STEP 1: SELECT UNIT */}
            {step === 1 && (
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Which unit is exiting?</label>
                    <div className="relative">
                        <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Type Unit Number..." 
                            className="w-full py-5 pl-14 pr-6 bg-slate-50 border-none rounded-2xl text-sm font-black uppercase outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            )}

            {/* STEP 2: LINK INSPECTION */}
            {step === 2 && (
                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-slate-900 mb-2">
                        <FaClipboardCheck size={20} className="text-blue-600" />
                        <h3 className="text-sm font-black uppercase italic">Inspection Link</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-500 italic">"Was an inspection conducted for this move-out?"</p>
                    
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Search existing reports..." 
                            className="w-full py-4 pl-6 pr-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                        />
                        <FaLink className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" />
                    </div>
                </div>
            )}

            {/* STEP 3: LINK MAINTENANCE */}
            {step === 3 && (
                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-slate-900 mb-2">
                        <FaTools size={20} className="text-orange-500" />
                        <h3 className="text-sm font-black uppercase italic">Maintenance Check</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-500 italic">"Find the repair logs to calculate deductions."</p>
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-orange-600 uppercase">A612_Broken_Window.log</span>
                        <span className="text-xs font-black text-orange-600">R450</span>
                    </div>
                </div>
            )}

            {/* STEP 4: KEYS STATUS */}
            {step === 4 && (
                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-slate-900 mb-2">
                        <FaKey size={20} className="text-yellow-500" />
                        <h3 className="text-sm font-black uppercase italic">Keys & Remotes</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="p-6 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-green-500 transition-all flex flex-col items-center">
                            <FaCheck size={20} className="text-green-500 mb-2" />
                            <span className="text-[10px] font-black uppercase">All Returned</span>
                        </button>
                        <button className="p-6 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-red-500 transition-all flex flex-col items-center">
                            <FaTimes size={20} className="text-red-500 mb-2" />
                            <span className="text-[10px] font-black uppercase">Missing Sets</span>
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 5: FINAL SUMMARY */}
            {step === 5 && (
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white">
                    <h3 className="text-center text-lg font-black uppercase italic mb-6">Final Audit Summary</h3>
                    <div className="space-y-3">
                        <SummaryRow label="Inspection" val="Verified" />
                        <SummaryRow label="Maintenance" val="R450 Deduction" color="text-orange-400" />
                        <SummaryRow label="Cleaning" val="Sarah (Complete)" />
                        <SummaryRow label="Keys" val="Complete" />
                    </div>
                </div>
            )}

            {/* NAV BUTTONS */}
            <div className="flex space-x-4 mt-10">
                {step > 1 && (
                    <button onClick={() => setStep(step - 1)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 bg-slate-50 rounded-2xl">Back</button>
                )}
                <button 
                    onClick={() => step < 5 ? setStep(step + 1) : onClose()} 
                    className="flex-[2] py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-200"
                >
                    {step === 5 ? 'Confirm & Close Loop' : 'Next Step'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, val, color = "text-green-400" }) => (
    <div className="flex justify-between border-b border-white/10 pb-2">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className={`text-[10px] font-black uppercase italic ${color}`}>{val}</span>
    </div>
);

export default LoopCloser;