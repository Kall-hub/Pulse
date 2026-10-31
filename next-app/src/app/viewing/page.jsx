'use client';
import { useEffect, useState } from 'react';
import ViewingTimeSelect from '../../components/viewings/ViewingTimeSelect';
export default function TenantViewing() {
  const [token, setToken] = useState(''), [viewing, setViewing] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(true);
  const [date, setDate] = useState(''), [time, setTime] = useState('');
  async function request(linkToken, input) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/.netlify/functions/tenant-viewing', {
        method: input ? 'POST' : 'GET',
        headers: { Authorization: 'Bearer ' + linkToken, ...(input ? { 'Content-Type': 'application/json' } : {}) },
        ...(input ? { body: JSON.stringify(input) } : {})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load your booking.');
      setViewing(result.viewing);
    } catch (e) { setError(e.message || 'Unable to reach the booking service. Please try again.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const value = window.location.hash.slice(1); setToken(value);
    if (!value) { setError('Please open the complete private link sent by your agent.'); setBusy(false); return; }
    request(value);
  }, []);
  const ended = viewing && ['Completed', 'Tenant Cancelled', 'Agent Cancelled'].includes(viewing.status);
  const action = (action, extra = {}) => request(token, { action, revision: viewing.revision, ...extra });
  return <main className="min-h-screen bg-slate-100 p-6"><section className="mx-auto max-w-lg rounded-2xl bg-white p-6 space-y-5">
    <h1 className="text-2xl font-bold">Your viewing</h1>
    {busy && <p role="status">Loading...</p>}
    {error && <div role="alert"><p className="text-red-700">{error}</p>{token && <button className="underline" disabled={busy} onClick={() => request(token)}>Refresh booking</button>}</div>}
    {viewing && <><h2 className="text-xl font-semibold">{viewing.unit}</h2><p>{viewing.date} at {viewing.time} (South Africa time)</p><p>Agent: {viewing.agent}</p><p role="status">Status: {viewing.status}</p>
    {viewing.request && <p>Requested time: {viewing.request.date} at {viewing.request.time}. Awaiting your agent&apos;s decision.</p>}
    {!ended && <div className="space-y-4">
      {['Awaiting Confirmation', 'Link Sent', 'Confirmed'].includes(viewing.status) && <button className="bg-purple-700 text-white rounded-lg px-4 py-3" disabled={busy} onClick={() => action('confirm')}>Confirm viewing</button>}
      <button className="block text-red-700 underline" disabled={busy} onClick={() => { if (window.confirm('Cancel this viewing?')) action('cancel'); }}>Cancel viewing</button>
      {viewing.status !== 'Reschedule Requested' && <form className="space-y-3" onSubmit={e => { e.preventDefault(); action('reschedule', { date, time }); }}><h3 className="font-semibold">Request another time</h3><label className="block">Preferred date<input className="block border rounded p-2" type="date" required value={date} onChange={e => setDate(e.target.value)}/></label><label className="block">Preferred time (SAST)<ViewingTimeSelect aria-label="Preferred time (SAST)" className="block border rounded p-2" required value={time} onChange={e => setTime(e.target.value)}/></label><button className="underline" disabled={busy}>Send request</button></form>}
    </div>}
    <p className="text-sm text-slate-500">Keep this private link safe. Anyone with it can manage this booking.</p></>}
  </section></main>;
}
