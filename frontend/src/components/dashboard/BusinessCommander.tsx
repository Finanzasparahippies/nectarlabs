import React, { useState, useEffect } from 'react';
import { fetcher, API_URL } from '@/lib/api';

const getMediaUrl = (url?: string) => {
  if (!url) return '';
  let path = url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/media/')) {
        path = parsed.pathname;
      } else {
        return url;
      }
    } catch (e) {
      return url;
    }
  }
  return path;
};

interface Financials {
  gross_sales: number;
  contracts_mrr: number;
  paid_orders_total: number;
  designer_fees: number;
  total_costs: number;
  servers_total: number;
  expenses_total: number;
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
  installments: any[];
  setInstallments: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function BusinessCommander({ stats, installments, setInstallments }: BusinessCommanderProps) {
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [cfdiInputs, setCfdiInputs] = useState<Record<number, string>>({});

  // Sales Admin Panel state
  const [commissions, setCommissions] = useState<any[]>([]);
  const [commissionSummary, setCommissionSummary] = useState<any | null>(null);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [togglingUser, setTogglingUser] = useState<number | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);

  useEffect(() => {
    const loadSalesData = async () => {
      try {
        const [commissionsData, summaryData, promoData, usersData] = await Promise.all([
          fetcher('/sales-commissions/').catch(() => []),
          fetcher('/sales-commissions/summary/').catch(() => null),
          fetcher('/promo-codes/').catch(() => []),
          fetcher('/users/').catch(() => []),
        ]);
        setCommissions(Array.isArray(commissionsData) ? commissionsData : []);
        setCommissionSummary(summaryData);
        setPromoCodes(Array.isArray(promoData) ? promoData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error('Error loading sales data:', err);
      } finally {
        setSalesLoading(false);
      }
    };
    loadSalesData();
  }, []);

  const handleToggleApproval = async (userId: number, currentApproved: boolean) => {
    setTogglingUser(userId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/${userId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_approved_seller: !currentApproved })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al actualizar el estado de aprobación');
      }
      const updated = await response.json();
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado del vendedor.');
    } finally {
      setTogglingUser(null);
    }
  };

  const handleMarkCommissionPaid = async (commissionId: number) => {
    setMarkingPaid(commissionId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/sales-commissions/${commissionId}/mark-paid/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Error al marcar como pagada');
      }
      const updated = await response.json();
      setCommissions(prev => prev.map(c => c.id === commissionId ? updated : c));
      // Refresh summary
      const newSummary = await fetcher('/sales-commissions/summary/').catch(() => null);
      setCommissionSummary(newSummary);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar comisión.');
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleUpdateInstallmentStatus = async (installmentId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const origin = window.location.origin;
      const API_URL = origin.includes("github.dev") 
        ? origin.replace("-3000", "-8080").replace("-3002", "-8080") + "/api"
        : "/api";
      
      const response = await fetch(`${API_URL}/installments/${installmentId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          paid_at: newStatus === 'PAID' ? new Date().toISOString() : null
        })
      });
      
      if (!response.ok) throw new Error("Status update failed");
      const updated = await response.json();
      setInstallments(prev => prev.map(inst => inst.id === installmentId ? updated : inst));
      alert(`Estado de la mensualidad actualizado a ${newStatus === 'PAID' ? 'PAGADO' : newStatus === 'CANCELLED' ? 'CANCELADO' : 'PENDIENTE'}.`);
    } catch (err) {
      alert("Error al actualizar el estado de la mensualidad.");
    }
  };

  const handleSaveCFDI = async (installmentId: number) => {
    const uuid = cfdiInputs[installmentId] || "";
    if (!uuid.trim()) return alert("Por favor ingresa un folio fiscal válido.");
    
    try {
      const token = localStorage.getItem('token');
      const origin = window.location.origin;
      const API_URL = origin.includes("github.dev") 
        ? origin.replace("-3000", "-8080").replace("-3002", "-8080") + "/api"
        : "/api";
      
      const response = await fetch(`${API_URL}/installments/${installmentId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cfdi_uuid: uuid })
      });
      
      if (!response.ok) throw new Error("CFDI update failed");
      const updated = await response.json();
      setInstallments(prev => prev.map(inst => inst.id === installmentId ? updated : inst));
      alert("Folio Fiscal / CFDI guardado con éxito.");
    } catch (err) {
      alert("Error al guardar Folio Fiscal.");
    }
  };

  if (!stats) return (
    <div className="py-20 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Cargando Analíticas Consolidadas...</p>
    </div>
  );

  const { financials, client_billing, server_billing, monthly_trend } = stats;
  const salesPeople = users.filter((u: any) => u.role === 'SALES');

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
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-nectar-gold/5 blur-2xl rounded-full"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Ventas Consolidadas</span>
              <div className="w-8 h-8 rounded-xl bg-nectar-gold/10 text-nectar-gold flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-black tracking-tight mb-2">
              ${financials.gross_sales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider mb-6">
              Ingresos Consolidados de Néctar Labs
            </p>
          </div>
          
          {/* Desglose de Ventas */}
          <div className="pt-4 border-t border-card-border/40 grid grid-cols-3 gap-2 text-[8px] font-black uppercase tracking-wider">
            <div>
              <p className="opacity-30 mb-1">Contratos MRR</p>
              <p className="text-foreground/90 font-black">${(financials.contracts_mrr || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="opacity-30 mb-1">Ventas Tienda</p>
              <p className="text-foreground/90 font-black">${(financials.paid_orders_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-amber-400">
              <p className="opacity-40 mb-1">Diseñador (Transitorio)</p>
              <p className="font-black">${(financials.designer_fees || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Costos Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-foreground/5 blur-2xl rounded-full"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Costos Operativos</span>
              <div className="w-8 h-8 rounded-xl bg-foreground/5 text-foreground opacity-60 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                  <rect x="9" y="9" width="6" height="6"></rect>
                  <line x1="9" y1="1" x2="9" y2="4"></line>
                  <line x1="15" y1="1" x2="15" y2="4"></line>
                  <line x1="9" y1="20" x2="9" y2="23"></line>
                  <line x1="15" y1="20" x2="15" y2="23"></line>
                  <line x1="20" y1="9" x2="23" y2="9"></line>
                  <line x1="20" y1="15" x2="23" y2="15"></line>
                  <line x1="1" y1="9" x2="4" y2="9"></line>
                  <line x1="1" y1="15" x2="4" y2="15"></line>
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-black tracking-tight mb-2">
              ${financials.total_costs.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider mb-6">
              Costos Operativos Mensualizados
            </p>
          </div>

          {/* Desglose de Costos */}
          <div className="pt-4 border-t border-card-border/40 grid grid-cols-2 gap-4 text-[9px] font-bold uppercase tracking-wider">
            <div>
              <p className="opacity-30 mb-1">Servidores</p>
              <p className="text-foreground/90 font-black">${(financials.servers_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="opacity-30 mb-1">SaaS / Licencias</p>
              <p className="text-foreground/90 font-black">${(financials.expenses_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Utilidad Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg min-h-[220px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Utilidad Neta</span>
              <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="7" y1="17" x2="17" y2="7"></line>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-black tracking-tight mb-2 text-green-400">
              ${financials.net_profit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">
              Margen Neto Mensual Consolidado
            </p>
          </div>
          <div className="text-[9px] font-bold text-foreground/25 uppercase tracking-wider pt-4 border-t border-card-border/20">
            Fórmula: Ingresos - Costos
          </div>
        </div>

        {/* Margen Card */}
        <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border hover:border-nectar-gold/60 transition-all duration-500 relative overflow-hidden group shadow-lg min-h-[220px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-nectar-gold/5 blur-2xl rounded-full"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Eficiencia Operativa</span>
              <div className="w-8 h-8 rounded-xl bg-nectar-gold/15 text-nectar-gold flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-black tracking-tight mb-2 text-nectar-gold">
              {financials.margin.toFixed(1)}%
            </h3>
            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">
              Retorno de Ganancia por cada Dólar Cobrado
            </p>
          </div>
          <div className="text-[9px] font-bold text-foreground/25 uppercase tracking-wider pt-4 border-t border-card-border/20">
            Fórmula: (Utilidad / Ingresos) * 100
          </div>
        </div>
      </div>

      {/* SVG Interactive Trend Chart */}
      <section className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Tendencia Financiera Trimestral</h3>
          
          {/* Instrucción visual */}
          <span className="text-[8px] font-black text-nectar-gold uppercase tracking-widest bg-nectar-gold/5 px-3 py-1 rounded-full">
            Desliza el cursor para explorar
          </span>
        </div>

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

            {/* Hover Vertical Guideline Tracker */}
            {activePoint !== null && (
              <line
                x1={padding + (activePoint * (chartWidth - padding * 2)) / (monthly_trend.length - 1)}
                y1={padding - 10}
                x2={padding + (activePoint * (chartWidth - padding * 2)) / (monthly_trend.length - 1)}
                y2={chartHeight - padding}
                stroke="#E2B355"
                strokeWidth="1.5"
                strokeOpacity="0.2"
                strokeDasharray="3 3"
                className="transition-all duration-150 ease-out"
              />
            )}

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

            {/* Static & Hover Highlighted Dots */}
            {monthly_trend.map((point, idx) => {
              const x = padding + (idx * (chartWidth - padding * 2)) / (monthly_trend.length - 1);
              const salesY = chartHeight - padding - (point.sales * (chartHeight - padding * 2)) / maxSales;
              const costsY = chartHeight - padding - (point.costs * (chartHeight - padding * 2)) / maxSales;

              const isActive = activePoint === idx;

              return (
                <g key={idx}>
                  {/* Sales Dot */}
                  <circle
                    cx={x}
                    cy={salesY}
                    r={isActive ? 7 : 4}
                    fill="#E2B355"
                    className="transition-all duration-300 pointer-events-none"
                  />
                  {/* Costs Dot */}
                  <circle
                    cx={x}
                    cy={costsY}
                    r={isActive ? 6 : 3}
                    fill="var(--foreground)"
                    fillOpacity={isActive ? 1.0 : 0.6}
                    className="transition-all duration-300 pointer-events-none"
                  />
                  
                  {/* Month Label */}
                  <text 
                    x={x} 
                    y={chartHeight - 12} 
                    textAnchor="middle" 
                    fill="var(--foreground)" 
                    fillOpacity={isActive ? 0.9 : 0.3} 
                    className="text-[8px] font-black uppercase tracking-wider transition-all duration-300"
                  >
                    {point.month}
                  </text>
                </g>
              );
            })}

            {/* Hover Interactive Zones */}
            {monthly_trend.map((point, idx) => {
              const sliceWidth = (chartWidth - padding * 2) / (monthly_trend.length - 1);
              const x = padding + (idx * (chartWidth - padding * 2)) / (monthly_trend.length - 1);
              return (
                <rect
                  key={`hit-${idx}`}
                  x={x - sliceWidth / 2}
                  y={padding - 10}
                  width={sliceWidth}
                  height={chartHeight - padding * 2 + 20}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setActivePoint(idx)}
                  onMouseMove={() => setActivePoint(idx)}
                  onMouseLeave={() => setActivePoint(null)}
                />
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

          {/* Unified Hover Tooltip Card */}
          {activePoint !== null && (
            <div className="absolute top-4 right-4 bg-card-bg/95 backdrop-blur-md border border-card-border p-5 rounded-3xl shadow-2xl text-[9px] font-black uppercase tracking-widest space-y-2.5 z-30 pointer-events-none animate-fadeIn border-nectar-gold/30">
              <div className="flex justify-between items-center gap-6 border-b border-card-border/50 pb-2">
                <span className="text-nectar-gold font-black">Periodo</span>
                <span className="text-foreground">{monthly_trend[activePoint].month}</span>
              </div>
              <div className="flex justify-between gap-10">
                <span className="opacity-40">Ingresos</span>
                <span className="text-foreground">${Math.round(monthly_trend[activePoint].sales).toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between gap-10">
                <span className="opacity-40">Costos</span>
                <span className="text-foreground">${Math.round(monthly_trend[activePoint].costs).toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between gap-10 pt-2 border-t border-card-border/50 text-green-400">
                <span>Utilidad</span>
                <span>${Math.round(monthly_trend[activePoint].sales - monthly_trend[activePoint].costs).toLocaleString('es-MX')}</span>
              </div>
            </div>
          )}
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

      {/* Control de Mensualidades y Emisión de CFDI (SAT) */}
      <section className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-10 shadow-lg mt-12">
        <div className="mb-8">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Control de Mensualidades y Emisión de CFDI (SAT)</h3>
          <p className="text-[9px] font-bold text-foreground/40 mt-1 uppercase tracking-wider">Validación de comprobantes SPEI/Depósitos y registro de Facturas timbradas</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                <th className="pb-4">Contrato / Mes</th>
                <th className="pb-4 text-right">Monto</th>
                <th className="pb-4 text-center">Vencimiento</th>
                <th className="pb-4 text-center">Comprobante</th>
                <th className="pb-4 text-center">Estatus</th>
                <th className="pb-4 text-right">Facturación CFDI (SAT)</th>
              </tr>
            </thead>
            <tbody>
              {installments.map(inst => (
                <tr key={inst.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                  <td className="py-4 pr-4">
                    <h4 className="font-black text-sm">Contrato #{inst.contract}</h4>
                    {inst.client_name && (
                      <p className="text-[9px] font-black text-foreground mt-0.5">{inst.client_name}</p>
                    )}
                    {inst.project_name && (
                      <p className="text-[8px] font-bold text-nectar-gold opacity-80 mt-0.5">{inst.project_name}</p>
                    )}
                    <p className="text-[7px] font-bold text-white/40 uppercase tracking-wider mt-1">Mensualidad {inst.installment_number} de 6</p>
                  </td>
                  <td className="py-4 text-right font-bold text-sm">
                    ${parseFloat(inst.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 text-center text-[10px] font-bold opacity-60">
                    {inst.due_date}
                  </td>
                  <td className="py-4 text-center">
                    {inst.receipt_file ? (
                      <a 
                        href={getMediaUrl(inst.receipt_file)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-nectar-gold/10 text-nectar-gold hover:bg-nectar-gold hover:text-background text-[8px] font-black uppercase tracking-widest rounded-full transition-all inline-block"
                      >
                        Ver Comprobante
                      </a>
                    ) : (
                      <span className="text-[8px] opacity-35 font-bold uppercase">No cargado</span>
                    )}
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <select
                        value={inst.status}
                        onChange={(e) => handleUpdateInstallmentStatus(inst.id, e.target.value)}
                        className={`px-2.5 py-1 text-[7px] font-black uppercase tracking-wider rounded-full bg-background border focus:outline-none cursor-pointer transition-colors ${
                          inst.status === 'PAID' 
                            ? 'border-green-500/30 text-green-500 bg-green-500/5' 
                            : inst.status === 'CANCELLED'
                            ? 'border-red-500/30 text-red-500 bg-red-500/5'
                            : inst.receipt_file 
                            ? 'border-orange-500/30 text-orange-500 bg-orange-500/5' 
                            : 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5'
                        }`}
                      >
                        <option value="PENDING" className="text-yellow-500">Pendiente</option>
                        <option value="PAID" className="text-green-500">Pagado</option>
                        <option value="CANCELLED" className="text-red-500">Cancelado</option>
                      </select>
                      {inst.status !== 'PAID' && inst.receipt_file && (
                        <button
                          onClick={() => handleUpdateInstallmentStatus(inst.id, 'PAID')}
                          className="mt-1 px-2 py-0.5 bg-green-600 hover:bg-green-500 text-white text-[7px] font-black uppercase tracking-widest rounded-md hover:scale-105 active:scale-95 transition-all shadow-sm"
                        >
                          Aprobar Pago
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    {inst.cfdi_uuid ? (
                      <div className="text-right">
                        <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[7px] font-black uppercase tracking-widest rounded-full">Timbrada</span>
                        <p className="text-[7px] font-mono text-foreground/45 mt-1 select-all">{inst.cfdi_uuid}</p>
                      </div>
                    ) : (
                      <div className="flex justify-end items-center gap-2">
                        <input
                          type="text"
                          placeholder="UUID CFDI 4.0"
                          value={cfdiInputs[inst.id] || ""}
                          onChange={(e) => setCfdiInputs(prev => ({ ...prev, [inst.id]: e.target.value }))}
                          className="bg-background border border-card-border rounded-lg px-3 py-1.5 text-[8px] font-mono focus:outline-none focus:border-nectar-gold w-40 text-foreground"
                        />
                        <button
                          onClick={() => handleSaveCFDI(inst.id)}
                          className="px-3 py-1.5 bg-nectar-gold text-background text-[7px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all"
                        >
                          Guardar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {installments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                    Sin mensualidades generadas en el sistema
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── ADMIN SALES COMMAND CENTER ── */}
      <section id="ventas-section" className="space-y-10">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-1">Panel de Ventas</h2>
          <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-wider">Control global de vendedores, comisiones y códigos de referido</p>
        </div>

        {/* Sales KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-3xl rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Comisiones Pagadas</span>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-green-400 font-mono">
              ${((commissionSummary?.paid_total) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              <span className="text-[9px] font-bold opacity-50 ml-1">MXN</span>
            </h3>
            <p className="text-[9px] text-foreground/40 mt-1 uppercase tracking-wider font-bold">Liquidadas a vendedores</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-3xl rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Comisiones Pendientes</span>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-yellow-400 font-mono">
              ${((commissionSummary?.pending_total) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              <span className="text-[9px] font-bold opacity-50 ml-1">MXN</span>
            </h3>
            <p className="text-[9px] text-foreground/40 mt-1 uppercase tracking-wider font-bold">Por liquidar a vendedores</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-nectar-gold/5 blur-3xl rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Contratos Referidos</span>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-nectar-gold font-mono">
              {commissionSummary?.referred_contracts_count ?? 0}
              <span className="text-[9px] font-bold opacity-50 ml-1">Contratos</span>
            </h3>
            <p className="text-[9px] text-foreground/40 mt-1 uppercase tracking-wider font-bold">Adquiridos por vendedores</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-card-bg border border-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Vendedores Activos</span>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-blue-400 font-mono">
              {commissionSummary?.active_sellers ?? 0}
              <span className="text-[9px] font-bold opacity-50 ml-1">SALES</span>
            </h3>
            <p className="text-[9px] text-foreground/40 mt-1 uppercase tracking-wider font-bold">Usuarios con rol vendedor</p>
          </div>
        </div>

        {/* Gestión de Vendedores Table */}
        <div className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl">
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Gestión de Vendedores</h3>
              <p className="text-[9px] font-bold text-foreground/30 mt-1 uppercase tracking-wider">Aprobación y métricas de desempeño de vendedores</p>
            </div>
            <span className="px-4 py-1.5 bg-foreground/5 rounded-full text-[8px] font-black uppercase tracking-widest opacity-50">
              {salesPeople.length} vendedores registrados
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4">Email Vendedor</th>
                  <th className="pb-4 text-center">Código Referido</th>
                  <th className="pb-4 text-center">Usos / Referidos</th>
                  <th className="pb-4 text-right">Pendientes</th>
                  <th className="pb-4 text-right">Cobradas</th>
                  <th className="pb-4 text-center">Estatus</th>
                  <th className="pb-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {salesPeople.map((u: any) => {
                  const userCode = promoCodes.find((p: any) => p.referrer === u.id && p.code_type === 'SELLER');
                  const referredCount = userCode ? userCode.used_count : 0;
                  const userCommissions = commissions.filter((c: any) => c.salesperson === u.id);
                  const paidTotal = userCommissions.filter((c: any) => c.status === 'PAID').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                  const pendingTotal = userCommissions.filter((c: any) => c.status === 'PENDING').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                  const isApproved = !!u.is_approved_seller;

                  return (
                    <tr key={u.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                      <td className="py-3.5">
                        <span className="font-black text-[10px] text-foreground">{u.username}</span>
                        <p className="text-[8px] text-foreground/45 font-mono">{u.email}</p>
                      </td>
                      <td className="py-3.5 text-center">
                        {userCode ? (
                          <span className="font-mono font-black text-sm text-nectar-gold tracking-widest">{userCode.code}</span>
                        ) : (
                          <span className="text-[8px] text-foreground/30 italic font-bold">Sin Código</span>
                        )}
                      </td>
                      <td className="py-3.5 text-center font-mono font-bold text-xs">{referredCount}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-[11px] text-yellow-500">
                        ${pendingTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-[11px] text-green-400">
                        ${paidTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-center">
                        {isApproved ? (
                          <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-green-500/20">Aprobado</span>
                        ) : (
                          <span className="px-3 py-1 bg-red-500/10 text-red-400 text-[7px] font-black uppercase tracking-widest rounded-full border border-red-500/20">Pendiente</span>
                        )}
                      </td>
                      <td className="py-3.5 text-center">
                        <button
                          onClick={() => handleToggleApproval(u.id, isApproved)}
                          disabled={togglingUser === u.id}
                          className={`px-4 py-1.5 text-[7px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 font-bold ${
                            isApproved 
                              ? 'bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 text-red-400' 
                              : 'bg-green-950/40 border border-green-500/30 hover:bg-green-900/40 text-green-400'
                          }`}
                        >
                          {togglingUser === u.id ? '...' : (isApproved ? 'Revocar' : 'Aprobar')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {salesPeople.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                      No hay vendedores registrados en el sistema
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commissions Table */}
        <div className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Historial de Comisiones</h3>
              <p className="text-[9px] font-bold text-foreground/30 mt-1 uppercase tracking-wider">Todas las comisiones generadas por ventas referidas</p>
            </div>
            <span className="px-4 py-1.5 bg-foreground/5 rounded-full text-[8px] font-black uppercase tracking-widest opacity-50">
              {commissions.length} registros
            </span>
          </div>
          {salesLoading ? (
            <div className="py-10 flex justify-center">
              <div className="w-8 h-8 border-2 border-nectar-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4">Vendedor</th>
                  <th className="pb-4">Cliente</th>
                  <th className="pb-4 text-center">Plan</th>
                  <th className="pb-4 text-center">Mensualidad</th>
                  <th className="pb-4 text-center">Vencimiento</th>
                  <th className="pb-4 text-right">Monto Pagado</th>
                  <th className="pb-4 text-center">Comisión %</th>
                  <th className="pb-4 text-right">Tu Pago</th>
                  <th className="pb-4 text-center">Estado</th>
                  <th className="pb-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((comm) => (
                  <tr key={comm.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                    <td className="py-3.5">
                      <div>
                        <span className="font-black text-[10px] text-foreground">{comm.salesperson_email?.split('@')[0]}</span>
                        <p className="text-[8px] text-foreground/40 font-mono">{comm.salesperson_email}</p>
                      </div>
                    </td>
                    <td className="py-3.5 font-bold text-[11px] text-foreground/80">{comm.client_name}</td>
                    <td className="py-3.5 text-center">
                      <span className="px-2 py-0.5 bg-foreground/5 rounded-full text-[8px] font-black uppercase tracking-wider text-foreground/50">{comm.plan_name}</span>
                    </td>
                    <td className="py-3.5 text-center font-mono font-bold text-xs text-foreground/70">#{comm.installment_number}</td>
                    <td className="py-3.5 text-center text-[10px] font-bold text-foreground/50">
                      {comm.due_date ? new Date(comm.due_date + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-[11px]">
                      ${parseFloat(comm.installment_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 text-center font-mono font-black text-sm text-nectar-gold">
                      {parseFloat(comm.commission_percentage)}%
                    </td>
                    <td className="py-3.5 text-right font-mono font-black text-sm text-white">
                      ${parseFloat(comm.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 text-center">
                      {comm.status === 'PAID' ? (
                        <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-green-500/20">Pagada</span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[7px] font-black uppercase tracking-widest rounded-full border border-yellow-500/20">Pendiente</span>
                      )}
                    </td>
                    <td className="py-3.5 text-center">
                      {comm.status === 'PENDING' ? (
                        <button
                          onClick={() => handleMarkCommissionPaid(comm.id)}
                          disabled={markingPaid === comm.id}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[7px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {markingPaid === comm.id ? '...' : 'Marcar Pagada'}
                        </button>
                      ) : (
                        <span className="text-[8px] text-foreground/20 font-black">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {commissions.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                      Sin comisiones registradas en el sistema
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Promo Codes Table */}
        <div className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Códigos de Referido</h3>
              <p className="text-[9px] font-bold text-foreground/30 mt-1 uppercase tracking-wider">Todos los códigos del sistema — SELLER y CLIENT</p>
            </div>
            <span className="px-4 py-1.5 bg-foreground/5 rounded-full text-[8px] font-black uppercase tracking-widest opacity-50">
              {promoCodes.length} códigos
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4">Código</th>
                  <th className="pb-4 text-center">Tipo</th>
                  <th className="pb-4">Referidor</th>
                  <th className="pb-4 text-center">Descuento</th>
                  <th className="pb-4 text-center">Usos</th>
                  <th className="pb-4 text-center">Límite</th>
                  <th className="pb-4 text-center">Estado</th>
                  <th className="pb-4 text-right">Creado</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((code) => (
                  <tr key={code.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                    <td className="py-3.5">
                      <span className="font-mono font-black text-sm text-nectar-gold tracking-widest">{code.code}</span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`px-3 py-1 text-[7px] font-black uppercase tracking-widest rounded-full border ${
                        code.code_type === 'SELLER'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {code.code_type === 'SELLER' ? '🏷️ Vendedor' : '👥 Cliente'}
                      </span>
                    </td>
                    <td className="py-3.5 text-[10px] font-bold text-foreground/60">{code.referrer_email || '—'}</td>
                    <td className="py-3.5 text-center font-mono font-black text-sm text-nectar-gold">{parseFloat(code.discount_percentage)}%</td>
                    <td className="py-3.5 text-center font-mono font-bold text-sm">{code.used_count}</td>
                    <td className="py-3.5 text-center text-[10px] font-bold text-foreground/50">{code.max_uses ?? '∞'}</td>
                    <td className="py-3.5 text-center">
                      <span className={`px-3 py-1 text-[7px] font-black uppercase tracking-widest rounded-full border ${
                        code.is_active
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {code.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-[9px] font-bold text-foreground/40">
                      {new Date(code.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {promoCodes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                      Sin códigos de referido registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
