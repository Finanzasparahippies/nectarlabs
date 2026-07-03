'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { fetcher, getMainDomainUrl } from '@/lib/api';
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

function DashboardSidebarContent() {
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
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Responsive navigation and mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCollapsed(localStorage.getItem('sidebar_collapsed') === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar_collapsed', String(nextState));
  };

  // Accordion state for tenants/ecosystems
  const [openTenants, setOpenTenants] = useState<Record<number, boolean>>({});
  const [ecosystemsExpanded, setEcosystemsExpanded] = useState(true);

  useEffect(() => {
    if (tenants.length > 0) {
      const activeT = tenants.filter(t => t.is_active);
      if (activeT.length === 1) {
        setOpenTenants({ [activeT[0].id]: true });
      }
    }
  }, [tenants]);

  const toggleTenant = (id: number) => {
    setOpenTenants(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
          setCurrentUser(meData);
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
    window.location.href = getMainDomainUrl('/login');
  };

  const handleScrollToPayment = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/dashboard?tab=overview&scroll=payment-commitment');
    setIsMobileMenuOpen(false);
  };

  // Definición de enlaces con iconos premium y micro-animaciones (base)
  const baseNavLinks = [
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
      label: 'Financial Oracle',
      href: '/dashboard/sales',
      show: userRole === 'SALES',
      active: pathname === '/dashboard/sales',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
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
      label: 'Control de la Colmena',
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
      label: 'Facturación Néctar',
      href: '/dashboard?tab=billing-global',
      show: isCEO,
      active: pathname === '/dashboard' && activeTab === 'billing-global',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
          <line x1="12" y1="4" x2="12" y2="20"></line>
          <line x1="2" y1="10" x2="22" y2="10"></line>
        </svg>
      )
    },
    {
      label: 'Campañas de Marketing',
      href: '/dashboard?tab=marketing',
      show: isCEO,
      active: pathname === '/dashboard' && activeTab === 'marketing',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
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
      label: 'Panel de Recolección',
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
      label: 'Ajustes de la Colmena',
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
        <span className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-full shrink-0 ${tenants[0].is_active
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
      show: isStaff,
      active: pathname.startsWith('/projects'),
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    {
      label: 'Celdas del Panal (Add-ons)',
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
    },
    {
      label: 'Guía de Facturación',
      href: '/dashboard/billing/guide',
      show: isCEO || userRole === 'BUSINESS',
      active: pathname === '/dashboard/billing/guide',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    },
    {
      label: 'Perfil',
      href: '/dashboard/profile',
      show: true,
      active: pathname === '/dashboard/profile',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    }
  ];

  const isDriver = currentUser?.role === 'DRIVER' || currentUser?.additional_roles?.includes('DRIVER');

  const driverNavLinks = [
    {
      label: 'Panel Repartidor',
      href: '/dashboard?tab=driver-console',
      show: true,
      active: activeTab === 'driver-console',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      )
    },
    {
      label: 'Resumen Entregas',
      href: '/dashboard?tab=driver-stats',
      show: true,
      active: activeTab === 'driver-stats',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      )
    },
    {
      label: 'Perfil',
      href: '/dashboard/profile',
      show: true,
      active: pathname === '/dashboard/profile',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    },
    {
      label: 'Soporte',
      href: '/tickets',
      show: true,
      active: pathname.startsWith('/tickets'),
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${active ? 'text-nectar-gold' : 'text-foreground/45 group-hover:text-foreground'}`}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    }
  ];

  const navLinks = isDriver ? driverNavLinks : baseNavLinks;

  const renderTenantAccordion = () => {
    if (isDriver) return null;
    const activeTenants = tenants.filter(t => t.is_active);
    if (activeTenants.length === 0) return null;

    if (isCollapsed) {
      return (
        <div className="pt-6 border-t border-card-border/40 mt-4 flex flex-col items-center gap-4">
          <button
            onClick={toggleCollapse}
            title="Mis Colmenas"
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-foreground/[0.02] text-nectar-gold hover:text-nectar-gold/80 transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 shrink-0 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </button>
        </div>
      );
    }

    return (
      <div className="pt-6 border-t border-card-border/40 mt-4 space-y-3">
        {/* Accordion header for the entire section */}
        <button
          onClick={() => setEcosystemsExpanded(!ecosystemsExpanded)}
          className="flex justify-between items-center w-full px-6 mb-2 text-left group"
        >
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/30 group-hover:text-foreground/60 transition-colors">
            Mis Colmenas
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[7.5px] font-black text-nectar-gold bg-nectar-gold/5 border border-nectar-gold/10 px-2 py-0.5 rounded-full font-mono">
              {activeTenants.length}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className={`w-2.5 h-2.5 text-foreground/30 group-hover:text-foreground/60 transition-transform duration-300 ${ecosystemsExpanded ? 'rotate-90 text-nectar-gold' : ''}`}
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </button>

        {ecosystemsExpanded && (
          <div className="space-y-1 animate-fadeIn">
            {activeTenants.map(tenant => {
              const tenantUrl = (tenant.use_custom_domain && tenant.custom_domain)
                ? `https://${tenant.custom_domain}`
                : (() => {
                  const host = typeof window !== 'undefined' ? window.location.hostname : '';
                  if (host.includes('localhost')) return `http://nectarlabs.localhost/tenants/${tenant.subdomain}`;
                  if (host.includes('staging.nectarlabs.dev')) return `https://${tenant.subdomain}.staging.nectarlabs.dev`;
                  return `https://${tenant.subdomain}.nectarlabs.dev`;
                })();

              const isOpen = !!openTenants[tenant.id];

              return (
                <div key={`tenant-group-${tenant.id}`} className="space-y-1">
                  {/* Accordion Trigger */}
                  <button
                    onClick={() => toggleTenant(tenant.id)}
                    className={`flex items-center gap-3.5 px-6 py-3 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 group ${isOpen
                        ? 'bg-foreground/[0.02] text-foreground'
                        : 'text-foreground/60 hover:text-foreground hover:bg-foreground/[0.02]'
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-nectar-gold shrink-0 transition-transform duration-300 group-hover:rotate-12">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>

                    <div className="flex-1 min-w-0">
                      <span className="block truncate font-black text-[9px] uppercase tracking-widest">{tenant.name}</span>
                      <span className="block text-[6.5px] font-mono text-foreground/35 lowercase tracking-normal truncate">
                        {(tenant.use_custom_domain && tenant.custom_domain) ? tenant.custom_domain : `${tenant.subdomain}.nectarlabs.dev`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse shrink-0"></div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className={`w-2.5 h-2.5 transition-transform duration-300 ${isOpen ? 'rotate-90 text-nectar-gold' : 'text-foreground/30'}`}
                      >
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  </button>

                  {/* Sublinks */}
                  {isOpen && (
                    <div className="pl-[27px] ml-7 border-l border-card-border/50 py-1 space-y-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(tenantUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="flex items-center justify-between py-2 pr-6 text-foreground/50 hover:text-nectar-gold transition-all duration-300 text-[8px] font-black uppercase tracking-widest hover:translate-x-1 group/sub w-full text-left bg-transparent border-0 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-foreground/20 group-hover/sub:bg-nectar-gold"></span>
                          Portal Público
                        </span>
                        <svg className="w-3 h-3 opacity-0 group-hover/sub:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
                          const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
                          window.open(`${tenantUrl}/portal-admin${tokenParam}`, '_blank', 'noopener,noreferrer');
                        }}
                        className="flex items-center justify-between py-2 pr-6 text-foreground/50 hover:text-nectar-gold transition-all duration-300 text-[8px] font-black uppercase tracking-widest hover:translate-x-1 group/sub w-full text-left bg-transparent border-0 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-foreground/20 group-hover/sub:bg-nectar-gold"></span>
                          Consola Admin
                        </span>
                        <span className="px-1.5 py-0.5 text-[5.5px] font-black uppercase tracking-wider rounded-md bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/20 font-bold">
                          Config
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Renderizador común del listado de navegación
  const renderNavLinks = () => {
    const workspaceLabels = ['Dashboard', 'Compromiso de Pago', 'Contratar Plan', 'Control de la Colmena', 'Facturación Néctar', 'Rendimiento', 'Panel de Recolección', 'Configuración Soporte', 'Ajustes de la Colmena', 'Perfil'];
    const workspaceLinks = navLinks.filter(link => link.show && workspaceLabels.includes(link.label));
    const operationsLinks = navLinks.filter(link => link.show && !workspaceLabels.includes(link.label));

    return (
      <div className="space-y-6">
        {/* Workspace Category */}
        {workspaceLinks.length > 0 && (
          <div className="space-y-2">
            {!isCollapsed && (
              <span className="px-6 text-[8px] font-black uppercase tracking-[0.2em] text-foreground/30 block mb-3">
                Control de Mando
              </span>
            )}
            {workspaceLinks.map((link, idx) => (
              <Link
                key={`nav-work-${idx}`}
                href={link.href}
                onClick={link.onClick}
                title={link.label}
                className={`flex items-center gap-4 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 group ${
                  isCollapsed ? 'justify-center px-0 py-3.5 w-full' : 'px-6 py-3.5 w-full text-left'
                } ${link.active
                    ? 'bg-nectar-gold/10 text-nectar-gold'
                    : 'hover:bg-foreground/[0.04] text-foreground/60 hover:text-foreground'
                  }`}
              >
                {link.icon(link.active)}
                {!isCollapsed && <span className="flex-1 min-w-0 truncate">{link.label}</span>}
                {!isCollapsed && link.badge}
              </Link>
            ))}
          </div>
        )}

        {/* Ecosistemas (Tenants Accordion) */}
        {renderTenantAccordion()}

        {/* Operations Category */}
        {operationsLinks.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-card-border/40">
            {!isCollapsed && (
              <span className="px-6 text-[8px] font-black uppercase tracking-[0.2em] text-foreground/30 block mb-3">
                Operaciones
              </span>
            )}
            {operationsLinks.map((link, idx) => (
              <Link
                key={`nav-oper-${idx}`}
                href={link.href}
                onClick={link.onClick}
                title={link.label}
                className={`flex items-center gap-4 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 group ${
                  isCollapsed ? 'justify-center px-0 py-3.5 w-full' : 'px-6 py-3.5 w-full text-left'
                } ${link.active
                    ? 'bg-nectar-gold/10 text-nectar-gold'
                    : 'hover:bg-foreground/[0.04] text-foreground/60 hover:text-foreground'
                  }`}
              >
                {link.icon(link.active)}
                {!isCollapsed && <span className="flex-1 min-w-0 truncate">{link.label}</span>}
                {!isCollapsed && link.badge}
              </Link>
            ))}
          </div>
        )}
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
        className={`lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-card-bg/95 backdrop-blur-md border-r border-card-border p-8 flex flex-col justify-between z-50 transform transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
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

        <div className="space-y-4 pt-6 border-t border-card-border/60">
          {currentUser && (
            <div className="p-4 rounded-3xl bg-foreground/[0.02] border border-card-border/40 flex items-center gap-3.5 w-full hover:bg-foreground/[0.04] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 w-16 h-16 bg-nectar-gold/5 blur-xl rounded-full pointer-events-none"></div>
              
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-nectar-gold to-yellow-600/30 flex items-center justify-center border border-nectar-gold/20 relative shrink-0 shadow-lg shadow-nectar-gold/5">
                <span className="text-background font-black text-xs font-mono tracking-wider">
                  {currentUser.username?.substring(0, 2).toUpperCase() || currentUser.email?.substring(0, 2).toUpperCase() || 'US'}
                </span>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card-bg shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse animate-duration-1000"></div>
              </div>

              <div className="flex-1 min-w-0 text-left">
                <span className="block font-black text-[10px] text-foreground uppercase tracking-wider truncate">
                  {currentUser.username || 'Usuario'}
                </span>
                <span className="block text-[8px] text-foreground/45 truncate font-mono mt-0.5">
                  {currentUser.email}
                </span>
                <span className="inline-block px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/20 text-[6.5px] font-black rounded-full uppercase tracking-wider mt-1.5 font-bold">
                  {currentUser.role === 'ADMIN' ? 'CEO / Admin' : currentUser.role === 'STAFF' ? 'Staff' : currentUser.role === 'BUSINESS' ? 'Tenant Admin' : currentUser.role === 'DEVELOPER' ? 'Developer' : currentUser.role === 'DESIGNER' ? 'Designer' : currentUser.role === 'SALES' ? 'Sales Oracle' : 'Client'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 py-3 text-red-500/60 hover:text-red-500 transition-all font-black uppercase tracking-widest text-[9px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* 3. CLASSIC DESKTOP SIDEBAR */}
      <aside className={`hidden lg:flex ${isCollapsed ? 'w-24 px-4 py-8 items-center' : 'w-72 p-8'} bg-card-bg border-r border-card-border flex-col shrink-0 min-h-screen sticky top-0 h-screen transition-all duration-300`}>
        {/* Header (Logo + Collapse Button) */}
        {!isCollapsed ? (
          <div className="flex justify-between items-center w-full mb-8">
            <Link href="/" className="text-xl font-black tracking-tighter truncate">
              NECTAR <span className="text-nectar-gold">LABS</span>
            </Link>
            <button
              onClick={toggleCollapse}
              title="Contraer Menú"
              className="w-8 h-8 rounded-xl border border-card-border flex items-center justify-center text-foreground/50 hover:text-nectar-gold hover:border-nectar-gold/40 transition-all shrink-0 ml-2 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full mb-8">
            <Link href="/" className="text-xl font-black tracking-tighter text-nectar-gold">
              N.
            </Link>
            <button
              onClick={toggleCollapse}
              title="Expandir Menú"
              className="w-8 h-8 rounded-xl border border-card-border flex items-center justify-center text-foreground/50 hover:text-nectar-gold hover:border-nectar-gold/40 transition-all shrink-0 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable Navigation Area containing the relative footer */}
        <div className="w-full flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col justify-start gap-8">
          <nav className="flex-1">
            {renderNavLinks()}
          </nav>
          
          {/* Profile Widget */}
          {currentUser && (
            <div className="w-full transition-all duration-300">
              {isCollapsed ? (
                <div className="flex justify-center w-full relative group cursor-pointer" title={`${currentUser.username || currentUser.email} (${currentUser.role === 'ADMIN' ? 'CEO / Admin' : currentUser.role === 'STAFF' ? 'Staff' : currentUser.role === 'BUSINESS' ? 'Tenant Admin' : currentUser.role === 'DEVELOPER' ? 'Developer' : currentUser.role === 'DESIGNER' ? 'Designer' : currentUser.role === 'SALES' ? 'Sales Oracle' : 'Client'})`}>
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-nectar-gold to-yellow-600/30 flex items-center justify-center border border-nectar-gold/20 relative shadow-lg shadow-nectar-gold/5 hover:scale-105 active:scale-95 transition-all">
                    <span className="text-background font-black text-xs font-mono tracking-wider">
                      {currentUser.username?.substring(0, 2).toUpperCase() || currentUser.email?.substring(0, 2).toUpperCase() || 'U'}
                    </span>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card-bg shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-3xl bg-foreground/[0.02] border border-card-border/40 flex items-center gap-3.5 w-full hover:bg-foreground/[0.04] transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute -right-8 -bottom-8 w-16 h-16 bg-nectar-gold/5 blur-xl rounded-full pointer-events-none group-hover:bg-nectar-gold/10 transition-all duration-500"></div>
                  
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-nectar-gold to-yellow-600/30 flex items-center justify-center border border-nectar-gold/20 relative shrink-0 shadow-lg shadow-nectar-gold/5">
                    <span className="text-background font-black text-xs font-mono tracking-wider">
                      {currentUser.username?.substring(0, 2).toUpperCase() || currentUser.email?.substring(0, 2).toUpperCase() || 'US'}
                    </span>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card-bg shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse"></div>
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <span className="block font-black text-[10px] text-foreground uppercase tracking-wider truncate">
                      {currentUser.username || 'Usuario'}
                    </span>
                    <span className="block text-[8px] text-foreground/45 truncate font-mono mt-0.5">
                      {currentUser.email}
                    </span>
                    <span className="inline-block px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/20 text-[6.5px] font-black rounded-full uppercase tracking-wider mt-1.5 font-bold">
                      {currentUser.role === 'ADMIN' ? 'CEO / Admin' : currentUser.role === 'STAFF' ? 'Staff' : currentUser.role === 'BUSINESS' ? 'Tenant Admin' : currentUser.role === 'DEVELOPER' ? 'Developer' : currentUser.role === 'DESIGNER' ? 'Designer' : currentUser.role === 'SALES' ? 'Sales Oracle' : 'Client'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className={`pt-6 border-t border-card-border/60 flex ${isCollapsed ? 'flex-col items-center gap-4' : 'items-center justify-between gap-2'} w-full`}>
            {!isCollapsed ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 py-3 text-red-500/60 hover:text-red-500 transition-all font-black uppercase tracking-widest text-[9px] group cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                <span>Cerrar Sesión</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="flex items-center justify-center w-10 h-10 rounded-2xl text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            )}

            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}

export default function DashboardSidebar() {
  return (
    <Suspense fallback={null}>
      <DashboardSidebarContent />
    </Suspense>
  );
}
