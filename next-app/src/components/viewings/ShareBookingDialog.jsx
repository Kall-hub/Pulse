'use client';

export default function ShareBookingDialog({ shareError, setShareError, shareDraft, setShareDraft }) {
  return (
    <>
{shareError && <div role="alert" className="fixed bottom-6 left-4 right-4 z-[60] rounded-xl bg-red-50 border border-red-300 p-4 text-red-900">{shareError}<button onClick={() => setShareError('')} className="ml-4 underline">Dismiss</button></div>}
      {shareDraft && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4"><section role="dialog" aria-modal="true" aria-labelledby="share-title" className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-auto">
        <h2 id="share-title" className="text-xl font-bold">Share booking link</h2>
        <a href={shareDraft.link} target="_blank" rel="noopener noreferrer" className="block text-blue-700 underline break-all">{shareDraft.link}</a>
        {shareDraft.local && <p role="alert" className="text-red-700">This local development link will not work on a tenant&apos;s phone. Set APP_ORIGIN to your deployed public HTTPS address and prepare a new link.</p>}
        <p className="whitespace-pre-wrap text-sm">{shareDraft.message}</p>
        {!shareDraft.local && <a href={shareDraft.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-block bg-green-700 text-white rounded-xl px-4 py-3">Open WhatsApp</a>}
        <p className="text-sm text-slate-600">Press Send in WhatsApp to deliver the draft.</p>
        <button onClick={() => setShareDraft(null)} className="block underline">Close</button>
      </section></div>}
</>
  );
}
