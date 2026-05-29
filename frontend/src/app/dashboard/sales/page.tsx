'use client';

import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';

export default function SalesOraclePage() {
  // Simulator input states
  const [weeklyClients, setWeeklyClients] = useState(5);
  const [weeklyTicket, setWeeklyTicket] = useState(1000); // Base weekly ticket in MXN
  const [monthlyClients, setMonthlyClients] = useState(2);
  const [monthlyTicket, setMonthlyTicket] = useState(20000); // Base monthly ticket in MXN
  const [customQuotes, setCustomQuotes] = useState(1);
  const [customQuoteVal, setCustomQuoteVal] = useState(50000); // Custom project quote value

  // Projections calculations state
  const [projections, setProjections] = useState<Array<{
    month: number;
    label: string;
    grossFlow: number;
    weeklyFlow: number;
    monthlyFlow: number;
    customFlow: number;
    commissions: number;
    cumulativeCommissions: number;
  }>>([]);

  const [activePoint, setActivePoint] = useState<number | null>(null);

  // Recalculate projections on input changes
  useEffect(() => {
    const data = [];
    let cumulativeComm = 0;

    for (let m = 1; m <= 12; m++) {
      // Calculate gross flows
      // Weekly flow is continuous: weeklyClients * weeklyTicket * 4 (weeks in month)
      const wFlow = weeklyClients * weeklyTicket * 4;
      const mFlow = monthlyClients * monthlyTicket;
      // For custom quotes: represent the total value or upfront payment. Let's model it as a monthly gross flow component.
      const cFlow = customQuotes * customQuoteVal;
      
      const totalGrossFlow = wFlow + mFlow + cFlow;

      // Calculate salesperson commissions for this month
      // Rules:
      // - Weekly and Monthly plans acquired: Month 1: 10%, Month 2: 5%, Month 3+: 2%
      // - Custom quotes: 20% on Month 1 (anticipo), 0% subsequent months
      let comm = 0;

      // Custom Quotes commission (20% paid once at month 1)
      if (m === 1) {
        comm += (customQuotes * customQuoteVal) * 0.20;
      }

      // Weekly and Monthly plans commissions based on tenure
      // For simplicity, we assume these clients are acquired at month 1 and remain active.
      // Month 1:
      if (m === 1) {
        comm += (wFlow + mFlow) * 0.10;
      }
      // Month 2:
      else if (m === 2) {
        comm += (wFlow + mFlow) * 0.05;
      }
      // Month 3+:
      else {
        comm += (wFlow + mFlow) * 0.02;
      }

      cumulativeComm += comm;

      data.push({
        month: m,
        label: `Mes ${m}`,
        grossFlow: totalGrossFlow,
        weeklyFlow: wFlow,
        monthlyFlow: mFlow,
        customFlow: cFlow,
        commissions: comm,
        cumulativeCommissions: cumulativeComm,
      });
    }

    setProjections(data);
  }, [weeklyClients, weeklyTicket, monthlyClients, monthlyTicket, customQuotes, customQuoteVal]);

  // SVG Chart settings
  const chartHeight = 220;
  const chartWidth = 600;
  const padding = 40;

  const maxVal = projections.length > 0 
    ? Math.max(...projections.map(p => Math.max(p.grossFlow, p.cumulativeCommissions))) 
    : 100000;

  // Generate SVG path for cumulative commissions (smooth line)
  const getCommissionLinePath = () => {
    if (projections.length === 0) return '';
    return projections.map((p, idx) => {
      const x = padding + (idx * (chartWidth - padding * 2)) / (projections.length - 1);
      const y = chartHeight - padding - (p.cumulativeCommissions * (chartHeight - padding * 2)) / maxVal;
      return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');
  };

  // Generate SVG path for monthly gross flow (smooth area fill representing steady weekly income stream)
  const getGrossFlowAreaPath = () => {
    if (projections.length === 0) return '';
    const points = projections.map((p, idx) => {
      const x = padding + (idx * (chartWidth - padding * 2)) / (projections.length - 1);
      const y = chartHeight - padding - (p.grossFlow * (chartHeight - padding * 2)) / maxVal;
      return `${x},${y}`;
    });

    return `M ${padding},${chartHeight - padding} L ${points.join(' L ')} L ${chartWidth - padding},${chartHeight - padding} Z`;
  };

  return (
    <div className="flex min-h-screen bg-[#020403] text-white">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#151F18] pb-6">
          <div>
            <span className="text-[9px] text-nectar-gold font-black uppercase tracking-[0.4em] block mb-2">Simulador de Comisiones y ROI</span>
            <h1 className="text-3xl font-black uppercase tracking-widest text-white">
              Néctar Financial Oracle
            </h1>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
              Modela tus cobros recurrentes y proyecta ingresos en la colmena
            </p>
          </div>
          <div className="bg-[#050a06] border border-[#151F18] px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Algoritmo Ir 1.2 Activo</span>
          </div>
        </div>

        {/* Outer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Sliders */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Seccion 1: Clientes Semanales ("Ataque Semanal") */}
            <div className="p-6 rounded-[2rem] bg-[#050a06]/40 border border-[#151F18] space-y-6 relative overflow-hidden group">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#10B981]/5 blur-[80px] rounded-full pointer-events-none transition-opacity group-hover:opacity-100 opacity-60"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">El Ataque Semanal ($1,000)</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Parcialidades que optimizan tu liquidez</p>
                </div>
                <span className="bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                  Frecuencia Semanal
                </span>
              </div>

              {/* Slider 1: Cantidad de clientes */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white/60">Cantidad de Clientes Activos</span>
                  <span className="text-nectar-gold font-bold">{weeklyClients} Clientes</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weeklyClients}
                  onChange={(e) => setWeeklyClients(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#C68A1E]"
                />
              </div>

              {/* Slider 2: Parcialidad semanal */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white/60">Parcialidad / Abono Semanal</span>
                  <span className="text-nectar-gold font-bold">${weeklyTicket.toLocaleString('es-MX')} MXN / sem</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                  value={weeklyTicket}
                  onChange={(e) => setWeeklyTicket(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#C68A1E]"
                />
              </div>

              <div className="pt-4 border-t border-[#151F18] flex justify-between text-[10px] uppercase font-black text-white/50">
                <span>Flujo Mensual Equivalente (wFlow):</span>
                <span className="text-[#10B981] font-mono">${(weeklyClients * weeklyTicket * 4).toLocaleString('es-MX')} MXN / mes</span>
              </div>
            </div>

            {/* Seccion 2: Clientes Mensuales Estándar */}
            <div className="p-6 rounded-[2rem] bg-[#050a06]/40 border border-[#151F18] space-y-6 relative overflow-hidden group">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#C68A1E]/5 blur-[80px] rounded-full pointer-events-none transition-opacity group-hover:opacity-100 opacity-60"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Planes Mensuales de Ingeniería</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Esquemas fijos de socio tecnológico</p>
                </div>
                <span className="bg-[#C68A1E]/10 border border-[#C68A1E]/25 text-[#C68A1E] px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                  Frecuencia Mensual
                </span>
              </div>

              {/* Slider 1: Cantidad de clientes */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white/60">Cantidad de Clientes Activos</span>
                  <span className="text-nectar-gold font-bold">{monthlyClients} Clientes</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={monthlyClients}
                  onChange={(e) => setMonthlyClients(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#C68A1E]"
                />
              </div>

              {/* Slider 2: Parcialidad mensual */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white/60">Monto Promedio Mensual</span>
                  <span className="text-nectar-gold font-bold">${monthlyTicket.toLocaleString('es-MX')} MXN / mes</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="50000"
                  step="1000"
                  value={monthlyTicket}
                  onChange={(e) => setMonthlyTicket(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#C68A1E]"
                />
              </div>

              <div className="pt-4 border-t border-[#151F18] flex justify-between text-[10px] uppercase font-black text-white/50">
                <span>Flujo Mensual (mFlow):</span>
                <span className="text-[#10B981] font-mono">${(monthlyClients * monthlyTicket).toLocaleString('es-MX')} MXN / mes</span>
              </div>
            </div>

            {/* Seccion 3: Cotizaciones Proyectos Personalizados */}
            <div className="p-6 rounded-[2rem] bg-[#050a06]/40 border border-[#151F18] space-y-6 relative overflow-hidden group">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none transition-opacity group-hover:opacity-100 opacity-60"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Proyectos a Medida (Cotizados)</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Comisión única del 20% pagada al anticipo</p>
                </div>
                <span className="bg-blue-500/10 border border-blue-500/25 text-blue-400 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                  Pago Único / Proyecto
                </span>
              </div>

              {/* Slider 1: Cantidad de cotizaciones */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white/60">Cantidad de Proyectos Ganados</span>
                  <span className="text-nectar-gold font-bold">{customQuotes} Proyectos</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={customQuotes}
                  onChange={(e) => setCustomQuotes(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#C68A1E]"
                />
              </div>

              {/* Slider 2: Valor del proyecto */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white/60">Valor Promedio de Proyecto</span>
                  <span className="text-nectar-gold font-bold">${customQuoteVal.toLocaleString('es-MX')} MXN</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="200000"
                  step="5000"
                  value={customQuoteVal}
                  onChange={(e) => setCustomQuoteVal(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#C68A1E]"
                />
              </div>

              <div className="pt-4 border-t border-[#151F18] flex justify-between text-[10px] uppercase font-black text-white/50">
                <span>Flujo de Proyecto Proyectado (cFlow):</span>
                <span className="text-[#10B981] font-mono">${(customQuotes * customQuoteVal).toLocaleString('es-MX')} MXN</span>
              </div>
            </div>

          </div>

          {/* Right Column: Visual Reports and Charts */}
          <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-6">
            
            {/* Recibo e Indicadores Flotantes (Sticky) */}
            <div className="p-8 rounded-[2.5rem] bg-[#0c120f] border border-[#1c2e26] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[580px]">
              {/* Background ambient glow */}
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#C68A1E]/5 blur-[90px] rounded-full pointer-events-none"></div>
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#10B981]/10 blur-[90px] rounded-full pointer-events-none"></div>

              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-nectar-gold block mb-1">
                      Proyección de Comisión Residual
                    </span>
                    <h3 className="text-lg font-black uppercase tracking-widest text-white">Impacto Financiero</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-[#1c2e26] flex items-center justify-center text-nectar-gold font-black italic text-md">
                    N
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-background/50 border border-[#151F18] rounded-2xl">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-white/45">Flujo Bruto Mensual</span>
                    <span className="text-sm font-black text-white block mt-1 font-mono">
                      ${(weeklyClients * weeklyTicket * 4 + monthlyClients * monthlyTicket).toLocaleString('es-MX')} MXN
                    </span>
                  </div>
                  <div className="p-4 bg-background/50 border border-[#151F18] rounded-2xl">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-white/45">Comisión Total (12m)</span>
                    <span className="text-sm font-black text-[#10B981] block mt-1 font-mono">
                      ${projections.length > 0 ? projections[projections.length - 1].cumulativeCommissions.toLocaleString('es-MX', { maximumFractionDigits: 0 }) : 0} MXN
                    </span>
                  </div>
                </div>

                {/* SVG Graph container */}
                <div className="relative p-2 bg-[#020403] border border-[#151F18] rounded-2xl overflow-hidden mb-6">
                  <span className="absolute top-3 left-3 text-[7.5px] font-black uppercase tracking-widest text-white/35">Línea de Ingreso Suavizada (12 Meses)</span>
                  
                  {projections.length > 0 && (
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible pt-8 pb-4">
                      {/* Grid Lines */}
                      <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#1c2e26" strokeOpacity="0.2" strokeDasharray="3 3" />
                      <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#1c2e26" strokeOpacity="0.5" />
                      
                      {/* Fill area for steady gross flow */}
                      <path
                        d={getGrossFlowAreaPath()}
                        fill="url(#grossGrad)"
                        opacity="0.15"
                      />

                      {/* Line for cumulative commission */}
                      <path
                        d={getCommissionLinePath()}
                        fill="none"
                        stroke="url(#commGrad)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-[0_0_6px_rgba(198,138,30,0.4)]"
                      />

                      {/* Interactive hover points */}
                      {projections.map((p, idx) => {
                        const x = padding + (idx * (chartWidth - padding * 2)) / (projections.length - 1);
                        const y = chartHeight - padding - (p.cumulativeCommissions * (chartHeight - padding * 2)) / maxVal;
                        
                        return (
                          <g key={`point-${idx}`}>
                            <circle
                              cx={x}
                              cy={y}
                              r={activePoint === idx ? 6 : 3.5}
                              fill={activePoint === idx ? '#C68A1E' : '#020403'}
                              stroke="#C68A1E"
                              strokeWidth="2"
                              onMouseEnter={() => setActivePoint(idx)}
                              onMouseLeave={() => setActivePoint(null)}
                              className="cursor-pointer transition-all duration-200"
                            />
                          </g>
                        );
                      })}

                      {/* Definitions of Gradients */}
                      <defs>
                        <linearGradient id="commGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#C68A1E" />
                          <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                        <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}

                  {/* Active Tooltip Info */}
                  <div className="h-10 flex items-center justify-between px-3.5 border-t border-[#151F18]/50 text-[10px] font-mono text-white/50">
                    {activePoint !== null ? (
                      <>
                        <span className="uppercase text-[8px] font-black tracking-wider text-nectar-gold">Detalle {projections[activePoint].label}:</span>
                        <span>Comisión Acumulada: <strong className="text-white font-bold">${projections[activePoint].cumulativeCommissions.toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN</strong></span>
                        <span>Mes Flujo: <strong className="text-white font-bold">${projections[activePoint].grossFlow.toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN</strong></span>
                      </>
                    ) : (
                      <span className="w-full text-center text-[8px] font-black uppercase tracking-widest text-white/30 animate-pulse">Pasa el cursor sobre los nodos para inspeccionar los meses</span>
                    )}
                  </div>
                </div>

                {/* Explanation text on weekly payment cash flow impact */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-[#1c2e26]/30 text-xs space-y-2">
                  <span className="text-[8px] font-black uppercase tracking-wider text-nectar-gold block">Previsión de Flujo Semanal</span>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Al diluir los cobros en parcialidades semanales de <strong className="text-white font-bold">${weeklyTicket.toLocaleString('es-MX')} MXN</strong>, la línea de ingresos se suaviza y la liquidez se estabiliza. En lugar de picos de tesorería a final de mes, el negocio recibe un goteo síncrono de efectivo constante.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-6 border-t border-[#1c2e26]/50">
                <button
                  onClick={() => {
                    setWeeklyClients(5);
                    setWeeklyTicket(1000);
                    setMonthlyClients(2);
                    setMonthlyTicket(20000);
                    setCustomQuotes(1);
                    setCustomQuoteVal(50000);
                  }}
                  className="w-full py-4 bg-[#C68A1E] text-background hover:bg-[#C68A1E]/95 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl cursor-pointer"
                >
                  Restablecer Simulador
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
