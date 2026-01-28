const MaintenanceRow = ({ name, unit, issue, status, time }) => {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer group shadow-sm">
      <div className="flex items-center space-x-5">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-500 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
          {unit}
        </div>
        <div>
          <p className="font-extrabold text-slate-900 text-lg leading-tight">{name}</p>
          <p className="text-sm text-slate-500 mt-0.5 font-medium line-clamp-1 italic text-opacity-80">"{issue}"</p>
        </div>
      </div>
      <div className="text-right flex flex-col items-end">
        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{time}</p>
        <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 shadow-sm">
          {status}
        </span>
      </div>
    </div>
  );
};

export default MaintenanceRow;