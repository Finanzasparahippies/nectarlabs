'use client';

import React, { useState, useEffect } from 'react';
import { fetcher } from '../../lib/api';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  use_custom_domain: boolean;
  logo_url: string | null;
  theme_color?: string;
  accent_color?: string;
  is_active: boolean;
}

interface PartnerCard {
  id: string;
  name: string;
  category: string;
  description: string;
  domain: string;
  accentColor: string;
  logo: React.ReactNode;
}

const MOCK_PARTNERS = [
  {
    id: 'mock-1',
    name: 'Apex Logistics',
    category: 'Logística & Distribución',
    description: 'Ruteo y despacho automatizado de mercancías con mapas interactivos y sincronización en tiempo real.',
    domain: 'apex.nectarlabs.dev',
    accentColor: '#10B981',
    logo: (accent: string) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />
      </svg>
    )
  },
  {
    id: 'mock-2',
    name: 'Aura Wellness',
    category: 'Salud & Telemedicina',
    description: 'Sistema completo de agendamiento y salas de consulta virtual con pasarelas de pago y expediente clínico.',
    domain: 'aura.com.mx',
    accentColor: '#3B82F6',
    logo: (accent: string) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 6a6 6 0 1 0 6 6" />
        <circle cx="12" cy="12" r="2" fill={accent} />
      </svg>
    )
  },
  {
    id: 'mock-3',
    name: 'Stellar CMS',
    category: 'Gestión Headless',
    description: 'Plataforma para publicación y distribución omnicanal de catálogos y artículos con caché optimizada.',
    domain: 'stellar-cms.net',
    accentColor: '#8B5CF6',
    logo: (accent: string) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
        <path d="M12 6L6 12l6 6 6-6-6-6z" opacity="0.5" />
      </svg>
    )
  },
  {
    id: 'mock-4',
    name: 'Skyline SaaS',
    category: 'PropTech & SaaS',
    description: 'Administración SaaS de rentas y servicios para complejos corporativos con portales independientes.',
    domain: 'skyline.nectarlabs.dev',
    accentColor: '#EC4899',
    logo: (accent: string) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
      </svg>
    )
  },
  {
    id: 'mock-5',
    name: 'Prime E-Commerce',
    category: 'Comercio Electrónico',
    description: 'Tienda en línea de alto desempeño con checkout optimizado, cobros con tarjeta y control de inventario.',
    domain: 'prime-store.mx',
    accentColor: '#F59E0B',
    logo: (accent: string) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
    )
  },
  {
    id: 'mock-6',
    name: 'Vesta Real Estate',
    category: 'CRM Inmobiliario',
    description: 'Buscador inteligente de propiedades y CRM para agentes de ventas con flujos de embudo visuales.',
    domain: 'vesta-properties.com',
    accentColor: '#14B8A6',
    logo: (accent: string) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20M4 17V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v13M20 9v8M11 7h2M11 11h2" />
      </svg>
    )
  }
];

