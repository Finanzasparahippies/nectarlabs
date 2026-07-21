'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function NectarCastPage() {
  const [detectedOS, setDetectedOS] = useState<'windows' | 'mac' | 'linux' | 'unknown'>('unknown');
  const [activeTab, setActiveTab] = useState<'windows' | 'mac' | 'linux'>('windows');
  const [copiedRtmp, setCopiedRtmp] = useState(false);

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

  const handleCopyRtmp = () => {
    navigator.clipboard.writeText('rtmp://127.0.0.1:1935/live');
    setCopiedRtmp(true);
    setTimeout(() => setCopiedRtmp(false), 2000);
  };

  const downloads = {
    windows: {
      title: 'Windows',
      icon: (
        <svg className="w-10 h-10 fill-current text-blue-500" viewBox="0 0 24 24">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.8" />
        </svg>
      ),
      badge: 'Windows 10 / 11 (64-bit)',
      primary: {
        label: 'Descargar .EXE (Instalador Setup)',
        url: 'https://github.com/Finanzasparahippies/nectar-cast/releases/download/v0.1.0/nectar-cast_0.1.0_x64-setup.exe',
        desc: 'Recomendado para la mayoría de usuarios de Windows',
        format: '.exe setup'
      },
      secondary: {
        label: 'Descargar .MSI (Paquete MSI)',
        url: 'https://github.com/Finanzasparahippies/nectar-cast/releases/download/v0.1.0/nectar-cast_0.1.0_x64_en-US.msi',
        desc: 'Ideal para despliegues o entornos corporativos',
        format: '.msi x64'
      }
    },
    mac: {
      title: 'macOS',
      icon: (
        <svg className="w-10 h-10 fill-current text-slate-200 dark:text-slate-100" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.18c.67-.82 1.12-1.95.99-3.08-1 .04-2.19.67-2.88 1.47-.6.7-1.13 1.83-.99 2.94 1.11.09 2.22-.51 2.88-1.33z"/>
        </svg>
      ),
      badge: 'Apple Silicon (M1/M2/M3) & Intel',
      primary: {
        label: 'Descargar .DMG (Universal)',
        url: 'https://github.com/Finanzasparahippies/nectar-cast/releases/download/v0.1.0/nectar-cast_0.1.0_universal.dmg',
        desc: 'Binario Universal compatible con Mac antiguas y de última generación',
        format: '.dmg Universal'
      }
    },
    linux: {
      title: 'Linux',
      icon: (
        <svg className="w-10 h-10 fill-current text-amber-500" viewBox="0 0 24 24">
          <path d="M12 2A4 4 0 0 0 8 6C8 7.37 8.7 8.57 9.77 9.27C9.37 10.37 8 13.5 8 15.5C8 17.5 9 19 10.5 20.5C9.5 20.8 7.5 21 5.5 20C4.5 19.5 3 20 3 21C3 22 5.5 22.5 8 22.5C11.5 22.5 12.5 21.5 12.5 20.5C12.5 19.5 11.5 18 11.5 16.5C11.5 13.5 12.5 13.5 13.5 13.5C14.5 13.5 15.5 15 15.5 16.5C15.5 18 14.5 19.5 14.5 20.5C14.5 21.5 15.5 22.5 19 22.5C21.5 22.5 24 22 24 21C24 20 22.5 19.5 21.5 20C19.5 21 17.5 20.8 16.5 20.5C18 19 19 17.5 19 15.5C19 13.5 17.63 10.37 17.23 9.27C18.3 8.57 19 7.37 19 6A4 4 0 0 0 15 2H12Z"/>
        </svg>
      ),
      badge: 'Ubuntu, Debian, Fedora, Arch & derivados',
      primary: {
        label: 'Descargar .AppImage (Universal)',
        url: 'https://github.com/Finanzasparahippies/nectar-cast/releases/download/v0.1.0/nectar-cast_0.1.0_amd64.AppImage',
        desc: 'Ejecutable sin instalación para cualquier distribución de Linux',
        format: '.AppImage'
      },
      secondary: {
        label: 'Descargar .DEB (Debian/Ubuntu)',
        url: 'https://github.com/Finanzasparahippies/nectar-cast/releases/download/v0.1.0/nectar-cast_0.1.0_amd64.deb',
        desc: 'Instalador nativo para Ubuntu, Debian, Mint y Pop!_OS',
        format: '.deb'
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center selection:bg-nectar-gold selection:text-nectar-cream bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full relative overflow-hidden pt-32 sm:pt-44 pb-20 px-6 flex flex-col items-center text-center">
        {/* Glow Effects */}
        <div className="absolute top-[-5%] left-[-10%] w-[55%] h-[55%] bg-nectar-gold/15 rounded-full blur-[140px] -z-10 animate-glow"></div>
        <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] bg-nectar-forest/20 rounded-full blur-[140px] -z-10 animate-glow" style={{ animationDelay: '2.5s' }}></div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 mb-8 text-xs font-black tracking-widest text-nectar-gold uppercase border border-nectar-gold/30 rounded-full bg-nectar-gold/10 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-nectar-gold animate-ping" />
          Software Gratuito & Open Source • Powered by Nectar-Labs
        </div>

        {/* Title */}
        <div className="relative max-w-5xl mb-8">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-none animate-premium">
            Néctar <span className="text-nectar-gold italic">Cast</span> 📡
          </h1>
          <p className="mt-6 text-lg sm:text-2xl text-foreground/80 max-w-3xl mx-auto font-medium leading-relaxed">
            La suite de retransmisión multistreaming <strong className="text-foreground font-black">100% portable y local</strong>. Duplica tu directo a YouTube, Facebook, Twitch e Instagram con <span className="text-nectar-gold font-bold">0% consumo de CPU extra</span>.
          </p>
        </div>

        {/* Highlights Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl w-full my-10 p-6 bg-card-bg/60 border border-card-border rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex flex-col items-center text-center p-3">
            <span className="text-2xl sm:text-3xl font-black text-nectar-gold">0% CPU</span>
            <span className="text-xs font-bold text-foreground/70 uppercase tracking-wider mt-1">Copy Codec Passthrough</span>
          </div>
          <div className="flex flex-col items-center text-center p-3 border-l border-card-border">
            <span className="text-2xl sm:text-3xl font-black text-nectar-gold">100% Local</span>
            <span className="text-xs font-bold text-foreground/70 uppercase tracking-wider mt-1">Sin Servidores de Pago</span>
          </div>
          <div className="flex flex-col items-center text-center p-3 border-l md:border-l-1 border-card-border">
            <span className="text-2xl sm:text-3xl font-black text-nectar-gold">Chat Unificado</span>
            <span className="text-xs font-bold text-foreground/70 uppercase tracking-wider mt-1">Con Lector IA (TTS)</span>
          </div>
          <div className="flex flex-col items-center text-center p-3 border-l border-card-border">
            <span className="text-2xl sm:text-3xl font-black text-nectar-gold">Multi-Platform</span>
            <span className="text-xs font-bold text-foreground/70 uppercase tracking-wider mt-1">Windows • macOS • Linux</span>
          </div>
        </div>

        {/* Quick Link Scroll Button */}
        <a href="#downloads" className="mt-4 px-8 py-4 bg-nectar-gold text-background font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-nectar-gold/20 flex items-center gap-3 text-sm uppercase tracking-widest">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Ir al Centro de Descargas
        </a>
      </section>

      {/* Download Center Section */}
      <section id="downloads" className="w-full max-w-7xl px-6 py-20 scroll-mt-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Centro de <span className="text-nectar-gold">Descargas</span>
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto text-base sm:text-lg">
            Selecciona tu sistema operativo e instala Néctar Cast en cuestión de segundos. Todos los binarios son firmados y verificados.
          </p>
        </div>

        {/* OS Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* WINDOWS CARD */}
          <div className={`relative flex flex-col justify-between p-8 rounded-3xl border transition-all duration-300 ${
            detectedOS === 'windows' 
              ? 'bg-card-bg border-nectar-gold shadow-2xl shadow-nectar-gold/10 scale-[1.02]' 
              : 'bg-card-bg/40 border-card-border hover:border-card-border/80'
          }`}>
            {detectedOS === 'windows' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-nectar-gold text-background text-[10px] font-black tracking-widest uppercase rounded-full shadow-md">
                ⭐ Tu Sistema Detectado
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  {downloads.windows.icon}
                </div>
                <span className="text-xs font-bold text-foreground/60 px-3 py-1 bg-foreground/5 rounded-full">v0.1.0</span>
              </div>
              <h3 className="text-2xl font-black mb-1">Windows</h3>
              <p className="text-xs text-foreground/60 font-semibold mb-6">{downloads.windows.badge}</p>

              <div className="space-y-4">
                <a 
                  href={downloads.windows.primary.url}
                  className="w-full py-4 px-6 bg-nectar-gold text-background font-black rounded-xl hover:scale-[1.02] transition-all flex items-center justify-between text-xs tracking-wider shadow-lg shadow-nectar-gold/20 group"
                >
                  <span className="flex flex-col text-left">
                    <span className="font-extrabold">{downloads.windows.primary.label}</span>
                    <span className="text-[10px] opacity-80 font-medium">{downloads.windows.primary.desc}</span>
                  </span>
                  <svg className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>

                <a 
                  href={downloads.windows.secondary.url}
                  className="w-full py-3 px-5 bg-foreground/5 border border-card-border text-foreground hover:bg-foreground/10 font-bold rounded-xl transition-all flex items-center justify-between text-xs tracking-wider"
                >
                  <span className="flex flex-col text-left">
                    <span>{downloads.windows.secondary.label}</span>
                    <span className="text-[10px] opacity-60 font-normal">{downloads.windows.secondary.desc}</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-foreground/10 rounded">.MSI</span>
                </a>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-card-border flex items-center justify-between text-[11px] text-foreground/50 font-medium">
              <span>Arquitectura x64</span>
              <span>Licencia MIT</span>
            </div>
          </div>

          {/* MAC CARD */}
          <div className={`relative flex flex-col justify-between p-8 rounded-3xl border transition-all duration-300 ${
            detectedOS === 'mac' 
              ? 'bg-card-bg border-nectar-gold shadow-2xl shadow-nectar-gold/10 scale-[1.02]' 
              : 'bg-card-bg/40 border-card-border hover:border-card-border/80'
          }`}>
            {detectedOS === 'mac' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-nectar-gold text-background text-[10px] font-black tracking-widest uppercase rounded-full shadow-md">
                ⭐ Tu Sistema Detectado
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-slate-500/10 rounded-2xl border border-slate-500/20">
                  {downloads.mac.icon}
                </div>
                <span className="text-xs font-bold text-foreground/60 px-3 py-1 bg-foreground/5 rounded-full">v0.1.0</span>
              </div>
              <h3 className="text-2xl font-black mb-1">macOS</h3>
              <p className="text-xs text-foreground/60 font-semibold mb-6">{downloads.mac.badge}</p>

              <div className="space-y-4">
                <a 
                  href={downloads.mac.primary.url}
                  className="w-full py-4 px-6 bg-nectar-gold text-background font-black rounded-xl hover:scale-[1.02] transition-all flex items-center justify-between text-xs tracking-wider shadow-lg shadow-nectar-gold/20 group"
                >
                  <span className="flex flex-col text-left">
                    <span className="font-extrabold">{downloads.mac.primary.label}</span>
                    <span className="text-[10px] opacity-80 font-medium">{downloads.mac.primary.desc}</span>
                  </span>
                  <svg className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-card-border flex items-center justify-between text-[11px] text-foreground/50 font-medium">
              <span>Apple Silicon & Intel</span>
              <span>Licencia MIT</span>
            </div>
          </div>

          {/* LINUX CARD */}
          <div className={`relative flex flex-col justify-between p-8 rounded-3xl border transition-all duration-300 ${
            detectedOS === 'linux' 
              ? 'bg-card-bg border-nectar-gold shadow-2xl shadow-nectar-gold/10 scale-[1.02]' 
              : 'bg-card-bg/40 border-card-border hover:border-card-border/80'
          }`}>
            {detectedOS === 'linux' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-nectar-gold text-background text-[10px] font-black tracking-widest uppercase rounded-full shadow-md">
                ⭐ Tu Sistema Detectado
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  {downloads.linux.icon}
                </div>
                <span className="text-xs font-bold text-foreground/60 px-3 py-1 bg-foreground/5 rounded-full">v0.1.0</span>
              </div>
              <h3 className="text-2xl font-black mb-1">Linux</h3>
              <p className="text-xs text-foreground/60 font-semibold mb-6">{downloads.linux.badge}</p>

              <div className="space-y-4">
                <a 
                  href={downloads.linux.primary.url}
                  className="w-full py-4 px-6 bg-nectar-gold text-background font-black rounded-xl hover:scale-[1.02] transition-all flex items-center justify-between text-xs tracking-wider shadow-lg shadow-nectar-gold/20 group"
                >
                  <span className="flex flex-col text-left">
                    <span className="font-extrabold">{downloads.linux.primary.label}</span>
                    <span className="text-[10px] opacity-80 font-medium">{downloads.linux.primary.desc}</span>
                  </span>
                  <svg className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>

                {downloads.linux.secondary && (
                  <a 
                    href={downloads.linux.secondary.url}
                    className="w-full py-3 px-5 bg-foreground/5 border border-card-border text-foreground hover:bg-foreground/10 font-bold rounded-xl transition-all flex items-center justify-between text-xs tracking-wider"
                  >
                    <span className="flex flex-col text-left">
                      <span>{downloads.linux.secondary.label}</span>
                      <span className="text-[10px] opacity-60 font-normal">{downloads.linux.secondary.desc}</span>
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-foreground/10 rounded">.DEB</span>
                  </a>
                )}
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-card-border flex items-center justify-between text-[11px] text-foreground/50 font-medium">
              <span>AMD64 / x86_64</span>
              <span>Licencia MIT</span>
            </div>
          </div>

        </div>
      </section>

      {/* Beginner's User Guide (Guía para Novatos) */}
      <section className="w-full max-w-6xl px-6 py-20 border-t border-card-border">
        <div className="text-center mb-12">
          <span className="px-4 py-1.5 text-xs font-black uppercase tracking-widest text-nectar-gold bg-nectar-gold/10 rounded-full border border-nectar-gold/20">
            Guía de Inicio Rápido
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4">
            ¿Cómo empezar con <span className="text-nectar-gold">Néctar Cast</span>?
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto text-base mt-2">
            Diseñado para que cualquier creador o streamer novato comience a transmitir a múltiples redes sociales en 3 simples pasos.
          </p>
        </div>

        {/* Tab Buttons for Installation Steps */}
        <div className="flex justify-center gap-3 mb-10 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('windows')}
            aria-label="Ver guía para Windows"
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'windows'
                ? 'bg-nectar-gold text-background shadow-lg shadow-nectar-gold/20'
                : 'bg-card-bg/60 border border-card-border text-foreground/70 hover:text-foreground'
            }`}
          >
            Instalación en Windows
          </button>
          <button
            onClick={() => setActiveTab('mac')}
            aria-label="Ver guía para macOS"
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'mac'
                ? 'bg-nectar-gold text-background shadow-lg shadow-nectar-gold/20'
                : 'bg-card-bg/60 border border-card-border text-foreground/70 hover:text-foreground'
            }`}
          >
            Instalación en macOS
          </button>
          <button
            onClick={() => setActiveTab('linux')}
            aria-label="Ver guía para Linux"
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'linux'
                ? 'bg-nectar-gold text-background shadow-lg shadow-nectar-gold/20'
                : 'bg-card-bg/60 border border-card-border text-foreground/70 hover:text-foreground'
            }`}
          >
            Instalación en Linux
          </button>
        </div>

        {/* Installation Instructions Content */}
        <div className="p-8 sm:p-12 bg-card-bg/70 border border-card-border rounded-3xl backdrop-blur-xl shadow-xl mb-16">
          {activeTab === 'windows' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-nectar-gold flex items-center gap-2">
                <span>🪟</span> Paso 1: Instalación en Windows
              </h3>
              <ol className="list-decimal list-inside space-y-3 text-sm text-foreground/80 font-medium">
                <li>Descarga el instalador <code className="px-2 py-0.5 bg-foreground/10 rounded font-mono text-nectar-gold">.exe</code> o <code className="px-2 py-0.5 bg-foreground/10 rounded font-mono text-nectar-gold">.msi</code>.</li>
                <li>Haz doble clic en el archivo descargado. Si Windows SmartScreen muestra una advertencia, haz clic en <strong>"Más información"</strong> y luego en <strong>"Ejecutar de todos modos"</strong>.</li>
                <li>Sigue el asistente de instalación de Néctar Cast y abre la aplicación.</li>
              </ol>
            </div>
          )}

          {activeTab === 'mac' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-nectar-gold flex items-center gap-2">
                <span>🍎</span> Paso 1: Instalación en macOS
              </h3>
              <ol className="list-decimal list-inside space-y-3 text-sm text-foreground/80 font-medium">
                <li>Descarga el archivo ejecutable <code className="px-2 py-0.5 bg-foreground/10 rounded font-mono text-nectar-gold">.dmg</code> Universal.</li>
                <li>Abre la imagen de disco descargada y arrastra el ícono de <strong>Néctar Cast</strong> a tu carpeta de <strong>Aplicaciones</strong>.</li>
                <li>Al abrir por primera vez, concede los permisos correspondientes de grabación y audio si el sistema lo requiere en Preferencias del Sistema.</li>
              </ol>
            </div>
          )}

          {activeTab === 'linux' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-nectar-gold flex items-center gap-2">
                <span>🐧</span> Paso 1: Instalación en Linux
              </h3>
              <div className="space-y-4 text-sm text-foreground/80 font-medium">
                <div>
                  <strong className="text-foreground">Para AppImage (Universal):</strong>
                  <pre className="mt-2 p-4 bg-background border border-card-border rounded-xl font-mono text-xs overflow-x-auto text-nectar-gold">
                    chmod +x nectar-cast_0.1.0_amd64.AppImage{'\n'}
                    ./nectar-cast_0.1.0_amd64.AppImage
                  </pre>
                </div>
                <div>
                  <strong className="text-foreground">Para paquetes Debian / Ubuntu (.deb):</strong>
                  <pre className="mt-2 p-4 bg-background border border-card-border rounded-xl font-mono text-xs overflow-x-auto text-nectar-gold">
                    sudo dpkg -i nectar-cast_0.1.0_amd64.deb
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* OBS Studio Integration Step-by-Step */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-card-bg/50 border border-card-border rounded-3xl relative">
            <div className="w-10 h-10 rounded-2xl bg-nectar-gold text-background font-black flex items-center justify-center text-lg mb-4">
              1
            </div>
            <h4 className="text-lg font-black mb-2">Conectar OBS Studio</h4>
            <p className="text-xs text-foreground/70 leading-relaxed mb-4">
              Abre OBS Studio ➔ <strong>Ajustes</strong> ➔ <strong>Emisión</strong>. Selecciona Servicio <strong>Personalizado</strong>.
            </p>
            <div className="p-3 bg-background border border-card-border rounded-xl flex items-center justify-between gap-2">
              <code className="text-[11px] font-mono text-nectar-gold truncate">rtmp://127.0.0.1:1935/live</code>
              <button 
                onClick={handleCopyRtmp}
                className="px-2 py-1 bg-nectar-gold/20 text-nectar-gold hover:bg-nectar-gold hover:text-background text-[10px] font-bold rounded transition-all whitespace-nowrap"
              >
                {copiedRtmp ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="p-6 bg-card-bg/50 border border-card-border rounded-3xl relative">
            <div className="w-10 h-10 rounded-2xl bg-nectar-gold text-background font-black flex items-center justify-center text-lg mb-4">
              2
            </div>
            <h4 className="text-lg font-black mb-2">Clave de Retransmisión</h4>
            <p className="text-xs text-foreground/70 leading-relaxed mb-4">
              En el campo <strong>Clave de Retransmisión (Stream Key)</strong> en tu OBS Studio, ingresa la palabra clave por defecto:
            </p>
            <div className="p-3 bg-background border border-card-border rounded-xl">
              <code className="text-[11px] font-mono text-nectar-gold">test</code>
            </div>
          </div>

          <div className="p-6 bg-card-bg/50 border border-card-border rounded-3xl relative">
            <div className="w-10 h-10 rounded-2xl bg-nectar-gold text-background font-black flex items-center justify-center text-lg mb-4">
              3
            </div>
            <h4 className="text-lg font-black mb-2">¡Comenzar Retransmisión!</h4>
            <p className="text-xs text-foreground/70 leading-relaxed mb-4">
              Presiona <strong>Iniciar Transmisión</strong> en OBS. Néctar Cast capturará la señal local y te permitirás encender el flujo a YouTube, Facebook, Twitch o Instagram.
            </p>
            <div className="text-[10px] text-nectar-gold font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              0% Carga Adicional en tu CPU
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Promotion Section (Publicidad para Nectar-Labs) */}
      <section className="w-full max-w-6xl px-6 py-20 my-10">
        <div className="relative p-10 sm:p-16 rounded-[2.5rem] bg-gradient-to-br from-nectar-forest/80 via-card-bg to-background border-2 border-nectar-gold/30 overflow-hidden shadow-2xl shadow-nectar-forest/30">
          
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-nectar-gold/20 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-block px-4 py-1.5 mb-6 text-[10px] font-black tracking-widest text-nectar-gold uppercase border border-nectar-gold/30 rounded-full bg-background/50 backdrop-blur-md">
              Desarrollado por Nectar-Labs
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-6">
              ¿Quieres llevar tu proyecto digital al siguiente nivel?
            </h2>
            
            <p className="text-sm sm:text-lg text-foreground/80 font-medium leading-relaxed mb-8">
              Néctar Cast es solo una muestra de la ingeniería de software artesanal que creamos en <strong className="text-foreground">Nectar-Labs</strong>. Desarrollamos aplicaciones de escritorio, plataformas web de alto rendimiento, sistemas ERP/CRM y soluciones en la nube adaptadas a tus necesidades.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/#pricing" 
                className="px-8 py-4 bg-nectar-gold text-background font-black rounded-2xl hover:scale-105 transition-all text-xs uppercase tracking-widest text-center shadow-xl shadow-nectar-gold/20"
              >
                Explorar Planes Nectar-Labs
              </Link>
              <Link 
                href="/portfolio" 
                className="px-8 py-4 bg-foreground/10 border border-card-border text-foreground hover:bg-foreground/20 font-black rounded-2xl transition-all text-xs uppercase tracking-widest text-center backdrop-blur-md"
              >
                Ver Portafolio de Proyectos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer minimalista */}
      <footer className="w-full py-8 border-t border-card-border text-center text-xs text-foreground/50 font-medium">
        <p>© {new Date().getFullYear()} Nectar-Labs • Néctar Cast (v0.1.0) • Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
