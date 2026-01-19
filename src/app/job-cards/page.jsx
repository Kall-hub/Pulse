"use client";
import { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { 
  FaTools, FaPlus, FaCheckCircle, FaExclamationTriangle, 
  FaPhoneAlt, FaMapMarkerAlt, FaCamera, FaChevronRight 
} from "react-icons/fa";
import { BiTask, BiTimeFive } from "react-icons/bi";

const JobCardPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active, completed

  // MOCK DATA: What Kally sees as the Master, and Contractors see as their Mission
  const [jobs, setJobs] = useState([
    {
      id: "JC-9921",
      unit: "HILLCREST VIEW 28",
      contractor: "Lindiwe",
      status: "In Progress",
      priority: "High",
      issueDate: "2026-01-16",
      tasks: [
        { id: 1, desc: "Kitchen sink loose / leaking", area: "Kitchen", done: false },
        { id: 2, desc: "Extractor fan dirty & noisy", area: "Bathroom", done: true }
      ]
    }
  ]);

  const toggleTask = (jobId, taskId) => {
    setJobs(jobs.map(job => {
      if (job.id === jobId) {
        return {
          ...job,
          tasks: job.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
        };
      }
      return job;
    }));
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`transition-all duration-300 ${isOpen ? "ml-60" : "ml-20"} p-8`}>
        
        {/* HEADER */}
        <header className="flex justify-between items-end mb-10 max-w-5xl mx-auto">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Job Cards</h1>
            <div className="flex bg-slate-200 p-1 rounded-xl mt-4 w-fit shadow-inner scale-90 origin-left">
              <button onClick={() => setActiveTab('active')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Active Missions</button>
              <button onClick={() => setActiveTab('completed')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'completed' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>History</button>
            </div>
          </div>
          
          <button className="bg-slate-900 text-white py-4 px-8 rounded-2xl shadow-xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-3 active:scale-95 border-b-4 border-blue-600">
            <FaPlus size={12} /> <span>Create Digital Card</span>
          </button>
        </header>

        {/* JOB CARDS LIST */}
        <div className="max-w-5xl mx-auto space-y-6">
          {jobs.map(job => (
            <div key={job.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              {/* TOP STRIP */}
              <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">{job.id}</span>
                  <div className="flex items-center text-slate-400 space-x-2">
                    <BiTimeFive size={14}/>
                    <span className="text-[10px] font-bold uppercase">{job.issueDate}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${job.priority === 'High' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-[10px] font-black uppercase text-slate-500">{job.priority} Priority</span>
                </div>
              </div>

              {/* MAIN CONTENT */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-2 leading-none">{job.unit}</h2>
                  <div className="flex items-center space-x-2 text-blue-600 mb-6">
                    <FaMapMarkerAlt size={12}/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Property Maintenance Sector</span>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Checklist</p>
                    {job.tasks.map(task => (
                      <button 
                        key={task.id}
                        onClick={() => toggleTask(job.id, task.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${task.done ? 'bg-green-50 border-green-200 opacity-60' : 'bg-slate-50 border-transparent hover:border-blue-500'}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${task.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            {task.done && <FaCheckCircle size={14} />}
                          </div>
                          <div className="text-left">
                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{task.area}</p>
                            <p className={`text-xs font-bold uppercase ${task.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.desc}</p>
                          </div>
                        </div>
                        <FaChevronRight className={task.done ? 'hidden' : 'text-slate-300'} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* SIDE ACTIONS / CONTRACTOR INFO */}
                <div className="bg-slate-50 rounded-[2rem] p-6 flex flex-col justify-between border border-slate-100">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                       <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                         <FaTools size={20} />
                       </div>
                       <div>
                         <p className="text-[8px] font-black text-slate-400 uppercase">Assigned Tech</p>
                         <p className="text-sm font-black text-slate-900 uppercase italic">{job.contractor}</p>
                       </div>
                    </div>
                    <button className="w-full bg-white border border-slate-200 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center space-x-3 text-slate-700 hover:bg-blue-600 hover:text-white transition-all">
                      <FaCamera /> <span>Upload Proof Photo</span>
                    </button>
                  </div>

                  <div className="pt-6 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-4">System Status: {job.status}</p>
                    <button className="w-full bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-green-200 active:scale-95 transition-all">
                      Finalize Job Card
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default JobCardPage;