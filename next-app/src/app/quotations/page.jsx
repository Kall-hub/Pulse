"use client";
import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import SuccessToast from '../components/SuccessToast';
import { 
  FaPlus, FaTrash, FaFileInvoice, FaPercent, 
  FaCalculator, FaCheckCircle, FaSearch,
  FaHammer, FaPaintRoller, FaBroom, FaFileSignature,
  FaPaperPlane, FaTimes, FaEye, FaBars, FaClock, FaThumbsUp, FaTimesCircle,
  FaPrint, FaDownload
} from "react-icons/fa";
import { BiBuildings, BiCoinStack, BiCartAdd } from "react-icons/bi";
import { db, auth } from '../Config/firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const QuotationsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('builder'); 
  const printRef = useRef(null); 
  
  // --- BUILDER STATE ---
  const [cart, setCart] = useState([]);
  const [vat, setVat] = useState(15); 
  const [unit, setUnit] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [customItem, setCustomItem] = useState({ name: '', price: '', category: 'Materials' });

  // --- HISTORY STATE ---
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewingQuotation, setViewingQuotation] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Fetch quotations from Firestore on mount
  useEffect(() => {
    fetchQuotations();

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

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'quotations'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const quotationsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuotations(quotationsList);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      alert("Error loading quotations. Please try again.");
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
        { id: 6, name: "Call-out and labour", price: 450, icon: <FaHammer/> },
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

  // --- QUOTATION ACTIONS ---
  const createQuotation = async () => {
    if (!unit || cart.length === 0) {
      setSuccessMessage("Unit and items are required!");
      return;
    }
    
    try {
      // Remove icon property from cart items (React components can't be serialized to Firestore)
      const serializableItems = cart.map(({ icon, ...item }) => item);
      
      // Calculate validity end date
      const createdDate = new Date();
      const validityEndDate = new Date(createdDate);
      validityEndDate.setDate(validityEndDate.getDate() + validityDays);
      
      const newQuotation = {
        quotationNumber: generateQuotationNumber(),
        unit: unit,
        total: calculateTotal(),
        subtotal: calculateSubtotal(),
        vat: vat,
        date: createdDate.toLocaleDateString('en-GB'),
        validityDays: validityDays,
        validityEndDate: validityEndDate.toLocaleDateString('en-GB'),
        status: 'Pending', 
        items: serializableItems,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'quotations'), newQuotation);
      
      // Clear form and refresh list
      setCart([]);
      setUnit("");
      setValidityDays(30);
      setActiveTab('history');
      
      // Refetch to get updated list
      await fetchQuotations();
      
      setSuccessMessage("Quotation created successfully!");
    } catch (error) {
      console.error("Error creating quotation:", error);
      setSuccessMessage("Error creating quotation. Please try again.");
    }
  };

  const deleteQuotation = async (id) => {
    if(!confirm("Permanently delete this quotation?")) return;
    
    try {
      await deleteDoc(doc(db, 'quotations', id));
      
      // Update local state
      setQuotations(quotations.filter(i => i.id !== id));
      if(viewingQuotation?.id === id) setViewingQuotation(null);
      
      setSuccessMessage("Quotation deleted successfully!");
    } catch (error) {
      console.error("Error deleting quotation:", error);
      alert("Error deleting quotation. Please try again.");
    }
  };

  const updateQuotationStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'quotations', id), {
        status: newStatus
      });
      
      // Update local state
      const updated = quotations.map(i => i.id === id ? { ...i, status: newStatus } : i);
      setQuotations(updated);
      
      if(viewingQuotation?.id === id) {
        setViewingQuotation({ ...viewingQuotation, status: newStatus });
      }
      
      setSuccessMessage(`Quotation marked as ${newStatus}!`);
    } catch (error) {
      console.error("Error updating quotation:", error);
      alert("Error updating quotation. Please try again.");
    }
  };

  const generateQuotationNumber = () => {
    const min = 1000;
    const max = 9999;
    return `QT-${Math.floor(Math.random() * (max - min + 1)) + min}`;
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const calculateTotal = () => {
      const sub = calculateSubtotal();
      return sub + ((sub * vat) / 100);
  };

  const getTotalQuotedAmount = () => {
    return quotations.reduce((sum, q) => sum + (q.total || 0), 0);
  };

  const isQuotationExpired = (validityEndDate) => {
    const today = new Date();
    const expireDate = new Date(validityEndDate);
    return today > expireDate;
  };

  const printQuotation = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    
    const itemsHtml = viewingQuotation?.items?.map(item => `
      <tr>
        <td class="item-name">${item.name}</td>
        <td class="item-qty">${item.qty}</td>
        <td class="item-price">R${item.price?.toFixed(2)}</td>
        <td class="item-amount">R${(item.qty * item.price).toFixed(2)}</td>
      </tr>
    `).join('');
    
    const vatAmount = (viewingQuotation?.subtotal * (viewingQuotation?.vat || 15) / 100)?.toFixed(2);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation ${viewingQuotation?.quotationNumber}</title>
          <style>
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              background: white;
              color: #1e293b;
            }
            .print-container { 
              max-width: 900px; 
              margin: 0 auto;
            }
            .header-section {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #7c3aed;
              padding-bottom: 30px;
            }
            .header-section h1 { 
              font-size: 42px; 
              font-weight: 900; 
              margin-bottom: 10px; 
              text-transform: uppercase;
              letter-spacing: 2px;
              color: #0f172a;
            }
            .header-section p { 
              font-size: 18px; 
              color: #7c3aed;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr 1fr; 
              gap: 15px; 
              margin-bottom: 40px;
            }
            .info-box { 
              padding: 15px; 
              border-left: 4px solid #7c3aed;
              background: #f8fafc;
              border-radius: 4px;
            }
            .info-label { 
              font-size: 11px; 
              font-weight: 900; 
              color: #64748b; 
              text-transform: uppercase; 
              margin-bottom: 8px; 
              letter-spacing: 1px;
            }
            .info-value { 
              font-size: 14px; 
              font-weight: 900; 
              color: #0f172a;
            }
            .section-title {
              font-size: 13px;
              font-weight: 900;
              color: #7c3aed;
              text-transform: uppercase;
              margin-bottom: 15px;
              margin-top: 30px;
              letter-spacing: 1px;
            }
            .items-table{
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .items-table thead {
              background: #0f172a;
              color: white;
            }
            .items-table th {
              padding: 12px;
              text-align: left;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 13px;
            }
            .items-table tr:nth-child(even) {
              background: #f8fafc;
            }
            .item-name {
              font-weight: 700;
              color: #0f172a;
            }
            .item-qty {
              text-align: right;
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
            }
            .item-price {
              text-align: right;
              font-weight: 700;
            }
            .item-amount {
              text-align: right;
              font-weight: 900;
              color: #0f172a;
            }
            .totals-section { 
              margin-top: 30px;
              margin-bottom: 40px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 10px; 
              font-size: 12px;
              padding: 5px 0;
            }
            .total-label {
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
            }
            .total-value {
              font-weight: 700;
              color: #0f172a;
            }
            .total-row.subtotal .total-value {
              color: #0f172a;
            }
            .total-row.vat .total-value {
              color: #7c3aed;
            }
            .total-row.final {
              border-top: 2px solid #7c3aed;
              border-bottom: 2px solid #7c3aed;
              padding: 15px 0;
              margin-top: 15px;
              font-size: 18px;
              font-weight: 900;
              color: #0f172a;
            }
            .total-row.final .total-value {
              color: #7c3aed;
              font-size: 28px;
            }
            .footer { 
              text-align: center; 
              font-size: 11px; 
              color: #94a3b8; 
              margin-top: 50px; 
              padding-top: 20px; 
              border-top: 1px solid #e2e8f0;
            }
            .company-info {
              margin-bottom: 40px;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 24px;
              font-weight: 900;
              color: #0f172a;
              margin-bottom: 5px;
            }
            @media print { 
              body { 
                padding: 0;
                margin: 0;
              }
              .print-container { 
                max-width: 100%; 
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="company-info">
              <div class="company-name">OC PULSE</div>
              <p style="font-size: 12px; color: #64748b; margin-top: 5px;">Property Management & Quotations</p>
            </div>

            <div class="header-section">
              <h1>Quotation</h1>
              <p>${viewingQuotation?.quotationNumber}</p>
            </div>

            <div class="info-grid">
              <div class="info-box">
                <div class="info-label">Unit</div>
                <div class="info-value">${viewingQuotation?.unit}</div>
              </div>
              <div class="info-box">
                <div class="info-label">Date Issued</div>
                <div class="info-value">${viewingQuotation?.date}</div>
              </div>
              <div class="info-box">
                <div class="info-label">Valid Until</div>
                <div class="info-value">${viewingQuotation?.validityEndDate}</div>
              </div>
            </div>

            <div class="section-title">Items Quoted</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 45%; text-align: left;">Description</th>
                  <th style="width: 12%; text-align: right;">Qty</th>
                  <th style="width: 20%; text-align: right;">Unit Price</th>
                  <th style="width: 23%; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="total-row subtotal">
                <span class="total-label">Subtotal</span>
                <span class="total-value">R${viewingQuotation?.subtotal?.toFixed(2)}</span>
              </div>
              <div class="total-row vat">
                <span class="total-label">VAT (${viewingQuotation?.vat || 15}%)</span>
                <span class="total-value">R${vatAmount}</span>
              </div>
              <div class="total-row final">
                <span class="total-label">TOTAL QUOTED</span>
                <span class="total-value">R${viewingQuotation?.total?.toFixed(2)}</span>
              </div>
            </div>

            <div class="footer">
              <p>This quotation is valid for ${viewingQuotation?.validityDays} days from the date of issue.</p>
              <p style="margin-top: 10px;">Generated by OC Pulse • Property Management System</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const downloadPDF = async () => {
    if (!viewingQuotation) return;
    
    try {
      // Load html2pdf from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      document.head.appendChild(script);
      
      script.onload = () => {
        const itemsRows = viewingQuotation.items?.map((item, idx) => `
          <tr style="background: ${idx % 2 === 0 ? '#f8fafc' : 'white'}; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; font-weight: 700; color: #0f172a;">${item.name}</td>
            <td style="padding: 12px; text-align: right; font-size: 12px; color: #64748b; font-weight: 600;">${item.qty}</td>
            <td style="padding: 12px; text-align: right; font-weight: 700;">R${item.price?.toFixed(2)}</td>
            <td style="padding: 12px; text-align: right; font-weight: 900; color: #0f172a;">R${(item.qty * item.price).toFixed(2)}</td>
          </tr>
        `).join('');
        
        const vatAmount = (viewingQuotation.subtotal * (viewingQuotation.vat || 15) / 100)?.toFixed(2);
        
        const htmlContent = `
          <div style="padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
            <div style="margin-bottom: 40px;">
              <div style="font-size: 24px; font-weight: 900; color: #0f172a; margin-bottom: 5px;">OC PULSE</div>
              <p style="font-size: 12px; color: #64748b; margin-top: 5px;">Property Management & Quotations</p>
            </div>

            <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #7c3aed; padding-bottom: 30px;">
              <h1 style="font-size: 42px; font-weight: 900; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; color: #0f172a;">Quotation</h1>
              <p style="font-size: 18px; color: #7c3aed; font-weight: 700; letter-spacing: 1px;">${viewingQuotation.quotationNumber}</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 40px;">
              <div style="padding: 15px; border-left: 4px solid #7c3aed; background: #f8fafc; border-radius: 4px;">
                <div style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Unit</div>
                <div style="font-size: 14px; font-weight: 900; color: #0f172a;">${viewingQuotation.unit}</div>
              </div>
              <div style="padding: 15px; border-left: 4px solid #7c3aed; background: #f8fafc; border-radius: 4px;">
                <div style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Date Issued</div>
                <div style="font-size: 14px; font-weight: 900; color: #0f172a;">${viewingQuotation.date}</div>
              </div>
              <div style="padding: 15px; border-left: 4px solid #7c3aed; background: #f8fafc; border-radius: 4px;">
                <div style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Valid Until</div>
                <div style="font-size: 14px; font-weight: 900; color: #0f172a;">${viewingQuotation.validityEndDate}</div>
              </div>
            </div>

            <div style="font-size: 13px; font-weight: 900; color: #7c3aed; text-transform: uppercase; margin-bottom: 15px; margin-top: 30px; letter-spacing: 1px;">Items Quoted</div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
              <thead>
                <tr style="background: #0f172a; color: white;">
                  <th style="padding: 12px; text-align: left; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; width: 45%;">Description</th>
                  <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; width: 12%;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; width: 20%;">Unit Price</th>
                  <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; width: 23%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div style="margin-top: 30px; margin-bottom: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; padding: 5px 0;">
                <span style="font-weight: 600; color: #64748b; text-transform: uppercase;">Subtotal</span>
                <span style="font-weight: 700; color: #0f172a;">R${viewingQuotation.subtotal?.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; padding: 5px 0;">
                <span style="font-weight: 600; color: #64748b; text-transform: uppercase;">VAT (${viewingQuotation.vat || 15}%)</span>
                <span style="font-weight: 700; color: #7c3aed;">R${vatAmount}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 2px solid #7c3aed; border-bottom: 2px solid #7c3aed; padding: 15px 0; margin-top: 15px; font-size: 18px; font-weight: 900; color: #0f172a;">
                <span style="text-transform: uppercase;">Total Quoted</span>
                <span style="color: #7c3aed; font-size: 28px;">R${viewingQuotation.total?.toFixed(2)}</span>
              </div>
            </div>

            <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p>This quotation is valid for ${viewingQuotation.validityDays} days from the date of issue.</p>
              <p style="margin-top: 10px;">Generated by OC Pulse • Property Management System</p>
            </div>
          </div>
        `;
        
        const opt = {
          margin: 10,
          filename: 'Quotation-' + viewingQuotation.quotationNumber + '.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        
        window.html2pdf().set(opt).from(htmlContent).save();
        setSuccessMessage('PDF downloaded successfully!');
      };
      
      script.onerror = () => {
        setSuccessMessage('Error loading PDF library. Please try again.');
      };
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setSuccessMessage('Error downloading PDF. Please try again.');
    }
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
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Quotations Hub</h1>
                </div>
             </div>
             
             {/* Scrollable Tabs */}
             <div className="w-full overflow-x-auto pb-1">
                <div className="flex bg-slate-200 p-1 rounded-xl w-fit shadow-inner scale-95 origin-left whitespace-nowrap">
                   {['builder', 'history'].map(tab => (
                       <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}>
                           {tab === 'builder' ? 'Quote Builder' : 'History & Proposals'}
                       </button>
                   ))}
                </div>
             </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
             {activeTab === 'builder' && (
              <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
                  <FaClock className="text-purple-500" size={12} />
                  <span className="text-[10px] font-black uppercase text-slate-400">Valid For:</span>
                  <input 
                      type="number" 
                      value={validityDays} 
                      onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                      min="1"
                      max="365"
                      className="w-12 text-sm font-black text-slate-900 outline-none border-b border-slate-200 focus:border-purple-500 text-center"
                  />
                  <span className="text-[10px] font-black text-slate-400">days</span>
              </div>
             )}
             <div className="bg-purple-50 px-4 py-3 rounded-2xl border border-purple-200 shadow-sm flex items-center space-x-3">
                  <BiCoinStack className="text-purple-600" size={16} />
                  <span className="text-[10px] font-black uppercase text-purple-600">Total Quoted:</span>
                  <span className="text-lg font-black italic text-purple-900">R{getTotalQuotedAmount().toFixed(2)}</span>
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
                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-purple-400">Draft Quotation</h2>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{unit || "No Unit Selected"}</p>
                        </div>
                        <FaCalculator className="text-slate-600" size={24} />
                    </div>

                    <div className="space-y-3 mb-8 min-h-96 max-h-100 overflow-y-auto custom-scrollbar pr-2">
                        {cart.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 py-10">
                                <BiCartAdd size={40} className="mb-2 opacity-20"/>
                                <p className="text-[10px] italic uppercase tracking-widest">Add items to quote</p>
                            </div>
                        )}
                        {cart.map(item => (
                            <div key={item.cartId} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-800 group hover:border-purple-500/30 transition-all">
                                <div>
                                    <p className="text-[10px] font-bold uppercase leading-none mb-1 text-slate-300">{item.name}</p>
                                    <p className="text-[9px] text-slate-500 font-bold">Qty: {item.qty}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center border-b border-slate-600 focus-within:border-purple-500">
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
                        <div className="flex justify-between text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                            <span>VAT ({vat}%)</span><span>R{(calculateSubtotal() * vat / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-4 border-t border-slate-800 mt-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quotation Total</span>
                            <span className="text-3xl font-black italic tracking-tighter text-white">R{calculateTotal().toFixed(2)}</span>
                        </div>
                    </div>

                    {userRole !== 'Agent' ? (
                      <button disabled={!unit || cart.length === 0} onClick={createQuotation} className="w-full mt-8 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 shadow-xl shadow-purple-500/20 flex items-center justify-center space-x-3">
                          <FaFileInvoice size={14} /><span>Create Quotation</span>
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
                        <input 
                            placeholder="UNIT REF (e.g. DUNCAN A612)" 
                            className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black uppercase outline-none focus:ring-2 ring-purple-500 transition-all placeholder:text-slate-300"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value.toUpperCase())}
                        />
                    </div>
                </section>

                <section className="bg-purple-50 p-6 rounded-4xl border border-purple-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5"><FaFileInvoice size={100} /></div>
                    <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4 ml-2">Add Custom Item</h3>
                    <div className="flex flex-col md:flex-row gap-3 relative z-10">
                        <input placeholder="Item Description..." className="flex-2 bg-white p-4 rounded-xl text-xs font-bold outline-none shadow-sm focus:ring-2 ring-purple-400"
                            value={customItem.name} onChange={(e) => setCustomItem({...customItem, name: e.target.value})} />
                        <div className="flex gap-3 flex-1">
                            <input type="number" placeholder="Price (R)" className="w-full bg-white p-4 rounded-xl text-xs font-bold outline-none shadow-sm focus:ring-2 ring-purple-400"
                                value={customItem.price} onChange={(e) => setCustomItem({...customItem, price: e.target.value})} />
                            <button onClick={addCustomItem} className="bg-purple-600 text-white px-6 rounded-xl shadow-lg hover:bg-purple-700 transition-all active:scale-95"><FaPlus /></button>
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
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all group active:scale-95">
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-300 group-hover:text-purple-500 transition-colors">{item.icon}</span>
                                            <span className="text-[10px] font-bold text-slate-700 uppercase">{item.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 group-hover:text-purple-600">R{item.price}</span>
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Quotations...</p>
                    </div>
                </div>
            ) : quotations.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <FaFileInvoice size={60} className="text-slate-200 mx-auto mb-4"/>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No quotations yet</p>
                        <p className="text-xs text-slate-300 mt-2">Create your first quotation in the Builder tab</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {Object.entries(
                      quotations.reduce((acc, q) => {
                        if (!acc[q.unit]) acc[q.unit] = [];
                        acc[q.unit].push(q);
                        return acc;
                      }, {})
                    ).map(([unitName, unitQuotations]) => (
                        <div key={unitName} className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 p-6 border-b border-slate-200">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">{unitName}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                    {unitQuotations.length} quotation{unitQuotations.length !== 1 ? 's' : ''} | Total Value: <span className="text-purple-600">R{unitQuotations.reduce((sum, q) => sum + (q.total || 0), 0).toFixed(2)}</span>
                                </p>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {unitQuotations.map((q, idx) => {
                                  const isExpired = isQuotationExpired(q.validityEndDate);
                                  const actualStatus = isExpired && q.status === 'Pending' ? 'Expired' : q.status;
                                  
                                  return (
                                    <div key={q.id} className="p-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quote #{idx + 1}</p>
                                                <p className="text-sm font-black text-slate-900 mb-1">{q.quotationNumber}</p>
                                                <p className="text-[9px] font-bold text-slate-500">Created: {q.date}</p>
                                            </div>
                                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                                actualStatus === 'Accepted' ? 'bg-green-100 text-green-700' : 
                                                actualStatus === 'Pending' ? 'bg-purple-100 text-purple-700' : 
                                                actualStatus === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {actualStatus}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="text-[10px] font-bold text-slate-600">
                                                <p>{q.items?.length} item{q.items?.length !== 1 ? 's' : ''}</p>
                                                <p className="text-slate-400 mt-1">Valid until: {q.validityEndDate}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Amount</p>
                                                <p className="text-2xl font-black italic text-slate-900">R{q.total?.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end flex-wrap">
                                            <button onClick={() => setViewingQuotation(q)} className="bg-slate-100 text-slate-500 p-2 rounded-lg hover:bg-slate-200 transition-colors"><FaEye size={12}/></button>
                                            <button onClick={() => deleteQuotation(q.id)} className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><FaTrash size={12}/></button>
                                        </div>
                                    </div>
                                  );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </>
        )}

      </main>

      {/* --- QUOTATION DETAIL MODAL --- */}
      {viewingQuotation && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Quotation Details</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{viewingQuotation.unit} · {viewingQuotation.quotationNumber}</p>
                    </div>
                    <button onClick={() => setViewingQuotation(null)} className="text-slate-500 hover:text-white"><FaTimes size={20}/></button>
                </div>
                
                <div ref={printRef} className="p-8 space-y-6 bg-white">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Quotation</h1>
                        <p className="text-sm font-black text-slate-600">{viewingQuotation.quotationNumber}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200">
                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Unit</p>
                            <p className="text-sm font-black text-purple-900 mt-2">{viewingQuotation.unit}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200">
                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Created</p>
                            <p className="text-sm font-black text-purple-900 mt-2">{viewingQuotation.date}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200">
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Valid Until</p>
                            <p className="text-sm font-black text-orange-900 mt-2">{viewingQuotation.validityEndDate}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Line Items</p>
                        <div className="space-y-3">
                            {viewingQuotation.items?.map((item, idx) => (
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
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Subtotal</span><span>R{viewingQuotation.subtotal?.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>VAT ({viewingQuotation.vat || 15}%)</span><span>R{(viewingQuotation.subtotal * (viewingQuotation.vat || 15) / 100)?.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xl font-black text-purple-600 uppercase mt-4"><span>Total</span><span>R{viewingQuotation.total?.toFixed(2)}</span></div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-2">
                    <div className="flex gap-2">
                        <button onClick={printQuotation} className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-slate-300 transition-all active:scale-95">
                            <FaPrint size={14} /> <span>Print</span>
                        </button>
                        <button onClick={downloadPDF} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-200 transition-all active:scale-95">
                            <FaDownload size={14} /> <span>PDF</span>
                        </button>
                    </div>
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

export default QuotationsPage;
