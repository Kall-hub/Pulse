"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../Config/firebaseConfig'; 
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

import { FaShieldAlt, FaLock, FaUserShield, FaChevronRight, FaUserTie, FaCode } from "react-icons/fa";
import { BiPulse } from "react-icons/bi";

const LoginPage = () => {
  // MODES: 'STAFF', 'ADMIN', 'DEV'
  const [loginMode, setLoginMode] = useState('STAFF'); 
  
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({ email: '', password: '', role: 'STAFF' });

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. FIREBASE AUTH CHECK
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("Logged in as:", user.email); 

      // 1.1 Set session cookie (clears on browser close)
      try {
        document.cookie = "pulse_auth=1; path=/; SameSite=Lax";
      } catch (cookieErr) {
        console.warn("Cookie set failed:", cookieErr);
      }

      // 2. ROUTING BASED ON TAB
      if (loginMode === 'ADMIN') {
        router.push('/admin'); // Go to Admin Panel
      } else if (loginMode === 'DEV') {
        router.push('/dev-console'); // Go to Dev Console
      } else {
        router.push('/'); // Main App
      }

    } catch (err) {
      console.error(err);
      if(err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Access Denied: Incorrect Credentials.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Security Alert: Too many attempts. Try again later.");
      } else {
        setError("System Error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // UI CONFIGURATION
  const getModeConfig = () => {
    switch(loginMode) {
      case 'ADMIN': return { 
        label: 'Administrator Access', 
        idPlaceholder: 'ADMIN EMAIL', 
        color: 'text-purple-400',
        ring: 'focus:ring-purple-500/10',
        btn: 'bg-purple-600 hover:bg-purple-500',
        bg: 'bg-purple-600/20'
      };
      case 'DEV': return { 
        label: 'Developer Console', 
        idPlaceholder: 'DEV EMAIL', 
        color: 'text-amber-400',
        ring: 'focus:ring-amber-500/10',
        btn: 'bg-amber-600 hover:bg-amber-500',
        bg: 'bg-amber-600/20'
      };
      default: return { // STAFF
        label: 'Staff Portal', 
        idPlaceholder: 'STAFF EMAIL', 
        color: 'text-blue-400',
        ring: 'focus:ring-blue-500/10',
        btn: 'bg-blue-600 hover:bg-blue-500',
        bg: 'bg-blue-600/20'
      };
    }
  };

  const config = getModeConfig();

  // FETCH LOGIN ACCOUNTS FROM FIRESTORE
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const snap = await getDocs(collection(db, "loginAccounts"));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAccounts(data);
      } catch (err) {
        console.error("Error loading login accounts", err);
      }
    };
    fetchAccounts();
  }, []);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccount.email || !newAccount.password) return;
    try {
      const docRef = await addDoc(collection(db, "loginAccounts"), {
        email: newAccount.email,
        password: newAccount.password,
        role: newAccount.role,
        createdAt: new Date().toISOString()
      });
      setAccounts([{ id: docRef.id, ...newAccount }, ...accounts]);
      setNewAccount({ email: '', password: '', role: 'STAFF' });
    } catch (err) {
      console.error("Error adding account", err);
    }
  };

  const handleDeleteAccount = async (id) => {
    try {
      await deleteDoc(doc(db, "loginAccounts", id));
      setAccounts(accounts.filter(acc => acc.id !== id));
    } catch (err) {
      console.error("Error deleting account", err);
    }
  };

  return (
    <>
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] relative overflow-hidden">
      
      {/* ANIMATED BACKGROUND */}
      <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-pulse transition-colors duration-1000 ${config.bg}`}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px]"></div>

      {/* GLASS CARD */}
      <div className="relative w-full max-w-110 px-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 shadow-2xl shadow-black/50 transition-all duration-500">
          
          {/* THE SWAP TOGGLER */}
          <div className="flex bg-black/20 p-1 rounded-xl mb-8 border border-white/5">
            <button onClick={() => setLoginMode('STAFF')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${loginMode === 'STAFF' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Staff</button>
            <button onClick={() => setLoginMode('ADMIN')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${loginMode === 'ADMIN' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Admin</button>
            <button onClick={() => setLoginMode('DEV')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${loginMode === 'DEV' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Dev</button>
          </div>

          {/* LOGO AREA */}
          <div className="flex flex-col items-center mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] mb-4 transition-colors duration-500 ${loginMode === 'ADMIN' ? 'bg-purple-600' : loginMode === 'DEV' ? 'bg-amber-600' : 'bg-blue-600'}`}>
              <BiPulse className="text-white text-4xl animate-pulse" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              OC PULSE<span className={`${loginMode === 'ADMIN' ? 'text-purple-500' : loginMode === 'DEV' ? 'text-amber-500' : 'text-blue-500'} transition-colors duration-500`}>.</span>
            </h1>
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-2 transition-colors duration-500 ${config.color}`}>
              {config.label}
            </p>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* ERROR MESSAGE */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center animate-pulse">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{error}</p>
                </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <div className="relative group">
                <div className={`absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors ${loginMode === 'ADMIN' ? 'group-focus-within:text-purple-400' : 'group-focus-within:text-blue-400'}`}>
                  {loginMode === 'ADMIN' ? <FaUserTie /> : loginMode === 'DEV' ? <FaCode /> : <FaUserShield />}
                </div>
                <input 
                  type="email" 
                  placeholder={config.idPlaceholder}
                  className={`w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl text-[11px] font-black text-white tracking-widest outline-none focus:ring-4 transition-all uppercase placeholder:text-slate-600 ${config.ring} focus:border-white/20`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Input */}
              <div className="relative group">
                <div className={`absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors ${loginMode === 'ADMIN' ? 'group-focus-within:text-purple-400' : 'group-focus-within:text-blue-400'}`}>
                  <FaLock />
                </div>
                <input 
                  type="password" 
                  placeholder="PASSWORD"
                  className={`w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl text-[11px] font-black text-white tracking-widest outline-none focus:ring-4 transition-all uppercase placeholder:text-slate-600 ${config.ring} focus:border-white/20`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className={`w-full text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all active:scale-95 shadow-xl flex items-center justify-center space-x-3 group ${config.btn} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                    <span>Initialize Session</span>
                    <FaChevronRight className="group-hover:translate-x-1 transition-transform" size={10} />
                </>
              )}
            </button>
          </form>

          {/* FOOTER */}
          <div className="mt-10 flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2 opacity-30">
                <FaShieldAlt className="text-white" size={12}/>
                <span className="text-[8px] font-black text-white uppercase tracking-widest">End-to-End Encryption Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ACCOUNTS MANAGEMENT (Firestore) */}
    <div className="w-full max-w-4xl mx-auto mt-10 px-4 pb-16">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Database Accounts</p>
            <h2 className="text-2xl font-black">Stored Logins</h2>
            <p className="text-sm text-slate-400">Add or remove allowed login records (email / password / role).</p>
          </div>
          <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full md:w-auto">
            <input
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wide outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email"
              value={newAccount.email}
              onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
              required
            />
            <input
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wide outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
              value={newAccount.password}
              onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
              required
            />
            <select
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wide outline-none focus:ring-2 focus:ring-blue-500"
              value={newAccount.role}
              onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
            >
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
              <option value="DEV">Dev</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wide"
            >
              Add
            </button>
          </form>
        </div>

        <div className="grid gap-3">
          {accounts.length === 0 && (
            <div className="text-slate-400 text-sm">No stored accounts found.</div>
          )}
          {accounts.map(acc => (
            <div key={acc.id} className="flex flex-col md:flex-row md:items-center md:justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-black uppercase">{acc.email}</p>
                <p className="text-[10px] uppercase text-slate-400">Role: {acc.role || 'STAFF'}</p>
                <p className="text-[10px] text-slate-500">Password: {acc.password}</p>
              </div>
              <button
                onClick={() => handleDeleteAccount(acc.id)}
                className="mt-3 md:mt-0 text-[10px] font-black uppercase text-red-400 hover:text-red-200"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
};

export default LoginPage;