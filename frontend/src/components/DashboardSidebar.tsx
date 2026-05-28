'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { fetcher } from '@/lib/api';
import ThemeToggle from './ThemeToggle';

interface Contract {
  id: number;
  is_active: boolean;
  is_fully_signed: boolean;
  brand_design_price: number;
  plan: any;
  addons: any[];
  full_name: string;
  next_payment_date: string;
}

export default function DashboardSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [isStaff, setIsStaff] = useState(false);
  const [isCEO, setIsCEO] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  
  // Responsive navigation and mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = (role: string, staff: boolean) => {
      setUserRole(role);
      
      const isDev = role === 'DEVELOPER';
      const isDes = role === 'DESIGNER';
      const isSal = role === 'SALES';
      
      const ceo = role === 'ADMIN' || (staff && !isDev && !isDes);
      setIsCEO(ceo);
      
      const staffAllowed = (staff || role === 'ADMIN' || role === 'BUSINESS') && role !== 'DESIGNER';
      setIsStaff(staffAllowed);
      
      const client = !ceo && !isDev && !isDes && !isSal;
      setIsClient(client);
    };

    const staffLocal = localStorage.getItem('is_staff') === 'true';
    const roleLocal = localStorage.getItem('user_role') || '';
    checkAuth(roleLocal, staffLocal);

    const loadData = async () => {
      try {
        const meData = await fetcher('/users/me/');
        if (meData) {
          localStorage.setItem('user_role', meData.role || '');
          localStorage.setItem('is_staff', meData.is_staff ? 'true' : 'false');
          checkAuth(meData.role || '', meData.is_staff);
        }
      } catch (err) {
        console.error("Error loading user me in sidebar:", err);
      }

      try {
        const contractsData = await fetcher('/contracts/');
        if (Array.isArray(contractsData)) {
          setContracts(contractsData);
        }
      } catch (err) {
        console.error("Error loading contracts in sidebar:", err);
      }

      try {
        const tenantsData = await fetcher('/tenants/');
        if (Array.isArray(tenantsData)) {
          setTenants(tenantsData);
        }
      } catch (err) {
        console.error("Error loading tenants in sidebar:", err);
      }
    };
    
    loadData();
  }, [pathname]);

  // Cierra el menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, searchParams]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleScrollToPayment = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/dashboard?tab=overview&scroll=payment-commitment');
    setIsMobileMenuOpen(false);
  };

  // Definición de enlaces con iconos premium y micro-animaciones
  const navLinks = [
    {
      label: 'Dashboard',
      href: '/dashboard?tab=overview',
      show: true,
      active: pathname === '/dashboard' && activeTab === 'overview',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <rect x="3" y="3" width="7" height="7" rx="1"></rect>
          <rect x="14" y="3" width="7" height="7" rx="1"></rect>
          <rect x="14" y="14" width="7" height="7" rx="1"></rect>
          <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        </svg>
      )
    },
    {
      label: 'Compromiso de Pago',
      href: '/dashboard?tab=overview&scroll=payment-commitment',
      onClick: handleScrollToPayment,
      show: isClient && contracts.some(c => c.is_fully_signed),
      active: false,
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-foreground/45 group-hover:text-foreground transition-all duration-300 group-hover:scale-110">
          <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="2" y1="10" x2="22" y2="10"></line>
          <line x1="7" y1="15" x2="7.01" y2="15"></line>
          <line x1="11" y1="15" x2="13" y2="15"></line>
        </svg>
      )
    },
    {
      label: 'Contratar Plan',
      href: '/dashboard?tab=hire-plan',
      show: isClient,
      active: pathname === '/dashboard' && activeTab === 'hire-plan',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
      )
    },
    {
      label: 'Control Negocio',
      href: '/dashboard?tab=business',
      show: isCEO,
      active: pathname === '/dashboard' && activeTab === 'business',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      )
    },
    {
      label: 'Rendimiento',
      href: '/dashboard/performance',
      show: isCEO,
      active: pathname === '/dashboard/performance',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      )
    },
    {
      label: 'Panel de Ventas',
      href: '/dashboard?tab=business&scroll=ventas',
      onClick: (e: any) => {
        if (pathname === '/dashboard' && activeTab === 'business') {
          e.preventDefault();
          document.getElementById('ventas-section')?.scrollIntoView({ behavior: 'smooth' });
          setIsMobileMenuOpen(false);
        }
      },
      show: isCEO,
      active: false,
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-foreground/45 group-hover:text-foreground transition-all duration-300 group-hover:scale-110">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      )
    },
    {
      label: 'Configuración Soporte',
      href: '/dashboard/support-settings',
      show: isCEO,
      active: pathname === '/dashboard/support-settings',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    },
    {
      label: 'Configuración Negocio',
      href: '/dashboard/tenant-settings',
      show: (userRole === 'BUSINESS' || tenants.length > 0) && !isCEO,
      active: pathname === '/dashboard/tenant-settings',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
          <line x1="9" y1="22" x2="9" y2="16"></line>
          <line x1="15" y1="22" x2="15" y2="16"></line>
          <line x1="9" y1="16" x2="15" y2="16"></line>
          <path d="M9 6h6v4H9z"></path>
        </svg>
      ),
      badge: tenants[0] && (
        <span className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-full shrink-0 ${
          tenants[0].is_active 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          {tenants[0].is_active ? 'Activo' : 'Reservado'}
        </span>
      )
    },
    {
      label: isStaff ? 'Gestión Tickets' : 'Soporte',
      href: '/tickets',
      show: true,
      active: pathname.startsWith('/tickets'),
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    {
      label: isStaff ? 'Proyectos Activos' : 'Mis Proyectos',
      href: '/projects',
      show: true,
      active: pathname.startsWith('/projects'),
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    {
      label: 'Catálogo Add-ons',
      href: '/dashboard/addons',
      show: true,
      active: pathname === '/dashboard/addons',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      )
    }
  ];

  // Generador de enlaces a portales públicos de Tenants
  const tenantLinks = tenants.filter(t => t.is_active).map(tenant => {
    const tenantUrl = tenant.custom_domain 
      ? `https://${tenant.custom_domain}`
      : (() => {
          const host = typeof window !== 'undefined' ? window.location.hostname : '';
          if (host.includes('localhost')) return `http://${tenant.subdomain}.localhost:3000`;
          if (host.includes('staging.nectarlabs.dev')) return `https://${tenant.subdomain}.staging.nectarlabs.dev`;
          return `https://${tenant.subdomain}.nectarlabs.dev`;
        })();
    return {
      label: 'Ver Portal Público',
      href: tenantUrl,
      isExternal: true,
      icon: () => (
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse shrink-0"></div>
      ),
      badge: (
        <svg className="w-3.5 h-3.5 text-nectar-gold shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )
    };
  });

  // Renderizador común del listado de navegación
  const renderNavLinks = () => {
    return (
      <div className="space-y-2">
        {navLinks.filter(link => link.show).map((link, idx) => (
          <Link
            key={`nav-${idx}`}
            href={link.href}
            onClick={link.onClick}
            className={`flex items-center gap-4 px-6 py-3.5 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 group ${
              link.active
                ? 'bg-nectar-gold/10 text-nectar-gold'
                : 'hover:bg-foreground/[0.04] text-foreground/60 hover:text-foreground'
            }`}
          >
            {link.icon(link.active)}
            <span className="flex-1 min-w-0 truncate">{link.label}</span>
            {link.badge}
          </Link>
        ))}

        {tenantLinks.map((link, idx) => (
          <a
            key={`tenant-nav-${idx}`}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 px-6 py-3.5 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 group hover:bg-foreground/[0.04] text-foreground/60 hover:text-foreground"
          >
            {link.icon()}
            <span className="flex-1 min-w-0 truncate">{link.label}</span>
            {link.badge}
          </a>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* 1. MOBILE TOP HEADER (Sticky, transparent background on mobile/tablet) */}
      <header className="lg:hidden sticky top-0 left-0 right-0 z-40 bg-card-bg/85 backdrop-blur-md border-b border-card-border px-6 py-4 flex justify-between items-center w-full">
        <Link href="/" className="text-lg font-black tracking-tighter">
          NECTAR <span className="text-nectar-gold">LABS</span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-10 h-10 rounded-xl border border-card-border bg-card-bg/40 flex items-center justify-center text-foreground hover:border-nectar-gold/60 transition-colors"
            aria-label="Abrir Menú"
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* 2. MOBILE DRAWER NAVIGATION OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 z-45 bg-background/60 backdrop-blur-sm transition-opacity duration-300"
        />
      )}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-card-bg/95 backdrop-blur-md border-r border-card-border p-8 flex flex-col justify-between z-50 transform transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-12">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-xl font-black tracking-tighter">
              NECTAR <span className="text-nectar-gold">LABS</span>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-8 h-8 rounded-full border border-card-border text-foreground/60 hover:text-foreground flex items-center justify-center text-lg font-bold"
            >
              ×
            </button>
          </div>
          <nav className="h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {renderNavLinks()}
          </nav>
        </div>

        <div className="pt-6 border-t border-card-border/60 flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 py-3 text-red-500/60 hover:text-red-500 transition-all font-black uppercase tracking-widest text-[9px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* 3. CLASSIC DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-72 bg-card-bg border-r border-card-border p-8 flex-col justify-between shrink-0 min-h-screen sticky top-0 h-screen">
        <div className="space-y-12">
          <Link href="/" className="inline-block text-xl font-black tracking-tighter">
            NECTAR <span className="text-nectar-gold">LABS</span>
          </Link>
          
          <nav className="h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
            {renderNavLinks()}
          </nav>
        </div>

        <div className="pt-6 border-t border-card-border/60 flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 py-3 text-red-500/60 hover:text-red-500 transition-all font-black uppercase tracking-widest text-[9px] group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            <span>Cerrar Sesión</span>
          </button>

          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
