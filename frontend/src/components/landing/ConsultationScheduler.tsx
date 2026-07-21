'use client';

import React, { useState, useEffect } from 'react';
import { fetcher } from '@/lib/api';

interface ConsultationSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  initialAddonSlug?: string;
}

const ADDONS = [
  { id: 'general', name: 'Consultoría General', slug: '', desc: 'Diseño de arquitectura de software a medida, plan de digitalización y optimización de infraestructura.' },
  { id: 'bot-chat', name: 'Néctar AI Chat Bot', slug: 'bot-chat', desc: 'Widget de chat flotante en tiempo real y consola multi-agente con IA.' },
  { id: 'booking-signature', name: 'Néctar Contratos Digitales', slug: 'booking-signature', desc: 'Motor de contratos digitales con firma incrustada y PDFs.' },
  { id: 'delivery-tracking', name: 'Tienda + Envíos con Skydropx', slug: 'delivery-tracking', desc: 'Cotiza envíos en tiempo real y emite guías automáticamente.' },
  { id: 'sponsorship', name: 'Néctar Sponsors & NSCAP', slug: 'sponsorship', desc: 'Suscripciones de Stripe y feeds exclusivos para miembros.' },
  { id: 'business-analytics', name: 'Néctar Analytics y Ventas', slug: 'business-analytics', desc: 'Dashboard de métricas de ventas y analytics en tiempo real.' },
  { id: 'campaigner', name: 'Néctar Newsletter', slug: 'campaigner', desc: 'Campañas masivas de correo HTML con 1,000 envíos incluidos.' },
  { id: 'facturacion-cfdi', name: 'Facturación SAT México', slug: 'facturacion-cfdi', desc: 'Emisión de facturas CFDI 4.0 oficiales con 20 timbres incluidos.' },
  { id: 'automatic-invoicing', name: 'Facturación Automática SAT', slug: 'automatic-invoicing', desc: 'Timbrado automático de facturas al recibir pagos de clientes.' },
  { id: 'ecommerce-combo', name: 'Combo E-commerce Automatizado', slug: 'ecommerce-combo', desc: 'Tienda + Envíos Skydropx, Facturación SAT y Newsletter Masivo.' },
];

const TIME_SLOTS = [
  "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
];

