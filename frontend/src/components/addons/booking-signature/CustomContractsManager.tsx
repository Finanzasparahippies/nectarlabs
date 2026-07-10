'use client';

import React, { useState, useEffect } from 'react';

interface SignatoryInput {
  name: string;
  email: string;
  role: string;
  sig_page?: number;
  sig_x?: number;
  sig_y?: number;
  sig_w?: number;
  sig_h?: number;
}

interface CustomContractsManagerProps {
  tenantId: string | null;
  subdomain?: string;
  primaryColor?: string;
  token?: string;
}

// PDF.js Page Canvas Component
const PdfPageCanvas = ({ page, pageIndex, onDropSignature, signatureBoxes }: any) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, pointsWidth: 0, pointsHeight: 0 });

  React.useEffect(() => {
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
      await page.render(renderContext).promise;
    };
    renderPage();
  }, [page]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const signatoryIndex = parseInt(e.dataTransfer.getData('signatoryIndex'));
    if (isNaN(signatoryIndex)) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const boxWidthCss = 120;
    const boxHeightCss = 60;
    const leftCss = Math.max(0, Math.min(clientX - boxWidthCss / 2, dimensions.width - boxWidthCss));
    const topCss = Math.max(0, Math.min(clientY - boxHeightCss / 2, dimensions.height - boxHeightCss));

    const pdfX = (leftCss / dimensions.width) * dimensions.pointsWidth;
    const pdfY = (topCss / dimensions.height) * dimensions.pointsHeight;
    const pdfW = (boxWidthCss / dimensions.width) * dimensions.pointsWidth;
    const pdfH = (boxHeightCss / dimensions.height) * dimensions.pointsHeight;

    onDropSignature(signatoryIndex, pageIndex + 1, pdfX, pdfY, pdfW, pdfH);
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative mx-auto my-6 border border-card-border/80 shadow-lg bg-[#0e1217] rounded-2xl overflow-hidden select-none"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <canvas ref={canvasRef} className="block" />
      
      {signatureBoxes.map((box: any) => {
        if (box.sig_page !== pageIndex + 1) return null;
        if (!dimensions.width || !dimensions.pointsWidth) return null;
        
        const leftCss = (box.sig_x / dimensions.pointsWidth) * dimensions.width;
        const topCss = (box.sig_y / dimensions.pointsHeight) * dimensions.height;
        const widthCss = (box.sig_w / dimensions.pointsWidth) * dimensions.width;
        const heightCss = (box.sig_h / dimensions.pointsHeight) * dimensions.height;

        return (
          <div
            key={box.signatoryIndex}
            className="absolute border-2 border-[#C68A1E] bg-[#C68A1E]/20 flex flex-col items-center justify-center p-1 text-[8px] font-black uppercase text-[#C68A1E] rounded cursor-move animate-fadeIn"
            style={{
              left: `${leftCss}px`,
              top: `${topCss}px`,
              width: `${widthCss}px`,
              height: `${heightCss}px`
            }}
          >
            <span>Firma</span>
            <span className="truncate max-w-full font-mono mt-0.5">{box.name || `Firmante #${box.signatoryIndex + 1}`}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function CustomContractsManager({
  tenantId,
  subdomain,
  primaryColor = '#C68A1E',
  token
}: CustomContractsManagerProps) {
  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create' | 'templates'>('list');

  // Lists
  const [contracts, setContracts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [proemio, setProemio] = useState('');
  const [declarations, setDeclarations] = useState('');
  const [clauses, setClauses] = useState('');
  const [signatories, setSignatories] = useState<SignatoryInput[]>([
    { name: '', email: '', role: 'Representante Legal' },
    { name: '', email: '', role: 'Cliente' }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Creation Mode State for Custom PDF Drag & Drop
  const [creationMode, setCreationMode] = useState<'editor' | 'pdf'>('editor');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
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

  // Parse PDF pages into memory canvas-ready viewport objects
  useEffect(() => {
    if (!pdfFile) {
      setPdfPages([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        showToast('Cargando motor de lectura PDF. Por favor espera un momento.', 'info');
        return;
      }
      try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pagesList: any[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          pagesList.push(await pdf.getPage(i));
        }
        setPdfPages(pagesList);
      } catch (err) {
        showToast('Error al leer el archivo PDF.', 'error');
      }
    };
    reader.readAsArrayBuffer(pdfFile);
  }, [pdfFile]);

  const handleDropSignature = (idx: number, page: number, x: number, y: number, w: number, h: number) => {
    setSignatories(prev => prev.map((sig, i) => {
      if (i === idx) {
        return { ...sig, sig_page: page, sig_x: x, sig_y: y, sig_w: w, sig_h: h };
      }
      return sig;
    }));
  };

  // Template Form State
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [tplTitle, setTplTitle] = useState('');
  const [tplProemio, setTplProemio] = useState('');
  const [tplDeclarations, setTplDeclarations] = useState('');
  const [tplClauses, setTplClauses] = useState('');
  const [tplSignatoriesCount, setTplSignatoriesCount] = useState(2);

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleResendEmail = async (contractId: string) => {
    setResendingId(contractId);
    try {
      const headers = getHeaders();
      const res = await fetch(`/api/bookings/custom-contracts/${contractId}/resend-email/`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Correo reenviado con éxito.', 'success');
      } else {
        showToast(data.error || 'Error al reenviar el correo.', 'error');
      }
    } catch (err) {
      showToast('Error de red al reenviar el correo.', 'error');
    } finally {
      setResendingId(null);
    }
  };

  // Helper fetch header
  const getHeaders = () => {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Fallback local storage token if present
      const localToken = localStorage.getItem('nectar_token') || localStorage.getItem('token');
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      }
    }
    return headers;
  };

  // Load contracts and templates
  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      
      // Load Contracts
      const resContracts = await fetch('/api/bookings/custom-contracts/', { headers });
      if (resContracts.ok) {
        const data = await resContracts.json();
        setContracts(data.results || data || []);
      }

      // Load Templates
      const resTemplates = await fetch('/api/bookings/custom-templates/', { headers });
      if (resTemplates.ok) {
        const data = await resTemplates.json();
        setTemplates(data.results || data || []);
      }
    } catch (err) {
      console.error('Error loading custom contracts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId, token]);

  // Handle template selection to autofill form
  const handleSelectTemplate = (tpl: any) => {
    setTitle(tpl.title);
    setProemio(tpl.proemio);
    setDeclarations(tpl.declarations);
    setClauses(tpl.clauses);
    
    // Initialize signatories with blank inputs based on tpl count
    const newSigs = Array.from({ length: tpl.signatories_count }, (_, idx) => ({
      name: '',
      email: '',
      role: idx === 0 ? 'Representante Legal' : idx === 1 ? 'Cliente' : `Firmante ${idx + 1}`
    }));
    setSignatories(newSigs);
    setActiveSubTab('create');
    showToast(`Plantilla "${tpl.title}" cargada con éxito.`, 'info');
  };

  // Handle signatory inputs
  const handleSignatoryChange = (index: number, field: 'name' | 'email' | 'role', value: string) => {
    const updated = [...signatories];
    updated[index][field] = value;
    setSignatories(updated);
  };

  const addSignatory = () => {
    setSignatories([...signatories, { name: '', email: '', role: `Firmante ${signatories.length + 1}` }]);
  };

  const removeSignatory = (index: number) => {
    if (signatories.length <= 1) return;
    setSignatories(signatories.filter((_, i) => i !== index));
  };

  // Submit custom contract
  const handleSubmitContract = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (creationMode === 'pdf' && (!title || !pdfFile)) {
      showToast('Por favor introduce un título y carga el archivo PDF del contrato.', 'error');
      return;
    }
    if (creationMode === 'editor' && (!title || !proemio || !declarations || !clauses)) {
      showToast('Por favor completa todos los campos del contrato.', 'error');
      return;
    }

    const invalidSig = signatories.some(s => !s.name || !s.email || !s.role);
    if (invalidSig) {
      showToast('Por favor completa los datos de todos los firmantes.', 'error');
      return;
    }

    if (creationMode === 'pdf') {
      const unplacedSig = signatories.some(s => s.sig_page === undefined || s.sig_x === undefined || s.sig_y === undefined);
      if (unplacedSig) {
        showToast('Por favor arrastra y ubica las firmas de todos los firmantes en las páginas del PDF.', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const headers = getHeaders();
      let res;

      if (creationMode === 'pdf') {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('proemio', '');
        formData.append('declarations', '');
        formData.append('clauses', '');
        formData.append('signatories', JSON.stringify(signatories));
        if (pdfFile) {
          formData.append('uploaded_pdf', pdfFile);
        }
        res = await fetch('/api/bookings/custom-contracts/', {
          method: 'POST',
          headers, // Do NOT set Content-Type header; the browser will set boundary automatically
          body: formData
        });
      } else {
        const payload = {
          title,
          proemio,
          declarations,
          clauses,
          signatories,
          header_design: {}
        };
        res = await fetch('/api/bookings/custom-contracts/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast('¡Contrato emitido e invitaciones de firma enviadas con éxito!', 'success');
        // Reset form
        setTitle('');
        setProemio('');
        setDeclarations('');
        setClauses('');
        setPdfFile(null);
        setSignatories([
          { name: '', email: '', role: 'Representante Legal' },
          { name: '', email: '', role: 'Cliente' }
        ]);
        setActiveSubTab('list');
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.detail || errData.error || 'Error al emitir el contrato.', 'error');
      }
    } catch (err) {
      showToast('Error de red al emitir el contrato.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit template
  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplTitle || !tplProemio || !tplDeclarations || !tplClauses) {
      showToast('Por favor completa todos los campos de la plantilla.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const headers = getHeaders();
      const payload = {
        title: tplTitle,
        proemio: tplProemio,
        declarations: tplDeclarations,
        clauses: tplClauses,
        signatories_count: tplSignatoriesCount,
        header_design: {}
      };

      const res = await fetch('/api/bookings/custom-templates/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Plantilla guardada con éxito.', 'success');
        setTplTitle('');
        setTplProemio('');
        setTplDeclarations('');
        setTplClauses('');
        setIsCreatingTemplate(false);
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.detail || 'Error al guardar plantilla.', 'error');
      }
    } catch (err) {
      showToast('Error de red al guardar la plantilla.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-foreground font-mono animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-card-bg border border-card-border p-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-top duration-300">
          <span className="text-lg">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{toast.message}</span>
        </div>
      )}

      {/* Header and Sub Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-foreground/[0.02] dark:bg-white/[0.02] border border-card-border p-4 rounded-3xl">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2" style={{ color: primaryColor }}>
            📝 Firmas y Contratos Digitales
          </h2>
          <p className="text-[9px] text-foreground/45 uppercase tracking-widest mt-0.5">
            Crea, firma y gestiona contratos legalmente válidos y membretados.
          </p>
        </div>

        <div className="flex bg-background border border-card-border rounded-2xl p-1 gap-1">
          {[
            { id: 'list', label: 'Historial' },
            { id: 'create', label: 'Nuevo Contrato' },
            { id: 'templates', label: 'Plantillas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                setIsCreatingTemplate(false);
              }}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeSubTab === tab.id ? 'text-black' : 'text-foreground/60 hover:text-foreground'
              }`}
              style={{
                backgroundColor: activeSubTab === tab.id ? primaryColor : 'transparent'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-foreground border-foreground/10 animate-spin" style={{ borderTopColor: primaryColor }}></div>
          <span className="text-[9px] font-black uppercase tracking-widest text-foreground/45">Cargando contratos...</span>
        </div>
      ) : activeSubTab === 'list' ? (
        /* HISTORIAL */
        <div className="bg-foreground/[0.02] dark:bg-white/[0.02] border border-card-border rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest">Contratos Emitidos</h3>
            <span className="text-[8px] bg-foreground/5 border border-card-border px-3 py-1 rounded-full text-foreground/60">
              Total: {contracts.length}
            </span>
          </div>

          {contracts.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-card-border rounded-2xl">
              <span className="text-3xl block mb-3">📄</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">No se han emitido contratos digitales aún.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-card-border text-[8px] uppercase font-black tracking-widest text-foreground/45">
                    <th className="pb-3 pl-2">Contrato</th>
                    <th className="pb-3">Involucrados</th>
                    <th className="pb-3">Estatus</th>
                    <th className="pb-3">Fecha de Creación</th>
                    <th className="pb-3 pr-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/50">
                  {contracts.map((contract) => (
                    <tr key={contract.id} className="text-[10px] hover:bg-foreground/[0.02] transition-colors">
                      <td className="py-4 pl-2 font-bold text-foreground max-w-[200px] truncate">{contract.title}</td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                          {contract.signatories?.map((sig: any) => (
                            <span
                              key={sig.id}
                              className={`text-[7.5px] px-2 py-0.5 rounded-md font-bold ${
                                sig.signature_base64
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
                              }`}
                              title={`${sig.email} - ${sig.role}`}
                            >
                              {sig.name} ({sig.role}) {sig.signature_base64 ? '✓' : '⏰'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`text-[8px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                          contract.is_fully_signed
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                            : 'bg-foreground/5 text-foreground/50 border border-card-border'
                        }`}>
                          {contract.is_fully_signed ? 'Cerrado y Certificado' : 'En proceso de firma'}
                        </span>
                      </td>
                      <td className="py-4 text-foreground/60">{new Date(contract.created_at).toLocaleDateString()}</td>
                      <td className="py-4 pr-2 text-right space-x-2 whitespace-nowrap">
                        {contract.pdf_file && (
                          <a
                            href={contract.pdf_file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-foreground/5 hover:bg-foreground/10 border border-card-border text-foreground text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all inline-block"
                          >
                            Descargar PDF
                          </a>
                        )}
                        {!contract.is_fully_signed && (
                          <button
                            onClick={() => {
                              const pending = contract.signatories?.find((s: any) => !s.signature_base64);
                              if (pending) {
                                const signUrl = `${window.location.origin}/contract/sign-custom/${pending.token}`;
                                navigator.clipboard.writeText(signUrl);
                                showToast(`Enlace de firma de ${pending.name} copiado al portapapeles.`, 'info');
                              }
                            }}
                            className="text-[8px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-black uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-yellow-500/20 active:scale-95 transition-all cursor-pointer inline-block"
                          >
                            Copiar Liga
                          </button>
                        )}
                        <button
                          disabled={resendingId === contract.id}
                          onClick={() => handleResendEmail(contract.id)}
                          className="text-[8px] bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 inline-block"
                        >
                          {resendingId === contract.id ? 'Reenviando...' : 'Reenviar Correo'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeSubTab === 'create' ? (
        /* CONSTRUCTOR DE CONTRATO */
        <form onSubmit={handleSubmitContract} className="bg-foreground/[0.02] dark:bg-white/[0.02] border border-card-border rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-card-border pb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Crear Contrato en Caliente</h3>
            <span className="text-[8px] text-foreground/45">Puedes cargar una plantilla de la pestaña de plantillas para rellenar este editor</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Toggle Creation Mode */}
              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Método de Creación</label>
                <div className="flex bg-background border border-card-border rounded-2xl p-1 gap-1 w-full sm:w-fit">
                  <button
                    type="button"
                    onClick={() => setCreationMode('editor')}
                    className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex-1 sm:flex-initial cursor-pointer ${
                      creationMode === 'editor' ? 'bg-[#C68A1E] text-black' : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    ✍️ Redactar Contrato
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationMode('pdf')}
                    className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex-1 sm:flex-initial cursor-pointer ${
                      creationMode === 'pdf' ? 'bg-[#C68A1E] text-black' : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    📁 Subir PDF Existente
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Título del Contrato</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Contrato de Prestación de Servicios de Consultoría"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-2xl px-4 py-3 text-[10px] text-foreground focus:outline-none focus:border-foreground/35 transition-all font-mono"
                />
              </div>

              {creationMode === 'editor' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Proemio (Introducción Legal)</label>
                    <textarea
                      required={creationMode === 'editor'}
                      rows={4}
                      placeholder="Ej. Contrato que celebran por una parte..."
                      value={proemio}
                      onChange={(e) => setProemio(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-2xl p-4 text-[10px] text-foreground focus:outline-none focus:border-foreground/35 transition-all font-mono resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Declaraciones</label>
                    <textarea
                      required={creationMode === 'editor'}
                      rows={6}
                      placeholder="Ej. I. Declara el Prestador que es una persona física...\nII. Declara el Cliente que..."
                      value={declarations}
                      onChange={(e) => setDeclarations(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-2xl p-4 text-[10px] text-foreground focus:outline-none focus:border-foreground/35 transition-all font-mono resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Cláusulas del Contrato</label>
                    <textarea
                      required={creationMode === 'editor'}
                      rows={8}
                      placeholder="Ej. PRIMERA. OBJETO: ...\nSEGUNDA. HONORARIOS: ..."
                      value={clauses}
                      onChange={(e) => setClauses(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-2xl p-4 text-[10px] text-foreground focus:outline-none focus:border-foreground/35 transition-all font-mono resize-none"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Archivo PDF del Contrato</label>
                    <div className="border border-dashed border-card-border/80 hover:border-[#C68A1E]/50 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-background/20">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setPdfFile(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span className="text-2xl block mb-2">📁</span>
                      {pdfFile ? (
                        <p className="text-[9px] font-bold text-foreground font-mono">{pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                      ) : (
                        <p className="text-[8px] uppercase tracking-widest text-foreground/50 font-black">Selecciona o suelta tu archivo PDF aquí</p>
                      )}
                    </div>
                  </div>

                  {pdfFile && pdfPages.length > 0 && (
                    <div className="border border-card-border/60 rounded-3xl p-4 bg-background/40 max-h-[500px] overflow-y-auto custom-scrollbar">
                      <span className="text-[7.5px] uppercase font-black text-foreground/50 tracking-wider block mb-4 text-center">
                        Vista previa del documento y colocación de firmas
                      </span>
                      {pdfPages.map((page, idx) => (
                        <div key={idx} className="relative">
                          <span className="text-[7px] font-black font-mono text-foreground/35 block text-center mb-1">
                            PÁGINA {idx + 1} DE {pdfPages.length}
                          </span>
                          <PdfPageCanvas
                            page={page}
                            pageIndex={idx}
                            onDropSignature={handleDropSignature}
                            signatureBoxes={signatories.map((sig, sigIdx) => ({
                              ...sig,
                              signatoryIndex: sigIdx
                            })).filter(sig => sig.sig_page === idx + 1)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Firmantes e Involucrados */}
            <div className="space-y-4 bg-foreground/[0.01] dark:bg-white/[0.01] border border-card-border p-6 rounded-3xl h-fit">
              <div className="flex justify-between items-center">
                <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Personas Involucradas (Firmantes)</label>
                <button
                  type="button"
                  onClick={addSignatory}
                  className="text-[8px] font-black uppercase tracking-widest bg-foreground/5 border border-card-border px-3 py-1.5 rounded-xl hover:bg-foreground/10 active:scale-95 transition-all cursor-pointer text-foreground"
                >
                  + Agregar Firmante
                </button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {signatories.map((sig, idx) => (
                  <div key={idx} className="bg-background border border-card-border p-4 rounded-2xl relative space-y-3">
                    {signatories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSignatory(idx)}
                        className="absolute top-2 right-2 text-foreground/30 hover:text-red-500 text-xs cursor-pointer"
                        title="Remover Firmante"
                      >
                        ✕
                      </button>
                    )}
                    <span className="text-[8px] bg-foreground/5 px-2 py-0.5 rounded text-foreground/45 font-bold uppercase">
                      Firmante #{idx + 1}
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[7.5px] uppercase text-foreground/60">Nombre Completo</label>
                        <input
                          type="text"
                          required
                          placeholder="Nombre"
                          value={sig.name}
                          onChange={(e) => handleSignatoryChange(idx, 'name', e.target.value)}
                          className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[9px] text-foreground focus:outline-none focus:border-foreground/35"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] uppercase text-foreground/60">Rol en el Contrato</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Arrendador, Aval, Testigo"
                          value={sig.role}
                          onChange={(e) => handleSignatoryChange(idx, 'role', e.target.value)}
                          className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[9px] text-foreground focus:outline-none focus:border-foreground/35"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[7.5px] uppercase text-foreground/60">Correo Electrónico (Notificación)</label>
                      <input
                        type="email"
                        required
                        placeholder="destinatario@correo.com"
                        value={sig.email}
                        onChange={(e) => handleSignatoryChange(idx, 'email', e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[9px] text-foreground focus:outline-none focus:border-foreground/35"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {creationMode === 'pdf' && (
                <div className="mt-4 pt-4 border-t border-card-border/50 space-y-2">
                  <span className="text-[7.5px] uppercase font-black tracking-wider text-[#C68A1E] block mb-2">
                    👉 Arrastra los firmantes al PDF:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {signatories.map((sig, idx) => (
                      <div
                        key={idx}
                        draggable={!!(sig.name && sig.email)}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('signatoryIndex', String(idx));
                        }}
                        className={`p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                          sig.name && sig.email
                            ? 'bg-[#C68A1E]/10 border-[#C68A1E]/40 cursor-grab active:cursor-grabbing hover:border-[#C68A1E]'
                            : 'bg-background/20 border-card-border opacity-40 cursor-not-allowed'
                        }`}
                        title={!(sig.name && sig.email) ? "Completa el nombre y correo del firmante para poder ubicar su firma." : "Arrastra al PDF"}
                      >
                        <div className="truncate max-w-[70%]">
                          <span className="text-[7px] bg-[#C68A1E]/20 text-[#C68A1E] px-1.5 py-0.5 rounded font-black uppercase mr-1.5">{sig.role || 'Firmante'}</span>
                          <span className="font-bold text-[9px] text-foreground">{sig.name || `Firmante #${idx + 1}`}</span>
                        </div>
                        {sig.sig_page ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[7px] bg-green-500/10 text-green-400 border border-green-500/25 px-2 py-0.5 rounded-full font-black font-mono">
                              Pág. {sig.sig_page}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSignatories(prev => prev.map((s, i) => {
                                  if (i === idx) {
                                    const { sig_page, sig_x, sig_y, sig_w, sig_h, ...rest } = s;
                                    return rest;
                                  }
                                  return s;
                                }));
                              }}
                              className="text-[7px] text-red-400 hover:text-red-500 font-bold px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded cursor-pointer"
                              title="Retirar firma del PDF"
                            >
                              Retirar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[7px] bg-red-500/10 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full font-black font-mono">
                            Sin ubicar
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-card-border pt-4 mt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting ? 'Generando Contrato y Enviando...' : 'Emitir Contrato y Notificar 🚀'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* PLANTILLAS */
        <div className="space-y-6">
          {isCreatingTemplate ? (
            /* NUEVA PLANTILLA */
            <form onSubmit={handleSubmitTemplate} className="bg-foreground/[0.02] dark:bg-white/[0.02] border border-card-border rounded-3xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center border-b border-card-border pb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Crear Nueva Plantilla</h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingTemplate(false)}
                  className="text-[8px] font-black uppercase tracking-widest bg-foreground/5 border border-card-border px-3 py-1.5 rounded-xl hover:bg-foreground/10 cursor-pointer text-foreground"
                >
                  Volver a Plantillas
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Nombre de la Plantilla</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Plantilla Arrendamiento Base"
                      value={tplTitle}
                      onChange={(e) => setTplTitle(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-2xl px-4 py-3 text-[10px] text-foreground focus:outline-none focus:border-foreground/35 transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Proemio Predeterminado</label>
                    <textarea
                      required
                      rows={4}
                      value={tplProemio}
                      onChange={(e) => setTplProemio(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-2xl p-4 text-[10px] text-foreground focus:outline-none focus:border-foreground/35"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Declaraciones Predeterminadas</label>
                    <textarea
                      required
                      rows={5}
                      value={tplDeclarations}
                      onChange={(e) => setTplDeclarations(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-2xl p-4 text-[10px] text-foreground focus:outline-none focus:border-foreground/35"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Cláusulas Predeterminadas</label>
                    <textarea
                      required
                      rows={10}
                      value={tplClauses}
                      onChange={(e) => setTplClauses(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-2xl p-4 text-[10px] text-foreground focus:outline-none focus:border-foreground/35"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Número de Firmantes Requeridos</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={tplSignatoriesCount}
                      onChange={(e) => setTplSignatoriesCount(parseInt(e.target.value) || 2)}
                      className="w-full bg-background border border-card-border rounded-2xl px-4 py-3 text-[10px] text-foreground focus:outline-none focus:border-foreground/35"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-6 py-4 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-40 transition-all font-bold cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {submitting ? 'Guardando Plantilla...' : 'Guardar Plantilla 💾'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* LISTA DE PLANTILLAS */
            <div className="bg-foreground/[0.02] dark:bg-white/[0.02] border border-card-border rounded-3xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Plantillas Disponibles</h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingTemplate(true)}
                  className="text-[8px] font-black uppercase tracking-widest text-black px-4 py-2 rounded-xl hover:scale-[1.03] transition-all cursor-pointer font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  + Nueva Plantilla
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-card-border rounded-2xl">
                  <span className="text-3xl block mb-3">🗂️</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">No hay plantillas guardadas.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col justify-between hover:border-foreground/20 transition-all">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground truncate max-w-[150px]">{tpl.title}</h4>
                          <span className="text-[7px] bg-foreground/5 border border-card-border px-2 py-0.5 rounded text-foreground/40 font-bold uppercase whitespace-nowrap">
                            {tpl.tenant ? 'Personalizada' : 'Néctar Labs'}
                          </span>
                        </div>
                        <p className="text-[8px] text-foreground/45 uppercase tracking-wider mt-2">
                          Firmantes predeterminados: {tpl.signatories_count}
                        </p>
                      </div>

                      <button
                        onClick={() => handleSelectTemplate(tpl)}
                        className="w-full mt-6 py-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground text-[8px] font-black uppercase tracking-widest rounded-xl border border-card-border hover:border-foreground/20 active:scale-95 transition-all cursor-pointer"
                      >
                        Utilizar Plantilla
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
