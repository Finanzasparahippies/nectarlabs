'use client';

import React, { useState, useEffect, useRef } from 'react';

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

interface ChatWidgetProps {
  tenantId: string;
  tenantName: string;
  primaryColor: string;
  welcomeMessage: string;
}

export default function ChatWidget({ tenantId, tenantName, primaryColor, welcomeMessage }: ChatWidgetProps) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  // Sync token from localStorage for this specific tenant
  useEffect(() => {
    const handleAuthCheck = () => {
      const storedToken = localStorage.getItem(`nectar_guest_token_${tenantId}`);
      const storedEmail = localStorage.getItem(`nectar_guest_email_${tenantId}`);
      setToken(storedToken);
      if (storedEmail) setEmail(storedEmail);
    };

    handleAuthCheck();
    const interval = setInterval(handleAuthCheck, 4000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const customFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(endpoint, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed request');
    }
    if (res.status === 204) return null;
    return res.json();
  };

  // Check for active chat room
  useEffect(() => {
    if (!token) return;

    const checkActiveChat = async () => {
      try {
        const chat = await customFetch('/api/support-chats/active/');
        if (chat) {
          setActiveChat(chat);
          setMessages(chat.messages || []);
          prevMessagesCountRef.current = (chat.messages || []).length;
        } else {
          setActiveChat(null);
          setMessages([]);
        }
      } catch (err) {
        console.error('Error checking active support chat:', err);
      }
    };

    checkActiveChat();
  }, [token]);

  // Polling for new messages
  useEffect(() => {
    if (!token || !activeChat) return;

    const fetchMessages = async () => {
      try {
        const chat = await customFetch(`/api/support-chats/${activeChat.id}/`);
        if (chat) {
          setActiveChat(chat);
          const newMsgs = chat.messages || [];
          setMessages(newMsgs);
          
          if (newMsgs.length > prevMessagesCountRef.current) {
            if (!isOpen) {
              setHasNewMessages(true);
            }
            prevMessagesCountRef.current = newMsgs.length;
          }
        }
      } catch (err) {
        console.error('Error polling chat messages:', err);
      }
    };

    const intervalTime = isOpen ? 5000 : 20000;
    const interval = setInterval(fetchMessages, intervalTime);
    return () => clearInterval(interval);
  }, [token, activeChat, isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHasNewMessages(false);
    }
  }, [isOpen]);

  const handleStartChat = async () => {
    setIsSubmitting(true);
    try {
      const chat = await customFetch('/api/support-chats/', {
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
      const sentMsg = await customFetch(`/api/support-chats/${activeChat.id}/add_message/`, {
        method: 'POST',
        body: JSON.stringify({ message: messageText }),
      });
      
      setMessages((prev) => [...prev, sentMsg]);
      prevMessagesCountRef.current += 1;
    } catch (err) {
      alert('Error al enviar el mensaje');
      setNewMessage(messageText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseChat = async () => {
    if (!activeChat) return;
    if (!confirm('¿Deseas cerrar esta sesión de chat de soporte?')) return;

    try {
      await customFetch(`/api/support-chats/${activeChat.id}/close/`, {
        method: 'POST',
      });
      setActiveChat(null);
      setMessages([]);
      prevMessagesCountRef.current = 0;
    } catch (err) {
      alert('Error al cerrar el chat');
    }
  };

  if (!token) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-[#050a06]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl mb-4 w-[360px] h-[500px] overflow-hidden flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></span>
                <h4 className="font-black text-xs tracking-tight text-white uppercase">{tenantName} Chat</h4>
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color: primaryColor }}>
                {activeChat ? `Chat #${activeChat.id} - ${activeChat.status}` : 'Soporte en Vivo'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {activeChat && activeChat.status !== 'CLOSED' && (
                <button 
                  onClick={handleCloseChat}
                  className="text-[9px] font-black uppercase tracking-wider text-red-500 hover:bg-red-500/10 px-2.5 py-1.5 rounded-xl transition-all"
                >
                  Cerrar
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white hover:bg-white/5 w-8 h-8 rounded-full flex items-center justify-center transition-all text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages Panel */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {!activeChat ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h5 className="font-black text-xs text-white mb-2 uppercase tracking-wider">¿Deseas iniciar chat en vivo?</h5>
                <p className="text-[10px] text-white/50 max-w-xs mb-8 leading-relaxed">
                  {welcomeMessage}
                </p>
                <button
                  onClick={handleStartChat}
                  disabled={isSubmitting}
                  className="w-full py-4 text-black font-black uppercase tracking-widest text-[9px] rounded-2xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? 'Iniciando...' : 'Iniciar Conversación'}
                </button>
              </div>
            ) : (
              <>
                <div className="text-center pb-2">
                  <span className="text-[8px] bg-white/5 text-white/40 px-3 py-1.5 rounded-full uppercase tracking-widest font-black">
                    Conectado con soporte
                  </span>
                </div>
                
                {messages.map((msg) => {
                  const isMine = msg.sender_email.toLowerCase() === email.toLowerCase();
                  const isAgent = msg.sender_role === 'ADMIN' || msg.sender_role === 'BUSINESS';
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                          isMine ? 'text-black rounded-tr-none' : 'bg-white/5 text-white border border-white/5 rounded-tl-none'
                        }`}
                        style={isMine ? { backgroundColor: primaryColor } : {}}
                      >
                        {!isMine && (
                          <p className="text-[7.5px] font-black uppercase tracking-wider mb-1" style={{ color: primaryColor }}>
                            {isAgent ? '🛠️ Soporte' : msg.sender_email.split('@')[0]}
                          </p>
                        )}
                        <p className="text-[11px] font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-[6px] font-bold text-right mt-1 opacity-40 ${isMine ? 'text-black' : 'text-white'}`}>
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

          {/* Form */}
          {activeChat && activeChat.status !== 'CLOSED' && (
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-white/[0.005] flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-[#020403] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/10"
                disabled={isSubmitting}
                required
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSubmitting}
                className="p-3 rounded-xl hover:scale-105 transition-all text-black flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <svg className="w-3.5 h-3.5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
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
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all relative border border-white/10 text-black"
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? (
          <span className="text-2xl font-bold">×</span>
        ) : (
          <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        
        {hasNewMessages && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 rounded-full border-2 border-black flex items-center justify-center text-[7px] font-black text-white">
            !
          </span>
        )}
      </button>
    </div>
  );
}
