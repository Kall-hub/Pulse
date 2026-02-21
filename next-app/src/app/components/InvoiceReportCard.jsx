"use client";

const InvoiceReportCard = ({ 
  invoiceNo, 
  amount, 
  apartment, 
  issue, 
  contractor, 
  date,
  status = 'Completed',
  internal = false,
  className = ''
}) => {
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    if (typeof dateValue?.toDate === 'function') dateValue = dateValue.toDate();
    const d = new Date(dateValue);
    return d.toLocaleDateString('en-GB');
  };

  const internalLabel = internal ? 'Internal' : 'External';
  const internalColor = internal ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const internalTextColor = internal ? 'text-green-700' : 'text-red-700';

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition-all ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        {/* Invoice Number */}
        {invoiceNo && (
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Invoice #</span>
            <span className="text-sm font-black text-slate-900">{invoiceNo}</span>
          </div>
        )}

        {/* Amount */}
        {amount !== undefined && (
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Amount</span>
            <span className="text-base font-black text-blue-600">R{Number(amount).toFixed(0)}</span>
          </div>
        )}

        {/* Apartment/Unit */}
        {apartment && (
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Unit</span>
            <span className="text-sm font-black text-slate-900">{apartment}</span>
          </div>
        )}

        {/* Contractor */}
        {contractor && (
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Contractor</span>
            <span className="text-sm font-bold text-slate-700">{contractor}</span>
          </div>
        )}

        {/* Date */}
        {date && (
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Date</span>
            <span className="text-sm font-bold text-slate-700">{formatDate(date)}</span>
          </div>
        )}
      </div>

      {/* Issue/Description - full width */}
      {issue && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Work Done</span>
          <span className="text-sm text-slate-700">{issue}</span>
        </div>
      )}

      {/* Status & Internal/External - full width bottom */}
      <div className="mt-3 flex gap-3 flex-wrap">
        <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${internalColor} ${internalTextColor}`}>
          {internalLabel}
        </div>
        <div className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-blue-50 text-blue-700">
          {status}
        </div>
      </div>
    </div>
  );
};

export default InvoiceReportCard;
