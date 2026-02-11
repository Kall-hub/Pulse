"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import SuccessToast from '../components/SuccessToast';
import { auth, db } from '../Config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { 
  FaSearch, FaKey, FaUnlock, FaLock, FaPause, FaPlay, FaPaperPlane, FaBell, FaCheckCircle, FaHome, FaSignOutAlt, FaBars
} from "react-icons/fa";

export default function TechSupportPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [notification, setNotification] = useState({ title: '', message: '', type: 'All Users' });
  const [successMessage, setSuccessMessage] = useState(null);
  const [userData, setUserData] = useState({ firstName: 'User', lastName: '', role: 'Staff' });
  
  const [users, setUsers] = useState([
    { id: 'EMP001', name: 'Regina Principal', username: 'Regina@principal', status: 'Active', locked: true },
    { id: 'EMP002', name: 'John Doe', username: 'John@doe', status: 'Active', locked: false },
    { id: 'EMP003', name: 'Jane Smith', username: 'Jane@smith', status: 'Paused', locked: false },
  ]);

  const [activityLog, setActivityLog] = useState([]);

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

  // Fetch User Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "stuff", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              firstName: data.firstName || 'User',
              lastName: data.lastName || '',
              role: data.role || 'Staff'
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    if(confirm("Close Technical Session?")) window.location.href = '/login';
  };

  const handleSearch = () => {
    const found = users.find(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.name.toLowerCase().includes(searchQuery.toLowerCase()));
    setSelectedUser(found || null);
    if(!found) alert("User not found.");
  };

  const handleResetPassword = () => {
    const newPass = Math.random().toString(36).slice(-8).toUpperCase();
    setSuccessMessage(`Password reset successful! New temp password: ${newPass}`);
    addToLog(`Reset password for ${selectedUser.username}`);
  };

  const handleToggleLock = () => {
    const newLockState = !selectedUser.locked;
    const updated = { ...selectedUser, locked: newLockState };
    updateUserInDb(updated);
    addToLog(`${newLockState ? 'Locked' : 'Unlocked'} account: ${selectedUser.username}`);
  };

  const handleTogglePause = () => {
    const newStatus = selectedUser.status === 'Active' ? 'Paused' : 'Active';
    const updated = { ...selectedUser, status: newStatus };
    updateUserInDb(updated);
    addToLog(`${newStatus === 'Paused' ? 'Paused' : 'Re-activated'} account: ${selectedUser.username}`);
  };

  const handleSendBroadcast = () => {
    if(!notification.title || !notification.message) return;
    setTimeout(() => {
      setSuccessMessage(`Broadcast sent to ${notification.type}`);
      addToLog(`Sent Broadcast: "${notification.title}"`);
      setNotification({ title: '', message: '', type: 'All Users' });
    }, 500);
  };

  const updateUserInDb = (updatedUser) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setSelectedUser(updatedUser);
  };

  const addToLog = (action) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActivityLog(prev => [{ time, action }, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#121212] font-sans text-gray-200 relative">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8 flex flex-col items-center`}>
        
        {/* HEADER */}
        <div className="w-full max-w-5xl mb-8 border-b border-[#333] pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4 w-full">
             {/* HAMBURGER MENU */}
             <button onClick={() => setIsOpen(!isOpen)} className="md:hidden bg-[#1E1E1E] p-3 rounded-xl border border-[#333] text-gray-400">
                <FaBars size={20} />
             </button>
             <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Technical Support</h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">User Management & System Broadcasts</p>
             </div>
          </div>
          
          {/* NAV BUTTONS */}
          <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-1 no-scrollbar">
              <Link href="/" className="bg-[#1E1E1E] border border-[#333] hover:bg-[#333] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap">
                 <FaHome /> Home
              </Link>
              <button onClick={handleLogout} className="bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 text-red-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap">
                 <FaSignOutAlt /> Exit
              </button>
              <div className="hidden md:flex bg-[#1E1E1E] px-3 py-2 rounded text-[10px] text-gray-400 border border-[#333] items-center whitespace-nowrap">
                 Admin: {userData.firstName} {userData.lastName}
              </div>
          </div>
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: USER MANAGEMENT */}
          <div className="flex flex-col gap-6">
            <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333]">
              <div className="flex gap-2">
                <input type="text" placeholder="Enter Name or Username..." className="flex-1 bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-bold text-sm uppercase">Search</button>
              </div>
            </div>

            {selectedUser ? (
              <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333] animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-start mb-6 border-b border-[#333] pb-4">
                  <div>
                    <h2 className="text-xl font-black text-white">{selectedUser.name}</h2>
                    <p className="text-xs text-blue-400 font-mono">{selectedUser.username}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${selectedUser.status === 'Active' ? 'bg-green-900/20 text-green-500 border-green-900' : 'bg-red-900/20 text-red-500 border-red-900'}`}>
                      {selectedUser.status}
                    </span>
                    {selectedUser.locked && <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-orange-900/20 text-orange-500 border border-orange-900">LOCKED</span>}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-[#121212] p-3 rounded-xl border border-[#333]">
                    <div><h4 className="text-sm font-bold text-gray-200">Reset Password</h4><p className="text-[10px] text-gray-500">Temp password gen</p></div>
                    <button onClick={handleResetPassword} className="bg-[#333] hover:bg-yellow-700 hover:text-white text-gray-300 px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-colors"><FaKey /> Reset</button>
                  </div>
                  <div className="flex justify-between items-center bg-[#121212] p-3 rounded-xl border border-[#333]">
                    <div><h4 className="text-sm font-bold text-gray-200">{selectedUser.locked ? "Unlock Account" : "Lock Account"}</h4><p className="text-[10px] text-gray-500">{selectedUser.locked ? "Clear flags" : "Prevent login"}</p></div>
                    <button onClick={handleToggleLock} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-colors w-24 justify-center ${selectedUser.locked ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-orange-900/50 text-orange-400 hover:bg-orange-600 hover:text-white'}`}>
                      {selectedUser.locked ? <><FaUnlock /> Unlock</> : <><FaLock /> Lock</>}
                    </button>
                  </div>
                  <div className="flex justify-between items-center bg-[#121212] p-3 rounded-xl border border-[#333]">
                    <div><h4 className="text-sm font-bold text-gray-200">{selectedUser.status === 'Active' ? 'Pause Account' : 'Activate'}</h4><p className="text-[10px] text-gray-500">Suspend access</p></div>
                    <button onClick={handleTogglePause} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-colors w-24 justify-center ${selectedUser.status === 'Active' ? 'bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white' : 'bg-blue-700 hover:bg-blue-600 text-white'}`}>
                      {selectedUser.status === 'Active' ? <><FaPause /> Pause</> : <><FaPlay /> Run</>}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333] border-dashed flex items-center justify-center text-gray-600 text-sm h-[200px]">Search for a user to manage</div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6">
            <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333]">
              <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2"><FaBell className="text-yellow-500"/> System Broadcast</h3>
              <div className="space-y-4">
                <select className="w-full bg-[#121212] border border-[#333] rounded-lg p-2 text-sm text-gray-300 outline-none" onChange={(e) => setNotification({...notification, type: e.target.value})}>
                    <option>All Users</option><option>Staff Only</option>
                </select>
                <input type="text" placeholder="Title / Subject" className="w-full bg-[#121212] border border-[#333] rounded-lg p-2 text-sm text-white outline-none" 
                    value={notification.title} onChange={(e) => setNotification({...notification, title: e.target.value})}/>
                <textarea rows={2} placeholder="Message..." className="w-full bg-[#121212] border border-[#333] rounded-lg p-2 text-sm text-white outline-none resize-none"
                    value={notification.message} onChange={(e) => setNotification({...notification, message: e.target.value})}/>
                <button onClick={handleSendBroadcast} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-xs font-black uppercase tracking-widest flex justify-center items-center gap-2"><FaPaperPlane /> Send Notification</button>
              </div>
            </div>

            <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333] flex-1 flex flex-col min-h-[250px]">
              <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2"><FaCheckCircle className="text-gray-500"/> Recent Actions</h3>
              <div className="space-y-2 h-48 overflow-y-auto pr-2 custom-scrollbar border-t border-[#333] pt-2">
                {activityLog.length === 0 && <p className="text-xs text-gray-600 italic mt-2">No actions performed.</p>}
                {activityLog.map((log, index) => (
                  <div key={index} className="flex gap-3 text-xs border-b border-[#2a2a2a] pb-2 last:border-0">
                    <span className="text-gray-500 font-mono flex-shrink-0">{log.time}</span><span className="text-gray-300">{log.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {successMessage && (
        <SuccessToast message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}
    </div>
  );
}