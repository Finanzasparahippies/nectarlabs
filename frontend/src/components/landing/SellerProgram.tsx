'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const commissionTiers = [
  {
    month: 'Mes 1',
    pct: '10%',
    label: 'Abono Inicial',
    color: 'from-nectar-gold to-yellow-300',
    glow: 'bg-nectar-gold/20',
    desc: 'Primer pago del cliente — recompensa tu primer cierre.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    month: 'Mes 2',
    pct: '5%',
    label: 'Segundo Ciclo',
    color: 'from-amber-400 to-orange-300',
    glow: 'bg-amber-400/15',
    desc: 'Tu cliente sigue activo — tú sigues ganando.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    month: 'Mes 3+',
    pct: '2%',
    label: 'Residual Permanente',
    color: 'from-nectar-forest to-emerald-400',
    glow: 'bg-nectar-forest/15',
    desc: 'Ingresos pasivos mientras el cliente permanezca activo.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
];

const steps = [
  {
    number: '01',
    title: 'Regístrate',
    desc: 'Crea tu cuenta gratuita en Néctar Labs y solicita el rol de Vendedor.',
    color: 'text-nectar-gold',
  },
  {
    number: '02',
    title: 'Agenda tu Reunión',
    desc: 'Reserva una sesión previa con Néctar Labs para la validación y aprobación de tu perfil.',
    color: 'text-amber-400',
  },
  {
    number: '03',
    title: 'Obtén tu Código',
    desc: 'Tras la aprobación del Administrador/CEO, recibirás tu código de referido exclusivo.',
    color: 'text-emerald-400',
  },
  {
    number: '04',
    title: 'Comparte y Gana',
    desc: 'Cada vez que tu referido pague su mensualidad, recibes tu comisión automáticamente.',
    color: 'text-nectar-gold',
  },
];

const benefits = [
  { icon: '🚫', title: 'Sin Inversión', desc: 'No requiere capital inicial ni inventario.' },
  { icon: '🌐', title: '100% Remoto', desc: 'Trabaja desde cualquier lugar, a tu ritmo.' },
  { icon: '♾️', title: 'Sin Límite de Clientes', desc: 'Agrega cuantos referidos quieras a tu portafolio.' },
  { icon: '📊', title: 'Dashboard en Tiempo Real', desc: 'Monitorea tus comisiones y clientes al instante.' },
  { icon: '🔒', title: 'Transparencia Total', desc: 'Cada pago registrado, trazable y verificable.' },
  { icon: '📅', title: 'Ingresos Recurrentes', desc: 'Comisiones del 2% de por vida mientras el cliente pague.' },
];

