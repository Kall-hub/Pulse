"use client";
import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../Config/firebaseConfig';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { 
  FaSearch, FaFilter, FaPaperPlane, FaImage, FaCheckCircle, 
  FaClock, FaUserCircle, FaChevronLeft, FaEllipsisV, FaBars, FaTimes
} from "react-icons/fa";
import { BiSupport } from "react-icons/bi";

const HelpDeskPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeChat, setActiveChat] = useState(null); // If null, show list. If set, show chat.
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'chat'

  // TICKETS FROM FIREBASE
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [viewingImage, setViewingImage] = useState(null);
  
  const messagesEndRef = useRef(null);
  
  // Load all support tickets from Firebase
  useEffect(() => {
    const q = query(
      collection(db, 'supportTickets'),
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTickets(ticketsData);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Load messages for active chat
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    
    const q = query(
      collection(db, 'supportTickets', activeChat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
    });
    
    return () => unsubscribe();
  }, [activeChat]);

  // Responsive Sidebar Logic
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsOpen(false);
      else setIsOpen(true);
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChat]);

  // --- HANDLERS ---

  const openChat = (ticket) => {
    setActiveChat(ticket);
    setMobileView('chat');
  };

  const backToList = () => {
    setMobileView('list');
    setTimeout(() => setActiveChat(null), 300); // Delay clear for animation effect if needed
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const form = e.target;
    const text = form.message.value;
    if (!text.trim()) return;
    
    try {
      await addDoc(collection(db, 'supportTickets', activeChat.id, 'messages'), {
        text: text,
        sender: 'helpdesk',
        senderName: 'Support Team',
        timestamp: serverTimestamp()
      });
      
      // Update ticket's updatedAt and lastMessage
      await updateDoc(doc(db, 'supportTickets', activeChat.id), {
        updatedAt: serverTimestamp(),
        lastMessage: text
      });
      
      form.reset();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };
  
  const resolveTicket = async () => {
    if (!activeChat) return;
    if (!confirm('Mark this ticket as resolved?')) return;
    
    try {
      await updateDoc(doc(db, 'supportTickets', activeChat.id), {
        status: 'Resolved',
        resolvedAt: serverTimestamp()
      });
      
      setMobileView('list');
      setTimeout(() => setActiveChat(null), 300);
    } catch (error) {
      console.error('Error resolving ticket:', error);
      alert('Failed to resolve ticket');
    }
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans overflow-hidden">
      {/* SIDEBAR (Desktop: Always visible / Mobile: Overlay) */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* MAIN LAYOUT */}
      <main className={`flex-1 flex flex-col transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} h-full`}>
        
        {/* --- MOBILE HEADER (Only visible in List View on Mobile) --- */}
        <div className={`md:hidden bg-white p-4 flex items-center justify-between border-b border-slate-200 ${mobileView === 'chat' ? 'hidden' : ''}`}>
           <div className="flex items-center gap-3">
              <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600 p-2 -ml-2"><FaBars size={20}/></button>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Help Desk</h1>
           </div>
           <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
              {tickets.filter(t => t.status === 'Open').length} Open
           </div>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* LEFT PANEL: TICKET LIST */}
          <div className={`
            w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col z-10
            absolute md:relative h-full transition-transform duration-300
            ${mobileView === 'chat' ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
          `}>
            
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative group">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search tickets..." 
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {tickets.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <BiSupport size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-bold uppercase tracking-widest">No tickets yet</p>
                </div>
              ) : (
                tickets.map(ticket => {
                  const updatedDate = ticket.updatedAt?.toDate?.();
                  const timeLabel = updatedDate ? updatedDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'New';
                  
                  return (
                    <div 
                      key={ticket.id} 
                      onClick={() => openChat(ticket)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-slate-50
                        ${activeChat?.id === ticket.id ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 uppercase">{ticket.tenant}</span>
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{ticket.unit}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">{timeLabel}</span>
                      </div>
                      
                      <h4 className="text-xs font-bold text-slate-700 truncate mb-0.5">{ticket.subject}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{ticket.lastMessage || 'No messages yet'}</p>
                      
                      <div className="mt-2">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                          ticket.status === 'Open' ? 'bg-green-100 text-green-700' :
                          ticket.status === 'Resolved' ? 'bg-slate-100 text-slate-500' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: CHAT WINDOW */}
          <div className={`
            flex-1 bg-[#F8FAFC] flex flex-col h-full absolute md:relative w-full
            transition-transform duration-300
            ${mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          `}>
            
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-20">
                  <div className="flex items-center gap-3">
                    <button onClick={backToList} className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800">
                      <FaChevronLeft />
                    </button>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{activeChat.subject}</h2>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span className={`w-2 h-2 rounded-full ${activeChat.status === 'Open' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                        <span>{activeChat.tenant} ({activeChat.unit})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={resolveTicket} className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 hover:bg-green-100 transition-colors">
                        <FaCheckCircle /> <span className="hidden sm:inline">Resolve</span>
                    </button>
                    <button className="text-slate-400 hover:text-slate-600 p-2"><FaEllipsisV /></button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                  {/* Date Divider */}
                  <div className="flex justify-center">
                    <span className="bg-slate-200 text-slate-500 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Today</span>
                  </div>

                  {messages.map((msg) => {
                    const isHelpdesk = msg.sender === 'helpdesk';
                    const time = msg.timestamp?.toDate?.() ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'Now';
                    
                    return (
                      <div key={msg.id} className={`flex ${isHelpdesk ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isHelpdesk ? 'items-end' : 'items-start'}`}>
                          {!isHelpdesk && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 px-1">
                              {msg.senderName || 'Student'}
                            </span>
                          )}
                          <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm relative group
                            ${isHelpdesk 
                              ? 'bg-blue-600 text-white rounded-tr-sm' 
                              : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100'
                            }
                          `}>
                            {msg.text}
                            {Array.isArray(msg.images) && msg.images.length > 0 && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {msg.images.slice(0, 5).map((url, idx) => (
                                  <button key={`${msg.id}-img-${idx}`} type="button" onClick={() => setViewingImage(url)} className="block">
                                    <img src={url} alt="attachment" className="w-full h-20 object-cover rounded-lg border border-white/20 cursor-zoom-in" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 mt-1 px-1">{time}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-200">
                  <form onSubmit={sendMessage} className="flex items-end gap-2 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <button type="button" className="p-3 text-slate-400 hover:text-blue-500 transition-colors rounded-full hover:bg-white"><FaImage size={16}/></button>
                    <textarea 
                      name="message"
                      rows="1" 
                      placeholder="Type your reply..." 
                      className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 font-medium outline-none resize-none py-3 max-h-32"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                    />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-all">
                      <FaPaperPlane size={14} className="ml-0.5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              // Empty State (Desktop Only)
              <div className="hidden md:flex flex-col items-center justify-center h-full text-slate-300">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <BiSupport size={48} className="opacity-50"/>
                </div>
                <p className="text-sm font-black uppercase tracking-widest">Select a ticket to view details</p>
              </div>
            )}
          </div>

        </div>
      </main>

      {viewingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setViewingImage(null)}>
          <div className="max-w-4xl w-full">
            <img src={viewingImage} alt="Full view" className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
          </div>
          <button type="button" className="absolute top-6 right-6 text-white text-2xl" onClick={() => setViewingImage(null)}>
            <FaTimes />
          </button>
        </div>
      )}
    </div>
  );
};

export default HelpDeskPage;