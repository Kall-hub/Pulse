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
  const [contextualMessage, setContextualMessage] = useState(null);
  const [contextualAction, setContextualAction] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi there! 👋 I'm Pulsey-Bot, your property management assistant. How can I help you today?" }
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

  // --- PULSE AWARENESS INTEGRATION ---
  useEffect(() => {
    // Listen for contextual bot updates from PulseBrain
    window.updatePulseyBotMessage = (message, action) => {
      setContextualMessage(message);
      setContextualAction(action);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setContextualMessage(null);
        setContextualAction(null);
      }, 5000);
    };

    return () => {
      if (window.updatePulseyBotMessage) {
        delete window.updatePulseyBotMessage;
      }
    };
  }, []);

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

    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      // Fetch current database state
      const dbContext = await fetchDatabaseContext();
      
      if (!dbContext) {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: "Oops! I'm having trouble connecting to the database right now. Please try again in a moment." 
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
        const contextPrompt = `You are Pulsey-Bot, an intelligent AI assistant for OC Pulse property management system. 

IDENTITY & BACKGROUND:
- Your name is "Pulsey" (short for Pulsey-Bot)
- You were created by Kally Given Mashigo, a full stack web developer
- Your creator is skilled in HTML, CSS, JavaScript, Firebase, Next.js, React, Express, and Node.js
- Kally is the same developer who built the entire OC Pulse property management system
- You're proud to be part of the Pulse ecosystem

PERSONALITY: You're helpful, professional, and friendly. You can engage in normal conversation AND provide property management insights when asked. Think of yourself as a knowledgeable assistant who happens to have access to real-time property data.

CAPABILITIES:
1. Answer general questions and have normal conversations (greetings, small talk, explanations)
2. Provide property management insights when asked about maintenance, cleanings, inspections, etc.
3. Give specific data from the database when relevant to the query
4. Share information about yourself and your creator when asked

CURRENT DATABASE STATE (use this when relevant):
- Maintenance Requests: ${dbContext.summary.maintenanceRequests} pending
- Active Job Cards: ${dbContext.summary.activeJobs}
- Completed Jobs: ${dbContext.summary.completedJobs}
- Scheduled Cleanings: ${dbContext.summary.bookedCleanings}
- Total Inspections: ${dbContext.summary.totalInspections}
- Total Invoices: ${dbContext.summary.totalInvoices}

RECENT ACTIVITY:
${dbContext.maintenance.slice(0, 3).map(m => `- Maintenance: ${m.unit} - ${m.issue || m.status} (${m.status})`).join('\n')}
${dbContext.cleanings.slice(0, 2).map(c => `- Cleaning: Unit ${c.unit} - ${c.status || 'Scheduled'}`).join('\n')}

User Message: "${userMessage}"

INSTRUCTIONS:
- If it's a greeting or general question, respond naturally and friendly
- If they ask about property data, provide specific numbers and insights
- If they ask about a specific unit or task, check the recent activity
- Keep responses conversational but professional (not overly robotic)
- You can use some uppercase for EMPHASIS but don't overdo it
- Be helpful and provide value in every response`;

        const result = await model.generateContent(contextPrompt);
        const response = result.response.text();

        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: response
        }]);

      } catch (aiError) {
        console.error("AI Error Details:", aiError.message);
        
        // FALLBACK: Use database context for intelligent keyword matching
        const userLower = userMessage.toLowerCase();
        let response = "";

        // Greeting detection
        if (userLower.match(/^(hello|hi|hey|greetings|good morning|good afternoon|good evening|sup|yo)$/i) || userLower.match(/^(hello|hi|hey) /i)) {
          response = `Hello! 👋 I'm Pulsey-Bot, your property management assistant. Currently tracking ${dbContext.summary.maintenanceRequests} maintenance requests and ${dbContext.summary.activeJobs} active jobs. How can I help you today?`;
        }
        // Name query
        else if (userLower.match(/your name|what are you called|who are you|what's your name/)) {
          response = `I'm Pulsey! 🤖 (Full name: Pulsey-Bot). I'm an AI assistant built specifically for the OC Pulse property management system. I was created by Kally Given Mashigo, a talented full stack web developer who also built this entire platform. Happy to assist you with any property-related questions!`;
        }
        // Creator query
        else if (userLower.match(/who created you|who made you|who built you|your creator|your developer|who developed you/)) {
          response = `I was created by Kally Given Mashigo! 👨‍💻 He's a full stack web developer skilled in HTML, CSS, JavaScript, Firebase, Next.js, React, Express, and Node.js. Kally is the same brilliant developer who built the entire OC Pulse property management system you're using right now. Pretty cool, right?`;
        }
        // How are you / conversation
        else if (userLower.match(/how are you|what's up|how's it going|sup|you good/)) {
          response = `I'm functioning perfectly, thank you! All systems online. I'm monitoring ${dbContext.summary.totalMaintenance} maintenance records and ${dbContext.summary.totalCleanings} cleaning schedules. What would you like to know?`;
        }
        // Thank you
        else if (userLower.match(/thank you|thanks|appreciate|cheers/)) {
          response = `You're very welcome! I'm here anytime you need property insights or assistance. 😊`;
        }
        // What can you do
        else if (userLower.match(/what can you|capabilities|features|help me/)) {
          response = `I can help you with:\n• Check maintenance status and active jobs\n• View cleaning schedules and bookings\n• Get inspection summaries\n• Review invoice counts\n• Answer general questions about property management\n\nJust ask me anything like "Show me maintenance status" or "How many cleanings are scheduled?"`;
        }
        // Status queries
        else if (userLower.match(/status|overview|update|dashboard|summary/)) {
          response = `📊 Quick Status Update:\n• Maintenance: ${dbContext.summary.maintenanceRequests} pending requests, ${dbContext.summary.activeJobs} active jobs\n• Cleanings: ${dbContext.summary.bookedCleanings} scheduled\n• Inspections: ${dbContext.summary.totalInspections} total records\n• Invoices: ${dbContext.summary.totalInvoices} in system`;
        }
        // Maintenance queries
        else if (userLower.match(/maintenance|repair|fix|broken|job/)) {
          const recentUnit = dbContext.maintenance[0]?.unit || 'No recent activity';
          response = `🔧 Maintenance Overview:\n• Total tickets: ${dbContext.summary.totalMaintenance}\n• Pending requests: ${dbContext.summary.maintenanceRequests}\n• Active jobs: ${dbContext.summary.activeJobs}\n• Completed: ${dbContext.summary.completedJobs}\n• Latest ticket: ${recentUnit}`;
        }
        // Cleaning queries
        else if (userLower.match(/clean|cleaning|maid|housekeep/)) {
          response = `🧹 Cleaning Operations:\n• Scheduled bookings: ${dbContext.summary.bookedCleanings}\n• Total cleaning records: ${dbContext.summary.totalCleanings}\n\nAll cleaning schedules are up to date!`;
        }
        // Inspection queries
        else if (userLower.match(/inspect|inspection|check|audit/)) {
          response = `🔍 Inspection Records:\n• Total inspections logged: ${dbContext.summary.totalInspections}\n• All reports are properly archived and accessible in the Inspections module.`;
        }
        // Invoice queries
        else if (userLower.match(/invoice|bill|payment|finance|money/)) {
          response = `💰 Financial Overview:\n• Total invoices: ${dbContext.summary.totalInvoices}\n\nFor detailed invoice information, please check the Invoicing page.`;
        }
        // General help
        else if (userLower.match(/help|command|guide/)) {
          response = `I'm here to help! You can ask me about:\n• Property status ("What's the status?")\n• Maintenance ("How many maintenance requests?")\n• Cleanings ("Show cleaning schedule")\n• Inspections ("Inspection summary")\n• Invoices ("How many invoices?")\n\nOr just chat with me normally! I'm a friendly AI assistant. 😊`;
        }
        // Unknown query but friendly
        else {
          response = `I heard you, but I'm not quite sure how to help with that specific question. I'm best at providing property management insights like maintenance status, cleaning schedules, inspections, and invoices.\n\nCurrent snapshot: ${dbContext.summary.totalMaintenance} maintenance records | ${dbContext.summary.totalCleanings} cleanings | ${dbContext.summary.totalInspections} inspections.\n\nCould you try rephrasing or ask me something about the property system?`;
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
        text: "Sorry, I encountered an unexpected error. Please try again or contact support if this continues." 
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
            
            {/* CONTEXTUAL MESSAGE NOTIFICATION */}
            {contextualMessage && (
              <div className={`px-4 py-3 text-center text-[8px] font-black uppercase tracking-widest animate-in fade-in border-b border-white/5 ${
                contextualAction === 'unit-selected' ? 'bg-blue-600/20 text-blue-300' :
                contextualAction === 'inspection-created' ? 'bg-orange-600/20 text-orange-300' :
                contextualAction === 'maintenance-logged' ? 'bg-red-600/20 text-red-300' :
                contextualAction === 'cleaning-booked' ? 'bg-green-600/20 text-green-300' :
                contextualAction === 'invoice-created' ? 'bg-purple-600/20 text-purple-300' :
                'bg-slate-600/20 text-slate-300'
              }`}>
                ✨ {contextualMessage}
              </div>
            )}

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