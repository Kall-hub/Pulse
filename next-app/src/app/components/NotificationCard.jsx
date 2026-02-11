import { FaClipboardList, FaCheckCircle, FaExclamationTriangle, FaCalendarCheck, FaClock, FaChevronRight } from "react-icons/fa";
import { BiBell } from "react-icons/bi";

const NotificationCard = ({ data, onClick }) => {
  const { type, title, message, time, priority, read } = data;

  // ICON & COLOR LOGIC
  let icon = <BiBell />;
  let colorClass = "bg-blue-50 text-blue-600";
  let borderClass = "border-l-4 border-l-blue-500"; 

  if (type === 'SCHEDULE_OVERRIDE') {
      icon = <FaCalendarCheck />;
      colorClass = "bg-orange-50 text-orange-600";
      borderClass = "border-l-4 border-l-orange-500";
  } else if (type === 'URGENT_MAINTENANCE' || priority === 'Critical') {
      icon = <FaExclamationTriangle />;
      colorClass = "bg-red-50 text-red-600";
      borderClass = "border-l-4 border-l-red-500";
  } else if (type === 'JOB_DONE') {
      icon = <FaCheckCircle />;
      colorClass = "bg-green-50 text-green-600";
      borderClass = "border-l-4 border-l-green-500";
  } else if (type === 'SYSTEM') {
      icon = <FaClipboardList />;
      colorClass = "bg-slate-100 text-slate-600";
      borderClass = "border-l-4 border-l-slate-500";
  }

  return (
    <div 
        onClick={onClick}
        className={`relative group cursor-pointer p-6 rounded-[1.5rem] border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${read ? 'opacity-60 grayscale' : 'opacity-100'}`}
    >
      {/* LEFT BORDER ACCENT */}
      <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${borderClass.split(' ')[1]}`}></div>

      <div className="flex items-start gap-5 ml-2">
        <div className={`p-4 rounded-2xl shrink-0 transition-colors ${colorClass} ${read ? '' : 'group-hover:bg-slate-900 group-hover:text-white'}`}>
           {icon}
        </div>

        <div className="flex-1">
           <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <h3 className={`text-[11px] font-black uppercase tracking-tight mb-1 ${read ? 'text-slate-500' : 'text-slate-900'}`}>
                    {title}
                </h3>
                {!read && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
              </div>
              
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <FaClock size={10} /> {time}
              </span>
           </div>
           
           <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-xl line-clamp-1">
              {message}
           </p>

           <div className="flex gap-2 mt-3">
               {(priority === 'High' || priority === 'Critical') && (
                   <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider">High Priority</span>
               )}
               <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1 group-hover:text-blue-500 transition-colors flex items-center gap-1">
                   View Full Log <FaChevronRight />
               </span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;