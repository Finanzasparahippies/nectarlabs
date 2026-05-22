'use client';

import React, { useState, useEffect } from 'react';

interface FleetMapProps {
  primaryColor: string;
}

export default function FleetMap({ primaryColor }: FleetMapProps) {
  const [eta, setEta] = useState(15);
  const [progress, setProgress] = useState(20);
  const [currentLocation, setCurrentLocation] = useState('Central de Operaciones');
  const [status, setStatus] = useState('Despachado');

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setStatus('Entregado');
          setCurrentLocation('Destino de Cliente');
          return 100;
        }
        const next = prev + 5;
        if (next > 80) {
          setStatus('Cerca de entrega');
          setCurrentLocation('Avenida Principal');
        } else if (next > 40) {
          setStatus('En ruta de distribución');
          setCurrentLocation('Sector Comercial Central');
        }
        setEta(Math.max(1, Math.round(15 * (1 - next / 100))));
        return next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#050a06]/40 border border-white/5 rounded-[2rem] p-6 shadow-lg relative overflow-hidden group">
      <div
        className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-700 pointer-events-none group-hover:opacity-25"
        style={{ backgroundColor: primaryColor }}
      ></div>

      <div className="flex items-center gap-3 mb-6">
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
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Seguimiento Logístico en Tiempo Real</h3>
          <p className="text-[9px] uppercase tracking-widest font-black text-white/40">Add-on: Logistics & GPS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Mock Map visualization */}
        <div className="lg:col-span-7 bg-[#020403] border border-white/5 rounded-2xl p-4 h-[180px] relative flex items-center justify-center overflow-hidden">
          {/* Simulated Grid Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          
          {/* Simulated Route */}
          <svg className="absolute w-full h-full p-6 text-white/10" viewBox="0 0 100 50">
            <path 
              d="M 10 40 Q 40 10, 60 35 T 90 10" 
              fill="none" 
              stroke="rgba(255,255,255,0.08)" 
              strokeWidth="2" 
              strokeDasharray="4 4" 
            />
            <path 
              d="M 10 40 Q 40 10, 60 35 T 90 10" 
              fill="none" 
              stroke={primaryColor} 
              strokeWidth="2" 
              strokeDasharray="100" 
              strokeDashoffset={100 - progress}
            />
          </svg>

          {/* Start Point */}
          <div className="absolute left-[12%] bottom-[12%] flex flex-col items-center">
            <span className="w-3 h-3 bg-white/40 rounded-full border border-black"></span>
            <span className="text-[6px] text-white/30 uppercase font-black tracking-widest mt-1">Origen</span>
          </div>

          {/* Delivery Vehicle Icon moving on track */}
          <div 
            className="absolute z-10 p-2 rounded-full border border-black shadow-lg transition-all duration-1000 ease-out flex items-center justify-center"
            style={{ 
              backgroundColor: primaryColor,
              left: `${10 + (progress * 0.8)}%`,
              top: `${40 - (progress * 0.35) + (progress > 50 ? (progress - 50) * 0.2 : 0)}%`
            }}
          >
            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>

          {/* End Point */}
          <div className="absolute right-[8%] top-[12%] flex flex-col items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full border border-black animate-pulse"></span>
            <span className="text-[6px] text-green-500/80 uppercase font-black tracking-widest mt-1">Destino</span>
          </div>

          <div className="absolute bottom-3 left-3 bg-[#050a06]/85 backdrop-blur-md border border-white/5 px-2.5 py-1 rounded-lg">
            <p className="text-[7.5px] text-white/50 uppercase font-bold tracking-widest">
              Ubicación: <span className="text-white">{currentLocation}</span>
            </p>
          </div>
        </div>

        {/* Telemetry info */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-black uppercase tracking-wider text-white/40">Estado de Envío</span>
              <span className="text-[8px] font-black uppercase tracking-wider text-green-400 animate-pulse">{status}</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-white/60 font-bold">Tiempo estimado (ETA):</span>
                <span className="font-black text-white" style={{ color: primaryColor }}>{eta} minutos</span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%`, backgroundColor: primaryColor }}
                ></div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-[7.5px] text-white/40 uppercase font-black">Velocidad</p>
                <p className="text-xs font-black text-white mt-0.5">48 km/h</p>
              </div>
              <div>
                <p className="text-[7.5px] text-white/40 uppercase font-black">Batería Dispositivo</p>
                <p className="text-xs font-black text-green-400 mt-0.5">94%</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setProgress(0);
              setEta(15);
              setStatus('Despachado');
              setCurrentLocation('Central de Operaciones');
            }}
            className="w-full py-3.5 border border-white/10 hover:bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/80 transition-all active:scale-95"
          >
            Reiniciar Simulación de Ruta
          </button>
        </div>
      </div>
    </div>
  );
}
