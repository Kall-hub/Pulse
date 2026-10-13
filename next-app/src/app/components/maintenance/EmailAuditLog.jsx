'use client';
import { useState } from 'react';
import { BiEnvelope } from 'react-icons/bi';

export default function EmailAuditLog({ emailLogs, onAddLog }) {
  const [emailNoteInput, setEmailNoteInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddLog(emailNoteInput);
    setEmailNoteInput('');
  };

  return (
    <div className="bg-slate-800/50 border border-white/5 p-6 rounded-3xl space-y-6 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center text-xl font-bold border border-blue-500/30">
            <BiEnvelope size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Daily Multi-Sweep Email Audit ({emailLogs.length} Sweeps Today)
            </h3>
            <p className="text-xs text-slate-400">Log every 30-minute inbox check throughout the day to build your diligence trail.</p>
          </div>
        </div>

        <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
          ⚡ 30-Min Interval Tracking Active
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 pt-2">
        <input 
          type="text" 
          value={emailNoteInput} 
          onChange={(e) => setEmailNoteInput(e.target.value)}
          placeholder="Add brief note about this sweep (e.g. Cleared tenant requests, quote received)..." 
          className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all whitespace-nowrap">
          + Log Inbox Sweep Now
        </button>
      </form>

      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
        {emailLogs.map((log) => (
          <div key={log.id} className="p-3.5 bg-slate-900/70 border border-white/5 rounded-2xl flex justify-between items-center text-xs">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-200 font-medium">{log.note}</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-slate-400">{log.date}</span>
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">⏱ {log.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}