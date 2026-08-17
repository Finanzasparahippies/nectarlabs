'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [mounted, setMounted] = useState(false);
  
  // Mobile menu & Dropdown states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [instalablesDropdownOpen, setInstalablesDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const email = localStorage.getItem('user_email');
      setIsLoggedIn(!!token);
      if (email) setUserEmail(email);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setInstalablesDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInstalablesDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    checkAuth();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${scrolled || mobileMenuOpen ? 'py-4 bg-background/85 backdrop-blur-xl border-b border-card-border' : 'py-8 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black tracking-tighter flex items-center gap-2 group">
            <div className="w-8 h-8 bg-nectar-gold rounded-lg flex items-center justify-center text-background font-black italic group-hover:rotate-12 transition-transform">N</div>
            <span className="text-foreground">NECTAR <span className="text-nectar-gold">LABS</span></span>
          </Link>

          {/* Menú de Escritorio */}
          <div className="hidden md:flex items-center gap-10">
            <a href="/#formula" className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-60 hover:opacity-100 transition-opacity">Hoja de Ruta</a>
            <a href="/#pricing" className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-60 hover:opacity-100 transition-opacity">Planes</a>
            <a href="/#addons" className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-60 hover:opacity-100 transition-opacity">Add-ons</a>
            <Link href="/stores" className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-60 hover:opacity-100 transition-opacity">Tiendas</Link>
            
            {/* Dropdown de Instalables */}
            <div 
              ref={dropdownRef}
              className="relative"
              onMouseEnter={() => setInstalablesDropdownOpen(true)}
              onMouseLeave={() => setInstalablesDropdownOpen(false)}
            >
              <button
                onClick={() => setInstalablesDropdownOpen(!instalablesDropdownOpen)}
                aria-expanded={instalablesDropdownOpen}
                aria-haspopup="true"
                className="text-[10px] font-black uppercase tracking-widest text-nectar-gold hover:opacity-100 transition-all flex items-center gap-1.5 focus:outline-none cursor-pointer"
              >
                <span>Instalables</span>
                <svg 
                  className={`w-3 h-3 transition-transform duration-300 ${instalablesDropdownOpen ? 'rotate-180 text-nectar-gold' : 'text-nectar-gold/70'}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Menú Desplegable */}
              {instalablesDropdownOpen && (
                <div 
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute top-full left-0 mt-3 w-64 bg-card-bg/95 backdrop-blur-2xl border border-card-border rounded-2xl p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 z-50 cursor-default"
                >
                  <Link 
                    href="/nectarcast"
                    onClick={() => setInstalablesDropdownOpen(false)}
                    role="menuitem"
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-foreground/5 transition-all group/item"
                  >
                    <div className="p-2 bg-nectar-gold/10 text-nectar-gold rounded-lg group-hover/item:bg-nectar-gold group-hover/item:text-background transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        NectarCast
                        <span className="px-1.5 py-0.2 text-[7px] bg-nectar-gold/20 text-nectar-gold border border-nectar-gold/30 rounded font-bold">GRATIS</span>
                      </div>
                      <p className="text-[9px] text-muted leading-tight mt-0.5">Transmisión & Multimedia Desktop</p>
                    </div>
                  </Link>

                  <Link 
                    href="/nectarq"
                    onClick={() => setInstalablesDropdownOpen(false)}
                    role="menuitem"
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-foreground/5 transition-all group/item mt-1"
                  >
                    <div className="p-2 bg-nectar-gold/10 text-nectar-gold rounded-lg group-hover/item:bg-nectar-gold group-hover/item:text-background transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        NectarQ
                        <span className="px-1.5 py-0.2 text-[7px] bg-nectar-gold/20 text-nectar-gold border border-nectar-gold/30 rounded font-bold">DESKTOP</span>
                      </div>
                      <p className="text-[9px] text-muted leading-tight mt-0.5">Gestión de Filas & Cliente Nativo</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <a href="/#seller-program" className="text-[10px] font-black uppercase tracking-widest text-nectar-gold/70 hover:text-nectar-gold transition-colors flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-nectar-gold animate-pulse" />
              Únete a Nosotros
            </a>
            <Link href="/blog" className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-60 hover:opacity-100 transition-opacity">Blog</Link>
            {mounted && isLoggedIn && (
              <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-widest text-nectar-gold font-bold">Dashboard</Link>
            )}
          </div>

          {/* Botones y Selector de Tema (Escritorio) */}
          <div className="hidden md:flex items-center gap-6">
            {/* ThemeToggle oculto temporalmente manteniendo código fuente */}
            <div className="hidden" aria-hidden="true">
              <ThemeToggle />
            </div>
            {mounted && isLoggedIn && (
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-widest text-nectar-gold/50">Sesión Activa</span>
                <span className="text-[10px] font-black text-foreground/85">{userEmail}</span>
              </div>
            )}
            {!(mounted && isLoggedIn) ? (
              <div className="flex items-center gap-4">
                <Link href="/login" className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-foreground/5 rounded-xl transition-all">
                  Entrar
                </Link>
                <Link href="/register" className="px-8 py-3 text-[10px] font-black uppercase tracking-widest bg-nectar-gold text-background rounded-xl hover:scale-105 transition-all shadow-xl shadow-nectar-gold/20 font-bold">
                  Comenzar
                </Link>
              </div>
            ) : (
              <button 
                onClick={handleLogout}
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500/65 hover:text-red-500 transition-all border border-red-500/10 rounded-xl hover:bg-red-500/5 font-bold"
              >
                Salir
              </button>
            )}
          </div>

          {/* Controles de Dispositivos Móviles (Hamburguesa y Tema) */}
          <div className="flex md:hidden items-center gap-4">
            {/* ThemeToggle oculto temporalmente manteniendo código fuente */}
            <div className="hidden" aria-hidden="true">
              <ThemeToggle />
            </div>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-foreground focus:outline-none z-50 rounded-xl border border-card-border bg-card-bg/40 flex items-center justify-center w-10 h-10"
              aria-label="Alternar Menú"
            >
              {mobileMenuOpen ? (
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
        </div>
      </nav>

      {/* Menú Overlay para Móviles */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl md:hidden flex flex-col justify-between p-8 pt-32 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-6 text-left">
            <a href="/#formula" onClick={() => setMobileMenuOpen(false)} className="text-xl font-black uppercase tracking-widest text-foreground hover:text-nectar-gold transition-colors">Hoja de Ruta</a>
            <a href="/#pricing" onClick={() => setMobileMenuOpen(false)} className="text-xl font-black uppercase tracking-widest text-foreground hover:text-nectar-gold transition-colors">Planes</a>
            <a href="/#addons" onClick={() => setMobileMenuOpen(false)} className="text-xl font-black uppercase tracking-widest text-foreground hover:text-nectar-gold transition-colors">Add-ons</a>
            <Link href="/stores" onClick={() => setMobileMenuOpen(false)} className="text-xl font-black uppercase tracking-widest text-foreground hover:text-nectar-gold transition-colors">Tiendas</Link>
            
            {/* Instalables en Móvil */}
            <div className="flex flex-col gap-3 py-2 border-y border-card-border/50">
              <span className="text-[9px] font-black uppercase tracking-widest text-nectar-gold/70">Instalables</span>
              <Link href="/nectarcast" onClick={() => setMobileMenuOpen(false)} className="text-lg font-black uppercase tracking-widest text-nectar-gold hover:underline flex items-center justify-between">
                <span>NectarCast</span>
                <span className="px-2 py-0.5 text-xs bg-nectar-gold/20 text-nectar-gold border border-nectar-gold/30 rounded-lg font-bold">GRATIS</span>
              </Link>
              <Link href="/nectarq" onClick={() => setMobileMenuOpen(false)} className="text-lg font-black uppercase tracking-widest text-foreground hover:text-nectar-gold transition-colors flex items-center justify-between">
                <span>NectarQ</span>
                <span className="px-2 py-0.5 text-xs bg-nectar-gold/20 text-nectar-gold border border-nectar-gold/30 rounded-lg font-bold">DESKTOP</span>
              </Link>
            </div>

            <a href="/#seller-program" onClick={() => setMobileMenuOpen(false)} className="text-xl font-black uppercase tracking-widest text-nectar-gold hover:underline">Únete a Nosotros</a>
            <Link href="/blog" onClick={() => setMobileMenuOpen(false)} className="text-xl font-black uppercase tracking-widest text-foreground hover:text-nectar-gold transition-colors">Blog</Link>
            {mounted && isLoggedIn && (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-xl font-black uppercase tracking-widest text-nectar-gold font-bold">Dashboard</Link>
            )}
          </div>
          
          <div className="pt-8 border-t border-card-border flex flex-col gap-4">
            {mounted && isLoggedIn ? (
              <>
                <div className="text-left mb-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-nectar-gold/50">Sesión Activa</p>
                  <p className="text-sm font-black text-foreground/80">{userEmail}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 text-center text-xs font-black uppercase tracking-widest text-red-500 border border-red-500/10 rounded-2xl bg-red-500/5 transition-all font-bold"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="py-4 text-center text-xs font-black uppercase tracking-widest text-foreground border border-card-border rounded-2xl transition-all">
                  Entrar
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="py-4 text-center text-xs font-black uppercase tracking-widest bg-nectar-gold text-background rounded-2xl font-bold shadow-lg shadow-nectar-gold/20 transition-all">
                  Comenzar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
