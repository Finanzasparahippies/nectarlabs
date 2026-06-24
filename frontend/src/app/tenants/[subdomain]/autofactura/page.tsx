'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';

interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  welcome_message: string;
  portal_title: string | null;
  footer_text: string | null;
  require_customer_info: boolean;
  theme_color: string;
  accent_color: string;
  bg_color: string;
  card_bg_color: string;
  text_color: string;
  border_color: string;
}

interface SalesNoteItem {
  description: string;
  quantity: number;
  unit_price: string;
  product_key: string;
  unit_key: string;
}

interface SalesNote {
  id: number;
  folio: string;
  total: string;
  payment_method: string;
  status: 'PAID' | 'INVOICED' | 'CANCELLED';
  created_at: string;
  items: SalesNoteItem[];
  pdf_url?: string;
  xml_url?: string;
  uuid_sat?: string;
}

export default function PublicSelfBillingPage() {
  const params = useParams();
  const router = useRouter();
  const rawSubdomain = params?.subdomain as string;
  const [subdomain, setSubdomain] = useState<string>('');
  
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Flow State
  const [step, setStep] = useState<'search' | 'preview' | 'success'>('search');
  const [folioInput, setFolioInput] = useState('');
  const [loadingNote, setLoadingNote] = useState(false);
  const [salesNote, setSalesNote] = useState<SalesNote | null>(null);
  
  // Fiscal Form State
  const [rfc, setRfc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [regimenFiscal, setRegimenFiscal] = useState('601');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [email, setEmail] = useState('');
  const [usoCfdi, setUsoCfdi] = useState('G03');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<{
    pdf_url: string | null;
    xml_url: string | null;
    uuid_sat: string;
  } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Resolve subdomain dynamically
  useEffect(() => {
    if (rawSubdomain) {
      setSubdomain(rawSubdomain);
      return;
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      let parsed = '';

      if (hostname.includes('.staging.nectarlabs.dev')) {
        parsed = hostname.split('.staging.nectarlabs.dev')[0];
      } else if (hostname.includes('.nectarlabs.dev')) {
        parsed = hostname.split('.nectarlabs.dev')[0];
      } else if (hostname.includes('.localhost:3000')) {
        parsed = hostname.split('.localhost:3000')[0];
      } else if (hostname.includes('.localhost:3002')) {
        parsed = hostname.split('.localhost:3002')[0];
      } else if (hostname.includes('.localhost')) {
        parsed = hostname.split('.localhost')[0];
      }

      if (parsed && parsed !== 'www' && parsed !== 'api' && parsed !== 'admin' && parsed !== 'staging') {
        setSubdomain(parsed);
      }
    }
  }, [rawSubdomain]);

  // Fetch Public Config
  useEffect(() => {
    if (!subdomain) return;

    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/tenants/public-config/?subdomain=${subdomain}`);
        if (!res.ok) throw new Error('El portal solicitado no se encuentra activo o no existe.');
        const data = await res.json();
        if (!data.is_active) throw new Error('El portal está inactivo.');
        setTenantConfig(data);
      } catch (err: any) {
        setConfigError(err.message || 'Error al conectar con el servidor.');
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [subdomain]);

  useEffect(() => {
    if (tenantConfig) {
      document.title = `Autofacturación - ${tenantConfig.name}`;
    }
  }, [tenantConfig]);

  // Search sales note by folio
  const handleSearchNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioInput.trim()) {
      showToast('Por favor introduce un folio válido', 'error');
      return;
    }

    setLoadingNote(true);
    try {
      const res = await fetch(
        `/api/billing/sales-notes/retrieve-by-folio/?folio=${encodeURIComponent(folioInput.trim())}&subdomain=${subdomain}`
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error || 'No se encontró la nota de venta.');
      }
      const data = await res.json();
      setSalesNote(data);
      setStep('preview');

      // Prepopulate results if already invoiced
      if (data.status === 'INVOICED' && data.uuid_sat) {
        setInvoiceResult({
          pdf_url: data.pdf_url || null,
          xml_url: data.xml_url || null,
          uuid_sat: data.uuid_sat
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Error al buscar nota de venta', 'error');
    } finally {
      setLoadingNote(false);
    }
  };

  // Submit self-billing
  const handleSelfInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    // RFC validation regex
    const rfcRegex = /^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/;
    if (!rfcRegex.test(rfc.trim().toUpperCase())) {
      showToast('El formato del RFC es inválido. Deben ser 12 o 13 caracteres SAT válidos.', 'error');
      return;
    }

    if (!codigoPostal.trim() || codigoPostal.trim().length !== 5) {
      showToast('El código postal debe ser de 5 dígitos.', 'error');
      return;
    }

    setSubmittingInvoice(true);
    try {
      const res = await fetch('/api/billing/sales-notes/self-invoice/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folio: salesNote?.folio,
          subdomain,
          rfc: rfc.trim().toUpperCase(),
          razon_social: razonSocial.trim().toUpperCase(),
          regimen_fiscal: regimenFiscal,
          codigo_postal: codigoPostal.trim(),
          email: email.trim(),
          uso_cfdi: usoCfdi
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error || 'Error al procesar el timbrado ante el SAT.');
      }

      const data = await res.json();
      setInvoiceResult(data);
      setStep('success');
      showToast('Factura emitida con éxito. Archivos listos para descarga.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al emitir factura fiscal.', 'error');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const getPaymentMethodName = (code: string) => {
    const methods: Record<string, string> = {
      '01': 'Efectivo',
      '02': 'Cheque nominativo',
      '03': 'Transferencia electrónica de fondos',
      '04': 'Tarjeta de crédito',
      '28': 'Tarjeta de débito',
      '99': 'Por definir'
    };
    return methods[code] || code;
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-[#020403] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-white border-white/10 animate-spin"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Cargando Portal...</span>
      </div>
    );
  }

  if (configError || !tenantConfig) {
    return (
      <div className="min-h-screen bg-[#020403] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#050a06] border border-white/15 p-8 rounded-[2rem] space-y-6">
          <span className="text-4xl block">⚠️</span>
          <h2 className="text-lg font-black uppercase text-white">Error de Conexión</h2>
          <p className="text-xs text-white/60 leading-relaxed font-mono">
            {configError || 'Portal no encontrado o inactivo.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] uppercase font-black tracking-wider hover:bg-white/10 transition-all cursor-pointer"
          >
            Ir a Inicio
          </button>
        </div>
      </div>
    );
  }

  const primaryColor = tenantConfig.theme_color || '#C68A1E';

  return (
    <div 
      className="min-h-screen flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans"
      style={{ backgroundColor: tenantConfig.bg_color || '#020403', color: tenantConfig.text_color || '#FFFFFF' }}
    >
      {toast && (
        <div className="fixed bottom-6 right-6 z-55 max-w-sm animate-in fade-in slide-in-from-bottom-5">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Header Container */}
      <div className="max-w-2xl mx-auto w-full flex flex-col items-center mb-8">
        {tenantConfig.logo_url ? (
          <img 
            src={tenantConfig.logo_url} 
            alt={tenantConfig.name} 
            className="h-12 w-auto mb-4 object-contain"
          />
        ) : (
          <span className="text-3xl mb-2">🧾</span>
        )}
        <h1 className="text-xl font-black uppercase tracking-tight text-center">
          Portal de Autofacturación
        </h1>
        <p className="text-[9px] uppercase tracking-widest text-white/45 mt-1">
          {tenantConfig.name}
        </p>
      </div>

      {/* Main Flow Card */}
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div 
          className="border rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md"
          style={{ 
            backgroundColor: tenantConfig.card_bg_color || '#050a06', 
            borderColor: tenantConfig.border_color || '#151F18' 
          }}
        >
          {/* Step 1: Search Folio */}
          {step === 'search' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-base font-black uppercase text-white tracking-wide">Buscar Nota de Venta</h3>
                <p className="text-[9.5px] text-white/50 leading-relaxed max-w-sm mx-auto mt-2">
                  Escribe el folio de tu nota de venta para validar los conceptos y completar tus datos fiscales.
                </p>
              </div>

              <form onSubmit={handleSearchNote} className="space-y-4">
                <div>
                  <label className="text-[7.5px] uppercase font-black tracking-widest text-white/45 block mb-1.5 pl-1">
                    Folio de Nota
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. NV-20260624-A1B2C3"
                    value={folioInput}
                    onChange={(e) => setFolioInput(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-nectar-gold transition-colors text-center"
                    style={{ borderColor: tenantConfig.border_color }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingNote}
                  className="w-full py-4 text-background text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loadingNote ? 'Buscando Nota...' : 'Validar Nota'}
                </button>
              </form>
            </div>
          )}

          {/* Step 2: Preview Note & Form */}
          {step === 'preview' && salesNote && (
            <div className="space-y-8">
              {/* Back to search */}
              <button
                onClick={() => {
                  setStep('search');
                  setSalesNote(null);
                  setInvoiceResult(null);
                }}
                className="text-[8px] uppercase font-black tracking-widest text-white/40 hover:text-white flex items-center gap-1.5 cursor-pointer font-mono"
              >
                ← Regresar a la búsqueda
              </button>

              {/* Note Receipt Preview */}
              <div className="bg-black/20 border border-white/5 rounded-3xl p-5 space-y-4 font-mono text-xs">
                <div className="flex justify-between border-b border-dashed border-white/10 pb-3">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase">Folio de Nota</p>
                    <p className="text-sm font-black text-white">{salesNote.folio}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-white/40 uppercase">Fecha de Compra</p>
                    <p className="text-white/80">{new Date(salesNote.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-2 py-2">
                  <p className="text-[9px] uppercase font-bold text-white/40">Conceptos:</p>
                  {salesNote.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>{item.quantity}x {item.description}</span>
                      <span>${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-white/10 pt-3 flex justify-between font-bold text-sm">
                  <span>Total (IVA incluido):</span>
                  <span style={{ color: primaryColor }}>${parseFloat(salesNote.total).toFixed(2)} MXN</span>
                </div>

                {salesNote.status === 'INVOICED' && (
                  <div className="border-t border-dashed border-white/10 pt-3 text-center space-y-3">
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-wider block font-mono">
                      Esta nota ya fue facturada anteriormente
                    </span>
                    {invoiceResult && (
                      <div className="flex gap-2">
                        {invoiceResult.pdf_url && (
                          <a
                            href={invoiceResult.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center transition-all"
                          >
                            Descargar PDF
                          </a>
                        )}
                        {invoiceResult.xml_url && (
                          <a
                            href={invoiceResult.xml_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center transition-all"
                          >
                            Descargar XML
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Billing Form */}
              {salesNote.status !== 'INVOICED' && (
                <form onSubmit={handleSelfInvoice} className="space-y-5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Datos Fiscales Requeridos</h3>
                    <p className="text-[7.5px] text-white/40 uppercase tracking-widest mt-0.5">Asegúrate de ingresar la información exactamente como aparece en tu CSF.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* RFC */}
                    <div>
                      <label className="text-[7.5px] uppercase font-black tracking-wider text-white/50 block mb-1">RFC</label>
                      <input
                        type="text"
                        required
                        placeholder="AAAA000000XXX"
                        value={rfc}
                        onChange={(e) => setRfc(e.target.value.toUpperCase())}
                        maxLength={13}
                        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold text-foreground admin-input font-bold font-mono"
                      />
                    </div>

                    {/* Razón Social */}
                    <div>
                      <label className="text-[7.5px] uppercase font-black tracking-wider text-white/50 block mb-1">Nombre o Razón Social</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. JUAN PEREZ LOPEZ, MI EMPRESA SA DE CV"
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
                        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold text-foreground admin-input font-bold uppercase"
                      />
                    </div>

                    {/* Código Postal */}
                    <div>
                      <label className="text-[7.5px] uppercase font-black tracking-wider text-white/50 block mb-1">Código Postal Fiscal</label>
                      <input
                        type="text"
                        required
                        placeholder="Escribe tu CP"
                        maxLength={5}
                        value={codigoPostal}
                        onChange={(e) => setCodigoPostal(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold text-foreground admin-input font-bold font-mono"
                      />
                    </div>

                    {/* Correo Electrónico */}
                    <div>
                      <label className="text-[7.5px] uppercase font-black tracking-wider text-white/50 block mb-1">Correo para Envío</label>
                      <input
                        type="email"
                        required
                        placeholder="correo@ejemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold text-foreground admin-input font-bold"
                      />
                    </div>

                    {/* Régimen Fiscal */}
                    <div>
                      <label className="text-[7.5px] uppercase font-black tracking-wider text-white/50 block mb-1">Régimen Fiscal</label>
                      <select
                        value={regimenFiscal}
                        onChange={(e) => setRegimenFiscal(e.target.value)}
                        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold text-foreground admin-input font-bold uppercase"
                      >
                        <option value="601">601 - General de Ley Personas Morales</option>
                        <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                        <option value="605">605 - Sueldos y Salarios</option>
                        <option value="606">606 - Arrendamiento</option>
                        <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                        <option value="616">616 - Sin obligaciones fiscales</option>
                        <option value="621">621 - Incorporación Fiscal</option>
                        <option value="625">625 - Régimen Simplificado de Confianza (RESICO)</option>
                      </select>
                    </div>

                    {/* Uso de CFDI */}
                    <div>
                      <label className="text-[7.5px] uppercase font-black tracking-wider text-white/50 block mb-1">Uso de CFDI</label>
                      <select
                        value={usoCfdi}
                        onChange={(e) => setUsoCfdi(e.target.value)}
                        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold text-foreground admin-input font-bold uppercase"
                      >
                        <option value="G01">G01 - Adquisición de mercancías</option>
                        <option value="G03">G03 - Gastos en general</option>
                        <option value="I01">I01 - Construcciones</option>
                        <option value="I02">I02 - Mobiliario y equipo de oficina</option>
                        <option value="I04">I04 - Equipo de transporte</option>
                        <option value="D01">D01 - Honorarios médicos, dentales y hospitalarios</option>
                        <option value="D02">D02 - Gastos médicos por incapacidad</option>
                        <option value="D03">D03 - Gastos funerales</option>
                        <option value="D04">D04 - Donativos</option>
                        <option value="S01">S01 - Sin efectos fiscales</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingInvoice}
                    className="w-full py-4 text-background text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {submittingInvoice ? 'Timbrando CFDI ante el SAT...' : 'Generar Factura (CFDI 4.0)'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Step 3: Success Screen */}
          {step === 'success' && invoiceResult && (
            <div className="space-y-6 text-center">
              <span className="text-4xl block animate-bounce">🎉</span>
              <h3 className="text-base font-black uppercase text-white tracking-wide">
                ¡Facturación Exitosa!
              </h3>
              <p className="text-[9.5px] text-white/50 leading-relaxed max-w-sm mx-auto">
                Tu comprobante CFDI 4.0 ha sido timbrado correctamente ante el SAT. A continuación puedes descargar los archivos correspondientes.
              </p>

              {/* Fiscal Stamp Info */}
              <div className="bg-black/20 border border-white/5 rounded-3xl p-5 space-y-2 text-left font-mono text-[10px]">
                <p className="flex justify-between">
                  <span className="text-white/40">UUID SAT:</span>
                  <span className="text-white font-bold select-all">{invoiceResult.uuid_sat}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-white/40">RFC Receptor:</span>
                  <span className="text-white font-bold">{rfc.toUpperCase()}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-white/40">Razón Social:</span>
                  <span className="text-white font-bold uppercase">{razonSocial.toUpperCase()}</span>
                </p>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {invoiceResult.pdf_url && (
                  <a
                    href={invoiceResult.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Descargar PDF
                  </a>
                )}
                {invoiceResult.xml_url && (
                  <a
                    href={invoiceResult.xml_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Descargar XML
                  </a>
                )}
              </div>

              <button
                onClick={() => {
                  setStep('search');
                  setFolioInput('');
                  setSalesNote(null);
                  setInvoiceResult(null);
                }}
                className="w-full mt-4 py-4 text-background text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all font-bold shadow-lg cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                Facturar otra nota
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="max-w-2xl mx-auto w-full text-center mt-12">
        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
          {tenantConfig.footer_text || `© ${new Date().getFullYear()} ${tenantConfig.name}. Todos los derechos reservados.`}
        </p>
        <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-1">
          Tecnología de Facturación Provista por Néctar Labs
        </p>
      </footer>
    </div>
  );
}
