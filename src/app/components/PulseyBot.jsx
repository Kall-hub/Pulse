"use client";
import { useState, useEffect, useRef } from 'react';
import { BiBot, BiSend, BiX, BiCommand, BiTargetLock } from "react-icons/bi";
import { FaRobot } from "react-icons/fa";
// IMPORTING THE BRAIN
import { pulseyBrain } from '@/app/Data/pulsey_logic'; 

const PulseyBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: 'bot', text: "SYSTEMS ONLINE, KALLY. SHIELD IS ACTIVE. HOW CAN I ASSIST THE MISSION?" }
  ]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const cleanInput = input.trim().toLowerCase();
    if (!cleanInput) return;

    setMessages(prev => [...prev, { role: 'user', text: input.toUpperCase() }]);
    setInput("");

    setTimeout(() => {
      const match = pulseyBrain.find(cmd => 
        cmd.keywords.some(key => cleanInput.includes(key))
      );

      const botResponse = match 
        ? match.response 
        : "COMMAND UNRECOGNIZED. ACCESS DUNCAN COURT PROTOCOLS VIA 'HELP'.";

      setMessages(prev => [...prev, { role: 'bot', text: botResponse.toUpperCase() }]);
    }, 600);
  };

  return (
    // FIX: Moved from 'bottom-6' to 'bottom-32' to clear the Send Button zone
    // Added 'right-8' to give it some breathing room from the scrollbar
    <div className="fixed bottom-32 right-8 z-[100]">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-blue-600 rounded-[1.8rem] shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all border-b-4 border-blue-800 animate-in fade-in zoom-in"
        >
          <BiBot size={30} />
        </button>
      ) : (
        // The Chat Window positions itself relative to the parent div (which is now floating higher)
        <div className="bg-[#0F172A]/95 backdrop-blur-2xl w-[380px] h-[550px] rounded-[3rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 origin-bottom-right">
          
          {/* HEADER */}
          <div className="p-6 bg-blue-700 flex justify-between items-center shrink-0">
            <div className="flex items-center space-x-3">
              <FaRobot className="text-white" size={20} />
              <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Pulsey-Bot</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white"><BiX size={20} /></button>
          </div>

          {/* MESSAGES */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-md
                  ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white/5 border border-white/10 text-slate-300 rounded-bl-none'}
                `}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* INPUT */}
          <form onSubmit={handleSend} className="p-6 bg-white/5 border-t border-white/10 shrink-0">
            <div className="relative flex items-center">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="EXECUTE COMMAND..."
                className="w-full bg-slate-900/50 border border-white/10 p-4 pr-12 rounded-2xl text-[10px] font-black text-blue-400 outline-none uppercase tracking-widest focus:border-blue-500 transition-colors"
              />
              <button type="submit" className="absolute right-3 text-blue-500 hover:text-white transition-colors"><BiSend size={22} /></button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PulseyBot;