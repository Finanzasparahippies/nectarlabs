'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const email = localStorage.getItem('user_email');
      setIsLoggedIn(!!token);
      if (email) setUserEmail(email);
    };

    window.addEventListener('scroll', handleScroll);
    checkAuth();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${scrolled ? 'py-4 bg-background/80 backdrop-blur-xl border-b border-card-border' : 'py-8 bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <Link href="/" className="text-2xl font-black tracking-tighter flex items-center gap-2 group">
          <div className="w-8 h-8 bg-nectar-gold rounded-lg flex items-center justify-center text-background font-black italic group-hover:rotate-12 transition-transform">N</div>
          <span className="text-foreground">NECTAR <span className="text-nectar-gold">LABS</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-12">
          <a href="/#formula" className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-60 hover:opacity-100 transition-opacity">Hoja de Ruta</a>
          <a href="/#pricing" className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-60 hover:opacity-100 transition-opacity">Planes</a>
          {isLoggedIn && (
            <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-widest text-nectar-gold">Dashboard</Link>
          )}
        </div>

        <div className="flex items-center gap-6">
          {isLoggedIn && (
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-nectar-gold/50">Sesión Activa</span>
              <span className="text-[10px] font-black text-foreground/80">{userEmail}</span>
            </div>
          )}
          {!isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link href="/login" className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-foreground/5 rounded-xl transition-all">
                Entrar
              </Link>
              <Link href="/register" className="px-8 py-3 text-[10px] font-black uppercase tracking-widest bg-nectar-gold text-background rounded-xl hover:scale-105 transition-all shadow-xl shadow-nectar-gold/20">
                Comenzar
              </Link>
            </div>
          ) : (
            <button 
              onClick={() => { localStorage.clear(); window.location.href = '/'; }}
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-all border border-red-500/10 rounded-xl hover:bg-red-500/5"
            >
              Salir
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
