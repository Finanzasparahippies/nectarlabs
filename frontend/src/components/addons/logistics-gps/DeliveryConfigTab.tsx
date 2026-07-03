'use client';

import React, { useState, useEffect } from 'react';
import { fetcher } from '@/lib/api';

interface DeliveryConfigData {
  id?: number;
  map_center_latitude: string;
  map_center_longitude: string;
  zoom_level: number;
  enable_public_tracking: boolean;
  enable_realtime: boolean;
  driver_search_radius_km: number;
}

interface Driver {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  vehicle_type: string;
  plate_number?: string;
  is_available: boolean;
  is_verified: boolean;
  active_order_count: number;
}

const VEHICLE_TYPES = [
  { value: 'BICYCLE',    label: '🚲 Bicicleta' },
  { value: 'MOTORCYCLE', label: '🛵 Motocicleta' },
  { value: 'CAR',        label: '🚗 Automóvil' },
  { value: 'VAN',        label: '🚐 Camioneta' },
];

interface Props {
  subdomain: string;
  primaryColor: string;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function DeliveryConfigTab({ subdomain, primaryColor, onToast }: Props) {
  const [config, setConfig] = useState<DeliveryConfigData>({
    map_center_latitude: '19.432608',
    map_center_longitude: '-99.133209',
    zoom_level: 14,
    enable_public_tracking: true,
    enable_realtime: true,
    driver_search_radius_km: 30,
  });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'map' | 'drivers' | 'new-driver'>('map');

  // New driver form
  const [newDriver, setNewDriver] = useState({
    name: '', phone: '', email: '',
    vehicle_type: 'MOTORCYCLE', plate_number: '',
  });
  const [addingDriver, setAddingDriver] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cfg, drvList] = await Promise.all([
          fetcher(`/delivery/config/?subdomain=${subdomain}`).then((r: any) => Array.isArray(r) ? r[0] : r),
          fetcher(`/delivery/drivers/?subdomain=${subdomain}`),
        ]);
        if (cfg) setConfig(cfg);
        setDrivers(Array.isArray(drvList) ? drvList : []);
      } catch (err) {
        console.error('Error loading delivery config:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subdomain]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await fetcher(`/delivery/config/${config.id || ''}/`, {
        method: config.id ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...config, subdomain }),
        headers: { 'Content-Type': 'application/json' },
      });
      onToast('Configuración de entrega guardada', 'success');
    } catch (err: any) {
      onToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDriver = async () => {
    if (!newDriver.name.trim()) { onToast('Nombre del repartidor requerido', 'warning'); return; }
    setAddingDriver(true);
    try {
      const created = await fetcher('/delivery/drivers/', {
        method: 'POST',
        body: JSON.stringify({ ...newDriver, subdomain }),
        headers: { 'Content-Type': 'application/json' },
      });
      setDrivers(prev => [...prev, created]);
      setNewDriver({ name: '', phone: '', email: '', vehicle_type: 'MOTORCYCLE', plate_number: '' });
      setActiveSection('drivers');
      onToast('Repartidor registrado', 'success');
    } catch (err: any) {
      onToast(err.message || 'Error al agregar repartidor', 'error');
    } finally {
      setAddingDriver(false);
    }
  };

  const toggleDriverAvailable = async (driver: Driver) => {
    try {
      await fetcher(`/delivery/drivers/${driver.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_available: !driver.is_available }),
        headers: { 'Content-Type': 'application/json' },
      });
      setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, is_available: !d.is_available } : d));
    } catch {
      onToast('Error al actualizar repartidor', 'error');
    }
  };

  const inputCls = 'w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-sm placeholder-white/30 focus:outline-none focus:border-white/30 transition-all';
  const sectionBtn = (key: typeof activeSection, label: string, icon: string, badge?: number) => (
    <button
      key={key}
      onClick={() => setActiveSection(key)}
      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer relative"
      style={{
        backgroundColor: activeSection === key ? `${primaryColor}20` : 'transparent',
        borderColor: activeSection === key ? primaryColor : 'transparent',
        color: activeSection === key ? primaryColor : 'rgba(255,255,255,0.5)',
      }}
    >
      {icon} {label}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-black"
          style={{ backgroundColor: primaryColor }}
        >
          {badge}
        </span>
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 rounded-full border-4 border-t-white border-white/10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest" style={{ color: primaryColor }}>
            🛵 Configuración NectarDelivery
          </h2>
          <p className="text-xs text-white/50 mt-0.5">Mapa, repartidores independientes y seguimiento en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          {sectionBtn('map', 'Mapa', '🗺️')}
          {sectionBtn('drivers', 'Repartidores', '🛵', drivers.length)}
          {sectionBtn('new-driver', 'Agregar', '+')}
        </div>
      </div>

      {/* ── Section: Map Config ── */}
      {activeSection === 'map' && (
        <div className="space-y-5">
          <div className="p-5 rounded-3xl border border-white/10 bg-white/5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Centro del mapa (por defecto)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider opacity-50">Latitud</label>
                <input
                  type="number" step="any"
                  value={config.map_center_latitude}
                  onChange={e => setConfig(p => ({ ...p, map_center_latitude: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider opacity-50">Longitud</label>
                <input
                  type="number" step="any"
                  value={config.map_center_longitude}
                  onChange={e => setConfig(p => ({ ...p, map_center_longitude: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider opacity-50">Zoom inicial (1–19)</label>
                <input
                  type="number" min="1" max="19"
                  value={config.zoom_level}
                  onChange={e => setConfig(p => ({ ...p, zoom_level: parseInt(e.target.value) || 14 }))}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider opacity-50">Radio de búsqueda de repartidor (km)</label>
                <input
                  type="number" min="1" max="200"
                  value={config.driver_search_radius_km}
                  onChange={e => setConfig(p => ({ ...p, driver_search_radius_km: parseInt(e.target.value) || 30 }))}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="p-5 rounded-3xl border border-white/10 bg-white/5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Opciones de rastreo</p>
            {[
              { key: 'enable_public_tracking' as const, label: '🌐 Rastreo público activado', desc: 'Los clientes pueden ver la ubicación del repartidor en tiempo real' },
              { key: 'enable_realtime' as const, label: '⚡ WebSocket en tiempo real', desc: 'Actualización instantánea vía WebSocket (requiere servidor Channels + Redis)' },
            ].map(opt => (
              <div key={opt.key} className="flex items-start gap-4">
                <div
                  onClick={() => setConfig(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                  className="w-10 h-6 rounded-full transition-all duration-300 relative cursor-pointer mt-0.5 shrink-0"
                  style={{ backgroundColor: config[opt.key] ? primaryColor : 'rgba(255,255,255,0.1)' }}
                >
                  <span
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                    style={{ left: config[opt.key] ? '22px' : '2px' }}
                  />
                </div>
                <div>
                  <p className="text-xs font-black">{opt.label}</p>
                  <p className="text-[10px] opacity-40 mt-0.5">{opt.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              disabled={saving}
              onClick={handleSaveConfig}
              className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-t-transparent border-black animate-spin" />
                  Guardando…
                </span>
              ) : '💾 Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Section: Drivers List ── */}
      {activeSection === 'drivers' && (
        <div className="space-y-3">
          {drivers.length === 0 ? (
            <div className="text-center py-16 opacity-50 space-y-2">
              <span className="text-4xl">🛵</span>
              <p className="text-xs font-black uppercase tracking-widest">Sin repartidores registrados</p>
              <button onClick={() => setActiveSection('new-driver')} className="text-[10px] underline cursor-pointer" style={{ color: primaryColor }}>
                Agregar el primero
              </button>
            </div>
          ) : (
            drivers.map(driver => (
              <div key={driver.id} className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 transition-all">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: driver.is_available ? `${primaryColor}20` : 'rgba(255,255,255,0.05)' }}
                >
                  {VEHICLE_TYPES.find(v => v.value === driver.vehicle_type)?.label.split(' ')[0] || '🛵'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{driver.name}</p>
                  <p className="text-[10px] opacity-50 truncate">
                    {driver.phone || driver.email || 'Sin contacto'} • {driver.plate_number || 'Sin placa'}
                  </p>
                  {driver.active_order_count > 0 && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                      {driver.active_order_count} entrega{driver.active_order_count !== 1 ? 's' : ''} activa{driver.active_order_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {driver.is_verified && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 font-black">✓ Verificado</span>
                  )}
                  <div
                    onClick={() => toggleDriverAvailable(driver)}
                    className="w-10 h-6 rounded-full transition-all duration-300 relative cursor-pointer"
                    style={{ backgroundColor: driver.is_available ? '#10B981' : 'rgba(255,255,255,0.1)' }}
                    title={driver.is_available ? 'Disponible — click para marcar ocupado' : 'Ocupado — click para liberar'}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                      style={{ left: driver.is_available ? '22px' : '2px' }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Section: New Driver ── */}
      {activeSection === 'new-driver' && (
        <div className="p-5 rounded-3xl border border-white/10 bg-white/5 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Registro de nuevo repartidor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombre completo *"
              value={newDriver.name}
              onChange={e => setNewDriver(p => ({ ...p, name: e.target.value }))}
              className={inputCls}
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={newDriver.phone}
              onChange={e => setNewDriver(p => ({ ...p, phone: e.target.value }))}
              className={inputCls}
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={newDriver.email}
              onChange={e => setNewDriver(p => ({ ...p, email: e.target.value }))}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="Placa del vehículo"
              value={newDriver.plate_number}
              onChange={e => setNewDriver(p => ({ ...p, plate_number: e.target.value }))}
              className={inputCls}
            />
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider opacity-50">Tipo de vehículo</label>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_TYPES.map(v => (
                  <button
                    key={v.value}
                    onClick={() => setNewDriver(p => ({ ...p, vehicle_type: v.value }))}
                    className="px-3 py-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer"
                    style={{
                      backgroundColor: newDriver.vehicle_type === v.value ? `${primaryColor}20` : 'transparent',
                      borderColor: newDriver.vehicle_type === v.value ? primaryColor : 'rgba(255,255,255,0.1)',
                      color: newDriver.vehicle_type === v.value ? primaryColor : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            disabled={addingDriver || !newDriver.name.trim()}
            onClick={handleAddDriver}
            className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: primaryColor, color: '#000' }}
          >
            {addingDriver ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-t-transparent border-black animate-spin" />
                Registrando…
              </span>
            ) : '+ Registrar Repartidor'}
          </button>
        </div>
      )}
    </div>
  );
}
