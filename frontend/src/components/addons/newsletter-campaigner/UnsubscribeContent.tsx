'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeContentInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const [statusState, setStatusState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!email || !token) {
      setStatusState('error');
      setMessage('El enlace de desuscripción está incompleto o es inválido.');
      return;
    }

    const performUnsubscribe = async () => {
      try {
        const res = await fetch('/api/newsletter/unsubscribe/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            token: token.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Ocurrió un error al procesar tu solicitud.');
        }

        setStatusState('success');
        setMessage(data.message || 'Te has desuscrito del boletín con éxito.');
      } catch (err: any) {
        setStatusState('error');
        setMessage(err.message || 'Error de conexión. Inténtalo de nuevo.');
      }
    };

    performUnsubscribe();
  }, [email, token]);

  return (
    <div className="w-full max-w-md p-8 sm:p-12 rounded-[2.5rem] bg-card-bg dark:bg-[#0c120f] border border-card-border dark:border-[#1c2e26] shadow-2xl text-center relative overflow-hidden">
      {/* Premium ambient glows */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-nectar-gold/5 blur-[80px] rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-nectar-forest/10 blur-[80px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full border border-nectar-gold/20 flex items-center justify-center text-nectar-gold font-black italic text-xl">
            N
          </div>
        </div>

        {statusState === 'loading' && (
          <div className="space-y-4 py-6">
            <div className="w-10 h-10 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/50">Procesando solicitud...</h3>
          </div>
        )}

        {statusState === 'success' && (
          <div className="space-y-4 py-4 animate-premium">
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Desuscripción Completada</h3>
            <p className="text-xs text-foreground/60 leading-relaxed">
              Hemos removido tu dirección de correo electrónico ({email}) de nuestra lista de distribución. No recibirás más boletines en este buzón.
            </p>
          </div>
        )}

        {statusState === 'error' && (
          <div className="space-y-4 py-4 animate-premium">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✕
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Solicitud Inválida</h3>
            <p className="text-xs text-red-400/90 leading-relaxed bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl">
              {message}
            </p>
            <p className="text-[10px] text-foreground/45 uppercase tracking-widest font-black pt-2">
              Néctar Labs Ecosystem
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribeContent() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md p-12 rounded-[2.5rem] bg-card-bg dark:bg-[#0c120f] border border-card-border dark:border-[#1c2e26] shadow-2xl text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin"></div>
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/50">Cargando...</h3>
      </div>
    }>
      <UnsubscribeContentInner />
    </Suspense>
  );
}
