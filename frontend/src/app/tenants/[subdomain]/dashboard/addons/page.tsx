'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';

interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  welcome_message: string;
  portal_title: string | null;
  footer_text: string | null;
  theme_color: string;
  accent_color: string;
  bg_color: string;
  card_bg_color: string;
  text_color: string;
  border_color: string;
  active_addons?: string[];
}

interface AddonCatalogItem {
  id: string;
  name: string;
  categoryBadge: string;
  description: string;
  monthlyPrice: number;
  icon: string;
}

const allAddons: AddonCatalogItem[] = [
  {
    id: 'bot-chat',
    name: 'Néctar AI Chat Bot',
    categoryBadge: 'COMUNICACIÓN EN VIVO',
    description: 'Widget de chat flotante en tiempo real y consola multi-agente con soporte de IA.',
    monthlyPrice: 99,
    icon: '💬'
  },
  {
    id: 'booking-signature',
    name: 'Néctar Contratos Digitales',
    categoryBadge: 'CONTRATOS Y CITAS',
    description: 'Motor de reserva de citas integrado con firma digital de propuestas y generación de PDFs con firma incrustada.',
    monthlyPrice: 149,
    icon: '✍️'
  },
  {
    id: 'delivery-tracking',
    name: 'Tienda + Envíos',
    categoryBadge: 'LOGÍSTICA Y CONTROL',
    description: 'Configura tus almacenes de origen, cotiza envíos en tiempo real con margen de ganancia y emite guías automáticamente.',
    monthlyPrice: 249,
    icon: '📦'
  },
  {
    id: 'sponsorship',
    name: 'Néctar Sponsors & NSCAP',
    categoryBadge: 'MONETIZACIÓN',
    description: 'Pasarela de suscripciones recurrentes de Stripe con control de acceso a feeds exclusivos y niveles de membresía.',
    monthlyPrice: 169,
    icon: '💰'
  },
  {
    id: 'business-analytics',
    name: 'Néctar Administrador de Ventas y Analytics',
    categoryBadge: 'MONITOREO DE DESEMPEÑO',
    description: 'Dashboard de métricas en tiempo real, gráficos interactivos y exportación de transacciones.',
    monthlyPrice: 99,
    icon: '📊'
  },
  {
    id: 'campaigner',
    name: 'Néctar Newsletter y Campañas de Email',
    categoryBadge: 'EMAIL MARKETING',
    description: 'Gestor de suscripciones, programador de campañas con plantillas HTML y envío masivo optimizado.',
    monthlyPrice: 199,
    icon: '📧'
  },
  {
    id: 'facturacion-cfdi',
    name: 'Facturación SAT México',
    categoryBadge: 'CONTABILIDAD Y FISCAL',
    description: 'Emite facturas CFDI 4.0 oficiales del SAT a tus clientes de manera automatizada y marca blanca.',
    monthlyPrice: 499,
    icon: '🧾'
  },
  {
    id: 'automatic-invoicing',
    name: 'Facturación Automática SAT',
    categoryBadge: 'CONTABILIDAD Y FISCAL',
    description: 'Timbrado automático e inmediato de facturas CFDI 4.0 al recibir pagos de tus clientes finales.',
    monthlyPrice: 199,
    icon: '⚡'
  },
  {
    id: 'pos-system',
    name: 'Punto de Venta POS & Nota de Venta',
    categoryBadge: 'VENTAS Y POS',
    description: 'Sistema POS interactivo para registrar ventas presenciales, generar notas de venta y permitir autofacturación a clientes.',
    monthlyPrice: 299,
    icon: '🏪'
  },
  {
    id: 'ecommerce-combo',
    name: 'Combo E-commerce Automatizado',
    categoryBadge: 'E-COMMERCE COMBO',
    description: 'El paquete integral definitivo: Tienda + Envíos con Skydropx, Facturación SAT y Newsletter Masivo en uno.',
    monthlyPrice: 799,
    icon: '🚀'
  }
];

