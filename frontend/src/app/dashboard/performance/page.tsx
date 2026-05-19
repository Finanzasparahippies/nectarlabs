'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api';

interface ServerSummary {
  avg_response_time: number;
  max_response_time: number;
  avg_queries: number;
  total_requests: number;
}

interface WebVital {
  name: string;
  avg_value: number;
  count: number;
}

interface SlowEndpoint {
  path: string;
  avg_time: number;
}

interface PerformanceSummary {
  server: ServerSummary;
  vitals: WebVital[];
  slowest_endpoints: SlowEndpoint[];
}

export default function PerformancePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    const staff = localStorage.getItem('is_staff') === 'true';
    setIsStaff(staff);
    if (!staff) {
      router.push('/dashboard');
      return;
    }

    const loadPerformance = async () => {
      try {
        const data = await fetcher('/performance/summary/');
        setSummary(data);
      } catch (err: any) {
        console.error("Error loading performance:", err);
        setError("Error al cargar las métricas de rendimiento. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    loadPerformance();
  }, [router]);

  if (!isStaff) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px] animate-pulse">Sincronizando Diagnósticos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3rem flex items-center justify-center text-3xl font-black mb-6">
          !
        </div>
        <h2 className="text-3xl font-black tracking-tighter mb-4">{error}</h2>
        <Link href="/dashboard" className="px-8 py-4 bg-foreground text-background font-black uppercase tracking-widest text-xs rounded-2xl">
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Sidebar - Consistent with Dashboard */}
      <aside className="w-full lg:w-72 bg-card-bg border-b lg:border-r border-card-border p-8 flex flex-col justify-between">
        <div>
          <Link href="/" className="inline-block text-xl font-black tracking-tighter mb-16">
            NECTAR <span className="text-nectar-gold">LABS</span>
          </Link>
          
          <nav className="space-y-4">
            <Link href="/dashboard" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Dashboard
            </Link>

            {isStaff && (
              <Link href="/dashboard?tab=business" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
                <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
                Control Negocio
              </Link>
            )}

            {isStaff && (
              <Link href="/dashboard/performance" className="flex items-center gap-4 px-6 py-4 bg-nectar-gold/10 text-nectar-gold rounded-2xl font-black uppercase tracking-widest text-[10px]">
                <div className="w-2 h-2 bg-nectar-gold rounded-full"></div>
                Rendimiento
              </Link>
            )}

            <Link href="/tickets" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Gestión Tickets
            </Link>
            <Link href="/projects" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Proyectos
            </Link>
          </nav>
        </div>

        <button
          onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          className="mt-20 flex items-center gap-4 px-6 py-4 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]"
        >
          <span>Cerrar Sesión</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-12 lg:p-16 overflow-y-auto">
        <header className="mb-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">
            Métricas de Servidor
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-nectar-gold opacity-80">
            Diagnósticos del sistema en tiempo real
          </p>
        </header>

        {/* Server metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Card 1 */}
          <div className="bg-card-bg border border-card-border p-8 rounded-[2rem] hover:border-nectar-gold/50 transition-all group duration-300">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Tiempos de Respuesta (Avg)</span>
              <svg className="w-5 h-5 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-black tracking-tighter mb-2 text-foreground">
              {summary?.server.avg_response_time.toFixed(3)}s
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-nectar-gold opacity-65">Promedio Global</div>
          </div>

          {/* Card 2 */}
          <div className="bg-card-bg border border-card-border p-8 rounded-[2rem] hover:border-nectar-gold/50 transition-all group duration-300">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Consultas DB (Avg)</span>
              <svg className="w-5 h-5 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div className="text-3xl font-black tracking-tighter mb-2 text-foreground">
              {summary?.server.avg_queries.toFixed(1)}
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-nectar-gold opacity-65">Queries por solicitud</div>
          </div>

          {/* Card 3 */}
          <div className="bg-card-bg border border-card-border p-8 rounded-[2rem] hover:border-nectar-gold/50 transition-all group duration-300">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Total Solicitudes</span>
              <svg className="w-5 h-5 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-3xl font-black tracking-tighter mb-2 text-foreground">
              {summary?.server.total_requests.toLocaleString()}
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-nectar-gold opacity-65">Peticiones totales</div>
          </div>

          {/* Card 4 */}
          <div className="bg-card-bg border border-card-border p-8 rounded-[2rem] hover:border-nectar-gold/50 transition-all group duration-300">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Tiempo Máximo</span>
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-3xl font-black tracking-tighter mb-2 text-foreground">
              {summary?.server.max_response_time.toFixed(3)}s
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-red-500/80">Peor caso registrado</div>
          </div>
        </div>

        {/* Detailed performance views */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Core Web Vitals */}
          <div className="bg-card-bg border border-card-border rounded-[3rem] p-8 md:p-12">
            <header className="mb-8">
              <h2 className="text-2xl font-black tracking-tighter">Core Web Vitals</h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-nectar-gold opacity-80">Rendimiento en el navegador (Promedio)</p>
            </header>
            <div className="space-y-4">
              {summary?.vitals && summary.vitals.length > 0 ? (
                summary.vitals.map(v => (
                  <div key={v.name} className="flex justify-between items-center p-5 bg-background/50 border border-card-border/60 rounded-2xl hover:border-nectar-gold/20 transition-all">
                    <div>
                      <span className="font-bold text-sm block tracking-wide">{v.name}</span>
                      <span className="text-[9px] font-bold uppercase opacity-35">{v.count} muestras</span>
                    </div>
                    <span className="font-black text-nectar-gold text-lg">{v.avg_value.toFixed(2)} ms</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-sm opacity-40 font-bold">
                  No hay datos de Web Vitals disponibles todavía.
                </div>
              )}
            </div>
          </div>

          {/* Slowest endpoints */}
          <div className="bg-card-bg border border-card-border rounded-[3rem] p-8 md:p-12">
            <header className="mb-8">
              <h2 className="text-2xl font-black tracking-tighter">Endpoints más lentos</h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-nectar-gold opacity-80">Optimizaciones prioritarias</p>
            </header>
            <div className="space-y-5">
              {summary?.slowest_endpoints && summary.slowest_endpoints.length > 0 ? (
                summary.slowest_endpoints.map((e, index) => {
                  const maxTime = Math.max(...(summary?.slowest_endpoints.map(ep => ep.avg_time) || [1]));
                  const pct = Math.min(100, Math.max(10, (e.avg_time / maxTime) * 100));
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="font-mono text-foreground/75 truncate max-w-[280px]">{e.path}</span>
                        <span className="text-nectar-gold font-black">{e.avg_time.toFixed(3)}s</span>
                      </div>
                      <div className="w-full bg-card-border/30 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-nectar-gold to-orange-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-sm opacity-40 font-bold">
                  No hay solicitudes registradas todavía.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
