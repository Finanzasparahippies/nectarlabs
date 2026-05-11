'use client';

import React, { useState } from 'react';

export default function PricingCalculator() {
  const [hours, setHours] = useState(12);
  const [brandDesignType, setBrandDesignType] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');

  const nectarRate = 225;
  const agencyRate = 1200;

  const brandDesignPricing = {
    none: { price: 0, hours: 0, label: 'Sin Diseño de Marca' },
    weekly: { price: 500 * 4, hours: 4, label: 'Semanal (4h/mes)' },
    biweekly: { price: 900 * 2, hours: 6, label: 'Quincenal (6h/mes)' },
    monthly: { price: 1600, hours: 8, label: 'Mensual (8h/mes)' },
  };

  const brandDesignCost = brandDesignPricing[brandDesignType].price;
  const totalMonthly = (hours * nectarRate) + brandDesignCost;
  const totalHours = hours + brandDesignPricing[brandDesignType].hours;

  return (
    <section className="w-full px-6 max-w-6xl mx-auto py-32 bg-card-bg rounded-[3.5rem] border border-nectar-forest/5 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 blur-[100px] -z-10"></div>

      <div className="text-center mb-20">
        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-foreground">Inversor Inteligente</h2>
        <p className="text-xl text-foreground opacity-40 uppercase tracking-widest text-[10px] font-black">Optimiza tu capital con ingeniería de alto rendimiento.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
        <div className="space-y-16">
          {/* Horas de Ingeniería */}
          <div>
            <div className="flex justify-between items-end mb-8">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.3em] text-nectar-gold block mb-2">
                  Ingeniería de Software
                </label>
                <p className="text-foreground/40 text-xs font-bold">Desarrollo, DevOps y Consultoría</p>
              </div>
              <span className="text-5xl font-black text-nectar-forest">{hours}h</span>
            </div>
            <input
              type="range"
              min="5"
              max="160"
              step="5"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value))}
              className="w-full h-2 bg-nectar-forest/5 rounded-full appearance-none cursor-pointer accent-nectar-gold"
            />
          </div>

          {/* Diseño de Marca Add-on */}
          <div className="space-y-6">
            <label className="text-xs font-black uppercase tracking-[0.3em] text-nectar-gold block">
              Complemento: Diseño de Marca
            </label>
            <div className="grid grid-cols-2 gap-4">
              {(['none', 'weekly', 'biweekly', 'monthly'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setBrandDesignType(type)}
                  className={`p-6 rounded-3xl border-2 transition-all text-left group ${brandDesignType === type
                      ? 'border-nectar-gold bg-nectar-gold/5 shadow-lg'
                      : 'border-card-border hover:border-nectar-gold/30'
                    }`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${brandDesignType === type ? 'text-nectar-gold' : 'text-foreground/30'}`}>
                    {type === 'none' ? 'Básico' : 'Premium'}
                  </p>
                  <p className="text-sm font-black text-foreground">{brandDesignPricing[type].label}</p>
                  {brandDesignPricing[type].price > 0 && (
                    <p className="text-xs font-bold text-nectar-forest mt-2">
                      +${brandDesignPricing[type].price.toLocaleString()} MXN
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card de Resultados */}
        <div className="p-12 rounded-[3rem] bg-nectar-forest text-white relative overflow-hidden shadow-2xl lg:sticky lg:top-8">
          <div className="absolute top-0 right-0 p-8">
            <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-nectar-gold font-black italic text-xl">
              N
            </div>
          </div>

          <h4 className="text-xs font-black uppercase tracking-[0.4em] mb-12 text-nectar-gold">Resumen de Inversión</h4>

          <div className="space-y-10">
            <div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Inversión Mensual Total</p>
              <p className="text-7xl font-black text-white tracking-tighter">
                ${totalMonthly.toLocaleString()} <span className="text-lg font-medium text-nectar-gold">MXN</span>
              </p>
              <p className="text-xs font-bold text-nectar-gold/60 mt-4 uppercase tracking-widest">
                {totalHours} horas totales de talento experto
              </p>
            </div>

            <div className="pt-10 border-t border-white/10">
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Eficiencia vs Agencia Tradicional</p>
              <p className="text-4xl font-black text-nectar-gold">
                -${(hours * (agencyRate - nectarRate)).toLocaleString()} MXN
              </p>
              <p className="text-[10px] text-white/30 mt-2 italic">Ahorro proyectado basado en tarifas de mercado de CDMX/Guadalajara.</p>
            </div>

            <button className="w-full py-6 bg-white text-nectar-forest font-black uppercase tracking-widest rounded-2xl hover:bg-nectar-gold hover:text-white transition-all shadow-xl">
              Solicitar Cotización
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
