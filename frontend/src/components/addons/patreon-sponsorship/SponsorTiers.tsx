'use client';

import React, { useState } from 'react';
import Toast from '../../ui/Toast';

interface SponsorTiersProps {
  primaryColor: string;
}

export default function SponsorTiers({ primaryColor }: SponsorTiersProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const tiers = [
    {
      id: 'bronze',
      name: 'Bronce (Soporte Básico)',
      price: '$5',
      period: '/mes',
      features: [
        'Acceso a feed de actualizaciones',
        'Insignia de patrocinador en tu perfil',
        'Acceso a nuestro canal de Discord exclusivo'
      ]
    },
    {
      id: 'silver',
      name: 'Plata (Colaborador Premium)',
      price: '$15',
      period: '/mes',
      features: [
        'Todo lo del nivel Bronce',
        'Contenido exclusivo antes de lanzamiento',
        'Soporte prioritario básico',
        'Tu nombre en los créditos oficiales'
      ]
    },
    {
      id: 'gold',
      name: 'Oro (Patrocinador VIP)',
      price: '$45',
      period: '/mes',
      features: [
        'Todo lo del nivel Plata',
        'Reunión mensual Q&A por videollamada',
        'Acceso prioritario 24/7 de soporte',
        'Merchandising exclusivo trimestral'
      ]
    }
  ];

  return (
    <div className="bg-[#050a06]/40 border border-white/5 rounded-[2rem] p-6 shadow-lg relative overflow-hidden group">
      <div
        className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-700 pointer-events-none group-hover:opacity-25"
        style={{ backgroundColor: primaryColor }}
      ></div>

      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Nivel de Patrocinio y Membresías</h3>
          <p className="text-[9px] uppercase tracking-widest font-black text-white/40">Add-on: Patreon & Sponsorship</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <div 
            key={tier.id}
            onClick={() => setSelectedTier(tier.id)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:border-white/10 ${
              selectedTier === tier.id 
                ? 'bg-white/[0.03] border-white/20 scale-[1.01]' 
                : 'bg-white/[0.01] border-white/5'
            }`}
          >
            <div>
              <h4 className="text-xs font-black uppercase tracking-tight text-white">{tier.name}</h4>
              <div className="mt-3 flex items-baseline gap-1 text-white">
                <span className="text-xl font-black">{tier.price}</span>
                <span className="text-[9px] font-black uppercase text-white/45">{tier.period}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {tier.features.map((f, idx) => (
                  <li key={idx} className="flex gap-2 items-start text-[10px] text-white/60 leading-tight">
                    <span className="text-[9px]" style={{ color: primaryColor }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              className="mt-6 w-full py-3 rounded-xl font-black uppercase tracking-wider text-[8px] transition-all hover:scale-102 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: selectedTier === tier.id ? primaryColor : 'rgba(255,255,255,0.03)',
                color: selectedTier === tier.id ? '#000000' : '#FFFFFF'
              }}
            >
              {selectedTier === tier.id ? 'Seleccionado' : 'Elegir Plan'}
            </button>
          </div>
        ))}
      </div>

      {selectedTier && (
        <div className="mt-6 p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex justify-between items-center animate-premium">
          <div>
            <p className="text-[7.5px] text-white/40 uppercase font-black">Plan a suscribir</p>
            <p className="text-xs font-black text-white mt-0.5">
              {tiers.find(t => t.id === selectedTier)?.name} - {tiers.find(t => t.id === selectedTier)?.price}/mes
            </p>
          </div>
          <button 
            type="button"
            onClick={() => {
              setToast({ message: 'Redirigiendo a pasarela de cobros segura de Stripe...', type: 'info' });
            }}
            className="px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] hover:scale-105 active:scale-95 transition-all text-black cursor-pointer animate-pulse"
            style={{ backgroundColor: primaryColor }}
          >
            Proceder al pago con Stripe
          </button>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
