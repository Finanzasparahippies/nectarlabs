'use client';

import React, { useState, useEffect } from 'react';
import { fetcher, API_URL } from '../../lib/api';
import Toast from '../ui/Toast';
import ConfirmModal from '../ui/ConfirmModal';

const getInlineViewUrl = (url: string | null, type: 'quote' | 'contract' | 'receipt', id: string | number) => {
  if (!url) return '';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const endpoint = type === 'quote' ? `quotes/${id}/view_pdf` : type === 'contract' ? `contracts/${id}/view_pdf` : `installments/${id}/view_receipt`;
  return `${API_URL}/${endpoint}/${token ? `?token=${token}` : ''}`;
};

const PREDEFINED_MODULES = [
  { key: 'auth', name: 'Autenticación y Perfiles de Usuario', description: 'Sistema de inicio de sesión seguro, registro, recuperación de contraseña y gestión de perfiles con roles de usuario (ADMIN, CLIENT, etc.).', price: 11000 },
  { key: 'payments', name: 'Pasarela de Pagos y E-commerce', description: 'Integración de cobros recurrentes y pagos únicos a través de Stripe/PayPal con carrito de compras y facturación básica.', price: 20000 },
  { key: 'notifications', name: 'Chat y Notificaciones en Tiempo Real', description: 'Sistema de notificaciones push, alertas en tiempo real y chat interactivo basado en WebSockets.', price: 15000 },
  { key: 'cms', name: 'Panel de Administración y Gestor de Contenido (CMS)', description: 'Consola de administración a medida para publicar blogs, gestionar catálogos, y editar información general.', price: 11000 },
  { key: 'booking', name: 'Calendario y Sistema de Reservas', description: 'Módulo de citas dinámico con asignación de horarios, recordatorios automáticos por email y pasarela de cobro.', price: 25000 },
  { key: 'analytics', name: 'Dashboard de Analítica y Gráficas', description: 'Panel de métricas integrando gráficas en tiempo real de ventas, logs, y reportes procesados en base de datos.', price: 20000 },
  { key: 'api', name: 'Integración de API y Servicios de Terceros', description: 'Conexión de sistemas externos (ej. CRM, ERP, API de envíos, Mapas) con endpoints documentados.', price: 12000 },
  { key: 'saas', name: 'Arquitectura Multi-inquilino (SaaS)', description: 'Base estructurada para alojar múltiples subdominios de clientes independientes bajo un esquema SaaS premium.', price: 35000 },
];

interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  project_idea: string | null;
  estimated_value: string; // Decimal from Django
  status: 'PROSPECT' | 'CONTACTED' | 'PROPOSAL' | 'WON' | 'LOST';
  notes: string | null;
  created_at: string;
}

interface ProjectQuote {
  id: string;
  client_name: string;
  client_email: string;
  project_name: string;
  description: string | null;
  modules: Array<{ name: string; description: string; price: number }>;
  total_price: string;
  estimated_delivery_weeks: number;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
  pdf_file: string | null;
  created_at: string;
}

export default function SalesCommander() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<ProjectQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDragOverColumn, setActiveDragOverColumn] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Modals
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesLead, setNotesLead] = useState<Lead | null>(null);
  
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteLead, setQuoteLead] = useState<Lead | null>(null);

  // Lead Form State
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadProjectIdea, setLeadProjectIdea] = useState('');
  const [leadEstimatedValue, setLeadEstimatedValue] = useState(0);
  const [leadStatus, setLeadStatus] = useState<Lead['status']>('PROSPECT');
  const [leadNotes, setLeadNotes] = useState('');

  // Quote Form State
  const [quoteProjectName, setQuoteProjectName] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteDeliveryWeeks, setQuoteDeliveryWeeks] = useState(4);
  const [selectedModules, setSelectedModules] = useState<Array<{ name: string; description: string; price: number; key: string }>>([]);
  const [quoteError, setQuoteError] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, quotesData] = await Promise.all([
        fetcher('/leads/').catch(() => []),
        fetcher('/quotes/').catch(() => [])
      ]);
      setLeads(leadsData);
      setQuotes(quotesData);
    } catch (err) {
      console.error('Error fetching sales dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Lead CRUD Actions
  const handleOpenCreateLead = () => {
    setEditingLead(null);
    setLeadName('');
    setLeadEmail('');
    setLeadPhone('');
    setLeadProjectIdea('');
    setLeadEstimatedValue(0);
    setLeadStatus('PROSPECT');
    setLeadNotes('');
    setShowLeadModal(true);
  };

  const handleOpenEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadName(lead.name);
    setLeadEmail(lead.email || '');
    setLeadPhone(lead.phone || '');
    setLeadProjectIdea(lead.project_idea || '');
    setLeadEstimatedValue(parseFloat(lead.estimated_value) || 0);
    setLeadStatus(lead.status);
    setLeadNotes(lead.notes || '');
    setShowLeadModal(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = {
      name: leadName,
      email: leadEmail || null,
      phone: leadPhone || null,
      project_idea: leadProjectIdea || null,
      estimated_value: leadEstimatedValue,
      status: leadStatus,
      notes: leadNotes || null
    };

    try {
      let response;
      if (editingLead) {
        response = await fetch(`${API_URL}/leads/${editingLead.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_URL}/leads/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) throw new Error('Error al guardar prospecto');
      const savedLead = await response.json();

      if (editingLead) {
        setLeads(prev => prev.map(l => l.id === editingLead.id ? savedLead : l));
      } else {
        setLeads(prev => [savedLead, ...prev]);
      }
      setShowLeadModal(false);
      showToast(editingLead ? 'Prospecto actualizado con éxito.' : 'Prospecto creado con éxito.', 'success');
    } catch (err) {
      showToast('Hubo un error al guardar el prospecto.', 'error');
    }
  };

  const handleDeleteLead = (leadId: number) => {
    setConfirmModal({
      title: 'Eliminar Prospecto',
      message: '¿Estás seguro de que deseas eliminar este prospecto?',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        try {
          const response = await fetch(`${API_URL}/leads/${leadId}/`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (!response.ok) throw new Error('Error al eliminar prospecto');
          setLeads(prev => prev.filter(l => l.id !== leadId));
          showToast('Prospecto eliminado correctamente.', 'success');
        } catch (err) {
          showToast('Error al eliminar el prospecto.', 'error');
        }
      }
    });
  };

  // Quick Notes modal
  const handleOpenNotes = (lead: Lead) => {
    setNotesLead(lead);
    setLeadNotes(lead.notes || '');
    setShowNotesModal(true);
  };

  const handleSaveQuickNotes = async () => {
    if (!notesLead) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/leads/${notesLead.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: leadNotes })
      });
      if (!response.ok) throw new Error('Error saving notes');
      const updated = await response.json();
      setLeads(prev => prev.map(l => l.id === notesLead.id ? updated : l));
      setShowNotesModal(false);
      showToast('Notas del prospecto guardadas.', 'success');
    } catch (err) {
      showToast('Error al guardar las notas.', 'error');
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    e.dataTransfer.setData('text/plain', leadId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    setActiveDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setActiveDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Lead['status']) => {
    e.preventDefault();
    setActiveDragOverColumn(null);
    const leadIdStr = e.dataTransfer.getData('text/plain');
    if (!leadIdStr) return;
    const leadId = parseInt(leadIdStr);

    const leadToUpdate = leads.find(l => l.id === leadId);
    if (!leadToUpdate || leadToUpdate.status === targetStatus) return;

    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l));

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/leads/${leadId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      if (!response.ok) throw new Error('Failed to update status');
      const updated = await response.json();
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
    } catch (err) {
      // Revert if error
      showToast('Error al actualizar estado en el servidor. Revirtiendo...', 'error');
      loadData();
    }
  };

  // Quote Generation
  const handleOpenCreateQuote = (lead: Lead) => {
    setQuoteLead(lead);
    setQuoteProjectName(lead.project_idea ? `Proyecto: ${lead.name}` : '');
    setQuoteDescription(lead.project_idea || '');
    setQuoteDeliveryWeeks(4);
    setSelectedModules([]);
    setQuoteError('');
    setShowQuoteModal(true);
  };

  const handleToggleModuleTemplate = (template: typeof PREDEFINED_MODULES[0], isChecked: boolean) => {
    if (isChecked) {
      setSelectedModules(prev => [...prev, {
        key: template.key,
        name: template.name,
        description: template.description,
        price: template.price
      }]);
    } else {
      setSelectedModules(prev => prev.filter(sm => sm.key !== template.key));
    }
  };

  const handleAddCustomModule = () => {
    setSelectedModules(prev => [...prev, {
      key: `custom-${Date.now()}`,
      name: 'Módulo Personalizado',
      description: 'Detalles específicos de la funcionalidad a la medida.',
      price: 10000
    }]);
  };

  const handleRemoveSelectedModule = (key: string) => {
    setSelectedModules(prev => prev.filter(sm => sm.key !== key));
  };

  const handleEditSelectedModule = (index: number, field: 'name' | 'description' | 'price', value: any) => {
    setSelectedModules(prev => prev.map((m, idx) => {
      if (idx === index) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  const handleCreateQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteLead) return;
    setQuoteError('');
    setIsSubmittingQuote(true);

    const token = localStorage.getItem('token');
    const payload = {
      client: null, // Keep null to support direct guest signup upon approval
      client_name: quoteLead.name,
      client_email: quoteLead.email || `${quoteLead.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      project_name: quoteProjectName || `Software modular ${quoteLead.name}`,
      description: quoteDescription,
      estimated_delivery_weeks: quoteDeliveryWeeks,
      modules: selectedModules.map(m => ({
        name: m.name,
        description: m.description,
        price: parseFloat(m.price as any) || 0
      }))
    };

    try {
      const response = await fetch(`${API_URL}/quotes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Error al guardar la cotización');
      }

      const newQuote = await response.json();
      setQuotes(prev => [newQuote, ...prev]);
      setShowQuoteModal(false);
      
      // Auto transition Lead to PROPOSAL state if it is currently in PROSPECT or CONTACTED
      if (quoteLead.status === 'PROSPECT' || quoteLead.status === 'CONTACTED') {
        const responseLead = await fetch(`${API_URL}/leads/${quoteLead.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'PROPOSAL' })
        });
        if (responseLead.ok) {
          const updatedLead = await responseLead.json();
          setLeads(prev => prev.map(l => l.id === quoteLead.id ? updatedLead : l));
        }
      }

      showToast('Cotización creada y PDF generado con éxito.', 'success');
    } catch (err: any) {
      setQuoteError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleUpdateQuoteStatus = async (quoteId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/quotes/${quoteId}/change_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al cambiar el estado');
      }
      const data = await response.json();
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: data.status } : q));
      
      // If approved, update linked lead if found
      if (status === 'APPROVED') {
        const quote = quotes.find(q => q.id === quoteId);
        if (quote) {
          const matchedLead = leads.find(l => l.email === quote.client_email || l.name === quote.client_name);
          if (matchedLead && matchedLead.status !== 'WON') {
            const resLead = await fetch(`${API_URL}/leads/${matchedLead.id}/`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: 'WON' })
            });
            if (resLead.ok) {
              const updated = await resLead.json();
              setLeads(prev => prev.map(l => l.id === matchedLead.id ? updated : l));
            }
          }
        }
      }
      
      showToast(`Estado de la cotización actualizado a ${status}.${status === 'APPROVED' ? ' Se ha generado un contrato en proceso y enviado por correo para la firma.' : ''}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar estado.', 'error');
    }
  };

  const handleRegenerateQuotePDF = async (quoteId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/quotes/${quoteId}/regenerate_pdf/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const data = await response.json();
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, pdf_file: data.pdf_url } : q));
      showToast('PDF de la cotización regenerado con éxito.', 'success');
    } catch (err) {
      showToast('Error al generar PDF de cotización.', 'error');
    }
  };

  const handleDeleteQuote = (quoteId: string) => {
    setConfirmModal({
      title: 'Eliminar Cotización',
      message: '¿Estás seguro de que deseas eliminar esta cotización permanentemente?',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_URL}/quotes/${quoteId}/`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (!response.ok) throw new Error('Delete failed');
          setQuotes(prev => prev.filter(q => q.id !== quoteId));
          showToast('Cotización eliminada con éxito.', 'success');
        } catch (err) {
          showToast('Error al eliminar cotización.', 'error');
        }
      }
    });
  };

  // Helper values
  const getLeadsByStatus = (status: Lead['status']) => {
    return leads.filter(l => l.status === status);
  };

  const calculateLeadCommission = (lead: Lead) => {
    const val = parseFloat(lead.estimated_value) || 0;
    // Commission model: 6 installments.
    // Month 1: 10% of monthly payment (estimated_value / 6)
    // Month 2: 5% of monthly payment
    // Months 3-6: 2% of monthly payment each (total 4 months)
    const monthlyPayment = val / 6;
    const m1 = monthlyPayment * 0.10;
    const m2 = monthlyPayment * 0.05;
    const m3to6 = (monthlyPayment * 0.02) * 4;
    return m1 + m2 + m3to6;
  };

  const calculateTotalSalesWon = () => {
    return leads
      .filter(l => l.status === 'WON')
      .reduce((sum, l) => sum + calculateLeadCommission(l), 0);
  };

  const calculateActiveProspects = () => {
    return leads.filter(l => ['PROSPECT', 'CONTACTED', 'PROPOSAL'].includes(l.status)).length;
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Cargando Consola de Ventas...</p>
      </div>
    );
  }

  const columns: Array<{ status: Lead['status']; title: string; color: string; bg: string }> = [
    { status: 'PROSPECT', title: '🌸 Brotes de Flor (Prospectos)', color: 'text-blue-400 border-blue-400/20', bg: 'bg-blue-500/5' },
    { status: 'CONTACTED', title: '🐝 Polinización (Contactados)', color: 'text-purple-400 border-purple-400/20', bg: 'bg-purple-500/5' },
    { status: 'PROPOSAL', title: '🍯 Extracción de Néctar (Propuesta)', color: 'text-amber-400 border-amber-400/20', bg: 'bg-amber-500/5' },
    { status: 'WON', title: '🏡 Miel en Panal (Ganados)', color: 'text-green-400 border-green-400/20', bg: 'bg-green-500/5' },
    { status: 'LOST', title: '🥀 Flor Marchita (Perdidos)', color: 'text-red-400 border-red-400/20', bg: 'bg-red-500/5' },
  ];

  return (
    <div className="space-y-16">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border flex flex-col justify-between gap-4 relative overflow-hidden group shadow-lg min-h-[160px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Néctar Cosechado (Comisiones)</span>
            <h3 className="text-3xl font-black tracking-tight mt-2 text-green-400 font-mono">
              ${calculateTotalSalesWon().toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-foreground/50">MXN</span>
            </h3>
            <p className="text-[9px] text-foreground/50 mt-1 uppercase tracking-wider font-bold">Porcentaje de ganancia correspondiente sobre miel en panal</p>
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border flex flex-col justify-between gap-4 relative overflow-hidden group shadow-lg min-h-[160px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-nectar-gold/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Flores en Monitoreo (Prospectos)</span>
            <h3 className="text-3xl font-black tracking-tight mt-2 text-nectar-gold font-mono">
              {calculateActiveProspects()} <span className="text-xs font-bold text-foreground/50">Flores activas</span>
            </h3>
            <p className="text-[9px] text-foreground/50 mt-1 uppercase tracking-wider font-bold">Prospectos en la ruta de recolección</p>
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border flex flex-col justify-between gap-4 relative overflow-hidden group shadow-lg min-h-[160px] cursor-pointer hover:border-nectar-gold/50 transition-colors" onClick={handleOpenCreateLead}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Ruta del Néctar</span>
              <h3 className="text-xl font-black tracking-tight mt-2 text-foreground">
                Sembrar Nueva Flor
              </h3>
            </div>
            <span className="text-[9px] text-nectar-gold uppercase tracking-wider font-black flex items-center gap-1 mt-4">
              INICIAR RUTA DE POLINIZACIÓN ➔
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Ruta del Néctar (Pipeline)</h2>
            <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Arrastra las tarjetas para polinizar o extraer el néctar de las flores</p>
          </div>
          <button
            onClick={handleOpenCreateLead}
            className="px-5 py-2.5 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all font-bold hover:scale-[1.02]"
          >
            + Sembrar Flor
          </button>
        </div>

        {/* Board Columns Grid with Horizontal Scroll */}
        <div className="w-full overflow-x-auto pb-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-card-border/60 hover:scrollbar-thumb-nectar-gold/30">
          <div className="flex flex-row gap-6 min-w-max px-2">
            {columns.map(col => {
              const colLeads = getLeadsByStatus(col.status);
              const isDragOver = activeDragOverColumn === col.status;

              return (
                <div
                  key={col.status}
                  onDragOver={(e) => handleDragOver(e, col.status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.status)}
                  className={`p-6 rounded-[2.5rem] bg-card-bg border transition-all duration-300 flex flex-col min-h-[550px] w-[320px] md:w-[350px] shrink-0 shadow-lg ${
                    isDragOver ? 'border-nectar-gold bg-nectar-gold/5 scale-[1.01] shadow-nectar-gold/5' : 'border-card-border/60'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-card-border/35">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${col.color}`}>
                      {col.title}
                    </span>
                    <span className="px-2 py-0.5 bg-background/50 rounded-full text-[9px] font-bold opacity-60 font-mono">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Column Cards Container */}
                  <div className="flex-1 space-y-4 overflow-y-auto max-h-[550px] pr-1">
                    {colLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className="p-5 rounded-2xl bg-background/50 border border-card-border/50 hover:border-nectar-gold/40 transition-all cursor-grab active:cursor-grabbing group relative flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-black text-xs text-foreground group-hover:text-nectar-gold transition-colors line-clamp-1">
                              {lead.name}
                            </h4>
                            <div className="flex flex-col items-end text-right shrink-0">
                              <span className="text-[9px] font-bold text-nectar-gold font-mono" title="Comisión Estimada (10% Mes 1, 5% Mes 2, 2% Meses 3-6)">
                                ${calculateLeadCommission(lead).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                              </span>
                              <span className="text-[7.5px] text-foreground/45 font-mono">
                                Val: ${parseFloat(lead.estimated_value).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                          
                          {lead.project_idea && (
                            <p className="text-[9.5px] text-foreground/50 line-clamp-2 mt-1 leading-relaxed">
                              {lead.project_idea}
                            </p>
                          )}

                          <div className="mt-3 space-y-1 text-[8.5px] font-bold text-foreground/40 font-mono">
                            {lead.email && <div className="truncate">✉ {lead.email}</div>}
                            {lead.phone && <div>📞 {lead.phone}</div>}
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="flex justify-between items-center gap-2 mt-4 pt-2 border-t border-card-border/20">
                          <button
                            onClick={() => handleOpenNotes(lead)}
                            className="text-[8px] font-bold uppercase tracking-wider text-foreground/50 hover:text-nectar-gold"
                            title="Notas de seguimiento"
                          >
                            📝 Notas
                          </button>
                          
                          <div className="flex items-center gap-2">
                            {col.status !== 'WON' && col.status !== 'LOST' && (
                              <button
                                onClick={() => handleOpenCreateQuote(lead)}
                                className="px-2 py-1 bg-nectar-gold/10 hover:bg-nectar-gold hover:text-background text-nectar-gold text-[7.5px] font-black uppercase tracking-wider rounded border border-nectar-gold/20 transition-all"
                              >
                                Cotizar
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditLead(lead)}
                              className="text-[8px] font-bold uppercase tracking-wider text-foreground/30 hover:text-nectar-gold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="text-[8px] font-bold uppercase tracking-wider text-red-500/50 hover:text-red-500"
                            >
                              ✖
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {colLeads.length === 0 && (
                      <div className="h-full flex items-center justify-center py-20 text-center text-[9px] font-black uppercase tracking-widest opacity-20 border border-dashed border-card-border/40 rounded-2xl">
                        Arrastrar aquí
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quotes History Section */}
      <section className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Tus Cotizaciones Generadas</h3>
            <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Registro de propuestas modulares emitidas e historial de descargas</p>
          </div>
          <button
            onClick={() => {
              if (leads.length === 0) {
                showToast('Primero crea un prospecto para poder generarle una cotización.', 'warning');
                return;
              }
              const firstLead = leads[0];
              setQuoteLead(firstLead);
              setQuoteProjectName(firstLead.project_idea || '');
              setQuoteDescription(`Propuesta técnica y económica para ${firstLead.name}`);
              setSelectedModules([]);
              setShowQuoteModal(true);
            }}
            className="px-5 py-2.5 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all font-bold hover:scale-[1.02] shadow-lg shadow-nectar-gold/15"
          >
            + Nueva Cotización
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                <th className="pb-4">Cliente / Razón Social</th>
                <th className="pb-4">Proyecto</th>
                <th className="pb-4 text-right">Monto Estimado</th>
                <th className="pb-4 text-center">Entrega</th>
                <th className="pb-4 text-center">Estatus</th>
                <th className="pb-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(quote => (
                <tr key={quote.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                  <td className="py-4 pr-4">
                    <h4 className="font-black text-sm">{quote.client_name}</h4>
                    <p className="text-[7.5px] font-bold text-foreground/45 uppercase tracking-wider mt-0.5">{quote.client_email}</p>
                  </td>
                  <td className="py-4 font-bold text-xs">
                    {quote.project_name}
                  </td>
                  <td className="py-4 text-right font-mono font-bold text-xs text-nectar-gold">
                    ${parseFloat(quote.total_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 text-center text-[10px] font-bold opacity-60">
                    {quote.estimated_delivery_weeks} Semanas
                  </td>
                  <td className="py-4 text-center">
                    {quote.status === 'APPROVED' ? (
                      <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-green-500/20">Aprobado</span>
                    ) : quote.status === 'REJECTED' ? (
                      <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-red-500/20">Rechazado</span>
                    ) : quote.status === 'SENT' ? (
                      <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">Enviado</span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-yellow-500/20">Borrador</span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {quote.status === 'DRAFT' && (
                        <button
                          onClick={() => handleUpdateQuoteStatus(quote.id, 'SENT')}
                          className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all border border-blue-500/25"
                        >
                          Enviar
                        </button>
                      )}
                      
                      {quote.status !== 'APPROVED' && quote.status !== 'REJECTED' && (
                        <>
                          <button
                            onClick={() => handleUpdateQuoteStatus(quote.id, 'APPROVED')}
                            className="px-2.5 py-1.5 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all border border-green-500/25"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleUpdateQuoteStatus(quote.id, 'REJECTED')}
                            className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all border border-red-500/25"
                          >
                            Rechazar
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleRegenerateQuotePDF(quote.id)}
                        className="px-2.5 py-1.5 bg-card-border hover:bg-white hover:text-background text-[8px] font-black uppercase tracking-widest rounded-lg transition-all"
                        title="Regenerar PDF"
                      >
                        🔄 PDF
                      </button>

                      {quote.pdf_file ? (
                        <a
                          href={getInlineViewUrl(quote.pdf_file, 'quote', quote.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[8px] font-black uppercase tracking-widest rounded-lg transition-all inline-block font-bold"
                        >
                          Ver PDF
                        </a>
                      ) : (
                        <span className="text-[8px] opacity-35 font-bold uppercase py-1.5 inline-block pr-2">Sin PDF</span>
                      )}

                      <button
                        onClick={() => handleDeleteQuote(quote.id)}
                        className="px-2 py-1 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white text-xs rounded transition-all"
                      >
                        ✖
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {quotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                    Aún no has generado cotizaciones para tus prospectos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* LEAD CREATION / EDITION MODAL */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 max-w-xl w-full relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-nectar-gold/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            
            <h3 className="text-2xl font-black tracking-tight text-foreground mb-6">
              {editingLead ? 'Editar Prospecto' : 'Nuevo Prospecto'}
            </h3>

            <form onSubmit={handleSaveLead} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-2">
                    Nombre o Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
                    placeholder="Cliente / Empresa"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-2">
                    Valor Estimado (MXN)
                  </label>
                  <input
                    type="number"
                    value={leadEstimatedValue}
                    onChange={(e) => setLeadEstimatedValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono font-bold"
                    placeholder="Ej. 45000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-2">
                    Correo de Contacto
                  </label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
                    placeholder="6621000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-2">
                  Idea del Proyecto / Necesidad
                </label>
                <textarea
                  rows={2}
                  value={leadProjectIdea}
                  onChange={(e) => setLeadProjectIdea(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-medium"
                  placeholder="Detalles sobre lo que el cliente quiere desarrollar..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-2">
                    Etapa / Estatus del Pipeline
                  </label>
                  <select
                    value={leadStatus}
                    onChange={(e) => setLeadStatus(e.target.value as Lead['status'])}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
                  >
                    <option value="PROSPECT">Prospecto (Prospect)</option>
                    <option value="CONTACTED">Contactado (Contacted)</option>
                    <option value="PROPOSAL">Propuesta (Proposal)</option>
                    <option value="WON">Ganado (Won)</option>
                    <option value="LOST">Perdido (Lost)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-2">
                  Notas de Seguimiento Privadas
                </label>
                <textarea
                  rows={3}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-medium"
                  placeholder="Acuerdos de llamadas, recordatorios, etc."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="flex-1 py-4 border border-card-border hover:bg-foreground hover:text-background text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[10px] font-black uppercase tracking-widest rounded-xl transition-all font-bold hover:scale-[1.02]"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK NOTES MODAL */}
      {showNotesModal && notesLead && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 max-w-lg w-full relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-nectar-gold/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            
            <h3 className="text-xl font-black tracking-tight text-foreground mb-2">
              Notas de Seguimiento
            </h3>
            <p className="text-[8px] font-black uppercase tracking-widest text-nectar-gold mb-6">{notesLead.name}</p>

            <div className="space-y-6">
              <div>
                <textarea
                  rows={6}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-medium leading-relaxed"
                  placeholder="Escribe notas y acuerdos aquí..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowNotesModal(false)}
                  className="flex-1 py-3 border border-card-border hover:bg-foreground hover:text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickNotes}
                  className="flex-1 py-3 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all font-bold"
                >
                  Guardar Notas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULAR QUOTE MODAL */}
      {showQuoteModal && quoteLead && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
          <div className="bg-card-bg border border-card-border rounded-[3rem] p-8 md:p-10 max-w-4xl w-full relative overflow-hidden shadow-2xl my-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7.5px] font-black uppercase tracking-widest rounded-full">Consola de Vendedor</span>
                <h3 className="text-3xl font-black tracking-tighter mt-2 text-foreground">Cotizador Modular Rápido</h3>
                <p className="text-[9px] text-foreground/45 uppercase tracking-wider mt-1">Generando propuesta para el prospecto: <strong>{quoteLead.name}</strong></p>
              </div>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="w-8 h-8 rounded-full bg-background border border-card-border flex items-center justify-center hover:bg-foreground hover:text-background transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuoteSubmit} className="space-y-8">
              {quoteError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
                  ✗ {quoteError}
                </div>
              )}

              {/* Form Row 1: Client Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-background/20 p-5 rounded-2xl border border-card-border/30">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold border-b border-card-border/25 pb-1">Seleccionar Cliente / Prospecto</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-1">Prospecto a Cotizar *</label>
                      <select
                        value={quoteLead.id}
                        onChange={(e) => {
                          const selected = leads.find(l => l.id === parseInt(e.target.value));
                          if (selected) {
                            setQuoteLead(selected);
                            setQuoteProjectName(selected.project_idea || '');
                            setQuoteDescription(`Propuesta técnica y económica para ${selected.name}`);
                          }
                        }}
                        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
                      >
                        {leads.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.email || 'Sin email'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold border-b border-card-border/25 pb-1">Configuración General</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-1.5">Nombre del Proyecto *</label>
                      <input
                        type="text"
                        required
                        value={quoteProjectName}
                        onChange={(e) => setQuoteProjectName(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
                        placeholder="Ej. App Móvil"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-1.5">Tiempo de Entrega (Semanas) *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={quoteDeliveryWeeks}
                        onChange={(e) => setQuoteDeliveryWeeks(parseInt(e.target.value) || 4)}
                        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-wider text-foreground/50 mb-2">Descripción General del Alcance</label>
                <textarea
                  rows={2}
                  value={quoteDescription}
                  onChange={(e) => setQuoteDescription(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-medium"
                  placeholder="Alcance general acordado del ecosistema de software a desarrollar..."
                />
              </div>

              {/* Modules Selector */}
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-card-border/40 pb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold">Selecciona Módulos para Cotizar</h4>
                  <button
                    type="button"
                    onClick={handleAddCustomModule}
                    className="text-[9px] font-black text-nectar-gold uppercase tracking-wider hover:underline"
                  >
                    + Agregar Módulo Personalizado
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1">
                  {PREDEFINED_MODULES.map(mod => {
                    const isChecked = selectedModules.some(sm => sm.key === mod.key);
                    return (
                      <label
                        key={mod.key}
                        className={`p-4 rounded-2xl border transition-all duration-300 flex gap-3 items-start cursor-pointer ${
                          isChecked
                            ? 'bg-nectar-gold/5 border-nectar-gold'
                            : 'bg-background/40 border-card-border/60 hover:border-card-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleToggleModuleTemplate(mod, e.target.checked)}
                          className="mt-1 accent-nectar-gold"
                        />
                        <div className="min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-black text-xs text-foreground truncate">{mod.name}</span>
                            <span className="text-[10px] font-bold text-nectar-gold font-mono shrink-0">${mod.price.toLocaleString()}</span>
                          </div>
                          <p className="text-[8.5px] text-foreground/50 mt-1 line-clamp-2 leading-relaxed">{mod.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Selected Modules Adjustments List */}
              {selectedModules.length > 0 && (
                <div className="space-y-4 bg-background/30 p-5 rounded-3xl border border-card-border/40">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground border-b border-card-border/25 pb-2">Desglose de Cotización (Edición en Tiempo Real)</h4>
                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                    {selectedModules.map((mod, idx) => (
                      <div key={mod.key} className="flex gap-4 items-start bg-background/50 border border-card-border/50 p-4 rounded-2xl">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={mod.name}
                            onChange={(e) => handleEditSelectedModule(idx, 'name', e.target.value)}
                            className="bg-transparent border-b border-card-border/40 focus:border-nectar-gold focus:outline-none text-xs font-black text-foreground w-full pb-1 uppercase tracking-wider"
                          />
                          <textarea
                            rows={1}
                            value={mod.description}
                            onChange={(e) => handleEditSelectedModule(idx, 'description', e.target.value)}
                            className="bg-transparent text-[9px] text-foreground/60 w-full focus:outline-none resize-none leading-relaxed"
                          />
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center bg-background border border-card-border/80 rounded-lg px-2 py-1">
                            <span className="text-[10px] opacity-40 font-mono pr-1">$</span>
                            <input
                              type="number"
                              value={mod.price}
                              onChange={(e) => handleEditSelectedModule(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="bg-transparent text-xs font-bold text-nectar-gold font-mono w-20 focus:outline-none text-right"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedModule(mod.key)}
                            className="text-red-500 hover:text-red-400 font-bold text-xs"
                          >
                            ✖
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Calculation Footer */}
              <div className="flex justify-between items-center border-t border-card-border/60 pt-6">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Monto Final Acumulado</span>
                  <h3 className="text-3xl font-black text-nectar-gold font-mono mt-1">
                    ${selectedModules.reduce((sum, m) => sum + (m.price || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-foreground/50">MXN</span>
                  </h3>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowQuoteModal(false)}
                    className="px-6 py-4 border border-card-border hover:bg-foreground hover:text-background text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingQuote || selectedModules.length === 0}
                    className="px-8 py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[10px] font-black uppercase tracking-widest rounded-xl transition-all font-bold hover:scale-[1.02] disabled:opacity-50"
                  >
                    {isSubmittingQuote ? 'Generando PDF...' : 'Guardar y Generar PDF'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(null);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
