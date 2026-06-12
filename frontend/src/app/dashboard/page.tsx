'use client';
import { Suspense } from 'react';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetcher, API_URL } from '../../lib/api';
import StagingStatus from '../../components/dashboard/StagingStatus';
import WeeklyLogs from '../../components/dashboard/WeeklyLogs';
import BusinessCommander from '../../components/dashboard/BusinessCommander';
import SalesCommander from '../../components/dashboard/SalesCommander';
import DashboardSidebar from '../../components/DashboardSidebar';
import Toast from '../../components/ui/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import ContactSupportModal from '../../components/dashboard/ContactSupportModal';

interface Project {
  id: number;
  name: string;
  status: string;
  progress_percentage: number;
  staging_url: string;
  production_url: string;
  user_email?: string;
  client_username?: string;
  plan_hours?: number;
  used_hours_current_month?: number;
  remaining_hours_current_month?: number;
  designer_plan_hours?: number;
  designer_used_hours_current_month?: number;
  designer_remaining_hours_current_month?: number;
  designer_email?: string;
}

interface Contract {
  id: number;
  full_name: string;
  is_fully_signed: boolean;
  signature_base64?: string;
  developer_signature?: string;
  signed_at: string;
  plan_name?: string;
  payment_commitment_method?: string;
  next_payment_date?: string;
  pdf_file?: string;
  tax_id?: string;
  developer_signed_at?: string;
  tenant_subdomain?: string;
  tenant_name?: string;
  addons?: string[];
  plan?: any;
  tenant_custom_domain?: string | null;
}

interface Ticket {
  id: number;
  title: string;
  status: string;
  category: string;
  created_at: string;
  user_email?: string;
}

