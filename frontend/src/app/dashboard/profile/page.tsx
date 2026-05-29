'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetcher } from '../../../lib/api';
import DashboardSidebar from '../../../components/DashboardSidebar';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  role: string;
}

export default function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetcher('/users/me/');
        setProfile(data);
        setUsername(data.username);
        setEmail(data.email);
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setErrorMsg('No se pudo cargar el perfil de usuario.');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!username.trim() || !email.trim()) {
      setErrorMsg('El usuario y correo no pueden estar vacíos.');
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMsg('Las contraseñas nuevas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: Record<string, any> = {
        username: username.trim(),
        email: email.trim(),
      };
      if (password) {
        payload.password = password;
      }

      const updated = await fetcher(`/users/${profile.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setProfile(updated);
      setUsername(updated.username);
      setEmail(updated.email);
      setPassword('');
      setConfirmPassword('');
      setSuccessMsg('Perfil actualizado correctamente.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar el perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#020403] text-white">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto max-w-5xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-2">
            Configuración de Perfil
          </h1>
          <p className="text-xs text-white/40 uppercase tracking-widest">
            Ajusta tu información de acceso y credenciales de la colmena
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs uppercase tracking-widest font-black">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl text-xs uppercase tracking-widest font-black">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nectar-gold"></div>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="bg-[#050a06]/60 border border-[#151F18] rounded-3xl p-8 space-y-8">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-nectar-gold mb-6 border-b border-[#151F18] pb-4">
                Información de Usuario
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-background border border-[#151F18] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Correo Electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-[#151F18] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-nectar-gold mb-6 border-b border-[#151F18] pb-4">
                Seguridad y Credenciales
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Nueva Contraseña (Opcional)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Dejar vacío para mantener actual"
                    className="w-full bg-background border border-[#151F18] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold placeholder-white/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Dejar vacío para mantener actual"
                    className="w-full bg-background border border-[#151F18] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold placeholder-white/20"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#151F18] flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background font-black uppercase tracking-widest text-[10px] rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
