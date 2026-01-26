import { BiRadar } from "react-icons/bi";

const PulseLoader = () => {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#F8FAFC]">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
        <div className="relative w-full h-full bg-white border-4 border-slate-100 rounded-full flex items-center justify-center shadow-xl">
          <BiRadar size={40} className="text-blue-600 animate-spin-slow" />
        </div>
      </div>
      <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] animate-pulse">
        Pulse is cooking...
      </h2>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
        Syncing Pretoria Nodes
      </p>
    </div>
  );
};

export default PulseLoader;