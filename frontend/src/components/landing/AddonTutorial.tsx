'use client';

import React, { useState, useEffect } from 'react';

interface TutorialStep {
  number: string;
  title: string;
  description: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    number: '01',
    title: 'Selección Modular',
    description: 'Elige los Add-ons que tu portal necesita desde nuestro panel de control. No hay paquetes forzados.',
  },
  {
    number: '02',
    title: 'Suscripción Flexible',
    description: 'Enciende o apaga módulos mes a mes. Sin contratos fijos a largo plazo ni plazos forzosos.',
  },
  {
    number: '03',
    title: 'Despliegue Instantáneo',
    description: 'El código se autoinyecta en tu portal de cliente y widgets al instante. Listo para usar en 1-click.',
  },
];

type AddonId = 'live-chat' | 'booking-signature' | 'logistics-gps' | 'patreon-sponsorship' | 'analytics-apm' | 'newsletter';

interface AddonConfig {
  id: AddonId;
  name: string;
  badge: string;
  teaser: string;
}

const addonsConfig: AddonConfig[] = [
  { id: 'live-chat', name: 'Néctar Live Chat', badge: 'COMUNICACIÓN', teaser: 'Burbuja de chat instantánea con tus clientes' },
  { id: 'booking-signature', name: 'Néctar Booking & Signature', badge: 'FIRMA DIGITAL', teaser: 'Reserva de citas con firma digital certificada' },
  { id: 'logistics-gps', name: 'Néctar Logistics & GPS', badge: 'GEOLOCALIZACIÓN', teaser: 'Tracking de ruta y ETA en tiempo real' },
  { id: 'patreon-sponsorship', name: 'Néctar Patreon/Sponsorship', badge: 'MEMBRESÍAS', teaser: 'Feeds exclusivos y muros de pago de Stripe' },
  { id: 'analytics-apm', name: 'Néctar Analytics APM', badge: 'RENDIMIENTO', teaser: 'Métricas Core Web Vitals en tiempo real' },
  { id: 'newsletter', name: 'Néctar Newsletter', badge: 'BOLETINES', teaser: 'Gestor de correos masivos con SMTP/SES' },
];