const formatHoursToHM = (decimalHours: number): string => {
  const isNegative = decimalHours < 0;
  const absHours = Math.abs(decimalHours);
  const h = Math.floor(absHours);
  const m = Math.round((absHours - h) * 60);

  let displayH = h;
  let displayM = m;
  if (displayM === 60) {
    displayM = 0;
    displayH += 1;
  }

  const sign = isNegative ? '-' : '';
  return `${sign}${displayH}:${displayM.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const dateObj = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  return dateObj.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

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

const getInlineViewUrl = (url: string | undefined, type: 'quote' | 'contract' | 'receipt', id: string | number) => {
  if (!url) return '';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const endpoint = type === 'quote' ? `quotes/${id}/view_pdf` : type === 'contract' ? `contracts/${id}/view_pdf` : `installments/${id}/view_receipt`;
  return `${API_URL}/${endpoint}/${token ? `?token=${token}` : ''}`;
};


function DashboardPageOriginal() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'business' | 'hire-plan'>('overview');
  const [businessStats, setBusinessStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingContractId, setUpdatingContractId] = useState<number | null>(null);
  const [selectedActiveContractId, setSelectedActiveContractId] = useState<number | null>(null);
  const [expandedContracts, setExpandedContracts] = useState<Record<number, boolean>>({});
  const [cfdiInputs, setCfdiInputs] = useState<Record<number, string>>({});
  const [wantsInvoiceMap, setWantsInvoiceMap] = useState<Record<number, boolean>>({});
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Record<number, string>>({});
  const [allAddons, setAllAddons] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [addonSubscriptions, setAddonSubscriptions] = useState<any[]>([]);
  const [activatingSubId, setActivatingSubId] = useState<number | null>(null);

  // Salesperson and Referral Program states
  const [salesSummary, setSalesSummary] = useState<any | null>(null);
  const [salesCommissions, setSalesCommissions] = useState<any[]>([]);
  const [myReferralCode, setMyReferralCode] = useState<any | null>(null);
  const [retroactiveCodeInput, setRetroactiveCodeInput] = useState('');
  const [applyingRetroactiveCode, setApplyingRetroactiveCode] = useState(false);
  const [retroactiveSuccessMessage, setRetroactiveSuccessMessage] = useState('');
  const [retroactiveErrorMessage, setRetroactiveErrorMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [contractFilter, setContractFilter] = useState<'all' | 'nectar' | 'custom' | 'addons_only'>('all');

  // Premium custom notification & confirmation dialog states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [paymentsExpanded, setPaymentsExpanded] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const router = useRouter();

  const toggleContractExpanded = (id: number) => {
    setExpandedContracts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateInstallmentStatus = async (installmentId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
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
      showToast("Folio Fiscal CFDI guardado con éxito.", 'success');
    } catch (err) {
      showToast("Error al guardar CFDI.", 'error');
    }
  };

  const [requestingInvoice, setRequestingInvoice] = useState<number | null>(null);

  const handleRequestInvoice = async (installmentId: number) => {
    setRequestingInvoice(installmentId);
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
        throw new Error(data.detail || data.error || 'Error al emitir la factura.');
      }

      const updatedUUID = data.uuid_sat || "LCO_PENDING";
      setInstallments(prev => prev.map(inst => inst.id === installmentId ? { ...inst, cfdi_uuid: updatedUUID } : inst));
      showToast('Factura emitida y timbrada con éxito.', 'success');

      const updatedInvoices = await fetcher('/billing/invoices/').catch(() => []);
      setInvoices(updatedInvoices.results || updatedInvoices || []);
    } catch (err: any) {
      showToast(err.message || 'Error al solicitar la factura.', 'error');
    } finally {
      setRequestingInvoice(null);
    }
  };

  const handleDeleteProject = (projectId: number, projectName: string) => {
    setConfirmDlg({
      title: "Eliminar Proyecto",
      message: `¿Estás seguro de que deseas eliminar el proyecto "${projectName}"?\n\nEsta acción no se puede deshacer y borrará permanentemente todos los registros de horas y avances relacionados.`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_URL}/projects/${projectId}/`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || "Error al eliminar el proyecto");
          }

          setProjects(prev => prev.filter(p => p.id !== projectId));
          showToast(`El proyecto "${projectName}" ha sido eliminado correctamente.`, 'success');
        } catch (err: any) {
          showToast(err.message || "Error al eliminar el proyecto.", 'error');
        }
      }
    });
  };
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'business') {
      setActiveTab('business');
    } else if (tab === 'hire-plan') {
      setActiveTab('hire-plan');
    } else {
      setActiveTab('overview');
    }

    const scroll = searchParams.get('scroll');
    if (scroll === 'payment-commitment') {
      const el = document.getElementById('payment-commitment-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (!loading) {
        setTimeout(() => {
          const retryEl = document.getElementById('payment-commitment-section');
          if (retryEl) retryEl.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else if (scroll === 'ventas') {
      const el = document.getElementById('ventas-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (!loading) {
        setTimeout(() => {
          const retryEl = document.getElementById('ventas-section');
          if (retryEl) retryEl.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [searchParams, loading]);

  const isCEO = userRole === 'ADMIN' || (isStaff && userRole !== 'DEVELOPER' && userRole !== 'DESIGNER');
  const isDeveloper = userRole === 'DEVELOPER';
  const isDesigner = userRole === 'DESIGNER';
  const isSales = userRole === 'SALES';
  const isClient = !isCEO && !isDeveloper && !isDesigner && !isSales;

  // Active contracts and contract at component scope for reference in handlers
  const activeContracts = contracts.filter(c => c.is_fully_signed);
  const activeContract = selectedActiveContractId
    ? activeContracts.find(c => c.id === selectedActiveContractId) || activeContracts[0]
    : activeContracts[0];
  const isAddonOnly = contracts.some(c => !c.plan);

  const handleApplyRetroactiveCode = async () => {
    if (!retroactiveCodeInput.trim() || !activeContract) return;
    setApplyingRetroactiveCode(true);
    setRetroactiveSuccessMessage('');
    setRetroactiveErrorMessage('');

    try {
      const res = await fetcher(`/contracts/${activeContract.id}/apply-promo-code/`, {
        method: 'POST',
        body: JSON.stringify({ code: retroactiveCodeInput })
      });
      setRetroactiveSuccessMessage(res.message || 'Código aplicado con éxito.');
      setRetroactiveCodeInput('');

      // Refresh installments and contracts
      const [updatedInstallments, updatedContracts] = await Promise.all([
        fetcher('/installments/'),
        fetcher('/contracts/')
      ]);
      setInstallments(updatedInstallments);
      setContracts(updatedContracts);
    } catch (err: any) {
      setRetroactiveErrorMessage(err.message || 'Error al aplicar el código.');
    } finally {
      setApplyingRetroactiveCode(false);
    }
  };

  // Custom states for portals and notifications
  const [tenants, setTenants] = useState<any[]>([]);
  const [notification, setNotification] = useState<{
    type: 'success' | 'cancel' | 'polling';
    title: string;
    message: string;
    attempts?: number;
  } | null>(null);

  const handleUpdatePaymentMethod = async (contractId: number, method: string) => {
    try {
      setUpdatingContractId(contractId);
      const updated = await fetcher(`/contracts/${contractId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ payment_commitment_method: method })
      });
      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, payment_commitment_method: updated.payment_commitment_method } : c));
    } catch (err) {
      showToast("Error al actualizar método de pago", 'error');
    } finally {
      setUpdatingContractId(null);
    }
  };

  const handleUpdatePaymentDate = async (contractId: number, date: string) => {
    try {
      setUpdatingContractId(contractId);
      const updated = await fetcher(`/contracts/${contractId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ next_payment_date: date })
      });
      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, next_payment_date: updated.next_payment_date } : c));
    } catch (err) {
      showToast("Error al actualizar fecha de compromiso", 'error');
    } finally {
      setUpdatingContractId(null);
    }
  };

  const handleToggleAddon = async (contractId: number, addonSlug: string, isCurrentlyActive: boolean) => {
    try {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) return;

      const currentAddons = contract.addons || [];
      const newAddons = isCurrentlyActive
        ? currentAddons.filter(slug => slug !== addonSlug)
        : [...currentAddons, addonSlug];

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/contracts/${contractId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ addons: newAddons })
      });

      if (!response.ok) {
        throw new Error("Failed to update addons");
      }

      const updated = await response.json();
      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, addons: updated.addons } : c));

      // Refresh tenants because changes on contracts affect active_addons
      const tenantsData = await fetcher('/tenants/');
      setTenants(tenantsData);
    } catch (err) {
      showToast("Error al actualizar los Add-ons del cliente.", 'error');
    }
  };

  const handleActivateAddon = async (subId: number) => {
    try {
      setActivatingSubId(subId);
      const res = await fetcher(`/addon-subscriptions/${subId}/activate/`, {
        method: 'POST'
      });
      if (res.status === 'activated') {
        showToast("Add-on activado y asignado exitosamente.", "success");
        const subs = await fetcher('/addon-subscriptions/');
        setAddonSubscriptions(subs);
        const [updatedContracts, updatedTenants] = await Promise.all([
          fetcher('/contracts/'),
          fetcher('/tenants/')
        ]);
        setContracts(updatedContracts);
        setTenants(updatedTenants);
      }
    } catch (err: any) {
      showToast(err.message || "Error al activar el Add-on.", "error");
    } finally {
      setActivatingSubId(null);
    }
  };

  const handleUploadReceipt = async (installmentId: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append('receipt_file', file);

      const wantsInvoice = !!wantsInvoiceMap[installmentId];
      const inst = installments.find(i => i.id === installmentId);
      const contract = contracts.find(c => c.id === inst?.contract);
      const method = selectedPaymentMethods[installmentId] || inst?.payment_method || contract?.payment_commitment_method || 'SPEI';

      formData.append('wants_invoice', wantsInvoice ? 'true' : 'false');
      formData.append('payment_method', method);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/installments/${installmentId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (!response.ok) throw new Error("Upload failed");
      const updated = await response.json();
      setInstallments(prev => prev.map(inst => inst.id === installmentId ? { ...inst, receipt_file: updated.receipt_file, status: updated.status, wants_invoice: updated.wants_invoice, payment_method: updated.payment_method } : inst));
      showToast("Comprobante subido con éxito. El equipo de administración lo validará a la brevedad.", 'success');
    } catch (err) {
      showToast("Error al subir el comprobante de pago", 'error');
    }
  };

  const handlePayStripe = async (installmentId: number) => {
    try {
      const token = localStorage.getItem('token');
      const wantsInvoice = !!wantsInvoiceMap[installmentId];
      const response = await fetch(`${API_URL}/installments/${installmentId}/checkout_session/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wants_invoice: wantsInvoice })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al inicializar sesión de pago");
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast(err.message || "Error al conectar con Stripe", 'error');
    }
  };

  const handleSubscribeAddon = async (addonId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/addons/${addonId}/subscribe/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al iniciar suscripción");
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast(err.message || "Error al conectar con Stripe", 'error');
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/addons/customer_portal/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al abrir el portal de facturación");
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast(err.message || "Error de conexión con Stripe", 'error');
    }
  };

  useEffect(() => {
    const checkAuth = () => {
      const staff = localStorage.getItem('is_staff') === 'true';
      const role = localStorage.getItem('user_role') || '';
      setUserRole(role);
      setIsStaff(staff || role === 'ADMIN' || role === 'DEVELOPER');
    };

    const loadData = async () => {
      try {
        const staff = localStorage.getItem('is_staff') === 'true';
        const role = localStorage.getItem('user_role') || '';

        // 1. Fetch user me first, quickly, to establish session details
        const meData = await fetcher('/users/me/').catch(() => null);
        setCurrentUser(meData);

        // 2. Set loading to false immediately to render the Dashboard Shell (Sidebar/Header)
        setLoading(false);
        setFetching(true);

        // 3. Perform role-tailored API calls in background
        if (role === 'ADMIN' || staff) {
          // CEO / Admin - Load all operations, metrics, and administration panels
          const [
            projectsData, ticketsData, logsData, contractsData,
            installmentsData, tenantsData, plansData, addonsData, statsData,
            referralData, addonSubscriptionsData
          ] = await Promise.all([
            fetcher('/projects/').catch(() => []),
            fetcher('/tickets/').catch(() => []),
            fetcher('/logs/').catch(() => []),
            fetcher('/contracts/').catch(() => []),
            fetcher('/installments/').catch(() => []),
            fetcher('/tenants/').catch(() => []),
            fetcher('/plans/').catch(() => []),
            fetcher('/addons/').catch(() => []),
            fetcher('/dashboard/business-stats/').catch(() => null),
            fetcher('/promo-codes/my-referral-code/').catch(() => null),
            fetcher('/addon-subscriptions/').catch(() => [])
          ]);

          setProjects(projectsData);
          setTickets(ticketsData);
          setLogs(logsData);
          setContracts(contractsData);
          setInstallments(installmentsData);
          setTenants(tenantsData);
          setPlans(plansData);
          setAllAddons(addonsData || []);
          setBusinessStats(statsData);
          setMyReferralCode(referralData);
          setAddonSubscriptions(addonSubscriptionsData || []);
        } else if (role === 'SALES') {
          // Sales Person - Load only commissions, referral summaries, and promo code metrics
          const [summaryData, commissionsData, referralData] = await Promise.all([
            fetcher('/sales-commissions/summary/').catch(() => null),
            fetcher('/sales-commissions/').catch(() => []),
            fetcher('/promo-codes/my-referral-code/').catch(() => null)
          ]);
          setSalesSummary(summaryData);
          setSalesCommissions(commissionsData || []);
          setMyReferralCode(referralData);
        } else if (role === 'DEVELOPER' || role === 'DESIGNER') {
          // Staff Developers / Designers - Load only assigned projects, logs, and technical contracts
          const [projectsData, ticketsData, logsData, contractsData, addonSubscriptionsData] = await Promise.all([
            fetcher('/projects/').catch(() => []),
            fetcher('/tickets/').catch(() => []),
            fetcher('/logs/').catch(() => []),
            fetcher('/contracts/').catch(() => []),
            fetcher('/addon-subscriptions/').catch(() => [])
          ]);
          setProjects(projectsData);
          setTickets(ticketsData);
          setLogs(logsData);
          setContracts(contractsData);
          setAddonSubscriptions(addonSubscriptionsData || []);
        } else {
          // Client / Customers - Load their contracts, installments, projects, active addons, tenants, and invoices
          const [projectsData, ticketsData, contractsData, installmentsData, addonsData, plansData, referralData, tenantsData, invoicesData, addonSubscriptionsData] = await Promise.all([
            fetcher('/projects/').catch(() => []),
            fetcher('/tickets/').catch(() => []),
            fetcher('/contracts/').catch(() => []),
            fetcher('/installments/').catch(() => []),
            fetcher('/addons/').catch(() => []),
            fetcher('/plans/').catch(() => []),
            fetcher('/promo-codes/my-referral-code/').catch(() => null),
            fetcher('/tenants/').catch(() => []),
            fetcher('/billing/invoices/').catch(() => []),
            fetcher('/addon-subscriptions/').catch(() => [])
          ]);
          setProjects(projectsData);
          setTickets(ticketsData);
          setContracts(contractsData);
          setInstallments(installmentsData);
          setAllAddons(addonsData || []);
          setPlans(plansData || []);
          setMyReferralCode(referralData);
          setTenants(tenantsData || []);
          setInvoices(invoicesData.results || invoicesData || []);
          setAddonSubscriptions(addonSubscriptionsData || []);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
        setFetching(false);
      }
    };

    checkAuth();
    loadData();

    // Check URL for Stripe payment results
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    if (payment === 'success') {
      if (sessionId) {
        const syncSession = async () => {
          try {
            const res = await fetcher('/addons/sync-checkout-session/', {
              method: 'POST',
              body: JSON.stringify({ session_id: sessionId })
            });
            if (res.status === 'success') {
              showToast("¡Add-on contratado y activado exitosamente!", "success");
              loadData();
            }
          } catch (err: any) {
            console.error("Error syncing checkout session:", err);
          }
        };
        syncSession();
      }

      setNotification({
        type: 'polling',
        title: 'Verificando Pago',
        message: 'Estamos sincronizando tu pago con Stripe y activando tu portal. Por favor espera...',
        attempts: 1
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (payment === 'cancel') {
      setNotification({
        type: 'cancel',
        title: 'Pago Cancelado',
        message: 'La suscripción o pago de Stripe ha sido cancelada.'
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Polling hook to sync Stripe payment with backend
  useEffect(() => {
    if (!notification || notification.type !== 'polling') return;

    let timer: NodeJS.Timeout;
    const maxAttempts = 5;
    const currentAttempt = notification.attempts || 1;

    const poll = async () => {
      try {
        const staff = localStorage.getItem('is_staff') === 'true';
        const role = localStorage.getItem('user_role') || '';
        const isActuallyStaff = (staff || role === 'ADMIN' || role === 'BUSINESS') && role !== 'DESIGNER';

        const [projectsData, ticketsData, logsData, contractsData, installmentsData, tenantsData, addonSubsData] = await Promise.all([
          fetcher('/projects/'),
          fetcher('/tickets/'),
          fetcher('/logs/'),
          fetcher('/contracts/'),
          fetcher('/installments/'),
          fetcher('/tenants/'),
          isActuallyStaff ? fetcher('/addon-subscriptions/') : Promise.resolve([])
        ]);

        setProjects(projectsData);
        setTickets(ticketsData);
        setLogs(logsData);
        setContracts(contractsData);
        setInstallments(installmentsData);
        setTenants(tenantsData);
        if (isActuallyStaff) {
          setAddonSubscriptions(addonSubsData);
        }

        if (isActuallyStaff) {
          const statsData = await fetcher('/dashboard/business-stats/');
          setBusinessStats(statsData);
        }

        if (currentAttempt >= 3) {
          setNotification({
            type: 'success',
            title: '¡Ecosistema Listo!',
            message: 'Tu pago ha sido procesado e integrado. Tu portal y subdominios están activos y actualizados.'
          });
        } else {
          timer = setTimeout(() => {
            setNotification(prev => prev ? {
              ...prev,
              message: `Sincronizando portal con Stripe... (Intento ${currentAttempt + 1}/${maxAttempts})`,
              attempts: currentAttempt + 1
            } : null);
          }, 3000);
        }
      } catch (err) {
        console.error("Error polling database updates:", err);
      }
    };

    poll();

    return () => clearTimeout(timer);
  }, [notification?.attempts]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Syncing Ecosystem...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-card-bg/95 backdrop-blur-md border border-card-border p-6 rounded-[2rem] shadow-2xl flex flex-col gap-3 transition-all duration-300 animate-fade-in">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              {notification.type === 'polling' && (
                <span className="w-4 h-4 rounded-full border-2 border-nectar-gold border-t-transparent animate-spin shrink-0"></span>
              )}
              {notification.type === 'success' && (
                <span className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500 text-green-500 flex items-center justify-center font-bold text-[9px] shrink-0">✓</span>
              )}
              {notification.type === 'cancel' && (
                <span className="w-4 h-4 rounded-full bg-yellow-500/20 border border-yellow-500 text-yellow-500 flex items-center justify-center font-bold text-[9px] shrink-0">!</span>
              )}
              <h3 className="font-black text-[10px] uppercase tracking-wider text-foreground">
                {notification.title}
              </h3>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
            >
              Cerrar
            </button>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">
            {notification.message}
          </p>
        </div>
      )}

      {/* Sidebar Navigation */}
      <DashboardSidebar />

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-12 lg:p-16 overflow-y-auto">
        <header className="mb-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">
            {isCEO ? (activeTab === 'business' ? 'Control de Negocio' : 'Consola del CEO') :
              isDeveloper ? 'Consola de Ingeniería' :
                isDesigner ? 'Centro de Diseño' :
                  isSales ? 'Consola de Ventas' :
                    activeTab === 'hire-plan' ? 'Escala tu Ecosistema' : 'Centro de Control'}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-nectar-gold opacity-80">
            {isCEO ? (activeTab === 'business' ? 'Consola Financiera y de Infraestructura' : 'Panel de Operaciones Néctar Labs') :
              isDeveloper ? 'Workspace de Desarrollo y Soporte' :
                isDesigner ? 'Activos y Proyectos Creativos' :
                  isSales ? 'Comisiones, Referidos y Métricas de Rendimiento' :
                    activeTab === 'hire-plan' ? 'Elige tu Plan de Ingeniería Dedicado' : 'Workspace / Cliente Principal'}
          </p>
        </header>

        {isSales ? (
          <div className="space-y-12 animate-fadeIn">
            {/* Warning Banner for Unapproved Sellers */}
            {currentUser && !currentUser.is_approved_seller && (
              <div className="p-8 rounded-[2.5rem] bg-amber-500/10 border-2 border-dashed border-amber-500/40 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-3xl">
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-amber-500/30">
                      Reunión de Inducción Pendiente
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-foreground mt-2">
                      Tu Cuenta de Vendedor requiere aprobación
                    </h2>
                    <p className="text-xs text-foreground/60 leading-relaxed uppercase tracking-wider">
                      Para activar tu cuenta y poder generar comisiones de referidos, es necesario agendar una llamada de inducción y aprobación previa con Néctar Labs.
                    </p>
                  </div>
                  <a
                    href="mailto:contacto@nectarlabs.dev?subject=Reunion%20de%20Aprobacion%20Vendedor%20Nectar%20Labs"
                    className="px-8 py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-nectar-gold/20 shrink-0 text-center font-bold"
                  >
                    Agendar Reunión 📅
                  </a>
                </div>
              </div>
            )}

            {/* Top Grid: Code & Commission Rules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Code Card */}
              {myReferralCode && (
                <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                    <div>
                      <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full">Código de Vendedor</span>
                      <h2 className="text-3xl font-black tracking-tighter mt-4 mb-2">Tu Enlace de Referido</h2>
                      <p className="text-xs text-foreground/60 leading-relaxed uppercase tracking-wider">
                        Comparte este código exclusivo con tus clientes prospectos. Al ingresarlo durante su registro, obtendrán un <strong>10% de descuento</strong> en su primer abono y se vincularán a tu cuenta para comisiones recurrentes.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 bg-background/50 border border-card-border/80 rounded-2xl p-4 justify-between">
                        <span className="font-mono text-lg font-black tracking-widest text-foreground select-all">{myReferralCode.code}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(myReferralCode.code);
                            showToast("¡Código de vendedor copiado al portapapeles!", "success");
                          }}
                          className="px-6 py-3 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                        >
                          Copiar Código
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Commission Rules */}
              <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-forest/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 space-y-6">
                  <div>
                    <span className="px-3 py-1 bg-nectar-forest/10 text-nectar-forest text-[8px] font-black uppercase tracking-widest rounded-full">Esquema de Comisiones</span>
                    <h2 className="text-3xl font-black tracking-tighter mt-4 mb-2">Estructura Néctar Labs</h2>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-foreground/60">Contratos & Módulos Estándar (Mensual Recurrente):</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-background/40 border border-card-border/60 rounded-2xl text-center">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block">Mes 1</span>
                        <span className="text-2xl font-black text-nectar-gold font-mono">10%</span>
                        <p className="text-[8px] font-bold text-foreground/50 mt-1 uppercase">Abono Inicial</p>
                      </div>
                      <div className="p-4 bg-background/40 border border-card-border/60 rounded-2xl text-center">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block">Mes 2</span>
                        <span className="text-2xl font-black text-nectar-gold font-mono">5%</span>
                        <p className="text-[8px] font-bold text-foreground/50 mt-1 uppercase">Segundo Mes</p>
                      </div>
                      <div className="p-4 bg-background/40 border border-card-border/60 rounded-2xl text-center">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block">Mes 3+</span>
                        <span className="text-2xl font-black text-nectar-gold font-mono">2%</span>
                        <p className="text-[8px] font-bold text-foreground/50 mt-1 uppercase">Permanente</p>
                      </div>
                    </div>

                    <h4 className="text-[10px] font-black uppercase tracking-wider text-foreground/60 mt-4">Proyectos Personalizados (Cotizaciones):</h4>
                    <div className="p-4 bg-nectar-gold/10 border border-nectar-gold/30 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold block">Abono 1 (Anticipo 50%)</span>
                        <span className="text-2xl font-black text-nectar-gold font-mono">20%</span>
                        <p className="text-[8px] font-bold text-foreground/65 mt-0.5 uppercase">Comisión única sobre el total cotizado</p>
                      </div>
                      <div className="text-right max-w-[150px]">
                        <span className="text-[7.5px] font-bold text-foreground/45 uppercase tracking-wider block">Nota</span>
                        <p className="text-[9px] text-foreground/65 leading-tight mt-1">La liquidación final (Abono 2) no genera comisiones adicionales.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-nectar-gold/5 border border-nectar-gold/15 text-[10px] leading-relaxed text-foreground/70 font-medium">
                    ⚠️ <strong>Información importante:</strong> Este beneficio por comisión es el único esquema compensatorio para vendedores registrados en esta modalidad. No se contemplan seguros, prestaciones de ley u otros adicionales por el momento.
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Earnings Paid */}
              <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border flex flex-col justify-between gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Comisiones Cobradas</span>
                  <h3 className="text-3xl font-black tracking-tight mt-2 text-green-400 font-mono">
                    ${(salesSummary?.paid_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-foreground/50">MXN</span>
                  </h3>
                  <p className="text-[9px] text-foreground/50 mt-1 uppercase tracking-wider font-bold">Transferido a tu cuenta bancaria registrada</p>
                </div>
              </div>

              {/* Earnings Pending */}
              <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border flex flex-col justify-between gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Comisiones Pendientes</span>
                  <h3 className="text-3xl font-black tracking-tight mt-2 text-yellow-500 font-mono">
                    ${(salesSummary?.pending_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-foreground/50">MXN</span>
                  </h3>
                  <p className="text-[9px] text-foreground/50 mt-1 uppercase tracking-wider font-bold">Por liquidar tras validación del pago del cliente</p>
                </div>
              </div>

              {/* Total Referrals */}
              <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border flex flex-col justify-between gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-nectar-gold/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Clientes Adquiridos</span>
                  <h3 className="text-3xl font-black tracking-tight mt-2 text-nectar-gold font-mono">
                    {salesSummary?.referred_contracts_count || 0} <span className="text-xs font-bold text-foreground/50">Ecosistemas</span>
                  </h3>
                  <p className="text-[9px] text-foreground/50 mt-1 uppercase tracking-wider font-bold">Contratos activos vinculados a tu código</p>
                </div>
              </div>
            </div>

            {/* CRM Leads Pipeline (Kanban) & Modular Quotes Builder */}
            <SalesCommander />

            {/* Commissions History Table */}
            <section className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative">
              <div className="mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Historial de Comisiones</h3>
                <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Seguimiento de abonos de tus referidos y estado de pagos</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                      <th className="pb-4">Cliente</th>
                      <th className="pb-4 text-center">Mensualidad</th>
                      <th className="pb-4 text-right">Monto Recibido</th>
                      <th className="pb-4 text-center">Porcentaje</th>
                      <th className="pb-4 text-right">Tu Comisión</th>
                      <th className="pb-4 text-center">Estatus</th>
                      <th className="pb-4 text-right">Fecha Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesCommissions.map((comm) => (
                      <tr key={comm.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                        <td className="py-4 font-black text-sm">
                          {comm.client_name}
                        </td>
                        <td className="py-4 text-center font-bold text-xs opacity-80">
                          Mes {comm.installment_number}
                        </td>
                        <td className="py-4 text-right font-mono font-bold text-xs">
                          ${parseFloat(comm.installment_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-center font-mono font-bold text-xs text-nectar-gold">
                          {parseFloat(comm.commission_percentage)}%
                        </td>
                        <td className="py-4 text-right font-mono font-bold text-xs text-foreground">
                          ${parseFloat(comm.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-center">
                          {comm.status === 'PAID' ? (
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-green-500/20">Liquidada</span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-yellow-500/20">En Espera</span>
                          )}
                        </td>
                        <td className="py-4 text-right text-[10px] font-bold opacity-60">
                          {new Date(comm.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                    {salesCommissions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                          No tienes comisiones registradas aún
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : activeTab === 'business' && isCEO ? (
          <BusinessCommander stats={businessStats} installments={installments} setInstallments={setInstallments} />
        ) : activeTab === 'hire-plan' && isClient ? (
          <div className="space-y-12 animate-fadeIn">
            <section className="p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10 max-w-2xl">
                <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full">Planes de Ingeniería Néctar Labs</span>
                <h2 className="text-4xl font-black tracking-tighter mt-4 mb-2">Escala tu Ecosistema Tecnológico</h2>
                <p className="text-xs text-foreground/60 uppercase tracking-wider mb-8">
                  Elige un plan de inversión de ingeniería mensual o agrega complementos. Todos los planes incluyen infraestructura en la nube dedicada.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                {plans.map((plan) => (
                  <div key={plan.id} className="p-8 rounded-[2rem] bg-background/50 border border-card-border flex flex-col justify-between hover:border-nectar-gold transition-all duration-300 group animate-in fade-in zoom-in-95">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight mb-2">{plan.name}</h3>
                      {(() => {
                        const discount = parseFloat(plan.discount_percentage || '0');
                        const origPrice = parseFloat(plan.price);
                        const finalPrice = discount > 0 ? origPrice * (1 - discount / 100) : origPrice;

                        if (discount > 0) {
                          return (
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs line-through opacity-50 font-mono">
                                  ${origPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-red-500/20">
                                  -{discount}% OFF
                                </span>
                              </div>
                              <div className="text-3xl font-black text-nectar-gold font-mono">
                                ${finalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-[10px] text-foreground/50 uppercase tracking-widest">MXN / Mes</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="text-3xl font-black text-nectar-gold mb-6 font-mono">
                            ${origPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-[10px] text-foreground/50 uppercase tracking-widest">MXN / Mes</span>
                          </div>
                        );
                      })()}

                      <ul className="space-y-3 mb-8 text-xs text-foreground/80">
                        <li className="flex items-center gap-2">
                          <span className="text-nectar-gold font-bold">✓</span>
                          <strong>{plan.hours} Horas</strong> de ingeniería dedicadas
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-nectar-gold font-bold">✓</span>
                          Docker Containers
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-nectar-gold font-bold">✓</span>
                          Seguridad SSL Incluida
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-nectar-gold font-bold">✓</span>
                          Soporte Multi-tenant
                        </li>
                      </ul>
                    </div>

                    <Link
                      href={`/onboarding?plan=${plan.id}`}
                      className="w-full py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] shadow-lg shadow-nectar-gold/10"
                    >
                      Contratar Plan
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-16 animate-fadeIn">
            {/* Developer Specific Section: Pending Contracts */}
            {isStaff && contracts.some(c => !c.is_fully_signed) && (
              <section className="mb-16 p-10 rounded-[3rem] bg-nectar-gold text-background shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <h2 className="text-3xl font-black tracking-tighter mb-6 relative z-10">Contratos por Validar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                  {contracts.filter(c => !c.is_fully_signed).map(contract => (
                    <div key={contract.id} className="bg-background/10 backdrop-blur-md border border-background/20 p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Cliente</p>
                        <h4 className="font-black text-lg">{contract.full_name}</h4>
                        <p className="text-[9px] font-bold mt-1 opacity-80">{contract.plan_name}</p>
                      </div>
                      <Link
                        href={`/contract/dev-sign/${contract.id}`}
                        className="mt-6 py-3 bg-background text-nectar-gold text-center rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                      >
                        Firmar y Cerrar
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Developer Specific Section: Pending Add-ons to Activate */}
            {isStaff && addonSubscriptions.some((sub: any) => !sub.is_activated && (sub.status === 'active' || sub.status === 'trialing')) && (
              <section className="mb-16 p-10 rounded-[3rem] bg-nectar-gold text-background shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <h2 className="text-3xl font-black tracking-tighter mb-6 relative z-10">Add-ons por Activar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                  {addonSubscriptions.filter((sub: any) => !sub.is_activated && (sub.status === 'active' || sub.status === 'trialing')).map((sub: any) => (
                    <div key={sub.id} className="bg-background/10 backdrop-blur-md border border-background/20 p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Cliente</p>
                        <h4 className="font-black text-lg truncate" title={sub.user_email}>{sub.user_email}</h4>
                        <p className="text-[9px] font-bold mt-1 opacity-80">{sub.addon_details?.name || 'Módulo/Add-on'}</p>
                        {sub.tenant_subdomain && (
                          <p className="text-[8px] font-bold mt-1 opacity-60">Tenant: {sub.tenant_subdomain}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleActivateAddon(sub.id)}
                        disabled={activatingSubId === sub.id}
                        className="mt-6 py-3 bg-background text-nectar-gold text-center rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all font-bold disabled:opacity-50"
                      >
                        {activatingSubId === sub.id ? 'Activando...' : 'Activar Add-on'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Developer Specific Section: Ecosystem Contracts */}
            {isCEO && (
              <section className="mb-16 p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-card-border/40 pb-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Contratos del Ecosistema</h3>
                    <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Historial completo de contratos de Partner Tecnológico</p>
                  </div>

                  {/* Premium segment tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-background/50 border border-card-border/80">
                    {(['all', 'nectar', 'custom', 'addons_only'] as const).map((filter) => {
                      const labels = {
                        all: 'Todos',
                        nectar: 'Contrato + Subdominio',
                        custom: 'Contrato + Dominio Propio',
                        addons_only: 'Solo Add-ons'
                      };
                      const isActive = contractFilter === filter;
                      return (
                        <button
                          key={filter}
                          onClick={() => setContractFilter(filter)}
                          className={`px-4 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all duration-300 ${isActive
                              ? 'bg-nectar-gold text-background shadow-md shadow-nectar-gold/10 font-bold'
                              : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5 font-bold'
                            }`}
                        >
                          {labels[filter]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                        <th className="pb-4 w-10 text-center">Detalle</th>
                        <th className="pb-4">Cliente / Razón Social</th>
                        <th className="pb-4">Plan</th>
                        <th className="pb-4 text-center">Firma Cliente</th>
                        <th className="pb-4 text-center">Firma Néctar</th>
                        <th className="pb-4 text-center">Estatus</th>
                        <th className="pb-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fetching ? (
                        <tr>
                          <td colSpan={7} className="py-8">
                            <div className="space-y-3 animate-pulse">
                              <div className="h-4 bg-foreground/10 rounded w-full"></div>
                              <div className="h-4 bg-foreground/10 rounded w-5/6"></div>
                              <div className="h-4 bg-foreground/10 rounded w-4/5"></div>
                            </div>
                          </td>
                        </tr>
                      ) : (() => {
                        const filteredContracts = contracts.filter(contract => {
                          const hasPlan = !!contract.plan;
                          const hasCustomDomain = !!contract.tenant_custom_domain;
                          if (contractFilter === 'nectar') {
                            return hasPlan && !hasCustomDomain;
                          }
                          if (contractFilter === 'custom') {
                            return hasPlan && hasCustomDomain;
                          }
                          if (contractFilter === 'addons_only') {
                            return !hasPlan;
                          }
                          return true;
                        });

                        if (filteredContracts.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                                No hay contratos que coincidan con el filtro
                              </td>
                            </tr>
                          );
                        }

                        return filteredContracts.map(contract => (
                          <React.Fragment key={contract.id}>
                            <tr className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                              <td className="py-4 text-center">
                                <button
                                  onClick={() => toggleContractExpanded(contract.id)}
                                  className="text-nectar-gold hover:text-white transition-colors"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2.5"
                                    stroke="currentColor"
                                    className={`w-4 h-4 transition-transform duration-300 ${expandedContracts[contract.id] ? 'rotate-90' : ''
                                      }`}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                    />
                                  </svg>
                                </button>
                              </td>
                              <td className="py-4 pr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-sm">{contract.full_name}</h4>
                                  {(() => {
                                    const hasPlan = !!contract.plan;
                                    const hasCustomDomain = !!contract.tenant_custom_domain;
                                    if (!hasPlan) {
                                      return <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[6.5px] font-black uppercase tracking-widest rounded border border-purple-500/20">Solo Add-ons</span>;
                                    } else if (hasCustomDomain) {
                                      return <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[6.5px] font-black uppercase tracking-widest rounded border border-green-500/20">Dominio Propio</span>;
                                    } else {
                                      return <span className="px-1.5 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[6.5px] font-black uppercase tracking-widest rounded border border-nectar-gold/20">Néctar Subdominio</span>;
                                    }
                                  })()}
                                </div>
                                <div className="flex flex-col gap-0.5 mt-0.5">
                                  <p className="text-[7px] font-bold text-foreground/45 uppercase tracking-wider">{contract.tax_id}</p>
                                  {(contract.tenant_custom_domain || contract.tenant_subdomain) && (() => {
                                    const host = typeof window !== 'undefined' ? window.location.hostname : '';
                                    let domain = contract.tenant_custom_domain
                                      ? `https://${contract.tenant_custom_domain}`
                                      : `https://${contract.tenant_subdomain}.nectarlabs.dev`;
                                    let urlDisplay = contract.tenant_custom_domain || `${contract.tenant_subdomain}.nectarlabs.dev`;

                                    if (!contract.tenant_custom_domain) {
                                      if (host.includes('localhost')) {
                                        domain = `http://nectarlabs.localhost/tenants/${contract.tenant_subdomain}`;
                                        urlDisplay = `nectarlabs.localhost/tenants/${contract.tenant_subdomain}`;
                                      } else if (host.includes('staging.nectarlabs.dev')) {
                                        domain = `https://${contract.tenant_subdomain}.staging.nectarlabs.dev`;
                                        urlDisplay = `${contract.tenant_subdomain}.staging.nectarlabs.dev`;
                                      }
                                    }

                                    return (
                                      <a
                                        href={domain}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-nectar-gold hover:underline font-extrabold text-[8px] mt-0.5"
                                      >
                                        🚀 {urlDisplay} ↗
                                      </a>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="py-4 font-bold text-xs">
                                {contract.plan_name || 'Solo Add-ons / Complementos'}
                              </td>
                              <td className="py-4 text-center text-[10px] font-bold opacity-60">
                                {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('es-ES') : '—'}
                              </td>
                              <td className="py-4 text-center text-[10px] font-bold opacity-60">
                                {contract.developer_signed_at ? new Date(contract.developer_signed_at).toLocaleDateString('es-ES') : '—'}
                              </td>
                              <td className="py-4 text-center">
                                {contract.is_fully_signed ? (
                                  <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full">Activo / Firmado</span>
                                ) : (
                                  <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[7px] font-black uppercase tracking-widest rounded-full">Pendiente Firma</span>
                                )}
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  {!contract.is_fully_signed && (
                                    <Link
                                      href={`/contract/dev-sign/${contract.id}`}
                                      className="px-3 py-1.5 bg-nectar-gold text-background hover:scale-105 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all"
                                    >
                                      Firmar
                                    </Link>
                                  )}
                                  {contract.pdf_file ? (
                                    <a
                                      href={getInlineViewUrl(contract.pdf_file, 'contract', contract.id)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 bg-card-border hover:bg-foreground hover:text-background text-[8px] font-black uppercase tracking-widest rounded-lg transition-all inline-block"
                                    >
                                      Descargar PDF
                                    </a>
                                  ) : (
                                    <span className="text-[8px] opacity-35 font-bold uppercase py-1.5 inline-block">Sin PDF</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {expandedContracts[contract.id] && (
                              <tr className="bg-background/40">
                                <td colSpan={8} className="p-8 border-b border-card-border/30">
                                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                    {/* Col 1: Addons Toggle Control (1/3 width) */}
                                    <div className="space-y-6">
                                      <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-nectar-gold">
                                          Control de Add-ons / Complementos
                                        </h4>
                                      </div>
                                      <div className="p-6 rounded-[2rem] bg-card-bg/95 border border-card-border/80 space-y-4">
                                        <p className="text-[10.5px] text-foreground/60 leading-relaxed uppercase tracking-wider">
                                          Activa o desactiva módulos de software específicos para este ecosistema. Se aprovisionarán automáticamente en su portal.
                                        </p>
                                        <div className="space-y-3 pt-2">
                                          {allAddons.map(addon => {
                                            const isActive = (contract.addons || []).includes(addon.slug);
                                            return (
                                              <div key={addon.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-background/50 border border-card-border/50 hover:border-nectar-gold/30 transition-all group">
                                                <div className="min-w-0 pr-3">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-black text-xs text-foreground group-hover:text-nectar-gold transition-colors">{addon.name}</span>
                                                    <span className="px-1.5 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7px] font-black uppercase tracking-widest rounded border border-nectar-gold/20">
                                                      {addon.category_badge}
                                                    </span>
                                                  </div>
                                                  <p className="text-[8.5px] text-foreground/50 truncate mt-1" title={addon.description}>
                                                    {addon.description}
                                                  </p>
                                                </div>

                                                {/* Premium gold toggle switch */}
                                                <button
                                                  onClick={() => handleToggleAddon(contract.id, addon.slug, isActive)}
                                                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none relative flex-shrink-0 ${isActive ? 'bg-nectar-gold' : 'bg-card-border'
                                                    }`}
                                                >
                                                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${isActive ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                                </button>
                                              </div>
                                            );
                                          })}
                                          {allAddons.length === 0 && (
                                            <p className="text-[9px] opacity-40 italic text-center py-4">No hay Add-ons registrados en el catálogo.</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Col 2 & 3: Installments (2/3 width) */}
                                    <div className="xl:col-span-2 space-y-6">
                                      <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-nectar-gold">
                                          Mensualidades Obligatorias del Contrato #{contract.id}
                                        </h4>
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40">
                                          {installments.filter(inst => inst.contract === contract.id && inst.status === 'PAID').length} de {installments.filter(inst => inst.contract === contract.id).length} Pagados
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {installments
                                          .filter(inst => inst.contract === contract.id)
                                          .sort((a, b) => a.installment_number - b.installment_number)
                                          .map(inst => (
                                            <div key={inst.id} className="p-5 rounded-2xl bg-card-bg/95 border border-card-border/80 flex flex-col justify-between gap-4 hover:border-nectar-gold/30 transition-all duration-300">
                                              <div className="flex justify-between items-start">
                                                <div>
                                                  <span className="text-[8px] font-black uppercase tracking-widest opacity-45">Mes {inst.installment_number} de 6</span>
                                                  <h5 className="font-black text-sm mt-0.5">${parseFloat(inst.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</h5>
                                                </div>
                                                <select
                                                  value={inst.status}
                                                  onChange={(e) => handleUpdateInstallmentStatus(inst.id, e.target.value)}
                                                  className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-wider rounded-full bg-background border focus:outline-none cursor-pointer transition-colors ${inst.status === 'PAID'
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
                                              </div>

                                              <div className="space-y-1.5 text-[9px] border-t border-card-border/40 pt-3">
                                                <div className="flex justify-between opacity-60">
                                                  <span>Vence:</span>
                                                  <span className="font-bold">{inst.due_date}</span>
                                                </div>
                                                {inst.receipt_file && (
                                                  <div className="flex justify-between items-center py-0.5">
                                                    <span>Comprobante:</span>
                                                    <a
                                                      href={getInlineViewUrl(inst.receipt_file, 'receipt', inst.id)}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="text-nectar-gold hover:underline font-bold"
                                                    >
                                                      Ver archivo ↗
                                                    </a>
                                                  </div>
                                                )}
                                              </div>

                                              {inst.status !== 'PAID' && inst.receipt_file && (
                                                <div className="mt-1">
                                                  <button
                                                    onClick={() => handleUpdateInstallmentStatus(inst.id, 'PAID')}
                                                    className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-[1.02] active:scale-95 transition-all shadow-md"
                                                  >
                                                    Aprobar Pago
                                                  </button>
                                                </div>
                                              )}

                                              {inst.status === 'PAID' && (
                                                <div className="mt-1 border-t border-card-border/30 pt-3 space-y-2">
                                                  {inst.cfdi_uuid ? (
                                                    <div className="text-left">
                                                      <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[6.5px] font-black uppercase tracking-widest rounded-full">SAT Timbrada</span>
                                                      <p className="text-[7px] font-mono text-foreground/45 mt-1 select-all break-all">{inst.cfdi_uuid}</p>
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center gap-1.5">
                                                      <input
                                                        type="text"
                                                        placeholder="UUID CFDI 4.0"
                                                        value={cfdiInputs[inst.id] || ""}
                                                        onChange={(e) => setCfdiInputs(prev => ({ ...prev, [inst.id]: e.target.value }))}
                                                        className="bg-background border border-card-border/80 rounded-md px-2 py-1 text-[7px] font-mono focus:outline-none focus:border-nectar-gold flex-1 text-foreground"
                                                      />
                                                      <button
                                                        onClick={() => handleSaveCFDI(inst.id)}
                                                        className="px-2 py-1 bg-nectar-gold text-background text-[7px] font-black uppercase tracking-widest rounded-md hover:scale-[1.02] active:scale-95 transition-all"
                                                      >
                                                        Guardar
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        {installments.filter(inst => inst.contract === contract.id).length === 0 && (
                                          <p className="col-span-full text-center text-xs opacity-40 font-bold py-6">No se han generado mensualidades para este contrato.</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Client Specific Section: Payment Commitment & Details (Closed Deal) */}
            {contracts.some(c => c.is_fully_signed) && (() => {
              const activeContracts = contracts.filter(c => c.is_fully_signed);
              const activeContract = selectedActiveContractId
                ? activeContracts.find(c => c.id === selectedActiveContractId) || activeContracts[0]
                : activeContracts[0];

              if (!activeContract) return null;

              const isAddonsOnly = !activeContract.plan;
              const activeInstallments = installments
                .filter(inst => inst.contract === activeContract.id)
                .sort((a, b) => a.installment_number - b.installment_number);
              const nextPending = activeInstallments.find(inst => inst.status !== 'PAID');
              const nextPendingMethod = nextPending
                ? (selectedPaymentMethods[nextPending.id] || nextPending.payment_method || activeContract.payment_commitment_method || 'SPEI')
                : (activeContract.payment_commitment_method || 'SPEI');
              const chosenMethod = activeContract.payment_commitment_method || 'SPEI';
              const nextPaymentDate = activeContract.next_payment_date || '';

              if (isAddonsOnly) {
                return (
                  <section id="payment-commitment-section" className="mb-16 p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {/* Left: Active Add-ons List */}
                      <div className="space-y-6 text-left">
                        <header>
                          <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest rounded-full">Suscripción Activa ✓</span>
                          <h2 className="text-3xl font-black tracking-tighter mt-3 mb-1">Mis Add-ons Activos</h2>
                          <p className="text-[9px] font-black uppercase tracking-widest text-nectar-gold opacity-80">Gestión de Suscripciones y Módulos Ecosistema</p>
                        </header>

                        <div className="space-y-4">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Módulos en Suscripción Directa</label>
                          <div className="space-y-3">
                            {addonSubscriptions.length > 0 ? (
                              addonSubscriptions.map(sub => (
                                <div key={sub.id} className="p-4 bg-background/30 border border-card-border rounded-xl flex items-center justify-between">
                                  <div>
                                    <span className="font-bold text-xs text-foreground block">{sub.addon_details?.name}</span>
                                    <span className="text-[8px] opacity-50 uppercase font-black">Ciclo: {sub.billing_cycle === 'yearly' ? 'Anual' : 'Mensual'} • Tarifa: ${parseFloat(sub.price_paid).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                                  </div>
                                  <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest rounded-md border border-green-500/20">
                                    Activo
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 bg-background/30 border border-card-border rounded-xl text-xs opacity-50 italic">
                                No tienes suscripciones de add-ons activas.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Facturapi CFDI Invoicing Info */}
                      <div className="p-8 rounded-[2rem] bg-background/40 border border-card-border/50 flex flex-col justify-between text-left">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-2">Facturación Fiscal Electrónica (Facturapi)</h4>
                          <p className="text-xs text-foreground/75 leading-relaxed">
                            Tus suscripciones de Add-ons se procesan de forma recurrente y segura a través de Stripe.
                          </p>
                          <p className="text-xs text-foreground/75 leading-relaxed">
                            De acuerdo con tu régimen fiscal y perfil de facturación, los CFDI oficiales correspondientes (timbrados con Facturapi) se emitirán automáticamente y estarán disponibles para descargar en la sección de <strong>"Mis Facturas (CFDI)"</strong> abajo al detectarse cada renovación.
                          </p>
                          <button
                            onClick={handleOpenBillingPortal}
                            className="w-full mt-4 py-2.5 bg-[#635BFF] hover:bg-[#5b53e8] text-white text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#635BFF]/10 active:scale-95 font-bold"
                          >
                            Pagar en Línea
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              }

              return (
                <section id="payment-commitment-section" className="mb-16 p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left: Commitment details & form */}
                    <div className="space-y-6 text-left">
                      <header>
                        <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest rounded-full">Trato Cerrado ✓</span>
                        <h2 className="text-3xl font-black tracking-tighter mt-3 mb-1">Compromiso de Pago</h2>
                        <p className="text-[9px] font-black uppercase tracking-widest text-nectar-gold opacity-80">Suscripción y Activación de Partner Tecnológico</p>
                        {activeContract.pdf_file && (
                          <div className="mt-2">
                            <a
                              href={getInlineViewUrl(activeContract.pdf_file, 'contract', activeContract.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-nectar-gold hover:underline"
                            >
                              📥 Descargar Contrato Certificado (PDF)
                            </a>
                          </div>
                        )}
                      </header>

                      {activeContracts.length > 1 && (
                        <div className="space-y-2 mt-4">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Seleccionar Contrato Activo</label>
                          <select
                            value={activeContract.id}
                            onChange={(e) => setSelectedActiveContractId(Number(e.target.value))}
                            className="w-full bg-background/50 border border-card-border rounded-xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-xs font-bold text-foreground"
                          >
                            {activeContracts.map(c => (
                              <option key={c.id} value={c.id}>{c.plan_name || 'Plan'} - Razón Social: {c.full_name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Fecha de Compromiso de Pago</label>
                          {isStaff ? (
                            <input
                              type="date"
                              value={nextPaymentDate}
                              onChange={(e) => handleUpdatePaymentDate(activeContract.id, e.target.value)}
                              className="w-full bg-background/50 border border-card-border rounded-xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-xs font-bold text-foreground"
                            />
                          ) : (
                            <div className="w-full bg-background/30 border border-card-border rounded-xl p-4 flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">{formatDate(nextPaymentDate)}</span>
                              <span className="px-2.5 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full">
                                Estipulado
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Medio de Pago Seleccionado</label>
                          <select
                            value={chosenMethod}
                            onChange={(e) => handleUpdatePaymentMethod(activeContract.id, e.target.value)}
                            className="w-full bg-background/50 border border-card-border rounded-xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-xs font-bold text-foreground appearance-none"
                          >
                            <option value="SPEI">Transferencia Electrónica (SPEI)</option>
                            <option value="DEPOSIT">Depósito Directo / Practicaja (BBVA)</option>
                            <option value="STRIPE">Tarjeta de Crédito o Débito (Stripe)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Right: Specific Instructions depending on the chosen method */}
                    <div className="p-8 rounded-[2rem] bg-background/40 border border-card-border/50 flex flex-col justify-between text-left">
                      {nextPendingMethod === 'STRIPE' && (
                        <div className="space-y-6 flex flex-col justify-between h-full">
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-2">Pago en línea seguro</h4>
                            <p className="text-xs text-foreground/75 leading-relaxed">
                              Realiza tu pago directamente con tarjeta a través de Stripe de manera segura y encriptada. El cobro se procesará automáticamente al inicio de cada ciclo de facturación.
                            </p>
                            <p className="text-xs text-foreground/75 leading-relaxed mt-2">
                              Los comprobantes fiscales CFDI oficiales correspondientes a cada ciclo se generarán automáticamente y se enlistarán en la sección de <strong>"Mis Facturas (CFDI)"</strong> abajo para su descarga.
                            </p>
                          </div>
                        </div>
                      )}

                      {nextPendingMethod === 'SPEI' && (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-2">Instrucciones de Transferencia SPEI</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-card-border/30 py-2">
                              <span className="opacity-50">Banco Destino:</span>
                              <span className="font-bold">BBVA México</span>
                            </div>
                            <div className="flex justify-between border-b border-card-border/30 py-2">
                              <span className="opacity-50">Beneficiario:</span>
                              <span className="font-bold">Jesus Saul Villegas Cruz</span>
                            </div>
                            <div className="flex justify-between border-b border-card-border/30 py-2">
                              <span className="opacity-50">Cuenta CLABE:</span>
                              <span className="font-bold tracking-wider select-all cursor-pointer hover:text-nectar-gold transition-colors">012 760 02936549837 8</span>
                            </div>
                            <div className="flex justify-between py-2">
                              <span className="opacity-50">Celular Vinculado:</span>
                              <span className="font-bold">66 2139 0238</span>
                            </div>
                          </div>
                          <p className="text-[8px] opacity-40 uppercase tracking-wider text-center mt-4">
                            * Envía tu comprobante de pago a contacto@finanzasparahippies.com
                          </p>
                        </div>
                      )}

                      {nextPendingMethod === 'DEPOSIT' && (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-2">Instrucciones de Depósito Directo</h4>
                          <p className="text-[10px] text-foreground/75 leading-relaxed mb-4">
                            Puedes realizar tu depósito directo en cualquier sucursal BBVA o Practicaja utilizando los siguientes datos:
                          </p>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-card-border/30 py-2">
                              <span className="opacity-50">Beneficiario:</span>
                              <span className="font-bold">Jesus Saul Villegas Cruz</span>
                            </div>
                            <div className="flex justify-between border-b border-card-border/30 py-2">
                              <span className="opacity-50">Tarjeta de Débito:</span>
                              <span className="font-bold tracking-wider select-all cursor-pointer hover:text-nectar-gold transition-colors">4152 3144 3553 5540</span>
                            </div>
                          </div>
                          <p className="text-[8px] opacity-40 uppercase tracking-wider text-center mt-4">
                            * Envía tu comprobante de pago a contacto@finanzasparahippies.com
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Referral and Promo Code Row */}
                  {(() => {
                    const nextPendingInstallment = installments.find(inst => inst.contract === activeContract.id && inst.installment_type === 'DEVELOPMENT' && inst.status === 'PENDING');
                    const showRetroactiveCouponInput = nextPendingInstallment && !nextPendingInstallment.promo_code && parseFloat(nextPendingInstallment.discount_percentage || '0') === 0;

                    if (!myReferralCode && !showRetroactiveCouponInput) return null;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 border-t border-card-border/50 pt-10">
                        {/* Referral Card */}
                        {myReferralCode && (
                          <div className="p-6 rounded-2xl bg-card-bg border border-card-border relative overflow-hidden group shadow-lg flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-nectar-gold/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="relative z-10 space-y-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7.5px] font-black uppercase tracking-widest rounded-full">Programa de Referidos</span>
                                  <h4 className="text-lg font-black tracking-tight mt-2">Invita a un amigo y ambos ganan</h4>
                                  <p className="text-[10px] text-foreground/60 mt-1 leading-relaxed">
                                    Comparte tu código: tu referido obtiene un <strong>10% de descuento</strong> en su primer mes, y tú recibes un <strong>10% de descuento</strong> en tu siguiente mensualidad.
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[8px] uppercase tracking-widest opacity-40 block font-black">Referidos</span>
                                  <span className="text-2xl font-black text-nectar-gold font-mono">{myReferralCode.used_count || 0}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 bg-background border border-card-border rounded-xl p-3 justify-between">
                                <span className="font-mono text-sm font-black tracking-wider text-foreground select-all">{myReferralCode.code}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(myReferralCode.code);
                                    showToast("¡Código de referido copiado al portapapeles!", "success");
                                  }}
                                  className="px-4 py-2 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shrink-0 font-bold"
                                >
                                  Copiar Código
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Retroactive Coupon Input Card */}
                        {showRetroactiveCouponInput ? (
                          <div className="p-6 rounded-2xl bg-card-bg border border-card-border relative overflow-hidden group shadow-lg flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-nectar-gold/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="relative z-10 space-y-4">
                              <div>
                                <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7.5px] font-black uppercase tracking-widest rounded-full">Descuento Especial</span>
                                <h4 className="text-lg font-black tracking-tight mt-2">Aplicar Cupón a tu Siguiente Pago</h4>
                                <p className="text-[10px] text-foreground/60 mt-1 leading-relaxed">
                                  Aplica un código promocional o de referido para descontar tu próxima mensualidad (Mes {nextPendingInstallment.installment_number}).
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="CÓDIGO CUPÓN"
                                  value={retroactiveCodeInput}
                                  onChange={(e) => setRetroactiveCodeInput(e.target.value.toUpperCase())}
                                  className="flex-1 bg-background border border-card-border rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-nectar-gold text-foreground uppercase font-bold"
                                />
                                <button
                                  onClick={handleApplyRetroactiveCode}
                                  disabled={applyingRetroactiveCode || !retroactiveCodeInput.trim()}
                                  className="px-6 bg-nectar-gold hover:bg-nectar-gold/90 text-background rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 font-bold"
                                >
                                  {applyingRetroactiveCode ? 'Aplicando...' : 'Aplicar'}
                                </button>
                              </div>

                              <div className="pt-2 flex justify-between items-center text-[9px] uppercase tracking-wider border-t border-card-border/40">
                                <span className="text-foreground/40 font-bold">¿Quieres un código personalizado?</span>
                                <button
                                  type="button"
                                  onClick={() => setShowSupportModal(true)}
                                  className="text-nectar-gold hover:underline font-black cursor-pointer bg-transparent border-0 p-0"
                                >
                                  Solicitar a Soporte
                                </button>
                              </div>

                              {retroactiveSuccessMessage && (
                                <p className="text-[9px] text-green-400 font-bold bg-green-500/5 p-2 rounded border border-green-500/10 animate-in fade-in">
                                  ✓ {retroactiveSuccessMessage}
                                </p>
                              )}
                              {retroactiveErrorMessage && (
                                <p className="text-[9px] text-red-500 font-bold bg-red-500/5 p-2 rounded border border-red-500/10 animate-in fade-in">
                                  ✗ {retroactiveErrorMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 rounded-2xl bg-card-bg border border-card-border relative overflow-hidden group shadow-lg flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-nectar-forest/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                              <div>
                                <span className="px-2 py-0.5 bg-nectar-forest/10 text-nectar-forest text-[7.5px] font-black uppercase tracking-widest rounded-full">Información</span>
                                <h4 className="text-lg font-black tracking-tight mt-2">Ecosistema Néctar Labs</h4>
                                <p className="text-[10px] text-foreground/60 mt-1 leading-relaxed">
                                  Tu infraestructura de Partner Tecnológico se aprovisiona y mantiene activa las 24 horas del día. Si requieres más ayuda, abre un ticket de soporte.
                                </p>
                              </div>
                              <div className="pt-2 flex justify-between items-center text-[9px] uppercase tracking-wider border-t border-card-border/40">
                                <span className="text-foreground/40 font-bold">¿Tienes requerimientos especiales?</span>
                                <button
                                  type="button"
                                  onClick={() => setShowSupportModal(true)}
                                  className="text-nectar-gold hover:underline font-black cursor-pointer bg-transparent border-0 p-0"
                                >
                                  Contactar Soporte
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Monthly Payments (6 months commitment) */}
                  <div className="mt-12 border-t border-card-border/50 pt-10">
                    {(() => {
                      const activeInstallments = installments
                        .filter(inst => inst.contract === activeContract.id)
                        .sort((a, b) => a.installment_number - b.installment_number);

                      const nextPending = activeInstallments.find(inst => inst.status !== 'PAID');

                      return (
                        <>
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black tracking-tight">Mensualidades de Ingeniería</h3>
                            {activeInstallments.length > 0 && (
                              <button
                                onClick={() => setPaymentsExpanded(!paymentsExpanded)}
                                className="px-4 py-2 border border-card-border hover:bg-foreground hover:text-background text-[8px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                              >
                                <span>{paymentsExpanded ? 'Ocultar Calendario' : 'Ver Calendario Completo'}</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  className={`w-3.5 h-3.5 transition-transform duration-300 ${paymentsExpanded ? 'rotate-180' : ''}`}
                                >
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Next Pending Payment Highlight Card */}
                          {nextPending ? (
                            <div className="mb-6 p-6 rounded-2xl bg-nectar-gold/5 border-2 border-nectar-gold/30 shadow-lg relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-nectar-gold/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                              <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7.5px] font-black uppercase tracking-widest rounded-full">Próximo Pago Requerido</span>
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-4">
                                <div className="min-w-0">
                                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                                    Mes {nextPending.installment_number} de 6
                                  </span>
                                  {nextPending.project_name && (
                                    <span className="text-[9px] font-bold text-nectar-gold truncate max-w-[150px]">
                                      • {nextPending.project_name}
                                    </span>
                                  )}
                                  <h4 className="font-bold text-sm text-foreground mt-0.5">
                                    Mensualidad de Ingeniería
                                  </h4>
                                  <p className="text-[10px] text-foreground/50 mt-1">
                                    Vencimiento: <span className="font-semibold text-foreground/80">{formatDate(nextPending.due_date)}</span>
                                  </p>
                                  {nextPending.cfdi_uuid && (
                                    <p className="text-[9px] text-green-500 font-bold mt-1">
                                      Folio Fiscal SAT: <span className="font-mono select-all text-[8px] tracking-tight">{nextPending.cfdi_uuid}</span>
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-6">
                                  <div className="text-left md:text-right min-w-[120px]">
                                    <span className="text-[8px] uppercase tracking-widest opacity-40 block font-black">Monto</span>
                                    <span className="font-black text-base text-foreground font-mono">
                                      ${(parseFloat(nextPending.amount) * (wantsInvoiceMap[nextPending.id] ? 1.16 : 1.0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                    </span>
                                    {wantsInvoiceMap[nextPending.id] && (
                                      <span className="text-[7px] text-green-400 block font-bold uppercase mt-0.5">Con 16% IVA</span>
                                    )}
                                  </div>

                                  <div className="w-full md:w-auto min-w-[160px] flex flex-col gap-2 justify-end bg-background/25 border border-card-border/40 p-3 rounded-xl">
                                    {/* Selector de Método de Pago */}
                                    <div className="flex flex-col gap-1 w-full text-left">
                                      <label className="text-[7px] font-black uppercase tracking-widest opacity-40">Método de Pago</label>
                                      <select
                                        value={nextPendingMethod}
                                        onChange={(e) => setSelectedPaymentMethods(prev => ({ ...prev, [nextPending.id]: e.target.value }))}
                                        className="w-full bg-background/50 border border-card-border rounded-lg px-2 py-1 focus:outline-none focus:border-nectar-gold text-[9px] font-bold text-foreground"
                                      >
                                        <option value="SPEI">SPEI (Transferencia)</option>
                                        <option value="DEPOSIT">Depósito (BBVA)</option>
                                        <option value="STRIPE">Tarjeta (Stripe)</option>
                                      </select>
                                    </div>

                                    {/* Checkbox Facturar */}
                                    <div className="flex items-center gap-2 justify-end mt-1">
                                      <input
                                        type="checkbox"
                                        id={`wants-invoice-${nextPending.id}`}
                                        checked={!!wantsInvoiceMap[nextPending.id]}
                                        onChange={(e) => setWantsInvoiceMap(prev => ({ ...prev, [nextPending.id]: e.target.checked }))}
                                        className="rounded border-card-border bg-card-bg dark:border-white/20 dark:bg-black/40 text-nectar-gold focus:ring-nectar-gold w-3 h-3 cursor-pointer"
                                      />
                                      <label htmlFor={`wants-invoice-${nextPending.id}`} className="text-[8px] uppercase tracking-wider font-bold text-foreground/60 cursor-pointer select-none">
                                        Facturar (+16% IVA)
                                      </label>
                                    </div>

                                    {/* Botón de Acción */}
                                    {nextPendingMethod === 'STRIPE' ? (
                                      <button
                                        onClick={() => handlePayStripe(nextPending.id)}
                                        className="w-full py-2 bg-[#635BFF] hover:bg-[#5b53e8] text-white text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#635BFF]/10 active:scale-95 font-bold mt-1"
                                      >
                                        Pagar con Stripe
                                      </button>
                                    ) : nextPending.receipt_file ? (
                                      <p className="text-[8px] text-center opacity-60 italic font-bold py-2 px-4 bg-background/40 rounded-xl border border-card-border/30 w-full mt-1">
                                        Comprobante en validación
                                      </p>
                                    ) : (
                                      <label className="w-full block py-2 border border-dashed border-nectar-gold/50 text-nectar-gold hover:bg-nectar-gold hover:text-background text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer hover:border-solid font-bold mt-1">
                                        Subir Comprobante
                                        <input
                                          type="file"
                                          accept="image/*,application/pdf"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadReceipt(nextPending.id, file);
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            activeInstallments.length > 0 && (
                              <div className="mb-6 p-6 rounded-2xl bg-green-500/5 border border-green-500/20 text-center">
                                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">✓ Todos tus compromisos de pago están al corriente</span>
                              </div>
                            )
                          )}

                          {/* Collapsible Full Calendar */}
                          {paymentsExpanded && (
                            <div className="mt-6 animate-fadeIn">
                              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-4 block">Calendario Completo de Pagos</span>
                              <div className="overflow-x-auto bg-background/30 rounded-2xl border border-card-border/60">
                                <table className="w-full text-left border-collapse min-w-[650px]">
                                  <thead>
                                    <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                                      <th className="p-4 pl-6">Mensualidad</th>
                                      <th className="p-4">Vencimiento</th>
                                      <th className="p-4 text-right">Monto</th>
                                      <th className="p-4 text-center">Estatus</th>
                                      <th className="p-4 text-right pr-6">Acción / Comprobante</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activeInstallments.map((inst) => {
                                      const isPaid = inst.status === 'PAID';
                                      const isPendingReview = !isPaid && inst.receipt_file;
                                      const instMethod = selectedPaymentMethods[inst.id] || inst.payment_method || activeContract.payment_commitment_method || 'SPEI';
                                      let statusText = 'Pendiente';
                                      let bgClass = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                                      if (isPaid) {
                                        statusText = 'Pagado';
                                        bgClass = 'bg-green-500/10 text-green-500 border-green-500/20';
                                      } else if (isPendingReview) {
                                        statusText = 'En Revisión';
                                        bgClass = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
                                      }

                                      return (
                                        <tr key={inst.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.01] transition-colors">
                                          <td className="p-4 pl-6">
                                            <div className="flex items-center gap-2">
                                              <span className="w-5 h-5 rounded-full bg-foreground/5 flex items-center justify-center text-[9px] font-bold text-foreground/70">
                                                {inst.installment_number}
                                              </span>
                                              <div>
                                                <span className="font-bold text-xs">Mes {inst.installment_number}</span>
                                                {inst.project_name && (
                                                  <p className="text-[7.5px] font-bold text-nectar-gold uppercase tracking-wider mt-0.5 max-w-[120px] truncate">{inst.project_name}</p>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                          <td className="p-4 text-xs font-medium text-foreground/75">
                                            {formatDate(inst.due_date)}
                                          </td>
                                          <td className="p-4 text-right font-mono font-bold text-xs text-foreground">
                                            <div>
                                              ${(parseFloat(inst.amount) * (wantsInvoiceMap[inst.id] ? 1.16 : 1.0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                            </div>
                                            {wantsInvoiceMap[inst.id] && (
                                              <span className="text-[7.5px] text-green-400 font-bold uppercase block mt-0.5">Con 16% IVA</span>
                                            )}
                                          </td>
                                          <td className="p-4 text-center">
                                            <span className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-full border ${bgClass}`}>
                                              {statusText}
                                            </span>
                                          </td>
                                          <td className="p-4 text-right pr-6">
                                            {!isPaid ? (
                                              <div className="flex flex-col items-end gap-1.5 justify-end">
                                                {/* Selector de Método de Pago */}
                                                <select
                                                  value={instMethod}
                                                  onChange={(e) => setSelectedPaymentMethods(prev => ({ ...prev, [inst.id]: e.target.value }))}
                                                  className="bg-background/50 border border-card-border rounded-lg px-2 py-1 focus:outline-none focus:border-nectar-gold text-[9px] font-bold text-foreground"
                                                >
                                                  <option value="SPEI">SPEI (Trans.)</option>
                                                  <option value="DEPOSIT">Depósito</option>
                                                  <option value="STRIPE">Tarjeta (Stripe)</option>
                                                </select>

                                                {/* Checkbox Facturar */}
                                                <div className="flex items-center gap-1.5 justify-end">
                                                  <input
                                                    type="checkbox"
                                                    id={`wants-invoice-${inst.id}`}
                                                    checked={!!wantsInvoiceMap[inst.id]}
                                                    onChange={(e) => setWantsInvoiceMap(prev => ({ ...prev, [inst.id]: e.target.checked }))}
                                                    className="rounded border-card-border bg-card-bg dark:border-white/20 dark:bg-black/40 text-nectar-gold focus:ring-nectar-gold w-3 h-3 cursor-pointer"
                                                  />
                                                  <label htmlFor={`wants-invoice-${inst.id}`} className="text-[7.5px] uppercase font-bold text-foreground/50 cursor-pointer select-none">
                                                    Facturar (+16%)
                                                  </label>
                                                </div>

                                                {instMethod === 'STRIPE' ? (
                                                  <button
                                                    onClick={() => handlePayStripe(inst.id)}
                                                    className="px-3 py-1.5 bg-[#635BFF] hover:bg-[#5b53e8] text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all"
                                                  >
                                                    Pagar con Stripe
                                                  </button>
                                                ) : isPendingReview ? (
                                                  <span className="text-[8px] font-bold opacity-60 italic py-1 px-2.5 bg-background/50 rounded border border-card-border/30">
                                                    Validando...
                                                  </span>
                                                ) : (
                                                  <label className="px-3 py-1.5 border border-dashed border-nectar-gold/50 text-nectar-gold hover:bg-nectar-gold hover:text-background text-[8px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer">
                                                    Subir Comprobante
                                                    <input
                                                      type="file"
                                                      accept="image/*,application/pdf"
                                                      className="hidden"
                                                      onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleUploadReceipt(inst.id, file);
                                                      }}
                                                    />
                                                  </label>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-end gap-2">
                                                <span className="text-xs text-green-500 font-bold">✓ Pagado</span>
                                                {(() => {
                                                  const myTenant = tenants.find(t => t.owner === currentUser?.id) || tenants[0];
                                                  const hasCFDI = inst.cfdi_uuid && inst.cfdi_uuid !== 'FAILED' && inst.cfdi_uuid !== 'LCO_PENDING';
                                                  const isManualAdmin = myTenant?.invoicing_mode === 'MANUAL_ADMIN';

                                                  if (!hasCFDI && !isManualAdmin) {
                                                    const isPending = inst.cfdi_uuid === 'LCO_PENDING';
                                                    return (
                                                      <button
                                                        onClick={() => handleRequestInvoice(inst.id)}
                                                        disabled={isPending || requestingInvoice === inst.id}
                                                        className="px-2.5 py-1 bg-nectar-gold/10 text-nectar-gold hover:bg-nectar-gold hover:text-background text-[8px] font-black uppercase tracking-widest rounded-lg border border-nectar-gold/20 transition-all disabled:opacity-50"
                                                      >
                                                        {isPending ? 'Sincronizando SAT...' : requestingInvoice === inst.id ? 'Emitiendo...' : 'Solicitar Factura (CFDI)'}
                                                      </button>
                                                    );
                                                  } else if (hasCFDI) {
                                                    return (
                                                      <span className="text-[9px] font-mono text-foreground/45 font-bold block select-all">
                                                        CFDI: {inst.cfdi_uuid}
                                                      </span>
                                                    );
                                                  }
                                                  return null;
                                                })()}
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {activeInstallments.length === 0 && (
                            <p className="text-center text-xs opacity-40 font-bold py-6">Las mensualidades se generarán una vez que el trato sea firmado por el administrador.</p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </section>
              );
            })()}

            {/* Mis Facturas (CFDI) for Client/Customer */}
            {!isStaff && invoices.length > 0 && (
              <section className="mb-16 bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg text-left">
                <div className="mb-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Mis Facturas (CFDI)</h3>
                  <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Historial de comprobantes fiscales timbrados emitidos para tu portal</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                        <th className="pb-4">Fecha</th>
                        <th className="pb-4">Folio Fiscal SAT (UUID)</th>
                        <th className="pb-4 text-right">Monto</th>
                        <th className="pb-4 text-center">Estatus</th>
                        <th className="pb-4 text-right">Descargar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.filter(inv => !inv.is_tenant_to_customer).map((inv) => (
                        <tr key={inv.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.01] transition-colors">
                          <td className="py-4 text-xs font-mono opacity-80">
                            {new Date(inv.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-4 font-mono text-[9px] opacity-75 select-all max-w-[250px] truncate" title={inv.uuid_sat || 'No asignado'}>
                            {inv.uuid_sat || '—'}
                          </td>
                          <td className="py-4 text-right font-black text-xs">
                            ${parseFloat(inv.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                          </td>
                          <td className="py-4 text-center">
                            <span className="px-2.5 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-full bg-green-500/10 text-green-500 border border-green-500/25">
                              {inv.status_display}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {inv.pdf_url && (
                                <a
                                  href={inv.pdf_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-card-border hover:bg-foreground hover:text-background text-[8px] font-black uppercase tracking-widest rounded-lg transition-all font-bold"
                                >
                                  PDF
                                </a>
                              )}
                              {inv.xml_url && (
                                <a
                                  href={inv.xml_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-card-border hover:bg-foreground hover:text-background text-[8px] font-black uppercase tracking-widest rounded-lg transition-all font-bold"
                                >
                                  XML
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Client Specific Sections: Pending Contracts & Empty Onboarding Banner */}
            {!isStaff && contracts.some(c => !c.is_fully_signed) && (
              <section className="mb-16 p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <h2 className="text-2xl font-black tracking-tighter mb-4">Contrataciones en Proceso</h2>
                <p className="text-xs text-foreground/60 mb-6 uppercase tracking-wider">
                  Acciones requeridas o estatus de tus propuestas comerciales activas.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {contracts.filter(c => !c.is_fully_signed).map(contract => {
                    const hasClientSignature = !!contract.signature_base64;
                    return (
                      <div key={contract.id} className="bg-background/40 border border-card-border/60 p-6 rounded-2xl flex flex-col justify-between">
                        <div>
                          {hasClientSignature ? (
                            <span className="px-2.5 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full animate-pulse border border-nectar-gold/25">
                              Esperando Firma de Néctar Labs
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-red-500/25">
                              Acción Requerida: Pendiente de tu firma
                            </span>
                          )}
                          <h4 className="font-black text-sm mt-3">{contract.plan_name || 'Plan de Ingeniería'}</h4>
                          <p className="text-xs text-foreground/75 mt-2">
                            {hasClientSignature
                              ? "Hemos recibido tu firma. Nuestro equipo técnico está validando los detalles para activar tu nuevo ecosistema."
                              : "Tu propuesta comercial de proyecto ha sido aprobada. Revisa los términos y firma el contrato digitalmente."
                            }
                          </p>
                          <p className="text-[9px] font-bold opacity-60 mt-2">Razón Social: {contract.full_name}</p>
                          <p className="text-[8px] font-bold opacity-40 mt-1">Registrado: {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('es-ES') : '—'}</p>
                        </div>
                        <div className="flex gap-2 mt-6">
                          {!hasClientSignature ? (
                            <Link
                              href={`/contract/sign/${contract.id}`}
                              className="flex-1 py-2.5 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-center rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-all font-bold hover:scale-[1.02] active:scale-95 shadow-lg shadow-nectar-gold/10"
                            >
                              Revisar y Firmar Contrato
                            </Link>
                          ) : (
                            contract.pdf_file && (
                              <a
                                href={getInlineViewUrl(contract.pdf_file, 'contract', contract.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2.5 bg-card-border hover:bg-foreground hover:text-background text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all inline-block font-bold"
                              >
                                Ver Contrato Parcial (PDF)
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {!isStaff && !loading && !fetching && projects.length === 0 && contracts.length === 0 && (
              <section className="mb-16 p-12 rounded-[3.5rem] bg-nectar-forest text-nectar-cream border-4 border-nectar-gold shadow-2xl relative overflow-hidden group">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-nectar-gold/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                <div className="relative z-10 max-w-2xl">
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-none">Tu Arquitectura está lista para despegar.</h2>
                  <p className="text-xl font-bold opacity-80 mb-10 leading-relaxed">
                    Solo falta un paso para activar tu ecosistema de ingeniería. Firma tu contrato de Partner Tecnológico y comencemos a construir.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/onboarding" className="inline-block px-12 py-6 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-nectar-gold/20">
                      Finalizar Onboarding
                    </Link>
                    <Link href="/dashboard/addons" className="inline-block px-12 py-6 border border-nectar-gold text-nectar-gold hover:bg-nectar-gold/10 font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all">
                      Contratar un Add-on
                    </Link>
                  </div>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
              {/* Left Side: Projects & Logs */}
              <div className="xl:col-span-2 space-y-16">
                <section>
                  <div className="flex justify-between items-end mb-8">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">
                      {isStaff ? 'Todos los Proyectos' : 'Proyectos Activos'}
                    </h2>
                    <div className="h-0.5 flex-1 mx-8 bg-card-border mb-1.5 opacity-20"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fetching ? (
                      <>
                        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border animate-pulse h-64 flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="h-6 bg-foreground/10 rounded w-1/2"></div>
                            <div className="h-3 bg-foreground/10 rounded w-5/6"></div>
                          </div>
                          <div className="h-8 bg-foreground/10 rounded w-1/4"></div>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border animate-pulse h-64 flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="h-6 bg-foreground/10 rounded w-1/2"></div>
                            <div className="h-3 bg-foreground/10 rounded w-5/6"></div>
                          </div>
                          <div className="h-8 bg-foreground/10 rounded w-1/4"></div>
                        </div>
                      </>
                    ) : projects.map(project => {
                      const isDesignerUser = userRole === 'DESIGNER';
                      const planHours = isDesignerUser ? (project.designer_plan_hours || 0) : (project.plan_hours || 0);
                      const usedHours = isDesignerUser ? (project.designer_used_hours_current_month || 0) : (project.used_hours_current_month || 0);
                      const remHours = isDesignerUser ? (project.designer_remaining_hours_current_month || 0) : (project.remaining_hours_current_month || 0);
                      const percent = planHours > 0 ? Math.min(100, (usedHours / planHours) * 100) : 0;
                      const radius = 36;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (percent / 100) * circumference;

                      return (
                        <div key={project.id} className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
                          <div className="absolute -top-12 -right-12 w-32 h-32 bg-nectar-gold/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                          <div>
                            <div className="flex justify-between items-start mb-10">
                              <div className="space-y-1">
                                <h3 className="text-2xl font-black tracking-tight">{project.name}</h3>
                                {isStaff && project.client_username && <p className="text-[8px] font-bold text-nectar-gold opacity-60">Cliente: {project.client_username}</p>}
                                {project.designer_email && <p className="text-[8px] font-bold text-foreground/45 uppercase tracking-wider">Diseñador: {project.designer_email}</p>}
                              </div>
                              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full">{project.status}</span>
                            </div>

                            <div className="mb-10 flex items-center gap-6">
                              {/* Circular Progress */}
                              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="56" cy="56" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-card-border" />
                                  <circle
                                    cx="56"
                                    cy="56"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="transparent"
                                    className="text-nectar-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.4)] transition-all duration-1000 ease-out"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                                  <span className="text-2xl font-black leading-none tracking-tighter">{formatHoursToHM(remHours)}</span>
                                  <span className="text-[8px] font-black text-foreground/40 uppercase tracking-widest mt-1">HRS REST</span>
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex flex-col gap-3">
                                <h4 className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">{isDesignerUser ? 'Horas de Diseño' : 'Horas de Desarrollo'}</h4>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-card-border"></div>
                                    <span className="text-xs font-bold opacity-60">Total Plan:</span>
                                    <span className="text-xs font-black">{formatHoursToHM(planHours)} h</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-nectar-gold"></div>
                                    <span className="text-xs font-bold opacity-60">Consumidas:</span>
                                    <span className="text-xs font-black">{formatHoursToHM(usedHours)} h</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {project.staging_url && (
                              <a href={project.staging_url} target="_blank" className="flex-1 py-3 bg-card-border hover:bg-foreground hover:text-background text-center rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                Ver Staging
                              </a>
                            )}
                            {project.production_url && (
                              <a href={project.production_url} target="_blank" className="flex-1 py-3 border border-nectar-gold text-nectar-gold hover:bg-nectar-gold hover:text-background text-center rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                Producción
                              </a>
                            )}
                            {isStaff && (
                              <button
                                onClick={() => handleDeleteProject(project.id, project.name)}
                                className="px-4 bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center border border-red-500/20"
                                title="Eliminar Proyecto"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {projects.length === 0 && (
                      isAddonOnly ? (
                        <div className="col-span-full p-10 rounded-[3rem] bg-card-bg border border-card-border relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-550">
                          {/* Decorative blur elements */}
                          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-nectar-gold/15 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                          <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-nectar-forest/10 rounded-full blur-3xl"></div>

                          <div className="relative z-10 space-y-6">
                            <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                              Servicio de Add-ons Activo
                            </span>

                            <h3 className="text-3xl font-black tracking-tighter text-foreground leading-none">
                              ¡Bienvenido a tu Suite de Add-ons!
                            </h3>

                            <p className="text-sm font-bold text-foreground/75 leading-relaxed max-w-2xl">
                              Tu portal de soporte y herramientas públicas ha sido aprovisionado de manera automática. Hemos asignado una dirección personalizada para tu negocio bajo el subdominio de Néctar Labs.
                            </p>

                            {tenants.length > 0 && (
                              <div className="p-6 bg-background/50 border border-card-border/60 rounded-2xl space-y-4 max-w-xl">
                                <div className="flex justify-between items-center text-xs text-foreground/80">
                                  <span>Subdominio de tu Portal:</span>
                                  <span className="font-mono text-nectar-gold font-bold select-all">
                                    {(() => {
                                      const tenant = tenants[0];
                                      const host = typeof window !== 'undefined' ? window.location.hostname : '';
                                      if (host.includes('localhost')) return `nectarlabs.localhost/tenants/${tenant.subdomain}`;
                                      if (host.includes('staging.nectarlabs.dev')) return `${tenant.subdomain}.staging.nectarlabs.dev`;
                                      return `${tenant.subdomain}.nectarlabs.dev`;
                                    })()}
                                  </span>
                                </div>
                                <div className="h-px bg-card-border/40"></div>
                                <div className="text-[10px] leading-relaxed text-foreground/60">
                                  <span className="text-nectar-gold font-black uppercase tracking-widest block mb-1">Nota sobre Dominios Personalizados</span>
                                  Si prefieres mapear un dominio propio (ej. <span className="font-mono">soporte.tudominio.com</span>), podemos ayudarte a integrarlo mediante un contrato adicional. Los costos de dominio varían según disponibilidad y proveedor.
                                </div>
                              </div>
                            )}

                            <p className="text-xs text-foreground/60 leading-relaxed max-w-2xl">
                              Puedes personalizar la marca (logotipo, colores, textos del pie de página y mensaje de bienvenida de tu asistente IA) ingresando a la sección de <strong className="text-nectar-gold">Configuración Negocio</strong> desde el menú lateral.
                            </p>

                            <div className="flex flex-wrap gap-4 pt-4">
                              <Link
                                href="/dashboard/tenant-settings"
                                className="px-8 py-3 bg-nectar-gold text-background font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-nectar-gold/15"
                              >
                                Personalizar Portal
                              </Link>

                              {tenants.length > 0 && (
                                <a
                                  href={(() => {
                                    const tenant = tenants[0];
                                    const host = typeof window !== 'undefined' ? window.location.hostname : '';
                                    if (host.includes('localhost')) return `http://nectarlabs.localhost/tenants/${tenant.subdomain}`;
                                    if (host.includes('staging.nectarlabs.dev')) return `https://${tenant.subdomain}.staging.nectarlabs.dev`;
                                    return `https://${tenant.subdomain}.nectarlabs.dev`;
                                  })()}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-8 py-3 bg-card-border hover:bg-foreground hover:text-background text-foreground font-black uppercase tracking-widest text-[10px] rounded-xl transition-all border border-card-border"
                                >
                                  Abrir Portal Público ↗
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-card-border rounded-[2.5rem] opacity-30">
                          <p className="font-bold uppercase tracking-widest text-xs">No hay proyectos activos registrados.</p>
                        </div>
                      )
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex justify-between items-end mb-8">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Bitácora de Desarrollo</h2>
                    <div className="h-0.5 flex-1 mx-8 bg-card-border mb-1.5 opacity-20"></div>
                  </div>
                  <div className="bg-card-bg border border-card-border rounded-[2.5rem] overflow-hidden">
                    <WeeklyLogs logs={logs} />
                  </div>
                </section>
              </div>

              {/* Right Side: Support & Infrastructure */}
              <div className="space-y-12">
                <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8">
                  <div className="flex justify-between items-center mb-10">
                    <h2 className="text-xs font-black tracking-[0.3em] uppercase opacity-30">
                      {isStaff ? 'Tickets del Sistema' : 'Soporte Activo'}
                    </h2>
                    {!isStaff && <button className="w-10 h-10 rounded-2xl bg-nectar-gold text-background flex items-center justify-center font-black hover:rotate-12 transition-all shadow-lg shadow-nectar-gold/20">+</button>}
                  </div>

                  <div className="space-y-3">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="p-5 rounded-2xl border border-card-border hover:bg-foreground/5 transition-all group">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[7px] font-black uppercase tracking-widest text-nectar-gold">{ticket.category}</span>
                          <span className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground/80 group-hover:text-foreground transition-colors">{ticket.title}</h4>
                        {isStaff && <p className="text-[7px] font-bold opacity-40 mt-1 uppercase">{ticket.user_email}</p>}
                      </div>
                    ))}
                    {tickets.length === 0 && <p className="text-center py-10 opacity-20 font-bold uppercase tracking-widest text-[10px]">Sin requerimientos pendientes</p>}
                  </div>
                </section>

                <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8">
                  <h2 className="text-xs font-black tracking-[0.3em] uppercase opacity-30 mb-8">
                    {isStaff ? 'Administración de Portales (Tenants)' : 'Mis Portales (Subdominios)'}
                  </h2>
                  <div className="space-y-4">
                    {tenants.map(tenant => {
                      const host = typeof window !== 'undefined' ? window.location.hostname : '';
                      let domain = `https://${tenant.subdomain}.nectarlabs.dev`;
                      let urlDisplay = `${tenant.subdomain}.nectarlabs.dev`;
                      if (host.includes('localhost')) {
                        domain = `http://nectarlabs.localhost/tenants/${tenant.subdomain}`;
                        urlDisplay = `nectarlabs.localhost/tenants/${tenant.subdomain}`;
                      } else if (host.includes('staging.nectarlabs.dev')) {
                        domain = `https://${tenant.subdomain}.staging.nectarlabs.dev`;
                        urlDisplay = `${tenant.subdomain}.staging.nectarlabs.dev`;
                      }
                      return (
                        <div key={tenant.id} className="p-5 rounded-2xl border border-card-border hover:border-nectar-gold/60 transition-all flex flex-col justify-between gap-4 bg-background/20 relative overflow-hidden group">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <h4 className="font-bold text-xs text-foreground/80 group-hover:text-foreground transition-colors">{tenant.name}</h4>
                                {isStaff && tenant.owner_email && (
                                  <span className="block text-[8px] font-bold text-nectar-gold opacity-60 mt-1 lowercase font-mono">
                                    Owner: {tenant.owner_email}
                                  </span>
                                )}
                              </div>
                              <span className={`px-2.5 py-1 text-[7px] font-black uppercase tracking-widest rounded-full border shrink-0 ${tenant.is_active
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}>
                                {tenant.is_active ? 'Activo' : 'Reservado'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] opacity-60">
                              <span>URL:</span>
                              <span className="font-mono text-[9px] text-nectar-gold font-bold">{urlDisplay}</span>
                            </div>

                            {/* Active Addons inside Tenant */}
                            {tenant.active_addons && tenant.active_addons.length > 0 ? (
                              <div className="pt-2 border-t border-card-border/40">
                                <span className="text-[7.5px] font-black uppercase tracking-widest opacity-40 block mb-1">Add-ons Activos:</span>
                                <div className="flex flex-wrap gap-1">
                                  {tenant.active_addons.map((slug: string) => {
                                    const addonObj = allAddons.find(a => a.slug === slug);
                                    return (
                                      <span key={slug} className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7px] font-black uppercase tracking-widest rounded-md border border-nectar-gold/20" title={addonObj?.description || slug}>
                                        {addonObj?.name || slug}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="pt-2 border-t border-card-border/40">
                                <span className="text-[7.5px] font-black uppercase tracking-widest opacity-35 block">Sin Add-ons Activos</span>
                              </div>
                            )}

                            {!tenant.is_active && (
                              <div className="pt-2 text-[8px] font-bold text-amber-500 opacity-80 leading-relaxed uppercase tracking-wider">
                                ⚠️ Aprovisionado en estado reservado. Se activará de forma automática al detectar el pago de la mensualidad.
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {!isStaff && (
                              <Link
                                href="/dashboard/tenant-settings"
                                className="flex-1 min-w-[90px] py-2 bg-background border border-card-border hover:border-foreground text-foreground text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer font-bold flex items-center justify-center font-bold"
                              >
                                Personalizar Marca
                              </Link>
                            )}
                            <button
                              onClick={() => {
                                if (tenant.is_active) {
                                  window.open(domain, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              className={`flex-1 min-w-[90px] py-2 text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer font-bold ${tenant.is_active
                                  ? 'bg-nectar-gold/10 hover:bg-nectar-gold hover:text-background border border-nectar-gold/20 hover:border-nectar-gold text-nectar-gold'
                                  : 'bg-card-border text-foreground/40 cursor-not-allowed border border-transparent'
                                }`}
                              title={tenant.is_active ? 'Abrir Portal' : 'El portal está en estado reservado hasta recibir el pago.'}
                              disabled={!tenant.is_active}
                            >
                              {tenant.is_active ? 'Abrir Portal ↗' : 'Portal Reservado 🔒'}
                            </button>
                            {tenant.is_active && (
                              <button
                                onClick={() => router.push(`/dashboard/tenant-settings?tenant=${tenant.id}`)}
                                className="flex-1 min-w-[90px] py-2 bg-foreground hover:bg-foreground/90 text-background text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer font-bold flex items-center justify-center border border-transparent font-bold"
                              >
                                Consola Admin ⚙️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {tenants.length === 0 && (
                      <p className="text-center py-10 opacity-20 font-bold uppercase tracking-widest text-[10px]">Sin subdominios registrados</p>
                    )}
                  </div>
                </section>

                {projects[0] && (
                  <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8">
                    <h2 className="text-xs font-black tracking-[0.3em] uppercase opacity-30 mb-8">Estado de Infraestructura</h2>
                    <StagingStatus project={projects[0]} />
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Premium UI Overlay Elements */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirmDlg && (
        <ConfirmModal
          isOpen={true}
          title={confirmDlg.title}
          message={confirmDlg.message}
          onConfirm={() => {
            confirmDlg.onConfirm();
            setConfirmDlg(null);
          }}
          onCancel={() => setConfirmDlg(null)}
        />
      )}

      <ContactSupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-xs opacity-50">Cargando panel...</div>}>
      <DashboardPageOriginal />
    </Suspense>
  );
}
