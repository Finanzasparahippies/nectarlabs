'use client';

import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="max-w-md w-full bg-card-bg/95 border border-card-border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
      >
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-nectar-gold/5 rounded-full blur-3xl"></div>
        
        <h3 className="text-lg font-black uppercase tracking-wider text-white mb-2">{title}</h3>
        <p className="text-[10px] text-foreground/60 leading-relaxed uppercase tracking-wider mb-6">{message}</p>
        
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-400 transition-all"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
