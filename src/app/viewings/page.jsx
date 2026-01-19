"use client";
import { useState, useMemo } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { 
  FaPlus, FaUserFriends, FaMapMarkerAlt, FaCalendarAlt, 
  FaClock, FaPhoneAlt, FaStar, FaTimes, FaCheck, FaUserTie,
  FaLink, FaWhatsapp, FaThumbsUp, FaPaperPlane, FaChartLine,
  FaFireAlt, FaHandshake, FaBrain, FaBan
} from "react-icons/fa";

const ViewingsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'cancelled', 'history', 'analytics'
  
  // MODAL STATES
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [activeViewingId, setActiveViewingId] = useState(null); // Which viewing is being completed

  // MOCK DATA
  const [viewings, setViewings] = useState([
    { id: 1, unit: "DUNCAN COURT A612", prospect: "Thabo Mokoena", phone: "082 123 4567", agent: "Kally", date: "2026-01-20", time: "10:30", status: "Confirmed", linkSent: true },
    { id: 2, unit: "THE WALL 407", prospect: "Jessica Smith", phone: "071 987 6543", agent: "Kally", date: "2026-01-21", time: "14:00", status: "Link Sent", linkSent: true },
    { id: 3, unit: "HILLCREST B201", prospect: "Mark Zulu", phone: "060 555 0192", agent: "Johannes", date: "2026-01-19", time: "09:00", status: "Client Cancelled", linkSent: true },
    { id: 4, unit: "DUNCAN COURT A612", prospect: "Sarah Lee", phone: "072 222 1111", agent: "Kally", date: "2026-01-18", time: "11:00", status: "Completed", outcome: "Thinking", rating: 3 },
    { id: 5, unit: "DUNCAN COURT A612", prospect: "John Doe", phone: "072 333 4444", agent: "Kally", date: "2026-01-17", time: "09:00", status: "Completed", outcome: "Rejected", rating: 1, note: "Too noisy" },
  ]);

  // --- ANALYTICS LOGIC (The Brain) ---
  const stats = useMemo(() => {
    const counts = {};
    viewings.forEach(v => {
        counts[v.unit] = (counts[v.unit] || 0) + 1;
    });
    
    // Sort units by popularity
    const sortedUnits = Object.entries(counts)
        .sort(([,a], [,b]) => b - a)
        .map(([unit, count]) => ({ unit, count }));

    return {
        mostViewed: sortedUnits[0] || { unit: "N/A", count: 0 },
        totalViewings: viewings.length,
        ranking: sortedUnits
    };
  }, [viewings]);

  // --- ACTIONS ---

  const [formData, setFormData] = useState({ prospect: '', phone: '', unit: '', date: '', time: '', agent: 'Kally' });
  
  const handleBook = (e) => {
    e.preventDefault();
    const newBooking = {
        id: Date.now(),
        ...formData,
        unit: formData.unit.toUpperCase(),
        status: 'Link Sent', 
        linkSent: true
    };
    setViewings([newBooking, ...viewings]);
    setIsBookModalOpen(false);
    setFormData({ prospect: '', phone: '', unit: '', date: '', time: '', agent: 'Kally' });
  };

  const cancelViewing = (id) => {
    if(!confirm("Cancel this appointment?")) return;
    setViewings(prev => prev.map(v => v.id === id ? { ...v, status: 'Agent Cancelled' } : v));
  };

  // OPEN COMPLETION MODAL
  const openCompleteModal = (id) => {
    setActiveViewingId(id);
    setIsOutcomeModalOpen(true);
  };

  // SAVE OUTCOME (Replacing the Prompt)
  const saveOutcome = (outcome, note) => {
    setViewings(prev => prev.map(v => 
        v.id === activeViewingId ? { ...v, status: 'Completed', outcome: outcome, note: note } : v
    ));
    setIsOutcomeModalOpen(false);
    setActiveViewingId(null);
  };

  const resendLink = (phone) => {
    // UI Feedback only (Toast replacement)
    const btn = document.getElementById(`resend-${phone}`);
    if(btn) {
        const originalText = btn.innerText;
        btn.innerText = "Sent!";
        setTimeout(() => btn.innerText = originalText, 2000);
    }
  };

  const filteredViewings = viewings.filter(v => {
    if (filter === 'upcoming') return ['Confirmed', 'Link Sent'].includes(v.status);
    if (filter === 'cancelled') return v.status.includes('Cancelled');
    if (filter === 'history') return v.status === 'Completed';
    return false; // Analytics handled separately
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "ml-60" : "ml-20"} p-8`}>
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 max-w-5xl mx-auto">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Showings</h1>
            <div className="flex bg-slate-200 p-1 rounded-xl mt-4 w-fit shadow-inner scale-90 origin-left">
               {['upcoming', 'cancelled', 'history', 'analytics'].map(f => (
                   <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}>
                       {f.toUpperCase()}
                   </button>
               ))}
            </div>
          </div>
          
          {filter !== 'analytics' && (
            <button onClick={() => setIsBookModalOpen(true)} className="bg-purple-600 text-white py-4 px-8 rounded-2xl shadow-xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-3 active:scale-95 transition-all hover:bg-purple-700 border-b-4 border-purple-800">
                <FaPlus size={12} /> <span>New Booking</span>
            </button>
          )}
        </header>

        {/* --- VIEW: ANALYTICS (NEW) --- */}
        {filter === 'analytics' && (
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                {/* 1. MOST VIEWED CARD */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><FaFireAlt size={150} /></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Top Performer</span>
                            <FaFireAlt className="text-orange-400" />
                        </div>
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-1">{stats.mostViewed.unit}</h2>
                        <p className="text-sm font-medium text-purple-200 mb-6">{stats.mostViewed.count} Total Viewings</p>
                        
                        <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-purple-200">Recommendation</p>
                            <p className="text-xs font-bold leading-relaxed">
                                High traffic unit. Prioritize deep cleaning and ensure maintenance is 100% daily. Increase price by 5% if occupancy allows.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. RANKING LIST */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 mb-6">Popularity Index</h3>
                    <div className="space-y-4">
                        {stats.ranking.map((item, index) => (
                            <div key={item.unit} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-500'}`}>
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

        {/* --- VIEW: LISTINGS --- */}
        {filter !== 'analytics' && (
            <div className="max-w-5xl mx-auto space-y-6">
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
                        onCancel={() => cancelViewing(v.id)} 
                        onComplete={() => openCompleteModal(v.id)}
                        onResend={() => resendLink(v.phone)}
                    />
                ))
            )}
            </div>
        )}
      </main>

      {/* --- MODAL 1: BOOKING --- */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter">New Appointment</h2>
                    <button onClick={() => setIsBookModalOpen(false)} className="text-slate-500 hover:text-white"><FaTimes size={20}/></button>
                </div>
                <form onSubmit={handleBook} className="p-8 space-y-5">
                    {/* (Form Inputs same as before) */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Prospective Tenant</label>
                        <input required placeholder="Name & Surname" className="w-full bg-slate-100 p-4 rounded-2xl font-black uppercase text-xs outline-none focus:ring-2 ring-purple-600" 
                            value={formData.prospect} onChange={e => setFormData({...formData, prospect: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                            <input required type="time" className="w-full bg-slate-100 p-4 rounded-2xl font-black text-xs outline-none" 
                                value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-purple-700 transition-all active:scale-95 flex items-center justify-center space-x-2">
                        <FaPaperPlane /> <span>Send Booking Link</span>
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- MODAL 2: OUTCOME (UI REPLACEMENT FOR PROMPT) --- */}
      {isOutcomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-8 text-center border-b border-slate-100">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">How did it go?</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Log the client's reaction</p>
                </div>
                
                <div className="p-8 grid grid-cols-1 gap-3">
                    <button onClick={() => saveOutcome('Accepted', 'Application Started')} className="p-4 rounded-2xl bg-green-50 border border-green-100 hover:border-green-300 hover:bg-green-100 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500 text-white p-2 rounded-full"><FaHandshake /></div>
                            <span className="text-sm font-black uppercase text-green-800">Deal Closed / Offer</span>
                        </div>
                        <FaCheck className="text-green-300 group-hover:text-green-600" />
                    </button>

                    <button onClick={() => saveOutcome('Thinking', 'Client needs time')} className="p-4 rounded-2xl bg-orange-50 border border-orange-100 hover:border-orange-300 hover:bg-orange-100 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-400 text-white p-2 rounded-full"><FaBrain /></div>
                            <span className="text-sm font-black uppercase text-orange-800">Thinking / Interested</span>
                        </div>
                        <FaCheck className="text-orange-300 group-hover:text-orange-600" />
                    </button>

                    <button onClick={() => saveOutcome('Rejected', 'Not interested')} className="p-4 rounded-2xl bg-red-50 border border-red-100 hover:border-red-300 hover:bg-red-100 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-500 text-white p-2 rounded-full"><FaBan /></div>
                            <span className="text-sm font-black uppercase text-red-800">Rejected</span>
                        </div>
                        <FaTimes className="text-red-300 group-hover:text-red-600" />
                    </button>
                </div>

                <div className="px-8 pb-8">
                    <button onClick={() => setIsOutcomeModalOpen(false)} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase hover:text-slate-600">Close</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

/* COMPONENT: VIEWING CARD */
const ViewingCard = ({ data, onCancel, onComplete, onResend }) => {
  const { unit, prospect, phone, agent, date, time, status, outcome, note } = data;
  const isCancelled = status.includes('Cancelled');
  const isCompleted = status === 'Completed';

  // Helper to color code the completed outcome
  const getOutcomeColor = (out) => {
      if(out === 'Accepted') return 'bg-green-500 text-white';
      if(out === 'Thinking') return 'bg-orange-400 text-white';
      return 'bg-red-500 text-white';
  };

  return (
    <div className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-auto hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 ${isCancelled ? 'opacity-60 grayscale' : ''}`}>
      
      <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="flex items-start space-x-5">
          <div className={`p-4 rounded-2xl shadow-lg text-white shrink-0 ${isCancelled ? 'bg-red-500' : isCompleted ? 'bg-purple-600' : 'bg-purple-600'}`}>
             {isCancelled ? <FaTimes size={20} /> : isCompleted ? <FaCheck size={20} /> : <FaUserFriends size={20} />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2">{unit}</h2>
            <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[11px] font-black text-slate-800 uppercase tracking-tight">
                  <span>{prospect}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-blue-500">{phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <FaUserTie size={10} className="text-purple-500" />
                  <span>Agent: <span className="text-slate-600">{agent}</span></span>
                </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: STATUS & TIME */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-right">
              <div className="flex items-center justify-end space-x-2 text-slate-900 text-[11px] font-black uppercase">
                  <FaCalendarAlt size={10} className="text-purple-500" />
                  <span>{date}</span>
              </div>
              <div className="flex items-center justify-end space-x-1 mt-1 text-slate-500 text-[10px] font-bold italic">
                  <FaClock size={9} />
                  <span>{time}</span>
              </div>
          </div>
          
          <div className={`px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center space-x-2 ${
              isCancelled ? 'bg-red-50 text-red-600 border-red-100' :
              isCompleted ? 'bg-purple-50 text-purple-600 border-purple-100' :
              'bg-purple-50 text-purple-600 border-purple-100'
          }`}>
              <span>{status}</span>
          </div>
        </div>
      </div>

      {/* FEEDBACK SECTION (History) */}
      {isCompleted && outcome && (
          <div className="px-8 pb-6">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
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

      {/* FOOTER ACTIONS (Upcoming) */}
      {!isCancelled && !isCompleted && (
          <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
            
            {/* LEFT SIDE: RESEND LINK */}
            <button id={`resend-${data.phone}`} onClick={onResend} className="flex items-center space-x-2 text-[9px] font-black uppercase text-blue-500 hover:text-blue-700 transition-colors">
                <FaWhatsapp size={14} /> 
                <span>Resend Link</span>
            </button>
            
            <div className="flex space-x-3">
                <button onClick={onCancel} className="bg-white border border-slate-200 text-slate-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-red-500 hover:border-red-500 transition-all">
                    Cancel
                </button>
                <button onClick={onComplete} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center space-x-2 shadow-lg hover:bg-black transition-all">
                    <FaCheck className="text-green-400" /> <span>Result</span>
                </button>
            </div>
          </div>
      )}
    </div>
  );
};

export default ViewingsPage;