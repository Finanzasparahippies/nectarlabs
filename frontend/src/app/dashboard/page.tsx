'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetcher, API_URL } from '../../lib/api';
import StagingStatus from '../../components/dashboard/StagingStatus';
import WeeklyLogs from '../../components/dashboard/WeeklyLogs';
import BusinessCommander from '../../components/dashboard/BusinessCommander';
import DashboardSidebar from '../../components/DashboardSidebar';

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

export default function DashboardPage() {
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
      alert(`Estado de la mensualidad actualizado a ${newStatus === 'PAID' ? 'PAGADO' : newStatus === 'CANCELLED' ? 'CANCELADO' : 'PENDIENTE'}.`);
    } catch (err) {
      alert("Error al actualizar el estado de la mensualidad.");
    }
  };

  const handleSaveCFDI = async (installmentId: number) => {
    const uuid = cfdiInputs[installmentId] || "";
    if (!uuid.trim()) return alert("Por favor ingresa un folio fiscal válido.");
    
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
      alert("Folio Fiscal CFDI guardado con éxito.");
    } catch (err) {
      alert("Error al guardar CFDI.");
    }
  };

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar el proyecto "${projectName}"?\n\nEsta acción no se puede deshacer y borrará permanentemente todos los registros de horas y avances relacionados.`);
    if (!confirmed) return;

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
      alert(`El proyecto "${projectName}" ha sido eliminado correctamente.`);
    } catch (err: any) {
      alert(err.message || "Error al eliminar el proyecto.");
    }
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
    }
  }, [searchParams, loading]);

  const isCEO = userRole === 'ADMIN' || (isStaff && userRole !== 'DEVELOPER' && userRole !== 'DESIGNER');
  const isDeveloper = userRole === 'DEVELOPER';
  const isDesigner = userRole === 'DESIGNER';
  const isClient = !isCEO && !isDeveloper && !isDesigner;

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
      alert("Error al actualizar método de pago");
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
      alert("Error al actualizar fecha de compromiso");
    } finally {
      setUpdatingContractId(null);
    }
  };

  const handleUploadReceipt = async (installmentId: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append('receipt_file', file);

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
      setInstallments(prev => prev.map(inst => inst.id === installmentId ? { ...inst, receipt_file: updated.receipt_file, status: updated.status } : inst));
      alert("Comprobante subido con éxito. El equipo de administración lo validará a la brevedad.");
    } catch (err) {
      alert("Error al subir el comprobante de pago");
    }
  };

  const handlePayStripe = async (installmentId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/installments/${installmentId}/checkout_session/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      alert(err.message || "Error al conectar con Stripe");
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
      alert(err.message || "Error al conectar con Stripe");
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
      alert(err.message || "Error de conexión con Stripe");
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
        const isCEO = role === 'ADMIN' || staff;

        const [projectsData, ticketsData, logsData, contractsData, installmentsData, tenantsData, plansData] = await Promise.all([
          fetcher('/projects/'),
          fetcher('/tickets/'),
          fetcher('/logs/'),
          fetcher('/contracts/'),
          fetcher('/installments/'),
          fetcher('/tenants/'),
          fetcher('/plans/')
        ]);

        setProjects(projectsData);
        setTickets(ticketsData);
        setLogs(logsData);
        setContracts(contractsData);
        setInstallments(installmentsData);
        setTenants(tenantsData);
        setPlans(plansData);

        if (isCEO) {
          const statsData = await fetcher('/dashboard/business-stats/');
          setBusinessStats(statsData);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    loadData();

    // Check URL for Stripe payment results
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setNotification({
        type: 'polling',
        title: 'Verificando Pago',
        message: 'Estamos sincronizando tu pago con Stripe y activando tu portal. Por favor espera...',
        attempts: 1
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('payment') === 'cancel') {
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

        const [projectsData, ticketsData, logsData, contractsData, installmentsData, tenantsData] = await Promise.all([
          fetcher('/projects/'),
          fetcher('/tickets/'),
          fetcher('/logs/'),
          fetcher('/contracts/'),
          fetcher('/installments/'),
          fetcher('/tenants/')
        ]);

        setProjects(projectsData);
        setTickets(ticketsData);
        setLogs(logsData);
        setContracts(contractsData);
        setInstallments(installmentsData);
        setTenants(tenantsData);

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
              <h3 className="font-black text-[10px] uppercase tracking-wider text-white">
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
                  activeTab === 'hire-plan' ? 'Escala tu Ecosistema' : 'Centro de Control'}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-nectar-gold opacity-80">
            {isCEO ? (activeTab === 'business' ? 'Consola Financiera y de Infraestructura' : 'Panel de Operaciones Néctar Labs') :
              isDeveloper ? 'Workspace de Desarrollo y Soporte' :
                isDesigner ? 'Activos y Proyectos Creativos' :
                  activeTab === 'hire-plan' ? 'Elige tu Plan de Ingeniería Dedicado' : 'Workspace / Cliente Principal'}
          </p>
        </header>

        {activeTab === 'business' && isCEO ? (
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
                      <div className="text-3xl font-black text-nectar-gold mb-6 font-mono">
                        ${parseFloat(plan.price).toLocaleString()} <span className="text-[10px] text-foreground/50 uppercase tracking-widest">MXN / Mes</span>
                      </div>

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

            {/* Developer Specific Section: Ecosystem Contracts */}
            {isCEO && (
              <section className="mb-16 p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Contratos del Ecosistema</h3>
                    <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Historial completo de contratos de Partner Tecnológico</p>
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
                      {contracts.map(contract => (
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
                                  className={`w-4 h-4 transition-transform duration-300 ${
                                    expandedContracts[contract.id] ? 'rotate-90' : ''
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
                              <h4 className="font-black text-sm">{contract.full_name}</h4>
                              <p className="text-[7px] font-bold text-foreground/45 uppercase tracking-wider mt-0.5">{contract.tax_id}</p>
                            </td>
                            <td className="py-4 font-bold text-xs">
                              {contract.plan_name || 'Desconocido'}
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
                                    href={contract.pdf_file}
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
                                <div className="space-y-6">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-nectar-gold">
                                      Mensualidades Obligatorias del Contrato #{contract.id}
                                    </h4>
                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40">
                                      {installments.filter(inst => inst.contract === contract.id && inst.status === 'PAID').length} de {installments.filter(inst => inst.contract === contract.id).length} Pagados
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                              className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-wider rounded-full bg-background border focus:outline-none cursor-pointer transition-colors ${
                                                inst.status === 'PAID' 
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
                                                  href={inst.receipt_file} 
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
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {contracts.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                            No hay contratos registrados en el sistema
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Client Specific Section: Payment Commitment & Details (Closed Deal) */}
            {!isStaff && contracts.some(c => c.is_fully_signed) && (() => {
              const activeContracts = contracts.filter(c => c.is_fully_signed);
              const activeContract = selectedActiveContractId
                ? activeContracts.find(c => c.id === selectedActiveContractId) || activeContracts[0]
                : activeContracts[0];

              if (!activeContract) return null;

              const chosenMethod = activeContract.payment_commitment_method || 'SPEI';
              const nextPaymentDate = activeContract.next_payment_date || '';

              return (
                <section id="payment-commitment-section" className="mb-16 p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left: Commitment details & form */}
                    <div className="space-y-6">
                      <header>
                        <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest rounded-full">Trato Cerrado ✓</span>
                        <h2 className="text-3xl font-black tracking-tighter mt-3 mb-1">Compromiso de Pago</h2>
                        <p className="text-[9px] font-black uppercase tracking-widest text-nectar-gold opacity-80">Suscripción y Activación de Partner Tecnológico</p>
                        {activeContract.pdf_file && (
                          <div className="mt-2">
                            <a
                              href={activeContract.pdf_file}
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
                          <input
                            type="date"
                            value={nextPaymentDate}
                            onChange={(e) => handleUpdatePaymentDate(activeContract.id, e.target.value)}
                            className="w-full bg-background/50 border border-card-border rounded-xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-xs font-bold text-foreground"
                          />
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
                    <div className="p-8 rounded-[2rem] bg-background/40 border border-card-border/50 flex flex-col justify-between">
                      {chosenMethod === 'STRIPE' && (
                        <div className="space-y-6 flex flex-col justify-between h-full">
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-2">Pago en línea seguro</h4>
                            <p className="text-xs text-foreground/75 leading-relaxed">
                              Realiza tu pago directamente con tarjeta a través de Stripe de manera segura y encriptada. El cobro se procesará inmediatamente y activará tu ciclo de horas.
                            </p>
                            <p className="text-[10px] text-foreground/50 mt-2">
                              Para pagar una mensualidad pendiente, haz clic en "Pagar con Stripe" directamente en la tarjeta de la mensualidad abajo.
                            </p>
                          </div>

                          <button
                            onClick={handleOpenBillingPortal}
                            className="w-full py-4 bg-[#635BFF] hover:bg-[#5b53e8] text-white font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-xs shadow-lg shadow-[#635BFF]/20"
                          >
                            Portal de Facturación (Stripe)
                          </button>
                        </div>
                      )}

                      {chosenMethod === 'SPEI' && (
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

                      {chosenMethod === 'DEPOSIT' && (
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

                  {/* Monthly Payments (6 months commitment) */}
                  <div className="mt-12 border-t border-card-border/50 pt-10">
                    <h3 className="text-lg font-black tracking-tight mb-6">Mensualidades Obligatorias (Compromiso a 6 Meses)</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {installments.filter(inst => inst.contract === activeContract.id).map(inst => (
                        <div key={inst.id} className="p-6 rounded-2xl bg-background/30 border border-card-border flex flex-col justify-between gap-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Mes {inst.installment_number} de 6</span>
                              <h4 className="font-black text-lg mt-1">${parseFloat(inst.amount).toLocaleString('es-MX')} MXN</h4>
                            </div>
                            <span className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-full ${inst.status === 'PAID' ? 'bg-green-500/10 text-green-500' :
                                inst.receipt_file ? 'bg-orange-500/10 text-orange-500' : 'bg-yellow-500/10 text-yellow-500'
                              }`}>
                              {inst.status === 'PAID' ? 'Pagado' : inst.receipt_file ? 'En Revisión' : 'Pendiente'}
                            </span>
                          </div>

                          <div className="space-y-2 text-[10px]">
                            {inst.project_name && (
                              <div className="flex justify-between gap-4">
                                <span className="opacity-60 shrink-0">Proyecto:</span>
                                <span className="font-bold text-nectar-gold text-right truncate" title={inst.project_name}>{inst.project_name}</span>
                              </div>
                            )}
                            <div className="flex justify-between opacity-60">
                              <span>Fecha Límite:</span>
                              <span className="font-bold">{inst.due_date}</span>
                            </div>
                            {inst.cfdi_uuid && (
                              <div className="flex justify-between text-green-500 font-bold">
                                <span>Folio Fiscal SAT:</span>
                                <span className="text-[8px] tracking-tighter select-all">{inst.cfdi_uuid.slice(0, 8)}...</span>
                              </div>
                            )}
                          </div>

                          {inst.status !== 'PAID' && (
                            <div className="mt-2 space-y-2">
                              {chosenMethod === 'STRIPE' ? (
                                <button
                                  onClick={() => handlePayStripe(inst.id)}
                                  className="w-full py-2.5 bg-[#635BFF] hover:bg-[#5b53e8] text-white text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all shadow-md"
                                >
                                  Pagar con Stripe
                                </button>
                              ) : inst.receipt_file ? (
                                <p className="text-[8px] text-center opacity-60 italic font-bold">Comprobante subido. Esperando validación.</p>
                              ) : (
                                <label className="w-full block py-2.5 border border-dashed border-nectar-gold/50 text-nectar-gold hover:bg-nectar-gold hover:text-background text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer">
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
                          )}
                        </div>
                      ))}
                      {installments.filter(inst => inst.contract === activeContract.id).length === 0 && (
                        <p className="col-span-full text-center text-xs opacity-40 font-bold py-6">Las mensualidades se generarán una vez que el trato sea firmado por el administrador.</p>
                      )}
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* Client Specific Sections: Pending Contracts & Empty Onboarding Banner */}
            {!isStaff && contracts.some(c => !c.is_fully_signed) && (
              <section className="mb-16 p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <h2 className="text-2xl font-black tracking-tighter mb-4">Contrataciones en Proceso</h2>
                <p className="text-xs text-foreground/60 mb-6 uppercase tracking-wider">Hemos recibido tu firma. Nuestro equipo técnico está validando los detalles para activar tu nuevo ecosistema.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {contracts.filter(c => !c.is_fully_signed).map(contract => (
                    <div key={contract.id} className="bg-background/40 border border-card-border/60 p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="px-2.5 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full animate-pulse">
                          Esperando Firma de Néctar Labs
                        </span>
                        <h4 className="font-black text-sm mt-3">{contract.plan_name || 'Plan de Ingeniería'}</h4>
                        <p className="text-[9px] font-bold opacity-60 mt-2">Razón Social: {contract.full_name}</p>
                        <p className="text-[8px] font-bold opacity-40 mt-1">Registrado: {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('es-ES') : '—'}</p>
                      </div>
                      {contract.pdf_file && (
                        <a
                          href={contract.pdf_file}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-6 py-2.5 bg-card-border hover:bg-foreground hover:text-background text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all inline-block font-bold"
                        >
                          Ver Contrato Parcial (PDF)
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!isStaff && projects.length === 0 && !contracts.some(c => !c.is_fully_signed) && (
              <section className="mb-16 p-12 rounded-[3.5rem] bg-nectar-forest text-nectar-cream border-4 border-nectar-gold shadow-2xl relative overflow-hidden group">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-nectar-gold/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                <div className="relative z-10 max-w-2xl">
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-none">Tu Arquitectura está lista para despegar.</h2>
                  <p className="text-xl font-bold opacity-80 mb-10 leading-relaxed">
                    Solo falta un paso para activar tu ecosistema de ingeniería. Firma tu contrato de Partner Tecnológico y comencemos a construir.
                  </p>
                  <Link href="/onboarding" className="inline-block px-12 py-6 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-nectar-gold/20">
                    Finalizar Onboarding
                  </Link>
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
                    {projects.map(project => {
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
                                {project.designer_email && <p className="text-[8px] font-bold text-white/45 uppercase tracking-wider">Diseñador: {project.designer_email}</p>}
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
                      <div className="col-span-full py-20 text-center border-2 border-dashed border-card-border rounded-[2.5rem] opacity-30">
                        <p className="font-bold uppercase tracking-widest text-xs">No hay proyectos activos registrados.</p>
                      </div>
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

                {!isStaff && (
                  <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8">
                    <h2 className="text-xs font-black tracking-[0.3em] uppercase opacity-30 mb-8">Mis Portales (Subdominios)</h2>
                    <div className="space-y-4">
                      {tenants.map(tenant => {
                        const host = typeof window !== 'undefined' ? window.location.hostname : '';
                        let domain = `https://${tenant.subdomain}.nectarlabs.dev`;
                        let urlDisplay = `${tenant.subdomain}.nectarlabs.dev`;
                        if (host.includes('localhost')) {
                          domain = `http://${tenant.subdomain}.localhost:3000`;
                          urlDisplay = `${tenant.subdomain}.localhost:3000`;
                        } else if (host.includes('staging.nectarlabs.dev')) {
                          domain = `https://${tenant.subdomain}.staging.nectarlabs.dev`;
                          urlDisplay = `${tenant.subdomain}.staging.nectarlabs.dev`;
                        }
                        return (
                          <div key={tenant.id} className="p-5 rounded-2xl border border-card-border hover:border-nectar-gold/60 transition-all flex flex-col justify-between gap-3 bg-background/20 relative overflow-hidden group">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-xs text-foreground/80 group-hover:text-foreground transition-colors">{tenant.name}</h4>
                              <span className={`px-2.5 py-1 text-[7px] font-black uppercase tracking-widest rounded-full ${tenant.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {tenant.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] opacity-60">
                              <span>URL:</span>
                              <span className="font-mono text-[9px] text-nectar-gold font-bold">{urlDisplay}</span>
                            </div>
                            <a
                              href={domain}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full mt-2 py-2 bg-nectar-gold/10 hover:bg-nectar-gold hover:text-background border border-nectar-gold/20 hover:border-nectar-gold text-nectar-gold text-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer"
                            >
                              Abrir Portal ↗
                            </a>
                          </div>
                        );
                      })}
                      {tenants.length === 0 && (
                        <p className="text-center py-10 opacity-20 font-bold uppercase tracking-widest text-[10px]">Sin subdominios registrados</p>
                      )}
                    </div>
                  </section>
                )}

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
    </div>
  );
}
