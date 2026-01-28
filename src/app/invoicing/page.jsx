"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  FaPlus, FaTrash, FaFileInvoice, FaPercent, 
  FaCalculator, FaCheckCircle, FaSearch,
  FaHammer, FaPaintRoller, FaBroom, FaFileSignature,
  FaPaperPlane, FaTimes, FaEye, FaBars
} from "react-icons/fa";
import { BiBuildings, BiCoinStack, BiCartAdd } from "react-icons/bi";

const InvoicingPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('builder'); 
  
  // --- BUILDER STATE ---
  const [cart, setCart] = useState([]);
  const [markup, setMarkup] = useState(15); 
  const [unit, setUnit] = useState("");
  const [customItem, setCustomItem] = useState({ name: '', price: '', category: 'Materials' });

  // --- HISTORY STATE ---
  const [invoices, setInvoices] = useState([
    { 
        id: 101, unit: 'HILLCREST A612', total: 4500, date: '12 Jan 2026', status: 'Sent',
        items: [{ name: "Wall Paint", price: 450, qty: 10 }] 
    },
    { 
        id: 102, unit: 'THE WALL 407', total: 1250, date: '14 Jan 2026', status: 'Draft',
        items: [{ name: "Plumbing Call-out", price: 550, qty: 1 }, { name: "Tap Washer", price: 50, qty: 1 }]
    },
  ]);
  
  const [viewingInvoice, setViewingInvoice] = useState(null);

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
        { id: 4, name: "General Maintenance (hr)", price: 350, icon: <FaHammer/> },
        { id: 5, name: "Plumbing Call-out", price: 550, icon: <FaHammer/> },
        { id: 6, name: "Electrician Call-out", price: 650, icon: <FaHammer/> },
    ],
    Service: [
        { id: 7, name: "Deep Clean (Unit)", price: 850, icon: <FaBroom/> },
        { id: 8, name: "Refuse Removal", price: 150, icon: <FaTrash/> },
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
  const createDraft = () => {
    if (!unit || cart.length === 0) return;
    const newInvoice = {
        id: Date.now(),
        unit: unit,
        total: calculateTotal(),
        subtotal: calculateSubtotal(),
        markup: markup,
        date: new Date().toLocaleDateString('en-GB'),
        status: 'Draft', 
        items: [...cart] 
    };
    setInvoices([newInvoice, ...invoices]);
    setCart([]);
    setUnit("");
    setActiveTab('history');
  };

  const deleteInvoice = (id) => {
    if(confirm("Permanently delete this invoice?")) {
        setInvoices(invoices.filter(i => i.id !== id));
        if(viewingInvoice?.id === id) setViewingInvoice(null);
    }
  };

  const sendInvoice = (id) => {
    if(confirm("Ready to email this to the owner?")) {
        setInvoices(invoices.map(i => i.id === id ? { ...i, status: 'Sent' } : i));
        alert("Invoice sent successfully.");
        setViewingInvoice(null);
    }
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const calculateTotal = () => {
      const sub = calculateSubtotal();
      return sub + ((sub * markup) / 100);
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
          
          {activeTab === 'builder' && (
            <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3 self-end lg:self-auto">
                <FaPercent className="text-blue-500" size={12} />
                <span className="text-[10px] font-black uppercase text-slate-400">Markup:</span>
                <input 
                    type="number" 
                    value={markup} 
                    onChange={(e) => setMarkup(e.target.value)}
                    className="w-12 text-sm font-black text-slate-900 outline-none border-b border-slate-200 focus:border-blue-500 text-center"
                />
            </div>
          )}
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

                    <div className="space-y-3 mb-8 min-h-[150px] max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
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
                            <span>Mgmt Markup ({markup}%)</span><span>R{(calculateSubtotal() * markup / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-4 border-t border-slate-800 mt-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Total</span>
                            <span className="text-3xl font-black italic tracking-tighter text-white">R{calculateTotal().toFixed(0)}</span>
                        </div>
                    </div>

                    <button disabled={!unit || cart.length === 0} onClick={createDraft} className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-3">
                        <FaFileInvoice size={14} /><span>Create Draft Invoice</span>
                    </button>
                </div>
            </div>

            {/* SELECTION ENGINE (Left on Desktop, Bottom on Mobile) */}
            <div className="lg:col-span-2 space-y-6 lg:order-1 order-2">
                <section className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0"><BiBuildings size={20} /></div>
                        <input 
                            placeholder="UNIT REF (e.g. DUNCAN A612)" 
                            className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black uppercase outline-none focus:ring-2 ring-blue-500 transition-all placeholder:text-slate-300"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value.toUpperCase())}
                        />
                    </div>
                </section>

                <section className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5"><FaFileInvoice size={100} /></div>
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 ml-2">Add Custom Item</h3>
                    <div className="flex flex-col md:flex-row gap-3 relative z-10">
                        <input placeholder="Item Description..." className="flex-[2] bg-white p-4 rounded-xl text-xs font-bold outline-none shadow-sm focus:ring-2 ring-blue-400"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                {invoices.map(inv => (
                    <div key={inv.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><FaFileInvoice size={20}/></div>
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                inv.status === 'Sent' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                                {inv.status}
                            </span>
                        </div>
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 mb-1">{inv.unit}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Issued: {inv.date}</p>
                        
                        <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                            <div className="flex gap-2">
                                <button onClick={() => setViewingInvoice(inv)} className="bg-slate-100 text-slate-500 p-2 rounded-lg hover:bg-slate-200 transition-colors"><FaEye size={12}/></button>
                                <button onClick={() => deleteInvoice(inv.id)} className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><FaTrash size={12}/></button>
                            </div>
                            <span className="text-2xl font-black text-slate-900">R{inv.total.toFixed(0)}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}

      </main>

      {/* --- REPORT DETAIL MODAL --- */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Invoice Breakdown</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{viewingInvoice.unit} · {viewingInvoice.status}</p>
                    </div>
                    <button onClick={() => setViewingInvoice(null)} className="text-slate-500 hover:text-white"><FaTimes size={20}/></button>
                </div>
                
                <div className="p-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Line Items (What Cost What)</p>
                    <div className="space-y-3">
                        {viewingInvoice.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase">{item.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">Qty: {item.qty} × R{item.price}</p>
                                </div>
                                <span className="text-sm font-black text-slate-900">R{(item.qty * item.price).toFixed(0)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Markup</span><span>{viewingInvoice.markup || 15}%</span></div>
                        <div className="flex justify-between text-xl font-black text-blue-600 uppercase"><span>Total</span><span>R{viewingInvoice.total.toFixed(0)}</span></div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100">
                    {viewingInvoice.status === 'Draft' ? (
                        <button onClick={() => sendInvoice(viewingInvoice.id)} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                            <FaPaperPlane /> <span>Send to Owner Now</span>
                        </button>
                    ) : (
                        <button disabled className="w-full py-4 bg-green-100 text-green-700 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                            <FaCheckCircle /> <span>Already Sent</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default InvoicingPage;