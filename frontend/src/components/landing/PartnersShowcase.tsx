'use client';

import React, { useState, useEffect } from 'react';
import { fetcher } from '../../lib/api';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
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
  techs: string[];
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
    techs: ['Next.js', 'Django', 'Postgres', 'Maps'],
    domain: 'apex.nectarlabs.dev',
    accentColor: '#10B981',
    logo: (accent: string) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    )
  },
  {
    id: 'mock-2',
    name: 'Aura Wellness',
    category: 'Salud & Telemedicina',
    description: 'Sistema completo de agendamiento y salas de consulta virtual con pasarelas de pago y expediente clínico.',
    techs: ['Next.js', 'Postgres', 'Node.js', 'WebRTC'],
    domain: 'aura.com.mx',
    accentColor: '#3B82F6',
    logo: (accent: string) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
        <line x1="9" y1="9" x2="9.01" y2="9"></line>
        <line x1="15" y1="9" x2="15.01" y2="9"></line>
      </svg>
    )
  },
  {
    id: 'mock-3',
    name: 'Stellar CMS',
    category: 'Gestión Headless',
    description: 'Plataforma para publicación y distribución omnicanal de catálogos y artículos con caché optimizada.',
    techs: ['React', 'Supabase', 'TypeScript', 'Node.js'],
    domain: 'stellar-cms.net',
    accentColor: '#8B5CF6',
    logo: (accent: string) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    )
  },
  {
    id: 'mock-4',
    name: 'Skyline SaaS',
    category: 'Inmuebles & Multi-tenancy',
    description: 'Administración SaaS de rentas y servicios para complejos corporativos con portales independientes.',
    techs: ['Next.js', 'Django', 'Stripe', 'Docker'],
    domain: 'skyline.nectarlabs.dev',
    accentColor: '#EC4899',
    logo: (accent: string) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
        <line x1="15" y1="3" x2="15" y2="21"></line>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="3" y1="15" x2="21" y2="15"></line>
      </svg>
    )
  },
  {
    id: 'mock-5',
    name: 'Prime E-Commerce',
    category: 'Comercio Electrónico',
    description: 'Tienda en línea de alto desempeño con checkout optimizado, cobros con tarjeta y control de inventario.',
    techs: ['Next.js', 'Stripe', 'Tailwind', 'Postgres'],
    domain: 'prime-store.mx',
    accentColor: '#F59E0B',
    logo: (accent: string) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
    )
  },
  {
    id: 'mock-6',
    name: 'Vesta Real Estate',
    category: 'CRM Inmobiliario',
    description: 'Buscador inteligente de propiedades y CRM para agentes de ventas con flujos de embudo visuales.',
    techs: ['React', 'Django', 'Maps', 'Postgres'],
    domain: 'vesta-properties.com',
    accentColor: '#14B8A6',
    logo: (accent: string) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
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
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        // Fetch to /tenants/ with isPublic to prevent auth redirects, sending token manually if present
        const data = await fetcher('/tenants/', {
          isPublic: true,
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (data && Array.isArray(data) && data.length > 0) {
          // Transform active tenants into partner cards
          const activeTenants = data.filter((t: Tenant) => t.is_active);
          
          if (activeTenants.length > 0) {
            const transformed = activeTenants.map((t: Tenant, index: number) => {
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

              // Standardized techs & mock description mapping for dynamic data
              const techs = index % 3 === 0 
                ? ['Next.js', 'Django', 'Stripe', 'Docker'] 
                : index % 3 === 1 
                  ? ['Next.js', 'Postgres', 'Tailwind', 'Stripe'] 
                  : ['React', 'Django', 'Maps', 'Postgres'];

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
                category: t.custom_domain ? 'Dominio Corporativo' : 'Subdominio Néctar',
                description: getCustomDesc(t.name),
                techs: techs,
                domain: t.custom_domain || `${t.subdomain}.nectarlabs.dev`,
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

      // Fallback: load mockup list
      const mockCards = MOCK_PARTNERS.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        techs: p.techs,
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

  // Split partners list in half to populate 2 marquee rows (direction: left, direction: right)
  const halfLength = Math.ceil(partners.length / 2);
  const firstRow = partners.slice(0, halfLength);
  const secondRow = partners.slice(halfLength);

  // Duplicating items to allow seamless infinite loops
  const marqueeItemsRow1 = [...firstRow, ...firstRow, ...firstRow];
  const marqueeItemsRow2 = [...secondRow, ...secondRow, ...secondRow];

  const PartnerCardComponent = ({ partner }: { partner: PartnerCard }) => (
    <div 
      className="w-[280px] sm:w-[320px] shrink-0 p-6 rounded-[2rem] bg-card-bg border border-card-border hover:border-nectar-gold/30 hover:shadow-lg transition-all duration-500 flex flex-col gap-4 text-left mx-3 relative overflow-hidden group"
      style={{ '--accent-color': partner.accentColor } as React.CSSProperties}
    >
      {/* Decorative gradient overlay */}
      <div 
        className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl rounded-full"
        style={{ backgroundColor: `${partner.accentColor}20` }}
      ></div>

      <div className="flex justify-between items-start gap-4">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-transform duration-500 group-hover:scale-110 shadow-sm"
          style={{ 
            backgroundColor: `${partner.accentColor}12`, 
            borderColor: `${partner.accentColor}25`
          }}
        >
          {partner.logo}
        </div>
        <div className="text-right shrink-0">
          <span 
            className="px-2.5 py-1 text-[7px] font-black uppercase tracking-widest rounded-full border bg-opacity-[0.05]"
            style={{ 
              color: partner.accentColor, 
              borderColor: `${partner.accentColor}25`,
              backgroundColor: `${partner.accentColor}08`
            }}
          >
            ● Activo
          </span>
          <span className="block text-[7px] font-black uppercase tracking-widest opacity-35 mt-2">
            {partner.category}
          </span>
        </div>
      </div>

      <div>
        <h4 className="font-black text-sm text-foreground tracking-wide group-hover:text-nectar-gold transition-colors duration-300">
          {partner.name}
        </h4>
        <p className="text-[10px] text-foreground/50 leading-relaxed mt-2 font-medium">
          {partner.description}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-card-border/30 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {partner.techs.map((tech, i) => (
            <span 
              key={i} 
              className="px-2 py-0.5 rounded-md bg-foreground/[0.03] border border-card-border text-[7.5px] font-bold text-foreground/60 tracking-wider"
            >
              {tech}
            </span>
          ))}
        </div>
        <a 
          href={`https://${partner.domain}`}
          target="_blank"
          rel="noreferrer"
          className="text-[9px] font-mono lowercase tracking-normal text-nectar-gold hover:underline flex items-center gap-1 mt-1 shrink-0"
        >
          <span>🔗 {partner.domain}</span>
        </a>
      </div>
    </div>
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
