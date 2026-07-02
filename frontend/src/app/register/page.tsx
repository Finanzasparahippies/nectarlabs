'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetcher } from '../../lib/api';

function RegisterContent() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'CUSTOMER',
    referral_code: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const refFromUrl = searchParams.get('ref');
    const refFromSession = typeof window !== 'undefined' ? sessionStorage.getItem('referral_code') : null;
    const finalRef = refFromUrl || refFromSession || '';
    if (finalRef) {
      setFormData(prev => ({ ...prev, referral_code: finalRef }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirm_password) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      await fetcher('/register/', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          password_confirm: formData.confirm_password,
          role: formData.role,
          referral_code: formData.referral_code || null,
        }),
      });
      
      // Clean up stored referral code on successful sign up
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('referral_code');
      }
      
      // Redirect to login after successful registration
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nectar-gold/10 rounded-full blur-[120px] animate-glow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-nectar-forest/10 rounded-full blur-[120px] animate-glow" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md p-10 bg-card-bg border border-card-border rounded-[3rem] shadow-2xl relative z-10 mx-6">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block text-2xl font-black tracking-tighter mb-8">
            <span className="text-foreground">NECTAR <span className="text-nectar-gold">LABS</span></span>
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Crear Cuenta</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-nectar-gold mt-2 font-bold">Registro de Cliente</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Nombre de Usuario</label>
            <input
              type="text"
              required
              className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold"
              placeholder="usuario123"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Email Corporativo</label>
            <input
              type="email"
              required
              className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold"
              placeholder="nombre@empresa.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold pr-14"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors outline-none focus:outline-none z-10"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.024 10.024 0 014.501-4.757M10.4 10.4a3 3 0 004.199 4.199m2.78-2.78A9.973 9.973 0 0121.543 12c-1.274 4.057-5.064 7-9.542 7-1.285 0-2.5-.24-3.625-.678M15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Confirmar Contraseña</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold pr-14"
                placeholder="••••••••"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors outline-none focus:outline-none z-10"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.024 10.024 0 014.501-4.757M10.4 10.4a3 3 0 004.199 4.199m2.78-2.78A9.973 9.973 0 0121.543 12c-1.274 4.057-5.064 7-9.542 7-1.285 0-2.5-.24-3.625-.678M15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Código de Referido / Promocional (Opcional)</label>
            <input
              type="text"
              className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold uppercase font-mono text-foreground"
              placeholder="NECTAR-XXXX"
              value={formData.referral_code}
              onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Tipo de Cuenta</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'CUSTOMER' })}
                  className={`w-full py-3.5 rounded-2xl border font-black text-[10px] uppercase tracking-wider transition-all ${
                    formData.role === 'CUSTOMER' 
                      ? 'border-nectar-gold bg-nectar-gold/10 text-nectar-gold animate-in fade-in zoom-in-95 duration-200' 
                      : 'border-card-border text-foreground/50 hover:border-card-border/80 bg-background/50'
                  }`}
                >
                  Cliente
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 rounded-2xl bg-card-bg border border-card-border shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 z-50 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-1">Rol: Cliente</p>
                  <p className="text-[11px] leading-relaxed text-foreground/80 font-medium">
                    Para fundadores y negocios que buscan delegar su ingeniería de software artesanal, diseño de marca y soporte continuo de TI.
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-card-bg"></div>
                </div>
              </div>

              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'SALES' })}
                  className={`w-full py-3.5 rounded-2xl border font-black text-[10px] uppercase tracking-wider transition-all ${
                    formData.role === 'SALES' 
                      ? 'border-nectar-gold bg-nectar-gold/10 text-nectar-gold animate-in fade-in zoom-in-95 duration-200' 
                      : 'border-card-border text-foreground/50 hover:border-card-border/80 bg-background/50'
                  }`}
                >
                  Vendedor
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 rounded-2xl bg-card-bg border border-card-border shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 z-50 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-1">Rol: Vendedor</p>
                  <p className="text-[11px] leading-relaxed text-foreground/80 font-medium">
                    Para profesionales independientes que desean referir clientes a Néctar Labs y generar ingresos pasivos residuales (10%, 5% y 2%).
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-card-bg"></div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-nectar-gold/20"
          >
            Registrarse
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-xs font-bold opacity-40">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="text-nectar-gold hover:underline">
              Inicia Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Syncing Ecosystem...</div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
