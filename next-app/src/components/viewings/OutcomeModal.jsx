'use client';
import { FaTimes, FaCheck, FaHandshake, FaBrain, FaBan } from 'react-icons/fa';

export default function OutcomeModal({ isOutcomeModalOpen, setIsOutcomeModalOpen, saveOutcome }) {
  return (
    isOutcomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="p-8 text-center border-b border-slate-100">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">How did it go?</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Log the client&apos;s reaction</p>
                </div>
                <div className="p-8 grid grid-cols-1 gap-3">
                    <button onClick={() => saveOutcome('Accepted', 'Application Started')} className="p-4 rounded-2xl bg-green-50 border border-green-100 hover:border-green-300 hover:bg-green-100 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3"><div className="bg-green-500 text-white p-2 rounded-full"><FaHandshake /></div><span className="text-sm font-black uppercase text-green-800">Deal Closed</span></div><FaCheck className="text-green-300 group-hover:text-green-600" />
                    </button>
                    <button onClick={() => saveOutcome('Thinking', 'Client needs time')} className="p-4 rounded-2xl bg-orange-50 border border-orange-100 hover:border-orange-300 hover:bg-orange-100 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3"><div className="bg-orange-400 text-white p-2 rounded-full"><FaBrain /></div><span className="text-sm font-black uppercase text-orange-800">Thinking</span></div><FaCheck className="text-orange-300 group-hover:text-orange-600" />
                    </button>
                    <button onClick={() => saveOutcome('Rejected', 'Not interested')} className="p-4 rounded-2xl bg-red-50 border border-red-100 hover:border-red-300 hover:bg-red-100 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3"><div className="bg-red-500 text-white p-2 rounded-full"><FaBan /></div><span className="text-sm font-black uppercase text-red-800">Rejected</span></div><FaTimes className="text-red-300 group-hover:text-red-600" />
                    </button>
                </div>
                <div className="px-8 pb-8">
                    <button onClick={() => setIsOutcomeModalOpen(false)} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase hover:text-slate-600">Close</button>
                </div>
            </div>
        </div>
      )
  );
}
