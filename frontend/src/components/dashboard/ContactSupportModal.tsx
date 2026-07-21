'use client';

import React, { useState } from 'react';
import { fetcher } from '@/lib/api';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultValorDeseado?: string;
  defaultDescription?: string;
}

export default function ContactSupportModal({
  isOpen,
  onClose,
  onSuccess,
  defaultValorDeseado = '',
  defaultDescription = ''
}: ContactSupportModalProps) {
  const [valorDeseado, setValorDeseado] = useState(defaultValorDeseado);
  const [description, setDescription] = useState(defaultDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const ticketTitle = `Solicitud de Código Personalizado: ${valorDeseado}`;
      const ticketDesc = `
=============================================
SOLICITUD DE CÓDIGO PERSONALIZADO / SOPORTE
=============================================
Valor / Código Deseado: ${valorDeseado}

Detalle de la solicitud:
${description}
=============================================
      `.trim();

      await fetcher('/tickets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: ticketTitle,
          description: ticketDesc,
          category: 'IMPLEMENTATION',
          priority: 'HIGH'
        })
      });

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        setSuccess(false);
        setValorDeseado('');
        setDescription('');
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al enviar tu solicitud de soporte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="max-w-lg w-full bg-card-bg border border-card-border p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 cursor-default text-left"
      >
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-nectar-gold/5 rounded-full blur-3xl"></div>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7.5px] font-black uppercase tracking-widest rounded-full">Soporte Técnico</span>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-foreground">Solicitar Código Personalizado</h3>
            <p className="text-[9px] text-foreground/45 uppercase tracking-wider mt-1">Genera un ticket de soporte de implementación automatizado</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-background/50 border border-card-border flex items-center justify-center hover:bg-foreground hover:text-background transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center text-3xl mx-auto animate-bounce">
              ✓
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest text-green-400">Solicitud Enviada</h4>
            <p className="text-[10px] text-foreground/60 max-w-xs mx-auto leading-relaxed">
              Tu ticket de soporte ha sido generado exitosamente. Se ha notificado al equipo por correo y le daremos seguimiento a la brevedad.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold">
                ✗ {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-foreground/50">Valor o Código Deseado *</label>
              <input
                type="text"
                required
                value={valorDeseado}
                onChange={(e) => setValorDeseado(e.target.value)}
                placeholder="Ej. DESCUENTO-50-ESPECIAL, 20% Comisión, etc."
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-foreground/50">Detalles y Justificación de la Solicitud *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe brevemente por qué necesitas este código personalizado y para qué cliente/proyecto se aplicará..."
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold text-foreground resize-none"
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-card-border/40">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-background border border-card-border rounded-xl text-[9px] font-black uppercase tracking-widest text-foreground/60 hover:text-foreground transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !valorDeseado.trim() || !description.trim()}
                className="flex-1 py-3 bg-nectar-gold hover:bg-nectar-gold/90 text-background rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40 font-bold hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
