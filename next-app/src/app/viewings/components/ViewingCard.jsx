import {
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaUserFriends,
  FaUserTie,
  FaClock,
  FaWhatsapp,
  FaBan
} from 'react-icons/fa';

import { normalizeUnitName } from '../viewingUtils';

const ViewingCard = ({
  data,
  onCancel,
  onComplete,
  onResend,
  onMarkNoWhatsApp,
  onApproveReschedule,
  onRejectReschedule
}) => {
  const {
    unit,
    prospect,
    phone,
    agent,
    date,
    time,
    status,
    outcome,
    note,
    whatsappStatus,
    rescheduleRequest,
    seriousnessFlag
  } = data;

  const normalizedUnit = normalizeUnitName(unit);
  const isCancelled = status?.includes('Cancelled') || status === 'Slot Unavailable';
  const isCompleted = status === 'Completed';
  const isReschedulePending = status === 'Reschedule Requested';

  const getOutcomeColor = (out) => {
    if (out === 'Accepted') return 'bg-green-500 text-white';
    if (out === 'Thinking') return 'bg-orange-400 text-white';
    return 'bg-red-500 text-white';
  };

  return (
    <div className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-auto hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 ${isCancelled ? 'opacity-90' : ''}`}>
      <div className="px-6 py-6 md:px-8 flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="flex items-start space-x-5 w-full">
          <div className={`p-4 rounded-2xl shadow-lg text-white shrink-0 ${isCancelled ? 'bg-red-500' : isCompleted ? 'bg-green-500' : isReschedulePending ? 'bg-amber-500' : 'bg-purple-600'}`}>
            {isCancelled ? <FaTimes size={20} /> : isCompleted ? <FaCheck size={20} /> : isReschedulePending ? <FaCalendarAlt size={20} /> : <FaUserFriends size={20} />}
          </div>

          <div className="w-full">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2 break-words">{normalizedUnit}</h2>
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

              {isReschedulePending && rescheduleRequest && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest">
                  Requested new slot: {rescheduleRequest.date} at {rescheduleRequest.time}
                </div>
              )}

              {seriousnessFlag && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest">
                  Flagged: {seriousnessFlag}
                </div>
              )}
            </div>
          </div>
        </div>

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
            isCancelled ? 'bg-red-50 text-red-600 border-red-100' : isReschedulePending ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-purple-50 text-purple-600 border-purple-100'
          }`}>
            <span>{status}</span>
          </div>
        </div>
      </div>

      {isCompleted && outcome && (
        <div className="px-6 md:px-8 pb-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Feedback</p>
              <p className="text-xs font-bold text-slate-700 italic">"{note}"</p>
            </div>
            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${getOutcomeColor(outcome)}`}>
              {outcome}
            </span>
          </div>
        </div>
      )}

      {isReschedulePending && (
        <div className="px-6 md:px-8 py-4 bg-amber-50/80 border-t border-amber-100 flex flex-col md:flex-row gap-3 items-center justify-between">
          <p className="text-[9px] font-black uppercase text-amber-700 tracking-widest">Reschedule is pending approval</p>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={onApproveReschedule} className="flex-1 md:flex-none bg-green-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-700">
              Approve
            </button>
            <button onClick={onRejectReschedule} className="flex-1 md:flex-none bg-red-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700">
              Slot Unavailable
            </button>
          </div>
        </div>
      )}

      {!isCancelled && !isCompleted && !isReschedulePending && (
        <div className="px-6 md:px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {whatsappStatus === 'no-whatsapp' ? (
              <div className="flex items-center space-x-2 text-[9px] font-black uppercase text-red-500">
                <FaBan size={14} /> <span>No WhatsApp</span>
              </div>
            ) : (
              <>
                <button id={`resend-${data.phone}`} onClick={onResend} className="flex items-center space-x-2 text-[9px] font-black uppercase text-blue-500 hover:text-blue-700 transition-colors">
                  <FaWhatsapp size={14} /> <span>Resend Link</span>
                </button>
                <button onClick={onMarkNoWhatsApp} className="flex items-center space-x-1 text-[8px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">
                  <FaBan size={10} /> <span>No WA</span>
                </button>
              </>
            )}
          </div>
          <div className="flex space-x-3 w-full md:w-auto">
            <button onClick={onCancel} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-slate-700">
              Cancel
            </button>
            <button onClick={onComplete} className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <FaCheck className="text-green-400" /> <span>Result</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewingCard;
