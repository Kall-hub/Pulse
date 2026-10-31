'use client';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import ViewingTimeSelect from './ViewingTimeSelect';

export default function BookingModal({ isBookModalOpen, setIsBookModalOpen, handleBook, formData, setFormData, bookingConflict, bookingError, isSaving }) {
  return (
    isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter">New Appointment</h2>
                    <button onClick={() => setIsBookModalOpen(false)} className="text-slate-500 hover:text-white"><FaTimes size={20}/></button>
                </div>
                <form onSubmit={handleBook} className="p-6 md:p-8 space-y-4">
                    {bookingError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{bookingError}</p>}
                    <div className="space-y-1">
                        <label htmlFor="viewing-agent" className="text-[9px] font-black uppercase text-slate-400 ml-2">Agent / person conducting the viewing</label>
                        <input id="viewing-agent" required maxLength={100} placeholder="Enter name and surname" className="w-full bg-slate-100 p-4 rounded-2xl font-bold text-xs outline-none focus:ring-2 ring-purple-600"
                            value={formData.agent} onChange={e => setFormData({ ...formData, agent: e.target.value })} />
                    </div>
                    {bookingConflict && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Double booking: {formData.agent.trim()} already has an appointment on {formData.date} at {formData.time} (SAST). Choose another time or cancel the existing appointment.</p>}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Prospective Tenant</label>
                        <input required placeholder="Name & Surname" className="w-full bg-slate-100 p-4 rounded-2xl font-black uppercase text-xs outline-none focus:ring-2 ring-purple-600"
                            value={formData.prospect} onChange={e => setFormData({...formData, prospect: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Phone</label>
                            <input required placeholder="082..." className="w-full bg-slate-100 p-4 rounded-2xl font-black uppercase text-xs outline-none focus:ring-2 ring-purple-600"
                                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Unit</label>
                            <input required placeholder="A612" className="w-full bg-slate-100 p-4 rounded-2xl font-black uppercase text-xs outline-none focus:ring-2 ring-purple-600"
                                value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Date</label>
                            <input required type="date" className="w-full bg-slate-100 p-4 rounded-2xl font-black text-xs outline-none"
                                value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Time</label>
                            <ViewingTimeSelect required aria-label="Viewing time (SAST)" className="w-full bg-slate-100 p-4 rounded-2xl font-black text-xs outline-none"
                                value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">Availability checks the agent name and exact start time (SAST), across all properties.</p>
                    <button type="submit" disabled={isSaving || Boolean(bookingConflict)} className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center space-x-2">
                        <FaPaperPlane /> <span>{isSaving ? 'Saving...' : 'Save & Prepare Link'}</span>
                    </button>
                </form>
            </div>
        </div>
      )
  );
}
