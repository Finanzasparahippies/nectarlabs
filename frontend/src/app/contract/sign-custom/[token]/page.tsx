'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

interface Signatory {
  id: string;
  name: string;
  email: string;
  role: string;
  has_signed: boolean;
  signed_at?: string;
  signature_base64?: string;
  ip_address?: string;
}

interface ContractData {
  id: number;
  title: string;
  proemio: string;
  declarations: string;
  clauses: string;
  logo_url?: string;
  primary_color?: string;
  is_fully_signed: boolean;
  pdf_file?: string;
  current_signatory?: {
    id: string;
    name: string;
    email: string;
    role: string;
    has_signed: boolean;
    sig_page?: number;
    sig_x?: number;
    sig_y?: number;
    sig_w?: number;
    sig_h?: number;
  };
  signatories?: Signatory[];
}

// PDF.js Page Canvas Component for Signing View
const PdfSignPageCanvas = ({ page, pageIndex, currentSignatory, signatories }: any) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, pointsWidth: 0, pointsHeight: 0 });

  useEffect(() => {
    let renderTask: any = null;
    const renderPage = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale: 1.0 });
      const pointsWidth = viewport.width;
      const pointsHeight = viewport.height;

      const displayWidth = Math.min(500, window.innerWidth - 80);
      const scale = displayWidth / pointsWidth;
      const scaledViewport = page.getViewport({ scale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      setDimensions({
        width: scaledViewport.width,
        height: scaledViewport.height,
        pointsWidth,
        pointsHeight
      });

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
      };
      
      try {
        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error rendering sign page:', err);
        }
      }
    };
    renderPage();
    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [page]);

  // Combine current signatory and other signatories
  const boxes: any[] = [];
  if (currentSignatory && currentSignatory.sig_page === pageIndex + 1) {
    boxes.push({ ...currentSignatory, isCurrent: true });
  }
  (signatories || []).forEach((sig: any) => {
    if (sig.sig_page === pageIndex + 1 && sig.id !== currentSignatory?.id) {
      boxes.push({ ...sig, isCurrent: false });
    }
  });

  return (
    <div
      className="relative mx-auto my-6 border border-white/5 shadow-xl bg-[#0e1217] rounded-2xl overflow-hidden select-none"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <canvas ref={canvasRef} className="block" />
      
      {boxes.map((box: any, bIdx) => {
        if (!dimensions.width || !dimensions.pointsWidth) return null;
        
        const leftCss = (box.sig_x / dimensions.pointsWidth) * dimensions.width;
        const topCss = (box.sig_y / dimensions.pointsHeight) * dimensions.height;
        const widthCss = (box.sig_w / dimensions.pointsWidth) * dimensions.width;
        const heightCss = (box.sig_h / dimensions.pointsHeight) * dimensions.height;

        return (
          <div
            key={bIdx}
            className={`absolute border-2 flex flex-col items-center justify-center p-1 text-[8px] font-black uppercase rounded ${
              box.isCurrent
                ? 'border-[#C68A1E] bg-[#C68A1E]/20 text-[#C68A1E] animate-pulse'
                : box.signature_base64
                  ? 'border-emerald-500 bg-emerald-500/25 text-emerald-400'
                  : 'border-white/10 bg-white/5 text-white/40'
            }`}
            style={{
              left: `${leftCss}px`,
              top: `${topCss}px`,
              width: `${widthCss}px`,
              height: `${heightCss}px`
            }}
          >
            {box.isCurrent ? (
              <>
                <span>✍️ Firma Aquí</span>
                <span className="truncate max-w-full font-mono mt-0.5">{box.name}</span>
              </>
            ) : box.signature_base64 ? (
              <>
                <span>✓ Firmado</span>
                <span className="truncate max-w-full font-mono mt-0.5">{box.name}</span>
              </>
            ) : (
              <>
                <span>⏰ Pendiente</span>
                <span className="truncate max-w-full font-mono mt-0.5">{box.name}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function CustomContractSignPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [pdfPages, setPdfPages] = useState<any[]>([]);

  // Dynamically load PDF.js CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).pdfjsLib) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    };
    document.head.appendChild(script);
  }, []);

  // Parse PDF pages into memory viewport objects once the contract is loaded and pdf_file is present
  useEffect(() => {
    if (!contract || !contract.pdf_file || (contract.proemio && contract.clauses)) {
      setPdfPages([]);
      return;
    }
    const loadPdfPages = async () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        setTimeout(loadPdfPages, 500);
        return;
      }
      try {
        const pdf = await pdfjsLib.getDocument(contract.pdf_file).promise;
        const pagesList: any[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          pagesList.push(await pdf.getPage(i));
        }
        setPdfPages(pagesList);
      } catch (err) {
        console.error("Error reading PDF file for sign page:", err);
      }
    };
    loadPdfPages();
  }, [contract]);

  // Canvas ref for drawing board
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
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
  }, [contract, success]);

  // Load contract details from token
  const loadContract = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/custom-contracts/by_token/?token=${token}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Enlace de firma no válido o vencido.');
      }
      const data = await res.json();
      setContract(data);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadContract();
    }
  }, [token]);

  // Canvas Draw Handlers
  useEffect(() => {
    if (!contract || success || contract.current_signatory?.has_signed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Config style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Handle resizing context issues
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      // Reapply style after resize
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [contract, success]);

  // Drawing helpers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Submit signature
  const handleSign = async () => {
    if (!hasDrawn || !canvasRef.current) return;
    setSubmitting(true);
    setError(null);

    try {
      // Get base64 string
      const signature_base64 = canvasRef.current.toDataURL('image/png');

      const res = await fetch('/api/bookings/custom-contracts/sign_by_token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          signature: signature_base64
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo registrar la firma.');
      }

      setSuccess(true);
      showToastNotification();
    } catch (err: any) {
      setError(err.message || 'Error de comunicación con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToastNotification = () => {
    setToastMessage('¡Firma registrada con éxito!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#06070b] text-[#f3f4f6] font-sans">
        <div className="w-10 h-10 border-4 border-[#C68A1E] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Cargando Contrato Digital...</p>
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#06070b] text-[#f3f4f6] px-6 font-sans">
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center text-3xl mb-6">
          ⚠️
        </div>
        <h2 className="text-xl font-black tracking-tight uppercase">Enlace Inválido</h2>
        <p className="text-sm text-white/50 text-center max-w-sm mt-2 leading-relaxed">
          {error}
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-8 px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (!contract) return null;

  const primaryColor = contract.primary_color || '#C68A1E';

  return (
    <div className="min-h-screen bg-[#06070b] text-[#f3f4f6] font-sans flex flex-col relative overflow-hidden pb-12">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-[#0b0c15] to-[#06070b] pointer-events-none z-0"></div>
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>

      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-md sticky top-0 z-30 bg-[#06070b]/60">
        <div className="max-w-5xl mx-auto px-6 h-18 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {contract.logo_url ? (
              <img src={contract.logo_url} alt="Logo" className="w-8 h-8 rounded-full object-cover border border-white/10" />
            ) : (
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black" style={{ backgroundColor: primaryColor }}>
                👑
              </span>
            )}
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">Néctar Sign</h1>
              <p className="text-[7.5px] uppercase tracking-widest font-black opacity-40 mt-0.5">Pipeline de Contratos Certificados</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-6 py-10 flex-1 flex flex-col lg:flex-row gap-8 relative z-10">
        {/* Left: Contract Document Reader */}
        <div className="flex-1 flex flex-col bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative">
          <div className="absolute top-8 right-8 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-emerald-500"></span>
            <span className="text-[7.5px] font-black uppercase tracking-widest text-emerald-400">Canal Seguro</span>
          </div>

          <div className="border-b border-white/5 pb-6 mb-8 text-left">
            <span className="px-2.5 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-full" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, border: `1px solid ${primaryColor}20` }}>
              CONTRATO DIGITAL
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white mt-4">{contract.title}</h2>
            <p className="text-[9px] uppercase tracking-widest opacity-40 mt-1">Néctar Labs Ecosystem Legal System</p>
          </div>

          {/* Document Content */}
          <div className="flex-1 text-left space-y-8 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar text-xs leading-relaxed text-white/80 select-text">
            {pdfPages.length > 0 ? (
              <div className="space-y-4">
                <span className="text-[8px] font-black uppercase text-[#C68A1E] block text-center tracking-widest bg-[#C68A1E]/10 border border-[#C68A1E]/20 p-2.5 rounded-xl">
                  🔍 Ubicación de Firmas: Busca el bloque dorado que parpadea y firma en el panel derecho.
                </span>
                {pdfPages.map((page, idx) => (
                  <div key={idx} className="relative">
                    <span className="text-[7px] font-black font-mono text-white/35 block text-center mb-1">
                      PÁGINA {idx + 1} DE {pdfPages.length}
                    </span>
                    <PdfSignPageCanvas
                      page={page}
                      pageIndex={idx}
                      currentSignatory={contract.current_signatory}
                      signatories={contract.signatories}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Proemio */}
                <div className="space-y-2">
                  <h3 className="text-[9px] font-black uppercase tracking-wider" style={{ color: primaryColor }}>PROEMIO</h3>
                  <p className="bg-white/[0.02] border border-white/5 p-4 rounded-xl font-medium leading-relaxed italic whitespace-pre-line text-white/70">
                    {contract.proemio}
                  </p>
                </div>

                {/* Declaraciones */}
                <div className="space-y-2">
                  <h3 className="text-[9px] font-black uppercase tracking-wider" style={{ color: primaryColor }}>DECLARACIONES</h3>
                  <p className="whitespace-pre-line text-justify leading-relaxed font-normal">
                    {contract.declarations}
                  </p>
                </div>

                {/* Clausulas */}
                <div className="space-y-2">
                  <h3 className="text-[9px] font-black uppercase tracking-wider" style={{ color: primaryColor }}>CLÁUSULAS</h3>
                  <p className="whitespace-pre-line text-justify leading-relaxed font-normal">
                    {contract.clauses}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Document footer with status info */}
          <div className="border-t border-white/5 pt-6 mt-8 flex flex-wrap gap-4 items-center justify-between">
            <div className="text-left">
              <span className="text-[7.5px] font-black uppercase tracking-widest opacity-35 block">Estatus del Documento</span>
              {contract.is_fully_signed ? (
                <span className="text-[10px] font-black text-green-400 mt-1 block uppercase">✓ Totalmente Firmado</span>
              ) : (
                <span className="text-[10px] font-black text-amber-400 mt-1 block uppercase">⚡ Pendiente de Firmas</span>
              )}
            </div>

            {contract.pdf_file && (
              <a
                href={contract.pdf_file}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                style={{ borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}05` }}
              >
                Descargar Copia Certificada (PDF)
              </a>
            )}
          </div>
        </div>

        {/* Right: Signature Canvas */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          {success || contract.current_signatory?.has_signed ? (
            /* Thank You Card */
            <div className="bg-white/[0.01] border border-green-500/20 bg-green-950/5 p-8 rounded-[2.5rem] shadow-xl text-center space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 flex items-center justify-center text-3xl mx-auto animate-bounce">
                ✓
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-tight text-white">¡Documento Firmado!</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Has completado de manera exitosa tu firma digital en este contrato.
                </p>
                <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono">
                  Tu dirección IP y marca temporal han sido registradas para certificación digital.
                </p>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-2 text-left">
                <span className="text-[7.5px] font-black uppercase tracking-widest opacity-40 block">Próximos Pasos</span>
                <p className="text-[10px] text-white/50 leading-normal">
                  Una vez que todos los firmantes hayan estampado su firma, recibirás automáticamente una copia certificada del contrato digital en formato PDF en tu correo electrónico.
                </p>
              </div>
            </div>
          ) : (
            /* Signature Form & Board */
            <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] shadow-xl text-left space-y-6 flex flex-col justify-between">
              <div>
                <span className="px-2.5 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-full bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/20">
                  Panel de Firma
                </span>
                <h3 className="text-lg font-black tracking-tight text-white mt-4">Estampar Firma Digital</h3>
                <p className="text-[9.5px] text-white/50 leading-relaxed mt-1 uppercase tracking-wider">
                  Firmante actual: <strong className="text-white">{contract.current_signatory?.name}</strong> ({contract.current_signatory?.role})
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase tracking-wider font-bold rounded-xl">
                  ⚠️ {error}
                </div>
              )}

              {/* Draw Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Dibuja tu firma aquí</label>
                  <button
                    onClick={clearCanvas}
                    className="text-[8.5px] text-[#C68A1E] font-black uppercase tracking-wider hover:underline"
                  >
                    Limpiar Lienzo
                  </button>
                </div>

                <div className="h-56 bg-white border border-white/10 rounded-2xl overflow-hidden relative cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full block bg-white"
                    style={{ touchAction: 'none' }}
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[9.5px] text-neutral-400 font-bold uppercase tracking-widest select-none">
                      ✍️ Toca o haz clic para firmar
                    </div>
                  )}
                </div>

                <p className="text-[8px] text-white/30 leading-normal text-justify">
                  Al pulsar el botón de abajo, reconozco y acepto de manera libre y voluntaria que mi firma electrónica estampada en el lienzo superior posee validez legal e implicaciones vinculantes equivalentes a una firma autógrafa conforme a las legislaciones aplicables de comercio y firma electrónica.
                </p>
              </div>

              <button
                onClick={handleSign}
                disabled={submitting || !hasDrawn}
                className="w-full py-4 text-background rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:scale-100 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg cursor-pointer font-bold mt-4"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-t-background border-background/25 animate-spin"></span>
                    Registrando Firma...
                  </>
                ) : (
                  'Estampar mi firma digital'
                )}
              </button>
            </div>
          )}

          {/* Involucrados */}
          <div className="bg-white/[0.01] border border-white/5 p-6 rounded-[2rem] shadow-xl text-left space-y-4">
            <h4 className="text-[9px] font-black uppercase tracking-widest opacity-40">Firmantes Involucrados</h4>
            <div className="space-y-3">
              {contract.signatories?.map((sig) => (
                <div key={sig.id} className="flex justify-between items-center gap-4 text-xs">
                  <div>
                    <h5 className="font-bold text-white/95 leading-none">{sig.name}</h5>
                    <span className="text-[8px] font-medium opacity-50 block mt-1 uppercase tracking-wider">{sig.role}</span>
                  </div>
                  {sig.has_signed ? (
                    <span className="text-[8px] font-black text-green-400 uppercase tracking-widest shrink-0">✓ Firmado</span>
                  ) : (
                    <span className="text-[8px] font-black text-white/35 uppercase tracking-widest shrink-0 font-bold">Pendiente</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0c0d14]/90 border border-green-500/20 p-4 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[9px] font-bold">✓</span>
          <span className="text-[10px] uppercase font-black tracking-wider text-white">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
