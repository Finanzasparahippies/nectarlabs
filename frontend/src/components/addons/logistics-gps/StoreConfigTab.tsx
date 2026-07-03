'use client';

import React, { useState, useEffect } from 'react';
import { fetcher } from '@/lib/api';

interface StoreConfigData {
  id?: number;
  origin_photo_url?: string | null;
  available_box_sizes: string;
  custom_box_length_cm?: number | null;
  custom_box_width_cm?: number | null;
  custom_box_height_cm?: number | null;
  custom_box_weight_kg?: string | null;
  shipment_category: string;
  offers_local_delivery: boolean;
  offers_national_shipping: boolean;
  has_skydropx_api_key?: boolean;
  shipping_markup_percentage?: string;
  origin_name?: string;
  origin_phone?: string;
  origin_street?: string;
  origin_suburb?: string;
  origin_city?: string;
  origin_state?: string;
  origin_zip_code?: string;
  origin_country?: string;
}

const BOX_SIZES = [
  { code: 'XS', label: 'XS — 15×10×5 cm' },
  { code: 'S',  label: 'S  — 25×20×15 cm' },
  { code: 'M',  label: 'M  — 35×30×25 cm' },
  { code: 'L',  label: 'L  — 50×40×30 cm' },
  { code: 'XL', label: 'XL — 70×50×40 cm' },
  { code: 'CUSTOM', label: 'Personalizada' },
];

const SHIPMENT_CATEGORIES = [
  { value: 'FOOD_LOCAL',   label: '🍔 Comida / entrega local' },
  { value: 'DOCUMENT',     label: '📄 Documentos' },
  { value: 'FRAGILE',      label: '🔮 Artículos frágiles' },
  { value: 'ELECTRONICS',  label: '📱 Electrónicos' },
  { value: 'CLOTHING',     label: '👕 Ropa / accesorios' },
  { value: 'GENERAL',      label: '📦 Mercancía general' },
];

const MX_STATES = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua',
  'Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero',
  'Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro',
  'Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
  'Veracruz','Yucatán','Zacatecas',
];

interface Props {
  subdomain: string;
  primaryColor: string;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function StoreConfigTab({ subdomain, primaryColor, onToast }: Props) {
  const [config, setConfig] = useState<StoreConfigData>({
    available_box_sizes: 'S,M,L',
    shipment_category: 'GENERAL',
    offers_local_delivery: true,
    offers_national_shipping: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBoxSizes, setSelectedBoxSizes] = useState<string[]>(['S', 'M', 'L']);
  const [skydropxKey, setSkydropxKey] = useState('');
  const [originPhotoFile, setOriginPhotoFile] = useState<File | null>(null);
  const [originPhotoPreview, setOriginPhotoPreview] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'origin' | 'boxes' | 'shipping'>('origin');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetcher(`/delivery/store-config/?subdomain=${subdomain}`);
        setConfig(data);
        if (data.available_box_sizes) {
          setSelectedBoxSizes(data.available_box_sizes.split(',').map((s: string) => s.trim()));
        }
        if (data.origin_photo_url) setOriginPhotoPreview(data.origin_photo_url);
      } catch (err) {
        console.error('Error loading store config:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subdomain]);

  const toggleBoxSize = (code: string) => {
    setSelectedBoxSizes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOriginPhotoFile(file);
    setOriginPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        ...config,
        subdomain,
        available_box_sizes: selectedBoxSizes.join(','),
      };

      // Only include skydropx key if user typed something
      if (skydropxKey.trim()) {
        payload.skydropx_api_key = skydropxKey.trim();
      }

      // If photo file selected, upload via FormData
      if (originPhotoFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== null && v !== undefined) formData.append(k, String(v));
        });
        formData.append('origin_photo', originPhotoFile);
        await fetcher('/delivery/store-config/', {
          method: 'PUT',
          body: formData,
        });
      } else {
        await fetcher('/delivery/store-config/', {
          method: 'PUT',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });
      }

