"use client";
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../Config/firebaseConfig';
import { FaTimes, FaCheck, FaCalendarAlt, FaClock, FaUserTie } from "react-icons/fa";
import ApartmentAutocomplete from './ApartmentAutocomplete';
import VehicleSelector from './VehicleSelector';

const InspectionPicker = ({ isOpen, onClose, onSubmit }) => {
  const [unitName, setUnitName] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [userData, setUserData] = useState({ firstName: 'Inspector', lastName: '' });
  
  // NEW FIELDS
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const inspectorName = `${userData.firstName} ${userData.lastName}`.trim() || 'Inspector';
  const [inspector, setInspector] = useState(inspectorName);

  // Fetch User Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "stuff", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const firstName = data.firstName || 'Inspector';
            const lastName = data.lastName || '';
            setUserData({ firstName, lastName });
            const fullName = `${firstName} ${lastName}`.trim();
            setInspector(fullName);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleBooking = () => {
    if (!unitName || selectedRooms.length === 0 || !date || !time) {
        alert("Please complete all scheduling details (Unit, Rooms, Date, Time).");
        return;
    }
    // Pass all data back INCLUDING vehicle
    onSubmit({
        unit: unitName,
        rooms: selectedRooms,
        date,
        time,
        inspector,
        vehicle: selectedVehicle
    });
    
    // Reset Form
    setUnitName('');
    setSelectedRooms([]);
    setDate('');
    setTime('');
    setInspector(inspectorName);
    setSelectedVehicle(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        
        {/* HEADER */}
        <div className="p-8 pb-4 flex justify-between items-start border-b border-slate-100">
             <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">New Mission</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Schedule Inspection</p>
             </div>
             <button onClick={onClose} className="bg-slate-100 p-3 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <FaTimes size={16}/>
             </button>
        </div>

        {/* BODY */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-8">
            
            {/* 1. UNIT INPUT WITH AUTOCOMPLETE */}
            <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Target Unit</p>
                <ApartmentAutocomplete 
                    value={unitName}
                    onChange={setUnitName}
                    placeholder="E.G. HILLCREST A612"
                    autoFocus={true}
                />
            </div>

            {/* 2. SCHEDULING GRID (NEW) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date */}
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1"><FaCalendarAlt/> Date</p>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 ring-blue-600" />
                </div>
                {/* Time */}
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1"><FaClock/> Time</p>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 ring-blue-600" />
                </div>
                {/* Inspector */}
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1"><FaUserTie/> Inspector</p>
                    <select value={inspector} onChange={e => setInspector(e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 ring-blue-600">
                        <option value={inspectorName}>{inspectorName}</option>
                        <option value="Rasta">Rasta</option>
                        <option value="Johannes">Johannes</option>
                        <option value="External">External Agent</option>
                    </select>
                </div>
            </div>

            {/* 3. ROOM SELECTOR */}
            <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Inspection Zones</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {["Kitchen", "Bathroom", "Bedroom 1", "Bedroom 2", "Lounge", "Balcony", "General"].map(r => (
                        <button key={r} onClick={() => setSelectedRooms(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
                            className={`p-4 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${selectedRooms.includes(r) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}>
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. VEHICLE ASSIGNMENT */}
            <VehicleSelector 
              selectedVehicle={selectedVehicle}
              onChange={setSelectedVehicle}
            />

            {/* 5. SUBMIT */}
            <button onClick={handleBooking} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest active:scale-95 shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2 hover:bg-blue-600 transition-all">
                <FaCheck /> Confirm Booking
            </button>
        </div>
      </div>
    </div>
  );
};

export default InspectionPicker;