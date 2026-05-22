'use client';

import React, { useState } from 'react';

interface SubscribeFormProps {
  tenantId: string;
  subdomain: string;
  primaryColor: string;
}

export default function SubscribeForm({ tenantId, subdomain, primaryColor }: SubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/newsletter/subscribe/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          tenant_id: tenantId,
          subdomain: subdomain,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Ocurrió un error al procesar tu suscripción.');
      }

      setMessage(data.message || '¡Gracias por suscribirte!');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#050a06]/40 border border-white/5 rounded-[2rem] p-6 shadow-lg relative overflow-hidden group">
      <div
        className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-700 pointer-events-none group-hover:opacity-25"
        style={{ backgroundColor: primaryColor }}
      ></div>

      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Suscríbete a nuestro boletín</h3>
          <p className="text-[9px] uppercase tracking-widest font-black text-white/40">Add-on: Newsletter Campaigner</p>
        </div>
      </div>

      <p className="text-xs text-white/50 mb-5 leading-relaxed">
        Recibe novedades, recursos exclusivos y actualizaciones directamente en tu bandeja de entrada.
      </p>

      {message ? (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl text-center">
          <p className="font-bold">{message}</p>
          <button
            onClick={() => setMessage(null)}
            className="mt-2 text-[10px] underline hover:text-white transition-colors"
          >
            Suscribir otro correo
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/10 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="px-6 py-3 text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-102 active:scale-95 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Procesando...' : 'Suscribirse'}
            </button>
          </div>

          {error && (
            <p className="text-[10px] text-red-400 font-bold mt-1 text-center">
              ⚠️ {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
