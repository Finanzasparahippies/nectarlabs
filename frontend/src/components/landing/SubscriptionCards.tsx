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

export default function SubscriptionCards() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher('/plans/')
      .then(data => {

        setPlans(data);
        setLoading(false);
      })
      .catch(err => {

        console.error("Error fetching plans:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-32 font-black tracking-widest uppercase opacity-20 text-nectar-forest dark:text-nectar-cream">Analizando Planes...</div>;

  return (
    <section className="w-full py-32 px-6 max-w-7xl mx-auto" id="pricing">
      <div className="text-center mb-16 relative">
        <div className="absolute -top-44 left-1/2 -translate-x-1/2 text-[10rem] md:text-[20rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
          PLANES
        </div>
        <h2 className="relative text-6xl md:text-8xl font-black mb-4 tracking-tighter text-nectar-forest dark:text-nectar-cream leading-none z-10">
          Inversión <span className="text-nectar-gold">Tecnológica</span>
        </h2>
        <p className="text-[10px] text-nectar-gold font-black uppercase tracking-[0.5em] relative z-10">Suscripciones de Alto Valor</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-12 rounded-[4rem] border-2 bg-card-bg flex flex-col justify-between hover:shadow-[var(--shadow-premium)] hover:-translate-y-4 transition-all duration-700 group relative overflow-hidden ${plan.is_recommended ? 'border-nectar-gold shadow-2xl scale-105 z-10' : 'border-card-border shadow-lg'}`}
          >
            {plan.is_recommended && (
              <div className="absolute top-0 right-0 px-10 py-4 bg-nectar-gold text-nectar-cream text-[11px] font-black uppercase tracking-[0.4em] shadow-lg">
                Plan Recomendado
              </div>
            )}

            <div>
              <h3 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter text-foreground leading-none">{plan.name}</h3>
              <p className="text-foreground opacity-80 text-lg mb-14 leading-relaxed min-h-[90px] font-bold">{plan.description}</p>

              <div className="flex items-baseline gap-2 mb-16">
                <span className="text-7xl font-black text-foreground tracking-tighter">${parseFloat(plan.price).toLocaleString()}</span>
                <span className="text-nectar-gold text-sm font-black uppercase tracking-widest">MXN</span>
              </div>

              <li className="flex items-center gap-6 text-xl font-black text-foreground">
                <div className="w-10 h-10 rounded-2xl bg-nectar-forest text-nectar-cream flex items-center justify-center shadow-lg group-hover:bg-nectar-gold transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                Máximo {plan.hours} Horas / mes
              </li>
              <li className="flex items-center gap-6 text-xl font-black text-foreground">
                <div className="w-10 h-10 rounded-2xl bg-nectar-forest text-nectar-cream flex items-center justify-center shadow-lg group-hover:bg-nectar-gold transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                Partner Tecnológico (6 meses)
              </li>

            </div>

            <Link href="/login" className="block w-full">
              <button className={`w-full py-8 rounded-[2rem] font-black uppercase tracking-widest transition-all text-sm shadow-xl ${plan.is_recommended ? 'bg-nectar-gold text-nectar-cream hover:bg-nectar-forest hover:scale-[1.02]' : 'bg-nectar-forest text-nectar-cream hover:bg-nectar-gold'}`}>
                Elegir Plan
              </button>
            </Link>

          </div>
        ))}
      </div>
    </section>
  );
}
