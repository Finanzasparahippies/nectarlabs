import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetcher, API_URL } from '@/lib/api';
import Toast from '../ui/Toast';
import ConfirmModal from '../ui/ConfirmModal';
import SATAutocomplete from '../ui/SATAutocomplete';

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
  id: number | string;
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

  // Premium Tab State
  const [activeTab, setActiveTab] = useState<'financials' | 'kanban' | 'quotes' | 'sales' | 'invoices' | 'marketing' | 'addons'>('financials');

  // Invoices & Marketing Campaigns states
  const [systemInvoices, setSystemInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');

  // Add-on subscriptions states
  const [addonSubscriptions, setAddonSubscriptions] = useState<any[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [addonSearch, setAddonSearch] = useState<string>('');
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [selectedTenantIdForSub, setSelectedTenantIdForSub] = useState<string>('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Marketing Campaigns states
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignContent, setCampaignContent] = useState('');
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>('');

  // Advanced Marketing customizations state
  const [templateType, setTemplateType] = useState('minimalist');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgOpacity, setBgOpacity] = useState('1.0');
  const [bgSaturation, setBgSaturation] = useState('100');
  const [bgPosition, setBgPosition] = useState('center');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [fontFamily, setFontFamily] = useState('serif');
  const [titleFontFamily, setTitleFontFamily] = useState('serif');
  const [footerFontFamily, setFooterFontFamily] = useState('serif');
  const [emailTitle, setEmailTitle] = useState('');
  const [footerText, setFooterText] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Manual Invoices Custom Modal states
  const [showManualInvoiceModal, setShowManualInvoiceModal] = useState(false);

  // New User / Client Modal states
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('CUSTOMER');
  const [newUserTenantId, setNewUserTenantId] = useState('');
  const [newUserEmailVerified, setNewUserEmailVerified] = useState(true);
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);

  // ConfirmModal dynamic state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Cancel Invoice Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelInvoiceId, setCancelInvoiceId] = useState<number | null>(null);
  const [cancelMotive, setCancelMotive] = useState('02');
  const [cancelSubstitution, setCancelSubstitution] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [manualRfc, setManualRfc] = useState('');
  const [manualRazonSocial, setManualRazonSocial] = useState('');
  const [manualRegimenFiscal, setManualRegimenFiscal] = useState('601');
  const [manualCodigoPostal, setManualCodigoPostal] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualItems, setManualItems] = useState<Array<{ quantity: number; unit_price: number; description: string; product_key: string; unit_key: string; unit_name: string }>>([
    { quantity: 1, unit_price: 0, description: '', product_key: '43231500', unit_key: 'E48', unit_name: 'Unidad de servicio' }
  ]);
  const [isSubmittingManualInvoice, setIsSubmittingManualInvoice] = useState(false);

  // Kanban states
  const [leads, setLeads] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [salespersonFilter, setSalespersonFilter] = useState<string>('all');
  const [kanbanSearch, setKanbanSearch] = useState<string>('');
  const [debouncedKanbanSearch, setDebouncedKanbanSearch] = useState<string>('');

  // Debounce search term in Kanban
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKanbanSearch(kanbanSearch);
    }, 250);
    return () => clearTimeout(handler);
  }, [kanbanSearch]);

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
        const [commissionsData, summaryData, promoData, usersData, quotesData, leadsData, contractsData, postsData, tenantsData, addonsData] = await Promise.all([
          fetcher('/sales-commissions/').catch(() => []),
          fetcher('/sales-commissions/summary/').catch(() => null),
          fetcher('/promo-codes/').catch(() => []),
          fetcher('/users/').catch(() => []),
          fetcher('/quotes/').catch(() => []),
          fetcher('/leads/').catch(() => []),
          fetcher('/contracts/').catch(() => []),
          fetcher('/posts/', { isPublic: true }).catch(() => []),
          fetcher('/tenants/').catch(() => []),
          fetcher('/addon-subscriptions/').catch(() => []),
        ]);
        setCommissions(Array.isArray(commissionsData) ? commissionsData : []);
        setCommissionSummary(summaryData);
        setPromoCodes(Array.isArray(promoData) ? promoData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setQuotes(Array.isArray(quotesData) ? quotesData : []);
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setContracts(Array.isArray(contractsData) ? contractsData : []);
        setBlogPosts(postsData.results || postsData || []);
        setAllTenants(tenantsData || []);
        setAddonSubscriptions(Array.isArray(addonsData) ? addonsData : []);
      } catch (err) {
        console.error('Error loading sales data:', err);
      } finally {
        setSalesLoading(false);
        setQuotesLoading(false);
        setLeadsLoading(false);
      }
    };
    loadSalesData();
  }, []);

  const handleAssignTenant = async (subscriptionId: number, tenantId: string) => {
    setIsSubmittingAssign(true);
    try {
      const token = localStorage.getItem('token');
      const payloadTenant = tenantId && tenantId !== 'none' ? tenantId : null;

      const response = await fetch(`${API_URL}/addon-subscriptions/${subscriptionId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tenant: payloadTenant })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || 'Error al asignar el inquilino');
      }

      const updated = await response.json();
      setAddonSubscriptions(prev => prev.map(sub => sub.id === subscriptionId ? updated : sub));
      showToast('Inquilino asignado con éxito a la suscripción.', 'success');
      setEditingSubId(null);
    } catch (err: any) {
      showToast(err.message || 'Error al asignar el inquilino.', 'error');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'invoices') {
      const loadSystemInvoices = async () => {
        setLoadingInvoices(true);
        try {
          const res = await fetcher('/billing/invoices/');
          setSystemInvoices(res.results || res || []);
        } catch (err) {
          console.error('Error loading system invoices:', err);
          showToast('Error al cargar las facturas del sistema.', 'error');
        } finally {
          setLoadingInvoices(false);
        }
      };
      loadSystemInvoices();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'addons') {
      const loadAddonSubscriptions = async () => {
        setLoadingAddons(true);
        try {
          const res = await fetcher('/addon-subscriptions/');
          setAddonSubscriptions(Array.isArray(res) ? res : []);
        } catch (err) {
          console.error('Error loading addon subscriptions:', err);
          showToast('Error al cargar las suscripciones de Add-ons.', 'error');
        } finally {
          setLoadingAddons(false);
        }
      };
      loadAddonSubscriptions();
    }
  }, [activeTab]);

  const handleCancelInvoice = async (invoiceId: number, motive: string = '02', substitution: string = '') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/billing/invoices/${invoiceId}/cancel/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ motive, substitution })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || err.error || 'Error al solicitar la cancelación.');
      }
      const updated = await response.json();
      setSystemInvoices(prev => prev.map(inv => inv.id === invoiceId ? updated : inv));
      showToast('Cancelación solicitada con éxito ante el SAT.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al cancelar la factura.', 'error');
    }
  };

  const handleRetryInvoice = async (invoiceId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/billing/invoices/${invoiceId}/retry/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || err.error || 'Error al reintentar el timbrado.');
      }
      const updated = await response.json();
      setSystemInvoices(prev => prev.map(inv => inv.id === invoiceId ? updated : inv));
      showToast('Factura reintentada y timbrada con éxito.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al reintentar el timbrado.', 'error');
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) {
      showToast('El email es obligatorio.', 'warning');
      return;
    }
    setIsSubmittingNewUser(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        email: newUserEmail.trim(),
        role: newUserRole,
        is_email_verified: newUserEmailVerified
      };
      if (newUsername.trim()) payload.username = newUsername.trim();
      if (newUserPassword.trim()) payload.password = newUserPassword.trim();
      if (newUserTenantId) payload.tenant = parseInt(newUserTenantId);

      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        const firstErr = Object.values(data)[0];
        const errorMsg = Array.isArray(firstErr) ? firstErr[0] : (data.detail || data.error || 'Error al crear el usuario.');
        throw new Error(errorMsg);
      }

      showToast(`Usuario/Cliente ${data.email} creado con éxito.`, 'success');
      setShowNewUserModal(false);
      setNewUserEmail('');
      setNewUsername('');
      setNewUserPassword('');
      setNewUserRole('CUSTOMER');
      setNewUserTenantId('');
      setNewUserEmailVerified(true);

      const usersData = await fetcher('/users/');
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err: any) {
      showToast(err.message || 'Error al crear el usuario.', 'error');
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignSubject.trim() || !campaignContent.trim()) {
      showToast('El Asunto y el Contenido de la campaña son obligatorios.', 'warning');
      return;
    }

    setIsSendingCampaign(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/newsletter/send-campaign/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: campaignSubject.trim(),
          title: campaignTitle.trim() || campaignSubject.trim(),
          content: campaignContent.trim(),
          template_type: templateType,
          bg_image_url: bgImageUrl.trim() || null,
          bg_opacity: parseFloat(bgOpacity),
          bg_saturation: parseInt(bgSaturation),
          bg_position: bgPosition,
          cta_text: ctaText.trim() || null,
          cta_link: ctaLink.trim() || null,
          font_family: fontFamily,
          title_font_family: titleFontFamily,
          footer_font_family: footerFontFamily,
          email_title: emailTitle.trim() || null,
          footer_text: footerText.trim() || null,
          image_url: imageUrl.trim() || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la campaña.');
      }

      showToast(data.message || `Campaña enviada con éxito a ${data.sent_count} suscriptores.`, 'success');
      setCampaignSubject('');
      setCampaignTitle('');
      setCampaignContent('');
      setTemplateType('minimalist');
      setBgImageUrl('');
      setBgOpacity('1.0');
      setBgSaturation('100');
      setBgPosition('center');
      setCtaText('');
      setCtaLink('');
      setFontFamily('serif');
      setTitleFontFamily('serif');
      setFooterFontFamily('serif');
      setEmailTitle('');
      setFooterText('');
      setImageUrl('');
    } catch (err: any) {
      showToast(err.message || 'Error al enviar la campaña.', 'error');
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const [stampingInvoice, setStampingInvoice] = useState<number | null>(null);

  const handleStampInvoice = async (installmentId: number) => {
    setStampingInvoice(installmentId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/billing/invoices/issue-from-installment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ installment_id: installmentId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Error al timbrar la factura.');
      }

      const updatedUUID = data.uuid_sat || "LCO_PENDING";
      setInstallments(prev => prev.map(inst => inst.id === installmentId ? { ...inst, cfdi_uuid: updatedUUID } : inst));
      showToast('Factura timbrada con éxito.', 'success');

      if (activeTab === 'invoices') {
        const res = await fetcher('/billing/invoices/');
        setSystemInvoices(res.results || res || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Error al timbrar la factura.', 'error');
    } finally {
      setStampingInvoice(null);
    }
  };

  const handleTenantChange = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    if (!tenantId) return;
    try {
      const info = await fetcher(`/billing/info/?tenant_id=${tenantId}`);
      if (info.tax_profile) {
        setManualRfc(info.tax_profile.rfc || '');
        setManualRazonSocial(info.tax_profile.razon_social || '');
        setManualRegimenFiscal(info.tax_profile.regimen_fiscal || '601');
        setManualCodigoPostal(info.tax_profile.codigo_postal || '');
      }
      const tenant = allTenants.find(t => t.id === tenantId);
      if (tenant && tenant.owner_email) {
        setManualEmail(tenant.owner_email);
      }
    } catch (err) {
      console.error('Error prefilling tax profile:', err);
    }
  };

  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      showToast('Selecciona un inquilino.', 'warning');
      return;
    }

    for (const item of manualItems) {
      if (!item.description.trim() || item.unit_price <= 0 || item.quantity <= 0) {
        showToast('Todos los conceptos deben tener descripción, cantidad y precio válido.', 'warning');
        return;
      }
      if (!item.product_key) {
        showToast('Debes seleccionar una clave de producto SAT para cada concepto.', 'warning');
        return;
      }
      if (!item.unit_key) {
        showToast('Debes seleccionar una clave de unidad SAT para cada concepto.', 'warning');
        return;
      }
    }

    const subtotal = manualItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const total = parseFloat((subtotal * 1.16).toFixed(2));

    setIsSubmittingManualInvoice(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/billing/invoices/issue-parent-to-tenant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          customer_info: {
            rfc: manualRfc.trim().toUpperCase(),
            razon_social: manualRazonSocial.trim(),
            regimen_fiscal: manualRegimenFiscal,
            codigo_postal: manualCodigoPostal.trim(),
            email: manualEmail.trim()
          },
          items: manualItems.map(it => ({
            quantity: it.quantity,
            unit_price: it.unit_price,
            description: it.description,
            product_key: it.product_key,
            unit_key: it.unit_key,
            unit_name: it.unit_name
          })),
          total: total
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Error al emitir la factura manual.');
      }

      showToast('Factura manual emitida y timbrada con éxito.', 'success');
      setShowManualInvoiceModal(false);

      setSelectedTenantId('');
      setManualRfc('');
      setManualRazonSocial('');
      setManualRegimenFiscal('601');
      setManualCodigoPostal('');
      setManualEmail('');
      setManualItems([{
        quantity: 1,
        unit_price: 0,
        description: '',
        product_key: '43231500',
        unit_key: 'E48',
        unit_name: 'Unidad de servicio'
      }]);

      if (activeTab === 'invoices') {
        const res = await fetcher('/billing/invoices/');
        setSystemInvoices(res.results || res || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Error al crear la factura manual.', 'error');
    } finally {
      setIsSubmittingManualInvoice(false);
    }
  };

  const STATUS_ORDER: string[] = ['PROSPECT', 'CONTACTED', 'PROPOSAL', 'WON', 'LOST'];

  const getContractSalesperson = (contract: any) => {
    // 1. Via project_quote (which has salesperson)
    if (contract.project_quote && (contract.project_quote.salesperson || contract.project_quote.salesperson_id)) {
      return contract.project_quote.salesperson || contract.project_quote.salesperson_id;
    }

    // 2. Via promo_code (which has referrer if it's a SELLER code)
    if (contract.promo_code && contract.promo_code.referrer) {
      const referrerId = contract.promo_code.referrer.id || contract.promo_code.referrer;
      const isSalesperson = users.some(u => u.id === referrerId && u.role === 'SALES');
      if (isSalesperson) return referrerId;
    }

    // 3. Via Lead with the same email
    const clientEmail = contract.user?.email || contract.client_email || contract.prospect_email;
    if (clientEmail) {
      const matchedLead = leads.find(l => l.email && l.email.toLowerCase() === clientEmail.toLowerCase());
      if (matchedLead && matchedLead.salesperson) {
        return matchedLead.salesperson;
      }
    }

    // 4. Via user.referrer
    if (contract.user && contract.user.referrer) {
      const referrerId = contract.user.referrer.id || contract.user.referrer;
      const isSalesperson = users.some(u => u.id === referrerId && u.role === 'SALES');
      if (isSalesperson) return referrerId;
    }

    return null;
  };

  const handleMoveLeadStatus = async (leadId: number, targetStatus: string) => {
    const originalLeads = [...leads];

    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/leads/${leadId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado en el servidor.');
      }

      const updated = await response.json();
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      showToast(`Prospecto movido con éxito.`, 'success');
    } catch (err: any) {
      // Rollback
      setLeads(originalLeads);
      showToast(err.message || 'Error al actualizar estado en el servidor. Revirtiendo...', 'error');
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

  // Helper for empty column render
  const EmptyColumn = () => (
    <div className="h-40 flex items-center justify-center text-center text-[9px] font-black uppercase tracking-widest opacity-25 border border-dashed border-card-border/40 rounded-2xl">
      Vacío
    </div>
  );

  // Helper to render Lead Card in Kanban
  const KanbanLeadCard = ({ lead }: { lead: any }) => {
    const spUser = users.find(u => u.id === lead.salesperson || u.id === lead.salesperson_id || (lead.salesperson && Number(u.id) === Number(lead.salesperson)));
    const createdDate = lead.created_at
      ? new Date(lead.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      : '—';

    // Determine movement options
    const statusIdx = STATUS_ORDER.indexOf(lead.status);
    const canMoveLeft = statusIdx > 0;
    const canMoveRight = statusIdx < 4 && lead.status !== 'PROPOSAL'; // For Proposal, we show Won / Lost explicitly

    return (
      <div className="bg-card-bg/60 border border-card-border p-5 rounded-2xl hover:border-nectar-gold/40 transition-all duration-300 flex flex-col gap-3 relative group shadow-sm hover:shadow-md text-left">
        <div className="flex justify-between items-start gap-2 w-full min-w-0">
          <span className="font-black text-xs text-foreground uppercase tracking-wide truncate max-w-[170px]">{lead.name}</span>
          <span className="text-[8px] font-bold text-foreground/40 font-mono shrink-0">{createdDate}</span>
        </div>

        {lead.email && (
          <p className="text-[8.5px] text-foreground/50 font-mono truncate" title={lead.email}>{lead.email}</p>
        )}

        {lead.project_idea && (
          <p className="text-[9.5px] text-foreground/60 line-clamp-2 leading-relaxed bg-background/30 p-2 rounded-lg border border-card-border/30 font-medium">
            {lead.project_idea}
          </p>
        )}

        <div className="flex justify-between items-center pt-1 gap-2">
          <div className="min-w-0">
            <span className="text-[7.5px] font-black uppercase tracking-wider text-foreground/35 block">Valor Est.</span>
            <span className="text-xs font-black text-nectar-gold font-mono">
              ${parseFloat(lead.estimated_value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[7.5px] font-black uppercase tracking-wider text-foreground/35 block">Vendedor</span>
            <span className="px-2 py-0.5 bg-foreground/5 rounded text-[8px] font-black text-foreground/60 border border-card-border/50 truncate max-w-[100px] inline-block">
              {spUser ? spUser.username : 'Sin Asignar'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-end gap-1.5 pt-2 border-t border-card-border/35 mt-1">
          {canMoveLeft && (
            <button
              onClick={() => handleMoveLeadStatus(lead.id, STATUS_ORDER[statusIdx - 1])}
              className="p-1.5 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-lg border border-card-border text-[9px] font-bold transition-all hover:scale-105 active:scale-95"
              title={`Mover a ${STATUS_ORDER[statusIdx - 1]}`}
            >
              ←
            </button>
          )}

          {lead.status === 'PROPOSAL' ? (
            <>
              <button
                onClick={() => handleMoveLeadStatus(lead.id, 'LOST')}
                className="px-2.5 py-1 bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 text-red-400 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                title="Marcar como Perdido"
              >
                Perder ✗
              </button>
              <button
                onClick={() => handleMoveLeadStatus(lead.id, 'WON')}
                className="px-2.5 py-1 bg-green-950/40 border border-green-500/30 hover:bg-green-900/40 text-green-400 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 font-bold"
                title="Marcar como Ganado"
              >
                Ganar ✓
              </button>
            </>
          ) : (
            canMoveRight && (
              <button
                onClick={() => handleMoveLeadStatus(lead.id, STATUS_ORDER[statusIdx + 1])}
                className="p-1.5 bg-nectar-gold/10 hover:bg-nectar-gold hover:text-background text-nectar-gold rounded-lg border border-nectar-gold/20 text-[9px] font-black transition-all hover:scale-105 active:scale-95"
                title={`Mover a ${STATUS_ORDER[statusIdx + 1]}`}
              >
                →
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  // Helper to render Contract Card in Kanban
  const KanbanContractCard = ({ contract }: { contract: any }) => {
    const salespersonId = getContractSalesperson(contract);
    const spUser = salespersonId ? users.find(u => u.id === salespersonId || (salespersonId && Number(u.id) === Number(salespersonId))) : null;
    const clientEmail = contract.user?.email || contract.client_email || contract.prospect_email || 'Sin email';
    const signedDate = contract.signed_at
      ? new Date(contract.signed_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      : '—';

    const contractValue = contract.project_quote?.total_price
      ? parseFloat(contract.project_quote.total_price)
      : contract.plan?.price
        ? parseFloat(contract.plan.price)
        : 0;

    return (
      <div className="bg-nectar-gold/5 border border-nectar-gold/25 p-5 rounded-2xl relative shadow-md transition-all duration-300 hover:border-nectar-gold/50 flex flex-col gap-3 text-left">
        <div className="flex justify-between items-start gap-2 w-full min-w-0">
          <span className="font-black text-xs text-foreground uppercase tracking-wide truncate max-w-[180px]">{contract.full_name}</span>
          <span className="text-[8px] font-bold text-nectar-gold/60 font-mono shrink-0">{signedDate}</span>
        </div>

        <p className="text-[8.5px] text-foreground/50 font-mono truncate" title={clientEmail}>{clientEmail}</p>

        {contract.plan && (
          <div className="px-2.5 py-1 bg-nectar-gold/10 rounded-lg border border-nectar-gold/15 text-[8.5px] font-black uppercase text-nectar-gold tracking-wider w-fit">
            Plan: {contract.plan.name}
          </div>
        )}

        <p className="text-[9.5px] text-foreground/60 line-clamp-2 leading-relaxed bg-background/30 p-2 rounded-lg border border-card-border/30 font-medium">
          {contract.project_idea || contract.project_quote?.project_name || 'Desarrollo de Software'}
        </p>

        <div className="flex justify-between items-center pt-1 gap-2">
          <div className="min-w-0">
            <span className="text-[7.5px] font-black uppercase tracking-wider text-foreground/35 block">Valor Contrato</span>
            <span className="text-xs font-black text-nectar-gold font-mono">
              {contractValue > 0 ? `$${contractValue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}` : 'Variable'}
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[7.5px] font-black uppercase tracking-wider text-foreground/35 block">Vendedor</span>
            <span className="px-2 py-0.5 bg-nectar-gold/10 rounded text-[8px] font-black text-nectar-gold/80 border border-nectar-gold/20 truncate max-w-[100px] inline-block">
              {spUser ? spUser.username : 'Sin Asignar'}
            </span>
          </div>
        </div>

        {contract.pdf_file && (
          <a
            href={getInlineViewUrl(contract.pdf_file, 'contract', contract.id)}
            target="_blank"
            rel="noreferrer"
            className="w-full text-center py-2 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all font-bold mt-1 shadow-sm hover:scale-[1.02]"
          >
            Ver Contrato Firmado
          </a>
        )}
      </div>
    );
  };

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

  const filteredLeads = leads.filter(l => {
    // Salesperson filter
    if (salespersonFilter !== 'all') {
      if (salespersonFilter === 'none') {
        if (l.salesperson) return false;
      } else {
        if (Number(l.salesperson) !== Number(salespersonFilter)) return false;
      }
    }
    // Text search
    if (debouncedKanbanSearch) {
      const query = debouncedKanbanSearch.toLowerCase();
      return (
        l.name.toLowerCase().includes(query) ||
        (l.email && l.email.toLowerCase().includes(query)) ||
        (l.project_idea && l.project_idea.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const filteredContracts = contracts.filter(c => {
    // Salesperson filter
    if (salespersonFilter !== 'all') {
      const spId = getContractSalesperson(c);
      if (salespersonFilter === 'none') {
        if (spId) return false;
      } else {
        if (Number(spId) !== Number(salespersonFilter)) return false;
      }
    }
    // Text search
    if (debouncedKanbanSearch) {
      const query = debouncedKanbanSearch.toLowerCase();
      const clientEmail = c.user?.email || c.client_email || c.prospect_email;
      return (
        (c.full_name && c.full_name.toLowerCase().includes(query)) ||
        (c.project_idea && c.project_idea.toLowerCase().includes(query)) ||
        (clientEmail && clientEmail.toLowerCase().includes(query)) ||
        (c.project_quote?.project_name && c.project_quote.project_name.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className="space-y-16">
      {/* Pestañas Premium */}
      <div className="flex border-b border-card-border pb-px mb-12 gap-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeTab === 'financials' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
            }`}
        >
          Resumen Financiero
          {activeTab === 'financials' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
        </button>
        <button
          onClick={() => setActiveTab('kanban')}
          className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeTab === 'kanban' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
            }`}
        >
          Kanban de Ventas
          {activeTab === 'kanban' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
        </button>
        <button
          onClick={() => setActiveTab('quotes')}
          className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeTab === 'quotes' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
            }`}
        >
          Cotizaciones Modulares
          {activeTab === 'quotes' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeTab === 'sales' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
            }`}
        >
          Comisiones y Vendedores
          {activeTab === 'sales' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeTab === 'invoices' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
            }`}
        >
          Facturas del Sistema
          {activeTab === 'invoices' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
        </button>
        <button
          onClick={() => setActiveTab('marketing')}
          className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeTab === 'marketing' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
            }`}
        >
          Campañas de Marketing
          {activeTab === 'marketing' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
        </button>
        <button
          onClick={() => setActiveTab('addons')}
          className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeTab === 'addons' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
            } flex items-center`}
        >
          Suscripciones Add-ons
          {addonSubscriptions.filter(s => !s.tenant && ['active', 'trialing'].includes(s.status)).length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-[8px] font-black bg-red-600 text-white rounded-full animate-pulse flex items-center justify-center min-w-[14px] h-[14px]">
              {addonSubscriptions.filter(s => !s.tenant && ['active', 'trialing'].includes(s.status)).length}
            </span>
          )}
          {activeTab === 'addons' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
        </button>
      </div>

      {activeTab === 'financials' && (
        <>
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
                        <p className="text-[7px] font-bold text-foreground/40 uppercase tracking-wider mt-1">Mensualidad {inst.installment_number} de 6</p>
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
                            {inst.status === 'PAID' && (
                              <button
                                onClick={() => handleStampInvoice(inst.id)}
                                disabled={stampingInvoice === inst.id}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[7px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 font-bold shrink-0"
                              >
                                {stampingInvoice === inst.id ? 'Timbrando...' : 'Timbrar Factura (PAC)'}
                              </button>
                            )}
                            <input
                              type="text"
                              placeholder="UUID CFDI 4.0"
                              value={cfdiInputs[inst.id] || ""}
                              onChange={(e) => setCfdiInputs(prev => ({ ...prev, [inst.id]: e.target.value }))}
                              className="bg-background border border-card-border rounded-lg px-3 py-1.5 text-[8px] font-mono focus:outline-none focus:border-nectar-gold w-32 text-foreground"
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
        </>
      )}

      {/* ── SALES KANBAN BOARD ── */}
      {activeTab === 'kanban' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header & Filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card-bg border border-card-border p-6 rounded-[2rem] shadow-lg">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-1">Pipeline de Ventas</h2>
              <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-wider">Monitoreo y administración de prospectos y contratos en tiempo real</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              {/* Salesperson Filter */}
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-[7.5px] font-black uppercase tracking-widest opacity-40 ml-2">Filtrar por Vendedor</label>
                <select
                  value={salespersonFilter}
                  onChange={(e) => setSalespersonFilter(e.target.value)}
                  className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-bold appearance-none cursor-pointer"
                >
                  <option value="all">👥 Todos los Vendedores</option>
                  <option value="none">👤 Sin Vendedor Asignado</option>
                  {salesPeople.map((sp: any) => (
                    <option key={sp.id} value={sp.id}>
                      🏷️ {sp.username} ({sp.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col gap-1 min-w-[220px]">
                <label className="text-[7.5px] font-black uppercase tracking-widest opacity-40 ml-2">Buscar Cliente / Idea</label>
                <div className="relative">
                  <input
                    type="text"
                    value={kanbanSearch}
                    onChange={(e) => setKanbanSearch(e.target.value)}
                    placeholder="Buscar nombre, email..."
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold pl-9"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
                  {kanbanSearch && (
                    <button
                      onClick={() => setKanbanSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Kanban Board Columns Grid */}
          <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar snap-x">
            {/* Column 1: Prospectos */}
            <div className="flex-1 min-w-[290px] max-w-[340px] bg-card-bg/25 border border-card-border/40 p-5 rounded-[2.5rem] flex flex-col gap-4 snap-start">
              <div className="flex justify-between items-center pb-2 border-b border-card-border/20">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-1.5">
                  🔍 Prospectos
                </span>
                <span className="px-2 py-0.5 bg-foreground/5 rounded-full text-[8.5px] font-bold opacity-50 font-mono">
                  {filteredLeads.filter((l: any) => l.status === 'PROSPECT').length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-4 pr-1 custom-scrollbar">
                {filteredLeads.filter((l: any) => l.status === 'PROSPECT').map((lead: any) => (
                  <KanbanLeadCard key={lead.id} lead={lead} />
                ))}
                {filteredLeads.filter((l: any) => l.status === 'PROSPECT').length === 0 && <EmptyColumn />}
              </div>
            </div>

            {/* Column 2: Contactados */}
            <div className="flex-1 min-w-[290px] max-w-[340px] bg-card-bg/25 border border-card-border/40 p-5 rounded-[2.5rem] flex flex-col gap-4 snap-start">
              <div className="flex justify-between items-center pb-2 border-b border-card-border/20">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-1.5 text-blue-400">
                  📞 Contactados
                </span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[8.5px] font-bold font-mono">
                  {filteredLeads.filter((l: any) => l.status === 'CONTACTED').length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-4 pr-1 custom-scrollbar">
                {filteredLeads.filter((l: any) => l.status === 'CONTACTED').map((lead: any) => (
                  <KanbanLeadCard key={lead.id} lead={lead} />
                ))}
                {filteredLeads.filter((l: any) => l.status === 'CONTACTED').length === 0 && <EmptyColumn />}
              </div>
            </div>

            {/* Column 3: Propuesta */}
            <div className="flex-1 min-w-[290px] max-w-[340px] bg-card-bg/25 border border-card-border/40 p-5 rounded-[2.5rem] flex flex-col gap-4 snap-start">
              <div className="flex justify-between items-center pb-2 border-b border-card-border/20">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-1.5 text-amber-400">
                  📋 Propuesta
                </span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[8.5px] font-bold font-mono">
                  {filteredLeads.filter((l: any) => l.status === 'PROPOSAL').length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-4 pr-1 custom-scrollbar">
                {filteredLeads.filter((l: any) => l.status === 'PROPOSAL').map((lead: any) => (
                  <KanbanLeadCard key={lead.id} lead={lead} />
                ))}
                {filteredLeads.filter((l: any) => l.status === 'PROPOSAL').length === 0 && <EmptyColumn />}
              </div>
            </div>

            {/* Column 4: Perdidos */}
            <div className="flex-1 min-w-[290px] max-w-[340px] bg-card-bg/25 border border-card-border/40 p-5 rounded-[2.5rem] flex flex-col gap-4 snap-start">
              <div className="flex justify-between items-center pb-2 border-b border-card-border/20">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-1.5 text-red-400">
                  ❌ Perdidos
                </span>
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full text-[8.5px] font-bold font-mono">
                  {filteredLeads.filter((l: any) => l.status === 'LOST').length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-4 pr-1 custom-scrollbar">
                {filteredLeads.filter((l: any) => l.status === 'LOST').map((lead: any) => (
                  <KanbanLeadCard key={lead.id} lead={lead} />
                ))}
                {filteredLeads.filter((l: any) => l.status === 'LOST').length === 0 && <EmptyColumn />}
              </div>
            </div>

            {/* Column 5: Ganados */}
            <div className="flex-1 min-w-[290px] max-w-[340px] bg-card-bg/25 border border-card-border/40 p-5 rounded-[2.5rem] flex flex-col gap-4 snap-start">
              <div className="flex justify-between items-center pb-2 border-b border-card-border/20">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-1.5 text-green-400">
                  ✅ Ganados
                </span>
                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full text-[8.5px] font-bold font-mono">
                  {filteredLeads.filter((l: any) => l.status === 'WON').length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-4 pr-1 custom-scrollbar">
                {filteredLeads.filter((l: any) => l.status === 'WON').map((lead: any) => (
                  <KanbanLeadCard key={lead.id} lead={lead} />
                ))}
                {filteredLeads.filter((l: any) => l.status === 'WON').length === 0 && <EmptyColumn />}
              </div>
            </div>

            {/* Column 6: Contratos Activos */}
            <div className="flex-1 min-w-[310px] max-w-[360px] bg-nectar-gold/5 border border-nectar-gold/20 p-5 rounded-[2.5rem] flex flex-col gap-4 shadow-[0_0_20px_rgba(198,138,30,0.02)] snap-start">
              <div className="flex justify-between items-center pb-2 border-b border-nectar-gold/20">
                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-nectar-gold animate-pulse">
                  📄 Contratos Activos
                </span>
                <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold rounded-full text-[8.5px] font-bold font-mono border border-nectar-gold/15">
                  {filteredContracts.filter((c: any) => c.is_fully_signed && c.is_active).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-4 pr-1 custom-scrollbar">
                {filteredContracts.filter((c: any) => c.is_fully_signed && c.is_active).map((contract: any) => (
                  <KanbanContractCard key={contract.id} contract={contract} />
                ))}
                {filteredContracts.filter((c: any) => c.is_fully_signed && c.is_active).length === 0 && (
                  <div className="h-full flex items-center justify-center py-20 text-center text-[9px] font-black uppercase tracking-widest opacity-20 border border-dashed border-nectar-gold/25 rounded-2xl">
                    Sin contratos activos
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODULAR QUOTES TAB ── */}
      {activeTab === 'quotes' && (
        <section id="cotizaciones-section" className="space-y-10 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-1">Cotizaciones Modulares</h2>
              <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-wider">Historial de cotizaciones modularizadas emitidas en el sistema</p>
            </div>
            <button
              onClick={() => {
                setProspectName('');
                setProspectEmail('');
                setProjectName('');
                setProjectDesc('');
                setDeliveryWeeks(4);
                setSelectedModules([]);
                setQuoteError('');
                setSelectedClientId('');
                setQuoteClientType('prospect');
                setShowQuoteModal(true);
              }}
              className="px-5 py-2.5 bg-nectar-gold text-background text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md font-bold"
            >
              + Nueva Cotización
            </button>
          </div>

          <div className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl">
            {quotesLoading ? (
              <div className="py-10 flex justify-center">
                <div className="w-8 h-8 border-2 border-nectar-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                      <th className="pb-4">Cliente / Razón Social</th>
                      <th className="pb-4">Proyecto</th>
                      <th className="pb-4">Vendedor</th>
                      <th className="pb-4 text-right">Monto Estimado</th>
                      <th className="pb-4 text-center">Entrega</th>
                      <th className="pb-4 text-center">Estatus</th>
                      <th className="pb-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote: any) => {
                      const spUser = users.find(u => u.id === quote.salesperson || u.id === quote.salesperson_id);
                      return (
                        <tr key={quote.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                          <td className="py-4 pr-4">
                            <h4 className="font-black text-sm">{quote.client_name}</h4>
                            <p className="text-[7.5px] font-bold text-foreground/45 uppercase tracking-wider mt-0.5">{quote.client_email}</p>
                          </td>
                          <td className="py-4 font-bold text-xs">
                            {quote.project_name}
                          </td>
                          <td className="py-4 text-[10px] font-bold text-foreground/60">
                            {spUser ? spUser.username : 'Sin Asignar'}
                          </td>
                          <td className="py-4 text-right font-mono font-bold text-xs text-nectar-gold">
                            ${parseFloat(quote.total_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Eliminar Cotización',
                                    message: `¿Estás seguro de que deseas eliminar la cotización para ${quote.client_name}? Esta acción no se puede deshacer.`,
                                    onConfirm: () => {
                                      handleDeleteQuote(quote.id);
                                      setConfirmModal(null);
                                    }
                                  });
                                }}
                                className="px-2 py-1 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white text-xs rounded transition-all"
                              >
                                ✖
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {quotes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                          Sin cotizaciones modularizadas registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── ADMIN SALES COMMAND CENTER ── */}
      {activeTab === 'sales' && (
        <section id="ventas-section" className="space-y-10 animate-fadeIn">
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
            <div className="mb-8 flex items-center justify-between flex-wrap gap-4 text-left">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Gestión de Vendedores</h3>
                <p className="text-[9px] font-bold text-foreground/30 mt-1 uppercase tracking-wider">Aprobación y métricas de desempeño de vendedores</p>
              </div>
              <span className="px-4 py-1.5 bg-foreground/5 rounded-full text-[8px] font-black uppercase tracking-widest opacity-50 font-bold">
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
              <span className="px-4 py-1.5 bg-foreground/5 rounded-full text-[8px] font-black uppercase tracking-widest opacity-50 font-bold">
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
                        <td className="py-3.5 text-right font-mono font-black text-sm text-foreground">
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
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Eliminar Código de Promoción',
                              message: `¿Estás seguro de que deseas eliminar el código ${code.code}? Esta acción no se puede deshacer.`,
                              onConfirm: () => {
                                handleDeletePromoCode(code.id, code.code);
                                setConfirmModal(null);
                              }
                            });
                          }}
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
      )}

      {/* ── ADMIN SYSTEM INVOICES PANEL ── */}
      {activeTab === 'invoices' && (
        <section className="space-y-10 animate-fadeIn text-left">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card-bg border border-card-border p-6 rounded-[2rem] shadow-lg">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-1">Facturas del Sistema</h2>
              <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-wider">Historial completo de timbrado de CFDIs (SAT) de Néctar Labs</p>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto">
              <button
                onClick={() => {
                  setSelectedTenantId('');
                  setManualRfc('');
                  setManualRazonSocial('');
                  setManualRegimenFiscal('601');
                  setManualCodigoPostal('');
                  setManualEmail('');
                  setManualItems([{
                    quantity: 1,
                    unit_price: 0,
                    description: '',
                    product_key: '43231500',
                    unit_key: 'E48',
                    unit_name: 'Unidad de servicio'
                  }]);
                  setShowManualInvoiceModal(true);
                }}
                className="px-5 py-2.5 bg-nectar-gold text-background text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md font-bold whitespace-nowrap"
              >
                + Factura Manual (Cotizaciones)
              </button>
              <button
                onClick={() => {
                  setNewUserEmail('');
                  setNewUsername('');
                  setNewUserPassword('');
                  setNewUserRole('CUSTOMER');
                  setNewUserTenantId('');
                  setNewUserEmailVerified(true);
                  setShowNewUserModal(true);
                }}
                className="px-5 py-2.5 bg-foreground/10 hover:bg-foreground hover:text-background text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md font-bold whitespace-nowrap"
              >
                + Nuevo Usuario / Cliente
              </button>
              <div className="flex flex-col gap-1 min-w-[250px] w-full sm:w-auto">
                <label className="text-[7.5px] font-black uppercase tracking-widest opacity-40 ml-2">Buscar Inquilino o SAT UUID</label>
                <div className="relative">
                  <input
                    type="text"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-nectar-gold"
                  />
                  {invoiceSearch && (
                    <button
                      onClick={() => setInvoiceSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/45 hover:text-foreground text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                    <th className="pb-4">Fecha</th>
                    <th className="pb-4">Inquilino</th>
                    <th className="pb-4">Monto (MXN)</th>
                    <th className="pb-4">Folio Fiscal SAT (UUID)</th>
                    <th className="pb-4 text-center">Estatus</th>
                    <th className="pb-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const query = invoiceSearch.toLowerCase().trim();
                    const filtered = systemInvoices.filter(inv => {
                      if (!query) return true;
                      return (
                        (inv.tenant_name && inv.tenant_name.toLowerCase().includes(query)) ||
                        (inv.uuid_sat && inv.uuid_sat.toLowerCase().includes(query)) ||
                        (inv.status_display && inv.status_display.toLowerCase().includes(query))
                      );
                    });

                    if (loadingInvoices) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs opacity-50">
                            Cargando facturas...
                          </td>
                        </tr>
                      );
                    }

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                            Sin facturas encontradas
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((inv) => {
                      const isPaid = inv.status === 'PAID';
                      const isFailed = inv.status === 'FAILED';
                      const isPending = inv.status === 'PENDING';
                      const isLco = inv.status === 'LCO_SYNC_PENDING';
                      const isCancelRequested = inv.status === 'CANCEL_REQUESTED';
                      const isCancelled = inv.status === 'CANCELLED';

                      let badgeClass = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                      if (isPaid) badgeClass = 'bg-green-500/10 text-green-500 border-green-500/20';
                      else if (isFailed || isCancelled) badgeClass = 'bg-red-500/10 text-red-500 border-red-500/20';
                      else if (isLco || isCancelRequested) badgeClass = 'bg-orange-500/10 text-orange-500 border-orange-500/20';

                      return (
                        <tr key={inv.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                          <td className="py-4 text-xs font-mono opacity-80">
                            {new Date(inv.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-4 pr-4">
                            <span className="font-black text-sm">{inv.tenant_name || 'Néctar Labs'}</span>
                            <span className="text-[7.5px] font-bold block text-foreground/40 mt-0.5">
                              {inv.stripe_invoice_id ? `Stripe: ${inv.stripe_invoice_id}` : 'Manual'}
                            </span>
                          </td>
                          <td className="py-4 font-black text-xs">
                            ${parseFloat(inv.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 font-mono text-[9px] opacity-70 select-all max-w-[200px] truncate" title={inv.uuid_sat || 'No asignado'}>
                            {inv.uuid_sat || '—'}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2.5 py-1 text-[7px] font-black uppercase tracking-widest rounded-full border ${badgeClass}`}>
                              {inv.status_display}
                            </span>
                            {inv.error_message && (
                              <p className="text-[7px] text-red-400 mt-1 max-w-[150px] truncate mx-auto" title={inv.error_message}>
                                {inv.error_message}
                              </p>
                            )}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {inv.pdf_url && (
                                <a
                                  href={inv.pdf_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 bg-card-border hover:bg-foreground hover:text-background text-[7px] font-black uppercase tracking-widest rounded-lg transition-all"
                                >
                                  PDF
                                </a>
                              )}
                              {inv.xml_url && (
                                <a
                                  href={inv.xml_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 bg-card-border hover:bg-foreground hover:text-background text-[7px] font-black uppercase tracking-widest rounded-lg transition-all"
                                >
                                  XML
                                </a>
                              )}
                              {(isFailed || isLco || isPending) && (
                                <button
                                  onClick={() => handleRetryInvoice(inv.id)}
                                  className="px-2 py-1 bg-nectar-gold text-background hover:scale-105 text-[7px] font-black uppercase tracking-widest rounded-lg transition-all font-bold"
                                >
                                  Reintentar
                                </button>
                              )}
                              {(isPaid || isCancelRequested) && (
                                <button
                                  onClick={() => {
                                    setCancelInvoiceId(inv.id);
                                    setCancelMotive('02');
                                    setCancelSubstitution('');
                                    setShowCancelModal(true);
                                  }}
                                  className="px-2 py-1 bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white text-[7px] font-black uppercase tracking-widest rounded-lg transition-all border border-red-500/20 font-bold"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── ADMIN MARKETING CAMPAIGNS PANEL ── */}
      {activeTab === 'marketing' && (
        <section className="space-y-10 animate-fadeIn text-left">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-1">Campañas de Boletín Informativo</h2>
            <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-wider">Crea y envía campañas de email masivas a todos los suscriptores principales</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Form Column */}
            <div className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg text-left">
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Redactar Campaña
              </span>

              <form onSubmit={handleSendCampaign} className="space-y-6 mt-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Importar Post del Blog (Opcional)</label>
                  <select
                    value={selectedPostId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedPostId(val);
                      if (val) {
                        const post = blogPosts.find(p => String(p.id) === val);
                        if (post) {
                          setCampaignSubject(`Nuevo Post: ${post.title}`);
                          setCampaignTitle(post.title);
                          setCampaignContent(post.content);
                        }
                      } else {
                        setCampaignSubject('');
                        setCampaignTitle('');
                        setCampaignContent('');
                      }
                    }}
                    className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold text-xs text-foreground"
                  >
                    <option value="">-- Redactar en Blanco --</option>
                    {blogPosts.map((post) => (
                      <option key={post.id} value={String(post.id)}>
                        {post.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Asunto del Email</label>
                  <input
                    type="text"
                    required
                    value={campaignSubject}
                    onChange={(e) => setCampaignSubject(e.target.value)}
                    placeholder="ej: ¡Grandes novedades y actualizaciones en Néctar Labs!"
                    className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold text-xs text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Título del Boletín (Opcional)</label>
                  <input
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    placeholder="ej: Novedades del Mes"
                    className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold text-xs text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Contenido (HTML Soportado)</label>
                  <textarea
                    required
                    rows={8}
                    value={campaignContent}
                    onChange={(e) => setCampaignContent(e.target.value)}
                    placeholder="Escribe el mensaje en HTML..."
                    className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-medium text-xs text-foreground font-mono"
                  />
                </div>

                {/* Estilo y Tipografía */}
                <div className="bg-background/40 border border-card-border/60 p-5 rounded-2xl space-y-4 text-left">
                  <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50 border-b border-card-border/30 pb-2">
                    Diseño & Tipografía
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Plantilla de Estilo</label>
                      <select
                        value={templateType}
                        onChange={(e) => setTemplateType(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-bold"
                      >
                        <option value="minimalist">Minimalista (Limpio)</option>
                        <option value="moss">Moss (Bosque / Verde)</option>
                        <option value="cosmic">Cosmic (Nebulosa / Indigo)</option>
                        <option value="glow">Glow (Cyber / Neón)</option>
                        <option value="mist">Mist (Neblina / Celeste)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Tipografía de Título</label>
                      <select
                        value={titleFontFamily}
                        onChange={(e) => setTitleFontFamily(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-bold"
                      >
                        <option value="serif">Serif (Clásico)</option>
                        <option value="sans-serif">Sans-Serif (Moderno)</option>
                        <option value="monospace">Monospace (Técnico)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Tipografía de Cuerpo</label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-bold"
                      >
                        <option value="serif">Serif (Clásico)</option>
                        <option value="sans-serif">Sans-Serif (Moderno)</option>
                        <option value="monospace">Monospace (Técnico)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Tipografía del Footer</label>
                      <select
                        value={footerFontFamily}
                        onChange={(e) => setFooterFontFamily(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-bold"
                      >
                        <option value="serif">Serif (Clásico)</option>
                        <option value="sans-serif">Sans-Serif (Moderno)</option>
                        <option value="monospace">Monospace (Técnico)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Llamado a la Acción (CTA) */}
                <div className="bg-background/40 border border-card-border/60 p-5 rounded-2xl space-y-4 text-left">
                  <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50 border-b border-card-border/30 pb-2">
                    Llamado a la Acción (CTA)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Texto del Botón</label>
                      <input
                        type="text"
                        placeholder="ej: Visitar Tienda"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Enlace del Botón (URL)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={ctaLink}
                        onChange={(e) => setCtaLink(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold"
                      />
                    </div>
                  </div>
                </div>

                {/* Fondo Personalizado */}
                <div className="bg-background/40 border border-card-border/60 p-5 rounded-2xl space-y-4 text-left">
                  <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50 border-b border-card-border/30 pb-2">
                    Imagen de Portada & Fondo de Email
                  </h3>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">URL de Imagen de Portada (Encabezado)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">URL de Imagen de Fondo (Fondo del Cuerpo)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={bgImageUrl}
                      onChange={(e) => setBgImageUrl(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[7px] font-black uppercase tracking-widest opacity-40">Opacidad Fondo</label>
                      <input
                        type="number"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={bgOpacity}
                        onChange={(e) => setBgOpacity(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[7px] font-black uppercase tracking-widest opacity-40">Saturación Fondo %</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={bgSaturation}
                        onChange={(e) => setBgSaturation(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[7px] font-black uppercase tracking-widest opacity-40">Posición Fondo</label>
                      <select
                        value={bgPosition}
                        onChange={(e) => setBgPosition(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-bold"
                      >
                        <option value="center">Centro</option>
                        <option value="top">Arriba</option>
                        <option value="bottom">Abajo</option>
                        <option value="left">Izquierda</option>
                        <option value="right">Derecha</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pie de Página Personalizado */}
                <div className="bg-background/40 border border-card-border/60 p-5 rounded-2xl space-y-4 text-left">
                  <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50 border-b border-card-border/30 pb-2">
                    Pie de Página (Footer)
                  </h3>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Texto Adicional del Footer</label>
                    <input
                      type="text"
                      placeholder="ej: Visita nuestras oficinas en CDMX o llámanos."
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingCampaign || !campaignSubject.trim() || !campaignContent.trim()}
                  className="w-full py-4 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg shadow-nectar-gold/20"
                >
                  {isSendingCampaign ? 'Enviando Campaña...' : 'Enviar Campaña Masiva 🚀'}
                </button>
              </form>
            </div>

            {/* Live Preview Column */}
            <div className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg flex flex-col">
              <span className="px-3 py-1 bg-foreground/5 text-foreground/60 text-[8px] font-black uppercase tracking-widest rounded-full border border-card-border/60 self-start">
                Vista Previa del Correo
              </span>

              {(() => {
                const themePreviewStyles = {
                  minimalist: {
                    bg: '#ffffff',
                    text: '#111827',
                    headerBg: '#f3f4f6',
                    headerText: '#1f2937',
                    border: '#e5e7eb',
                    ctaBg: '#111827',
                    ctaText: '#ffffff'
                  },
                  moss: {
                    bg: '#f4f6f4',
                    text: '#1e2d24',
                    headerBg: '#2d4a36',
                    headerText: '#ffffff',
                    border: '#d2dbd3',
                    ctaBg: '#2d4a36',
                    ctaText: '#ffffff'
                  },
                  cosmic: {
                    bg: '#0f0c1b',
                    text: '#f3f0ff',
                    headerBg: '#1a103c',
                    headerText: '#a78bfa',
                    border: '#2e1f5e',
                    ctaBg: '#7c3aed',
                    ctaText: '#ffffff'
                  },
                  glow: {
                    bg: '#0d0d0d',
                    text: '#e5e7eb',
                    headerBg: '#1a1a1a',
                    headerText: '#22d3ee',
                    border: '#262626',
                    ctaBg: '#22d3ee',
                    ctaText: '#000000'
                  },
                  mist: {
                    bg: '#f0f4f8',
                    text: '#243b53',
                    headerBg: '#d9e2ec',
                    headerText: '#102a43',
                    border: '#bcccdc',
                    ctaBg: '#102a43',
                    ctaText: '#ffffff'
                  }
                };

                const selectedTheme = themePreviewStyles[templateType as keyof typeof themePreviewStyles] || themePreviewStyles.minimalist;
                return (
                  <div
                    style={{
                      backgroundColor: selectedTheme.bg,
                      color: selectedTheme.text,
                      borderColor: selectedTheme.border,
                      backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none',
                      backgroundPosition: bgPosition,
                      backgroundSize: 'cover',
                      filter: bgImageUrl ? `saturate(${bgSaturation}%)` : 'none',
                      opacity: bgImageUrl ? parseFloat(bgOpacity) : 1
                    }}
                    className="mt-6 border rounded-2xl p-6 flex flex-1 min-h-[350px] flex-col justify-between overflow-y-auto"
                  >
                    <div>
                      <div
                        style={{
                          backgroundColor: selectedTheme.headerBg,
                          borderColor: selectedTheme.border,
                          fontFamily: titleFontFamily === 'serif' ? 'Georgia, serif' : titleFontFamily === 'sans-serif' ? 'sans-serif' : 'monospace'
                        }}
                        className="border-b-2 pb-4 mb-6 text-center rounded-xl p-3"
                      >
                        {imageUrl && (
                          <img src={imageUrl} alt="Campaña" className="max-h-24 mx-auto mb-2 rounded object-cover" />
                        )}
                        <h1 style={{ color: selectedTheme.headerText }} className="text-xl font-extrabold tracking-tight">Néctar Labs</h1>
                        <p className="text-[8px] uppercase tracking-widest opacity-60">Boletín Informativo</p>
                      </div>

                      <h2 style={{ fontFamily: titleFontFamily === 'serif' ? 'Georgia, serif' : titleFontFamily === 'sans-serif' ? 'sans-serif' : 'monospace' }} className="text-base font-bold mb-4">{campaignTitle || campaignSubject || 'Título del Correo'}</h2>

                      <div
                        style={{ fontFamily: fontFamily === 'serif' ? 'Georgia, serif' : fontFamily === 'sans-serif' ? 'sans-serif' : 'monospace' }}
                        className="text-xs leading-relaxed space-y-3"
                        dangerouslySetInnerHTML={{ __html: campaignContent || '<p className="italic opacity-40">Comienza a escribir para ver la vista previa del contenido aquí...</p>' }}
                      />

                      {ctaText && (
                        <div className="mt-6 text-center">
                          <a
                            href={ctaLink || '#'}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              backgroundColor: selectedTheme.ctaBg,
                              color: selectedTheme.ctaText,
                              fontFamily: fontFamily === 'serif' ? 'Georgia, serif' : fontFamily === 'sans-serif' ? 'sans-serif' : 'monospace'
                            }}
                            className="inline-block px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all font-bold"
                          >
                            {ctaText}
                          </a>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        borderColor: selectedTheme.border,
                        fontFamily: footerFontFamily === 'serif' ? 'Georgia, serif' : footerFontFamily === 'sans-serif' ? 'sans-serif' : 'monospace'
                      }}
                      className="border-t pt-6 mt-8 text-center text-[8px] opacity-50 space-y-1"
                    >
                      <p>© {new Date().getFullYear()} Néctar Labs. Todos los derechos reservados.</p>
                      {footerText && <p>{footerText}</p>}
                      <p>Recibes este correo porque te suscribiste a nuestro boletín oficial.</p>
                      <p className="font-semibold cursor-pointer text-amber-500">Desuscribirse</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'addons' && (
        <section className="space-y-10 animate-fadeIn text-left">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card-bg border border-card-border p-6 rounded-[2rem] shadow-lg">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-1">Suscripciones de Add-ons</h2>
              <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-wider">Historial y control de módulos activos en inquilinos de Néctar Labs</p>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto">
              <div className="flex flex-col gap-1 min-w-[250px] w-full sm:w-auto">
                <label className="text-[7.5px] font-black uppercase tracking-widest opacity-40 ml-2">Buscar Cliente, Inquilino o Add-on</label>
                <div className="relative">
                  <input
                    type="text"
                    value={addonSearch}
                    onChange={(e) => setAddonSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-nectar-gold"
                  />
                  {addonSearch && (
                    <button
                      onClick={() => setAddonSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/45 hover:text-foreground text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                    <th className="pb-4">Fecha</th>
                    <th className="pb-4">Inquilino / Cliente</th>
                    <th className="pb-4">Add-on / Módulo</th>
                    <th className="pb-4">Esquema</th>
                    <th className="pb-4">Monto (MXN)</th>
                    <th className="pb-4 text-center">Estatus</th>
                    <th className="pb-4 text-right">Stripe ID</th>
                    <th className="pb-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const query = addonSearch.toLowerCase().trim();
                    const filtered = addonSubscriptions.filter(sub => {
                      if (!query) return true;
                      return (
                        (sub.user_email && sub.user_email.toLowerCase().includes(query)) ||
                        (sub.tenant_name && sub.tenant_name.toLowerCase().includes(query)) ||
                        (sub.addon_details?.name && sub.addon_details.name.toLowerCase().includes(query)) ||
                        (sub.stripe_subscription_id && sub.stripe_subscription_id.toLowerCase().includes(query))
                      );
                    });

                    if (loadingAddons) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-xs opacity-50">
                            Cargando suscripciones...
                          </td>
                        </tr>
                      );
                    }

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                            Sin suscripciones encontradas
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((sub) => {
                      const isActive = sub.status === 'active';
                      const isTrialing = sub.status === 'trialing';
                      const isPastDue = sub.status === 'past_due';
                      const isCanceled = sub.status === 'canceled';
                      const isIncomplete = sub.status === 'incomplete';
                      const isEditing = editingSubId === sub.id;

                      let badgeClass = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                      let statusText = sub.status;
                      if (isActive) {
                        badgeClass = 'bg-green-500/10 text-green-500 border-green-500/20';
                        statusText = 'Activo';
                      } else if (isTrialing) {
                        badgeClass = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                        statusText = 'Prueba';
                      } else if (isPastDue) {
                        badgeClass = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
                        statusText = 'Atrasado';
                      } else if (isCanceled) {
                        badgeClass = 'bg-red-500/10 text-red-500 border-red-500/20';
                        statusText = 'Cancelado';
                      } else if (isIncomplete) {
                        badgeClass = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
                        statusText = 'Incompleto';
                      }

                      return (
                        <tr key={sub.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                          <td className="py-4 text-xs font-mono opacity-80">
                            {new Date(sub.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-4 pr-4">
                            {sub.tenant ? (
                              <>
                                <span className="font-black text-sm">{sub.tenant_name}</span>
                                <span className="text-[7.5px] font-bold block text-foreground/40 mt-0.5">
                                  {sub.user_email} {sub.tenant_subdomain ? `(${sub.tenant_subdomain})` : ''}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-black text-sm text-red-400">⚠️ Pendiente de Asignar</span>
                                <span className="text-[7.5px] font-bold block text-foreground/40 mt-0.5">
                                  Adquirido por: {sub.user_email}
                                </span>
                              </>
                            )}
                          </td>
                          <td className="py-4 pr-4">
                            <span className="font-black text-xs text-nectar-gold">{sub.addon_details?.name || 'Módulo'}</span>
                            <span className="text-[7.5px] font-bold block text-foreground/40 mt-0.5 uppercase">
                              Ref: {sub.addon_details?.slug || '—'}
                            </span>
                          </td>
                          <td className="py-4 font-black text-xs uppercase tracking-wider">
                            {sub.billing_cycle === 'yearly' ? 'Anual' : 'Mensual'}
                          </td>
                          <td className="py-4 font-black text-xs">
                            ${parseFloat(sub.price_paid).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2.5 py-1 text-[7px] font-black uppercase tracking-widest rounded-full border ${badgeClass}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="py-4 text-right font-mono text-[9px] opacity-70 select-all" title={sub.stripe_subscription_id || 'Sin Stripe ID'}>
                            {sub.stripe_subscription_id || '—'}
                          </td>
                          <td className="py-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <select
                                  value={selectedTenantIdForSub}
                                  onChange={(e) => setSelectedTenantIdForSub(e.target.value)}
                                  className="bg-background border border-card-border rounded-xl px-2 py-1 text-[9px] text-foreground focus:outline-none focus:border-nectar-gold font-bold cursor-pointer max-w-[180px]"
                                >
                                  <option value="none">-- Sin Inquilino --</option>
                                  {allTenants.map((t: any) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name} ({t.subdomain})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleAssignTenant(sub.id, selectedTenantIdForSub)}
                                  disabled={isSubmittingAssign}
                                  className="px-2 py-1 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-green-500/20 font-bold disabled:opacity-50"
                                >
                                  {isSubmittingAssign ? '...' : '✓'}
                                </button>
                                <button
                                  onClick={() => setEditingSubId(null)}
                                  className="px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-red-500/20 font-bold"
                                >
                                  ✗
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingSubId(sub.id);
                                  setSelectedTenantIdForSub(sub.tenant || 'none');
                                }}
                                className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all border rounded-xl font-bold hover:scale-105 ${
                                  sub.tenant
                                    ? 'bg-foreground/5 text-foreground/60 border-card-border hover:bg-foreground/10 hover:text-foreground'
                                    : 'bg-nectar-gold/10 text-nectar-gold border-nectar-gold/20 hover:bg-nectar-gold hover:text-background'
                                }`}
                              >
                                {sub.tenant ? 'Reasignar' : 'Asignar Inquilino'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

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

      {/* ── MODAL FACTURA MANUAL (COTIZACIONES / AJUSTES) ── */}
      {showManualInvoiceModal && (
        <div
          onClick={() => setShowManualInvoiceModal(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-card-bg border border-card-border p-8 md:p-10 rounded-[3rem] shadow-2xl relative space-y-6 text-left cursor-default animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setShowManualInvoiceModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-card-border text-foreground/40 hover:text-foreground flex items-center justify-center text-xl font-bold"
            >
              ×
            </button>

            <div>
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Facturación SAT
              </span>
              <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none">
                Factura Manual (Cotizaciones / Ajustes)
              </h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                Genera y timbra una factura personalizada para cualquier inquilino del sistema.
              </p>
            </div>

            <form onSubmit={handleCreateManualInvoice} className="space-y-6">
              {/* Seleccionar Inquilino */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Seleccionar Inquilino (Tenant)</label>
                <select
                  required
                  value={selectedTenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
                >
                  <option value="">-- Elige un Inquilino --</option>
                  {allTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.brand_name || t.subdomain} ({t.owner_email || 'Sin correo'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Datos Fiscales */}
              <div className="bg-background/40 border border-card-border/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50 border-b border-card-border/30 pb-2">
                  Datos de Facturación del Cliente
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">RFC</label>
                    <input
                      type="text"
                      required
                      placeholder="XAXX010101000"
                      value={manualRfc}
                      onChange={(e) => setManualRfc(e.target.value.toUpperCase())}
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono uppercase tracking-wider"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Razón Social</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre o Razón Social"
                      value={manualRazonSocial}
                      onChange={(e) => setManualRazonSocial(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Régimen Fiscal</label>
                    <select
                      value={manualRegimenFiscal}
                      onChange={(e) => setManualRegimenFiscal(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
                    >
                      <option value="601">601 - General de Ley Personas Morales</option>
                      <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                      <option value="605">605 - Sueldos y Salarios</option>
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
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Código Postal</label>
                    <input
                      type="text"
                      required
                      placeholder="00000"
                      value={manualCodigoPostal}
                      onChange={(e) => setManualCodigoPostal(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Email de Envío de Factura</label>
                  <input
                    type="email"
                    required
                    placeholder="correo@cliente.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground"
                  />
                </div>
              </div>

              {/* Conceptos (Items) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-50">Conceptos / Ítems de la Factura</label>
                  <button
                    type="button"
                    onClick={() => {
                      setManualItems(prev => [...prev, {
                        quantity: 1,
                        unit_price: 0,
                        description: '',
                        product_key: '43231500',
                        unit_key: 'E48',
                        unit_name: 'Unidad de servicio'
                      }]);
                    }}
                    className="text-[8px] font-black text-nectar-gold hover:underline uppercase tracking-widest font-bold"
                  >
                    + Agregar Concepto
                  </button>
                </div>

                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {manualItems.map((item, idx) => (
                    <div key={idx} className="p-4 bg-background border border-card-border/60 rounded-xl space-y-3 relative text-left">
                      {manualItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualItems(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-2 right-3 text-red-500 hover:text-red-700 text-[8px] font-black uppercase tracking-wider"
                        >
                          remover
                        </button>
                      )}

                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest opacity-40">Descripción</label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-1.5 bg-background border border-card-border rounded-lg text-[9px] font-bold text-foreground"
                            placeholder="ej. Licencia Software o Ajuste de Cotización"
                            value={item.description}
                            onChange={(e) => {
                              const newDesc = e.target.value;
                              setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, description: newDesc } : it));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest opacity-40">Cant.</label>
                          <input
                            type="number"
                            required
                            min="1"
                            className="w-full px-3 py-1.5 bg-background border border-card-border rounded-lg text-[9px] font-bold text-center text-foreground font-mono"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: newQty } : it));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest opacity-40">Precio Unit. (MXN)</label>
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            className="w-full px-3 py-1.5 bg-background border border-card-border rounded-lg text-[9px] font-bold text-right text-foreground font-mono"
                            placeholder="0.00"
                            value={item.unit_price || ''}
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value) || 0;
                              setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: newPrice } : it));
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-white/5 pt-3 mt-2">
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest opacity-40 block">Clave Producto SAT</label>
                          <SATAutocomplete
                            mode="product"
                            value={item.product_key}
                            onChange={(code) => {
                              setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, product_key: code } : it));
                            }}
                            primaryColor="#C68A1E"
                            placeholder="Buscar producto..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest opacity-40 block">Clave Unidad SAT</label>
                          <SATAutocomplete
                            mode="unit"
                            value={item.unit_key}
                            onChange={(code, name) => {
                              setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_key: code, unit_name: name || it.unit_name } : it));
                            }}
                            primaryColor="#C68A1E"
                            placeholder="Buscar unidad..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest opacity-40 block">Nombre Unidad</label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-1.5 bg-background border border-card-border rounded-lg text-[9px] font-bold text-foreground font-mono"
                            placeholder="ej. Unidad de servicio"
                            value={item.unit_name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_name: newName } : it));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales y Timbrado */}
              <div className="pt-6 border-t border-card-border/60 flex items-center justify-between text-left">
                {(() => {
                  const subtotal = manualItems.reduce((acc, item) => acc + (item.quantity * (item.unit_price || 0)), 0);
                  const iva = parseFloat((subtotal * 0.16).toFixed(2));
                  const total = parseFloat((subtotal + iva).toFixed(2));

                  return (
                    <div className="grid grid-cols-3 gap-6 text-[9px] font-black uppercase tracking-widest">
                      <div>
                        <span className="opacity-40 block">Subtotal</span>
                        <span className="text-xs font-mono font-bold text-foreground/80">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="opacity-40 block">IVA (16%)</span>
                        <span className="text-xs font-mono font-bold text-foreground/80">${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-nectar-gold block">Total Facturado</span>
                        <span className="text-sm font-mono font-black text-nectar-gold">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowManualInvoiceModal(false)}
                    className="px-5 py-3 border border-card-border hover:bg-foreground hover:text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingManualInvoice || !selectedTenantId}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg shadow-green-950/20"
                  >
                    {isSubmittingManualInvoice ? 'Emitiendo y Timbrando...' : 'Timbrar Factura (PAC)'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewUserModal && (
        <div
          onClick={() => setShowNewUserModal(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card-bg border border-card-border p-8 md:p-10 rounded-[3rem] shadow-2xl relative space-y-6 text-left cursor-default animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setShowNewUserModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-card-border text-foreground/40 hover:text-foreground flex items-center justify-center text-xl font-bold"
            >
              ×
            </button>

            <div>
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Administración
              </span>
              <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none">
                Nuevo Usuario / Cliente
              </h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                Crea un nuevo usuario en la plataforma y asócialo opcionalmente a un inquilino.
              </p>
            </div>

            <form onSubmit={handleCreateNewUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Email Principal *</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@dominio.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Nombre de Usuario (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. minombre"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Contraseña (Opcional)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Rol de Usuario</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
                  >
                    <option value="CUSTOMER">Cliente</option>
                    <option value="BUSINESS">Inquilino (Business Owner)</option>
                    <option value="STAFF">Staff de Ventas</option>
                    <option value="ADMIN">Administrador Global</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Asociar Inquilino (SaaS)</label>
                  <select
                    value={newUserTenantId}
                    onChange={(e) => setNewUserTenantId(e.target.value)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground"
                  >
                    <option value="">Ninguno</option>
                    {allTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.brand_name || t.subdomain}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="newUserEmailVerified"
                  checked={newUserEmailVerified}
                  onChange={(e) => setNewUserEmailVerified(e.target.checked)}
                  className="w-4 h-4 bg-background border border-card-border rounded accent-nectar-gold"
                />
                <label htmlFor="newUserEmailVerified" className="text-[9px] font-black uppercase tracking-widest opacity-60 cursor-pointer">
                  Email Verificado
                </label>
              </div>

              <div className="pt-6 border-t border-card-border/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-5 py-3 border border-card-border hover:bg-foreground hover:text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewUser}
                  className="px-6 py-3 bg-nectar-gold text-background text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg shadow-nectar-gold/25"
                >
                  {isSubmittingNewUser ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div
          onClick={() => setShowCancelModal(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card-bg border border-card-border p-8 md:p-10 rounded-[3rem] shadow-2xl relative space-y-6 text-left cursor-default animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setShowCancelModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-card-border text-foreground/40 hover:text-foreground flex items-center justify-center text-xl font-bold cursor-pointer"
            >
              ×
            </button>

            <div>
              <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-red-500/20">
                Cancelación SAT
              </span>
              <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none text-foreground">
                Cancelar Factura CFDI
              </h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                Selecciona el motivo de cancelación ante el SAT.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!cancelInvoiceId) return;
                if (cancelMotive === '01' && !cancelSubstitution.trim()) {
                  showToast('El folio sustituto es obligatorio para el motivo 01.', 'warning');
                  return;
                }
                setIsSubmittingCancel(true);
                try {
                  await handleCancelInvoice(cancelInvoiceId, cancelMotive, cancelSubstitution.trim());
                  setShowCancelModal(false);
                } finally {
                  setIsSubmittingCancel(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Motivo de Cancelación *</label>
                <select
                  value={cancelMotive}
                  onChange={(e) => {
                    setCancelMotive(e.target.value);
                    if (e.target.value !== '01') setCancelSubstitution('');
                  }}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
                >
                  <option value="02">02 - Comprobante emitido con errores sin relación</option>
                  <option value="03">03 - Operación no realizada</option>
                  <option value="01">01 - Comprobante emitido con errores con relación</option>
                  <option value="04">04 - Operación nominativa relacionada en la factura global</option>
                </select>
              </div>

              {cancelMotive === '01' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Folio Sustituto (UUID o ID de Facturapi) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. 123e4567-e89b-12d3-a456-426614174000"
                    value={cancelSubstitution}
                    onChange={(e) => setCancelSubstitution(e.target.value)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono"
                  />
                  <p className="text-[8px] opacity-40 uppercase tracking-widest">
                    Especifica el UUID de la factura que reemplaza a la factura actual.
                  </p>
                </div>
              )}

              <div className="pt-6 border-t border-card-border/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-5 py-3 border border-card-border hover:bg-foreground hover:text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg shadow-red-950/25 cursor-pointer"
                >
                  {isSubmittingCancel ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal !== null}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        onConfirm={confirmModal?.onConfirm || (() => {})}
        onCancel={() => setConfirmModal(null)}
      />

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
