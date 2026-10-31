'use client';
import { FaUserFriends, FaCalendarAlt, FaClock, FaTimes, FaCheck, FaUserTie, FaWhatsapp, FaBan } from 'react-icons/fa';

const ViewingCard = ({ data, onCancel, onComplete, onResend, onMarkNoWhatsApp, onApprove, onReject, decisionBusy }) => {
  const { unit, prospect, phone, agent, date, time, status, outcome, note, whatsappStatus } = data;
  const isCancelled = status.includes('Cancelled');
  const isCompleted = status === 'Completed';

  const getOutcomeColor = (out) => {
      if(out === 'Accepted') return 'bg-green-500 text-white';
      if(out === 'Thinking') return 'bg-orange-400 text-white';
      return 'bg-red-500 text-white';
  };

  return (
    <div id={'viewing-' + data.id} className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-auto hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 ${isCancelled ? 'opacity-60 grayscale' : ''}`}>

      {/* MAIN CONTENT: Flex Col on Mobile, Row on Desktop */}
      <div className="px-6 py-6 md:px-8 flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="flex items-start space-x-5 w-full">
          <div className={`p-4 rounded-2xl shadow-lg text-white shrink-0 ${isCancelled ? 'bg-red-500' : 'bg-purple-600'}`}>
             {isCancelled ? <FaTimes size={20} /> : isCompleted ? <FaCheck size={20} /> : <FaUserFriends size={20} />}
          </div>
          <div className="w-full">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2 break-words">{unit}</h2>
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-800 uppercase tracking-tight">
                  <span>{prospect}</span>
                  <span className="text-slate-300 hidden md:inline">|</span>
                  <span className="text-blue-500 block md:inline">{phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <FaUserTie size={10} className="text-purple-500" />
                  <span>Agent: <span className="text-slate-600">{agent}</span></span>
                </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: STATUS & TIME (Full width on mobile) */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-right">
              <div className="flex items-center justify-end space-x-2 text-slate-900 text-[11px] font-black uppercase">
                  <FaCalendarAlt size={10} className="text-purple-500" /><span>{date}</span>
              </div>
              <div className="flex items-center justify-end space-x-1 mt-1 text-slate-500 text-[10px] font-bold italic">
                  <FaClock size={9} /><span>{time}</span>
              </div>
          </div>

          <div className={`px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center space-x-2 ${
              isCancelled ? 'bg-red-50 text-red-600 border-red-100' : 'bg-purple-50 text-purple-600 border-purple-100'
          }`}>
              <span>{status}</span>
          </div>
        </div>
      </div>

      {status === 'Reschedule Requested' && <section className="mx-6 mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-label="Reschedule request">
        <p className="text-xs font-black uppercase tracking-widest text-amber-800">Client requested a new time</p>
        <p className="mt-2 text-lg font-bold text-slate-900">{data.request?.date || 'Date missing'} at {data.request?.time || 'Time missing'} · SAST</p>
        <p className="mt-2 text-sm text-slate-600">Original appointment: {date} at {time}. It stays reserved until you approve a change or cancel.</p>
        {!data.request && <p role="alert" className="mt-2 text-sm text-red-700">This older request has no usable slot details. Ask the client to submit a fresh request using a new booking link.</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button disabled={decisionBusy || !data.request} onClick={onApprove} className="rounded-xl bg-purple-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Approve new time</button>
          <button disabled={decisionBusy || !data.request} onClick={onReject} className="rounded-xl border border-amber-300 bg-white px-5 py-3 text-sm font-bold text-amber-900 disabled:opacity-50">Reject · slot unavailable</button>
        </div><p className="mt-3 text-xs text-slate-600">Either decision prepares a new private link and WhatsApp reply for you to send.</p>
      </section>}
      {status === 'Slot Unavailable' && <p className="mx-6 mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Requested slot unavailable. Original appointment kept: {date} at {time}. Prepare the booking link to notify the client again.</p>}

      {data.tenantResponse?.action === 'kept-original' && status === 'Confirmed' && <div className="mx-6 mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status"><strong>Client kept the original slot</strong><p>{date} at {time} · SAST. Client response received and saved in Pulse.</p></div>}
      {data.tenantResponse?.action === 'confirmed' && status === 'Confirmed' && <p className="mx-6 mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-900">Client confirmed this appointment.</p>}
      {/* FEEDBACK SECTION */}
      {isCompleted && outcome && (
          <div className="px-6 md:px-8 pb-6">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Feedback</p>
                    <p className="text-xs font-bold text-slate-700 italic">&quot;{note}&quot;</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${getOutcomeColor(outcome)}`}>
                    {outcome}
                </span>
             </div>
          </div>
      )}

      {/* FOOTER ACTIONS */}
      {!isCancelled && !isCompleted && (
          <div className="px-6 md:px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              {whatsappStatus === 'no-whatsapp' ? (
                <div className="flex items-center space-x-2 text-[9px] font-black uppercase text-red-500">
                  <FaBan size={14} /> <span>No WhatsApp</span>
                </div>
              ) : (
                <>
                  <button id={`resend-${data.phone}`} onClick={onResend} className="flex items-center space-x-2 text-[9px] font-black uppercase text-blue-500 hover:text-blue-700 transition-colors">
                      <FaWhatsapp size={14} /> <span>Prepare Booking Link</span>
                  </button>
                  <button onClick={onMarkNoWhatsApp} className="flex items-center space-x-1 text-[8px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">
                      <FaBan size={10} /> <span>No WA</span>
                  </button>
                </>
              )}
            </div>
            <div className="flex space-x-3 w-full md:w-auto">
                <button onClick={onCancel} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-red-500 hover:border-red-500 transition-all">
                    Cancel
                </button>
                <button disabled={status === 'Reschedule Requested' || status === 'Slot Unavailable'} onClick={onComplete} className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg hover:bg-black transition-all">
                    <FaCheck className="text-green-400" /> <span>Result</span>
                </button>
            </div>
          </div>
      )}
    </div>
  );
};

export default ViewingCard;
