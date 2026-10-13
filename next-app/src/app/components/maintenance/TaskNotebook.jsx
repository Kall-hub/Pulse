'use client';
import { useState } from 'react';
import { BiPlusCircle, BiCheck } from 'react-icons/bi';

export default function TaskNotebook({ tasks, onAddTask, onToggleTask }) {
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskProperty, setNewTaskProperty] = useState('');
  const [newTaskIssue, setNewTaskIssue] = useState('');
  const [newTaskTag, setNewTaskTag] = useState('General');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    onAddTask({
      text: newTaskText.trim(),
      property: newTaskProperty.trim(),
      issue: newTaskIssue.trim(),
      tags: [newTaskTag]
    });
    setNewTaskText('');
    setNewTaskProperty('');
    setNewTaskIssue('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Add Task Form */}
      <div className="bg-slate-800/40 border border-white/5 p-6 rounded-3xl space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
          <BiPlusCircle size={16} /> Add Ticket / Follow-Up Note
        </h4>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Action / Note Description</label>
            <input 
              type="text" 
              value={newTaskText} 
              onChange={(e) => setNewTaskText(e.target.value)} 
              placeholder="e.g., Call contractor regarding quote..." 
              className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Property</label>
              <input 
                type="text" 
                value={newTaskProperty} 
                onChange={(e) => setNewTaskProperty(e.target.value)} 
                placeholder="e.g., Villa 12" 
                className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Ticket # / ID</label>
              <input 
                type="text" 
                value={newTaskIssue} 
                onChange={(e) => setNewTaskIssue(e.target.value)} 
                placeholder="e.g., TKT-1050" 
                className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Tag / Category</label>
            <select 
              value={newTaskTag} 
              onChange={(e) => setNewTaskTag(e.target.value)}
              className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="Urgent">Urgent</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Finance">Finance</option>
              <option value="General">General</option>
            </select>
          </div>

          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all">
            Save to Audit Trail
          </button>
        </form>
      </div>

      {/* Task List */}
      <div className="lg:col-span-2 bg-slate-800/40 border border-white/5 p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black uppercase tracking-wider text-white">Smart Task & Ticket Trail</h4>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
            {tasks.filter(t => t.completed).length} / {tasks.length} Completed
          </span>
        </div>

        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
          {tasks.map((task) => (
            <div key={task.id} className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${task.completed ? 'bg-slate-900/40 border-emerald-500/20 opacity-75' : 'bg-slate-900/80 border-white/10 shadow-lg'}`}>
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={task.completed} 
                  onChange={() => onToggleTask(task.id)}
                  className="mt-1 w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <div>
                  <p className={`text-xs font-bold ${task.completed ? 'line-through text-slate-400' : 'text-white'}`}>{task.text}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{task.property}</span>
                    <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">{task.issue}</span>
                    <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">{task.tags[0]}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                {task.completed && task.timestamp ? (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                    <BiCheck size={12} /> {task.timestamp}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    Pending Action
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
