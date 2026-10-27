'use client';
import { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/app/Config/firebaseConfig';
import { hasConfirmedIssueCategories, issueCategories, issueCategorySource, issueKeys, suggestIssueKeys } from '@/utils/maintenanceInsights';

export default function IssueCategoryEditor({ ticket, user }) {
  const confirmed = hasConfirmedIssueCategories(ticket);
  const suggestions = suggestIssueKeys(ticket);
  const [selected, setSelected] = useState(() => issueKeys(ticket));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canEdit = !!user && ticket.ownerUid === user.uid;
  const changed = [...selected].sort().join('|') !== [...issueKeys(ticket)].sort().join('|');
  const save = async event => {
    event.preventDefault();
    if (!canEdit || saving || !selected.length) return;
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        issueCategories: selected, issueCategoriesConfirmed: true,
        issueCategorySource: issueCategorySource(ticket),
        issueCategoriesConfirmedAt: serverTimestamp(), issueCategoriesConfirmedBy: user.uid
      });
    } catch (err) { console.error('Could not confirm issue categories:', err); setError('Categories could not be saved. Please try again.'); }
    finally { setSaving(false); }
  };
  return <form onSubmit={save} className="space-y-3 rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 text-left">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-black text-slate-900">Issue categories</h4><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${confirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{confirmed ? 'Confirmed' : 'Suggested · needs review'}</span></div>
    <p className="text-[11px] leading-5 text-slate-600">Review the categories below against the original faults. Confirm or correct them so Issue Watch and reports reflect the issue accurately.</p>
    <div className="rounded-lg border border-cyan-100 bg-white p-3"><p className="mb-1 text-[9px] font-bold uppercase text-slate-500">Original fault descriptions</p><ul className="list-inside list-disc space-y-1 text-[11px] text-slate-700 [overflow-wrap:anywhere]">{(Array.isArray(ticket.faults) ? ticket.faults : []).map((fault,index) => <li key={index}>{fault}</li>)}</ul>{ticket.description && <p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-700">{ticket.description}</p>}</div>
    <fieldset disabled={!canEdit || saving} className="grid grid-cols-1 gap-2 sm:grid-cols-2"><legend className="sr-only">Select all issue categories that apply</legend>{issueCategories.map(([key,label]) => <label key={key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[10px] font-semibold ${selected.includes(key) ? 'border-cyan-300 bg-white text-cyan-950' : 'border-slate-200 text-slate-600'}`}><input type="checkbox" checked={selected.includes(key)} onChange={() => setSelected(current => current.includes(key) ? current.filter(value => value !== key) : [...current,key])} className="accent-cyan-700" /><span>{label}{!confirmed && suggestions.includes(key) && <span className="ml-1 font-normal text-slate-400">· suggested</span>}</span></label>)}</fieldset>
    {!selected.length && <p className="text-[11px] text-amber-800">Select at least one category. Use Other issues if none apply.</p>}
    {canEdit && <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={saving || !selected.length || (confirmed && !changed)} className="rounded-lg bg-cyan-800 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : confirmed ? 'Save category changes' : 'Confirm categories'}</button><button type="button" disabled={saving} onClick={() => setSelected(suggestions)} className="text-[10px] font-semibold text-cyan-800">Use suggestions</button></div>}
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    <p className="text-[9px] leading-4 text-slate-500">{confirmed ? 'Reports use your confirmed categories.' : 'Until confirmed, reports use suggestions.'} Changes to the fault descriptions require a fresh review.</p>
  </form>;
}
