'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetcher } from '../../lib/api';

interface Plan {
  id: number;
  name: string;
  price: string;
  hours: number;
  description: string;
  is_recommended: boolean;
}

const fallbackPlans: Plan[] = [
  {
    id: 1,
    name: "Plan Básico",
    price: "2999.00",
    hours: 0,
    description: "Contrato a 6 meses. Acceso completo a todos los add-ons utilizables dentro de las plantillas oficiales de Nectar Labs. Personalización autónoma mediante herramientas nativas.",
    is_recommended: false
  },
  {
    id: 2,
    name: "Plan Mid",
    price: "3499.00",
    hours: 0,
    description: "Contrato a 6 meses. Soporte para todos los add-ons personalizados a la marca del cliente. Restringido exclusivamente al uso y customización de plantillas oficiales.",
    is_recommended: false
  },
  {
    id: 3,
    name: "Plan Premium",
    price: "3999.00",
    hours: 12,
    description: "Contrato a 6 meses. 12 horas dedicadas de ingeniería mensual. Personalización total de marca y creación de funcionalidades a medida desde cero o sobre plantillas.",
    is_recommended: true
  }
];

import { useLandingData } from '../../context/LandingDataContext';

export default function SubscriptionCards() {
  const { plans: contextPlans, loading: contextLoading } = useLandingData();
  const plans = contextPlans && contextPlans.length > 0 ? contextPlans : fallbackPlans;
  const loading = contextLoading;


  const getPlanBullets = (plan: Plan) => {
    const name = (plan.name || '').toLowerCase();
    if (name.includes('premium')) {
      return [
        { icon: '⚡', text: '12 Horas de desarrollo dedicado al mes' },
        { icon: '🛠️', text: 'Desarrollo a medida desde cero o sobre plantillas' },
        { icon: '🎨', text: 'Personalización completa adaptada a tu marca' },
        { icon: '🧩', text: 'Acceso total a todos los Add-ons Nectar Labs' },
        { icon: '☁️', text: 'Hosting, mantenimiento e infraestructura cloud' },
      ];
    } else if (name.includes('mid')) {
      return [
        { icon: '🎨', text: 'Personalización de add-ons adaptada a tu marca' },
        { icon: '📐', text: 'Uso y customización visual de plantillas oficiales' },
        { icon: '🚫', text: 'Sin desarrollo a medida desde cero' },
        { icon: '🧩', text: 'Soporte completo para catálogo de Add-ons' },
        { icon: '☁️', text: 'Hosting y mantenimiento de la plataforma' },
      ];
    } else {
      return [
        { icon: '⚙️', text: 'Configuración autónoma con herramientas nativas' },
        { icon: '📐', text: 'Acceso a plantillas oficiales de Nectar Labs' },
        { icon: '🧩', text: 'Add-ons utilizables dentro de plantillas' },
        { icon: '🚫', text: 'Sin personalización directa por el equipo' },
        { icon: '☁️', text: 'Infraestructura cloud y soporte de plataforma' },
      ];
    }
  };

  return (
    <section className="w-full py-16 sm:py-32 px-6 max-w-7xl mx-auto" id="pricing">
      <div className="text-center mb-16 relative">
        <div className="absolute -top-16 sm:-top-32 md:-top-44 left-1/2 -translate-x-1/2 text-[4.5rem] sm:text-[10rem] md:text-[16rem] lg:text-[20rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
          PLANES
        </div>
        <h2 className="relative text-3xl sm:text-5xl md:text-8xl font-black mb-4 tracking-tighter text-nectar-forest dark:text-nectar-cream leading-none z-10">
          Inversión <span className="text-nectar-gold">Tecnológica</span>
        </h2>
        <p className="text-[10px] text-nectar-gold font-black uppercase tracking-[0.5em] relative z-10">Contratos de 6 Meses de Alto Valor</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-12 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-8 rounded-[3.5rem] border border-nectar-forest/10 bg-card-bg/40 h-96 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-8 bg-foreground/10 rounded-xl w-1/2"></div>
                <div className="h-4 bg-foreground/10 rounded-xl w-3/4"></div>
                <div className="h-12 bg-foreground/10 rounded-xl w-2/3"></div>
              </div>
              <div className="h-14 bg-foreground/10 rounded-2xl w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-12 items-stretch">
          {plans.map((plan) => {
            const bullets = getPlanBullets(plan);
            return (
              <div
                key={plan.id}
                className={`p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] border-2 bg-card-bg flex flex-col justify-between hover:shadow-[var(--shadow-premium)] hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden ${
                  plan.is_recommended ? 'border-nectar-gold shadow-2xl md:scale-105 z-10' : 'border-card-border shadow-lg'
                }`}
              >
                {plan.is_recommended ? (
                  <div className="absolute top-0 right-0 px-6 py-2.5 sm:px-10 sm:py-4 bg-nectar-gold text-nectar-cream text-[9px] sm:text-[11px] font-black uppercase tracking-[0.4em] shadow-lg rounded-bl-2xl">
                    Recomendado
                  </div>
                ) : (
                  <div className="absolute top-0 right-0 px-4 py-2 bg-foreground/5 text-foreground/60 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] rounded-bl-xl border-l border-b border-card-border">
                    Contrato 6 Meses
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[9px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                      Contrato 6 Meses
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tighter text-foreground leading-none">{plan.name}</h3>
                  <p className="text-foreground opacity-80 text-xs sm:text-sm mb-6 leading-relaxed font-medium min-h-[auto] md:min-h-[64px]">{plan.description}</p>

                  <div className="flex flex-col mb-6 sm:mb-8">
                    <div className="text-[10px] font-black tracking-[0.3em] uppercase text-foreground/40 mb-2">
                      Inversión Mensual
                    </div>
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground tracking-tighter">
                        ${parseFloat(plan.price).toLocaleString()}
                      </span>
                      <span className="text-nectar-gold text-xs sm:text-sm font-black uppercase tracking-widest">MXN / mes</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {bullets.map((b, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-xs sm:text-sm font-bold text-foreground">
                        <div className="w-6 h-6 rounded-lg bg-nectar-forest/10 dark:bg-nectar-leaf/10 text-nectar-gold flex items-center justify-center text-xs shrink-0 border border-nectar-gold/20">
                          {b.icon}
                        </div>
                        <span>{b.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link href={`/login?redirect=/onboarding?plan=${plan.id}`} className="block w-full mt-4">
                  <button className={`w-full py-4 sm:py-5 rounded-[1.5rem] font-black uppercase tracking-widest transition-all text-xs shadow-xl ${
                    plan.is_recommended ? 'bg-nectar-gold text-nectar-cream hover:bg-nectar-forest hover:scale-[1.02]' : 'bg-nectar-forest text-nectar-cream hover:bg-nectar-gold'
                  }`}>
                    Elegir {plan.name}
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
