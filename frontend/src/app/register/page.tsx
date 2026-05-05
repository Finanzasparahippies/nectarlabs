'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetcher } from '../../lib/api';


export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const router = useRouter();

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
          password: formData.password
        }),
      });
      
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
            <input
              type="password"
              required
              className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">Confirmar Contraseña</label>
            <input
              type="password"
              required
              className="w-full px-6 py-4 bg-background border border-card-border rounded-2xl focus:border-nectar-gold outline-none transition-all font-bold"
              placeholder="••••••••"
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
            />
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
