"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { BiBuildings, BiSearch, BiFilterAlt, BiMenu } from "react-icons/bi";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';

const ApartmentsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Flats'); 
  const [searchQuery, setSearchQuery] = useState("");
  const [buildings, setBuildings] = useState([]);
  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);

  // Fix for Luan's Screen & Mobile: 
  // On mobile, start closed. On Desktop, start open.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsOpen(false);
      else setIsOpen(true);
    };
    // Set initial state based on current width
    handleResize(); 
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch buildings
        const buildingsSnapshot = await getDocs(collection(db, "buildings"));
        const buildingsData = buildingsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          type: doc.data().type || 'Flat',
          units: doc.data().units || []
        }));

        // Fetch owners
        const ownersSnapshot = await getDocs(collection(db, "owners"));
        const ownersData = ownersSnapshot.docs.map(doc => ({
          id: doc.id,
          linkedUnits: doc.data().linkedUnits || []
        }));

        // Fetch tenants
        const tenantsSnapshot = await getDocs(collection(db, "students"));
        const tenantsData = tenantsSnapshot.docs.map(doc => ({
          id: doc.id,
          linkedUnits: doc.data().linkedUnits || []
        }));

        // Calculate occupied for each building
        const allLinkedUnits = new Set();
        ownersData.forEach(owner => {
          owner.linkedUnits.forEach(unit => {
            allLinkedUnits.add(`${unit.building}-${unit.unit}`);
          });
        });
        tenantsData.forEach(tenant => {
          tenant.linkedUnits.forEach(unit => {
            allLinkedUnits.add(`${unit.building}-${unit.unit}`);
          });
        });

        const buildingsWithOccupied = buildingsData.map(building => {
          const occupied = building.units.filter(unit => allLinkedUnits.has(`${building.name}-${unit.number}`)).length;
          return { ...building, occupied };
        });

        setBuildings(buildingsWithOccupied);
        setOwners(ownersData);
        setTenants(tenantsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const currentData = buildings.filter(item => 
    item.type === (activeTab === 'Flats' ? 'Flat' : 'Commune')
  );

  const filteredData = currentData.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] relative">
      
      {/* SIDEBAR: 
         We pass isOpen. Make sure your Sidebar component handles 
         'fixed' positioning correctly for mobile.
      */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* MAIN CONTENT WRAPPER 
         1. md:ml-64 = Pushes content right ONLY on desktop. On mobile, ml-0 (full width).
         2. max-w-[2400px] = Luan's Fix. Prevents content stretching infinitely on ultrawide.
      */}
      <main 
        className={`
          transition-all duration-300 ease-in-out
          min-h-screen
          ${isOpen ? "md:ml-64" : "md:ml-20"} 
          ml-0 
          p-4 md:p-8 
          max-w-[2400px] 
        `}
      >
        
        {/* SLIM HEADER (Responsive) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          
          <div className="flex items-center gap-4">
            {/* MOBILE HAMBURGER (Visible only on mobile) */}
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="md:hidden bg-white p-2 rounded-lg shadow-sm text-slate-600 border border-slate-200"
            >
              <BiMenu size={24} />
            </button>

            <div>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                The Empire
              </h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-[0.3em] uppercase">
                Asset Inventory
              </p>
            </div>
          </div>

          {/* TABS (Scrollable on very small phones) */}
          <div className="w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="bg-slate-200 p-1 rounded-xl flex space-x-1 shadow-inner whitespace-nowrap w-fit">
              {['Flats', 'Communes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSearchQuery(""); 
                  }}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* COMPACT SEARCH */}
        <div className="flex space-x-3 mb-6 md:mb-8">
          <div className="flex-1 relative">
            <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-xs font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button className="bg-white border border-slate-200 px-4 rounded-xl text-slate-600 shadow-sm hover:bg-slate-50">
            <BiFilterAlt size={18} />
          </button>
        </div>

        {/* RESPONSIVE GRID 
           1. grid-cols-1 = Mobile phones (vertical stack)
           2. md:grid-cols-2 = Tablets
           3. lg:grid-cols-3 = Laptops
           4. xl:grid-cols-4 = Desktops
           5. 2xl:grid-cols-6 = Luan's Huge Screen (Uses more columns instead of stretching)
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
          {filteredData.map((item) => (
            <CompactPropertyCard 
              key={item.id} 
              name={item.name} 
              total={item.units.length} 
              occupied={item.occupied} 
              health={item.occupied === item.units.length ? 'Bad' : 'Good'} 
            />
          ))}
          
          {filteredData.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
                No {activeTab} found
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

/* COMPACT PROPERTY CARD */
const CompactPropertyCard = ({ name, total, occupied, health }) => {
  const percentage = Math.round((occupied / total) * 100);
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-blue-500/50 transition-all group cursor-pointer hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${health === 'Good' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500 animate-pulse'}`}>
          <BiBuildings size={18} />
        </div>
        <span className="text-[8px] font-black px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase">
            {percentage}%
        </span>
      </div>
      <h3 className="text-sm font-black text-slate-900 truncate mb-1" title={name}>
          {name}
      </h3>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-4">
          {occupied} / {total} Units
      </p>
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