'use client';
import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../app/Config/firebaseConfig';
import { measureOf, number, roundQuantity, packPurchase, restock, restoreUsage, stocktake, consumeStock } from '../lib/stock/domain.mjs';

export const today = () => new Date(Date.now() + 7200000).toISOString().slice(0, 10);
export const newItem = () => ({ name: '', size: '', category: 'Maintenance', measure: 'each', packSize: '1', quantity: '1', unitCost: '', minQuantity: '1', location: '' });
export default function useStockStore() {
  const [items, setItems] = useState([]), [movements, setMovements] = useState([]), [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const inProgress = useRef(false);
  const [dialog, setDialog] = useState(null), [selected, setSelected] = useState(null);
  const [form, setForm] = useState(newItem);
  useEffect(() => {
    let subscriptions = [], mounted = true;
    const stop = () => { subscriptions.forEach(unsubscribe => unsubscribe()); subscriptions = []; };
    const authStop = onAuthStateChanged(auth, user => {
      stop(); setItems([]); setMovements([]); setJobs([]);
      if (!user) { setLoading(false); setError('Please sign in to manage the storeroom.'); return; }
      setLoading(true); setError('');
      for (const [name, field, setter] of [['stockItems', 'name', setItems], ['stockMovements', 'createdAt', setMovements], ['maintenance', 'createdAt', setJobs]]) {
        subscriptions.push(onSnapshot(query(collection(db, name), orderBy(field, name === 'stockItems' ? 'asc' : 'desc')), snapshot => {
          if (!mounted) return;
          setter(snapshot.docs.map(entry => ({ ...entry.data(), id: entry.id })));
          if (name === 'stockItems') setLoading(false);
        }, () => { if (mounted) { setError('Unable to load ' + name + '. Check your connection and account access.'); if (name === 'stockItems') setLoading(false); } }));
      }
    });
    return () => { mounted = false; authStop(); stop(); };
  }, []);
  const open = (type, item = null) => {
    setError(''); setSelected(item); setDialog(type);
    if (type === 'add') setForm(newItem());
    if (type === 'use') setForm({ quantity: '', entryUnit: measureOf(item), unit: '', jobId: '', date: today(), note: '' });
    if (type === 'restock') {
      const size = item.packSize || 1;
      setForm({ quantity: '1', packSize: String(size), unitCost: String(Math.round(Number(item.unitCost || 0) * size * 100) / 100), note: '' });
    }
    if (type === 'adjust') setForm({ quantity: String(item.quantity || 0), note: '' });
  };
  const close = () => { if (!inProgress.current) { setDialog(null); setSelected(null); setError(''); } };
  const change = (key, value) => { setError(''); setForm(previous => ({ ...previous, [key]: value })); };
  const mutate = async callback => {
    if (inProgress.current) return;
    inProgress.current = true; setBusy(true); setError('');
    try {
      if (!auth.currentUser) throw new Error('Please sign in to manage stock.');
      await callback(); setDialog(null); setSelected(null);
    } catch (e) { setError(e.message || 'Unable to save stock. Please try again.'); }
    finally { inProgress.current = false; setBusy(false); }
  };
  const metadata = () => ({ createdAt: serverTimestamp(), createdBy: auth.currentUser.uid, usageDate: today() });
  const create = () => mutate(async () => {
    if (!form.name.trim()) throw new Error('Enter an item name.');
    const packs = number(form.quantity, 'Starting packs', { whole: true });
    const purchase = packPurchase(Math.max(1, packs), form.packSize, form.unitCost, form.measure);
    const quantity = roundQuantity(packs * purchase.packSize);
    const minQuantity = number(form.minQuantity, 'Low stock threshold', { whole: form.measure === 'each' });
    const itemRef = doc(collection(db, 'stockItems')), movementRef = doc(collection(db, 'stockMovements'));
    await runTransaction(db, async tx => {
      tx.set(itemRef, { name: form.name.trim(), size: form.size.trim(), category: form.category, measure: form.measure, packSize: purchase.packSize, location: form.location.trim(), quantity, unitCost: purchase.unitCost, minQuantity, ...metadata(), updatedAt: serverTimestamp() });
      tx.set(movementRef, { stockItemId: itemRef.id, itemName: form.name.trim(), type: 'opening', quantity, measure: form.measure, unitCost: purchase.unitCost, totalCost: quantity * purchase.unitCost, note: 'Opening stock', ...metadata() });
    });
  });
  const save = () => {
    if (dialog === 'add') return create();
    return mutate(async () => {
      if (!selected) throw new Error('Select an item first.');
      const itemRef = doc(db, 'stockItems', selected.id), movementRef = doc(collection(db, 'stockMovements'));
      await runTransaction(db, async tx => {
        const snapshot = await tx.get(itemRef);
        if (!snapshot.exists()) throw new Error('This item no longer exists.');
        const item = snapshot.data(), measure = measureOf(item);
        const base = { stockItemId: selected.id, itemName: item.name, measure, size: item.size || '', note: (form.note || '').trim(), ...metadata() };
        let patch, movement;
        if (dialog === 'use') {
          if (!form.unit.trim()) throw new Error('Select the property / apartment where this stock was used.');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date || '') || !Number.isFinite(Date.parse(form.date)) || new Date(form.date).toISOString().slice(0, 10) !== form.date || form.date > today()) throw new Error('Choose a valid usage date, no later than today.');
          const job = jobs.find(job => job.id === form.jobId);
          const used = consumeStock(item, form.quantity, form.entryUnit);
          patch = { quantity: used.quantity };
          movement = { type: 'usage', quantity: used.used, unitCost: used.unitCost, totalCost: used.totalCost, unit: form.unit.trim().toUpperCase(), usageDate: form.date, jobCardId: job?.id || '', jobCardDisplayId: job?.displayId || '', jobCardIssueDate: job?.issueDate || '' };
        } else if (dialog === 'restock') {
          const purchase = packPurchase(form.quantity, form.packSize, form.unitCost, measure);
          patch = { ...restock(item, purchase), packSize: purchase.packSize };
          movement = { type: 'restock', quantity: purchase.quantity, unitCost: purchase.unitCost, totalCost: purchase.totalCost, packs: Number(form.quantity), packSize: purchase.packSize };
        } else if (dialog === 'adjust') {
          if (!form.note.trim()) throw new Error('Enter a reason for the stocktake adjustment.');
          const result = stocktake(item, form.quantity);
          patch = { quantity: result.quantity };
          movement = { type: 'adjustment', quantity: result.difference, before: result.before, after: result.quantity, unitCost: result.unitCost, totalCost: result.totalCost };
        } else throw new Error('Unknown stock action.');
        tx.update(itemRef, { ...patch, updatedAt: serverTimestamp() });
        tx.set(movementRef, { ...base, ...movement });
      });
    });
  };
  const undo = movement => {
    if (!window.confirm('Reverse this usage and return its quantity and recorded value to stock? The original entry will stay in history.')) return;
    return mutate(async () => {
      const movementRef = doc(db, 'stockMovements', movement.id), reversalRef = doc(collection(db, 'stockMovements'));
      await runTransaction(db, async tx => {
        const original = await tx.get(movementRef);
        if (!original.exists() || original.data().type !== 'usage') throw new Error('Usage record not found.');
        const data = original.data(), itemRef = doc(db, 'stockItems', data.stockItemId);
        const snapshot = await tx.get(itemRef);
        if (!snapshot.exists()) throw new Error('The stock item no longer exists.');
        const result = restoreUsage(snapshot.data(), data);
        tx.update(itemRef, { quantity: result.quantity, unitCost: result.unitCost, updatedAt: serverTimestamp() });
        tx.update(movementRef, { reversedAt: serverTimestamp(), reversalId: reversalRef.id });
        tx.set(reversalRef, { stockItemId: data.stockItemId, itemName: data.itemName, type: 'reversal', quantity: result.returned, measure: measureOf(snapshot.data()), unitCost: data.unitCost, totalCost: result.returnedValue, originalMovementId: movement.id, note: 'Reversed usage entry', ...metadata() });
      });
    });
  };
  return { items, movements, jobs, loading, error, busy, dialog, selected, form, open, close, change, save, undo };
}
