'use client';

/**
 * DeliveryMap — Leaflet-based map for real-time driver tracking.
 * Uses react-leaflet. If not installed: npm install react-leaflet leaflet @types/leaflet
 */

import React, { useEffect, useRef } from 'react';

interface MarkerData {
  id: string;
  lat: number;
  lon: number;
  label: string;
  type: 'driver' | 'destination' | 'stop';
}

interface DeliveryMapProps {
  primaryColor: string;
  subdomain?: string;
  markers?: MarkerData[];
  center?: [number, number];
  zoom?: number;
}

export default function DeliveryMap({
  primaryColor,
  markers = [],
  center,
  zoom = 14,
}: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerLayersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (leafletMapRef.current) return; // Already initialized

    // Dynamically import Leaflet to avoid SSR errors
    import('leaflet').then(L => {
      // Fix default icon paths in bundled environments
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!mapRef.current) return;

      const defaultCenter: [number, number] = center || [19.432608, -99.133209];
      const map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom,
        zoomControl: true,
        attributionControl: false,
      });

      // Dark-ish tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Attribution minimal
      L.control.attribution({ prefix: '© Carto' }).addTo(map);

      leafletMapRef.current = map;
    });

    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      markerLayersRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers whenever `markers` prop changes
  useEffect(() => {
    if (!leafletMapRef.current || typeof window === 'undefined') return;

    import('leaflet').then(L => {
      const map = leafletMapRef.current;
      const currentLayers = markerLayersRef.current;

      // Build set of new IDs
      const newIds = new Set(markers.map(m => m.id));

      // Remove stale markers
      currentLayers.forEach((layer, id) => {
        if (!newIds.has(id)) {
          map.removeLayer(layer);
          currentLayers.delete(id);
        }
      });

      // Add / update markers
      markers.forEach(m => {
        const icon = createCustomIcon(L, m.type, primaryColor);
        if (currentLayers.has(m.id)) {
          currentLayers.get(m.id).setLatLng([m.lat, m.lon]);
        } else {
          const marker = L.marker([m.lat, m.lon], { icon })
            .addTo(map)
            .bindPopup(`<b>${m.label}</b>`);
          currentLayers.set(m.id, marker);
        }
      });

      // Re-center if a driver marker is present
      const driverMarker = markers.find(m => m.type === 'driver');
      if (driverMarker) {
        map.flyTo([driverMarker.lat, driverMarker.lon], zoom, { animate: true, duration: 0.8 });
      } else if (center) {
        map.setView(center, zoom);
      }
    });
  }, [markers, center, primaryColor, zoom]);

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin="anonymous"
      />
      <div
        ref={mapRef}
        className="w-full h-full min-h-[280px]"
        style={{ background: '#1a1a2e' }}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// Custom emoji icons via DivIcon
// ─────────────────────────────────────────────
function createCustomIcon(L: any, type: MarkerData['type'], primaryColor: string) {
  const configs = {
    driver: { emoji: '🛵', bg: primaryColor },
    destination: { emoji: '📍', bg: '#EF4444' },
    stop: { emoji: '📦', bg: '#8B5CF6' },
  };
  const cfg = configs[type] || configs.stop;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        background:${cfg.bg};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        width:36px;height:36px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 14px ${cfg.bg}60;
        border:2px solid rgba(255,255,255,0.3);
      ">
        <span style="transform:rotate(45deg);font-size:16px;line-height:1">${cfg.emoji}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}
