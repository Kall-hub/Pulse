"use client";
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';
import { FaCarAlt, FaCheck } from 'react-icons/fa';

const VehicleSelector = ({ selectedVehicle, onChange, className = "" }) => {
  const [vehicles, setVehicles] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesSnapshot = await getDocs(collection(db, 'fleet'));
        const vehiclesData = vehiclesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVehicles(vehiclesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // Filter available vehicles (not currently assigned or checked out)
  const availableVehicles = vehicles.filter(v => v.status === 'Available' || v.status === 'Parked');

  const handleSelect = (vehicle) => {
    onChange({
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      registration: vehicle.registration,
      checkoutTime: new Date().toISOString()
    });
    setIsOpen(false);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
        🚗 Assign Vehicle (Optional)
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl text-[10px] font-black uppercase outline-none hover:border-blue-500 transition-all flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <FaCarAlt size={12} />
            {selectedVehicle?.vehicleName || loading ? 'Loading...' : 'Click to Assign'}
          </span>
          {selectedVehicle && <FaCheck className="text-green-500" />}
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto">
            {availableVehicles.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-slate-400">
                No vehicles available
              </div>
            ) : (
              availableVehicles.map(vehicle => (
                <button
                  key={vehicle.id}
                  onClick={() => handleSelect(vehicle)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-900/50 transition-colors border-b border-slate-800 last:border-b-0 flex items-center gap-3"
                >
                  <FaCarAlt className="text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-white">{vehicle.name}</p>
                    <p className="text-[8px] text-slate-400">{vehicle.registration} • {vehicle.status}</p>
                  </div>
                  {selectedVehicle?.vehicleId === vehicle.id && (
                    <FaCheck className="ml-auto text-green-500" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedVehicle && (
        <p className="text-[8px] text-green-500 italic">✓ {selectedVehicle.vehicleName} assigned</p>
      )}
    </div>
  );
};

export default VehicleSelector;
