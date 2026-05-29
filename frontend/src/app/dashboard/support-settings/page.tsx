'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '../../../lib/api';
import DashboardSidebar from '../../../components/DashboardSidebar';
import Toast from '../../../components/ui/Toast';
import ConfirmModal from '../../../components/ui/ConfirmModal';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  owner: number;
  api_key: string;
  allowed_origins: string;
  custom_domain: string | null;
  theme_color: string;
  accent_color: string;
  bg_color: string;
  card_bg_color: string;
  text_color: string;
  border_color: string;
  logo_url: string | null;
  welcome_message: string;
  portal_title: string | null;
  footer_text: string | null;
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

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };
  
  // DNS verification states
  const [isValidatingDomain, setIsValidatingDomain] = useState(false);
  const [domainValidationResult, setDomainValidationResult] = useState<{ is_valid: boolean; resolved_ip?: string; message: string } | null>(null);

  // New Tenant Form State
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSubdomain, setNewTenantSubdomain] = useState('');
  
  // Edit fields
  const [editName, setEditName] = useState('');
  const [editSubdomain, setEditSubdomain] = useState('');
  const [editCustomDomain, setEditCustomDomain] = useState('');
  const [editThemeColor, setEditThemeColor] = useState('#C68A1E');
  const [editAccentColor, setEditAccentColor] = useState('#10B981');
  const [editBgColor, setEditBgColor] = useState('#020403');
  const [editCardBgColor, setEditCardBgColor] = useState('#050a06');
  const [editTextColor, setEditTextColor] = useState('#FFFFFF');
  const [editBorderColor, setEditBorderColor] = useState('#151F18');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editWelcomeMessage, setEditWelcomeMessage] = useState('');
  const [editPortalTitle, setEditPortalTitle] = useState('');
  const [editFooterText, setEditFooterText] = useState('');
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
    setEditAccentColor(tenant.accent_color || '#10B981');
    setEditBgColor(tenant.bg_color || '#020403');
    setEditCardBgColor(tenant.card_bg_color || '#050a06');
    setEditTextColor(tenant.text_color || '#FFFFFF');
    setEditBorderColor(tenant.border_color || '#151F18');
    setEditLogoUrl(tenant.logo_url || '');
    setEditLogoFile(null);
    setEditLogoPreview(null);
    setEditWelcomeMessage(tenant.welcome_message || '');
    setEditPortalTitle(tenant.portal_title || '');
    setEditFooterText(tenant.footer_text || '');
    setEditRequireCustomerInfo(tenant.require_customer_info);
    setEditAllowedOrigins(tenant.allowed_origins || '');
    setDomainValidationResult(null);
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
      showToast('Configuración de soporte iniciada correctamente.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al inicializar la configuración de soporte.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('subdomain', editSubdomain.trim().toLowerCase());
      formData.append('custom_domain', editCustomDomain.trim() || '');
      formData.append('theme_color', editThemeColor);
      formData.append('accent_color', editAccentColor);
      formData.append('bg_color', editBgColor);
      formData.append('card_bg_color', editCardBgColor);
      formData.append('text_color', editTextColor);
      formData.append('border_color', editBorderColor);
      formData.append('welcome_message', editWelcomeMessage.trim());
      formData.append('portal_title', editPortalTitle.trim());
      formData.append('footer_text', editFooterText.trim());
      formData.append('require_customer_info', String(editRequireCustomerInfo));
      formData.append('allowed_origins', editAllowedOrigins.trim());

      if (editLogoFile) {
        formData.append('logo', editLogoFile);
      } else {
        formData.append('logo_url', editLogoUrl.trim() || '');
      }

      const updated = await fetcher(`/tenants/${selectedTenant.id}/`, {
        method: 'PATCH',
        body: formData,
      });

      setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTenant(updated);
      if (updated.logo_url) {
        setEditLogoUrl(updated.logo_url);
      }
      setEditLogoFile(null);
      setEditLogoPreview(null);
      showToast('Configuración guardada correctamente.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar los cambios.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateDomain = async () => {
    if (!selectedTenant || !editCustomDomain.trim()) return;

    setIsValidatingDomain(true);
    setDomainValidationResult(null);
    try {
      const res = await fetcher(`/tenants/${selectedTenant.id}/validate-domain/`, {
        method: 'POST',
      });
      setDomainValidationResult(res);
    } catch (err: any) {
      setDomainValidationResult({
        is_valid: false,
        message: err.message || 'Error al validar el dominio.',
      });
    } finally {
      setIsValidatingDomain(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!selectedTenant) return;
    setConfirmModal({
      title: 'Regenerar API Key',
      message: '¿Estás seguro de que deseas regenerar la API Key de soporte? Esto romperá inmediatamente cualquier integración que esté usando la API Key actual.',
      onConfirm: async () => {
        try {
          const res = await fetcher(`/tenants/${selectedTenant.id}/regenerate_api_key/`, {
            method: 'POST',
          });
          const updatedTenant = { ...selectedTenant, api_key: res.api_key };
          setSelectedTenant(updatedTenant);
          setTenants((prev) => prev.map((t) => (t.id === updatedTenant.id ? updatedTenant : t)));
          showToast('API Key regenerada con éxito.', 'success');
        } catch (err: any) {
          showToast(err.message || 'Error al regenerar la API Key.', 'error');
        }
      }
    });
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

  // Redirect if not global admin/staff
  const isGlobalAdmin = isStaff && userRole !== 'BUSINESS';
  if (!isGlobalAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-xl font-black text-red-500 uppercase tracking-widest mb-2">Acceso Denegado</h1>
        <p className="text-xs text-white/50 max-w-sm mb-6">No tienes privilegios para administrar centros de soporte globales.</p>
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
      <DashboardSidebar />

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
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Título del Portal (Pestaña del Navegador)</label>
                          <input
                            type="text"
                            value={editPortalTitle}
                            onChange={(e) => setEditPortalTitle(e.target.value)}
                            placeholder="Ej. Soporte Premium - MiEmpresa"
                            className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                          />
                        </div>
                      </div>

                      {/* Logo Section with file uploader and URL fallback */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Logotipo de la Marca (Subir Archivo)</label>
                          <div className="flex flex-col sm:flex-row gap-4 items-center bg-background border border-card-border rounded-xl p-4">
                            <div className="relative w-16 h-16 rounded-xl border border-card-border overflow-hidden bg-background flex items-center justify-center shrink-0">
                              {editLogoPreview || editLogoUrl ? (
                                <img
                                  src={editLogoPreview || editLogoUrl}
                                  alt="Vista previa del logo"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-white/30 uppercase font-black text-center p-1">Sin Logo</span>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setEditLogoFile(file);
                                    setEditLogoPreview(URL.createObjectURL(file));
                                  }
                                }}
                                className="text-xs text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white/5 file:text-white hover:file:bg-white/10 w-full"
                              />
                              {(editLogoPreview || editLogoUrl) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditLogoFile(null);
                                    setEditLogoPreview(null);
                                    setEditLogoUrl('');
                                  }}
                                  className="text-[8px] font-black uppercase tracking-widest text-red-500 hover:underline block"
                                >
                                  Remover Logo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 flex flex-col justify-end">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40">O URL Externa del Logo (Opcional)</label>
                          <input
                            type="url"
                            value={editLogoUrl}
                            onChange={(e) => setEditLogoUrl(e.target.value)}
                            placeholder="https://ejemplo.com/logo.png"
                            className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                          />
                        </div>
                      </div>

                      {/* 6-Color Palette Grid */}
                      <div className="space-y-4 pt-4 border-t border-card-border">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold">Paleta de Colores Corporativa (6 Colores)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* 1. Theme Color */}
                          <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/45 block">Primario (Tema)</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={editThemeColor}
                                onChange={(e) => setEditThemeColor(e.target.value)}
                                className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                              />
                              <input
                                type="text"
                                value={editThemeColor}
                                onChange={(e) => setEditThemeColor(e.target.value)}
                                placeholder="#C68A1E"
                                className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                              />
                            </div>
                          </div>

                          {/* 2. Accent Color */}
                          <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/45 block">Acento</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={editAccentColor}
                                onChange={(e) => setEditAccentColor(e.target.value)}
                                className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                              />
                              <input
                                type="text"
                                value={editAccentColor}
                                onChange={(e) => setEditAccentColor(e.target.value)}
                                placeholder="#10B981"
                                className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                              />
                            </div>
                          </div>

                          {/* 3. Text Color */}
                          <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/45 block">Texto Principal</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={editTextColor}
                                onChange={(e) => setEditTextColor(e.target.value)}
                                className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                              />
                              <input
                                type="text"
                                value={editTextColor}
                                onChange={(e) => setEditTextColor(e.target.value)}
                                placeholder="#FFFFFF"
                                className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                              />
                            </div>
                          </div>

                          {/* 4. Canvas BG Color */}
                          <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/45 block">Fondo Lienzo</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={editBgColor}
                                onChange={(e) => setEditBgColor(e.target.value)}
                                className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                              />
                              <input
                                type="text"
                                value={editBgColor}
                                onChange={(e) => setEditBgColor(e.target.value)}
                                placeholder="#020403"
                                className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                              />
                            </div>
                          </div>

                          {/* 5. Card BG Color */}
                          <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/45 block">Fondo Tarjetas</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={editCardBgColor}
                                onChange={(e) => setEditCardBgColor(e.target.value)}
                                className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                              />
                              <input
                                type="text"
                                value={editCardBgColor}
                                onChange={(e) => setEditCardBgColor(e.target.value)}
                                placeholder="#050a06"
                                className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                              />
                            </div>
                          </div>

                          {/* 6. Border Color */}
                          <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/45 block">Bordes / Divisiones</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={editBorderColor}
                                onChange={(e) => setEditBorderColor(e.target.value)}
                                className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                              />
                              <input
                                type="text"
                                value={editBorderColor}
                                onChange={(e) => setEditBorderColor(e.target.value)}
                                placeholder="#151F18"
                                className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-card-border">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Mensaje de Bienvenida del Chat</label>
                          <textarea
                            value={editWelcomeMessage}
                            onChange={(e) => setEditWelcomeMessage(e.target.value)}
                            rows={3}
                            className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all resize-none animate-premium"
                          ></textarea>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Texto de Pie de Página (Footer)</label>
                          <textarea
                            value={editFooterText}
                            onChange={(e) => setEditFooterText(e.target.value)}
                            rows={3}
                            placeholder="Ej. © 2026 MiEmpresa. Todos los derechos reservados."
                            className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all resize-none animate-premium"
                          ></textarea>
                        </div>
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
                          
                          {editCustomDomain.trim() && (
                            <div className="mt-3 space-y-3">
                              <button
                                type="button"
                                onClick={handleValidateDomain}
                                disabled={isValidatingDomain}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                              >
                                {isValidatingDomain ? 'Validando...' : 'Verificar DNS'}
                              </button>
                              {domainValidationResult && (
                                <div
                                  className={`p-3 rounded-lg border text-[10px] ${
                                    domainValidationResult.is_valid
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                                  }`}
                                >
                                  <p className="font-bold">
                                    {domainValidationResult.is_valid ? '✓ Configuración DNS correcta' : '✗ Configuración DNS incompleta'}
                                  </p>
                                  <p className="mt-1 opacity-90">{domainValidationResult.message}</p>
                                  {domainValidationResult.resolved_ip && (
                                    <p className="mt-1 font-mono text-[9px]">IP Resuelta: {domainValidationResult.resolved_ip}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
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
                  <div
                    className="w-full border rounded-2xl p-4 flex flex-col space-y-3 shadow-inner my-4 flex-1"
                    style={{
                      backgroundColor: editBgColor,
                      borderColor: editBorderColor,
                      color: editTextColor
                    }}
                  >
                    <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: editBorderColor }}>
                      {editLogoPreview || editLogoUrl ? (
                        <img
                          src={editLogoPreview || editLogoUrl}
                          alt="Logo"
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                          style={{ backgroundColor: editThemeColor }}
                        >
                          {editName ? editName.substring(0, 1).toUpperCase() : 'S'}
                        </span>
                      )}
                      <div>
                        <p className="text-[9px] font-black uppercase" style={{ color: editTextColor }}>{editName || 'Soporte'}</p>
                        <p className="text-[6.5px] font-bold uppercase tracking-wider" style={{ color: editAccentColor }}>Línea Directa</p>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end space-y-2">
                      <div className="flex justify-start">
                        <div
                          className="border p-2 rounded-xl rounded-tl-none max-w-[90%]"
                          style={{
                            backgroundColor: editCardBgColor,
                            borderColor: editBorderColor,
                            color: editTextColor
                          }}
                        >
                          <p className="text-[9px] leading-relaxed">{editWelcomeMessage || '¡Hola! ¿En qué podemos ayudarte?'}</p>
                        </div>
                      </div>

                      {editRequireCustomerInfo && (
                        <div
                          className="border rounded-lg p-2 space-y-1.5"
                          style={{
                            backgroundColor: editCardBgColor,
                            borderColor: editBorderColor
                          }}
                        >
                          <div className="h-4 rounded border opacity-20" style={{ borderColor: editBorderColor }}></div>
                          <div className="h-4 rounded border opacity-20" style={{ borderColor: editBorderColor }}></div>
                          <div className="h-4 rounded flex items-center justify-center text-[7px] font-black uppercase tracking-wider cursor-default select-none" style={{ backgroundColor: editThemeColor, color: editBgColor }}>
                            Iniciar
                          </div>
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
