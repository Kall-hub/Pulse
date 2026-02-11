const StatCard = ({ label, value, colorClass }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md cursor-default">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
    <p className={`text-4xl font-black mt-3 tracking-tighter ${colorClass}`}>{value}</p>
  </div>
);

export default StatCard;