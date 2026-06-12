'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type VerifyState = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [state, setState] = useState<VerifyState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    const token = params.get('token');

    if (!uid || !token) {
      setState('error');
      setErrorMsg('El enlace de verificación es inválido o ha expirado.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch('/api/users/confirm-email/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, token }),
        });
        const data = await res.json();

        if (data.success) {
          setState('success');
          // Auto-redirect after showing success state
          setTimeout(() => {
            router.push('/login?verified=true');
          }, 2200);
        } else {
          setState('error');
          setErrorMsg(
            data.error === 'invalid_token'
              ? 'El enlace ha expirado o ya fue utilizado. Solicita un nuevo correo de verificación.'
              : 'Ocurrió un error al verificar tu cuenta. Inténtalo de nuevo.'
          );
        }
      } catch {
        setState('error');
        setErrorMsg('No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.');
      }
    };

    verifyEmail();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#020403] flex flex-col items-center justify-center px-4 font-sans">
      {/* Background ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#C68A1E]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Logo */}
        <div className="mb-12">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#C68A1E] opacity-60">
            Néctar Labs
          </span>
        </div>

        {/* State: Loading */}
        {state === 'loading' && (
          <>
            {/* Spinner ring */}
            <div className="relative w-24 h-24 mb-10">
              <div className="absolute inset-0 rounded-full border-4 border-[#C68A1E]/10" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#C68A1E] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-3 rounded-full bg-[#C68A1E]/5 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#C68A1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-3">
              Verificando tu cuenta
            </h1>
            <p className="text-xs text-white/40 leading-relaxed">
              Estamos validando tu enlace de confirmación.<br />Este proceso solo toma un momento.
            </p>

            {/* Animated dots */}
            <div className="flex gap-1.5 mt-8">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-[#C68A1E]/50 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </>
        )}

        {/* State: Success */}
        {state === 'success' && (
          <>
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-10 animate-[scale_0.4s_ease-out]">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-3">
              ¡Cuenta verificada!
            </h1>
            <p className="text-xs text-white/40 leading-relaxed mb-8">
              Tu correo ha sido confirmado exitosamente.<br />Te redirigiremos al inicio de sesión en un momento.
            </p>
            <div className="flex items-center gap-2 text-emerald-400/60 text-[10px] font-bold uppercase tracking-widest">
              <div className="w-3 h-3 border-2 border-t-emerald-400 border-emerald-400/20 rounded-full animate-spin" />
              Redirigiendo...
            </div>
          </>
        )}

        {/* State: Error */}
        {state === 'error' && (
          <>
            <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-10">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-3">
              Enlace inválido
            </h1>
            <p className="text-xs text-white/40 leading-relaxed mb-8">
              {errorMsg}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-3.5 bg-[#C68A1E] text-[#020403] text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#C68A1E]/20"
            >
              Ir al Inicio de Sesión
            </button>
          </>
        )}
      </div>
    </div>
  );
}
