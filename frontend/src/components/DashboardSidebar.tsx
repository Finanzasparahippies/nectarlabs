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

  useEffect(() => {
    const staff = localStorage.getItem('is_staff') === 'true';
    const role = localStorage.getItem('user_role') || '';
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

    // Fetch contracts to check if payment commitment is needed for client
    const loadContracts = async () => {
      try {
        const contractsData = await fetcher('/contracts/');
        if (Array.isArray(contractsData)) {
          setContracts(contractsData);
        }
      } catch (err) {
        console.error("Error loading contracts in sidebar:", err);
      }
    };
    
    loadContracts();
  }, []);

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
              href="/dashboard?tab=business#ventas"
              onClick={(e) => { e.preventDefault(); window.location.href = '/dashboard?tab=business'; setTimeout(() => { document.querySelector('[data-section="ventas"]')?.scrollIntoView({ behavior: 'smooth' }); }, 500); }}
              className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100`}
            >
              <div className="w-2 h-2 bg-blue-400/40 rounded-full"></div>
              Panel de Ventas
            </Link>
          )}

          {isCEO && (
            <Link
              href="/dashboard/support-settings"
              className={`flex items-center gap-4 px-6 py-4 w-full text-left rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                pathname === '/dashboard/support-settings'
                  ? 'bg-nectar-gold/10 text-nectar-gold'
                  : 'hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${pathname === '/dashboard/support-settings' ? 'bg-nectar-gold' : 'bg-foreground/20'}`}></div>
              Configuración Soporte
            </Link>
          )}

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
