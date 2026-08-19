'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetcher } from '@/lib/api';

interface Addon {
  id: string;
  name: string;
  categoryBadge: string;
  description: string;
  detailedDescription: string;
  monthlyPrice: number;
  yearlyPrice: number;
  complexity: 'Baja' | 'Media' | 'Alta' | 'Muy Alta';
  serverRequirements: string;
  technicalDetails: string[];
  icon: React.ReactNode;
}

export const ensureArray = (val: any): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split('\n').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
};

const getAddonIcon = (id: string) => {
  switch (id) {
    case 'pack-ecommerce-lite':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'pack-pos-ecommerce':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v3H9V9z" />
        </svg>
      );
    case 'pack-blog-sponsors':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case 'booking':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'bot-chat':
    case 'live-chat':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case 'booking-signature':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      );
    case 'delivery-tracking':
    case 'driver-unlimited':
    case 'logistics-gps':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'sponsorship':
    case 'patreon-sponsorship':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'business-analytics':
    case 'analytics-apm':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      );
    case 'campaigner':
    case 'newsletter-campaigner':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'facturacion-cfdi':
    case 'mexico-invoicing':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'automatic-invoicing':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'pos-manager':
    case 'ecommerce-combo':
    case 'ecommerce':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    default:
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      );
  }
};

