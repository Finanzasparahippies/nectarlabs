'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '../../lib/api';

interface Advance {
  id: number;
  milestone: string;
  title: string;
  description: string;
  delivered_at: string;
  delivered_by_email?: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
  staging_url: string;
  production_url: string;
  progress_percentage: number;
  is_active: boolean;
  client: number;
  plan?: number;
  user_email?: string;
  client_email?: string;
  client_username?: string;
  designer?: number;
  designer_plan?: number;
  designer_email?: string;

  // Activity tracking fields
  current_activity_start?: string;
  current_activity_description?: string;
  plan_hours?: number;
  used_hours_current_month?: number;
  remaining_hours_current_month?: number;
  designer_plan_hours?: number;
  designer_used_hours_current_month?: number;
  designer_remaining_hours_current_month?: number;
  unlocked_milestones?: string[];
  advances?: Advance[];
}

interface User {
  id: number;
  email: string;
  username: string;
  role?: string;
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // User creation states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({ username: '', email: '', password: '', role: 'CUSTOMER' });
  const [userError, setUserError] = useState('');


  // States for timer and inputs
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [activityDescriptions, setActivityDescriptions] = useState<Record<number, string>>({});
  const [advanceForms, setAdvanceForms] = useState<Record<number, { milestone: string; title: string; description: string } | null>>({});

  const [formData, setFormData] = useState({
    name: '',
    client: '',
    plan: '' as string | number,
    designer: '',
    designer_plan: '' as string | number,
    status: 'MVP',
    progress_percentage: 0,
    staging_url: '',
    production_url: '',
    is_active: true
  });

