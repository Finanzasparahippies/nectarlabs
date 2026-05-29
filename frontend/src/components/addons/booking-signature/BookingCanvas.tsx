'use client';

import React, { useState, useRef } from 'react';
import Toast from '../../ui/Toast';

interface BookingCanvasProps {
  primaryColor: string;
}

export default function BookingCanvas({ primaryColor }: BookingCanvasProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [name, setName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

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

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !name || !isSigned) {
      setToast({ message: 'Por favor completa todos los campos y firma la propuesta.', type: 'warning' });
      return;
    }
    setIsBooked(true);
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
            Se ha generado una copia en PDF del acuerdo con tu firma criptográfica y enviado a tu correo.
          </p>
          <button
            onClick={() => {
              setIsBooked(false);
              setSelectedDate('');
              setSelectedTime('');
              setName('');
              setIsSigned(false);
            }}
            className="mt-6 px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/60 transition-all"
          >
            Nueva Reserva
          </button>
        </div>
      ) : (
        <form onSubmit={handleBooking} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Nombre del Firmante</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Carlos Mendoza"
                required
                className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-white/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Fecha</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/10 color-scheme-dark"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Hora</label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  required
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
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Firma Digital del Acuerdo</label>
              {isSigned && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[8px] font-black uppercase text-red-400 hover:text-red-500 transition-colors"
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
            className="w-full py-4 text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-102 active:scale-95 transition-all shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            Reservar Cita y Firmar Propuesta
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
