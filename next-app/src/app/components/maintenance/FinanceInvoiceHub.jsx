'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { auth, db } from '@/app/Config/firebaseConfig';
import { BiPrinter } from 'react-icons/bi';

const today = () => new Date().toISOString().slice(0, 10);
const printable = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const monthKeyFromDate = (value = '') => {
  const date = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  return date.slice(0, 7);
};
const monthLabel = (value = '') => {
  const key = monthKeyFromDate(value);
  if (!key) return 'No month';
  const [year, month] = key.split('-');
  const parsed = new Date(Number(year), Number(month) - 1, 1);
  return parsed.toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
};
const money = (value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 'R0.00';
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function FinanceInvoiceHub() {
  const [user, setUser] = useState(null);
  const [isPqa, setIsPqa] = useState(false);
  const [isFinance, setIsFinance] = useState(false);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [form, setForm] = useState({ ticketNumber: '', invoiceNumber: '', property: '', description: '', amount: '', billTo: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ ticketNumber: '', invoiceNumber: '', property: '', description: '', amount: '', billTo: '', entryDate: today() });

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

  const ensureMonthDocument = async (entryDate) => {
    const key = monthKeyFromDate(entryDate);
    if (!key || !user) return;
    const monthRef = doc(db, 'financeMonths', key);
    const monthSnap = await getDoc(monthRef);
    if (monthSnap.exists()) {
      await updateDoc(monthRef, { updatedAt: serverTimestamp(), monthLabel: monthLabel(key) });
      return;
    }
    await setDoc(monthRef, {
      monthKey: key,
      monthLabel: monthLabel(key),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ownerUid: user.uid || '',
      fileType: 'month'
    });
  };

  const filteredEntries = useMemo(() => entries.filter(entry =>
    (!startDate || entry.entryDate >= startDate) && (!endDate || entry.entryDate <= endDate)
  ), [entries, startDate, endDate]);

  const groupedEntries = useMemo(() => {
    const grouped = new Map();
    filteredEntries.forEach(entry => {
      const key = monthKeyFromDate(entry.entryDate) || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, { key, label: monthLabel(key), entries: [] });
      }
      grouped.get(key).entries.push(entry);
    });
    return Array.from(grouped.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredEntries]);

  const canManageEntry = entry => isFinance || entry.ownerUid === user?.uid;

  const submit = async event => {
    event.preventDefault();
    if (!user || !isPqa) { setError('Only PQA accounts can create invoice entries.'); return; }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0) { setError('Enter a valid amount.'); return; }
    const entryDate = today();
    setSaving(true);
    try {
      await addDoc(collection(db, 'financeEntries'), {
        ...form,
        invoiceNumber: form.invoiceNumber.trim(),
        amount,
        ownerUid: user.uid,
        ownerEmail: user.email || '',
        entryDate,
        createdAt: serverTimestamp(),
        status: 'Pending'
      });
      await ensureMonthDocument(entryDate);
      setForm({ ticketNumber: '', invoiceNumber: '', property: '', description: '', amount: '', billTo: '' });
      setError('');
    } catch (err) { console.error('Could not save finance entry:', err); setError('Invoice entry could not be saved.'); }
    finally { setSaving(false); }
  };

  const startEdit = entry => {
    setEditingId(entry.id);
    setEditForm({
      ticketNumber: entry.ticketNumber || '',
      invoiceNumber: entry.invoiceNumber || '',
      property: entry.property || '',
      description: entry.description || '',
      amount: String(entry.amount ?? ''),
      billTo: entry.billTo || '',
      entryDate: entry.entryDate || today()
    });
  };

  const saveEdit = async entryId => {
    const amount = Number(editForm.amount);
    if (!Number.isFinite(amount) || amount < 0) { setError('Enter a valid amount.'); return; }
    try {
      await updateDoc(doc(db, 'financeEntries', entryId), {
        ticketNumber: editForm.ticketNumber.trim(),
        invoiceNumber: editForm.invoiceNumber.trim(),
        property: editForm.property.trim(),
        description: editForm.description.trim(),
        amount,
        billTo: editForm.billTo.trim(),
        entryDate: editForm.entryDate || today()
      });
      await ensureMonthDocument(editForm.entryDate || today());
      setEditingId(null);
      setError('');
    } catch (err) { console.error('Could not update finance entry:', err); setError('Entry could not be updated.'); }
  };

  const handleDelete = async entry => {
    if (!window.confirm(`Delete invoice ${entry.ticketNumber || entry.invoiceNumber || 'entry'}?`)) return;
    try {
      await deleteDoc(doc(db, 'financeEntries', entry.id));
      setError('');
    } catch (err) { console.error('Could not delete finance entry:', err); setError('Entry could not be deleted.'); }
  };

  const markDone = async entry => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'financeEntries', entry.id), {
        status: 'Done', processedAt: serverTimestamp(), processedByUid: user.uid
      });
    } catch (err) { console.error('Could not process finance entry:', err); setError('Entry could not be marked done.'); }
  };

  const printEntries = () => {
    const rows = filteredEntries.map(entry => {
      const amountText = money(entry.amount);
      return `<tr>
        <td>${printable(entry.entryDate)}</td>
        <td>${printable(entry.ticketNumber)}</td>
        <td>${printable(entry.invoiceNumber || '')}</td>
        <td>${printable(entry.property)}</td>
        <td>${printable(entry.description)}</td>
        <td>${printable(amountText)}</td>
        <td>${printable(entry.billTo)}</td>
        <td>${printable(entry.status)}</td>
      </tr>`;
    }).join('');

    const popup = window.open('', '_blank', 'width=1000,height=750');
    if (!popup) { setError('Allow pop-ups to print invoices.'); return; }
    popup.document.write(`<!doctype html><html><head><title>Finance invoices</title><style>
      body{font:14px Arial,sans-serif;padding:24px;color:#111}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top;word-wrap:break-word;white-space:normal}th{background:#f3f4f6;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#374151}td{font-size:12px}
    </style></head><body><h1>Finance invoices</h1><table><thead><tr><th>Entry date</th><th>Ticket</th><th>Invoice</th><th>Property</th><th>Description</th><th>Amount</th><th>Bill to</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    popup.document.close();
  };

  const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none';

  return <div className="space-y-6">
    {isPqa && <form onSubmit={submit} className="rounded-3xl border border-white/5 bg-slate-800/40 p-6 space-y-4">
      <div><h3 className="text-sm font-black uppercase tracking-wider">New invoice entry</h3><p className="mt-1 text-xs text-slate-400">Entries are visible to you and the Finance team.</p></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input className={inputClass} placeholder="Ticket number" required value={form.ticketNumber} onChange={e => setForm({ ...form, ticketNumber: e.target.value })} />
        <input className={inputClass} placeholder="Invoice number" required value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
        <input className={inputClass} placeholder="Property" required value={form.property} onChange={e => setForm({ ...form, property: e.target.value })} />
        <input className={inputClass} placeholder="Amount (R)" type="number" min="0" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <input className={`${inputClass} md:col-span-2`} placeholder="Description" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <input className={`${inputClass} md:col-span-2`} placeholder="Bill to" required value={form.billTo} onChange={e => setForm({ ...form, billTo: e.target.value })} />
      </div>
      <button disabled={saving || !user} className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save invoice entry'}</button>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    </form>}

    <section className="rounded-3xl border border-white/5 bg-slate-800/40 p-6 space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><h3 className="text-sm font-black uppercase tracking-wider">{isFinance ? 'All invoice entries' : 'My invoice entries'}</h3><p className="mt-1 text-xs text-slate-400">Filter by entry date for the invoice list below.</p></div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-bold uppercase text-slate-400">From<input className={`${inputClass} mt-1`} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label className="text-[10px] font-bold uppercase text-slate-400">To<input className={`${inputClass} mt-1`} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
          <button onClick={printEntries} type="button" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase text-white"><BiPrinter /> Print</button>
        </div>
      </div>

      {groupedEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8 text-center text-slate-400">No invoice entries for this date range.</div>
      ) : groupedEntries.map(monthGroup => (
        <div key={monthGroup.key} className="rounded-2xl border border-white/10 bg-slate-900/30">
          <div className="border-b border-white/10 bg-slate-950/50 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-300">
            {monthGroup.label}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left text-xs">
              <thead className="bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-3">Entry date</th>
                  <th className="p-3">Ticket</th>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Property</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Bill to</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 align-top">
                {monthGroup.entries.map(entry => {
                  const rowIsEditing = editingId === entry.id;
                  const canModify = canManageEntry(entry);

                  if (rowIsEditing) {
                    return (
                      <tr key={entry.id} className="align-top">
                        <td className="p-2 align-top"><input className={inputClass} type="date" value={editForm.entryDate} onChange={e => setEditForm({ ...editForm, entryDate: e.target.value })} /></td>
                        <td className="p-2 align-top"><input className={inputClass} value={editForm.ticketNumber} onChange={e => setEditForm({ ...editForm, ticketNumber: e.target.value })} /></td>
                        <td className="p-2 align-top"><input className={inputClass} value={editForm.invoiceNumber} onChange={e => setEditForm({ ...editForm, invoiceNumber: e.target.value })} /></td>
                        <td className="p-2 align-top"><input className={inputClass} value={editForm.property} onChange={e => setEditForm({ ...editForm, property: e.target.value })} /></td>
                        <td className="p-2 align-top"><textarea className={`${inputClass} min-h-[72px]`} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></td>
                        <td className="p-2 align-top"><input className={inputClass} type="number" min="0" step="0.01" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} /></td>
                        <td className="p-2 align-top"><input className={inputClass} value={editForm.billTo} onChange={e => setEditForm({ ...editForm, billTo: e.target.value })} /></td>
                        <td className="p-2 align-top">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${entry.status === 'Done' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="p-2 align-top">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => saveEdit(entry.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white">Save</button>
                            <button type="button" onClick={() => setEditingId(null)} className="rounded-lg bg-slate-700 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="whitespace-nowrap p-3 align-top">{entry.entryDate}</td>
                      <td className="whitespace-nowrap p-3 align-top font-mono text-blue-300">{entry.ticketNumber}</td>
                      <td className="whitespace-nowrap p-3 align-top font-mono text-violet-300">{entry.invoiceNumber || '—'}</td>
                      <td className="p-3 align-top">{entry.property}</td>
                      <td className="max-w-[260px] break-words p-3 align-top">{entry.description}</td>
                      <td className="whitespace-nowrap p-3 align-top text-right font-semibold text-emerald-300">{money(entry.amount)}</td>
                      <td className="p-3 align-top">{entry.billTo}</td>
                      <td className="whitespace-nowrap p-3 align-top">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${entry.status === 'Done' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-3 align-top">
                        <div className="flex justify-end gap-2">
                          {canModify && (
                            <>
                              <button type="button" onClick={() => startEdit(entry)} className="rounded-lg bg-amber-500 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-950">Edit</button>
                              <button type="button" onClick={() => handleDelete(entry)} className="rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white">Delete</button>
                            </>
                          )}
                          {isFinance && entry.status !== 'Done' && (
                            <button type="button" onClick={() => markDone(entry)} className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white">Done</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  </div>;
}
