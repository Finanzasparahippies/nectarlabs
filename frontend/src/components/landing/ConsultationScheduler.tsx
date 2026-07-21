'use client';

import React, { useState, useEffect } from 'react';
import { fetcher } from '@/lib/api';

interface ConsultationSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  initialAddonSlug?: string;
}

const TIME_SLOTS = [
  "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
];

// Opciones de tipo de consultoría simplificadas
const CONSULTING_OPTIONS = [
  {
    id: 'partner',
    name: 'Contrato de Socio Tecnológico',
    desc: 'Para empresas y startups que buscan un aliado tecnológico a largo plazo que lidere su desarrollo de software e ingeniería de forma continua.'
  },
  {
    id: 'general',
    name: 'Consultoría General de Software',
    desc: 'Para proyectos con alcances definidos, diseño de arquitectura de software, validación técnica o asesoría puntual en infraestructura.'
  }
];

// Preguntas base de la pre-entrevista (redactadas de forma clara para clientes no técnicos)
const INTERVIEW_QUESTIONS = {
  queBuscas: {
    question: '¿Qué buscas lograr con tu proyecto?',
    options: [
      'Página web para conseguir clientes o ventas (Landing Page)',
      'Tienda en línea o plataforma web a la medida (E-commerce / Web App)',
      'Aplicación para teléfonos celulares (iPhone o Android)',
      'Mejorar la velocidad, seguridad o capacidad de mi sistema actual',
      'Tener un equipo de tecnología aliado a largo plazo (Socio Tecnológico)'
    ]
  },
  etapaProyecto: {
    question: '¿En qué etapa se encuentra tu proyecto hoy?',
    options: [
      'Apenas es una idea en papel',
      'Tengo un diseño básico o boceto',
      'Ya está funcionando y en el mercado',
      'Tengo un desarrollo iniciado que necesito rescatar o mejorar'
    ]
  },
  desafioPrincipal: {
    question: '¿Cuál es tu principal obstáculo o desafío hoy?',
    options: [
      'No tengo programadores ni equipo técnico que me respalde',
      'Mi plataforma actual falla o no soporta muchos usuarios',
      'No estoy atrayendo suficientes clientes o ventas en internet',
      'Necesito lanzar una primera versión muy rápido al mercado (MVP)'
    ]
  }
};

