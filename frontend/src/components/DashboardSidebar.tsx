'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { fetcher } from '@/lib/api';

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

  useEffect(() => {
    const checkAuth = (role: string, staff: boolean) => {
      setUserRole(role);
      
      const isDev = role === 'DEVELOPER';
      const isDes = role === 'DESIGNER';
      const isSal = role === 'SALES';
      
      // CEO is explicit role ADMIN or is_staff is true (excluding developer/designer)
      const ceo = role === 'ADMIN' || (staff && !isDev && !isDes);
      setIsCEO(ceo);
      
      const staffAllowed = (staff || role === 'ADMIN' || role === 'BUSINESS') && role !== 'DESIGNER';
      setIsStaff(staffAllowed);
      
      // Client is anyone who is NOT CEO, NOT Developer, NOT Designer, NOT Salesperson
      const client = !ceo && !isDev && !isDes && !isSal;
      setIsClient(client);
    };

    // Load initial values from localStorage to prevent flash
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

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleScrollToPayment = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/dashboard?tab=overview&scroll=payment-commitment');
  };

  return (
    <aside className="w-full lg:w-72 bg-card-bg border-b lg:border-r border-card-border p-8 flex flex-col justify-between shrink-0">
      <div>
        <Link href="/" className="inline-block text-xl font-black tracking-tighter mb-16">
          NECTAR <span className="text-nectar-gold">LABS</span>
        </Link>
        
        <nav className="space-y-4">
          {/* Dashboard Link */}
          <Link
            href="/dashboard?tab=overview"
            className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
              pathname === '/dashboard' && activeTab === 'overview'
                ? 'bg-nectar-gold/10 text-nectar-gold'
                : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${pathname === '/dashboard' && activeTab === 'overview' ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
            Dashboard
          </Link>

          {/* Clients Only: payment commitment shortcut and hire plan tab */}
          {isClient && contracts.some(c => c.is_fully_signed) && (
            <Link
              href="/dashboard?tab=overview&scroll=payment-commitment"
              onClick={handleScrollToPayment}
              className="flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100"
            >
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Compromiso de Pago
            </Link>
          )}

          {isClient && (
            <Link
              href="/dashboard?tab=hire-plan"
              className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                pathname === '/dashboard' && activeTab === 'hire-plan'
                  ? 'bg-nectar-gold/10 text-nectar-gold'
                  : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${pathname === '/dashboard' && activeTab === 'hire-plan' ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
              Contratar Plan
            </Link>
          )}

          {/* CEO Only: Control Negocio, Rendimiento, Configuración Soporte */}
          {isCEO && (
            <Link
              href="/dashboard?tab=business"
              className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                pathname === '/dashboard' && activeTab === 'business'
                  ? 'bg-nectar-gold/10 text-nectar-gold'
                  : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${pathname === '/dashboard' && activeTab === 'business' ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
              Control Negocio
            </Link>
          )}

          {isCEO && (
            <Link
              href="/dashboard/performance"
              className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                pathname === '/dashboard/performance'
                  ? 'bg-nectar-gold/10 text-nectar-gold'
                  : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${pathname === '/dashboard/performance' ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
              Rendimiento
            </Link>
          )}

          {isCEO && (
            <Link
              href="/dashboard?tab=business&scroll=ventas"
              onClick={(e) => {
                if (pathname === '/dashboard' && activeTab === 'business') {
                  e.preventDefault();
                  document.getElementById('ventas-section')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100`}
            >
              <div className="w-2 h-2 bg-blue-400/40 rounded-full"></div>
              Panel de Ventas
            </Link>
          )}

          {(isCEO || userRole === 'BUSINESS' || contracts.some(c => c.is_fully_signed) || tenants.length > 0) && (
            <Link
              href="/dashboard/support-settings"
              className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                pathname === '/dashboard/support-settings'
                  ? 'bg-nectar-gold/10 text-nectar-gold'
                  : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${pathname === '/dashboard/support-settings' ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
              <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                <span className="truncate">Configuración Soporte</span>
                {!isStaff && tenants[0] && (
                  <span className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-full shrink-0 ${
                    tenants[0].is_active 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {tenants[0].is_active ? 'Activo' : 'Reservado'}
                  </span>
                )}
              </div>
            </Link>
          )}

          {tenants.filter(t => t.is_active).map((tenant) => {
            const tenantUrl = tenant.custom_domain 
              ? `https://${tenant.custom_domain}`
              : (() => {
                  const host = typeof window !== 'undefined' ? window.location.hostname : '';
                  if (host.includes('localhost')) return `http://${tenant.subdomain}.localhost:3000`;
                  if (host.includes('staging.nectarlabs.dev')) return `https://${tenant.subdomain}.staging.nectarlabs.dev`;
                  return `https://${tenant.subdomain}.nectarlabs.dev`;
                })();
            return (
              <a
                key={`portal-${tenant.id}`}
                href={tenantUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <span className="truncate">Ver Portal Público</span>
                  <svg className="w-3.5 h-3.5 text-nectar-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            );
          })}

          {/* General links customized by role */}
          <Link
            href="/tickets"
            className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
              pathname.startsWith('/tickets')
                ? 'bg-nectar-gold/10 text-nectar-gold'
                : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${pathname.startsWith('/tickets') ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
            {isStaff ? 'Gestión Tickets' : 'Soporte'}
          </Link>

          <Link
            href="/projects"
            className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
              pathname.startsWith('/projects')
                ? 'bg-nectar-gold/10 text-nectar-gold'
                : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${pathname.startsWith('/projects') ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
            {isStaff ? 'Proyectos Activos' : 'Mis Proyectos'}
          </Link>

          <Link
            href="/dashboard/addons"
            className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
              pathname === '/dashboard/addons'
                ? 'bg-nectar-gold/10 text-nectar-gold'
                : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${pathname === '/dashboard/addons' ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
            Catálogo Add-ons
          </Link>
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="mt-20 flex items-center gap-4 px-6 py-4 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]"
      >
        <span>Cerrar Sesión</span>
      </button>
    </aside>
  );
}