      onToast('Configuración de tienda guardada', 'success');
      setSkydropxKey('');
    } catch (err: any) {
      onToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-sm placeholder-white/30 focus:outline-none focus:border-white/30 transition-all';
  const sectionBtn = (key: typeof activeSection, label: string, icon: string) => (
    <button
      key={key}
      onClick={() => setActiveSection(key)}
      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer"
      style={{
        backgroundColor: activeSection === key ? `${primaryColor}20` : 'transparent',
        borderColor: activeSection === key ? primaryColor : 'transparent',
        color: activeSection === key ? primaryColor : 'rgba(255,255,255,0.5)',
      }}
    >
      {icon} {label}
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
            🏪 Configuración de Tienda
          </h2>
          <p className="text-xs text-white/50 mt-0.5">Origen de envíos, tamaños de caja y paquetería</p>
        </div>
        <div className="flex items-center gap-2">
          {(['origin', 'boxes', 'shipping'] as const).map((key, i) => {
            const opts = [
              ['origin',   'Origen',    '📍'],
              ['boxes',    'Cajas',     '📦'],
              ['shipping', 'Paquetería','🚚'],
            ] as const;
            return sectionBtn(key, opts[i][1], opts[i][2]);
          })}
        </div>
      </div>

      {/* ── Section: Origin ── */}
      {activeSection === 'origin' && (
        <div className="space-y-5">
          {/* Photo */}
          <div className="flex flex-col sm:flex-row items-start gap-6 p-6 rounded-3xl border border-white/10 bg-white/5">
            <div className="shrink-0">
              {originPhotoPreview ? (
                <img
                  src={originPhotoPreview}
                  alt="Origen"
                  className="w-28 h-28 rounded-2xl object-cover border border-white/10"
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-2xl flex items-center justify-center text-4xl border border-white/10"
                  style={{ backgroundColor: `${primaryColor}10` }}
                >
                  🏢
                </div>
              )}
              <label className="mt-2 block text-center text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all hover:opacity-80" style={{ color: primaryColor }}>
                Cambiar foto
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nombre del lugar de origen *"
                value={config.origin_name || ''}
                onChange={e => setConfig(p => ({ ...p, origin_name: e.target.value }))}
                className={inputCls}
              />
              <input
                type="tel"
                placeholder="Teléfono de contacto *"
                value={config.origin_phone || ''}
                onChange={e => setConfig(p => ({ ...p, origin_phone: e.target.value }))}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="Calle y número"
                value={config.origin_street || ''}
                onChange={e => setConfig(p => ({ ...p, origin_street: e.target.value }))}
                className={`${inputCls} sm:col-span-2`}
              />
              <input
                type="text"
                placeholder="Colonia / Fraccionamiento"
                value={config.origin_suburb || ''}
                onChange={e => setConfig(p => ({ ...p, origin_suburb: e.target.value }))}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="Ciudad"
                value={config.origin_city || ''}
                onChange={e => setConfig(p => ({ ...p, origin_city: e.target.value }))}
                className={inputCls}
              />
              <select
                value={config.origin_state || ''}
                onChange={e => setConfig(p => ({ ...p, origin_state: e.target.value }))}
                className={inputCls}
              >
                <option value="">Estado</option>
                {MX_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="text"
                placeholder="Código Postal"
                value={config.origin_zip_code || ''}
                onChange={e => setConfig(p => ({ ...p, origin_zip_code: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Shipment category */}
          <div className="p-5 rounded-3xl border border-white/10 bg-white/5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Tipo de producto que envías</p>
            <div className="flex flex-wrap gap-2">
              {SHIPMENT_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setConfig(p => ({ ...p, shipment_category: cat.value }))}
                  className="px-3 py-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer"
                  style={{
                    backgroundColor: config.shipment_category === cat.value ? `${primaryColor}20` : 'transparent',
                    borderColor: config.shipment_category === cat.value ? primaryColor : 'rgba(255,255,255,0.1)',
                    color: config.shipment_category === cat.value ? primaryColor : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery modes */}
          <div className="p-5 rounded-3xl border border-white/10 bg-white/5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Modalidades de entrega</p>
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                { key: 'offers_local_delivery' as const, label: '🛵 Entrega local (repartidor propio)' },
                { key: 'offers_national_shipping' as const, label: '📦 Envío nacional (paquetería Skydropx)' },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setConfig(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                    className={`w-10 h-6 rounded-full transition-all duration-300 relative cursor-pointer ${config[opt.key] ? '' : 'bg-white/10'}`}
                    style={{ backgroundColor: config[opt.key] ? primaryColor : undefined }}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                      style={{ left: config[opt.key] ? '22px' : '2px' }}
                    />
                  </div>
                  <span className="text-xs font-black">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Section: Boxes ── */}
      {activeSection === 'boxes' && (
        <div className="space-y-5">
          <div className="p-5 rounded-3xl border border-white/10 bg-white/5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Tamaños de caja disponibles</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BOX_SIZES.map(box => {
                const selected = selectedBoxSizes.includes(box.code);
                return (
                  <button
                    key={box.code}
                    onClick={() => toggleBoxSize(box.code)}
                    className="p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                    style={{
                      backgroundColor: selected ? `${primaryColor}15` : 'transparent',
                      borderColor: selected ? primaryColor : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <p className="text-sm font-black" style={{ color: selected ? primaryColor : 'inherit' }}>{box.code}</p>
                    <p className="text-[10px] opacity-50">{box.label.split('— ')[1]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedBoxSizes.includes('CUSTOM') && (
            <div className="p-5 rounded-3xl border border-white/10 bg-white/5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Dimensiones personalizadas</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'custom_box_length_cm', label: 'Largo (cm)' },
                  { key: 'custom_box_width_cm',  label: 'Ancho (cm)' },
                  { key: 'custom_box_height_cm', label: 'Alto (cm)' },
                  { key: 'custom_box_weight_kg', label: 'Peso máx (kg)' },
                ].map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider opacity-50">{field.label}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(config as any)[field.key] || ''}
                      onChange={e => setConfig(p => ({ ...p, [field.key]: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section: Shipping / Skydropx ── */}
      {activeSection === 'shipping' && (
        <div className="space-y-5">
          <div className="p-5 rounded-3xl border border-white/10 bg-white/5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl shrink-0">📡</div>
              <div>
                <p className="text-sm font-black">Integración Skydropx</p>
                <p className="text-[10px] opacity-50">Plataforma multi-paquetería (FedEx, DHL, Estafeta, J&T, etc.)</p>
              </div>
              {config.has_skydropx_api_key && (
                <span className="ml-auto px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-400 shrink-0">
                  ✓ Configurado
                </span>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider opacity-50">API Key de Skydropx</label>
              <input
                type="password"
                placeholder={config.has_skydropx_api_key ? '••••••••••••• (dejar vacío para no cambiar)' : 'sk_live_...'}
                value={skydropxKey}
                onChange={e => setSkydropxKey(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider opacity-50">Markup sobre tarifa de courier (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={config.shipping_markup_percentage || '15.00'}
                onChange={e => setConfig(p => ({ ...p, shipping_markup_percentage: e.target.value }))}
                className={inputCls}
              />
              <p className="text-[9px] opacity-40">Porcentaje que se suma al costo real de la guía antes de mostrar al cliente.</p>
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end pt-2">
        <button
          disabled={saving}
          onClick={handleSave}
          className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 cursor-pointer"
          style={{ backgroundColor: primaryColor, color: '#000' }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-t-transparent border-black animate-spin" />
              Guardando…
            </span>
          ) : '💾 Guardar configuración'}
        </button>
      </div>
    </div>
  );
}
