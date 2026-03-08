
"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../Config/firebaseConfig";
import jsPDF from "jspdf";
import {
  FaBars,
  FaCalendarAlt,
  FaChartLine,
  FaEdit,
  FaFilePdf,
  FaFilter,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrash
} from "react-icons/fa";

const money = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const monthKey = (dateValue) => {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toISODate = (value) => {
  const d = toDate(value);
  return d ? d.toISOString().slice(0, 10) : "";
};

const startOfWeek = (dateValue) => {
  const d = new Date(dateValue);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfWeek = (dateValue) => {
  const start = startOfWeek(dateValue);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const buildPrefixTokens = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return [];
  const max = Math.min(12, text.length);
  const tokens = [];
  for (let i = 1; i <= max; i += 1) tokens.push(text.slice(0, i));
  return tokens;
};

const buildInvoiceSearchTokens = (invoice) => {
  const fields = [
    invoice.invoiceNumber,
    invoice.ownerInvoiceNumber,
    invoice.contractorInvoiceNumber,
    invoice.supplierInvoiceNumber,
    invoice.externalInvoiceNumber,
    invoice.invoiceNo,
    invoice.invoice_no,
    invoice.refNo,
    invoice.reference,
    invoice.unit,
    invoice.client,
    invoice.clientName,
    invoice.contractor
  ];

  const tokenSet = new Set();
  fields.forEach((field) => buildPrefixTokens(field).forEach((t) => tokenSet.add(t)));
  return Array.from(tokenSet);
};

const GlassPanel = ({ className = "", children }) => (
  <div
    className={`glass-flash relative overflow-hidden rounded-2xl border border-white/35 bg-white/70 backdrop-blur-2xl shadow-[0_10px_35px_rgba(15,23,42,0.30)] ${className}`}
  >
    <div className="pointer-events-none absolute -top-12 right-0 h-24 w-44 rounded-full bg-white/60 blur-2xl" />
    <div className="pointer-events-none absolute -bottom-12 -left-6 h-24 w-24 rounded-full bg-cyan-200/30 blur-2xl" />
    <div className="relative">{children}</div>
  </div>
);

const ReportsPage = () => {
  const backgroundImages = [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2200&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2200&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2200&q=80",
    "https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=2200&q=80",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2200&q=80"
  ];
  const [bgIndex, setBgIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [activeView, setActiveView] = useState("weekly");
  const [period, setPeriod] = useState("weekly");
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rangeFrom, setRangeFrom] = useState(() => startOfWeek(new Date()).toISOString().slice(0, 10));
  const [rangeTo, setRangeTo] = useState(() => endOfWeek(new Date()).toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [searchInput, setSearchInput] = useState("");
  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [isSearchingInvoices, setIsSearchingInvoices] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reportItems, setReportItems] = useState([]);
  const [reportTitle, setReportTitle] = useState("");
  const [savedReports, setSavedReports] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});

  const [manualEntry, setManualEntry] = useState({
    date: new Date().toISOString().slice(0, 10),
    ownerInvoiceNumber: "",
    contractorInvoiceNumber: "",
    client: "",
    type: "internal",
    description: "",
    unit: "",
    amount: "",
    cost: ""
  });

  const [invoices, setInvoices] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [pdfUrl, setPdfUrl] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsOpen(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const buildingsQuery = query(collection(db, "buildings"));
    const invoiceQuery = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    const reportsQuery = query(collection(db, "savedReports"), orderBy("createdAt", "desc"));

    const unsubscribeBuildings = onSnapshot(buildingsQuery, (snapshot) => {
      setBuildings(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });

    const unsubscribeInvoices = onSnapshot(invoiceQuery, (snapshot) => {
      setInvoices(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });

    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      setSavedReports(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });

    return () => {
      unsubscribeBuildings();
      unsubscribeInvoices();
      unsubscribeReports();
    };
  }, []);

  useEffect(() => {
    if (activeView === "weekly") setPeriod("weekly");
    if (activeView === "monthly") setPeriod("monthly");
  }, [activeView]);

  useEffect(() => {
    const id = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [backgroundImages.length]);

  useEffect(() => {
    if (period === "weekly") {
      const weekStart = startOfWeek(anchorDate).toISOString().slice(0, 10);
      const weekEnd = endOfWeek(anchorDate).toISOString().slice(0, 10);
      setRangeFrom(weekStart);
      setRangeTo(weekEnd);
    } else {
      const monthStart = `${selectedMonth}-01`;
      const monthEndDate = new Date(`${selectedMonth}-01`);
      monthEndDate.setMonth(monthEndDate.getMonth() + 1);
      monthEndDate.setDate(0);
      setRangeFrom(monthStart);
      setRangeTo(monthEndDate.toISOString().slice(0, 10));
    }
  }, [period, anchorDate, selectedMonth]);

  const filteredInvoices = useMemo(() => {
    const from = toDate(rangeFrom);
    const to = toDate(rangeTo);
    const queryText = searchInput.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const date = toDate(invoice.date) || toDate(invoice.createdAt);
      if (!date) return false;

      if (from && date < from) return false;
      if (to) {
        const endDay = new Date(to);
        endDay.setHours(23, 59, 59, 999);
        if (date > endDay) return false;
      }

      const haystack = [
        invoice.invoiceNumber,
        invoice.ownerInvoiceNumber,
        invoice.invoiceNo,
        invoice.invoice_no,
        invoice.refNo,
        invoice.reference,
        invoice.contractorInvoiceNumber,
        invoice.supplierInvoiceNumber,
        invoice.externalInvoiceNumber,
        invoice.unit,
        invoice.client,
        invoice.clientName,
        invoice.contractor
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return queryText ? haystack.includes(queryText) : true;
    });
  }, [invoices, rangeFrom, rangeTo, searchInput]);

  useEffect(() => {
    const term = searchInput.trim();

    if (!term) {
      setLiveSearchResults([]);
      setIsSearchingInvoices(false);
      return;
    }

    let isMounted = true;
    const runSearch = async () => {
      setIsSearchingInvoices(true);
      try {
        const numericTerm = Number(term);
        const normalizedTerm = term.toLowerCase();
        const searchQueries = [
          query(collection(db, "invoices"), where("searchTokens", "array-contains", normalizedTerm)),
          query(collection(db, "invoices"), where("invoiceNumber", "==", term)),
          query(collection(db, "invoices"), where("ownerInvoiceNumber", "==", term)),
          query(collection(db, "invoices"), where("contractorInvoiceNumber", "==", term)),
          query(collection(db, "invoices"), where("supplierInvoiceNumber", "==", term)),
          query(collection(db, "invoices"), where("externalInvoiceNumber", "==", term))
        ];
        if (Number.isFinite(numericTerm)) {
          searchQueries.push(query(collection(db, "invoices"), where("invoiceNumber", "==", numericTerm)));
        }

        const snapshots = await Promise.all(searchQueries.map((qRef) => getDocs(qRef)));
        if (!isMounted) return;

        const byId = {};
        snapshots.forEach((snap) => {
          snap.docs.forEach((d) => {
            byId[d.id] = { id: d.id, ...d.data() };
          });
        });

        setLiveSearchResults(Object.values(byId));
      } catch (error) {
        console.error("Invoice DB search failed:", error);
        if (isMounted) setLiveSearchResults([]);
      } finally {
        if (isMounted) setIsSearchingInvoices(false);
      }
    };

    runSearch();
    return () => {
      isMounted = false;
    };
  }, [searchInput]);

  const visibleInvoices = useMemo(() => {
    if (!searchInput.trim()) return filteredInvoices;

    if (liveSearchResults.length > 0) return liveSearchResults;

    return invoices.filter((invoice) => {
      const haystack = [
        invoice.invoiceNumber,
        invoice.ownerInvoiceNumber,
        invoice.invoiceNo,
        invoice.invoice_no,
        invoice.refNo,
        invoice.reference,
        invoice.contractorInvoiceNumber,
        invoice.supplierInvoiceNumber,
        invoice.externalInvoiceNumber,
        invoice.unit,
        invoice.client,
        invoice.clientName,
        invoice.contractor
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchInput.trim().toLowerCase());
    });
  }, [searchInput, filteredInvoices, liveSearchResults, invoices]);

  const buildReportItemFromInvoice = (invoice) => {
    const building = buildings.find((b) => b.units?.includes(invoice.unit));
    const internalByBuilding = Boolean(building && ["Rasta", "Johannese"].includes(building.name));
    const amount = Number(
      invoice.items?.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0) ||
        invoice.total ||
        0
    );

    const cost = Number(
      invoice.items?.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.qty || 0), 0) ||
        invoice.cost ||
        0
    );

    return {
      id: invoice.id,
      date: toISODate(invoice.date || invoice.createdAt),
      ownerInvoiceNumber: String(invoice.invoiceNumber || ""),
      contractorInvoiceNumber: String(
        invoice.contractorInvoiceNumber || invoice.supplierInvoiceNumber || invoice.externalInvoiceNumber || ""
      ),
      client: invoice.clientName || invoice.client || invoice.contractor || "Unknown Client",
      type: internalByBuilding ? "internal" : "external",
      description: invoice.items?.map((item) => item.name).filter(Boolean).join(", ") || "No description",
      unit: invoice.unit || "",
      amount,
      cost,
      source: "invoice"
    };
  };

  const addInvoiceToReport = (invoice) => {
    if (reportItems.some((item) => item.id === invoice.id)) {
      alert("Invoice already exists in the report table.");
      return;
    }
    const newItem = buildReportItemFromInvoice(invoice);
    setReportItems((prev) => [...prev, newItem]);

    setActiveView("weekly");
    setPeriod("weekly");

    alert("Invoice added to Financial Engine table.");
  };

  const addManualEntry = () => {
    if (!manualEntry.date || !manualEntry.ownerInvoiceNumber || !manualEntry.client || !manualEntry.unit) {
      alert("Please fill Date, Owner Invoice No, Client, and Unit.");
      return;
    }

    if (manualEntry.type === "external" && !manualEntry.contractorInvoiceNumber) {
      alert("For external jobs, please add the contractor invoice number.");
      return;
    }

    const amount = Number(manualEntry.amount || 0);
    const cost = Number(manualEntry.cost || 0);

    const item = {
      id: `manual-${Date.now()}`,
      date: manualEntry.date,
      ownerInvoiceNumber: manualEntry.ownerInvoiceNumber,
      contractorInvoiceNumber: manualEntry.contractorInvoiceNumber,
      client: manualEntry.client,
      type: manualEntry.type,
      description: manualEntry.description || "General maintenance",
      unit: manualEntry.unit,
      amount,
      cost,
      source: "manual"
    };

    setReportItems((prev) => [item, ...prev]);
    setManualEntry((prev) => ({
      ...prev,
      ownerInvoiceNumber: "",
      contractorInvoiceNumber: "",
      client: "",
      description: "",
      unit: "",
      amount: "",
      cost: ""
    }));
  };

  const removeFromReport = (id) => setReportItems((prev) => prev.filter((item) => item.id !== id));

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingData({ ...item });
  };

  const saveEdit = () => {
    setReportItems((prev) => prev.map((item) => (item.id === editingId ? { ...editingData } : item)));
    setEditingId(null);
    setEditingData({});
  };

  const periodReportItems = useMemo(() => {
    const from = toDate(rangeFrom);
    const to = toDate(rangeTo);

    return reportItems.filter((item) => {
      const date = toDate(item.date);
      if (!date) return false;
      if (from && date < from) return false;
      if (!to) return true;
      const endDay = new Date(to);
      endDay.setHours(23, 59, 59, 999);
      return date <= endDay;
    });
  }, [reportItems, rangeFrom, rangeTo]);

  const totals = useMemo(() => {
    const revenue = periodReportItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const costs = periodReportItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const profit = revenue - costs;

    const internalRevenue = periodReportItems
      .filter((item) => item.type === "internal")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const externalRevenue = periodReportItems
      .filter((item) => item.type === "external")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const internalCost = periodReportItems
      .filter((item) => item.type === "internal")
      .reduce((sum, item) => sum + Number(item.cost || 0), 0);

    const externalCost = periodReportItems
      .filter((item) => item.type === "external")
      .reduce((sum, item) => sum + Number(item.cost || 0), 0);

    return {
      revenue,
      costs,
      profit,
      internalRevenue,
      externalRevenue,
      internalProfit: internalRevenue - internalCost,
      externalProfit: externalRevenue - externalCost
    };
  }, [periodReportItems]);

  const weeklyGroups = useMemo(() => {
    const grouped = periodReportItems.reduce((acc, item) => {
      const weekStart = startOfWeek(item.date).toISOString().slice(0, 10);
      if (!acc[weekStart]) acc[weekStart] = [];
      acc[weekStart].push(item);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([weekStart, items]) => {
        const totalRevenue = items.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const totalProfit = items.reduce((sum, row) => sum + Number(row.amount || 0) - Number(row.cost || 0), 0);
        return { weekStart, items, totalRevenue, totalProfit };
      })
      .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  }, [periodReportItems]);

  const monthlyRows = useMemo(() => {
    const grouped = reportItems.reduce((acc, item) => {
      const mk = monthKey(item.date);
      if (!acc[mk]) {
        acc[mk] = {
          key: mk,
          invoices: 0,
          revenue: 0,
          cost: 0,
          internalRevenue: 0,
          externalRevenue: 0
        };
      }

      acc[mk].invoices += 1;
      acc[mk].revenue += Number(item.amount || 0);
      acc[mk].cost += Number(item.cost || 0);

      if (item.type === "internal") acc[mk].internalRevenue += Number(item.amount || 0);
      else acc[mk].externalRevenue += Number(item.amount || 0);

      return acc;
    }, {});

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        profit: row.revenue - row.cost
      }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [reportItems]);

  const selectedMonthData = useMemo(
    () => monthlyRows.find((row) => row.key === selectedMonth),
    [monthlyRows, selectedMonth]
  );

  const monthlyPeriodItems = useMemo(
    () => reportItems.filter((item) => monthKey(item.date) === selectedMonth),
    [reportItems, selectedMonth]
  );

  const allTimeUnitSpend = useMemo(() => {
    const units = reportItems.reduce((acc, item) => {
      const key = item.unit || "Unknown Unit";
      if (!acc[key]) acc[key] = { unit: key, amount: 0, jobs: 0 };
      acc[key].amount += Number(item.amount || 0);
      acc[key].jobs += 1;
      return acc;
    }, {});
    return Object.values(units).sort((a, b) => b.amount - a.amount);
  }, [reportItems]);

  const monthlyPartyUsage = useMemo(() => {
    const parties = monthlyPeriodItems.reduce((acc, item) => {
      const key = item.client || "Unknown";
      if (!acc[key]) acc[key] = { name: key, count: 0, revenue: 0, type: item.type };
      acc[key].count += 1;
      acc[key].revenue += Number(item.amount || 0);
      return acc;
    }, {});
    return Object.values(parties).sort((a, b) => b.count - a.count);
  }, [monthlyPeriodItems]);

  const engineTableItems = useMemo(
    () =>
      [...reportItems].sort((a, b) => {
        const aDate = toDate(a.date)?.getTime() || 0;
        const bDate = toDate(b.date)?.getTime() || 0;
        return bDate - aDate;
      }),
    [reportItems]
  );

  const chartRows = useMemo(() => monthlyRows.slice(0, 6).reverse(), [monthlyRows]);
  const chartPeak = useMemo(
    () => Math.max(...chartRows.map((row) => Math.max(row.revenue, row.profit)), 1),
    [chartRows]
  );

  const buildPdf = () => {
    if (!periodReportItems.length) {
      alert("No report rows in the selected period.");
      return null;
    }

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    pdf.setFillColor(15, 23, 42);
    pdf.roundedRect(margin, y, contentWidth, 20, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(17);
    pdf.setFont(undefined, "bold");
    pdf.text("OC PULSE FINANCIAL REPORT", margin + 4, y + 8);

    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `${period === "weekly" ? "Weekly" : "Monthly"} Summary | Period ${rangeFrom} to ${rangeTo}`,
      margin + 4,
      y + 14
    );
    pdf.text(`Printed ${new Date().toLocaleDateString("en-GB")}`, pageWidth - margin - 35, y + 14);

    y += 26;

    const metricWidth = (contentWidth - 9) / 4;
    const metricData = [
      { label: "Revenue", value: money.format(totals.revenue), color: [37, 99, 235] },
      { label: "Costs", value: money.format(totals.costs), color: [251, 146, 60] },
      { label: "Net Profit", value: money.format(totals.profit), color: [16, 185, 129] },
      { label: "Invoices", value: String(periodReportItems.length), color: [99, 102, 241] }
    ];

    metricData.forEach((metric, index) => {
      const x = margin + index * (metricWidth + 3);
      pdf.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
      pdf.roundedRect(x, y, metricWidth, 16, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.setFont(undefined, "normal");
      pdf.text(metric.label, x + 3, y + 5);
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(10);
      pdf.text(metric.value, x + 3, y + 12);
    });

    y += 22;

    const baseColumns = [
      { label: "Date", width: 20, key: "date" },
      { label: "Owner Inv", width: 20, key: "ownerInvoiceNumber" },
      { label: "Contractor Inv", width: 20, key: "contractorInvoiceNumber" },
      { label: "Client", width: 28, key: "client" },
      { label: "Type", width: 14, key: "type" },
      { label: "Description", width: 56, key: "description" },
      { label: "Unit", width: 22, key: "unit" },
      { label: "Amount", width: 18, key: "amount" },
      { label: "Cost", width: 18, key: "cost" },
      { label: "Profit", width: 18, key: "profit" }
    ];
    const baseTotalWidth = baseColumns.reduce((sum, col) => sum + col.width, 0);
    const widthScale = contentWidth / baseTotalWidth;
    const columns = baseColumns.map((col) => ({ ...col, width: Number((col.width * widthScale).toFixed(2)) }));

    const drawHeader = () => {
      pdf.setFillColor(30, 41, 59);
      pdf.rect(margin, y, contentWidth, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.setFont(undefined, "bold");

      let x = margin;
      columns.forEach((col) => {
        pdf.text(col.label, x + 1.5, y + 5.3);
        pdf.rect(x, y, col.width, 8);
        x += col.width;
      });
      y += 8;
    };

    drawHeader();

    periodReportItems.forEach((row, index) => {
      if (y > pageHeight - 16) {
        pdf.addPage();
        y = margin;
        drawHeader();
      }

      const rowValues = {
        date: row.date || "",
        ownerInvoiceNumber: String(row.ownerInvoiceNumber || ""),
        contractorInvoiceNumber: String(row.contractorInvoiceNumber || ""),
        client: row.client || "",
        type: row.type === "internal" ? "Internal" : "External",
        description: row.description || "",
        unit: row.unit || "",
        amount: money.format(Number(row.amount || 0)),
        cost: money.format(Number(row.cost || 0)),
        profit: money.format(Number(row.amount || 0) - Number(row.cost || 0))
      };

      const lineHeight = 3.5;
      const wrappedByCol = columns.map((col) => {
        const raw = String(rowValues[col.key] || "");
        const wrapped = pdf.splitTextToSize(raw, Math.max(6, col.width - 2.5));
        const lines = Array.isArray(wrapped) ? wrapped : [String(wrapped)];
        return lines.length ? lines : [""];
      });
      const maxLines = Math.max(...wrappedByCol.map((lines) => lines.length), 1);
      const rowHeight = Math.max(8, maxLines * lineHeight + 2);

      if (y + rowHeight > pageHeight - 16) {
        pdf.addPage();
        y = margin;
        drawHeader();
      }

      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, y, contentWidth, rowHeight, "F");
      }

      let x = margin;
      columns.forEach((col, colIndex) => {
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(x, y, col.width, rowHeight);
        pdf.setTextColor(51, 65, 85);
        pdf.setFontSize(6.6);
        pdf.setFont(undefined, col.key === "profit" ? "bold" : "normal");
        pdf.text(wrappedByCol[colIndex], x + 1.2, y + 3.8);
        x += col.width;
      });

      y += rowHeight;
    });

    const footerY = pageHeight - 6;
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(7);
    pdf.text("OC PULSE | Financial engine report", pageWidth / 2, footerY, { align: "center" });

    return pdf;
  };

  const handlePreviewPDF = () => {
    const pdf = buildPdf();
    if (!pdf) return;
    setPdfUrl(pdf.output("dataurlstring"));
    setShowPdfViewer(true);
  };

  const handleExportPDF = () => {
    const pdf = buildPdf();
    if (!pdf) return;
    pdf.save(`OC-PULSE-${period}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getRowsForActiveView = () => {
    if (activeView === "monthly") return monthlyPeriodItems;
    if (activeView === "overview") return reportItems;
    return periodReportItems;
  };

  const saveCurrentReport = async () => {
    const rows = getRowsForActiveView();
    if (!rows.length) {
      alert("Nothing to save for this view yet.");
      return;
    }

    const defaultName =
      activeView === "weekly"
        ? `Weekly ${rangeFrom} to ${rangeTo}`
        : activeView === "monthly"
          ? `Monthly ${selectedMonth}`
          : `Overview ${new Date().toISOString().slice(0, 10)}`;

    const name = (reportTitle || defaultName).trim();

    try {
      await addDoc(collection(db, "savedReports"), {
        name,
        view: activeView,
        period,
        rangeFrom,
        rangeTo,
        selectedMonth,
        rows: rows.map((row) => ({
          date: row.date || "",
          ownerInvoiceNumber: row.ownerInvoiceNumber || "",
          contractorInvoiceNumber: row.contractorInvoiceNumber || "",
          client: row.client || "",
          type: row.type || "internal",
          description: row.description || "",
          unit: row.unit || "",
          amount: Number(row.amount || 0),
          cost: Number(row.cost || 0)
        })),
        createdAt: serverTimestamp()
      });
      setReportTitle("");
      alert("Report saved to vault.");
    } catch (error) {
      console.error("Failed to save report:", error);
      alert("Failed to save report.");
    }
  };

  const loadSavedReport = (saved) => {
    const rows = (saved.rows || []).map((row, idx) => ({
      id: `saved-${saved.id}-${idx}`,
      date: row.date || "",
      ownerInvoiceNumber: row.ownerInvoiceNumber || "",
      contractorInvoiceNumber: row.contractorInvoiceNumber || "",
      client: row.client || "",
      type: row.type || "internal",
      description: row.description || "",
      unit: row.unit || "",
      amount: Number(row.amount || 0),
      cost: Number(row.cost || 0),
      source: "saved"
    }));

    setReportItems(rows);
    if (saved.view) setActiveView(saved.view);
    if (saved.period) setPeriod(saved.period);
    if (saved.rangeFrom) setRangeFrom(saved.rangeFrom);
    if (saved.rangeTo) setRangeTo(saved.rangeTo);
    if (saved.selectedMonth) setSelectedMonth(saved.selectedMonth);
    alert(`Loaded: ${saved.name || "Saved report"}`);
  };

  const deleteSavedReport = async (id) => {
    try {
      await deleteDoc(doc(db, "savedReports", id));
    } catch (error) {
      console.error("Failed to delete report:", error);
      alert("Failed to delete report.");
    }
  };

  const rebuildInvoiceSearchIndex = async () => {
    if (!invoices.length) {
      alert("No invoices loaded to index.");
      return;
    }

    setIsReindexing(true);
    try {
      for (const invoice of invoices) {
        const tokens = buildInvoiceSearchTokens(invoice);
        await updateDoc(doc(db, "invoices", invoice.id), {
          searchTokens: tokens
        });
      }
      alert("Invoice search index updated.");
    } catch (error) {
      console.error("Failed to rebuild invoice index:", error);
      alert("Failed to rebuild search index.");
    } finally {
      setIsReindexing(false);
    }
  };

  const revenueShare = totals.revenue > 0 ? (totals.internalRevenue / totals.revenue) * 100 : 0;

  return (
    <div className="min-h-screen text-slate-900 relative overflow-x-hidden">
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${backgroundImages[bgIndex]})` }}
      />
      <div className="fixed inset-0 -z-10 bg-slate-950/55" />
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8`}>
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="rounded-3xl border border-white/15 bg-gradient-to-r from-slate-900/80 via-slate-800/80 to-blue-900/80 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="md:hidden bg-white/10 text-white p-2.5 rounded-xl border border-white/15"
                >
                  <FaBars />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">OC Pulse Reports</h1>
                  <p className="text-blue-100 text-xs uppercase tracking-[0.2em] mt-1">
                    Weekly and monthly financial engine
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <div className="bg-white/90 rounded-xl px-3 py-2 flex items-center gap-2 border border-white">
                  <FaFilter className="text-slate-500" size={11} />
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="text-xs font-black uppercase bg-transparent outline-none"
                  >
                    <option value="weekly">Weekly Calendar</option>
                    <option value="monthly">Monthly Calendar</option>
                  </select>
                </div>

                <div className="bg-white/90 rounded-xl px-3 py-2 flex items-center gap-2 border border-white">
                  <FaCalendarAlt className="text-slate-500" size={11} />
                  <input
                    type="date"
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                    className="text-xs font-bold bg-transparent outline-none"
                  />
                </div>

                <div className="bg-white/90 rounded-xl px-3 py-2 border border-white flex gap-2 items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500">From</span>
                  <input
                    type="date"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    className="text-xs font-semibold bg-transparent outline-none"
                  />
                </div>

                <div className="bg-white/90 rounded-xl px-3 py-2 border border-white flex gap-2 items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500">To</span>
                  <input
                    type="date"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    className="text-xs font-semibold bg-transparent outline-none"
                  />
                </div>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setActiveView("weekly")}
              className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                activeView === "weekly"
                  ? "bg-white text-slate-900 border-white shadow-xl"
                  : "bg-white/10 text-white border-white/20 backdrop-blur-lg"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-wider">Weekly Builder</p>
              <p className="text-[11px] opacity-80 mt-1">Enter work done this week and generate weekly PDF.</p>
            </button>
            <button
              onClick={() => setActiveView("monthly")}
              className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                activeView === "monthly"
                  ? "bg-white text-slate-900 border-white shadow-xl"
                  : "bg-white/10 text-white border-white/20 backdrop-blur-lg"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-wider">Monthly Analytics</p>
              <p className="text-[11px] opacity-80 mt-1">Profit view, most expensive units, party usage.</p>
            </button>
            <button
              onClick={() => setActiveView("overview")}
              className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                activeView === "overview"
                  ? "bg-white text-slate-900 border-white shadow-xl"
                  : "bg-white/10 text-white border-white/20 backdrop-blur-lg"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-wider">Reports Home</p>
              <p className="text-[11px] opacity-80 mt-1">All invoices so far, visits and spend patterns.</p>
            </button>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-white">Report Vault</p>
                <p className="text-[11px] text-slate-200">Save weekly/monthly snapshots and reload anytime.</p>
              </div>
              <input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Optional report name"
                className="bg-white/90 border border-white rounded-lg px-3 py-2 text-xs w-full lg:w-64"
              />
              <button
                onClick={saveCurrentReport}
                className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-xs font-black uppercase"
              >
                Save Current Report
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {savedReports.slice(0, 9).map((saved) => (
                <div key={saved.id} className="rounded-xl border border-white/20 bg-slate-900/50 p-3">
                  <p className="text-xs font-black text-white">{saved.name || "Untitled report"}</p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    {saved.view || "weekly"} | {saved.rangeFrom || "-"} to {saved.rangeTo || "-"}
                  </p>
                  <p className="text-[11px] text-slate-300">{(saved.rows || []).length} row(s)</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => loadSavedReport(saved)}
                      className="flex-1 bg-blue-600 text-white rounded-lg px-2 py-1.5 text-[11px] font-black uppercase"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteSavedReport(saved.id)}
                      className="bg-rose-600 text-white rounded-lg px-2 py-1.5"
                      title="Delete saved report"
                    >
                      <FaTrash size={11} />
                    </button>
                  </div>
                </div>
              ))}
              {savedReports.length === 0 && (
                <p className="text-xs text-slate-200">No saved reports yet.</p>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <GlassPanel className="p-4">
              <p className="text-[10px] uppercase font-black tracking-wider text-blue-500">Revenue</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{money.format(totals.revenue)}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-[10px] uppercase font-black tracking-wider text-orange-500">Costs</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{money.format(totals.costs)}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-[10px] uppercase font-black tracking-wider text-emerald-500">Net Profit</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{money.format(totals.profit)}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-[10px] uppercase font-black tracking-wider text-violet-500">Period Rows</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{periodReportItems.length}</p>
            </GlassPanel>
          </section>

          {activeView === "weekly" && <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1 space-y-6">
              <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Add Manual Report Row</h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Owner Invoice = what owner is billed. Contractor Invoice = invoice you received.
                  Cost = what you paid contractor. Profit = Amount billed to owner - Cost.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <input
                    type="date"
                    value={manualEntry.date}
                    onChange={(e) => setManualEntry((prev) => ({ ...prev, date: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <input
                    placeholder="Owner Invoice No"
                    value={manualEntry.ownerInvoiceNumber}
                    onChange={(e) => setManualEntry((prev) => ({ ...prev, ownerInvoiceNumber: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <input
                    placeholder="Contractor Invoice No"
                    value={manualEntry.contractorInvoiceNumber}
                    onChange={(e) =>
                      setManualEntry((prev) => ({ ...prev, contractorInvoiceNumber: e.target.value }))
                    }
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <input
                    placeholder={manualEntry.type === "external" ? "Client Name (External)" : "Contractor Name (Internal)"}
                    value={manualEntry.client}
                    onChange={(e) => setManualEntry((prev) => ({ ...prev, client: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <select
                    value={manualEntry.type}
                    onChange={(e) => setManualEntry((prev) => ({ ...prev, type: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                  </select>
                  <input
                    placeholder="Unit (e.g. Duncan Court A612)"
                    value={manualEntry.unit}
                    onChange={(e) => setManualEntry((prev) => ({ ...prev, unit: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none md:col-span-2"
                  />
                  <input
                    placeholder="Description (e.g. Geyser burst)"
                    value={manualEntry.description}
                    onChange={(e) => setManualEntry((prev) => ({ ...prev, description: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none md:col-span-2"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={manualEntry.amount}
                    onChange={(e) => setManualEntry((prev) => ({ ...prev, amount: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cost"
                    value={manualEntry.cost}
                    onChange={(e) => setManualEntry((prev) => ({ ...prev, cost: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>

                <button
                  onClick={addManualEntry}
                  className="mt-4 w-full bg-slate-900 text-white rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <FaPlus size={10} /> Add To Report
                </button>
              </div>

              <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Pull From Invoices</h2>
                <p className="mt-1 text-[11px] text-slate-500">Searches your Firestore invoice database.</p>
                <button
                  onClick={rebuildInvoiceSearchIndex}
                  disabled={isReindexing}
                  className="mt-2 bg-slate-900 text-white rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
                >
                  {isReindexing ? "Reindexing..." : "Rebuild Search Index"}
                </button>
                <div className="relative mt-4">
                  <FaSearch className="absolute left-3 top-3 text-slate-400" size={12} />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search owner/contractor invoice, client, unit"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-3">
                  {searchInput.trim()
                    ? isSearchingInvoices
                      ? "Searching Firebase invoices..."
                      : `${visibleInvoices.length} invoice(s) found from database`
                    : `${visibleInvoices.length} invoice(s) in selected period`}
                </p>

                <div className="mt-3 max-h-[360px] overflow-y-auto space-y-2 pr-1">
                  {visibleInvoices.slice(0, 40).map((invoice) => {
                    const date = toISODate(invoice.date || invoice.createdAt);
                    return (
                      <div key={invoice.id} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-black text-slate-900">Owner #{invoice.invoiceNumber || "-"}</p>
                            <p className="text-[11px] text-slate-600">{invoice.unit || "No unit"}</p>
                            <p className="text-[10px] text-slate-500">{date || "No date"}</p>
                          </div>
                          <button
                            onClick={() => addInvoiceToReport(invoice)}
                            className="bg-blue-600 text-white p-2 rounded-lg"
                            title="Add to report"
                          >
                            <FaPlus size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="xl:col-span-2 space-y-6">
              <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Financial Engine View ({rangeFrom} to {rangeTo})
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={saveCurrentReport}
                      className="bg-slate-900 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider"
                    >
                      Save Report
                    </button>
                    <button
                      onClick={handlePreviewPDF}
                      className="bg-blue-600 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider"
                    >
                      Preview PDF
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="bg-emerald-600 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2"
                    >
                      <FaFilePdf size={12} /> Download
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[1140px] w-full text-xs">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Owner Invoice</th>
                        <th className="text-left p-3">Contractor Invoice</th>
                        <th className="text-left p-3">Client/Contractor</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Unit</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-right p-3">Cost</th>
                        <th className="text-right p-3">Profit</th>
                        <th className="text-center p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {engineTableItems.length === 0 && (
                        <tr>
                          <td className="p-6 text-center text-slate-500" colSpan={11}>
                            No rows yet. Add rows manually or pull invoices by date range.
                          </td>
                        </tr>
                      )}
                      {engineTableItems.map((item) => {
                        const isEditing = editingId === item.id;
                        const row = isEditing ? editingData : item;
                        const profit = Number(row.amount || 0) - Number(row.cost || 0);

                        return (
                          <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="p-2 align-top">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={row.date || ""}
                                  onChange={(e) => setEditingData((prev) => ({ ...prev, date: e.target.value }))}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 w-full"
                                />
                              ) : (
                                row.date
                              )}
                            </td>
                            <td className="p-2 align-top">
                              {isEditing ? (
                                <input
                                  value={row.ownerInvoiceNumber || ""}
                                  onChange={(e) =>
                                    setEditingData((prev) => ({ ...prev, ownerInvoiceNumber: e.target.value }))
                                  }
                                  className="bg-white border border-slate-200 rounded px-2 py-1 w-full"
                                />
                              ) : (
                                row.ownerInvoiceNumber
                              )}
                            </td>
                            <td className="p-2 align-top">
                              {isEditing ? (
                                <input
                                  value={row.contractorInvoiceNumber || ""}
                                  onChange={(e) =>
                                    setEditingData((prev) => ({ ...prev, contractorInvoiceNumber: e.target.value }))
                                  }
                                  className="bg-white border border-slate-200 rounded px-2 py-1 w-full"
                                />
                              ) : (
                                row.contractorInvoiceNumber || "-"
                              )}
                            </td>
                            <td className="p-2 align-top">
                              {isEditing ? (
                                <input
                                  value={row.client || ""}
                                  onChange={(e) => setEditingData((prev) => ({ ...prev, client: e.target.value }))}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 w-full"
                                />
                              ) : (
                                row.client
                              )}
                            </td>
                            <td className="p-2 align-top">
                              {isEditing ? (
                                <select
                                  value={row.type || "internal"}
                                  onChange={(e) => setEditingData((prev) => ({ ...prev, type: e.target.value }))}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 w-full"
                                >
                                  <option value="internal">Internal</option>
                                  <option value="external">External</option>
                                </select>
                              ) : (
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                                    row.type === "internal"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {row.type}
                                </span>
                              )}
                            </td>
                            <td className="p-2 align-top min-w-[220px]">
                              {isEditing ? (
                                <input
                                  value={row.description || ""}
                                  onChange={(e) =>
                                    setEditingData((prev) => ({ ...prev, description: e.target.value }))
                                  }
                                  className="bg-white border border-slate-200 rounded px-2 py-1 w-full"
                                />
                              ) : (
                                row.description
                              )}
                            </td>
                            <td className="p-2 align-top">
                              {isEditing ? (
                                <input
                                  value={row.unit || ""}
                                  onChange={(e) => setEditingData((prev) => ({ ...prev, unit: e.target.value }))}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 w-full"
                                />
                              ) : (
                                row.unit
                              )}
                            </td>
                            <td className="p-2 align-top text-right font-semibold">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.amount ?? 0}
                                  onChange={(e) =>
                                    setEditingData((prev) => ({ ...prev, amount: Number(e.target.value) }))
                                  }
                                  className="bg-white border border-slate-200 rounded px-2 py-1 w-full text-right"
                                />
                              ) : (
                                money.format(Number(row.amount || 0))
                              )}
                            </td>
                            <td className="p-2 align-top text-right font-semibold">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.cost ?? 0}
                                  onChange={(e) =>
                                    setEditingData((prev) => ({ ...prev, cost: Number(e.target.value) }))
                                  }
                                  className="bg-white border border-slate-200 rounded px-2 py-1 w-full text-right"
                                />
                              ) : (
                                money.format(Number(row.cost || 0))
                              )}
                            </td>
                            <td className="p-2 align-top text-right font-black text-blue-700">{money.format(profit)}</td>
                            <td className="p-2 align-top">
                              <div className="flex justify-center gap-2">
                                {isEditing ? (
                                  <button
                                    onClick={saveEdit}
                                    className="bg-emerald-600 text-white p-2 rounded"
                                    title="Save"
                                  >
                                    <FaSave size={11} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => startEdit(item)}
                                    className="bg-blue-600 text-white p-2 rounded"
                                    title="Edit"
                                  >
                                    <FaEdit size={11} />
                                  </button>
                                )}
                                <button
                                  onClick={() => removeFromReport(item.id)}
                                  className="bg-rose-600 text-white p-2 rounded"
                                  title="Delete"
                                >
                                  <FaTrash size={11} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <FaChartLine className="text-blue-600" /> Internal vs External
                  </h3>

                  <div className="mt-4 h-4 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${Math.max(0, Math.min(100, revenueShare))}%` }}
                    />
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Internal Revenue</span>
                      <span className="font-black text-emerald-700">{money.format(totals.internalRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Internal Profit</span>
                      <span className="font-black text-emerald-700">{money.format(totals.internalProfit)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">External Revenue</span>
                      <span className="font-black text-rose-700">{money.format(totals.externalRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">External Profit</span>
                      <span className="font-black text-rose-700">{money.format(totals.externalProfit)}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Monthly Snapshot</h3>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                    />
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoices</span>
                      <span className="font-black">{selectedMonthData?.invoices || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Revenue</span>
                      <span className="font-black">{money.format(selectedMonthData?.revenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Profit</span>
                      <span className="font-black text-blue-700">{money.format(selectedMonthData?.profit || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Internal vs External</span>
                      <span className="font-black">
                        {money.format(selectedMonthData?.internalRevenue || 0)} /{" "}
                        {money.format(selectedMonthData?.externalRevenue || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4">Trend (Revenue vs Profit)</h3>
                <div className="grid grid-cols-6 gap-3 h-52 items-end">
                  {chartRows.length === 0 && <p className="text-xs text-slate-500 col-span-6">No data yet.</p>}
                  {chartRows.map((row) => {
                    const revenueHeight = (row.revenue / chartPeak) * 100;
                    const profitHeight = (row.profit / chartPeak) * 100;

                    return (
                      <div key={row.key} className="flex flex-col items-center gap-2">
                        <div className="h-36 w-full flex items-end justify-center gap-1">
                          <div
                            className="w-3 bg-blue-500 rounded-t"
                            style={{ height: `${Math.max(revenueHeight, 3)}%` }}
                            title={`Revenue ${money.format(row.revenue)}`}
                          />
                          <div
                            className="w-3 bg-emerald-500 rounded-t"
                            style={{ height: `${Math.max(profitHeight, 3)}%` }}
                            title={`Profit ${money.format(row.profit)}`}
                          />
                        </div>
                        <p className="text-[10px] font-black text-slate-600">{row.key.slice(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4">Weekly Grouping</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {weeklyGroups.length === 0 && <p className="text-xs text-slate-500">No weekly groups yet.</p>}
                  {weeklyGroups.map((group) => {
                    const weekEnd = endOfWeek(group.weekStart).toISOString().slice(0, 10);
                    return (
                      <div key={group.weekStart} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black text-slate-900">
                            {group.weekStart} to {weekEnd}
                          </p>
                          <p className="text-xs font-black text-blue-700">{money.format(group.totalProfit)}</p>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {group.items.length} row(s) | Revenue {money.format(group.totalRevenue)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>}

          {activeView === "monthly" && (
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Monthly Profit Board</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                      />
                      <button
                        onClick={handleExportPDF}
                        className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-[11px] font-black uppercase"
                      >
                        Monthly PDF
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-[10px] uppercase text-slate-500 font-black">Invoices</p>
                      <p className="text-xl font-black mt-1">{selectedMonthData?.invoices || 0}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-[10px] uppercase text-slate-500 font-black">Revenue</p>
                      <p className="text-xl font-black mt-1">{money.format(selectedMonthData?.revenue || 0)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-[10px] uppercase text-slate-500 font-black">Cost</p>
                      <p className="text-xl font-black mt-1">{money.format(selectedMonthData?.cost || 0)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-[10px] uppercase text-slate-500 font-black">Profit</p>
                      <p className="text-xl font-black mt-1 text-blue-700">{money.format(selectedMonthData?.profit || 0)}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4">
                    Unit Spend (Selected Month)
                  </h3>
                  <div className="space-y-3">
                    {Object.values(
                      monthlyPeriodItems.reduce((acc, item) => {
                        const key = item.unit || "Unknown Unit";
                        if (!acc[key]) acc[key] = { unit: key, amount: 0 };
                        acc[key].amount += Number(item.amount || 0);
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 6)
                      .map((row, idx, arr) => {
                        const max = arr[0]?.amount || 1;
                        return (
                          <div key={row.unit} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-700">{row.unit}</span>
                              <span className="font-black text-slate-900">{money.format(row.amount)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-blue-600" style={{ width: `${(row.amount / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    {monthlyPeriodItems.length === 0 && (
                      <p className="text-xs text-slate-500">No data in this month yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">Most/Least Unit</h3>
                  {(() => {
                    const rows = Object.values(
                      monthlyPeriodItems.reduce((acc, item) => {
                        const key = item.unit || "Unknown Unit";
                        if (!acc[key]) acc[key] = { unit: key, amount: 0 };
                        acc[key].amount += Number(item.amount || 0);
                        return acc;
                      }, {})
                    ).sort((a, b) => b.amount - a.amount);
                    const top = rows[0];
                    const least = rows[rows.length - 1];
                    return (
                      <div className="space-y-2 text-xs">
                        <p className="text-slate-500">Highest spend</p>
                        <p className="font-black">{top ? `${top.unit} • ${money.format(top.amount)}` : "-"}</p>
                        <p className="text-slate-500 mt-3">Lowest spend</p>
                        <p className="font-black">{least ? `${least.unit} • ${money.format(least.amount)}` : "-"}</p>
                      </div>
                    );
                  })()}
                </div>

                <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">Party Usage</h3>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {monthlyPartyUsage.slice(0, 10).map((row) => (
                      <div key={row.name} className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                        <p className="text-xs font-black">{row.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {row.type} • {row.count} jobs • {money.format(row.revenue)}
                        </p>
                      </div>
                    ))}
                    {monthlyPartyUsage.length === 0 && (
                      <p className="text-xs text-slate-500">No contractor/client usage this month yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeView === "overview" && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4">All-Time Unit Spend</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {allTimeUnitSpend.slice(0, 12).map((row, idx) => (
                    <div key={row.unit} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                      <span className="font-semibold text-slate-700">
                        {idx + 1}. {row.unit}
                      </span>
                      <span className="font-black text-slate-900">
                        {money.format(row.amount)} | {row.jobs} jobs
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-flash relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/35 rounded-2xl p-5 shadow-[0_10px_35px_rgba(15,23,42,0.30)]">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4">System Snapshot</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total report rows</span>
                    <span className="font-black">{reportItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total invoices in DB (period filter)</span>
                    <span className="font-black">{filteredInvoices.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current date range</span>
                    <span className="font-black">
                      {rangeFrom} to {rangeTo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Most visited unit</span>
                    <span className="font-black">{allTimeUnitSpend[0]?.unit || "-"}</span>
                  </div>
                  <button
                    onClick={handleExportPDF}
                    className="mt-4 bg-slate-900 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider"
                  >
                    Export Current View PDF
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {showPdfViewer && (
        <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <p className="font-black uppercase text-sm tracking-wider">Report PDF Preview</p>
              <button
                onClick={() => setShowPdfViewer(false)}
                className="bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            {pdfUrl && <iframe src={pdfUrl} title="PDF Preview" className="w-full h-[70vh] border-0" />}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;



