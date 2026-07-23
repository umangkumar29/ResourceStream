import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../app/services/auth/AuthProvider';
import { searchAIAssistant, Candidate } from '../../app/services/api';
import { getTechIcon } from '../../utils/techIcons';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  candidates?: Candidate[];
  isSearching?: boolean;
};

export const AIAssistant: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${user?.name?.split(' ')[0] || 'there'}! I'm your TalentStream AI Assistant. Tell me your project requirements, and I'll find the best candidates for you in milliseconds.`,
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    const searchMsgId = (Date.now() + 1).toString();
    const searchMsg: Message = {
      id: searchMsgId,
      role: 'assistant',
      content: 'Analyzing your requirements and performing a vector search across the talent pool...',
      isSearching: true,
    };

    setMessages(prev => [...prev, userMsg, searchMsg]);
    setInput('');

    try {
      // Connects to the newly built FastApi RAG/Vector search endpoint
      const results = await searchAIAssistant(userMsg.content, 5);
      
      setMessages(prev => prev.map(m => {
        if (m.id === searchMsgId) {
          return {
            ...m,
            isSearching: false,
            content: results.length > 0 
              ? `I analyzed your prompt and found ${results.length} highly suitable candidates that match your criteria. Here are the top matches:`
              : `I couldn't find any candidates directly matching exactly what you asked for in the available pool. Try softening the requirements.`,
            candidates: results
          };
        }
        return m;
      }));
    } catch (err) {
      setMessages(prev => prev.map(m => {
        if (m.id === searchMsgId) {
          return {
            ...m,
            isSearching: false,
            content: 'Sorry, I encountered an issue while searching the vector database. Please try again later.'
          };
        }
        return m;
      }));
    }
  };

  const rawRole = (user?.role as string) || '';
  if (rawRole !== 'PM' && rawRole !== 'Program_Mgr' && rawRole !== 'Project_Mgr' && rawRole !== 'Admin') {
    return null; 
  }

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[9999] p-4 rounded-full bg-gradient-to-r from-sky-500 to-violet-600 text-white shadow-2xl hover:shadow-sky-500/50 hover:scale-105 transition-all group"
          >
            <Sparkles className="w-6 h-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
            <MessageSquare className="w-7 h-7" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Chat Window Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed z-[9999] inset-4 md:inset-10 flex flex-col bg-white dark:bg-[#0b0e14] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 rounded-3xl"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#111620]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white tracking-tight">AI Sourcing Assistant</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500">pgvector matching enabled</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] space-y-4`}>
                    <div className={`p-4 rounded-2xl text-[13px] leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-sky-500 text-white rounded-tr-sm shadow-md' 
                        : 'bg-white dark:bg-[#151b28] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5 rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.isSearching ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                          <span className="font-medium animate-pulse">{msg.content}</span>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>

                    {/* Render Candidate Cards if present */}
                    {msg.candidates && msg.candidates.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 w-full">
                        {msg.candidates.map((cand) => (
                           <div key={cand.id} className="bg-white dark:bg-[#151b28] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-sky-500/50 transition-colors">
                             <div className="flex justify-between items-start mb-3">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                     <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${cand.id}`} className="w-full h-full opacity-80" alt="avatar"/>
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-none mb-1">{cand.name || 'Candidate'}</h4>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{cand.experience_years ? `${cand.experience_years} years exp` : 'Exp Unlisted'}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md text-[10px] font-bold">
                                 <CheckCircle2 className="w-3 h-3" />
                                 {cand.match_score ? cand.match_score : 85}% Match
                               </div>
                             </div>
                             
                             <div className="flex flex-wrap gap-1 mb-3">
                                {cand.skills && (typeof cand.skills === 'string' ? cand.skills.split(',') : cand.skills)
                                  .slice(0, 3).map((s: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                      <span className="scale-75 opacity-70">{getTechIcon(s.trim())}</span> {s.trim()}
                                    </span>
                                ))}
                             </div>
                             
                             <button 
                               onClick={() => cand.resume_url ? window.open(cand.resume_url, '_blank') : alert('Resume not available')}
                               className="w-full py-2 bg-slate-900 dark:bg-sky-500/10 hover:bg-slate-800 dark:hover:bg-sky-500/20 text-white dark:text-sky-400 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors border border-transparent dark:border-sky-500/20">
                               View Full Profile
                             </button>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0e14]">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="E.g., I need a Python developer with 3 years of experience..."
                  className="w-full bg-slate-100 dark:bg-[#151b28] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-full pl-5 pr-14 py-4 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
                <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-2 p-2.5 rounded-full bg-sky-500 text-white shadow-md hover:bg-sky-400 disabled:opacity-50 disabled:hover:bg-sky-500 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
