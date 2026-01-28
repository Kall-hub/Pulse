"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import { 
  FaUserShield, FaBuilding, FaTrash, FaPlus, FaTimes, 
  FaBolt, FaTint, FaLink, FaHome, FaSignOutAlt, FaBars, FaCar
} from "react-icons/fa";
import { BiRadar, BiPulse } from "react-icons/bi";

// Firebase imports
import { db } from '../Config/firebaseConfig'; 
import { doc, setDoc, serverTimestamp, getDocs, collection, addDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signOut, deleteUser } from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD0ipZd4Cpf1T9kc69PXSq89rcFonmksCc",
  authDomain: "ocpulse-9e668.firebaseapp.com",
  projectId: "ocpulse-9e668",
  storageBucket: "ocpulse-9e668.firebasestorage.app",
  messagingSenderId: "1030631401344",
  appId: "1:1030631401344:web:a0c7b4130538b7d0b50365"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Secondary app setup for user creation
const secondaryApp = getApps().find(app => app.name === "UserCreator") || initializeApp(firebaseConfig, "UserCreator");
const secondaryAuth = getAuth(secondaryApp);

/* --- 1. PERSON FORM (Data Entry) --- */
const PersonForm = ({ type, availableBuildings, onAdd, onClose, takenUnits }) => {
  const [form, setForm] = useState({ name: '', surname: '', id: '', role: '', email: '' });
  const [linkedUnits, setLinkedUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const removeLink = (id) => {
    setLinkedUnits(linkedUnits.filter(l => l.id !== id));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.surname || !form.id) return;
    if ((type === 'Users' || type === 'Owners' || type === 'Tenants') && !form.email) return;

    setIsLoading(true);

    if (type === 'Users') {
      // Create Firebase user for Users/Students
      try {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          form.email, 
          form.id
        );
        const user = userCredential.user;

        // Save to Firestore under "stuff" collection
        await setDoc(doc(db, "stuff", user.uid), {
          firstName: form.name,
          lastName: form.surname,
          email: form.email,
          idNumber: form.id,
          password: form.id, // Saved for Admin reference
          role: form.role || 'student', 
          firebaseId: user.uid,
          deletionStatus: null,
          createdAt: serverTimestamp(),
          status: 'active'
        });

        onAdd({ ...form, username: form.email, password: form.id, linkedUnits, firebaseId: user.uid });
        setIsLoading(false);
        onClose();
      } catch (error) {
        console.error("Error creating user:", error);
        alert("Error creating user: " + error.message);
        setIsLoading(false);
        return;
      }
    } else if (type === 'Owners') {
      // Create Firebase user for Owners
      try {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          form.email, 
          form.id
        );
        const user = userCredential.user;

        // Save to Firestore under "owners" collection
        await setDoc(doc(db, "owners", user.uid), {
          firstName: form.name,
          lastName: form.surname,
          email: form.email,
          idNumber: form.id,
          password: form.id, // Saved for Admin reference
          role: 'owner',
          linkedUnits: linkedUnits, // Store the linked properties/units
          firebaseId: user.uid,
          deletionStatus: null,
          createdAt: serverTimestamp(),
          status: 'active'
        });

        onAdd({ ...form, username: form.email, password: form.id, linkedUnits, firebaseId: user.uid });
        setIsLoading(false);
        onClose();
      } catch (error) {
        console.error("Error creating owner:", error);
        alert("Error creating owner: " + error.message);
        setIsLoading(false);
        return;
      }
    } else if (type === 'Tenants') {
      // Create Firebase user for Tenants/Students
      try {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          form.email, 
          form.id
        );
        const user = userCredential.user;

        // Save to Firestore under "students" collection
        await setDoc(doc(db, "students", user.uid), {
          firstName: form.name,
          lastName: form.surname,
          email: form.email,
          idNumber: form.id,
          password: form.id, // Saved for Admin reference
          role: 'student',
          linkedUnits: linkedUnits, // Store the linked unit
          firebaseId: user.uid,
          deletionStatus: null,
          createdAt: serverTimestamp(),
          status: 'active'
        });

        onAdd({ ...form, username: form.email, password: form.id, linkedUnits, firebaseId: user.uid });
        setIsLoading(false);
        onClose();
      } catch (error) {
        console.error("Error creating student:", error);
        alert("Error creating student: " + error.message);
        setIsLoading(false);
        return;
      }
    } else {
      const username = `${form.name.trim()}@${form.surname.trim().toLowerCase()}`;
      onAdd({ ...form, username, password: form.id, linkedUnits });
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <div className="bg-[#252525] p-6 rounded-2xl border border-[#333] mb-6 animate-in fade-in slide-in-from-top-4">
      <div className="flex justify-between mb-4">
        <h3 className="text-white font-bold uppercase tracking-widest text-sm">Register New {type.slice(0, -1)}</h3>
        <button onClick={onClose}><FaTimes className="text-gray-500 hover:text-white"/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="space-y-1">
            <label className="text-[9px] text-gray-500 uppercase font-bold">First Name</label>
            <input className="w-full bg-[#121212] border border-[#333] rounded p-2 text-xs text-white outline-none focus:border-blue-500"
            onChange={e => setForm({...form, name: e.target.value})} />
        </div>
        <div className="space-y-1">
            <label className="text-[9px] text-gray-500 uppercase font-bold">Surname</label>
            <input className="w-full bg-[#121212] border border-[#333] rounded p-2 text-xs text-white outline-none focus:border-blue-500"
            onChange={e => setForm({...form, surname: e.target.value})} />
        </div>
        <div className="space-y-1">
            <label className="text-[9px] text-gray-500 uppercase font-bold">ID Number</label>
            <input className="w-full bg-[#121212] border border-[#333] rounded p-2 text-xs text-white outline-none focus:border-blue-500"
            onChange={e => setForm({...form, id: e.target.value})} />
        </div>
      </div>

      {type === 'Users' && (
        <div className="mb-4">
            <label className="text-[9px] text-gray-500 uppercase font-bold">Email Address</label>
            <input type="email" className="w-full bg-[#121212] border border-[#333] rounded p-2 text-xs text-white outline-none focus:border-blue-500"
            onChange={e => setForm({...form, email: e.target.value})} />
        </div>
      )}

      {type === 'Tenants' && (
        <div className="mb-4">
            <label className="text-[9px] text-gray-500 uppercase font-bold">Email Address</label>
            <input type="email" className="w-full bg-[#121212] border border-[#333] rounded p-2 text-xs text-white outline-none focus:border-blue-500"
            onChange={e => setForm({...form, email: e.target.value})} />
        </div>
      )}

      {type === 'Owners' && (
        <div className="mb-4">
            <label className="text-[9px] text-gray-500 uppercase font-bold">Email Address</label>
            <input type="email" className="w-full bg-[#121212] border border-[#333] rounded p-2 text-xs text-white outline-none focus:border-blue-500"
            onChange={e => setForm({...form, email: e.target.value})} />
        </div>
      )}

      {type === 'Users' && (
        <div className="mb-4">
             <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">System Role</label>
             <select className="w-full bg-[#121212] border border-[#333] rounded p-2 text-xs text-gray-300 outline-none focus:border-blue-500"
              onChange={e => setForm({...form, role: e.target.value})}>
                <option value="">Select Authority Level...</option>
                <option value="Admin">Admin</option>
                <option value="PQA">PQA</option>
                <option value="Agent">Agent</option>
                <option value="Contractor">Contractor</option>
                <option value="Cleaner">Cleaner</option>
                <option value="Finance">Finance</option>
                <option value="MaintAdmin">Maintenance Admin</option>
                <option value="Principal">Principal</option>
            </select>
        </div>
      )}

      {(type === 'Owners' || type === 'Tenants') && (
        <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#333] mb-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 flex items-center gap-2"><FaLink /> Link Portfolio Units</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {linkedUnits.map(l => (
              <span key={l.id} className="bg-blue-900/20 text-blue-400 border border-blue-900/50 px-2 py-1 rounded text-[10px] flex items-center gap-2">
                {l.building} • {l.unit} <button onClick={() => removeLink(l.id)} className="hover:text-white">×</button>
              </span>
            ))}
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {availableBuildings.map(building => (
              <div key={building.id} className="bg-[#121212] p-3 rounded border border-[#333]">
                <h4 className="text-white text-sm font-bold mb-2">{building.name}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {building.units.map(unit => {
                    const isLinked = linkedUnits.some(l => l.building === building.name && l.unit === unit.number);
                    const isTaken = type === 'Owners' && takenUnits.has(`${building.name}-${unit.number}`);
                    const canSelect = !isTaken || isLinked;
                    return (
                      <button
                        key={unit.id}
                        disabled={!canSelect}
                        onClick={() => {
                          if (!canSelect) return;
                          if (type === 'Tenants') {
                            // For tenants, only one unit
                            if (isLinked) {
                              setLinkedUnits([]);
                            } else {
                              setLinkedUnits([{ building: building.name, unit: unit.number, id: Date.now() }]);
                            }
                          } else {
                            // For owners, multiple
                            if (isLinked) {
                              removeLink(linkedUnits.find(l => l.building === building.name && l.unit === unit.number).id);
                            } else {
                              setLinkedUnits([...linkedUnits, { building: building.name, unit: unit.number, id: Date.now() }]);
                            }
                          }
                        }}
                        className={`text-[10px] px-2 py-1 rounded border transition-all ${
                          isLinked ? 'bg-blue-600 text-white border-blue-500' : 
                          isTaken ? 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed' : 
                          'bg-[#222] text-gray-300 border-[#444] hover:bg-[#333]'
                        }`}
                      >
                        {unit.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button onClick={handleSubmit} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
        {isLoading ? <BiRadar className="animate-spin" size={16} /> : null} Save Data
      </button>
    </div>
  );
};

/* --- 2. PROPERTY CARD --- */
const PropertyCard = ({ property, onAddUnit, onDeleteUnit }) => {
  const [inputs, setInputs] = useState({ number: '', electricity: 'Yes', water: 'Yes' });

  const handleSubmit = () => {
    if(!inputs.number) return;
    onAddUnit(property.id, inputs);
    setInputs({ number: '', electricity: 'Yes', water: 'Yes' }); 
  };

  return (
    <div className="bg-[#252525] p-6 rounded-2xl border border-[#333] hover:border-[#444] transition-all">
       <div className="flex justify-between items-start mb-6 border-b border-[#333] pb-4">
          <div>
             <h4 className="text-xl font-black text-white">{property.name}</h4>
             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Configured Units: {property.units.length}</p>
          </div>
          <FaBuilding className="text-gray-600" />
       </div>
       <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {property.units.length === 0 ? (
              <p className="text-[10px] text-red-400 font-bold uppercase text-center py-4 bg-[#331111] rounded-lg border border-red-900/30">Empty Building (Pending Deletion)</p>
          ) : property.units.map((unit) => (
              <div key={unit.id} className="flex flex-col p-3 bg-[#1a1a1a] rounded-xl border border-[#333] group hover:border-blue-500/30 transition-all">
                 <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                       <h5 className="text-sm font-black text-gray-200">{unit.number}</h5>
                    </div>
                    <button onClick={() => onDeleteUnit(property.id, unit.id, unit.number)} className="text-gray-600 hover:text-red-500 transition-colors"><FaTrash size={10} /></button>
                 </div>
                 <div className="flex gap-3 text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><FaBolt className={unit.electricity === 'Yes' ? 'text-yellow-500' : 'text-gray-700'} /> Elec: <span className="text-gray-300">{unit.electricity}</span></span>
                    <span className="flex items-center gap-1"><FaTint className={unit.water === 'Yes' ? 'text-blue-500' : 'text-gray-700'} /> Water: <span className="text-gray-300">{unit.water}</span></span>
                 </div>
              </div>
          ))}
       </div>
       <div className="pt-2 border-t border-[#333] flex flex-col gap-2">
           <div className="flex gap-2">
              <input type="text" placeholder="Unit (A245)" className="flex-1 bg-[#121212] border border-[#333] rounded px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                  value={inputs.number} onChange={e => setInputs({...inputs, number: e.target.value})} />
              <button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 font-black text-[10px] uppercase transition-colors">SAVE</button>
           </div>
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <select className="flex-1 bg-[#121212] border border-[#333] rounded px-2 py-1 text-[10px] text-gray-400 outline-none"
                  value={inputs.electricity} onChange={e => setInputs({...inputs, electricity: e.target.value})}>
                  <option value="Yes">Prepaid Elec: Yes</option>
                  <option value="No">Prepaid Elec: No</option>
              </select>
              <select className="flex-1 bg-[#121212] border border-[#333] rounded px-2 py-1 text-[10px] text-gray-400 outline-none"
                  value={inputs.water} onChange={e => setInputs({...inputs, water: e.target.value})}>
                  <option value="Yes">Prepaid Water: Yes</option>
                  <option value="No">Prepaid Water: No</option>
              </select>
           </div>
       </div>
    </div>
  );
};

/* --- 3. MAIN PAGE --- */
export default function AdminEnginePage() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Users'); 
  const [showAddForm, setShowAddForm] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // DATA
  const [users, setUsers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [cars, setCars] = useState([]);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingType, setNewBuildingType] = useState('Flat');
  const [newCarName, setNewCarName] = useState('');
  const [takenUnits, setTakenUnits] = useState(new Set()); // For owners' taken units

  const fetchData = async () => {
    try {
      // Fetch users (staff)
      const usersSnapshot = await getDocs(collection(db, "stuff"));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        name: doc.data().firstName || doc.data().email,
        surname: doc.data().lastName || '',
        username: doc.data().email,
        password: doc.data().idNumber,
        linkedUnits: [], // Assuming no linked units for staff
        status: 'Active',
        firebaseId: doc.data().firebaseId,
        deletionStatus: doc.data().deletionStatus || null
      }));
      setUsers(usersData);

      // Fetch owners
      const ownersSnapshot = await getDocs(collection(db, "owners"));
      const ownersData = ownersSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().firstName,
        surname: doc.data().lastName,
        email: doc.data().email,
        id: doc.data().idNumber,
        username: doc.data().email,
        password: doc.data().idNumber,
        linkedUnits: doc.data().linkedUnits || [],
        status: 'Active',
        firebaseId: doc.data().firebaseId,
        deletionStatus: doc.data().deletionStatus || null
      }));
      setOwners(ownersData);

      // Fetch tenants (students)
      const tenantsSnapshot = await getDocs(collection(db, "students"));
      const tenantsData = tenantsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().firstName,
        surname: doc.data().lastName,
        email: doc.data().email,
        id: doc.data().idNumber,
        username: doc.data().email,
        password: doc.data().idNumber,
        linkedUnits: doc.data().linkedUnits || [],
        status: 'Active',
        firebaseId: doc.data().firebaseId,
        deletionStatus: doc.data().deletionStatus || null
      }));
      setTenants(tenantsData);

      // Collect taken units for owners
      const taken = new Set();
      ownersData.forEach(owner => {
        owner.linkedUnits.forEach(unit => {
          taken.add(`${unit.building}-${unit.unit}`);
        });
      });
      setTakenUnits(taken);

      // Fetch buildings
      const buildingsSnapshot = await getDocs(collection(db, "buildings"));
      const buildingsData = buildingsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        type: doc.data().type || 'Flat',
        units: doc.data().units || []
      }));
      setProperties(buildingsData);

      // Fetch cars
      const carsSnapshot = await getDocs(collection(db, "cars"));
      const carsData = carsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCars(carsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Auth check
  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, "stuff", currentUser.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          if (role === 'Admin') {
            setUser(currentUser);
            setUserRole(role);
            // Fetch data after auth
            await fetchData();
          } else {
            alert("Access denied. Admin role required.");
            window.location.href = '/login';
          }
        } else {
          alert("User not found.");
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Inactivity logout
  useEffect(() => {
    let timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        signOut(auth);
        window.location.href = '/login';
      }, 10 * 60 * 1000); // 10 min
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimeout));

    resetTimeout();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => document.removeEventListener(event, resetTimeout));
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617] backdrop-blur-sm">
        {/* The Pulsing Core */}
        <div className="relative w-28 h-28 mb-8">
          {/* Outer Glow Effect */}
          <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-xl opacity-40 animate-pulse"></div>

          {/* Inner Box */}
          <div className="relative w-full h-full bg-[#0F172A] border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden">
            {/* Scanning Line Animation */}
            <div className="absolute top-0 w-full h-full bg-gradient-to-b from-transparent via-blue-500/10 to-transparent animate-scan"></div>

            <BiPulse size={48} className="text-blue-500 animate-pulse" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Loading Pulse Admin</h2>
          <p className="text-sm text-gray-400">Authenticating and fetching data...</p>
        </div>
      </div>
    );
  }

  if (!user || userRole !== 'Admin') {
    return null;
  }

  const handleLogout = () => { if(confirm("Exit Admin Engine?")) window.location.href = '/login'; };
  const handleAddPerson = (data) => {
    const newPerson = { ...data, id: Date.now(), status: 'Active' };
    if (activeTab === 'Users') setUsers([...users, newPerson]);
    if (activeTab === 'Owners') {
      setOwners([...owners, newPerson]);
      // Update taken units
      const newTaken = new Set(takenUnits);
      data.linkedUnits.forEach(unit => {
        newTaken.add(`${unit.building}-${unit.unit}`);
      });
      setTakenUnits(newTaken);
    }
    if (activeTab === 'Tenants') setTenants([...tenants, newPerson]);
  };
  const handleDeletePerson = async (type, person) => {
    if (person.deletionStatus === 'approved') {
      // Final delete
      if (!confirm(`Permanently delete ${person.name} ${person.surname}? This cannot be undone.`)) return;
      try {
        let collectionName;
        if (type === 'Users') collectionName = 'stuff';
        else if (type === 'Owners') collectionName = 'owners';
        else if (type === 'Tenants') collectionName = 'students';
        await deleteDoc(doc(db, collectionName, person.id));
        
        // Delete from Auth if exists
        if (person.firebaseId) {
          await deleteUser(secondaryAuth, person.firebaseId);
        }
        
        // Update state
        if (type === 'Users') setUsers(users.filter(u => u.id !== person.id));
        if (type === 'Owners') {
          setOwners(owners.filter(u => u.id !== person.id));
          // Update taken units
          const newTaken = new Set(takenUnits);
          person.linkedUnits.forEach(unit => {
            newTaken.delete(`${unit.building}-${unit.unit}`);
          });
          setTakenUnits(newTaken);
        }
        if (type === 'Tenants') setTenants(tenants.filter(u => u.id !== person.id));
        
        alert(`🔔 DELETION: ${person.name} ${person.surname} has been permanently removed.`);
      } catch (error) {
        console.error("Error deleting person:", error);
        alert("Error deleting person: " + error.message);
      }
    } else {
      // Request deletion
      if (!confirm(`Request deletion for ${person.name} ${person.surname}? This will notify the Principal for approval.`)) return;
      try {
        let collectionName;
        if (type === 'Users') collectionName = 'stuff';
        else if (type === 'Owners') collectionName = 'owners';
        else if (type === 'Tenants') collectionName = 'students';
        await updateDoc(doc(db, collectionName, person.id), { deletionStatus: 'pending' });
        
        // Update state
        const updateState = (setter) => setter(prev => prev.map(p => p.id === person.id ? { ...p, deletionStatus: 'pending' } : p));
        if (type === 'Users') updateState(setUsers);
        if (type === 'Owners') updateState(setOwners);
        if (type === 'Tenants') updateState(setTenants);
        
        alert(`🔔 DELETION REQUEST: Sent to Principal for ${person.name} ${person.surname}`);
      } catch (error) {
        console.error("Error requesting deletion:", error);
        alert("Error requesting deletion: " + error.message);
      }
    }
  };
  const handleAddBuilding = async () => {
    if(!newBuildingName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, "buildings"), {
        name: newBuildingName,
        type: newBuildingType,
        units: []
      });
      setProperties([...properties, { id: docRef.id, name: newBuildingName, type: newBuildingType, units: [] }]);
      setNewBuildingName('');
    } catch (error) {
      console.error("Error adding building:", error);
    }
  };
  const handleAddCar = async () => {
    if(!newCarName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, "cars"), {
        name: newCarName,
        status: 'Available'
      });
      setCars([...cars, { id: docRef.id, name: newCarName, status: 'Available' }]);
      setNewCarName('');
    } catch (error) {
      console.error("Error adding car:", error);
    }
  };
  const handleAddUnit = async (buildingId, unitData) => {
    try {
      const buildingRef = doc(db, "buildings", buildingId);
      const building = properties.find(p => p.id === buildingId);
      const newUnits = [...building.units, { id: Date.now().toString(), ...unitData }];
      await updateDoc(buildingRef, { units: newUnits });
      setProperties(props => props.map(p => p.id === buildingId ? { ...p, units: newUnits } : p));
    } catch (error) {
      console.error("Error adding unit:", error);
    }
  };
  const handleDeleteUnit = async (buildingId, unitId, unitNumber) => {
    if (!confirm(`Delete unit ${unitNumber}? This will free it for assignment.`)) return;
    try {
      const buildingRef = doc(db, "buildings", buildingId);
      const building = properties.find(p => p.id === buildingId);
      const newUnits = building.units.filter(u => u.id !== unitId);
      await updateDoc(buildingRef, { units: newUnits });
      setProperties(props => props.map(p => p.id === buildingId ? { ...p, units: newUnits } : p));
      alert(`Unit ${unitNumber} deleted.`);
    } catch (error) {
      console.error("Error deleting unit:", error);
      alert("Error deleting unit: " + error.message);
    }
  };
  const handleApproveDeletion = async (type, person) => {
    try {
      let collectionName;
      if (type === 'Users') collectionName = 'stuff';
      else if (type === 'Owners') collectionName = 'owners';
      else if (type === 'Tenants') collectionName = 'students';
      await updateDoc(doc(db, collectionName, person.id), { deletionStatus: 'approved' });
      
      // Update state
      const updateState = (setter) => setter(prev => prev.map(p => p.id === person.id ? { ...p, deletionStatus: 'approved' } : p));
      if (type === 'Users') updateState(setUsers);
      if (type === 'Owners') updateState(setOwners);
      if (type === 'Tenants') updateState(setTenants);
      
      alert(`Deletion approved for ${person.name} ${person.surname}.`);
    } catch (error) {
      console.error("Error approving deletion:", error);
      alert("Error approving deletion: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] font-sans text-gray-200 relative">
        <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
        <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>

        <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8 max-w-7xl mx-auto`}>
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* MOBILE HAMBURGER */}
                    <button onClick={() => setIsOpen(!isOpen)} className="md:hidden bg-[#1E1E1E] p-3 rounded-xl border border-[#333] text-gray-400">
                        <FaBars size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic flex items-center gap-3">
                            <BiRadar className="text-blue-500 animate-spin-slow" /> Engine Room
                        </h1>
                        <p className="text-[10px] text-gray-500 font-black tracking-[0.3em] uppercase mt-2">
                            Master Data Configuration
                        </p>
                    </div>
                </div>
                
                {/* NAVIGATION BUTTONS */}
                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-1 no-scrollbar">
                    <Link href="/" className="bg-[#1E1E1E] border border-[#333] hover:bg-[#333] text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap">
                        <FaHome /> Home
                    </Link>
                    {user && user.email === 'kallymashigo3@gmail.com' && (
                        <Link href="/dev-console" className="bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 text-red-500 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap">
                            <FaBolt /> Dev
                        </Link>
                    )}
                    <button onClick={handleLogout} className="bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 text-red-500 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap">
                        <FaSignOutAlt /> Logout
                    </button>
                    <div className="hidden md:flex bg-[#1E1E1E] border border-[#333] text-white px-4 py-3 rounded-full text-[10px] font-black uppercase tracking-widest items-center whitespace-nowrap">
                        <FaUserShield className="inline mr-2 text-green-500"/> System Admin
                    </div>
                </div>
            </div>

            {/* NAV TABS */}
            <div className="flex overflow-x-auto gap-2 mb-6 border-b border-[#333] pb-1 no-scrollbar">
                {['Users', 'Owners', 'Tenants', 'Apartments', 'Cars'].map((tab) => (
                <button key={tab} onClick={() => { setActiveTab(tab); setShowAddForm(false); }}
                    className={`px-8 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeTab === tab ? 'bg-[#1E1E1E] text-blue-400 border-t border-x border-[#333]' : 'text-gray-600 hover:text-gray-300'
                    }`}
                >
                    {tab}
                </button>
                ))}
            </div>

            {/* CONTENT AREA */}
            <div className="bg-[#1E1E1E] rounded-[2rem] shadow-sm border border-[#333] min-h-[600px] p-4 md:p-6">
                {activeTab !== 'Apartments' && (
                <>
                    {!showAddForm ? (
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter">{activeTab} Database</h3>
                        <button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <FaPlus /> New Entry
                        </button>
                    </div>
                    ) : (
                    <PersonForm type={activeTab} availableBuildings={properties} onAdd={handleAddPerson} onClose={() => setShowAddForm(false)} takenUnits={takenUnits} />
                    )}

                    <div className="grid gap-3">
                    {(activeTab === 'Users' ? users : activeTab === 'Owners' ? owners : tenants).map(person => (
                        <div key={person.id} className="flex justify-between items-center bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                            <div>
                                <h4 className="text-sm font-bold text-white">{person.surname}, {person.name}</h4>
                                <div className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-2">
                                    <span className="text-blue-400">{person.username}</span>
                                    {person.role && <span className="text-emerald-500 border border-emerald-900/50 px-1 rounded bg-emerald-900/10">{person.role}</span>}
                                    {person.deletionStatus && <span className={`px-1 rounded text-[9px] ${person.deletionStatus === 'pending' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-red-900/20 text-red-400'}`}>{person.deletionStatus === 'pending' ? 'Pending Approval' : 'Approved for Deletion'}</span>}
                                </div>
                                {person.linkedUnits && person.linkedUnits.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {person.linkedUnits.map(l => (
                                    <span key={l.id} className="text-[9px] bg-[#222] text-gray-400 px-2 py-0.5 rounded border border-[#333] flex items-center gap-1">
                                        <FaBuilding size={8}/> {l.building} : {l.unit}
                                    </span>
                                    ))}
                                </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {person.deletionStatus === 'pending' && (
                                    <button onClick={() => handleApproveDeletion(activeTab, person)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-[10px] font-bold">Approve</button>
                                )}
                                <button onClick={() => handleDeletePerson(activeTab, person)} className={`px-3 py-1 rounded text-[10px] font-bold ${person.deletionStatus === 'approved' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#222] hover:bg-red-900/30 text-gray-500 hover:text-red-500'}`}>
                                    {person.deletionStatus === 'approved' ? 'Delete Permanently' : 'Request Deletion'}
                                </button>
                            </div>
                        </div>
                    ))}
                    </div>
                </>
                )}

                {activeTab === 'Apartments' && (
                    <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center bg-[#252525] p-4 rounded-2xl border border-[#333] gap-4">
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter w-full md:w-auto">Property Config</h3>
                        <div className="flex gap-2 w-full md:w-auto">
                        <select value={newBuildingType} onChange={(e) => setNewBuildingType(e.target.value)}
                            className="bg-[#121212] border border-[#333] rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500">
                            <option value="Flat">Flat</option>
                            <option value="Commune">Commune</option>
                        </select>
                        <input type="text" placeholder="New Building Name..." value={newBuildingName} onChange={(e) => setNewBuildingName(e.target.value)}
                            className="bg-[#121212] border border-[#333] rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500 flex-1 md:w-48" />
                        <button onClick={handleAddBuilding} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap"><FaPlus /> Add</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {properties.map(prop => <PropertyCard key={prop.id} property={prop} onAddUnit={handleAddUnit} onDeleteUnit={handleDeleteUnit} />)}
                    </div>
                    </div>
                )}

                {activeTab === 'Cars' && (
                    <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center bg-[#252525] p-4 rounded-2xl border border-[#333] gap-4">
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter w-full md:w-auto">Car Fleet</h3>
                        <div className="flex gap-2 w-full md:w-auto">
                        <input type="text" placeholder="New Car Name..." value={newCarName} onChange={(e) => setNewCarName(e.target.value)}
                            className="bg-[#121212] border border-[#333] rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500 flex-1 md:w-48" />
                        <button onClick={handleAddCar} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap"><FaPlus /> Add</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {cars.map(car => (
                            <div key={car.id} className="bg-[#252525] p-6 rounded-2xl border border-[#333] hover:border-[#444] transition-all">
                               <div className="flex justify-between items-start mb-6 border-b border-[#333] pb-4">
                                  <div>
                                     <h4 className="text-xl font-black text-white">{car.name}</h4>
                                     <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Status: {car.status}</p>
                                  </div>
                                  <FaCar className="text-gray-600" />
                               </div>
                            </div>
                        ))}
                    </div>
                    </div>
                )}
            </div>
        </main>
    </div>
  );
}