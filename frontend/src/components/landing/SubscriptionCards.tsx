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
    price: "2499.00",
    hours: 6,
    description: "Solución ágil para startups y pequeños negocios. Incluye mantenimiento, hosting y 6 horas de desarrollo mensual.",
    is_recommended: false
  },
  {
    id: 2,
    name: "Plan Mid",
    price: "2999.00",
    hours: 8,
    description: "Desarrollo continuo y escalabilidad de producto. Incluye soporte prioritario y 8 horas de desarrollo mensual.",
    is_recommended: false
  },
  {
    id: 3,
    name: "Plan Premium",
    price: "3499.00",
    hours: 12,
    description: "Ingeniería dedicada de alto impacto. Máxima velocidad de ejecución, soporte 24/7 y 12 horas de desarrollo mensual.",
    is_recommended: true
  }
];

export default function SubscriptionCards() {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetcher('/plans/', { isPublic: true })
      .then(data => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPlans(data);
        }
        if (isMounted) setLoading(false);
      })
      .catch(err => {
        console.warn("API de planes no disponible, activando fallback defensivo:", err);
        if (isMounted) {
          setPlans(fallbackPlans);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, []);

  return (
    <section className="w-full py-16 sm:py-32 px-6 max-w-7xl mx-auto" id="pricing">
      <div className="text-center mb-16 relative">
        <div className="absolute -top-16 sm:-top-32 md:-top-44 left-1/2 -translate-x-1/2 text-[4.5rem] sm:text-[10rem] md:text-[16rem] lg:text-[20rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
          PLANES
        </div>
        <h2 className="relative text-3xl sm:text-5xl md:text-8xl font-black mb-4 tracking-tighter text-nectar-forest dark:text-nectar-cream leading-none z-10">
          Inversión <span className="text-nectar-gold">Tecnológica</span>
        </h2>
        <p className="text-[10px] text-nectar-gold font-black uppercase tracking-[0.5em] relative z-10">Suscripciones Mensuales de Alto Valor</p>
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
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] border-2 bg-card-bg flex flex-col justify-between hover:shadow-[var(--shadow-premium)] hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden ${
                plan.is_recommended ? 'border-nectar-gold shadow-2xl md:scale-105 z-10' : 'border-card-border shadow-lg'
              }`}
            >
              {plan.is_recommended && (
                <div className="absolute top-0 right-0 px-6 py-2.5 sm:px-10 sm:py-4 bg-nectar-gold text-nectar-cream text-[9px] sm:text-[11px] font-black uppercase tracking-[0.4em] shadow-lg rounded-bl-2xl">
                  Recomendado
                </div>
              )}

              <div>
                <h3 className="text-2xl sm:text-4xl md:text-5xl font-black mb-6 sm:mb-8 tracking-tighter text-foreground leading-none">{plan.name}</h3>
                <p className="text-foreground opacity-80 text-sm sm:text-lg mb-8 sm:mb-10 leading-relaxed font-medium min-h-[auto] md:min-h-[80px]">{plan.description}</p>

                <div className="flex flex-col mb-8 sm:mb-10">
                  <div className="text-[10px] font-black tracking-[0.3em] uppercase text-foreground/40 mb-3">
                    Inversión Mensual
                  </div>
                  <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                    <span className="text-4xl sm:text-6xl md:text-7xl font-black text-foreground tracking-tighter">
                      ${parseFloat(plan.price).toLocaleString()}
                    </span>
                    <span className="text-nectar-gold text-xs sm:text-sm font-black uppercase tracking-widest">MXN / mes</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-4 text-sm sm:text-lg font-bold text-foreground">
                    <div className="w-8 h-8 rounded-xl bg-nectar-forest text-nectar-cream flex items-center justify-center shadow group-hover:bg-nectar-gold transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {plan.hours} Horas de desarrollo mensual
                  </li>
                  <li className="flex items-center gap-4 text-sm sm:text-lg font-bold text-foreground">
                    <div className="w-8 h-8 rounded-xl bg-nectar-forest text-nectar-cream flex items-center justify-center shadow group-hover:bg-nectar-gold transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    Soporte técnico y mantenimiento continuo
                  </li>
                  <li className="flex items-center gap-4 text-sm sm:text-lg font-bold text-foreground">
                    <div className="w-8 h-8 rounded-xl bg-nectar-forest text-nectar-cream flex items-center justify-center shadow group-hover:bg-nectar-gold transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    Infraestructura cloud & hosting incluido
                  </li>
                </ul>
              </div>

              <Link href="/login" className="block w-full mt-6">
                <button className={`w-full py-4 sm:py-6 rounded-[1.5rem] font-black uppercase tracking-widest transition-all text-xs sm:text-sm shadow-xl ${
                  plan.is_recommended ? 'bg-nectar-gold text-nectar-cream hover:bg-nectar-forest hover:scale-[1.02]' : 'bg-nectar-forest text-nectar-cream hover:bg-nectar-gold'
                }`}>
                  Elegir {plan.name}
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
