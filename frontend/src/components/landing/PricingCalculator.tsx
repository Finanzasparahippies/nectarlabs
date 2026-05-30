'use client';

import React, { useState } from 'react';

const CALCULATOR_ADDONS = [
  { id: 'live-chat', name: 'Néctar Live Chat', monthlyPrice: 99, yearlyPrice: 990, desc: 'Widget en tiempo real y consola de soporte multi-agente.' },
  { id: 'booking-signature', name: 'Néctar Booking & Signature', monthlyPrice: 149, yearlyPrice: 1490, desc: 'Calendario de reservas y firma digital de contratos en PDF.' },
  { id: 'logistics-gps', name: 'Néctar Logistics & GPS', monthlyPrice: 449, yearlyPrice: 4490, desc: 'Rastreo satelital GPS en tiempo real y optimización de rutas.' },
  { id: 'patreon-sponsorship', name: 'Néctar Patreon/Sponsorship', monthlyPrice: 169, yearlyPrice: 1690, desc: 'Monetización recurrente, tiers y pasarela de Stripe.' },
  { id: 'analytics-apm', name: 'Néctar Analytics APM', monthlyPrice: 99, yearlyPrice: 990, desc: 'Middleware de telemetría APM y Core Web Vitals.' },
  { id: 'newsletter-campaigner', name: 'Néctar Newsletter', monthlyPrice: 79, yearlyPrice: 790, desc: 'Programador de campañas masivas y plantillas de correo HTML.' },
];

const PARTNER_PLANS = [
  { id: 1, name: 'Plan Básico', hours: 8, price: 750, period: 'semana', totalMonthly: 3000, description: 'Ideales para prototipos y MVPs. Incluye desarrollo, diseño, hosting, base de datos y dominio .com.' },
  { id: 2, name: 'Plan Mid', hours: 10, price: 1400, period: 'quincena', totalMonthly: 2800, description: 'Desarrollo continuo de producto, arquitectura serverless escalable y optimizaciones Premium.' },
  { id: 3, name: 'Plan Premium', hours: 12, price: 2500, period: 'mes', totalMonthly: 2500, description: 'Ingeniería de software dedicada, soporte y control total de infraestructura de alta disponibilidad.' },
];

const BRAND_DESIGN_PRICES = {
  none: { name: 'Sin Diseño', price: 0, hours: 0 },
  monthly: { name: 'Mensual (Basic)', price: 1600, hours: 8, label: 'Mensual ($1,600/mes)' },
  biweekly: { name: 'Quincenal (Mid)', price: 1800, hours: 10, label: 'Quincenal ($900/qna)' },
  weekly: { name: 'Semanal (Premium)', price: 2000, hours: 12, label: 'Semanal ($500/sem)' },
};

