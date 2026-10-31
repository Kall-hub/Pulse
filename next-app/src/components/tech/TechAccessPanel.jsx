'use client';
import { useEffect, useState } from 'react';
import { FaMobileAlt, FaShareAlt } from 'react-icons/fa';
export default function TechAccessPanel() {
  const [prompt, setPrompt] = useState(null), [installed, setInstalled] = useState(false);
  const [instructions, setInstructions] = useState(false), [link, setLink] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => {
    setLink(window.location.origin + '/tech-view');
    const standalone = window.matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(standalone.matches || Boolean(navigator.standalone));
    const available = event => { event.preventDefault(); setPrompt(event); };
    const complete = () => { setInstalled(true); setPrompt(null); setInstructions(false); };
    update();
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', complete);
    standalone.addEventListener?.('change', update);
    return () => { window.removeEventListener('beforeinstallprompt', available); window.removeEventListener('appinstalled', complete); standalone.removeEventListener?.('change', update); };
  }, []);
  const install = async () => {
    setNotice('');
    if (!prompt) { setInstructions(!instructions); return; }
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { setInstructions(true); }
    finally { setPrompt(null); }
  };
  const share = async () => {
    setNotice('');
    if (navigator.share) {
      try { await navigator.share({ title: 'Pulse Tech', text: 'Open Pulse Tech for your assigned job cards. Save it to your home screen so you can find it again.', url: link }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(link); setNotice('Link copied. Paste it into WhatsApp or your notes.'); }
    catch { setInstructions(true); setNotice('Press and hold the address below to copy it.'); }
  };
  return <aside className="bg-white border-b border-slate-200 px-4 py-3 text-slate-800"><div className="max-w-5xl mx-auto">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold">Keep Pulse Tech on your phone</p><p className="text-xs text-slate-500 mt-1">Tap its home-screen icon next time. No need to find the old message.</p></div><div className="flex flex-wrap gap-2">
      {!installed && <button onClick={install} className="flex items-center gap-2 rounded-xl bg-blue-700 text-white px-4 py-3 text-xs font-bold"><FaMobileAlt/>{prompt ? 'Install Pulse Tech' : 'Add to home screen'}</button>}
      <button onClick={share} disabled={!link} className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold"><FaShareAlt/>Share portal link</button>
    </div></div>
    {instructions && <div className="mt-3 rounded-xl bg-blue-50 p-4 text-xs leading-relaxed space-y-2">
      <p><strong>Android:</strong> Open this page in your browser, tap its menu (three dots), then Add to Home screen or Install app.</p>
      <p><strong>iPhone:</strong> Open in Safari, tap Share, then Add to Home Screen.</p>
      <p>If you opened this inside WhatsApp, choose Open in browser first.</p>
      <label className="block font-bold">Portal address<input readOnly value={link} onFocus={event => event.target.select()} className="mt-1 w-full rounded-lg border border-blue-200 bg-white p-2 font-normal"/></label>
      <p>Internet is still needed to load jobs, upload photos and save completed work. Keep a text copy of a job for reading later.</p>
    </div>}
    {notice && <p role="status" className="mt-2 text-xs text-blue-700">{notice}</p>}
  </div></aside>;
}
