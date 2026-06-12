'use client';

import React, { useState } from 'react';
import { fetcher } from '@/lib/api';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCustomer: any) => void;
  tenantId?: string | number;
  showRoleSelect?: boolean;
  allTenants?: Array<{ id: string | number; brand_name?: string; subdomain: string }>;
  primaryColor?: string;
  themeConfig?: {
    cardBgColor?: string;
    borderColor?: string;
  };
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function CreateCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  showRoleSelect = false,
  allTenants = [],
  primaryColor = '#C68A1E',
  themeConfig = {},
  showToast
}: CreateCustomerModalProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [selectedTenantId, setSelectedTenantId] = useState(tenantId ? String(tenantId) : '');
  const [emailVerified, setEmailVerified] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('El email es obligatorio.', 'warning');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload: any = {
        email: email.trim(),
        role: showRoleSelect ? role : 'CUSTOMER',
        is_email_verified: emailVerified
      };
      
      if (username.trim()) payload.username = username.trim();
      if (password.trim()) payload.password = password.trim();
      
      const targetTenant = tenantId ? String(tenantId) : selectedTenantId;
      if (targetTenant) payload.tenant = parseInt(targetTenant);

      const data = await fetcher('/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      showToast(`Cliente ${data.email} creado con éxito.`, 'success');
      
      // Reset form
      setEmail('');
      setUsername('');
      setPassword('');
      setRole('CUSTOMER');
      setSelectedTenantId(tenantId ? String(tenantId) : '');
      setEmailVerified(true);

      onSuccess(data);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error al crear el cliente/usuario.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardBg = themeConfig.cardBgColor || '#050a06';
  const borderCol = themeConfig.borderColor || '#151F18';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: cardBg,
          borderColor: borderCol
        }}
        className="w-full max-w-md border p-8 md:p-10 rounded-[3rem] shadow-2xl relative space-y-6 text-left cursor-default animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full border border-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl font-bold cursor-pointer"
        >
          ×
        </button>

        <div>
          <span 
            className="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full border"
            style={{ 
              backgroundColor: `${primaryColor}15`, 
              color: primaryColor,
              borderColor: `${primaryColor}20` 
            }}
          >
            Clientes
          </span>
          <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none text-white">
            Nuevo Cliente / Usuario
          </h2>
          <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1 text-white/70">
            Registra un nuevo cliente para este portal. El rol será asignado como Cliente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40 text-white/60">Email Principal *</label>
            <input
              type="email"
              required
              placeholder="cliente@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40 text-white/60">Nombre de Usuario (Opcional)</label>
            <input
              type="text"
              placeholder="ej. clientejuan"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40 text-white/60">Contraseña (Opcional)</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-white font-mono"
            />
          </div>

          {showRoleSelect && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 text-white/60">Rol de Usuario</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-white font-bold"
                >
                  <option value="CUSTOMER">Cliente</option>
                  <option value="BUSINESS">Inquilino (Business Owner)</option>
                  <option value="STAFF">Staff de Ventas</option>
                  <option value="ADMIN">Administrador Global</option>
                </select>
              </div>

              {!tenantId && (
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40 text-white/60">Asociar Inquilino</label>
                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-white"
                  >
                    <option value="">Ninguno</option>
                    {allTenants.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.brand_name || t.subdomain}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="reusableNewClientEmailVerified"
              checked={emailVerified}
              onChange={(e) => setEmailVerified(e.target.checked)}
              className="w-4 h-4 bg-black/30 border border-white/10 rounded accent-nectar-gold"
            />
            <label htmlFor="reusableNewClientEmailVerified" className="text-[9px] font-black uppercase tracking-widest opacity-60 cursor-pointer text-white/80 select-none">
              Email Verificado
            </label>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border border-white/10 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer text-white/80"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg cursor-pointer"
              style={{
                backgroundColor: primaryColor,
                color: '#000000',
              }}
            >
              {isSubmitting ? 'Creando...' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
