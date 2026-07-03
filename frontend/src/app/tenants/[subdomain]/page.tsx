'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toast from '@/components/ui/Toast';
import SATAutocomplete from '@/components/ui/SATAutocomplete';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CreateCustomerModal from '@/components/ui/CreateCustomerModal';
import { fetcher } from '@/lib/api';

const ChatWidget = dynamic(() => import('@/components/addons/live-chat/ChatWidget'), { ssr: false });
const BookingCanvas = dynamic(() => import('@/components/addons/booking-signature/BookingCanvas'), { ssr: false });
const CombinedShopDelivery = dynamic(() => import('@/components/addons/logistics-gps/CombinedShopDelivery'), { ssr: false });
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
  owner?: number;
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
  const otherActiveAddons = activeAddonsList.filter(slug => slug !== 'bot-chat');

  useEffect(() => {
    if (tenantConfig?.active_addons) {
      const otherAddons = tenantConfig.active_addons.filter(slug => slug !== 'bot-chat');
      
      // Auto-healer: Primero revisar si viene especificado por query param de la URL
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlAddon = params.get('addon');
        const slugResolved = urlAddon === 'logistics-gps' ? 'delivery-tracking' : urlAddon; // resolve alias mapping
        if (slugResolved && otherAddons.includes(slugResolved)) {
          setActiveAddonTab(slugResolved);
          return;
        }
      }

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
        if (!data.is_active) throw new Error('Portal no activo');
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
        #tenant-portal-root .tenant-input, #tenant-portal-root .admin-input {
          background-color: ${isDarkMode ? (tenantConfig.bg_color || '#020403') : (tenantConfig.card_bg_color_light || '#FFFFFF')} !important;
          border-color: ${isDarkMode ? (tenantConfig.border_color || '#151F18') : (tenantConfig.border_color_light || '#E5E7EB')} !important;
          color: ${isDarkMode ? (tenantConfig.text_color || '#FFFFFF') : (tenantConfig.text_color_light || '#111827')} !important;
        }
        #tenant-portal-root .tenant-border {
          border-color: ${isDarkMode ? (tenantConfig.border_color || '#151F18') : (tenantConfig.border_color_light || '#E5E7EB')} !important;
        }
        #tenant-portal-root select option {
          background-color: ${isDarkMode ? (tenantConfig.card_bg_color || '#050a06') : '#FFFFFF'} !important;
          color: ${isDarkMode ? (tenantConfig.text_color || '#FFFFFF') : '#111827'} !important;
        }
        #tenant-portal-root .autocomplete-dropdown {
          background-color: ${isDarkMode ? (tenantConfig.card_bg_color || '#050a06') : '#FFFFFF'} !important;
          border-color: ${isDarkMode ? (tenantConfig.border_color || '#151F18') : (tenantConfig.border_color_light || '#E5E7EB')} !important;
        }
        #tenant-portal-root .autocomplete-dropdown button {
          color: ${isDarkMode ? (tenantConfig.text_color || '#FFFFFF') : '#111827'} !important;
        }
        #tenant-portal-root .autocomplete-dropdown button:hover {
          background-color: ${primaryColor}15 !important;
        }
        #tenant-portal-root .autocomplete-dropdown .sat-code {
          color: ${isDarkMode ? (tenantConfig.text_color || '#FFFFFF') : '#111827'} !important;
        }
        #tenant-portal-root .autocomplete-dropdown .sat-label {
          color: ${isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(17, 24, 39, 0.7)'} !important;
        }
        #tenant-portal-root .autocomplete-dropdown .sat-status {
          color: ${isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(17, 24, 39, 0.5)'} !important;
        }
        #tenant-portal-root .autocomplete-dropdown .sat-spinner {
          border-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.1)'} !important;
          border-top-color: ${isDarkMode ? (tenantConfig.text_color || '#FFFFFF') : '#111827'} !important;
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

      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 w-full px-4 sm:px-6 py-4 backdrop-blur-md transition-all duration-300 tenant-header border-b">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 group">
            {tenantConfig.logo_url ? (
              <img
                src={tenantConfig.logo_url}
                alt={tenantConfig.name}
                className="w-10 h-10 rounded-2xl object-cover border-2 border-white/10 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105"
              />
            ) : (
              <span
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black text-black shadow-lg transition-all duration-500 group-hover:rotate-6 group-hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                {tenantConfig.name.substring(0, 1).toUpperCase()}
              </span>
            )}
            <div className="flex flex-col text-left">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-white transition-colors duration-300 group-hover:text-nectar-gold" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>
                {tenantConfig.name}
              </h1>
              <p className="text-[9px] uppercase tracking-widest font-black opacity-60">
                {tenantConfig.portal_title || 'Portal de Servicios'}
              </p>
            </div>
          </div>

          {/* Section Selector tabs & Settings */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white/5 dark:bg-black/20 p-1 rounded-2xl border border-white/5">
              <button
                onClick={() => setCurrentSection('addons')}
                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: currentSection === 'addons' ? primaryColor : 'transparent',
                  color: currentSection === 'addons' ? '#000000' : (isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(17, 24, 39, 0.6)'),
                  boxShadow: currentSection === 'addons' ? `0 4px 14px ${primaryColor}40` : 'none'
                }}
              >
                <span>🚀</span> <span className="hidden sm:inline">Servicios</span>
              </button>
              <button
                onClick={() => setCurrentSection('support')}
                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: currentSection === 'support' ? primaryColor : 'transparent',
                  color: currentSection === 'support' ? '#000000' : (isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(17, 24, 39, 0.6)'),
                  boxShadow: currentSection === 'support' ? `0 4px 14px ${primaryColor}40` : 'none'
                }}
              >
                <span>🛠️</span> <span className="hidden sm:inline">Soporte</span>
              </button>
            </div>

            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 bg-white/5 dark:bg-black/20 hover:scale-105 hover:bg-white/10 active:scale-95 transition-all duration-300 cursor-pointer"
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <span className="text-sm transition-transform duration-500 hover:rotate-45">
                {isDarkMode ? '☀️' : '🌙'}
              </span>
            </button>

            {isAuthenticated && (
              <div className="flex items-center gap-3 ml-1 sm:ml-3">
                <span className="text-[10px] text-white/40 font-bold hidden lg:inline">{email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Portal Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col">
        {currentSection === 'addons' ? (
          /* Seccion Publica de Add-ons Activos */
          <div className="flex-1 flex flex-col space-y-8 animate-in fade-in duration-300">
            {/* Hero / Welcome Panel */}
            <div className="border rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden tenant-card flex flex-col md:flex-row items-center gap-8 group transition-all duration-500 hover:shadow-3xl hover:border-white/10">
              {/* Glowing Background Ambiance */}
              <div
                className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-[0.08] dark:opacity-[0.12] transition-all duration-1000 group-hover:scale-110 pointer-events-none"
                style={{ backgroundColor: primaryColor }}
              ></div>
              <div
                className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[120px] opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
                style={{ backgroundColor: tenantConfig.accent_color || primaryColor }}
              ></div>

              {tenantConfig.logo_url ? (
                <div className="relative p-1.5 rounded-[2rem] bg-gradient-to-tr from-white/5 to-white/10 dark:from-white/5 dark:to-white/10 border border-white/10 shadow-2xl shrink-0 group-hover:scale-105 transition-transform duration-500">
                  <img
                    src={tenantConfig.logo_url}
                    alt={tenantConfig.name}
                    className="w-24 h-24 rounded-[1.75rem] object-cover border border-white/10"
                  />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#020403] flex items-center justify-center text-[10px] animate-pulse" title="Portal Activo" style={{ borderColor: isDarkMode ? (tenantConfig.bg_color || '#020403') : (tenantConfig.bg_color_light || '#FAFAFA') }}>
                    ✓
                  </span>
                </div>
              ) : (
                <div className="relative p-1.5 rounded-[2rem] bg-gradient-to-tr from-white/5 to-white/10 dark:from-white/5 dark:to-white/10 border border-white/10 shadow-2xl shrink-0 group-hover:scale-105 transition-transform duration-500">
                  <div
                    className="w-24 h-24 rounded-[1.75rem] flex items-center justify-center text-3xl font-black text-black shadow-inner"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {tenantConfig.name.substring(0, 1).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#020403] flex items-center justify-center text-[10px] animate-pulse" title="Portal Activo" style={{ borderColor: isDarkMode ? (tenantConfig.bg_color || '#020403') : (tenantConfig.bg_color_light || '#FAFAFA') }}>
                    ✓
                  </span>
                </div>
              )}

              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                  <span className="px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/5 dark:bg-white/5 border border-white/10 text-white/50 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-nectar-gold animate-ping"></span>
                    Colmena de Servicios
                  </span>
                  <span className="px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    Verificado por Nectar Labs
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>
                  {tenantConfig.name}
                </h2>
                <p className="text-sm sm:text-base text-white/70 dark:text-white/80 max-w-3xl leading-relaxed font-medium">
                  {tenantConfig.welcome_message}
                </p>
              </div>
            </div>

            {/* Content layout for Add-ons */}
            {otherActiveAddons.length > 0 ? (
              <div className="border rounded-[2.5rem] p-6 md:p-8 shadow-2xl flex flex-col flex-1 relative overflow-hidden group tenant-card">
                {/* Visual Glow */}
                <div
                  className="absolute -top-48 -right-48 w-80 h-80 rounded-full blur-[120px] opacity-[0.06] transition-all duration-1000 group-hover:scale-110 pointer-events-none"
                  style={{ backgroundColor: primaryColor }}
                ></div>

                {/* Tabs Dock Container */}
                <div className="border-b pb-5 mb-8 tenant-border">
                  <div className="flex gap-2.5 overflow-x-auto pb-2.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {(() => {
                      // Build tab list — merge delivery-tracking + ecommerce into one immersive tab
                      const hasShopDelivery = activeAddonsList.includes('delivery-tracking') || activeAddonsList.includes('ecommerce');
                      const baseTabs = [
                        { slug: 'booking-signature', label: 'Reservas', icon: '📅' },
                        { slug: 'shop-delivery', label: 'Tienda + Entrega', icon: '🛍️', virtual: true, show: hasShopDelivery },
                        { slug: 'sponsorship', label: 'Sponsorship', icon: '💎' },
                        { slug: 'business-analytics', label: 'Métricas APM', icon: '📊' },
                        { slug: 'campaigner', label: 'Boletín', icon: '✉️' },
                        { slug: 'facturacion-cfdi', label: 'Facturación SAT', icon: '🧾' },
                      ];
                      return baseTabs.filter(tab =>
                        (tab as any).virtual ? (tab as any).show : activeAddonsList.includes(tab.slug)
                      ).map(tab => {
                        const isActive = activeAddonTab === tab.slug;
                        return (
                          <button
                            key={tab.slug}
                            onClick={() => setActiveAddonTab(tab.slug)}
                            className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap cursor-pointer border flex items-center gap-2 hover:scale-[1.03] active:scale-95 shadow-sm"
                            style={{
                              backgroundColor: isActive ? primaryColor : 'transparent',
                              borderColor: isActive ? primaryColor : 'rgba(255, 255, 255, 0.05)',
                              color: isActive ? '#000000' : (isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(17, 24, 39, 0.6)'),
                              boxShadow: isActive ? `0 4px 15px ${primaryColor}40` : 'none'
                            }}
                          >
                            <span className="text-xs">{tab.icon}</span>
                            {tab.label}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Tab Component Render */}
                <div className="flex-1 min-h-[400px]">
                  {activeAddonTab === 'booking-signature' && <BookingCanvas tenantId={tenantConfig.id} subdomain={subdomain} primaryColor={primaryColor} />}
                  {activeAddonTab === 'shop-delivery' && (
                    <CombinedShopDelivery
                      tenantConfig={tenantConfig}
                      token={token}
                      isDarkMode={isDarkMode}
                      onToast={showToast}
                    />
                  )}
                  {activeAddonTab === 'sponsorship' && <SponsorTiers primaryColor={primaryColor} />}
                  {activeAddonTab === 'business-analytics' && <TelemetryDashboard primaryColor={primaryColor} />}
                  {activeAddonTab === 'campaigner' && <SubscribeForm tenantId={tenantConfig.id} subdomain={subdomain} primaryColor={primaryColor} />}
                  {activeAddonTab === 'facturacion-cfdi' && <SATInvoicingForm tenantId={tenantConfig.id} subdomain={subdomain} primaryColor={primaryColor} ownerId={tenantConfig.owner} showToast={showToast} />}
                  {/* Legacy fallback */}
                  {!['booking-signature','shop-delivery','sponsorship','business-analytics','campaigner','facturacion-cfdi'].includes(activeAddonTab || '') && null}
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
              <div className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full backdrop-blur-xl border rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden tenant-card group transition-all duration-500 hover:shadow-3xl">
                  {/* Visual ambient glows */}
                  <div
                    className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 group-hover:scale-110 transition-transform duration-700 pointer-events-none"
                    style={{ backgroundColor: primaryColor }}
                  ></div>
                  <div
                    className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
                    style={{ backgroundColor: tenantConfig.accent_color || primaryColor }}
                  ></div>

                  <div className="text-center mb-8 relative z-10">
                    <div className="w-16 h-16 rounded-[1.25rem] mx-auto flex items-center justify-center text-2xl border mb-4 shadow-md bg-white/5 dark:bg-black/20" style={{ borderColor: `${primaryColor}30` }}>
                      🛡️
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-widest" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>
                      Acceso a Soporte
                    </h2>
                    <p className="text-xs text-white/50 dark:text-white/60 mt-2.5 max-w-xs mx-auto leading-relaxed font-medium">
                      Introduce tus datos de cliente para consultar tus tickets de soporte y chatear en tiempo real con {tenantConfig.name}.
                    </p>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-5 relative z-10">
                    {tenantConfig.require_customer_info && (
                      <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block ml-1">
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ej. Carlos Mendoza"
                          required
                          className="w-full border rounded-2xl px-5 py-4 text-xs focus:outline-none transition-all duration-300 tenant-input focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent"
                          style={{
                            '--tw-ring-color': primaryColor,
                          } as React.CSSProperties}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block ml-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        required
                        className="w-full border rounded-2xl px-5 py-4 text-xs focus:outline-none transition-all duration-300 tenant-input focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent"
                        style={{
                          '--tw-ring-color': primaryColor,
                        } as React.CSSProperties}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="w-full py-4.5 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all duration-300 hover:scale-[1.01] active:scale-95 disabled:opacity-50 mt-8 cursor-pointer shadow-lg hover:shadow-xl"
                      style={{
                        backgroundColor: primaryColor,
                        boxShadow: `0 4px 20px ${primaryColor}30`
                      }}
                    >
                      {isSubmittingAuth ? 'Iniciando Sesión...' : 'Entrar al Centro de Soporte'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* Support Dashboard */
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-in fade-in duration-500">
                {/* Tickets System (Left side - takes 7 columns) */}
                <div className="lg:col-span-7 flex flex-col space-y-6">
                  {selectedTicket ? (
                    /* Ticket Detail View */
                    <div className="rounded-[2.5rem] p-6 md:p-8 flex flex-col flex-1 shadow-2xl tenant-card border relative overflow-hidden group">
                      <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-[0.05] pointer-events-none" style={{ backgroundColor: primaryColor }}></div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-5 mb-5 tenant-border gap-4 relative z-10">
                        <div>
                          <button
                            onClick={() => setSelectedTicket(null)}
                            className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white mb-2 flex items-center gap-1.5 transition-colors cursor-pointer group/btn"
                          >
                            <span className="transition-transform group-hover/btn:-translate-x-0.5">←</span> Volver a la Lista
                          </button>
                          <h3 className="text-lg font-black uppercase tracking-tight text-white" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>
                            {selectedTicket.title}
                          </h3>
                          <p className="text-[8.5px] uppercase tracking-widest mt-1 text-white/40 font-bold">
                            Ticket #{selectedTicket.id} | Categoría: {selectedTicket.category}
                          </p>
                        </div>
                        <span
                          className="px-3.5 py-1.5 rounded-full text-[8.5px] font-black uppercase tracking-widest border shadow-sm"
                          style={{
                            borderColor: selectedTicket.status === 'CLOSED'
                              ? 'rgba(239, 68, 68, 0.2)'
                              : selectedTicket.status === 'RESOLVED'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : 'rgba(245, 158, 11, 0.2)',
                            backgroundColor: selectedTicket.status === 'CLOSED'
                              ? 'rgba(239, 68, 68, 0.08)'
                              : selectedTicket.status === 'RESOLVED'
                                ? 'rgba(16, 185, 129, 0.08)'
                                : 'rgba(245, 158, 11, 0.08)',
                            color: selectedTicket.status === 'CLOSED'
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
                      <div className="flex-1 overflow-y-auto space-y-4 max-h-[320px] pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent mb-4 relative z-10">
                        <div className="bg-white/5 dark:bg-black/10 border rounded-[1.5rem] p-4.5 tenant-border">
                          <p className="text-[8.5px] font-black uppercase tracking-widest text-white/40">Descripción Inicial</p>
                          <p className="text-xs text-white/80 dark:text-white/95 mt-1.5 leading-relaxed whitespace-pre-wrap font-medium">{selectedTicket.description}</p>
                          <p className="text-[7.5px] text-white/30 dark:text-white/40 mt-3.5 font-black uppercase tracking-wider">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                        </div>

                        {selectedTicket.messages && selectedTicket.messages.length > 0 &&
                          selectedTicket.messages.map((msg) => {
                            const isMe = msg.sender_email.toLowerCase() === email.toLowerCase();
                            return (
                              <div
                                key={msg.id}
                                className={`p-4.5 border rounded-[1.5rem] tenant-border max-w-[85%] ${isMe
                                  ? 'bg-white/[0.03] dark:bg-black/25 ml-auto rounded-tr-none'
                                  : 'bg-white/[0.01] dark:bg-black/10 mr-auto rounded-tl-none'
                                  }`}
                              >
                                <p className="text-[8.5px] font-black uppercase tracking-widest mb-1.5" style={{ color: isMe ? primaryColor : (tenantConfig.accent_color || '#10B981') }}>
                                  {isMe ? 'Tú (Cliente)' : '🛠️ Soporte Técnico'}
                                </p>
                                <p className="text-xs text-white/80 dark:text-white/95 leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                                <p className="text-[7.5px] text-white/30 dark:text-white/40 mt-3 font-bold uppercase tracking-wider">{new Date(msg.created_at).toLocaleString()}</p>
                              </div>
                            );
                          })}
                      </div>

                      {/* Add response form */}
                      {selectedTicket.status !== 'CLOSED' && (
                        <form onSubmit={handleSendTicketMessage} className="mt-auto pt-4 border-t flex gap-3.5 tenant-border relative z-10">
                          <input
                            type="text"
                            value={ticketMessageText}
                            onChange={(e) => setTicketMessageText(e.target.value)}
                            placeholder="Escribe tu respuesta técnica aquí..."
                            className="flex-1 border rounded-2xl px-5 py-4 text-xs focus:outline-none transition-all duration-300 tenant-input focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent"
                            style={{
                              '--tw-ring-color': primaryColor,
                            } as React.CSSProperties}
                            disabled={isSendingTicketMsg}
                            required
                          />
                          <button
                            type="submit"
                            disabled={!ticketMessageText.trim() || isSendingTicketMsg}
                            className="px-6 py-4 text-black font-black uppercase tracking-widest text-[9px] rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                            style={{
                              backgroundColor: primaryColor,
                              boxShadow: `0 4px 15px ${primaryColor}20`
                            }}
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
                      <div className="border rounded-[2.5rem] p-6 md:p-8 shadow-2xl tenant-card relative overflow-hidden group">
                        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-[0.03] pointer-events-none" style={{ backgroundColor: primaryColor }}></div>
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider mb-6 text-white relative z-10" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>
                          Nuevo Ticket de Soporte
                        </h3>
                        <form onSubmit={handleCreateTicket} className="space-y-5 relative z-10 text-left">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40 ml-1">Título del Problema</label>
                              <input
                                type="text"
                                value={newTicketTitle}
                                onChange={(e) => setNewTicketTitle(e.target.value)}
                                placeholder="Ej. Error en pasarela de pagos"
                                required
                                className="w-full border rounded-2xl px-5 py-4 text-xs focus:outline-none transition-all duration-300 tenant-input focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent"
                                style={{
                                  '--tw-ring-color': primaryColor,
                                } as React.CSSProperties}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40 ml-1">Categoría</label>
                                <select
                                  value={newTicketCategory}
                                  onChange={(e) => setNewTicketCategory(e.target.value)}
                                  className="w-full border rounded-2xl px-4 py-4 text-xs focus:outline-none transition-all duration-300 tenant-input cursor-pointer"
                                >
                                  <option value="QUESTION">Pregunta</option>
                                  <option value="ISSUE">Problema Técnico</option>
                                  <option value="IMPLEMENTATION">Implementación</option>
                                  <option value="IDEA">Nueva Idea</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40 ml-1">Prioridad</label>
                                <select
                                  value={newTicketPriority}
                                  onChange={(e) => setNewTicketPriority(e.target.value)}
                                  className="w-full border rounded-2xl px-4 py-4 text-xs focus:outline-none transition-all duration-300 tenant-input cursor-pointer"
                                >
                                  <option value="LOW">Baja</option>
                                  <option value="MEDIUM">Media</option>
                                  <option value="HIGH">Alta</option>
                                  <option value="URGENT">Urgente</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[8.5px] font-black uppercase tracking-wider text-white/45 ml-1">Detalle / Requerimientos</label>
                            <textarea
                              value={newTicketDesc}
                              onChange={(e) => setNewTicketDesc(e.target.value)}
                              placeholder="Describe con el mayor detalle técnico posible el inconveniente..."
                              required
                              rows={3}
                              className="w-full border rounded-2xl px-5 py-4 text-xs focus:outline-none resize-none transition-all duration-300 tenant-input focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent"
                              style={{
                                '--tw-ring-color': primaryColor,
                              } as React.CSSProperties}
                            ></textarea>
                          </div>

                          <button
                            type="submit"
                            disabled={isCreatingTicket}
                            className="px-6 py-4 text-black font-black uppercase tracking-widest text-[9px] rounded-2xl hover:scale-[1.01] active:scale-95 transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-lg hover:shadow-xl"
                            style={{
                              backgroundColor: primaryColor,
                              boxShadow: `0 4px 15px ${primaryColor}20`
                            }}
                          >
                            {isCreatingTicket ? 'Abriendo Ticket...' : 'Crear Ticket de Soporte'}
                          </button>
                        </form>
                      </div>

                      {/* List of existing tickets */}
                      <div className="border rounded-[2.5rem] p-6 md:p-8 flex-1 shadow-2xl overflow-hidden flex flex-col tenant-card relative group">
                        <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-[0.02] pointer-events-none" style={{ backgroundColor: primaryColor }}></div>
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider mb-5 text-white relative z-10" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>
                          Mis Tickets Abiertos
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1 max-h-[280px] relative z-10">
                          {tickets.length === 0 ? (
                            <p className="text-xs text-white/35 py-10 text-center font-medium">No has creado ningún ticket de soporte técnico aún.</p>
                          ) : (
                            tickets.map((t) => {
                              const badgeColor = t.status === 'CLOSED' ? '#ef4444' : t.status === 'RESOLVED' ? '#10b981' : '#f59e0b';
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => setSelectedTicket(t)}
                                  className="bg-white/[0.01] dark:bg-black/10 hover:bg-white/[0.04] dark:hover:bg-white/5 border rounded-2xl p-4.5 flex justify-between items-center transition-all duration-300 cursor-pointer tenant-border group/card hover:-translate-y-0.5"
                                >
                                  <div className="text-left">
                                    <h4 className="text-xs font-black uppercase text-white tracking-tight group-hover/card:text-nectar-gold transition-colors duration-300" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>
                                      {t.title}
                                    </h4>
                                    <p className="text-[8px] uppercase tracking-widest text-white/40 mt-1 font-bold">
                                      Ticket #{t.id} | Categoría: {t.category} | Prioridad: {t.priority}
                                    </p>
                                  </div>
                                  <span
                                    className="px-3 py-1.5 rounded-full text-[7.5px] font-black uppercase tracking-widest transition-colors duration-300"
                                    style={{
                                      border: `1px solid ${badgeColor}30`,
                                      backgroundColor: `${badgeColor}08`,
                                      color: badgeColor,
                                    }}
                                  >
                                    {t.status}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Support Sidebar Info Guide (Right side - 5 cols) */}
                <div className="lg:col-span-5 flex flex-col space-y-6">
                  <div className="border rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between flex-1 relative overflow-hidden group tenant-card">
                    <div
                      className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-700 pointer-events-none group-hover:opacity-20"
                      style={{ backgroundColor: primaryColor }}
                    ></div>

                    <div>
                      <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white mb-6 border-b pb-4 tenant-border" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>
                        Centro de Ayuda y Chat
                      </h3>

                      <div className="space-y-6 text-left">
                        <div className="flex gap-4 items-start">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                            style={{
                              backgroundColor: `${primaryColor}08`,
                              borderColor: `${primaryColor}20`,
                              color: primaryColor
                            }}
                          >
                            💬
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-white tracking-tight" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>Chat en Vivo con Operadores</h4>
                            <p className="text-[11px] text-white/50 dark:text-white/60 mt-1 leading-relaxed font-medium">
                              {activeAddonsList.includes('bot-chat') ? (
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

                        <div className="flex gap-4 items-start">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                            style={{
                              backgroundColor: `${primaryColor}08`,
                              borderColor: `${primaryColor}20`,
                              color: primaryColor
                            }}
                          >
                            🛡️
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-white tracking-tight" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>SLA y Garantía Néctar</h4>
                            <p className="text-[11px] text-white/50 dark:text-white/60 mt-1 leading-relaxed font-medium">
                              Nuestros ingenieros operan bajo un acuerdo de nivel de servicio (SLA) de menos de 2 horas para incidencias críticas de producción.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t flex flex-col items-stretch gap-4 tenant-border">
                      <div className="flex justify-between items-center text-[9px] uppercase tracking-widest font-black text-white/30">
                        <span>Sesión Activa</span>
                        <span className="text-green-400 animate-pulse">En Línea</span>
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
      {currentSection === 'support' && isAuthenticated && activeAddonsList.includes('bot-chat') && (
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
// -------------------------------------------------------------
// NEW ADDON COMPONENTS (White-Label Invoicing & Ecommerce Store)
// -------------------------------------------------------------

interface SATInvoicingFormProps {
  tenantId: string;
  subdomain: string;
  primaryColor: string;
  ownerId?: number;
  showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

function SATInvoicingForm({ tenantId, subdomain, primaryColor, ownerId, showToast }: SATInvoicingFormProps) {
  const [rfc, setRfc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [regimenFiscal, setRegimenFiscal] = useState('601');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [email, setEmail] = useState('');
  const [usoCfdi, setUsoCfdi] = useState('G03');
  const [ticketNumber, setTicketNumber] = useState('');

  const [manualItems, setManualItems] = useState<Array<{ quantity: number; unit_price: number; description: string; product_key: string; unit_key: string; unit_name: string }>>([
    { quantity: 1, unit_price: 0, description: '', product_key: '43231500', unit_key: 'E48', unit_name: 'Unidad de servicio' }
  ]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number | null>(null);
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tenant Admin detection states (to allow selecting/registering clients directly)
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [tenantContracts, setTenantContracts] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    setAdminLoginError('');

    try {
      const data = await fetcher('/token/', {
        method: 'POST',
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      });

      if (data.access) {
        const prevToken = localStorage.getItem('token');
        localStorage.setItem('token', data.access);

        try {
          const me = await fetcher('/users/me/');
          const isOwner = ownerId ? String(me.id) === String(ownerId) : false;
          const isSystemAdmin = me.is_staff || me.role === 'ADMIN';
          const isStaffOfTenant = me.role === 'STAFF' && String(me.tenant) === String(tenantId);

          if (isOwner || isSystemAdmin || isStaffOfTenant || me.role === 'BUSINESS') {
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem('user_email', adminEmail.trim());
            localStorage.setItem('is_staff', me.is_staff ? 'true' : 'false');
            localStorage.setItem('user_role', me.role || '');

            setIsTenantAdmin(true);
            await loadBillingData();

            if (showToast) {
              showToast('Modo Administrador activado con éxito', 'success');
            }
            setShowAdminLogin(false);
            setAdminEmail('');
            setAdminPassword('');
          } else {
            if (prevToken && prevToken !== 'null' && prevToken !== 'undefined') {
              localStorage.setItem('token', prevToken);
            } else {
              localStorage.removeItem('token');
            }
            setAdminLoginError('El usuario ingresado no tiene permisos de administrador para este portal.');
          }
        } catch (meErr: any) {
          if (prevToken && prevToken !== 'null' && prevToken !== 'undefined') {
            localStorage.setItem('token', prevToken);
          } else {
            localStorage.removeItem('token');
          }
          setAdminLoginError(meErr.message || 'Error al validar permisos de usuario.');
        }
      } else {
        setAdminLoginError('Credenciales inválidas');
      }
    } catch (err: any) {
      setAdminLoginError(err.message || 'Email o contraseña incorrectos');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  // Helper load billing users data
  const loadBillingData = async () => {
    try {
      const usersRes = await fetcher('/users/');
      setTenantUsers(usersRes.results || usersRes || []);
    } catch (err) {
      console.error('Error loading tenant users in public form:', err);
    }
    try {
      const contractsRes = await fetcher('/contracts/');
      setTenantContracts(contractsRes.results || contractsRes || []);
    } catch (err) {
      console.error('Error loading tenant contracts in public form:', err);
    }
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      const globalToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!globalToken || globalToken === 'null' || globalToken === 'undefined') return;

      try {
        const me = await fetcher('/users/me/');
        const isOwner = ownerId ? String(me.id) === String(ownerId) : false;
        const isSystemAdmin = me.is_staff || me.role === 'ADMIN';
        const isStaffOfTenant = me.role === 'STAFF' && String(me.tenant) === String(tenantId);

        if (isOwner || isSystemAdmin || isStaffOfTenant || me.role === 'BUSINESS') {
          setIsTenantAdmin(true);
          await loadBillingData();
        }
      } catch (err) {
        console.error('Error verifying admin status in public invoicing form:', err);
      }
    };

    checkAdminStatus();
  }, [tenantId, ownerId]);

  const handleDescriptionChange = async (idx: number, val: string) => {
    setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, description: val } : it));

    if (val.trim().length < 2) {
      setSuggestedProducts([]);
      setActiveSuggestionIdx(null);
      return;
    }

    setActiveSuggestionIdx(idx);
    setLoadingSuggestions(true);
    try {
      const endpoint = `/billing/sat/products/?q=${encodeURIComponent(val)}&subdomain=${encodeURIComponent(subdomain)}&tenant_id=${encodeURIComponent(tenantId)}`;
      const res = await fetch(`/api${endpoint}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestedProducts(data || []);
      }
    } catch (err) {
      console.error('Error fetching SAT product suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.concept-search-container')) {
        setActiveSuggestionIdx(null);
        setSuggestedProducts([]);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isTenantAdmin) {
      for (const item of manualItems) {
        if (!item.description.trim()) {
          setErrorMsg('La descripción es obligatoria para todos los conceptos.');
          setLoading(false);
          return;
        }
        if (!item.product_key) {
          setErrorMsg('Debes seleccionar una clave de producto SAT para cada concepto.');
          setLoading(false);
          return;
        }
        if (!item.unit_key) {
          setErrorMsg('Debes seleccionar una clave de unidad SAT para cada concepto.');
          setLoading(false);
          return;
        }
      }
    } else {
      if (!ticketNumber.trim()) {
        setErrorMsg('El número de ticket es obligatorio para emitir la factura.');
        setLoading(false);
        return;
      }
    }

    const subtotal = manualItems.reduce((acc, item) => acc + (item.quantity * (item.unit_price || 0)), 0);
    const iva = parseFloat((subtotal * 0.16).toFixed(2));
    const total = parseFloat((subtotal + iva).toFixed(2));

    try {
      const payload: any = {
        tenant_id: tenantId,
        subdomain: subdomain,
        customer_info: {
          rfc: rfc.trim().toUpperCase(),
          razon_social: razonSocial.trim(),
          regimen_fiscal: regimenFiscal,
          codigo_postal: codigoPostal.trim(),
          email: email.trim(),
          use: usoCfdi
        }
      };

      if (isTenantAdmin) {
        payload.items = manualItems.map(it => ({
          quantity: it.quantity,
          unit_price: it.unit_price,
          description: it.description,
          product_key: it.product_key,
          unit_key: it.unit_key,
          unit_name: it.unit_name
        }));
        payload.total = total;
      } else {
        payload.ticket_number = ticketNumber.trim();
      }

      const res = await fetch('/api/billing/invoices/issue-tenant-to-client/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'No se pudo emitir la factura.');
      }

      setSuccessMsg(`Factura emitida y timbrada con éxito. Folio SAT (UUID): ${data.uuid_sat || 'Pendiente LCO'}. El PDF/XML se han enviado a tu correo.`);
      setRfc('');
      setRazonSocial('');
      setCodigoPostal('');
      setEmail('');
      setTicketNumber('');
      setManualItems([
        { quantity: 1, unit_price: 0, description: '', product_key: '43231500', unit_key: 'E48', unit_name: 'Unidad de servicio' }
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al emitir la factura.');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = manualItems.reduce((acc, item) => acc + (item.quantity * (item.unit_price || 0)), 0);
  const iva = parseFloat((subtotal * 0.16).toFixed(2));
  const total = parseFloat((subtotal + iva).toFixed(2));

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 md:p-8 rounded-[2rem] bg-white/[0.01] backdrop-blur-md border border-white/5 space-y-8 text-left tenant-card relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>

        <div>
          <h3 className="text-xl font-black uppercase text-white tracking-wide">Solicitar Factura SAT</h3>
          <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Ingresa tus datos fiscales para emitir tu CFDI 4.0 de forma automática</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl animate-pulse">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl">
            ✓ {successMsg}
          </div>
        )}

        {/* Datos Fiscales */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">1. Datos de Facturación</h4>
            {!isTenantAdmin ? (
              <button
                type="button"
                onClick={() => setShowAdminLogin(true)}
                className="text-[9px] font-black hover:underline uppercase tracking-widest cursor-pointer text-nectar-gold"
              >
                🔑 Modo Administrador
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('token');
                  setIsTenantAdmin(false);
                  setSelectedCustomer(null);
                  setEmail('');
                  setRfc('');
                  setRazonSocial('');
                  setCodigoPostal('');
                }}
                className="text-[9px] font-black hover:underline uppercase tracking-widest cursor-pointer text-red-400"
              >
                🔒 Salir de Admin
              </button>
            )}
          </div>

          {isTenantAdmin && (
            <div className="space-y-3 p-5 bg-white/[0.02] border border-white/5 rounded-2xl relative mb-4">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/50 block">Seleccionar Cliente Registrado</label>

              {selectedCustomer ? (
                /* Selected Customer Card */
                <div className="flex items-center justify-between p-4 bg-nectar-gold/10 border border-nectar-gold/30 rounded-xl animate-in fade-in zoom-in-95 duration-150">
                  <div>
                    <span className="text-[7.5px] font-black uppercase tracking-widest text-nectar-gold">Cliente Seleccionado ✓</span>
                    <h4 className="text-xs font-bold text-white mt-0.5">{selectedCustomer.username || 'Usuario'}</h4>
                    <p className="text-[9px] text-white/50">{selectedCustomer.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setEmail('');
                      setRfc('');
                      setRazonSocial('');
                      setCodigoPostal('');
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 border border-white/10 hover:border-red-500/20 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer font-bold"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                /* Search input + filtered results */
                <div className="space-y-2 relative">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        placeholder={tenantUsers.length === 0 ? "No tienes clientes registrados aún" : "Buscar cliente por nombre o email..."}
                        disabled={tenantUsers.length === 0}
                        className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-xs focus:outline-none focus:border-nectar-gold text-white placeholder:text-white/20 admin-input font-bold disabled:opacity-50"
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 select-none text-[10px]">🔍</div>
                      {customerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCustomerSearchQuery('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewClientModal(true);
                      }}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-white cursor-pointer font-bold whitespace-nowrap shrink-0"
                    >
                      + Nuevo
                    </button>
                  </div>

                  {customerSearchQuery.trim() !== '' && tenantUsers.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-[#050a06]/95 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 max-h-48 overflow-y-auto space-y-1 backdrop-blur-md autocomplete-dropdown">
                      {(() => {
                        const query = customerSearchQuery.toLowerCase().trim();
                        const filtered = tenantUsers.filter(u =>
                          (u.username && u.username.toLowerCase().includes(query)) ||
                          (u.email && u.email.toLowerCase().includes(query))
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="p-3 text-center text-white/30 text-[8px] uppercase tracking-wider font-bold">
                              Sin clientes coincidentes
                            </div>
                          );
                        }

                        return filtered.map(u => {
                          const contract = tenantContracts.find(c => c.user === u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(u);
                                setEmail(u.email);
                                setCustomerSearchQuery('');
                                if (contract) {
                                  setRfc(contract.tax_id || '');
                                  setRazonSocial(contract.full_name || '');
                                } else {
                                  setRazonSocial(u.username || '');
                                }
                              }}
                              className="w-full text-left p-3 rounded-xl hover:bg-nectar-gold/10 border border-transparent hover:border-nectar-gold/20 flex flex-col gap-0.5 transition-all cursor-pointer group"
                            >
                              <span className="text-xs font-bold text-white group-hover:text-nectar-gold transition-colors">{u.username || 'Usuario'}</span>
                              <span className="text-[9.5px] text-white/50">{u.email}</span>
                              {contract?.tax_id && (
                                <span className="text-[8px] text-nectar-gold/80 font-mono mt-0.5">RFC: {contract.tax_id}</span>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/50">RFC (Receptor)</label>
              <input
                type="text"
                required
                maxLength={13}
                placeholder="XAXX010101000"
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/50">Razón Social o Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="PUBLICO EN GENERAL"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/50">Régimen Fiscal</label>
              <select
                value={regimenFiscal}
                onChange={(e) => setRegimenFiscal(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold bg-[#0b0f0c] text-white font-bold"
              >
                <option value="601">601 - General de Ley Personas Morales</option>
                <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                <option value="606">606 - Arrendamiento</option>
                <option value="608">608 - Demás ingresos</option>
                <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                <option value="616">616 - Sin obligaciones fiscales</option>
                <option value="621">621 - Incorporación Fiscal</option>
                <option value="625">625 - Régimen de las Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</option>
                <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/50">Código Postal del Domicilio Fiscal</label>
              <input
                type="text"
                required
                maxLength={5}
                placeholder="00000"
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/50">Uso de CFDI</label>
              <select
                value={usoCfdi}
                onChange={(e) => setUsoCfdi(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold bg-[#0b0f0c] text-white font-bold"
              >
                <option value="G01">G01 - Adquisición de mercancías</option>
                <option value="G03">G03 - Gastos en general</option>
                <option value="I01">I01 - Construcciones</option>
                <option value="I02">I02 - Mobiliario y equipo de oficina por inversiones</option>
                <option value="I04">I04 - Equipo de transporte</option>
                <option value="I08">I08 - Otra maquinaria y equipo</option>
                <option value="D01">D01 - Honorarios médicos, dentales y gastos hospitalarios</option>
                <option value="D02">D02 - Gastos médicos por incapacidad o discapacidad</option>
                <option value="D04">D04 - Donativos</option>
                <option value="D07">D07 - Primas por seguros de gastos médicos</option>
                <option value="D08">D08 - Gastos de transportación escolar obligatoria</option>
                <option value="D10">D10 - Depósitos en cuentas especiales para el ahorro, primas que tengan como base planes de pensiones</option>
                <option value="S01">S01 - Sin efectos fiscales</option>
                <option value="CP01">CP01 - Pagos</option>
                <option value="CN01">CN01 - Nómina</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/50">Email de Recepción de Factura</label>
              <input
                type="email"
                required
                placeholder="ejemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white font-mono"
              />
            </div>
          </div>

          {/* 2. Conceptos o Ticket Input */}
          {isTenantAdmin ? (
            <div className="space-y-4 border-t border-white/5 pt-6 mt-6 animate-in fade-in duration-250">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">2. Conceptos a Facturar</h4>
                <button
                  type="button"
                  onClick={() => setManualItems([...manualItems, { quantity: 1, unit_price: 0, description: '', product_key: '43231500', unit_key: 'E48', unit_name: 'Unidad de servicio' }])}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all text-white cursor-pointer font-bold"
                >
                  + Agregar Concepto
                </button>
              </div>

              <div className="space-y-4">
                {manualItems.map((item, idx) => (
                  <div key={idx} className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl space-y-4 relative text-left">
                    {manualItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setManualItems(manualItems.filter((_, i) => i !== idx))}
                        className="absolute top-4 right-4 text-red-400 hover:text-red-300 text-[8px] uppercase tracking-widest font-black"
                      >
                        ✕ Eliminar
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/50">Cant.</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setManualItems(manualItems.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                          }}
                          className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white font-mono"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/50">Precio Unitario</label>
                        <input
                          type="number"
                          required
                          min={0}
                          step="any"
                          value={item.unit_price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setManualItems(manualItems.map((it, i) => i === idx ? { ...it, unit_price: val } : it));
                          }}
                          className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white font-mono"
                        />
                      </div>

                      <div className="md:col-span-7 space-y-1.5 relative concept-search-container">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/50">Descripción del Concepto</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Renta de oficina del mes"
                          value={item.description}
                          onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                          className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white font-bold"
                        />
                        {activeSuggestionIdx === idx && suggestedProducts.length > 0 && (
                          <div className="absolute left-0 right-0 mt-1 bg-[#050a06]/95 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 max-h-48 overflow-y-auto space-y-1 backdrop-blur-md autocomplete-dropdown">
                            {suggestedProducts.map((p: any) => (
                              <button
                                key={p.code}
                                type="button"
                                onClick={() => {
                                  setManualItems(manualItems.map((it, i) => i === idx ? { ...it, product_key: p.code, description: p.name } : it));
                                  setActiveSuggestionIdx(null);
                                  setSuggestedProducts([]);
                                }}
                                className="w-full text-left p-2.5 rounded-xl hover:bg-nectar-gold/10 border border-transparent hover:border-nectar-gold/20 flex flex-col gap-0.5 transition-all cursor-pointer group"
                              >
                                <span className="text-[10px] font-bold text-white group-hover:text-nectar-gold transition-colors">{p.name}</span>
                                <span className="text-[8px] text-white/40 font-mono">Clave: {p.code} | Categoria: {p.class_name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/50 block">Producto / Servicio SAT</label>
                        <SATAutocomplete
                          mode="product"
                          value={item.product_key}
                          onChange={(code) => setManualItems(manualItems.map((it, i) => i === idx ? { ...it, product_key: code } : it))}
                          primaryColor={primaryColor}
                          placeholder="Buscar clave de producto..."
                          subdomain={subdomain}
                          tenantId={tenantId}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest text-white/50 block">Clave Unidad SAT</label>
                          <SATAutocomplete
                            mode="unit"
                            value={item.unit_key}
                            onChange={(code, name) => setManualItems(manualItems.map((it, i) => i === idx ? { ...it, unit_key: code, unit_name: name || it.unit_name } : it))}
                            primaryColor={primaryColor}
                            placeholder="Buscar clave..."
                            subdomain={subdomain}
                            tenantId={tenantId}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest text-white/50 block">Nombre Unidad</label>
                          <input
                            type="text"
                            value={item.unit_name}
                            onChange={(e) => setManualItems(manualItems.map((it, i) => i === idx ? { ...it, unit_name: e.target.value } : it))}
                            className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 border-t border-white/5 pt-6 mt-6 animate-in fade-in duration-250">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">2. Información del Ticket</h4>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/50">Número de Ticket o Recibo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. rec_mock_001"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white font-mono uppercase"
                />
                <p className="text-[8px] text-white/30 uppercase tracking-wider">
                  Ingresa el ID o código de ticket impreso en tu nota de compra para recuperar tus conceptos automáticamente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Totales y Timbrado */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          {isTenantAdmin ? (
            <div className="flex gap-8 text-[9px] font-black uppercase tracking-widest w-full md:w-auto">
              <div>
                <span className="opacity-40 block">Subtotal</span>
                <span className="text-sm font-mono font-bold text-white/80">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="opacity-40 block">IVA (16%)</span>
                <span className="text-sm font-mono font-bold text-white/80">${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-nectar-gold block">Total Facturado</span>
                <span className="text-base font-mono font-black text-nectar-gold">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
              </div>
            </div>
          ) : (
            <div className="text-[8px] text-white/40 uppercase tracking-wider font-bold">
              El total y desglose de IVA se calcularán directamente del ticket.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 text-black font-black uppercase tracking-widest text-[9.5px] rounded-xl transition-all cursor-pointer disabled:opacity-50 w-full md:w-auto hover:scale-102 active:scale-98 font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-t-black border-black/10 animate-spin"></span>
                Emitiendo Factura...
              </div>
            ) : (
              '✓ Solicitar y Timbrar Factura'
            )}
          </button>
        </div>
      </form>

      <CreateCustomerModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={async (newCustomer) => {
          await loadBillingData();
          if (newCustomer && newCustomer.id) {
            setSelectedCustomer(newCustomer);
            setEmail(newCustomer.email);
            if (newCustomer.username) setRazonSocial(newCustomer.username);
          }
        }}
        tenantId={tenantId}
        primaryColor={primaryColor}
        themeConfig={{
          cardBgColor: '#050a06',
          borderColor: 'rgba(255, 255, 255, 0.05)'
        }}
        showToast={showToast || console.log}
      />

      {showAdminLogin && (
        <div
          onClick={() => setShowAdminLogin(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#050a06',
              borderColor: 'rgba(255, 255, 255, 0.05)'
            }}
            className="w-full max-w-md border p-8 md:p-10 rounded-[3rem] shadow-2xl relative space-y-6 text-left cursor-default animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setShowAdminLogin(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl font-bold cursor-pointer"
            >
              ×
            </button>

            <div>
              <span
                className="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full border"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                  borderColor: `${primaryColor}20`
                }}
              >
                Seguridad
              </span>
              <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none text-white uppercase">
                Modo Administrador
              </h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1 text-white/70">
                Inicia sesión con tu cuenta de administrador o dueño para habilitar la búsqueda e inscripción de clientes.
              </p>
            </div>

            {adminLoginError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl text-center">
                ⚠️ {adminLoginError}
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 text-white/60">Email del Administrador</label>
                <input
                  type="email"
                  required
                  placeholder="admin@nectarlabs.dev"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 text-white/60">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-white font-mono"
                />
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="px-5 py-3 border border-white/10 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer text-white/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adminLoginLoading}
                  className="px-6 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg cursor-pointer"
                  style={{
                    backgroundColor: primaryColor,
                    color: '#000000',
                  }}
                >
                  {adminLoginLoading ? 'Autenticando...' : 'Iniciar Sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

interface EcommerceStoreProps {
  tenantId: string;
  subdomain: string;
  primaryColor: string;
}

function EcommerceStore({ tenantId, subdomain, primaryColor }: EcommerceStoreProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAndNumber, setStreetAndNumber] = useState('');
  const [suburb, setSuburb] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('MX');
  const [latitude, setLatitude] = useState('19.432608');
  const [longitude, setLongitude] = useState('-99.133209');
  const [locatingUser, setLocatingUser] = useState(false);

  const handleGetLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setLocatingUser(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(String(pos.coords.latitude));
          setLongitude(String(pos.coords.longitude));
          setLocatingUser(false);
        },
        (err) => {
          console.error('Error al obtener ubicación:', err);
          setLocatingUser(false);
        }
      );
    }
  };

  const [fetchingRates, setFetchingRates] = useState(false);
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedRate, setSelectedRate] = useState<any | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`/api/products/?subdomain=${subdomain}`);
        if (!res.ok) throw new Error('Error al cargar productos');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : (data.results || []));
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [subdomain]);

  const handleFetchShippingRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setFetchingRates(true);
    setErrorMsg(null);
    setShippingRates([]);
    setSelectedRate(null);

    try {
      const res = await fetch('/api/shop/shipping-rates/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subdomain,
          destination: {
            zip_code: postalCode.trim(),
            street_and_number: streetAndNumber.trim(),
            suburb: suburb.trim(),
            city: city.trim(),
            state: state.trim(),
            country: country.trim(),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron calcular tarifas de envío.');

      const rates = data.rates || [];
      setShippingRates(rates);
      if (rates.length > 0) {
        setSelectedRate(rates[0]);
      } else {
        throw new Error('No se encontraron tarifas de envío disponibles para esta dirección.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al calcular el envío.');
    } finally {
      setFetchingRates(false);
    }
  };

  const handleCreateCheckoutSession = async () => {
    if (!selectedProduct || !selectedRate) return;
    setCheckoutLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/shop/checkout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subdomain,
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          street_and_number: streetAndNumber.trim(),
          suburb: suburb.trim(),
          city: city.trim(),
          state: state.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          items: [
            {
              product_id: selectedProduct.id,
              quantity: 1
            }
          ],
          skydropx_rate_id: selectedRate.rate_id || selectedRate.id,
          shipping_cost: parseFloat(selectedRate.amount),
          shipping_cost_base: parseFloat(selectedRate.amount),
          shipping_provider: selectedRate.provider
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar pasarela de pago.');

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No se recibió la URL de pago.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el pago.');
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center animate-premium">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left animate-premium">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="border border-white/5 rounded-2xl bg-white/[0.02] p-5 flex flex-col justify-between hover:border-white/10 transition-all duration-300">
            <div>
              {product.image && (
                <img src={product.image} alt={product.name} className="w-full h-36 object-cover rounded-xl mb-4 border border-white/5" />
              )}
              <h4 className="text-sm font-black uppercase text-white">{product.name}</h4>
              <p className="text-[10px] text-white/50 mt-1 line-clamp-2">{product.description}</p>
            </div>

            <div className="mt-4 border-t border-white/5 pt-3 flex justify-between items-center">
              <div>
                <span className="text-xs font-black text-white font-mono">${parseFloat(product.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                <span className="block text-[8px] text-white/30 uppercase mt-0.5">Stock: {product.stock} pz</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(product);
                  setShippingRates([]);
                  setSelectedRate(null);
                  setErrorMsg(null);
                }}
                disabled={product.stock <= 0}
                className="px-3.5 py-2 text-[9px] font-black uppercase tracking-widest text-black rounded-lg hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor }}
              >
                {product.stock <= 0 ? 'Sin Stock' : 'Comprar'}
              </button>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-full py-12 text-center text-white/30 text-xs">
            Aún no hay productos disponibles en el catálogo de esta tienda.
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f0c] border border-white/10 w-full max-w-xl rounded-2xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white text-sm cursor-pointer"
            >
              ✕
            </button>

            <div className="mb-6 flex gap-4 items-center">
              {selectedProduct.image && (
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-12 h-12 object-cover rounded-lg border border-white/5 shrink-0" />
              )}
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-0.5">Completar Compra</span>
                <h3 className="text-base font-black text-white uppercase">{selectedProduct.name}</h3>
                <span className="text-[10px] font-mono font-bold text-nectar-gold">${parseFloat(selectedProduct.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase font-bold rounded-xl">
                ⚠️ {errorMsg}
              </div>
            )}

            {shippingRates.length === 0 ? (
              <form onSubmit={handleFetchShippingRates} className="space-y-4">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-white/50 border-b border-white/5 pb-2">Información de Envío y Contacto</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/45">Nombre Completo</label>
                    <input
                      type="text" required placeholder="Carlos Mendoza" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/45">Correo Electrónico</label>
                    <input
                      type="email" required placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/45">Teléfono</label>
                    <input
                      type="tel" required placeholder="5512345678" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/45">Código Postal</label>
                    <input
                      type="text" required maxLength={5} placeholder="06000" value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-black text-white/45">Calle y Número</label>
                  <input
                    type="text" required placeholder="Av. Paseo de la Reforma #123" value={streetAndNumber} onChange={(e) => setStreetAndNumber(e.target.value)}
                    className="w-full border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/45">Colonia</label>
                    <input
                      type="text" required placeholder="Juárez" value={suburb} onChange={(e) => setSuburb(e.target.value)}
                      className="w-full border border-white/10 rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/45">Ciudad</label>
                    <input
                      type="text" required placeholder="Cuauhtémoc" value={city} onChange={(e) => setCity(e.target.value)}
                      className="w-full border border-white/10 rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/45">Estado</label>
                    <input
                      type="text" required placeholder="CDMX" value={state} onChange={(e) => setState(e.target.value)}
                      className="w-full border border-white/10 rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white"
                    />
                  </div>
                </div>

                {/* Coordenadas GPS para entregas locales / restaurantes de Nectar Delivery */}
                <div className="grid grid-cols-3 gap-3 items-end bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                  <div className="space-y-1">
                    <label className="text-[7px] uppercase tracking-wider font-black text-white/45">Latitud GPS</label>
                    <input
                      type="text" required placeholder="19.4326" value={latitude} onChange={(e) => setLatitude(e.target.value)}
                      className="w-full border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] uppercase tracking-wider font-black text-white/45">Longitud GPS</label>
                    <input
                      type="text" required placeholder="-99.1332" value={longitude} onChange={(e) => setLongitude(e.target.value)}
                      className="w-full border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-nectar-gold bg-transparent text-white font-mono"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locatingUser}
                      className="w-full py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[8px] font-black uppercase tracking-wider transition-all disabled:opacity-50 h-[32px] flex items-center justify-center cursor-pointer"
                    >
                      {locatingUser ? 'Ubicando...' : '📍 GPS en Vivo'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={fetchingRates}
                  className="w-full py-3.5 text-black font-black uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer disabled:opacity-50 mt-4 animate-premium"
                  style={{ backgroundColor: primaryColor }}
                >
                  {fetchingRates ? 'Calculando costos de envío...' : 'Calcular Envío'}
                </button>
              </form>
            ) : (
              <div className="space-y-6 animate-premium">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-white/55 border-b border-white/5 pb-2">Selecciona un Proveedor de Envío</h4>

                <div className="space-y-2">
                  {shippingRates.map((rate, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedRate(rate)}
                      className="flex justify-between items-center p-3 border rounded-xl cursor-pointer hover:bg-white/[0.02] transition-all"
                      style={{ borderColor: selectedRate?.rate_id === rate.rate_id ? primaryColor : 'rgba(255,255,255,0.05)' }}
                    >
                      <div>
                        <span className="text-xs font-black text-white uppercase">{rate.provider}</span>
                        <span className="block text-[8px] text-white/40 uppercase mt-0.5">Entrega estimada: {rate.days} días</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">${parseFloat(rate.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/5 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Producto:</span>
                    <span>${parseFloat(selectedProduct.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                  </div>
                  {selectedRate && (
                    <div className="flex justify-between text-white/60">
                      <span>Envío ({selectedRate.provider}):</span>
                      <span>${parseFloat(selectedRate.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-white border-t border-white/5 pt-2">
                    <span>Total a Pagar:</span>
                    <span className="text-nectar-gold font-mono">${(parseFloat(selectedProduct.price) + (selectedRate ? parseFloat(selectedRate.amount) : 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShippingRates([]);
                      setSelectedRate(null);
                    }}
                    className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest hover:bg-white/5 border border-white/10 text-white rounded-xl text-center transition-all cursor-pointer"
                  >
                    ← Modificar Envío
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCheckoutSession}
                    disabled={checkoutLoading || !selectedRate}
                    className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-black rounded-xl text-center hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {checkoutLoading ? 'Procesando Stripe...' : 'Proceder al Pago'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
