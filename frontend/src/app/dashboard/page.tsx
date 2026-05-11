'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '../../lib/api';
import StagingStatus from '../../components/dashboard/StagingStatus';
import WeeklyLogs from '../../components/dashboard/WeeklyLogs';

interface Project {
  id: number;
  name: string;
  status: string;
  progress_percentage: number;
  staging_url: string;
  production_url: string;
  user_email?: string;
}

interface Contract {
  id: number;
  full_name: string;
  is_fully_signed: boolean;
  signature_base64?: string;
  developer_signature?: string;
  created_at: string;
  plan_name?: string;
}

interface Ticket {
  id: number;
  title: string;
  status: string;
  category: string;
  created_at: string;
  user_email?: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const staff = localStorage.getItem('is_staff') === 'true';
      setIsStaff(staff);
    };
    
    const loadData = async () => {
      try {
        const staff = localStorage.getItem('is_staff') === 'true';
        const [projectsData, ticketsData, logsData] = await Promise.all([
          fetcher('/projects/'),
          fetcher('/tickets/'),
          fetcher('/logs/')
        ]);
        
        setProjects(projectsData);
        setTickets(ticketsData);
        setLogs(logsData);

        if (staff) {
          const contractsData = await fetcher('/contracts/');
          setContracts(contractsData);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    loadData();
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
            <Link href="/dashboard" className="flex items-center gap-4 px-6 py-4 bg-nectar-gold/10 text-nectar-gold rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-nectar-gold rounded-full"></div>
              Dashboard
            </Link>
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
            {isStaff ? 'Control Maestro' : 'Centro de Control'}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-nectar-gold opacity-80">
            {isStaff ? 'Panel de Ingeniería y Operaciones' : 'Workspace / Cliente Principal'}
          </p>
        </header>

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
                {projects.map(project => (
                  <div key={project.id} className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-nectar-gold/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black tracking-tight">{project.name}</h3>
                        {isStaff && <p className="text-[8px] font-bold text-nectar-gold opacity-60">{project.user_email}</p>}
                      </div>
                      <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full">{project.status}</span>
                    </div>

                    <div className="mb-10">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                        <span className="opacity-40">Progreso</span>
                        <span className="text-nectar-gold">{project.progress_percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-nectar-gold transition-all duration-1000 ease-out"
                          style={{ width: `${project.progress_percentage}%` }}
                        ></div>
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
                ))}
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
      </main>
    </div>
  );
}
