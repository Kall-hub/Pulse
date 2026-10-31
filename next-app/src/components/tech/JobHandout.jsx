'use client';
import { useMemo, useState } from 'react';
import { FaShareAlt, FaCopy } from 'react-icons/fa';
import { jobText } from '../../lib/tech/jobs.mjs';
export default function JobHandout({ job, contractor }) {
  const [expanded, setExpanded] = useState(false), [notice, setNotice] = useState('');
  const text = useMemo(() => jobText(job, contractor, typeof window === 'undefined' ? '/tech-view' : window.location.origin + '/tech-view'), [job, contractor]);
  const share = async () => {
    setNotice('');
    if (navigator.share) {
      try { await navigator.share({ title: 'Job ' + (job.displayId || job.unit), text }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    setExpanded(true); setNotice('Copy the job details below into WhatsApp or your notes.');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setNotice('Job details copied. Paste them into WhatsApp or your notes.'); }
    catch { setExpanded(true); setNotice('Press and hold the job text, select all, then copy.'); }
  };
  return <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 mb-5">
    <p className="text-sm font-bold text-slate-800">Keep this job handy</p><p className="text-xs text-slate-600 mt-1">A small text copy you can keep in WhatsApp. No PDF download needed.</p>
    <div className="flex flex-wrap gap-2 mt-3"><button onClick={share} className="flex items-center gap-2 bg-blue-700 text-white rounded-xl px-3 py-2 text-xs font-bold"><FaShareAlt/>Share job details</button><button onClick={copy} className="flex items-center gap-2 bg-white text-slate-700 rounded-xl px-3 py-2 text-xs font-bold"><FaCopy/>Copy text</button><button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-700 underline px-2">{expanded ? 'Hide text' : 'Show job text'}</button></div>
    {notice && <p role="status" className="text-xs text-blue-800 mt-3">{notice}</p>}
    {expanded && <label className="block mt-3 text-xs text-slate-700">Job text<textarea readOnly value={text} onFocus={event => event.target.select()} className="block w-full mt-2 p-3 border border-blue-200 rounded-xl bg-white text-xs" rows={12}/></label>}
  </section>;
}
