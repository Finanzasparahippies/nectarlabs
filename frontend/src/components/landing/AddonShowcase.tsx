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
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'sponsorship':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'business-analytics':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      );
    case 'campaigner':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'facturacion-cfdi':
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
    case 'ecommerce-combo':
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
    description: 'Todo para tu tienda en línea: Envíos Nacionales por tus paqueterias favoritas, Facturación SAT, Tienda Online y Campaigner Lite.',
    detailedDescription: 'El paquete integral ideal para comenzar a vender en línea. Habilita de golpe las funciones de cotización y emisión de guías de envío nacionales de Skydropx, facturación fiscal automatizada CFDI 4.0 con 100 timbres base gratis al mes, y campaigner lite sin costo.',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    complexity: 'Alta',
    serverRequirements: 'Configuración completa de llaves de Stripe, Skydropx API Key y Facturapi API Key.',
    technicalDetails: [
      'Acceso completo a módulo Tienda + Envíos Skydropx',
      'Acceso completo a módulo Facturación SAT (100 timbres base)',
      'Acceso completo a módulo Newsletter Masivo (Campaigner Lite)',
      'Ahorro de $148.00 MXN mensuales sobre la compra individual',
      'Configuración unificada y automatización de negocio cruzada'
    ]
  },
  {
    id: 'pack-pos-ecommerce',
    name: 'Paquete POS & E-commerce Pro',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Punto de venta físico, Tienda en línea, Envíos con Skydropx, Facturación SAT y Campaigner Lite.',
    detailedDescription: 'La solución comercial definitiva para negocios omnicanal. Integra tu tienda en línea y tu mostrador físico (POS) con inventario unificado. Incluye 100 timbres fiscales al mes, Campaigner Lite y es compatible con hardware POS comercial (pago único de hardware de $1,799.00 MXN).',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    complexity: 'Muy Alta',
    serverRequirements: 'Lector de código de barras USB + Impresora térmica + Cajón de dinero RJ11 (Hardware adicional).',
    technicalDetails: [
      'Consola POS rápida con lector de barras',
      'Sincronización de inventario en tiempo real',
      'Acceso completo a Tienda + Envíos Skydropx',
      'Facturación SAT con 100 timbres incluidos',
      'Campaigner Lite sin costo'
    ]
  },
  {
    id: 'pack-blog-sponsors',
    name: 'Paquete Blog & Sponsors',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Monetiza tu contenido: Blog, Sponsorship (Patreon), Tienda Online, Facturación SAT y Campaigner Lite.',
    detailedDescription: 'El paquete ideal para creadores de contenido y marcas personales. Permite monetizar mediante suscripciones recurrentes de Stripe (Sponsors), vender productos físicos o digitales en tu tienda y emitir facturas del SAT de forma integrada, con boletines de Campaigner Lite.',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    complexity: 'Media',
    serverRequirements: 'Cuenta de Stripe para suscripciones + Configuración de Tienda.',
    technicalDetails: [
      'Suscripciones recurrentes de Stripe con tiers',
      'Gestión de roles y feeds exclusivos para sponsors',
      'Acceso completo a Tienda Online',
      'Facturación SAT integrada',
      'Campaigner Lite sin costo'
    ]
  },
  {
    id: 'campaigner',
    name: 'Campaigner Masivo',
    categoryBadge: 'EMAIL MARKETING',
    description: 'Envío de boletines y campañas de email masivo sin renta fija. Cobro dinámico a $0.01 MXN por correo enviado.',
    detailedDescription: 'Envía boletines interactivos a tu base de contactos usando nuestro servicio integrado. Sin renta fija mensual ni anual; solo pagas 1 centavo ($0.01 MXN) por cada correo enviado, descontado de tu Cartera Digital prepago.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    complexity: 'Baja',
    serverRequirements: 'Cartera Digital con saldo positivo ($0.01 MXN por correo).',
    technicalDetails: [
      'Tokens únicos de desuscripción seguros (UUID)',
      'Render de templates de correo HTML interactivos',
      'Cobro automático por destinatario a $0.01 MXN',
      'Sin renta fija mensual o anual'
    ]
  },
  {
    id: 'booking-signature',
    name: 'Néctar Contratos Digitales',
    categoryBadge: 'CONTRATOS DIGITALES',
    description: 'Motor de contratos digitales con firma incrustada en lienzo y generación automática de PDFs. Sin límites de documentos ni de firmantes.',
    detailedDescription: 'Ideal para digitalizar acuerdos contractuales. Permite configurar contratos, generar propuestas en PDF automáticas y capturar firmas táctiles seguras con marcas de tiempo, sin límites en la cantidad de documentos o firmantes.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    complexity: 'Alta',
    serverRequirements: 'Almacenamiento seguro en la nube para PDFs.',
    technicalDetails: [
      'Lienzo de firma en React (HTML5 Canvas)',
      'Generación de documentos PDF vía backend',
      'Notificaciones de propuesta por correo electrónico',
      'Sin límite de documentos o firmantes'
    ]
  },
  {
    id: 'booking',
    name: 'Agendador de Citas & Kanban',
    categoryBadge: 'GESTIÓN Y CITAS',
    description: 'Gestor de reservas y agendador de citas interactivo integrado con un tablero Kanban para seguimiento de estados.',
    detailedDescription: 'Permite a tus clientes agendar citas directamente desde tu portal. Gestiona la disponibilidad, envía recordatorios y organiza las reservas en un tablero Kanban interactivo para optimizar el flujo de trabajo.',
    monthlyPrice: 49,
    yearlyPrice: 490,
    complexity: 'Media',
    serverRequirements: 'Base de datos relacional para control de solapamiento de horarios.',
    technicalDetails: [
      'Calendario de reservas interactivo para clientes',
      'Tablero Kanban integrado para gestión interna',
      'Configuración de horarios de atención',
      'Notificaciones y recordatorios automáticos'
    ]
  },
  {
    id: 'bot-chat',
    name: 'Néctar AI Chat Bot',
    categoryBadge: 'COMUNICACIÓN EN VIVO',
    description: 'Widget de chat flotante en tiempo real y consola multi-agente con historial persistente.',
    detailedDescription: 'Un canal de comunicación instantáneo integrado para retención y soporte de usuarios. Los clientes ven un widget interactivo de chat, mientras que los agentes de soporte de IA responden y el staff técnico gestiona las conversaciones desde una consola interna dedicada.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    complexity: 'Media',
    serverRequirements: 'Django Channels (ASGI) con servidor de caché Redis + Base de Datos relacional.',
    technicalDetails: [
      'Widget JS reactivo y ligero incrustable',
      'Polling persistente o WebSocket fallback',
      'Asignación dinámica de chats a staff técnico',
      'Marcado de estado abierto/resuelto/cerrado'
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 animate-in fade-in duration-300">
        {addonsList.map((addon) => {
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
                  <h3 className="text-sm font-black uppercase text-white tracking-wide mt-2">{addon.name}</h3>
                  <p className="text-[10px] text-white/50 leading-relaxed mt-2 line-clamp-4">{addon.description}</p>
                </div>
              </div>

              {/* Pricing & Call to Action */}
              <div className="border-t border-white/5 pt-4 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="text-[7.5px] uppercase font-black text-white/35 block">
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

                  <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${addon.complexity === 'Muy Alta' ? 'text-red-400 bg-red-400/5 border-red-400/20' :
                    addon.complexity === 'Alta' ? 'text-orange-400 bg-orange-400/5 border-orange-400/20' :
                      addon.complexity === 'Media' ? 'text-yellow-500 bg-yellow-500/5 border-yellow-500/20' :
                        'text-emerald-500 bg-emerald-500/5 border-emerald-500/20'
                    }`}>
                    {addon.complexity}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedAddon(addon)}
                    className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer text-center"
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
