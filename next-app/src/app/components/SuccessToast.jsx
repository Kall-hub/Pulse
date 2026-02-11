"use client";
import { useEffect } from 'react';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';

const SuccessToast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-200 animate-in slide-in-from-top-2 fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-green-500 p-4 pr-12 min-w-80 max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <FaTimes size={14} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <FaCheckCircle className="text-white" size={20} />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-green-600 tracking-widest">Success</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessToast;
