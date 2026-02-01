"use client";
import { useState, useEffect, useRef } from 'react';
import { BiBot, BiSend, BiX } from "react-icons/bi";
import { FaRobot, FaArrowsAlt } from "react-icons/fa";
import { db } from '../Config/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PulseyBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: 'bot', text: "SYSTEMS ONLINE. HOW CAN I HELP?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
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
  const fetchDatabaseContext = async () => {
    try {
      // Fetch data from all collections
      const [maintenanceSnap, cleaningsSnap, inspectionsSnap, invoicesSnap] = await Promise.all([
        getDocs(collection(db, "maintenance")),
        getDocs(collection(db, "cleanings")),
        getDocs(collection(db, "inspections")),
        getDocs(collection(db, "invoices"))
      ]);

      const maintenance = maintenanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const cleanings = cleaningsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const inspections = inspectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return {
        maintenance,
        cleanings,
        inspections,
        invoices,
        summary: {
          totalMaintenance: maintenance.length,
          maintenanceRequests: maintenance.filter(m => m.status === 'request').length,
          activeJobs: maintenance.filter(m => m.status === 'active').length,
          completedJobs: maintenance.filter(m => m.status === 'completed').length,
          totalCleanings: cleanings.length,
          bookedCleanings: cleanings.filter(c => c.status === 'Booked').length,
          totalInspections: inspections.length,
          totalInvoices: invoices.length
        }
      };
    } catch (error) {
      console.error("Error fetching database:", error);
      return null;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const userMessage = input.trim();
    if (!userMessage) return;

    setMessages(prev => [...prev, { role: 'user', text: userMessage.toUpperCase() }]);
    setInput("");
    setIsLoading(true);

    try {
      // Fetch current database state
      const dbContext = await fetchDatabaseContext();
      
      if (!dbContext) {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: "DATABASE CONNECTION ERROR. UNABLE TO ACCESS PULSE SYSTEMS." 
        }]);
        setIsLoading(false);
        return;
      }

      // Try AI response first
      try {
        // Initialize Gemini AI
        const API_KEY = 'AIzaSyCOg0nQIHpzv9_lHSAy64VPgMwK562BqfI';
        
        if (API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
          throw new Error('No API key configured');
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Build context prompt
        const contextPrompt = `You are Pulsey-Bot, an AI assistant for OC Pulse property management system. You have access to real-time database information.

CURRENT DATABASE STATE:
- Maintenance Requests: ${dbContext.summary.maintenanceRequests} pending
- Active Job Cards: ${dbContext.summary.activeJobs}
- Completed Jobs: ${dbContext.summary.completedJobs}
- Scheduled Cleanings: ${dbContext.summary.bookedCleanings}
- Total Inspections: ${dbContext.summary.totalInspections}
- Total Invoices: ${dbContext.summary.totalInvoices}

RECENT MAINTENANCE TICKETS:
${dbContext.maintenance.slice(0, 5).map(m => `- ${m.unit}: ${m.issue || m.status} (Status: ${m.status})`).join('\n')}

RECENT CLEANINGS:
${dbContext.cleanings.slice(0, 3).map(c => `- Unit ${c.unit}: ${c.status || 'Scheduled'}`).join('\n')}

User Question: "${userMessage}"

Respond in an authoritative, tech-style voice (like a military AI). Keep responses concise and data-focused. Use uppercase for emphasis. Provide specific information from the database when relevant.`;

        const result = await model.generateContent(contextPrompt);
        const response = result.response.text();

        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: response.toUpperCase()
        }]);

      } catch (aiError) {
        console.error("AI Error Details:", aiError.message);
        
        // FALLBACK: Use database context for intelligent keyword matching
        const userLower = userMessage.toLowerCase();
        let response = "";

        // Greeting detection
        if (userLower.match(/hello|hi|hey|greetings/)) {
          response = `GREETINGS, OPERATOR. PULSE SYSTEMS ONLINE. ${dbContext.summary.maintenanceRequests} REQUESTS PENDING, ${dbContext.summary.activeJobs} JOBS ACTIVE.`;
        }
        // Status queries
        else if (userLower.match(/status|overview|update|dashboard/)) {
          response = `SYSTEM STATUS: ${dbContext.summary.maintenanceRequests} MAINTENANCE REQUESTS | ${dbContext.summary.activeJobs} ACTIVE JOBS | ${dbContext.summary.completedJobs} COMPLETED | ${dbContext.summary.bookedCleanings} CLEANINGS SCHEDULED`;
        }
        // Maintenance queries
        else if (userLower.match(/maintenance|repair|fix|broken/)) {
          const recentUnit = dbContext.maintenance[0]?.unit || 'NONE';
          response = `MAINTENANCE LOG: ${dbContext.summary.totalMaintenance} TOTAL TICKETS. LATEST: ${recentUnit}. ${dbContext.summary.maintenanceRequests} AWAITING APPROVAL.`;
        }
        // Cleaning queries
        else if (userLower.match(/clean|cleaning|maid/)) {
          response = `CLEANING OPERATIONS: ${dbContext.summary.bookedCleanings} UNITS SCHEDULED. ${dbContext.summary.totalCleanings} TOTAL RECORDS.`;
        }
        // Inspection queries
        else if (userLower.match(/inspect|inspection|check/)) {
          response = `INSPECTION DATABASE: ${dbContext.summary.totalInspections} INSPECTIONS LOGGED. ALL REPORTS ARCHIVED.`;
        }
        // Invoice queries
        else if (userLower.match(/invoice|bill|payment|finance/)) {
          response = `FINANCIAL RECORDS: ${dbContext.summary.totalInvoices} INVOICES IN SYSTEM. ACCESS INVOICING PAGE FOR DETAILS.`;
        }
        // Help
        else if (userLower.match(/help|command|what can you/)) {
          response = `AVAILABLE QUERIES: STATUS, MAINTENANCE, CLEANINGS, INSPECTIONS, INVOICES. ASK ABOUT SPECIFIC UNITS OR COUNTS. AI MODE CURRENTLY OFFLINE.`;
        }
        // Default
        else {
          response = `PROCESSING QUERY... ${dbContext.summary.totalMaintenance} MAINTENANCE | ${dbContext.summary.totalCleanings} CLEANINGS | ${dbContext.summary.totalInspections} INSPECTIONS TRACKED. BE MORE SPECIFIC OR TRY 'HELP'.`;
        }

        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: response
        }]);
      }

    } catch (error) {
      console.error("Critical Error:", error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: "CRITICAL SYSTEM ERROR. DATABASE UNREACHABLE. CONTACT ADMIN." 
      }]);
    } finally {
      setIsLoading(false);
    }
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
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800/80 border border-white/5 p-3 rounded-xl rounded-bl-none">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* INPUT */}
            <form onSubmit={handleSend} className="p-3 bg-slate-900/50 border-t border-white/5 shrink-0">
                <div className="relative flex items-center">
                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    placeholder={isLoading ? "PROCESSING..." : "CMD..."}
                    className="w-full bg-black/20 border border-white/10 p-3 pr-10 rounded-xl text-[10px] font-black text-blue-300 outline-none uppercase tracking-widest focus:border-blue-500/50 transition-colors placeholder:text-slate-600 disabled:opacity-50"
                />
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="absolute right-3 text-blue-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  <BiSend size={16} />
                </button>
                </div>
            </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default PulseyBot;