'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

const ChatWidget = dynamic(() => import('@/components/addons/live-chat/ChatWidget'), { ssr: false });
const BookingCanvas = dynamic(() => import('@/components/addons/booking-signature/BookingCanvas'), { ssr: false });
const FleetMap = dynamic(() => import('@/components/addons/logistics-gps/FleetMap'), { ssr: false });
const SponsorTiers = dynamic(() => import('@/components/addons/patreon-sponsorship/SponsorTiers'), { ssr: false });
const TelemetryDashboard = dynamic(() => import('@/components/addons/analytics-apm/TelemetryDashboard'), { ssr: false });
const SubscribeForm = dynamic(() => import('@/components/addons/newsletter-campaigner/SubscribeForm'), { ssr: false });

interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  welcome_message: string;
  portal_title: string | null;
  footer_text: string | null;
  require_customer_info: boolean;
  theme_color: string;
  accent_color: string;
  bg_color: string;
  card_bg_color: string;
  text_color: string;
  border_color: string;
  theme_color_light?: string;
  accent_color_light?: string;
  bg_color_light?: string;
  card_bg_color_light?: string;
  text_color_light?: string;
  border_color_light?: string;
  pollen_active?: boolean;
  pollen_icon?: string;
  pollen_color?: string;
  pollen_count?: number;
  pollen_blur?: number;
  active_addons?: string[];
}


interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  messages: Array<{
    id: number;
    sender_email: string;
    content: string;
    created_at: string;
  }>;
}

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