export default function SellerProgram() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="seller-program"
      ref={sectionRef}
      className="w-full py-32 px-6 relative overflow-hidden scroll-mt-24"
    >
      {/* Rich ambient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-nectar-gold/[0.03] to-transparent pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] bg-nectar-gold/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)', backgroundSize: '48px 48px' }} />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* ── HERO HEADER ── */}
        <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-block px-8 py-3 mb-8 text-[9px] font-black tracking-[0.6em] text-nectar-gold uppercase border border-nectar-gold/25 rounded-full bg-nectar-gold/5 backdrop-blur-sm">
            ✦ Programa de Afiliados Néctar Labs ✦
          </span>
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.85] mb-8 text-foreground">
            Únete a{' '}
            <span className="relative inline-block">
              <span className="text-nectar-gold italic">Néctar Labs</span>
              <span className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nectar-gold/60 to-transparent" />
            </span>
            {' '}y Gana
          </h2>
          <p className="text-lg md:text-2xl text-foreground/60 max-w-3xl mx-auto leading-relaxed font-medium">
            Refiere clientes a nuestro ecosistema de Software Artesanal y genera{' '}
            <strong className="text-foreground">comisiones recurrentes de por vida</strong>{' '}
            sin límite de clientes, sin inversión, sin techos.
          </p>
        </div>

        {/* ── COMMISSION TIERS ── */}
        <div className={`mb-24 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-12">
            <h3 className="text-xs font-black uppercase tracking-[0.5em] text-foreground/40 mb-2">Estructura de Comisiones</h3>
            <p className="text-sm text-foreground/50 max-w-xl mx-auto">Por cada mensualidad que pague tu cliente referido, recibes un porcentaje escalonado.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {commissionTiers.map((tier, i) => (
              <div
                key={tier.month}
                className={`relative group p-8 rounded-[2.5rem] border border-card-border bg-card-bg overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:border-nectar-gold/30 hover:shadow-2xl hover:shadow-nectar-gold/10`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Ambient glow */}
                <div className={`absolute top-0 right-0 w-48 h-48 ${tier.glow} rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700`} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">{tier.month}</span>
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${tier.color} text-background flex items-center justify-center shadow-lg`}>
                      {tier.icon}
                    </div>
                  </div>

                  <div className={`text-6xl md:text-7xl font-black tracking-tighter bg-gradient-to-r ${tier.color} bg-clip-text text-transparent mb-2 font-mono`}>
                    {tier.pct}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-4">{tier.label}</p>
                  <p className="text-xs text-foreground/60 leading-relaxed">{tier.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-5 rounded-2xl bg-foreground/[0.03] border border-card-border/50 flex items-start gap-4 max-w-3xl mx-auto">
            <span className="text-nectar-gold text-lg shrink-0 mt-0.5">ℹ️</span>
            <p className="text-[10px] text-foreground/50 leading-relaxed font-medium">
              <strong className="text-foreground/70">Nota:</strong> La comisión se genera automáticamente con cada pago confirmado del cliente referido.
              Para activar tu rol de vendedor es mandatorio agendar una sesión previa con Néctar Labs.
              Este es el único beneficio para vendedores en esta modalidad — sin seguros ni prestaciones adicionales.
              La comisión del 2% es permanente mientras el cliente mantenga un plan de soporte activo.
            </p>
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className={`mb-24 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-14">
            <h3 className="text-xs font-black uppercase tracking-[0.5em] text-foreground/40 mb-2">Cómo Funciona</h3>
            <p className="text-2xl md:text-4xl font-black tracking-tight text-foreground">4 pasos para empezar a ganar</p>
          </div>
          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-nectar-gold/20 to-transparent" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <div key={step.number} className="relative flex flex-col items-center text-center group">
                  <div className={`relative w-16 h-16 rounded-full border-2 border-card-border bg-card-bg flex items-center justify-center mb-6 group-hover:border-nectar-gold/50 transition-all duration-300 z-10`}>
                    <span className={`font-black text-xl font-mono ${step.color}`}>{step.number}</span>
                  </div>
                  <h4 className="font-black text-base mb-2 text-foreground">{step.title}</h4>
                  <p className="text-xs text-foreground/50 leading-relaxed max-w-[180px]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BENEFITS GRID ── */}
        <div className={`mb-24 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-12">
            <h3 className="text-xs font-black uppercase tracking-[0.5em] text-foreground/40 mb-2">Por Qué Elegir Este Programa</h3>
            <p className="text-2xl md:text-4xl font-black tracking-tight text-foreground">Sin riesgos. <span className="text-nectar-gold italic">Sin límites.</span></p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <div
                key={b.title}
                className="group p-7 rounded-[2rem] bg-card-bg border border-card-border hover:border-nectar-gold/25 transition-all duration-300 hover:shadow-xl hover:shadow-nectar-gold/5 flex items-start gap-5"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="w-11 h-11 rounded-2xl bg-nectar-gold/8 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {b.icon}
                </div>
                <div>
                  <h4 className="font-black text-sm text-foreground mb-1">{b.title}</h4>
                  <p className="text-[11px] text-foreground/50 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── EXAMPLE EARNING CALCULATOR ── */}
        <div className={`mb-24 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="p-10 md:p-14 rounded-[3rem] bg-card-bg border border-card-border relative overflow-hidden">
            <div className="absolute top-0 left-0 w-72 h-72 bg-nectar-gold/8 rounded-full blur-3xl -ml-24 -mt-24" />
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-nectar-forest/8 rounded-full blur-3xl -mr-24 -mb-24" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block px-4 py-1.5 mb-6 text-[9px] font-black tracking-[0.4em] text-nectar-gold uppercase border border-nectar-gold/20 rounded-full bg-nectar-gold/5">
                  Ejemplo Real de Ganancias
                </span>
                <h3 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight mb-4 text-foreground">
                  1 cliente = hasta{' '}
                  <span className="text-nectar-gold italic">$2,300 MXN</span>
                  {' '}en 6 meses
                </h3>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  Con un plan mensual de $10,000 MXN y un cliente referido activo durante 6 meses, esto es lo que ganarías automáticamente:
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Mes 1 (10%)', amount: '$1,000.00', highlight: true },
                  { label: 'Mes 2 (5%)', amount: '$500.00', highlight: false },
                  { label: 'Mes 3 (2%)', amount: '$200.00', highlight: false },
                  { label: 'Mes 4 (2%)', amount: '$200.00', highlight: false },
                  { label: 'Mes 5 (2%)', amount: '$200.00', highlight: false },
                  { label: 'Mes 6 (2%)', amount: '$200.00', highlight: false },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center p-4 rounded-2xl transition-all ${
                      row.highlight
                        ? 'bg-nectar-gold/10 border border-nectar-gold/30'
                        : 'bg-foreground/[0.03] border border-card-border/50'
                    }`}
                  >
                    <span className={`text-[11px] font-black uppercase tracking-wider ${row.highlight ? 'text-nectar-gold' : 'text-foreground/60'}`}>
                      {row.label}
                    </span>
                    <span className={`font-mono font-black text-sm ${row.highlight ? 'text-nectar-gold' : 'text-foreground/80'}`}>
                      {row.amount} <span className="text-[9px] font-bold opacity-50">MXN</span>
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-4 rounded-2xl bg-nectar-gold text-background mt-2">
                  <span className="text-[11px] font-black uppercase tracking-wider">Total 6 Meses</span>
                  <span className="font-mono font-black text-base">$2,300.00 <span className="text-[9px] opacity-70">MXN</span></span>
                </div>
                <p className="text-[9px] text-foreground/40 leading-relaxed px-1">
                  * Basado en plan de $10,000 MXN/mes. El ingreso residual del 2% continúa indefinidamente después del mes 3.
                  Con 5 clientes activos, el residual mensual sería de $1,000 MXN automatizados.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── FINAL CTA ── */}
        <div className={`text-center transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex flex-col items-center">
            <div className="w-px h-16 bg-gradient-to-b from-transparent to-nectar-gold/40 mb-8" />
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-foreground/30 mb-6">
              Empieza hoy — es gratis
            </span>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Link
                href="/register"
                id="seller-cta-register"
                className="group relative px-14 py-6 bg-nectar-gold text-background font-black uppercase tracking-widest text-sm rounded-[2rem] hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl shadow-nectar-gold/30 overflow-hidden"
              >
                <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
                <span className="relative">Unirse al Programa →</span>
              </Link>
              <a
                href="#pricing"
                className="px-10 py-6 border-2 border-card-border text-foreground/60 font-black uppercase tracking-widest text-sm rounded-[2rem] hover:border-nectar-gold/40 hover:text-foreground transition-all duration-300"
              >
                Ver Planes Primero
              </a>
            </div>
            <p className="mt-6 text-[10px] text-foreground/30 font-bold uppercase tracking-widest max-w-sm">
              Sin contratos de exclusividad • Sin mínimos de venta • Cancelación libre
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
