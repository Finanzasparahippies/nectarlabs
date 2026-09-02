'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api';
import DashboardSidebar from '@/components/DashboardSidebar';

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

interface HardwareStat {
  percent: number;
  used?: number;
  total?: number;
}

interface HardwareSummary {
  cpu: HardwareStat;
  ram: HardwareStat;
  disk: HardwareStat;
}

interface PerformanceSummary {
  server: ServerSummary;
  vitals: WebVital[];
  slowest_endpoints: SlowEndpoint[];
  hardware: HardwareSummary;
}

interface LogFile {
  name: string;
  size: number;
  modified: number | null;
}

export default function PerformancePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [downloadingLog, setDownloadingLog] = useState<string | null>(null);

  useEffect(() => {
    const staff = localStorage.getItem('is_staff') === 'true';
    const role = localStorage.getItem('user_role') || '';
    const isAllowed = (staff || role === 'ADMIN' || role === 'BUSINESS') && role !== 'DESIGNER';
    setIsStaff(isAllowed);
    if (!isAllowed) {
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

    const loadLogs = async () => {
      try {
        const logsData = await fetcher('/performance/logs/');
        setLogs(logsData || []);
      } catch (err: any) {
        console.error("Error loading logs list:", err);
      } finally {
        setLoadingLogs(false);
      }
    };

    loadPerformance();
    loadLogs();
  }, [router]);

  const handleDownloadLog = async (filename: string) => {
    setDownloadingLog(filename);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/performance/logs/download/?file=${encodeURIComponent(filename)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("No se pudo descargar el archivo de log");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Error al descargar ${filename}: ${err.message || 'Intente de nuevo'}`);
    } finally {
      setDownloadingLog(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isStaff) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-black uppercase tracking-[0.4em] opacity-20 text-2xs animate-pulse">Sincronizando Diagnósticos...</div>
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
      <DashboardSidebar />

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-12 lg:p-16 overflow-y-auto">
        <header className="mb-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">
            Métricas de Servidor
          </h1>
          <p className="text-2xs font-black uppercase tracking-widest text-nectar-gold opacity-80">
            Diagnósticos del sistema en tiempo real
          </p>
        </header>

        {/* Hardware Status Section */}
        <section className="mb-12">
          <h2 className="text-sm font-black uppercase tracking-widest mb-6 opacity-60">Rendimiento de Hardware</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU Metric */}
            <div className="bg-card-bg border border-card-border p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-nectar-gold/50 transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <span className="text-2xs font-black uppercase tracking-widest opacity-40">Procesador (CPU)</span>
                <svg className="w-5 h-5 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-black tracking-tighter">{summary?.hardware.cpu.percent}%</span>
                <span className="text-xs opacity-40 font-bold">uso activo</span>
              </div>
              <div className="w-full bg-card-border/30 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    (summary?.hardware.cpu.percent ?? 0) > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-nectar-gold to-yellow-500'
                  }`}
                  style={{ width: `${summary?.hardware.cpu.percent}%` }}
                ></div>
              </div>
            </div>

            {/* RAM Metric */}
            <div className="bg-card-bg border border-card-border p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-nectar-gold/50 transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <span className="text-2xs font-black uppercase tracking-widest opacity-40">Memoria RAM</span>
                <svg className="w-5 h-5 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-black tracking-tighter">{summary?.hardware.ram.percent}%</span>
                <span className="text-xs opacity-45 font-bold">
                  {summary?.hardware.ram.used?.toFixed(2)} GB / {summary?.hardware.ram.total?.toFixed(1)} GB
                </span>
              </div>
              <div className="w-full bg-card-border/30 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    (summary?.hardware.ram.percent ?? 0) > 85 ? 'bg-red-500' : 'bg-gradient-to-r from-nectar-gold to-yellow-500'
                  }`}
                  style={{ width: `${summary?.hardware.ram.percent}%` }}
                ></div>
              </div>
            </div>

            {/* Disk Metric */}
            <div className="bg-card-bg border border-card-border p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-nectar-gold/50 transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <span className="text-2xs font-black uppercase tracking-widest opacity-40">Almacenamiento (SSD)</span>
                <svg className="w-5 h-5 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-black tracking-tighter">{summary?.hardware.disk.percent}%</span>
                <span className="text-xs opacity-45 font-bold">
                  {summary?.hardware.disk.used?.toFixed(1)} GB / {summary?.hardware.disk.total?.toFixed(0)} GB
                </span>
              </div>
              <div className="w-full bg-card-border/30 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    (summary?.hardware.disk.percent ?? 0) > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-nectar-gold to-yellow-500'
                  }`}
                  style={{ width: `${summary?.hardware.disk.percent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* Server metrics cards */}
        <section className="mb-12">
          <h2 className="text-sm font-black uppercase tracking-widest mb-6 opacity-60">Estadísticas de Peticiones</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-card-bg border border-card-border p-8 rounded-[2rem] hover:border-nectar-gold/50 transition-all group duration-300">
              <div className="flex justify-between items-start mb-6">
                <span className="text-2xs font-black uppercase tracking-widest opacity-40">Tiempos de Respuesta (Avg)</span>
                <svg className="w-5 h-5 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-3xl font-black tracking-tighter mb-2 text-foreground">
                {summary?.server.avg_response_time.toFixed(3)}s
              </div>
              <div className="text-2xs font-black uppercase tracking-widest text-nectar-gold opacity-65">Promedio Global</div>
            </div>

            {/* Card 2 */}
            <div className="bg-card-bg border border-card-border p-8 rounded-[2rem] hover:border-nectar-gold/50 transition-all group duration-300">
              <div className="flex justify-between items-start mb-6">
                <span className="text-2xs font-black uppercase tracking-widest opacity-40">Consultas DB (Avg)</span>
                <svg className="w-5 h-5 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <div className="text-3xl font-black tracking-tighter mb-2 text-foreground">
                {summary?.server.avg_queries.toFixed(1)}
              </div>
              <div className="text-2xs font-black uppercase tracking-widest text-nectar-gold opacity-65">Queries por solicitud</div>
            </div>

            {/* Card 3 */}
            <div className="bg-card-bg border border-card-border p-8 rounded-[2rem] hover:border-nectar-gold/50 transition-all group duration-300">
              <div className="flex justify-between items-start mb-6">
                <span className="text-2xs font-black uppercase tracking-widest opacity-40">Total Solicitudes</span>
                <svg className="w-5 h-5 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-3xl font-black tracking-tighter mb-2 text-foreground">
                {summary?.server.total_requests.toLocaleString()}
              </div>
              <div className="text-2xs font-black uppercase tracking-widest text-nectar-gold opacity-65">Peticiones totales</div>
            </div>

            {/* Card 4 */}
            <div className="bg-card-bg border border-card-border p-8 rounded-[2rem] hover:border-nectar-gold/50 transition-all group duration-300">
              <div className="flex justify-between items-start mb-6">
                <span className="text-2xs font-black uppercase tracking-widest opacity-40">Tiempo Máximo</span>
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-3xl font-black tracking-tighter mb-2 text-foreground">
                {summary?.server.max_response_time.toFixed(3)}s
              </div>
              <div className="text-2xs font-black uppercase tracking-widest text-red-500/80">Peor caso registrado</div>
            </div>
          </div>
        </section>

        {/* Detailed performance views */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Core Web Vitals */}
          <div className="bg-card-bg border border-card-border rounded-[3rem] p-8 md:p-12">
            <header className="mb-8">
              <h2 className="text-2xl font-black tracking-tighter">Core Web Vitals</h2>
              <p className="text-2xs font-black uppercase tracking-widest text-nectar-gold opacity-80">Rendimiento en el navegador (Promedio)</p>
            </header>
            <div className="space-y-4">
              {summary?.vitals && summary.vitals.length > 0 ? (
                summary.vitals.map(v => (
                  <div key={v.name} className="flex justify-between items-center p-5 bg-background/50 border border-card-border/60 rounded-2xl hover:border-nectar-gold/20 transition-all">
                    <div>
                      <span className="font-bold text-sm block tracking-wide">{v.name}</span>
                      <span className="text-2xs font-bold uppercase opacity-35">{v.count} muestras</span>
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
              <p className="text-2xs font-black uppercase tracking-widest text-nectar-gold opacity-80">Optimizaciones prioritarias</p>
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

        {/* System Logs Manager & Downloader Section */}
        <section className="mt-12">
          <div className="bg-card-bg border border-card-border rounded-[3rem] p-8 md:p-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter">Archivos de Log del Sistema</h2>
                <p className="text-2xs font-black uppercase tracking-widest text-nectar-gold opacity-80 mt-1">
                  Gestión y descarga segura de auditoría (Rotating File Handlers UTF-8)
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-4 py-2 bg-nectar-gold/10 text-nectar-gold rounded-full self-start md:self-auto border border-nectar-gold/20">
                {logs.length} archivos registrados
              </span>
            </header>

            {loadingLogs ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-nectar-gold border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Cargando directorio de logs...</p>
              </div>
            ) : logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-card-border/60 text-2xs uppercase font-black tracking-widest text-foreground/40">
                      <th className="pb-4 pl-4">Nombre del Archivo</th>
                      <th className="pb-4">Tamaño</th>
                      <th className="pb-4">Última Modificación</th>
                      <th className="pb-4 text-right pr-4">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/30">
                    {logs.map((logFile) => (
                      <tr key={logFile.name} className="hover:bg-background/40 transition-colors group">
                        <td className="py-4 pl-4 font-mono text-xs font-bold flex items-center gap-3">
                          <svg className="w-4 h-4 text-nectar-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate max-w-[260px] md:max-w-xs">{logFile.name}</span>
                        </td>
                        <td className="py-4 font-mono text-xs opacity-70">
                          {formatFileSize(logFile.size)}
                        </td>
                        <td className="py-4 text-xs opacity-60">
                          {logFile.modified ? new Date(logFile.modified * 1000).toLocaleString('es-MX') : 'Sin registros'}
                        </td>
                        <td className="py-4 text-right pr-4">
                          <button
                            onClick={() => handleDownloadLog(logFile.name)}
                            disabled={downloadingLog === logFile.name}
                            className="px-4 py-2 bg-nectar-gold/10 hover:bg-nectar-gold hover:text-black text-nectar-gold border border-nectar-gold/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 ml-auto"
                          >
                            {downloadingLog === logFile.name ? (
                              <>
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                <span>Descargando...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Descargar</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-sm opacity-40 font-bold">
                No se encontraron archivos de log en el servidor.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
