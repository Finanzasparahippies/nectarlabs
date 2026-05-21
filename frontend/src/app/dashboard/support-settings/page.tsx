'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '../../../lib/api';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  owner: number;
  api_key: string;
  allowed_origins: string;
  custom_domain: string | null;
  theme_color: string;
  logo_url: string | null;
  welcome_message: string;
  require_customer_info: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function SupportSettingsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [origin, setOrigin] = useState('https://nectarlabs.dev');
  const [activeSubTab, setActiveSubTab] = useState<'branding' | 'routing' | 'widget'>('branding');
  const [copied, setCopied] = useState(false);
  
  // New Tenant Form State
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSubdomain, setNewTenantSubdomain] = useState('');
  
  // Edit fields
  const [editName, setEditName] = useState('');
  const [editSubdomain, setEditSubdomain] = useState('');
  const [editCustomDomain, setEditCustomDomain] = useState('');
  const [editThemeColor, setEditThemeColor] = useState('#C68A1E');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editWelcomeMessage, setEditWelcomeMessage] = useState('');
  const [editRequireCustomerInfo, setEditRequireCustomerInfo] = useState(true);
  const [editAllowedOrigins, setEditAllowedOrigins] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    const checkAuth = () => {
      const staff = localStorage.getItem('is_staff') === 'true';
      const role = localStorage.getItem('user_role') || '';
      setUserRole(role);
      setIsStaff((staff || role === 'ADMIN' || role === 'BUSINESS') && role !== 'DESIGNER');
    };

    const loadTenants = async () => {
      try {
        const data = await fetcher('/tenants/');
        setTenants(data);
        if (data.length > 0) {
          selectTenant(data[0]);
        }
      } catch (err) {
        console.error('Error loading tenants:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    loadTenants();
  }, []);

  const selectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditName(tenant.name);
    setEditSubdomain(tenant.subdomain);
    setEditCustomDomain(tenant.custom_domain || '');
    setEditThemeColor(tenant.theme_color || '#C68A1E');
    setEditLogoUrl(tenant.logo_url || '');
    setEditWelcomeMessage(tenant.welcome_message || '');
    setEditRequireCustomerInfo(tenant.require_customer_info);
    setEditAllowedOrigins(tenant.allowed_origins || '');
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim() || !newTenantSubdomain.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await fetcher('/tenants/', {
        method: 'POST',
        body: JSON.stringify({
          name: newTenantName.trim(),
          subdomain: newTenantSubdomain.trim().toLowerCase(),
        }),
      });
      setTenants((prev) => [created, ...prev]);
      selectTenant(created);
      setNewTenantName('');
      setNewTenantSubdomain('');
      alert('Configuración de soporte iniciada correctamente.');
    } catch (err: any) {
      alert(err.message || 'Error al inicializar la configuración de soporte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setIsSubmitting(true);
    try {
      const updated = await fetcher(`/tenants/${selectedTenant.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.trim(),
          subdomain: editSubdomain.trim().toLowerCase(),
          custom_domain: editCustomDomain.trim() || null,
          theme_color: editThemeColor,
          logo_url: editLogoUrl.trim() || null,
          welcome_message: editWelcomeMessage.trim(),
          require_customer_info: editRequireCustomerInfo,
          allowed_origins: editAllowedOrigins.trim(),
        }),
      });

      setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTenant(updated);
      alert('Configuración guardada correctamente.');
    } catch (err: any) {
      alert(err.message || 'Error al guardar los cambios.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!selectedTenant) return;
    if (
      !confirm(
        '¿Estás seguro de que deseas regenerar la API Key de soporte? Esto romperá inmediatamente cualquier integración que esté usando la API Key actual.'
      )
    )
      return;

    try {
      const res = await fetcher(`/tenants/${selectedTenant.id}/regenerate_api_key/`, {
        method: 'POST',
      });
      const updatedTenant = { ...selectedTenant, api_key: res.api_key };
      setSelectedTenant(updatedTenant);
      setTenants((prev) => prev.map((t) => (t.id === updatedTenant.id ? updatedTenant : t)));
      alert('API Key regenerada con éxito.');
    } catch (err: any) {
      alert(err.message || 'Error al regenerar la API Key.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Cargando Configuración...</div>
      </div>
    );
  }

  // Redirect if not staff/business
  if (!isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-xl font-black text-red-500 uppercase tracking-widest mb-2">Acceso Denegado</h1>
        <p className="text-xs text-white/50 max-w-sm mb-6">No tienes privilegios para administrar centros de soporte.</p>
        <Link href="/dashboard" className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  const widgetScriptTag = `<script 
  src="${origin}/widget.js" 
  data-tenant-id="${selectedTenant?.id || ''}"
  defer
></script>`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-card-bg border-b lg:border-r border-card-border p-8 flex flex-col justify-between shrink-0">
        <div>
          <Link href="/" className="inline-block text-xl font-black tracking-tighter mb-16">
            NECTAR <span className="text-nectar-gold">LABS</span>
          </Link>
          
          <nav className="space-y-4">
            <Link href="/dashboard" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Dashboard
            </Link>

            <Link href="/dashboard?tab=business" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Control Negocio
            </Link>

            <Link href="/dashboard/performance" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Rendimiento
            </Link>

            <Link href="/tickets" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Gestión Tickets
            </Link>

            <Link href="/projects" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Proyectos
            </Link>

            <Link href="/dashboard/addons" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Catálogo Add-ons
            </Link>

            <Link href="/dashboard/support-settings" className="flex items-center gap-4 px-6 py-4 bg-nectar-gold/10 text-nectar-gold rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-nectar-gold rounded-full"></div>
              Configuración Soporte
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
            Configuración de Soporte
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-nectar-gold opacity-80 animate-pulse">
            Portal Multitenant y Widget de Chat para Clientes
          </p>
        </header>

        {tenants.length === 0 ? (
          /* Empty State - Create Support Center */
          <div className="max-w-xl bg-card-bg border border-card-border rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-nectar-gold/5 blur-3xl"></div>
            
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-nectar-gold/10 text-nectar-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">Activa tu Centro de Soporte</h2>
              <p className="text-xs text-white/50 max-w-sm mx-auto mt-2 leading-relaxed">
                Ofrece a tus clientes un portal de tickets de soporte técnico personalizado y un widget de chat en vivo integrado directamente en tus aplicaciones.
              </p>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Nombre del Portal de Soporte</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="Ej. Soporte Néctar Labs"
                  required
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Subdominio Dedicado</label>
                <div className="flex items-center bg-background border border-card-border rounded-xl px-4 py-3 focus-within:border-nectar-gold transition-all">
                  <input
                    type="text"
                    value={newTenantSubdomain}
                    onChange={(e) => setNewTenantSubdomain(e.target.value)}
                    placeholder="soporte-miempresa"
                    required
                    className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-nectar-gold pl-2">.nectarlabs.dev</span>
                </div>
                <p className="text-[8px] text-white/30 uppercase mt-1">Este slug definirá tu URL del portal de ayuda hospedado.</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background font-black uppercase tracking-widest text-[10px] rounded-xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 mt-6 cursor-pointer"
              >
                {isSubmitting ? 'Configurando...' : 'Crear Canal de Soporte'}
              </button>
            </form>
          </div>
        ) : (
          /* Editor Layout */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
            {/* Left list (Staff see all, Business owners see their list) */}
            {userRole === 'ADMIN' && tenants.length > 1 && (
              <div className="xl:col-span-3 bg-card-bg border border-card-border rounded-[2.5rem] p-6 flex flex-col space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-white/40">Portales Registrados</h3>
                <div className="space-y-2 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => selectTenant(t)}
                      className={`w-full text-left p-4 rounded-xl border transition-all text-xs font-black uppercase tracking-wider ${
                        selectedTenant?.id === t.id
                          ? 'bg-nectar-gold/10 text-nectar-gold border-nectar-gold/30'
                          : 'bg-background/40 hover:bg-background/70 text-white/60 border-card-border'
                      }`}
                    >
                      {t.name}
                      <p className="text-[8px] opacity-45 lowercase tracking-normal mt-0.5">{t.subdomain}.nectarlabs.dev</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Config Form (Fill remaining columns) */}
            <div className={`${userRole === 'ADMIN' && tenants.length > 1 ? 'xl:col-span-9' : 'xl:col-span-12'} flex flex-col lg:flex-row gap-8`}>
              <div className="flex-1 bg-card-bg border border-card-border rounded-[3rem] p-8 md:p-10 shadow-xl">
                {/* Form Tabs */}
                <div className="flex border-b border-card-border pb-px mb-8 gap-6">
                  <button
                    onClick={() => setActiveSubTab('branding')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all ${
                      activeSubTab === 'branding' ? 'text-nectar-gold' : 'text-white/45 hover:text-white'
                    }`}
                  >
                    Personalización
                    {activeSubTab === 'branding' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                  <button
                    onClick={() => setActiveSubTab('routing')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all ${
                      activeSubTab === 'routing' ? 'text-nectar-gold' : 'text-white/45 hover:text-white'
                    }`}
                  >
                    Enrutamiento y Seguridad
                    {activeSubTab === 'routing' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                  <button
                    onClick={() => setActiveSubTab('widget')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all ${
                      activeSubTab === 'widget' ? 'text-nectar-gold' : 'text-white/45 hover:text-white'
                    }`}
                  >
                    Integración e API Key
                    {activeSubTab === 'widget' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {activeSubTab === 'branding' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Nombre de la Marca</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            required
                            className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Color de Marca (Widget & Portal)</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={editThemeColor}
                              onChange={(e) => setEditThemeColor(e.target.value)}
                              className="w-12 h-10 bg-background border border-card-border rounded-xl cursor-pointer p-1"
                            />
                            <input
                              type="text"
                              value={editThemeColor}
                              onChange={(e) => setEditThemeColor(e.target.value)}
                              placeholder="#C68A1E"
                              className="flex-1 bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all uppercase"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">URL del Logo (Opcional)</label>
                        <input
                          type="url"
                          value={editLogoUrl}
                          onChange={(e) => setEditLogoUrl(e.target.value)}
                          placeholder="https://ejemplo.com/logo.png"
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Mensaje de Bienvenida del Chat</label>
                        <textarea
                          value={editWelcomeMessage}
                          onChange={(e) => setEditWelcomeMessage(e.target.value)}
                          rows={3}
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all resize-none"
                        ></textarea>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-background/50 border border-card-border rounded-xl">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wide text-white">Requerir Información de Clientes</h4>
                          <p className="text-[9px] text-white/40 uppercase mt-0.5">Exige nombre y correo electrónico antes de permitir iniciar una sesión de soporte.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editRequireCustomerInfo}
                            onChange={(e) => setEditRequireCustomerInfo(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-card-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nectar-gold"></div>
                        </label>
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'routing' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Subdominio Dedicado</label>
                          <div className="flex items-center bg-background border border-card-border rounded-xl px-4 py-3 focus-within:border-nectar-gold transition-all">
                            <input
                              type="text"
                              value={editSubdomain}
                              onChange={(e) => setEditSubdomain(e.target.value)}
                              required
                              className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                            />
                            <span className="text-[10px] font-bold text-nectar-gold pl-2">.nectarlabs.dev</span>
                          </div>
                          {selectedTenant && (
                            <div className="flex gap-2 items-center mt-2">
                              <span className="text-[8px] text-white/30 uppercase">Enlace Portal:</span>
                              <a
                                href={`${origin.replace('//', `//${editSubdomain}.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9px] font-bold text-nectar-gold hover:underline"
                              >
                                {editSubdomain}.nectarlabs.dev
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Dominio Personalizado (Cname Mapping)</label>
                          <input
                            type="text"
                            value={editCustomDomain}
                            onChange={(e) => setEditCustomDomain(e.target.value)}
                            placeholder="Ej. soporte.miempresa.com"
                            className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                          />
                          <p className="text-[8px] text-white/30 uppercase mt-1">
                            Apunta tu CNAME en tu proveedor de DNS (GoDaddy, Cloudflare, etc.) hacia <span className="text-nectar-gold">nectarlabs.dev</span>.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Orígenes Permitidos (Seguridad de Widget)</label>
                        <textarea
                          value={editAllowedOrigins}
                          onChange={(e) => setEditAllowedOrigins(e.target.value)}
                          placeholder="https://miempresa.com, https://app.miempresa.com"
                          rows={3}
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all resize-none"
                        ></textarea>
                        <p className="text-[8px] text-white/30 uppercase mt-1">
                          Direcciones desde las cuales tu widget estará autorizado a cargarse. Separa cada dominio con comas o saltos de línea. Dejar vacío para permitir en cualquier origen.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'widget' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wide text-white">Script de Integración del Widget</h4>
                        <p className="text-[10px] text-white/50 leading-relaxed">
                          Copia y pega este fragmento de código HTML al final de la etiqueta <code className="text-nectar-gold">&lt;body&gt;</code> de tu sitio web para renderizar el chat de soporte técnico.
                        </p>
                        <div className="relative bg-background border border-card-border rounded-2xl p-4.5 font-mono text-[10px] text-white/90 overflow-x-auto select-all">
                          <pre>{widgetScriptTag}</pre>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(widgetScriptTag)}
                            className="absolute top-3 right-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                          >
                            {copied ? '¡Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-card-border space-y-4">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wide text-white">API Key y Autenticación del SDK</h4>
                          <p className="text-[10px] text-white/40 leading-relaxed uppercase mt-0.5">Utiliza esta credencial para sincronizar la base de datos de usuarios finales o interactuar directamente vía API.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                          <div className="flex-1 bg-background border border-card-border rounded-xl px-4.5 py-3.5 font-mono text-xs text-white/80 select-all overflow-x-auto">
                            {selectedTenant?.api_key || 'Cargando API Key...'}
                          </div>
                          <button
                            type="button"
                            onClick={handleRegenerateKey}
                            className="px-5 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            Regenerar API Key
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-card-border flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background font-black uppercase tracking-widest text-[10px] rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right preview block */}
              {activeSubTab === 'branding' && (
                <div className="w-full lg:w-80 bg-card-bg border border-card-border rounded-[3rem] p-6 flex flex-col items-center justify-between shrink-0 shadow-lg relative overflow-hidden h-[450px]">
                  <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: editThemeColor }}></div>
                  
                  <div className="text-center pt-4">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Vista Previa Visual</span>
                    <h4 className="text-xs font-black uppercase text-white tracking-tight mt-2">Chat de Soporte</h4>
                  </div>

                  {/* Mock Widget UI */}
                  <div className="w-full bg-[#030604] border border-white/5 rounded-2xl p-4 flex flex-col space-y-3 shadow-inner my-4 flex-1">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                        style={{ backgroundColor: editThemeColor }}
                      >
                        {editName ? editName.substring(0, 1).toUpperCase() : 'S'}
                      </span>
                      <div>
                        <p className="text-[9px] font-black text-white uppercase">{editName || 'Soporte'}</p>
                        <p className="text-[6.5px] font-bold uppercase tracking-wider" style={{ color: editThemeColor }}>Línea Directa</p>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end space-y-2">
                      <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/5 text-white p-2 rounded-xl rounded-tl-none max-w-[90%]">
                          <p className="text-[9px] leading-relaxed">{editWelcomeMessage || '¡Hola! ¿En qué podemos ayudarte?'}</p>
                        </div>
                      </div>

                      {editRequireCustomerInfo && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 space-y-1.5">
                          <div className="h-4 bg-white/5 rounded"></div>
                          <div className="h-4 bg-white/5 rounded"></div>
                          <div className="h-4 rounded" style={{ backgroundColor: editThemeColor }}></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[7.5px] font-black tracking-widest uppercase text-white/20">
                    Powered by Néctar Labs
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
