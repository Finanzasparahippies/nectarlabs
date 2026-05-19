'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher, API_URL } from '../../lib/api';
import StagingStatus from '../../components/dashboard/StagingStatus';
import WeeklyLogs from '../../components/dashboard/WeeklyLogs';
import BusinessCommander from '../../components/dashboard/BusinessCommander';

interface Project {
  id: number;
  name: string;
  status: string;
  progress_percentage: number;
  staging_url: string;
  production_url: string;
  user_email?: string;
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
  created_at: string;
  plan_name?: string;
  payment_commitment_method?: string;
  next_payment_date?: string;
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
  const [isStaff, setIsStaff] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'business'>('overview');
  const [businessStats, setBusinessStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingContractId, setUpdatingContractId] = useState<number | null>(null);
  const router = useRouter();

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

  useEffect(() => {
    const checkAuth = () => {
      const staff = localStorage.getItem('is_staff') === 'true';
      const role = localStorage.getItem('user_role') || '';
      setUserRole(role);
      setIsStaff(staff && role !== 'DESIGNER');
    };
    
    const loadData = async () => {
      try {
        const staff = localStorage.getItem('is_staff') === 'true';
        const role = localStorage.getItem('user_role') || '';
        const isActuallyStaff = staff && role !== 'DESIGNER';
        const [projectsData, ticketsData, logsData, contractsData, installmentsData] = await Promise.all([
          fetcher('/projects/'),
          fetcher('/tickets/'),
          fetcher('/logs/'),
          fetcher('/contracts/'),
          fetcher('/installments/')
        ]);
        
        setProjects(projectsData);
        setTickets(ticketsData);
        setLogs(logsData);
        setContracts(contractsData);
        setInstallments(installmentsData);

        if (isActuallyStaff) {
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

    // Check URL for initial tab
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'business') {
      setActiveTab('business');
    }
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Syncing Ecosystem...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-card-bg border-b lg:border-r border-card-border p-8 flex flex-col justify-between">
        <div>
          <Link href="/" className="inline-block text-xl font-black tracking-tighter mb-16">
            NECTAR <span className="text-nectar-gold">LABS</span>
          </Link>
          
          <nav className="space-y-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                activeTab === 'overview' ? 'bg-nectar-gold/10 text-nectar-gold' : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeTab === 'overview' ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
              Dashboard
            </button>

            {isStaff && userRole !== 'DESIGNER' && (
              <button
                onClick={() => setActiveTab('business')}
                className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                  activeTab === 'business' ? 'bg-nectar-gold/10 text-nectar-gold' : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeTab === 'business' ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
                Control Negocio
              </button>
            )}

            {isStaff && userRole !== 'DESIGNER' && (
              <Link href="/dashboard/performance" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
                <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
                Rendimiento
              </Link>
            )}

            <Link href="/tickets" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
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

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-12 lg:p-16 overflow-y-auto">
        <header className="mb-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">
            {isStaff ? (activeTab === 'business' ? 'Control de Negocio' : 'Control Maestro') : 'Centro de Control'}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-nectar-gold opacity-80">
            {isStaff ? (activeTab === 'business' ? 'Consola Financiera y de Infraestructura' : 'Panel de Ingeniería y Operaciones') : 'Workspace / Cliente Principal'}
          </p>
        </header>

        {activeTab === 'business' && isStaff ? (
          <BusinessCommander stats={businessStats} installments={installments} setInstallments={setInstallments} />
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

            {/* Client Specific Section: Payment Commitment & Details (Closed Deal) */}
            {!isStaff && contracts.some(c => c.is_fully_signed) && (() => {
              const activeContract = contracts.find(c => c.is_fully_signed);
              if (!activeContract) return null;
              
              const chosenMethod = activeContract.payment_commitment_method || 'SPEI';
              const nextPaymentDate = activeContract.next_payment_date || '';

              return (
                <section className="mb-16 p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                  
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left: Commitment details & form */}
                    <div className="space-y-6">
                      <header>
                        <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest rounded-full">Trato Cerrado ✓</span>
                        <h2 className="text-3xl font-black tracking-tighter mt-3 mb-1">Compromiso de Pago</h2>
                        <p className="text-[9px] font-black uppercase tracking-widest text-nectar-gold opacity-80">Suscripción y Activación de Partner Tecnológico</p>
                      </header>

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
                          </div>
                          
                          <button 
                            onClick={() => alert("Simulando Pasarela de Stripe... ¡Enlace de pago iniciado!")}
                            className="w-full py-4 bg-[#635BFF] hover:bg-[#5b53e8] text-white font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-xs shadow-lg shadow-[#635BFF]/20"
                          >
                            Pagar con Stripe
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
                            <span className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-full ${
                              inst.status === 'PAID' ? 'bg-green-500/10 text-green-500' :
                              inst.receipt_file ? 'bg-orange-500/10 text-orange-500' : 'bg-yellow-500/10 text-yellow-500'
                            }`}>
                              {inst.status === 'PAID' ? 'Pagado' : inst.receipt_file ? 'En Revisión' : 'Pendiente'}
                            </span>
                          </div>

                          <div className="space-y-2 text-[10px]">
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
                            <div className="mt-2">
                              {inst.receipt_file ? (
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

            {/* Client Specific Empty State */}
            {!isStaff && projects.length === 0 && (
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
                        </div>
                      </div>
                    );})}
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
