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
    name: "Plan Basico",
    price: "3000.00",
    hours: 8,
    description: "Ideales para prototipos y MVPs. Incluye desarrollo, diseño, hosting, base de datos y dominio .com.",
    is_recommended: false
  },
  {
    id: 2,
    name: "Plan Staging",
    price: "29999.00",
    hours: 90,
    description: "Nuestro plan insignia. Desarrollo continuo de producto, arquitectura serverless escalable y optimizaciones Premium.",
    is_recommended: true
  },
  {
    id: 3,
    name: "Plan Producción",
    price: "49999.00",
    hours: 160,
    description: "Ingeniería de software dedicada, soporte 24/7 y control total de infraestructura de alta disponibilidad.",
    is_recommended: false
  }
];

export default function SubscriptionCards() {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher('/plans/', { isPublic: true })
      .then(data => {
        if (Array.isArray(data)) {
          setPlans(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching plans:", err);
        setPlans(fallbackPlans);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-32 font-black tracking-widest uppercase opacity-20 text-nectar-forest dark:text-nectar-cream">Analizando Planes...</div>;

  return (
    <section className="w-full py-16 sm:py-32 px-6 max-w-7xl mx-auto" id="pricing">
      <div className="text-center mb-16 relative">
        <div className="absolute -top-16 sm:-top-32 md:-top-44 left-1/2 -translate-x-1/2 text-[4.5rem] sm:text-[10rem] md:text-[16rem] lg:text-[20rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
          PLANES
        </div>
        <h2 className="relative text-3xl sm:text-5xl md:text-8xl font-black mb-4 tracking-tighter text-nectar-forest dark:text-nectar-cream leading-none z-10">
          Inversión <span className="text-nectar-gold">Tecnológica</span>
        </h2>
        <p className="text-[10px] text-nectar-gold font-black uppercase tracking-[0.5em] relative z-10">Suscripciones de Alto Valor</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-12">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] border-2 bg-card-bg flex flex-col justify-between hover:shadow-[var(--shadow-premium)] hover:-translate-y-4 transition-all duration-700 group relative overflow-hidden ${plan.is_recommended ? 'border-nectar-gold shadow-2xl md:scale-105 z-10' : 'border-card-border shadow-lg'}`}
          >
            {plan.is_recommended && (
              <div className="absolute top-0 right-0 px-6 py-2.5 sm:px-10 sm:py-4 bg-nectar-gold text-nectar-cream text-[9px] sm:text-[11px] font-black uppercase tracking-[0.4em] shadow-lg rounded-bl-2xl">
                Plan Recomendado
              </div>
            )}

            <div>
              <h3 className="text-2xl sm:text-4xl md:text-5xl font-black mb-6 sm:mb-8 tracking-tighter text-foreground leading-none">{plan.name}</h3>
              <p className="text-foreground opacity-80 text-sm sm:text-lg mb-8 sm:mb-14 leading-relaxed min-h-[auto] md:min-h-[90px] font-bold">{plan.description}</p>

              <div className="flex flex-col mb-8 sm:mb-12">
                <div className="text-[10px] font-black tracking-[0.3em] uppercase text-foreground/40 mb-3">
                  Inversión {plan.is_recommended ? 'Mensual' : plan.name.toLowerCase().includes('mid') ? 'Quincenal' : 'Semanal'}
                </div>
                <div className="flex items-baseline gap-2 mb-4 sm:mb-6 flex-wrap">
                  <span className="text-4xl sm:text-6xl md:text-7xl font-black text-foreground tracking-tighter">
                    ${plan.is_recommended ? parseFloat(plan.price).toLocaleString() : plan.name.toLowerCase().includes('mid') ? (parseFloat(plan.price) / 2).toLocaleString() : (parseFloat(plan.price) / 4).toLocaleString()}
                  </span>
                  <span className="text-nectar-gold text-xs sm:text-sm font-black uppercase tracking-widest">MXN</span>
                </div>

                {!plan.is_recommended && (
                  <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.08] self-start transition-colors hover:bg-foreground/[0.05]">
                    <span className="text-[10px] font-bold text-foreground/50 tracking-[0.2em] uppercase">Total al mes</span>
                    <div className="h-3 w-px bg-foreground/20"></div>
                    <span className="text-sm font-black text-foreground">${parseFloat(plan.price).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <li className="flex items-center gap-4 sm:gap-6 text-sm sm:text-lg md:text-xl font-black text-foreground mb-4 list-none">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-nectar-forest text-nectar-cream flex items-center justify-center shadow-lg group-hover:bg-nectar-gold transition-colors shrink-0">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                Máximo {plan.hours} Horas / mes
              </li>
              <li className="flex items-center gap-4 sm:gap-6 text-sm sm:text-lg md:text-xl font-black text-foreground list-none">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-nectar-forest text-nectar-cream flex items-center justify-center shadow-lg group-hover:bg-nectar-gold transition-colors shrink-0">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                Alianza Estratégica (6 meses)
              </li>

            </div>

            <Link href="/login" className="block w-full mt-8">
              <button className={`w-full py-4 sm:py-8 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-widest transition-all text-xs sm:text-sm shadow-xl ${plan.is_recommended ? 'bg-nectar-gold text-nectar-cream hover:bg-nectar-forest hover:scale-[1.02]' : 'bg-nectar-forest text-nectar-cream hover:bg-nectar-gold'}`}>
                Elegir Plan
              </button>
            </Link>

          </div>
        ))}
      </div>
    </section>
  );
}
