'use client';

import React, { useState, useRef } from 'react';
import Toast from '../../ui/Toast';

interface BookingCanvasProps {
  tenantId: string;
  subdomain: string;
  primaryColor: string;
}

export default function BookingCanvas({ tenantId, subdomain, primaryColor }: BookingCanvasProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [venueType, setVenueType] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isBooked, setIsBooked] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventDefault);
      canvas.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Resolve coordinates
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    isDrawingRef.current = true;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setIsSigned(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !name || !email || !phone || !venueType || !isSigned) {
      setToast({ message: 'Por favor completa todos los campos obligatorios y firma la propuesta.', type: 'warning' });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureDataUrl = canvas.toDataURL();

    setLoading(true);

    try {
      // Step 1: Create Booking Inquiry
      const inquiryRes = await fetch('/api/bookings/inquiries/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim() || null,
          date: selectedDate,
          venue_type: venueType,
          message: message.trim() || `Reserva solicitada para las ${selectedTime}`,
          tenant_id: tenantId,
          subdomain: subdomain,
        }),
      });

      const inquiryData = await inquiryRes.json();
      if (!inquiryRes.ok) {
        throw new Error(inquiryData.detail || inquiryData.error || Object.values(inquiryData).flat().join(' ') || 'Error al guardar la consulta de cita.');
      }

      const contractId = inquiryData.contract_id;
      if (!contractId) {
        throw new Error('No se pudo generar la propuesta de contrato automática en el servidor.');
      }

      // Step 2: Sign the contract using the canvas signature
      const signRes = await fetch(`/api/bookings/contracts/${contractId}/sign/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signatureDataUrl,
          tenant_id: tenantId,
          subdomain: subdomain,
        }),
      });

      const signData = await signRes.json();
      if (!signRes.ok) {
        throw new Error(signData.detail || signData.error || 'Error al firmar digitalmente la propuesta.');
      }

      setIsBooked(true);
      setToast({ message: '¡Cita reservada y propuesta firmada con éxito!', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error al procesar la reserva. Inténtalo de nuevo.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#050a06]/40 border border-white/5 rounded-[2rem] p-6 shadow-lg relative overflow-hidden group">
      <div
        className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-700 pointer-events-none group-hover:opacity-25"
        style={{ backgroundColor: primaryColor }}
      ></div>

      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Reserva de Consultoría y Propuesta</h3>
          <p className="text-[9px] uppercase tracking-widest font-black text-white/40">Add-on: Booking & Signature</p>
        </div>
      </div>

      {isBooked ? (
        <div className="text-center py-10 bg-white/[0.01] border border-white/5 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="font-black text-xs text-white uppercase tracking-wider mb-2">¡Reserva y Firma Confirmadas!</h4>
          <p className="text-[10px] text-white/50 leading-relaxed max-w-xs mx-auto">
            Hemos registrado tu cita para el <strong>{selectedDate}</strong> a las <strong>{selectedTime}</strong>. 
            Se ha generado una copia en PDF del acuerdo con tu firma criptográfica y enviado a tu correo <strong>{email}</strong>.
          </p>
          <button
            onClick={() => {
              setIsBooked(false);
              setSelectedDate('');
              setSelectedTime('');
              setName('');
              setEmail('');
              setPhone('');
              setCompany('');
              setVenueType('');
              setMessage('');
              setIsSigned(false);
            }}
            className="mt-6 px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/60 transition-all cursor-pointer"
          >
            Nueva Reserva
          </button>
        </div>
      ) : (
        <form onSubmit={handleBooking} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Nombre del Organizador *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Carlos Mendoza"
                required
                disabled={loading}
                className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-white/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Correo Electrónico *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej. carlos@ejemplo.com"
                required
                disabled={loading}
                className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-white/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Teléfono *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 55 1234 5678"
                required
                disabled={loading}
                className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-white/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Empresa / Razón Social</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Ej. Eventos Premium SA"
                disabled={loading}
                className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-white/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Fecha *</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/10 color-scheme-dark"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Hora *</label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-3 text-xs text-white focus:outline-none"
                >
                  <option value="">Selecciona...</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Tipo de Evento / Recinto *</label>
              <select
                value={venueType}
                onChange={(e) => setVenueType(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-3 text-xs text-white focus:outline-none"
              >
                <option value="">Selecciona...</option>
                <option value="festival">Festival</option>
                <option value="theater">Teatro / Auditorio</option>
                <option value="club">Club / Antro</option>
                <option value="private">Evento Privado</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Notas / Especificaciones</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej. Requerimientos de audio, riders o consideraciones especiales."
              disabled={loading}
              rows={2}
              className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-white/10"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Firma Digital del Acuerdo *</label>
              {isSigned && !loading && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[8px] font-black uppercase text-red-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  Limpiar Lienzo
                </button>
              )}
            </div>
            <div className="bg-[#020403] border border-white/5 rounded-2xl p-2">
              <canvas
                ref={canvasRef}
                width={400}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[120px] bg-[#020403] border border-dashed border-white/10 rounded-xl cursor-crosshair touch-none"
              />
              <p className="text-[7.5px] text-white/35 text-center mt-1 uppercase tracking-wider font-bold">
                Dibuja tu firma sobre el recuadro digital
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-102 active:scale-95 disabled:opacity-55 transition-all shadow-md cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? 'Procesando Cita...' : 'Reservar Cita y Firmar Propuesta'}
          </button>
        </form>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
