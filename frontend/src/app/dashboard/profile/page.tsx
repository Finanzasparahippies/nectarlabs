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
  additional_roles?: string[];
}

export default function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Becoming driver state variables
  const [vehicleType, setVehicleType] = useState('MOTORCYCLE');
  const [plateNumber, setPlateNumber] = useState('');
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [becomingDriver, setBecomingDriver] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

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

  useEffect(() => {
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

  const handleBecomeDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setBecomingDriver(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('vehicle_type', vehicleType);
      formData.append('plate_number', plateNumber);
      if (licensePhoto) formData.append('license_photo', licensePhoto);
      if (vehiclePhoto) formData.append('vehicle_photo', vehiclePhoto);

      const response = await fetcher('/users/become-driver/', {
        method: 'POST',
        body: formData,
      });

      setSuccessMsg(response.message || '¡Te has registrado como repartidor exitosamente!');
      
      // Clear forms
      setPlateNumber('');
      setLicensePhoto(null);
      setVehiclePhoto(null);
      
      // Reload profile to reflect role changes
      await loadProfile();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar solicitud de repartidor.');
    } finally {
      setBecomingDriver(false);
    }
  };

  const isDriver = profile?.role === 'DRIVER' || profile?.additional_roles?.includes('DRIVER');

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
          <div className="space-y-12">
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

            {!isDriver && (
              <form onSubmit={handleBecomeDriver} className="bg-[#050a06]/60 border border-[#151F18] rounded-3xl p-8 space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-nectar-gold mb-2 border-b border-[#151F18] pb-4 flex items-center justify-between">
                    <span>Quiero ser repartidor 🚴‍♂️</span>
                    <span className="text-[9px] px-3 py-1 bg-nectar-gold/10 rounded-full">$399 MXN / Mes</span>
                  </h2>
                  <p className="text-[11px] leading-relaxed text-white/60 mb-6">
                    Únete como repartidor independiente y recibe pedidos de múltiples tiendas del ecosistema de forma directa.
                    <br />
                    <span className="text-yellow-500 font-bold">⚠️ Nota de Responsabilidad:</span> Néctar Labs no se hace responsable en caso de cualquier percance o desperfecto ya que el dinero de las ventas y repartos no pasa a través de la plataforma. Cada negocio/restaurante procesa cobros directamente vía Stripe, Efectivo o CoDi.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Tipo de Vehículo</label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full bg-background border border-[#151F18] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold"
                      >
                        <option value="BICYCLE">Bicicleta</option>
                        <option value="MOTORCYCLE">Motocicleta</option>
                        <option value="CAR">Automóvil</option>
                        <option value="VAN">Camioneta</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Placas / Número de Placa (Opcional)</label>
                      <input
                        type="text"
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value)}
                        placeholder="Ej. ABC-1234"
                        className="w-full bg-background border border-[#151F18] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold placeholder-white/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Foto de Licencia de Conducir</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLicensePhoto(e.target.files?.[0] || null)}
                        className="w-full text-xs text-white/60 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-nectar-gold file:text-background file:cursor-pointer hover:file:opacity-90"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Foto del Vehículo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setVehiclePhoto(e.target.files?.[0] || null)}
                        className="w-full text-xs text-white/60 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-nectar-gold file:text-background file:cursor-pointer hover:file:opacity-90"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#151F18] flex justify-end">
                  <button
                    type="submit"
                    disabled={becomingDriver}
                    className="px-8 py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background font-black uppercase tracking-widest text-[10px] rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {becomingDriver ? 'Enviando Solicitud...' : 'Registrarme como Repartidor'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
