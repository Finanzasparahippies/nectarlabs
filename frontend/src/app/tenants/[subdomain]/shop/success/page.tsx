'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface OrderDetails {
  id: number;
  status: string;
  total: string;
  full_name: string;
  shipping_provider: string;
  tracking_number: string;
  tracking_url: string;
}

export default function ShopSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const subdomain = params?.subdomain as string;
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderStatus = async () => {
      if (!sessionId) {
        setErrorMsg('Falta el identificador de la sesión de pago.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/shop/order-status/?session_id=${sessionId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo recuperar la información del pedido.');
        }
        const data = await res.json();
        setOrder(data);
      } catch (err: any) {
        console.error('Error fetching order status:', err);
        setErrorMsg(err.message || 'Error al cargar los detalles de tu compra.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderStatus();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#020503] flex items-center justify-center px-6 py-12 relative overflow-hidden text-white font-sans selection:bg-[#C68A1E] selection:text-black">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#C68A1E]/10 rounded-full blur-[150px] -z-10 animate-[pulse_6s_infinite]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#10B981]/5 rounded-full blur-[150px] -z-10 animate-[pulse_6s_infinite]"></div>

      <div className="w-full max-w-xl bg-white/[0.01] border border-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl text-center space-y-8 relative group">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#C68A1E]/5 rounded-full blur-[80px] group-hover:bg-[#C68A1E]/10 transition-all duration-700 pointer-events-none"></div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-white/10 border-t-[#C68A1E] rounded-full animate-spin"></div>
            <p className="text-xs uppercase font-black tracking-widest text-white/40">Confirmando Transacción Stripe...</p>
          </div>
        ) : errorMsg ? (
          <div className="py-12 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-red-500/10">
              ⚠️
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">Detalle de Compra Incompleto</h2>
              <p className="text-xs text-white/50 leading-relaxed mt-2 max-w-sm mx-auto">
                {errorMsg}
              </p>
            </div>
            <Link 
              href={`/`}
              className="inline-block px-8 py-3.5 border border-white/10 hover:bg-white/5 text-white/80 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Regresar al Portal
            </Link>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Success Icon */}
            <div className="relative w-20 h-20 mx-auto">
              <span className="absolute inset-0 rounded-full bg-[#10B981]/20 animate-ping"></span>
              <div className="w-20 h-20 rounded-full bg-[#10B981]/10 border-2 border-[#10B981]/30 flex items-center justify-center text-4xl shadow-xl shadow-[#10B981]/10 relative z-10">
                ✔️
              </div>
            </div>

            {/* Success message details */}
            <div>
              <span className="px-3 py-1 bg-[#10B981]/10 text-[#10B981] text-[8px] font-black uppercase tracking-widest rounded-full border border-[#10B981]/20">
                Pago Procesado Correctamente
              </span>
              <h1 className="text-3xl font-black tracking-tighter text-white mt-4 uppercase">¡Gracias por tu compra!</h1>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Pedido registrado exitosamente en {subdomain.toUpperCase()}</p>
            </div>

            {/* Billing breakdown */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 text-left space-y-4">
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px]">
                <span className="text-white/40 uppercase font-black">ID del Pedido:</span>
                <span className="font-mono font-bold text-white"># {order?.id}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px]">
                <span className="text-white/40 uppercase font-black">Cliente:</span>
                <span className="font-bold text-white">{order?.full_name}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px]">
                <span className="text-white/40 uppercase font-black">Método de Envío:</span>
                <span className="font-bold text-[#C68A1E] uppercase">{order?.shipping_provider}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-white/60 uppercase font-black">Total Pagado:</span>
                <span className="text-[#C68A1E] font-mono">${parseFloat(order?.total || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
              </div>
            </div>

            {/* Local Delivery tracking section */}
            {order?.shipping_provider && order.shipping_provider.includes('Nectar Delivery') ? (
              <div className="bg-green-500/[0.02] border border-green-500/20 rounded-2xl p-6 text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/[0.02] rounded-full blur-xl"></div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-green-400">🏍️ ¡Rastreo Local Activado!</h3>
                  <p className="text-[9px] text-white/60 leading-relaxed mt-1.5 max-w-sm mx-auto">
                    Tu pedido califica para entrega local inmediata. Un repartidor de nuestra flota ecológica se encuentra preparando tu despacho. Puedes seguir su posición en vivo sobre el mapa satelital.
                  </p>
                </div>
                <Link
                  href={`/?addon=delivery-tracking`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#C68A1E] text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#C68A1E]/30 w-full cursor-pointer font-bold"
                >
                  📍 Rastrear en tiempo real
                </Link>
              </div>
            ) : (
              // Standard courier tracking details
              order?.tracking_number && (
                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 text-center space-y-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Número de Guía (Skydropx)</h3>
                    <p className="text-[10px] font-mono font-bold text-nectar-gold mt-1.5">{order.tracking_number}</p>
                  </div>
                  {order.tracking_url && (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full py-3.5 border border-white/10 hover:bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all text-center"
                    >
                      ✈️ Abrir Portal de Rastreo de Paquetería
                    </a>
                  )}
                </div>
              )
            )}

            <div className="pt-4 flex justify-center">
              <Link
                href={`/`}
                className="text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all"
              >
                ← Regresar al Inicio del Portal
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
