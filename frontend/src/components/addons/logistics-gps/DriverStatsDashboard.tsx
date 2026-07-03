'use client';

import React, { useEffect, useState } from 'react';
import { fetcher } from '../../../lib/api';

interface DeliveryOrder {
  id: number;
  recipient_name: string;
  delivery_address: string;
  status: string;
  payment_method: string;
  shipping_cost: string | number;
  created_at: string;
}

export default function DriverStatsDashboard() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetcher('/delivery/orders/driver-orders/?include_completed=true');
        setOrders(res);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error al cargar las estadísticas.');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  // Compute metrics
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');
  const failedOrders = orders.filter(o => o.status === 'FAILED');
  const transitOrders = orders.filter(o => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status));

  const totalEarnings = completedOrders.reduce((acc, o) => acc + parseFloat(String(o.shipping_cost || 0)), 0);
  
  const cashEarnings = completedOrders
    .filter(o => o.payment_method === 'CASH')
    .reduce((acc, o) => acc + parseFloat(String(o.shipping_cost || 0)), 0);

  const codiEarnings = completedOrders
    .filter(o => o.payment_method === 'CODI')
    .reduce((acc, o) => acc + parseFloat(String(o.shipping_cost || 0)), 0);

  const stripeEarnings = completedOrders
    .filter(o => o.payment_method === 'STRIPE' || !o.payment_method)
    .reduce((acc, o) => acc + parseFloat(String(o.shipping_cost || 0)), 0);

  // Group deliveries by day (last 7 days)
  const getLast7DaysStats = () => {
    const daysMap: Record<string, { count: number; earnings: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
      daysMap[label] = { count: 0, earnings: 0 };
    }

    completedOrders.forEach(o => {
      const dateLabel = new Date(o.created_at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
      if (daysMap[dateLabel] !== undefined) {
        daysMap[dateLabel].count += 1;
        daysMap[dateLabel].earnings += parseFloat(String(o.shipping_cost || 0));
      }
    });

    return Object.entries(daysMap).map(([day, val]) => ({ day, ...val }));
  };

  const weeklyData = getLast7DaysStats();
  const maxWeeklyCount = Math.max(...weeklyData.map(d => d.count), 1);

  const filteredOrdersList = orders.filter(o => {
    if (filterStatus === 'ALL') return true;
    return o.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-nectar-gold mb-4"></div>
        <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Procesando Métricas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-card-bg border border-card-border rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-nectar-gold/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10 space-y-2">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Ganancias Totales</span>
            <h3 className="text-3xl font-black text-nectar-gold font-mono">
              ${totalEarnings.toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-foreground/50">MXN</span>
            </h3>
            <p className="text-[9px] text-foreground/50 mt-1 uppercase tracking-wider font-bold">Por entregas completadas</p>
          </div>
        </div>

        <div className="p-6 bg-card-bg border border-card-border rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10 space-y-2">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Entregas Exitosas</span>
            <h3 className="text-3xl font-black text-green-400 font-mono">{completedOrders.length}</h3>
            <p className="text-[9px] text-foreground/50 mt-1 uppercase tracking-wider font-bold">Paquetes entregados</p>
          </div>
        </div>

        <div className="p-6 bg-card-bg border border-card-border rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10 space-y-2">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">En Tránsito / Pendientes</span>
            <h3 className="text-3xl font-black text-yellow-500 font-mono">{transitOrders.length}</h3>
            <p className="text-[9px] text-foreground/50 mt-1 uppercase tracking-wider font-bold">Activos en cola</p>
          </div>
        </div>

        <div className="p-6 bg-card-bg border border-card-border rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10 space-y-2">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Entregas Fallidas</span>
            <h3 className="text-3xl font-black text-red-400 font-mono">{failedOrders.length}</h3>
            <p className="text-[9px] text-foreground/50 mt-1 uppercase tracking-wider font-bold">No completadas</p>
          </div>
        </div>
      </div>

      {/* Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Earnings Breakdown */}
        <div className="lg:col-span-5 p-8 bg-card-bg border border-card-border rounded-[2.5rem] shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold">Desglose de Caja</span>
            <h3 className="text-xl font-black tracking-tight mt-1">Ganancias por Método de Pago</h3>
          </div>
          
          <div className="space-y-4">
            {/* Stripe */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-white/60">💳 Stripe (Tarjeta)</span>
                <span className="font-mono text-nectar-gold">${stripeEarnings.toFixed(2)} MXN</span>
              </div>
              <div className="w-full h-2.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-nectar-gold to-yellow-500 transition-all duration-1000"
                  style={{ width: `${totalEarnings > 0 ? (stripeEarnings / totalEarnings) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Cash */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-white/60">💵 Efectivo</span>
                <span className="font-mono text-green-400">${cashEarnings.toFixed(2)} MXN</span>
              </div>
              <div className="w-full h-2.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${totalEarnings > 0 ? (cashEarnings / totalEarnings) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* CoDi */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-white/60">📲 CoDi</span>
                <span className="font-mono text-blue-400">${codiEarnings.toFixed(2)} MXN</span>
              </div>
              <div className="w-full h-2.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-1000"
                  style={{ width: `${totalEarnings > 0 ? (codiEarnings / totalEarnings) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-[9px] leading-relaxed text-yellow-500/90 font-bold">
            ⚠️ <strong>Control de Efectivo:</strong> Asegúrate de liquidar los cobros recibidos en efectivo de manera directa con cada restaurante al finalizar tu jornada de repartos.
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="lg:col-span-7 p-8 bg-card-bg border border-card-border rounded-[2.5rem] shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold">Rendimiento</span>
            <h3 className="text-xl font-black tracking-tight mt-1">Actividad de los Últimos 7 Días</h3>
          </div>

          <div className="h-44 flex items-end justify-between gap-2.5 pt-4">
            {weeklyData.map((d, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 bg-background border border-card-border px-2 py-1 rounded text-[8px] font-mono text-nectar-gold transition-all duration-200 pointer-events-none transform -translate-y-1">
                  ${d.earnings.toFixed(0)} MXN
                </div>
                
                {/* Bar */}
                <div className="w-full bg-background rounded-t-xl overflow-hidden h-28 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-nectar-gold/60 to-nectar-gold rounded-t-xl group-hover:scale-y-105 transition-all duration-500 origin-bottom"
                    style={{ height: `${(d.count / maxWeeklyCount) * 100}%` }}
                  ></div>
                </div>

                <span className="text-[8px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-6">
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold">Bitácora</span>
            <h3 className="text-xl font-black tracking-tight mt-1">Historial de Entregas</h3>
          </div>
          
          <div className="flex items-center space-x-2 bg-background p-1.5 rounded-2xl border border-card-border">
            {['ALL', 'DELIVERED', 'FAILED', 'IN_TRANSIT'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-250 cursor-pointer ${
                  filterStatus === status
                    ? 'bg-nectar-gold text-background shadow-md shadow-nectar-gold/15 scale-105'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {status === 'ALL' ? 'Todos' : status === 'DELIVERED' ? 'Completado' : status === 'FAILED' ? 'Fallido' : 'En camino'}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-wider rounded-2xl text-center">
            {errorMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-card-border/60 text-white/40 uppercase tracking-widest font-black text-[8px]">
                <th className="py-4 pl-4">ID Pedido</th>
                <th className="py-4">Destinatario</th>
                <th className="py-4">Dirección</th>
                <th className="py-4">Método Pago</th>
                <th className="py-4">Ganancia Envío</th>
                <th className="py-4 pr-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrdersList.map((o) => (
                <tr key={o.id} className="border-b border-card-border/40 hover:bg-white/[0.01] transition-colors">
                  <td className="py-4 pl-4 font-mono font-bold text-nectar-gold">#{o.id}</td>
                  <td className="py-4 font-bold text-white">{o.recipient_name}</td>
                  <td className="py-4 text-white/70 max-w-xs truncate">{o.delivery_address}</td>
                  <td className="py-4 font-bold">
                    <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider ${
                      o.payment_method === 'CASH'
                        ? 'bg-green-500/10 text-green-400'
                        : o.payment_method === 'CODI'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {o.payment_method === 'CASH' ? 'Efectivo' : o.payment_method === 'CODI' ? 'CoDi' : 'Stripe'}
                    </span>
                  </td>
                  <td className="py-4 font-mono font-bold">${parseFloat(String(o.shipping_cost || 0)).toFixed(2)} MXN</td>
                  <td className="py-4 pr-4 text-right">
                    <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                      o.status === 'DELIVERED'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : o.status === 'FAILED'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {o.status === 'DELIVERED' ? 'Completado' : o.status === 'FAILED' ? 'Fallido' : 'En camino'}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredOrdersList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                    No hay entregas en esta sección
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
