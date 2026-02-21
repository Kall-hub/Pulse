"use client";
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';
import jsPDF from 'jspdf';
import {
  FaBars,
  FaSearch,
  FaPlus,
  FaTimes,
  FaFilePdf,
  FaEye,
  FaEdit,
  FaTrash,
  FaCalendarAlt,
  FaFilter
} from 'react-icons/fa';

const ReportsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [anchorDate, setAnchorDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  
  // Search & Selection State
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [reportItems, setReportItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  
  // Data
  const [invoices, setInvoices] = useState([]);
  const [buildings, setBuildings] = useState([]);
  
  // PDF Viewer
  const [pdfUrl, setPdfUrl] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsOpen(false);
      else setIsOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch invoices & buildings
  useEffect(() => {
    const buildingsQuery = query(collection(db, 'buildings'));
    const invoiceQuery = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));

    const unsubscribeBuildings = onSnapshot(buildingsQuery, (snapshot) => {
      const buildingsList = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
      setBuildings(buildingsList);
    });

    const unsubscribeInvoices = onSnapshot(invoiceQuery, (snapshot) => {
      const rows = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
      setInvoices(rows);
    });

    return () => {
      unsubscribeBuildings();
      unsubscribeInvoices();
    };
  }, []);

  // Search invoices by number
  const handleSearch = (query) => {
    setSearchInput(query);
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    const results = invoices.filter(inv => 
      inv.invoiceNumber?.toString().includes(query) ||
      inv.unit?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  // Add invoice to report
  const addToReport = (invoice) => {
    if (reportItems.find(item => item.id === invoice.id)) {
      alert('Already added to report');
      return;
    }
    
    const toDateValue = (value) => {
      if (!value) return null;
      if (typeof value?.toDate === 'function') return value.toDate();
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const building = buildings.find(b => b.units?.includes(invoice.unit));
    const isInternal = building && ['Rasta', 'Johannese'].includes(building.name);

    // Extract job description from invoice items
    const jobDescription = invoice.items?.map(item => item.name).join(', ') || 'No description';

    const reportItem = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber || '',
      unit: invoice.unit || '',
      amount: Number(invoice.items?.reduce((sum, item) => sum + (item.price * item.qty), 0) || 0),
      date: toDateValue(invoice.createdAt)?.toISOString().split('T')[0] || '',
      contractor: invoice.contractor || '',
      jobDone: jobDescription,
      internal: isInternal,
      status: invoice.status || 'Draft'
    };

    setReportItems([...reportItems, reportItem]);
    setSearchInput('');
    setSearchResults([]);
  };

  // Remove from report
  const removeFromReport = (id) => {
    setReportItems(reportItems.filter(item => item.id !== id));
  };

  // Edit item
  const startEdit = (id) => {
    const item = reportItems.find(i => i.id === id);
    setEditingId(id);
    setEditingData({ ...item });
  };

  const saveEdit = () => {
    setReportItems(reportItems.map(item => 
      item.id === editingId ? editingData : item
    ));
    setEditingId(null);
  };

  // Calculate totals
  const totalAmount = reportItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Generate PDF
  const handleExportPDF = () => {
    if (reportItems.length === 0) {
      alert('Add items to report first');
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      let yPosition = margin;

      // ===== HEADER =====
      pdf.setFillColor(37, 99, 235); // blue-600
      pdf.rect(margin, yPosition, contentWidth, 18, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('INVOICE REPORT', margin + 5, yPosition + 12);
      
      pdf.setTextColor(219, 234, 254);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text(period === 'weekly' ? 'Weekly Report' : 'Monthly Report', margin + 5, yPosition + 16);

      yPosition += 26;

      // ===== PERIOD INFO =====
      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Period: ${new Date(anchorDate).toLocaleDateString('en-GB')}`, margin, yPosition);
      
      pdf.setFontSize(7);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 40, yPosition);

      yPosition += 12;

      // ===== GRAND TOTAL BOX =====
      pdf.setFillColor(59, 130, 246); // blue-500
      pdf.rect(margin, yPosition, contentWidth, 16, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      pdf.text('TOTAL REVENUE', margin + 5, yPosition + 5);
      
      pdf.setFontSize(18);
      pdf.text(`R${totalAmount.toFixed(0)}`, margin + 5, yPosition + 13);
      
      pdf.setFontSize(7);
      pdf.text(`${reportItems.length} Invoices`, pageWidth - margin - 40, yPosition + 13);

      yPosition += 24;

      // ===== TABLE STRUCTURE =====
      const tableStartY = yPosition;
      const rowHeight = 10;
      const headerHeight = 8;
      
      // Column widths optimized: Job Done(80mm) > Unit(30mm) > Date/Type/Status(25mm) > Contractor(30mm) > Amount(32mm) > Invoice(20mm)
      const columns = [
        { x: margin, width: 20, label: 'Invoice' },
        { x: margin + 20, width: 30, label: 'Unit' },
        { x: margin + 50, width: 25, label: 'Date' },
        { x: margin + 75, width: 30, label: 'Contractor' },
        { x: margin + 105, width: 80, label: 'Job Done' },
        { x: margin + 185, width: 25, label: 'Type' },
        { x: margin + 210, width: 25, label: 'Status' },
        { x: margin + 235, width: 32, label: 'Amount' }
      ];

      // ===== TABLE HEADER =====
      pdf.setFillColor(71, 85, 105); // slate-600
      pdf.rect(margin, yPosition, contentWidth, headerHeight, 'F');
      
      // Header borders
      pdf.setDrawColor(51, 65, 85);
      pdf.setLineWidth(0.3);
      columns.forEach((col) => {
        pdf.rect(col.x, yPosition, col.width, headerHeight);
      });
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(7);
      
      columns.forEach((col) => {
        pdf.text(col.label, col.x + 2, yPosition + 5.5);
      });

      yPosition += headerHeight;

      // ===== TABLE ROWS =====
      reportItems.forEach((item, idx) => {
        if (yPosition > pageHeight - 25) {
          pdf.addPage();
          yPosition = margin;
          
          // Redraw header on new page
          pdf.setFillColor(71, 85, 105);
          pdf.rect(margin, yPosition, contentWidth, headerHeight, 'F');
          pdf.setDrawColor(51, 65, 85);
          columns.forEach((col) => {
            pdf.rect(col.x, yPosition, col.width, headerHeight);
          });
          pdf.setTextColor(255, 255, 255);
          pdf.setFont(undefined, 'bold');
          pdf.setFontSize(7);
          columns.forEach((col) => {
            pdf.text(col.label, col.x + 2, yPosition + 5.5);
          });
          yPosition += headerHeight;
        }

        // Alternating row background
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
        }

        // Cell borders
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        columns.forEach((col) => {
          pdf.rect(col.x, yPosition, col.width, rowHeight);
        });

        pdf.setTextColor(71, 85, 105);
        pdf.setFontSize(7);
        pdf.setFont(undefined, 'normal');

        // Row data - 2mm padding for spacing
        pdf.text((item.invoiceNumber ? String(item.invoiceNumber) : '').substring(0, 8), columns[0].x + 2, yPosition + 6.5);
        pdf.text((item.unit || '').substring(0, 18), columns[1].x + 2, yPosition + 6.5);
        pdf.text(item.date ? new Date(item.date).toLocaleDateString('en-GB') : '', columns[2].x + 2, yPosition + 6.5);
        
        const contractor = (item.contractor || '').substring(0, 18);
        pdf.text(contractor, columns[3].x + 2, yPosition + 6.5);
        
        // Job Done - 80mm width allows ~60 characters
        const jobText = item.jobDone || '';
        const truncatedJob = jobText.length > 60 ? jobText.substring(0, 57) + ' ...' : jobText;
        pdf.text(truncatedJob, columns[4].x + 2, yPosition + 6.5);
        
        // Type (Internal/External)
        const textColor = item.internal ? [34, 197, 94] : [220, 38, 38];
        pdf.setTextColor(...textColor);
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(6.5);
        pdf.text(item.internal ? 'Internal' : 'External', columns[5].x + 2, yPosition + 6.5);

        pdf.setTextColor(71, 85, 105);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7);
        pdf.text((item.status || '').substring(0, 14), columns[6].x + 2, yPosition + 6.5);

        // Amount in blue
        pdf.setTextColor(37, 99, 235);
        pdf.setFont(undefined, 'bold');
        pdf.text(`R${Number(item.amount || 0).toFixed(0)}`, columns[7].x + 2, yPosition + 6.5);

        yPosition += rowHeight;
      });

      // ===== FOOTER =====
      yPosition = pageHeight - 8;
      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(7);
      pdf.setFont(undefined, 'normal');
      pdf.text('OC PULSE™ • Property Management System', pageWidth / 2, yPosition, { align: 'center' });

      // Save PDF
      const filename = `Pulse-Invoice-Report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    }
  };

  // Preview PDF
  const handlePreviewPDF = async () => {
    if (reportItems.length === 0) {
      alert('Add items to report first');
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      let yPosition = margin;

      pdf.setFillColor(37, 99, 235);
      pdf.rect(margin, yPosition, contentWidth, 18, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('INVOICE REPORT', margin + 5, yPosition + 12);
      
      pdf.setTextColor(219, 234, 254);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text(period === 'weekly' ? 'Weekly Report' : 'Monthly Report', margin + 5, yPosition + 16);

      yPosition += 26;

      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Period: ${new Date(anchorDate).toLocaleDateString('en-GB')}`, margin, yPosition);
      
      pdf.setFontSize(7);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 40, yPosition);

      yPosition += 12;

      pdf.setFillColor(59, 130, 246);
      pdf.rect(margin, yPosition, contentWidth, 16, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      pdf.text('TOTAL REVENUE', margin + 5, yPosition + 5);
      
      pdf.setFontSize(18);
      pdf.text(`R${totalAmount.toFixed(0)}`, margin + 5, yPosition + 13);
      
      pdf.setFontSize(7);
      pdf.text(`${reportItems.length} Invoices`, pageWidth - margin - 40, yPosition + 13);

      yPosition += 24;

      // ===== TABLE STRUCTURE =====
      const tableStartY = yPosition;
      const rowHeight = 10;
      const headerHeight = 8;
      
      // Column widths optimized: Job Done(80mm) > Unit(30mm) > Date/Type/Status(25mm) > Contractor(30mm) > Amount(32mm) > Invoice(20mm)
      const columns = [
        { x: margin, width: 20, label: 'Invoice' },
        { x: margin + 20, width: 30, label: 'Unit' },
        { x: margin + 50, width: 25, label: 'Date' },
        { x: margin + 75, width: 30, label: 'Contractor' },
        { x: margin + 105, width: 80, label: 'Job Done' },
        { x: margin + 185, width: 25, label: 'Type' },
        { x: margin + 210, width: 25, label: 'Status' },
        { x: margin + 235, width: 32, label: 'Amount' }
      ];

      // ===== TABLE HEADER =====
      pdf.setFillColor(71, 85, 105); // slate-600
      pdf.rect(margin, yPosition, contentWidth, headerHeight, 'F');
      
      // Header borders
      pdf.setDrawColor(51, 65, 85);
      pdf.setLineWidth(0.3);
      columns.forEach((col) => {
        pdf.rect(col.x, yPosition, col.width, headerHeight);
      });
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(7);
      
      columns.forEach((col) => {
        pdf.text(col.label, col.x + 2, yPosition + 5.5);
      });

      yPosition += headerHeight;

      // ===== TABLE ROWS =====
      reportItems.forEach((item, idx) => {
        if (yPosition > pageHeight - 25) {
          pdf.addPage();
          yPosition = margin;
          
          // Redraw header on new page
          pdf.setFillColor(71, 85, 105);
          pdf.rect(margin, yPosition, contentWidth, headerHeight, 'F');
          pdf.setDrawColor(51, 65, 85);
          columns.forEach((col) => {
            pdf.rect(col.x, yPosition, col.width, headerHeight);
          });
          pdf.setTextColor(255, 255, 255);
          pdf.setFont(undefined, 'bold');
          pdf.setFontSize(7);
          columns.forEach((col) => {
            pdf.text(col.label, col.x + 2, yPosition + 5.5);
          });
          yPosition += headerHeight;
        }

        // Alternating row background
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
        }

        // Cell borders
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        columns.forEach((col) => {
          pdf.rect(col.x, yPosition, col.width, rowHeight);
        });

        pdf.setTextColor(71, 85, 105);
        pdf.setFontSize(7);
        pdf.setFont(undefined, 'normal');

        // Row data - 2mm padding for spacing
        pdf.text((item.invoiceNumber ? String(item.invoiceNumber) : '').substring(0, 8), columns[0].x + 2, yPosition + 6.5);
        pdf.text((item.unit || '').substring(0, 18), columns[1].x + 2, yPosition + 6.5);
        pdf.text(item.date ? new Date(item.date).toLocaleDateString('en-GB') : '', columns[2].x + 2, yPosition + 6.5);
        
        const contractor = (item.contractor || '').substring(0, 18);
        pdf.text(contractor, columns[3].x + 2, yPosition + 6.5);
        
        // Job Done - 80mm width allows ~60 characters
        const jobText = item.jobDone || '';
        const truncatedJob = jobText.length > 60 ? jobText.substring(0, 57) + '...' : jobText;
        pdf.text(truncatedJob, columns[4].x + 2, yPosition + 6.5);
        
        // Type (Internal/External)
        const textColor = item.internal ? [34, 197, 94] : [220, 38, 38];
        pdf.setTextColor(...textColor);
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(6.5);
        pdf.text(item.internal ? 'Internal' : 'External', columns[5].x + 2, yPosition + 6.5);

        pdf.setTextColor(71, 85, 105);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7);
        pdf.text((item.status || '').substring(0, 14), columns[6].x + 2, yPosition + 6.5);

        // Amount in blue
        pdf.setTextColor(37, 99, 235);
        pdf.setFont(undefined, 'bold');
        pdf.text(`R${Number(item.amount || 0).toFixed(0)}`, columns[7].x + 2, yPosition + 6.5);

        yPosition += rowHeight;
      });

      yPosition = pageHeight - 8;
      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(7);
      pdf.setFont(undefined, 'normal');
      pdf.text('OC PULSE™ • Property Management System', pageWidth / 2, yPosition, { align: 'center' });

      const dataUrl = pdf.output('dataurlstring');
      setPdfUrl(dataUrl);
      setShowPdfViewer(true);
    } catch (error) {
      console.error('Error previewing PDF:', error);
      alert('Error previewing PDF');
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans relative">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8`}>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden bg-white p-3 rounded-xl shadow-sm text-slate-600 border border-slate-200">
              <FaBars size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Invoice Reports</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Search & build monthly/weekly reports</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
              <FaCalendarAlt className="text-slate-400" size={12} />
              <input
                type="date"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
                className="text-[10px] font-black uppercase text-slate-700 outline-none"
              />
            </div>
            <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
              <FaFilter className="text-slate-400" size={12} />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="text-[10px] font-black uppercase text-slate-700 outline-none bg-transparent"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SEARCH SECTION */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-8">
              <h2 className="text-lg font-black uppercase text-slate-900 mb-4">Search Invoices</h2>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Invoice # or Unit..."
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1 bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-bold outline-none border border-slate-200 focus:border-blue-500"
                />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                  <FaSearch size={12} />
                </button>
              </div>

              {/* Search Results */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.length === 0 && searchInput && (
                  <p className="text-[9px] text-slate-400 text-center py-4">No invoices found</p>
                )}
                
                {searchResults.map((invoice) => (
                  <div key={invoice.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 hover:border-blue-400 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[9px] font-black text-slate-900">#{invoice.invoiceNumber}</p>
                        <p className="text-[8px] text-slate-500">{invoice.unit}</p>
                      </div>
                      <button
                        onClick={() => addToReport(invoice)}
                        className="bg-blue-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FaPlus size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* REPORT BUILDER SECTION */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black uppercase text-slate-900">Report Items ({reportItems.length})</h2>
                <div className="text-2xl font-black text-blue-600">R{totalAmount.toFixed(0)}</div>
              </div>

              {reportItems.length === 0 ? (
                <p className="text-[9px] text-slate-400 text-center py-8">Search and add invoices to build your report</p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {reportItems.map((item) => (
                      <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        {editingId === item.id ? (
                          // EDIT MODE
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={editingData.invoiceNumber}
                                onChange={(e) => setEditingData({...editingData, invoiceNumber: e.target.value})}
                                placeholder="Invoice No"
                                className="bg-white px-3 py-2 rounded-lg text-[10px] border border-slate-200 outline-none focus:border-blue-500"
                              />
                              <input
                                type="text"
                                value={editingData.unit}
                                onChange={(e) => setEditingData({...editingData, unit: e.target.value})}
                                placeholder="Unit"
                                className="bg-white px-3 py-2 rounded-lg text-[10px] border border-slate-200 outline-none focus:border-blue-500"
                              />
                              <input
                                type="date"
                                value={editingData.date}
                                onChange={(e) => setEditingData({...editingData, date: e.target.value})}
                                className="bg-white px-3 py-2 rounded-lg text-[10px] border border-slate-200 outline-none focus:border-blue-500"
                              />
                              <input
                                type="text"
                                value={editingData.contractor}
                                onChange={(e) => setEditingData({...editingData, contractor: e.target.value})}
                                placeholder="Contractor"
                                className="bg-white px-3 py-2 rounded-lg text-[10px] border border-slate-200 outline-none focus:border-blue-500"
                              />
                              <input
                                type="text"
                                value={editingData.jobDone || ''}
                                onChange={(e) => setEditingData({...editingData, jobDone: e.target.value})}
                                placeholder="Job Done"
                                className="bg-white px-3 py-2 rounded-lg text-[10px] border border-slate-200 outline-none focus:border-blue-500 col-span-2"
                              />
                              <input
                                type="number"
                                value={editingData.amount}
                                onChange={(e) => setEditingData({...editingData, amount: Number(e.target.value)})}
                                placeholder="Amount"
                                className="bg-white px-3 py-2 rounded-lg text-[10px] border border-slate-200 outline-none focus:border-blue-500"
                              />
                              <select
                                value={editingData.internal ? 'internal' : 'external'}
                                onChange={(e) => setEditingData({...editingData, internal: e.target.value === 'internal'})}
                                className="bg-white px-3 py-2 rounded-lg text-[10px] border border-slate-200 outline-none focus:border-blue-500"
                              >
                                <option value="internal">Internal</option>
                                <option value="external">External</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={saveEdit}
                                className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-green-700 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="flex-1 bg-slate-400 text-white px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-slate-500 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // VIEW MODE
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-[10px] font-black text-slate-900">#{item.invoiceNumber}</p>
                                <p className="text-[9px] text-slate-600">{item.unit} • {item.date}</p>
                                <p className="text-[8px] text-slate-500 mt-1">{item.contractor}</p>
                                <p className="text-[8px] text-slate-400 mt-1 italic">{item.jobDone}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black text-blue-600">R{Number(item.amount || 0).toFixed(0)}</p>
                                <span className={`text-[8px] font-bold px-2 py-1 rounded ${item.internal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {item.internal ? 'Internal' : 'External'}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => startEdit(item.id)}
                                className="flex-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                              >
                                <FaEdit size={10} /> Edit
                              </button>
                              <button
                                onClick={() => removeFromReport(item.id)}
                                className="flex-1 bg-red-600 text-white px-3 py-1 rounded-lg text-[9px] font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                              >
                                <FaTrash size={10} /> Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handlePreviewPDF}
                      className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                      <FaEye size={14} /> Preview
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                    >
                      <FaFilePdf size={14} /> Download
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* PDF VIEWER MODAL */}
      {showPdfViewer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-96 overflow-hidden">
            <div className="flex justify-between items-center bg-slate-900 text-white p-4">
              <h3 className="font-black uppercase text-sm">PDF Preview</h3>
              <button
                onClick={() => setShowPdfViewer(false)}
                className="hover:bg-slate-800 p-2 rounded transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                className="w-full h-80"
                style={{ border: 'none' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
