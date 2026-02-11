"use client";
import { useState, useMemo, useEffect } from 'react';
import Sidebar from '../components/Sidebar'; // Ensure this path is correct for your project
// 1. Import Firestore Functions
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
// 2. Fix Import: Use Capital F and relative path to be safe
import { db, auth } from '../Config/firebaseConfig'; 
import { 
  FaPlus, FaUserFriends, FaCalendarAlt, 
  FaClock, FaTimes, FaCheck, FaUserTie,
  FaWhatsapp, FaFireAlt, FaHandshake, FaBrain, FaBan, FaBars, FaPaperPlane
} from "react-icons/fa";

const ViewingsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState('upcoming'); 
  const [loading, setLoading] = useState(true); // Add loading state
  const [userData, setUserData] = useState({ firstName: 'Agent', lastName: '' });
  const [userRole, setUserRole] = useState(null);
  
  // MODAL STATES
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [activeViewingId, setActiveViewingId] = useState(null); 

  // DATA STATE (Start empty, fill from DB)
  const [viewings, setViewings] = useState([]);

  // Fetch User Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "stuff", currentUser.uid));
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
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 1. FETCH DATA FROM FIREBASE ---
  useEffect(() => {
    const fetchViewings = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "viewings"));
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by date (optional, currently just raw data)
        setViewings(data);
      } catch (error) {
        console.error("Error fetching viewings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchViewings();
    
    // Responsive Sidebar Logic
    const handleResize = () => {
      if (window.innerWidth < 768) setIsOpen(false);
      else setIsOpen(true);
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- ANALYTICS LOGIC ---
  const stats = useMemo(() => {
    const counts = {};
    viewings.forEach(v => { counts[v.unit] = (counts[v.unit] || 0) + 1; });
    const sortedUnits = Object.entries(counts).sort(([,a], [,b]) => b - a).map(([unit, count]) => ({ unit, count }));

    return {
        mostViewed: sortedUnits[0] || { unit: "N/A", count: 0 },
        totalViewings: viewings.length,
        ranking: sortedUnits
    };
  }, [viewings]);

  // --- ACTIONS ---
  const agentName = `${userData.firstName} ${userData.lastName}`.trim() || 'Agent';
  const [formData, setFormData] = useState({ prospect: '', phone: '', unit: '', date: '', time: '', agent: agentName });
  
  // --- 2. ADD TO DATABASE ---
  const handleBook = async (e) => {
    e.preventDefault();
    
    const newBooking = {
        ...formData, 
        unit: formData.unit.toUpperCase(), 
        status: 'Link Sent', 
        linkSent: true,
        createdAt: serverTimestamp() // Add timestamp
    };

    try {
        // Save to Firestore
        const docRef = await addDoc(collection(db, "viewings"), newBooking);
        
        // Update Local State (Optimistic UI)
        setViewings([{ id: docRef.id, ...newBooking }, ...viewings]);
        
        setIsBookModalOpen(false);
        setFormData({ prospect: '', phone: '', unit: '', date: '', time: '', agent: agentName });
    } catch (error) {
        console.error("Error booking viewing:", error);
        alert("Failed to save booking. Check console.");
    }
  };

  // --- 3. UPDATE DATABASE (Cancel) ---
  const cancelViewing = async (id) => {
    if(!confirm("Cancel this appointment?")) return;

    try {
        const viewingRef = doc(db, "viewings", id);
        await updateDoc(viewingRef, { status: 'Agent Cancelled' });

        // Update Local State
        setViewings(prev => prev.map(v => v.id === id ? { ...v, status: 'Agent Cancelled' } : v));
    } catch (error) {
        console.error("Error cancelling:", error);
    }
  };

  const openCompleteModal = (id) => { setActiveViewingId(id); setIsOutcomeModalOpen(true); };

  // --- 4. UPDATE DATABASE (Outcome) ---
  const saveOutcome = async (outcome, note) => {
    try {
        const viewingRef = doc(db, "viewings", activeViewingId);
        await updateDoc(viewingRef, { 
            status: 'Completed', 
            outcome: outcome, 
            note: note 
        });

        // Update Local State
        setViewings(prev => prev.map(v => v.id === activeViewingId ? { ...v, status: 'Completed', outcome: outcome, note: note } : v));
        setIsOutcomeModalOpen(false);
        setActiveViewingId(null);
    } catch (error) {
        console.error("Error saving outcome:", error);
    }
  };

  const resendLink = (phone) => {
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
    return false; 
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9] relative">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8 max-w-[2400px]`}>
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 max-w-7xl mx-auto w-full">
          <div className="flex flex-col gap-4 w-full md:w-auto">
             {/* Title & Burger Row */}
             <div className="flex items-center gap-4">
                <button onClick={() => setIsOpen(!isOpen)} className="md:hidden bg-white p-2 rounded-lg shadow-sm text-slate-600 border border-slate-200">
                    <FaBars size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Showings</h1>
                    <p className="text-[10px] text-slate-400 font-bold tracking-[0.3em] uppercase mt-1">Calendar & Outcomes</p>
                </div>
             </div>

             {/* Scrollable Tabs */}
             <div className="w-full overflow-x-auto pb-1">
                <div className="flex bg-slate-200 p-1 rounded-xl w-fit shadow-inner scale-95 origin-left whitespace-nowrap">
                   {['upcoming', 'cancelled', 'history', 'analytics'].map(f => (
                       <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}>
                           {f.toUpperCase()}
                       </button>
                   ))}
                </div>
             </div>
          </div>
          
          {filter !== 'analytics' && userRole !== 'PQA' && userRole !== 'Maintenance Admin' && (
            <button onClick={() => setIsBookModalOpen(true)} className="w-full md:w-auto bg-purple-600 text-white py-4 px-8 rounded-2xl shadow-xl font-black text-[10px] uppercase tracking-widest flex justify-center items-center space-x-3 active:scale-95 transition-all hover:bg-purple-700 border-b-4 border-purple-800">
                <FaPlus size={12} /> <span>New Booking</span>
            </button>
          )}
        </header>

        {/* --- LOADING STATE --- */}
        {loading && (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )}

        {/* --- VIEW: ANALYTICS --- */}
        {!loading && filter === 'analytics' && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                {/* 1. MOST VIEWED CARD */}
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
                            <p className="text-xs font-bold leading-relaxed">High traffic unit. Prioritize deep cleaning. Increase price by 5% if occupancy allows.</p>
                        </div>
                    </div>
                </div>

                {/* 2. RANKING LIST */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 mb-6">Popularity Index</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.ranking.map((item, index) => (
                            <div key={item.unit} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-500'}`}>{index + 1}</div>
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
        {!loading && filter !== 'analytics' && (
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
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter">New Appointment</h2>
                    <button onClick={() => setIsBookModalOpen(false)} className="text-slate-500 hover:text-white"><FaTimes size={20}/></button>
                </div>
                <form onSubmit={handleBook} className="p-6 md:p-8 space-y-4">
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

      {/* --- MODAL 2: OUTCOME --- */}
      {isOutcomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="p-8 text-center border-b border-slate-100">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">How did it go?</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Log the client's reaction</p>
                </div>
                <div className="p-8 grid grid-cols-1 gap-3">
                    <button onClick={() => saveOutcome('Accepted', 'Application Started')} className="p-4 rounded-2xl bg-green-50 border border-green-100 hover:border-green-300 hover:bg-green-100 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3"><div className="bg-green-500 text-white p-2 rounded-full"><FaHandshake /></div><span className="text-sm font-black uppercase text-green-800">Deal Closed</span></div><FaCheck className="text-green-300 group-hover:text-green-600" />
                    </button>
                    <button onClick={() => saveOutcome('Thinking', 'Client needs time')} className="p-4 rounded-2xl bg-orange-50 border border-orange-100 hover:border-orange-300 hover:bg-orange-100 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3"><div className="bg-orange-400 text-white p-2 rounded-full"><FaBrain /></div><span className="text-sm font-black uppercase text-orange-800">Thinking</span></div><FaCheck className="text-orange-300 group-hover:text-orange-600" />
                    </button>
                    <button onClick={() => saveOutcome('Rejected', 'Not interested')} className="p-4 rounded-2xl bg-red-50 border border-red-100 hover:border-red-300 hover:bg-red-100 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3"><div className="bg-red-500 text-white p-2 rounded-full"><FaBan /></div><span className="text-sm font-black uppercase text-red-800">Rejected</span></div><FaTimes className="text-red-300 group-hover:text-red-600" />
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

/* COMPONENT: VIEWING CARD (Responsive) */
const ViewingCard = ({ data, onCancel, onComplete, onResend }) => {
  const { unit, prospect, phone, agent, date, time, status, outcome, note } = data;
  const isCancelled = status.includes('Cancelled');
  const isCompleted = status === 'Completed';

  const getOutcomeColor = (out) => {
      if(out === 'Accepted') return 'bg-green-500 text-white';
      if(out === 'Thinking') return 'bg-orange-400 text-white';
      return 'bg-red-500 text-white';
  };

  return (
    <div className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-auto hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 ${isCancelled ? 'opacity-60 grayscale' : ''}`}>
      
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

      {/* FEEDBACK SECTION */}
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

      {/* FOOTER ACTIONS */}
      {!isCancelled && !isCompleted && (
          <div className="px-6 md:px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <button id={`resend-${data.phone}`} onClick={onResend} className="flex items-center space-x-2 text-[9px] font-black uppercase text-blue-500 hover:text-blue-700 transition-colors w-full md:w-auto justify-center md:justify-start">
                <FaWhatsapp size={14} /> <span>Resend Link</span>
            </button>
            <div className="flex space-x-3 w-full md:w-auto">
                <button onClick={onCancel} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-red-500 hover:border-red-500 transition-all">
                    Cancel
                </button>
                <button onClick={onComplete} className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg hover:bg-black transition-all">
                    <FaCheck className="text-green-400" /> <span>Result</span>
                </button>
            </div>
          </div>
      )}
    </div>
  );
};

export default ViewingsPage;