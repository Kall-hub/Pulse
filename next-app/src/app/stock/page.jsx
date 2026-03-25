"use client";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";
import {
  FaArrowDown,
  FaArrowUp,
  FaBoxes,
  FaClipboardList,
  FaExclamationTriangle,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrash,
  FaTools,
  FaWarehouse
} from "react-icons/fa";
import { db } from "../Config/firebaseConfig";
import Sidebar from "../components/Sidebar";
import ApartmentAutocomplete from "../components/ApartmentAutocomplete";
import Loading from "../loading";

const todayString = () => new Date().toISOString().split("T")[0];

const emptyItemForm = {
  name: "",
  size: "",
  category: "Maintenance",
  unitCost: "",
  quantity: "1",
  minQuantity: "1"
};

const emptyUsageForm = {
  quantity: "1",
  unit: "",
  jobId: "",
  date: todayString(),
  note: ""
};

const emptyRestockForm = {
  quantity: "1",
  unitCost: "",
  note: ""
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR"
  }).format(Number(value || 0));

const StockPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [stockItems, setStockItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [maintenanceJobs, setMaintenanceJobs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showUseModal, setShowUseModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [usageForm, setUsageForm] = useState(emptyUsageForm);
  const [restockForm, setRestockForm] = useState(emptyRestockForm);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsOpen(false);
      else setIsOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const stockQuery = query(collection(db, "stockItems"), orderBy("name", "asc"));
    const movementQuery = query(collection(db, "stockMovements"), orderBy("createdAt", "desc"));
    const maintenanceQuery = query(collection(db, "maintenance"), orderBy("createdAt", "desc"));

    const unsubscribeStock = onSnapshot(
      stockQuery,
      (snapshot) => {
        setStockItems(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Error loading stock items:", error);
        setLoading(false);
      }
    );

    const unsubscribeMovements = onSnapshot(
      movementQuery,
      (snapshot) => {
        setMovements(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => console.error("Error loading stock movements:", error)
    );

    const unsubscribeMaintenance = onSnapshot(
      maintenanceQuery,
      (snapshot) => {
        setMaintenanceJobs(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => console.error("Error loading maintenance jobs:", error)
    );

    return () => {
      unsubscribeStock();
      unsubscribeMovements();
      unsubscribeMaintenance();
    };
  }, []);

  const stats = useMemo(() => {
    const totalUnits = stockItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalValue = stockItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
      0
    );
    const lowStock = stockItems.filter(
      (item) => Number(item.quantity || 0) <= Number(item.minQuantity || 0)
    ).length;

    return { skuCount: stockItems.length, totalUnits, totalValue, lowStock };
  }, [stockItems]);

  const filteredStock = useMemo(() => {
    const queryValue = searchQuery.trim().toLowerCase();
    if (!queryValue) return stockItems;

    return stockItems.filter((item) =>
      [item.name, item.size, item.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(queryValue))
    );
  }, [searchQuery, stockItems]);

  const filteredMovements = useMemo(() => {
    const queryValue = searchQuery.trim().toLowerCase();
    if (!queryValue) return movements;

    return movements.filter((movement) =>
      [movement.itemName, movement.type, movement.unit, movement.jobCardDisplayId, movement.note]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(queryValue))
    );
  }, [movements, searchQuery]);

  const matchingJobs = useMemo(() => {
    if (!usageForm.unit.trim()) return maintenanceJobs.slice(0, 20);
    const unitQuery = usageForm.unit.trim().toLowerCase();
    return maintenanceJobs
      .filter((job) => (job.unit || "").toLowerCase().includes(unitQuery))
      .slice(0, 20);
  }, [maintenanceJobs, usageForm.unit]);

  const resetItemModal = () => {
    setItemForm(emptyItemForm);
    setShowAddModal(false);
  };

  const openUseModal = (item) => {
    setSelectedItem(item);
    setUsageForm({ ...emptyUsageForm, unit: "" });
    setShowUseModal(true);
  };

  const openRestockModal = (item) => {
    setSelectedItem(item);
    setRestockForm({
      ...emptyRestockForm,
      unitCost: item.unitCost ? String(item.unitCost) : ""
    });
    setShowRestockModal(true);
  };

  const createItem = async () => {
    const quantity = Number(itemForm.quantity);
    const minQuantity = Number(itemForm.minQuantity);
    const unitCost = Number(itemForm.unitCost);

    if (!itemForm.name.trim()) return alert("Please add an item name.");
    if (Number.isNaN(quantity) || quantity < 0) return alert("Please enter a valid starting quantity.");
    if (Number.isNaN(unitCost) || unitCost < 0) return alert("Please enter a valid cost price.");

    try {
      await addDoc(collection(db, "stockItems"), {
        name: itemForm.name.trim(),
        size: itemForm.size.trim(),
        category: itemForm.category.trim() || "Maintenance",
        quantity,
        minQuantity: Number.isNaN(minQuantity) ? 0 : minQuantity,
        unitCost,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      resetItemModal();
    } catch (error) {
      console.error("Error creating stock item:", error);
      alert("Failed to save stock item.");
    }
  };

  const submitUsage = async () => {
    if (!selectedItem) return;

    const quantityUsed = Number(usageForm.quantity);
    if (Number.isNaN(quantityUsed) || quantityUsed <= 0) return alert("Enter a valid quantity to use.");
    if (!usageForm.unit.trim()) return alert("Please select or type the unit where the stock was used.");

    const selectedJob = maintenanceJobs.find((job) => job.id === usageForm.jobId) || null;
    const itemRef = doc(db, "stockItems", selectedItem.id);
    const movementRef = doc(collection(db, "stockMovements"));

    try {
      await runTransaction(db, async (transaction) => {
        const stockSnap = await transaction.get(itemRef);
        if (!stockSnap.exists()) throw new Error("Stock item no longer exists.");

        const currentQuantity = Number(stockSnap.data().quantity || 0);
        if (currentQuantity < quantityUsed) throw new Error(`Only ${currentQuantity} left in stock.`);

        transaction.update(itemRef, {
          quantity: currentQuantity - quantityUsed,
          updatedAt: serverTimestamp()
        });

        transaction.set(movementRef, {
          stockItemId: selectedItem.id,
          itemName: selectedItem.name,
          size: selectedItem.size || "",
          type: "usage",
          quantity: quantityUsed,
          unit: usageForm.unit.trim().toUpperCase(),
          usageDate: usageForm.date,
          note: usageForm.note.trim(),
          jobCardId: selectedJob?.id || "",
          jobCardDisplayId: selectedJob?.displayId || "",
          jobCardStatus: selectedJob?.status || "",
          jobCardIssueDate: selectedJob?.issueDate || "",
          createdAt: serverTimestamp()
        });
      });

      setShowUseModal(false);
      setSelectedItem(null);
      setUsageForm(emptyUsageForm);
    } catch (error) {
      console.error("Error using stock:", error);
      alert(error.message || "Failed to use stock.");
    }
  };

  const submitRestock = async () => {
    if (!selectedItem) return;

    const quantityAdded = Number(restockForm.quantity);
    const nextCost = Number(restockForm.unitCost);
    if (Number.isNaN(quantityAdded) || quantityAdded <= 0) return alert("Enter a valid quantity to add.");
    if (Number.isNaN(nextCost) || nextCost < 0) return alert("Enter a valid cost price.");

    const itemRef = doc(db, "stockItems", selectedItem.id);
    const movementRef = doc(collection(db, "stockMovements"));

    try {
      await runTransaction(db, async (transaction) => {
        const stockSnap = await transaction.get(itemRef);
        if (!stockSnap.exists()) throw new Error("Stock item no longer exists.");

        const currentQuantity = Number(stockSnap.data().quantity || 0);

        transaction.update(itemRef, {
          quantity: currentQuantity + quantityAdded,
          unitCost: nextCost,
          updatedAt: serverTimestamp()
        });

        transaction.set(movementRef, {
          stockItemId: selectedItem.id,
          itemName: selectedItem.name,
          size: selectedItem.size || "",
          type: "restock",
          quantity: quantityAdded,
          note: restockForm.note.trim(),
          unitCost: nextCost,
          usageDate: todayString(),
          createdAt: serverTimestamp()
        });
      });

      setShowRestockModal(false);
      setSelectedItem(null);
      setRestockForm(emptyRestockForm);
    } catch (error) {
      console.error("Error restocking item:", error);
      alert(error.message || "Failed to restock item.");
    }
  };

  const deleteLinkedUsage = async (movement) => {
    if (!movement?.id || movement.type !== "usage" || !movement.jobCardDisplayId) return;
    if (!confirm(`Delete this stock usage linked to ${movement.jobCardDisplayId}?`)) return;

    const movementRef = doc(db, "stockMovements", movement.id);
    const itemRef = movement.stockItemId ? doc(db, "stockItems", movement.stockItemId) : null;

    try {
      await runTransaction(db, async (transaction) => {
        const movementSnap = await transaction.get(movementRef);
        if (!movementSnap.exists()) throw new Error("Stock usage record no longer exists.");

        const movementData = movementSnap.data();
        const quantityToRestore = Number(movementData.quantity || 0);

        if (itemRef) {
          const stockSnap = await transaction.get(itemRef);
          if (stockSnap.exists()) {
            const currentQuantity = Number(stockSnap.data().quantity || 0);
            transaction.update(itemRef, {
              quantity: currentQuantity + quantityToRestore,
              updatedAt: serverTimestamp()
            });
          }
        }

        transaction.delete(movementRef);
      });
    } catch (error) {
      console.error("Error deleting linked stock usage:", error);
      alert(error.message || "Failed to delete linked stock usage.");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <main className={`transition-all duration-300 ${isOpen ? "md:ml-64" : "md:ml-20"} ml-0 p-4 md:p-8 max-w-7xl mx-auto`}>
        <header className="mb-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Stock Control</h1>
              <p className="text-slate-400 font-bold mt-1 tracking-widest text-[9px] uppercase italic">Materials in, materials out, no more silent losses</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="w-full md:w-auto bg-slate-900 text-white py-4 px-6 rounded-xl shadow-xl flex items-center justify-center gap-2 active:scale-95 border-b-4 border-blue-600 transition-all hover:bg-slate-800">
              <FaPlus size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest">Add Stock Item</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<FaBoxes />} label="Stock Lines" value={stats.skuCount} tone="blue" />
            <StatCard icon={<FaWarehouse />} label="Units On Hand" value={stats.totalUnits} tone="slate" />
            <StatCard icon={<FaExclamationTriangle />} label="Low Stock" value={stats.lowStock} tone="amber" />
            <StatCard icon={<FaTools />} label="Stock Value" value={formatCurrency(stats.totalValue)} tone="green" />
          </div>

          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-2 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar">
              {["stock", "history"].map((tab) => (
                <button key={tab} onClick={() => { setActiveTab(tab); setSearchQuery(""); }} className={`flex-1 lg:flex-none px-6 py-3 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab ? "bg-white text-blue-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}>
                  {tab === "stock" ? "Stock Register" : "Usage History"}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:w-96 group">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={activeTab === "stock" ? "Search item, size, category..." : "Search item, unit, jobcard..."} className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500/20 pl-10 pr-4 py-3 rounded-xl text-xs font-bold uppercase outline-none transition-all" />
            </div>
          </div>
        </header>

        {activeTab === "stock" ? (
          filteredStock.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {filteredStock.map((item) => {
                const isLow = Number(item.quantity || 0) <= Number(item.minQuantity || 0);
                return (
                  <div key={item.id} className="bg-white rounded-4xl border border-slate-200 shadow-sm p-6 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase">{item.category || "Maintenance"}</span>
                          {isLow && <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase">Low Stock</span>}
                        </div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">{item.name}</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">{item.size || "General item"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">On Hand</p>
                        <p className={`text-4xl font-black tracking-tighter ${isLow ? "text-amber-600" : "text-slate-900"}`}>{item.quantity || 0}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <MiniMetric label="Cost Each" value={formatCurrency(item.unitCost)} />
                      <MiniMetric label="Min Level" value={item.minQuantity ?? 0} />
                      <MiniMetric label="Value" value={formatCurrency(Number(item.quantity || 0) * Number(item.unitCost || 0))} />
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button onClick={() => openUseModal(item)} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <FaArrowDown size={12} />
                        Use Stock
                      </button>
                      <button onClick={() => openRestockModal(item)} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <FaArrowUp size={12} />
                        Restock
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<FaWarehouse />} title="No stock items yet" text="Start by adding cement, tiles, paint, locks, fittings, or any other maintenance stock you keep on hand." />
          )
        ) : filteredMovements.length > 0 ? (
          <div className="space-y-4">
            {filteredMovements.map((movement) => {
              const isUsage = movement.type === "usage";
              return (
                <div key={movement.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row gap-4 justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isUsage ? "bg-red-100 text-red-500" : "bg-green-100 text-green-600"}`}>
                      {isUsage ? <FaArrowDown /> : <FaArrowUp />}
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <h3 className="text-lg font-black uppercase italic text-slate-900">{movement.itemName}</h3>
                        <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${isUsage ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{movement.type}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Qty {movement.quantity} {movement.size ? `• ${movement.size}` : ""}</p>
                      <p className="text-sm font-bold text-slate-600 mt-3">{isUsage ? `Used at ${movement.unit || "No unit set"}` : "Stock added back into inventory"}</p>
                      {movement.jobCardDisplayId && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <p className="text-[11px] font-black text-blue-600 uppercase">Job Card: {movement.jobCardDisplayId}</p>
                          {isUsage && (
                            <button
                              onClick={() => deleteLinkedUsage(movement)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-red-600 hover:bg-red-500 hover:text-white transition-colors"
                            >
                              <FaTrash size={10} />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                      {movement.note && <p className="text-xs text-slate-500 mt-2">{movement.note}</p>}
                    </div>
                  </div>
                  <div className="md:text-right text-sm font-bold text-slate-500 space-y-1">
                    <p>{movement.usageDate || "No date"}</p>
                    {movement.jobCardIssueDate && <p>Job Date: {movement.jobCardIssueDate}</p>}
                    {movement.unitCost !== undefined && movement.unitCost !== "" && <p>Cost: {formatCurrency(movement.unitCost)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<FaClipboardList />} title="No stock movement yet" text="Once items are used on a unit or restocked, the full movement history will appear here." />
        )}
      </main>

      {showAddModal && (
        <ModalShell title="Add Stock Item" onClose={resetItemModal}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Item Name" value={itemForm.name} onChange={(value) => setItemForm((prev) => ({ ...prev, name: value }))} placeholder="Tile cement" />
            <Field label="Size / Spec" value={itemForm.size} onChange={(value) => setItemForm((prev) => ({ ...prev, size: value }))} placeholder="5kg" />
            <Field label="Cost Price" type="number" value={itemForm.unitCost} onChange={(value) => setItemForm((prev) => ({ ...prev, unitCost: value }))} placeholder="80.40" />
            <Field label="Starting Quantity" type="number" value={itemForm.quantity} onChange={(value) => setItemForm((prev) => ({ ...prev, quantity: value }))} placeholder="1" />
            <Field label="Low Stock At" type="number" value={itemForm.minQuantity} onChange={(value) => setItemForm((prev) => ({ ...prev, minQuantity: value }))} placeholder="1" />
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</p>
              <select value={itemForm.category} onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase outline-none focus:border-blue-500">
                <option value="Maintenance">Maintenance</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Paint">Paint</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={resetItemModal} className="flex-1 px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200">Cancel</button>
            <button onClick={createItem} className="flex-1 px-6 py-3 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-600">Save Item</button>
          </div>
        </ModalShell>
      )}

      {showUseModal && selectedItem && (
        <ModalShell title={`Use ${selectedItem.name}`} onClose={() => { setShowUseModal(false); setSelectedItem(null); }}>
          <div className="space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Available</p>
              <p className="text-2xl font-black uppercase italic text-slate-900">{selectedItem.quantity || 0} left</p>
              <p className="text-xs font-bold text-slate-500 mt-1">{selectedItem.size || "General item"} • {formatCurrency(selectedItem.unitCost)}</p>
            </div>
            <Field label="Quantity Used" type="number" value={usageForm.quantity} onChange={(value) => setUsageForm((prev) => ({ ...prev, quantity: value }))} placeholder="1" />
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Used At</p>
              <ApartmentAutocomplete value={usageForm.unit} onChange={(value) => setUsageForm((prev) => ({ ...prev, unit: value }))} placeholder="e.g. HILLCREST 204" autoFocus={false} />
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Link Job Card (Optional)</p>
              <select value={usageForm.jobId} onChange={(e) => {
                const jobId = e.target.value;
                const job = maintenanceJobs.find((entry) => entry.id === jobId);
                setUsageForm((prev) => ({ ...prev, jobId, unit: job?.unit || prev.unit, date: job?.issueDate || prev.date }));
              }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase outline-none focus:border-blue-500">
                <option value="">No linked job card</option>
                {matchingJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {(job.displayId || "NO-ID") + " • " + (job.unit || "NO UNIT") + " • " + (job.issueDate || "NO DATE")}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Usage Date" type="date" value={usageForm.date} onChange={(value) => setUsageForm((prev) => ({ ...prev, date: value }))} />
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Note</p>
              <textarea value={usageForm.note} onChange={(e) => setUsageForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Used for bathroom tile repairs" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none focus:border-blue-500 min-h-28" />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={() => { setShowUseModal(false); setSelectedItem(null); }} className="flex-1 px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200">Cancel</button>
            <button onClick={submitUsage} className="flex-1 px-6 py-3 rounded-xl bg-red-500 text-white font-black uppercase text-[10px] tracking-widest hover:bg-red-600">Record Usage</button>
          </div>
        </ModalShell>
      )}

      {showRestockModal && selectedItem && (
        <ModalShell title={`Restock ${selectedItem.name}`} onClose={() => { setShowRestockModal(false); setSelectedItem(null); }}>
          <div className="space-y-5">
            <Field label="Quantity Added" type="number" value={restockForm.quantity} onChange={(value) => setRestockForm((prev) => ({ ...prev, quantity: value }))} placeholder="1" />
            <Field label="Cost Price" type="number" value={restockForm.unitCost} onChange={(value) => setRestockForm((prev) => ({ ...prev, unitCost: value }))} placeholder="80.40" />
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Note</p>
              <textarea value={restockForm.note} onChange={(e) => setRestockForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Bought extra stock from Build It" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none focus:border-blue-500 min-h-28" />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={() => { setShowRestockModal(false); setSelectedItem(null); }} className="flex-1 px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200">Cancel</button>
            <button onClick={submitRestock} className="flex-1 px-6 py-3 rounded-xl bg-green-500 text-white font-black uppercase text-[10px] tracking-widest hover:bg-green-600">Add Stock</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, tone }) => {
  const tones = {
    blue: "from-blue-500 to-blue-600 border-blue-100 text-white",
    slate: "from-slate-800 to-slate-900 border-slate-200 text-white",
    amber: "from-amber-400 to-orange-500 border-amber-100 text-white",
    green: "from-emerald-500 to-green-600 border-green-100 text-white"
  };

  return (
    <div className={`bg-gradient-to-br ${tones[tone]} rounded-3xl border p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-6">
        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest text-white/70">{label}</p>
      <p className="text-3xl font-black tracking-tighter italic mt-2">{value}</p>
    </div>
  );
};

const MiniMetric = ({ label, value }) => (
  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-black text-slate-900 mt-2">{value}</p>
  </div>
);

const EmptyState = ({ icon, title, text }) => (
  <div className="bg-white rounded-4xl border border-slate-200 p-12 text-center shadow-sm">
    <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center text-2xl mb-5">{icon}</div>
    <p className="text-xl font-black uppercase text-slate-400">{title}</p>
    <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">{text}</p>
  </div>
);

const Field = ({ label, value, onChange, placeholder = "", type = "text" }) => (
  <div className="space-y-2">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</p>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none focus:border-blue-500" />
  </div>
);

const ModalShell = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <div className="bg-slate-900 p-6 md:p-8 text-white flex justify-between items-start shrink-0">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">{title}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Stock movement control</p>
        </div>
        <button onClick={onClose} className="bg-white/10 p-3 rounded-full hover:bg-red-500 transition-colors">
          <FaTimes />
        </button>
      </div>
      <div className="p-6 md:p-8 overflow-y-auto">{children}</div>
    </div>
  </div>
);

export default StockPage;
