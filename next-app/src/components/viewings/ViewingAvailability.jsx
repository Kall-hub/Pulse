'use client';
import { useState } from 'react';
import { normalizeAgent } from '../../lib/viewings/domain.mjs';
import { hostBookings, viewingSlots, monthDays } from '../../lib/viewings/calendar.mjs';
import useSastDay from '../../hooks/useSastDay';
import styles from './availability.module.css';
export default function ViewingAvailability({ viewings, ready, onBook, onOpenBooking }) {
 const today = useSastDay();
 const [day, setDay] = useState(today), [month, setMonth] = useState(today.slice(0, 7)), [agent, setAgent] = useState('');
 const hosts = [...new Map(viewings.filter(v => normalizeAgent(v.agent)).map(v => [normalizeAgent(v.agent), v.agent.trim()])).values()].sort();
 const bookings = hostBookings(viewings, agent, day).sort((a,b) => (a.time || '').localeCompare(b.time || ''));
 const slots = viewingSlots(viewings, agent, day);
 const changeMonth = offset => { const date = new Date(month + '-01T12:00:00Z'); date.setUTCMonth(date.getUTCMonth() + offset); setMonth(date.toISOString().slice(0,7)); };
 return <section className={styles.panel} aria-label="Viewing slot availability">
  <header className={styles.header}><div><p className={styles.eyebrow}>PLAN YOUR VIEWINGS</p><h2>Who is free, and when?</h2><p>Choose the person conducting the viewing, then pick an open start time.</p></div><span className={styles.badge}>08:00–16:00 · SAST</span></header>
  {!ready && <p role="alert" className={styles.warning}>Availability is unavailable or refreshing. Wait for a successful booking refresh before choosing a slot.</p>}
  <label className={styles.host}>Viewing host<input aria-label="Viewing host" list="viewing-hosts" placeholder="Choose or type a name and surname" maxLength={100} value={agent} onChange={e=>setAgent(e.target.value)}/><datalist id="viewing-hosts">{hosts.map(name=><option value={name} key={normalizeAgent(name)}/>)}</datalist></label>
  <div className={styles.layout}><div className={styles.calendar}>
   <div className={styles.month}><button aria-label="Previous month" onClick={()=>changeMonth(-1)}>‹</button><h3>{new Date(month+'-01T12:00:00Z').toLocaleDateString('en-ZA',{month:'long',year:'numeric',timeZone:'Africa/Johannesburg'})}</h3><button aria-label="Next month" onClick={()=>changeMonth(1)}>›</button></div>
   <div className={styles.days}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(name=><span className={styles.weekday} key={name}>{name}</span>)}{monthDays(month).map(date=>{const count=hostBookings(viewings,agent,date).length;return <button key={date} aria-pressed={date===day} aria-label={date+(ready&&normalizeAgent(agent)?', '+count+' booked':'')} data-outside={!date.startsWith(month)} onClick={()=>{setDay(date);setMonth(date.slice(0,7));}}><b>{Number(date.slice(-2))}</b><small>{ready&&normalizeAgent(agent)?count?'● '+count+' booked':date<today?'Past':'Open':''}</small></button>;})}</div>
   <button className={styles.today} onClick={()=>{setDay(today);setMonth(today.slice(0,7));}}>Back to today</button>
  </div><div className={styles.schedule}>
   <div className={styles.dayTitle}><div><p className={styles.eyebrow}>{agent.trim() || 'SELECT A HOST'}</p><h3>{new Date(day+'T12:00:00Z').toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',timeZone:'Africa/Johannesburg'})}</h3></div><span className={styles.badge}>{ready&&normalizeAgent(agent)?bookings.length+' booked':'Choose host'}</span></div>
   {ready&&normalizeAgent(agent)?<><div className={styles.legend}><span>Open start time</span><span>● Booked</span><span>Past times disabled</span></div><div className={styles.slots}>{slots.map(slot=><button key={slot.time} disabled={slot.state!=='open'} data-state={slot.state} onClick={()=>onBook({agent:agent.trim(),date:day,time:slot.time})}><strong>{slot.time}</strong><small>{slot.state==='booked'?slot.booking.unit||'Booked':slot.state==='past'?'Past':'Open'}</small></button>)}</div>
   <p className={styles.help}>Times are appointment starts in 15-minute steps. Allow time for the viewing and travel when choosing. Pending reschedules keep the original slot reserved; cancelled bookings release it.</p>
   {bookings.length>0&&<div className={styles.agenda}><h4>Booked appointments</h4>{bookings.map(booking=><button key={booking.id} onClick={()=>onOpenBooking(booking)}><strong>{booking.time || 'Time not recorded'} · {booking.unit}</strong><span>{booking.prospect} · {booking.status}</span><small>Open booking →</small></button>)}</div>}</>:<p className={styles.empty}>{!ready?'Waiting for current bookings...':'Enter the host’s name to see their booked and open times across all properties.'}</p>}
  </div></div>
 </section>;
}
