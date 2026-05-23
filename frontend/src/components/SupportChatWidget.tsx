'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetcher } from '../lib/api';

interface Message {
  id: number;
  sender_email: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface SupportChat {
  id: number;
  client_email: string;
  status: string;
  messages: Message[];
}

export default function SupportChatWidget() {
  const [token, setToken] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  // Check auth and user role
  useEffect(() => {
    const handleAuthCheck = () => {
      const storedToken = localStorage.getItem('token');
      const storedIsStaff = localStorage.getItem('is_staff') === 'true';
      const storedRole = localStorage.getItem('user_role') || '';
      
      setToken(storedToken);
      setIsStaff(storedIsStaff || storedRole === 'ADMIN' || storedRole === 'BUSINESS');
    };

    handleAuthCheck();
    // Check again if storage changes or periodically
    const authInterval = setInterval(handleAuthCheck, 5000);
    return () => clearInterval(authInterval);
  }, []);

  // Check for active chat room once on mount (or when token becomes available)
  useEffect(() => {
    if (!token || isStaff) return;

    const checkActiveChat = async () => {
      try {
        const chat = await fetcher('/support-chats/active/');
        if (chat) {
          setActiveChat(chat);
          setMessages(chat.messages || []);
          prevMessagesCountRef.current = (chat.messages || []).length;
        } else {
          setActiveChat(null);
          setMessages([]);
        }
      } catch (err: any) {
        // Silently ignore addon/permission errors — staff users don't use this widget
        if (!err?.message?.includes('add-on') && !err?.message?.includes('403')) {
          console.error('Error checking active support chat:', err);
        }
      }
    };


    checkActiveChat();
  }, [token, isStaff]);

  // Optimized Polling Logic
  useEffect(() => {
    if (!token || isStaff || !activeChat) return;

    const fetchMessages = async () => {
      try {
        const chat = await fetcher(`/support-chats/${activeChat.id}/`);
        if (chat) {
          setActiveChat(chat);
          const newMsgs = chat.messages || [];
          setMessages(newMsgs);
          
          if (newMsgs.length > prevMessagesCountRef.current) {
            // New messages arrived!
            if (!isOpen) {
              setHasNewMessages(true);
            }
            prevMessagesCountRef.current = newMsgs.length;
          }
        }
      } catch (err) {
        console.error('Error polling support messages:', err);
        // If chat was closed/deleted from backend, reset state
        if (err instanceof Error && err.message.includes('404')) {
          setActiveChat(null);
          setMessages([]);
        }
      }
    };

    // Determine polling interval based on widget state to minimize server load
    // 5 seconds if open and user is looking at it, 25 seconds if collapsed/closed
    const intervalTime = isOpen ? 5000 : 25000;
    const interval = setInterval(fetchMessages, intervalTime);

    return () => clearInterval(interval);
  }, [token, isStaff, activeChat, isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Clear notification dot when opening chat
  useEffect(() => {
    if (isOpen) {
      setHasNewMessages(false);
    }
  }, [isOpen]);

  const handleStartChat = async () => {
    setIsSubmitting(true);
    try {
      const chat = await fetcher('/support-chats/', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setActiveChat(chat);
      setMessages([]);
      prevMessagesCountRef.current = 0;
      setIsOpen(true);
    } catch (err) {
      alert('Error al iniciar el chat de soporte técnico');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const messageText = newMessage;
    setNewMessage('');
    setIsSubmitting(true);

    try {
      const sentMsg = await fetcher(`/support-chats/${activeChat.id}/add_message/`, {
        method: 'POST',
        body: JSON.stringify({ message: messageText }),
      });
      
      // Update messages list immediately for high responsiveness
      if (sentMsg && sentMsg.message && sentMsg.ai_reply) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const toAdd: Message[] = [];
          if (!ids.has(sentMsg.message.id)) toAdd.push(sentMsg.message);
          if (!ids.has(sentMsg.ai_reply.id)) toAdd.push(sentMsg.ai_reply);
          prevMessagesCountRef.current = prev.length + toAdd.length;
          return [...prev, ...toAdd];
        });
      } else if (sentMsg) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          if (ids.has(sentMsg.id)) return prev;
          prevMessagesCountRef.current = prev.length + 1;
          return [...prev, sentMsg];
        });
      }
    } catch (err) {
      alert('Error al enviar el mensaje');
      setNewMessage(messageText); // restore text
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseChat = async () => {
    if (!activeChat) return;
    if (!confirm('¿Estás seguro de que deseas cerrar esta sesión de chat de soporte?')) return;

    try {
      await fetcher(`/support-chats/${activeChat.id}/close/`, {
        method: 'POST',
      });
      setActiveChat(null);
      setMessages([]);
      prevMessagesCountRef.current = 0;
    } catch (err) {
      alert('Error al cerrar el chat');
    }
  };

  // Do not show widget if user is not authenticated or is staff
  if (!token || isStaff) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="bg-card-bg/95 dark:bg-card-bg/90 backdrop-blur-2xl border border-card-border rounded-[2rem] shadow-2xl mb-4 w-[360px] h-[500px] overflow-hidden flex flex-col animate-premium">
          {/* Header */}
          <div className="p-5 border-b border-card-border flex justify-between items-center bg-foreground/[0.02]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-nectar-gold rounded-full animate-pulse"></span>
                <h4 className="font-black text-sm tracking-tight text-foreground uppercase">Soporte Técnico</h4>
              </div>
              <p className="text-[9px] text-nectar-gold font-black uppercase tracking-widest mt-0.5">
                {activeChat ? `Sesión #${activeChat.id} - ${activeChat.status}` : 'Ingeniería Néctar'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {activeChat && activeChat.status !== 'CLOSED' && (
                <button 
                  onClick={handleCloseChat}
                  title="Cerrar sesión de chat"
                  className="text-[9px] font-black uppercase tracking-wider text-red-500 hover:bg-red-500/10 px-2.5 py-1.5 rounded-xl transition-all"
                >
                  Finalizar
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="text-foreground/40 hover:text-foreground hover:bg-foreground/5 w-8 h-8 rounded-full flex items-center justify-center transition-all text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>

          {/* Chat Messages / Setup */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {!activeChat ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 bg-nectar-gold/10 text-nectar-gold rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h5 className="font-black text-base text-foreground mb-2 uppercase tracking-wide">¿Necesitas soporte técnico?</h5>
                <p className="text-xs text-muted max-w-xs mb-8 leading-relaxed">
                  Conéctate directamente con nuestro equipo de desarrollo para resolver dudas o problemas en tiempo real.
                </p>
                <button
                  onClick={handleStartChat}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-nectar-gold text-background hover:scale-[1.02] active:scale-95 transition-all font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-nectar-gold/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Chat de Soporte'}
                </button>
              </div>
            ) : (
              <>
                <div className="text-center pb-2">
                  <span className="text-[8px] bg-foreground/5 text-muted px-3 py-1.5 rounded-full uppercase tracking-widest font-black">
                    Sesión de Chat Iniciada
                  </span>
                </div>
                
                {messages.map((msg) => {
                  const isAI = (msg as any).is_ai_message === true;
                  const isMine = !isAI && msg.sender_email === localStorage.getItem('user_email');
                  const isAgent = msg.sender_role === 'ADMIN' || msg.sender_role === 'BUSINESS';
                  return (
                    <div key={String(msg.id)} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-3xl p-4 shadow-sm ${
                        isMine 
                          ? 'bg-nectar-gold text-background rounded-tr-none' 
                          : 'bg-card-border/30 dark:bg-card-border/50 text-foreground rounded-tl-none border border-card-border'
                      }`}>
                        {!isMine && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[8px] font-black uppercase tracking-wider text-nectar-gold">
                              {isAI ? '🤖 Asistente IA' : isAgent ? '🛠️ Ingeniero Néctar' : (msg.sender_email?.split('@')[0] ?? 'Cliente')}
                            </span>
                          </div>
                        )}
                        <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        <p className="text-[7px] font-bold text-right mt-1.5 opacity-40">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Form */}
          {activeChat && activeChat.status !== 'CLOSED' && (
            <form onSubmit={handleSendMessage} className="p-4 border-t border-card-border bg-foreground/[0.01] flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje técnico..."
                className="flex-1 bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-colors"
                disabled={isSubmitting}
                required
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSubmitting}
                className="bg-nectar-gold text-background p-3 rounded-xl disabled:opacity-40 hover:scale-105 transition-all flex items-center justify-center"
              >
                <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Bubble Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-nectar-gold to-nectar-forest hover:to-nectar-leaf shadow-xl flex items-center justify-center text-background hover:scale-110 active:scale-95 transition-all relative border border-white/10"
      >
        {isOpen ? (
          <span className="text-2xl font-bold">×</span>
        ) : (
          <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        
        {/* Unread notification dot */}
        {hasNewMessages && !isOpen && (
          <span className="absolute top-0 right-0 w-4.5 h-4.5 bg-red-500 rounded-full border-2 border-background flex items-center justify-center text-[7px] font-black text-white">
            !
          </span>
        )}
      </button>
    </div>
  );
}
