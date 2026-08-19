'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function NectarQPage() {
  const [detectedOS, setDetectedOS] = useState<'windows' | 'mac' | 'linux' | 'unknown'>('unknown');
  const [activeTab, setActiveTab] = useState<'windows' | 'mac' | 'linux'>('windows');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) {
        setDetectedOS('windows');
        setActiveTab('windows');
      } else if (userAgent.includes('mac')) {
        setDetectedOS('mac');
        setActiveTab('mac');
      } else if (userAgent.includes('linux')) {
        setDetectedOS('linux');
        setActiveTab('linux');
      } else {
        setDetectedOS('windows');
      }
    }
  }, []);

  const downloads = {
    windows: {
      title: 'Windows',
      badge: 'Windows 10 / 11 (64-bit)',
      icon: (
        <svg className="w-10 h-10 fill-current text-blue-500" viewBox="0 0 24 24">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.8" />
        </svg>
      ),
      primary: {
        label: 'Descargar NectarQ (.EXE Setup)',
        url: '#',
        desc: 'Instalador oficial recomendado para Windows 10/11',
        format: '.exe x64'
      },
      secondary: {
        label: 'Descargar NectarQ (.MSI Enterprise)',
        url: '#',
        desc: 'Paquete MSI ideal para redes y despliegues en sucursales',
        format: '.msi'
      }
    },
    mac: {
      title: 'macOS',
      badge: 'Apple Silicon (M1/M2/M3) & Intel',
      icon: (
        <svg className="w-10 h-10 fill-current text-slate-200 dark:text-slate-100" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.18c.67-.82 1.12-1.95.99-3.08-1 .04-2.19.67-2.88 1.47-.6.7-1.13 1.83-.99 2.94 1.11.09 2.22-.51 2.88-1.33z" />
        </svg>
      ),
      primary: {
        label: 'Descargar NectarQ (.DMG Universal)',
        url: '#',
        desc: 'Binario universal para Mac Intel y Apple Silicon',
        format: '.dmg Universal'
      }
    },
    linux: {
      title: 'Linux',
      badge: 'Ubuntu, Debian, Fedora, Arch & derivados',
      icon: (
        <svg className="w-10 h-10 fill-current text-amber-500" viewBox="0 0 24 24">
          <path d="M12 2A4 4 0 0 0 8 6C8 7.37 8.7 8.57 9.77 9.27C9.37 10.37 8 13.5 8 15.5C8 17.5 9 19 10.5 20.5C9.5 20.8 7.5 21 5.5 20C4.5 19.5 3 20 3 21C3 22 5.5 22.5 8 22.5C11.5 22.5 12.5 21.5 12.5 20.5C12.5 19.5 11.5 18 11.5 16.5C11.5 13.5 12.5 13.5 13.5 13.5C14.5 13.5 15.5 15 15.5 16.5C15.5 18 14.5 19.5 14.5 20.5C14.5 21.5 15.5 22.5 19 22.5C21.5 22.5 24 22 24 21C24 20 22.5 19.5 21.5 20C19.5 21 17.5 20.8 16.5 20.5C18 19 19 17.5 19 15.5C19 13.5 17.63 10.37 17.23 9.27C18.3 8.57 19 7.37 19 6A4 4 0 0 0 15 2H12Z" />
        </svg>
      ),
      primary: {
        label: 'Descargar NectarQ (.AppImage)',
        url: '#',
        desc: 'Ejecutable sin instalación para cualquier distribución de Linux',
        format: '.AppImage'
      },
      secondary: {
        label: 'Descargar NectarQ (.DEB)',
        url: '#',
        desc: 'Instalador nativo para Ubuntu, Debian y Mint',
        format: '.deb'
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center selection:bg-nectar-gold selection:text-nectar-cream bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full pt-36 pb-20 px-6 max-w-7xl mx-auto text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-nectar-gold/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nectar-gold/10 border border-nectar-gold/30 text-nectar-gold text-[10px] font-black uppercase tracking-widest mb-6 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-nectar-gold animate-pulse" />
          NectarQ Desktop Client & Kiosk Manager
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-foreground mb-6 max-w-4xl mx-auto leading-none">
          Gestión Inteligente de <span className="text-nectar-gold">Filas & Turnos</span> en Sucursales
        </h1>

        <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed mb-10">
          Cliente de escritorio nativo para kioscos de atención, pantallas de llamada multimedia e impresión de tickets térmicos USB/RJ11 en tiempo real.
        </p>

        {/* Tab Switcher por Sistema Operativo */}
        <div className="inline-flex p-1.5 bg-card-bg border border-card-border rounded-2xl mb-12 shadow-md">
          {(['windows', 'mac', 'linux'] as const).map((os) => (
            <button
              key={os}
              onClick={() => setActiveTab(os)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                activeTab === os
                  ? 'bg-nectar-gold text-background shadow-lg scale-105'
                  : 'text-muted hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <span className="capitalize">{os}</span>
              {detectedOS === os && (
                <span className="px-1.5 py-0.5 text-[8px] bg-background/20 text-background rounded font-bold">
                  Tu SO
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Target Installer Download Card */}
        <div className="max-w-xl mx-auto bg-card-bg border border-card-border p-8 rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-nectar-gold/40 transition-all">
          <div className="flex items-center gap-4 mb-6 text-left">
            {downloads[activeTab].icon}
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground">
                NectarQ para {downloads[activeTab].title}
              </h3>
              <p className="text-xs text-muted">{downloads[activeTab].badge}</p>
            </div>
          </div>

          <div className="space-y-4">
            <a
              href={downloads[activeTab].primary.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 bg-nectar-gold text-background font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-between hover:scale-[1.02] active:scale-98 transition-transform shadow-lg shadow-nectar-gold/20"
            >
              <span>{downloads[activeTab].primary.label}</span>
              <span className="text-[9px] bg-background/20 px-2 py-1 rounded font-mono">
                {downloads[activeTab].primary.format}
              </span>
            </a>

            {downloads[activeTab].secondary && (
              <a
                href={downloads[activeTab].secondary!.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-6 bg-foreground/5 border border-card-border text-foreground font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-between hover:bg-foreground/10 transition-all"
              >
                <span>{downloads[activeTab].secondary!.label}</span>
                <span className="text-[9px] text-muted font-mono">
                  {downloads[activeTab].secondary!.format}
                </span>
              </a>
            )}
          </div>

          <p className="text-[10px] text-muted mt-6 text-left border-t border-card-border pt-4">
            * Licencia de libre uso para sucursales registradas en el ecosistema Nectar Labs.
          </p>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="w-full py-20 px-6 max-w-7xl mx-auto border-t border-card-border">
        <div className="text-center mb-16">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-nectar-gold block mb-2">
            Módulos del Sistema
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Arquitectura Nativa para Kioscos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card-bg border border-card-border p-8 rounded-3xl space-y-4 hover:border-nectar-gold/30 transition-all transform-gpu">
            <div className="p-3 bg-nectar-gold/10 text-nectar-gold rounded-2xl w-fit">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider text-foreground">
              Gestor de Filas & Turnos
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Consola intuitiva para ventanillas de atención. Asigna turnos prioritarios, calcula tiempos medios de espera y sincroniza el estado en tiempo real.
            </p>
          </div>

          <div className="bg-card-bg border border-card-border p-8 rounded-3xl space-y-4 hover:border-nectar-gold/30 transition-all transform-gpu">
            <div className="p-3 bg-nectar-gold/10 text-nectar-gold rounded-2xl w-fit">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider text-foreground">
              Impresión Térmica USB/RJ11
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Soporte para impresoras de tickets (58mm/80mm) con generación de QR, código de barras y corte automático de papel post-impresión.
            </p>
          </div>

          <div className="bg-card-bg border border-card-border p-8 rounded-3xl space-y-4 hover:border-nectar-gold/30 transition-all transform-gpu">
            <div className="p-3 bg-nectar-gold/10 text-nectar-gold rounded-2xl w-fit">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider text-foreground">
              Pantalla Llamadora TV
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Interfaz full-screen para pantallas de sala de espera con avisos sonoros (audio sintetizado), lista de turnos llamados y banners multimedia.
            </p>
          </div>
        </div>
      </section>

      {/* Footer minimalista */}
      <footer className="w-full py-12 px-6 border-t border-card-border text-center text-xs text-muted">
        <p>© {new Date().getFullYear()} Nectar Labs. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
