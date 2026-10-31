'use client';
import { FaPlus, FaBars } from 'react-icons/fa';

export default function ViewingsHeader({ isOpen, setIsOpen, filter, setFilter, userRole, setIsBookModalOpen }) {
  return (
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
                   {['upcoming', 'requests', 'cancelled', 'history', 'analytics'].map(f => (
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
  );
}
