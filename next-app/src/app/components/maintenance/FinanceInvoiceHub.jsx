'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '@/app/Config/firebaseConfig';
import { BiPrinter } from 'react-icons/bi';

const today = () => new Date().toISOString().slice(0, 10);
const printable = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export default function FinanceInvoiceHub() {
  const [user, setUser] = useState(null);
  const [isPqa, setIsPqa] = useState(false);
  const [isFinance, setIsFinance] = useState(false);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [form, setForm] = useState({ ticketNumber: '', property: '', description: '', amount: '', billTo: '' });

  useEffect(() => onAuthStateChanged(auth, async currentUser => {
    setUser(currentUser);
    if (!currentUser) { setIsFinance(false); setIsPqa(false); return; }
    try {
      const profile = await getDoc(doc(db, 'stuff', currentUser.uid));
      const role = profile.exists() ? profile.data().role : '';
      setIsFinance(role === 'Finance');
      setIsPqa(role === 'PQA');
    } catch (err) { console.error('Could not load account role:', err); setIsFinance(false); setIsPqa(false); }
  }), []);

  useEffect(() => {
    if (!user) { setEntries([]); return; }
    const entriesQuery = isFinance
      ? collection(db, 'financeEntries')
      : query(collection(db, 'financeEntries'), where('ownerUid', '==', user.uid));
    return onSnapshot(entriesQuery, snapshot => {
      const loaded = snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }));
      loaded.sort((a, b) => String(b.entryDate || '').localeCompare(String(a.entryDate || '')));
      setEntries(loaded);
      setError('');
    }, err => { console.error('Could not load finance entries:', err); setError('Finance entries could not be loaded.'); });
  }, [user, isFinance]);

  const filteredEntries = useMemo(() => entries.filter(entry =>
    (!startDate || entry.entryDate >= startDate) && (!endDate || entry.entryDate <= endDate)
  ), [entries, startDate, endDate]);

  const submit = async event => {
    event.preventDefault();
    if (!user || !isPqa) { setError('Only PQA accounts can create invoice entries.'); return; }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0) { setError('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'financeEntries'), {
        ...form,
        amount,
        ownerUid: user.uid,
        ownerEmail: user.email || '',
        entryDate: today(),
        createdAt: serverTimestamp(),
        status: 'Pending'
      });
      setForm({ ticketNumber: '', property: '', description: '', amount: '', billTo: '' });
      setError('');
    } catch (err) { console.error('Could not save finance entry:', err); setError('Invoice entry could not be saved.'); }
    finally { setSaving(false); }
  };

  const markDone = async entry => {
    try {
      await updateDoc(doc(db, 'financeEntries', entry.id), {
        status: 'Done', processedAt: serverTimestamp(), processedByUid: user.uid
      });
    } catch (err) { console.error('Could not process finance entry:', err); setError('Entry could not be marked done.'); }
  };

  const printEntries = () => {
    const rows = filteredEntries.map(entry => `<tr><td>${printable(entry.entryDate)}</td><td>${printable(entry.ticketNumber)}</td><td>${printable(entry.property)}</td><td>${printable(entry.description)}</td><td>R ${Number(entry.amount || 0).toFixed(2)}</td><td>${printable(entry.billTo)}</td><td>${printable(entry.status)}</td></tr>`).join('');
    const popup = window.open('', '_blank', 'width=1000,height=750');
    if (!popup) { setError('Allow pop-ups to print invoices.'); return; }
    popup.document.write(`<!doctype html><html><head><title>Finance invoices</title><style>body{font:14px Arial,sans-serif;padding:24px;color:#111}h1{font-size:22px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:8px;text-align:left;vertical-align:top}th{background:#eee}@media print{button{display:none}}</style></head><body><h1>Finance &amp; Invoices</h1><p>Entry date: ${printable(startDate || 'Any')} to ${printable(endDate || 'Any')}</p><table><thead><tr><th>Date</th><th>Ticket</th><th>Property</th><th>Description</th><th>Amount</th><th>Bill to</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No entries in this date range.</td></tr>'}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  };

  const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none';
  return <div className="space-y-6">
    {isPqa && <form onSubmit={submit} className="rounded-3xl border border-white/5 bg-slate-800/40 p-6 space-y-4">
      <div><h3 className="text-sm font-black uppercase tracking-wider">New invoice entry</h3><p className="mt-1 text-xs text-slate-400">Entries are visible to you and the Finance team.</p></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input className={inputClass} placeholder="Ticket number" required value={form.ticketNumber} onChange={e => setForm({ ...form, ticketNumber: e.target.value })} />
        <input className={inputClass} placeholder="Property" required value={form.property} onChange={e => setForm({ ...form, property: e.target.value })} />
        <input className={inputClass} placeholder="Description" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <input className={inputClass} placeholder="Amount (R)" type="number" min="0" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <input className={inputClass} placeholder="Bill to" required value={form.billTo} onChange={e => setForm({ ...form, billTo: e.target.value })} />
      </div>
      <button disabled={saving || !user} className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save invoice entry'}</button>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    </form>}

    <section className="rounded-3xl border border-white/5 bg-slate-800/40 p-6 space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><h3 className="text-sm font-black uppercase tracking-wider">{isFinance ? 'All invoice entries' : 'My invoice entries'}</h3><p className="mt-1 text-xs text-slate-400">Filter by entry date{isFinance ? '; Finance can mark entries done.' : '.'}</p></div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-bold uppercase text-slate-400">From<input className={`${inputClass} mt-1`} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label className="text-[10px] font-bold uppercase text-slate-400">To<input className={`${inputClass} mt-1`} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
          <button onClick={printEntries} type="button" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase text-white"><BiPrinter /> Print</button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead className="bg-slate-950/70 text-[10px] uppercase tracking-wider text-slate-400"><tr>
            <th className="p-3">Entry date</th><th className="p-3">Ticket</th><th className="p-3">Property</th><th className="p-3">Description</th><th className="p-3 text-right">Amount</th><th className="p-3">Bill to</th><th className="p-3">Status</th>{isFinance && <th className="p-3">Action</th>}
          </tr></thead>
          <tbody className="divide-y divide-white/5">
            {filteredEntries.length === 0 ? <tr><td colSpan={isFinance ? 8 : 7} className="p-8 text-center text-slate-400">No invoice entries for this date range.</td></tr> : filteredEntries.map(entry => <tr key={entry.id} className="bg-slate-950/30 text-slate-200">
              <td className="whitespace-nowrap p-3">{entry.entryDate}</td><td className="whitespace-nowrap p-3 font-mono text-blue-300">{entry.ticketNumber}</td><td className="p-3">{entry.property}</td><td className="max-w-xs p-3">{entry.description}{isFinance && <div className="mt-1 text-[10px] text-slate-500">Entered by {entry.ownerEmail || entry.ownerUid}</div>}</td><td className="whitespace-nowrap p-3 text-right">R {Number(entry.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td><td className="p-3">{entry.billTo}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${entry.status === 'Done' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'}`}>{entry.status || 'Pending'}</span></td>{isFinance && <td className="p-3">{entry.status !== 'Done' && <button onClick={() => markDone(entry)} className="whitespace-nowrap rounded-lg bg-emerald-600/20 px-3 py-2 text-[10px] font-bold text-emerald-200 hover:bg-emerald-600/30">Mark Done</button>}</td>}
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