  useEffect(() => {
    const staff = localStorage.getItem('is_staff') === 'true';
    const role = localStorage.getItem('user_role') || '';
    setUserRole(role);
    setIsStaff((staff || role === 'ADMIN' || role === 'BUSINESS') && role !== 'DESIGNER');
    loadData();

    // Live timer ticking
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const isStaffUser = localStorage.getItem('is_staff') === 'true';
      const role = localStorage.getItem('user_role') || '';
      const canViewUsers = isStaffUser || role === 'ADMIN' || role === 'BUSINESS' || role === 'DESIGNER';

      const promises: Promise<any>[] = [
        fetcher('/projects/'),
        fetcher('/plans/')
      ];
      if (canViewUsers) {
        promises.push(fetcher('/users/'));
      }
      const results = await Promise.all(promises);
      setProjects(results[0]);
      setPlans(results[1]);
      if (canViewUsers && results[2]) {
        setUsers(results[2]);
      }
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    try {
      const newUser = await fetcher('/users/', {
        method: 'POST',
        body: JSON.stringify(userFormData)
      });
      setUsers(prev => [...prev, newUser].sort((a, b) => a.username.localeCompare(b.username)));
      setFormData(prev => ({ ...prev, client: newUser.id.toString() }));
      setIsUserModalOpen(false);
      setUserFormData({ username: '', email: '', password: '', role: 'CUSTOMER' });
    } catch (err: any) {
      setUserError(err.message || "Error al crear el cliente");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingProject ? 'PATCH' : 'POST';
      const endpoint = editingProject ? `/projects/${editingProject.id}/` : '/projects/';

      const bodyPayload = {
        ...formData,
        designer: formData.designer ? parseInt(formData.designer) : null,
        designer_plan: formData.designer_plan ? parseInt(formData.designer_plan.toString()) : null,
      };

      await fetcher(endpoint, {
        method,
        body: JSON.stringify(bodyPayload)
      });

      setIsCreateModalOpen(false);
      setEditingProject(null);
      resetForm();
      loadData();
    } catch (err) {
      alert("Error al guardar el proyecto");
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      client: '',
      plan: '',
      designer: '',
      designer_plan: '',
      status: 'MVP',
      progress_percentage: 0,
      staging_url: '',
      production_url: '',
      is_active: true
    });
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      client: project.client.toString(),
      plan: project.plan || '',
      designer: project.designer ? project.designer.toString() : '',
      designer_plan: project.designer_plan || '',
      status: project.status,
      progress_percentage: project.progress_percentage,
      staging_url: project.staging_url || '',
      production_url: project.production_url || '',
      is_active: project.is_active
    });
    setIsCreateModalOpen(true);
  };

  // Activity tracking operations
  const handleStartActivity = async (projectId: number) => {
    const description = activityDescriptions[projectId] || '';
    try {
      const updatedProject = await fetcher(`/projects/${projectId}/start_activity/`, {
        method: 'POST',
        body: JSON.stringify({ description })
      });
      setProjects(projects.map(p => p.id === projectId ? updatedProject : p));
      setActivityDescriptions({ ...activityDescriptions, [projectId]: '' });
    } catch (err: any) {
      alert(err.message || "Error al iniciar actividad");
    }
  };

  const handleStopActivity = async (projectId: number) => {
    try {
      const updatedProject = await fetcher(`/projects/${projectId}/stop_activity/`, {
        method: 'POST'
      });
      setProjects(projects.map(p => p.id === projectId ? updatedProject : p));
    } catch (err: any) {
      alert(err.message || "Error al detener actividad");
    }
  };

  const handleDeliverAdvance = async (projectId: number) => {
    const advanceData = advanceForms[projectId];
    if (!advanceData) return;
    try {
      const updatedProject = await fetcher(`/projects/${projectId}/deliver_advance/`, {
        method: 'POST',
        body: JSON.stringify(advanceData)
      });
      setProjects(projects.map(p => p.id === projectId ? updatedProject : p));
      setAdvanceForms({ ...advanceForms, [projectId]: null });
    } catch (err: any) {
      alert(err.message || "Error al entregar el avance");
    }
  };

  const getLiveElapsedSeconds = (startIso: string) => {
    const diffMs = currentTime.getTime() - new Date(startIso).getTime();
    return Math.max(0, Math.floor(diffMs / 1000));
  };

  const formatSeconds = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px] animate-pulse">Cargando Proyectos...</div>
      </div>
    );
  }

  const canWork = isStaff || userRole === 'DESIGNER';
  const designers = users.filter(u => u.role === 'DESIGNER');

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

            {isStaff && userRole !== 'DESIGNER' && (
              <Link href="/dashboard?tab=business" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
                <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
                Control Negocio
              </Link>
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
            <Link href="/projects" className="flex items-center gap-4 px-6 py-4 bg-nectar-gold/10 text-nectar-gold rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-nectar-gold rounded-full"></div>
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

      <main className="flex-1 p-8 md:p-12 lg:p-16 overflow-y-auto">
        <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">
              Gestión de Proyectos
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-nectar-gold opacity-80">
              Infraestructura, Staging y Despliegue de Ingeniería
            </p>
          </div>

          {(isStaff || userRole === 'DESIGNER') && (
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  setUserFormData({ username: '', email: '', password: '', role: 'CUSTOMER' });
                  setUserError('');
                  setIsUserModalOpen(true);
                }}
                className="px-8 py-4 border-2 border-nectar-gold text-nectar-gold hover:bg-nectar-gold hover:text-background font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all text-[10px]"
              >
                + Nuevo Cliente
              </button>
              <button
                onClick={() => { resetForm(); setEditingProject(null); setIsCreateModalOpen(true); }}
                className="px-8 py-4 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-nectar-gold/20 text-[10px]"
              >
                Nuevo Proyecto
              </button>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {projects.map(project => {
            // Live hours calculations
            const liveElapsedSecs = project.current_activity_start ? getLiveElapsedSeconds(project.current_activity_start) : 0;
            const liveElapsedHours = liveElapsedSecs / 3600;

            // Dev hours
            const liveUsedHours = (project.used_hours_current_month || 0) + (userRole !== 'DESIGNER' ? liveElapsedHours : 0);
            const liveRemainingHours = Math.max(0, (project.plan_hours || 0) - liveUsedHours);
            const hoursPercentage = project.plan_hours ? Math.min(100, (liveUsedHours / project.plan_hours) * 100) : 0;

            // Designer hours
            const liveDesignUsedHours = (project.designer_used_hours_current_month || 0) + (userRole === 'DESIGNER' ? liveElapsedHours : 0);
            const liveDesignRemainingHours = Math.max(0, (project.designer_plan_hours || 0) - liveDesignUsedHours);
            const designHoursPercentage = project.designer_plan_hours ? Math.min(100, (liveDesignUsedHours / project.designer_plan_hours) * 100) : 0;

            return (
              <div key={project.id} className="p-10 rounded-[3rem] bg-card-bg border border-card-border hover:border-nectar-gold transition-all duration-700 group relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-40 h-40 bg-nectar-gold/5 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform"></div>

                <div>
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black tracking-tighter group-hover:text-nectar-gold transition-colors">{project.name}</h3>
                      <div className="flex flex-col gap-1">
                        {project.client_username && (
                          <p className="text-[9px] font-bold text-nectar-gold/60 uppercase tracking-widest">
                            Cliente: {project.client_username}
                          </p>
                        )}
                        {project.designer_email && (
                          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                            Diseñador: {project.designer_email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full">{project.status}</span>
                      {(isStaff || userRole === 'DESIGNER') && (
                        <button
                          onClick={() => handleEdit(project)}
                          className="w-8 h-8 rounded-xl bg-card-border/50 flex items-center justify-center hover:bg-nectar-gold hover:text-background transition-all text-xs"
                        >
                          ✎
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Level of Development Progress */}
                  <div className="mb-8 relative z-10">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                      <span className="opacity-40">Nivel de Desarrollo</span>
                      <span className="text-nectar-gold">{project.progress_percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-card-border/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-nectar-gold shadow-[0_0_15px_rgba(255,184,0,0.3)] transition-all duration-1000 ease-out"
                        style={{ width: `${project.progress_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Dual Plan Hours Package Tracking */}
                  <div className="space-y-6 mb-8 relative z-10">
                    {/* Development Hours */}
                    <div className="p-6 rounded-[2rem] bg-background/40 border border-card-border/50">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-nectar-gold/85 mb-4">Consumo de Horas (Desarrollo)</h4>
                      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                        <div>
                          <p className="text-[8px] font-bold opacity-45 uppercase tracking-wider">Plan Dev</p>
                          <p className="text-lg font-black text-foreground">{formatHoursToHM(project.plan_hours || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold opacity-45 uppercase tracking-wider">Consumido</p>
                          <p className="text-lg font-black text-nectar-gold">{formatHoursToHM(liveUsedHours)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold opacity-45 uppercase tracking-wider">Restante</p>
                          <p className="text-lg font-black text-green-500">{formatHoursToHM(liveRemainingHours)}</p>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-card-border/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${hoursPercentage > 90 ? 'bg-red-500' : hoursPercentage > 75 ? 'bg-nectar-gold' : 'bg-green-500'}`}
                          style={{ width: `${hoursPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Design Hours (Show if project has designer plan hours or a designer) */}
                    {(project.designer_plan_hours || 0) > 0 && (
                      <div className="p-6 rounded-[2rem] bg-background/40 border border-card-border/50">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-white/85 mb-4">Consumo de Horas (Diseño de Marca)</h4>
                        <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                          <div>
                            <p className="text-[8px] font-bold opacity-45 uppercase tracking-wider">Plan Diseño</p>
                            <p className="text-lg font-black text-foreground">{formatHoursToHM(project.designer_plan_hours || 0)}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold opacity-45 uppercase tracking-wider">Consumido</p>
                            <p className="text-lg font-black text-nectar-gold">{formatHoursToHM(liveDesignUsedHours)}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold opacity-45 uppercase tracking-wider">Restante</p>
                            <p className="text-lg font-black text-green-500">{formatHoursToHM(liveDesignRemainingHours)}</p>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-card-border/30 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${designHoursPercentage > 90 ? 'bg-red-500' : designHoursPercentage > 75 ? 'bg-nectar-gold' : 'bg-green-500'}`}
                            style={{ width: `${designHoursPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live Tracker (Developer / Designer / Admin view) */}
                  {canWork && (
                    <div className="p-6 rounded-[2rem] bg-nectar-gold/5 border border-nectar-gold/20 mb-8 relative z-10">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold">
                          Cronómetro de Actividad {userRole === 'DESIGNER' ? '(Diseño)' : '(Desarrollo)'}
                        </h4>
                        {project.current_activity_start && (
                          <span className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span> En Vivo
                          </span>
                        )}
                      </div>

                      {project.current_activity_start ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-background/50 p-4 rounded-xl">
                            <div>
                              <p className="text-[8px] font-bold opacity-50 uppercase">Descripción</p>
                              <p className="text-xs font-black">{project.current_activity_description || 'Sin descripción'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-bold opacity-50 uppercase">Tiempo Transcurrido</p>
                              <p className="text-lg font-mono font-black text-nectar-gold">{formatSeconds(liveElapsedSecs)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleStopActivity(project.id)}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-2xl text-[9px] hover:scale-[1.02] transition-all"
                          >
                            Detener y Registrar Actividad
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Descripción de la tarea..."
                            value={activityDescriptions[project.id] || ''}
                            onChange={(e) => setActivityDescriptions({ ...activityDescriptions, [project.id]: e.target.value })}
                            className="w-full bg-background/50 border border-card-border rounded-xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-xs"
                          />
                          <button
                            onClick={() => handleStartActivity(project.id)}
                            className="w-full py-4 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-2xl text-[9px] hover:scale-[1.02] transition-all shadow-lg shadow-nectar-gold/10"
                          >
                            Iniciar Nueva Actividad
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Project Advances / Deliveries */}
                  <div className="mb-8 relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Avances Entregados</h4>

                    {project.advances && project.advances.length > 0 ? (
                      <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                        {project.advances.map(adv => (
                          <div key={adv.id} className="p-4 rounded-xl bg-background/30 border border-card-border/50 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="px-2 py-0.5 bg-nectar-gold/20 text-nectar-gold font-black uppercase tracking-widest text-[8px] rounded">Avance {adv.milestone}%</span>
                              <span className="text-[8px] opacity-40">{new Date(adv.delivered_at).toLocaleDateString()}</span>
                            </div>
                            <h5 className="font-black text-foreground">{adv.title}</h5>
                            <p className="opacity-70 mt-1">{adv.description}</p>
                            {adv.delivered_by_email && (
                              <p className="text-[7px] font-bold opacity-30 mt-1 uppercase">Por: {adv.delivered_by_email}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] font-bold uppercase tracking-widest opacity-20 text-center py-6">Sin avances registrados en el ciclo actual</p>
                    )}

                    {/* Deliver Advance Section */}
                    {canWork && project.unlocked_milestones && project.unlocked_milestones.length > 0 && (
                      <div className="mt-4 p-4 rounded-2xl border border-dashed border-nectar-gold/40">
                        <p className="text-[9px] font-black text-nectar-gold uppercase tracking-widest mb-3">Metas de Avance Disponibles</p>

                        <div className="flex gap-2 mb-3">
                          {project.unlocked_milestones.map(m => (
                            <button
                              key={m}
                              onClick={() => setAdvanceForms({
                                ...advanceForms,
                                [project.id]: { milestone: m, title: '', description: '' }
                              })}
                              className="px-3 py-2 bg-nectar-gold/10 hover:bg-nectar-gold/20 border border-nectar-gold/40 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                              Entregar {m}%
                            </button>
                          ))}
                        </div>

                        {/* Inline Deliver form */}
                        {advanceForms[project.id] && (
                          <div className="space-y-3 bg-background/60 p-4 rounded-xl border border-card-border mt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold">Formulario Avance {advanceForms[project.id]?.milestone}%</span>
                              <button
                                onClick={() => setAdvanceForms({ ...advanceForms, [project.id]: null })}
                                className="text-[9px] font-bold text-red-500 uppercase"
                              >
                                Cancelar
                              </button>
                            </div>

                            <input
                              type="text"
                              placeholder="Título del Avance..."
                              value={advanceForms[project.id]?.title || ''}
                              onChange={(e) => setAdvanceForms({
                                ...advanceForms,
                                [project.id]: { ...advanceForms[project.id]!, title: e.target.value }
                              })}
                              className="w-full bg-background/50 border border-card-border rounded-xl p-3 focus:outline-none focus:border-nectar-gold transition-all text-xs"
                              required
                            />

                            <textarea
                              placeholder="Detalles del avance..."
                              value={advanceForms[project.id]?.description || ''}
                              onChange={(e) => setAdvanceForms({
                                ...advanceForms,
                                [project.id]: { ...advanceForms[project.id]!, description: e.target.value }
                              })}
                              rows={3}
                              className="w-full bg-background/50 border border-card-border rounded-xl p-3 focus:outline-none focus:border-nectar-gold transition-all text-xs resize-none"
                              required
                            />

                            <button
                              onClick={() => handleDeliverAdvance(project.id)}
                              className="w-full py-3 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-xl text-[8px] hover:scale-[1.02] transition-all"
                            >
                              Enviar Avance al Cliente
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  {project.staging_url && (
                    <a href={project.staging_url} target="_blank" className="flex-1 py-4 bg-card-border/50 hover:bg-foreground hover:text-background text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                      Entorno Staging
                    </a>
                  )}
                  {project.production_url && (
                    <a href={project.production_url} target="_blank" className="flex-1 py-4 border-2 border-nectar-gold text-nectar-gold hover:bg-nectar-gold hover:text-background text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                      Entorno Producción
                    </a>
                  )}
                  {!project.staging_url && !project.production_url && (
                    <div className="w-full py-4 text-center opacity-20 text-[9px] font-black uppercase tracking-[0.2em]">Configurando Servidores...</div>
                  )}
                </div>
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-card-border rounded-[3rem] bg-card-bg/20">
              <p className="text-sm font-black uppercase tracking-widest opacity-25">No hay proyectos asignados en este momento</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal De Creación/Edición */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-background/80">
          <div className="w-full max-w-2xl bg-card-bg border border-card-border rounded-[4rem] p-10 md:p-16 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-10 right-10 w-12 h-12 rounded-2xl bg-card-border/50 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all font-black text-xl"
            >
              ×
            </button>

            <header className="mb-12">
              <h2 className="text-4xl font-black tracking-tighter mb-4">
                {editingProject ? 'Configurar Proyecto' : 'Desplegar Nuevo Proyecto'}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-nectar-gold opacity-80">Parámetros de infraestructura y despliegue</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Nombre del Proyecto</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Nectar Labs Mobile"
                    className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Cliente</label>
                  <select
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm appearance-none"
                    required
                  >
                    <option value="">Seleccionar Cliente...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dev Plan (Staff only) */}
              {isStaff && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Plan Base del Proyecto (Desarrollo - Opcional)</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value ? parseInt(e.target.value) : '' })}
                    className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm appearance-none"
                  >
                    <option value="">Ninguno (Heredar del contrato de cliente)</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.hours}h/mes</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Designer Assignment (Staff only) */}
              {isStaff && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Diseñador Asignado (Opcional)</label>
                    <select
                      value={formData.designer}
                      onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
                      className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm appearance-none"
                    >
                      <option value="">Sin Diseñador</option>
                      {designers.map(d => (
                        <option key={d.id} value={d.id}>{d.email}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Plan de Diseño (Opcional)</label>
                    <select
                      value={formData.designer_plan}
                      onChange={(e) => setFormData({ ...formData, designer_plan: e.target.value ? parseInt(e.target.value) : '' })}
                      className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm appearance-none"
                    >
                      <option value="">Ninguno (Heredar del contrato de cliente)</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {p.hours}h/mes</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm appearance-none"
                  >
                    <option value="MVP">MVP (Mínimo Viable)</option>
                    <option value="STAGING">STAGING (Pruebas)</option>
                    <option value="PRODUCTION">PRODUCTION (En Vivo)</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Progreso (%)</label>
                  <input
                    type="number"
                    value={formData.progress_percentage}
                    onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) })}
                    className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">URL de Staging</label>
                <input
                  type="url"
                  value={formData.staging_url}
                  onChange={(e) => setFormData({ ...formData, staging_url: e.target.value })}
                  placeholder="https://staging.example.com"
                  className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">URL de Producción</label>
                <input
                  type="url"
                  value={formData.production_url}
                  onChange={(e) => setFormData({ ...formData, production_url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-6 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-nectar-gold/20 text-xs"
              >
                {editingProject ? 'Actualizar Arquitectura' : 'Desplegar Proyecto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal De Registro Rápido de Cliente */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-background/80">
          <div className="w-full max-w-md bg-card-bg border border-card-border rounded-[3rem] p-10 relative shadow-2xl">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="absolute top-8 right-8 w-10 h-10 rounded-2xl bg-card-border/50 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all font-black text-xl"
            >
              ×
            </button>

            <header className="mb-8">
              <h2 className="text-3xl font-black tracking-tighter mb-2">
                {isStaff ? 'Crear Usuario' : 'Crear Cliente'}
              </h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-nectar-gold opacity-80">
                {isStaff ? 'Registrar nueva cuenta con rol asignado' : 'Registrar cuenta rápidamente'}
              </p>
            </header>

            <form onSubmit={handleCreateUser} className="space-y-6">
              {userError && (
                <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-500 text-xs font-bold">
                  {userError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Nombre de Usuario (Username)</label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  placeholder="ej: saul"
                  className="w-full bg-card-border/30 border border-card-border rounded-2xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Correo Electrónico (Email)</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="cliente@example.com"
                  className="w-full bg-card-border/30 border border-card-border rounded-2xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Contraseña</label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-card-border/30 border border-card-border rounded-2xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                  required
                />
              </div>

              {isStaff && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Rol del Usuario</label>
                  <select 
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-2xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-sm appearance-none"
                    required
                  >
                    <option value="CUSTOMER">CUSTOMER (Cliente)</option>
                    <option value="DESIGNER">DESIGNER (Diseñador)</option>
                    <option value="BUSINESS">BUSINESS (Dueño de Negocio)</option>
                    <option value="ADMIN">ADMIN (Administrador/Desarrollador)</option>
                    <option value="ANALYST">ANALYST (Analista de Datos)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-5 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-nectar-gold/20 text-xs"
              >
                {isStaff ? 'Crear Usuario' : 'Crear Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
