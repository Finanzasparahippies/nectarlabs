'use client';

import React, { useState } from 'react';

export default function PricingCalculator() {
  const [hours, setHours] = useState(12);
  const nectarRate = 225;
  const agencyRate = 1200;

  return (
    <section className="w-full px-6 max-w-6xl mx-auto py-24 bg-card-bg rounded-[3.5rem] border border-nectar-forest/5 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 blur-[100px] -z-10"></div>

      <div className="text-center mb-20">
        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-foreground">Inversor Inteligente</h2>
        <p className="text-xl text-foreground opacity-40 uppercase tracking-widest text-[10px] font-black">Eficiencia técnica durante los primeros 6 meses.</p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
        <div className="space-y-12">
          <div>
            <div className="flex justify-between items-end mb-6">
              <label className="text-xs font-black uppercase tracking-[0.3em] text-nectar-gold">
                Volumen Mensual
              </label>
              <span className="text-4xl font-black text-nectar-forest">{hours}h</span>
            </div>
            <input
              type="range"
              min="5"
              max="160"
              step="5"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value))}
              className="w-full h-1.5 bg-nectar-forest/5 rounded-full appearance-none cursor-pointer accent-nectar-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-nectar-forest/5 border border-nectar-forest/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-nectar-forest/40 mb-2">Nectar Labs</p>
              <p className="text-xl font-black text-nectar-gold">${nectarRate} <span className="text-xs font-medium">/hr</span></p>
            </div>
            <div className="p-6 rounded-3xl bg-white border border-nectar-forest/5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-nectar-forest/40 mb-2">Agencia Promedio</p>
              <p className="text-xl font-black text-nectar-forest/30 line-through">${agencyRate} <span className="text-xs font-medium">/hr</span></p>
            </div>
          </div>
        </div>

        <div className="p-12 rounded-[2.5rem] bg-nectar-forest text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-6">
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-nectar-gold font-black italic">
              N
            </div>
          </div>

          <h4 className="text-xs font-black uppercase tracking-[0.4em] mb-12 text-nectar-gold">Eficiencia de Capital</h4>

          <div className="space-y-8">
            <div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Inversión Nectar Labs</p>
              <p className="text-6xl font-black text-white tracking-tighter">
                ${(hours * nectarRate).toLocaleString()} <span className="text-lg font-medium text-nectar-gold">MXN</span>
              </p>
            </div>

            <div className="pt-8 border-t border-white/10">
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Ahorro Mensual vs Agencia</p>
              <p className="text-3xl font-black text-nectar-gold">
                ${(hours * (agencyRate - nectarRate)).toLocaleString()} MXN
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
