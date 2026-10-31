'use client';
import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../app/Config/firebaseConfig';
import { bookingMessage } from '../lib/viewings/share.mjs';
import { findBookingConflict, ACTIVE } from '../lib/viewings/domain.mjs';

async function viewingRequest(path, input) {
  if (!auth.currentUser) throw new Error('Please sign in to manage viewings.');
  const response = await fetch('/.netlify/functions/' + path, {
    method: input ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + await auth.currentUser.getIdToken(), ...(input ? { 'Content-Type': 'application/json' } : {}) },
    ...(input ? { body: JSON.stringify(input) } : {})
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error('The viewings service is unavailable. Please try again.'); }
  if (!response.ok) throw new Error(result.error || 'Unable to update viewings.');
  return result;
}

export default function useViewingsPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [loading, setLoading] = useState(true); // Add loading state
  const [userRole, setUserRole] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const bookingInProgress = useRef(false);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [activeViewingId, setActiveViewingId] = useState(null);
  const [shareDraft, setShareDraft] = useState(null);
  const [shareError, setShareError] = useState('');

  const [viewings, setViewings] = useState([]);
  const [availabilityReady, setAvailabilityReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setLoading(true);
        try {
          const result = await viewingRequest('viewings');
          setViewings(result.viewings);
          setAvailabilityReady(true);
          const userDoc = await getDoc(doc(db, "stuff", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role);
          }
        } catch (error) {
          setAvailabilityReady(false);
          setShareError(error.message);
        } finally {
          setLoading(false);
        }
      } else {
        setViewings([]);
        setAvailabilityReady(false);
        setUserRole(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Responsive Sidebar Logic
    const handleResize = () => {
      if (window.innerWidth < 768) setIsOpen(false);
      else setIsOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let active = true, refreshing = false;
    const refresh = async () => {
      if (!auth.currentUser || refreshing || bookingInProgress.current) return;
      refreshing = true;
      try {
        const result = await viewingRequest('viewings');
        if (active) { setViewings(result.viewings); setAvailabilityReady(true); }
      } catch (error) { if (active) { setAvailabilityReady(false); setShareError(error.message); } }
      finally { refreshing = false; }
    };
    const interval = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, []);

  const [formData, setFormData] = useState({ prospect: '', phone: '', unit: '', date: '', time: '', agent: '' });
  const bookingConflict = findBookingConflict(viewings, formData);

  // Helper: Format phone number for WhatsApp (South African numbers)
  const formatPhoneForWhatsApp = (phone) => {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 27 (South Africa country code)
    if (cleaned.startsWith('0')) {
      cleaned = '27' + cleaned.substring(1);
    }
    // If doesn't start with country code, add 27
    else if (!cleaned.startsWith('27')) {
      cleaned = '27' + cleaned;
    }

    return cleaned;
  };

  // Helper: Send WhatsApp message
  const sendWhatsAppLink = async (phone, bookingId) => {
    setShareError('');
    try {
      const result = await viewingRequest('viewing-action?id=' + encodeURIComponent(bookingId), {
        action: 'share', revision: viewings.find(v => v.id === bookingId)?.revision || 0
      });
      const link = new URL(result.viewing.link);
      if (!['http:', 'https:'].includes(link.protocol)) throw new Error('The booking link has an invalid address.');
      const message = bookingMessage(result.viewing, link.href);
      setViewings(prev => prev.map(v => v.id === bookingId ? { ...v, ...result.viewing } : v));
      setShareDraft({ link: link.href, message, whatsapp: 'https://wa.me/' + formatPhoneForWhatsApp(phone) + '?text=' + encodeURIComponent(message), local: ['localhost', '127.0.0.1', '[::1]'].includes(link.hostname) });
    } catch (error) { setShareError(error.message || 'Unable to prepare booking link.'); }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (bookingInProgress.current) return;
    setBookingError('');
    if (!formData.agent.trim()) { setBookingError('Enter the name of the person conducting the viewing.'); return; }
    if (bookingConflict) { setBookingError('Double booking: this agent already has an appointment at the selected date and time.'); return; }
    bookingInProgress.current = true;
    setIsSaving(true);
    try {
      const { viewing } = await viewingRequest('viewings', formData);
      setViewings(prev => [viewing, ...prev]);
      await sendWhatsAppLink(viewing.phone, viewing.id);
      setIsBookModalOpen(false);
      setFormData({ prospect: '', phone: '', unit: '', date: '', time: '', agent: '' });
    } catch (error) { setBookingError(error.message); }
    finally { bookingInProgress.current = false; setIsSaving(false); }
  };

  const [decisionId, setDecisionId] = useState(null);
  const decisionInProgress = useRef(false);

  const updateViewing = async (id, action, extra = {}) => {
    const current = viewings.find(v => v.id === id);
    const { viewing } = await viewingRequest('viewing-action?id=' + encodeURIComponent(id), {
      action, revision: current?.revision || 0, ...extra
    });
    setViewings(prev => prev.map(v => v.id === id ? viewing : v));
    return viewing;
  };

  const decideReschedule = async (id, decision) => {
    if (decisionInProgress.current) return;
    if (!confirm(decision === 'approve' ? 'Approve the requested appointment time?' : 'Reject the requested slot as unavailable? The original appointment will remain reserved.')) return;
    decisionInProgress.current = true; setDecisionId(id); setShareError('');
    try {
      const viewing = await updateViewing(id, decision);
      const link = new URL(viewing.link);
      if (!['http:', 'https:'].includes(link.protocol)) throw new Error('The booking link has an invalid address.');
      const message = bookingMessage(viewing, link.href);
      setShareDraft({ link: link.href, message, whatsapp: 'https://wa.me/' + formatPhoneForWhatsApp(viewing.phone) + '?text=' + encodeURIComponent(message), local: ['localhost', '127.0.0.1', '[::1]'].includes(link.hostname) });
    } catch (error) { setShareError(error.message || 'Unable to review this request.'); }
    finally { decisionInProgress.current = false; setDecisionId(null); }
  };

  const cancelViewing = async (id) => {
    if (!confirm('Cancel this appointment?')) return;
    try { await updateViewing(id, 'cancel'); }
    catch (error) { setShareError(error.message); }
  };

  const openCompleteModal = (id) => { setActiveViewingId(id); setIsOutcomeModalOpen(true); };

  const saveOutcome = async (outcome, note) => {
    try {
      await updateViewing(activeViewingId, 'complete', { outcome, note });
      setIsOutcomeModalOpen(false);
      setActiveViewingId(null);
    } catch (error) { setShareError(error.message); }
  };

  const resendLink = (viewing) => sendWhatsAppLink(viewing.phone, viewing.id);

  const markNoWhatsApp = async (id) => {
    if (!confirm('Mark this contact as having no WhatsApp?')) return;
    try { await updateViewing(id, 'no-whatsapp'); }
    catch (error) { setShareError(error.message); }
  };

  const filteredViewings = viewings.filter(v => {
    if (filter === 'requests') return v.status === 'Reschedule Requested';
    if (filter === 'upcoming') return ACTIVE.includes(v.status);
    if (filter === 'cancelled') return (v.status || '').includes('Cancelled');
    if (filter === 'history') return v.status === 'Completed';
    return false;
  });

  const bookOpenSlot = slot => {
    if (!availabilityReady) { setShareError('Refresh bookings before choosing an open slot.'); return; }
    if (findBookingConflict(viewings, slot)) { setShareError('This slot is now booked. Choose another time.'); return; }
    setBookingError('');
    setFormData({ prospect: '', phone: '', unit: '', ...slot });
    setIsBookModalOpen(true);
  };

  return {
    availabilityReady,
    bookOpenSlot,
    isOpen,
    setIsOpen,
    filter,
    setFilter,
    loading,
    userRole,
    isBookModalOpen,
    setIsBookModalOpen,
    isOutcomeModalOpen,
    setIsOutcomeModalOpen,
    shareDraft,
    setShareDraft,
    shareError,
    setShareError,
    viewings,
    formData,
    setFormData,
    bookingConflict,
    bookingError,
    isSaving,
    handleBook,
    cancelViewing,
    openCompleteModal,
    saveOutcome,
    resendLink,
    markNoWhatsApp,
    filteredViewings,
    decideReschedule,
    decisionId
  };
}