const fallbackAddons: Omit<Addon, 'icon'>[] = [
  {
    id: 'pack-ecommerce-lite',
    name: 'Paquete E-commerce Lite',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Todo para tu tienda en línea: Envíos Nacionales automatizados, Facturación SAT, Tienda Online y Campaigner Lite.',
    detailedDescription: 'El paquete integral ideal para vender en línea de inmediato. Habilita cotización y emisión de guías de envío nacionales con Skydropx, facturación fiscal automatizada CFDI 4.0 con 100 timbres gratis al mes y boletines de email marketing.',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    complexity: 'Alta',
    serverRequirements: 'Integración inmediata a tu portal Néctar con configuración cloud asistida.',
    technicalDetails: [
      'Acceso completo a módulo Tienda + Envíos Nacionales',
      'Acceso completo a módulo Facturación SAT (100 timbres incluidos)',
      'Acceso completo a módulo Newsletter Masivo (Campaigner Lite)',
      'Ahorro directo sobre la contratación de módulos individuales',
      'Automatización comercial unificada de extremo a extremo'
    ]
  },
  {
    id: 'pack-pos-ecommerce',
    name: 'Paquete POS & E-commerce Pro',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Punto de venta físico, Tienda en línea, Envíos automatizados, Facturación SAT y Campaigner Lite.',
    detailedDescription: 'La solución comercial definitiva para negocios omnicanal. Conecta tu mostrador físico (POS) con tu tienda digital mediante inventario unificado en tiempo real, facturación fiscal SAT y marketing automatizado.',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    complexity: 'Muy Alta',
    serverRequirements: 'Sincronización omnicanal multi-dispositivo para mostrador físico y tienda online.',
    technicalDetails: [
      'Consola POS ultra-rápida con soporte para lector de código de barras',
      'Sincronización de inventario físico y digital en tiempo real',
      'Acceso completo a Tienda + Envíos Nacionales',
      'Facturación SAT con 100 timbres incluidos',
      'Campaigner Lite para fidelización de clientes'
    ]
  },
  {
    id: 'pack-blog-sponsors',
    name: 'Paquete Blog & Sponsors',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Monetiza tu contenido: Blog corporativo, Sponsors recurrentes, Tienda Online, Facturación SAT y Campaigner.',
    detailedDescription: 'El paquete ideal para creadores de contenido y marcas. Monetiza tu audiencia mediante membresías y patrocinios recurrentes con Stripe, vende productos físicos o digitales y emite facturas SAT integradas.',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    complexity: 'Media',
    serverRequirements: 'Configuración ágil y cobranza automatizada vía Stripe Connect.',
    technicalDetails: [
      'Suscripciones recurrentes de patrocinadores con niveles flexibles',
      'Feeds y contenido exclusivo para miembros y patrocinios',
      'Acceso completo a Tienda Online',
      'Facturación SAT automatizada',
      'Boletines informativos con Campaigner'
    ]
  },
  {
    id: 'campaigner',
    name: 'Campaigner Masivo',
    categoryBadge: 'EMAIL MARKETING',
    description: 'Envío de boletines y campañas de email masivo con analítica en tiempo real para acelerar tus ventas.',
    detailedDescription: 'Diseña y envía campañas masivas de correo electrónico con plantillas profesionales, control de bajas automático y medición de conversiones para mantener a tu audiencia comprometida.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    complexity: 'Baja',
    serverRequirements: 'Envío asistido de alta entregabilidad por infraestructura prepago ($0.01 MXN/correo).',
    technicalDetails: [
      'Desuscripción segura en un clic y protección anti-spam',
      'Editor visual de correos HTML interactivos',
      'Cobro transparente a $0.01 MXN por correo enviado',
      'Métricas detalladas de apertura y clics'
    ]
  },
  {
    id: 'booking-signature',
    name: 'Néctar Contratos Digitales',
    categoryBadge: 'CONTRATOS DIGITALES',
    description: 'Motor de contratos digitales con firma en pantalla táctil y generación automática de PDFs legales.',
    detailedDescription: 'Digitaliza el cierre de acuerdos comerciales. Genera cotizaciones y contratos profesionales, envía enlaces de firma digital a tus clientes y almacena evidencias firmadas de forma segura.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    complexity: 'Alta',
    serverRequirements: 'Bóveda digital de almacenamiento seguro en la nube con sellado de tiempo.',
    technicalDetails: [
      'Lienzo de firma digital compatible con móviles y computadoras',
      'Generación instantánea de documentos PDF con identidad de marca',
      'Notificaciones y alertas de propuesta por correo electrónico',
      'Firma ilimitada de documentos sin costo adicional por firmante'
    ]
  },
  {
    id: 'booking',
    name: 'Agendador de Citas & Kanban',
    categoryBadge: 'GESTIÓN Y CITAS',
    description: 'Gestor de reservas y citas interactivo integrado con un tablero Kanban para seguimiento operativo.',
    detailedDescription: 'Permite a tus clientes agendar citas directamente desde tu web. Configura tu disponibilidad, evita cruces de agenda y gestiona el estado de cada servicio en un tablero Kanban intuitivo.',
    monthlyPrice: 49,
    yearlyPrice: 490,
    complexity: 'Media',
    serverRequirements: 'Control inteligente de horarios y prevención de solapamientos.',
    technicalDetails: [
      'Calendario de reservas en tiempo real disponible 24/7',
      'Tablero Kanban operativo para seguimiento de citas',
      'Horarios flexibles por especialista o tipo de servicio',
      'Recordatorios automáticos por correo para reducir ausentismo'
    ]
  },
  {
    id: 'bot-chat',
    name: 'Néctar AI Chat Bot',
    categoryBadge: 'COMUNICACIÓN EN VIVO',
    description: 'Widget de chat flotante en tiempo real y consola multi-agente con asistencia inteligente.',
    detailedDescription: 'Aumenta la conversión atendiendo las dudas de tus prospectos al instante. Widget flotante configurable en tu sitio web con panel de atención para tu equipo o asistencia inteligente.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    complexity: 'Media',
    serverRequirements: 'Comunicación en vivo instantánea con resiliencia de conexión.',
    technicalDetails: [
      'Widget flotante elegante e incrustable en cualquier página',
      'Consola de atención unificada para tu equipo de ventas',
      'Asignación ágil de conversaciones y seguimiento de estado',
      'Historial persistente de conversaciones por cliente'
    ]
  }
];

