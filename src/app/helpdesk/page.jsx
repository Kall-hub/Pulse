"use client";
import { useState, useRef, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { BiSend, BiTransferAlt, BiDotsVerticalRounded, BiCheckDouble, BiSearch, BiUserVoice } from "react-icons/bi";
import { FaUserTie } from "react-icons/fa";

// MOCK INITIAL DATA
const INITIAL_DATA = [
  {
    id: 1,
    unit: "Duncan Court B23",
    status: "active",
    unread: true,
    messages: [
      { id: 1, type: 'text', sender: 'tenant', text: "Hi, my geyser is making a very loud noise. It's vibrating the whole wall.", time: "10:30 AM" },
      { id: 2, type: 'text', sender: 'kally', text: "Noted B23. I've alerted Maintenance.", time: "10:45 AM" }
    ]
  },
  {
    id: 2,
    unit: "Festival's Edge A01",
    status: "idle",
    unread: false,
    messages: [
      { id: 1, type: 'text', sender: 'tenant', text: "When is the cleaning scheduled?", time: "Yesterday" }
    ]
  }
];

const AGENTS = ["Tanya", "Mitchell", "Ntokozo"];

const HelpDeskPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [chats, setChats] = useState(INITIAL_DATA);
  const [activeChatId, setActiveChatId] = useState(1);
  const [inputText, setInputText] = useState("");
  const [isTransferMenuOpen, setIsTransferMenuOpen] = useState(false); // NEW STATE
  
  const messagesEndRef = useRef(null);
  const activeChat = chats.find(c => c.id === activeChatId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat.messages]);

  // --- 1. SEND MESSAGE ---
  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
        id: Date.now(),
        type: 'text',
        sender: 'kally', 
        text: inputText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    updateChat(newMessage);
    setInputText("");
  };

  // --- 2. TRANSFER LOGIC (THE NEW FEATURE) ---
  const handleTransfer = (agentName) => {
    const transferLog = {
        id: Date.now(),
        type: 'system',
        text: `Kally transferred session to ${agentName}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    updateChat(transferLog);
    setIsTransferMenuOpen(false); // Close menu
  };

  // HELPER TO UPDATE STATE
  const updateChat = (msgObj) => {
    const updatedChats = chats.map(chat => {
        if (chat.id === activeChatId) {
            return { ...chat, messages: [...chat.messages, msgObj] };
        }
        return chat;
    });
    setChats(updatedChats);
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className={`flex-1 flex transition-all duration-300 ${isOpen ? "ml-60" : "ml-20"}`}>
        
        {/* COLUMN 1: INBOX */}
        <aside className="w-80 border-r border-slate-100 flex flex-col h-screen sticky top-0 bg-white">
          <div className="p-6 border-b border-slate-100 bg-[#F8FAFC]">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Help Desk</h2>
            <div className="relative mt-4">
                <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input placeholder="Search tickets..." className="w-full bg-white border border-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-blue-100 transition-all"/>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {chats.map((chat) => (
                <button 
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`w-full text-left p-6 border-b border-slate-50 transition-all hover:bg-slate-50 group ${activeChatId === chat.id ? 'bg-blue-50/50 border-r-4 border-r-blue-600' : ''}`}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-black uppercase tracking-tight ${activeChatId === chat.id ? 'text-blue-700' : 'text-slate-700'}`}>
                            {chat.unit}
                        </span>
                        {chat.unread && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium truncate pr-4 group-hover:text-slate-500">
                        {chat.messages[chat.messages.length - 1].text}
                    </p>
                </button>
            ))}
          </div>
        </aside>

        {/* COLUMN 2: ACTIVE CONVERSATION */}
        <section className="flex-1 flex flex-col h-screen bg-[#F1F5F9] relative">
          
          {/* HEADER */}
          <header className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg text-sm">
                {activeChat.unit.charAt(0)}
              </div>
              <div>
                <h3 className="font-black text-slate-900 leading-none text-sm tracking-tight">{activeChat.unit}</h3>
                <div className="flex items-center mt-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1.5"></span>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Active Ticket</p>
                </div>
              </div>
            </div>
            
            {/* ACTION BUTTONS */}
            <div className="flex items-center space-x-2 relative">
                {/* TRANSFER BUTTON */}
                <div className="relative">
                    <button 
                        onClick={() => setIsTransferMenuOpen(!isTransferMenuOpen)}
                        className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-2 border ${isTransferMenuOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-100 border-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <BiTransferAlt size={14}/> <span>Transfer</span>
                    </button>

                    {/* THE DROPDOWN LIST */}
                    {isTransferMenuOpen && (
                        <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-xl border border-slate-100 w-48 overflow-hidden animate-in fade-in zoom-in-95 z-50">
                            <div className="p-3 bg-slate-50 border-b border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Agent</p>
                            </div>
                            {AGENTS.map((agent) => (
                                <button 
                                    key={agent}
                                    onClick={() => handleTransfer(agent)}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                                >
                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500">
                                        {agent.charAt(0)}
                                    </div>
                                    {agent}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <BiDotsVerticalRounded size={24} />
                </button>
            </div>
          </header>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth" onClick={() => setIsTransferMenuOpen(false)}>
            <div className="flex justify-center mb-6">
              <span className="bg-white border border-slate-200 text-slate-400 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm">
                Ticket Opened
              </span>
            </div>

            {activeChat.messages.map((msg) => {
                // SYSTEM MESSAGE (TRANSFER LOG)
                if (msg.type === 'system') {
                    return (
                        <div key={msg.id} className="flex items-center justify-center space-x-4 py-2 opacity-80">
                            <div className="h-[1px] w-12 bg-slate-200"></div>
                            <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 px-5 py-2 rounded-full border border-blue-100 shadow-sm">
                                <BiUserVoice size={16} />
                                <p className="text-[9px] font-black uppercase tracking-[0.15em] italic">{msg.text}</p>
                            </div>
                            <div className="h-[1px] w-12 bg-slate-200"></div>
                        </div>
                    );
                }

                // TEXT MESSAGE
                const isStaff = msg.sender !== 'tenant';
                
                return (
                    <div key={msg.id} className={`flex flex-col ${isStaff ? 'items-end self-end max-w-[85%]' : 'items-start max-w-[75%]'} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`flex items-end space-x-3 ${isStaff ? '' : 'flex-row-reverse space-x-reverse'}`}>
                            
                            {/* MESSAGE BUBBLE */}
                            <div className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                                <div className={`p-4 rounded-3xl shadow-sm border ${
                                    !isStaff ? 'bg-white border-slate-200 rounded-tl-none' : 'bg-blue-600 text-white border-blue-700 rounded-tr-none shadow-xl'
                                }`}>
                                    <p className={`text-sm font-bold leading-relaxed ${!isStaff ? 'text-slate-700' : 'text-white italic'}`}>
                                        "{msg.text}"
                                    </p>
                                </div>
                                <div className="flex items-center mt-2 mr-1">
                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mr-2">
                                        {msg.time} • {msg.sender}
                                    </span>
                                    {isStaff && <BiCheckDouble className="text-blue-500" size={16} />}
                                </div>
                            </div>

                            {/* AVATAR */}
                            <div className={`w-10 h-10 rounded-2xl border-2 border-white shadow-lg flex items-center justify-center text-xs font-black mb-6 shrink-0 ${
                                !isStaff ? 'hidden' : 'bg-[#0F172A] text-blue-400'
                            }`}>
                                {msg.sender.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <footer className="p-6 bg-white border-t border-slate-200">
            <form onSubmit={handleSend} className="flex items-center space-x-4 bg-slate-100 p-3 rounded-2xl border border-slate-200 shadow-inner group focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Reply to tenant..."
                className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-medium"
              />
              <button type="submit" className="bg-blue-600 text-white p-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center justify-center">
                <BiSend size={20} />
              </button>
            </form>
          </footer>

        </section>
      </main>
    </div>
  );
};

export default HelpDeskPage;