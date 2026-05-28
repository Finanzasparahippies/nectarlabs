'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api';
import Toast from '@/components/ui/Toast';
import ThemeToggle from '@/components/ThemeToggle';

interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  welcome_message: string;
  portal_title: string | null;
  footer_text: string | null;
  require_customer_info: boolean;
  theme_color: string;
  accent_color: string;
  bg_color: string;
  card_bg_color: string;
  text_color: string;
  border_color: string;
  active_addons?: string[];
  owner: number;
}

export default function TenantAdminPage() {
  const params = useParams();
  const router = useRouter();
  const rawSubdomain = params?.subdomain as string;
  const [subdomain, setSubdomain] = useState<string>('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userMe, setUserMe] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'branding'>('metrics');

  // Customization Form State
  const [editName, setEditName] = useState('');
  const [editPortalTitle, setEditPortalTitle] = useState('');
  const [editWelcomeMessage, setEditWelcomeMessage] = useState('');
  const [editFooterText, setEditFooterText] = useState('');
  const [editRequireCustomerInfo, setEditRequireCustomerInfo] = useState(true);
  
  const [editThemeColor, setEditThemeColor] = useState('#C68A1E');
  const [editAccentColor, setEditAccentColor] = useState('#10B981');
  const [editBgColor, setEditBgColor] = useState('#020403');
  const [editCardBgColor, setEditCardBgColor] = useState('#050a06');
  const [editTextColor, setEditTextColor] = useState('#FFFFFF');
  const [editBorderColor, setEditBorderColor] = useState('#151F18');
  
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Parse Subdomain from Route or Hostname
  useEffect(() => {
    if (rawSubdomain) {
      setSubdomain(rawSubdomain);
      return;
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      let parsed = '';
      if (hostname.includes('.staging.nectarlabs.dev')) {
        parsed = hostname.split('.staging.nectarlabs.dev')[0];
      } else if (hostname.includes('.nectarlabs.dev')) {
        parsed = hostname.split('.nectarlabs.dev')[0];
      } else if (hostname.includes('.localhost:3000')) {
        parsed = hostname.split('.localhost:3000')[0];
      } else if (hostname.includes('.localhost:3002')) {
        parsed = hostname.split('.localhost:3002')[0];
      } else if (hostname.includes('.localhost')) {
        parsed = hostname.split('.localhost')[0];
      }

      if (parsed && parsed !== 'www' && parsed !== 'api' && parsed !== 'admin' && parsed !== 'staging') {
        setSubdomain(parsed);
      }
    }
  }, [rawSubdomain]);

  // Load and check credentials
  useEffect(() => {
    if (!subdomain) return;

    const loadAdminData = async () => {
      try {
        // Fetch public tenant info to resolve owner ID and name
        const res = await fetch(`/api/tenants/public-config/?subdomain=${subdomain}`);
        if (!res.ok) throw new Error('Portal no encontrado o inactivo');
        const config: TenantConfig = await res.json();
        setTenantConfig(config);

        // Populate customization states
        setEditName(config.name);
        setEditPortalTitle(config.portal_title || '');
        setEditWelcomeMessage(config.welcome_message);
        setEditFooterText(config.footer_text || '');
        setEditRequireCustomerInfo(config.require_customer_info);
        setEditThemeColor(config.theme_color);
        setEditAccentColor(config.accent_color);
        setEditBgColor(config.bg_color);
        setEditCardBgColor(config.card_bg_color);
        setEditTextColor(config.text_color);
        setEditBorderColor(config.border_color);
        setEditLogoUrl(config.logo_url || '');

        // Fetch current user me to validate ownership
        const me = await fetcher('/users/me/');
        setUserMe(me);

        const isOwner = me.id === config.owner;
        const isSystemAdmin = me.is_staff || me.role === 'ADMIN';

        if (isOwner || isSystemAdmin) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (err: any) {
        console.error('Error loading admin settings:', err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [subdomain]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantConfig) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('portal_title', editPortalTitle.trim());
      formData.append('welcome_message', editWelcomeMessage.trim());
      formData.append('footer_text', editFooterText.trim());
      formData.append('require_customer_info', String(editRequireCustomerInfo));
      formData.append('theme_color', editThemeColor);
      formData.append('accent_color', editAccentColor);
      formData.append('bg_color', editBgColor);
      formData.append('card_bg_color', editCardBgColor);
      formData.append('text_color', editTextColor);
      formData.append('border_color', editBorderColor);

      if (editLogoFile) {
        formData.append('logo', editLogoFile);
      } else {
        formData.append('logo_url', editLogoUrl.trim());
      }

      const updated = await fetcher(`/tenants/${tenantConfig.id}/`, {
        method: 'PATCH',
        body: formData
      });

      setTenantConfig(updated);
      showToast('Configuración de marca actualizada con éxito.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar configuraciones', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditLogoFile(file);
      setEditLogoPreview(URL.createObjectURL(file));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020403] text-white flex flex-col items-center justify-center font-sans">
        <span className="w-8 h-8 rounded-full border-4 border-t-white border-white/10 animate-spin"></span>
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-white/50">Cargando Panel de Control...</p>
      </div>
    );
  }

  if (!authorized || !tenantConfig) {
    return (
      <div className="min-h-screen bg-[#020403] text-white flex flex-col items-center justify-center font-sans px-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center text-3xl mb-6">
          🔒
        </div>
        <h1 className="text-xl font-black text-white uppercase tracking-widest mb-2">Acceso Denegado</h1>
        <p className="text-sm text-white/50 max-w-sm leading-relaxed">
          No tienes permisos para administrar este portal. Debes iniciar sesión como el propietario del Tenant o administrador del sistema.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="mt-8 px-8 py-3.5 bg-nectar-gold text-background rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-nectar-gold/25 font-bold"
        >
          Iniciar Sesión
        </button>
      </div>
    );
  }

  const activeAddonsList = tenantConfig.active_addons || [];
  const primaryColor = tenantConfig.theme_color || '#C68A1E';

  return (
    <div id="tenant-admin-root" className="min-h-screen flex flex-col font-sans">
      <style>{`
        #tenant-admin-root {
          background-color: ${tenantConfig.bg_color || '#020403'} !important;
          color: ${tenantConfig.text_color || '#FFFFFF'} !important;
        }
        #tenant-admin-root .admin-header {
          background-color: ${tenantConfig.card_bg_color || '#050a06'}80 !important;
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
        }
        #tenant-admin-root .admin-card {
          background-color: ${tenantConfig.card_bg_color || '#050a06'}a0 !important;
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
        }
        #tenant-admin-root .admin-input {
          background-color: ${tenantConfig.bg_color || '#020403'} !important;
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
          color: ${tenantConfig.text_color || '#FFFFFF'} !important;
        }
        #tenant-admin-root .admin-border {
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
        }
      `}</style>

      {/* Header Panel */}
      <header className="border-b backdrop-blur-md sticky top-0 z-40 admin-header">
        <div className="max-w-7xl mx-auto px-6 h-18 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {tenantConfig.logo_url ? (
              <img src={tenantConfig.logo_url} alt={tenantConfig.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
            ) : (
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-background" style={{ backgroundColor: primaryColor }}>
                {tenantConfig.name.substring(0,1).toUpperCase()}
              </span>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black uppercase tracking-tight text-white">{tenantConfig.name}</h1>
                <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/20 text-[6px] font-black rounded-full uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
              <p className="text-[8px] uppercase tracking-widest font-black opacity-50 mt-0.5">Control de Configuración y Add-ons</p>
            </div>
          </div>

          {/* Navigation Tab selectors */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('metrics')}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer"
              style={{
                backgroundColor: activeTab === 'metrics' ? `${primaryColor}15` : 'transparent',
                borderColor: activeTab === 'metrics' ? primaryColor : 'transparent',
                color: activeTab === 'metrics' ? primaryColor : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              📊 Métricas Add-ons
            </button>
            <button
              onClick={() => setActiveTab('branding')}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer"
              style={{
                backgroundColor: activeTab === 'branding' ? `${primaryColor}15` : 'transparent',
                borderColor: activeTab === 'branding' ? primaryColor : 'transparent',
                color: activeTab === 'branding' ? primaryColor : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              🎨 Personalizar Portal
            </button>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-white/80"
            >
              Volver a Néctar
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col">
        {activeTab === 'metrics' ? (
          /* Metrics Dashboard */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header info */}
            <div className="admin-card border rounded-[2rem] p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
              <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>
              <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] flex items-center justify-center text-3xl border border-white/5">
                📊
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Analíticas de Ecosistema</h2>
                <p className="text-xs text-white/50 leading-relaxed">
                  Monitorea el uso, tráfico, conversiones y cuotas contratadas de tus módulos activos dentro de tu inquilino de Néctar Labs.
                </p>
              </div>
              <div className="px-4 py-2 bg-foreground/5 rounded-2xl border border-white/5 flex flex-col items-center shrink-0">
                <span className="text-[7px] uppercase font-black tracking-widest text-white/40">Add-ons Contratados</span>
                <span className="text-xl font-black text-nectar-gold mt-1">{activeAddonsList.length} / 6</span>
              </div>
            </div>

            {/* Grid layout for addons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 1. Live Chat */}
              <AddonMetricCard
                slug="live-chat"
                title="Soporte en Vivo (ChatWidget)"
                icon="💬"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Chats Hoy",
                  leftVal: "48",
                  rightLabel: "Resp. Promedio",
                  rightVal: "1.4 min"
                }}
              >
                <div className="h-28 flex items-end justify-between px-2 pt-4">
                  {/* Mock Bar Chart */}
                  {[35, 42, 28, 55, 64, 48, 70].map((h, i) => (
                    <div key={i} className="w-[11%] flex flex-col items-center gap-1.5 group cursor-pointer">
                      <span className="text-[7px] font-mono text-nectar-gold opacity-0 group-hover:opacity-100 transition-opacity">{h}</span>
                      <div className="w-full bg-nectar-gold/10 group-hover:bg-nectar-gold/30 rounded-t-md transition-all duration-300" style={{ height: `${h}%` }}></div>
                      <span className="text-[7px] text-white/30 uppercase font-black tracking-widest">{['L','M','X','J','V','S','D'][i]}</span>
                    </div>
                  ))}
                </div>
              </AddonMetricCard>

              {/* 2. Booking Signature */}
              <AddonMetricCard
                slug="booking-signature"
                title="Agenda y Citas (BookingCanvas)"
                icon="📅"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Citas Confirmadas",
                  leftVal: "112",
                  rightLabel: "Conversión",
                  rightVal: "18.4%"
                }}
              >
                {/* SVG Curve for Appointments */}
                <div className="h-28 relative pt-4 flex items-center justify-center">
                  <svg className="w-full h-20 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient-booking" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Background Fill under line */}
                    <path d="M 0 30 L 10 20 L 30 25 L 50 12 L 70 18 L 90 5 L 100 10 L 100 30 Z" fill="url(#gradient-booking)" />
                    {/* Stroke line */}
                    <path d="M 0 30 L 10 20 L 30 25 L 50 12 L 70 18 L 90 5 L 100 10" fill="none" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Highlight Dot */}
                    <circle cx="90" cy="5" r="2.5" fill="#10B981" className="animate-ping origin-center" />
                    <circle cx="90" cy="5" r="1.5" fill="#FFFFFF" />
                  </svg>
                  <div className="absolute bottom-0 inset-x-0 flex justify-between px-2 text-[6px] text-white/30 font-bold uppercase tracking-widest">
                    <span>Ene</span>
                    <span>Mar</span>
                    <span>May</span>
                  </div>
                </div>
              </AddonMetricCard>

              {/* 3. Logistics GPS */}
              <AddonMetricCard
                slug="logistics-gps"
                title="GPS y Logística (FleetMap)"
                icon="📍"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Vehículos Activos",
                  leftVal: "14",
                  rightLabel: "Entregas Hoy",
                  rightVal: "96.8%"
                }}
              >
                {/* Visual Route Mockup */}
                <div className="h-28 flex flex-col justify-center px-4 space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold">
                      <span className="text-white/60">Camión A-102 (En Ruta)</span>
                      <span className="text-nectar-gold font-mono">82%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-nectar-gold h-full rounded-full animate-[pulse_2s_infinite]" style={{ width: '82%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold">
                      <span className="text-white/60">Camión B-305 (En Reparto)</span>
                      <span className="text-emerald-400 font-mono">94%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                </div>
              </AddonMetricCard>

              {/* 4. Patreon Sponsorship */}
              <AddonMetricCard
                slug="patreon-sponsorship"
                title="Patrocinios (SponsorTiers)"
                icon="💎"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Patrocinadores",
                  leftVal: "384",
                  rightLabel: "Ingresos MRR",
                  rightVal: "$12,450"
                }}
              >
                <div className="h-28 relative pt-4 flex items-center justify-center">
                  <svg className="w-full h-20 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient-patreon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C68A1E" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#C68A1E" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 30 L 15 28 L 30 20 L 45 22 L 60 14 L 75 10 L 90 6 L 100 2 L 100 30 Z" fill="url(#gradient-patreon)" />
                    <path d="M 0 30 L 15 28 L 30 20 L 45 22 L 60 14 L 75 10 L 90 6 L 100 2" fill="none" stroke="#C68A1E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="100" cy="2" r="2.5" fill="#C68A1E" className="animate-ping origin-center" />
                    <circle cx="100" cy="2" r="1.5" fill="#FFFFFF" />
                  </svg>
                  <div className="absolute bottom-0 inset-x-0 flex justify-between px-2 text-[6px] text-white/30 font-bold uppercase tracking-widest">
                    <span>Sem 1</span>
                    <span>Sem 2</span>
                    <span>Sem 3</span>
                    <span>Sem 4</span>
                  </div>
                </div>
              </AddonMetricCard>

              {/* 5. APM / Analítica */}
              <AddonMetricCard
                slug="analytics-apm"
                title="Métricas APM (Telemetry)"
                icon="📊"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Latencia Promedio",
                  leftVal: "142 ms",
                  rightLabel: "Llamadas API",
                  rightVal: "2.4M / mes"
                }}
              >
                {/* SVG APM Ring and Bar */}
                <div className="h-28 flex items-center justify-around px-4 pt-2">
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-white/5" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-emerald-400" strokeDasharray="98, 100" strokeWidth="3.2" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="absolute text-[8px] font-black text-emerald-400 font-mono">99.8%</span>
                  </div>
                  <div className="flex-1 max-w-[120px] flex flex-col justify-center gap-2">
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[7px] font-bold text-white/55">
                        <span>CPU Load</span>
                        <span className="font-mono">24%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: '24%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[7px] font-bold text-white/55">
                        <span>Memory</span>
                        <span className="font-mono">68%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: '68%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </AddonMetricCard>

              {/* 6. Newsletter Campaigner */}
              <AddonMetricCard
                slug="newsletter-campaigner"
                title="Campañas y Boletines (Subscribe)"
                icon="✉️"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Suscriptores",
                  leftVal: "1,240",
                  rightLabel: "Tasa de Apertura",
                  rightVal: "42.1%"
                }}
              >
                {/* Progress Wheel and usage numbers */}
                <div className="h-28 flex items-center justify-around px-4 pt-2">
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-white/5" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-nectar-gold" strokeDasharray="34, 100" strokeWidth="3.2" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="absolute text-[8px] font-black text-nectar-gold font-mono">34%</span>
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-[7px] uppercase font-black tracking-widest text-white/30 block">Consumo Mensual</span>
                    <h4 className="text-xs font-black text-white font-mono leading-none">3,400 / 10,000</h4>
                    <p className="text-[7.5px] text-white/40">Renueva en 12 días</p>
                  </div>
                </div>
              </AddonMetricCard>

            </div>
          </div>
        ) : (
          /* Portal Customization Form */
          <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
            <form onSubmit={handleSaveConfig} className="space-y-8">
              <div className="admin-card border rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden text-left space-y-6">
                
                <div>
                  <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                    Estilo e Identidad
                  </span>
                  <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none text-white">Ajustes de Marca</h2>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Configura cómo verán tus clientes el portal de soporte y tus addons</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-nectar-gold border-b border-white/5 pb-2">Información General</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Nombre del Negocio</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Título del Portal Público</label>
                      <input
                        type="text"
                        placeholder="Ej. Centro de Ayuda e Innovación"
                        value={editPortalTitle}
                        onChange={(e) => setEditPortalTitle(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Mensaje de Bienvenida</label>
                      <textarea
                        required
                        rows={3}
                        value={editWelcomeMessage}
                        onChange={(e) => setEditWelcomeMessage(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Texto de Pie de Página (Footer)</label>
                      <input
                        type="text"
                        placeholder="Ej. Todos los derechos reservados."
                        value={editFooterText}
                        onChange={(e) => setEditFooterText(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={editRequireCustomerInfo}
                        onChange={(e) => setEditRequireCustomerInfo(e.target.checked)}
                        className="w-4 h-4 accent-nectar-gold"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">Requerir Nombre antes de Chatear</span>
                    </label>
                  </div>

                  {/* Visual Style Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-nectar-gold border-b border-white/5 pb-2">Colores de Interfaz (CSS Palette)</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Color Primario</label>
                        <div className="flex gap-2">
                          <input type="color" value={editThemeColor} onChange={(e) => setEditThemeColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editThemeColor} onChange={(e) => setEditThemeColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Color Acento</label>
                        <div className="flex gap-2">
                          <input type="color" value={editAccentColor} onChange={(e) => setEditAccentColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editAccentColor} onChange={(e) => setEditAccentColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Fondo General</label>
                        <div className="flex gap-2">
                          <input type="color" value={editBgColor} onChange={(e) => setEditBgColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editBgColor} onChange={(e) => setEditBgColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Fondo Tarjetas</label>
                        <div className="flex gap-2">
                          <input type="color" value={editCardBgColor} onChange={(e) => setEditCardBgColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editCardBgColor} onChange={(e) => setEditCardBgColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Color del Texto</label>
                        <div className="flex gap-2">
                          <input type="color" value={editTextColor} onChange={(e) => setEditTextColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editTextColor} onChange={(e) => setEditTextColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Bordes / Divisiones</label>
                        <div className="flex gap-2">
                          <input type="color" value={editBorderColor} onChange={(e) => setEditBorderColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editBorderColor} onChange={(e) => setEditBorderColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>
                    </div>

                    {/* Logo Section */}
                    <div className="space-y-2 pt-2">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block">Logotipo del Portal</label>
                      <div className="flex items-center gap-4">
                        {(editLogoPreview || editLogoUrl) ? (
                          <img src={editLogoPreview || editLogoUrl} alt="Logo Preview" className="w-14 h-14 rounded-2xl object-cover border border-white/10 bg-black/40 shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl border border-dashed border-white/15 bg-white/[0.01] flex items-center justify-center text-xl shrink-0">
                            🖼️
                          </div>
                        )}
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                            id="logo-upload-input"
                          />
                          <label
                            htmlFor="logo-upload-input"
                            className="inline-block px-4 py-2 border border-white/10 hover:border-nectar-gold bg-foreground/5 text-white text-[9px] font-black uppercase tracking-widest rounded-xl cursor-pointer hover:scale-102 active:scale-95 transition-all text-center"
                          >
                            Subir Logotipo
                          </label>
                          <input
                            type="text"
                            placeholder="O introduce una URL de imagen..."
                            value={editLogoUrl}
                            onChange={(e) => {
                              setEditLogoUrl(e.target.value);
                              setEditLogoFile(null);
                              setEditLogoPreview(null);
                            }}
                            className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-3.5 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg shadow-nectar-gold/25"
                  >
                    {isSaving ? 'Guardando Ajustes...' : 'Guardar Cambios'}
                  </button>
                </div>

              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="border-t py-6 admin-header mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-bold text-white/30 uppercase tracking-widest">
          <span>&copy; {new Date().getFullYear()} {tenantConfig.name} - Centro de Control</span>
          <span>Desarrollado bajo licencia de Néctar Labs</span>
        </div>
      </footer>

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

interface AddonCardProps {
  slug: string;
  title: string;
  icon: string;
  activeList: string[];
  primaryColor: string;
  metrics: {
    leftLabel: string;
    leftVal: string;
    rightLabel: string;
    rightVal: string;
  };
  children?: React.ReactNode;
}

function AddonMetricCard({ slug, title, icon, activeList, primaryColor, metrics, children }: AddonCardProps) {
  const isActive = activeList.includes(slug);

  return (
    <div className="admin-card border rounded-[2rem] p-6 shadow-lg flex flex-col justify-between relative overflow-hidden group">
      
      {/* 1. Header (Icon + Title) */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-white/5 flex items-center justify-center text-lg shrink-0">
            {icon}
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wide text-white leading-tight">{title}</h4>
            <span className="text-[6.5px] uppercase tracking-widest font-black opacity-45">Slug: {slug}</span>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 border text-[7px] font-black uppercase tracking-widest rounded-full ${
          isActive 
            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>
          {isActive ? 'Activo' : 'Bloqueado'}
        </span>
      </div>

      {/* 2. Visual Content Area */}
      <div className={`relative flex-1 ${!isActive ? 'blur-sm select-none pointer-events-none' : ''}`}>
        {children ? children : (
          <div className="h-28 flex items-center justify-center text-[10px] text-white/20 uppercase font-black tracking-widest">
            Sin Vista Previa de Datos
          </div>
        )}
      </div>

      {/* 3. Highlight numbers footer */}
      <div className={`grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-4 ${!isActive ? 'blur-sm select-none pointer-events-none' : ''}`}>
        <div className="text-left">
          <span className="text-[7px] uppercase font-black tracking-widest text-white/35 block">{metrics.leftLabel}</span>
          <span className="text-base font-black text-white font-mono mt-0.5 block">{metrics.leftVal}</span>
        </div>
        <div className="text-right">
          <span className="text-[7px] uppercase font-black tracking-widest text-white/35 block">{metrics.rightLabel}</span>
          <span className="text-base font-black text-white font-mono mt-0.5 block" style={{ color: isActive ? primaryColor : '#C68A1E' }}>{metrics.rightVal}</span>
        </div>
      </div>

      {/* 4. Active Addon Gating Overlay (Visual Guard) */}
      {!isActive && (
        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[3px] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-xl bg-nectar-gold/10 border border-nectar-gold/20 text-nectar-gold flex items-center justify-center text-lg shadow-lg shadow-nectar-gold/10 mb-3 animate-[bounce_3s_infinite]">
            🔒
          </div>
          <h5 className="text-[10px] font-black uppercase tracking-wider text-white">Módulo No Contratado</h5>
          <p className="text-[8px] text-white/50 max-w-[180px] leading-relaxed mt-1 mb-4">
            Adquiere este Add-on en el Catálogo de Néctar Labs para habilitar sus analíticas en tiempo real.
          </p>
          <a
            href="/dashboard/addons"
            className="px-4 py-2 bg-nectar-gold text-background text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md font-bold"
          >
            Adquirir Add-on
          </a>
        </div>
      )}

    </div>
  );
}
