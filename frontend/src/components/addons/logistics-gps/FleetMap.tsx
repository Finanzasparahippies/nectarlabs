'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetcher } from '@/lib/api';

interface FleetMapProps {
  primaryColor: string;
  subdomain?: string;
}

interface Vehicle {
  id: number;
  name: string;
  plate_number?: string;
  driver_name?: string;
  is_active: boolean;
}

interface VehicleLocation {
  id: number;
  vehicle: number;
  vehicle_name: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

interface Stop {
  id: number;
  vehicle: number;
  vehicle_name: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  scheduled_time: string;
  status: 'PENDING' | 'ARRIVED' | 'DEPARTED';
  order: number;
}

export default function FleetMap({ primaryColor, subdomain }: FleetMapProps) {
  // Navigation tabs for Logistics Control Panel
  const [activePanelTab, setActivePanelTab] = useState<'tracking' | 'fleet' | 'dispatch' | 'telemetry'>('tracking');
  
  // API State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<VehicleLocation[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  
  // Loading & UI States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Form States - Create Vehicle
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleDriver, setNewVehicleDriver] = useState('');
  
  // Form States - Create Stop
  const [newStopName, setNewStopName] = useState('');
  const [newStopAddress, setNewStopAddress] = useState('');
  const [newStopLat, setNewStopLat] = useState('19.432608');
  const [newStopLon, setNewStopLon] = useState('-99.133209');
  const [newStopOrder, setNewStopOrder] = useState('1');
  const [newStopVehicleId, setNewStopVehicleId] = useState<number | null>(null);
  
  // Form States - Telemetry Update
  const [simLat, setSimLat] = useState('19.432608');
  const [simLon, setSimLon] = useState('-99.133209');
  const [simVehicleId, setSimVehicleId] = useState<number | null>(null);

