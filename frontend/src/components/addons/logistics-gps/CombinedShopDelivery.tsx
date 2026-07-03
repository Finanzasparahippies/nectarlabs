'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues with map components
const LeafletMap = dynamic(() => import('./DeliveryMap'), { ssr: false, loading: () => <MapSkeleton /> });

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  price: string;
  image_url?: string | null;
  description?: string;
  stock?: number;
  category?: string;
}

interface CartItem extends Product {
  qty: number;
}

interface DriverLocation {
  driver_id: number;
  driver_name: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

interface DeliveryOrder {
  id: number;
  status: string;
  recipient_name: string;
  delivery_address: string;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_latitude?: number | null;
  driver_longitude?: number | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  courier?: string | null;
}

interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  theme_color: string;
  accent_color?: string;
  bg_color?: string;
  card_bg_color?: string;
  text_color?: string;
  border_color?: string;
  logo_url?: string | null;
}

interface CombinedShopDeliveryProps {
  tenantConfig: TenantConfig;
  token?: string | null;
  isDarkMode: boolean;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

// ─────────────────────────────────────────────
// Status labels
// ─────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  PENDING:    { label: 'Buscando repartidor…', emoji: '🔍', color: '#F59E0B' },
  ASSIGNED:   { label: 'Repartidor asignado',  emoji: '🛵', color: '#3B82F6' },
  PICKED_UP:  { label: 'Pedido recogido',       emoji: '📦', color: '#8B5CF6' },
  IN_TRANSIT: { label: 'En camino',             emoji: '🚀', color: '#06B6D4' },
  DELIVERED:  { label: '¡Entregado!',           emoji: '✅', color: '#10B981' },
  FAILED:     { label: 'No entregado',          emoji: '⚠️', color: '#EF4444' },
  CANCELLED:  { label: 'Cancelado',             emoji: '❌', color: '#6B7280' },
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function MapSkeleton() {
  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-white/5 rounded-3xl animate-pulse">
      <span className="text-4xl opacity-30">🗺️</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, emoji: '📋', color: '#9CA3AF' };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider"
      style={{ backgroundColor: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}
    >
      {s.emoji} {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function CombinedShopDelivery({
  tenantConfig,
  token,
  isDarkMode,
  onToast,
}: CombinedShopDeliveryProps) {
  const primary = tenantConfig.theme_color || '#C68A1E';
  const subdomain = tenantConfig.subdomain;

  // ── Layout state ──
  const [layout, setLayout] = useState<'split' | 'map' | 'shop'>('split');
  const isMobile = useWindowWidth() < 768;
  // On mobile default is stacked (map top, shop bottom) = 'split'

  // ── Products & Cart ──
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);

  // ── Checkout ──
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'confirm' | 'tracking'>('cart');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLon, setDeliveryLon] = useState<number | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // ── Active Delivery Order ──
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─────────────────────────────────────────────
  // 1. Load Products
  // ─────────────────────────────────────────────
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch(`/api/shop/products/?subdomain=${subdomain}&page_size=50`);
        if (!res.ok) throw new Error('Error cargando productos');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : (data.results || []));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [subdomain]);

  // ─────────────────────────────────────────────
  // 2. WebSocket for real-time driver location
  // ─────────────────────────────────────────────
  const connectWs = useCallback(() => {
    if (!activeOrder || wsRef.current) return;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = window.location.host;
    const ws = new WebSocket(`${wsProtocol}://${wsHost}/ws/delivery/${subdomain}/`);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;
      // Reconnect after 3s if order is still active
      if (activeOrder && !['DELIVERED', 'CANCELLED', 'FAILED'].includes(activeOrder.status)) {
        setTimeout(connectWs, 3000);
      }
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'driver.location' && msg.data) {
          setDriverLocation(msg.data as DriverLocation);
        }
      } catch (_) {}
    };
    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, [activeOrder, subdomain]);

  // Cleanup WS on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Start WS + polling fallback when order becomes active
  useEffect(() => {
    if (!activeOrder) return;
    const terminal = ['DELIVERED', 'CANCELLED', 'FAILED'];
    if (terminal.includes(activeOrder.status)) return;

    connectWs();

    // Polling fallback — also refreshes order status
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/delivery/orders/${activeOrder.id}/track/`);
        if (res.ok) {
          const updated = await res.json();
          setActiveOrder(updated);
          if (updated.driver_latitude && updated.driver_longitude) {
            setDriverLocation({
              driver_id: 0,
              driver_name: updated.driver_name || 'Repartidor',
              latitude: updated.driver_latitude,
              longitude: updated.driver_longitude,
              updated_at: new Date().toISOString(),
            });
          }
          if (terminal.includes(updated.status)) {
            clearInterval(poll);
            wsRef.current?.close();
          }
        }
      } catch (_) {}
    }, 8000);
    pollRef.current = poll;
    return () => clearInterval(poll);
  }, [activeOrder?.id, connectWs]);

  // ─────────────────────────────────────────────
  // Cart helpers
  // ─────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    onToast(`${product.name} agregado al carrito`, 'success');
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const cartTotal = cart.reduce((sum, i) => sum + parseFloat(i.price) * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  // ─────────────────────────────────────────────
  // Checkout
  // ─────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!recipientName.trim() || !deliveryAddress.trim()) {
      onToast('Por favor completa los datos de entrega', 'warning');
      return;
    }
    setIsSubmittingOrder(true);
    try {
      const idempotencyKey = `${tenantConfig.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // 1. Create ecommerce order
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const orderRes = await fetch('/api/shop/orders/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tenant_id: tenantConfig.id,
          items: cart.map(i => ({ product_id: i.id, quantity: i.qty, unit_price: i.price })),
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          delivery_address: deliveryAddress.trim(),
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Error al crear la orden');
      }

      const shopOrder = await orderRes.json();

      // 2. Create delivery order + assign driver
      const deliveryRes = await fetch('/api/delivery/orders/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tenant_id: tenantConfig.id,
          ecommerce_order_id: shopOrder.id,
          idempotency_key: idempotencyKey,
          shipment_type: 'LOCAL',
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          delivery_address: deliveryAddress.trim(),
          delivery_latitude: deliveryLat,
          delivery_longitude: deliveryLon,
        }),
      });

      if (!deliveryRes.ok) throw new Error('Error al registrar la entrega');
      const deliveryOrder = await deliveryRes.json();

      // 3. Auto-assign nearest driver
      try {
        const assignRes = await fetch('/api/delivery/orders/assign-driver/', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            delivery_order_id: deliveryOrder.id,
            idempotency_key: idempotencyKey,
            origin_latitude: 19.432608, // TODO: fetch from StoreConfig
            origin_longitude: -99.133209,
          }),
        });
        if (assignRes.ok) {
          const assigned = await assignRes.json();
          setActiveOrder(assigned);
        } else {
          setActiveOrder(deliveryOrder);
        }
      } catch (_) {
        setActiveOrder(deliveryOrder);
      }

      setCart([]);
      setCheckoutStep('tracking');
      setShowCart(false);
      onToast('¡Pedido realizado! Buscando repartidor…', 'success');
    } catch (err: any) {
      onToast(err.message || 'Error al procesar la orden', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // ─────────────────────────────────────────────
  // Derived data
  // ─────────────────────────────────────────────
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))];
  const filteredProducts = products.filter(p => {
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // ─────────────────────────────────────────────
  // Map marker data
  // ─────────────────────────────────────────────
  const mapMarkers = [];
  if (driverLocation) {
    mapMarkers.push({
      id: `driver-${driverLocation.driver_id}`,
      lat: driverLocation.latitude,
      lon: driverLocation.longitude,
      label: driverLocation.driver_name,
      type: 'driver' as const,
    });
  }
  if (deliveryLat && deliveryLon) {
    mapMarkers.push({
      id: 'destination',
      lat: deliveryLat,
      lon: deliveryLon,
      label: 'Tu dirección',
      type: 'destination' as const,
    });
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  const showMap = layout === 'split' || layout === 'map';
  const showShop = layout === 'split' || layout === 'shop';

  return (
    <div className="combined-shop-delivery w-full flex flex-col gap-4">

      {/* ── Layout Toggle ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Vista</span>
          <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
            {([
              { key: 'split', label: isMobile ? '↕' : '↔', title: 'Vista dividida' },
              { key: 'map', label: '🗺️', title: 'Solo mapa' },
              { key: 'shop', label: '🛍️', title: 'Solo tienda' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                title={opt.title}
                onClick={() => setLayout(opt.key)}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer"
                style={{
                  backgroundColor: layout === opt.key ? primary : 'transparent',
                  color: layout === opt.key ? '#000' : 'inherit',
                  boxShadow: layout === opt.key ? `0 2px 10px ${primary}40` : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cart button */}
        <button
          onClick={() => setShowCart(true)}
          className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            backgroundColor: `${primary}15`,
            borderColor: `${primary}40`,
            color: primary,
          }}
        >
          🛒 Carrito
          {cartCount > 0 && (
            <span
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black animate-bounce"
              style={{ backgroundColor: primary }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div
        className={`w-full transition-all duration-500 ${
          !isMobile && layout === 'split'
            ? 'grid grid-cols-2 gap-4'
            : 'flex flex-col gap-4'
        }`}
      >
        {/* ── Map Pane ── */}
        {showMap && (
          <div
            className="combined-map-pane relative rounded-3xl overflow-hidden border border-white/10 transition-all duration-500"
            style={{
              minHeight: isMobile ? '280px' : '520px',
              order: isMobile ? 0 : undefined,
            }}
          >
            {/* WS connection indicator */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-sm text-[9px] font-black uppercase tracking-wider">
              <span
                className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}
              />
              {wsConnected ? 'Live' : 'Actualizando…'}
            </div>

            {activeOrder && (
              <div className="absolute top-3 left-3 z-20">
                <StatusBadge status={activeOrder.status} />
              </div>
            )}

            <LeafletMap
              primaryColor={primary}
              subdomain={subdomain}
              markers={mapMarkers}
              center={
                driverLocation
                  ? [driverLocation.latitude, driverLocation.longitude]
                  : undefined
              }
            />

            {/* No active order overlay */}
            {!activeOrder && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-10 pointer-events-none">
                <div className="text-center space-y-2 px-6">
                  <span className="text-4xl">🛵</span>
                  <p className="text-xs font-black uppercase tracking-widest opacity-70">
                    El mapa mostrará a tu repartidor una vez que realices tu pedido
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Shop Pane ── */}
        {showShop && !showCart && checkoutStep !== 'tracking' && (
          <div className="combined-shop-pane flex flex-col gap-4">
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Buscar productos…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-sm placeholder-white/30 focus:outline-none focus:border-white/30 transition-all"
              />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-white/30 transition-all cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? '📋 Todas las categorías' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Grid */}
            {loadingProducts ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/5 bg-white/5 animate-pulse h-44" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 space-y-2 opacity-50">
                <span className="text-4xl">🍯</span>
                <p className="text-xs font-black uppercase tracking-widest">Sin productos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 overflow-y-auto" style={{ maxHeight: '420px' }}>
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    primaryColor={primary}
                    cartQty={cart.find(i => i.id === product.id)?.qty ?? 0}
                    onAdd={() => addToCart(product)}
                    onRemove={() => removeFromCart(product.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Cart Drawer (full-width overlay) ── */}
        {showCart && (
          <div className="combined-shop-pane flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: primary }}>
                🛒 Tu Carrito
              </h3>
              <button
                onClick={() => setShowCart(false)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black hover:bg-white/10 transition-all cursor-pointer"
              >
                ← Seguir comprando
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 opacity-50">
                <span className="text-3xl">🛒</span>
                <p className="text-xs font-black uppercase tracking-widest mt-2">Carrito vacío</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '300px' }}>
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-white/5">
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black truncate">{item.name}</p>
                        <p className="text-[10px] opacity-60">${parseFloat(item.price).toFixed(2)} c/u</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-black transition-all cursor-pointer">−</button>
                        <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all cursor-pointer" style={{ backgroundColor: primary, color: '#000' }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-xs font-black uppercase tracking-wider opacity-60">Total</span>
                  <span className="text-lg font-black" style={{ color: primary }}>${cartTotal.toFixed(2)}</span>
                </div>

                {/* Checkout Form */}
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Tu nombre completo *"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-sm placeholder-white/30 focus:outline-none focus:border-white/30"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono de contacto"
                    value={recipientPhone}
                    onChange={e => setRecipientPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-sm placeholder-white/30 focus:outline-none focus:border-white/30"
                  />
                  <input
                    type="text"
                    placeholder="Dirección de entrega *"
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-sm placeholder-white/30 focus:outline-none focus:border-white/30"
                  />
                </div>

                <button
                  disabled={isSubmittingOrder || !recipientName.trim() || !deliveryAddress.trim()}
                  onClick={handlePlaceOrder}
                  className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{ backgroundColor: primary, color: '#000' }}
                >
                  {isSubmittingOrder ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-t-transparent border-black animate-spin" />
                      Procesando…
                    </span>
                  ) : (
                    `🛵 Pedir ahora — $${cartTotal.toFixed(2)}`
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Tracking View ── */}
        {checkoutStep === 'tracking' && activeOrder && (
          <div className="combined-shop-pane flex flex-col gap-4 animate-in fade-in duration-500">
            <div className="text-center space-y-1">
              <p className="text-3xl">{STATUS_LABELS[activeOrder.status]?.emoji ?? '📋'}</p>
              <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: primary }}>
                Seguimiento de tu pedido
              </h3>
              <StatusBadge status={activeOrder.status} />
            </div>

            {activeOrder.driver_name && (
              <div className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Tu repartidor</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: `${primary}20` }}>
                    🛵
                  </div>
                  <div>
                    <p className="text-sm font-black">{activeOrder.driver_name}</p>
                    {activeOrder.driver_phone && (
                      <a href={`tel:${activeOrder.driver_phone}`} className="text-[10px] opacity-60 underline">
                        {activeOrder.driver_phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeOrder.tracking_number && (
              <div className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Guía de paquetería</p>
                <p className="text-sm font-mono font-black">{activeOrder.tracking_number}</p>
                {activeOrder.courier && <p className="text-[10px] opacity-60">{activeOrder.courier}</p>}
                {activeOrder.tracking_url && (
                  <a
                    href={activeOrder.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-[10px] font-black underline"
                    style={{ color: primary }}
                  >
                    Rastrear paquete →
                  </a>
                )}
              </div>
            )}

            {['DELIVERED', 'CANCELLED', 'FAILED'].includes(activeOrder.status) && (
              <button
                onClick={() => { setActiveOrder(null); setCheckoutStep('cart'); }}
                className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              >
                Hacer otro pedido
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Product Card
// ─────────────────────────────────────────────
function ProductCard({
  product,
  primaryColor,
  cartQty,
  onAdd,
  onRemove,
}: {
  product: Product;
  primaryColor: string;
  cartQty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 transition-all duration-300 overflow-hidden">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-32 flex items-center justify-center text-4xl opacity-30" style={{ backgroundColor: `${primaryColor}10` }}>
          🛍️
        </div>
      )}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs font-black leading-tight line-clamp-2">{product.name}</p>
        <p className="text-sm font-black mt-auto" style={{ color: primaryColor }}>
          ${parseFloat(product.price).toFixed(2)}
        </p>
        {cartQty > 0 ? (
          <div className="flex items-center gap-2">
            <button onClick={onRemove} className="flex-1 py-1.5 rounded-xl border border-white/20 text-[10px] font-black hover:bg-red-500/20 hover:border-red-500/40 transition-all cursor-pointer">
              Quitar
            </button>
            <span className="text-xs font-black w-6 text-center">{cartQty}</span>
            <button
              onClick={onAdd}
              className="flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all hover:opacity-80 cursor-pointer"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              +1
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="w-full py-1.5 rounded-xl text-[10px] font-black transition-all hover:opacity-80 active:scale-95 cursor-pointer"
            style={{ backgroundColor: primaryColor, color: '#000' }}
          >
            Agregar
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Hook: window width (SSR-safe)
// ─────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(1024);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return width;
}
