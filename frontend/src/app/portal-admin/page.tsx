'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PortalAdminResolver() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'resolving' | 'redirecting' | 'error'>('resolving');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function resolveAndRedirect() {
      try {
        const rawHost = window.location.hostname;
        const search = window.location.search;

        // 1. Guardar token SSO en localStorage si viene en URL
        const token = searchParams.get('token');
        if (token) {
          try {
            localStorage.setItem('token', token);
            localStorage.setItem('access_token', token);
          } catch (e) {
            console.warn('[PortalAdmin Ingress] No se pudo guardar token en localStorage:', e);
          }
        }

        // 2. Extraer o resolver subdominio a partir de query params o hostname
        let subdomain = searchParams.get('subdomain') || searchParams.get('tenant') || '';

        if (!subdomain) {
          if (rawHost.includes('.nectarlabs.dev')) {
            const rawSub = rawHost.split('.nectarlabs.dev')[0].replace('staging.', '').replace('www.', '').trim();
            if (rawSub && rawSub !== 'staging' && rawSub !== 'www') {
              subdomain = rawSub;
            }
          } else if (rawHost.includes('kores')) {
            subdomain = 'kores';
          } else if (rawHost.includes('finanzas') || rawHost.includes('fph')) {
            subdomain = 'fph';
          }
        }

        // Si aún no se deduce y no es host del sistema matriz, consultar resolve-host en la API
        const systemHosts = ['staging.nectarlabs.dev', 'nectarlabs.dev', 'www.nectarlabs.dev', 'localhost', '127.0.0.1'];
        if (!subdomain && !systemHosts.includes(rawHost)) {
          try {
            const res = await fetch(`/api/tenants/resolve-host/?host=${encodeURIComponent(rawHost)}`);
            if (res.ok) {
              const data = await res.json();
              if (data?.subdomain) {
                subdomain = data.subdomain;
              }
            }
          } catch (fetchErr) {
            console.warn('[PortalAdmin Ingress] Error consultando resolve-host:', fetchErr);
          }
        }

        // Si se resolvió el tenant (excluyendo palabras del sistema), redirigir a la ruta canónica
        if (subdomain && !['staging', 'www', 'nectarlabs'].includes(subdomain.toLowerCase())) {
          setStatus('redirecting');
          router.replace(`/tenants/${subdomain}/portal-admin${search}`);
        } else {
          setStatus('redirecting');
          router.replace(`/dashboard${search}`);
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'Error resolviendo la consola administrativa.');
      }
    }

    resolveAndRedirect();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-12 h-12 rounded-2xl border-2 border-emerald-500/20 border-t-emerald-500 animate-spin mb-4" />
      <h2 className="text-lg font-bold tracking-tight text-slate-200">
        {status === 'resolving' && 'Conectando a la consola administrativa...'}
        {status === 'redirecting' && 'Redirigiendo a tu espacio de trabajo...'}
        {status === 'error' && 'No se pudo acceder a la consola administrativa'}
      </h2>
      {errorMessage && (
        <p className="mt-2 text-sm text-rose-400 font-mono max-w-md text-center">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default function UniversalPortalAdmin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      </div>
    }>
      <PortalAdminResolver />
    </Suspense>
  );
}