  // Status message helper
  const showStatus = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // Fetch all Logistics telemetry data from Django Backend
  const loadData = async () => {
    if (!subdomain) return;
    setLoading(true);
    try {
      // Fetch vehicles, locations, and stops in parallel to optimize load speed
      const [vehiclesData, locationsData, stopsData] = await Promise.all([
        fetcher(`/delivery/vehicles/?subdomain=${subdomain}`),
        fetcher(`/delivery/location/?subdomain=${subdomain}`),
        fetcher(`/delivery/stops/?subdomain=${subdomain}`),
      ]);
      
      setVehicles(vehiclesData || []);
      setLocations(locationsData || []);
      setStops(stopsData || []);
      
      // Auto select first vehicle if none is selected
      if (vehiclesData && vehiclesData.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(vehiclesData[0].id);
      }
    } catch (err: any) {
      console.error('Error cargando datos de Nectar Delivery:', err);
      showStatus('Error al conectar con la API de Logística. Asegúrate de tener el Add-on activo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll location data every 10 seconds for real-time tracking dashboard updates
    const pollInterval = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [subdomain]);

  // Handle vehicle registration
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleName.trim()) return;

    try {
      setLoading(true);
      await fetcher(`/delivery/vehicles/`, {
        method: 'POST',
        body: JSON.stringify({
          name: newVehicleName.trim(),
          plate_number: newVehiclePlate.trim(),
          driver_name: newVehicleDriver.trim(),
          is_active: true,
          subdomain, // resolved tenant helper parameter
        }),
      });
      showStatus('Vehículo registrado con éxito.', 'success');
      setNewVehicleName('');
      setNewVehiclePlate('');
      setNewVehicleDriver('');
      loadData();
    } catch (err: any) {
      showStatus(err.message || 'Error al registrar vehículo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle stop assignment
  const handleCreateStop = async (e: React.FormEvent) => {
    e.preventDefault();
    const vId = newStopVehicleId || selectedVehicleId;
    if (!newStopName.trim() || !vId) {
      showStatus('Por favor ingresa un nombre y selecciona un vehículo.', 'error');
      return;
    }

    try {
      setLoading(true);
      await fetcher(`/delivery/stops/`, {
        method: 'POST',
        body: JSON.stringify({
          vehicle: vId,
          name: newStopName.trim(),
          address: newStopAddress.trim(),
          latitude: parseFloat(newStopLat),
          longitude: parseFloat(newStopLon),
          scheduled_time: new Date(Date.now() + 3600000 * 2).toISOString(), // defaults to +2 hours
          status: 'PENDING',
          order: parseInt(newStopOrder, 10),
          subdomain,
        }),
      });
      showStatus('Punto de parada registrado exitosamente.', 'success');
      setNewStopName('');
      setNewStopAddress('');
      setNewStopOrder(String(parseInt(newStopOrder, 10) + 1)); // increment auto order
      loadData();
    } catch (err: any) {
      showStatus(err.message || 'Error al registrar la parada.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle telemetry / GPS coordinate simulation
  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const vId = simVehicleId || selectedVehicleId;
    if (!vId) {
      showStatus('Selecciona un vehículo para enviar coordenadas GPS.', 'error');
      return;
    }

    try {
      setLoading(true);
      await fetcher(`/delivery/location/update/`, {
        method: 'POST',
        body: JSON.stringify({
          vehicle_id: vId,
          latitude: parseFloat(simLat),
          longitude: parseFloat(simLon),
          subdomain,
        }),
      });
      showStatus(`Señal GPS enviada para Vehículo #${vId}. Coordenadas: ${simLat}, ${simLon}`, 'success');
      loadData();
    } catch (err: any) {
      showStatus(err.message || 'Error al actualizar telemetría GPS.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update a stop's delivery progress status
  const handleUpdateStopStatus = async (stopId: number, nextStatus: 'PENDING' | 'ARRIVED' | 'DEPARTED') => {
    try {
      setLoading(true);
      await fetcher(`/delivery/stops/${stopId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          subdomain,
        }),
      });
      showStatus(`Parada actualizada a ${nextStatus}.`, 'success');
      loadData();
    } catch (err: any) {
      showStatus(err.message || 'Error al actualizar el estado de la parada.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete a stop
  const handleDeleteStop = async (stopId: number) => {
    try {
      setLoading(true);
      await fetcher(`/delivery/stops/${stopId}/?subdomain=${subdomain}`, {
        method: 'DELETE',
      });
      showStatus('Parada eliminada.', 'success');
      loadData();
    } catch (err: any) {
      showStatus(err.message || 'Error al eliminar la parada.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get current state of selected vehicle mapping
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedLocation = locations.find(loc => loc.vehicle === selectedVehicleId);
  const selectedStops = stops.filter(st => st.vehicle === selectedVehicleId);

  // Dynamic SVG radar-map bounds mapping calculations
  const getCoordinatesPoints = () => {
    const points: { lat: number; lon: number }[] = [];
    if (selectedLocation) {
      points.push({ lat: Number(selectedLocation.latitude), lon: Number(selectedLocation.longitude) });
    }
    selectedStops.forEach(st => {
      points.push({ lat: Number(st.latitude), lon: Number(st.longitude) });
    });

    if (points.length === 0) {
      // Default fallback (Ciudad de México Center coords)
      return {
        minLat: 19.400000,
        maxLat: 19.460000,
        minLon: -99.160000,
        maxLon: -99.100000
      };
    }

    const lats = points.map(p => p.lat);
    const lons = points.map(p => p.lon);
    
    // Add small buffer to prevent dividing by zero and keep points slightly inside border edge
    const minLat = Math.min(...lats) - 0.005;
    const maxLat = Math.max(...lats) + 0.005;
    const minLon = Math.min(...lons) - 0.005;
    const maxLon = Math.max(...lons) + 0.005;

    return { minLat, maxLat, minLon, maxLon };
  };

  const bounds = getCoordinatesPoints();

  const getSvgPos = (lat: number, lon: number) => {
    const latRange = bounds.maxLat - bounds.minLat;
    const lonRange = bounds.maxLon - bounds.minLon;

    const x = lonRange === 0 ? 50 : 15 + ((lon - bounds.minLon) / lonRange) * 70;
    const y = latRange === 0 ? 50 : 85 - ((lat - bounds.minLat) / latRange) * 70; // invert y for maps projection

    return { x, y };
  };

  // Format progress stats
  const completedStops = selectedStops.filter(s => s.status === 'DEPARTED').length;
  const progressPercentage = selectedStops.length > 0 
    ? Math.round((completedStops / selectedStops.length) * 100)
    : 0;

  return (
    <div className="bg-[#050a06]/40 border border-white/5 rounded-[2rem] p-6 shadow-lg relative overflow-hidden group text-white">
      {/* Background glow styling */}
      <div
        className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      ></div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Nectar Delivery & GPS</h3>
            <p className="text-[9px] uppercase tracking-widest font-black text-white/40">Portal de Rastreo y Logística en Tiempo Real</p>
          </div>
        </div>

        {/* Navigation Tabs for Operations Panel */}
        <div className="flex flex-wrap gap-1 bg-black/45 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setActivePanelTab('tracking')} 
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${activePanelTab === 'tracking' ? 'bg-[#C68A1E] text-black' : 'text-white/60 hover:text-white'}`}
          >
            📍 Rastreo Map
          </button>
          <button 
            onClick={() => setActivePanelTab('fleet')} 
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${activePanelTab === 'fleet' ? 'bg-[#C68A1E] text-black' : 'text-white/60 hover:text-white'}`}
          >
            🚚 Flota
          </button>
          <button 
            onClick={() => setActivePanelTab('dispatch')} 
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${activePanelTab === 'dispatch' ? 'bg-[#C68A1E] text-black' : 'text-white/60 hover:text-white'}`}
          >
            📋 Despacho
          </button>
          <button 
            onClick={() => setActivePanelTab('telemetry')} 
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${activePanelTab === 'telemetry' ? 'bg-[#C68A1E] text-black' : 'text-white/60 hover:text-white'}`}
          >
            📡 Simulador GPS
          </button>
        </div>
      </div>

      {/* Global Status Banner Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {loading && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#C68A1E]/10 border border-[#C68A1E]/30 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-[#C68A1E] rounded-full animate-ping"></span>
          <span className="text-[8px] font-black uppercase tracking-widest text-[#C68A1E]">Sincronizando...</span>
        </div>
      )}

      {/* MAIN CONTENT PANELS */}
      
      {/* 1. REALTIME TRACKING PANEL */}
      {activePanelTab === 'tracking' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Map Display Bounding Box */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Vehicle Selector bar */}
            <div className="flex gap-2 items-center bg-black/30 border border-white/5 p-2 rounded-xl">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40 pl-2">Seleccionar Vehículo:</label>
              <select 
                value={selectedVehicleId || ''} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedVehicleId(val);
                  // Load current locations for preset form coordinates
                  const loc = locations.find(l => l.vehicle === val);
                  if (loc) {
                    setSimLat(String(loc.latitude));
                    setSimLon(String(loc.longitude));
                  }
                }}
                className="bg-black border border-white/10 rounded-lg text-[10px] px-3 py-1 focus:outline-none focus:border-nectar-gold font-bold"
              >
                {vehicles.length === 0 && <option value="">Sin vehículos registrados</option>}
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.driver_name || 'Sin conductor'})</option>
                ))}
              </select>
            </div>

            <div className="bg-[#020403] border border-white/5 rounded-2xl p-4 h-[300px] relative flex items-center justify-center overflow-hidden">
              {/* Grid backdrop */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
              
              {/* Radar Sweeper Visual Effect */}
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(198,138,30,0.03)_0deg,transparent_180deg)] animate-[spin_8s_linear_infinite] pointer-events-none"></div>
              
              {/* Trace Delivery Route Paths dynamically */}
              <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Draw connecting lines between stops in ordered sequence */}
                {selectedStops.length > 1 && (
                  <path 
                    d={selectedStops.reduce((pathStr, st, idx) => {
                      const { x, y } = getSvgPos(Number(st.latitude), Number(st.longitude));
                      return pathStr + `${idx === 0 ? 'M' : 'L'} ${x} ${y} `;
                    }, '')}
                    fill="none" 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="1" 
                    strokeDasharray="2 2"
                  />
                )}
                
                {/* Active Path from vehicle to next pending stops */}
                {selectedLocation && selectedStops.length > 0 && (
                  <line
                    x1={getSvgPos(Number(selectedLocation.latitude), Number(selectedLocation.longitude)).x}
                    y1={getSvgPos(Number(selectedLocation.latitude), Number(selectedLocation.longitude)).y}
                    x2={getSvgPos(Number(selectedStops[0].latitude), Number(selectedStops[0].longitude)).x}
                    y2={getSvgPos(Number(selectedStops[0].latitude), Number(selectedStops[0].longitude)).y}
                    stroke={primaryColor}
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                )}
              </svg>

              {/* Render Stops Icons */}
              {selectedStops.map((stop, idx) => {
                const { x, y } = getSvgPos(Number(stop.latitude), Number(stop.longitude));
                const isCompleted = stop.status === 'DEPARTED';
                const isArrived = stop.status === 'ARRIVED';
                
                return (
                  <div 
                    key={stop.id}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group/stop"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <span 
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black border text-black shadow-md transition-all ${
                        isCompleted 
                          ? 'bg-white/40 border-white/20' 
                          : isArrived 
                            ? 'bg-yellow-500 border-yellow-300 animate-pulse'
                            : 'bg-green-500 border-green-300 animate-[bounce_2s_infinite]'
                      }`}
                    >
                      {stop.order}
                    </span>
                    <span className="absolute top-4 scale-0 group-hover/stop:scale-100 transition-all bg-black/90 border border-white/10 px-2 py-1 rounded text-[8px] font-bold whitespace-nowrap text-white z-20">
                      {stop.name} ({stop.status})
                    </span>
                  </div>
                );
              })}

              {/* Render Delivery Vehicle Icon on its current GPS location */}
              {selectedLocation ? (
                (() => {
                  const { x, y } = getSvgPos(Number(selectedLocation.latitude), Number(selectedLocation.longitude));
                  return (
                    <div 
                      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      <div className="relative">
                        <span className="absolute -inset-2 rounded-full animate-ping opacity-75" style={{ backgroundColor: primaryColor }}></span>
                        <div 
                          className="w-8 h-8 rounded-full border border-black shadow-xl flex items-center justify-center relative z-10"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <svg className="w-4.5 h-4.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10 text-center p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    ⚠️ No hay coordenadas GPS reportadas.<br />
                    Ve a la pestaña "Simulador GPS" para inicializar telemetría.
                  </p>
                </div>
              )}

              {/* Map Footer indicators */}
              <div className="absolute bottom-3 left-3 right-3 flex justify-between bg-[#050a06]/85 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-lg text-[8px] font-bold text-white/60">
                <p>Ubicación Vehículo: <span className="text-white font-mono">{selectedLocation ? `${Number(selectedLocation.latitude).toFixed(4)}, ${Number(selectedLocation.longitude).toFixed(4)}` : 'Desconocido'}</span></p>
                <p>Último Ping: <span className="text-[#C68A1E] font-mono">{selectedLocation ? new Date(selectedLocation.updated_at).toLocaleTimeString() : 'N/A'}</span></p>
              </div>
            </div>
          </div>

          {/* Right Column: Telemetry & List of Stops */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black uppercase tracking-wider text-white/40">Estatus del Enlace</span>
                <span className="text-[8px] font-black uppercase tracking-wider text-green-400 animate-pulse">Conectado en Vivo</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-white/60 font-bold">Progreso de Paradas:</span>
                  <span className="font-black text-white" style={{ color: primaryColor }}>{completedStops} / {selectedStops.length}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progressPercentage}%`, backgroundColor: primaryColor }}
                  ></div>
                </div>
              </div>

              {/* Driver telemetry specs */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40 uppercase font-black text-[8px]">Conductor:</span>
                  <span className="text-white font-bold">{selectedVehicle?.driver_name || 'Sin asignar'}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40 uppercase font-black text-[8px]">Placas:</span>
                  <span className="text-white font-mono font-bold">{selectedVehicle?.plate_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40 uppercase font-black text-[8px]">Estado del Vehículo:</span>
                  <span className={`font-black ${selectedVehicle?.is_active ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedVehicle?.is_active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              </div>
            </div>

            {/* List of stops details */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 space-y-3 text-left">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-white border-b border-white/5 pb-2">Ruta de Entregas Programada</h4>
              {selectedStops.length === 0 ? (
                <p className="text-[9px] text-white/30 italic">No hay paradas asignadas a este vehículo.</p>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {selectedStops.map((stop) => (
                    <div key={stop.id} className="flex justify-between items-start gap-2 bg-white/[0.02] border border-white/5 p-2 rounded-lg text-[9px]">
                      <div>
                        <p className="font-bold text-white">{stop.order}. {stop.name}</p>
                        <p className="text-[8px] text-white/40 mt-0.5 truncate max-w-[130px]" title={stop.address}>{stop.address}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[7px] font-black ${
                        stop.status === 'DEPARTED' 
                          ? 'bg-white/10 text-white/50' 
                          : stop.status === 'ARRIVED' 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse'
                      }`}>
                        {stop.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={loadData}
              className="w-full py-3 border border-white/10 hover:bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              🔄 Sincronizar Ahora
            </button>
          </div>
        </div>
      )}

      {/* 2. VEHICLES MANAGEMENT PANEL */}
      {activePanelTab === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Create Vehicle Form */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-white border-b border-white/5 pb-2">Registrar Nuevo Vehículo</h4>
            <form onSubmit={handleCreateVehicle} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Nombre Identificador</label>
                <input 
                  type="text" 
                  value={newVehicleName}
                  onChange={(e) => setNewVehicleName(e.target.value)}
                  placeholder="Ej. Camioneta Ford A-3"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Placas del Vehículo</label>
                <input 
                  type="text" 
                  value={newVehiclePlate}
                  onChange={(e) => setNewVehiclePlate(e.target.value)}
                  placeholder="Ej. GHY-129-A"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Nombre del Chofer</label>
                <input 
                  type="text" 
                  value={newVehicleDriver}
                  onChange={(e) => setNewVehicleDriver(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-[#C68A1E] text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                {loading ? 'Procesando...' : 'Crear Vehículo'}
              </button>
            </form>
          </div>

          {/* List of active vehicles */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-white border-b border-white/5 pb-2">Vehículos Activos</h4>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {vehicles.length === 0 ? (
                <p className="text-[9px] text-white/30 italic">No hay vehículos registrados en este portal.</p>
              ) : (
                vehicles.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[10px]">
                    <div>
                      <p className="font-bold text-white">{v.name}</p>
                      <p className="text-[8px] text-white/40 mt-0.5">
                        Chofer: <span className="text-white/70">{v.driver_name || 'N/A'}</span> | Placas: <span className="text-white/70 font-mono">{v.plate_number || 'N/A'}</span>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[8px] font-black">
                      OPERATIVO
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. DISPATCH & STOPS MANAGEMENT PANEL */}
      {activePanelTab === 'dispatch' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
          {/* Create Stop Form */}
          <div className="md:col-span-5 bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-white border-b border-white/5 pb-2">Agregar Parada / Entrega</h4>
            <form onSubmit={handleCreateStop} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Asignar al Vehículo</label>
                <select 
                  value={newStopVehicleId || selectedVehicleId || ''} 
                  onChange={(e) => setNewStopVehicleId(Number(e.target.value))}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold font-bold"
                >
                  <option value="">Seleccionar...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Nombre del Destinatario / Parada</label>
                <input 
                  type="text" 
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  placeholder="Ej. Tienda Centro / Casa de Cliente"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Dirección Física</label>
                <input 
                  type="text" 
                  value={newStopAddress}
                  onChange={(e) => setNewStopAddress(e.target.value)}
                  placeholder="Ej. Av. Reforma #120, Col. Centro"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Latitud</label>
                  <input 
                    type="text" 
                    value={newStopLat}
                    onChange={(e) => setNewStopLat(e.target.value)}
                    placeholder="19.4326"
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Longitud</label>
                  <input 
                    type="text" 
                    value={newStopLon}
                    onChange={(e) => setNewStopLon(e.target.value)}
                    placeholder="-99.1332"
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold font-mono"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Orden en la Ruta</label>
                <input 
                  type="number" 
                  value={newStopOrder}
                  onChange={(e) => setNewStopOrder(e.target.value)}
                  placeholder="1"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold font-mono"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-[#C68A1E] text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                {loading ? 'Procesando...' : 'Crear Punto de Ruta'}
              </button>
            </form>
          </div>

          {/* List and transitions controls of existing stops */}
          <div className="md:col-span-7 bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Paradas Registradas</h4>
              
              {/* Selector in header to filter list */}
              <select
                value={selectedVehicleId || ''}
                onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
                className="bg-black border border-white/10 rounded-lg text-[9px] px-2 py-0.5 text-white"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {selectedStops.length === 0 ? (
                <p className="text-[9px] text-white/30 italic">No hay paradas asignadas a este vehículo.</p>
              ) : (
                selectedStops.map(st => (
                  <div key={st.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-white">{st.order}. {st.name}</p>
                        <p className="text-[8px] text-white/40 mt-0.5 font-bold truncate max-w-[200px]" title={st.address}>{st.address}</p>
                        <p className="text-[7.5px] text-white/30 font-mono mt-0.5">GPS: {st.latitude}, {st.longitude}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[7px] font-black ${
                        st.status === 'DEPARTED' 
                          ? 'bg-white/10 text-white/50' 
                          : st.status === 'ARRIVED' 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse'
                      }`}>
                        {st.status}
                      </span>
                    </div>

                    {/* Operational controls to update status in real time */}
                    <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleUpdateStopStatus(st.id, 'PENDING')}
                          className={`px-2 py-1 rounded text-[7px] font-black uppercase ${st.status === 'PENDING' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                        >
                          En Espera
                        </button>
                        <button
                          onClick={() => handleUpdateStopStatus(st.id, 'ARRIVED')}
                          className={`px-2 py-1 rounded text-[7px] font-black uppercase ${st.status === 'ARRIVED' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                        >
                          Llegó
                        </button>
                        <button
                          onClick={() => handleUpdateStopStatus(st.id, 'DEPARTED')}
                          className={`px-2 py-1 rounded text-[7px] font-black uppercase ${st.status === 'DEPARTED' ? 'bg-white/20 text-white/40' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                        >
                          Entregó
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteStop(st.id)}
                        className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 rounded text-[7px] font-black uppercase cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. REAL GPS TELEMETRY SIMULATION PANEL */}
      {activePanelTab === 'telemetry' && (
        <div className="max-w-xl mx-auto bg-white/[0.01] border border-white/5 rounded-2xl p-6 text-left space-y-4">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Transmisor GPS Satelital (Telemetría de Chofer)</h4>
            <p className="text-[8px] text-white/40 uppercase tracking-widest mt-0.5">Actualización de coordenadas GPS en producción</p>
          </div>
          
          <form onSubmit={handleUpdateLocation} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Vehículo Transmisor</label>
              <select 
                value={simVehicleId || selectedVehicleId || ''} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSimVehicleId(val);
                  // Load current locations for preset form coordinates
                  const loc = locations.find(l => l.vehicle === val);
                  if (loc) {
                    setSimLat(String(loc.latitude));
                    setSimLon(String(loc.longitude));
                  }
                }}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold font-bold"
              >
                <option value="">Seleccionar vehículo...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Latitud Actual</label>
                <input 
                  type="text" 
                  value={simLat}
                  onChange={(e) => setSimLat(e.target.value)}
                  placeholder="19.432608"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Longitud Actual</label>
                <input 
                  type="text" 
                  value={simLon}
                  onChange={(e) => setSimLon(e.target.value)}
                  placeholder="-99.133209"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-nectar-gold font-mono"
                  required
                />
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-2">
              <h5 className="text-[8px] font-black uppercase tracking-wider text-nectar-gold">💡 ¿Cómo funciona en producción?</h5>
              <p className="text-[8px] text-white/60 leading-relaxed">
                Este panel emula el dispositivo móvil del chofer o la antena GPS incorporada en el camión. 
                Al ingresar coordenadas y presionar <strong>"Enviar Coordenadas GPS"</strong>, se enviará una llamada de telemetría segura a nuestro backend 
                Django. La base de datos persistirá la posición y el panel de seguimiento reflejará de inmediato el nuevo movimiento del vehículo 
                con respecto a la ruta de paradas asignadas.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-[#C68A1E] text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer font-bold"
            >
              {loading ? 'Transmitiendo GPS...' : 'Transmitir Coordenadas GPS en Vivo'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
