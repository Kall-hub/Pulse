"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link'; 
import { usePathname, useRouter } from 'next/navigation'; 
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../Config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { 
  BiChevronLeft, BiGridAlt, BiBuildings, BiWrench, 
  BiCheckShield, BiBrush, BiShow, BiHelpCircle,
  BiTask, BiBell, BiShield, BiTerminal, BiLogOut, BiX
} from "react-icons/bi";
import { FaFileInvoiceDollar, FaMoneyBill } from 'react-icons/fa6';
import { FaQuoteLeft } from 'react-icons/fa';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const pathname = usePathname();
  const router = useRouter(); 
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userData, setUserData] = useState({ firstName: 'User', role: 'Staff' });

  // 1. Detect Mobile Screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 1.5 Fetch User Data from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Try to fetch from 'stuff' collection first
          let userDoc = await getDoc(doc(db, "stuff", currentUser.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              firstName: data.firstName || 'User',
              lastName: data.lastName || '',
              role: data.role || 'Staff',
              email: currentUser.email
            });
          } else {
            // Try owners collection
            userDoc = await getDoc(doc(db, "owners", currentUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserData({
                firstName: data.firstName || 'User',
                lastName: data.lastName || '',
                role: 'Owner',
                email: currentUser.email
              });
            } else {
              // Try students collection
              userDoc = await getDoc(doc(db, "students", currentUser.uid));
              if (userDoc.exists()) {
                const data = userDoc.data();
                setUserData({
                  firstName: data.firstName || 'User',
                  lastName: data.lastName || '',
                  role: 'Student',
                  email: currentUser.email
                });
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2.1 Client-side auth guard to prevent back navigation showing protected pages
  useEffect(() => {
    try {
      const hasAuth = document.cookie.split('; ').some(c => c.startsWith('pulse_auth='));
      if (!hasAuth) {
        router.replace('/login');
      }
    } catch (e) {}
  }, [router]);

  // 2. Auto-close on Mobile when route changes
  useEffect(() => {
    if (isMobile) setIsOpen(false);
  }, [pathname, isMobile, setIsOpen]);

  // 3. Logout Function (Redirects to /login)
  const handleLogout = async () => {
    if(!confirm("Sign out of OC Pulse?")) return;
    try {
      await signOut(auth);
    } catch (e) {}
    // Clear session cookie
    try {
      document.cookie = 'pulse_auth=; Max-Age=0; path=/; SameSite=Lax';
    } catch (e) {}
    setShowProfileCard(false);
    router.push('/login');
  };

  return (
    <>
      {/* MOBILE BACKDROP */}
      {isMobile && isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm transition-opacity animate-in fade-in"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <nav 
        className={`
          fixed top-0 left-0 h-full z-50 bg-[#0F172A] text-white shadow-2xl flex flex-col border-r border-white/5 transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
          md:translate-x-0 
          ${isOpen ? "md:w-64" : "md:w-20"}
        `}
      >
        
        {/* DESKTOP TOGGLE BUTTON */}
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="hidden md:block absolute -right-3 top-20 bg-blue-600 rounded-full p-1 border-2 border-[#0F172A] text-white z-50 shadow-lg hover:scale-110 transition-transform"
        >
          <BiChevronLeft className={`transition-transform duration-500 ${!isOpen ? "rotate-180" : ""}`} size={18} />
        </button>

        {/* LOGO HEADER */}
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-2xl font-black tracking-tighter italic uppercase text-white">
            {(isOpen || isMobile) ? <>OC PULSE<span className="text-blue-500">.</span></> : <span className="text-blue-500">P.</span>}
          </h2>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-500 hover:text-white">
            <BiChevronLeft size={30} />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1 no-scrollbar">
           
           {/* MANAGEMENT */}
           {(isOpen || isMobile) && <p className="px-4 pt-4 pb-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Management</p>}
           <NavItem icon={<BiGridAlt size={20}/>} label="Overview" isOpen={isOpen || isMobile} href="/dashboard" active={pathname === '/dashboard'} />
           <NavItem icon={<BiBuildings size={20}/>} label="Apartments" isOpen={isOpen || isMobile} href="/apartments" active={pathname === '/apartments'} />
           <NavItem icon={<BiCheckShield size={20}/>} label="Inspections" isOpen={isOpen || isMobile} href="/inspections" active={pathname === '/inspections'} />
           <NavItem icon={<BiBrush size={20}/>} label="Cleanings" isOpen={isOpen || isMobile} href="/cleanings" active={pathname === '/cleanings'} />
           <NavItem icon={<BiShow size={20}/>} label="Viewings" isOpen={isOpen || isMobile} href="/viewings" active={pathname === '/viewings'} />

           {/* TECHNICAL */}
           {(isOpen || isMobile) && <p className="px-4 pt-6 pb-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Technical</p>}
           <NavItem icon={<BiWrench size={20}/>} label="Maintenance" isOpen={isOpen || isMobile} href="/maintenance" active={pathname === '/maintenance'} />

           {/* FINANCE */}
           {(isOpen || isMobile) && <p className="px-4 pt-6 pb-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Finance</p>}
           <NavItem icon={<FaQuoteLeft size={18}/>} label="Quotations" isOpen={isOpen || isMobile} href="/quotations" active={pathname === '/quotations'} />
           <NavItem icon={<FaFileInvoiceDollar size={18}/>} label="Invoicing" isOpen={isOpen || isMobile} href="/invoicing" active={pathname === '/invoicing'} />
           <NavItem icon={<FaMoneyBill size={20}/>} label="Clearance" isOpen={isOpen || isMobile} href="/clearance" active={pathname === '/clearance'} />

           {/* SYSTEM CONTROL */}
           {(['Admin', 'PRINCIPAL', 'TECHNICIAN'].includes(userData.role)) && (
            <>
               {(isOpen || isMobile) && <p className="px-4 pt-6 pb-2 text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">System Control</p>}
               <NavItem icon={<BiShield size={20}/>} label="Administration" isOpen={isOpen || isMobile} href="/admin" active={pathname === '/admin'} />
            </>
           )}

           {userData.role === 'TECHNICIAN' && (
             <NavItem icon={<BiTerminal size={20}/>} label="Dev Console" isOpen={isOpen || isMobile} href="dev-console" active={pathname === 'dev-console'} />
           )}

           <div className="pt-6">
            <NavItem icon={<BiBell size={20}/>} label="Notifications" isOpen={isOpen || isMobile} href="/notifications" active={pathname === '/notifications'} />
            <NavItem icon={<BiHelpCircle size={20}/>} label="Help Desk" isOpen={isOpen || isMobile} href="/helpdesk" active={pathname === '/helpdesk'} />
          </div>
        </div>

        {/* PROFILE FOOTER BUTTON */}
        <div 
          onClick={() => setShowProfileCard(true)}
          className="m-4 p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-white/5 cursor-pointer transition-all active:scale-95"
        >
          <div className={`flex items-center ${(isOpen || isMobile) ? "space-x-3" : "justify-center"}`}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-lg">
                {userData.firstName[0]}{userData.lastName ? userData.lastName[0] : ''}
            </div>
            {(isOpen || isMobile) && (
              <div className="animate-fadeIn">
                <p className="text-[11px] font-black text-white uppercase italic leading-none">{userData.firstName} {userData.lastName}</p>
                <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter mt-1 italic">{userData.role}</p>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* --- SIMPLIFIED PROFILE MODAL --- */}
      {showProfileCard && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowProfileCard(false)}>
           <div 
             className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl animate-in zoom-in-95"
             onClick={(e) => e.stopPropagation()} 
           >
              {/* Close Icon */}
              <button onClick={() => setShowProfileCard(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors">
                <BiX size={24} />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                  {/* Big Avatar */}
                  <div className="w-24 h-24 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-4xl font-black shadow-xl shadow-blue-200 mb-6">
                    {userData.firstName[0]}{userData.lastName ? userData.lastName[0] : ''}
                  </div>

                  {/* Identity */}
                  <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">{userData.firstName} {userData.lastName}</h2>
                  <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                    {userData.role}
                  </span>
                  
                  {/* Logout Button */}
                  <button 
                    onClick={handleLogout}
                    className="w-full py-4 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm hover:shadow-red-200"
                  >
                    <BiLogOut size={18} />
                    <span>Sign Out</span>
                  </button>
              </div>
           </div>
         </div>
      )}
    </>
  );
};

const NavItem = ({ icon, label, isOpen, href, active }) => (
  <Link href={href} className="block w-full">
    <div className={`flex items-center rounded-xl transition-all duration-200 ${isOpen ? "px-4 py-3 space-x-4" : "p-3 justify-center"} ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <span className={`${active ? "text-white" : "group-hover:text-blue-400"}`}>{icon}</span>
      {isOpen && <span className="text-[11px] font-black uppercase tracking-wide">{label}</span>}
    </div>
  </Link>
);

export default Sidebar;