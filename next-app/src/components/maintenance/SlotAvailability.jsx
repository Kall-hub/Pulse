'use client';
import { useEffect, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaClock, FaTimes } from 'react-icons/fa';
import { CONTRACTORS, contractorName, bookingLoad, validDay } from '../../lib/tech/jobs.mjs';
import { DAY_START, DAY_END, clock, range, weekDays, addDays, daySlots, assignment, conflicts, appointmentLabel, validateAppointment } from '../../lib/maintenance/schedule.mjs';
import { saveSchedule } from '../../lib/maintenance/saveSchedule';
import styles from './slots.module.css';
const durationOptions = [15, 30, 45, 60, 90, 120, 180, 240, 480];
const shortDay = day => new Date(day + 'T12:00:00Z').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Johannesburg' });
export default function SlotAvailability({ jobs, today, initialJobId, fresh, openJob }) {
  const initial = jobs.find(job => job.id === initialJobId);
  const [day, setDay] = useState(validDay(initial?.appointmentDate) || today);
  const [person, setPerson] = useState(contractorName(initial || {}) || 'Rasta');
  const [duration, setDuration] = useState(range(initial || {})?.duration || 60);
  const [editor, setEditor] = useState(initial ? { id: initial.id, date: validDay(initial.appointmentDate) || today, time: initial.appointmentTime || '', expected: initial, allowUntimed: false } : null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [saving, setSaving] = useState(false), [now, setNow] = useState(() => new Date());
  const busy = useRef(false), formRef = useRef(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer); }, []);
  const days = weekDays(day), active = jobs.filter(job => job.status === 'active');
  const mine = jobs.filter(job => ['active', 'completed'].includes(job.status) && contractorName(job) === person);
  const dated = mine.filter(job => job.appointmentDate === day).sort((a,b) => (a.appointmentTime || '99').localeCompare(b.appointmentTime || '99'));
  const untimed = dated.filter(job => job.status === 'active' && !range(job));
  const slots = daySlots(jobs, person, day, duration, { excludeId: editor?.id, now });
  const candidate = editor ? { ...(active.find(job => job.id === editor.id) || {}), ...assignment(person), appointmentDate: editor.date, appointmentTime: editor.time, appointmentDuration: duration } : null;
  const problems = candidate ? conflicts(jobs, candidate) : { clashes: [], untimed: [] };
  const capacity = candidate ? bookingLoad(active, candidate, today) : null;
  const chooseDay = value => { if (busy.current || !validDay(value)) return; setDay(value); setEditor(null); setError(''); };
  const begin = (job, date = day, time = '') => {
    if (busy.current) return;
    setEditor({ id: job?.id || '', date, time: time || job?.appointmentTime || '', expected: job || null, allowUntimed: false });
    if (job && range(job) && !time) setDuration(range(job).duration);
    setError(''); setNotice('');
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
  };
  const unbook = async () => {
    if (!editor?.id || busy.current || !fresh || !window.confirm('Remove this appointment and free its slot? The job card will stay open.')) return;
    busy.current = true; setSaving(true); setError('');
    try {
      await saveSchedule(editor.id, { appointmentDate: '', appointmentTime: '', appointmentDuration: null }, jobs, { requireFuture: false, expected: editor.expected });
      setNotice('Appointment removed. The job card remains open and the calendar has been updated.'); setEditor(null);
    } catch (e) { setError(e.message); }
    finally { busy.current = false; setSaving(false); }
  };
  const save = async event => {
    event.preventDefault(); if (busy.current) return; setError('');
    if (!fresh) { setError('Reconnect and wait for the live schedule before booking.'); return; }
    if (!editor.id || !candidate?.id) { setError('Select an active job card.'); return; }
    try { validateAppointment(candidate); } catch (e) { setError(e.message); return; }
    if (problems.clashes.length) { setError('This appointment overlaps another job. Choose an open slot.'); return; }
    if (capacity.capacityWarning && !window.confirm(person + ' will have ' + (capacity.openBefore + 1) + ' open job cards, with ' + (capacity.bookedOnDateBefore + 1) + ' booked on this day. Review capacity. Continue?')) return;
    busy.current = true; setSaving(true);
    try {
      await saveSchedule(editor.id, { ...assignment(person), appointmentDate: editor.date, appointmentTime: editor.time, appointmentDuration: duration }, jobs, { allowUntimed: editor.allowUntimed, expected: editor.expected });
      setNotice('Booked ' + (candidate.displayId || candidate.unit) + ' with ' + person + ' on ' + shortDay(editor.date) + ', ' + editor.time + '–' + clock(range(candidate).end) + '.');
      setEditor(null);
    } catch (e) { setError(e.message || 'Unable to save this booking. Please try again.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <section className={styles.root}>
    <header className={styles.header}><div><p className={styles.eyebrow}>PULSE SCHEDULING</p><h2>Slot Availability</h2><p>Choose a contractor, find a space, then book the job card. All times are SAST.</p></div><span className={styles.live} data-live={fresh}>{fresh ? 'Live Pulse schedule' : 'Waiting for live schedule'}</span></header>
    {!fresh && <p className={styles.warning} role="status">Availability is unconfirmed while the schedule is offline or still loading. Booking is paused until it reconnects.</p>}
    {notice && <p role="status" className={styles.success}>{notice}</p>}
    <fieldset className={styles.controls} disabled={saving}><label>Contractor<select value={person} onChange={event => { setPerson(event.target.value); setEditor(null); setError(''); }}>{CONTRACTORS.map(name => <option key={name}>{name}</option>)}</select></label><label>Appointment length<select value={duration} onChange={event => setDuration(Number(event.target.value))}>{durationOptions.map(value => <option value={value} key={value}>{value < 60 ? value + ' min' : value / 60 + ' hr'}</option>)}</select></label><label>View date<input type="date" value={day} onChange={event => chooseDay(event.target.value)}/></label><div className={styles.weekNav}><button aria-label="Previous week" onClick={() => chooseDay(addDays(day, -7))}><FaChevronLeft/></button><button onClick={() => chooseDay(today)}>Today</button><button aria-label="Next week" onClick={() => chooseDay(addDays(day, 7))}><FaChevronRight/></button></div></fieldset>
    <p className={styles.help}>Availability uses Pulse bookings. Add existing office appointments to their job cards here. Allow enough appointment time for the repair and travel; new work starts with Log Request, then Approve & Assign.</p>
    <div className={styles.legend}><span><i className={styles.openDot}/>Open space</span><span><i className={styles.bookedDot}/>Booked job card</span><span><i className={styles.reviewDot}/>Time needed / review</span><span>Working day 08:00–16:00</span></div>
    <div className={styles.weekScroll}><div className={styles.weekGrid}><div className={styles.timeAxis}><div className={styles.axisHeader}>Time</div><div className={styles.axisBody}>{Array.from({ length: 9 },(_,index) => <span key={index} style={{ top: index * 72 }}>{clock(DAY_START + index * 60)}</span>)}</div></div>
      {days.map(date => {
        const booked = mine.filter(job => job.appointmentDate === date), missing = booked.filter(job => job.status === 'active' && !range(job));
        const weekSlots = daySlots(active, person, date, duration, { excludeId: editor?.id, now });
        return <div className={styles.dayColumn} data-selected={date === day} data-past={date < today} key={date}><button className={styles.dayHeader} onClick={() => chooseDay(date)}><strong>{shortDay(date)}</strong><span>{booked.length} booked{missing.length ? ' · ' + missing.length + ' need times' : ''}</span></button><div className={styles.dayBody} data-review={missing.length > 0}>
          {weekSlots.filter(slot => slot.status === 'open' || slot.status === 'review' || slot.status === 'current').map(slot => <button key={slot.time} disabled={!fresh} className={styles.emptySlot} data-status={slot.status} style={{ top: (slot.start - DAY_START) * 1.2, height: 18 }} aria-label={person + ', ' + shortDay(date) + ' ' + slot.time + '–' + slot.end + (slot.status === 'review' ? ', review untimed job cards' : ', open')} onClick={() => { setDay(date); begin(active.find(job => job.id === editor?.id), date, slot.time); }}><span>{slot.time}</span></button>)}
          {booked.filter(job => range(job)).map(job => { const period = range(job); return <button className={styles.bookingBlock} key={job.id} style={{ top: (period.start - DAY_START) * 1.2, height: Math.max(18, period.duration * 1.2 - 2) }} title={appointmentLabel(job) + ' · ' + job.displayId + ' · ' + job.unit} onClick={() => { if (job.status === 'completed') openJob(job.id); else { setDay(date); begin(job, date); } }}><b>{appointmentLabel(job)}</b><span>{job.displayId}{job.status === 'completed' ? ' · Done' : ''}</span><span>{job.unit}</span></button>; })}
        </div></div>;
      })}
    </div></div>
    <div className={styles.dayStrip}>{days.map(date => <button key={date} data-selected={date === day} onClick={() => chooseDay(date)}>{new Date(date + 'T12:00:00Z').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', timeZone: 'Africa/Johannesburg' })}<span>{mine.filter(job => job.appointmentDate === date).length} booked</span></button>)}</div>
    <p className={styles.mobileHint}>Swipe the dates to see the rest of the week.</p>
    <div className={styles.detailGrid}><section><div className={styles.sectionTitle}><h3>{person} · {shortDay(day)}</h3><span>{dated.length} booked</span></div>
      {untimed.length > 0 && <p className={styles.warning}>{untimed.length} job card(s) have a date but no complete time range. Set their times before treating gaps as confirmed availability.</p>}
      {dated.length ? dated.map(job => <article className={styles.agendaCard} key={job.id}><div><strong>{job.status === 'completed' ? 'Done · ' : ''}{appointmentLabel(job)}</strong><p>{job.displayId} · {job.unit}</p></div><div>{job.status === 'active' && <button onClick={() => begin(job)}>Change time</button>}<button onClick={() => openJob(job.id)}>View job card</button></div></article>) : <p className={styles.empty}>No job cards booked for this day.</p>}
      <h4 className={styles.slotHeading}>Start a {duration}-minute appointment</h4>{editor?.id && <p className={styles.help}>“This card” marks its existing time, which can be reused while rescheduling.</p>}<div className={styles.slotGrid}>{slots.map(slot => <button key={slot.time} data-status={fresh ? slot.status : 'unconfirmed'} disabled={!fresh || slot.status === 'past' || slot.status === 'booked'} onClick={() => begin(active.find(job => job.id === editor?.id), day, slot.time)}><strong>{slot.time}</strong><span>{!fresh ? 'Unconfirmed' : slot.status === 'open' ? 'Open' : slot.status === 'current' ? 'This card' : slot.status === 'review' ? 'Review times' : slot.status === 'past' ? 'Past' : 'Booked'}</span></button>)}</div>
    </section><section ref={formRef} className={styles.editor}>
      {editor ? <form onSubmit={save}><div className={styles.sectionTitle}><h3>{editor.expected?.appointmentDate ? 'Update appointment' : 'Book an appointment'}</h3><button aria-label="Close appointment form" type="button" disabled={saving} onClick={() => setEditor(null)}><FaTimes/></button></div><p className={styles.help}>Contractor: <strong>{person}</strong></p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <fieldset disabled={saving}><label>Job card<select required value={editor.id} onChange={event => { const job = active.find(job => job.id === event.target.value); setEditor(previous => ({ ...previous, id: event.target.value, expected: job, allowUntimed: false })); setError(''); }}><option value="">Choose an active job card</option>{active.map(job => <option key={job.id} value={job.id}>{job.displayId} · {job.unit} · {contractorName(job) || 'Unassigned'}</option>)}</select></label>
          {editor.expected && contractorName(editor.expected) !== person && <p className={styles.warning}>This will assign {editor.expected.displayId || 'this card'} to {person}.</p>}
          <label>Appointment date<input type="date" required value={editor.date} onChange={event => { setEditor(previous => ({ ...previous, date: event.target.value, allowUntimed: false })); if (validDay(event.target.value)) setDay(event.target.value); }}/></label>
          <label>Start time<select required value={editor.time} onChange={event => setEditor(previous => ({ ...previous, time: event.target.value }))}><option value="">Choose a time</option>{Array.from({ length: (DAY_END - DAY_START) / 15 }, (_, index) => clock(DAY_START + index * 15)).filter(time => Number(time.slice(0,2)) * 60 + Number(time.slice(3)) + duration <= DAY_END).map(time => <option key={time}>{time}</option>)}</select></label>
          <p className={styles.help}>Duration: {duration} minutes{range(candidate) ? ' · ends at ' + clock(range(candidate).end) : ''}. Change the appointment length above if needed.</p>
          {problems.clashes.length > 0 && <p className={styles.error}>Overlaps {problems.clashes.map(job => job.displayId || job.unit).join(', ')}. Choose another time.</p>}
          {problems.untimed.length > 0 && <label className={styles.check}><input type="checkbox" checked={editor.allowUntimed} onChange={event => setEditor(previous => ({ ...previous, allowUntimed: event.target.checked }))}/><span>I have reviewed the other {problems.untimed.length} untimed card(s). This gap is not yet confirmed free.</span></label>}
          <button className={styles.primaryButton} disabled={!fresh || saving || !editor.id || problems.clashes.length > 0 || (problems.untimed.length > 0 && !editor.allowUntimed)}>{saving ? 'Saving appointment...' : 'Save appointment'}</button>
          {editor.expected?.appointmentDate && <button type="button" className={styles.unbookButton} disabled={!fresh || saving} onClick={unbook}>Remove appointment · keep job open</button>}
        </fieldset>
      </form> : <div className={styles.editorEmpty}><FaClock/><h3>Find the space. Book the job.</h3><p>Click an open time in the week, or select a start time on the left. Then choose the matching job card.</p><button className={styles.primaryButton} disabled={!fresh} onClick={() => begin(null, day)}>Choose a job card to book</button></div>}
      <div className={styles.unbooked}><h4>Cards needing a date · {person}</h4>{mine.filter(job => job.status === 'active' && !validDay(job.appointmentDate)).length ? mine.filter(job => !validDay(job.appointmentDate)).map(job => <button key={job.id} onClick={() => begin(job, day)}>{job.displayId} · {job.unit}<span>Book a time →</span></button>) : <p className={styles.help}>No undated cards for this contractor.</p>}</div>
    </section></div>
  </section>;
}
