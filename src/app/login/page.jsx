"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaShieldAlt, FaLock, FaUserShield, FaChevronRight, FaUserTie, FaWrench } from "react-icons/fa";
import { BiPulse } from "react-icons/bi";

const LoginPage = () => {
  // STATE FOR THE "SWAP" (Role Selection)
  // Options: 'STAFF' (Normal), 'ADMIN' (Administrator), 'TECH' (Technician)
  const [loginMode, setLoginMode] = useState('STAFF'); 
  
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();
    
    // DEMO LOGIC: Redirect based on the selected mode
    if (loginMode === 'ADMIN') {
      router.push('/dashboard'); // Admin also goes to dashboard but will see more buttons
    } else if (loginMode === 'TECH') {
      router.push('/admin/console'); // Goes to your Dev Console
    } else {
      router.push('/dashboard'); // Goes to Main Staff Dashboard
    }
  };

  // Dynamic Content based on Mode
  const getModeConfig = () => {
    switch(loginMode) {
      case 'ADMIN': return { 
        label: 'Administrator Access', 
        idPlaceholder: 'ADMIN KEY', 
        passPlaceholder: 'SECURITY PIN',
        color: 'text-purple-400',
        ring: 'focus:ring-purple-500/10',
        btn: 'bg-purple-600 hover:bg-purple-500',
        bg: 'bg-purple-600/20'
      };
      case 'TECH': return { 
        label: 'System Diagnostics', 
        idPlaceholder: 'DEV ACCESS KEY', 
        passPlaceholder: 'ROOT PASSWORD',
        color: 'text-amber-400',
        ring: 'focus:ring-amber-500/10',
        btn: 'bg-amber-600 hover:bg-amber-500',
        bg: 'bg-amber-600/20'
      };
      default: return { 
        label: 'Staff Authorization', 
        idPlaceholder: 'OPERATOR ID', 
        passPlaceholder: 'ACCESS CODE',
        color: 'text-blue-400',
        ring: 'focus:ring-blue-500/10',
        btn: 'bg-blue-600 hover:bg-blue-500',
        bg: 'bg-blue-600/20'
      };
    }
  };

  const config = getModeConfig();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] relative overflow-hidden">
      
      {/* ANIMATED BACKGROUND ELEMENTS */}
      <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-pulse transition-colors duration-1000 ${config.bg}`}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px]"></div>

      {/* GLASS CARD */}
      <div className="relative w-full max-w-[440px] px-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 shadow-2xl shadow-black/50 transition-all duration-500">
          
          {/* THE SWAP TOGGLER (Tabs) */}
          <div className="flex bg-black/20 p-1 rounded-xl mb-8 border border-white/5">
            <button 
              onClick={() => setLoginMode('STAFF')} 
              className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${loginMode === 'STAFF' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              Staff
            </button>
            <button 
              onClick={() => setLoginMode('ADMIN')} 
              className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${loginMode === 'ADMIN' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              Admin
            </button>
            <button 
              onClick={() => setLoginMode('TECH')} 
              className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${loginMode === 'TECH' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              Tech
            </button>
          </div>

          {/* LOGO AREA */}
          <div className="flex flex-col items-center mb-10">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] mb-4 transition-colors duration-500 ${loginMode === 'ADMIN' ? 'bg-purple-600' : loginMode === 'TECH' ? 'bg-amber-600' : 'bg-blue-600'}`}>
              <BiPulse className="text-white text-4xl animate-pulse" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              OC PULSE<span className={`${loginMode === 'ADMIN' ? 'text-purple-500' : loginMode === 'TECH' ? 'text-amber-500' : 'text-blue-500'} transition-colors duration-500`}>.</span>
            </h1>
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-2 transition-colors duration-500 ${config.color}`}>
              {config.label}
            </p>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              {/* Identity Input */}
              <div className="relative group">
                <div className={`absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors ${loginMode === 'ADMIN' ? 'group-focus-within:text-purple-400' : 'group-focus-within:text-blue-400'}`}>
                  {loginMode === 'ADMIN' ? <FaUserTie /> : loginMode === 'TECH' ? <FaWrench /> : <FaUserShield />}
                </div>
                <input 
                  type="text" 
                  placeholder={config.idPlaceholder}
                  className={`w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl text-[11px] font-black text-white tracking-widest outline-none focus:ring-4 transition-all uppercase placeholder:text-slate-600 ${config.ring} focus:border-white/20`}
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                />
              </div>

              {/* Password Input */}
              <div className="relative group">
                <div className={`absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors ${loginMode === 'ADMIN' ? 'group-focus-within:text-purple-400' : 'group-focus-within:text-blue-400'}`}>
                  <FaLock />
                </div>
                <input 
                  type="password" 
                  placeholder={config.passPlaceholder}
                  className={`w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl text-[11px] font-black text-white tracking-widest outline-none focus:ring-4 transition-all uppercase placeholder:text-slate-600 ${config.ring} focus:border-white/20`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              className={`w-full text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all active:scale-95 shadow-xl flex items-center justify-center space-x-3 group ${config.btn}`}
            >
              <span>Initialize Session</span>
              <FaChevronRight className="group-hover:translate-x-1 transition-transform" size={10} />
            </button>
          </form>

          {/* FOOTER INFO */}
          <div className="mt-10 flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2 opacity-30">
                <FaShieldAlt className="text-white" size={12}/>
                <span className="text-[8px] font-black text-white uppercase tracking-widest">End-to-End Encryption Active</span>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                Authorized Personnel Only · Duncan Court Hub
            </p>
          </div>
        </div>

        {/* EXTERNAL LINK */}
        <p className="text-center mt-8 text-[10px] text-slate-600 font-black uppercase tracking-widest">
            Problem accessing? <span className="text-white cursor-pointer hover:underline">Contact Principal</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;