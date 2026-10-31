'use client';
import { FaUserFriends } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import useViewingsPage from '../../hooks/useViewingsPage';
import ViewingsHeader from '../../components/viewings/ViewingsHeader';
import ViewingAnalytics from '../../components/viewings/ViewingAnalytics';
import ViewingCard from '../../components/viewings/ViewingCard';
import ViewingAvailability from '../../components/viewings/ViewingAvailability';
import BookingModal from '../../components/viewings/BookingModal';
import OutcomeModal from '../../components/viewings/OutcomeModal';
import ShareBookingDialog from '../../components/viewings/ShareBookingDialog';

export default function ViewingsPage() {
  const {
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
    bookingConflict,
    bookingError,
    isSaving,
    formData,
    setFormData,
    handleBook,
    cancelViewing,
    openCompleteModal,
    saveOutcome,
    resendLink,
    markNoWhatsApp,
    filteredViewings,
    decideReschedule,
    decisionId,
    availabilityReady,
    bookOpenSlot
  } = useViewingsPage();

  return (
    <div className="min-h-screen bg-[#F1F5F9] relative">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8 max-w-[2400px]`}>
        <ViewingsHeader isOpen={isOpen} setIsOpen={setIsOpen} filter={filter} setFilter={setFilter} userRole={userRole} setIsBookModalOpen={setIsBookModalOpen} />
        {loading && (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )}
        {!loading && filter === 'analytics' && <ViewingAnalytics viewings={viewings} />}
        {!loading && filter === 'slots' && <ViewingAvailability viewings={viewings} ready={availabilityReady} onBook={bookOpenSlot} onOpenBooking={booking => { setFilter(booking.status === 'Completed' ? 'history' : 'upcoming'); window.setTimeout(() => document.getElementById('viewing-' + booking.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }}/>}
        {!loading && filter !== 'analytics' && filter !== 'slots' && (
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            {filteredViewings.length === 0 ? (
                <div className="text-center py-20 opacity-50 flex flex-col items-center">
                    <FaUserFriends size={40} className="mb-4 text-slate-300"/>
                    <p className="text-xs font-black uppercase tracking-widest">No {filter} viewings found</p>
                </div>
            ) : (
                filteredViewings.map(v => (
                    <ViewingCard
                        key={v.id}
                        data={v}
                        decisionBusy={decisionId !== null}
                        onApprove={() => decideReschedule(v.id, 'approve')}
                        onReject={() => decideReschedule(v.id, 'reject')}
                        onCancel={() => cancelViewing(v.id)}
                        onComplete={() => openCompleteModal(v.id)}
                        onResend={() => resendLink(v)}
                        onMarkNoWhatsApp={() => markNoWhatsApp(v.id)}
                    />
                ))
            )}
            </div>
        )}
      </main>

      <ShareBookingDialog shareError={shareError} setShareError={setShareError} shareDraft={shareDraft} setShareDraft={setShareDraft} />
      <BookingModal bookingConflict={bookingConflict} bookingError={bookingError} isSaving={isSaving} isBookModalOpen={isBookModalOpen} setIsBookModalOpen={setIsBookModalOpen} handleBook={handleBook} formData={formData} setFormData={setFormData} />
      <OutcomeModal isOutcomeModalOpen={isOutcomeModalOpen} setIsOutcomeModalOpen={setIsOutcomeModalOpen} saveOutcome={saveOutcome} />
    </div>
  );
}