export default function AddonShowcase() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
  const [addonsList, setAddonsList] = useState<Addon[]>(() =>
    fallbackAddons.map(a => ({
      ...a,
      icon: getAddonIcon(a.id)
    })) as Addon[]
  );

  const packages = addonsList.filter(addon => addon.id.startsWith('pack-'));
  const modules = addonsList.filter(addon => !addon.id.startsWith('pack-'));

  const renderAddonCard = (addon: Addon) => {
    const price = billingCycle === 'monthly' ? addon.monthlyPrice : addon.yearlyPrice;
    const savings = billingCycle === 'yearly' ? addon.monthlyPrice * 2 : 0;
    return (
      <div
        key={addon.id}
        className="bg-card-bg border border-card-border p-6 rounded-[2rem] flex flex-col justify-between min-h-[300px] relative overflow-hidden backdrop-blur-md hover:scale-[1.02] transition-all duration-300 group"
      >
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-40 h-40 bg-white/[0.02] blur-[40px] rounded-full group-hover:bg-white/[0.04] transition-all duration-500 pointer-events-none"></div>

        <div className="space-y-4">
          {/* Category Badge & Icon */}
          <div className="flex justify-between items-start">
            <span className="text-3xl">{addon.icon}</span>
            <span className="px-2.5 py-0.5 bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/25 text-[7px] font-black rounded-full uppercase tracking-wider font-mono">
              {addon.categoryBadge}
            </span>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="text-sm font-black uppercase text-nectar-forest dark:text-white tracking-wide mt-2">{addon.name}</h3>
            <p className="text-[10px] text-nectar-forest/70 dark:text-white/50 leading-relaxed mt-2 line-clamp-4">{addon.description}</p>
          </div>
        </div>

        {/* Pricing & Call to Action */}
        <div className="border-t border-card-border pt-4 mt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-[7.5px] uppercase font-black text-nectar-forest/50 dark:text-white/35 block">
                Precio {billingCycle === 'monthly' ? 'mensual' : 'anual'}
              </span>
              <span className="text-base font-black text-[#C68A1E] font-mono">
                ${price.toLocaleString('es-MX')} MXN
              </span>
              {billingCycle === 'yearly' && savings > 0 && (
                <p className="text-[7px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">
                  Ahorro de ${savings.toLocaleString('es-MX')} MXN
                </p>
              )}
            </div>

            <span className="text-[7px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
              Valor de Negocio
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedAddon(addon)}
              className="px-4 py-2 bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 text-foreground text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer text-center"
            >
              Ficha
            </button>
            <Link href={`/dashboard/addons?request=${addon.id}`} className="w-full">
              <button
                className="w-full px-4 py-2 text-background text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer text-center"
                style={{ backgroundColor: '#C68A1E' }}
              >
                Integrar
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const loadAddons = async () => {
      try {
        const data = await fetcher('/addons/', { isPublic: true });
        if (Array.isArray(data)) {
          const mapped: Addon[] = data.map((item: any) => {
            const addonSlug = item.slug || item.id || '';
            return {
              id: addonSlug,
              name: item.name || 'Módulo',
              categoryBadge: item.category_badge || 'MÓDULO ADICIONAL',
              description: item.description || '',
              detailedDescription: item.detailed_description || item.description || '',
              monthlyPrice: parseFloat(item.monthly_price) || 0,
              yearlyPrice: parseFloat(item.yearly_price) || 0,
              complexity: item.complexity || 'Media',
              serverRequirements: item.server_requirements || 'Infraestructura cloud asistida.',
              technicalDetails: ensureArray(item.technical_details),
              icon: getAddonIcon(addonSlug),
            };
          });
          setAddonsList(mapped);
        }
      } catch (error) {
        console.error("Error loading addons in showcase, using fallback:", error);
      }
    };

    loadAddons();
  }, []);

  return (
    <section className="w-full py-16 sm:py-32 px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10 sm:mb-16 relative">
        <div className="absolute -top-16 sm:-top-32 md:-top-44 left-1/2 -translate-x-1/2 text-[4.5rem] sm:text-[10rem] md:text-[16rem] lg:text-[20rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
          ADDONS
        </div>
        <h2 className="relative text-3xl sm:text-5xl md:text-8xl font-black mb-4 tracking-tighter text-nectar-forest dark:text-nectar-cream leading-none z-10">
          Módulos <span className="text-nectar-gold">Adicionales</span>
        </h2>
        <p className="text-[10px] text-nectar-gold font-black uppercase tracking-[0.5em] relative z-10 mb-6 sm:mb-12">
          Microservicios Independientes a la Carta
        </p>

        {/* Dynamic Billing Cycle Switcher */}
        <div className="inline-flex bg-card-bg border border-card-border p-1.5 rounded-2xl relative z-10 shadow-sm mx-auto">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${billingCycle === 'monthly'
              ? 'bg-nectar-gold text-background shadow-md'
              : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
              }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${billingCycle === 'yearly'
              ? 'bg-nectar-gold text-background shadow-md'
              : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
              }`}
          >
            Anual <span className="text-[7px] text-nectar-cream bg-white/20 px-1 py-0.5 rounded ml-1 font-bold">2 meses gratis</span>
          </button>
        </div>
      </div>

      {/* Add-ons Grid */}
      <div className="space-y-16 relative z-10 animate-in fade-in duration-300">
        {/* Packages Section */}
        {packages.length > 0 && (
          <div>
            <div className="mb-6 border-b border-card-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-nectar-forest dark:text-white flex items-center gap-2">
                  📦 Paquetes de Software Completos
                </h2>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-nectar-gold opacity-80 mt-1">
                  Soluciones integrales llave en mano para tu negocio
                </p>
              </div>
              <span className="px-2.5 py-0.5 bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/25 text-[8px] font-mono rounded font-bold uppercase tracking-wider">
                {packages.length} {packages.length === 1 ? 'Paquete' : 'Paquetes'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map(renderAddonCard)}
            </div>
          </div>
        )}

        {/* Individual Modules Section */}
        {modules.length > 0 && (
          <div>
            <div className="mb-6 border-b border-card-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-nectar-forest dark:text-white flex items-center gap-2">
                  🧩 Módulos & Funcionalidades Individuales
                </h2>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-nectar-gold opacity-80 mt-1">
                  Equipamiento tecnológico específico a la carta
                </p>
              </div>
              <span className="px-2.5 py-0.5 bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/25 text-[8px] font-mono rounded font-bold uppercase tracking-wider">
                {modules.length} {modules.length === 1 ? 'Módulo' : 'Módulos'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map(renderAddonCard)}
            </div>
          </div>
        )}
      </div>

      {/* Modal: View Details / Ficha Técnica */}
      {selectedAddon && (
        <div
          onClick={() => setSelectedAddon(null)}
          className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-premium cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card-bg border border-card-border w-full max-w-2xl rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedAddon(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-full flex items-center justify-center text-lg font-bold transition-all"
            >
              ✕
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-nectar-gold/10 rounded-2xl">
                {selectedAddon.icon}
              </div>
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold block mb-1">
                  Ficha Técnica de Módulo
                </span>
                <h2 className="text-xl sm:text-3xl font-black tracking-tight">{selectedAddon.name}</h2>
              </div>
            </div>

            <p className="text-xs text-muted mb-8 leading-relaxed">
              {selectedAddon.detailedDescription}
            </p>

            <div className="space-y-6 border-t border-card-border pt-8 mb-8">
              {(() => {
                const detailsList = ensureArray(selectedAddon.technicalDetails);
                if (detailsList.length === 0) return null;

                return (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-3">
                      Funcionalidades Clave
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {detailsList.map((detail, idx) => (
                        <li key={idx} className="flex items-center gap-2.5 text-xs text-foreground/80">
                          <span className="w-1.5 h-1.5 bg-nectar-gold rounded-full shrink-0"></span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-card-border/50 pt-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-2">
                    Complejidad e Infraestructura
                  </h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    Requisitos: {selectedAddon.serverRequirements}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-2">
                    Esquema Comercial
                  </h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    Suscripción recurrente en pesos mexicanos (MXN) con integración y soporte incluidos.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href={`/dashboard/addons?request=${selectedAddon.id}`} className="w-full sm:flex-1">
                <button
                  className="w-full py-4 text-xs font-black uppercase tracking-widest bg-nectar-gold text-background hover:scale-[1.02] active:scale-95 transition-all rounded-xl text-center shadow-lg"
                >
                  Adquirir (${billingCycle === 'monthly' ? selectedAddon.monthlyPrice : selectedAddon.yearlyPrice} MXN)
                </button>
              </Link>
              <button
                onClick={() => setSelectedAddon(null)}
                className="w-full sm:w-auto px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-foreground/5 rounded-xl border border-card-border text-center transition-all animate-premium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