export default function PartnersShowcase() {
  const [partners, setPartners] = useState<PartnerCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRealData = async () => {
      try {
        const data = await fetcher('/tenants/', {
          isPublic: true,
        });

        if (data && Array.isArray(data) && data.length > 0) {
          const activeTenants = data.filter((t: Tenant) => t.is_active);
          
          if (activeTenants.length > 0) {
            const transformed = activeTenants.map((t: Tenant) => {
              const accentColor = t.accent_color || '#C68A1E';
              const logoNode = t.logo_url ? (
                <img 
                  src={t.logo_url} 
                  alt={t.name} 
                  className="w-8 h-8 rounded-lg object-contain" 
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs border"
                  style={{
                    backgroundColor: `${accentColor}12`,
                    borderColor: `${accentColor}25`,
                    color: accentColor,
                  }}
                >
                  {t.name.slice(0, 2).toUpperCase()}
                </div>
              );

              const getPremiumCategory = (name: string) => {
                const lower = name.toLowerCase();
                if (lower.includes('apex') || lower.includes('logistics') || lower.includes('distribucion') || lower.includes('logística')) return 'Logística & Distribución';
                if (lower.includes('aura') || lower.includes('wellness') || lower.includes('salud') || lower.includes('telemedicina')) return 'Salud & Telemedicina';
                if (lower.includes('stellar') || lower.includes('cms') || lower.includes('content')) return 'Gestión Headless';
                if (lower.includes('skyline') || lower.includes('saas') || lower.includes('inmuebles')) return 'PropTech & SaaS';
                if (lower.includes('prime') || lower.includes('store') || lower.includes('e-commerce') || lower.includes('tienda')) return 'Comercio Electrónico';
                if (lower.includes('vesta') || lower.includes('properties') || lower.includes('inmobiliario')) return 'CRM Inmobiliario';
                return 'Plataforma Digital';
              };

              const getCustomDesc = (name: string) => {
                const lower = name.toLowerCase();
                if (lower.includes('apex') || lower.includes('logistics')) return 'Logística y distribución inteligente con geolocalización y asignación automática.';
                if (lower.includes('aura') || lower.includes('wellness')) return 'Plataforma de reservas y consultas virtuales de salud integral.';
                if (lower.includes('stellar') || lower.includes('cms')) return 'Sistema headless de gestión de contenidos de alta fidelidad.';
                if (lower.includes('skyline') || lower.includes('saas')) return 'Ecosistema multi-inquilino de alto rendimiento para control de complejos.';
                return 'Ecosistema de software artesanal a la medida con soporte continuo de infraestructura.';
              };

              return {
                id: t.id,
                name: t.name,
                category: getPremiumCategory(t.name),
                description: getCustomDesc(t.name),
                domain: (t.use_custom_domain && t.custom_domain) ? t.custom_domain : `${t.subdomain}.nectarlabs.dev`,
                accentColor: accentColor,
                logo: logoNode,
              };
            });
            setPartners(transformed);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load real tenant data, falling back to mockup showcase:', err);
      }

      const mockCards = MOCK_PARTNERS.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        domain: p.domain,
        accentColor: p.accentColor,
        logo: p.logo(p.accentColor),
      }));
      setPartners(mockCards);
      setLoading(false);
    };

    loadRealData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-25">Cargando Socios...</p>
      </div>
    );
  }

  // Split partners list in half to populate 2 marquee rows
  const halfLength = Math.ceil(partners.length / 2);
  const firstRow = partners.slice(0, halfLength);
  const secondRow = partners.slice(halfLength);

  // Duplicating items exactly 2x for a perfect mathematically seamless infinite marquee loop with TranslateX(-50%)
  const marqueeItemsRow1 = [...firstRow, ...firstRow];
  const marqueeItemsRow2 = [...secondRow, ...secondRow];

  const PartnerCardComponent = ({ partner }: { partner: PartnerCard }) => (
    <a 
      href={`https://${partner.domain}`}
      target="_blank"
      rel="noreferrer"
      className="w-[290px] sm:w-[330px] shrink-0 p-8 rounded-[2.25rem] bg-gradient-to-b from-card-bg to-card-bg/95 border border-card-border hover:border-[var(--accent-border)] hover:shadow-2xl hover:shadow-[var(--accent-glow)] hover:-translate-y-1.5 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col gap-6 text-left mx-4 relative overflow-hidden group cursor-pointer"
      style={{ 
        '--accent-color': partner.accentColor,
        '--accent-glow': `${partner.accentColor}12`,
        '--accent-border': `${partner.accentColor}30`,
      } as React.CSSProperties}
    >
      {/* Subtle ambient light dot inside the card on hover */}
      <div 
        className="absolute -bottom-12 -right-12 w-40 h-40 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[40px] rounded-full pointer-events-none"
        style={{ backgroundColor: 'var(--accent-glow)' }}
      ></div>

      <div className="flex justify-between items-center gap-4">
        {/* Logo Container */}
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-transform duration-500 group-hover:scale-105 shadow-sm"
          style={{ 
            backgroundColor: `${partner.accentColor}08`, 
            borderColor: `${partner.accentColor}20`
          }}
        >
          {partner.logo}
        </div>

        {/* Minimalist pulsed state indicator */}
        <div className="flex items-center gap-2">
          <span 
            className="w-1.5 h-1.5 rounded-full animate-pulse" 
            style={{ backgroundColor: partner.accentColor }}
          ></span>
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-40">
            {partner.category}
          </span>
        </div>
      </div>

      {/* Typography block with ample vertical breathing room */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-base text-foreground tracking-wide group-hover:text-nectar-gold transition-colors duration-300">
              {partner.name}
            </h4>
            {/* Elegant sliding/scaling diagonal link arrow symbol */}
            <svg 
              className="w-4 h-4 opacity-0 transform translate-x-[-6px] translate-y-[6px] scale-75 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300 ease-out text-nectar-gold" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </div>
          <p className="text-[11px] text-foreground/50 leading-relaxed mt-3 font-medium pr-2 group-hover:text-foreground/75 transition-colors duration-300">
            {partner.description}
          </p>
        </div>
      </div>
    </a>
  );

  return (
    <section id="socios" className="w-full py-24 border-t border-card-border relative overflow-hidden flex flex-col items-center bg-gradient-to-b from-transparent via-nectar-gold/[0.015] to-transparent">
      {/* Decorative glows */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-nectar-gold/[0.02] rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-nectar-forest/[0.02] rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      <div className="w-full max-w-7xl text-center px-6 mb-16">
        <span className="inline-block px-8 py-2.5 mb-6 text-[10px] font-black tracking-[0.5em] text-nectar-gold uppercase border border-nectar-gold/20 rounded-full bg-nectar-gold/5">
          Socios Tecnológicos
        </span>
        <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-foreground">
          Ecosistemas en <span className="text-nectar-gold italic">Producción</span>
        </h2>
        <p className="text-base md:text-lg text-foreground/60 max-w-3xl mx-auto leading-relaxed">
          Empresas y fundadores que confían su infraestructura crítica, desarrollo continuo y soberanía técnica en Néctar Labs.
        </p>
      </div>

      {/* Infinite scrolling marquee track container */}
      <div className="w-full overflow-hidden flex flex-col gap-6 relative py-4 pause-on-hover select-none">
        {/* Left and Right Fade Gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>

        {/* Row 1: Left sliding track */}
        <div className="flex w-max overflow-hidden">
          <div className="animate-marquee-left">
            {marqueeItemsRow1.map((partner, idx) => (
              <PartnerCardComponent key={`row1-${partner.id}-${idx}`} partner={partner} />
            ))}
          </div>
        </div>

        {/* Row 2: Right sliding track */}
        <div className="flex w-max overflow-hidden">
          <div className="animate-marquee-right">
            {marqueeItemsRow2.map((partner, idx) => (
              <PartnerCardComponent key={`row2-${partner.id}-${idx}`} partner={partner} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
