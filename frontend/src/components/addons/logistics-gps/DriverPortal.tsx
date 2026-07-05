'use client';

import React, { useEffect, useState, useRef } from 'react';
import { fetcher } from '../../../lib/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DriverProfile {
  id: number;
  name: string;
  is_available: boolean;
  is_verified: boolean;
  vehicle_type: string;
  plate_number: string;
}

interface DeliveryOrder {
  id: number;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  status: string;
  shipment_type: string;
  payment_method?: string; // Stripe, Cash, CoDi
  total_amount?: number;
  restaurant_name?: string;
  customer_latitude?: string;
  customer_longitude?: string;
  created_at: string;
}

export default function DriverPortal() {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);

  // Load driver profile and active orders
  const loadDriverData = async () => {
    try {
      // 1. Get user profile to check driver connection
      const user = await fetcher('/users/me/');
      const driverRes = await fetcher(`/delivery/drivers/`);
      const driverProfile = driverRes.find((d: any) => d.email === user.email);
      
      if (driverProfile) {
        setDriver(driverProfile);
        
        // 2. Load active assigned orders
        const ordersRes = await fetcher('/delivery/orders/driver-orders/');
        setOrders(ordersRes);
        if (ordersRes.length > 0 && !selectedOrder) {
          setSelectedOrder(ordersRes[0]);
        }
      } else {
        setErrorMsg('No se encontró un perfil de repartidor activo.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar los datos del conductor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriverData();
    const interval = setInterval(loadDriverData, 12000); // Poll orders/status every 12 seconds
    return () => clearInterval(interval);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default map coordinates (Phoenix / Mexico City)
    const lat = 19.4326;
    const lon = -99.1332;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([lat, lon], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Try to get current driver GPS location on startup
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 15);
          updateDriverLocationOnServer(latitude, longitude);
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, [loading]);

  // Update map markers when selectedOrder or coordinates change
  useEffect(() => {
    if (!mapRef.current || !selectedOrder) return;
    const map = mapRef.current;
    
    // Clear previous route layers
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }

    const destLat = parseFloat(selectedOrder.customer_latitude || '0');
    const destLon = parseFloat(selectedOrder.customer_longitude || '0');

    if (destLat && destLon) {
      // Clear old target marker
      if (targetMarkerRef.current) {
        targetMarkerRef.current.remove();
      }

      // Add target custom icon marker (Red destination point)
      const targetIcon = L.divIcon({
        className: 'custom-destination-marker',
        html: `<div class="w-8 h-8 rounded-full bg-red-600 border border-white/40 flex items-center justify-center text-white font-black text-xs shadow-lg animate-ping">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      targetMarkerRef.current = L.marker([destLat, destLon], { icon: targetIcon })
        .addTo(map)
        .bindPopup(`<b>Destino:</b><br/>${selectedOrder.recipient_name}<br/>${selectedOrder.delivery_address}`);

      // Locate driver location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude, longitude } = pos.coords;
          
          if (driverMarkerRef.current) {
            driverMarkerRef.current.remove();
          }

          const driverIcon = L.divIcon({
            className: 'custom-driver-marker',
            html: `<div class="w-8 h-8 rounded-full bg-nectar-gold border border-background flex items-center justify-center text-background font-black text-xs shadow-lg">🚴</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          driverMarkerRef.current = L.marker([latitude, longitude], { icon: driverIcon }).addTo(map);

          // Draw simple path (direct polyline) between driver and customer
          const polyline = L.polyline([[latitude, longitude], [destLat, destLon]], {
            color: '#C68A1E',
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 8',
            className: 'animate-dash'
          }).addTo(routeLayerRef.current!);

          // Fit bounds
          const bounds = L.latLngBounds([latitude, longitude], [destLat, destLon]);
          map.fitBounds(bounds, { padding: [50, 50] });
        });
      } else {
        map.setView([destLat, destLon], 14);
      }
    }
  }, [selectedOrder]);

  const updateDriverLocationOnServer = async (latitude: number, longitude: number) => {
    if (!driver) return;
    try {
      await fetcher(`/delivery/drivers/${driver.id}/update-location/`, {
        method: 'POST',
        body: JSON.stringify({ latitude, longitude })
      });
    } catch (err) {
      console.error('Failed to update GPS on server:', err);
    }
  };

  const handleToggleAvailability = async () => {
    if (!driver) return;
    setUpdatingAvailability(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetcher(`/delivery/drivers/${driver.id}/toggle-availability/`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setDriver(prev => prev ? { ...prev, is_available: res.is_available } : null);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar disponibilidad.');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetcher(`/delivery/orders/${orderId}/update-status/`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      // Refresh active orders
      const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: res.status } : o);
      setOrders(updatedOrders);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: res.status });
      }
      setSuccessMsg(`Estado del pedido actualizado a: ${res.status}`);
      loadDriverData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar el estado del pedido.');
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await fetcher(`/delivery/orders/${orderId}/accept/`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSuccessMsg('Pedido aceptado.');
      loadDriverData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al aceptar el pedido.');
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await fetcher(`/delivery/orders/${orderId}/reject/`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSuccessMsg('Pedido rechazado.');
      loadDriverData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al rechazar el pedido.');
    }
  };

  // Convert English status to friendly Spanish Badge
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      'ASSIGNED': { label: 'Asignado', class: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
      'PICKED_UP': { label: 'Recogido', class: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
      'IN_TRANSIT': { label: 'En camino', class: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
      'DELIVERED': { label: 'Entregado', class: 'bg-green-500/10 text-green-400 border border-green-500/20' },
      'FAILED': { label: 'Fallido', class: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    };
    return badges[status] || { label: status, class: 'bg-gray-500/10 text-gray-400 border border-gray-500/20' };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-nectar-gold mb-4"></div>
        <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Cargando Consola Repartidor...</div>
      </div>
    );
  }

  const pendingAcceptanceOrder = orders.find(o => o.status === 'WAITING_ACCEPTANCE');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-background p-4 min-h-screen relative">
      {/* Fullscreen Aceptación Modal Alert */}
      {pendingAcceptanceOrder && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center animate-pulse-slow">
          <div className="w-full max-w-md bg-card-bg border-2 border-nectar-gold/50 rounded-[3rem] p-8 md:p-12 shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden animate-premium">
            
            {/* Visual alert animation */}
            <div className="relative w-24 h-24 flex items-center justify-center bg-nectar-gold/15 rounded-full mb-2 animate-bounce">
              <span className="text-5xl">🔔</span>
              <div className="absolute inset-0 rounded-full border-4 border-nectar-gold animate-ping opacity-75"></div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-nectar-gold animate-pulse">
                Nuevo Pedido Entrante
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                ¿Aceptar Entrega?
              </h2>
              <p className="text-[10px] text-white/40 font-mono mt-1">Pedido ID: #{pendingAcceptanceOrder.id}</p>
            </div>

            <div className="w-full bg-background border border-card-border rounded-2xl p-5 text-left space-y-4">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold/70 block">Origen / Restaurant</span>
                <span className="text-xs font-black text-white">{pendingAcceptanceOrder.restaurant_name || 'Restaurante Néctar'}</span>
              </div>
              <div className="border-t border-card-border/40 pt-3">
                <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold/70 block">Destino</span>
                <span className="text-xs font-black text-white">{pendingAcceptanceOrder.recipient_name}</span>
                <p className="text-[10px] text-white/60 leading-normal mt-0.5">{pendingAcceptanceOrder.delivery_address}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-card-border/40 pt-3">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold/70 block">Método de Pago</span>
                  <span className="text-[10px] font-black text-emerald-400 mt-1 inline-block bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/25">
                    {pendingAcceptanceOrder.payment_method === 'CASH' ? '💵 Efectivo' : pendingAcceptanceOrder.payment_method === 'CODI' ? '📲 CoDi' : '💳 Tarjeta (Stripe)'}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold/70 block">Monto a Cobrar</span>
                  <span className="text-sm font-mono font-black text-[#C68A1E]">${(pendingAcceptanceOrder.total_amount || 0).toLocaleString('es-MX')} MXN</span>
                </div>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-4 mt-4">
              <button
                type="button"
                onClick={() => handleRejectOrder(pendingAcceptanceOrder.id)}
                className="py-4 bg-red-500/10 border border-red-500/35 hover:bg-red-500/25 text-red-400 text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer text-center"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => handleAcceptOrder(pendingAcceptanceOrder.id)}
                className="py-4 text-background text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/20 cursor-pointer text-center flex items-center justify-center gap-2"
                style={{ backgroundColor: '#10B981' }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Panel - Driver Stats and Orders */}
      <div className="lg:col-span-4 flex flex-col space-y-6">
        {/* Driver Header */}
        <div className="p-6 bg-card-bg border border-card-border rounded-[2rem] shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              {driver?.name || 'Repartidor'}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40">
              {driver?.vehicle_type === 'MOTORCYCLE' ? '🚴 Motocicleta' : driver?.vehicle_type === 'BICYCLE' ? '🚲 Bicicleta' : '🚗 Vehículo'} • {driver?.plate_number || 'Sin placas'}
            </p>
            {!driver?.is_verified && (
              <span className="inline-block text-[8px] font-black uppercase tracking-widest px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full mt-2">
                Documentos Pendientes
              </span>
            )}
          </div>
          
          {driver?.is_verified && (
            <button
              id="driver-availability-toggle"
              onClick={handleToggleAvailability}
              disabled={updatingAvailability}
              className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 ${
                driver?.is_available
                  ? 'bg-green-500/10 text-green-400 border-green-500/25'
                  : 'bg-red-500/10 text-red-400 border-red-500/25'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${driver?.is_available ? 'bg-green-400 animate-ping' : 'bg-red-400'}`}></span>
              <span>{driver?.is_available ? 'Disponible' : 'Ocupado'}</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-wider rounded-2xl text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-black uppercase tracking-wider rounded-2xl text-center">
            {successMsg}
          </div>
        )}

        {/* Assigned Orders List */}
        <div id="driver-orders-sidebar" className="flex-1 bg-card-bg border border-card-border rounded-[2.5rem] p-6 flex flex-col space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-nectar-gold pb-3 border-b border-card-border">
            Pedidos Asignados ({orders.length})
          </h3>

          {orders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-white/30 space-y-4">
              <span className="text-3xl">💤</span>
              <p className="text-xs font-bold uppercase tracking-wider">No tienes entregas activas en este momento</p>
              <p className="text-[10px] leading-relaxed">Ponte en estado disponible para empezar a recibir pedidos de los restaurantes del área.</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[450px] pr-2">
              {orders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-nectar-gold/60 ${
                    selectedOrder?.id === o.id
                      ? 'bg-nectar-gold/5 border-nectar-gold/40'
                      : 'bg-background border-card-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Pedido #{o.id}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${getStatusBadge(o.status).class}`}>
                      {getStatusBadge(o.status).label}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-white">{o.recipient_name}</h4>
                  <p className="text-[10px] text-white/60 line-clamp-2 mt-1">{o.delivery_address}</p>
                  
                  {/* Payment Mode Indicator */}
                  <div className="mt-3 flex items-center justify-between text-[8px] font-black uppercase tracking-widest border-t border-card-border/40 pt-2.5">
                    <span className="text-white/40">Pago al recibir:</span>
                    <span className={`px-2 py-0.5 rounded ${
                      o.payment_method === 'CASH'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/25'
                        : o.payment_method === 'CODI'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/25'
                    }`}>
                      {o.payment_method === 'CASH' ? '💵 Efectivo' : o.payment_method === 'CODI' ? '📲 CoDi' : '💳 Stripe (Tarjeta)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map and Active Order Journey */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        <div id="driver-map-container" className="relative h-[380px] lg:h-[500px] bg-card-bg border border-card-border rounded-[3rem] overflow-hidden shadow-2xl">
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        </div>

        {/* Selected Order Actions */}
        {selectedOrder && (
          <div id="active-order-card" className="bg-card-bg border border-card-border rounded-[2.5rem] p-6 space-y-6 shadow-xl animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-card-border">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-nectar-gold">Ruta Activa</span>
                <h3 className="text-sm font-black text-white">{selectedOrder.recipient_name}</h3>
                <p className="text-xs text-white/60">{selectedOrder.delivery_address}</p>
              </div>
              <div className="flex items-center space-x-3">
                <a
                  href={`tel:${selectedOrder.recipient_phone}`}
                  className="px-4 py-2.5 bg-background border border-card-border hover:border-white/20 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  📞 Llamar Cliente
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.delivery_address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-background border border-card-border hover:border-white/20 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  🗺️ Google Maps
                </a>
              </div>
            </div>

            {/* Steps & Status Transitions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'PICKED_UP')}
                disabled={selectedOrder.status !== 'ASSIGNED'}
                className="flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 disabled:opacity-35 transition-all text-background"
              >
                📦 Recoger Pedido
              </button>

              <button
                onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'IN_TRANSIT')}
                disabled={selectedOrder.status !== 'PICKED_UP'}
                className="flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider bg-yellow-500 hover:bg-yellow-400 disabled:opacity-35 transition-all text-background"
              >
                🏍️ Iniciar Viaje
              </button>

              <button
                onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'DELIVERED')}
                disabled={selectedOrder.status !== 'IN_TRANSIT'}
                className="flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider bg-green-500 hover:bg-green-400 disabled:opacity-35 transition-all text-background animate-pulse"
              >
                ✅ Entregado
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
