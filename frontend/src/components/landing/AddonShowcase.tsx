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

const getAddonIcon = (id: string) => {
  switch (id) {
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
    case 'logistics-gps':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'patreon-sponsorship':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'analytics-apm':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      );
    case 'newsletter-campaigner':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
    id: 'live-chat',
    name: 'Néctar Live Chat',
    categoryBadge: 'COMUNICACIÓN EN VIVO',
    description: 'Widget de chat flotante en tiempo real y consola multi-agente con historial persistente.',
    detailedDescription: 'Un canal de comunicación instantáneo integrado para retención y soporte de usuarios. Los clientes ven un widget interactivo de chat, mientras que los agentes de soporte gestionan las conversaciones desde una consola interna dedicada.',
    monthlyPrice: 79,
    yearlyPrice: 790,
    complexity: 'Media',
    serverRequirements: 'Django Channels (ASGI) con servidor de caché Redis + Base de Datos relacional.',
    technicalDetails: [
      'Widget JS reactivo y ligero incrustable',
      'Polling persistente o WebSocket fallback',
      'Asignación dinámica de chats a staff técnico',
      'Marcado de estado abierto/resuelto/cerrado'
    ]
  },
  {
    id: 'booking-signature',
    name: 'Néctar Booking & Signature',
    categoryBadge: 'CONTRATOS Y CITAS',
    description: 'Motor de reserva de citas integrado con firma digital de propuestas y generación de PDFs con firma incrustada.',
    detailedDescription: 'Ideal para digitalizar acuerdos contractuales. Permite configurar calendarios interactivos, generar propuestas en PDF al vuelo a partir de plantillas y capturar firmas táctiles o con mouse seguras con marcas de tiempo criptográficas.',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    complexity: 'Alta',
    serverRequirements: 'Almacenamiento seguro en la nube (AWS S3, Azure Blob o similar) para resguardar PDFs + Biblioteca ReportLab.',
    technicalDetails: [
      'Lienzo de firma en React (Canvas HTML5)',
      'Generación de documentos PDF vía backend',
      'Notificaciones de propuesta por correo electrónico con templates HTML',
      'Control de flujos y estados de aprobación'
    ]
  },
  {
    id: 'logistics-gps',
    name: 'Néctar Logistics & GPS',
    categoryBadge: 'LOGÍSTICA Y CONTROL',
    description: 'Seguimiento en tiempo real de repartidores, trazado de rutas óptimas de paradas y cálculo de ETA en mapa interactivo.',
    detailedDescription: 'Módulo de geolocalización industrial. Registra rutas y telemetría GPS, ofreciendo una experiencia interactiva tanto al administrador (consola de flotas) como al usuario final (seguimiento del pedido en tiempo real).',
    monthlyPrice: 249,
    yearlyPrice: 2490,
    complexity: 'Muy Alta',
    serverRequirements: 'Acceso a Mapbox API o Google Maps API para cálculo de rutas + Telemetría persistente de alta frecuencia.',
    technicalDetails: [
      'WebSockets / Polling optimizado para actualización GPS',
      'Consola administrativa con mapas interactivos de flotas',
      'Cálculo inteligente de rutas y paradas ordenadas',
      'Estimaciones de tiempo de entrega basadas en tráfico'
    ]
  },
  {
    id: 'patreon-sponsorship',
    name: 'Néctar Patreon/Sponsorship',
    categoryBadge: 'MONETIZACIÓN',
    description: 'Pasarela de suscripciones recurrentes de Stripe con control de acceso a feeds exclusivos y niveles de membresía.',
    detailedDescription: 'Permite monetizar tu contenido, comunidad o SaaS de manera flexible. Automatiza cobros recurrentes de Stripe, gestiona roles y bloquea o desbloquea secciones de contenido multimedia basándose en el nivel del suscriptor.',
    monthlyPrice: 129,
    yearlyPrice: 1290,
    complexity: 'Media',
    serverRequirements: 'Cuenta comercial de Stripe + Configuración de endpoint para Webhooks HTTPS del backend.',
    technicalDetails: [
      'Integración con Stripe Billing API y Webhooks',
      'Definición de tiers o niveles dinámicos desde Django Admin',
      'Validación automatizada de estatus de membresías en backend',
      'Portal de auto-gestión del suscriptor'
    ]
  },
  {
    id: 'analytics-apm',
    name: 'Néctar Analytics APM',
    categoryBadge: 'MONITOREO DE DESEMPEÑO',
    description: 'Monitor de Core Web Vitals en navegador y telemetría de base de datos con conteo de queries e hilos en tiempo real.',
    detailedDescription: 'Optimiza la infraestructura midiendo el impacto real. Este middleware inyecta telemetría que calcula Web Vitals (LCP, FID, CLS) desde el lado del cliente y registra el tiempo de respuesta y la eficiencia de las consultas SQL en Django.',
    monthlyPrice: 59,
    yearlyPrice: 590,
    complexity: 'Media',
    serverRequirements: 'Módulo de Middleware Django instalado + Agregación de logs asíncrona para no afectar el flujo principal.',
    technicalDetails: [
      'Detección automática de consultas duplicadas (N+1)',
      'Monitoreo del hardware del servidor (CPU/RAM/SSD)',
      'Alertas configurables por lentitud de base de datos',
      'Registro detallado de Web Vitals del navegador del cliente'
    ]
  },
  {
    id: 'newsletter-campaigner',
    name: 'Néctar Newsletter',
    categoryBadge: 'EMAIL MARKETING',
    description: 'Gestor de suscripciones, programador de campañas con plantillas HTML y envío masivo optimizado para SMTP/SES.',
    detailedDescription: 'Envía boletines interactivos a tu base de contactos. Cuenta con un sistema automático de tokens únicos de cancelación de suscripción para cumplir con las normativas internacionales de correo, además de plantillas HTML prediseñadas.',
    monthlyPrice: 39,
    yearlyPrice: 390,
    complexity: 'Baja',
    serverRequirements: 'Servicio de entrega de correos electrónicos configurado (AWS SES, Resend, Sendgrid o un SMTP privado).',
    technicalDetails: [
      'Tokens únicos de desuscripción seguros (UUID)',
      'Render de templates de correo HTML con Django Template Loader',
      'Manejo de estados activos / inactivos de la base de datos',
      'Soporte multi-idioma de plantillas'
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

  useEffect(() => {
    const loadAddons = async () => {
      try {
        const data = await fetcher('/addons/', { isPublic: true });
        if (Array.isArray(data)) {
          const mapped: Addon[] = data.map((item: any) => ({
            id: item.slug,
            name: item.name,
            categoryBadge: item.category_badge,
            description: item.description,
            detailedDescription: item.detailed_description,
            monthlyPrice: parseFloat(item.monthly_price),
            yearlyPrice: parseFloat(item.yearly_price),
            complexity: item.complexity,
            serverRequirements: item.server_requirements,
            technicalDetails: item.technical_details || [],
            icon: getAddonIcon(item.slug),
          }));
          setAddonsList(mapped);
        }
      } catch (error) {
        console.error("Error loading addons in showcase, using fallback:", error);
      }
    };

    loadAddons();
  }, []);

  return (
    <section className="w-full py-32 px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-16 relative">
        <div className="absolute -top-44 left-1/2 -translate-x-1/2 text-[10rem] md:text-[20rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
          ADDONS
        </div>
        <h2 className="relative text-6xl md:text-8xl font-black mb-4 tracking-tighter text-nectar-forest dark:text-nectar-cream leading-none z-10">
          Módulos <span className="text-nectar-gold">Adicionales</span>
        </h2>
        <p className="text-[10px] text-nectar-gold font-black uppercase tracking-[0.5em] relative z-10 mb-12">
          Microservicios Independientes a la Carta
        </p>

        {/* Dynamic Billing Cycle Switcher */}
        <div className="inline-flex bg-card-bg border border-card-border p-1.5 rounded-2xl relative z-10 shadow-sm mx-auto">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${
              billingCycle === 'monthly'
                ? 'bg-nectar-gold text-background shadow-md'
                : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${
              billingCycle === 'yearly'
                ? 'bg-nectar-gold text-background shadow-md'
                : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            Anual <span className="text-[7px] text-nectar-cream bg-white/20 px-1 py-0.5 rounded ml-1 font-bold">2 meses gratis</span>
          </button>
        </div>
      </div>

      {/* Add-ons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
        {addonsList.map((addon) => {
          const price = billingCycle === 'monthly' ? addon.monthlyPrice : addon.yearlyPrice;
          const savings = billingCycle === 'yearly' ? addon.monthlyPrice * 2 : 0;
          return (
            <div
              key={addon.id}
              className="p-10 rounded-[3.5rem] border-2 border-card-border bg-card-bg flex flex-col justify-between hover:shadow-[var(--shadow-premium)] hover:-translate-y-3 hover:border-nectar-gold/45 transition-all duration-700 group relative overflow-hidden min-h-[440px]"
            >
              {/* Gold Ambient Glow on Hover */}
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-nectar-gold/5 blur-[80px] rounded-full group-hover:bg-nectar-gold/10 transition-all duration-700 pointer-events-none -z-10"></div>

              <div>
                {/* Category Badge & Icon */}
                <div className="flex justify-between items-start mb-8">
                  <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold bg-nectar-gold/5 border border-nectar-gold/15 px-3 py-1.5 rounded-full">
                    {addon.categoryBadge}
                  </span>
                  <div className="p-3 bg-foreground/5 rounded-2xl group-hover:bg-nectar-gold/10 group-hover:scale-110 transition-all duration-500">
                    {addon.icon}
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-2xl font-black tracking-tight mb-4 group-hover:text-nectar-gold transition-colors duration-300">
                  {addon.name}
                </h3>
                <p className="text-xs text-muted leading-relaxed mb-6">
                  {addon.description}
                </p>
              </div>

              {/* Pricing & Call to Action */}
              <div>
                <div className="border-t border-card-border/80 pt-6 mb-6 flex items-baseline justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-tighter text-foreground">${price.toLocaleString('es-MX')}</span>
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider text-muted">
                        MXN / {billingCycle === 'monthly' ? 'mes' : 'año'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-wider mt-1.5">
                        Ahorro de ${savings.toLocaleString('es-MX')} MXN
                      </p>
                    )}
                  </div>

                  <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${
                    addon.complexity === 'Muy Alta' ? 'text-red-400 bg-red-400/5 border-red-400/20' :
                    addon.complexity === 'Alta' ? 'text-orange-400 bg-orange-400/5 border-orange-400/20' :
                    addon.complexity === 'Media' ? 'text-yellow-500 bg-yellow-500/5 border-yellow-500/20' :
                    'text-emerald-500 bg-emerald-500/5 border-emerald-500/20'
                  }`}>
                    {addon.complexity}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedAddon(addon)}
                    className="w-full py-4 text-[9px] font-black uppercase tracking-widest text-nectar-gold hover:text-foreground hover:bg-foreground/5 rounded-2xl border border-nectar-gold/20 hover:border-transparent transition-all duration-300 text-center"
                  >
                    Ver Ficha
                  </button>
                  <Link href={`/dashboard/addons?request=${addon.id}`} className="w-full">
                    <button
                      className="w-full py-4 text-[9px] font-black uppercase tracking-widest bg-nectar-forest text-nectar-cream hover:bg-nectar-gold hover:scale-[1.03] active:scale-95 transition-all rounded-2xl shadow-lg shadow-nectar-forest/10 hover:shadow-nectar-gold/25"
                    >
                      Integrar
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: View Details / Ficha Técnica */}
      {selectedAddon && (
        <div 
          onClick={() => setSelectedAddon(null)}
          className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-premium cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-card-bg border border-card-border w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedAddon(null)}
              className="absolute top-6 right-6 w-10 h-10 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-full flex items-center justify-center text-lg font-bold transition-all"
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
                <h2 className="text-3xl font-black tracking-tight">{selectedAddon.name}</h2>
              </div>
            </div>

            <p className="text-xs text-muted mb-8 leading-relaxed">
              {selectedAddon.detailedDescription}
            </p>

            <div className="space-y-6 border-t border-card-border pt-8 mb-8">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-3">
                  Funcionalidades Clave
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedAddon.technicalDetails.map((detail, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-xs text-foreground/80">
                      <span className="w-1.5 h-1.5 bg-nectar-gold rounded-full shrink-0"></span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>

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

            <div className="flex gap-4">
              <Link href={`/dashboard/addons?request=${selectedAddon.id}`} className="flex-1">
                <button
                  className="w-full py-4 text-xs font-black uppercase tracking-widest bg-nectar-gold text-background hover:scale-[1.02] active:scale-95 transition-all rounded-xl text-center shadow-lg"
                >
                  Adquirir e Integrar (${billingCycle === 'monthly' ? selectedAddon.monthlyPrice : selectedAddon.yearlyPrice} MXN)
                </button>
              </Link>
              <button
                onClick={() => setSelectedAddon(null)}
                className="px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-foreground/5 rounded-xl border border-card-border text-center transition-all animate-premium"
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
