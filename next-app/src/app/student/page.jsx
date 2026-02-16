"use client";
import { useState, useEffect } from 'react';
import { db, storage } from '../Config/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  FaUserCircle, FaBell, FaTools, FaClipboardCheck, FaImage,
  FaPaperPlane, FaHome, FaKey, FaTicketAlt, FaChevronRight,
  FaArrowLeft, FaCheckCircle, FaClock,
  FaExclamationTriangle, FaTintSlash, FaBoxOpen, FaFileInvoiceDollar, FaTimes, FaWrench,
  FaHeadset
} from "react-icons/fa";

const StudentPortal = () => {
  const [view, setView] = useState('hub'); 
  const [activeNotification, setActiveNotification] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [viewingImage, setViewingImage] = useState(null);
  
  // USER INFO (In production, get from auth)
  const studentUnit = 'A612';
  const studentName = 'Kally Mashigo';

    // --- DATA ---

    // 1. NOTIFICATIONS (from Firebase)
    const [notifications, setNotifications] = useState([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // 2. REPAIRS - NOW FROM FIREBASE (Active maintenance jobs for this unit)
  const [maintenanceJobs, setMaintenanceJobs] = useState([]);
  
  // Load maintenance jobs for student's unit
  useEffect(() => {
    const q = query(
      collection(db, 'maintenance'),
      where('unit', '==', studentUnit)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const sorted = jobsData.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
        return bTime - aTime;
      });
      setMaintenanceJobs(sorted);
    });
    
    return () => unsubscribe();
  }, []);

  // Load notifications (building-wide or unit-specific)
  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs
        .map(docItem => ({ id: docItem.id, read: false, ...docItem.data() }))
        .filter(note => !note.unit || note.unit === studentUnit || note.audience === 'all');
      setNotifications(notes);
    });

    return () => unsubscribe();
  }, []);

  // Load helpdesk tickets for this unit
  useEffect(() => {
    const q = query(
      collection(db, 'supportTickets'),
      where('unit', '==', studentUnit),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
      }));
      setTickets(ticketsData);
    });

    return () => unsubscribe();
  }, []);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat || activeChat.id === 'new') {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'supportTickets', activeChat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
      }));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [activeChat]);

  // --- ACTIONS ---

  const handleBack = () => {
    if (activeNotification) {
        setActiveNotification(null);
        return;
    }
    if (view === 'helpdesk' && activeChat) {
        setActiveChat(null);
        return;
    }
    if (view === 'maintenance') setView('hub');
    else if (view === 'helpdesk') setView('hub');
    else if (view === 'notifications') setView('hub');
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
  
  const openChat = (ticket) => {
    setActiveChat(ticket);
    setView('helpdesk');
  };

  const startNewChat = () => {
    setActiveChat({ id: 'new', subject: 'New Message', status: 'Open' });
    setView('helpdesk');
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    const combined = [...pendingImages, ...newItems].slice(0, 5);
    if (pendingImages.length + newItems.length > 5) {
      alert('You can upload up to 5 images per message.');
      const overflow = [...pendingImages, ...newItems].slice(5);
      overflow.forEach((item) => URL.revokeObjectURL(item.preview));
    }
    setPendingImages(combined);
    e.target.value = '';
  };

  const removePendingImage = (index) => {
    setPendingImages((prev) => {
      const target = prev[index];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = e.target.message.value;
    if (!text.trim() && pendingImages.length === 0) return;

    try {
      const uploadImages = async (ticketId) => {
        if (pendingImages.length === 0) return [];
        return Promise.all(
          pendingImages.map(async (item, idx) => {
            const safeName = item.file.name.replace(/\s+/g, '_');
            const filePath = `supportTickets/${ticketId}/${Date.now()}_${idx}_${safeName}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, item.file);
            return getDownloadURL(storageRef);
          })
        );
      };

      if (!activeChat || activeChat.id === 'new') {
        const subjectBase = text.trim().slice(0, 40);
        const subject = subjectBase.length < text.trim().length ? `${subjectBase}...` : subjectBase;

        const ticketRef = await addDoc(collection(db, 'supportTickets'), {
          unit: studentUnit,
          tenant: studentName,
          subject: subject || 'New Request',
          status: 'Open',
          priority: 'Normal',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: text.trim() || 'Images attached'
        });

        const imageUrls = await uploadImages(ticketRef.id);

        await addDoc(collection(db, 'supportTickets', ticketRef.id, 'messages'), {
          text: text.trim(),
          sender: 'student',
          senderName: studentName,
          timestamp: serverTimestamp(),
          images: imageUrls
        });

        setActiveChat({ id: ticketRef.id, subject, status: 'Open', unit: studentUnit, tenant: studentName });
      } else {
        const imageUrls = await uploadImages(activeChat.id);

        await addDoc(collection(db, 'supportTickets', activeChat.id, 'messages'), {
          text: text.trim(),
          sender: 'student',
          senderName: studentName,
          timestamp: serverTimestamp(),
          images: imageUrls
        });

        await updateDoc(doc(db, 'supportTickets', activeChat.id), {
          updatedAt: serverTimestamp(),
          lastMessage: text.trim() || 'Images attached'
        });
      }

      e.target.reset();
      pendingImages.forEach((item) => URL.revokeObjectURL(item.preview));
      setPendingImages([]);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
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
              {view === 'hub'
                ? 'Student Hub'
                : view === 'notifications'
                  ? 'Notice Board'
                  : view === 'maintenance'
                    ? 'My Maintenance'
                    : 'Help Desk'}
            </h1>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em]">
              Duncan Court • {studentUnit}
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
              <GridCard icon={<FaTools />} label="Maintenance" value={maintenanceJobs.filter(j => j.status !== 'completed').length} sub={`Active Job${maintenanceJobs.filter(j => j.status !== 'completed').length !== 1 ? 's' : ''}`} statusColor={maintenanceJobs.filter(j => j.status !== 'completed').length > 0 ? "bg-orange-500" : "bg-green-500"} iconColor="text-orange-500" active={maintenanceJobs.filter(j => j.status !== 'completed').length > 0} />
              <GridCard icon={<FaKey />} label="Security" value="3/3" sub="Keys & Remotes" statusColor="bg-green-500" iconColor="text-yellow-500" />
              <GridCard icon={<FaTicketAlt />} label="Chats" value={tickets.length} sub="Help Desk" statusColor={tickets.length > 0 ? "bg-purple-500" : "bg-green-500"} iconColor="text-purple-500" />
            </div>

            {/* HEADLINE ALERT */}
            {notifications.length > 0 && (
              <div onClick={() => handleReadNotification(notifications[0])} className="w-full bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative group cursor-pointer active:scale-95 transition-transform">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 blur-[80px] rounded-full"></div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Latest Alert</h3>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                    <span className="text-[8px] font-black text-yellow-500 uppercase">Notice</span>
                  </div>
                </div>
                <div className="space-y-6 relative z-10">
                  <div className="flex items-start space-x-4">
                    <div className="mt-1 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-yellow-400 text-lg">
                      <FaTintSlash />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight italic">{notifications[0].title}</p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-medium line-clamp-2">
                        {notifications[0].msg}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setView('maintenance')} className="w-full bg-blue-600 rounded-[2.5rem] p-7 text-white flex justify-between items-center shadow-xl shadow-blue-200 active:scale-[0.97] transition-all">
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-white/10 rounded-[1.5rem] flex items-center justify-center border border-white/10"><FaWrench size={24} /></div>
                <div className="text-left">
                  <h3 className="text-base font-black uppercase italic tracking-tighter leading-none mb-1.5">My Maintenance</h3>
                  <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">
                    {maintenanceJobs.filter(j => j.status !== 'completed').length} Active Jobs
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center"><FaChevronRight size={12} /></div>
            </button>
            
            <button onClick={() => setView('helpdesk')} className="w-full bg-slate-900 rounded-[2.5rem] p-7 text-white flex justify-between items-center shadow-xl shadow-slate-200 active:scale-[0.97] transition-all">
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-white/10 rounded-[1.5rem] flex items-center justify-center border border-white/10"><FaHeadset size={28} /></div>
                <div className="text-left">
                  <h3 className="text-base font-black uppercase italic tracking-tighter leading-none mb-1.5">Help Desk</h3>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest opacity-80">Message Support</p>
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
                {notifications.map(note => {
                  const created = note.createdAt?.toDate?.();
                  const timeLabel = created ? created.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent';

                  return (
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
                              <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{timeLabel}</span>
                            </div>
                            <p className={`text-[10px] mt-1 font-medium leading-relaxed truncate ${note.read ? 'text-slate-400' : 'text-slate-600'}`}>{note.msg}</p>
                        </div>
                        {!note.read && <div className="w-2 h-2 bg-red-500 rounded-full self-center"></div>}
                    </button>
                      );
                      })}
            </div>
        )}

        {/* VIEW 3: MAINTENANCE - Active jobs for this unit */}
        {view === 'maintenance' && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="bg-blue-50 p-6 rounded-[2.5rem] text-center border border-blue-100">
                    <h2 className="text-2xl font-black text-blue-900 uppercase italic tracking-tighter">My Maintenance</h2>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Active jobs for {studentUnit}</p>
                </div>
                
                {maintenanceJobs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <FaWrench size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-bold uppercase tracking-widest">No active maintenance</p>
                    <p className="text-[10px] mt-2 text-slate-500">All clear for now!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                      {maintenanceJobs.map(job => {
                        const createdDate = job.createdAt?.toDate?.() ? job.createdAt.toDate().toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}) : 'Recent';
                        const tasks = job.tasks || [];
                        const completedTasks = tasks.filter(t => t.done).length;
                        const totalTasks = tasks.length;
                        
                        return (
                          <div key={job.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
                                          job.status === 'completed' ? 'bg-green-500' : 
                                          job.status === 'in-progress' ? 'bg-blue-500' : 
                                          'bg-orange-400'
                                      }`}>
                                          {job.status === 'completed' ? <FaCheckCircle /> : 
                                           job.status === 'in-progress' ? <FaTools /> : 
                                           <FaClock />}
                                      </div>
                                      <div>
                                          <h3 className="text-sm font-black text-slate-900 uppercase">{job.displayId || `JB${job.id.slice(-4)}`}</h3>
                                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logged: {createdDate}</p>
                                      </div>
                                  </div>
                                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                                      job.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                      job.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 
                                      'bg-orange-100 text-orange-700'
                                  }`}>
                                      {job.status === 'completed' ? 'Complete' : 
                                       job.status === 'in-progress' ? 'In Progress' : 
                                       'Pending'}
                                  </span>
                              </div>
                              
                              {/* Job Issue/Description */}
                              <div className="mb-3">
                                  <p className="text-xs font-bold text-slate-700">{job.issue || 'Maintenance Request'}</p>
                              </div>
                              
                              {/* Tasks Progress */}
                              {totalTasks > 0 && (
                                <div className="bg-slate-50 p-3 rounded-xl mb-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Progress</span>
                                    <span className="text-[10px] font-bold text-slate-600">{completedTasks}/{totalTasks} tasks</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all ${totalTasks === completedTasks ? 'bg-green-500' : 'bg-blue-500'}`}
                                      style={{width: `${(completedTasks / totalTasks) * 100}%`}}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Assigned Contractor */}
                              {job.assignedTo && (
                                  <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3 border border-blue-100">
                                      <FaUserCircle className="text-blue-500" size={20} />
                                      <div>
                                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Contractor</p>
                                          <p className="text-xs font-bold text-blue-700 uppercase">{job.assignedTo}</p>
                                      </div>
                                  </div>
                              )}
                          </div>
                        );
                      })}
                  </div>
                )}
                
                {/* Contact Support for New Issue */}
                <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 text-center">
                  <p className="text-xs font-bold text-slate-700 mb-3">Need to report a new issue?</p>
                  <button onClick={startNewChat} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mx-auto shadow-lg active:scale-95 transition-all">
                    <FaHeadset size={16} /> Message Support
                  </button>
                </div>
            </div>
        )}

        {/* VIEW 4: HELP DESK */}
        {view === 'helpdesk' && (
          <div className="flex flex-col h-[80vh] animate-in slide-in-from-right-4">
            {!activeChat ? (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Inbox</h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Your conversations</p>
                  </div>
                  <button onClick={startNewChat} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">
                    New Chat
                  </button>
                </div>

                {tickets.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                    <FaHeadset size={40} className="mb-4 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">No conversations yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto">
                    {tickets.map(ticket => {
                      const updated = ticket.updatedAt?.toDate?.();
                      const timeLabel = updated ? updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'New';

                      return (
                        <button key={ticket.id} onClick={() => openChat(ticket)} className="w-full bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${ticket.status === 'Resolved' ? 'bg-green-500' : 'bg-blue-500'}`}>
                              <FaHeadset size={20} />
                            </div>
                            <div className="text-left">
                              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{ticket.subject}</h3>
                              <p className="text-[10px] mt-1 truncate max-w-[160px] font-medium text-slate-400">{ticket.lastMessage || 'No messages yet'}</p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="text-[9px] font-bold text-slate-400">{timeLabel}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                              ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>{ticket.status || 'Open'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                      <FaArrowLeft />
                    </button>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{activeChat.subject || 'New Message'}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{studentUnit}</p>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                    activeChat.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{activeChat.status || 'Open'}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                      <FaPaperPlane size={40} className="mb-4 opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest">Start your conversation</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isStudent = msg.sender === 'student';
                      const time = msg.timestamp?.toDate?.() ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

                      return (
                        <div key={msg.id} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                            isStudent
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                          }`}>
                            {!isStudent && (
                              <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">{msg.senderName || 'Support'}</p>
                            )}
                            <p>{msg.text}</p>
                            {Array.isArray(msg.images) && msg.images.length > 0 && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {msg.images.slice(0, 5).map((url, idx) => (
                                  <button key={`${msg.id}-img-${idx}`} type="button" onClick={() => setViewingImage(url)} className="block">
                                    <img src={url} alt="attachment" className="w-full h-20 object-cover rounded-lg border border-white/20 cursor-zoom-in" />
                                  </button>
                                ))}
                              </div>
                            )}
                            <p className={`text-[8px] mt-1 text-right ${isStudent ? 'text-blue-200' : 'text-slate-400'}`}>{time}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {pendingImages.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {pendingImages.map((item, idx) => (
                      <div key={`${item.file.name}-${idx}`} className="relative">
                        <img src={item.preview} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                        <button type="button" onClick={() => removePendingImage(idx)} className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center">x</button>
                      </div>
                    ))}
                    <span className="text-[9px] font-bold text-slate-400 self-center">{pendingImages.length}/5</span>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="mt-auto bg-white p-2 rounded-[2rem] shadow-lg border border-slate-100 flex items-center gap-2">
                  <label className="p-3 text-slate-400 hover:text-blue-500 transition-colors rounded-full hover:bg-slate-100 cursor-pointer">
                    <FaImage size={16} />
                    <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                  </label>
                  <input
                    name="message"
                    autoFocus
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent px-4 py-3 text-sm font-medium outline-none text-slate-700 placeholder:text-slate-400"
                  />
                  <button type="submit" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-transform">
                    <FaPaperPlane size={14} className="ml-0.5" />
                  </button>
                </form>
              </div>
            )}
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                    {activeNotification.createdAt?.toDate?.()
                      ? activeNotification.createdAt.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'Recent'}
                </p>
                
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
      {view !== 'helpdesk' && !activeNotification && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent flex justify-center pointer-events-none z-10">
          <nav className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-white rounded-[2.5rem] p-3 flex justify-around items-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] pointer-events-auto">
              <NavIcon icon={<FaHome size={20} />} label="Hub" active={view === 'hub'} onClick={() => setView('hub')} />
              <NavIcon icon={<FaTools size={20} />} label="Maintenance" active={view === 'maintenance'} onClick={() => setView('maintenance')} />
              <NavIcon icon={<FaHeadset size={20} />} label="Chat" active={view === 'helpdesk'} onClick={() => setView('helpdesk')} />
              <NavIcon icon={<FaUserCircle size={20} />} label="Profile" />
          </nav>
        </div>
      )}

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