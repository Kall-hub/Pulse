'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/app/Config/firebaseConfig';
import { BiPlus, BiTime } from 'react-icons/bi';

const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const timeLabel = value => {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '';
};

export default function DailyTodoList({ user }) {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState('');
  const [activityText, setActivityText] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [selectedDate, setSelectedDate] = useState(dateKey);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setTasks([]);
    setError('');
    if (!user) { setLoading(false); return; }
    setLoading(true);
    return onSnapshot(query(collection(db, 'emailLogs'), where('ownerUid', '==', user.uid)), snapshot => {
      setTasks(snapshot.docs.map(item => ({ ...item.data(), id: item.id })).filter(item => ['dailyTask', 'dailyActivity'].includes(item.kind)));
      setLoading(false);
    }, err => { console.error('Could not load daily tasks:', err); setError('Your tasks could not be loaded. Please try again.'); setLoading(false); });
  }, [user]);

  const visible = tasks.filter(task => task.kind === 'dailyTask' && task.date === selectedDate).sort((a, b) => Number(a.completed) - Number(b.completed) || String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')));
  const activities = tasks.filter(item => item.kind === 'dailyActivity' && item.date === selectedDate).sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')));
  const completed = visible.filter(task => task.completed).length;
  const addTask = async event => {
    event.preventDefault();
    if (!user || !text.trim() || saving) return;
    setSaving(true);
    setError('');
    const now = new Date();
    try {
      await addDoc(collection(db, 'emailLogs'), {
        kind: 'dailyTask', note: text.trim(), ownerUid: user.uid,
        date: selectedDate, createdAt: serverTimestamp(), createdAtIso: now.toISOString(),
        completed: false, completedAt: null
      });
      setText('');
    } catch (err) { console.error('Could not add task:', err); setError('Task could not be added. Your text has been kept; please try again.'); }
    finally { setSaving(false); }
  };
  const addActivity = async event => {
    event.preventDefault();
    if (!user || !activityText.trim() || savingActivity) return;
    setSavingActivity(true);
    setActivityError('');
    const now = new Date();
    try {
      await addDoc(collection(db, 'emailLogs'), {
        kind: 'dailyActivity', note: activityText.trim(), ownerUid: user.uid,
        date: selectedDate, createdAt: serverTimestamp(), createdAtIso: now.toISOString()
      });
      setActivityText('');
    } catch (err) { console.error('Could not log activity:', err); setActivityError('Activity could not be saved. Your text has been kept; please try again.'); }
    finally { setSavingActivity(false); }
  };
  const toggleTask = async task => {
    if (!user || task.ownerUid !== user.uid || task.kind !== 'dailyTask' || busyIds.includes(task.id)) return;
    setBusyIds(current => [...current, task.id]);
    setError('');
    try {
      await updateDoc(doc(db, 'emailLogs', task.id), {
        completed: !task.completed, completedAt: task.completed ? null : serverTimestamp()
      });
    } catch (err) { console.error('Could not update task:', err); setError('Task status could not be saved. Please try again.'); }
    finally { setBusyIds(current => current.filter(id => id !== task.id)); }
  };

  return <section className="space-y-5 rounded-3xl border border-white/10 bg-slate-800/40 p-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-lg font-black text-white">Daily To-do</h2><p className="mt-1 text-xs text-slate-400">Small jobs and reminders for your day. Tick a task when it is done.</p></div>
      <div className="flex items-end gap-2"><label className="text-xs text-slate-400">Date<input aria-label="Daily log date" type="date" required value={selectedDate} onChange={event => { if (event.target.value) setSelectedDate(event.target.value); }} className="mt-1 block rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" /></label><button type="button" onClick={() => setSelectedDate(dateKey())} className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white">Today</button></div>
    </div>
    <form onSubmit={addTask} className="flex flex-col gap-3 sm:flex-row">
      <input aria-label="New task" placeholder="What do you need to do?" maxLength={1000} required value={text} onChange={event => setText(event.target.value)} disabled={!user || saving} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none" />
      <button type="submit" disabled={!user || saving || !text.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><BiPlus size={20} />{saving ? 'Adding…' : 'Add task'}</button>
    </form>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    <div className="flex items-center justify-between text-xs text-slate-400"><span>{visible.length - completed} remaining</span><span>{completed} of {visible.length} done</span></div>
    {loading ? <p role="status" className="py-8 text-center text-sm text-slate-400">Loading your tasks…</p> : !user ? <p className="py-8 text-center text-sm text-slate-400">Sign in to manage your daily tasks.</p> : visible.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-400">No tasks for this day. Add a reminder above.</p> : <ul className="space-y-2">
      {visible.map(task => <li key={task.id} className={`flex items-start gap-3 rounded-2xl border p-4 ${task.completed ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-white/10 bg-slate-950/40'}`}>
        <input type="checkbox" aria-label={`Mark ${task.note} ${task.completed ? 'incomplete' : 'done'}`} checked={!!task.completed} disabled={busyIds.includes(task.id)} onChange={() => toggleTask(task)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-emerald-500 disabled:opacity-50" />
        <div className="min-w-0 flex-1"><p className={`whitespace-pre-wrap text-sm [overflow-wrap:anywhere] ${task.completed ? 'text-slate-500 line-through' : 'text-white'}`}>{task.note}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400"><BiTime aria-hidden="true" /><span>Added {timeLabel(task.createdAt || task.createdAtIso)}</span>{task.completed && <span className="text-emerald-400">· Done{timeLabel(task.completedAt) ? ` at ${timeLabel(task.completedAt)}` : ''}</span>}</div></div>
      </li>)}
    </ul>}
    <div className="space-y-4 border-t border-white/10 pt-6">
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-black text-white">Activity Log</h3><p className="mt-1 text-xs text-slate-400">Record work you have already completed.</p></div><span className="text-xs text-slate-400">{activities.length} recorded</span></div>
      <form onSubmit={addActivity} className="flex flex-col gap-3 sm:flex-row">
        <input aria-label="Completed activity" placeholder="e.g. Sent emails to all clients" maxLength={1000} required value={activityText} onChange={event => setActivityText(event.target.value)} disabled={!user || savingActivity} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" />
        <button type="submit" disabled={!user || savingActivity || !activityText.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><BiPlus size={20} />{savingActivity ? 'Saving…' : 'Log activity'}</button>
      </form>
      {activityError && <p role="alert" className="text-sm text-rose-300">{activityError}</p>}
      {loading ? <p role="status" className="py-6 text-center text-sm text-slate-400">Loading activities…</p> : !user ? <p className="py-6 text-center text-sm text-slate-400">Sign in to record your activity.</p> : activities.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-sm text-slate-400">No activity recorded for this day.</p> : <ul className="space-y-2">
        {activities.map(activity => <li key={activity.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="whitespace-pre-wrap text-sm text-white [overflow-wrap:anywhere]">{activity.note}</p><div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400"><BiTime aria-hidden="true" /><span>Recorded {timeLabel(activity.createdAt || activity.createdAtIso)}</span></div></li>)}
      </ul>}
    </div>
  </section>;
}
