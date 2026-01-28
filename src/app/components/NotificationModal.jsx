import { FaClock, FaFingerprint, FaTrash } from "react-icons/fa";
import { BiBell, BiX } from "react-icons/bi";

const NotificationModal = ({ data, onClose, onDelete }) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* 1. The Blur Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl transition-all duration-300"
        onClick={onClose}
      ></div>

      {/* 2. The Modal Window */}
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
               <BiBell size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Pulse Secure Session</p>
               <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Log Details</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <BiX size={28} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Metadata */}
          <div className="flex justify-between items-center mb-8">
            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
              data.priority === 'Critical' 
                ? 'bg-red-50 text-red-600 border-red-100' 
                : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
              Priority: {data.priority}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FaClock /> {data.time}
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 uppercase mb-6 leading-tight">
            {data.title}
          </h1>

          {/* Typography */}
          <p className="text-lg font-medium text-slate-600 leading-[1.8] first-letter:text-5xl first-letter:font-black first-letter:text-slate-900 first-letter:mr-3 first-letter:float-left">
            {data.message}
          </p>

          {/* Developer Note / LMS Cover Story */}
          <div className="mt-10 p-6 bg-[#F8FAFC] border border-slate-200 rounded-3xl">
            <div className="flex items-center gap-2 mb-3">
              <FaFingerprint className="text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Audit Trail</p>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              This log has been synchronized with the main database. 
              <span className="text-blue-600"> LMS Ticket ID: #88392-X</span> (Pending Rasta's signature).
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
           <button 
             onClick={() => { onDelete(data.id); onClose(); }}
             className="px-6 py-4 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-50 rounded-xl transition-all"
           >
             <FaTrash /> Delete Log
           </button>

           <button 
             onClick={onClose}
             className="px-10 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
           >
             Acknowledge
           </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;