const getMainDomainUrl = (path: string) => {
  if (typeof window === 'undefined') return path;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  let mainDomain = 'nectarlabs.dev';
  if (hostname.includes('.staging.nectarlabs.dev')) {
    mainDomain = 'staging.nectarlabs.dev';
  } else if (hostname.includes('.nectarlabs.dev')) {
    mainDomain = 'nectarlabs.dev';
  } else if (hostname.includes('localhost')) {
    mainDomain = 'localhost';
  } else if (hostname.includes('127.0.0.1')) {
    mainDomain = '127.0.0.1';
  }

  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${mainDomain}${portSuffix}${path}`;
};

export default function TenantPortalPage() {
  const params = useParams();
  const rawSubdomain = params?.subdomain as string;
  const [subdomain, setSubdomain] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [currentSection, setCurrentSection] = useState<'addons' | 'support'>('addons');

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (rawSubdomain) {
      setSubdomain(rawSubdomain);
      return;
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      let parsed = '';

      if (hostname.includes('.staging.nectarlabs.dev')) {
        parsed = hostname.split('.staging.nectarlabs.dev')[0];
      } else if (hostname.includes('.nectarlabs.dev')) {
        parsed = hostname.split('.nectarlabs.dev')[0];
      } else if (hostname.includes('.localhost:3000')) {
        parsed = hostname.split('.localhost:3000')[0];
      } else if (hostname.includes('.localhost:3002')) {
        parsed = hostname.split('.localhost:3002')[0];
      } else if (hostname.includes('.localhost')) {
        parsed = hostname.split('.localhost')[0];
      }

      if (parsed && parsed !== 'www' && parsed !== 'api' && parsed !== 'admin' && parsed !== 'staging') {
        setSubdomain(parsed);
      }
    }
  }, [rawSubdomain]);

  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth & Session
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Active addon state for non-chat modules
  const [activeAddonTab, setActiveAddonTab] = useState<string | null>(null);

  const activeAddonsList = tenantConfig?.active_addons || [];
  const otherActiveAddons = activeAddonsList.filter(slug => slug !== 'live-chat');

  useEffect(() => {
    if (tenantConfig?.active_addons) {
      const otherAddons = tenantConfig.active_addons.filter(slug => slug !== 'live-chat');
      if (otherAddons.length > 0) {
        if (!activeAddonTab || !otherAddons.includes(activeAddonTab)) {
          setActiveAddonTab(otherAddons[0]);
        }
      } else {
        setActiveAddonTab(null);
      }
    }
  }, [tenantConfig]);

  // Tickets State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState('QUESTION');
  const [newTicketPriority, setNewTicketPriority] = useState('MEDIUM');
  const [ticketMessageText, setTicketMessageText] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isSendingTicketMsg, setIsSendingTicketMsg] = useState(false);

  // Live Chat State
  const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevChatCountRef = useRef<number>(0);

  // 1. Fetch Tenant Configuration on mount
  useEffect(() => {
    if (!subdomain) return;

    const fetchConfig = async () => {
      try {
        // Resolve using the subdomain slug
        const res = await fetch(`/api/tenants/public-config/?subdomain=${subdomain}`);
        if (!res.ok) throw new Error('Portal no encontrado o inactivo');
        const data = await res.json();
        setTenantConfig(data);

        // Check for local credentials
        const storedToken = localStorage.getItem(`nectar_guest_token_${data.id}`);
        const storedEmail = localStorage.getItem(`nectar_guest_email_${data.id}`);
        if (storedToken && storedEmail) {
          setToken(storedToken);
          setEmail(storedEmail);
          setIsAuthenticated(true);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar el portal');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [subdomain]);

  useEffect(() => {
    if (tenantConfig) {
      document.title = tenantConfig.portal_title || `${tenantConfig.name} - Portal Oficial`;
    }
  }, [tenantConfig]);

  // 2. Custom fetch helper
  const portalFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const currentToken = token || (tenantConfig ? localStorage.getItem(`nectar_guest_token_${tenantConfig.id}`) : null);
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
      if (tenantConfig) {
        localStorage.removeItem(`nectar_guest_token_${tenantConfig.id}`);
        localStorage.removeItem(`nectar_guest_email_${tenantConfig.id}`);
      }
      setToken(null);
      setIsAuthenticated(false);
      setActiveChat(null);
      setTickets([]);
      throw new Error('Sesión expirada');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || 'Operación fallida');
    }

    if (res.status === 204) return null;
    return res.json();
  };

  // 3. Load Tickets and Active Chat on auth success
  const loadPortalData = async () => {
    if (!isAuthenticated || !tenantConfig) return;
    try {
      // Fetch user's tickets
      const ticketsData = await portalFetch('/api/tickets/');
      setTickets(ticketsData);

      // Fetch active chat
      const chat = await portalFetch('/api/support-chats/active/');
      if (chat) {
        setActiveChat(chat);
        setChatMessages(chat.messages || []);
        prevChatCountRef.current = (chat.messages || []).length;
      } else {
        setActiveChat(null);
        setChatMessages([]);
      }
    } catch (err) {
      console.error('Error loading portal data:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && tenantConfig) {
      loadPortalData();
    }
  }, [isAuthenticated, tenantConfig]);

  // 4. Polling for Live Chat & Ticket Updates
  useEffect(() => {
    if (!isAuthenticated || !tenantConfig) return;

    const pollData = async () => {
      try {
        // Poll current tickets briefly (less frequent)
        const ticketsData = await portalFetch('/api/tickets/');
        setTickets(ticketsData);
        if (selectedTicket) {
          const updated = ticketsData.find((t: Ticket) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }

        // Poll chat messages (more frequent)
        if (activeChat) {
          const chat = await portalFetch(`/api/support-chats/${activeChat.id}/`);
          if (chat) {
            setActiveChat(chat);
            setChatMessages(chat.messages || []);
          }
        }
      } catch (err) {
        console.error('Error polling portal updates:', err);
      }
    };

    const interval = setInterval(pollData, 6000);
    return () => clearInterval(interval);
  }, [isAuthenticated, tenantConfig, activeChat, selectedTicket?.id]);

  const prevChatMessagesLengthRef = useRef(0);

  // Scroll chat to bottom on updates (only when length increases)
  useEffect(() => {
    if (chatMessages.length > prevChatMessagesLengthRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevChatMessagesLengthRef.current = chatMessages.length;
    }
  }, [chatMessages.length]);

  // Login/Auth Submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !tenantConfig) return;
    if (tenantConfig.require_customer_info && !name.trim()) return;

    setIsSubmittingAuth(true);
    try {
      const data = await portalFetch('/api/tenants/guest-auth/', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantConfig.id,
          email: email.trim(),
          name: name.trim(),
        }),
      });

      localStorage.setItem(`nectar_guest_token_${tenantConfig.id}`, data.token);
      localStorage.setItem(`nectar_guest_email_${tenantConfig.id}`, data.email);
      setToken(data.token);
      setIsAuthenticated(true);
      showToast('Sesión iniciada con éxito', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al iniciar sesión', 'error');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Ticket Management
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketDesc.trim()) return;

    setIsCreatingTicket(true);
    try {
      const ticket = await portalFetch('/api/tickets/', {
        method: 'POST',
        body: JSON.stringify({
          title: newTicketTitle,
          description: newTicketDesc,
          category: newTicketCategory,
          priority: newTicketPriority,
        }),
      });

      setTickets((prev) => [ticket, ...prev]);
      setNewTicketTitle('');
      setNewTicketDesc('');
      showToast('Ticket de soporte creado correctamente.', 'success');
    } catch (err) {
      showToast('Error al crear el ticket.', 'error');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleSendTicketMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessageText.trim() || !selectedTicket) return;

    setIsSendingTicketMsg(true);
    try {
      const msg = await portalFetch(`/api/tickets/${selectedTicket.id}/add_message/`, {
        method: 'POST',
        body: JSON.stringify({ content: ticketMessageText }),
      });

      setSelectedTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...(prev.messages || []), msg],
        };
      });
      setTicketMessageText('');
    } catch (err) {
      showToast('Error al enviar respuesta al ticket.', 'error');
    } finally {
      setIsSendingTicketMsg(false);
    }
  };

  // Live Chat Management
  const handleStartChat = async () => {
    try {
      const chat = await portalFetch('/api/support-chats/', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setActiveChat(chat);
      setChatMessages([]);
    } catch (err) {
      showToast('Error al iniciar sesión de chat.', 'error');
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !activeChat) return;

    const msgText = newChatMessage;
    setNewChatMessage('');
    setIsSendingChat(true);

    try {
      const sent = await portalFetch(`/api/support-chats/${activeChat.id}/add_message/`, {
        method: 'POST',
        body: JSON.stringify({ message: msgText }),
      });

      if (sent && sent.message && sent.ai_reply) {
        setChatMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const toAdd: any[] = [];
          if (!ids.has(sent.message.id)) toAdd.push(sent.message);
          if (!ids.has(sent.ai_reply.id)) toAdd.push(sent.ai_reply);
          return [...prev, ...toAdd];
        });
      } else if (sent) {
        setChatMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          if (ids.has(sent.id)) return prev;
          return [...prev, sent];
        });
      }
    } catch (err) {
      showToast('Error al enviar el mensaje.', 'error');
      setNewChatMessage(msgText);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleCloseChat = () => {
    if (!activeChat) return;
    setConfirmDlg({
      isOpen: true,
      title: 'Finalizar Chat',
      message: '¿Deseas finalizar la sesión de chat?',
      onConfirm: async () => {
        setConfirmDlg(null);
        try {
          await portalFetch(`/api/support-chats/${activeChat.id}/close/`, {
            method: 'POST',
          });
          setActiveChat(null);
          setChatMessages([]);
          showToast('Sesión de chat finalizada.', 'success');
        } catch (err) {
          showToast('Error al finalizar el chat.', 'error');
        }
      }
    });
  };

  const handleLogout = () => {
    if (tenantConfig) {
      localStorage.removeItem(`nectar_guest_token_${tenantConfig.id}`);
      localStorage.removeItem(`nectar_guest_email_${tenantConfig.id}`);
    }
    setToken(null);
    setIsAuthenticated(false);
    setActiveChat(null);
    setTickets([]);
    setSelectedTicket(null);
    showToast('Sesión cerrada correctamente.', 'info');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020403] text-white flex flex-col items-center justify-center font-sans">
        <span className="w-8 h-8 rounded-full border-4 border-t-white border-white/10 animate-spin"></span>
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-white/50">Cargando Portal...</p>
      </div>
    );
  }

  if (error || !tenantConfig) {
    return (
      <div className="min-h-screen bg-[#020403] text-white flex flex-col items-center justify-center font-sans px-6 text-center">
        <h1 className="text-xl font-black text-red-500 uppercase tracking-widest mb-2">Error de Enrutamiento</h1>
        <p className="text-sm text-white/60 max-w-md">{error || 'El portal solicitado no se encuentra activo.'}</p>
        <a
          href="https://nectarlabs.dev"
          className="mt-8 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Volver al Inicio
        </a>
      </div>
    );
  }

  const primaryColor = isDarkMode ? (tenantConfig.theme_color || '#C68A1E') : (tenantConfig.theme_color_light || '#C68A1E');
  const pollenColor = tenantConfig.pollen_color || primaryColor;
  const pollenIcon = tenantConfig.pollen_icon || '•';

  return (
    <div id="tenant-portal-root" className="min-h-screen flex flex-col font-sans relative overflow-hidden">
      {/* 🐝 Néctar Pollen Particles Effect */}
      {tenantConfig.pollen_active !== false && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {Array.from({ length: tenantConfig.pollen_count || 6 }).map((_, idx) => {
            const left = `${(idx * (100 / (tenantConfig.pollen_count || 6))) + 5}%`;
            const duration = `${8 + (idx * 3) % 15}s`;
            const delay = `${(idx * 1.5) % 6}s`;
            return (
              <div
                key={idx}
                className="pollen-particle animate-[float-pollen_10s_infinite_linear]"
                style={{
                  left,
                  animation: `float-pollen ${duration} infinite linear`,
                  animationDelay: delay,
                }}
              >
                {pollenIcon}
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        #tenant-portal-root {
          background-color: ${isDarkMode ? (tenantConfig.bg_color || '#020403') : (tenantConfig.bg_color_light || '#FAFAFA')} !important;
          color: ${isDarkMode ? (tenantConfig.text_color || '#FFFFFF') : (tenantConfig.text_color_light || '#111827')} !important;
        }
        #tenant-portal-root .tenant-header {
          background-color: ${isDarkMode ? (tenantConfig.card_bg_color || '#050a06') + '80' : (tenantConfig.card_bg_color_light || '#FFFFFF') + '80'} !important;
          border-color: ${isDarkMode ? (tenantConfig.border_color || '#151F18') : (tenantConfig.border_color_light || '#E5E7EB')} !important;
        }
        #tenant-portal-root .tenant-card {
          background-color: ${isDarkMode ? (tenantConfig.card_bg_color || '#050a06') + 'a0' : (tenantConfig.card_bg_color_light || '#FFFFFF')} !important;
          border-color: ${isDarkMode ? (tenantConfig.border_color || '#151F18') : (tenantConfig.border_color_light || '#E5E7EB')} !important;
        }
        #tenant-portal-root .tenant-input {
          background-color: ${isDarkMode ? (tenantConfig.bg_color || '#020403') : (tenantConfig.card_bg_color_light || '#FFFFFF')} !important;
          border-color: ${isDarkMode ? (tenantConfig.border_color || '#151F18') : (tenantConfig.border_color_light || '#E5E7EB')} !important;
          color: ${isDarkMode ? (tenantConfig.text_color || '#FFFFFF') : (tenantConfig.text_color_light || '#111827')} !important;
        }
        #tenant-portal-root .tenant-border {
          border-color: ${isDarkMode ? (tenantConfig.border_color || '#151F18') : (tenantConfig.border_color_light || '#E5E7EB')} !important;
        }
        #tenant-portal-root .tenant-footer {
          background-color: ${isDarkMode ? (tenantConfig.card_bg_color || '#050a06') + 'a0' : (tenantConfig.card_bg_color_light || '#FFFFFF')} !important;
          border-color: ${isDarkMode ? (tenantConfig.border_color || '#151F18') : (tenantConfig.border_color_light || '#E5E7EB')} !important;
        }
        #tenant-portal-root .text-white {
          color: ${isDarkMode ? '#FFFFFF' : '#111827'} !important;
        }
        #tenant-portal-root .text-white\\/50 {
          color: ${isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(17, 24, 39, 0.6)'} !important;
        }
        #tenant-portal-root .text-white\\/30 {
          color: ${isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(17, 24, 39, 0.4)'} !important;
        }
        #tenant-portal-root .text-white\\/35 {
          color: ${isDarkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(17, 24, 39, 0.45)'} !important;
        }
        #tenant-portal-root .text-white\\/40 {
          color: ${isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(17, 24, 39, 0.5)'} !important;
        }
        #tenant-portal-root .text-white\\/60 {
          color: ${isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(17, 24, 39, 0.65)'} !important;
        }
        #tenant-portal-root .text-white\\/70 {
          color: ${isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(17, 24, 39, 0.75)'} !important;
        }
        #tenant-portal-root .bg-white\\/5 {
          background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} !important;
        }
        #tenant-portal-root .hover\\:bg-white\\/10:hover {
          background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} !important;
        }
        #tenant-portal-root .border-white\\/5 {
          border-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} !important;
        }
        #tenant-portal-root .hover\\:border-white\\/10:hover {
          border-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} !important;
        }
        @keyframes float-pollen {
          0% { transform: translateY(-5vh) translateX(0) scale(0.6); opacity: 0; }
          15% { opacity: 0.8; }
          85% { opacity: 0.8; }
          100% { transform: translateY(105vh) translateX(45px) scale(1.4); opacity: 0; }
        }
        .pollen-particle {
          position: absolute;
          width: auto;
          height: auto;
          font-size: 16px;
          line-height: 1;
          color: ${pollenColor} !important;
          pointer-events: none;
          user-select: none;
          filter: blur(${tenantConfig.pollen_blur !== undefined ? tenantConfig.pollen_blur : 0.2}px);
          text-shadow: 0 0 8px ${pollenColor};
        }
      `}</style>
      `}</style>

      {/* 1. Header Navigation */}
      <header className="border-b backdrop-blur-md sticky top-0 z-50 tenant-header">
        <div className="max-w-7xl mx-auto px-6 h-18 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {tenantConfig.logo_url ? (
              <img src={tenantConfig.logo_url} alt={tenantConfig.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-black"
                style={{ backgroundColor: primaryColor }}
              >
                {tenantConfig.name.substring(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight text-white">{tenantConfig.name}</h1>
              <p className="text-[9px] uppercase tracking-widest font-black opacity-60">{tenantConfig.portal_title || 'Portal de Servicios'}</p>
            </div>
          </div>

          {/* Section Selector tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSection('addons')}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer"
              style={{
                backgroundColor: currentSection === 'addons' ? `${primaryColor}15` : 'transparent',
                borderColor: currentSection === 'addons' ? primaryColor : 'transparent',
                color: currentSection === 'addons' ? primaryColor : (isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(17, 24, 39, 0.6)')
              }}
            >
              🚀 Inicio
            </button>
            <button
              onClick={() => setCurrentSection('support')}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer"
              style={{
                backgroundColor: currentSection === 'support' ? `${primaryColor}15` : 'transparent',
                borderColor: currentSection === 'support' ? primaryColor : 'transparent',
                color: currentSection === 'support' ? primaryColor : (isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(17, 24, 39, 0.6)')
              }}
            >
              🛠️ Soporte Técnico
            </button>

            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-white/40 font-bold hidden sm:inline">{email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Portal Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col">
        {currentSection === 'addons' ? (
          /* Seccion Publica de Add-ons Activos */
          <div className="flex-1 flex flex-col space-y-8 animate-in fade-in duration-300">
            {/* Hero / Welcome Panel */}
            <div className="border rounded-[2rem] p-8 shadow-lg relative overflow-hidden tenant-card flex flex-col sm:flex-row items-center gap-6">
              <div
                className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none"
                style={{ backgroundColor: primaryColor }}
              ></div>

              {tenantConfig.logo_url && (
                <img src={tenantConfig.logo_url} alt={tenantConfig.name} className="w-20 h-20 rounded-3xl object-cover border-2 border-white/10" />
              )}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <span className="text-[9px] uppercase tracking-widest font-black text-white/40 block">🐝 Colmena de Servicios</span>
                <h2 className="text-3xl font-black uppercase tracking-tight text-white">{tenantConfig.name}</h2>
                <p className="text-sm text-white/70 max-w-2xl leading-relaxed">{tenantConfig.welcome_message}</p>
              </div>
            </div>

            {/* Content layout for Add-ons */}
            {otherActiveAddons.length > 0 ? (
              <div className="border rounded-[2.5rem] p-8 shadow-lg flex flex-col flex-1 relative overflow-hidden group tenant-card">
                <div
                  className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-700 pointer-events-none group-hover:opacity-20"
                  style={{ backgroundColor: primaryColor }}
                ></div>

                {/* Tabs */}
                <div className="border-b pb-4 mb-6 tenant-border">
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {[
                      { slug: 'booking-signature', label: 'Reservas', icon: '📅' },
                      { slug: 'logistics-gps', label: 'Logística', icon: '📍' },
                      { slug: 'patreon-sponsorship', label: 'Sponsorship', icon: '💎' },
                      { slug: 'analytics-apm', label: 'Métricas APM', icon: '📊' },
                      { slug: 'newsletter-campaigner', label: 'Boletín', icon: '✉️' },
                    ]
                      .filter(tab => activeAddonsList.includes(tab.slug))
                      .map(tab => {
                        const isActive = activeAddonTab === tab.slug;
                        return (
                          <button
                            key={tab.slug}
                            onClick={() => setActiveAddonTab(tab.slug)}
                            className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border"
                            style={{
                              backgroundColor: isActive ? `${primaryColor}15` : 'transparent',
                              borderColor: isActive ? primaryColor : 'rgba(255, 255, 255, 0.05)',
                              color: isActive ? primaryColor : 'rgba(255, 255, 255, 0.4)'
                            }}
                          >
                            <span className="mr-1.5">{tab.icon}</span>
                            {tab.label}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Tab Component Render */}
                <div className="flex-1 min-h-[400px]">
                  {[
                    { slug: 'booking-signature', component: <BookingCanvas primaryColor={primaryColor} /> },
                    { slug: 'logistics-gps', component: <FleetMap primaryColor={primaryColor} /> },
                    { slug: 'patreon-sponsorship', component: <SponsorTiers primaryColor={primaryColor} /> },
                    { slug: 'analytics-apm', component: <TelemetryDashboard primaryColor={primaryColor} /> },
                    { slug: 'newsletter-campaigner', component: <SubscribeForm tenantId={tenantConfig.id} subdomain={subdomain} primaryColor={primaryColor} /> },
                  ].find(tab => tab.slug === activeAddonTab)?.component}
                </div>
              </div>
            ) : (
              /* Fallback default public landing if no addons */
              <div className="border rounded-[2rem] p-8 shadow-lg flex flex-col justify-between flex-1 relative overflow-hidden group tenant-card">
                <div
                  className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-700 pointer-events-none group-hover:opacity-20"
                  style={{ backgroundColor: primaryColor }}
                ></div>

                <div className="py-12 text-center max-w-md mx-auto space-y-6">
                  <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-3xl" style={{ backgroundColor: `${primaryColor}15` }}>
                    🐝
                  </div>
                  <h3 className="text-lg font-black uppercase text-white tracking-wider">
                    Colmena Digital de {tenantConfig.name}
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Estamos configurando las celdas de nuestro panal de servicios junto con Néctar Labs para traerte herramientas exclusivas y módulos interactivos.
                  </p>
                  <button
                    onClick={() => setCurrentSection('support')}
                    className="px-6 py-3.5 text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-102 active:scale-95 transition-all inline-block cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Ir a Soporte Técnico
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Seccion Privada de Soporte Tecnico */
          <div className="flex-1 flex flex-col animate-in fade-in duration-300">
            {!isAuthenticated ? (
              /* Login Screen for Support */
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="max-w-md w-full backdrop-blur-md border rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden tenant-card">
                  <div
                    className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: primaryColor }}
                  ></div>

                  <div className="text-center mb-8">
                    <h2 className="text-xl font-black uppercase tracking-wider text-white">Acceso a Soporte</h2>
                    <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                      Introduce tu correo para ver tu historial de tickets y chatear con soporte técnico de {tenantConfig.name}.
                    </p>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {tenantConfig.require_customer_info && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Nombre Completo</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ej. Carlos Mendoza"
                          required
                          className="w-full border rounded-2xl px-4.5 py-3.5 text-xs focus:outline-none transition-all tenant-input"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Correo Electrónico</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        required
                        className="w-full border rounded-2xl px-4.5 py-3.5 text-xs focus:outline-none transition-all tenant-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="w-full py-4 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 mt-6 cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {isSubmittingAuth ? 'Iniciando...' : 'Entrar al Centro de Soporte'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* Support Dashboard */
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Tickets System (Left side - takes 7 columns) */}
                <div className="lg:col-span-7 flex flex-col space-y-6">
                  {selectedTicket ? (
                    /* Ticket Detail View */
                    <div className="rounded-[2rem] p-6 flex flex-col flex-1 shadow-lg tenant-card border">
                      <div className="flex justify-between items-start border-b pb-4 mb-4 tenant-border">
                        <div>
                          <button
                            onClick={() => setSelectedTicket(null)}
                            className="text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-white mb-2 flex items-center gap-1"
                          >
                            ← Volver a la Lista
                          </button>
                          <h3 className="text-base font-black uppercase tracking-tight">{selectedTicket.title}</h3>
                          <p className="text-[8.5px] uppercase tracking-widest mt-1 text-white/40 font-bold">
                            Ticket #{selectedTicket.id} | Categoría: {selectedTicket.category}
                          </p>
                        </div>
                        <span
                          className="px-3.5 py-1.5 rounded-full text-[8.5px] font-black uppercase tracking-widest border"
                          style={{
                            borderColor: tenantConfig.border_color || 'rgba(255,255,255,0.1)',
                            backgroundColor:
                              selectedTicket.status === 'CLOSED'
                                ? 'rgba(239, 68, 68, 0.1)'
                                : selectedTicket.status === 'RESOLVED'
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : 'rgba(245, 158, 11, 0.1)',
                            color:
                              selectedTicket.status === 'CLOSED'
                                ? '#ef4444'
                                : selectedTicket.status === 'RESOLVED'
                                  ? '#10b981'
                                  : '#f59e0b',
                          }}
                        >
                          {selectedTicket.status}
                        </span>
                      </div>

                      {/* History of messages within the ticket */}
                      <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] pr-2 custom-scrollbar">
                        <div className="bg-white/5 border rounded-2xl p-4 tenant-border">
                          <p className="text-[8.5px] font-black uppercase tracking-widest text-white/40">Descripción Inicial</p>
                          <p className="text-xs text-white/80 mt-1 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                          <p className="text-[7.5px] text-white/30 mt-2 font-bold">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                        </div>

                        {selectedTicket.messages &&
                          selectedTicket.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className="p-4 border rounded-2xl tenant-border bg-white/[0.02]"
                            >
                              <p className="text-[8.5px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>
                                {msg.sender_email.toLowerCase() === email.toLowerCase() ? 'Yo' : '🛠️ Soporte Técnico'}
                              </p>
                              <p className="text-xs text-white/80 mt-1 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              <p className="text-[7.5px] text-white/30 mt-2 font-bold">{new Date(msg.created_at).toLocaleString()}</p>
                            </div>
                          ))}
                      </div>

                      {/* Add response form */}
                      {selectedTicket.status !== 'CLOSED' && (
                        <form onSubmit={handleSendTicketMessage} className="mt-4 pt-4 border-t flex gap-2 tenant-border">
                          <input
                            type="text"
                            value={ticketMessageText}
                            onChange={(e) => setTicketMessageText(e.target.value)}
                            placeholder="Escribe tu respuesta técnica aquí..."
                            className="flex-1 border rounded-xl px-4 py-3 text-xs focus:outline-none transition-all tenant-input"
                            disabled={isSendingTicketMsg}
                            required
                          />
                          <button
                            type="submit"
                            disabled={!ticketMessageText.trim() || isSendingTicketMsg}
                            className="px-5 py-3 text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-105 transition-all disabled:opacity-50"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {isSendingTicketMsg ? 'Enviando...' : 'Responder'}
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    /* Ticket List & Creation View */
                    <>
                      {/* Ticket creation form */}
                      <div className="border rounded-[2rem] p-6 shadow-lg tenant-card">
                        <h3 className="text-sm font-black uppercase tracking-wider mb-4 text-white">Nuevo Ticket de Soporte</h3>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Título del Problema</label>
                              <input
                                type="text"
                                value={newTicketTitle}
                                onChange={(e) => setNewTicketTitle(e.target.value)}
                                placeholder="Ej. Error en pasarela de pagos"
                                required
                                className="w-full border rounded-xl px-3.5 py-3 text-xs focus:outline-none tenant-input"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Categoría</label>
                                <select
                                  value={newTicketCategory}
                                  onChange={(e) => setNewTicketCategory(e.target.value)}
                                  className="w-full border rounded-xl px-3.5 py-3 text-xs focus:outline-none tenant-input"
                                >
                                  <option value="QUESTION">Pregunta</option>
                                  <option value="ISSUE">Problema Técnico</option>
                                  <option value="IMPLEMENTATION">Implementación</option>
                                  <option value="IDEA">Nueva Idea</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Prioridad</label>
                                <select
                                  value={newTicketPriority}
                                  onChange={(e) => setNewTicketPriority(e.target.value)}
                                  className="w-full border rounded-xl px-3.5 py-3 text-xs focus:outline-none tenant-input"
                                >
                                  <option value="LOW">Baja</option>
                                  <option value="MEDIUM">Media</option>
                                  <option value="HIGH">Alta</option>
                                  <option value="URGENT">Urgente</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Detalle / Requerimientos</label>
                            <textarea
                              value={newTicketDesc}
                              onChange={(e) => setNewTicketDesc(e.target.value)}
                              placeholder="Describe con el mayor detalle técnico posible el inconveniente..."
                              required
                              rows={3}
                              className="w-full border rounded-xl px-3.5 py-3 text-xs focus:outline-none resize-none tenant-input"
                            ></textarea>
                          </div>

                          <button
                            type="submit"
                            disabled={isCreatingTicket}
                            className="px-6 py-3.5 text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-102 active:scale-95 transition-all disabled:opacity-50"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {isCreatingTicket ? 'Abriendo Ticket...' : 'Crear Ticket de Soporte'}
                          </button>
                        </form>
                      </div>

                      {/* List of existing tickets */}
                      <div className="border rounded-[2rem] p-6 flex-1 shadow-lg overflow-hidden flex flex-col tenant-card">
                        <h3 className="text-sm font-black uppercase tracking-wider mb-4 text-white">Mis Tickets Abiertos</h3>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 max-h-[300px]">
                          {tickets.length === 0 ? (
                            <p className="text-xs text-white/35 py-6 text-center">No has creado ningún ticket de soporte técnico aún.</p>
                          ) : (
                            tickets.map((t) => (
                              <div
                                key={t.id}
                                onClick={() => setSelectedTicket(t)}
                                className="bg-white/[0.02] hover:bg-white/5 border rounded-2xl p-4.5 flex justify-between items-center transition-all cursor-pointer tenant-border"
                              >
                                <div>
                                  <h4 className="text-xs font-black uppercase text-white tracking-tight">{t.title}</h4>
                                  <p className="text-[8px] uppercase tracking-widest text-white/40 mt-1 font-bold">
                                    Ticket #{t.id} | Categoría: {t.category} | Prioridad: {t.priority}
                                  </p>
                                </div>
                                <span
                                  className="px-2.5 py-1 rounded-full text-[7.5px] font-black uppercase tracking-widest"
                                  style={{
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: t.status === 'CLOSED' ? '#ef4444' : t.status === 'RESOLVED' ? '#10b981' : '#f59e0b',
                                  }}
                                >
                                  {t.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Support Sidebar Info Guide (Right side - 5 cols) */}
                <div className="lg:col-span-5 flex flex-col space-y-6">
                  <div className="border rounded-[2rem] p-8 shadow-lg flex flex-col justify-between flex-1 relative overflow-hidden group tenant-card">
                    <div
                      className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-700 pointer-events-none group-hover:opacity-20"
                      style={{ backgroundColor: primaryColor }}
                    ></div>

                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-white mb-6 border-b pb-4 tenant-border">
                        Centro de Ayuda y Chat
                      </h3>

                      <div className="space-y-6">
                        <div className="flex gap-4">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
                          >
                            💬
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-white tracking-tight">Chat en Vivo con Operadores</h4>
                            <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                              {activeAddonsList.includes('live-chat') ? (
                                <>
                                  Soporte instantáneo por chat. Haz clic en el widget circular dorado en la esquina inferior derecha para chatear directamente.
                                </>
                              ) : (
                                <>
                                  Chat en vivo desactivado. Puedes levantar un ticket en el panel izquierdo y nuestro equipo te responderá a la brevedad.
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
                          >
                            🛡️
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-white tracking-tight">SLA y Garantía Néctar</h4>
                            <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                              Nuestros ingenieros operan bajo un acuerdo de nivel de servicio (SLA) de menos de 2 horas para incidencias críticas de producción.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t flex flex-col items-stretch gap-4 tenant-border">
                      <div className="flex justify-between items-center text-[9px] uppercase tracking-widest font-black text-white/30">
                        <span>Sesión Activa</span>
                        <span className="text-green-400">En Línea</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Live Chat Widget (Visible inside support tab if authenticated) */}
      {currentSection === 'support' && isAuthenticated && activeAddonsList.includes('live-chat') && (
        <ChatWidget
          tenantId={tenantConfig.id}
          tenantName={tenantConfig.name}
          primaryColor={primaryColor}
          accentColor={tenantConfig.accent_color}
          bgColor={tenantConfig.bg_color}
          cardBgColor={tenantConfig.card_bg_color}
          textColor={tenantConfig.text_color}
          borderColor={tenantConfig.border_color}
          welcomeMessage={tenantConfig.welcome_message}
        />
      )}

      {/* Footer copyright */}
      <footer className="border-t py-6 tenant-footer">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
            {tenantConfig.footer_text || `© ${new Date().getFullYear()} Néctar Labs Software Artesanal. Todos los derechos reservados.`}
          </p>
          <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest text-white/30">
            <a href="https://nectarlabs.dev" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-all">
              Sitio Oficial
            </a>
            <span>Portal Multitenant v1.0</span>
          </div>
        </div>
      </footer>

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
