const SummaryCard = ({ title, labelLeft, valueLeft, labelRight, valueRight, colorClass }) => {
  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-default">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center">
        <span className={`w-2 h-2 rounded-full mr-2 ${colorClass.bg}`}></span>
        {title}
      </h3>
      
      <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100">
        {/* Left Section */}
        <div className="flex flex-col">
          <p className="text-[10px] font-bold text-slate-400 uppercase">{labelLeft}</p>
          <p className={`text-2xl font-black mt-1 ${colorClass.textLeft}`}>{valueLeft}</p>
        </div>
        
        {/* Right Section */}
        <div className="flex flex-col pl-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">{labelRight}</p>
          <p className={`text-2xl font-black mt-1 ${colorClass.textRight}`}>{valueRight}</p>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;