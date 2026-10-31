'use client';
import { useEffect, useState, useRef } from 'react';
import { tenantRequest } from '../../lib/viewings/tenantRequest.mjs';
import styles from './viewing.module.css';
import ViewingTimeSelect from '../../components/viewings/ViewingTimeSelect';
export default function TenantViewing() {
  const [token, setToken] = useState(''), [viewing, setViewing] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(true);
  const [date, setDate] = useState(''), [time, setTime] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const inFlight = useRef(false);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  async function request(linkToken, input) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(''); setPendingAction(input?.action || '');
    try {
      const saved = await tenantRequest(linkToken, input);
      setViewing(saved);
      if (input) setShowReschedule(false);
    } catch (e) { setError(e.message || 'Unable to reach the booking service. Refresh the booking to check whether your response was saved.'); }
    finally { inFlight.current = false; setBusy(false); setPendingAction(''); }
  }

  useEffect(() => {
    const value = window.location.hash.slice(1); setToken(value);
    if (!value) { setError('Please open the complete private link sent by your agent.'); setBusy(false); return; }
    request(value);
  }, []);
  const ended = viewing && ['Completed', 'Tenant Cancelled', 'Agent Cancelled'].includes(viewing.status);
  const action = (action, extra = {}) => request(token, { action, revision: viewing.revision, ...extra });
  const rejected = viewing?.status === 'Slot Unavailable';
  const pending = viewing?.status === 'Reschedule Requested';
  const keptOriginal = viewing?.status === 'Confirmed' && viewing?.tenantResponse?.action === 'kept-original';
  const confirmed = viewing?.status === 'Confirmed' && Boolean(viewing?.tenantResponse?.at);
  const formatDate = value => value ? new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Johannesburg' }).format(new Date(value + 'T12:00:00+02:00')) : 'To be confirmed';
  return <main className={styles.page}><div className={styles.shell}>
    <div className={styles.brand}><span className={styles.mark} aria-hidden="true">P</span><div>PULSE<small>OC RENTAL · YOUR NEXT PLACE</small></div></div>
    <section className={styles.card} aria-label="Your private viewing booking">
      <header className={styles.hero}><p className={styles.eyebrow}>A place to call home</p><h1>Your next chapter starts here.</h1><p>Your appointment, your plans. Manage your viewing with the OC Rental team.</p></header>
      <div className={styles.content}>
        {busy && <p className={styles.loading} role="status">{pendingAction === 'confirm' ? 'Sending your confirmation...' : viewing ? 'Updating your appointment...' : 'Getting your viewing ready...'}</p>}
        {error && <div className={styles.error} role="alert"><p>{error}</p>{token && <button className={styles.secondary} disabled={busy} onClick={() => request(token)}>Refresh booking</button>}</div>}
        {viewing && <>
          <p className={styles.eyebrow}>YOUR VIEWING</p><h2 className={styles.property}>{viewing.unit}</h2>
          <div className={styles.details}><div><span>{rejected || pending ? 'Original appointment' : 'Appointment date'}</span><strong>{formatDate(viewing.date)}</strong></div><div><span>Appointment time</span><strong>{viewing.time} · South Africa time</strong></div></div>
          <p className={styles.agent}>Your viewing host: <strong>{viewing.agent}</strong></p>
          <span className={styles.badge}>{viewing.status === 'Tenant Cancelled' ? 'Cancelled by you' : viewing.status}</span>
          {confirmed && <aside className={styles.notice} role="status"><strong>{keptOriginal ? 'Original slot kept — response sent' : 'Viewing confirmed — response sent'}</strong><p>We have saved your confirmation for {formatDate(viewing.date)} at {viewing.time} (SAST). Your agent can see your response in Pulse.</p></aside>}
          {pending && <aside className={styles.notice} role="status"><strong>Your request is with the team</strong><p>Requested: {formatDate(viewing.request?.date)} at {viewing.request?.time} (SAST).</p><p>Your original appointment stays reserved while your agent reviews the new time.</p><button disabled={busy} className={styles.secondary} onClick={() => request(token)}>Check for an update</button></aside>}
          {rejected && <aside className={styles.notice} data-warning="true" role="status"><strong>That new slot is unavailable</strong><p>{viewing.lastDecision?.request && <>We could not move your viewing to {formatDate(viewing.lastDecision.request.date)} at {viewing.lastDecision.request.time}. </>}Your original appointment above is still reserved.</p><p>You can keep the original time or cancel below.</p></aside>}
          {viewing.lastDecision?.action === 'approve' && !pending && !ended && !confirmed && <aside className={styles.notice} role="status"><strong>Your new time is approved</strong><p>Your appointment details above have been updated. We look forward to seeing you.</p></aside>}
          {ended ? <p className={styles.status}>{viewing.status === 'Completed' ? 'This viewing is complete. Thank you for visiting with us.' : 'This appointment has been cancelled. Please contact your agent if you would like to book another viewing.'}</p> : <>
            <div className={styles.actions}>
              {['Awaiting Confirmation', 'Link Sent', 'Confirmed', 'Slot Unavailable'].includes(viewing.status) && <button className={styles.primary} disabled={busy || confirmed} onClick={() => action('confirm')}>{pendingAction === 'confirm' ? 'Sending confirmation...' : keptOriginal ? 'Original slot kept' : confirmed ? 'Confirmation sent' : rejected ? 'Keep my original time' : viewing.status === 'Confirmed' ? 'Confirm my appointment' : 'Confirm my viewing'}</button>}
              {!pending && !rejected && <button className={styles.secondary} disabled={busy} onClick={() => setShowReschedule(value => !value)}>{showReschedule ? 'Close time request' : 'Request a different time'}</button>}
              <button className={styles.cancel} disabled={busy} onClick={() => { if (window.confirm('Cancel this viewing?')) action('cancel'); }}>Cancel my viewing</button>
            </div>
            {showReschedule && !pending && !rejected && <form className={styles.form} onSubmit={e => { e.preventDefault(); action('reschedule', { date, time }); }}><h3>Find a time that works for you</h3><p>Your preferred slot needs approval from the team. Your current appointment stays reserved until then.</p><div className={styles.fields}><label>Preferred date<input type="date" min={today} required value={date} onChange={e => setDate(e.target.value)}/></label><label>Preferred time (SAST)<ViewingTimeSelect aria-label="Preferred time (SAST)" required value={time} onChange={e => setTime(e.target.value)}/></label></div><button className={styles.primary} disabled={busy}>Send my time request</button></form>}
          </>}
          {viewing.officePhone && <p className={styles.agent}>Need a hand? <a className={styles.link} href={'tel:' + viewing.officePhone.replace(/[^+0-9]/g, '')}>Contact the office</a></p>}
        </>}
      </div>
    </section><p className={styles.foot}>Powered by Pulse · Thoughtfully managed by OC Rental<br/>This link is private. Anyone with it can manage your appointment.</p>
  </div></main>;
}
