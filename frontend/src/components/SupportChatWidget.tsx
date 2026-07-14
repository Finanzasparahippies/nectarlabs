'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetcher } from '../lib/api';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();
  const [shouldHide, setShouldHide] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      // Ocultar si es un subdominio de nectarlabs (como carlos.nectarlabs.dev)
      const isSubdomain = parts.length > 2 && !hostname.includes('localhost');
      // Ocultar si estamos dentro de un iframe
      const inIframe = window.self !== window.top;
      // Ocultar si el path de Next.js es de cursos o tenants
      const isCoursePath = pathname && (pathname.includes('/cursos/') || pathname.includes('/tenants/'));

      if (isSubdomain || inIframe || isCoursePath) {
        setShouldHide(true);
      }
    }
  }, [pathname]);

  if (shouldHide) {
    return null;
  }

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
  const wsRef = useRef<WebSocket | null>(null);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  const showError = (msg: string) => {
    setWidgetError(msg);
    setTimeout(() => setWidgetError(null), 5000);
  };

  // Guest Fields
  const [guestName, setGuestName] = useState('');

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setIsSubmitting(true);
    try {
      // Call guest-auth with no tenant_id to register as a direct guest visitor of Néctar Labs
      const res = await fetch('/api/tenants/guest-auth/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guestName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.detail || 'Fallo al iniciar sesión de soporte');
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_email', data.email);
      localStorage.setItem('user_role', data.user_role);
      localStorage.setItem('is_staff', String(data.is_staff));

      setToken(data.token);
      setIsStaff(data.is_staff);

      // Auto start chat room using the newly obtained token
      const chat = await fetch(`/api/support-chats/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.token}`
        },
        body: JSON.stringify({}),
      });

      if (!chat.ok) {
        throw new Error('No se pudo crear la sesión de chat.');
      }

      const chatData = await chat.json();
      setActiveChat(chatData);
      setMessages([]);
      prevMessagesCountRef.current = 0;
      setIsOpen(true);
    } catch (err: any) {
      showError(err.message || 'Error al iniciar el chat de soporte técnico');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // ----------------------------------------------------------------------------
  // INICIALIZACIÓN DE CONEXIÓN WEBSOCKET Y FLUJO DE EVENTOS
  // Establece el socket con el servidor Realtime e implementa el mapeo de
  // eventos de streaming de la IA token-por-token.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!token || isStaff || !activeChat) return;

    // Determina el protocolo adecuado para asegurar la conexión (ws:// o wss://)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/?token=${encodeURIComponent(token)}`;

    console.log('[WebSocket] Conectando a:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Evento: Conexión establecida -> se suscribe a la sala de chat
    ws.onopen = () => {
      console.log('[WebSocket] Conexión abierta con éxito.');
      ws.send(JSON.stringify({ type: 'subscribe', chatId: activeChat.id }));
    };

    // Evento: Recepción de datos desde el WebSocket (Realtime backend)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 1. Mensaje estándar recibido (de cliente o agente humano)
        if (data.type === 'message' && data.chatId === activeChat.id) {
          const newMsg = data.message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const updated = [...prev, newMsg];
            prevMessagesCountRef.current = updated.length;
            if (!isOpen) {
              setHasNewMessages(true); // Encender alerta visual si el widget está colapsado
            }
            return updated;
          });
        }

        // 2. Comienzo de streaming de la IA (se inserta un mensaje temporal con ID -999)
        else if (data.type === 'ai_stream_start') {
          setMessages((prev) => [
            ...prev,
            {
              id: -999,
              sender_email: 'bot@nectarlabs.dev',
              sender_role: 'BOT',
              message: '',
              created_at: new Date().toISOString(),
              is_ai_message: true,
            } as any,
          ]);
        }

        // 3. Recepción de tokens individuales de la IA -> se concatenan al mensaje temporal -999
        else if (data.type === 'ai_stream_token') {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === -999) {
                return { ...m, message: m.message + data.token };
              }
              return m;
            })
          );
        }

        // 4. Fin de streaming de la IA -> se reemplaza el mensaje -999 con el registro guardado en DB
        else if (data.type === 'ai_stream_complete') {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== -999);
            if (filtered.some((m) => m.id === data.message.id)) return filtered;
            const updated = [...filtered, data.message];
            prevMessagesCountRef.current = updated.length;
            return updated;
          });
        }

        // 5. Cambio de estatus del chat (ej: agente tomó el chat)
        else if (data.type === 'status_change') {
          setActiveChat((prev) => prev ? { ...prev, status: data.status } : null);
        }

        // 6. Alertas de error enviadas por el socket
        else if (data.type === 'error') {
          showError(data.message);
        }
      } catch (err) {
        console.error('[WebSocket] Error procesando mensaje de entrada:', err);
      }
    };

    // Evento: Conexión cerrada
    ws.onclose = (event) => {
      console.log('[WebSocket] Conexión cerrada.', event.code, event.reason);
    };

    // Evento: Error de conexión
    ws.onerror = (err) => {
      console.error('[WebSocket] Error en conexión:', err);
    };

    // Cleanup: Cierra el socket al desmontar el componente o cambiar dependencias
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [token, isStaff, activeChat, isOpen]);

  const prevLengthRef = useRef(0);

  // Scroll to bottom when new messages arrive (only when length increases)
  useEffect(() => {
    if (isOpen && messages.length > prevLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevLengthRef.current = messages.length;
    }
  }, [messages.length, isOpen]);

  // Reset length when chat is closed or reset
  useEffect(() => {
    if (!isOpen || !activeChat) {
      prevLengthRef.current = 0;
    }
  }, [isOpen, activeChat]);

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
      showError('Error al iniciar el chat de soporte técnico');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const messageText = newMessage;
    setNewMessage('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          message: messageText,
        })
      );
    } else {
      showError('El chat está desconectado. Intentando reconectar...');
      setNewMessage(messageText);
    }
  };

  const handleCloseChat = () => {
    if (!activeChat) return;
    setShowCloseConfirm(true);
  };

  const confirmCloseChat = async () => {
    if (!activeChat) return;
    setShowCloseConfirm(false);
    try {
      await fetcher(`/support-chats/${activeChat.id}/close/`, {
        method: 'POST',
      });
      setActiveChat(null);
      setMessages([]);
      prevMessagesCountRef.current = 0;
    } catch (err) {
      showError('Error al cerrar el chat');
    }
  };

  // Do not show widget if user is staff (staff uses tickets page instead)
  if (isStaff) return null;

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
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar relative">
            {widgetError && (
              <div className="absolute top-2 left-2 right-2 bg-red-500/90 text-white text-[10px] font-bold p-2.5 rounded-xl text-center z-10 shadow-lg">
                {widgetError}
              </div>
            )}

            {showCloseConfirm ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4 animate-premium">
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">
                  ⚠️
                </div>
                <h5 className="font-black text-sm text-foreground uppercase tracking-wide">¿Cerrar Sesión de Chat?</h5>
                <p className="text-[10px] text-muted max-w-xs mx-auto leading-relaxed">
                  Esta acción finalizará tu conversación actual con soporte técnico. No podrás reactivar este mismo chat.
                </p>
                <div className="flex gap-3 w-full pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCloseConfirm(false)}
                    className="flex-1 py-2.5 bg-card-border hover:bg-card-border/80 text-foreground font-black uppercase tracking-widest text-[8px] rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmCloseChat}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[8px] rounded-xl transition-all cursor-pointer"
                  >
                    Sí, Cerrar
                  </button>
                </div>
              </div>
            ) : !token ? (
              /* Guest Auth Form */
              <form onSubmit={handleGuestSubmit} className="h-full flex flex-col justify-center space-y-4 px-2 animate-premium">
                <div className="text-center pb-2">
                  <div className="w-12 h-12 bg-nectar-gold/10 text-nectar-gold rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h5 className="font-black text-sm text-foreground uppercase tracking-wide">Conversa con Néctar Labs</h5>
                  <p className="text-[10px] text-muted max-w-xs mx-auto mt-1 leading-relaxed">
                    Escribe tu nombre para hablar con nuestro asistente de IA o un ingeniero técnico.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[8.5px] font-black uppercase tracking-wider text-muted">Nombre Completo</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    required
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-xs placeholder-foreground/20 focus:outline-none focus:border-nectar-gold transition-colors bg-background text-foreground font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-nectar-gold text-background font-black uppercase tracking-widest text-[9px] rounded-xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 mt-4 cursor-pointer"
                >
                  {isSubmitting ? 'Iniciando...' : 'Iniciar Conversación'}
                </button>
              </form>
            ) : !activeChat ? (
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
                      <div className={`max-w-[85%] rounded-3xl p-4 shadow-sm ${isMine
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
          {activeChat && activeChat.status !== 'CLOSED' && !showCloseConfirm && (
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
