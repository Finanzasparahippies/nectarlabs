'use client';

import React, { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Néctar Labs Global Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020403] text-foreground p-6 text-center">
      <div className="relative max-w-md p-8 rounded-[2.5rem] bg-[#0d1511]/60 border border-emerald-500/10 backdrop-blur-xl">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-black uppercase tracking-widest text-white mb-2">Error de Ejecución</h2>
        <p className="text-xs text-white/60 mb-6 leading-relaxed">
          Ha ocurrido un evento imprevisto en la plataforma. Por favor, refresca el flujo o reintenta la acción.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-emerald-600 text-[#020403] text-xs font-black uppercase tracking-widest rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
          >
            Reestablecer Canal
          </button>
          <a
            href="/"
            className="w-full py-3 bg-white/5 border border-white/10 text-white/80 text-xs font-black uppercase tracking-widest rounded-full hover:bg-white/10 transition-colors"
          >
            Ir al Inicio
          </a>
        </div>
      </div>
    </div>
  );
}
