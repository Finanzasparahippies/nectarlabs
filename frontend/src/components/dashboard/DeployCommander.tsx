'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/api';

interface TenantItem {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  custom_frontend_url?: string | null;
  custom_backend_url?: string | null;
  wallet_balance?: string | number;
  is_active: boolean;
  created_at: string;
}

interface ContainerDetail {
  name: string;
  exists: boolean;
  status: string;
  running: boolean;
  started_at?: string;
  ip?: string | null;
  id?: string;
  uptime?: string;
  error?: string;
}

interface SuiteStatus {
  overall_status: 'healthy' | 'degraded' | 'offline' | 'loading';
  is_online: boolean;
  backend: ContainerDetail;
  frontend: ContainerDetail;
  env: string;
  names: {
    backend: string;
    frontend: string;
    is_standalone_repo?: boolean;
    repo_dir?: string;
  };
}

interface DeploymentLog {
  id: string;
  action: string;
  environment: string;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
  output_logs: string;
  created_at: string;
  finished_at?: string | null;
}

interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  stream: 'stdout' | 'stderr' | 'system';
}

export default function DeployCommander() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnv, setSelectedEnv] = useState<'staging' | 'production'>('staging');
  
  // Status Data
  const [statusData, setStatusData] = useState<SuiteStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Modal & Safety
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [forceRebuild, setForceRebuild] = useState(false);
  
  // Terminal State
  const [terminalTab, setTerminalTab] = useState<'pipeline' | 'frontend' | 'backend'>('frontend');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [deployments, setDeployments] = useState<DeploymentLog[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [isMobileTerminalOpen, setIsMobileTerminalOpen] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const apiBase = getApiBaseUrl();

  // 1. Fetch Tenant List
  const fetchTenants = useCallback(async () => {
    try {
      const token = getStoredToken();
      const res = await fetch(`${apiBase}/tenants/?all=true`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list: TenantItem[] = Array.isArray(data) ? data : data.results || [];
        setTenants(list);
        if (list.length > 0 && !selectedTenant) {
          // Default to kores or first tenant
          const preferred = list.find((t) => t.subdomain === 'kores') || list[0];
          setSelectedTenant(preferred);
        }
      }
    } catch (err) {
      console.error('Error cargando inquilinos:', err);
    }
  }, [apiBase, selectedTenant]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // 2. Fetch Container Status
  const fetchStatus = useCallback(async () => {
    if (!selectedTenant) return;
    setLoadingStatus(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${apiBase}/tenants/${selectedTenant.id}/container-status/?env=${selectedEnv}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data: SuiteStatus = await res.json();
        setStatusData(data);
      } else {
        console.warn('No se pudo obtener estado de contenedores');
      }
    } catch (err) {
      console.error('Error consultando estado de contenedores:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, [apiBase, selectedTenant, selectedEnv]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // 3. Fetch Deployments History for Pipeline tab
  const fetchDeployments = useCallback(async () => {
    if (!selectedTenant) return;
    try {
      const token = getStoredToken();
      const res = await fetch(`${apiBase}/tenants/${selectedTenant.id}/deploy-logs/`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDeployments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error obteniendo historial de despliegues:', err);
    }
  }, [apiBase, selectedTenant]);

  useEffect(() => {
    if (terminalTab === 'pipeline') {
      fetchDeployments();
    }
  }, [terminalTab, fetchDeployments]);

  // 4. SSE Real-Time Logs Stream Connection
  useEffect(() => {
    if (!selectedTenant || terminalTab === 'pipeline') {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setStreamConnected(false);
      }
      return;
    }

    const token = getStoredToken() || '';
    const target = terminalTab; // 'frontend' or 'backend'
    const sseUrl = `${apiBase}/tenants/${selectedTenant.id}/stream-logs/?target=${target}&env=${selectedEnv}&token=${encodeURIComponent(token)}&tail=100`;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStreamConnected(true);
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        text: `⚡ Conectando al socket stream de ${target.toUpperCase()} (${selectedEnv})...`,
        stream: 'system'
      }
    ]);

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setStreamConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.text) {
          setLogs((prev) => {
            const next = [
              ...prev,
              {
                id: Math.random().toString(),
                timestamp: new Date().toLocaleTimeString(),
                text: parsed.text,
                stream: parsed.stream || 'stdout'
              }
            ];
            // Keep last 400 lines to preserve DOM memory
            return next.length > 400 ? next.slice(next.length - 400) : next;
          });
        }
      } catch {
        if (event.data) {
          setLogs((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              text: event.data,
              stream: 'stdout'
            }
          ]);
        }
      }
    };

    es.onerror = () => {
      setStreamConnected(false);
    };

    return () => {
      es.close();
      setStreamConnected(false);
    };
  }, [apiBase, selectedTenant, terminalTab, selectedEnv]);

  // Autoscroll terminal
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, deployments, autoScroll]);

  // Copy Logs with asynchronous clipboard API and fallback
  const handleCopyLogs = async () => {
    const textToCopy =
      terminalTab === 'pipeline'
        ? deployments.map((d) => d.output_logs).join('\n---\n')
        : logs.map((l) => `[${l.timestamp}] ${l.text}`).join('\n');

    if (!textToCopy) {
      setBannerNotice({ type: 'info', message: 'No hay logs para copiar.' });
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLogs(true);
      setBannerNotice({ type: 'info', message: '📋 Logs copiados al portapapeles exitosamente.' });
      setTimeout(() => setCopiedLogs(false), 2500);
    } catch (err) {
      console.error('Error al copiar logs:', err);
    }
  };

  // Execute Container Action (start, stop, restart, deploy)
  const handleExecuteAction = async (action: 'start' | 'stop' | 'restart' | 'deploy', target: 'all' | 'frontend' | 'backend' = 'all') => {
    if (!selectedTenant) return;
    const actionKey = `${action}-${target}`;
    setActiveAction(actionKey);
    setBannerNotice(null);

    try {
      const token = getStoredToken();
      const res = await fetch(`${apiBase}/tenants/${selectedTenant.id}/container-action/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action,
          target,
          env: selectedEnv,
          force_rebuild: forceRebuild
        })
      });

      const data = await res.json();

      if (res.status === 409) {
        setBannerNotice({
          type: 'error',
          message: '🔒 Operación bloqueada: Ya existe un despliegue o comando en ejecución para este inquilino.'
        });
      } else if (res.status === 503) {
        setBannerNotice({
          type: 'error',
          message: '⚠️ Docker Daemon no disponible en el servidor remoto (Socket Unix inaccesible).'
        });
      } else if (!res.ok) {
        const errorMsg = data.error || data.message || `Error (${res.status}) al ejecutar acción '${action}'.`;
        setBannerNotice({
          type: 'error',
          message: errorMsg
        });
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            text: `❌ [ERROR ${res.status}] ${action.toUpperCase()} (${target}) -> ${errorMsg}`,
            stream: 'stderr'
          }
        ]);
      } else {
        setBannerNotice({
          type: 'success',
          message: data.message || `Acción '${action.toUpperCase()}' ejecutada exitosamente.`
        });
        // Push log notification to terminal
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            text: `[CEO COMMAND] ${action.toUpperCase()} (${target}) -> ${data.message || 'Completado'}`,
            stream: 'system'
          }
        ]);
        fetchStatus();
        if (action === 'deploy') {
          fetchDeployments();
        }
      }
    } catch (err) {
      setBannerNotice({
        type: 'error',
        message: `Fallo de conexión de red: ${String(err)}`
      });
    } finally {
      setActiveAction(null);
      setIsDeployModalOpen(false);
    }
  };

  // Filtered tenants for search dropdown
  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.subdomain.toLowerCase().includes(q) ||
      (t.custom_domain && t.custom_domain.toLowerCase().includes(q))
    );
  });

  const overallStatus = statusData?.overall_status || 'loading';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner Notice */}
      {bannerNotice && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-4 border transition-all ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : bannerNotice.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-nectar-gold/10 border-nectar-gold/30 text-nectar-gold'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {bannerNotice.type === 'success' ? '✓' : bannerNotice.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <p className="text-xs font-semibold">{bannerNotice.message}</p>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Selector & Controls Bar */}
      <section className="p-6 md:p-8 rounded-[2.5rem] bg-card-bg/60 backdrop-blur-xl border border-card-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-nectar-gold/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Tenant Selector & Subdomain Display */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-2xs font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Orquestador PaaS Multi-Inquilino
              </span>
              <span
                className={`px-3 py-1 text-2xs font-black uppercase tracking-widest rounded-full border flex items-center gap-1.5 ${
                  overallStatus === 'healthy'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : overallStatus === 'degraded'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    overallStatus === 'healthy'
                      ? 'bg-emerald-400 animate-ping'
                      : overallStatus === 'degraded'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                ></span>
                {overallStatus.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Tenant Dropdown with Quick Filter */}
              <div className="relative min-w-[280px]">
                <select
                  value={selectedTenant?.id || ''}
                  onChange={(e) => {
                    const found = tenants.find((t) => t.id === e.target.value);
                    if (found) setSelectedTenant(found);
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-background/80 border border-card-border text-foreground font-bold text-sm focus:outline-none focus:border-nectar-gold transition-colors appearance-none cursor-pointer"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id} className="bg-background text-foreground">
                      {t.name} ({t.subdomain})
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/40 text-xs">
                  ▼
                </div>
              </div>

              {/* Subdomain details badge */}
              {selectedTenant && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-background/50 border border-card-border font-mono text-nectar-gold">
                    {selectedTenant.subdomain}.staging.nectarlabs.dev
                  </span>
                  {selectedTenant.custom_domain && (
                    <span className="px-3 py-1.5 rounded-xl bg-background/50 border border-card-border font-mono text-foreground/70">
                      🌐 {selectedTenant.custom_domain}
                    </span>
                  )}
                  <span className="px-3 py-1.5 rounded-xl bg-background/50 border border-card-border font-mono text-foreground/60">
                    Billetera: ${Number(selectedTenant.wallet_balance || 0).toFixed(2)} MXN
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Environment Switcher & Quick Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Environment Toggle */}
            <div className="p-1 rounded-2xl bg-background/80 border border-card-border flex items-center">
              <button
                onClick={() => setSelectedEnv('staging')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedEnv === 'staging'
                    ? 'bg-nectar-gold text-black shadow-lg shadow-nectar-gold/20'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                Staging
              </button>
              <button
                onClick={() => setSelectedEnv('production')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedEnv === 'production'
                    ? 'bg-nectar-gold text-black shadow-lg shadow-nectar-gold/20'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                Producción
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchStatus}
              disabled={loadingStatus}
              title="Refrescar estado de contenedores"
              className="p-3 rounded-2xl bg-background/80 border border-card-border hover:border-nectar-gold text-foreground/70 hover:text-foreground transition-all flex items-center justify-center disabled:opacity-50"
            >
              <span className={loadingStatus ? 'animate-spin' : ''}>🔄</span>
            </button>
          </div>
        </div>
      </section>

      {/* Global Orchestration Command Bar */}
      <section className="p-6 md:p-8 rounded-[2.5rem] bg-card-bg/40 backdrop-blur-xl border border-card-border flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Acciones Globales de Suite</h2>
          <p className="text-xs text-foreground/60">
            Control maestro sobre el stack completo (Frontend + Backend + Red Docker de Inquilino).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Main Deploy Button */}
          <button
            onClick={() => setIsDeployModalOpen(true)}
            disabled={activeAction !== null}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-nectar-gold text-black font-black text-xs uppercase tracking-widest shadow-xl shadow-nectar-gold/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {activeAction === 'deploy-all' ? (
              <>
                <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                Desplegando...
              </>
            ) : (
              <>
                <span>🚀</span>
                Desplegar / Build Completo
              </>
            )}
          </button>

          {/* Restart All */}
          <button
            onClick={() => handleExecuteAction('restart', 'all')}
            disabled={activeAction !== null}
            className="px-5 py-3 rounded-2xl bg-background/80 border border-card-border hover:border-nectar-gold text-foreground font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {activeAction === 'restart-all' ? (
              <span className="w-3 h-3 border-2 border-foreground border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>🔄</span>
            )}
            Reiniciar Todo
          </button>

          {/* Stop All */}
          <button
            onClick={() => handleExecuteAction('stop', 'all')}
            disabled={activeAction !== null}
            className="px-5 py-3 rounded-2xl bg-background/80 border border-card-border hover:border-rose-500/60 text-rose-400 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {activeAction === 'stop-all' ? (
              <span className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>⏹</span>
            )}
            Detener Suite
          </button>

          {/* Direct Link to Staging Preview */}
          {selectedTenant && (
            <a
              href={`https://${selectedTenant.subdomain}.staging.nectarlabs.dev`}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-2xl bg-background/80 border border-card-border hover:border-nectar-gold text-nectar-gold font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <span>🔗</span>
              Ver Sitio
            </a>
          )}
        </div>
      </section>

      {/* Microservices Health Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Frontend Container Card */}
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-card-bg/60 backdrop-blur-xl border border-card-border relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 text-lg border border-blue-500/20">
                  🖥️
                </span>
                <div>
                  <h3 className="font-black text-lg tracking-tight">Microservicio Frontend</h3>
                  <p className="text-2xs font-mono text-foreground/50">Next.js / React / Nginx Ingress</p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-2xs font-black uppercase tracking-widest border flex items-center gap-1.5 ${
                  statusData?.frontend?.running
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : statusData?.frontend?.exists
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    statusData?.frontend?.running
                      ? 'bg-emerald-400 animate-ping'
                      : statusData?.frontend?.exists
                      ? 'bg-amber-400'
                      : 'bg-zinc-500'
                  }`}
                ></span>
                {statusData?.frontend?.running
                  ? 'RUNNING'
                  : statusData?.frontend?.exists
                  ? (statusData?.frontend?.status?.toUpperCase() || 'DETENIDO')
                  : 'NO CREADO'}
              </span>
            </div>

            {/* Container Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-background/50 border border-card-border">
                <span className="block text-2xs uppercase tracking-wider text-foreground/40 font-bold mb-1">
                  Nombre Contenedor
                </span>
                <span className="font-mono text-foreground/90 font-semibold break-all">
                  {statusData?.frontend?.name || 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-background/50 border border-card-border">
                <span className="block text-2xs uppercase tracking-wider text-foreground/40 font-bold mb-1">
                  Docker IP / Puerto
                </span>
                <span className="font-mono text-nectar-gold font-semibold">
                  {statusData?.frontend?.ip ? `${statusData.frontend.ip}:3000` : 'No asignada'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-background/50 border border-card-border">
                <span className="block text-2xs uppercase tracking-wider text-foreground/40 font-bold mb-1">
                  Container ID
                </span>
                <span className="font-mono text-foreground/60 font-semibold">
                  {statusData?.frontend?.id || 'Inactivo'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-background/50 border border-card-border">
                <span className="block text-2xs uppercase tracking-wider text-foreground/40 font-bold mb-1">
                  Iniciado
                </span>
                <span className="font-mono text-foreground/60 font-semibold truncate block">
                  {statusData?.frontend?.started_at ? new Date(statusData.frontend.started_at).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Container Buttons */}
          <div className="pt-6 border-t border-card-border flex items-center justify-end gap-2">
            {!statusData?.frontend?.exists ? (
              <button
                onClick={() => setIsDeployModalOpen(true)}
                disabled={activeAction !== null}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-nectar-gold/20 border border-nectar-gold/40 text-nectar-gold hover:bg-nectar-gold/30 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <span>🚀</span>
                Desplegar
              </button>
            ) : (
              <button
                onClick={() => handleExecuteAction('start', 'frontend')}
                disabled={activeAction !== null || statusData?.frontend?.running}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                {activeAction === 'start-frontend' && (
                  <span className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                )}
                Iniciar
              </button>
            )}
            <button
              onClick={() => handleExecuteAction('restart', 'frontend')}
              disabled={activeAction !== null || !statusData?.frontend?.exists}
              className="px-4 py-2 rounded-xl bg-background/80 border border-card-border hover:border-nectar-gold text-foreground/80 hover:text-foreground font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {activeAction === 'restart-frontend' && (
                <span className="w-2.5 h-2.5 border-2 border-foreground border-t-transparent rounded-full animate-spin"></span>
              )}
              Reiniciar
            </button>
            <button
              onClick={() => handleExecuteAction('stop', 'frontend')}
              disabled={activeAction !== null || !statusData?.frontend?.running}
              className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {activeAction === 'stop-frontend' && (
                <span className="w-2.5 h-2.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></span>
              )}
              Detener
            </button>
          </div>
        </div>

        {/* Backend Container Card */}
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-card-bg/60 backdrop-blur-xl border border-card-border relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 text-lg border border-amber-500/20">
                  ⚙️
                </span>
                <div>
                  <h3 className="font-black text-lg tracking-tight">Microservicio Backend</h3>
                  <p className="text-2xs font-mono text-foreground/50">Django / DRF / Gunicorn API</p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-2xs font-black uppercase tracking-widest border flex items-center gap-1.5 ${
                  statusData?.backend?.running
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : statusData?.backend?.exists
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    statusData?.backend?.running
                      ? 'bg-emerald-400 animate-ping'
                      : statusData?.backend?.exists
                      ? 'bg-amber-400'
                      : 'bg-zinc-500'
                  }`}
                ></span>
                {statusData?.backend?.running
                  ? 'RUNNING'
                  : statusData?.backend?.exists
                  ? (statusData?.backend?.status?.toUpperCase() || 'DETENIDO')
                  : 'NO CREADO'}
              </span>
            </div>

            {/* Container Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-background/50 border border-card-border">
                <span className="block text-2xs uppercase tracking-wider text-foreground/40 font-bold mb-1">
                  Nombre Contenedor
                </span>
                <span className="font-mono text-foreground/90 font-semibold break-all">
                  {statusData?.backend?.name || 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-background/50 border border-card-border">
                <span className="block text-2xs uppercase tracking-wider text-foreground/40 font-bold mb-1">
                  Docker IP / Puerto
                </span>
                <span className="font-mono text-nectar-gold font-semibold">
                  {statusData?.backend?.ip ? `${statusData.backend.ip}:8000` : 'No asignada'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-background/50 border border-card-border">
                <span className="block text-2xs uppercase tracking-wider text-foreground/40 font-bold mb-1">
                  Container ID
                </span>
                <span className="font-mono text-foreground/60 font-semibold">
                  {statusData?.backend?.id || 'Inactivo'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-background/50 border border-card-border">
                <span className="block text-2xs uppercase tracking-wider text-foreground/40 font-bold mb-1">
                  Iniciado
                </span>
                <span className="font-mono text-foreground/60 font-semibold truncate block">
                  {statusData?.backend?.started_at ? new Date(statusData.backend.started_at).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Container Buttons */}
          <div className="pt-6 border-t border-card-border flex items-center justify-end gap-2">
            {!statusData?.backend?.exists ? (
              <button
                onClick={() => setIsDeployModalOpen(true)}
                disabled={activeAction !== null}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-nectar-gold/20 border border-nectar-gold/40 text-nectar-gold hover:bg-nectar-gold/30 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <span>🚀</span>
                Desplegar
              </button>
            ) : (
              <button
                onClick={() => handleExecuteAction('start', 'backend')}
                disabled={activeAction !== null || statusData?.backend?.running}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                {activeAction === 'start-backend' && (
                  <span className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                )}
                Iniciar
              </button>
            )}
            <button
              onClick={() => handleExecuteAction('restart', 'backend')}
              disabled={activeAction !== null || !statusData?.backend?.exists}
              className="px-4 py-2 rounded-xl bg-background/80 border border-card-border hover:border-nectar-gold text-foreground/80 hover:text-foreground font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {activeAction === 'restart-backend' && (
                <span className="w-2.5 h-2.5 border-2 border-foreground border-t-transparent rounded-full animate-spin"></span>
              )}
              Reiniciar
            </button>
            <button
              onClick={() => handleExecuteAction('stop', 'backend')}
              disabled={activeAction !== null || !statusData?.backend?.running}
              className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {activeAction === 'stop-backend' && (
                <span className="w-2.5 h-2.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></span>
              )}
              Detener
            </button>
          </div>
        </div>
      </section>

      {/* Nectar Live Terminal (Hacker Glassmorphism Console) */}
      <section className="rounded-[2.5rem] bg-black/90 border border-card-border/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Terminal Top Window Bar */}
        <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          {/* Traffic Light Dots & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600 inline-block"></span>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-400 flex items-center gap-2">
              terminal://nectarlabs/{selectedTenant?.subdomain || 'tenant'}/{selectedEnv}
              {streamConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  SSE LIVE
                </span>
              )}
            </span>
          </div>

          {/* Terminal Channel Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setTerminalTab('pipeline')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                terminalTab === 'pipeline'
                  ? 'bg-zinc-800 text-nectar-gold font-bold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ⚡ Pipeline ({deployments.length})
            </button>
            <button
              onClick={() => setTerminalTab('frontend')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                terminalTab === 'frontend'
                  ? 'bg-zinc-800 text-nectar-gold font-bold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🖥️ Frontend
            </button>
            <button
              onClick={() => setTerminalTab('backend')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                terminalTab === 'backend'
                  ? 'bg-zinc-800 text-nectar-gold font-bold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ⚙️ Backend
            </button>
          </div>

          {/* Terminal Utility Actions */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                autoScroll
                  ? 'bg-nectar-gold/10 text-nectar-gold border-nectar-gold/30'
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              }`}
            >
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setLogs([])}
              title="Limpiar terminal"
              className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-all"
            >
              Limpiar
            </button>
            <button
              onClick={handleCopyLogs}
              title="Copiar logs al portapapeles"
              className={`px-3 py-1 rounded-lg border font-mono transition-all flex items-center gap-1.5 ${
                copiedLogs
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/10 scale-105'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
              }`}
            >
              {copiedLogs ? (
                <>
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span className="font-bold text-emerald-300">¡Copiado!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Terminal Output Area */}
        <div className="p-6 h-[420px] overflow-y-auto font-mono text-xs space-y-1 select-text bg-black/95">
          {terminalTab === 'pipeline' ? (
            deployments.length === 0 ? (
              <div className="text-zinc-600 italic py-10 text-center">
                No hay registros de despliegue históricos para este inquilino.
              </div>
            ) : (
              deployments.map((d) => (
                <div key={d.id} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 mb-4 space-y-2">
                  <div className="flex items-center justify-between text-2xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold uppercase ${
                          d.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : d.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {d.status}
                      </span>
                      <span className="text-zinc-300 font-bold">{d.action}</span>
                      <span>({d.environment})</span>
                    </div>
                    <span>{new Date(d.created_at).toLocaleString()}</span>
                  </div>
                  <pre className="text-zinc-300 whitespace-pre-wrap text-2xs leading-relaxed max-h-60 overflow-y-auto p-2 bg-black/40 rounded-lg">
                    {d.output_logs}
                  </pre>
                </div>
              ))
            )
          ) : logs.length === 0 ? (
            <div className="text-zinc-600 italic py-10 text-center">
              Esperando transmisión de registros de Docker en tiempo real...
            </div>
          ) : (
            logs.map((line) => (
              <div
                key={line.id}
                className={`flex items-start gap-3 leading-relaxed hover:bg-zinc-900/40 px-1 py-0.5 rounded ${
                  line.stream === 'stderr'
                    ? 'text-rose-400'
                    : line.stream === 'system'
                    ? 'text-amber-400'
                    : 'text-zinc-300'
                }`}
              >
                <span className="text-zinc-600 select-none text-3xs font-mono">{line.timestamp}</span>
                <span className="flex-1 whitespace-pre-wrap break-all">{line.text}</span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </section>

      {/* Confirmation Modal for Complete Build / Deploy */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border max-w-lg w-full shadow-2xl space-y-6 relative animate-scaleUp">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
                🚀
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Confirmar Orquestación</h3>
                <p className="text-xs text-foreground/60">
                  Desplegar contenedor {selectedTenant?.subdomain} ({selectedEnv})
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-background/50 border border-card-border text-xs space-y-2 text-foreground/80">
              <p>
                Esta acción ejecutará de manera atómica el ciclo de vida del contenedor en el daemon de Docker del
                servidor remoto sin requerir SSH.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="force-rebuild"
                  checked={forceRebuild}
                  onChange={(e) => setForceRebuild(e.target.checked)}
                  className="w-4 h-4 rounded border-card-border text-nectar-gold focus:ring-nectar-gold"
                />
                <label htmlFor="force-rebuild" className="text-xs font-semibold select-none cursor-pointer">
                  Forzar reconstrucción de imagen Docker (<code className="text-nectar-gold">--build</code>)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-card-border">
              <button
                onClick={() => setIsDeployModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-background/80 border border-card-border text-foreground font-bold text-xs hover:bg-card-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExecuteAction('deploy', 'all')}
                className="px-6 py-2.5 rounded-xl bg-nectar-gold text-black font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Iniciar Despliegue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
