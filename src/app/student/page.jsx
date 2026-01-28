"use client";
import { useState } from 'react';
import { 
  FaUserCircle, FaBell, FaTools, FaClipboardCheck, FaHeadset, 
  FaPaperPlane, FaHome, FaKey, FaTicketAlt, FaChevronRight, 
  FaArrowLeft, FaPlus, FaCalendarCheck, FaCheckCircle, FaClock,
  FaExclamationTriangle, FaTintSlash, FaBoxOpen, FaFileInvoiceDollar, FaTimes
} from "react-icons/fa";

const StudentPortal = () => {
  const [view, setView] = useState('hub'); 
  const [activeChat, setActiveChat] = useState(null);
  const [activeNotification, setActiveNotification] = useState(null); // For the full read view

  // --- MOCK DATA ---

  // 1. NOTIFICATIONS
  const [notifications, setNotifications] = useState([
    { 
        id: 1, type: 'critical', title: 'Water Outage', 
        msg: 'Emergency repairs are required on the main line due to a burst pipe reported earlier today. Water supply will be interrupted from 14:00 to 17:00. Please ensure you have stored enough water for essential use during this period. We apologize for the inconvenience.', 
        time: '2h ago', read: false 
    },
    { 
        id: 2, type: 'action', title: 'Parcel Arrived', 
        msg: 'A package has arrived for you at the reception desk. Reference #992. Please collect it before 18:00 today.', 
        time: '5h ago', read: false 
    },
    { 
        id: 3, type: 'info', title: 'Rent Invoice Generated', 
        msg: 'Your invoice for February 2026 has been generated and sent to your email. Total due: R4,500.', 
        time: 'Yesterday', read: true 
    },
    { 
        id: 4, type: 'info', title: 'Fire Drill', 
        msg: 'Scheduled fire drill testing will take place tomorrow morning at 08:00. Please do not panic when the alarm sounds.', 
        time: '2 days ago', read: true 
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // 2. REPAIRS
  const repairs = [
    { id: 101, issue: "Broken Floor Tile", status: "Scheduled", dateLogged: "12 Jan", appointment: "Mon 26 Jan • 10:00 AM", tech: "Rasta" },
    { id: 102, issue: "Microwave Not Heating", status: "Pending", dateLogged: "14 Jan", appointment: null, tech: null },
  ];

  // 3. CHATS
  const [chats, setChats] = useState([
    { id: 1, subject: "Leaking Tap #402", lastMsg: "Maintenance is on the way.", time: "10:30", status: "active", unread: 2 },
  ]);

  const [messages, setMessages] = useState([]);

  // --- ACTIONS ---

  const handleOpenChat = (chat) => { setActiveChat(chat); setView('chat'); };
  
  const handleNewTicket = () => {
    setActiveChat({ id: 'new', subject: 'New Request', status: 'new' });
    setMessages([]); 
    setView('chat');
  };

  const handleBack = () => {
    if (activeNotification) {
        setActiveNotification(null); // Close notification modal
        return;
    }
    if (view === 'chat') setView('list');
    else if (view === 'list') setView('hub');
    else if (view === 'notifications') setView('hub');
    else if (view === 'repair') setView('hub');
  };

  const handleOpenNotifications = () => {
    setView('notifications');
  };

  // OPEN & MARK AS READ
  const handleReadNotification = (note) => {
    setActiveNotification(note);
    
    // Mark as read in the background
    if (!note.read) {
        const updated = notifications.map(n => n.id === note.id ? { ...n, read: true } : n);
        setNotifications(updated);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = e.target.message.value;
    if(!text) return;
    setMessages([...messages, { id: Date.now(), text: text, sender: 'me', time: 'Just now' }]);
    e.target.reset();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      
      {/* --- HEADER --- */}
      <header className="bg-white px-6 py-5 flex justify-between items-center border-b border-slate-100 sticky top-0 z-20 max-w-lg mx-auto w-full">
        <div className="flex items-center space-x-4">
          {view === 'hub' ? (
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg">P</div>
          ) : (
            <button onClick={handleBack} className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
               <FaArrowLeft />
            </button>
          )}
          
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
              {view === 'hub' ? 'Student Hub' : view === 'notifications' ? 'Notice Board' : view === 'repair' ? 'My Repairs' : view === 'list' ? 'Help Desk' : 'Support'}
            </h1>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em]">
              {view === 'chat' ? 'Support Online' : 'Duncan Court • A612'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-5">
           <button onClick={handleOpenNotifications} className={`relative p-1 transition-colors ${view === 'notifications' ? 'text-blue-600' : 'text-slate-400'}`}>
             <FaBell size={20} />
             {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                </span>
             )}
           </button>
           <FaUserCircle className="text-slate-200" size={32} />
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="w-full p-4 pb-32 max-w-lg mx-auto h-full flex flex-col">
        
        {/* VIEW 1: HUB */}
        {view === 'hub' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-4 w-full">
              <GridCard icon={<FaClipboardCheck />} label="Inspection" value="10 JAN" sub="Visual Audit: Clear" statusColor="bg-green-500" iconColor="text-blue-500" />
              <GridCard icon={<FaTools />} label="Maintenance" value="PENDING" sub="Stove Repair #402" statusColor="bg-orange-500" iconColor="text-orange-500" active />
              <GridCard icon={<FaKey />} label="Security" value="3/3" sub="Keys & Remotes" statusColor="bg-green-500" iconColor="text-yellow-500" />
              <GridCard icon={<FaTicketAlt />} label="Tickets" value="01" sub="Help Desk Active" statusColor="bg-purple-500" iconColor="text-purple-500" />
            </div>

            {/* HEADLINE ALERT */}
            <div onClick={() => handleReadNotification(notifications[0])} className="w-full bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative group cursor-pointer active:scale-95 transition-transform">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 blur-[80px] rounded-full"></div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Latest Alert</h3>
                    <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                        <span className="text-[8px] font-black text-yellow-500 uppercase">Building Wide</span>
                    </div>
                </div>
                <div className="space-y-6 relative z-10">
                    <div className="flex items-start space-x-4">
                        <div className="mt-1 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-yellow-400 text-lg">
                            <FaTintSlash />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-tight italic">Water Supply Interruption</p>
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-medium line-clamp-2">
                                Emergency maintenance on the main line. Water will be off today from 14:00 to 17:00.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={() => setView('list')} className="w-full bg-blue-600 rounded-[2.5rem] p-7 text-white flex justify-between items-center shadow-xl shadow-blue-200 active:scale-[0.97] transition-all">
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-white/10 rounded-[1.5rem] flex items-center justify-center border border-white/10"><FaHeadset size={24} /></div>
                <div className="text-left">
                  <h3 className="text-base font-black uppercase italic tracking-tighter leading-none mb-1.5">Help Desk</h3>
                  <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">Tap to Chat</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center"><FaChevronRight size={12} /></div>
            </button>
          </div>
        )}

        {/* VIEW 2: NOTIFICATIONS (The Bell List) */}
        {view === 'notifications' && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Recent Alerts</p>
                {notifications.map(note => (
                    <button 
                        key={note.id} 
                        onClick={() => handleReadNotification(note)}
                        className={`w-full text-left p-5 rounded-[2rem] border flex gap-4 transition-all active:scale-[0.98] ${note.read ? 'bg-white border-slate-100' : 'bg-blue-50 border-blue-100 shadow-sm'}`}
                    >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 
                            ${note.type === 'critical' ? 'bg-red-100 text-red-500' : 
                              note.type === 'action' ? 'bg-green-100 text-green-600' : 
                              'bg-slate-100 text-slate-500'}`}>
                            {note.type === 'critical' ? <FaExclamationTriangle /> : 
                             note.type === 'action' ? <FaBoxOpen /> : 
                             <FaFileInvoiceDollar />}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-start w-full gap-2">
                                <h3 className={`text-xs font-black uppercase tracking-tight truncate ${note.read ? 'text-slate-600' : 'text-slate-900'}`}>{note.title}</h3>
                                <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{note.time}</span>
                            </div>
                            <p className={`text-[10px] mt-1 font-medium leading-relaxed truncate ${note.read ? 'text-slate-400' : 'text-slate-600'}`}>{note.msg}</p>
                        </div>
                        {!note.read && <div className="w-2 h-2 bg-red-500 rounded-full self-center"></div>}
                    </button>
                ))}
            </div>
        )}

        {/* VIEW 3: REPAIR TRACKER */}
        {view === 'repair' && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="bg-blue-50 p-6 rounded-[2.5rem] text-center border border-blue-100">
                    <h2 className="text-2xl font-black text-blue-900 uppercase italic tracking-tighter">Maintenance Log</h2>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Read-Only Status Tracker</p>
                </div>
                <div className="space-y-3">
                    {repairs.map(job => (
                        <div key={job.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
                                        job.status === 'Completed' ? 'bg-green-500' : job.status === 'Scheduled' ? 'bg-blue-500' : 'bg-orange-400'
                                    }`}>
                                        {job.status === 'Completed' ? <FaCheckCircle /> : job.status === 'Scheduled' ? <FaCalendarCheck /> : <FaTools />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase">{job.issue}</h3>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logged: {job.dateLogged}</p>
                                    </div>
                                </div>
                                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                                    job.status === 'Completed' ? 'bg-green-100 text-green-700' : job.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                    {job.status}
                                </span>
                            </div>
                            {(job.appointment || job.tech) && (
                                <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
                                    <FaClock className="text-slate-400" />
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Appointment</p>
                                        <p className="text-xs font-bold text-slate-700 uppercase">
                                            {job.tech && <span className="text-blue-500 mr-1">@{job.tech}</span>}
                                            {job.appointment || 'TBA'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* VIEW 4: TICKET LIST */}
        {view === 'list' && (
          <div className="space-y-3 animate-in slide-in-from-right-4 relative h-full">
             <div className="space-y-3">
                 {chats.map(chat => (
                   <button key={chat.id} onClick={() => handleOpenChat(chat)} className="w-full bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all">
                      <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${chat.status === 'active' ? 'bg-blue-500 shadow-lg shadow-blue-200' : 'bg-slate-200'}`}>
                            <FaHeadset size={20} />
                         </div>
                         <div className="text-left">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{chat.subject}</h3>
                            <p className={`text-[10px] mt-1 truncate max-w-[150px] ${chat.unread > 0 ? 'font-bold text-slate-800' : 'font-medium text-slate-400'}`}>
                               {chat.lastMsg}
                            </p>
                         </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                         <span className="text-[9px] font-bold text-slate-400">{chat.time}</span>
                         {chat.unread > 0 && <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{chat.unread}</span>}
                      </div>
                   </button>
                 ))}
             </div>
             <div className="fixed bottom-24 right-6 z-30">
                <button onClick={handleNewTicket} className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform hover:bg-black">
                   <FaPlus size={20} />
                </button>
             </div>
          </div>
        )}

        {/* VIEW 5: CHAT THREAD */}
        {view === 'chat' && (
          <div className="flex flex-col h-[80vh] animate-in slide-in-from-right-4 relative">
             <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <FaPaperPlane size={40} className="mb-4 opacity-20"/>
                        <p className="text-xs font-black uppercase tracking-widest">How can we help?</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center"><span className="bg-slate-200 text-slate-500 text-[9px] font-bold px-3 py-1 rounded-full uppercase">Today</span></div>
                        {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                                msg.sender === 'me' 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                            }`}>
                                <p>{msg.text}</p>
                                <p className={`text-[8px] mt-1 text-right ${msg.sender === 'me' ? 'text-blue-200' : 'text-slate-400'}`}>{msg.time}</p>
                            </div>
                        </div>
                        ))}
                    </>
                )}
             </div>
             <form onSubmit={handleSendMessage} className="mt-auto bg-white p-2 rounded-[2rem] shadow-lg border border-slate-100 flex items-center gap-2">
                <input 
                    name="message" 
                    autoFocus={activeChat?.id === 'new'} 
                    type="text" 
                    placeholder="Type your issue here..." 
                    className="flex-1 bg-transparent px-4 py-3 text-sm font-medium outline-none text-slate-700 placeholder:text-slate-400" 
                />
                <button type="submit" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-transform">
                   <FaPaperPlane size={14} className="ml-0.5" />
                </button>
             </form>
          </div>
        )}

      </main>

      {/* --- NOTIFICATION DETAIL MODAL --- */}
      {activeNotification && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 sm:zoom-in-95">
                <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl 
                        ${activeNotification.type === 'critical' ? 'bg-red-100 text-red-500' : 
                          activeNotification.type === 'action' ? 'bg-green-100 text-green-600' : 
                          'bg-slate-100 text-slate-500'}`}>
                        {activeNotification.type === 'critical' ? <FaExclamationTriangle /> : 
                         activeNotification.type === 'action' ? <FaBoxOpen /> : 
                         <FaFileInvoiceDollar />}
                    </div>
                    <button onClick={() => setActiveNotification(null)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200">
                        <FaTimes />
                    </button>
                </div>
                
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight mb-2">{activeNotification.title}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{activeNotification.time}</p>
                
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <p className="text-sm font-medium text-slate-600 leading-7">
                        {activeNotification.msg}
                    </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <button onClick={() => setActiveNotification(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">
                        Close Notice
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FLOATING BOTTOM NAV */}
      {view !== 'chat' && !activeNotification && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent flex justify-center pointer-events-none z-10">
          <nav className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-white rounded-[2.5rem] p-3 flex justify-around items-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] pointer-events-auto">
              <NavIcon icon={<FaHome size={20} />} label="Hub" active={view === 'hub'} onClick={() => setView('hub')} />
              <NavIcon icon={<FaTools size={20} />} label="Repair" active={view === 'repair'} onClick={() => setView('repair')} />
              <NavIcon icon={<FaHeadset size={20} />} label="Chat" active={view === 'list'} onClick={() => setView('list')} />
              <NavIcon icon={<FaUserCircle size={20} />} label="Profile" />
          </nav>
        </div>
      )}
    </div>
  );
};

/* COMPONENT: GRID CARD */
const GridCard = ({ icon, label, value, sub, statusColor, iconColor, active = false }) => (
  <div className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between h-44 transition-all active:scale-[0.98]`}>
    <div className="flex justify-between items-start">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-slate-50 ${iconColor}`}>{icon}</div>
        <div className={`w-2.5 h-2.5 rounded-full ${statusColor} ${active ? 'animate-ping' : ''}`}></div>
    </div>
    <div className="mt-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
        <p className="text-xl font-black text-slate-900 uppercase leading-none tracking-tighter italic mb-1.5">{value}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase italic opacity-50 tracking-tight">{sub}</p>
    </div>
  </div>
);

const NavIcon = ({ icon, label, active = false, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-2xl transition-all ${active ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}>
        {icon}
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </button>
);

export default StudentPortal;