export default function PricingCalculator({ onOpenScheduler }: { onOpenScheduler?: (addonSlug?: string) => void }) {
  const [mode, setMode] = useState<'partner' | 'addons'>('partner');
  const [planIndex, setPlanIndex] = useState(1); // Default to Plan Mid (index 1)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [brandDesign, setBrandDesign] = useState<'none' | 'monthly' | 'biweekly' | 'weekly'>('none');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const agencyRate = 1200; // MXN/h

  const toggleAddon = (id: string) => {
    if (selectedAddons.includes(id)) {
      setSelectedAddons(prev => prev.filter(a => a !== id));
    } else {
      setSelectedAddons(prev => [...prev, id]);
    }
  };

  const handleModeChange = (newMode: 'partner' | 'addons') => {
    setMode(newMode);
    setSelectedAddons([]);
  };

  // Calculations for Partner Tecnológico Mode
  const activePlan = PARTNER_PLANS[planIndex];
  const brandDesignInfo = BRAND_DESIGN_PRICES[brandDesign];
  const partnerSubtotal = activePlan.totalMonthly + brandDesignInfo.price;
  const partnerIva = partnerSubtotal * 0.16;
  const partnerTotal = partnerSubtotal + partnerIva;

  // Efficiency/Savings vs Traditional Agency
  const agencyCost = activePlan.hours * agencyRate;
  const partnerSavings = agencyCost - activePlan.totalMonthly;

  // Calculations for Solo Módulos Mode
  const addonsSubtotalMonthly = selectedAddons.reduce((sum, id) => {
    const addon = CALCULATOR_ADDONS.find(a => a.id === id);
    return sum + (addon ? addon.monthlyPrice : 0);
  }, 0);

  const baseSubtotal = selectedAddons.reduce((sum, id) => {
    const addon = CALCULATOR_ADDONS.find(a => a.id === id);
    if (!addon) return sum;
    return sum + (billingCycle === 'monthly' ? addon.monthlyPrice : addon.yearlyPrice);
  }, 0);

  const brandDesignCost = billingCycle === 'monthly' 
    ? brandDesignInfo.price 
    : brandDesignInfo.price * 10; // 2 months free

  const addonsSubtotal = baseSubtotal + brandDesignCost;
  
  // Show discount on yearly: standard 12 months vs 10 months price
  const baseMonthlySumWithBrand = (addonsSubtotalMonthly + brandDesignInfo.price) * 12;
  const addonsDiscount = billingCycle === 'yearly' && (selectedAddons.length > 0 || brandDesign !== 'none')
    ? baseMonthlySumWithBrand - addonsSubtotal 
    : 0;

  const addonsIva = addonsSubtotal * 0.16;
  const addonsTotal = addonsSubtotal + addonsIva;

  const getRedirectUrl = () => {
    if (mode === 'partner') {
      return `/login?redirect=/onboarding?plan=${activePlan.id}`;
    } else {
      return `/dashboard/addons`;
    }
  };

  return (
    <section className="w-full px-6 max-w-7xl mx-auto py-16 sm:py-32 bg-card-bg dark:bg-[#070d0a] rounded-[2.5rem] sm:rounded-[3.5rem] border border-nectar-forest/10 dark:border-nectar-leaf/20 shadow-2xl relative overflow-hidden animate-premium">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-nectar-forest/5 dark:bg-nectar-leaf/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-nectar-gold/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="text-center mb-12 sm:mb-20">
        <span className="text-[10px] text-nectar-gold font-black uppercase tracking-[0.4em] block mb-3">Calculadora de Inversión</span>
        <h2 className="text-3xl sm:text-6xl font-black mb-4 sm:mb-6 tracking-tighter text-foreground">Inversor Inteligente</h2>
        <p className="text-sm sm:text-lg text-foreground/60 max-w-2xl mx-auto leading-relaxed">
          Optimiza tu capital de desarrollo eligiendo el esquema ideal. Compara la alianza estratégica con la contratación individual.
        </p>

        {/* Dual Mode Switcher */}
        <div className="inline-flex bg-background/80 dark:bg-card-bg/60 border border-card-border p-1.5 rounded-2xl relative z-10 shadow-sm mt-8 sm:mt-10">
          <button
            onClick={() => handleModeChange('partner')}
            className={`px-6 sm:px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all duration-300 cursor-pointer flex items-center gap-2 ${
              mode === 'partner'
                ? 'bg-nectar-forest dark:bg-nectar-leaf text-white shadow-md font-bold'
                : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            🛡️ Partner Tecnológico
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-nectar-gold text-background font-extrabold uppercase">6 Meses</span>
          </button>
          <button
            onClick={() => handleModeChange('addons')}
            className={`px-6 sm:px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all duration-300 cursor-pointer flex items-center gap-2 ${
              mode === 'addons'
                ? 'bg-nectar-forest dark:bg-nectar-leaf text-white shadow-md font-bold'
                : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            🧩 Solo Módulos
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/70 font-extrabold uppercase">A la Carta</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-16 items-start">
        {/* Left Column: Interactive Controls */}
        <div className="lg:col-span-7 space-y-8 sm:space-y-12">
          {mode === 'partner' ? (
            <div className="space-y-8 sm:space-y-10 animate-premium">
              {/* Engineering Plan Slider (Interactive Snapping) */}
              <div className="p-6 sm:p-8 rounded-[2rem] bg-background/40 dark:bg-card-bg/30 border border-card-border/85 dark:border-card-border/40">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-nectar-gold block mb-1">
                      Ingeniería de Software
                    </label>
                    <p className="text-xs text-foreground/50">Desarrollo dedicado, DevOps y Soporte Técnico</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-nectar-forest dark:text-nectar-cream">{activePlan.hours}h</span>
                    <span className="text-[9px] font-bold text-foreground/45 block uppercase">Mensuales</span>
                  </div>
                </div>

                {/* Range Slider Snapped */}
                <div className="relative pt-4 pb-2">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    value={planIndex}
                    onChange={(e) => setPlanIndex(parseInt(e.target.value))}
                    className="w-full h-2 bg-foreground/10 dark:bg-foreground/5 rounded-full appearance-none cursor-pointer accent-nectar-gold"
                  />
                  {/* Markings */}
                  <div className="flex justify-between mt-4 px-1 text-[9px] font-black uppercase tracking-wider text-foreground/50">
                    <span className={planIndex === 0 ? 'text-nectar-gold font-black' : ''}>8h Básico</span>
                    <span className={planIndex === 1 ? 'text-nectar-gold font-black' : ''}>10h Mid</span>
                    <span className={planIndex === 2 ? 'text-nectar-gold font-black' : ''}>12h Premium</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-card-border/40 dark:border-card-border/10 flex items-center justify-between gap-4">
                  <div className="text-xs text-foreground/60 italic leading-relaxed">
                    "{activePlan.description}"
                  </div>
                  <div className="shrink-0 bg-nectar-forest/5 dark:bg-nectar-leaf/10 border border-nectar-forest/10 dark:border-nectar-leaf/20 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[8px] font-black block opacity-40 uppercase">Precio Plan</span>
                    <span className="text-sm font-black text-nectar-gold">${activePlan.price.toLocaleString('es-MX')} / {activePlan.period}</span>
                  </div>
                </div>
              </div>

              {/* Add-ons Inclusion Highlight */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-nectar-gold block mb-1">
                      Catálogo de Add-ons
                    </label>
                    <p className="text-xs text-foreground/50">Todos los módulos incluidos a tasa cero ($0 MXN)</p>
                  </div>
                  <span className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-[8px] font-black uppercase tracking-widest rounded-full">
                    🛡️ Incluidos en Alianza
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CALCULATOR_ADDONS.map((addon) => (
                    <div
                      key={addon.id}
                      className="p-4 rounded-2xl border border-card-border bg-background/10 dark:bg-card-bg/20 flex items-center justify-between gap-3 group hover:border-nectar-forest/40 dark:hover:border-nectar-leaf/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-black text-foreground block truncate group-hover:text-nectar-gold transition-colors">{addon.name}</span>
                        <span className="text-[9px] text-foreground/45 block truncate leading-snug">{addon.desc}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-black text-green-500 bg-green-500/10 border border-green-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider block">Gratis</span>
                        <span className="text-[8px] text-foreground/30 line-through mt-0.5 block">${addon.monthlyPrice}/mes</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 sm:space-y-10 animate-premium">
              {/* Billing Cycle Switcher for Addons */}
              <div className="p-6 sm:p-8 rounded-[2rem] bg-background/40 dark:bg-card-bg/30 border border-card-border/80 dark:border-card-border/40 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-nectar-gold block mb-1">
                    Ciclo de Facturación
                  </label>
                  <p className="text-xs text-foreground/50">Elige el periodo de pago para tus módulos a la carta</p>
                </div>
                
                <div className="inline-flex bg-background border border-card-border p-1 rounded-xl">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-5 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all duration-300 cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'bg-nectar-forest dark:bg-nectar-leaf text-white shadow-sm font-bold'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-5 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                      billingCycle === 'yearly'
                        ? 'bg-nectar-forest dark:bg-nectar-leaf text-white shadow-sm font-bold'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Anual
                    <span className="text-[7.5px] bg-green-500 text-white font-extrabold px-1 py-0.5 rounded leading-none">2 Meses Gratis</span>
                  </button>
                </div>
              </div>

              {/* Add-ons Checklist */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-nectar-gold block mb-1">
                    Selecciona tus Módulos
                  </label>
                  <p className="text-xs text-foreground/50">Elige los complementos técnicos que deseas integrar</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CALCULATOR_ADDONS.map((addon) => {
                    const isChecked = selectedAddons.includes(addon.id);
                    const price = billingCycle === 'monthly' ? addon.monthlyPrice : addon.yearlyPrice;
                    return (
                      <button
                        key={addon.id}
                        onClick={() => toggleAddon(addon.id)}
                        className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 cursor-pointer ${
                          isChecked
                            ? 'border-nectar-gold bg-nectar-gold/5 dark:bg-nectar-gold/[0.03] shadow-md'
                            : 'border-card-border bg-background/10 dark:bg-card-bg/20 hover:border-nectar-gold/30'
                        }`}
                      >
                        {/* Checkbox circle */}
                        <div className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                          isChecked ? 'border-nectar-gold bg-nectar-gold text-background' : 'border-card-border bg-background'
                        }`}>
                          {isChecked && <span className="text-[9px] font-black">✓</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-black text-foreground block truncate">{addon.name}</span>
                          <p className="text-[9px] text-foreground/50 line-clamp-2 leading-relaxed mt-1 mb-2">{addon.desc}</p>
                          <span className="text-[10px] font-black text-nectar-gold font-mono">
                            ${price.toLocaleString('es-MX')} MXN / {billingCycle === 'monthly' ? 'mes' : 'año'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Brand Design Add-on Selector */}
          <div className="space-y-4 pt-6 border-t border-card-border/40 dark:border-card-border/10 animate-fadeIn">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-nectar-gold block mb-1">
                Servicio Complementario: Diseño de Marca
              </label>
              <p className="text-xs text-foreground/50">
                Diseñadores creativos dedicados a tu marca.
                {mode === 'partner' && " Horas del plan de diseño: Básico: 8h, Mid: 10h, Premium: 12h."}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['none', 'monthly', 'biweekly', 'weekly'] as const).map((tier) => {
                const info = BRAND_DESIGN_PRICES[tier];
                const isActive = brandDesign === tier;
                const price = billingCycle === 'monthly' || mode === 'partner' ? info.price : info.price * 10;
                
                return (
                  <button
                    key={tier}
                    onClick={() => setBrandDesign(tier)}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between min-h-[110px] transition-all cursor-pointer ${
                      isActive
                        ? 'border-nectar-gold bg-nectar-gold/5 dark:bg-nectar-gold/[0.03] shadow-md'
                        : 'border-card-border bg-background/10 dark:bg-card-bg/20 hover:border-nectar-gold/30'
                    }`}
                  >
                    <div>
                      <span className={`text-[7px] font-black uppercase tracking-widest block mb-1 ${
                        isActive ? 'text-nectar-gold' : 'text-foreground/40'
                      }`}>
                        {tier === 'none' ? 'Básico' : 'Diseño Creativo'}
                      </span>
                      <span className="text-xs font-black text-foreground block leading-tight">{info.name}</span>
                    </div>

                    <div className="mt-4">
                      {info.hours > 0 && (
                        <span className="text-[8px] font-bold text-foreground/45 block uppercase font-mono">{info.hours}h Diseño / mes</span>
                      )}
                      <span className="text-[9px] font-black text-nectar-gold font-mono">
                        {price > 0 ? `$${price.toLocaleString('es-MX')} MXN` : 'Sin Costo'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Premium Invoice breakdown */}
        <div className="lg:col-span-5 lg:sticky lg:top-8 bg-[#0F1C15] dark:bg-[#070d0a] text-white p-6 sm:p-10 rounded-[2.5rem] border border-nectar-forest/50 dark:border-nectar-leaf/30 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[580px] animate-premium">
          {/* Watermark Logo */}
          <div className="absolute top-6 right-6">
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-nectar-gold font-black italic text-lg shadow-sm">
              N
            </div>
          </div>

          <div>
            <div className="mb-8">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-nectar-gold block mb-1">Inversión Estimada</span>
              <h3 className="text-2xl font-black tracking-tight">Recibo de Conceptos</h3>
            </div>

            {/* Bill details */}
            <div className="space-y-4 text-xs">
              {mode === 'partner' ? (
                // Partner Mode Receipt Items
                <>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <div>
                      <span className="font-bold text-white block">{activePlan.name}</span>
                      <span className="text-[9px] text-white/50">{activePlan.hours} horas/mes • ${activePlan.price.toLocaleString('es-MX')} MXN/{activePlan.period}</span>
                    </div>
                    <span className="font-mono font-bold">${activePlan.totalMonthly.toLocaleString('es-MX')} MXN</span>
                  </div>

                  {brandDesign !== 'none' && (
                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                      <div>
                        <span className="font-bold text-white block">Diseño de Marca ({brandDesignInfo.name})</span>
                        <span className="text-[9px] text-white/50">{brandDesignInfo.hours} horas de diseño mensuales</span>
                      </div>
                      <span className="font-mono font-bold">${brandDesignInfo.price.toLocaleString('es-MX')} MXN</span>
                    </div>
                  )}

                  {/* Add-ons line item ($0 MXN) */}
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <div>
                      <span className="font-bold text-white block">Módulos del Ecosistema</span>
                      <span className="text-[9px] text-white/50">Todos los add-ons integrados sin costo</span>
                    </div>
                    <span className="font-black text-green-400 bg-green-500/10 border border-green-500/25 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider">Incluidos ($0)</span>
                  </div>
                </>
              ) : (
                // Addons Mode Receipt Items
                <>
                  {selectedAddons.length > 0 ? (
                    selectedAddons.map(id => {
                      const addon = CALCULATOR_ADDONS.find(a => a.id === id)!;
                      const price = billingCycle === 'monthly' ? addon.monthlyPrice : addon.yearlyPrice;
                      return (
                        <div key={id} className="flex justify-between items-center py-2.5 border-b border-white/5">
                          <div>
                            <span className="font-bold text-white block">{addon.name}</span>
                            <span className="text-[9px] text-white/50">Módulo autónomo a la carta</span>
                          </div>
                          <span className="font-mono font-bold">${price.toLocaleString('es-MX')} MXN</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center border-b border-white/5 text-white/40 italic">
                      Ningún módulo seleccionado. Selecciona módulos a la izquierda para armar tu recibo.
                    </div>
                  )}

                  {brandDesign !== 'none' && (
                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                      <div>
                        <span className="font-bold text-white block">Diseño de Marca ({brandDesignInfo.name})</span>
                        <span className="text-[9px] text-white/50">{brandDesignInfo.hours} horas de diseño mensuales</span>
                      </div>
                      <span className="font-mono font-bold">${brandDesignCost.toLocaleString('es-MX')} MXN</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="mt-8 pt-6 border-t border-white/10 space-y-3 text-xs">
              <div className="flex justify-between items-center text-white/60">
                <span>Subtotal</span>
                <span className="font-mono">${(mode === 'partner' ? partnerSubtotal : addonsSubtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {mode === 'addons' && billingCycle === 'yearly' && addonsDiscount > 0 && (
                <div className="flex justify-between items-center text-green-400">
                  <span>Descuento (Ciclo Anual - 2 Meses Gratis)</span>
                  <span className="font-mono">-${addonsDiscount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-white/60">
                <span>IVA (16%)</span>
                <span className="font-mono">${(mode === 'partner' ? partnerIva : addonsIva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center pt-3 text-lg font-black border-t border-white/5">
                <span className="text-white">Total</span>
                <span className="text-nectar-gold font-mono">
                  ${(mode === 'partner' ? partnerTotal : addonsTotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  <span className="text-[9px] font-bold text-white/40 ml-1">MXN / {billingCycle === 'monthly' || mode === 'partner' ? 'mes' : 'año'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6 mt-8">
            {/* Efficiency / Savings Box */}
            {mode === 'partner' ? (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center sm:text-left">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-nectar-gold block mb-1">Eficiencia de Capital</span>
                <p className="text-base font-black text-green-400 font-mono">-${partnerSavings.toLocaleString('es-MX')} MXN / mes</p>
                <p className="text-[8px] text-white/40 mt-1 uppercase tracking-wider">Ahorro proyectado comparado a tarifas de agencia promedio ($1,200 MXN/h)</p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center sm:text-left">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-nectar-gold block mb-1">Soberanía de Código</span>
                <p className="text-xs font-bold text-white">Propiedad absoluta e integración nativa</p>
                <p className="text-[8px] text-white/40 mt-1 uppercase tracking-wider">Sin dependencias de terceros. Soporte directo de nuestro equipo de ingeniería.</p>
              </div>
            )}

            {/* CTA Dynamic Buttons */}
            <div className="space-y-3">
              <a 
                href={getRedirectUrl()}
                className="block w-full"
              >
                <button className="w-full py-4 bg-white text-nectar-forest font-black uppercase tracking-widest rounded-2xl hover:bg-nectar-gold hover:text-white transition-all shadow-xl text-[10px] sm:text-xs cursor-pointer">
                  {mode === 'partner' ? '🛡️ Iniciar Onboarding' : '🧩 Contratar Módulos'}
                </button>
              </a>
              <button 
                onClick={() => onOpenScheduler?.(mode === 'addons' ? selectedAddons[0] || '' : '')}
                className="w-full py-4 bg-transparent border border-white/20 text-white hover:border-nectar-gold hover:text-nectar-gold font-black uppercase tracking-widest rounded-2xl transition-all text-[10px] sm:text-xs cursor-pointer"
              >
                📅 Agendar Consultoría Técnica
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
