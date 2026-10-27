'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '@/app/Config/firebaseConfig';
import { BiPrinter, BiPencil, BiTrash } from 'react-icons/bi';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const emptyForm = () => ({ invoiceNumber: '', ticketNumber: '', property: '', description: '', amount: '', billTo: '' });
const money = value => `R${Number(value || 0).toFixed(2)}`;
const printable = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export default function FinanceInvoiceHub() {
  const [user, setUser] = useState(null);
  const [isPqa, setIsPqa] = useState(false);
  const [isFinance, setIsFinance] = useState(false);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => today().slice(0, 7));
  const [selectedMonth, setSelectedMonth] = useState(() => today().slice(0, 7));
  const [editingId, setEditingId] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);
  const editorRef = useRef(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => onAuthStateChanged(auth, async currentUser => {
    setUser(currentUser);
    setIsFinance(false);
    setIsPqa(false);
    if (!currentUser) return;
    try {
      const profile = await getDoc(doc(db, 'stuff', currentUser.uid));
      const role = profile.exists() ? profile.data().role : '';
      setIsFinance(role === 'Finance');
      setIsPqa(role === 'PQA');
    } catch (err) { console.error('Could not load account role:', err); }
  }), []);

  useEffect(() => {
    if (!user) { setEntries([]); return; }
    const entriesQuery = isFinance ? collection(db, 'financeEntries') : query(collection(db, 'financeEntries'), where('ownerUid', '==', user.uid));
    return onSnapshot(entriesQuery, snapshot => {
      const loaded = snapshot.docs.map(entry => ({ ...entry.data(), id: entry.id }));
      loaded.sort((a, b) => String(b.entryDate || '').localeCompare(String(a.entryDate || '')));
      setEntries(loaded);
      setError('');
    }, err => { console.error('Could not load finance entries:', err); setError('Finance entries could not be loaded.'); });
  }, [user, isFinance]);

  useEffect(() => {
    const timer = setInterval(() => {
      const month = today().slice(0, 7);
      if (month !== currentMonth) {
        setCurrentMonth(month);
        setSelectedMonth(previous => previous === currentMonth ? month : previous);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [currentMonth]);

  const canManage = entry => !!user && !!entry && entry.status !== 'Done' && (isFinance || (isPqa && entry.ownerUid === user.uid));

  useEffect(() => {
    if (editingId) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      editorRef.current?.querySelector('input')?.focus({ preventScroll: true });
    }
  }, [editingId]);
  const months = [...new Set([currentMonth, selectedMonth, ...entries.map(entry => entry.entryDate?.slice(0, 7))].filter(Boolean))].sort().reverse();
  const invalidRange = !!startDate && !!endDate && startDate > endDate;
  const filteredEntries = useMemo(() => entries.filter(entry =>
    (!selectedMonth || entry.entryDate?.slice(0, 7) === selectedMonth) &&
    (!startDate || entry.entryDate >= startDate) && (!endDate || entry.entryDate <= endDate)
  ), [entries, selectedMonth, startDate, endDate]);

  const submit = async event => {
    event.preventDefault();
    if (!user || (editingId ? !canManage(entries.find(entry => entry.id === editingId)) : !isPqa)) {
      setError('You do not have permission to save this invoice entry.'); return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0) { setError('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'financeEntries', editingId), { ...form, amount });
      } else {
        await addDoc(collection(db, 'financeEntries'), {
          ...form, amount, ownerUid: user.uid, ownerEmail: user.email || '',
          entryDate: today(), createdAt: serverTimestamp(), status: 'Pending'
        });
      }
      setForm(emptyForm());
      setEditingId(null);
      setError('');
    } catch (err) { console.error('Could not save finance entry:', err); setError(err.code === 'permission-denied' ? 'Save was denied. Completed entries are locked; pending entries require the updated Firestore rules to be deployed.' : 'Invoice entry could not be saved.'); }
    finally { setSaving(false); }
  };

  const editEntry = entry => {
    if (!canManage(entry)) return;
    setForm(Object.fromEntries(Object.keys(emptyForm()).map(key => [key, entry[key] ?? ''])));
    setEditingId(entry.id);
    setError('');
  };
  const deleteEntry = async entry => {
    if (!canManage(entries.find(item => item.id === entry.id))) {
      setError('Completed or unavailable entries cannot be deleted.');
      setDeletingEntry(null);
      return;
    }
    setBusyId(entry.id);
    try {
      await deleteDoc(doc(db, 'financeEntries', entry.id));
      setDeletingEntry(null);
      if (editingId === entry.id) { setEditingId(null); setForm(emptyForm()); }
      setError('');
    } catch (err) { console.error('Could not delete finance entry:', err); setError(err.code === 'permission-denied' ? 'Delete was denied. Completed entries are locked; pending entries require the updated Firestore rules to be deployed.' : 'Invoice entry could not be deleted.'); }
    finally { setBusyId(null); }
  };
  const markDone = async entry => {
    if (!isFinance || !user || entry.status === 'Done') return;
    setBusyId(entry.id);
    try {
      await updateDoc(doc(db, 'financeEntries', entry.id), { status: 'Done', processedAt: serverTimestamp(), processedByUid: user.uid });
      if (editingId === entry.id) { setEditingId(null); setForm(emptyForm()); }
      setError('');
    } catch (err) { console.error('Could not process finance entry:', err); setError('Entry could not be marked done.'); }
    finally { setBusyId(null); }
  };

  const printEntries = () => {
    const rows = filteredEntries.map(entry => `<tr>${[entry.entryDate, entry.invoiceNumber, entry.ticketNumber, entry.property, entry.description, money(entry.amount), entry.billTo, entry.status || 'Pending'].map(value => `<td>${printable(value)}</td>`).join('')}</tr>`).join('');
    const popup = window.open('', '_blank', 'width=1000,height=750');
    if (!popup) { setError('Allow pop-ups to print invoices.'); return; }
    popup.document.write(`<!doctype html><html><head><title>Finance invoices</title><style>body{font:14px Arial,sans-serif;padding:24px;color:#111}h1{font-size:22px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #bbb;padding:8px;text-align:left;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}th{background:#eee}@media print{button{display:none}}</style></head><body><h1>Finance &amp; Invoices</h1><p>Month: ${printable(selectedMonth || 'All months')} | Entry date: ${printable(startDate || 'Any')} to ${printable(endDate || 'Any')}</p><table><thead><tr><th>Date</th><th>Invoice</th><th>Ticket</th><th>Property</th><th>Description</th><th>Amount</th><th>Bill to</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="8">No entries for these filters.</td></tr>'}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  };

  const inputClass = 'w-full min-w-0 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none';
  return <div className="space-y-6">
    {(isPqa || editingId) && <form ref={editorRef} onSubmit={submit} className="rounded-3xl border border-white/5 bg-slate-800/40 p-6 space-y-4">
      <div><h3 className="text-sm font-black uppercase tracking-wider">{editingId ? 'Edit invoice entry' : 'New invoice entry'}</h3><p className="mt-1 text-xs text-slate-400">Entries are visible to you and the Finance team.</p></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {['invoiceNumber', 'ticketNumber', 'property', 'billTo'].map(key => <label key={key} className="text-xs text-slate-400">{{ invoiceNumber: 'Invoice number', ticketNumber: 'Ticket number', property: 'Property', billTo: 'Bill to' }[key]}<input className={`${inputClass} mt-1`} required={key !== 'invoiceNumber'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
        <label className="text-xs text-slate-400 md:col-span-2">Description<textarea rows={3} className={`${inputClass} mt-1 resize-y`} required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
        <label className="text-xs text-slate-400">Amount (ZAR)<input className={`${inputClass} mt-1`} type="number" min="0" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
      </div>
      <button disabled={saving || !user || (editingId && !canManage(entries.find(entry => entry.id === editingId)))} className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save invoice entry'}</button>
      {editingId && <button type="button" disabled={saving} onClick={() => { setEditingId(null); setForm(emptyForm()); }} className="ml-3 text-sm text-slate-300">Cancel edit</button>}
    </form>}

    {deletingEntry && <div role="alertdialog" aria-modal="true" aria-labelledby="delete-invoice-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-sm space-y-4 rounded-2xl border border-white/20 bg-slate-900 p-6 text-white"><h3 id="delete-invoice-title" className="font-bold">Delete invoice entry?</h3><p className="text-sm text-slate-300">Delete {deletingEntry.invoiceNumber || deletingEntry.ticketNumber}? This cannot be undone.</p><div className="flex gap-3"><button type="button" disabled={!!busyId} onClick={() => setDeletingEntry(null)} className="rounded-lg bg-slate-700 px-4 py-2 disabled:opacity-50">Cancel</button><button type="button" disabled={!!busyId || !canManage(entries.find(entry => entry.id === deletingEntry.id))} onClick={() => deleteEntry(deletingEntry)} className="rounded-lg bg-rose-600 px-4 py-2 disabled:opacity-50">{busyId ? 'Deleting…' : 'Delete'}</button></div>{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}</div></div>}
    {error && !deletingEntry && <p role="alert" className="sticky top-4 z-10 rounded-xl bg-rose-950 p-4 text-sm text-rose-200">{error}</p>}
    <section className="rounded-3xl border border-white/5 bg-slate-800/40 p-6 space-y-4">
      <div><h3 className="text-sm font-black uppercase tracking-wider">{isFinance ? 'All invoice entries' : 'My invoice entries'}</h3><p className="mt-1 text-xs text-slate-400">Each month starts a fresh view. Previous entries remain available through the filters.</p></div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
        <label className="text-[10px] font-bold uppercase text-slate-400">Month<select className={`${inputClass} mt-1`} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}><option value="">All months</option>{months.map(month => <option key={month} value={month}>{new Date(`${month}-01T12:00:00`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</option>)}</select></label>
        <label className="text-[10px] font-bold uppercase text-slate-400">Start date<input className={`${inputClass} mt-1`} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
        <label className="text-[10px] font-bold uppercase text-slate-400">End date<input className={`${inputClass} mt-1`} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
        <button onClick={printEntries} disabled={invalidRange} type="button" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-50"><BiPrinter /> Print</button>
      </div>
      {invalidRange && <p role="alert" className="text-sm text-rose-300">End date must be on or after start date.</p>}
      <div className="overflow-x-auto rounded-xl border border-white/20">
        <table className="w-full min-w-[1200px] table-fixed border-collapse text-left text-xs [&_th]:border [&_th]:border-white/20 [&_td]:border [&_td]:border-white/20 [&_td]:align-top [&_td]:[overflow-wrap:anywhere]">
          <thead className="bg-slate-950/70 text-[10px] uppercase tracking-wider text-slate-400"><tr>
            <th className="w-28 p-3">Entry date</th><th className="p-3">Invoice</th><th className="p-3">Ticket</th><th className="p-3">Property</th><th className="w-64 p-3">Description</th><th className="p-3 text-right">Amount (ZAR)</th><th className="p-3">Bill to</th><th className="w-24 p-3">Status</th><th className="w-40 p-3">Actions</th>
          </tr></thead>
          <tbody>
            {filteredEntries.length === 0 ? <tr><td colSpan={9} className="p-8 text-center text-slate-400">No invoice entries for these filters.</td></tr> : filteredEntries.map(entry => <tr key={entry.id} className="bg-slate-950/30 text-slate-200">
              <td className="p-3">{entry.entryDate}</td><td className="p-3">{entry.invoiceNumber || '—'}</td><td className="p-3 font-mono text-blue-300">{entry.ticketNumber}</td><td className="p-3">{entry.property}</td>
              <td className="whitespace-pre-wrap p-3">{entry.description}{isFinance && <div className="mt-1 text-[10px] text-slate-500">Entered by {entry.ownerEmail || entry.ownerUid}</div>}</td>
              <td className="p-3 text-right">{money(entry.amount)}</td><td className="p-3">{entry.billTo}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${entry.status === 'Done' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'}`}>{entry.status || 'Pending'}</span></td>
              <td className="p-3"><div className="flex flex-wrap items-center gap-2">{entry.status === 'Done' && <span className="text-slate-500">Completed · locked</span>}
                {canManage(entry) && <><button type="button" aria-label="Edit invoice entry" title="Edit invoice entry" disabled={saving || busyId === entry.id} onClick={() => editEntry(entry)} className="rounded-lg p-2 text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"><BiPencil size={18} /></button><button type="button" aria-label="Delete invoice entry" title="Delete invoice entry" disabled={saving || busyId === entry.id} onClick={() => { setError(''); setDeletingEntry(entry); }} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"><BiTrash size={18} /></button></>}
                {isFinance && entry.status !== 'Done' && <button type="button" disabled={busyId === entry.id} onClick={() => markDone(entry)} className="whitespace-nowrap rounded-lg bg-emerald-600/20 px-3 py-2 text-[10px] font-bold text-emerald-200 disabled:opacity-50">Mark Done</button>}
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