export default function ConsultationScheduler({ isOpen, onClose, initialAddonSlug = '' }: ConsultationSchedulerProps) {
  const [step, setStep] = useState(1);
  const [consultingType, setConsultingType] = useState('general');
  
  // Respuestas de la pre-entrevista
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState('');

  // Fecha y hora
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busySlots, setBusySlots] = useState<Array<{ date: string; time: string }>>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Datos de contacto del Lead
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Mapear initialAddonSlug al tipo de consultoría correspondiente para mantener compatibilidad
  useEffect(() => {
    if (initialAddonSlug) {
      if (initialAddonSlug === 'general') {
        setConsultingType('general');
      } else {
        setConsultingType('partner');
      }
    }
  }, [initialAddonSlug]);

  // Cargar disponibilidad de citas al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const loadAvailability = async () => {
        setLoadingAvailability(true);
        try {
          const res = await fetcher('/appointments/availability/');
          if (Array.isArray(res)) {
            setBusySlots(res);
          }
        } catch (err: any) {
          console.error("Error al cargar disponibilidad de citas:", err);
        } finally {
          setLoadingAvailability(false);
        }
      };
      loadAvailability();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Operaciones auxiliares del calendario mensual
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
  // Rellenar espacios vacíos del mes anterior
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 sm:h-12 border border-white/5 opacity-10"></div>);
  }

  // Renderizar los días del mes actual
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSelected = date === dateStr;
    const todayStr = new Date().toISOString().split('T')[0];
    const isPast = dateStr < todayStr;
    const dayBusySlotsCount = busySlots.filter(s => s.date === dateStr).length;
    const isDayFullyBusy = dayBusySlotsCount >= TIME_SLOTS.length;

    days.push(
      <button
        key={d}
        type="button"
        disabled={isPast || isDayFullyBusy}
        onClick={() => {
          setDate(dateStr);
          setTime(''); // Limpiar hora previa al cambiar de día
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

  // Manejar el submit final de la cita
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !name || !email) {
      setErrorMsg("Por favor completa todos los campos obligatorios.");
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
          consulting_type: consultingType,
          interview_answers: {
            que_buscas: selectedGoals,
            etapa_proyecto: selectedStage,
            desafio_principal: selectedChallenge
          },
          notes: notes,
          date: date,
          time: `${time}:00`
        })
      });
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error al agendar tu cita. Por favor, intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  // Manejar la selección múltiple de metas de la pre-entrevista
  const handleToggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020403]/80 backdrop-blur-md animate-fadeIn">
      {/* Tarjeta del Modal */}
      <div className="relative w-full max-w-4xl bg-card-bg dark:bg-[#070d0a] border border-nectar-forest/20 dark:border-nectar-leaf/30 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Destello de fondo decorativo */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-nectar-forest/10 dark:bg-nectar-leaf/10 blur-[120px] rounded-full pointer-events-none"></div>

        {/* Encabezado del Modal */}
        <div className="p-6 sm:p-8 border-b border-card-border/80 dark:border-card-border/20 flex items-center justify-between relative z-10">
          <div>
            <span className="text-[9px] text-nectar-gold font-black uppercase tracking-[0.3em] block mb-1">Agenda tu Sesión</span>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">Consultoría Tecnológica</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-card-border/80 dark:border-card-border/20 flex items-center justify-center hover:bg-foreground/5 transition-colors cursor-pointer text-foreground"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stepper de Progreso */}
        {!success && (
          <div className="px-6 sm:px-8 py-3 bg-foreground/5 border-b border-card-border/40 dark:border-card-border/10 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-foreground/40">
            <span className={step >= 1 ? 'text-nectar-gold' : ''}>1. Tipo</span>
            <svg className="w-3 h-3 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className={step >= 2 ? 'text-nectar-gold' : ''}>2. Proyecto</span>
            <svg className="w-3 h-3 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className={step >= 3 ? 'text-nectar-gold' : ''}>3. Fecha & Hora</span>
            <svg className="w-3 h-3 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className={step >= 4 ? 'text-nectar-gold' : ''}>4. Datos</span>
          </div>
        )}

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {success ? (
            <div className="py-12 text-center max-w-lg mx-auto space-y-6">
              <div className="w-20 h-20 rounded-[2rem] bg-nectar-gold/10 border border-nectar-gold/30 flex items-center justify-center text-nectar-gold mx-auto animate-pulse">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground uppercase">¡Cita Registrada!</h3>
              <p className="text-sm text-foreground/60 leading-relaxed font-bold">
                Hemos enviado un enlace de confirmación a tu correo <span className="text-nectar-gold font-bold">{email}</span>. 
                Por favor, ábrelo y haz clic en él para confirmar la sesión. Expirará en 24 horas.
              </p>
              <button 
                type="button"
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

              {/* Paso 1: Tipo de Consultoría */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-1">¿Qué modalidad de consultoría prefieres?</h3>
                    <p className="text-xs text-foreground/50">Selecciona la opción que mejor se adapte a tus necesidades actuales.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {CONSULTING_OPTIONS.map((opt) => {
                      const isSelected = consultingType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setConsultingType(opt.id);
                            setStep(2);
                          }}
                          className={`p-6 rounded-3xl border text-left flex flex-col justify-between transition-all cursor-pointer min-h-[160px] ${
                            isSelected
                              ? 'border-nectar-gold bg-nectar-gold/5 dark:bg-nectar-gold/[0.03] shadow-md'
                              : 'border-card-border bg-background/20 hover:border-nectar-gold/30'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-black text-foreground block">{opt.name}</span>
                            <p className="text-xs text-foreground/50 mt-2 leading-relaxed">{opt.desc}</p>
                          </div>
                          <span className="text-[9px] font-black text-nectar-gold uppercase tracking-wider mt-4 block">
                            {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Paso 2: Pre-Entrevista Cuestionario */}
              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-1">Cuéntanos un poco sobre tu proyecto</h3>
                    <p className="text-xs text-foreground/50">Esto nos servirá de base para enfocar la sesión y aprovechar el tiempo al máximo.</p>
                  </div>

                  {/* Pregunta 1 */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-wider text-foreground/70 block">
                      {INTERVIEW_QUESTIONS.queBuscas.question} <span className="text-nectar-gold">(Selección múltiple)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {INTERVIEW_QUESTIONS.queBuscas.options.map((opt) => {
                        const isSelected = selectedGoals.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleToggleGoal(opt)}
                            className={`p-4 rounded-xl border text-xs text-left transition-all ${
                              isSelected
                                ? 'bg-nectar-gold/10 border-nectar-gold text-foreground font-bold'
                                : 'border-card-border bg-background/20 hover:border-nectar-gold/30 text-foreground/75'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pregunta 2 */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-wider text-foreground/70 block">
                      {INTERVIEW_QUESTIONS.etapaProyecto.question}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {INTERVIEW_QUESTIONS.etapaProyecto.options.map((opt) => {
                        const isSelected = selectedStage === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSelectedStage(opt)}
                            className={`p-4 rounded-xl border text-xs text-left transition-all ${
                              isSelected
                                ? 'bg-nectar-gold/10 border-nectar-gold text-foreground font-bold'
                                : 'border-card-border bg-background/20 hover:border-nectar-gold/30 text-foreground/75'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pregunta 3 */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-wider text-foreground/70 block">
                      {INTERVIEW_QUESTIONS.desafioPrincipal.question}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {INTERVIEW_QUESTIONS.desafioPrincipal.options.map((opt) => {
                        const isSelected = selectedChallenge === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSelectedChallenge(opt)}
                            className={`p-4 rounded-xl border text-xs text-left transition-all ${
                              isSelected
                                ? 'bg-nectar-gold/10 border-nectar-gold text-foreground font-bold'
                                : 'border-card-border bg-background/20 hover:border-nectar-gold/30 text-foreground/75'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navegación del Paso 2 */}
                  <div className="flex justify-between items-center pt-6 border-t border-card-border/40 dark:border-card-border/10">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-black text-foreground/50 hover:text-foreground uppercase tracking-wider cursor-pointer"
                    >
                      ← Volver a Modalidad
                    </button>
                    <button
                      type="button"
                      disabled={selectedGoals.length === 0 || !selectedStage || !selectedChallenge}
                      onClick={() => setStep(3)}
                      className="px-8 py-3.5 bg-nectar-forest text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-nectar-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {/* Paso 3: Selección de Fecha y Hora */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-1">Selecciona Fecha y Hora</h3>
                    <p className="text-xs text-foreground/50">Elige un día disponible en el calendario y luego selecciona el horario.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Calendario Mensual */}
                    <div className="lg:col-span-7 bg-foreground/5 p-5 rounded-3xl border border-card-border">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black text-foreground uppercase tracking-widest">
                          {monthNames[month]} <span className="text-nectar-gold">{year}</span>
                        </span>
                        <div className="flex gap-1">
                          <button 
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-2 border border-card-border rounded-full hover:bg-foreground/5 text-foreground cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button 
                            type="button"
                            onClick={handleNextMonth}
                            className="p-2 border border-card-border rounded-full hover:bg-foreground/5 text-foreground cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Etiquetas de Días de la semana */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-2">
                        <span>Dom</span>
                        <span>Lun</span>
                        <span>Mar</span>
                        <span>Mié</span>
                        <span>Jue</span>
                        <span>Vie</span>
                        <span>Sáb</span>
                      </div>

                      {/* Cuadrícula de días */}
                      <div className="grid grid-cols-7 gap-1">
                        {days}
                      </div>
                    </div>

                    {/* Horas Disponibles */}
                    <div className="lg:col-span-5 space-y-4">
                      <span className="text-[10px] font-black uppercase tracking-wider text-foreground/55 block">Horarios Disponibles</span>
                      {date ? (
                        <div className="grid grid-cols-2 gap-2">
                          {TIME_SLOTS.map((t) => {
                            const isBusy = busySlots.some(s => s.date === date && s.time.startsWith(t));
                            return (
                              <button
                                key={t}
                                type="button"
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

                  {/* Navegación del Paso 3 */}
                  <div className="flex justify-between items-center pt-6 border-t border-card-border/40 dark:border-card-border/10">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs font-black text-foreground/50 hover:text-foreground uppercase tracking-wider cursor-pointer"
                    >
                      ← Volver a Cuestionario
                    </button>
                    <button
                      type="button"
                      disabled={!date || !time}
                      onClick={() => setStep(4)}
                      className="px-8 py-3.5 bg-nectar-forest text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-nectar-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {/* Paso 4: Confirmar Datos y Enviar */}
              {step === 4 && (
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-1">Confirma tus Datos de Contacto</h3>
                    <p className="text-xs text-foreground/50">Por favor, rellena tus datos para enviarte los detalles y el enlace de la reunión.</p>
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
                      <label className="text-[10px] font-black uppercase tracking-wider text-foreground/60 block">Notas adicionales (Opcional)</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Platícanos más a fondo si deseas que revisemos algo en específico durante la sesión..."
                        rows={3}
                        className="w-full p-4 rounded-xl border border-card-border bg-background/20 text-xs focus:border-nectar-gold outline-none text-foreground resize-none"
                      />
                    </div>
                  </div>

                  {/* Resumen Final de la Cita */}
                  <div className="p-5 rounded-2xl bg-foreground/5 border border-card-border space-y-2.5 text-xs">
                    <span className="text-[9px] font-black text-nectar-gold uppercase tracking-wider">Resumen de Cita</span>
                    <div className="flex justify-between">
                      <span className="text-foreground/50">Modalidad:</span>
                      <span className="font-bold text-foreground">
                        {CONSULTING_OPTIONS.find(o => o.id === consultingType)?.name || 'Consultoría General'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/50">Fecha:</span>
                      <span className="font-bold text-foreground">{date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/50">Horario:</span>
                      <span className="font-bold text-nectar-gold">{time} hrs</span>
                    </div>
                  </div>

                  {/* Navegación del Paso 4 */}
                  <div className="flex justify-between items-center pt-6 border-t border-card-border/40 dark:border-card-border/10">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
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
