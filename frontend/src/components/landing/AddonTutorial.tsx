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
    <section className="w-full py-16 sm:py-32 px-6 max-w-7xl mx-auto border-t border-card-border/50">
      
      {/* Header section */}
      <div className="text-center mb-16 sm:mb-24 relative">
        <div className="absolute -top-16 sm:-top-32 md:-top-40 left-1/2 -translate-x-1/2 text-[4.5rem] sm:text-[10rem] md:text-[16rem] lg:text-[20rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
          FLOW
        </div>
        <h2 className="relative text-3xl sm:text-5xl md:text-8xl font-black mb-4 tracking-tighter text-nectar-forest dark:text-nectar-cream leading-none z-10">
          Contratación <span className="text-nectar-gold">Flexible</span>
        </h2>
        <p className="text-[10px] text-nectar-gold font-black uppercase tracking-[0.5em] relative z-10 mb-6 sm:mb-12">
          Sin plazos forzosos • Todo bajo tu control
        </p>
      </div>

      {/* Grid: 3 Steps On-Demand Tutorial */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-32 relative z-10">
        {tutorialSteps.map((step, idx) => (
          <div 
            key={idx} 
            className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-card-border bg-card-bg/60 dark:bg-card-bg/40 glass hover:-translate-y-2 transition-all duration-500 relative overflow-hidden group"
          >
            <div className="absolute top-4 right-6 sm:top-6 sm:right-8 text-4xl sm:text-5xl font-black text-nectar-gold/10 group-hover:text-nectar-gold/20 transition-all duration-500 select-none">
              {step.number}
            </div>
            <h3 className="text-lg sm:text-xl font-black mb-4 tracking-tight text-foreground">{step.title}</h3>
            <p className="text-xs text-muted leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Simulator Section Header */}
      <div className="mb-10 sm:mb-16 text-center md:text-left">
        <h3 className="text-xl sm:text-3xl font-black tracking-tight mb-2 text-foreground">
          Simulador en Tiempo Real
        </h3>
        <p className="text-xs text-muted">
          Haz clic en cualquier Add-on para ver la interfaz interactiva tal como la experimentarán tus clientes.
        </p>
      </div>

      {/* Interactive Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-stretch relative z-10">
        
        {/* Left Column: Selector Menu */}
        <div className="lg:col-span-5 flex flex-col gap-3 sm:gap-4 justify-center">
          {addonsConfig.map((config) => (
            <button
              key={config.id}
              onClick={() => setActiveAddon(config.id)}
              className={`p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border transition-all duration-500 text-left flex flex-col justify-between relative overflow-hidden group ${
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
              
              <h4 className="text-base sm:text-lg font-black tracking-tight mb-1 text-foreground">
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
          <div className="w-full max-w-lg aspect-[9/16] rounded-[2.5rem] sm:rounded-[3.5rem] bg-[#020403] border-[6px] sm:border-[10px] border-neutral-800 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            
            {/* Dynamic Status Bar (Signal, Wifi, Time, Battery) */}
            <div className="absolute top-2 left-0 right-0 px-8 flex justify-between items-center z-20 text-[9px] text-white/40 font-bold select-none">
              <span>15:53</span>
              <div className="flex items-center gap-1.5">
                <span>📶</span>
                <span>📶</span>
                <span>🔋 98%</span>
              </div>
            </div>

            {/* Camera notch simulator */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-neutral-800 rounded-full z-30"></div>

            {/* Mobile Header / Tenant Logo Bar */}
            <div className="border-b border-white/10 pb-3.5 mt-5 flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-2.5">
                {/* Tenant Logo Placeholder */}
                <div className="w-7 h-7 rounded-[10px] bg-gradient-to-tr from-nectar-gold to-nectar-forest p-[1.5px] flex items-center justify-center shadow-lg">
                  <div className="w-full h-full bg-[#121815] rounded-[8.5px] flex items-center justify-center text-[9px] font-black text-nectar-gold">
                    NL
                  </div>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black tracking-tight text-white leading-none">Néctar Partner</span>
                  <span className="text-[7.5px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    demo-tenant.nectarlabs.dev
                  </span>
                </div>
              </div>
              <span className="text-[7.5px] font-black uppercase tracking-widest text-nectar-gold/60 border border-nectar-gold/20 px-2.5 py-0.5 rounded-full bg-nectar-gold/5">
                Add-on Demo
              </span>
            </div>

            {/* Main Interactive Screen Content */}
            <div className="flex-1 my-4 overflow-hidden flex flex-col justify-center items-center z-10 relative">
              
              {/* MOCK 1: Live Chat */}
              {activeAddon === 'live-chat' && (
                <div className="w-full h-full flex flex-col justify-end p-3 rounded-2xl bg-neutral-900/50 border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent -z-10"></div>
                  
                  {/* Agent Header in Chat */}
                  <div className="absolute top-0 left-0 right-0 bg-[#121815]/95 backdrop-blur-md p-2.5 border-b border-white/5 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-nectar-gold/20 border border-nectar-gold/40 flex items-center justify-center text-xs">
                        👨‍💻
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-black text-white leading-none">Ing. Gutiérrez</span>
                        <span className="text-[7px] text-white/40 mt-0.5">Soporte Técnico Especializado</span>
                      </div>
                    </div>
                    <span className="text-[6.5px] font-black text-emerald-400 flex items-center gap-1">
                      ● Activo
                    </span>
                  </div>

                  {/* Chat bubbles */}
                  <div className="space-y-3.5 max-h-[70%] overflow-y-auto mb-2 pr-1 w-full flex flex-col pt-12">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-[1.2rem] max-w-[85%] text-[9.5px] leading-relaxed transition-all duration-500 animate-premium ${
                          msg.sender === 'client'
                            ? 'bg-neutral-800 text-white self-end rounded-br-none'
                            : 'bg-nectar-gold text-[#020403] font-black self-start rounded-bl-none shadow-md shadow-nectar-gold/10'
                        }`}
                      >
                        {msg.text}
                      </div>
                    ))}
                  </div>

                  {/* Route marker */}
                  <div className="text-[6.5px] text-white/20 text-center mb-2 font-bold tracking-wider uppercase select-none">
                    Mensajería canalizada vía SMTP (Brevo)
                  </div>

                  {/* Input area mockup */}
                  <div className="flex gap-2 items-center bg-black/40 border border-white/5 p-1.5 rounded-xl shrink-0">
                    <div className="flex-1 h-7 rounded-lg bg-white/5 px-2.5 flex items-center text-[9px] text-white/30 text-left">
                      Escribe un mensaje...
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-nectar-gold flex items-center justify-center shrink-0 shadow-lg shadow-nectar-gold/20">
                      <svg className="w-3.5 h-3.5 text-[#020403]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* MOCK 2: Booking & Signature */}
              {activeAddon === 'booking-signature' && (
                <div className="w-full h-full bg-neutral-900/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto">
                  <div className="text-left">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="text-[11px] font-black tracking-tight text-white">Acuerdo de Adhesión N° 402</h5>
                        <p className="text-[8px] text-white/50">Consultoría e Ingeniería Nivel II</p>
                      </div>
                      <span className="text-[6.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-nectar-gold/30 text-nectar-gold bg-nectar-gold/5">
                        Por Firmar
                      </span>
                    </div>

                    {/* Compact Contract Box */}
                    <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-[7px] text-white/60 leading-relaxed mb-3">
                      <span className="font-bold text-nectar-gold uppercase block mb-0.5">Cláusula 4.1 - Soporte de Add-ons:</span>
                      El suscriptor acepta los términos y condiciones de contratación flexible mes a mes bajo infraestructura Néctar Labs.
                    </div>
                    
                    {/* Calendar grid mock */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-3 bg-black/30 p-2.5 rounded-xl border border-white/5">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                        <span key={i} className="text-[7.5px] font-bold text-white/20">{d}</span>
                      ))}
                      {Array.from({ length: 14 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-[8.5px] font-black p-1 rounded-md flex items-center justify-center ${
                            i === 9 ? 'bg-nectar-gold text-black shadow-lg shadow-nectar-gold/25' : 'text-white/60'
                          }`}
                        >
                          {i + 10}
                        </span>
                      ))}
                    </div>

                    {/* Time slot picker */}
                    <div className="flex gap-2 justify-center mb-3">
                      <span className="text-[7.5px] font-bold px-2 py-1 bg-white/5 text-white/40 rounded-lg">09:00 AM</span>
                      <span className="text-[7.5px] font-black px-2 py-1 bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/20 rounded-lg flex items-center gap-1">
                        15:00 PM <span className="text-emerald-400">✓</span>
                      </span>
                    </div>
                  </div>

                  {/* Digital signature canvas mock */}
                  <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center relative min-h-[90px] mt-auto">
                    <span className="absolute top-1.5 left-2 text-[6.5px] font-black tracking-wider text-white/30 uppercase">Firma Digital del Cliente</span>
                    
                    {signatureDone ? (
                      <div className="flex flex-col items-center animate-premium">
                        {/* Simulated Signature drawing */}
                        <svg className="w-28 h-10 text-nectar-gold" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                          <path d="M10 20 C 30 5, 40 25, 55 10 C 65 5, 75 25, 90 15 M 45 22 L 75 22" className="animate-[dash_2s_ease-in-out_forwards]" />
                        </svg>
                        <span className="text-[6.5px] font-bold text-emerald-400 mt-1 flex items-center gap-0.5 leading-none">
                          ✓ SHA-256: 8a4b2c... • IP: 187.42.102.5
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        {/* Pulse loader indicator */}
                        <div className="w-4 h-4 rounded-full border border-nectar-gold border-t-transparent animate-spin"></div>
                        <span className="text-[7.5px] text-white/40 font-semibold">Dibujando firma biométrica segura...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MOCK 3: Logistics & GPS */}
              {activeAddon === 'logistics-gps' && (
                <div className="w-full h-full bg-neutral-900/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden text-left">
                  
                  {/* Grid visual background for map mock */}
                  <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '15px 15px'
                  }}></div>

                  {/* Top GPS Status */}
                  <div className="bg-[#121815]/90 backdrop-blur-md p-2.5 rounded-xl border border-white/5 z-10 flex justify-between items-center shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-nectar-gold/20 flex items-center justify-center text-xs">
                        🛵
                      </div>
                      <div>
                        <span className="text-[7px] text-white/50 block font-bold uppercase leading-none">Repartidor en Ruta</span>
                        <span className="text-[9px] font-black text-white">Luis Hernández</span>
                        <span className="text-[6.5px] text-emerald-400 block font-semibold">Moto Honda • Placas SON-2940</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-nectar-gold block">ETA: 12 min</span>
                      <span className="text-[6.5px] text-white/40 block">Dist: 1.8 km</span>
                    </div>
                  </div>

                  {/* Simulated Map Route and moving pin */}
                  <div className="w-full h-24 relative border border-white/5 rounded-xl bg-black/40 overflow-hidden my-3">
                    
                    {/* Origin location icon (Néctar Hub) */}
                    <div className="absolute bottom-4 left-6 flex flex-col items-center z-10">
                      <div className="w-5 h-5 rounded-full bg-nectar-forest border border-nectar-gold/30 flex items-center justify-center text-[9px] shadow-lg">
                        🏢
                      </div>
                      <span className="text-[5.5px] text-white/50 font-black uppercase mt-0.5 tracking-wider bg-black/40 px-1 rounded">Origen</span>
                    </div>

                    {/* Dotted path */}
                    <svg className="absolute inset-0 w-full h-full text-nectar-gold/30" fill="none">
                      <path d="M 28 72 Q 80 50, 120 70 T 212 28" stroke="currentColor" strokeWidth={2} strokeDasharray="3,3" />
                    </svg>

                    {/* Vehicle pin moving */}
                    <div 
                      className="absolute w-5 h-5 rounded-full bg-nectar-gold flex items-center justify-center shadow-lg transition-all duration-300 z-10 border border-[#020403]"
                      style={{
                        bottom: `${28 + (68 - 28) * (gpsProgress / 100)}%`,
                        left: `${24 + (212 - 24) * (gpsProgress / 100) - 10}px`
                      }}
                    >
                      <span className="text-[9px]">🛵</span>
                    </div>

                    {/* Target location icon (Destination 🏠) */}
                    <div className="absolute top-2 right-6 flex flex-col items-center z-10">
                      <div className="w-5 h-5 rounded-full bg-red-950/80 border border-red-500/40 flex items-center justify-center text-[9px] shadow-lg animate-pulse">
                        🏠
                      </div>
                      <span className="text-[5.5px] text-red-400 font-black uppercase mt-0.5 tracking-wider bg-black/40 px-1 rounded">Entrega</span>
                    </div>

                  </div>

                  {/* Delivery Info Footer */}
                  <div className="bg-[#020403]/90 backdrop-blur-md p-3 rounded-xl border border-white/5 z-10 space-y-2">
                    <div className="flex justify-between items-center text-[7.5px] font-bold">
                      <span className="text-white/60">Orden: <strong className="text-white">#NL-48902</strong></span>
                      <span className="text-nectar-gold">Progreso: {gpsProgress}%</span>
                    </div>
                    
                    {/* Progress bar wrapper */}
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-nectar-gold transition-all duration-300" style={{ width: `${gpsProgress}%` }}></div>
                    </div>

                    {/* Relevant addresses */}
                    <div className="grid grid-cols-2 gap-2 text-[6.5px] text-white/40 pt-1 border-t border-white/5 font-semibold">
                      <div>
                        <span className="text-nectar-gold block text-[5px] uppercase tracking-wider">De:</span>
                        Néctar Hub Central
                      </div>
                      <div>
                        <span className="text-red-400 block text-[5px] uppercase tracking-wider">Para:</span>
                        Av. Paseo del Río #312
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MOCK 4: Patreon / Sponsorship */}
              {activeAddon === 'patreon-sponsorship' && (
                <div className="w-full h-full bg-neutral-900/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between text-left overflow-y-auto">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="text-[10px] font-black tracking-tight text-white">Suscripción VIP & Feed Privado</h5>
                      <span className="text-[6.5px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Conectado a Stripe
                      </span>
                    </div>
                    
                    {/* VIP Post 1 (Unlocked) */}
                    <div className="bg-white/5 p-2.5 rounded-xl mb-3 border border-white/5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[6.5px] text-nectar-gold font-black uppercase tracking-wider">Artículo Público</span>
                        <span className="text-[6.5px] text-white/30 font-bold">Hace 2 horas</span>
                      </div>
                      <p className="text-[9px] text-white leading-relaxed font-bold">Guía de Inicio: Configurando tu DNS Staging</p>
                      <p className="text-[8px] text-white/50 mt-0.5 leading-relaxed">Paso a paso para configurar los registros A y TXT de tus subdominios en Cloudflare.</p>
                    </div>

                    {/* VIP Post 2 (Locked) */}
                    <div className="bg-white/5 p-3 rounded-xl border border-dashed border-white/10 relative overflow-hidden select-none mb-3">
                      <div className="filter blur-[2.5px] opacity-40">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[6.5px] text-red-400 font-bold uppercase tracking-wider">Contenido Platino</span>
                          <span className="text-[6.5px] text-white/30">Hace 1 día</span>
                        </div>
                        <p className="text-[9px] text-white font-bold">Patrón de Middleware Exclusivo para Multi-tenant</p>
                        <p className="text-[8px] text-white">Código listo para copiar y pegar de la arquitectura del middleware...</p>
                      </div>

                      {/* Overlaid Lock */}
                      <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1 animate-premium">
                        <span className="text-base">🔒</span>
                        <span className="text-[7.5px] font-black text-nectar-gold uppercase tracking-widest leading-none">Miembros Premium</span>
                        <span className="text-[6px] text-white/40">Desbloquea el Nivel Platino</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Card selection */}
                  <div className="bg-black/60 p-3 rounded-xl border border-white/5 flex flex-col gap-2.5 mt-auto">
                    <div className="flex justify-between items-center text-[9px] font-black">
                      <span className="text-white">Acceso Total Platino</span>
                      <span className="text-nectar-gold">$129 MXN / mes</span>
                    </div>
                    <button className="w-full py-2 bg-nectar-gold text-black font-black uppercase text-[7.5px] tracking-widest rounded-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1 shadow-lg shadow-nectar-gold/25">
                      <span>💳</span> Suscribirse con Stripe
                    </button>
                    <span className="text-[6px] text-white/30 text-center uppercase tracking-wider block leading-none">
                      Cobro recurrente mensual • Cancela en 1-click
                    </span>
                  </div>
                </div>
              )}

              {/* MOCK 5: Analytics APM */}
              {activeAddon === 'analytics-apm' && (
                <div className="w-full h-full bg-neutral-900/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between text-left overflow-y-auto">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h5 className="text-[10px] font-black tracking-tight text-white">Métricas de Telemetría APM</h5>
                      <span className="text-[6.5px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ● EN VIVO
                      </span>
                    </div>
                    <p className="text-[8px] text-white/40 mb-3">Monitor de Consultas y Web Vitals en producción</p>

                    {/* Speedometers grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* Query speed */}
                      <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 text-center flex flex-col justify-center">
                        <span className="text-[6.5px] text-white/40 font-black uppercase tracking-wider mb-0.5">Database Query Time</span>
                        <span className="text-base font-black text-emerald-400 leading-none">
                          {0.003 + (apmPulse % 2 === 0 ? 0.001 : 0.002)}s
                        </span>
                        <code className="text-[5.5px] text-white/50 block mt-1 leading-none font-mono">
                          SELECT 1 FROM tenant...
                        </code>
                      </div>

                      {/* Core Web Vitals */}
                      <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 text-center flex flex-col justify-center">
                        <span className="text-[6.5px] text-white/40 font-black uppercase tracking-wider mb-0.5">LCP Speed Index</span>
                        <span className="text-base font-black text-nectar-gold leading-none">1.24s</span>
                        <span className="text-[6px] text-emerald-400 font-bold block mt-1 leading-none">Optimizada (Verde)</span>
                      </div>
                    </div>
                  </div>

                  {/* CPU & Memory Charts */}
                  <div className="bg-black/50 p-3 rounded-xl border border-white/5 flex-1 flex flex-col justify-between min-h-[90px]">
                    <div className="flex justify-between items-center text-[7px] font-black text-white/50 mb-1.5 uppercase tracking-wider">
                      <span>Carga Base de Datos (Consultas/seg)</span>
                      <span className="text-nectar-gold font-mono">Telemetry</span>
                    </div>

                    {/* Visual Bar chart mock */}
                    <div className="flex items-end justify-between h-14 gap-1.5 pt-1.5">
                      {[25, 45, 38, 52, 42, 60, 48, 55, 68, 50, 45, 58, 35].map((val, idx) => (
                        <div 
                          key={idx} 
                          className="w-full bg-nectar-gold/15 hover:bg-nectar-gold transition-all duration-300 rounded-t-sm"
                          style={{
                            height: `${idx === (apmPulse % 13) ? val + 20 : val}%`,
                            backgroundColor: idx === (apmPulse % 13) ? '#C68A1E' : undefined
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MOCK 6: Newsletter */}
              {activeAddon === 'newsletter' && (
                <div className="w-full h-full bg-neutral-900/30 border border-white/5 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden text-center">
                  <div className="my-auto space-y-4">
                    <div className="w-10 h-10 rounded-full bg-nectar-gold/10 border border-nectar-gold/30 flex items-center justify-center mx-auto shadow-lg">
                      <span className="text-lg">
                        {newsletterSubscribed ? '✉️' : '📩'}
                      </span>
                    </div>
                    <div>
                      <h5 className="text-xs font-black tracking-tight text-white mb-1.5">Boletín Técnico Semanal</h5>
                      <p className="text-[8.5px] text-white/50 max-w-[200px] mx-auto leading-relaxed">
                        Entérate antes que nadie de nuevas APIs, parches de seguridad y releases del sistema.
                      </p>
                    </div>

                    {newsletterSubscribed ? (
                      <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-premium text-center">
                        <span className="text-[10px] font-black text-emerald-400 block mb-0.5">✓ Registro Exitoso</span>
                        <p className="text-[7.5px] text-white/60 leading-normal">
                          Conexión Brevo SMTP activa. Verifica tu correo de bienvenida.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubscribeSubmit} className="space-y-2.5 max-w-[220px] mx-auto">
                        <input
                          type="email"
                          required
                          value={newsletterEmail}
                          onChange={(e) => setNewsletterEmail(e.target.value)}
                          placeholder="tu-correo@empresa.com"
                          className="w-full px-3 py-2 bg-black/60 border border-white/10 text-white rounded-lg text-[9px] text-center focus:outline-none focus:border-nectar-gold transition-all placeholder-white/20"
                        />
                        <button 
                          type="submit" 
                          className="w-full py-2 bg-nectar-gold text-black font-black uppercase text-[7.5px] tracking-widest rounded-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-nectar-gold/25"
                        >
                          Unirme al Boletín
                        </button>
                      </form>
                    )}
                  </div>

                  <span className="text-[6.5px] text-white/20 uppercase tracking-widest text-center select-none font-bold block mt-4">
                    Suscripción canalizada vía SMTP / Amazon SES
                  </span>
                </div>
              )}

            </div>

            {/* Tenant Footer Placeholder */}
            <div className="border-t border-white/5 pt-2.5 pb-1 shrink-0 flex justify-between items-center z-10 text-[7px] text-white/30 uppercase tracking-widest font-black select-none">
              <span>© 2026 Partner Corp</span>
              <span>Soporte • Privacidad • Términos</span>
            </div>

            {/* Simulated home button area */}
            <div className="shrink-0 flex justify-center z-10">
              <div className="w-20 h-1 bg-white/20 rounded-full"></div>
            </div>
            
          </div>
        </div>

      </div>

    </section>
  );
}
