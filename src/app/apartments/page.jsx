"use client";
import { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { BiBuildings, BiSearch, BiFilterAlt } from "react-icons/bi";
import { communes } from '@/app/Data/comm_data';
import { flats } from '@/app/Data/flat_data'; // New Import

const ApartmentsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Flats'); // Default to Flats
  const [searchQuery, setSearchQuery] = useState("");

  // Select the correct data source
  const currentData = activeTab === 'Flats' ? flats : communes;

  // Unified Filter logic
  const filteredData = currentData.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "ml-60" : "ml-20"} p-8`}>
        
        {/* SLIM HEADER */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">The Empire</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.3em] uppercase">Asset Inventory</p>
          </div>

          <div className="bg-slate-200 p-1 rounded-xl flex space-x-1 shadow-inner scale-90">
            {['Flats', 'Communes'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchQuery(""); // Clear search when switching tabs
                }}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {/* COMPACT SEARCH */}
        <div className="flex space-x-3 mb-8">
          <div className="flex-1 relative">
            <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-xs font-bold shadow-sm focus:outline-none"
            />
          </div>
          <button className="bg-white border border-slate-200 px-4 rounded-xl text-slate-600 shadow-sm">
            <BiFilterAlt size={18} />
          </button>
        </div>

        {/* RESPONSIVE GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredData.map((item) => (
            <CompactPropertyCard 
              key={item.id} 
              name={item.name} 
              total={item.total} 
              occupied={item.occupied} 
              health={item.health} 
            />
          ))}
          
          {filteredData.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">No {activeTab} found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

/* COMPACT PROPERTY CARD (Remains same as your original) */
const CompactPropertyCard = ({ name, total, occupied, health }) => {
  const percentage = Math.round((occupied / total) * 100);
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-blue-500/50 transition-all group cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${health === 'Good' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500 animate-pulse'}`}>
          <BiBuildings size={18} />
        </div>
        <span className="text-[8px] font-black px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase">{percentage}%</span>
      </div>
      <h3 className="text-sm font-black text-slate-900 truncate mb-1">{name}</h3>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-4">{occupied} / {total} Units</p>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${health === 'Good' ? 'bg-blue-600' : 'bg-red-500'}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ApartmentsPage;