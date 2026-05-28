import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetcher, API_URL } from '@/lib/api';
import Toast from '../ui/Toast';

const getInlineViewUrl = (url: string | null | undefined, type: 'quote' | 'contract' | 'receipt', id: string | number) => {
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

const getMediaUrl = (url?: string) => {
  if (!url) return '';
  let path = url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/media/')) {
        path = parsed.pathname;
      } else {
        return url;
      }
    } catch (e) {
      return url;
    }
  }
  return path;
};

interface Financials {
  gross_sales: number;
  contracts_mrr: number;
  paid_orders_total: number;
  designer_fees: number;
  total_costs: number;
  servers_total: number;
  expenses_total: number;
  net_profit: number;
  margin: number;
}

interface BillingItem {
  id: number;
  client?: string;
  provider?: string;
  plan?: string;
  name?: string;
  amount: number;
  next_payment_date: string;
  days_remaining: number;
  status: 'overdue' | 'upcoming' | 'paid';
}

interface TrendPoint {
  month: string;
  sales: number;
  costs: number;
  profit: number;
}

interface BusinessCommanderProps {
  stats: {
    financials: Financials;
    client_billing: BillingItem[];
    server_billing: BillingItem[];
    monthly_trend: TrendPoint[];
  } | null;
  installments: any[];
  setInstallments: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function BusinessCommander({ stats, installments, setInstallments }: BusinessCommanderProps) {
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [cfdiInputs, setCfdiInputs] = useState<Record<number, string>>({});

  // Sales Admin Panel state
  const [commissions, setCommissions] = useState<any[]>([]);
  const [commissionSummary, setCommissionSummary] = useState<any | null>(null);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [togglingUser, setTogglingUser] = useState<number | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Promo & Discount Codes CRUD state
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeType, setPromoCodeType] = useState<'CLIENT' | 'SELLER'>('CLIENT');
  const [promoDiscount, setPromoDiscount] = useState(10);
  const [promoMaxUses, setPromoMaxUses] = useState('');
  const [promoValidUntil, setPromoValidUntil] = useState('');
  const [promoReferrer, setPromoReferrer] = useState('');
  const [isSubmittingPromo, setIsSubmittingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);

  // Project Quotes States
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  // Quote Form State
  const [quoteClientType, setQuoteClientType] = useState<'registered' | 'prospect'>('prospect');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [deliveryWeeks, setDeliveryWeeks] = useState(4);
  const [selectedModules, setSelectedModules] = useState<Array<{ name: string; description: string; price: number; key: string }>>([]);

  useEffect(() => {
    const loadSalesData = async () => {
      try {
        const [commissionsData, summaryData, promoData, usersData, quotesData] = await Promise.all([
          fetcher('/sales-commissions/').catch(() => []),
          fetcher('/sales-commissions/summary/').catch(() => null),
          fetcher('/promo-codes/').catch(() => []),
          fetcher('/users/').catch(() => []),
          fetcher('/quotes/').catch(() => []),
        ]);
        setCommissions(Array.isArray(commissionsData) ? commissionsData : []);
        setCommissionSummary(summaryData);
        setPromoCodes(Array.isArray(promoData) ? promoData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setQuotes(Array.isArray(quotesData) ? quotesData : []);
      } catch (err) {
        console.error('Error loading sales data:', err);
      } finally {
        setSalesLoading(false);
        setQuotesLoading(false);
      }
    };
    loadSalesData();
  }, []);

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
      if (!response.ok) throw new Error("PDF generation failed");
      const data = await response.json();
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, pdf_file: data.pdf_url } : q));
      showToast("PDF de la cotización regenerado con éxito.", 'success');
    } catch (err) {
      showToast("Error al generar PDF de cotización.", 'error');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta cotización permanentemente?")) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/quotes/${quoteId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Delete failed");
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      showToast("Cotización eliminada con éxito.", 'success');
    } catch (err) {
      showToast("Error al eliminar cotización.", 'error');
    }
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

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError('');
    setIsSubmittingQuote(true);

    try {
      const token = localStorage.getItem('token');

      let clientName = prospectName;
      let clientEmail = prospectEmail;

      if (quoteClientType === 'registered') {
        const found = users.find(u => u.id === parseInt(selectedClientId));
        if (found) {
          clientName = found.username;
          clientEmail = found.email;
        } else {
          throw new Error("Por favor selecciona un usuario válido.");
        }
      }

      const payload = {
        client: quoteClientType === 'registered' ? parseInt(selectedClientId) : null,
        client_name: clientName,
        client_email: clientEmail,
        project_name: projectName,
        description: projectDesc,
        estimated_delivery_weeks: deliveryWeeks,
        modules: selectedModules.map(m => ({
          name: m.name,
          description: m.description,
          price: parseFloat(m.price as any) || 0
        }))
      };

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
      showToast("Cotización modular creada y PDF generado con éxito.", 'success');
    } catch (err: any) {
      setQuoteError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleToggleApproval = async (userId: number, currentApproved: boolean) => {
    setTogglingUser(userId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/${userId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_approved_seller: !currentApproved })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al actualizar el estado de aprobación');
      }
      const updated = await response.json();
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
      showToast(updated.is_approved_seller ? 'Vendedor aprobado con éxito.' : 'Aprobación de vendedor revocada.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar estado del vendedor.', 'error');
    } finally {
      setTogglingUser(null);
    }
  };

  const handleMarkCommissionPaid = async (commissionId: number) => {
    setMarkingPaid(commissionId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/sales-commissions/${commissionId}/mark-paid/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Error al marcar como pagada');
      }
      const updated = await response.json();
      setCommissions(prev => prev.map(c => c.id === commissionId ? updated : c));
      // Refresh summary
      const newSummary = await fetcher('/sales-commissions/summary/').catch(() => null);
      setCommissionSummary(newSummary);
      showToast('Comisión marcada como pagada con éxito.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar comisión.', 'error');
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleUpdateInstallmentStatus = async (installmentId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const origin = window.location.origin;
      const API_URL = origin.includes("github.dev")
        ? origin.replace("-3000", "-8080").replace("-3002", "-8080") + "/api"
        : "/api";

      const response = await fetch(`${API_URL}/installments/${installmentId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          paid_at: newStatus === 'PAID' ? new Date().toISOString() : null
        })
      });

      if (!response.ok) throw new Error("Status update failed");
      const updated = await response.json();
      setInstallments(prev => prev.map(inst => inst.id === installmentId ? updated : inst));
      showToast(`Estado de la mensualidad actualizado a ${newStatus === 'PAID' ? 'PAGADO' : newStatus === 'CANCELLED' ? 'CANCELADO' : 'PENDIENTE'}.`, 'success');
    } catch (err) {
      showToast("Error al actualizar el estado de la mensualidad.", 'error');
    }
  };

  const handleSaveCFDI = async (installmentId: number) => {
    const uuid = cfdiInputs[installmentId] || "";
    if (!uuid.trim()) return showToast("Por favor ingresa un folio fiscal válido.", 'warning');

    try {
      const token = localStorage.getItem('token');
      const origin = window.location.origin;
      const API_URL = origin.includes("github.dev")
        ? origin.replace("-3000", "-8080").replace("-3002", "-8080") + "/api"
        : "/api";

      const response = await fetch(`${API_URL}/installments/${installmentId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cfdi_uuid: uuid })
      });

      if (!response.ok) throw new Error("CFDI update failed");
      const updated = await response.json();
      setInstallments(prev => prev.map(inst => inst.id === installmentId ? updated : inst));
      showToast("Folio Fiscal / CFDI guardado con éxito.", 'success');
    } catch (err) {
      showToast("Error al guardar Folio Fiscal.", 'error');
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return showToast("Por favor ingresa un código.", "warning");

    setPromoError('');
    setIsSubmittingPromo(true);

    const token = localStorage.getItem('token');
    const isEditing = editingPromoId !== null;
    const url = isEditing ? `${API_URL}/promo-codes/${editingPromoId}/` : `${API_URL}/promo-codes/`;
    const method = isEditing ? 'PUT' : 'POST';

    const payload = {
      code: promoCode.trim().toUpperCase(),
      code_type: promoCodeType,
      discount_percentage: parseFloat(promoDiscount as any) || 0,
      max_uses: promoMaxUses ? parseInt(promoMaxUses) : null,
      valid_until: promoValidUntil || null,
      referrer: promoReferrer ? parseInt(promoReferrer) : null,
      is_active: true
    };

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Error al guardar el código promocional');
      }

      const savedPromo = await response.json();
      if (isEditing) {
        setPromoCodes(prev => prev.map(p => p.id === editingPromoId ? savedPromo : p));
        showToast(`Código ${savedPromo.code} modificado con éxito.`, "success");
      } else {
        setPromoCodes(prev => [savedPromo, ...prev]);
        showToast(`Código ${savedPromo.code} creado con éxito.`, "success");
      }
      setShowPromoModal(false);
      setEditingPromoId(null);
    } catch (err: any) {
      setPromoError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsSubmittingPromo(false);
    }
  };

  const handleTogglePromoCodeActive = async (codeId: number, currentActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/promo-codes/${codeId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentActive })
      });

      if (!response.ok) throw new Error("Error al cambiar estado");
      const updated = await response.json();
      setPromoCodes(prev => prev.map(p => p.id === codeId ? updated : p));
      showToast(`Código ${updated.code} ${updated.is_active ? 'activado' : 'desactivado'}.`, "success");
    } catch (err) {
      showToast("Error al actualizar el estado del código.", "error");
    }
  };

  const handleDeletePromoCode = async (codeId: number, codeStr: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el código ${codeStr}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/promo-codes/${codeId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Error al eliminar");
      setPromoCodes(prev => prev.filter(p => p.id !== codeId));
      showToast(`Código ${codeStr} eliminado con éxito.`, "success");
    } catch (err) {
      showToast("Error al eliminar el código.", "error");
    }
  };

  if (!stats) return (
    <div className="py-20 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Cargando Analíticas Consolidadas...</p>
    </div>
  );

  const { financials, client_billing, server_billing, monthly_trend } = stats;
  const salesPeople = users.filter((u: any) => u.role === 'SALES');

  // Determinar los puntos de coordenadas para el gráfico SVG
  const maxSales = Math.max(...monthly_trend.map(t => t.sales)) || 1000;
  const padding = 40;
  const chartHeight = 180;
  const chartWidth = 500;

  const getCoordinates = (type: 'sales' | 'costs') => {
    return monthly_trend.map((point, index) => {
      const x = padding + (index * (chartWidth - padding * 2)) / (monthly_trend.length - 1);
      const val = type === 'sales' ? point.sales : point.costs;
      const y = chartHeight - padding - (val * (chartHeight - padding * 2)) / maxSales;
      return `${x},${y}`;
    }).join(' ');
  };

  const salesPoints = getCoordinates('sales');
  const costsPoints = getCoordinates('costs');

  return (
    <div className="space-y-16">
      {/* 4 Financial Cards (Los Placosones inspired, Nectar styled) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-fadeIn">
        {/* Ventas Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-nectar-gold/5 blur-2xl rounded-full"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Ventas Consolidadas</span>
              <div className="w-8 h-8 rounded-xl bg-nectar-gold/10 text-nectar-gold flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-black tracking-tight mb-2">
              ${financials.gross_sales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider mb-6">
              Ingresos Consolidados de Néctar Labs
            </p>
          </div>

          {/* Desglose de Ventas */}
          <div className="pt-4 border-t border-card-border/40 grid grid-cols-3 gap-2 text-[8px] font-black uppercase tracking-wider">
            <div>
              <p className="opacity-30 mb-1">Contratos MRR</p>
              <p className="text-foreground/90 font-black">${(financials.contracts_mrr || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="opacity-30 mb-1">Ventas Tienda</p>
              <p className="text-foreground/90 font-black">${(financials.paid_orders_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-amber-400">
              <p className="opacity-40 mb-1">Diseñador (Transitorio)</p>
              <p className="font-black">${(financials.designer_fees || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Costos Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-foreground/5 blur-2xl rounded-full"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Costos Operativos</span>
              <div className="w-8 h-8 rounded-xl bg-foreground/5 text-foreground opacity-60 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                  <rect x="9" y="9" width="6" height="6"></rect>
                  <line x1="9" y1="1" x2="9" y2="4"></line>
                  <line x1="15" y1="1" x2="15" y2="4"></line>
                  <line x1="9" y1="20" x2="9" y2="23"></line>
                  <line x1="15" y1="20" x2="15" y2="23"></line>
                  <line x1="20" y1="9" x2="23" y2="9"></line>
                  <line x1="20" y1="15" x2="23" y2="15"></line>
                  <line x1="1" y1="9" x2="4" y2="9"></line>
                  <line x1="1" y1="15" x2="4" y2="15"></line>
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-black tracking-tight mb-2">
              ${financials.total_costs.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider mb-6">
              Costos Operativos Mensualizados
            </p>
          </div>

          {/* Desglose de Costos */}
          <div className="pt-4 border-t border-card-border/40 grid grid-cols-2 gap-4 text-[9px] font-bold uppercase tracking-wider">
            <div>
              <p className="opacity-30 mb-1">Servidores</p>
              <p className="text-foreground/90 font-black">${(financials.servers_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="opacity-30 mb-1">SaaS / Licencias</p>
              <p className="text-foreground/90 font-black">${(financials.expenses_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Utilidad Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg min-h-[220px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Utilidad Neta</span>
              <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="7" y1="17" x2="17" y2="7"></line>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-black tracking-tight mb-2 text-green-400">
              ${financials.net_profit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">
              Margen Neto Mensual Consolidado
            </p>
          </div>
          <div className="text-[9px] font-bold text-foreground/25 uppercase tracking-wider pt-4 border-t border-card-border/20">
            Fórmula: Ingresos - Costos
          </div>
        </div>

        {/* Margen Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg min-h-[220px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-nectar-gold/5 blur-2xl rounded-full"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Eficiencia Operativa</span>
              <div className="w-8 h-8 rounded-xl bg-nectar-gold/15 text-nectar-gold flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-black tracking-tight mb-2 text-nectar-gold">
              {financials.margin.toFixed(1)}%
            </h3>
            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">
              Retorno de Ganancia por cada Dólar Cobrado
            </p>
          </div>
          <div className="text-[9px] font-bold text-foreground/25 uppercase tracking-wider pt-4 border-t border-card-border/20">
            Fórmula: (Utilidad / Ingresos) * 100
          </div>
        </div>
      </div>

      {/* SVG Interactive Trend Chart */}
      <section className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Tendencia Financiera Trimestral</h3>

          {/* Instrucción visual */}
          <span className="text-[8px] font-black text-nectar-gold uppercase tracking-widest bg-nectar-gold/5 px-3 py-1 rounded-full">
            Desliza el cursor para explorar
          </span>
        </div>

        <div className="relative">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64 overflow-visible">
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E2B355" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#E2B355" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="var(--card-border)" strokeOpacity="0.2" strokeDasharray="4 4" />
            <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--card-border)" strokeOpacity="0.4" />

            {/* Hover Vertical Guideline Tracker */}
            {activePoint !== null && (
              <line
                x1={padding + (activePoint * (chartWidth - padding * 2)) / (monthly_trend.length - 1)}
                y1={padding - 10}
                x2={padding + (activePoint * (chartWidth - padding * 2)) / (monthly_trend.length - 1)}
                y2={chartHeight - padding}
                stroke="#E2B355"
                strokeWidth="1.5"
                strokeOpacity="0.2"
                strokeDasharray="3 3"
                className="transition-all duration-150 ease-out"
              />
            )}

            {/* Sales Area & Line (Gold) */}
            <path
              d={`M ${padding},${chartHeight - padding} L ${salesPoints} L ${chartWidth - padding},${chartHeight - padding} Z`}
              fill="url(#salesGrad)"
            />
            <polyline
              fill="none"
              stroke="#E2B355"
              strokeWidth="3"
              points={salesPoints}
            />

            {/* Costs Line (White) */}
            <polyline
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="2"
              strokeOpacity="0.5"
              strokeDasharray="3 3"
              points={costsPoints}
            />

            {/* Static & Hover Highlighted Dots */}
            {monthly_trend.map((point, idx) => {
              const x = padding + (idx * (chartWidth - padding * 2)) / (monthly_trend.length - 1);
              const salesY = chartHeight - padding - (point.sales * (chartHeight - padding * 2)) / maxSales;
              const costsY = chartHeight - padding - (point.costs * (chartHeight - padding * 2)) / maxSales;

              const isActive = activePoint === idx;

              return (
                <g key={idx}>
                  {/* Sales Dot */}
                  <circle
                    cx={x}
                    cy={salesY}
                    r={isActive ? 7 : 4}
                    fill="#E2B355"
                    className="transition-all duration-300 pointer-events-none"
                  />
                  {/* Costs Dot */}
                  <circle
                    cx={x}
                    cy={costsY}
                    r={isActive ? 6 : 3}
                    fill="var(--foreground)"
                    fillOpacity={isActive ? 1.0 : 0.6}
                    className="transition-all duration-300 pointer-events-none"
                  />

                  {/* Month Label */}
                  <text
                    x={x}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fillOpacity={isActive ? 0.9 : 0.3}
                    className="text-[8px] font-black uppercase tracking-wider transition-all duration-300"
                  >
                    {point.month}
                  </text>
                </g>
              );
            })}

            {/* Hover Interactive Zones */}
            {monthly_trend.map((point, idx) => {
              const sliceWidth = (chartWidth - padding * 2) / (monthly_trend.length - 1);
              const x = padding + (idx * (chartWidth - padding * 2)) / (monthly_trend.length - 1);
              return (
                <rect
                  key={`hit-${idx}`}
                  x={x - sliceWidth / 2}
                  y={padding - 10}
                  width={sliceWidth}
                  height={chartHeight - padding * 2 + 20}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setActivePoint(idx)}
                  onMouseMove={() => setActivePoint(idx)}
                  onMouseLeave={() => setActivePoint(null)}
                />
              );
            })}
          </svg>

          {/* Chart Legend */}
          <div className="flex gap-8 justify-center mt-6 text-[8px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-[#E2B355]"></div>
              <span className="opacity-80">Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-foreground border-dashed border-t-2"></div>
              <span className="opacity-50">Costos de Infraestructura</span>
            </div>
          </div>

          {/* Unified Hover Tooltip Card */}
          {activePoint !== null && (
            <div className="absolute top-4 right-4 bg-card-bg/95 backdrop-blur-md border border-card-border p-5 rounded-3xl shadow-2xl text-[9px] font-black uppercase tracking-widest space-y-2.5 z-30 pointer-events-none animate-fadeIn border-nectar-gold/30">
              <div className="flex justify-between items-center gap-6 border-b border-card-border/50 pb-2">
                <span className="text-nectar-gold font-black">Periodo</span>
                <span className="text-foreground">{monthly_trend[activePoint].month}</span>
              </div>
              <div className="flex justify-between gap-10">
                <span className="opacity-40">Ingresos</span>
                <span className="text-foreground">${Math.round(monthly_trend[activePoint].sales).toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between gap-10">
                <span className="opacity-40">Costos</span>
                <span className="text-foreground">${Math.round(monthly_trend[activePoint].costs).toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between gap-10 pt-2 border-t border-card-border/50 text-green-400">
                <span>Utilidad</span>
                <span>${Math.round(monthly_trend[activePoint].sales - monthly_trend[activePoint].costs).toLocaleString('es-MX')}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Cashflow Calendar Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        {/* Clients Billing */}
        <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg">
          <div className="mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Facturación Contractual</h3>
            <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Próximos cobros a clientes por planes activos</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4">Cliente</th>
                  <th className="pb-4 text-right">Monto</th>
                  <th className="pb-4 text-center">Vence</th>
                  <th className="pb-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {client_billing.map(billing => (
                  <tr key={billing.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                    <td className="py-4 pr-4">
                      <h4 className="font-black text-sm">{billing.client}</h4>
                      <p className="text-[7px] font-bold text-nectar-gold uppercase tracking-wider mt-0.5">{billing.plan}</p>
                    </td>
                    <td className="py-4 text-right font-bold text-sm">
                      ${billing.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 text-center text-[10px] font-bold opacity-60">
                      {new Date(billing.next_payment_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="py-4 text-right">
                      {billing.status === 'overdue' ? (
                        <span className="px-3 py-1.5 bg-red-500/10 text-red-500 text-[7px] font-black uppercase tracking-widest rounded-full animate-pulse">Vencido</span>
                      ) : billing.status === 'upcoming' ? (
                        <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-[7px] font-black uppercase tracking-widest rounded-full">En {billing.days_remaining} días</span>
                      ) : (
                        <span className="px-3 py-1.5 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full">Al día</span>
                      )}
                    </td>
                  </tr>
                ))}
                {client_billing.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                      Sin cobros contractuales pendientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Server Infrastructure Cost Vencimientos */}
        <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg">
          <div className="mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Vencimiento de Infraestructura</h3>
            <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Fechas límites de pago para servidores y servicios</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4">Infraestructura</th>
                  <th className="pb-4 text-right">Costo</th>
                  <th className="pb-4 text-center">Vence</th>
                  <th className="pb-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {server_billing.map(billing => (
                  <tr key={billing.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                    <td className="py-4 pr-4">
                      <h4 className="font-black text-sm">{billing.name}</h4>
                      <p className="text-[7px] font-bold text-nectar-gold uppercase tracking-wider mt-0.5">{billing.provider}</p>
                    </td>
                    <td className="py-4 text-right font-bold text-sm">
                      ${billing.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 text-center text-[10px] font-bold opacity-60">
                      {new Date(billing.next_payment_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="py-4 text-right">
                      {billing.status === 'overdue' ? (
                        <span className="px-3 py-1.5 bg-red-500/10 text-red-500 text-[7px] font-black uppercase tracking-widest rounded-full animate-pulse">Expirado</span>
                      ) : billing.status === 'upcoming' ? (
                        <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-[7px] font-black uppercase tracking-widest rounded-full">Por pagar</span>
                      ) : (
                        <span className="px-3 py-1.5 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full">Al día</span>
                      )}
                    </td>
                  </tr>
                ))}
                {server_billing.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                      Sin vencimientos de servidores registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Control de Mensualidades y Emisión de CFDI (SAT) */}
      <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg mt-12">
        <div className="mb-8">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Control de Mensualidades y Emisión de CFDI (SAT)</h3>
          <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Validación de comprobantes SPEI/Depósitos y registro de Facturas timbradas</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                <th className="pb-4">Contrato / Mes</th>
                <th className="pb-4 text-right">Monto</th>
                <th className="pb-4 text-center">Vencimiento</th>
                <th className="pb-4 text-center">Comprobante</th>
                <th className="pb-4 text-center">Estatus</th>
                <th className="pb-4 text-right">Facturación CFDI (SAT)</th>
              </tr>
            </thead>
            <tbody>
              {installments.map(inst => (
                <tr key={inst.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                  <td className="py-4 pr-4">
                    <h4 className="font-black text-sm">Contrato #{inst.contract}</h4>
                    {inst.client_name && (
                      <p className="text-[9px] font-black text-foreground mt-0.5">{inst.client_name}</p>
                    )}
                    {inst.project_name && (
                      <p className="text-[8px] font-bold text-nectar-gold opacity-80 mt-0.5">{inst.project_name}</p>
                    )}
                    <p className="text-[7px] font-bold text-white/40 uppercase tracking-wider mt-1">Mensualidad {inst.installment_number} de 6</p>
                  </td>
                  <td className="py-4 text-right font-bold text-sm">
                    ${parseFloat(inst.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 text-center text-[10px] font-bold opacity-60">
                    {inst.due_date}
                  </td>
                  <td className="py-4 text-center">
                    {inst.receipt_file ? (
                      <a
                        href={getInlineViewUrl(inst.receipt_file, 'receipt', inst.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-nectar-gold/10 text-nectar-gold hover:bg-nectar-gold hover:text-background text-[8px] font-black uppercase tracking-widest rounded-full transition-all inline-block font-bold border border-nectar-gold/20"
                      >
                        Ver Comprobante
                      </a>
                    ) : (
                      <span className="text-[8px] opacity-35 font-bold uppercase">No cargado</span>
                    )}
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <select
                        value={inst.status}
                        onChange={(e) => handleUpdateInstallmentStatus(inst.id, e.target.value)}
                        className={`px-2.5 py-1 text-[7px] font-black uppercase tracking-wider rounded-full bg-background border focus:outline-none cursor-pointer transition-colors ${inst.status === 'PAID'
                          ? 'border-green-500/30 text-green-500 bg-green-500/5'
                          : inst.status === 'CANCELLED'
                            ? 'border-red-500/30 text-red-500 bg-red-500/5'
                            : inst.receipt_file
                              ? 'border-orange-500/30 text-orange-500 bg-orange-500/5'
                              : 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5'
                          }`}
                      >
                        <option value="PENDING" className="text-yellow-500">Pendiente</option>
                        <option value="PAID" className="text-green-500">Pagado</option>
                        <option value="CANCELLED" className="text-red-500">Cancelado</option>
                      </select>
                      {inst.status !== 'PAID' && inst.receipt_file && (
                        <button
                          onClick={() => handleUpdateInstallmentStatus(inst.id, 'PAID')}
                          className="mt-1 px-2 py-0.5 bg-green-600 hover:bg-green-500 text-white text-[7px] font-black uppercase tracking-widest rounded-md hover:scale-105 active:scale-95 transition-all shadow-sm"
                        >
                          Aprobar Pago
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    {inst.cfdi_uuid ? (
                      <div className="text-right">
                        <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[7px] font-black uppercase tracking-widest rounded-full">Timbrada</span>
                        <p className="text-[7px] font-mono text-foreground/45 mt-1 select-all">{inst.cfdi_uuid}</p>
                      </div>
                    ) : (
                      <div className="flex justify-end items-center gap-2">
                        <input
                          type="text"
                          placeholder="UUID CFDI 4.0"
                          value={cfdiInputs[inst.id] || ""}
                          onChange={(e) => setCfdiInputs(prev => ({ ...prev, [inst.id]: e.target.value }))}
                          className="bg-background border border-card-border rounded-lg px-3 py-1.5 text-[8px] font-mono focus:outline-none focus:border-nectar-gold w-40 text-foreground"
                        />
                        <button
                          onClick={() => handleSaveCFDI(inst.id)}
                          className="px-3 py-1.5 bg-nectar-gold text-background text-[7px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all"
                        >
                          Guardar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {installments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                    Sin mensualidades generadas en el sistema
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── SECCIÓN DE COTIZACIONES MODULARES ── */}
      <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg mt-12">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4 text-left">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Cotizador de Proyectos Modulares</h3>
            <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Generación de propuestas comerciales y PDFs formalizados para proyectos a la medida</p>
          </div>
          <button
            onClick={() => {
              setSelectedModules([]);
              setProjectName('');
              setProjectDesc('');
              setProspectName('');
              setProspectEmail('');
              setSelectedClientId('');
              setDeliveryWeeks(4);
              setQuoteError('');
              setShowQuoteModal(true);
            }}
            className="px-6 py-2.5 bg-nectar-gold text-background text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-nectar-gold/25 font-bold"
          >
            + Nueva Cotización
          </button>
        </div>

        {quotesLoading ? (
          <div className="py-10 flex justify-center">
            <div className="w-8 h-8 border-2 border-nectar-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4">Proyecto / Cliente</th>
                  <th className="pb-4 text-center">Módulos</th>
                  <th className="pb-4 text-center">Entrega Est.</th>
                  <th className="pb-4 text-right">Total Cotizado</th>
                  <th className="pb-4 text-center">Estado</th>
                  <th className="pb-4 text-center">PDF</th>
                  <th className="pb-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(quote => (
                  <tr key={quote.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                    <td className="py-4 pr-4 text-left">
                      <h4 className="font-black text-sm">{quote.project_name}</h4>
                      <span className="text-[9px] font-bold text-foreground/60">{quote.client_name}</span>
                      <p className="text-[7.5px] font-mono text-foreground/40 mt-0.5">{quote.client_email}</p>
                    </td>
                    <td className="py-4 text-center font-mono font-bold text-xs">
                      {quote.modules ? quote.modules.length : 0}
                    </td>
                    <td className="py-4 text-center text-[10px] font-bold opacity-60">
                      {quote.estimated_delivery_weeks} sem
                    </td>
                    <td className="py-4 text-right font-black text-sm text-nectar-gold font-mono">
                      ${parseFloat(quote.total_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 text-center">
                      <select
                        value={quote.status}
                        onChange={(e) => handleUpdateQuoteStatus(quote.id, e.target.value)}
                        className={`px-3 py-1.5 text-[7px] font-black uppercase tracking-wider rounded-full bg-background border focus:outline-none cursor-pointer transition-colors ${quote.status === 'APPROVED'
                          ? 'border-green-500/30 text-green-500 bg-green-500/5'
                          : quote.status === 'REJECTED'
                            ? 'border-red-500/30 text-red-500 bg-red-500/5'
                            : quote.status === 'SENT'
                              ? 'border-blue-500/30 text-blue-500 bg-blue-500/5'
                              : 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5'
                          }`}
                      >
                        <option value="DRAFT">Borrador</option>
                        <option value="SENT">Enviado</option>
                        <option value="APPROVED">Aprobado</option>
                        <option value="REJECTED">Rechazado</option>
                      </select>
                    </td>
                    <td className="py-4 text-center">
                      {quote.pdf_file ? (
                        <div className="flex flex-col items-center gap-1">
                          <a
                            href={getInlineViewUrl(quote.pdf_file, 'quote', quote.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-nectar-gold/10 hover:bg-nectar-gold hover:text-background text-[8px] font-black uppercase tracking-widest rounded-full transition-all inline-block font-bold border border-nectar-gold/20"
                          >
                            Abrir PDF ↗
                          </a>
                          <button
                            onClick={() => handleRegenerateQuotePDF(quote.id)}
                            className="text-[7px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-nectar-gold transition-all"
                          >
                            Regenerar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRegenerateQuotePDF(quote.id)}
                          className="px-2.5 py-1 bg-foreground/5 hover:bg-foreground hover:text-background text-[8px] font-black uppercase tracking-widest rounded-full transition-all"
                        >
                          Generar PDF
                        </button>
                      )}
                    </td>
                    <td className="py-4 text-center">
                      <button
                        onClick={() => handleDeleteQuote(quote.id)}
                        className="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                      No hay cotizaciones generadas aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── ADMIN SALES COMMAND CENTER ── */}
      <section id="ventas-section" className="space-y-10">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-1">Panel de Ventas</h2>
          <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-wider">Control global de vendedores, comisiones y códigos de referido</p>
        </div>

        {/* Sales KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-3xl rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Comisiones Pagadas</span>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-green-400 font-mono">
              ${((commissionSummary?.paid_total) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              <span className="text-[9px] font-bold opacity-50 ml-1">MXN</span>
            </h3>
            <p className="text-[9px] text-foreground/40 mt-1 uppercase tracking-wider font-bold">Liquidadas a vendedores</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-3xl rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Comisiones Pendientes</span>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-yellow-400 font-mono">
              ${((commissionSummary?.pending_total) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              <span className="text-[9px] font-bold opacity-50 ml-1">MXN</span>
            </h3>
            <p className="text-[9px] text-foreground/40 mt-1 uppercase tracking-wider font-bold">Por liquidar a vendedores</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-nectar-gold/5 blur-3xl rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Contratos Referidos</span>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-nectar-gold font-mono">
              {commissionSummary?.referred_contracts_count ?? 0}
              <span className="text-[9px] font-bold opacity-50 ml-1">Contratos</span>
            </h3>
            <p className="text-[9px] text-foreground/40 mt-1 uppercase tracking-wider font-bold">Adquiridos por vendedores</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Vendedores Activos</span>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-blue-400 font-mono">
              {commissionSummary?.active_sellers ?? 0}
              <span className="text-[9px] font-bold opacity-50 ml-1">SALES</span>
            </h3>
            <p className="text-[9px] text-foreground/40 mt-1 uppercase tracking-wider font-bold">Usuarios con rol vendedor</p>
          </div>
        </div>

        {/* Gestión de Vendedores Table */}
        <div className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl">
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Gestión de Vendedores</h3>
              <p className="text-[9px] font-bold text-foreground/30 mt-1 uppercase tracking-wider">Aprobación y métricas de desempeño de vendedores</p>
            </div>
            <span className="px-4 py-1.5 bg-foreground/5 rounded-full text-[8px] font-black uppercase tracking-widest opacity-50">
              {salesPeople.length} vendedores registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                            <thead>
                <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4">Email Vendedor</th>
                  <th className="pb-4 text-center">Código Referido</th>
                  <th className="pb-4 text-center">Usos / Referidos</th>
                  <th className="pb-4 text-right">Pendientes</th>
                  <th className="pb-4 text-right">Cobradas</th>
                  <th className="pb-4 text-center">Estatus</th>
                  <th className="pb-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {salesPeople.map((u: any) => {
                  const userCode = promoCodes.find((p: any) => (p.referrer === u.id || p.referrer?.id === u.id || (p.referrer && Number(p.referrer) === Number(u.id))) && p.code_type === 'SELLER');
                  const referredCount = userCode ? userCode.used_count : 0;
                  const userCommissions = commissions.filter((c: any) => c.salesperson === u.id);
                  const paidTotal = userCommissions.filter((c: any) => c.status === 'PAID').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                  const pendingTotal = userCommissions.filter((c: any) => c.status === 'PENDING').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                  const isApproved = !!u.is_approved_seller;

                  return (
                    <tr key={u.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                      <td className="py-3.5">
                        <span className="font-black text-[10px] text-foreground">{u.username}</span>
                        <p className="text-[8px] text-foreground/45 font-mono">{u.email}</p>
                      </td>
                      <td className="py-3.5 text-center">
                        {userCode ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono font-black text-sm text-nectar-gold tracking-widest">{userCode.code}</span>
                            <button
                              onClick={() => {
                                setPromoCode(userCode.code);
                                setPromoCodeType(userCode.code_type);
                                setPromoDiscount(parseFloat(userCode.discount_percentage));
                                setPromoMaxUses(userCode.max_uses !== null && userCode.max_uses !== undefined ? String(userCode.max_uses) : '');
                                setPromoValidUntil(userCode.valid_until || '');
                                setPromoReferrer(String(u.id));
                                setEditingPromoId(userCode.id);
                                setPromoError('');
                                setShowPromoModal(true);
                              }}
                              className="p-1 hover:text-nectar-gold text-foreground/40 transition-colors"
                              title="Editar Código"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.155 1.262a.5.5 0 01-.65-.65z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setPromoCode(`NECTAR-${u.username.toUpperCase()}`);
                              setPromoCodeType('SELLER');
                              setPromoDiscount(10);
                              setPromoMaxUses('');
                              setPromoValidUntil('');
                              setPromoReferrer(String(u.id));
                              setEditingPromoId(null);
                              setPromoError('');
                              setShowPromoModal(true);
                            }}
                            className="px-3 py-1 bg-nectar-gold/10 hover:bg-nectar-gold hover:text-background text-[7px] font-black uppercase tracking-widest rounded-xl border border-nectar-gold/20 transition-all font-bold"
                          >
                            + Crear Código
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 text-center font-mono font-bold text-xs">{referredCount}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-[11px] text-yellow-500">
                        ${pendingTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-[11px] text-green-400">
                        ${paidTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-center">
                        {isApproved ? (
                          <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-green-500/20">Aprobado</span>
                        ) : (
                          <span className="px-3 py-1 bg-red-500/10 text-red-400 text-[7px] font-black uppercase tracking-widest rounded-full border border-red-500/20">Pendiente</span>
                        )}
                      </td>
                      <td className="py-3.5 text-center">
                        <button
                          onClick={() => handleToggleApproval(u.id, isApproved)}
                          disabled={togglingUser === u.id}
                          className={`px-4 py-1.5 text-[7px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 font-bold ${isApproved
                            ? 'bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 text-red-400'
                            : 'bg-green-950/40 border border-green-500/30 hover:bg-green-900/40 text-green-400'
                            }`}
                        >
                          {togglingUser === u.id ? '...' : (isApproved ? 'Revocar' : 'Aprobar')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {salesPeople.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                      No hay vendedores registrados en el sistema
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commissions Table */}
        <div className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Historial de Comisiones</h3>
              <p className="text-[9px] font-bold text-foreground/30 mt-1 uppercase tracking-wider">Todas las comisiones generadas por ventas referidas</p>
            </div>
            <span className="px-4 py-1.5 bg-foreground/5 rounded-full text-[8px] font-black uppercase tracking-widest opacity-50">
              {commissions.length} registros
            </span>
          </div>
          {salesLoading ? (
            <div className="py-10 flex justify-center">
              <div className="w-8 h-8 border-2 border-nectar-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                    <th className="pb-4">Vendedor</th>
                    <th className="pb-4">Cliente</th>
                    <th className="pb-4 text-center">Plan</th>
                    <th className="pb-4 text-center">Mensualidad</th>
                    <th className="pb-4 text-center">Vencimiento</th>
                    <th className="pb-4 text-right">Monto Pagado</th>
                    <th className="pb-4 text-center">Comisión %</th>
                    <th className="pb-4 text-right">Tu Pago</th>
                    <th className="pb-4 text-center">Estado</th>
                    <th className="pb-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((comm) => (
                    <tr key={comm.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                      <td className="py-3.5">
                        <div>
                          <span className="font-black text-[10px] text-foreground">{comm.salesperson_email?.split('@')[0]}</span>
                          <p className="text-[8px] text-foreground/40 font-mono">{comm.salesperson_email}</p>
                        </div>
                      </td>
                      <td className="py-3.5 font-bold text-[11px] text-foreground/80">{comm.client_name}</td>
                      <td className="py-3.5 text-center">
                        <span className="px-2 py-0.5 bg-foreground/5 rounded-full text-[8px] font-black uppercase tracking-wider text-foreground/50">{comm.plan_name}</span>
                      </td>
                      <td className="py-3.5 text-center font-mono font-bold text-xs text-foreground/70">#{comm.installment_number}</td>
                      <td className="py-3.5 text-center text-[10px] font-bold text-foreground/50">
                        {comm.due_date ? new Date(comm.due_date + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-[11px]">
                        ${parseFloat(comm.installment_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-center font-mono font-black text-sm text-nectar-gold">
                        {parseFloat(comm.commission_percentage)}%
                      </td>
                      <td className="py-3.5 text-right font-mono font-black text-sm text-white">
                        ${parseFloat(comm.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-center">
                        {comm.status === 'PAID' ? (
                          <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-green-500/20">Pagada</span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-yellow-500/20">Pendiente</span>
                        )}
                      </td>
                      <td className="py-3.5 text-center">
                        {comm.status === 'PENDING' ? (
                          <button
                            onClick={() => handleMarkCommissionPaid(comm.id)}
                            disabled={markingPaid === comm.id}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[7px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {markingPaid === comm.id ? '...' : 'Marcar Pagada'}
                          </button>
                        ) : (
                          <span className="text-[8px] text-foreground/20 font-black">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {commissions.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                        Sin comisiones registradas en el sistema
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Promo Codes Table */}
        <div className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl">
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4 text-left">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Códigos de Descuento y Referido</h3>
              <p className="text-[9px] font-bold text-foreground/30 mt-1 uppercase tracking-wider">Todos los códigos del sistema — SELLER y CLIENT</p>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => {
                  setPromoCode('');
                  setPromoCodeType('CLIENT');
                  setPromoDiscount(10);
                  setPromoMaxUses('');
                  setPromoValidUntil('');
                  setPromoReferrer('');
                  setPromoError('');
                  setEditingPromoId(null);
                  setShowPromoModal(true);
                }}
                className="px-5 py-2.5 bg-nectar-gold text-background text-[8px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md font-bold"
              >
                + Crear Código
              </button>
              <span className="px-4 py-1.5 bg-foreground/5 rounded-full text-[8px] font-black uppercase tracking-widest opacity-50 font-bold">
                {promoCodes.length} códigos
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4">Código</th>
                  <th className="pb-4 text-center">Tipo</th>
                  <th className="pb-4">Referidor</th>
                  <th className="pb-4 text-center">Descuento</th>
                  <th className="pb-4 text-center">Usos</th>
                  <th className="pb-4 text-center">Límite</th>
                  <th className="pb-4 text-center">Estado</th>
                  <th className="pb-4 text-center">Creado</th>
                  <th className="pb-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((code) => (
                  <tr key={code.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                    <td className="py-3.5">
                      <span className="font-mono font-black text-sm text-nectar-gold tracking-widest">{code.code}</span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`px-3 py-1 text-[7px] font-black uppercase tracking-widest rounded-full border ${code.code_type === 'SELLER'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                        {code.code_type === 'SELLER' ? '🏷️ Vendedor' : '👥 Cliente'}
                      </span>
                    </td>
                    <td className="py-3.5 text-[10px] font-bold text-foreground/60">{code.referrer_email || '—'}</td>
                    <td className="py-3.5 text-center font-mono font-black text-sm text-nectar-gold">{parseFloat(code.discount_percentage)}%</td>
                    <td className="py-3.5 text-center font-mono font-bold text-sm">{code.used_count}</td>
                    <td className="py-3.5 text-center text-[10px] font-bold text-foreground/50">{code.max_uses ?? '∞'}</td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => handleTogglePromoCodeActive(code.id, code.is_active)}
                        className={`px-3 py-1 text-[7px] font-black uppercase tracking-widest rounded-full border hover:scale-105 active:scale-95 transition-all ${code.is_active
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                      >
                        {code.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-3.5 text-center text-[9px] font-bold text-foreground/45">
                      {new Date(code.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setPromoCode(code.code);
                          setPromoCodeType(code.code_type);
                          setPromoDiscount(parseFloat(code.discount_percentage));
                          setPromoMaxUses(code.max_uses !== null && code.max_uses !== undefined ? String(code.max_uses) : '');
                          setPromoValidUntil(code.valid_until || '');
                          setPromoReferrer(code.referrer !== null && code.referrer !== undefined ? String(code.referrer) : '');
                          setEditingPromoId(code.id);
                          setPromoError('');
                          setShowPromoModal(true);
                        }}
                        className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold hover:bg-nectar-gold hover:text-background rounded-xl text-[7px] font-black uppercase tracking-widest transition-all border border-nectar-gold/20 font-bold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeletePromoCode(code.id, code.code)}
                        className="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl text-[7px] font-black uppercase tracking-widest transition-all border border-red-500/20 font-bold"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {promoCodes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                      Sin códigos de referido registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── MODAL NUEVA COTIZACIÓN MODULAR ── */}
      {showQuoteModal && (
        <div
          onClick={() => setShowQuoteModal(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-card-bg border border-card-border p-8 md:p-10 rounded-[3rem] shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-8 animate-in fade-in zoom-in-95 duration-200 text-left cursor-default"
          >
            <button
              onClick={() => setShowQuoteModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-card-border text-foreground/40 hover:text-foreground flex items-center justify-center text-xl font-bold"
            >
              ×
            </button>

            <div>
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Néctar Labs Cotizador
              </span>
              <h2 className="text-3xl font-black tracking-tighter mt-4 leading-none">Nueva Cotización Modular</h2>
              <p className="text-xs opacity-40 uppercase tracking-widest mt-1">Configure los requerimientos del proyecto</p>
            </div>

            {quoteError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl text-center">
                {quoteError}
              </div>
            )}

            <form onSubmit={handleCreateQuote} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side: General Info */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Tipo de Cliente</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setQuoteClientType('prospect')}
                      className={`py-3 rounded-2xl border font-black text-[9px] uppercase tracking-wider transition-all ${quoteClientType === 'prospect'
                        ? 'border-nectar-gold bg-nectar-gold/10 text-nectar-gold'
                        : 'border-card-border text-foreground/50 hover:border-card-border/80 bg-background/50'
                        }`}
                    >
                      Prospecto Libre
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuoteClientType('registered')}
                      className={`py-3 rounded-2xl border font-black text-[9px] uppercase tracking-wider transition-all ${quoteClientType === 'registered'
                        ? 'border-nectar-gold bg-nectar-gold/10 text-nectar-gold'
                        : 'border-card-border text-foreground/50 hover:border-card-border/80 bg-background/50'
                        }`}
                    >
                      Usuario Registrado
                    </button>
                  </div>
                </div>

                {quoteClientType === 'registered' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Seleccionar Usuario</label>
                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold text-xs text-foreground"
                    >
                      <option value="">-- Elige un Usuario --</option>
                      {users.filter(u => u.role === 'BUSINESS' || u.role === 'CUSTOMER').map(u => (
                        <option key={u.id} value={u.id}>
                          {u.username} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Nombre / Razón Social</label>
                      <input
                        type="text"
                        required
                        className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold text-xs text-foreground"
                        placeholder="ej. Juan Pérez o Comercializadora S.A."
                        value={prospectName}
                        onChange={(e) => setProspectName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Email de Contacto</label>
                      <input
                        type="email"
                        required
                        className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold text-xs text-foreground"
                        placeholder="nombre@correo.com"
                        value={prospectEmail}
                        onChange={(e) => setProspectEmail(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Nombre del Proyecto</label>
                  <input
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold text-xs text-foreground"
                    placeholder="ej. Rediseño Web y Pasarela de Pagos"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Semanas Estimadas de Entrega</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold text-xs text-foreground"
                    value={deliveryWeeks}
                    onChange={(e) => setDeliveryWeeks(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Alcance General (Opcional)</label>
                  <textarea
                    rows={4}
                    className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold text-xs text-foreground"
                    placeholder="Escriba los lineamientos o requerimientos clave del proyecto..."
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Side: Modules selection */}
              <div className="space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Módulos de Funcionalidad</label>
                    <button
                      type="button"
                      onClick={handleAddCustomModule}
                      className="text-[9px] font-black text-nectar-gold hover:underline uppercase tracking-widest font-bold"
                    >
                      + Agregar Personalizado
                    </button>
                  </div>

                  {/* Predefined Templates */}
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                    {PREDEFINED_MODULES.map(m => {
                      const isChecked = selectedModules.some(sm => sm.key === m.key);
                      return (
                        <div key={m.key} className="p-4 bg-background/40 border border-card-border/80 rounded-2xl flex items-start gap-4 text-left">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={isChecked}
                            onChange={(e) => handleToggleModuleTemplate(m, e.target.checked)}
                          />
                          <div className="flex-1 space-y-1">
                            <h4 className="text-xs font-black">{m.name}</h4>
                            <p className="text-[8px] opacity-50 leading-relaxed">{m.description}</p>
                            <span className="text-[9px] font-black text-nectar-gold block mt-1">${m.price.toLocaleString('es-MX')} MXN</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Customized / Custom Modules Inputs */}
                  {selectedModules.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-card-border/40 text-left">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 block">Editar Costos y Descripciones:</label>
                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                        {selectedModules.map((sm, index) => (
                          <div key={sm.key} className="p-4 bg-background border border-card-border/60 rounded-xl space-y-3 relative text-left">
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedModule(sm.key)}
                              className="absolute top-2 right-3 text-red-500 hover:text-red-700 text-xs font-bold font-black"
                            >
                              remover
                            </button>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="text"
                                className="col-span-2 px-3 py-1.5 bg-background border border-card-border rounded-lg text-[9px] font-bold text-foreground"
                                placeholder="Nombre del Módulo"
                                value={sm.name}
                                onChange={(e) => handleEditSelectedModule(index, 'name', e.target.value)}
                              />
                              <input
                                type="number"
                                className="px-3 py-1.5 bg-background border border-card-border rounded-lg text-[9px] font-bold text-right text-foreground font-mono"
                                placeholder="Precio"
                                value={sm.price}
                                onChange={(e) => handleEditSelectedModule(index, 'price', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <textarea
                              rows={2}
                              className="w-full px-3 py-1.5 bg-background border border-card-border rounded-lg text-[8px] text-foreground"
                              placeholder="Descripción detallada de la entrega..."
                              value={sm.description}
                              onChange={(e) => handleEditSelectedModule(index, 'description', e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Total & Submit */}
                <div className="pt-6 border-t border-card-border/60 flex items-center justify-between text-left">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block">Precio Total Estimado</span>
                    <span className="text-2xl font-black text-nectar-gold font-mono">${selectedModules.reduce((sum, m) => sum + (parseFloat(m.price as any) || 0), 0).toLocaleString('es-MX')} MXN</span>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowQuoteModal(false)}
                      className="px-6 py-3 bg-card-border hover:bg-card-border/80 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingQuote || selectedModules.length === 0}
                      className="px-8 py-3 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shadow-lg shadow-nectar-gold/20 font-bold"
                    >
                      {isSubmittingQuote ? 'Generando...' : 'Guardar y Generar PDF'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Crear Código de Descuento/Referido */}
      {showPromoModal && (
        <div
          onClick={() => setShowPromoModal(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card-bg border border-card-border p-8 md:p-10 rounded-[3rem] shadow-2xl relative space-y-6 text-left cursor-default animate-in fade-in zoom-in-95 duration-200"
          >
                <button
                  onClick={() => setShowPromoModal(false)}
                  className="absolute top-6 right-6 w-8 h-8 rounded-full border border-card-border text-foreground/40 hover:text-foreground flex items-center justify-center text-xl font-bold"
                >
                  ×
                </button>

                <div>
                  <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                    Administración
                  </span>
                  <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none">
                    {editingPromoId !== null ? 'Editar Código Promocional' : 'Nuevo Código Promocional'}
                  </h2>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                    {editingPromoId !== null ? 'Modifica los valores del código seleccionado' : 'Crea códigos de referidos o de descuento general'}
                  </p>
                </div>

                {promoError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-xl text-center uppercase tracking-wider">
                    {promoError}
                  </div>
                )}

                <form onSubmit={handleCreatePromoCode} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Código promocional</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: AMIGO10, NECTAR20"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono uppercase tracking-widest"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Tipo de Código</label>
                      <select
                        value={promoCodeType}
                        onChange={(e) => setPromoCodeType(e.target.value as any)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground"
                      >
                        <option value="CLIENT">👥 Cliente / Descuento General</option>
                        <option value="SELLER">🏷️ Vendedor / Referido</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Descuento (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        required
                        value={promoDiscount}
                        onChange={(e) => setPromoDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Usuario Referidor (Opcional)</label>
                    <select
                      value={promoReferrer}
                      onChange={(e) => setPromoReferrer(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground"
                    >
                      <option value="">Ninguno (Descuento General)</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.username} ({u.role} - {u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Límite de Usos (Opcional)</label>
                      <input
                        type="number"
                        placeholder="Sin límite"
                        value={promoMaxUses}
                        onChange={(e) => setPromoMaxUses(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Vence El (Opcional)</label>
                      <input
                        type="date"
                        value={promoValidUntil}
                        onChange={(e) => setPromoValidUntil(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-card-border/65 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPromoModal(false)}
                      className="px-5 py-3 border border-card-border hover:bg-foreground hover:text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingPromo}
                      className="px-6 py-3 bg-nectar-gold text-background text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg shadow-nectar-gold/25"
                    >
                      {isSubmittingPromo 
                        ? (editingPromoId !== null ? 'Guardando...' : 'Creando...') 
                        : (editingPromoId !== null ? 'Guardar Cambios' : 'Crear Código')}
                    </button>
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
    </div>
  );
}
