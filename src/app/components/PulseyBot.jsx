"use client";
import { useState, useEffect, useRef } from 'react';
import { BiBot, BiSend, BiX } from "react-icons/bi";
import { FaRobot, FaArrowsAlt } from "react-icons/fa";

const PulseyBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: 'bot', text: "SYSTEMS ONLINE. HOW CAN I HELP?" }
  ]);
  const scrollRef = useRef(null);

  // --- DRAGGABLE STATE ---
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- DRAG HANDLERS ---
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    isDragging.current = false;
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    isDragging.current = true;
    setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleClick = () => {
    // Only toggle if we weren't dragging
    if (!isDragging.current) {
        setIsOpen(!isOpen);
    }
  };

  // --- CHAT LOGIC ---
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
        : "COMMAND UNRECOGNIZED. TRY 'HELP' FOR PROTOCOLS.";

      setMessages(prev => [...prev, { role: 'bot', text: botResponse.toUpperCase() }]);
    }, 600);
  };

  return (
    // Fixed positioning puts it in the corner initially
    // Transform allows it to move relative to that corner
    <div 
        className="fixed bottom-24 right-6 z-[9999]"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      {/* THE TOGGLE BUTTON (Draggable Trigger) */}
      {!isOpen ? (
        <div 
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            className="w-12 h-12 bg-blue-600 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform cursor-grab active:cursor-grabbing border-2 border-blue-400/50 group"
        >
          {/* Hover hint icon */}
          <FaArrowsAlt size={10} className="absolute -top-2 -right-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          <BiBot size={24} />
        </div>
      ) : (
        // THE CHAT WINDOW (Moves with parent)
        <div className="relative">
            {/* Close / Drag Handle Area */}
            <div className="absolute -top-12 right-0 flex items-center gap-2">
                <div 
                    onMouseDown={handleMouseDown}
                    className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 cursor-move hover:text-white shadow-lg"
                    title="Drag to move"
                >
                    <FaArrowsAlt size={12} />
                </div>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600"
                >
                    <BiX size={20} />
                </button>
            </div>

            <div className="bg-[#0F172A]/95 backdrop-blur-2xl w-[320px] h-[450px] rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 origin-bottom-right">
            
            {/* HEADER */}
            <div className="p-4 bg-blue-700/50 flex items-center justify-center shrink-0 border-b border-white/5">
                <div className="flex items-center space-x-2">
                <FaRobot className="text-blue-300" size={16} />
                <h3 className="text-xs font-black text-white uppercase italic tracking-widest">Pulsey-Bot</h3>
                </div>
            </div>

            {/* MESSAGES */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm leading-relaxed
                    ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800/80 border border-white/5 text-slate-300 rounded-bl-none'}
                    `}>
                    {m.text}
                    </div>
                </div>
                ))}
            </div>

            {/* INPUT */}
            <form onSubmit={handleSend} className="p-3 bg-slate-900/50 border-t border-white/5 shrink-0">
                <div className="relative flex items-center">
                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="CMD..."
                    className="w-full bg-black/20 border border-white/10 p-3 pr-10 rounded-xl text-[10px] font-black text-blue-300 outline-none uppercase tracking-widest focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                />
                <button type="submit" className="absolute right-3 text-blue-500 hover:text-white transition-colors"><BiSend size={16} /></button>
                </div>
            </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default PulseyBot;