'use client';

import React from 'react';

interface RoleSwitcherProps {
  currentRole: string; // 'CUSTOMER', 'DRIVER', 'SALES', etc.
  additionalRoles: string[];
  activeMode: string; // El modo actualmente visualizado
  onModeChange: (mode: string) => void;
}

export default function RoleSwitcher({
  currentRole,
  additionalRoles,
  activeMode,
  onModeChange,
}: RoleSwitcherProps) {
  const allRoles = Array.from(new Set([currentRole, ...(additionalRoles || [])]));

  // Solo mostrar el selector de rol si el usuario posee más de un rol
  if (allRoles.length <= 1) return null;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'DRIVER':
        return '🏍️ Repartidor';
      case 'CUSTOMER':
        return '🛒 Cliente';
      case 'SALES':
        return '🤝 Vendedor';
      case 'ADMIN':
        return '🛡️ Admin';
      case 'BUSINESS':
        return '💼 Negocio';
      default:
        return role;
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-card-bg border border-card-border p-1.5 rounded-2xl shadow-lg z-50">
      <span className="text-[8px] font-black uppercase tracking-widest text-white/40 px-3">
        Modo Activo:
      </span>
      {allRoles.map((role) => (
        <button
          key={role}
          onClick={() => onModeChange(role)}
          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-250 cursor-pointer ${
            activeMode === role
              ? 'bg-nectar-gold text-background shadow-md shadow-nectar-gold/15 scale-105'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          {getRoleLabel(role)}
        </button>
      ))}
    </div>
  );
}