export default function ConsultationScheduler({ isOpen, onClose, initialAddonSlug = '' }: ConsultationSchedulerProps) {
  const [step, setStep] = useState(1);
  const [selectedAddon, setSelectedAddon] = useState(initialAddonSlug);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busySlots, setBusySlots] = useState<Array<{ date: string; time: string }>>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Lead info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync initial addon slug when prop changes
  useEffect(() => {
    if (initialAddonSlug) {
      setSelectedAddon(initialAddonSlug);
    }
  }, [initialAddonSlug]);

  // Fetch busy slots on load or date step entry
  useEffect(() => {
    if (isOpen) {
      const loadAvailability = async () => {
        setLoading(true);
        try {
          const res = await fetcher('/appointments/availability/');
          if (Array.isArray(res)) {
            setBusySlots(res);
          }
        } catch (err: any) {
          console.error("Failed to load availability:", err);
        } finally {
          setLoading(false);
        }
      };
      loadAvailability();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calendar calculations
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const totalDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const days = [];
  // Empty slots for previous month offset
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 sm:h-12 border border-white/5 opacity-10"></div>);
  }

  // Days of the month
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSelected = date === dateStr;
    
    // Check if day is in the past
    const todayStr = new Date().toISOString().split('T')[0];
    const isPast = dateStr < todayStr;
    
    // Check if all times for this day are fully busy
    const dayBusySlotsCount = busySlots.filter(s => s.date === dateStr).length;
    const isDayFullyBusy = dayBusySlotsCount >= TIME_SLOTS.length;

    days.push(
      <button
        key={d}
        disabled={isPast || isDayFullyBusy}
        onClick={() => {
          setDate(dateStr);
          setTime(''); // Reset time selection
        }}
        className={`h-10 sm:h-12 text-xs font-black rounded-xl border flex flex-col items-center justify-center relative transition-all duration-300 ${
          isPast || isDayFullyBusy
            ? 'opacity-20 bg-transparent border-transparent cursor-not-allowed text-foreground/40'
            : isSelected
            ? 'bg-nectar-gold border-nectar-gold text-white shadow-lg'
            : 'border-card-border bg-background/30 hover:border-nectar-gold/60 text-foreground'
        }`}
      >
        <span>{d}</span>
        {dayBusySlotsCount > 0 && !isSelected && !isPast && (
          <span className="absolute bottom-1 w-1 h-1 bg-nectar-gold rounded-full"></span>
        )}
      </button>
    );
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !name || !email) {
      setErrorMsg("Por favor completa todos los campos requeridos.");
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await fetcher('/appointments/', {
        method: 'POST',
        body: JSON.stringify({
          client_name: name,
          client_email: email,
          client_phone: phone,
          addon_slug: selectedAddon,
          notes: notes,
          date: date,
          time: `${time}:00`
        })
      });
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al programar la cita. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020403]/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-card-bg dark:bg-[#070d0a] border border-nectar-forest/20 dark:border-nectar-leaf/30 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-nectar-forest/10 dark:bg-nectar-leaf/10 blur-[120px] rounded-full pointer-events-none"></div>

        {/* Modal Header */}
        <div className="p-6 sm:p-8 border-b border-card-border/80 dark:border-card-border/20 flex items-center justify-between relative z-10">
          <div>
            <span className="text-[9px] text-nectar-gold font-black uppercase tracking-[0.3em] block mb-1">Citas & Consultoría</span>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">Agenda tu Consultoría</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-card-border/80 dark:border-card-border/20 flex items-center justify-center hover:bg-foreground/5 transition-colors cursor-pointer text-foreground"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stepper progress */}
        {!success && (
          <div className="px-6 sm:px-8 py-3 bg-foreground/5 border-b border-card-border/40 dark:border-card-border/10 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-foreground/40">
            <span className={step >= 1 ? 'text-nectar-gold' : ''}>1. Servicio</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className={step >= 2 ? 'text-nectar-gold' : ''}>2. Fecha & Hora</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className={step >= 3 ? 'text-nectar-gold' : ''}>3. Datos</span>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {success ? (
            <div className="py-12 text-center max-w-lg mx-auto space-y-6">
              <div className="w-20 h-20 rounded-[2rem] bg-nectar-gold/10 border border-nectar-gold/30 flex items-center justify-center text-nectar-gold mx-auto animate-pulse">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground uppercase">¡Solicitud Registrada!</h3>
              <p className="text-sm text-foreground/60 leading-relaxed font-bold">
                Hemos enviado un correo de confirmación a <span className="text-nectar-gold font-bold">{email}</span>. 
                Por favor abre el mensaje y haz clic en el enlace para confirmar tu cita. El enlace expirará en 24 horas.
              </p>
              <button 
                onClick={onClose}
                className="px-8 py-3.5 bg-nectar-forest text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-nectar-gold transition-colors cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          ) : (
            <div>
              {errorMsg && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Step 1: Service selection */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-1">Módulo o Add-on de interés</h3>
                    <p className="text-xs text-foreground/50">Elige el servicio sobre el cual deseas la consultoría técnica.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ADDONS.map((addon) => {
                      const isSelected = selectedAddon === addon.slug;
                      return (
                        <button
                          key={addon.id}
                          onClick={() => {
                            setSelectedAddon(addon.slug);
                            setStep(2);
                          }}
                          className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer min-h-[120px] ${
                            isSelected
                              ? 'border-nectar-gold bg-nectar-gold/5 dark:bg-nectar-gold/[0.03] shadow-md'
                              : 'border-card-border bg-background/20 hover:border-nectar-gold/30'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-black text-foreground block">{addon.name}</span>
                            <p className="text-[10px] text-foreground/50 line-clamp-2 mt-1.5 leading-relaxed">{addon.desc}</p>
                          </div>
                          <span className="text-[8px] font-black text-nectar-gold uppercase tracking-wider mt-4 block">
                            {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Date & Time selector */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-1">Selecciona Fecha y Hora</h3>
                    <p className="text-xs text-foreground/50">Elige un día disponible y luego tu hora preferida.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Calendar */}
                    <div className="lg:col-span-7 bg-foreground/5 p-5 rounded-3xl border border-card-border">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black text-foreground uppercase tracking-widest">
                          {monthNames[month]} <span className="text-nectar-gold">{year}</span>
                        </span>
                        <div className="flex gap-1">
                          <button 
                            onClick={handlePrevMonth}
                            className="p-2 border border-card-border rounded-full hover:bg-foreground/5 text-foreground cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button 
                            onClick={handleNextMonth}
                            className="p-2 border border-card-border rounded-full hover:bg-foreground/5 text-foreground cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Day labels */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-2">
                        <span>Dom</span>
                        <span>Lun</span>
                        <span>Mar</span>
                        <span>Mié</span>
                        <span>Jue</span>
                        <span>Vie</span>
                        <span>Sáb</span>
                      </div>

                      {/* Day numbers grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {days}
                      </div>
                    </div>

                    {/* Time slots */}
                    <div className="lg:col-span-5 space-y-4">
                      <span className="text-[10px] font-black uppercase tracking-wider text-foreground/55 block">Horarios Disponibles</span>
                      {date ? (
                        <div className="grid grid-cols-2 gap-2">
                          {TIME_SLOTS.map((t) => {
                            // Check if this time slot is fully busy
                            const isBusy = busySlots.some(s => s.date === date && s.time.startsWith(t));
                            return (
                              <button
                                key={t}
                                disabled={isBusy}
                                onClick={() => setTime(t)}
                                className={`p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                  isBusy
                                    ? 'opacity-25 bg-transparent border-transparent text-foreground/30 cursor-not-allowed line-through'
                                    : time === t
                                    ? 'bg-nectar-gold border-nectar-gold text-white shadow-md'
                                    : 'border-card-border bg-background/30 hover:border-nectar-gold/60 text-foreground'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center border border-dashed border-card-border rounded-2xl text-xs text-foreground/40 italic">
                          Por favor, selecciona una fecha primero para ver los horarios.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-card-border/40 dark:border-card-border/10">
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-black text-foreground/50 hover:text-foreground uppercase tracking-wider cursor-pointer"
                    >
                      ← Volver a Servicios
                    </button>
                    <button
                      disabled={!date || !time}
                      onClick={() => setStep(3)}
                      className="px-8 py-3.5 bg-nectar-forest text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-nectar-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Lead details Form */}
              {step === 3 && (
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-1">Confirma tus Datos</h3>
                    <p className="text-xs text-foreground/50">Completa la siguiente información para formalizar el registro de prospecto.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-foreground/60 block">Nombre Completo *</label>
                      <input 
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Saúl Grijalva"
                        className="w-full p-4 rounded-xl border border-card-border bg-background/20 text-xs focus:border-nectar-gold outline-none text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-foreground/60 block">Correo Electrónico *</label>
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ej. cliente@empresa.com"
                        className="w-full p-4 rounded-xl border border-card-border bg-background/20 text-xs focus:border-nectar-gold outline-none text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-foreground/60 block">Teléfono de Contacto</label>
                      <input 
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ej. +52 (662) 123 4567"
                        className="w-full p-4 rounded-xl border border-card-border bg-background/20 text-xs focus:border-nectar-gold outline-none text-foreground"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-foreground/60 block">Idea de Proyecto / Notas de Consulta</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Platícanos sobre tu visión, alcance deseado o necesidades técnicas..."
                        rows={4}
                        className="w-full p-4 rounded-xl border border-card-border bg-background/20 text-xs focus:border-nectar-gold outline-none text-foreground resize-none"
                      />
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-5 rounded-2xl bg-foreground/5 border border-card-border space-y-2.5 text-xs">
                    <span className="text-[9px] font-black text-nectar-gold uppercase tracking-wider">Resumen de Cita</span>
                    <div className="flex justify-between">
                      <span className="text-foreground/50">Servicio de interés:</span>
                      <span className="font-bold text-foreground">
                        {ADDONS.find(a => a.slug === selectedAddon)?.name || 'Consultoría General'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/50">Fecha Programada:</span>
                      <span className="font-bold text-foreground">{date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/50">Horario de Consulta:</span>
                      <span className="font-bold text-nectar-gold">{time} hrs</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-card-border/40 dark:border-card-border/10">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs font-black text-foreground/50 hover:text-foreground uppercase tracking-wider cursor-pointer"
                    >
                      ← Volver a Fecha
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-3.5 bg-nectar-gold text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-nectar-forest transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? 'Procesando...' : 'Confirmar & Enviar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
