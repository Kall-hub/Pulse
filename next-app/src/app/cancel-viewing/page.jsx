"use client";
import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

export default function CancelViewingPage() {
  const [status, setStatus] = useState('loading'); // loading, success, error, notfound
  const [viewingData, setViewingData] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setBookingId(id);

    if (!id) {
      setStatus('error');
      return;
    }

    // Fetch and cancel the viewing
    const cancelViewing = async () => {
      try {
        const viewingRef = doc(db, "viewings", id);
        const viewingDoc = await getDoc(viewingRef);

        if (!viewingDoc.exists()) {
          setStatus('notfound');
          return;
        }

        const data = viewingDoc.data();
        setViewingData(data);

        // Check if already cancelled
        if (data.status?.includes('Cancelled')) {
          setStatus('already-cancelled');
          return;
        }

        // Cancel the viewing
        await updateDoc(viewingRef, {
          status: 'Client Cancelled',
          cancelledAt: new Date().toISOString()
        });

        setStatus('success');
      } catch (error) {
        console.error('Error cancelling viewing:', error);
        setStatus('error');
      }
    };

    cancelViewing();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center">
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            OC Rental
          </h1>
          <p className="text-xs text-purple-200 font-bold uppercase tracking-widest mt-2">
            Viewing Cancellation
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {status === 'loading' && (
            <div className="text-center py-8">
              <FaSpinner className="animate-spin text-purple-600 text-5xl mx-auto mb-4" />
              <p className="text-slate-600 font-bold">Processing your request...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
              <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase">Cancelled!</h2>
              <p className="text-slate-600 font-bold mb-6">
                Your viewing appointment has been successfully cancelled.
              </p>
              {viewingData && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">Unit:</span>
                    <span className="text-slate-900 font-black uppercase">{viewingData.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">Date:</span>
                    <span className="text-slate-900 font-black">{viewingData.date}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">Time:</span>
                    <span className="text-slate-900 font-black">{viewingData.time}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-6 italic">
                Our team has been notified. Feel free to contact us to reschedule.
              </p>
            </div>
          )}

          {status === 'already-cancelled' && (
            <div className="text-center py-8">
              <FaTimesCircle className="text-orange-500 text-6xl mx-auto mb-4" />
              <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase">Already Cancelled</h2>
              <p className="text-slate-600 font-bold mb-6">
                This viewing appointment was already cancelled.
              </p>
              {viewingData && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left">
                  <p className="text-xs text-slate-500">
                    <strong>Unit:</strong> {viewingData.unit}
                    <br />
                    <strong>Date:</strong> {viewingData.date} at {viewingData.time}
                  </p>
                </div>
              )}
            </div>
          )}

          {status === 'notfound' && (
            <div className="text-center py-8">
              <FaTimesCircle className="text-red-500 text-6xl mx-auto mb-4" />
              <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase">Not Found</h2>
              <p className="text-slate-600 font-bold">
                We couldn't find this viewing appointment. It may have been deleted or the link is incorrect.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <FaTimesCircle className="text-red-500 text-6xl mx-auto mb-4" />
              <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase">Error</h2>
              <p className="text-slate-600 font-bold">
                Something went wrong. Please contact us directly to cancel your viewing.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            Need help? Contact OC Rental
          </p>
        </div>
      </div>
    </div>
  );
}
