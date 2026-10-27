'use client';
import { useState } from 'react';
import { BiShow, BiX, BiChevronRight } from 'react-icons/bi';
import { summarizeIssues } from '@/utils/maintenanceInsights';

export default function IssueWatch({ tickets, onSelectTicket, loading }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const summary = summarizeIssues(tickets);
  const group = summary.groups.find(item => item.key === selected);
  return <div className="fixed bottom-6 right-4 z-40 print:hidden sm:right-6">
    {open && <section aria-label="Issue watch" className="mb-3 flex max-h-[65vh] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-cyan-400/25 bg-slate-950 text-white shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-white/10 p-5"><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">Maintenance intelligence</p><h3 className="mt-1 text-lg font-black">Issue watch</h3></div><button type="button" aria-label="Close issue watch" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10"><BiX size={22} /></button></div>
      <div className="space-y-4 overflow-y-auto p-5">
        <p className="text-xs leading-5 text-slate-400">All your recorded tickets · confirmed categories and suggestions. Select an issue to trace its tickets.</p>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-cyan-400/10 p-3"><p className="text-2xl font-black text-cyan-300">{summary.leaks}</p><p className="text-[10px] text-slate-400">Tickets with leaks</p></div><div className="rounded-2xl bg-amber-400/10 p-3"><p className="text-2xl font-black text-amber-300">{summary.activeLeaks}</p><p className="text-[10px] text-slate-400">Still active</p></div></div>
        {loading ? <p className="text-xs text-slate-400">Loading issues…</p> : !summary.groups.length ? <p className="text-xs text-slate-400">Issue patterns will appear when you add tickets.</p> : <div className="space-y-2">{summary.groups.map(item => <button key={item.key} type="button" onClick={() => setSelected(item.key === selected ? '' : item.key)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${selected === item.key ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 hover:bg-white/5'}`}><span><span className="text-xs font-bold">{item.label}</span><span className="mt-1 block text-[10px] text-slate-400">{item.active} active · {item.repeats.length} repeat properties</span></span><span className="flex items-center gap-2 text-sm font-black">{item.count}<BiChevronRight /></span></button>)}</div>}
        {group && <div className="space-y-2 border-t border-white/10 pt-4"><h4 className="text-xs font-bold text-cyan-300">{group.label} · Ticket trail</h4>{group.tickets.map(ticket => <button key={ticket.id} type="button" onClick={() => { onSelectTicket(ticket.id); setOpen(false); }} className="block w-full rounded-xl bg-white/5 p-3 text-left hover:bg-white/10"><span className="block text-xs font-bold">{ticket.property || 'Property not recorded'}</span><span className="text-[10px] text-slate-400">{ticket.displayId || ticket.id} · {ticket.status}</span></button>)}</div>}
        {summary.repeats.length > 0 && <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3"><h4 className="text-xs font-bold text-amber-300">Recurring at a property</h4>{summary.repeats.slice(0,5).map(item => <p key={`${item.label}-${item.property}`} className="mt-2 text-[11px] text-slate-300">{item.property} · {item.label} · {item.count} tickets</p>)}</div>}
        <p className="text-[10px] text-cyan-300">{summary.confirmed} confirmed · {summary.suggested} awaiting category review</p>
        <p className="text-[10px] leading-4 text-slate-500">A ticket can appear in multiple issue groups. Repeat flags mean multiple tickets for the same issue and property.</p>
      </div>
    </section>}
    <button type="button" aria-label="Toggle issue watch" aria-expanded={open} onClick={() => setOpen(!open)} className="ml-auto flex items-center gap-3 rounded-2xl border border-cyan-300/30 bg-slate-950 px-4 py-3 text-white shadow-xl shadow-black/30 hover:bg-slate-800"><BiShow size={23} className="text-cyan-300" /><span className="text-xs font-bold">Issue watch</span><span className="rounded-lg bg-cyan-400/15 px-2 py-1 text-xs font-black text-cyan-300">{summary.activeLeaks}</span></button>
  </div>;
}