export default function AddonTutorial() {
  const [activeAddon, setActiveAddon] = useState<AddonId>('live-chat');
  
  // Custom states for each mock animation
  const [chatMessages, setChatMessages] = useState<{ sender: 'client' | 'agent'; text: string }[]>([]);
  const [signatureDone, setSignatureDone] = useState(false);
  const [gpsProgress, setGpsProgress] = useState(0);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [apmPulse, setApmPulse] = useState(0);

  // Live Chat simulation loop
  useEffect(() => {
    if (activeAddon !== 'live-chat') return;
    
    setChatMessages([
      { sender: 'client', text: '¡Hola! Quisiera agendar soporte.' }
    ]);

    const t1 = setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'agent', text: '¡Hola! Claro que sí, indícame tu ID de cliente.' }]);
    }, 1500);

    const t2 = setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'client', text: 'Es el NL-9482' }]);
    }, 3000);

    const t3 = setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'agent', text: 'Identificado. Te asigné con el Ing. Gutiérrez.' }]);
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeAddon]);

  // Booking & Signature simulation loop
  useEffect(() => {
    if (activeAddon !== 'booking-signature') return;
    setSignatureDone(false);
    
    const t = setTimeout(() => {
      setSignatureDone(true);
    }, 2000);

    return () => clearTimeout(t);
  }, [activeAddon]);

  // GPS simulation loop
  useEffect(() => {
    if (activeAddon !== 'logistics-gps') return;
    setGpsProgress(0);

    const interval = setInterval(() => {
      setGpsProgress(prev => {
        if (prev >= 100) return 0; // reset
        return prev + 10;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [activeAddon]);

  // APM pulse
  useEffect(() => {
    if (activeAddon !== 'analytics-apm') return;

    const interval = setInterval(() => {
      setApmPulse(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeAddon]);

  const handleSubscribeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSubscribed(true);
    setTimeout(() => {
      setNewsletterSubscribed(false);
      setNewsletterEmail('');
    }, 4000);
  };

  return (
    <section className="w-full py-32 px-6 max-w-7xl mx-auto border-t border-card-border/50">
      
      {/* Header section */}
      <div className="text-center mb-24 relative">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 text-[10rem] md:text-[20rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
          FLOW
        </div>
        <h2 className="relative text-6xl md:text-8xl font-black mb-4 tracking-tighter text-nectar-forest dark:text-nectar-cream leading-none z-10">
          Contratación <span className="text-nectar-gold">Flexible</span>
        </h2>
        <p className="text-[10px] text-nectar-gold font-black uppercase tracking-[0.5em] relative z-10 mb-12">
          Sin plazos forzosos • Todo bajo tu control
        </p>
      </div>

      {/* Grid: 3 Steps On-Demand Tutorial */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32 relative z-10">
        {tutorialSteps.map((step, idx) => (
          <div 
            key={idx} 
            className="p-10 rounded-[2.5rem] border border-card-border bg-card-bg/60 dark:bg-card-bg/40 glass hover:-translate-y-2 transition-all duration-500 relative overflow-hidden group"
          >
            <div className="absolute top-6 right-8 text-5xl font-black text-nectar-gold/10 group-hover:text-nectar-gold/20 transition-all duration-500 select-none">
              {step.number}
            </div>
            <h3 className="text-xl font-black mb-4 tracking-tight text-foreground">{step.title}</h3>
            <p className="text-xs text-muted leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Simulator Section Header */}
      <div className="mb-16 text-center md:text-left">
        <h3 className="text-3xl font-black tracking-tight mb-2 text-foreground">
          Simulador en Tiempo Real
        </h3>
        <p className="text-xs text-muted">
          Haz clic en cualquier Add-on para ver la interfaz interactiva tal como la experimentarán tus clientes.
        </p>
      </div>

      {/* Interactive Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch relative z-10">
        
        {/* Left Column: Selector Menu */}
        <div className="lg:col-span-5 flex flex-col gap-4 justify-center">
          {addonsConfig.map((config) => (
            <button
              key={config.id}
              onClick={() => setActiveAddon(config.id)}
              className={`p-6 rounded-[2rem] border transition-all duration-500 text-left flex flex-col justify-between relative overflow-hidden group ${
                activeAddon === config.id
                  ? 'border-nectar-gold bg-card-bg shadow-[var(--shadow-premium)] scale-[1.02]'
                  : 'border-card-border bg-card-bg/30 hover:bg-card-bg/70 hover:scale-[1.01]'
              }`}
            >
              {/* Subtle Gold accent line for active addon */}
              {activeAddon === config.id && (
                <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-nectar-gold"></div>
              )}
              
              <div className="flex justify-between items-center mb-3">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                  activeAddon === config.id
                    ? 'text-nectar-gold bg-nectar-gold/5 border-nectar-gold/20'
                    : 'text-muted bg-foreground/5 border-transparent'
                }`}>
                  {config.badge}
                </span>
              </div>
              
              <h4 className="text-lg font-black tracking-tight mb-1 text-foreground">
                {config.name}
              </h4>
              <p className="text-[11px] text-muted leading-relaxed">
                {config.teaser}
              </p>
            </button>
          ))}
        </div>

        {/* Right Column: Visual Mockup Phone / Screen */}
        <div className="lg:col-span-7 flex items-center justify-center">
          <div className="w-full max-w-lg aspect-[9/16] sm:aspect-[4/5] rounded-[3.5rem] bg-[#020403] border-8 border-neutral-800 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            
            {/* Camera notch simulator */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-800 rounded-full z-20"></div>

            {/* Mobile Header screen */}
            <div className="border-b border-white/5 pb-4 mt-6 flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-nectar-gold"></div>
                <span className="text-[10px] font-black tracking-widest text-white uppercase">Portal Demo</span>
              </div>
              <span className="text-[9px] font-bold text-white/40">100% Personalizado</span>
            </div>

            {/* Main Interactive Screen Content */}
            <div className="flex-1 my-6 overflow-hidden flex flex-col justify-center items-center z-10 relative">
              
              {/* MOCK 1: Live Chat */}
              {activeAddon === 'live-chat' && (
                <div className="w-full h-full flex flex-col justify-end p-4 rounded-3xl bg-neutral-900/50 border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent -z-10"></div>
                  
                  {/* Chat bubbles */}
                  <div className="space-y-4 max-h-[85%] overflow-y-auto mb-2 pr-1 w-full flex flex-col">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-[1.5rem] max-w-[80%] text-xs leading-relaxed transition-all duration-500 animate-premium ${
                          msg.sender === 'client'
                            ? 'bg-neutral-800 text-white self-end rounded-br-none'
                            : 'bg-nectar-gold text-[#020403] font-semibold self-start rounded-bl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    ))}
                  </div>

                  {/* Input area mockup */}
                  <div className="flex gap-2 items-center bg-black/40 border border-white/5 p-2 rounded-2xl shrink-0">
                    <div className="flex-1 h-8 rounded-xl bg-white/5 px-3 flex items-center text-[10px] text-white/30">Escribe un mensaje...</div>
                    <div className="w-8 h-8 rounded-xl bg-nectar-gold flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-[#020403]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* MOCK 2: Booking & Signature */}
              {activeAddon === 'booking-signature' && (
                <div className="w-full h-full bg-neutral-900/30 border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-black tracking-tight text-white mb-1">Acuerdo de Adhesión</h5>
                    <p className="text-[10px] text-white/50 mb-4">Soporte Técnico Especializado Nivel II</p>
                    
                    {/* Calendar grid mock */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-6 bg-white/5 p-3 rounded-2xl">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                        <span key={i} className="text-[8px] font-bold text-white/30">{d}</span>
                      ))}
                      {Array.from({ length: 14 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-[9px] font-black p-1.5 rounded-lg ${
                            i === 9 ? 'bg-nectar-gold text-black' : 'text-white/60'
                          }`}
                        >
                          {i + 10}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Digital signature canvas mock */}
                  <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[110px]">
                    <span className="absolute top-2 left-3 text-[7px] font-black tracking-wider text-white/30 uppercase">Firma del Cliente</span>
                    
                    {signatureDone ? (
                      <div className="flex flex-col items-center animate-premium">
                        {/* Simulated Signature drawing */}
                        <svg className="w-36 h-12 text-nectar-gold" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                          <path d="M10 20 C 30 5, 40 25, 55 10 C 65 5, 75 25, 90 15 M 45 22 L 75 22" className="animate-[dash_2s_ease-in-out_forwards]" />
                        </svg>
                        <span className="text-[8px] font-bold text-emerald-400 mt-2 flex items-center gap-1">
                          ✓ Firmado digitalmente (Verificado SHA-256)
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        {/* Pulse loader indicator */}
                        <div className="w-5 h-5 rounded-full border-2 border-nectar-gold border-t-transparent animate-spin"></div>
                        <span className="text-[9px] text-white/40">Dibujando trazo seguro...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MOCK 3: Logistics & GPS */}
              {activeAddon === 'logistics-gps' && (
                <div className="w-full h-full bg-neutral-900/40 border border-white/5 rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden">
                  
                  {/* Grid visual background for map mock */}
                  <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}></div>

                  {/* Top GPS Status */}
                  <div className="bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/5 z-10 flex justify-between items-center">
                    <div>
                      <span className="text-[8px] text-white/50 block font-bold uppercase">Repartidor en Ruta</span>
                      <span className="text-[10px] font-black text-white">Ing. Luis Hernández</span>
                    </div>
                    <span className="text-xs font-black text-nectar-gold">ETA: 12 min</span>
                  </div>

                  {/* Simulated Map Route and moving pin */}
                  <div className="w-full h-32 relative border border-white/5 rounded-2xl bg-black/30 overflow-hidden my-4">
                    {/* Target location icon */}
                    <div className="absolute top-4 right-12 w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                    </div>
                    {/* Origin location icon */}
                    <div className="absolute bottom-6 left-12 w-3.5 h-3.5 rounded-full bg-nectar-gold/30 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-nectar-gold"></div>
                    </div>

                    {/* Dotted path */}
                    <svg className="absolute inset-0 w-full h-full text-white/20" fill="none">
                      <path d="M 48 102 Q 120 70, 196 20" stroke="currentColor" strokeWidth={2} strokeDasharray="4,4" />
                    </svg>

                    {/* Vehicle pin moving */}
                    <div 
                      className="absolute w-6 h-6 rounded-full bg-nectar-gold flex items-center justify-center shadow-lg transition-all duration-300 z-10"
                      style={{
                        bottom: `${24 + (78 - 24) * (gpsProgress / 100)}%`,
                        left: `${48 + (196 - 48) * (gpsProgress / 100) - 12}px`
                      }}
                    >
                      🛵
                    </div>
                  </div>

                  {/* Delivery Info Footer */}
                  <div className="bg-[#020403] p-4 rounded-2xl border border-white/5 z-10">
                    <div className="flex justify-between text-[10px] mb-2 font-bold">
                      <span className="text-white/60">Progreso del Envío</span>
                      <span className="text-nectar-gold">{gpsProgress}%</span>
                    </div>
                    {/* Progress bar wrapper */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-nectar-gold transition-all duration-300" style={{ width: `${gpsProgress}%` }}></div>
                    </div>
                  </div>

                </div>
              )}

              {/* MOCK 4: Patreon / Sponsorship */}
              {activeAddon === 'patreon-sponsorship' && (
                <div className="w-full h-full bg-neutral-900/30 border border-white/5 rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-black tracking-tight text-white mb-2">Feed Exclusivo de Miembros</h5>
                    
                    {/* VIP Post 1 (Unlocked) */}
                    <div className="bg-white/5 p-3 rounded-2xl mb-4 border border-white/5">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[7px] text-nectar-gold font-black uppercase tracking-wider">Publicación Abierta</span>
                        <span className="text-[7px] text-white/40">Hace 2 horas</span>
                      </div>
                      <p className="text-[10px] text-white leading-relaxed">Configuraciones API de inicio rápido para producción...</p>
                    </div>

                    {/* VIP Post 2 (Locked) */}
                    <div className="bg-white/5 p-4 rounded-2xl border border-dashed border-white/10 relative overflow-hidden select-none">
                      <div className="filter blur-[3px]">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[7px] text-red-400 font-bold uppercase tracking-wider">Premium Content</span>
                          <span className="text-[7px] text-white/40">Hace 1 día</span>
                        </div>
                        <p className="text-[10px] text-white">Este es un fragmento de código secreto altamente premium...</p>
                      </div>

                      {/* Overlaid Lock */}
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 animate-premium">
                        <span className="text-lg">🔒</span>
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">Nivel VIP Requerido</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Card selection */}
                  <div className="bg-black/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-white">Plan Néctar VIP</span>
                      <span className="text-nectar-gold">$129 MXN / mes</span>
                    </div>
                    <button className="w-full py-2.5 bg-nectar-gold text-black font-black uppercase text-[8px] tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5">
                      <span>💳</span> Desbloquear con Stripe
                    </button>
                  </div>
                </div>
              )}

              {/* MOCK 5: Analytics APM */}
              {activeAddon === 'analytics-apm' && (
                <div className="w-full h-full bg-neutral-900/30 border border-white/5 rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-black tracking-tight text-white mb-1">Métricas de Telemetría APM</h5>
                    <p className="text-[9px] text-white/40 mb-4">Dashboard de Desempeño Técnico</p>

                    {/* Speedometers grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* Query speed */}
                      <div className="bg-black/50 p-3 rounded-2xl border border-white/5 text-center">
                        <span className="text-[7px] text-white/40 block font-bold uppercase tracking-wider mb-1">SQL Query Time</span>
                        <span className="text-xl font-black text-emerald-400">
                          {0.003 + (apmPulse % 2 === 0 ? 0.001 : 0.002)}s
                        </span>
                        <span className="text-[8px] text-white/60 block mt-1">98.9% eficiencia</span>
                      </div>

                      {/* Core Web Vitals */}
                      <div className="bg-black/50 p-3 rounded-2xl border border-white/5 text-center">
                        <span className="text-[7px] text-white/40 block font-bold uppercase tracking-wider mb-1">LCP Speed Index</span>
                        <span className="text-xl font-black text-nectar-gold">1.25s</span>
                        <span className="text-[8px] text-emerald-400 block mt-1">Excelente (Verde)</span>
                      </div>
                    </div>
                  </div>

                  {/* CPU & Memory Charts */}
                  <div className="bg-black/50 p-4 rounded-2xl border border-white/5 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-[8px] font-bold text-white/50 mb-2 uppercase">
                      <span>Carga de Base de Datos</span>
                      <span className="text-nectar-gold">En vivo</span>
                    </div>

                    {/* Visual Bar chart mock */}
                    <div className="flex items-end justify-between h-20 gap-1 pt-2">
                      {[30, 45, 38, 52, 42, 60, 48, 55, 68, 50, 45].map((val, idx) => (
                        <div 
                          key={idx} 
                          className="w-full bg-nectar-gold/20 hover:bg-nectar-gold transition-all duration-300 rounded-t-sm"
                          style={{
                            height: `${idx === (apmPulse % 11) ? val + 15 : val}%`,
                            backgroundColor: idx === (apmPulse % 11) ? '#C68A1E' : undefined
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MOCK 6: Newsletter */}
              {activeAddon === 'newsletter' && (
                <div className="w-full h-full bg-neutral-900/30 border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                  <div className="text-center my-auto">
                    <span className="text-3xl block mb-4">
                      {newsletterSubscribed ? '✉️' : '📩'}
                    </span>
                    <h5 className="text-sm font-black tracking-tight text-white mb-2">Boletín Oficial</h5>
                    <p className="text-[10px] text-white/50 max-w-xs mx-auto leading-relaxed mb-6">
                      Suscríbete para recibir notificaciones inmediatas del estado de tus tickets y actualizaciones.
                    </p>

                    {newsletterSubscribed ? (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-premium">
                        <span className="text-xs font-bold text-emerald-400 block mb-1">¡Gracias por suscribirte!</span>
                        <p className="text-[9px] text-white/70">Enviamos un correo de confirmación de inmediato.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubscribeSubmit} className="space-y-3">
                        <input
                          type="email"
                          required
                          value={newsletterEmail}
                          onChange={(e) => setNewsletterEmail(e.target.value)}
                          placeholder="tu-correo@empresa.com"
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl text-[10px] text-center focus:outline-none focus:border-nectar-gold transition-all"
                        />
                        <button 
                          type="submit" 
                          className="w-full py-3 bg-nectar-gold text-black font-black uppercase text-[8px] tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          Suscribirse
                        </button>
                      </form>
                    )}
                  </div>

                  <span className="text-[8px] text-white/20 uppercase tracking-widest text-center">Inscripción en un click</span>
                </div>
              )}

            </div>

            {/* Simulated home button area */}
            <div className="border-t border-white/5 pt-4 shrink-0 flex justify-center z-10">
              <div className="w-24 h-1 bg-white/20 rounded-full"></div>
            </div>
            
          </div>
        </div>

      </div>

    </section>
  );
}