export default function TenantDashboardAddonsPage() {
  const params = useParams();
  const router = useRouter();
  const rawSubdomain = params?.subdomain as string;
  const [subdomain, setSubdomain] = useState<string>('');
  
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Resolve subdomain dynamically
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

  // Fetch Public Config
  useEffect(() => {
    if (!subdomain) return;

    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/tenants/public-config/?subdomain=${subdomain}`);
        if (!res.ok) throw new Error('Portal no encontrado o inactivo');
        const data = await res.json();
        setTenantConfig(data);
      } catch (err: any) {
        setError(err.message || 'Error al conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [subdomain]);

  useEffect(() => {
    if (tenantConfig) {
      document.title = `Add-ons - ${tenantConfig.name}`;
    }
  }, [tenantConfig]);

  // Helper to build main domain URL to avoid subdomain routing on Nectar dashboard
  const getMainDomainUrl = (path: string) => {
    if (typeof window === 'undefined') return path;
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    let mainDomain = 'nectarlabs.dev';
    if (hostname.includes('.staging.nectarlabs.dev')) {
      mainDomain = 'staging.nectarlabs.dev';
    } else if (hostname.includes('.nectarlabs.dev')) {
      mainDomain = 'nectarlabs.dev';
    } else if (hostname.includes('localhost')) {
      mainDomain = 'localhost';
    }

    const portSuffix = port ? `:${port}` : '';
    return `${protocol}//${mainDomain}${portSuffix}${path}`;
  };

  const handleRedirectToMain = () => {
    if (typeof window !== 'undefined') {
      const url = getMainDomainUrl('/dashboard/addons');
      window.location.href = url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020403] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-white border-white/10 animate-spin"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Cargando Módulos...</span>
      </div>
    );
  }

  if (error || !tenantConfig) {
    return (
      <div className="min-h-screen bg-[#020403] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#050a06] border border-white/15 p-8 rounded-[2rem] space-y-6">
          <span className="text-4xl block">⚠️</span>
          <h2 className="text-lg font-black uppercase text-white">Error de Conexión</h2>
          <p className="text-xs text-white/60 leading-relaxed font-mono">
            {error || 'El portal del inquilino no está disponible.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] uppercase font-black tracking-wider hover:bg-white/10 transition-all cursor-pointer"
          >
            Ir a Inicio
          </button>
        </div>
      </div>
    );
  }

  const primaryColor = tenantConfig.theme_color || '#C68A1E';
  const activeList = tenantConfig.active_addons || [];

  // Categorize addons
  const activeAddons = allAddons.filter((addon) => {
    // Check both base match and specific aliases
    if (activeList.includes(addon.id)) return true;
    if (addon.id === 'campaigner' && activeList.includes('newsletter-campaigner')) return true;
    if (addon.id === 'delivery-tracking' && activeList.includes('logistics-gps')) return true;
    return false;
  });

  const pendingAddons = allAddons.filter((addon) => {
    if (activeList.includes(addon.id)) return false;
    if (addon.id === 'campaigner' && activeList.includes('newsletter-campaigner')) return false;
    if (addon.id === 'delivery-tracking' && activeList.includes('logistics-gps')) return false;
    return true;
  });

  return (
    <div 
      className="min-h-screen flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans"
      style={{ backgroundColor: tenantConfig.bg_color || '#020403', color: tenantConfig.text_color || '#FFFFFF' }}
    >
      {toast && (
        <div className="fixed bottom-6 right-6 z-55 max-w-sm animate-in fade-in slide-in-from-bottom-5">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full flex-1">
        {/* Navigation back and header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-8 mb-8">
          <div>
            <button
              onClick={() => router.push(`/portal-admin`)}
              className="text-[8.5px] uppercase font-black tracking-widest text-white/40 hover:text-white flex items-center gap-1.5 cursor-pointer font-mono mb-2"
            >
              ← Regresar al Centro de Control
            </button>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Catálogo de Módulos & Add-ons
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-white/45 mt-0.5">
              Gestiona el equipamiento tecnológico de {tenantConfig.name}
            </p>
          </div>

          <button
            onClick={handleRedirectToMain}
            className="px-6 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
          >
            💳 Comprar Add-ons en Panel Central
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/5 pb-4 mb-8 gap-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white/5 text-white border-white/20'
                : 'bg-transparent text-white/40 border-transparent hover:text-white/70'
            }`}
            style={activeTab === 'pending' ? { borderColor: primaryColor } : {}}
          >
            Pendientes de Activar ({pendingAddons.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
              activeTab === 'active'
                ? 'bg-white/5 text-white border-white/20'
                : 'bg-transparent text-white/40 border-transparent hover:text-white/70'
            }`}
            style={activeTab === 'active' ? { borderColor: primaryColor } : {}}
          >
            Activos en tu Plan ({activeAddons.length})
          </button>
        </div>

        {/* Catalog Grid */}
        {activeTab === 'pending' ? (
          pendingAddons.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01]">
              <span className="text-4xl block mb-3">🎖️</span>
              <h3 className="text-sm font-black uppercase text-white tracking-widest">¡Todos los Módulos Activos!</h3>
              <p className="text-[9px] text-white/40 uppercase tracking-wider mt-1.5 max-w-sm mx-auto leading-relaxed">
                Has contratado e instalado todos los módulos de software disponibles de Néctar Labs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {pendingAddons.map((addon) => (
                <div 
                  key={addon.id}
                  className="border rounded-[2rem] p-6 flex flex-col justify-between min-h-[300px] relative overflow-hidden backdrop-blur-md hover:scale-[1.02] transition-all duration-300 group"
                  style={{ 
                    backgroundColor: tenantConfig.card_bg_color || '#050a06', 
                    borderColor: tenantConfig.border_color || '#151F18' 
                  }}
                >
                  {/* Subtle Background Glow */}
                  <div className="absolute -top-24 -right-24 w-40 h-40 bg-white/[0.02] blur-[40px] rounded-full group-hover:bg-white/[0.04] transition-all duration-500 pointer-events-none"></div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-3xl">{addon.icon}</span>
                      <span className="px-2.5 py-0.5 bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/25 text-[7px] font-black rounded-full uppercase tracking-wider font-mono">
                        {addon.categoryBadge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black uppercase text-white tracking-wide mt-2">{addon.name}</h3>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-2 line-clamp-4">{addon.description}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center">
                    <div>
                      <span className="text-[7.5px] uppercase font-black text-white/35 block">Precio mensual</span>
                      <span className="text-base font-black text-white font-mono" style={{ color: primaryColor }}>
                        ${addon.monthlyPrice} USD
                      </span>
                    </div>
                    
                    <button
                      onClick={handleRedirectToMain}
                      className="px-4 py-2 text-background text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Activar Add-on
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          activeAddons.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01]">
              <span className="text-4xl block mb-3">🏪</span>
              <h3 className="text-sm font-black uppercase text-white tracking-widest">Sin Add-ons Activos</h3>
              <p className="text-[9px] text-white/40 uppercase tracking-wider mt-1.5 max-w-sm mx-auto leading-relaxed">
                Aún no has activado add-ons en este portal. Ve a la sección de pendientes para equipar tu negocio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {activeAddons.map((addon) => (
                <div 
                  key={addon.id}
                  className="border rounded-[2rem] p-6 flex flex-col justify-between min-h-[300px] relative overflow-hidden backdrop-blur-md hover:scale-[1.02] transition-all duration-300 group"
                  style={{ 
                    backgroundColor: tenantConfig.card_bg_color || '#050a06', 
                    borderColor: tenantConfig.border_color || '#151F18' 
                  }}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-3xl">{addon.icon}</span>
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[7px] font-black rounded-full uppercase tracking-wider font-mono">
                        ✔️ Activo
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black uppercase text-white tracking-wide mt-2">{addon.name}</h3>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-2 line-clamp-4">{addon.description}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center">
                    <div>
                      <span className="text-[7.5px] uppercase font-black text-white/35 block">Módulo Licenciado</span>
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                        Listo para usar
                      </span>
                    </div>
                    
                    <button
                      onClick={() => router.push(`/portal-admin`)}
                      className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      Configurar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Footer copyright */}
      <footer className="max-w-6xl mx-auto w-full text-center mt-12 border-t border-white/5 pt-6">
        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
          {tenantConfig.footer_text || `© ${new Date().getFullYear()} ${tenantConfig.name}. Todos los derechos reservados.`}
        </p>
        <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-1">
          Infraestructura de Add-ons Proporcionada por Néctar Labs
        </p>
      </footer>
    </div>
  );
}
