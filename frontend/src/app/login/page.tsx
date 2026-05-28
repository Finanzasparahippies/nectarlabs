'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetcher } from '../../lib/api';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await fetcher('/token/', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (data.access) {
        localStorage.setItem('token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('user_email', formData.email);
        localStorage.setItem('is_staff', data.is_staff ? 'true' : 'false');
        localStorage.setItem('user_role', data.role || '');
        router.push('/dashboard');
      } else {
        setError('Credenciales inválidas');
      }
    } catch (err) {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };


  const [showPassword, setShowPassword] = useState(false);

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
          <h1 className="text-3xl font-black tracking-tight text-foreground">Bienvenido</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-nectar-gold mt-2 font-bold">Acceso al Centro de Control</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
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
            <div className="flex justify-between ml-4 mr-1">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Contraseña</label>
              <Link href="#" className="text-[10px] font-black uppercase tracking-widest text-nectar-gold opacity-60 hover:opacity-100">¿Olvidaste?</Link>
            </div>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-nectar-gold text-background font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-nectar-gold/20 disabled:opacity-50"
          >
            {loading ? 'Sincronizando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-xs font-bold opacity-40">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="text-nectar-gold hover:underline">
              Crea una aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
