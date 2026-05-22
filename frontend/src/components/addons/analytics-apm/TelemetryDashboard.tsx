'use client';

import React, { useState, useEffect } from 'react';

interface TelemetryDashboardProps {
  primaryColor: string;
}

export default function TelemetryDashboard({ primaryColor }: TelemetryDashboardProps) {
  const [cpuUsage, setCpuUsage] = useState(24);
  const [ramUsage, setRamUsage] = useState(62);
  const [dbQueries, setDbQueries] = useState(8);
  const [webVitals, setWebVitals] = useState({
    lcp: 1.2,
    fid: 12,
    cls: 0.04
  });

  useEffect(() => {
    const timer = setInterval(() => {
      // Simulate real-time variation
      setCpuUsage((prev) => {
        const change = Math.floor(Math.random() * 9) - 4;
        return Math.max(10, Math.min(85, prev + change));
      });
      setRamUsage((prev) => {
        const change = Math.floor(Math.random() * 3) - 1;
        return Math.max(50, Math.min(95, prev + change));
      });
      setDbQueries(() => Math.floor(Math.random() * 15) + 3);
      setWebVitals((prev) => ({
        lcp: Math.max(0.6, Math.min(2.5, +(prev.lcp + (Math.random() * 0.4 - 0.2)).toFixed(2))),
        fid: Math.max(5, Math.min(45, Math.round(prev.fid + (Math.random() * 8 - 4)))),
        cls: Math.max(0.01, Math.min(0.12, +(prev.cls + (Math.random() * 0.02 - 0.01)).toFixed(3)))
      }));
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#050a06]/40 border border-white/5 rounded-[2rem] p-6 shadow-lg relative overflow-hidden group">
      <div
        className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-700 pointer-events-none group-hover:opacity-25"
        style={{ backgroundColor: primaryColor }}
      ></div>

      <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse"
            style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Panel de Rendimiento APM</h3>
            <p className="text-[9px] uppercase tracking-widest font-black text-white/40">Add-on: Analytics APM</p>
          </div>
        </div>
        
        <span className="text-[7.5px] uppercase tracking-widest font-black text-green-500 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full animate-pulse">
          Sistema Estable
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LCP Gauge */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <p className="text-[8px] text-white/40 uppercase font-black tracking-wider">Largest Contentful Paint</p>
            <p className="text-2xl font-black mt-2 text-white">{webVitals.lcp}s</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            <span className="text-[7px] text-white/50 uppercase font-black tracking-widest">Excelente (&lt;2.5s)</span>
          </div>
        </div>

        {/* FID Gauge */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <p className="text-[8px] text-white/40 uppercase font-black tracking-wider">First Input Delay</p>
            <p className="text-2xl font-black mt-2 text-white">{webVitals.fid}ms</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            <span className="text-[7px] text-white/50 uppercase font-black tracking-widest">Excelente (&lt;100ms)</span>
          </div>
        </div>

        {/* CLS Gauge */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <p className="text-[8px] text-white/40 uppercase font-black tracking-wider">Cumulative Layout Shift</p>
            <p className="text-2xl font-black mt-2 text-white">{webVitals.cls}</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            <span className="text-[7px] text-white/50 uppercase font-black tracking-widest">Excelente (&lt;0.1)</span>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-[#020403] border border-white/5 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Core CPU/RAM gauges */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] uppercase font-bold text-white/50">
            <span>Uso de CPU</span>
            <span className="text-white font-black">{cpuUsage}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${cpuUsage}%`, backgroundColor: cpuUsage > 75 ? '#ef4444' : cpuUsage > 50 ? '#f59e0b' : primaryColor }}
            ></div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[9px] uppercase font-bold text-white/50">
            <span>Uso de Memoria RAM</span>
            <span className="text-white font-black">{ramUsage}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${ramUsage}%`, backgroundColor: ramUsage > 85 ? '#ef4444' : primaryColor }}
            ></div>
          </div>
        </div>

        <div className="text-center md:text-right">
          <span className="text-[8px] text-white/40 uppercase font-black tracking-wider">Consultas SQL por segundo</span>
          <p className="text-lg font-black text-white mt-1" style={{ color: primaryColor }}>
            {dbQueries} <span className="text-[9px] text-white/30 uppercase">queries/s</span>
          </p>
        </div>
      </div>
    </div>
  );
}
