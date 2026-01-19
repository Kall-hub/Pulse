const InboxItem = ({ unit, snippet, time, unread, active }) => {
  return (
    <button className={`w-full p-4 flex items-center space-x-4 transition-all border-b border-slate-50 ${
      active ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
    } ${unread ? 'bg-white' : 'opacity-80'}`}>
      
      {/* Profile Circle - Using the first letter of the Building */}
      <div className="min-w-[48px] h-12 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-500 shadow-inner">
        {unit[0]}
      </div>
      
      <div className="flex-1 text-left overflow-hidden">
        <div className="flex justify-between items-center">
          <h4 className={`text-sm tracking-tight ${unread ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>
            {unit}
          </h4>
          <span className="text-[10px] text-slate-400 font-black uppercase">{time}</span>
        </div>
        <p className={`text-xs truncate mt-0.5 ${unread ? 'font-bold text-blue-600' : 'text-slate-400 italic'}`}>
          {snippet}
        </p>
      </div>
    </button>
  );
};

export default InboxItem;