'use client';

import React, { useState, useEffect } from 'react';

interface SignatoryInput {
  name: string;
  email: string;
  role: string;
}

interface CustomContractsManagerProps {
  tenantId: string | null;
  subdomain?: string;
  primaryColor?: string;
  token?: string;
}

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
  const handleSignatoryChange = (index: number, field: keyof SignatoryInput, value: string) => {
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
    if (!title || !proemio || !declarations || !clauses) {
      showToast('Por favor completa todos los campos del contrato.', 'error');
      return;
    }

    const invalidSig = signatories.some(s => !s.name || !s.email || !s.role);
    if (invalidSig) {
      showToast('Por favor completa los datos de todos los firmantes.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const headers = getHeaders();
      const payload = {
        title,
        proemio,
        declarations,
        clauses,
        signatories,
        header_design: {}
      };

      const res = await fetch('/api/bookings/custom-contracts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('¡Contrato emitido e invitaciones de firma enviadas con éxito!', 'success');
        // Reset form
        setTitle('');
        setProemio('');
        setDeclarations('');
        setClauses('');
        setSignatories([
          { name: '', email: '', role: 'Representante Legal' },
          { name: '', email: '', role: 'Cliente' }
        ]);
        setActiveSubTab('list');
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.detail || 'Error al emitir el contrato.', 'error');
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

              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider font-black text-foreground/60 block">Proemio (Introducción Legal)</label>
                <textarea
                  required
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
                  required
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
                  required
                  rows={8}
                  placeholder="Ej. PRIMERA. OBJETO: ...\nSEGUNDA. HONORARIOS: ..."
                  value={clauses}
                  onChange={(e) => setClauses(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-2xl p-4 text-[10px] text-foreground focus:outline-none focus:border-foreground/35 transition-all font-mono resize-none"
                />
              </div>
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
