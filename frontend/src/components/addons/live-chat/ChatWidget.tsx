'use client';

import React, { useState, useEffect, useRef } from 'react';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Message {
  id: number;
  sender_email: string;
  sender_role: string;
  message: string;
  is_ai_message: boolean;
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
  accentColor?: string;
  bgColor?: string;
  cardBgColor?: string;
  textColor?: string;
  borderColor?: string;
  welcomeMessage: string;
}

export default function ChatWidget({
  tenantId,
  tenantName,
  primaryColor,
  accentColor = '#10B981',
  bgColor = '#020403',
  cardBgColor = '#050a06',
  textColor = '#FFFFFF',
  borderColor = '#151F18',
  welcomeMessage
}: ChatWidgetProps) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };
  const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
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
  }, [messages, isOpen, isAiTyping]);

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
      showToast('Error al iniciar el chat de soporte técnico', 'error');
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

    // If chat is OPEN (AI mode), show typing indicator while waiting for AI reply
    const isAiMode = activeChat.status === 'OPEN';
    if (isAiMode) setIsAiTyping(true);

    try {
      const response = await customFetch(`/api/support-chats/${activeChat.id}/add_message/`, {
        method: 'POST',
        body: JSON.stringify({ message: messageText }),
      });

      // Backend may return { message, ai_reply } or just the message serializer data
      if (response && response.message && response.ai_reply) {
        // Both user message + AI reply returned together
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const toAdd: Message[] = [];
          if (!ids.has(response.message.id)) toAdd.push(response.message);
          if (!ids.has(response.ai_reply.id)) toAdd.push(response.ai_reply);
          prevMessagesCountRef.current = prev.length + toAdd.length;
          return [...prev, ...toAdd];
        });

      } else if (response) {
        // No AI reply this time (agent already joined or AI unavailable)
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          if (ids.has(response.id)) return prev;
          prevMessagesCountRef.current += 1;
          return [...prev, response];
        });
      }
    } catch (err) {
      showToast('Error al enviar el mensaje', 'error');
      setNewMessage(messageText);
    } finally {
      setIsSubmitting(false);
      setIsAiTyping(false);
    }
  };

  const handleCloseChat = () => {
    if (!activeChat) return;
    setConfirmDlg({
      isOpen: true,
      title: 'Cerrar Chat',
      message: '¿Deseas cerrar esta sesión de chat de soporte?',
      onConfirm: async () => {
        setConfirmDlg(null);
        try {
          await customFetch(`/api/support-chats/${activeChat.id}/close/`, {
            method: 'POST',
          });
          setActiveChat(null);
          setMessages([]);
          prevMessagesCountRef.current = 0;
          showToast('Sesión de chat cerrada.', 'success');
        } catch (err) {
          showToast('Error al cerrar el chat', 'error');
        }
      }
    });
  };

  if (!token) return null;

  const isHumanAgentActive = activeChat?.status === 'IN_PROGRESS';

  return (
    <div id="portal-chat-widget" className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      <style>{`
        #portal-chat-widget .widget-window {
          background-color: ${bgColor}e0 !important;
          border-color: ${borderColor} !important;
          color: ${textColor} !important;
        }
        #portal-chat-widget .widget-header {
          background-color: ${cardBgColor}80 !important;
          border-color: ${borderColor} !important;
        }
        #portal-chat-widget .widget-input {
          background-color: ${bgColor} !important;
          border-color: ${borderColor} !important;
          color: ${textColor} !important;
        }
        #portal-chat-widget .widget-input:focus {
          border-color: ${accentColor} !important;
        }
        #portal-chat-widget .widget-card {
          background-color: ${cardBgColor}a0 !important;
          border-color: ${borderColor} !important;
        }
        #portal-chat-widget .widget-border {
          border-color: ${borderColor} !important;
        }
        #portal-chat-widget .widget-close-btn:hover {
          color: ${accentColor} !important;
          background-color: ${cardBgColor}b0 !important;
        }
        #portal-chat-widget .ai-bubble {
          background: linear-gradient(135deg, ${cardBgColor}f0, ${bgColor}f0) !important;
          border-color: ${primaryColor}30 !important;
        }
        @keyframes nectar-typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        #portal-chat-widget .typing-dot {
          animation: nectar-typing 1.2s ease-in-out infinite;
        }
        #portal-chat-widget .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        #portal-chat-widget .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes nectar-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        #portal-chat-widget .msg-animate {
          animation: nectar-fadein 0.25s ease-out;
        }
      `}</style>

      {/* Chat Window */}
      {isOpen && (
        <div className="backdrop-blur-2xl border rounded-[2rem] shadow-2xl mb-4 w-[370px] overflow-hidden flex flex-col transition-all duration-300 widget-window widget-border"
          style={{ height: '520px' }}>
          
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center bg-white/[0.01] widget-header widget-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: isHumanAgentActive ? accentColor : primaryColor }}></span>
                <h4 className="font-black text-xs tracking-tight text-white uppercase">{tenantName} · Soporte</h4>
              </div>
              <p className="text-[8.5px] font-black uppercase tracking-widest mt-0.5" style={{ color: primaryColor }}>
                {isHumanAgentActive
                  ? '👤 Agente humano conectado'
                  : activeChat
                  ? '🤖 Asistente IA activo'
                  : 'Soporte en Vivo'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {activeChat && activeChat.status !== 'CLOSED' && (
                <button 
                  onClick={handleCloseChat}
                  className="text-[8.5px] font-black uppercase tracking-wider text-red-500 hover:bg-red-500/10 px-2 py-1 rounded-xl transition-all"
                >
                  Cerrar
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:bg-white/5 w-8 h-8 rounded-full flex items-center justify-center transition-all text-xl font-bold widget-close-btn"
              >
                ×
              </button>
            </div>
          </div>

          {/* Agent connected banner */}
          {isHumanAgentActive && (
            <div
              className="px-4 py-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-wider"
              style={{ backgroundColor: `${accentColor}18`, borderBottom: `1px solid ${accentColor}30`, color: accentColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></span>
              Un agente de soporte se ha unido a esta conversación
            </div>
          )}

          {/* Messages Panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {!activeChat ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                >
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h5 className="font-black text-xs text-white mb-2 uppercase tracking-wider">¿Necesitas ayuda?</h5>
                <p className="text-[10px] text-white/50 max-w-xs mb-6 leading-relaxed">
                  {welcomeMessage}
                </p>
                <div className="text-[9px] text-white/30 mb-6 flex items-center gap-2">
                  <span>🤖</span>
                  <span>Nuestro asistente IA responde al instante</span>
                </div>
                <button
                  onClick={handleStartChat}
                  disabled={isSubmitting}
                  className="w-full py-3.5 text-black font-black uppercase tracking-widest text-[9px] rounded-2xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? 'Iniciando...' : 'Iniciar Conversación'}
                </button>
              </div>
            ) : (
              <>
                <div className="text-center pb-1">
                  <span className="text-[7.5px] bg-white/5 text-white/30 px-3 py-1 rounded-full uppercase tracking-widest font-black">
                    {isHumanAgentActive ? '👤 Soporte humano activo' : '🤖 Respondido por IA · Un agente revisará tu caso'}
                  </span>
                </div>
                
                {messages.map((msg) => {
                  const isMine = msg.sender_email.toLowerCase() === email.toLowerCase() && !msg.is_ai_message;
                  const isAI = msg.is_ai_message;
                  const isAgent = !isAI && (msg.sender_role === 'ADMIN' || msg.sender_role === 'BUSINESS');

                  return (
                    <div key={msg.id} className={`flex msg-animate ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {/* AI icon avatar */}
                      {isAI && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-[10px]"
                          style={{ backgroundColor: `${primaryColor}18`, border: `1px solid ${primaryColor}30` }}>
                          🤖
                        </div>
                      )}
                      {/* Human agent avatar */}
                      {isAgent && !isAI && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-[10px]"
                          style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
                          👤
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] rounded-2xl p-3 shadow-sm ${
                          isMine
                            ? 'text-black rounded-tr-none'
                            : isAI
                            ? 'text-white rounded-tl-none ai-bubble border'
                            : 'text-white rounded-tl-none widget-card border'
                        }`}
                        style={isMine ? { backgroundColor: primaryColor } : {}}
                      >
                        {isAI && (
                          <p className="text-[7px] font-black uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: primaryColor }}>
                            <span>✦</span> Asistente IA
                          </p>
                        )}
                        {isAgent && (
                          <p className="text-[7px] font-black uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: accentColor }}>
                            🛠️ Agente de Soporte
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

                {/* AI Typing Indicator */}
                {isAiTyping && (
                  <div className="flex justify-start items-end gap-2 msg-animate">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px]"
                      style={{ backgroundColor: `${primaryColor}18`, border: `1px solid ${primaryColor}30` }}>
                      🤖
                    </div>
                    <div className="ai-bubble border rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                      <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: primaryColor }}></span>
                      <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: primaryColor }}></span>
                      <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: primaryColor }}></span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Form */}
          {activeChat && activeChat.status !== 'CLOSED' && (
            <form onSubmit={handleSendMessage} className="p-3 flex gap-2 widget-header widget-border border-t">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isHumanAgentActive ? 'Mensaje al agente...' : 'Pregúntale al asistente IA...'}
                className="flex-1 border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none widget-input"
                disabled={isSubmitting || isAiTyping}
                required
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSubmitting || isAiTyping}
                className="p-3 rounded-xl hover:scale-105 transition-all text-black flex items-center justify-center cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: primaryColor }}
              >
                <svg className="w-3.5 h-3.5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          )}

          {/* Closed chat banner */}
          {activeChat?.status === 'CLOSED' && (
            <div className="p-3 text-center border-t widget-border">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/30">
                Sesión finalizada · Crea un nuevo ticket si necesitas más ayuda
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bubble Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative border border-white/10 text-black cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
          boxShadow: `0 8px 30px -4px ${primaryColor}40`,
        }}
      >
        {isOpen ? (
          <span className="text-white text-2xl font-bold">×</span>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        
        {hasNewMessages && !isOpen && (
          <span 
            className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 flex items-center justify-center text-[7px] font-black text-white animate-bounce"
            style={{ borderColor: bgColor }}
          >
            !
          </span>
        )}
      </button>

      {/* Premium Toast & ConfirmModal Dialog Mounts */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {confirmDlg && (
        <ConfirmModal
          isOpen={confirmDlg.isOpen}
          title={confirmDlg.title}
          message={confirmDlg.message}
          onConfirm={confirmDlg.onConfirm}
          onCancel={() => setConfirmDlg(null)}
        />
      )}
    </div>
  );
}
