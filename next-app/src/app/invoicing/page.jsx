"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import SuccessToast from '../components/SuccessToast';
import ApartmentAutocomplete from '../components/ApartmentAutocomplete';
import { 
  FaPlus, FaTrash, FaFileInvoice, FaPercent, 
  FaCalculator, FaCheckCircle, FaSearch,
  FaHammer, FaPaintRoller, FaBroom, FaFileSignature,
  FaPaperPlane, FaTimes, FaEye, FaBars
} from "react-icons/fa";
import { BiBuildings, BiCoinStack, BiCartAdd } from "react-icons/bi";
import { db, auth } from '../Config/firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const InvoicingPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('builder'); 
  
  // --- BUILDER STATE ---
  const [cart, setCart] = useState([]);
  const [vat, setVat] = useState(15); 
  const [unit, setUnit] = useState("");
  const [referenceInvoice, setReferenceInvoice] = useState("");
  const [customItem, setCustomItem] = useState({ name: '', price: '', category: 'Materials' });

  // --- HISTORY STATE ---
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Fetch invoices from Firestore on mount
  useEffect(() => {
    fetchInvoices();

    // Fetch User Role
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "stuff", currentUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const invoicesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInvoices(invoicesList);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      alert("Error loading invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  const CATEGORIES = {
    Materials: [
        { id: 1, name: "Ceramic Tiles (m²)", price: 180, icon: <BiCoinStack/> },
        { id: 2, name: "Wall Paint (5L)", price: 450, icon: <FaPaintRoller/> },
        { id: 3, name: "Door Handle (Std)", price: 250, icon: <FaHammer/> },
    ],
    Labor: [
        { id: 5, name: "Call-out fee", price: 250, icon: <FaHammer/> },
        { id: 6, name: "Call-out and labour", price: 550, icon: <FaHammer/> },
    ],
    Cleaning: [
        { id: 7, name: "1 Bedroom flat", price: 500, icon: <FaBroom/> },
        { id: 8, name: "2 Bedroom flat", price: 950, icon: <FaBroom/> },
        { id: 9, name: "Bachelor flat", price: 500, icon: <FaBroom/> },
        { id: 10, name: "Room + bathroom", price: 500, icon: <FaBroom/> },
        { id: 11, name: "Room", price: 400, icon: <FaBroom/> },
    ]
  };

  // --- CART ACTIONS ---
  const addToCart = (item) => {
    const existing = cart.find(i => i.name === item.name);
    if (existing) {
      setCart(cart.map(i => i.name === item.name ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, cartId: Date.now(), qty: 1 }]);
    }
  };

  const addCustomItem = () => {
    if (!customItem.name || !customItem.price) return;
    addToCart({ 
        name: customItem.name, 
        price: parseFloat(customItem.price), 
        category: customItem.category,
        icon: <FaFileSignature/> 
    });
    setCustomItem({ name: '', price: '', category: 'Materials' });
  };

  const removeFromCart = (cartId) => setCart(cart.filter(i => i.cartId !== cartId));

  const updateCartPrice = (cartId, newPrice) => {
    setCart(cart.map(item => item.cartId === cartId ? { ...item, price: parseFloat(newPrice) || 0 } : item));
  };

  // --- INVOICE ACTIONS ---
  const createDraft = async () => {
    if (!unit || cart.length === 0) {
      setSuccessMessage("Unit and items are required!");
      return;
    }
    
    try {
      // Remove icon property from cart items (React components can't be serialized to Firestore)
      const serializableItems = cart.map(({ icon, ...item }) => item);
      
      const newInvoice = {
        invoiceNumber: generateInvoiceNumber(),
        referenceInvoice: referenceInvoice,
        unit: unit,
        total: calculateTotal(),
        subtotal: calculateSubtotal(),
        vat: vat,
        date: new Date().toLocaleDateString('en-GB'),
        status: 'Draft', 
        items: serializableItems,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'invoices'), newInvoice);
      
      // Clear form and refresh list
      setCart([]);
      setUnit("");
      setReferenceInvoice("");
      setActiveTab('history');
      
      // Refetch to get updated list
      await fetchInvoices();
      
      setSuccessMessage("Draft invoice created successfully!");
    } catch (error) {
      console.error("Error creating invoice:", error);
      setSuccessMessage("Error creating invoice. Please try again.");
    }
  };

  const deleteInvoice = async (id) => {
    if(!confirm("Permanently delete this invoice?")) return;
    
    try {
      await deleteDoc(doc(db, 'invoices', id));
      
      // Update local state
      setInvoices(invoices.filter(i => i.id !== id));
      if(viewingInvoice?.id === id) setViewingInvoice(null);
      
      setSuccessMessage("Invoice deleted successfully!");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Error deleting invoice. Please try again.");
    }
  };

  const sendInvoice = async (id) => {
    if(!confirm("Ready to email this to the owner?")) return;
    
    try {
      await updateDoc(doc(db, 'invoices', id), {
        status: 'Sent'
      });
      
      // Update local state
      setInvoices(invoices.map(i => i.id === id ? { ...i, status: 'Sent' } : i));
      setViewingInvoice(null);
      
      setSuccessMessage("Invoice sent successfully!");
    } catch (error) {
      console.error("Error sending invoice:", error);
      alert("Error sending invoice. Please try again.");
    }
  };

  const generateInvoiceNumber = () => {
    const min = 1000;
    const max = 9999;
    return `INV-${Math.floor(Math.random() * (max - min + 1)) + min}`;
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const calculateTotal = () => {
      const sub = calculateSubtotal();
      return sub + ((sub * vat) / 100);
  };

  const getTotalInvoicedAmount = () => {
    return invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] relative">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8 max-w-7xl mx-auto`}>
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div className="flex flex-col gap-4 w-full lg:w-auto">
             <div className="flex items-center gap-4">
                <button onClick={() => setIsOpen(!isOpen)} className="md:hidden bg-white p-3 rounded-xl shadow-sm text-slate-600 border border-slate-200">
                    <FaBars size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Finance Hub</h1>
                </div>
             </div>
             
             {/* Scrollable Tabs */}
             <div className="w-full overflow-x-auto pb-1">
                <div className="flex bg-slate-200 p-1 rounded-xl w-fit shadow-inner scale-95 origin-left whitespace-nowrap">
                   {['builder', 'history'].map(tab => (
                       <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
                           {tab === 'builder' ? 'Invoice Builder' : 'History & Drafts'}
                       </button>
                   ))}
                </div>
             </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
             {activeTab === 'builder' && (
              <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
                  <FaPercent className="text-blue-500" size={12} />
                  <span className="text-[10px] font-black uppercase text-slate-400">VAT:</span>
                  <input 
                      type="number" 
                      value={vat} 
                      onChange={(e) => setVat(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-base font-semibold text-slate-900 outline-none border-b border-slate-200 focus:border-blue-500 text-center hover:bg-blue-50 cursor-pointer transition-colors"
                  />
              </div>
             )}
             <div className="bg-blue-50 px-4 py-3 rounded-2xl border border-blue-200 shadow-sm flex items-center space-x-3">
                  <BiCoinStack className="text-blue-600" size={16} />
                  <span className="text-[10px] font-black uppercase text-blue-600">Total Invoiced:</span>
                  <span className="text-lg font-black italic text-blue-900">R{getTotalInvoicedAmount().toFixed(2)}</span>
             </div>
          </div>
        </header>

        {/* --- VIEW 1: BUILDER --- */}
        {activeTab === 'builder' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* CART (Moves to Top on Mobile for Visibility) */}
            <div className="lg:col-span-1 lg:order-2 order-1">
                <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl sticky top-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-blue-400">Draft Invoice</h2>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{unit || "No Unit Selected"}</p>
                        </div>
                        <FaCalculator className="text-slate-600" size={24} />
                    </div>

                    <div className="space-y-3 mb-8 min-h-96 max-h-100 overflow-y-auto custom-scrollbar pr-2">
                        {cart.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 py-10">
                                <BiCartAdd size={40} className="mb-2 opacity-20"/>
                                <p className="text-[10px] italic uppercase tracking-widest">Add items to bill</p>
                            </div>
                        )}
                        {cart.map(item => (
                            <div key={item.cartId} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-800 group hover:border-blue-500/30 transition-all">
                                <div>
                                    <p className="text-[10px] font-bold uppercase leading-none mb-1 text-slate-300">{item.name}</p>
                                    <p className="text-[9px] text-slate-500 font-bold">Qty: {item.qty}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center border-b border-slate-600 focus-within:border-blue-500">
                                        <span className="text-[10px] text-slate-400 mr-1">R</span>
                                        <input 
                                            type="number" 
                                            className="w-12 bg-transparent text-xs font-black text-white outline-none text-right"
                                            value={item.price}
                                            onChange={(e) => updateCartPrice(item.cartId, e.target.value)}
                                        />
                                    </div>
                                    <button onClick={() => removeFromCart(item.cartId)} className="text-slate-600 hover:text-red-500 transition-colors">
                                        <FaTrash size={10} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3 pt-6 border-t border-slate-800">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Cost Subtotal</span><span>R{calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            <span>VAT ({vat}%)</span><span>R{(calculateSubtotal() * vat / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-4 border-t border-slate-800 mt-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Total</span>
                            <span className="text-3xl font-black italic tracking-tighter text-white">R{calculateTotal().toFixed(2)}</span>
                        </div>
                    </div>

                    {(userRole === 'Maintenance Admin' || userRole === 'PQA') ? (
                      <button disabled={!unit || cart.length === 0} onClick={createDraft} className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-3">
                          <FaFileInvoice size={14} /><span>Create Draft Invoice</span>
                      </button>
                    ) : (
                      <div className="w-full mt-8 bg-slate-800 text-slate-500 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center space-x-3 cursor-not-allowed">
                          <FaFileInvoice size={14} /><span>Read-Only Access</span>
                      </div>
                    )}
                </div>
            </div>

            {/* SELECTION ENGINE (Left on Desktop, Bottom on Mobile) */}
            <div className="lg:col-span-2 space-y-6 lg:order-1 order-2">
                <section className="bg-white p-6 rounded-4xl border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0"><BiBuildings size={20} /></div>
                        <div className="flex-1">
                            <ApartmentAutocomplete 
                                value={unit}
                                onChange={setUnit}
                                placeholder="UNIT REF (e.g. DUNCAN A612)"
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-green-50 p-6 rounded-4xl border border-green-100 shadow-sm flex items-end gap-4">
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-green-600 uppercase tracking-widest block mb-2">Ref Invoice</label>
                        <input 
                            placeholder="12345" 
                            maxLength="10"
                            className="w-full bg-white p-3 rounded-xl text-sm font-black uppercase outline-none focus:ring-2 ring-green-500 transition-all placeholder:text-slate-300"
                            value={referenceInvoice}
                            onChange={(e) => setReferenceInvoice(e.target.value.toUpperCase())}
                        />
                    </div>
                    <p className="text-[9px] text-green-600 font-bold pb-2 italic max-w-xs">optional. once saved can't add later</p>
                </section>

                <section className="bg-blue-50 p-6 rounded-4xl border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5"><FaFileInvoice size={100} /></div>
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 ml-2">Add Custom Item</h3>
                    <div className="flex flex-col md:flex-row gap-3 relative z-10">
                        <input placeholder="Item Description..." className="flex-2 bg-white p-4 rounded-xl text-xs font-bold outline-none shadow-sm focus:ring-2 ring-blue-400"
                            value={customItem.name} onChange={(e) => setCustomItem({...customItem, name: e.target.value})} />
                        <div className="flex gap-3 flex-1">
                            <input type="number" placeholder="Price (R)" className="w-full bg-white p-4 rounded-xl text-xs font-bold outline-none shadow-sm focus:ring-2 ring-blue-400"
                                value={customItem.price} onChange={(e) => setCustomItem({...customItem, price: e.target.value})} />
                            <button onClick={addCustomItem} className="bg-blue-600 text-white px-6 rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"><FaPlus /></button>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(CATEGORIES).map(([catName, items]) => (
                        <section key={catName} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">{catName}</h3>
                            <div className="space-y-2">
                                {items.map(item => (
                                    <button key={item.id} onClick={() => addToCart(item)}
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group active:scale-95">
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-300 group-hover:text-blue-500 transition-colors">{item.icon}</span>
                                            <span className="text-[10px] font-bold text-slate-700 uppercase">{item.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-600">R{item.price}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
            </div>
        )}

        {/* --- VIEW 2: HISTORY --- */}
        {activeTab === 'history' && (
            <>
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Invoices...</p>
                    </div>
                </div>
            ) : invoices.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <FaFileInvoice size={60} className="text-slate-200 mx-auto mb-4"/>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No invoices yet</p>
                        <p className="text-xs text-slate-300 mt-2">Create your first invoice in the Builder tab</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {Object.entries(
                      invoices.reduce((acc, inv) => {
                        if (!acc[inv.unit]) acc[inv.unit] = [];
                        acc[inv.unit].push(inv);
                        return acc;
                      }, {})
                    ).map(([unitName, unitInvoices]) => (
                        <div key={unitName} className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 p-6 border-b border-slate-200">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">{unitName}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                    {unitInvoices.length} invoice{unitInvoices.length !== 1 ? 's' : ''} | Total: <span className="text-blue-600">R{unitInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2)}</span>
                                </p>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {unitInvoices.map((inv, idx) => (
                                    <div key={inv.id} className="p-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice #{idx + 1}</p>
                                                <p className="text-sm font-black text-slate-900 mb-1">Ref: {inv.referenceInvoice || 'N/A'}</p>
                                                <p className="text-[9px] font-bold text-slate-500">Generated: {inv.invoiceNumber}</p>
                                            </div>
                                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                                inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                                inv.status === 'Sent' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="text-[10px] font-bold text-slate-600">
                                                <p>{inv.items?.length} item{inv.items?.length !== 1 ? 's' : ''}</p>
                                                <p className="text-slate-400 mt-1">{inv.date}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Amount</p>
                                                <p className="text-2xl font-black italic text-slate-900">R{inv.total?.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => setViewingInvoice(inv)} className="bg-slate-100 text-slate-500 p-2 rounded-lg hover:bg-slate-200 transition-colors"><FaEye size={12}/></button>
                                            {inv.status === 'Draft' && (
                                              <button onClick={() => sendInvoice(inv.id)} className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"><FaPaperPlane size={12}/></button>
                                            )}
                                            <button onClick={() => deleteInvoice(inv.id)} className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><FaTrash size={12}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </>
        )}

      </main>

      {/* --- REPORT DETAIL MODAL --- */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Invoice Details</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{viewingInvoice.unit} · {viewingInvoice.invoiceNumber}</p>
                    </div>
                    <button onClick={() => setViewingInvoice(null)} className="text-slate-500 hover:text-white"><FaTimes size={20}/></button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Reference Invoice</p>
                        <p className="text-lg font-black text-green-900 mt-2">{viewingInvoice.referenceInvoice || 'N/A'}</p>
                    </div>

                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Line Items</p>
                        <div className="space-y-3">
                            {viewingInvoice.items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 uppercase">{item.name}</p>
                                        <p className="text-[9px] text-slate-400 font-bold">Qty: {item.qty} × R{item.price?.toFixed(2)}</p>
                                    </div>
                                    <span className="text-sm font-black text-slate-900">R{(item.qty * item.price).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Subtotal</span><span>R{viewingInvoice.subtotal?.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>VAT ({viewingInvoice.vat || 15}%)</span><span>R{(viewingInvoice.subtotal * (viewingInvoice.vat || 15) / 100)?.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xl font-black text-blue-600 uppercase mt-4"><span>Total</span><span>R{viewingInvoice.total?.toFixed(2)}</span></div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100">
                    {viewingInvoice.status === 'Draft' ? (
                        <button onClick={() => sendInvoice(viewingInvoice.id)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                            <FaPaperPlane /> <span>Send to Owner Now</span>
                        </button>
                    ) : (
                        <button disabled className="w-full py-4 bg-green-100 text-green-700 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                            <FaCheckCircle /> <span>Already Sent</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {successMessage && (
        <SuccessToast message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}

    </div>
  );
};

export default InvoicingPage;