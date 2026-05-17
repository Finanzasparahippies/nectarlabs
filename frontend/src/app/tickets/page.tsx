'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '../../lib/api';

interface Message {
  id: number;
  sender_email: string;
  content: string;
  created_at: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  client_email: string;
  created_at: string;
  messages: Message[];
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // New ticket state
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'QUESTION',
    priority: 'MEDIUM'
  });

  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const staff = localStorage.getItem('is_staff') === 'true';
    setIsStaff(staff);
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const data = await fetcher('/tickets/');
      setTickets(data);
      if (selectedTicket) {
        const updated = data.find((t: Ticket) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetcher('/tickets/', {
        method: 'POST',
        body: JSON.stringify(newTicket)
      });
      setIsCreateModalOpen(false);
      setNewTicket({ title: '', description: '', category: 'QUESTION', priority: 'MEDIUM' });
      loadTickets();
    } catch (err) {
      alert("Error al crear el ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim()) return;
    setIsSubmitting(true);
    try {
      await fetcher(`/tickets/${selectedTicket.id}/add_message/`, {
        method: 'POST',
        body: JSON.stringify({ content: newMessage })
      });
      setNewMessage('');
      loadTickets();
    } catch (err) {
      alert("Error al enviar el mensaje");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId: number, newStatus: string) => {
    try {
      await fetcher(`/tickets/${ticketId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      loadTickets();
    } catch (err) {
      alert("Error al actualizar el estado");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Cargando Requerimientos...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Sidebar - Consistent with Dashboard */}
      <aside className="w-full lg:w-72 bg-card-bg border-b lg:border-r border-card-border p-8 flex flex-col justify-between">
        <div>
          <Link href="/" className="inline-block text-xl font-black tracking-tighter mb-16">
            NECTAR <span className="text-nectar-gold">LABS</span>
          </Link>
          
          <nav className="space-y-4">
            <Link href="/dashboard" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Dashboard
            </Link>
            <Link href="/tickets" className="flex items-center gap-4 px-6 py-4 bg-nectar-gold/10 text-nectar-gold rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-nectar-gold rounded-full"></div>
              {isStaff ? 'Gestión Tickets' : 'Soporte'}
            </Link>
            <Link href="/projects" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Proyectos
            </Link>
          </nav>
        </div>

        <button
          onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          className="mt-20 flex items-center gap-4 px-6 py-4 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]"
        >
          <span>Cerrar Sesión</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-12 lg:p-16 overflow-y-auto">
        <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">
              {isStaff ? 'Centro de Tickets' : 'Soporte de Ingeniería'}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-nectar-gold opacity-80">
              {isStaff ? 'Administración de Requerimientos de Clientes' : 'Tickets de Desarrollo e Implementación'}
            </p>
          </div>
          
          {!isStaff && (
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="px-8 py-4 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-nectar-gold/20 text-[10px]"
            >
              Nuevo Requerimiento
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          {/* List of Tickets */}
          <div className="xl:col-span-4 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] opacity-30 mb-6">Lista de Requerimientos</h2>
            {tickets.map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => setSelectedTicket(ticket)}
                className={`p-6 rounded-[2rem] border transition-all cursor-pointer group ${
                  selectedTicket?.id === ticket.id 
                    ? 'bg-nectar-gold/10 border-nectar-gold shadow-lg shadow-nectar-gold/5' 
                    : 'bg-card-bg border-card-border hover:border-foreground/20'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold">{ticket.category}</span>
                  <div className={`px-2 py-1 rounded-full text-[7px] font-black uppercase tracking-widest ${
                    ticket.status === 'OPEN' ? 'bg-green-500/10 text-green-500' :
                    ticket.status === 'RESOLVED' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-card-border text-foreground/40'
                  }`}>
                    {ticket.status}
                  </div>
                </div>
                <h3 className="font-black text-lg mb-2 group-hover:text-nectar-gold transition-colors">{ticket.title}</h3>
                {isStaff && <p className="text-[8px] font-bold opacity-40 uppercase mb-4">{ticket.client_email}</p>}
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-30">
                  <span>Prioridad: {ticket.priority}</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-card-border rounded-[2.5rem] opacity-30">
                <p className="font-bold uppercase tracking-widest text-[10px]">Sin requerimientos activos.</p>
              </div>
            )}
          </div>

          {/* Ticket Detail */}
          <div className="xl:col-span-8">
            {selectedTicket ? (
              <div className="bg-card-bg border border-card-border rounded-[3rem] p-8 md:p-12 min-h-[600px] flex flex-col">
                <div className="border-b border-card-border pb-8 mb-8 flex flex-col md:flex-row justify-between items-start gap-6">
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full">{selectedTicket.category}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-20">ID: #{selectedTicket.id}</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">{selectedTicket.title}</h2>
                    <div className="flex flex-wrap gap-6 text-[9px] font-black uppercase tracking-widest opacity-60">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-nectar-gold"></div>
                        Cliente: {selectedTicket.client_email}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-nectar-gold"></div>
                        Prioridad: {selectedTicket.priority}
                      </div>
                    </div>
                  </div>

                  {isStaff && (
                    <div className="flex flex-wrap gap-2">
                      {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(selectedTicket.id, status)}
                          className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
                            selectedTicket.status === status 
                              ? 'bg-nectar-gold text-background' 
                              : 'bg-card-border/50 hover:bg-card-border'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-12 mb-12 overflow-y-auto max-h-[500px] pr-4 custom-scrollbar">
                  {/* Original Description */}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-nectar-gold flex-shrink-0 flex items-center justify-center font-black text-background text-xs">C</div>
                    <div className="bg-card-border/30 p-6 rounded-3xl rounded-tl-none flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-2">Descripción Inicial</p>
                      <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                  </div>

                  {/* Messages Thread */}
                  {selectedTicket.messages?.map(msg => (
                    <div key={msg.id} className={`flex gap-4 ${msg.sender_email === selectedTicket.client_email ? '' : 'flex-row-reverse'}`}>
                      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-background text-xs ${
                        msg.sender_email === selectedTicket.client_email ? 'bg-nectar-gold' : 'bg-foreground'
                      }`}>
                        {msg.sender_email[0].toUpperCase()}
                      </div>
                      <div className={`p-6 rounded-3xl flex-1 ${
                        msg.sender_email === selectedTicket.client_email 
                          ? 'bg-card-border/30 rounded-tl-none' 
                          : 'bg-nectar-gold/10 border border-nectar-gold/20 rounded-tr-none'
                      }`}>
                        <div className={`flex justify-between items-center mb-2 ${msg.sender_email === selectedTicket.client_email ? '' : 'flex-row-reverse'}`}>
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{msg.sender_email}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-20">{new Date(msg.created_at).toLocaleTimeString()}</p>
                        </div>
                        <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                {selectedTicket.status !== 'CLOSED' && (
                  <form onSubmit={handleAddMessage} className="mt-auto">
                    <div className="relative group">
                      <textarea 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe una respuesta..."
                        className="w-full bg-card-border/30 border border-card-border rounded-[2rem] p-6 pr-32 focus:outline-none focus:border-nectar-gold transition-all resize-none text-sm"
                        rows={3}
                        required
                      />
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="absolute right-4 bottom-4 px-6 py-3 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all text-[10px] disabled:opacity-50"
                      >
                        {isSubmitting ? 'Enviando...' : 'Enviar Respuesta'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="h-full bg-card-bg border border-card-border border-dashed rounded-[3rem] flex flex-col items-center justify-center text-center p-12 opacity-30">
                <div className="w-20 h-20 bg-card-border rounded-full flex items-center justify-center mb-8">
                  <div className="w-10 h-1 h-10 bg-background/20 rounded-full"></div>
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2 uppercase tracking-widest">Selecciona un Requerimiento</h3>
                <p className="text-xs font-bold max-w-xs">Haz clic en un ticket para ver el historial completo y responder.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-background/80">
          <div className="w-full max-w-2xl bg-card-bg border border-card-border rounded-[3.5rem] p-10 md:p-16 relative shadow-2xl">
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-card-border/50 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all font-black"
            >
              ×
            </button>
            
            <header className="mb-12">
              <h2 className="text-4xl font-black tracking-tighter mb-4">Nuevo Requerimiento</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-nectar-gold opacity-80">Define los detalles de tu ticket de ingeniería</p>
            </header>

            <form onSubmit={handleCreateTicket} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Categoría</label>
                  <select 
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                    className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm appearance-none"
                  >
                    <option value="QUESTION">Consulta General</option>
                    <option value="ISSUE">Problema Técnico</option>
                    <option value="IDEA">Nueva Idea / Mejora</option>
                    <option value="IMPLEMENTATION">Implementación</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Prioridad</label>
                  <select 
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                    className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm appearance-none"
                  >
                    <option value="LOW">Baja (Mantenimiento)</option>
                    <option value="MEDIUM">Media (Desarrollo Estándar)</option>
                    <option value="HIGH">Alta (Bloqueante Parcial)</option>
                    <option value="URGENT">Urgente (Sistemas Caídos)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Asunto / Título</label>
                <input 
                  type="text" 
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                  placeholder="Ej: Integración de pasarela de pagos"
                  className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Detalles Técnicos</label>
                <textarea 
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Describe detalladamente el requerimiento o problema..."
                  className="w-full bg-card-border/30 border border-card-border rounded-[2rem] p-6 focus:outline-none focus:border-nectar-gold transition-all text-sm resize-none"
                  rows={5}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-nectar-gold/20 text-xs"
              >
                {isSubmitting ? 'Abriendo Ticket...' : 'Crear Ticket de Soporte'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
