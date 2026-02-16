"use client";
import { useMemo, useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';
import jsPDF from 'jspdf';
import {
  FaBars,
  FaCalendarAlt,
  FaFileInvoice,
  FaTools,
  FaFilePdf,
  FaFilter,
  FaDownload
} from 'react-icons/fa';

const ReportsPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [anchorDate, setAnchorDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeMode, setRangeMode] = useState('auto');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [manualItems, setManualItems] = useState([]);
  const [manualDraft, setManualDraft] = useState({
    date: '',
    unit: '',
    issue: '',
    who: '',
    amount: ''
  });
  const [overridesEnabled, setOverridesEnabled] = useState(false);
  const [overrideAmounts, setOverrideAmounts] = useState({});

  const [maintenanceJobs, setMaintenanceJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsOpen(false);
      else setIsOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const maintenanceQuery = query(collection(db, 'maintenance'), orderBy('createdAt', 'desc'));
    const invoiceQuery = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, (snapshot) => {
      const rows = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
      setMaintenanceJobs(rows);
    });

    const unsubscribeInvoices = onSnapshot(invoiceQuery, (snapshot) => {
      const rows = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
      setInvoices(rows);
    });

    return () => {
      unsubscribeMaintenance();
      unsubscribeInvoices();
    };
  }, []);

  const toDateValue = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday start
    const start = new Date(d);
    start.setDate(d.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const getMonthRange = (date) => {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const setAutoRange = (nextAnchor, nextPeriod) => {
    const anchor = new Date(nextAnchor);
    const range = nextPeriod === 'weekly' ? getWeekRange(anchor) : getMonthRange(anchor);
    setRangeStart(range.start.toISOString().slice(0, 10));
    setRangeEnd(range.end.toISOString().slice(0, 10));
  };

  useEffect(() => {
    if (rangeMode === 'auto') {
      setAutoRange(anchorDate, period);
    }
  }, [anchorDate, period, rangeMode]);

  const handleAddManualItem = () => {
    if (!manualDraft.issue || !manualDraft.amount || !manualDraft.date) return;
    const id = `manual-${Date.now()}`;
    setManualItems((prev) => [
      ...prev,
      {
        id,
        type: 'Manual',
        date: manualDraft.date,
        unit: manualDraft.unit || 'N/A',
        issue: manualDraft.issue,
        who: manualDraft.who || 'Manual',
        amount: Number(manualDraft.amount || 0),
        status: 'Manual'
      }
    ]);
    setManualDraft({ date: '', unit: '', issue: '', who: '', amount: '' });
  };

  const handleRemoveManualItem = (id) => {
    setManualItems((prev) => prev.filter((item) => item.id !== id));
  };

  const rows = useMemo(() => {
    const startDate = rangeStart ? new Date(rangeStart) : new Date(anchorDate);
    const endDate = rangeEnd ? new Date(rangeEnd) : new Date(anchorDate);
    const range = {
      start: rangeStart ? new Date(startDate.setHours(0, 0, 0, 0)) : (period === 'weekly' ? getWeekRange(startDate).start : getMonthRange(startDate).start),
      end: rangeEnd ? new Date(endDate.setHours(23, 59, 59, 999)) : (period === 'weekly' ? getWeekRange(endDate).end : getMonthRange(endDate).end)
    };

    const maintenanceRows = maintenanceJobs.map((job) => {
      const contractor = job.contractor === 'External'
        ? `External · ${job.externalContractor || 'Unassigned'}`
        : (job.contractor || 'Unassigned');
      const amount = Number(job.totalCost || job.amount || job.charge || 0);
      const dateValue = toDateValue(job.completedAt || job.issueDate || job.createdAt || job.loggedAt);

      return {
        id: `maint-${job.id}`,
        type: 'Maintenance',
        unit: job.unit || 'N/A',
        issue: job.issue || 'Maintenance job',
        who: contractor,
        amount,
        status: job.status || 'active',
        dateValue
      };
    });

    const invoiceRows = invoices.map((inv) => {
      const amount = Number(inv.total || 0);
      // Handle GB date format (DD/MM/YYYY) from invoicing page
      let dateValue = null;
      if (inv.date && typeof inv.date === 'string') {
        const parts = inv.date.split('/');
        if (parts.length === 3) {
          dateValue = new Date(parts[2], parts[1] - 1, parts[0]);
        }
      } else {
        dateValue = toDateValue(inv.createdAt);
      }
      const issue = inv.referenceInvoice ? `Ref ${inv.referenceInvoice}` : 'Invoice';

      return {
        id: `inv-${inv.id}`,
        type: 'Invoice',
        unit: inv.unit || 'N/A',
        issue,
        who: 'Finance',
        amount,
        status: inv.status || 'Draft',
        dateValue
      };
    });

    const manualRows = manualItems.map((item) => {
      const dateValue = toDateValue(item.date);
      return {
        id: item.id,
        type: 'Manual',
        unit: item.unit,
        issue: item.issue,
        who: item.who,
        amount: item.amount,
        status: item.status,
        dateValue
      };
    });

    const combined = [...maintenanceRows, ...invoiceRows, ...manualRows];

    return combined
      .filter((row) => {
        if (sourceFilter !== 'all' && row.type.toLowerCase() !== sourceFilter) return false;
        if (!row.dateValue) return false;
        return row.dateValue >= range.start && row.dateValue <= range.end;
      })
      .filter((row) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          row.unit.toLowerCase().includes(q) ||
          row.issue.toLowerCase().includes(q) ||
          row.who.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.dateValue?.getTime?.() || 0) - (a.dateValue?.getTime?.() || 0));
  }, [maintenanceJobs, invoices, manualItems, anchorDate, period, rangeStart, rangeEnd, sourceFilter, searchQuery]);

  const totals = useMemo(() => {
    const totalAmount = rows.reduce((sum, row) => {
      const override = overrideAmounts[row.id];
      const amount = override !== undefined ? Number(override || 0) : Number(row.amount || 0);
      return sum + amount;
    }, 0);
    const maintenanceCount = rows.filter((row) => row.type === 'Maintenance').length;
    const invoiceCount = rows.filter((row) => row.type === 'Invoice').length;
    return { totalAmount, maintenanceCount, invoiceCount };
  }, [rows]);

  const handleExportPDF = () => {
    if (rows.length === 0) {
      alert("No data to export");
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 15;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;

      // Header
      pdf.setFillColor(37, 99, 235); // blue-600
      pdf.rect(margin, 8, contentWidth, 12, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('PULSE REPORT', margin + 5, 14);

      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text('Financial & Maintenance Summary', margin + 5, 19);

      yPosition = 28;

      // Summary Info
      pdf.setTextColor(71, 85, 105); // slate-700
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);
      
      const summaryStartY = yPosition;
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, margin + 5, yPosition);
      yPosition += 5;
      
      const periodText = rangeStart && rangeEnd 
        ? `Period: ${new Date(rangeStart).toLocaleDateString('en-GB')} - ${new Date(rangeEnd).toLocaleDateString('en-GB')}`
        : `Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`;
      pdf.text(periodText, margin + 5, yPosition);
      yPosition += 8;

      // Summary Stats Box
      pdf.setFillColor(241, 245, 249); // slate-100
      pdf.rect(margin, summaryStartY - 2, contentWidth, 18, 'F');
      
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(7);
      pdf.text('TOTAL AMOUNT', margin + 5, summaryStartY + 3);
      pdf.text('ITEMS COUNT', margin + 73, summaryStartY + 3);
      pdf.text('BREAKDOWN', margin + 140, summaryStartY + 3);

      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(12);
      pdf.text(`R${totals.totalAmount.toFixed(0)}`, margin + 5, summaryStartY + 10);
      pdf.text(String(rows.length), margin + 73, summaryStartY + 10);
      pdf.text(`${totals.maintenanceCount}M • ${totals.invoiceCount}I`, margin + 140, summaryStartY + 10);

      yPosition = summaryStartY + 20;

      // Table Header
      const tableTop = yPosition;
      const colWidths = [25, 20, 20, 50, 20, 25, 20];
      const headers = ['Date', 'Type', 'Unit', 'Issue', 'Who', 'Amount', 'Status'];

      pdf.setFillColor(148, 163, 184); // slate-400
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(7);

      const headerY = tableTop + 3;
      let currentX = margin;
      headers.forEach((header, idx) => {
        pdf.text(header, currentX + 1, headerY);
        currentX += colWidths[idx];
      });

      yPosition = tableTop + 7;

      // Table Rows
      pdf.setTextColor(71, 85, 105); // slate-700
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(7);

      rows.forEach((row, idx) => {
        if (yPosition > pageHeight - 15) {
          pdf.addPage();
          yPosition = 15;
        }

        // Alternating row background
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 250, 252); // slate-50
          pdf.rect(margin, yPosition - 2, contentWidth, 5, 'F');
        }

        pdf.setTextColor(71, 85, 105);
        currentX = margin;

        const colData = [
          row.dateValue ? row.dateValue.toLocaleDateString('en-GB') : 'N/A',
          row.type,
          row.unit,
          row.issue.substring(0, 35),
          row.who.substring(0, 15),
          `R${Number(row.amount || 0).toFixed(0)}`,
          row.status
        ];

        colData.forEach((data, idx) => {
          pdf.text(data || '', currentX + 1, yPosition);
          currentX += colWidths[idx];
        });

        yPosition += 5;
      });

      // Footer
      yPosition = pageHeight - 10;
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.setFontSize(7);
      pdf.setFont(undefined, 'normal');
      pdf.text('OC PULSE™ • Property Management System', pageWidth / 2, yPosition, { align: 'center' });

      // Save
      const filename = `Pulse-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans relative">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8`}>
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden bg-white p-3 rounded-xl shadow-sm text-slate-600 border border-slate-200">
              <FaBars size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Reports</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Weekly and monthly maintenance + invoices</p>
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
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setRangeMode('auto');
                }}
                className="text-[10px] font-black uppercase text-slate-700 outline-none bg-transparent"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
              <FaFilter className="text-slate-400" size={12} />
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="text-[10px] font-black uppercase text-slate-700 outline-none bg-transparent"
              >
                <option value="all">All</option>
                <option value="maintenance">Maintenance</option>
                <option value="invoice">Invoices</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <button onClick={() => setShowBuilder(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-sm">
              <FaFilter size={12} /> Report Builder
            </button>
            <button onClick={handleExportPDF} className="bg-blue-600 text-white px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-colors">
              <FaFilePdf size={12} /> Export PDF
            </button>
          </div>
        </header>

        <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Amount</p>
            <p className="text-2xl font-black text-slate-900 mt-2">R{totals.totalAmount.toFixed(0)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Maintenance Jobs</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{totals.maintenanceCount}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Invoices</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{totals.invoiceCount}</p>
          </div>
        </section>

        <div id="report-content" className="max-w-6xl mx-auto">
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between print:hidden">
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Search unit, issue, who..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-4 pr-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 ring-blue-500"
                />
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FaTools /> Maintenance + <FaFileInvoice /> Invoices
              </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] font-bold uppercase">
              <thead className="bg-slate-50 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Who</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                      No records for this period.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        {row.dateValue ? row.dateValue.toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg ${row.type === 'Maintenance' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{row.unit}</td>
                      <td className="px-4 py-3 max-w-[240px] truncate">{row.issue}</td>
                      <td className="px-4 py-3">{row.who}</td>
                      <td className="px-4 py-3">
                        {overridesEnabled ? (
                          <input
                            type="number"
                            value={overrideAmounts[row.id] ?? row.amount ?? ''}
                            onChange={(e) =>
                              setOverrideAmounts((prev) => ({
                                ...prev,
                                [row.id]: e.target.value
                              }))
                            }
                            className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-slate-700"
                          />
                        ) : (
                          `R${Number(row.amount || 0).toFixed(0)}`
                        )}
                      </td>
                      <td className="px-4 py-3">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>

            {/* PDF Footer */}
            <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">OC PULSE™ • Property Management System</p>
            </div>
          </section>
        </div>
      </main>

      {showBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">Report Builder</h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Adjust range and add manual items</p>
              </div>
              <button onClick={() => setShowBuilder(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Date Range</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={rangeStart}
                    onChange={(e) => {
                      setRangeStart(e.target.value);
                      setRangeMode('custom');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                  />
                  <input
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => {
                      setRangeEnd(e.target.value);
                      setRangeMode('custom');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setRangeMode('auto');
                      setPeriod('weekly');
                      setAutoRange(anchorDate, 'weekly');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[9px] font-black uppercase"
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => {
                      setRangeMode('auto');
                      setPeriod('monthly');
                      setAutoRange(anchorDate, 'monthly');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[9px] font-black uppercase"
                  >
                    This Month
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Override Amounts</p>
                  <p className="text-[10px] text-slate-500">Edit amounts directly in the table</p>
                </div>
                <input
                  type="checkbox"
                  checked={overridesEnabled}
                  onChange={(e) => setOverridesEnabled(e.target.checked)}
                />
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Manual Line Item</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={manualDraft.date}
                    onChange={(e) => setManualDraft((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={manualDraft.unit}
                    onChange={(e) => setManualDraft((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Issue"
                    value={manualDraft.issue}
                    onChange={(e) => setManualDraft((prev) => ({ ...prev, issue: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Who did it"
                    value={manualDraft.who}
                    onChange={(e) => setManualDraft((prev) => ({ ...prev, who: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={manualDraft.amount}
                    onChange={(e) => setManualDraft((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                  />
                  <button
                    onClick={handleAddManualItem}
                    className="bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Add Item
                  </button>
                </div>

                {manualItems.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {manualItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold">
                        <span>{item.date} · {item.unit} · {item.issue} · {item.who} · R{item.amount}</span>
                        <button onClick={() => handleRemoveManualItem(item.id)} className="text-slate-400 hover:text-red-500">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
