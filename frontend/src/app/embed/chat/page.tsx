'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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

interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  theme_color: string;
  accent_color: string;
  bg_color: string;
  card_bg_color: string;
  text_color: string;
  border_color: string;
  logo_url: string | null;
  welcome_message: string;
  require_customer_info: boolean;
}

function ChatWidgetContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant_id');

  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat States
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  // 1. Fetch Tenant Configuration on mount
  useEffect(() => {
    if (!tenantId) {
      setError('Missing tenant_id parameter');
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/tenants/public-config/?tenant_id=${tenantId}`);
        if (!res.ok) throw new Error('Failed to load tenant configuration');
        const data = await res.json();
        setTenantConfig(data);

        // Check if there is an existing guest token for this specific tenant in localStorage
        const storedToken = localStorage.getItem(`nectar_guest_token_${tenantId}`);
        const storedEmail = localStorage.getItem(`nectar_guest_email_${tenantId}`);
        if (storedToken && storedEmail) {
          setToken(storedToken);
          setEmail(storedEmail);
          setIsAuthenticated(true);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [tenantId]);

  // 2. Custom fetch helper that handles guest JWT authentication and token headers
  const embedFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const currentToken = token || (tenantId ? localStorage.getItem(`nectar_guest_token_${tenantId}`) : null);
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (res.status === 401) {
      // Guest session expired, clear token and prompt for login again
      if (tenantId) {
        localStorage.removeItem(`nectar_guest_token_${tenantId}`);
        localStorage.removeItem(`nectar_guest_email_${tenantId}`);
      }
      setToken(null);
      setIsAuthenticated(false);
      setActiveChat(null);
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || 'Request failed');
    }

    if (res.status === 204) return null;
    return res.json();
  };

  // 3. Notify parent frame of container resize when toggled open/closed
  useEffect(() => {
    const action = isOpen ? 'expand' : 'collapse';
    window.parent.postMessage(
      {
        type: 'nectar-widget-action',
        action: action,
      },
      '*'
    );
  }, [isOpen]);

  // 4. Check for active chat room once authenticated
  useEffect(() => {
    if (!isAuthenticated || !tenantId) return;

    const checkActiveChat = async () => {
      try {
        const chat = await embedFetch('/api/support-chats/active/');
        if (chat) {
          setActiveChat(chat);
          setMessages(chat.messages || []);
          prevMessagesCountRef.current = (chat.messages || []).length;
        } else {
          setActiveChat(null);
          setMessages([]);
        }
      } catch (err) {
        console.error('Error checking active chat:', err);
      }
    };

    checkActiveChat();
  }, [isAuthenticated, tenantId]);

  // 5. Polling Logic for new support messages
  useEffect(() => {
    if (!isAuthenticated || !activeChat || !tenantId) return;

    const fetchMessages = async () => {
      try {
        const chat = await embedFetch(`/api/support-chats/${activeChat.id}/`);
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

    const intervalTime = isOpen ? 4000 : 20000;
    const interval = setInterval(fetchMessages, intervalTime);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeChat, isOpen, tenantId]);

  // Scroll to bottom when messages list updates
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

  // Handle Guest Authentication
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tenantId) return;

    setIsSubmitting(true);
    try {
      const data = await embedFetch('/api/tenants/guest-auth/', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          name: name.trim(),
        }),
      });

      // Save token to localStorage
      localStorage.setItem(`nectar_guest_token_${tenantId}`, data.token);
      localStorage.setItem(`nectar_guest_email_${tenantId}`, data.email);
      setToken(data.token);
      setIsAuthenticated(true);
    } catch (err: any) {
      alert(err.message || 'Error al iniciar sesión de soporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Chat Room
  const handleStartChat = async () => {
    setIsSubmitting(true);
    try {
      const chat = await embedFetch('/api/support-chats/', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setActiveChat(chat);
      setMessages([]);
      prevMessagesCountRef.current = 0;
    } catch (err) {
      alert('Error al iniciar el chat de soporte técnico');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const messageText = newMessage;
    setNewMessage('');
    setIsSubmitting(true);

    try {
      const sentMsg = await embedFetch(`/api/support-chats/${activeChat.id}/add_message/`, {
        method: 'POST',
        body: JSON.stringify({ message: messageText }),
      });

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
      setNewMessage(messageText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseChat = async () => {
    if (!activeChat) return;
    if (!confirm('¿Estás seguro de que deseas cerrar esta sesión de chat de soporte?')) return;

    try {
      await embedFetch(`/api/support-chats/${activeChat.id}/close/`, {
        method: 'POST',
      });
      setActiveChat(null);
      setMessages([]);
      prevMessagesCountRef.current = 0;
    } catch (err) {
      alert('Error al cerrar el chat');
    }
  };

  const handleLogout = () => {
    if (tenantId) {
      localStorage.removeItem(`nectar_guest_token_${tenantId}`);
      localStorage.removeItem(`nectar_guest_email_${tenantId}`);
    }
    setToken(null);
    setIsAuthenticated(false);
    setActiveChat(null);
    setMessages([]);
  };

  if (loading) return null; // Keep it invisible while loading
  if (error || !tenantConfig) return null;

  // Resolve Brand Theme Colors dynamically
  const primaryColor = tenantConfig.theme_color || '#C68A1E';

  return (
    <div id="nectar-chat-widget" className="w-full h-full flex flex-col items-end justify-end select-none font-sans overflow-hidden p-3 bg-transparent">
      <style>{`
        #nectar-chat-widget .widget-window {
          background-color: ${tenantConfig.bg_color || '#020403'}e0 !important;
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
          color: ${tenantConfig.text_color || '#FFFFFF'} !important;
        }
        #nectar-chat-widget .widget-header {
          background-color: ${tenantConfig.card_bg_color || '#050a06'}80 !important;
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
        }
        #nectar-chat-widget .widget-input {
          background-color: ${tenantConfig.bg_color || '#020403'} !important;
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
          color: ${tenantConfig.text_color || '#FFFFFF'} !important;
        }
        #nectar-chat-widget .widget-input:focus {
          border-color: ${tenantConfig.accent_color || '#10B981'} !important;
        }
        #nectar-chat-widget .widget-card {
          background-color: ${tenantConfig.card_bg_color || '#050a06'}a0 !important;
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
        }
        #nectar-chat-widget .widget-border {
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
        }
        #nectar-chat-widget .widget-close-btn:hover {
          color: ${tenantConfig.accent_color || '#10B981'} !important;
          background-color: ${tenantConfig.card_bg_color || '#050a06'}b0 !important;
        }
      `}</style>
      {/* 1. Chat Widget Window (Only rendered if open) */}
      {isOpen && (
        <div className="w-full h-[calc(100%-80px)] backdrop-blur-2xl border rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-premium widget-window widget-border">
          {/* Header */}
          <div className="p-4.5 border-b flex justify-between items-center bg-white/[0.01] widget-header widget-border">
            <div className="flex items-center gap-2.5">
              {tenantConfig.logo_url ? (
                <img
                  src={tenantConfig.logo_url}
                  alt={tenantConfig.name}
                  className="w-7 h-7 rounded-full object-cover border border-white/10"
                />
              ) : (
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-black border border-white/10"
                  style={{ backgroundColor: primaryColor }}
                >
                  {tenantConfig.name.substring(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <h4 className="font-black text-xs text-white tracking-tight uppercase">Soporte {tenantConfig.name}</h4>
                <p className="text-[7.5px] uppercase tracking-wider mt-0.5 font-black opacity-80" style={{ color: primaryColor }}>
                  {activeChat ? `Chat #${activeChat.id} - ${activeChat.status}` : 'Línea Directa'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  title="Salir"
                  className="text-[8px] font-black uppercase bg-white/5 px-2 py-1 rounded-lg transition-all border widget-border hover:opacity-85"
                  style={{ color: tenantConfig.accent_color || '#10B981', borderColor: `${tenantConfig.accent_color || '#10B981'}30` }}
                >
                  Salir
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/40 bg-white/5 w-7 h-7 rounded-full flex items-center justify-center transition-all text-lg font-bold widget-close-btn"
              >
                ×
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4.5 space-y-4 custom-scrollbar">
            {!isAuthenticated ? (
              /* Guest Auth Form */
              <form onSubmit={handleGuestSubmit} className="h-full flex flex-col justify-center space-y-4 px-2">
                <div className="text-center pb-2">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-black shadow-lg"
                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h5 className="font-black text-sm text-white uppercase tracking-wide">Iniciar Sesión de Soporte</h5>
                  <p className="text-[10px] text-white/50 max-w-xs mx-auto mt-1 leading-relaxed">
                    Por favor introduce tu nombre para conectarte con un ingeniero de {tenantConfig.name}.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Nombre Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    required
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs placeholder-white/20 focus:outline-none transition-all font-medium widget-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 text-black font-black uppercase tracking-widest text-[9px] rounded-xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 mt-4 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? 'Iniciando...' : 'Iniciar Conversación'}
                </button>
              </form>
            ) : !activeChat ? (
              /* Setup Support Room */
              <div className="h-full flex flex-col items-center justify-center text-center p-3">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h5 className="font-black text-sm text-white uppercase tracking-wide">Canal de Soporte Activo</h5>
                <p className="text-[10px] text-white/50 max-w-xs mb-8 leading-relaxed mt-1">
                  {tenantConfig.welcome_message}
                </p>
                <button
                  onClick={handleStartChat}
                  disabled={isSubmitting}
                  className="w-full py-3.5 text-black font-black uppercase tracking-widest text-[9px] rounded-xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? 'Abriendo canal...' : 'Hablar con un Agente'}
                </button>
              </div>
            ) : (
              /* Support Chat Interface */
              <>
                <div className="text-center pb-1">
                  <span className="text-[7.5px] bg-white/5 text-white/40 px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                    Canal Abierto
                  </span>
                </div>

                {messages.map((msg) => {
                  const isMine = msg.sender_email.toLowerCase() === email.toLowerCase();
                  const isAgent = msg.sender_role === 'ADMIN' || msg.sender_role === 'BUSINESS';
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm ${
                          isMine
                            ? 'text-black rounded-tr-none'
                            : 'border rounded-tl-none widget-card'
                        }`}
                        style={isMine ? { backgroundColor: primaryColor } : {}}
                      >
                        {!isMine && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[7.5px] font-black uppercase tracking-wider" style={{ color: primaryColor }}>
                              {isAgent ? '🛠️ Agente Soporte' : msg.sender_email.split('@')[0]}
                            </span>
                          </div>
                        )}
                        <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-[6.5px] font-bold text-right mt-1 opacity-45 ${isMine ? 'text-black' : 'text-white'}`}>
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

          {/* Footer Input */}
          {activeChat && activeChat.status !== 'CLOSED' && (
            <div className="p-3 border-t bg-white/[0.005] widget-header widget-border">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  className="flex-1 border rounded-xl px-3.5 py-2.5 text-xs placeholder-white/20 focus:outline-none transition-all widget-input"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSubmitting}
                  className="p-3 rounded-xl disabled:opacity-40 hover:scale-105 transition-all flex items-center justify-center cursor-pointer text-black"
                  style={{ backgroundColor: primaryColor }}
                >
                  <svg className="w-3.5 h-3.5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>
              <div className="flex justify-between items-center mt-2 px-1">
                <span className="text-[7.5px] text-white/20 font-black tracking-widest uppercase">
                  Powered by Néctar Labs
                </span>
                <button
                  onClick={handleCloseChat}
                  className="text-[7.5px] font-black uppercase text-red-500/80 hover:text-red-500 hover:bg-red-500/5 px-2 py-1 rounded-lg transition-all"
                >
                  Cerrar Chat
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Floating Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all relative border border-white/10 cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${tenantConfig.accent_color || '#10B981'})`,
          boxShadow: `0 8px 30px -4px ${primaryColor}40`,
        }}
      >
        {isOpen ? (
          <span className="text-white text-2xl font-bold">×</span>
        ) : (
          <svg className="w-5.5 h-5.5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}

        {hasNewMessages && !isOpen && (
          <span
            className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 flex items-center justify-center text-[7px] font-black text-white"
            style={{ borderColor: tenantConfig.bg_color || '#020403' }}
          >
            !
          </span>
        )}
      </button>
    </div>
  );
}

export default function ChatWidgetPage() {
  return (
    <Suspense fallback={null}>
      <ChatWidgetContent />
    </Suspense>
  );
}
