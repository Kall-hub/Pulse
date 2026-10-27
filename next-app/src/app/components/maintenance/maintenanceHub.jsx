import IssueCategoryEditor from './IssueCategoryEditor';
import { issueCategorySource } from '@/utils/maintenanceInsights';
import IssueWatch from './IssueWatch';
import React, { useEffect, useState } from 'react';
import { FaTools, FaPlus, FaCheckCircle, FaClock, FaPaperPlane, FaTrash } from 'react-icons/fa';
import { db } from '@/app/Config/firebaseConfig';
import { auth } from '@/app/Config/firebaseConfig';
import { addDoc, collection, onSnapshot, updateDoc, deleteDoc, doc, query, where, serverTimestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function MaintenanceHub({ onTicketsChange }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  useEffect(() => onAuthStateChanged(auth, async currentUser => {
    setUser(currentUser);
    if (!currentUser) { setUserRole(''); return; }
    try {
      const profile = await getDoc(doc(db, 'stuff', currentUser.uid));
      setUserRole(profile.exists() ? profile.data().role || '' : '');
    } catch (err) { console.error('Failed to load maintenance account role:', err); setUserRole(''); }
  }), []);

  useEffect(() => {
    if (!user) { setTickets([]); setLoading(false); return; }
    setLoading(true);
    const ticketsQuery = userRole === 'PQA'
      ? collection(db, 'tickets')
      : query(collection(db, 'tickets'), where('ownerUid', '==', user.uid));
    return onSnapshot(ticketsQuery, (snapshot) => {
    const visibleTickets = userRole === 'PQA'
      ? snapshot.docs.filter(ticketDoc => !ticketDoc.data().ownerUid || ticketDoc.data().ownerUid === user.uid)
      : snapshot.docs;
    const loaded = visibleTickets.map(ticketDoc => {
      const data = ticketDoc.data();
      if (userRole === 'PQA' && !data.ownerUid) {
        updateDoc(doc(db, 'tickets', ticketDoc.id), { ownerUid: user.uid }).catch(migrationError => {
          console.error('Could not restore legacy ticket ownership:', migrationError);
        });
      }
      return {
        ...data,
        ownerUid: data.ownerUid || (userRole === 'PQA' ? user.uid : ''),
        status: data.status || 'Open',
        amount: Number(data.amount) || 0,
        invoiceNumber: data.invoiceNumber || '',
        faults: Array.isArray(data.faults) ? data.faults : [],
        suppliersList: Array.isArray(data.suppliersList) ? data.suppliersList : [],
        trail: Array.isArray(data.trail) ? data.trail : [],
        id: ticketDoc.id
      };
    });
    loaded.sort((a, b) => String(b.createdDate || '').localeCompare(String(a.createdDate || '')));
    setTickets(loaded);
    onTicketsChange?.(loaded);
    setLoading(false);
  }, (loadError) => {
    console.error('Failed to load maintenance tickets:', loadError);
    setError('Maintenance tickets could not be loaded. Please try again.');
    setLoading(false);
  });
  }, [user, userRole, onTicketsChange]);

  const [isCreating, setIsCreating] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const selectedTicket = tickets.find(ticket => ticket.id === selectedTicketId) || tickets[0] || null;
  
  // New ticket state
  const [newTicket, setNewTicket] = useState({
    ticketNumber: '',
    property: '',
    faults: [''],
    createdDate: new Date().toISOString().split('T')[0],
    supplier: '',
    contractor: ''
  });

  // State for adding financial amounts/invoices mid-ticket
  const [isAddingFinancials, setIsAddingFinancials] = useState(false);
  const [financialInput, setFinancialInput] = useState({ amount: '', invoiceNumber: '' });

  // State for adding progressive suppliers & trip counts mid-ticket
  const [isAddingSupplierModal, setIsAddingSupplierModal] = useState(false);
  const [supplierInput, setSupplierInput] = useState({ name: '', visits: 1 });

  const [newNoteText, setNewNoteText] = useState('');
  const [selectedTag, setSelectedTag] = useState('email sent to owner');

  const availableTags = [
    'ticket logged', 'email sent to marketing', 'email sent to finance', 'email sent to tenant',
    'email sent to owner', 'create a quote', 'quote sent', 'create invoice', 
    'invoice sent to finance', 'ticket maintenance sorted', 'ticket maintenance postponed', 
    'waiting for owner', 'waiting for tenant'
  ];

  const usedTags = selectedTicket ? (selectedTicket.trail || []).map(t => t.tag) : [];

  // Handlers for dynamic faults in modal
  const handleAddFaultField = () => {
    setNewTicket({ ...newTicket, faults: [...newTicket.faults, ''] });
  };

  const handleFaultChange = (index, value) => {
    const updatedFaults = [...newTicket.faults];
    updatedFaults[index] = value;
    setNewTicket({ ...newTicket, faults: updatedFaults });
  };

  const handleRemoveFaultField = (index) => {
    const updatedFaults = newTicket.faults.filter((_, i) => i !== index);
    setNewTicket({ ...newTicket, faults: updatedFaults.length > 0 ? updatedFaults : [''] });
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    const cleanFaults = newTicket.faults.map(f => f.trim()).filter(Boolean);
    if (!user || !newTicket.property || cleanFaults.length === 0) return;

    const chosenSupplier = newTicket.supplier.trim();

    const created = {
      ownerUid: user.uid,
      createdAt: serverTimestamp(),
      displayId: newTicket.ticketNumber.trim() || `TCK-${Date.now()}`,
      property: newTicket.property,
      faults: cleanFaults,
      status: 'Open',
      createdDate: newTicket.createdDate,
      amount: 0.00,
      invoiceNumber: '',
      suppliersList: chosenSupplier ? [{ id: Date.now(), name: chosenSupplier, visits: 1 }] : [],
      contractor: newTicket.contractor.trim(),
      trail: [
        { id: Date.now(), type: 'note', text: `Ticket logged with ${cleanFaults.length} initial fault(s).`, timestamp: new Date().toLocaleString('en-ZA'), tag: 'ticket logged' }
      ]
    };

    try {
      const createdRef = await addDoc(collection(db, 'tickets'), created);
      setSelectedTicketId(createdRef.id);
      setError('');
      setIsCreating(false);
      setNewTicket({ ticketNumber: '', property: '', faults: [''], createdDate: new Date().toISOString().split('T')[0], supplier: '', contractor: '' });
    } catch (saveError) {
      console.error('Failed to create maintenance ticket:', saveError);
      setError('Ticket could not be saved. Please try again.');
    }
  };

  const saveTicket = async (ticket) => {
    try {
      const { id, ...data } = ticket;
      await updateDoc(doc(db, 'tickets', id), data);
      setError('');
    } catch (saveError) {
      console.error('Failed to update maintenance ticket:', saveError);
      setError('Ticket update could not be saved. Please try again.');
    }
  };

  const handleDeleteTicket = async (event, ticket) => {
    event.stopPropagation();
    if (!user || ticket.ownerUid !== user.uid) return;
    if (!window.confirm(`Delete ticket ${ticket.displayId || ticket.id} for ${ticket.property}? This cannot be undone.`)) return;

    try {
      const ticketRef = doc(db, 'tickets', ticket.id);
      // Claim older PQA-created records before deleting them under the owner rule.
      if (userRole === 'PQA') await updateDoc(ticketRef, { ownerUid: user.uid });
      await deleteDoc(ticketRef);
      if (selectedTicketId === ticket.id) setSelectedTicketId(null);
      setError('');
    } catch (deleteError) {
      console.error('Failed to delete maintenance ticket:', deleteError);
      setError('Ticket could not be deleted. Please try again.');
    }
  };

  const handleAddFinancials = async (e) => {
    e.preventDefault();
    if (!financialInput.amount && !financialInput.invoiceNumber) return;

    const amountNum = parseFloat(financialInput.amount) || selectedTicket.amount;
    const invNum = financialInput.invoiceNumber.trim() || selectedTicket.invoiceNumber;

    const updatedTrailItem = {
      id: Date.now(),
      type: 'note',
      text: `Updated financials — Amount: R ${amountNum.toLocaleString()} | Invoice: ${invNum || 'N/A'}`,
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tag: 'create invoice'
    };

    const updatedTicket = {
      ...selectedTicket,
      amount: amountNum,
      invoiceNumber: invNum,
      trail: [...(selectedTicket.trail || []), updatedTrailItem]
    };

    await saveTicket(updatedTicket);
    setFinancialInput({ amount: '', invoiceNumber: '' });
    setIsAddingFinancials(false);
  };

  const handleAddSupplierProgressive = async (e) => {
    e.preventDefault();
    if (!supplierInput.name.trim()) return;

    const newSupplierEntry = {
      id: Date.now(),
      name: supplierInput.name.trim(),
      visits: parseInt(supplierInput.visits) || 1
    };

    const updatedSuppliers = [...(selectedTicket.suppliersList || []), newSupplierEntry];

    const updatedTrailItem = {
      id: Date.now(),
      type: 'note',
      text: `Added supplier: ${newSupplierEntry.name} (Trips/Visits: ${newSupplierEntry.visits})`,
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tag: 'waiting for owner'
    };

    const updatedTicket = {
      ...selectedTicket,
      suppliersList: updatedSuppliers,
      trail: [...(selectedTicket.trail || []), updatedTrailItem]
    };

    await saveTicket(updatedTicket);
    setSupplierInput({ name: '', visits: 1 });
    setIsAddingSupplierModal(false);
  };

  const handleAddTrailNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || usedTags.includes(selectedTag)) return;

    const updatedTrail = [
      ...selectedTicket.trail,
      {
        id: Date.now(),
        type: 'note',
        text: newNoteText,
        timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tag: selectedTag
      }
    ];

    const updatedTicket = { ...selectedTicket, trail: updatedTrail };
    await saveTicket(updatedTicket);
    setNewNoteText('');

    const nextAvailable = availableTags.find(tag => !updatedTrail.some(tr => tr.tag === tag));
    if (nextAvailable) setSelectedTag(nextAvailable);
  };

  const handleCloseTicket = async (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const updatedTicket = {
          ...ticket,
          status: 'Closed',
          trail: [
            ...(ticket.trail || []),
            {
              id: Date.now(),
              type: 'note',
              text: 'Ticket marked as Closed & Resolved.',
              timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              tag: 'ticket maintenance sorted'
            }
          ]
        };
    await saveTicket(updatedTicket);
  };

  return (
    <div className="space-y-4">
      <IssueWatch tickets={tickets} onSelectTicket={setSelectedTicketId} loading={loading} />
      
      {/* Pulse PA Proactive Bar */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white px-4 py-3 rounded-xl shadow-sm border border-blue-800 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold shadow-inner flex-shrink-0">
            <FaTools size={14} />
          </div>
          <div>
          <h3 className="text-[11px] font-black tracking-wide uppercase text-blue-300">Maintenance Ticket Tracking</h3>
            <p className="text-[11px] text-slate-300 leading-tight">Record issues, suppliers, invoices, and ticket progress.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0"
        >
          <FaPlus size={10} /> Log Ticket
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Tickets Queue */}
        <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h4 className="text-[11px] font-black uppercase text-gray-800 tracking-wider">Maintenance Queue</h4>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {tickets.filter(t => t.status === 'Open').length} Open
            </span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {loading ? <p className="py-8 text-center text-xs text-gray-500">Loading maintenance tickets…</p> : tickets.length === 0 ? <p className="py-8 text-center text-xs text-gray-500">No maintenance tickets yet.</p> : tickets.map(ticket => {
              const isOpen = ticket.status === 'Open';
              const isSelected = selectedTicket?.id === ticket.id;

              return (
                <div 
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicketId(ticket.id);
                    const used = ticket.trail.map(tr => tr.tag);
                    const firstFree = availableTags.find(tag => !used.includes(tag));
                    if (firstFree) setSelectedTag(firstFree);
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50/40 shadow-sm' 
                      : 'border-gray-100 bg-gray-50/40 hover:bg-gray-100/80'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-gray-400">{ticket.displayId || ticket.id}</span>
                      <h5 className="text-[11px] font-bold text-gray-900 leading-tight">{ticket.property}</h5>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        isOpen ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {ticket.status}
                      </span>
                      {ticket.ownerUid === user?.uid && <button
                        type="button"
                        onClick={event => handleDeleteTicket(event, ticket)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                        title="Delete this ticket"
                        aria-label={`Delete ticket ${ticket.displayId || ticket.id}`}
                      ><FaTrash size={11} /></button>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(ticket.faults || []).map((f, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-white text-gray-600 border border-gray-200 rounded text-[9px] font-medium">
                        {f}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pt-1.5 border-t border-gray-100">
                    <span>{ticket.createdDate}</span>
                    <span className="font-bold text-gray-900">R {Number(ticket.amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Smart Notebook Trail & Financial Controller */}
        <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              {selectedTicket ? (
            <div className="space-y-4">
              
              {/* Ticket Header & Action Toggles */}
              <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-gray-900">{selectedTicket.displayId || selectedTicket.id}</h3>
                    <span className="text-[11px] font-bold text-gray-500">— {selectedTicket.property}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5 space-y-0.5">
                    <div>
                      Suppliers: <strong className="text-gray-800">
                        {selectedTicket.suppliersList && selectedTicket.suppliersList.length > 0 
                          ? selectedTicket.suppliersList.map(s => `${s.name} (${s.visits} trip${s.visits > 1 ? 's' : ''})`).join(', ') 
                          : 'None'}
                      </strong>
                    </div>
                    <div>
                      Inv: <strong className="text-gray-800 font-mono">{selectedTicket.invoiceNumber || 'None yet'}</strong> | 
                      Total: <strong className="text-blue-600 font-mono">R {Number(selectedTicket.amount || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setIsAddingSupplierModal(!isAddingSupplierModal)}
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all border border-indigo-200"
                    >
                      {isAddingSupplierModal ? 'Cancel Sup' : '+ Add Supplier/Trip'}
                    </button>
                    <button 
                      onClick={() => setIsAddingFinancials(!isAddingFinancials)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all border border-slate-200"
                    >
                      {isAddingFinancials ? 'Cancel Inv' : '+ Add Amount/Inv'}
                    </button>
                  </div>

                  {selectedTicket.status === 'Open' ? (
                    <button 
                      onClick={() => handleCloseTicket(selectedTicket.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1"
                    >
                      <FaCheckCircle size={9} /> Close Ticket
                    </button>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[9px] font-bold flex items-center gap-1">
                      <FaCheckCircle size={9} /> Resolved
                    </span>
                  )}
                </div>
              </div>

              <IssueCategoryEditor key={`${selectedTicket.id}-${issueCategorySource(selectedTicket)}-${JSON.stringify(selectedTicket.issueCategories)}-${selectedTicket.issueCategoriesConfirmed}`} ticket={selectedTicket} user={user} />

              {/* Inline Form to Add Suppliers & Trip Count Anytime */}
              {isAddingSupplierModal && (
                <form onSubmit={handleAddSupplierProgressive} className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-200 space-y-2">
                  <h5 className="text-[10px] font-black uppercase text-indigo-900">Add Supplier & Track Trip Quantity</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-0.5">Supplier Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Builders Warehouse" 
                        value={supplierInput.name}
                        onChange={(e) => setSupplierInput({...supplierInput, name: e.target.value})}
                        required
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-[11px] text-gray-900 outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-0.5">Trip Quantity</label>
                      <input 
                        type="number" 
                        min="1"
                        value={supplierInput.visits}
                        onChange={(e) => setSupplierInput({...supplierInput, visits: e.target.value})}
                        required
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-[11px] text-gray-900 outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-sm">
                      Save Supplier & Trips
                    </button>
                  </div>
                </form>
              )}

              {/* Inline Form to Add Amount & Invoice Number Anytime (Fixed text visibility) */}
              {isAddingFinancials && (
                <form onSubmit={handleAddFinancials} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <h5 className="text-[10px] font-black uppercase text-slate-700">Update Ticket Financials & Invoice</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-0.5">Invoice Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. INV-2026-89" 
                        value={financialInput.invoiceNumber}
                        onChange={(e) => setFinancialInput({...financialInput, invoiceNumber: e.target.value})}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-[11px] text-gray-900 outline-none focus:border-blue-500 font-mono font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-gray-600 mb-0.5">Amount (R)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 1250" 
                        value={financialInput.amount}
                        onChange={(e) => setFinancialInput({...financialInput, amount: e.target.value})}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-[11px] text-gray-900 outline-none focus:border-blue-500 font-mono font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-sm">
                      Save Financial Update
                    </button>
                  </div>
                </form>
              )}

              {/* Timeline Trail */}
              <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Smart Audit & Action Trail</h4>
                
                <div className="relative pl-5 space-y-3 max-h-[180px] overflow-y-auto pr-1 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100">
                  {(selectedTicket.trail || []).map((item, idx) => (
                    <div key={item.id || idx} className="relative group">
                      <span className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm"></span>

                      <div className="bg-gray-50/80 p-2.5 rounded-lg border border-gray-200/80 shadow-sm space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-100 text-blue-800">
                            🏷️ {item.tag}
                          </span>
                          <span className="text-[9px] font-mono text-gray-400 flex items-center gap-1">
                            <FaClock size={9} /> {item.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-800 font-medium leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Note & Tag Picker */}
              {selectedTicket.status === 'Open' && (
                <form onSubmit={handleAddTrailNote} className="space-y-2.5 pt-3 border-t border-gray-100">
                  <label className="block text-[9px] font-black uppercase text-gray-500">Add Action Note & Select Tag</label>
                  
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 bg-gray-50 rounded-lg border border-gray-200">
                    {availableTags.map(tag => {
                      const isUsed = usedTags.includes(tag);
                      const isSelected = selectedTag === tag;

                      return (
                        <button
                          key={tag}
                          type="button"
                          disabled={isUsed}
                          onClick={() => !isUsed && setSelectedTag(tag)}
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${
                            isUsed 
                              ? 'bg-gray-200 text-gray-400 line-through cursor-not-allowed opacity-50 border border-gray-300' 
                              : isSelected 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {tag} {isUsed && '✓'}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Write maintenance progress note..." 
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[11px] text-gray-800 outline-none focus:border-blue-500 font-medium"
                    />
                    <button 
                      type="submit"
                      disabled={usedTags.includes(selectedTag)}
                      className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 ${
                        usedTags.includes(selectedTag) 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <FaPaperPlane size={10} /> Post
                    </button>
                  </div>
                </form>
              )}

            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center text-gray-400">
              <p className="text-[11px]">Select a maintenance ticket from the queue to view its connected timeline trail.</p>
            </div>
          )}
        </div>

      </div>

      {/* Create Ticket Modal with Dynamic Multi-Fault Inputs & Supplier Defaulting to "None" */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-900 uppercase">Create Maintenance Ticket</h3>
              <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-0.5">Ticket ID (optional)</label>
                  <input 
                    type="text" 
                    value={newTicket.ticketNumber} 
                    onChange={(e) => setNewTicket({...newTicket, ticketNumber: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] font-mono text-gray-800 outline-none focus:border-blue-500 font-bold" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-0.5">Creation Date</label>
                  <input type="date" value={newTicket.createdDate} onChange={(e) => setNewTicket({...newTicket, createdDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] text-gray-800" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-500 mb-0.5">Property Name / Unit *</label>
                <input type="text" placeholder="e.g. Duncan Court, Unit 402" value={newTicket.property} onChange={(e) => setNewTicket({...newTicket, property: e.target.value})} required className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[11px] text-gray-800 outline-none focus:border-blue-500" />
              </div>

              {/* Dynamic Faults Section */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[9px] font-bold uppercase text-gray-500">Faults / Issues (Add as many as needed) *</label>
                  <button 
                    type="button" 
                    onClick={handleAddFaultField} 
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <FaPlus size={8} /> Add Fault
                  </button>
                </div>
                
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {newTicket.faults.map((fault, index) => (
                    <div key={index} className="flex gap-1.5 items-center">
                      <input 
                        type="text" 
                        placeholder={`Fault #${index + 1} (e.g. Leaking tap)`} 
                        value={fault} 
                        onChange={(e) => handleFaultChange(index, e.target.value)} 
                        required 
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] text-gray-800 outline-none focus:border-blue-500" 
                      />
                      {newTicket.faults.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveFaultField(index)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FaTrash size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-0.5">Supplier (Leave blank = None)</label>
                  <input type="text" placeholder="e.g. Plumblink" value={newTicket.supplier} onChange={(e) => setNewTicket({...newTicket, supplier: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-800" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-0.5">Contractor</label>
                  <input type="text" value={newTicket.contractor} onChange={(e) => setNewTicket({...newTicket, contractor: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-800" />
                </div>
              </div>

              <p className="text-[9px] text-gray-400 italic">Tip: You can add more suppliers, trip counts, and invoices progressively once the ticket is created.</p>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-sm">Save Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
