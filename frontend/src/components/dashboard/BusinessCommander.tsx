import React from 'react';
import { DollarSign, Cpu, ArrowUpRight, TrendingUp } from 'lucide-react';

interface Financials {
  gross_sales: number;
  total_costs: number;
  net_profit: number;
  margin: number;
}

interface BillingItem {
  id: number;
  client?: string;
  provider?: string;
  plan?: string;
  name?: string;
  amount: number;
  next_payment_date: string;
  days_remaining: number;
  status: 'overdue' | 'upcoming' | 'paid';
}

interface TrendPoint {
  month: string;
  sales: number;
  costs: number;
  profit: number;
}

interface BusinessCommanderProps {
  stats: {
    financials: Financials;
    client_billing: BillingItem[];
    server_billing: BillingItem[];
    monthly_trend: TrendPoint[];
  } | null;
}

export default function BusinessCommander({ stats }: BusinessCommanderProps) {
  if (!stats) return (
    <div className="py-20 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Cargando Analíticas Consolidadas...</p>
    </div>
  );

  const { financials, client_billing, server_billing, monthly_trend } = stats;

  // Determinar los puntos de coordenadas para el gráfico SVG
  const maxSales = Math.max(...monthly_trend.map(t => t.sales)) || 1000;
  const padding = 40;
  const chartHeight = 180;
  const chartWidth = 500;
  
  const getCoordinates = (type: 'sales' | 'costs') => {
    return monthly_trend.map((point, index) => {
      const x = padding + (index * (chartWidth - padding * 2)) / (monthly_trend.length - 1);
      const val = type === 'sales' ? point.sales : point.costs;
      const y = chartHeight - padding - (val * (chartHeight - padding * 2)) / maxSales;
      return `${x},${y}`;
    }).join(' ');
  };

  const salesPoints = getCoordinates('sales');
  const costsPoints = getCoordinates('costs');

  return (
    <div className="space-y-16">
      {/* 4 Financial Cards (Los Placosones inspired, Nectar styled) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-fadeIn">
        {/* Ventas Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-nectar-gold/5 blur-2xl rounded-full"></div>
          <div className="flex justify-between items-start mb-6">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Ventas Consolidadas</span>
            <div className="w-8 h-8 rounded-xl bg-nectar-gold/10 text-nectar-gold flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black tracking-tight mb-2">
            ${financials.gross_sales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">
            Ingresos por Contratos MRR + Ventas Tienda
          </p>
        </div>

        {/* Costos Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-foreground/5 blur-2xl rounded-full"></div>
          <div className="flex justify-between items-start mb-6">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Costos Operativos</span>
            <div className="w-8 h-8 rounded-xl bg-foreground/5 text-foreground opacity-60 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black tracking-tight mb-2">
            ${financials.total_costs.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">
            Suma de Servidores y Licencias Prorrateadas
          </p>
        </div>

        {/* Utilidad Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full"></div>
          <div className="flex justify-between items-start mb-6">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Utilidad Neta</span>
            <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black tracking-tight mb-2 text-green-400">
            ${financials.net_profit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">
            Margen Neto Mensual Consolidado
          </p>
        </div>

        {/* Margen Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-nectar-gold/5 blur-2xl rounded-full"></div>
          <div className="flex justify-between items-start mb-6">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Eficiencia Operativa</span>
            <div className="w-8 h-8 rounded-xl bg-nectar-gold/15 text-nectar-gold flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black tracking-tight mb-2 text-nectar-gold">
            {financials.margin.toFixed(1)}%
          </h3>
          <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">
            Retorno de Ganancia por cada Dólar Cobrado
          </p>
        </div>
      </div>

      {/* SVG Interactive Trend Chart */}
      <section className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30 mb-8">Tendencia Financiera Trimestral</h3>
        <div className="relative">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64 overflow-visible">
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E2B355" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#E2B355" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="var(--card-border)" strokeOpacity="0.2" strokeDasharray="4 4" />
            <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--card-border)" strokeOpacity="0.4" />

            {/* Sales Area & Line (Gold) */}
            <path
              d={`M ${padding},${chartHeight - padding} L ${salesPoints} L ${chartWidth - padding},${chartHeight - padding} Z`}
              fill="url(#salesGrad)"
            />
            <polyline
              fill="none"
              stroke="#E2B355"
              strokeWidth="3"
              points={salesPoints}
            />

            {/* Costs Line (White) */}
            <polyline
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="2"
              strokeOpacity="0.5"
              strokeDasharray="3 3"
              points={costsPoints}
            />

            {/* Interactive Data Dots & Labels */}
            {monthly_trend.map((point, idx) => {
              const x = padding + (idx * (chartWidth - padding * 2)) / (monthly_trend.length - 1);
              const salesY = chartHeight - padding - (point.sales * (chartHeight - padding * 2)) / maxSales;
              const costsY = chartHeight - padding - (point.costs * (chartHeight - padding * 2)) / maxSales;

              return (
                <g key={idx} className="group/dot">
                  {/* Sales Dot */}
                  <circle cx={x} cy={salesY} r="5" fill="#E2B355" className="hover:scale-150 transition-transform cursor-pointer" />
                  {/* Costs Dot */}
                  <circle cx={x} cy={costsY} r="4.5" fill="var(--foreground)" fillOpacity="0.8" className="hover:scale-150 transition-transform cursor-pointer" />
                  
                  {/* Month Label */}
                  <text x={x} y={chartHeight - 12} textAnchor="middle" fill="var(--foreground)" fillOpacity="0.4" className="text-[8px] font-black uppercase tracking-wider">
                    {point.month}
                  </text>
                  
                  {/* Sales Value Pop */}
                  <text x={x} y={salesY - 10} textAnchor="middle" fill="#E2B355" className="text-[7px] font-black opacity-0 group-hover/dot:opacity-100 transition-opacity bg-background px-1 rounded">
                    ${Math.round(point.sales)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Chart Legend */}
          <div className="flex gap-8 justify-center mt-6 text-[8px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-[#E2B355]"></div>
              <span className="opacity-80">Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-foreground border-dashed border-t-2"></div>
              <span className="opacity-50">Costos de Infraestructura</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cashflow Calendar Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        {/* Clients Billing */}
        <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg">
          <div className="mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Facturación Contractual</h3>
            <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Próximos cobros a clientes por planes activos</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4">Cliente</th>
                  <th className="pb-4 text-right">Monto</th>
                  <th className="pb-4 text-center">Vence</th>
                  <th className="pb-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {client_billing.map(billing => (
                  <tr key={billing.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                    <td className="py-4 pr-4">
                      <h4 className="font-black text-sm">{billing.client}</h4>
                      <p className="text-[7px] font-bold text-nectar-gold uppercase tracking-wider mt-0.5">{billing.plan}</p>
                    </td>
                    <td className="py-4 text-right font-bold text-sm">
                      ${billing.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 text-center text-[10px] font-bold opacity-60">
                      {new Date(billing.next_payment_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="py-4 text-right">
                      {billing.status === 'overdue' ? (
                        <span className="px-3 py-1.5 bg-red-500/10 text-red-500 text-[7px] font-black uppercase tracking-widest rounded-full animate-pulse">Vencido</span>
                      ) : billing.status === 'upcoming' ? (
                        <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-[7px] font-black uppercase tracking-widest rounded-full">En {billing.days_remaining} días</span>
                      ) : (
                        <span className="px-3 py-1.5 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full">Al día</span>
                      )}
                    </td>
                  </tr>
                ))}
                {client_billing.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                      Sin cobros contractuales pendientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Server Infrastructure Cost Vencimientos */}
        <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg">
          <div className="mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Vencimiento de Infraestructura</h3>
            <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Fechas límites de pago para servidores y servicios</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4">Infraestructura</th>
                  <th className="pb-4 text-right">Costo</th>
                  <th className="pb-4 text-center">Vence</th>
                  <th className="pb-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {server_billing.map(billing => (
                  <tr key={billing.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                    <td className="py-4 pr-4">
                      <h4 className="font-black text-sm">{billing.name}</h4>
                      <p className="text-[7px] font-bold text-nectar-gold uppercase tracking-wider mt-0.5">{billing.provider}</p>
                    </td>
                    <td className="py-4 text-right font-bold text-sm">
                      ${billing.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 text-center text-[10px] font-bold opacity-60">
                      {new Date(billing.next_payment_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="py-4 text-right">
                      {billing.status === 'overdue' ? (
                        <span className="px-3 py-1.5 bg-red-500/10 text-red-500 text-[7px] font-black uppercase tracking-widest rounded-full animate-pulse">Expirado</span>
                      ) : billing.status === 'upcoming' ? (
                        <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-[7px] font-black uppercase tracking-widest rounded-full">Por pagar</span>
                      ) : (
                        <span className="px-3 py-1.5 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full">Al día</span>
                      )}
                    </td>
                  </tr>
                ))}
                {server_billing.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                      Sin vencimientos de servidores registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
