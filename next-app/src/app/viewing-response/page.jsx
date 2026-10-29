"use client";

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export default function ViewingResponsePage() {
  const [bookingId, setBookingId] = useState('');
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [formData, setFormData] = useState({ date: '', time: '' });
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setBookingId(id || '');

    if (!id) {
      setLoading(false);
      return;
    }

    const fetchViewing = async () => {
      try {
        const viewingRef = doc(db, 'viewings', id);
        const viewingDoc = await getDoc(viewingRef);

        if (viewingDoc.exists()) {
          setViewing(viewingDoc.data());
        }
      } catch (error) {
        console.error('Error fetching viewing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchViewing();
  }, []);

  const handleCancel = async () => {
    if (!bookingId || !viewing) return;
    if (!window.confirm('Cancel this viewing?')) return;

    try {
      const viewingRef = doc(db, 'viewings', bookingId);
      const currentCount = Number(viewing.cancelledCount || 0);
      const nextCount = currentCount + 1;

      await updateDoc(viewingRef, {
        status: 'Client Cancelled',
        cancelledCount: nextCount,
        cancelledAt: new Date().toISOString(),
        seriousnessFlag: nextCount >= 3 ? 'Not Serious' : '',
        adminNote: nextCount >= 3
          ? 'Client has cancelled multiple times and was flagged as not serious.'
          : 'Client cancelled the viewing.'
      });

      setStatus('cancelled');
    } catch (error) {
      console.error('Error cancelling viewing:', error);
      setStatus('error');
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId || !formData.date || !formData.time) return;

    try {
      const viewingRef = doc(db, 'viewings', bookingId);
      await updateDoc(viewingRef, {
        status: 'Reschedule Requested',
        rescheduleRequest: {
          date: formData.date,
          time: formData.time
        },
        adminNote: 'Client requested a new viewing slot and is awaiting approval.'
      });
      setStatus('reschedule-requested');
      setIsRescheduleOpen(false);
      setViewing((prev) => ({
        ...prev,
        status: 'Reschedule Requested',
        rescheduleRequest: { date: formData.date, time: formData.time }
      }));
    } catch (error) {
      console.error('Error requesting reschedule:', error);
      setStatus('error');
    }
  };

  const cardSubtext = useMemo(() => {
    if (status === 'cancelled') return 'Your viewing has been cancelled.';
    if (status === 'reschedule-requested') return 'Your reschedule request is pending review.';
    return 'Choose an option below.';
  }, [status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-white/20 border-t-white mx-auto mb-4"></div>
          <p className="text-sm uppercase tracking-[0.3em]">Loading your appointment</p>
        </div>
      </div>
    );
  }

  if (!viewing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center shadow-2xl">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Not Found</h1>
          <p className="mt-3 text-slate-600">This viewing link is invalid or no longer available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 text-2xl mb-4">🏠</div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Viewing</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-100 mt-2">Manage your appointment</p>
        </div>

        <div className="p-7">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-6">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Viewing Details</div>
            <div className="space-y-2 text-sm font-semibold text-slate-700">
              <div className="flex justify-between gap-4"><span>Unit</span><span className="font-black uppercase text-slate-900">{viewing.unit}</span></div>
              <div className="flex justify-between gap-4"><span>Date</span><span className="font-black">{formatDate(viewing.date)}</span></div>
              <div className="flex justify-between gap-4"><span>Time</span><span className="font-black">{viewing.time}</span></div>
            </div>
          </div>

          <p className="text-center text-sm font-bold text-slate-500 mb-5">{cardSubtext}</p>

          {status !== 'cancelled' && status !== 'reschedule-requested' && (
            <div className="space-y-3">
              <button
                onClick={() => setIsRescheduleOpen(true)}
                className="w-full rounded-2xl bg-purple-600 text-white py-4 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-purple-700 transition-all"
              >
                Reschedule
              </button>

              <button
                onClick={handleCancel}
                className="w-full rounded-2xl border border-red-200 bg-red-50 text-red-600 py-4 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-red-100 transition-all"
              >
                Cancel Viewing
              </button>
            </div>
          )}

          {status === 'cancelled' && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center text-green-700 font-black uppercase tracking-[0.18em] text-[10px]">
              Your viewing has been cancelled successfully.
            </div>
          )}

          {status === 'reschedule-requested' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-700 font-black uppercase tracking-[0.18em] text-[10px]">
              Your reschedule request is pending review.
            </div>
          )}

          {isRescheduleOpen && (
            <form onSubmit={handleRescheduleSubmit} className="mt-6 space-y-4 border-t border-slate-200 pt-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Preferred Date</label>
                <input
                  type="date"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-purple-500"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Preferred Time</label>
                <input
                  type="time"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-purple-500"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white text-slate-600 py-3 font-black uppercase text-[10px] tracking-[0.2em]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-purple-600 text-white py-3 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-purple-700"
                >
                  Send Request
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
