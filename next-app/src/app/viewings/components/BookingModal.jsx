"use client";

import { useState, useMemo, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import BookingModal from './components/BookingModal';
import OutcomeModal from './components/OutcomeModal';
import ViewingCard from './components/ViewingCard';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../Config/firebaseConfig';
import {
  FaPlus,
  FaUserFriends,
  FaFireAlt,
  FaBan,
  FaBars
} from 'react-icons/fa';
import {
  TRAFFIC_THRESHOLD,
  normalizeUnitName,
  formatPhoneForWhatsApp,
  getClientBookingUrl,
  buildWhatsAppStatusMessage
} from './viewingUtils';

const ViewingsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({ firstName: 'Agent', lastName: '' });
  const [userRole, setUserRole] = useState(null);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [activeViewingId, setActiveViewingId] = useState(null);
  const [viewings, setViewings] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, 'stuff', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            firstName: data.firstName || 'Agent',
            lastName: data.lastName || ''
          });
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'viewings'),
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const rawData = docSnap.data();
          return {
            id: docSnap.id,
            ...rawData,
            unit: normalizeUnitName(rawData.unit)
          };
        });

        setViewings(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to viewings:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const agentName = `${userData.firstName} ${userData.lastName}`.trim() || 'Agent';

  const [formData, setFormData] = useState({
    prospect: '',
    phone: '',
    unit: '',
    date: '',
    time: '',
    agent: agentName
  });

  useEffect(() => {
    setFormData((prev) => ({ ...prev, agent: agentName }));
  }, [agentName]);

  const stats = useMemo(() => {
    const counts = {};
    viewings.forEach((v) => {
      const unit = normalizeUnitName(v.unit);
      counts[unit] = (counts[unit] || 0) + 1;
    });

    const sortedUnits = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([unit, count]) => ({ unit, count }));

    const mostViewed = sortedUnits[0] || { unit: 'N/A', count: 0 };

    return {
      mostViewed,
      totalViewings: viewings.length,
      ranking: sortedUnits,
      recommendation: mostViewed.count >= TRAFFIC_THRESHOLD
        ? 'Please ensure maintenance and cleaning are up to date.'
        : 'Keep maintenance and cleaning standards consistent to preserve demand.'
    };
  }, [viewings]);

  const sendWhatsAppLink = (phone, prospect, unit, date, time, bookingId, statusType = 'default') => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const clientUrl = getClientBookingUrl(bookingId);
    const message = buildWhatsAppStatusMessage({ id: bookingId, prospect, unit, date, time }, statusType) + `\n\nManage here: ${clientUrl}`;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    if (typeof window !== 'undefined' && formattedPhone) {
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();

    const canonicalUnit = normalizeUnitName(formData.unit);
    const newBooking = {
      ...formData,
      unit: canonicalUnit,
      status: 'Confirmed',
      linkSent: true,
      whatsappStatus: 'sent',
      cancelledCount: 0,
      seriousnessFlag: '',
      createdAt: serverTimestamp(),
      adminNote: 'Confirmed viewing scheduled.'
    };

    try {
      const docRef = await addDoc(collection(db, 'viewings'), newBooking);
      sendWhatsAppLink(formData.phone, formData.prospect, canonicalUnit, formData.date, formData.time, docRef.id, 'default');
      setIsBookModalOpen(false);
      setFormData({ prospect: '', phone: '', unit: '', date: '', time: '', agent: agentName });
    } catch (error) {
      console.error('Error booking viewing:', error);
      alert('Failed to save booking. Check console.');
    }
  };

  const cancelViewing = async (id) => {
    if (!confirm('Cancel this appointment?')) return;

    try {
      const viewingRef = doc(db, 'viewings', id);
      const viewingDoc = await getDoc(viewingRef);
      const data = viewingDoc.data();
      const existingCount = Number(data?.cancelledCount || 0);
      const nextCount = existingCount + 1;

      await updateDoc(viewingRef, {
        status: 'Agent Cancelled',
        cancelledCount: nextCount,
        seriousnessFlag: nextCount >= 3 ? 'Not Serious' : '',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'agent',
        adminNote: nextCount >= 3 ? 'High cancellation count flagged as not serious.' : 'Appointment cancelled by admin.'
      });
    } catch (error) {
      console.error('Error cancelling:', error);
    }
  };

  const openCompleteModal = (id) => {
    setActiveViewingId(id);
    setIsOutcomeModalOpen(true);
  };

  const saveOutcome = async (outcome, note) => {
    try {
      const viewingRef = doc(db, 'viewings', activeViewingId);
      await updateDoc(viewingRef, {
        status: 'Completed',
        outcome,
        note,
        adminNote: `Outcome logged: ${outcome}. ${note}`
      });

      setIsOutcomeModalOpen(false);
      setActiveViewingId(null);
    } catch (error) {
      console.error('Error saving outcome:', error);
    }
  };

  const resendLink = (viewing) => {
    const normalizedUnit = normalizeUnitName(viewing.unit);
    sendWhatsAppLink(viewing.phone, viewing.prospect, normalizedUnit, viewing.date, viewing.time, viewing.id, 'default');

    const btn = document.getElementById(`resend-${viewing.phone}`);
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = 'Sent!';
      setTimeout(() => {
        btn.innerText = originalText;
      }, 2000);
    }
  };

  const markNoWhatsApp = async (id) => {
    if (!confirm('Mark this contact as having no WhatsApp?')) return;

    try {
      const viewingRef = doc(db, 'viewings', id);
      await updateDoc(viewingRef, {
        whatsappStatus: 'no-whatsapp',
        status: 'No WhatsApp'
      });
    } catch (error) {
      console.error('Error updating WhatsApp status:', error);
    }
  };

  const approveReschedule = async (viewing) => {
    try {
      const viewingRef = doc(db, 'viewings', viewing.id);
      await updateDoc(viewingRef, {
        status: 'Confirmed',
        date: viewing.rescheduleRequest?.date || viewing.date,
        time: viewing.rescheduleRequest?.time || viewing.time,
        adminNote: 'Reschedule approved. Client was moved to the new slot.',
        rescheduleRequest: null
      });

      sendWhatsAppLink(
        viewing.phone,
        viewing.prospect,
        normalizeUnitName(viewing.unit),
        viewing.rescheduleRequest?.date || viewing.date,
        viewing.rescheduleRequest?.time || viewing.time,
        viewing.id,
        'reschedule-approved'
      );
    } catch (error) {
      console.error('Error approving reschedule:', error);
    }
  };

  const rejectReschedule = async (viewing) => {
    try {
      const viewingRef = doc(db, 'viewings', viewing.id);
      await updateDoc(viewingRef, {
        status: 'Slot Unavailable',
        adminNote: `Requested slot ${viewing.rescheduleRequest?.date || viewing.date} at ${viewing.rescheduleRequest?.time || viewing.time} was unavailable. Client should choose another time.`,
        rescheduleRequest: null,
        note: 'Slot unavailable. Please choose another time.'
      });

      sendWhatsAppLink(
        viewing.phone,
        viewing.prospect,
        normalizeUnitName(viewing.unit),
        viewing.date,
        viewing.time,
        viewing.id,
        'slot-unavailable'
      );
    } catch (error) {
      console.error('Error rejecting reschedule:', error);
    }
  };

  const filteredViewings = useMemo(() => {
    return viewings.filter((v) => {
      if (filter === 'upcoming') return ['Confirmed', 'Link Sent', 'Reschedule Requested'].includes(v.status);
      if (filter === 'cancelled') return ['Client Cancelled', 'Agent Cancelled', 'Slot Unavailable', 'No WhatsApp'].includes(v.status) || v.status?.includes('Cancelled');
      if (filter === 'history') return v.status === 'Completed';
      return false;
    });
  }, [viewings, filter]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] relative">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? 'md:ml-64' : 'md:ml-20'} ml-0 p-4 md:p-8 max-w-[2400px]`}>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 max-w-7xl mx-auto w-full">
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsOpen(!isOpen)} className="md:hidden bg-white p-2 rounded-lg shadow-sm text-slate-600 border border-slate-200">
                <FaBars size={20} />
              </button>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Showings</h1>
                <p className="text-[10px] text-slate-400 font-bold tracking-[0.3em] uppercase mt-1">Calendar & Outcomes</p>
              </div>
            </div>

            <div className="w-full overflow-x-auto pb-1">
              <div className="flex bg-slate-200 p-1 rounded-xl w-fit shadow-inner scale-95 origin-left whitespace-nowrap">
                {['upcoming', 'cancelled', 'history', 'analytics'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filter !== 'analytics' && userRole !== 'PQA' && userRole !== 'Maintenance Admin' && (
            <button onClick={() => setIsBookModalOpen(true)} className="w-full md:w-auto bg-purple-600 text-white py-4 px-8 rounded-2xl shadow-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
              <FaPlus size={12} /> <span>New Booking</span>
            </button>
          )}
        </header>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        )}

        {!loading && filter === 'analytics' && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden min-h-[300px]">
              <div className="absolute top-0 right-0 p-10 opacity-10"><FaFireAlt size={150} /></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Top Performer</span>
                  <FaFireAlt className="text-orange-400" />
                </div>
                <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-1">{stats.mostViewed.unit}</h2>
                <p className="text-sm font-medium text-purple-200 mb-6">{stats.mostViewed.count} Total Viewings</p>
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-purple-200">Recommendation</p>
                  <p className="text-xs font-bold leading-relaxed">{stats.recommendation}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 mb-6">Popularity Index</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {stats.ranking.map((item, index) => (
                  <div key={item.unit} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {index + 1}
                      </div>
                      <span className="text-sm font-black uppercase text-slate-700">{item.unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-lg font-black text-purple-600">{item.count}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Visits</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && filter !== 'analytics' && (
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            {filteredViewings.length === 0 ? (
              <div className="text-center py-20 opacity-50 flex flex-col items-center">
                <FaUserFriends size={40} className="mb-4 text-slate-300" />
                <p className="text-xs font-black uppercase tracking-widest">No {filter} viewings found</p>
              </div>
            ) : (
              filteredViewings.map((v) => (
                <ViewingCard
                  key={v.id}
                  data={v}
                  onCancel={() => cancelViewing(v.id)}
                  onComplete={() => openCompleteModal(v.id)}
                  onResend={() => resendLink(v)}
                  onMarkNoWhatsApp={() => markNoWhatsApp(v.id)}
                  onApproveReschedule={() => approveReschedule(v)}
                  onRejectReschedule={() => rejectReschedule(v)}
                />
              ))
            )}
          </div>
        )}
      </main>

      <BookingModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleBook}
      />

      <OutcomeModal
        isOpen={isOutcomeModalOpen}
        onClose={() => setIsOutcomeModalOpen(false)}
        onSave={saveOutcome}
      />
    </div>
  );
};

export default ViewingsPage;
