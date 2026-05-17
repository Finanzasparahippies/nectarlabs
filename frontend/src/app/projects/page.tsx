'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '../../lib/api';

interface Project {
  id: number;
  name: string;
  status: string;
  staging_url: string;
  production_url: string;
  progress_percentage: number;
  is_active: boolean;
  client: number;
  user_email?: string; // Might need to add this to serializer or handle separately
}

interface User {
  id: number;
  email: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    client: '',
    status: 'MVP',
    progress_percentage: 0,
    staging_url: '',
    production_url: '',
    is_active: true
  });

  useEffect(() => {
    const staff = localStorage.getItem('is_staff') === 'true';
    setIsStaff(staff);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const projectsData = await fetcher('/projects/');
      setProjects(projectsData);
      
      if (localStorage.getItem('is_staff') === 'true') {
        // We might need an endpoint to list users for the dropdown
        // Assuming /api/users/ exists or similar. For now, let's try to get it if available
        // const usersData = await fetcher('/users/');
        // setUsers(usersData);
      }
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingProject ? 'PATCH' : 'POST';
      const endpoint = editingProject ? `/projects/${editingProject.id}/` : '/projects/';
      
      await fetcher(endpoint, {
        method,
        body: JSON.stringify(formData)
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
      status: project.status,
      progress_percentage: project.progress_percentage,
      staging_url: project.staging_url || '',
      production_url: project.production_url || '',
      is_active: project.is_active
    });
    setIsCreateModalOpen(true);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Arquitecturando Ecosistemas...</div>
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
          
          {isStaff && (
            <button 
              onClick={() => { resetForm(); setEditingProject(null); setIsCreateModalOpen(true); }}
              className="px-8 py-4 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-nectar-gold/20 text-[10px]"
            >
              Nuevo Proyecto
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {projects.map(project => (
            <div key={project.id} className="p-10 rounded-[3rem] bg-card-bg border border-card-border hover:border-nectar-gold transition-all duration-700 group relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-40 h-40 bg-nectar-gold/5 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform"></div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tighter group-hover:text-nectar-gold transition-colors">{project.name}</h3>
                  <p className="text-[9px] font-bold text-nectar-gold/60 uppercase tracking-widest">Status: {project.status}</p>
                </div>
                {isStaff && (
                  <button 
                    onClick={() => handleEdit(project)}
                    className="w-10 h-10 rounded-xl bg-card-border/50 flex items-center justify-center hover:bg-nectar-gold hover:text-background transition-all"
                  >
                    ✎
                  </button>
                )}
              </div>

              <div className="mb-10 relative z-10">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-4">
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

              <div className="space-y-3 mt-auto relative z-10">
                {project.staging_url && (
                  <a href={project.staging_url} target="_blank" className="block w-full py-4 bg-card-border/50 hover:bg-foreground hover:text-background text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                    Entorno Staging
                  </a>
                )}
                {project.production_url && (
                  <a href={project.production_url} target="_blank" className="block w-full py-4 border-2 border-nectar-gold text-nectar-gold hover:bg-nectar-gold hover:text-background text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                    Entorno Producción
                  </a>
                )}
                {!project.staging_url && !project.production_url && (
                  <div className="py-4 text-center opacity-20 text-[9px] font-black uppercase tracking-[0.2em]">Configurando Servidores...</div>
                )}
              </div>
            </div>
          ))}
          
          {projects.length === 0 && (
            <div className="col-span-full py-32 text-center border-4 border-dashed border-card-border rounded-[4rem] opacity-30">
              <p className="font-black uppercase tracking-[0.5em] text-xl">Sin Proyectos en el Ecosistema</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal - Use consistent style */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-background/80">
          <div className="w-full max-w-2xl bg-card-bg border border-card-border rounded-[4rem] p-10 md:p-16 relative shadow-2xl">
            <button 
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
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Nectar Labs Mobile"
                    className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">ID Cliente</label>
                  <input 
                    type="number" 
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                    placeholder="User ID"
                    className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">Estado</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, progress_percentage: parseInt(e.target.value)})}
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
                  onChange={(e) => setFormData({...formData, staging_url: e.target.value})}
                  placeholder="https://staging.example.com"
                  className="w-full bg-card-border/30 border border-card-border rounded-2xl p-5 focus:outline-none focus:border-nectar-gold transition-all text-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">URL de Producción</label>
                <input 
                  type="url" 
                  value={formData.production_url}
                  onChange={(e) => setFormData({...formData, production_url: e.target.value})}
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
    </div>
  );
}
