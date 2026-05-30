'use client';

import React, { useState } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';
import Toast from '@/components/ui/Toast';

// Mock FAQ database for Mexican SAT CFDI 4.0
const FAQS = [
  {
    question: '¿Qué diferencia hay entre la e.firma (FIEL) y los Sellos CSD?',
    answer: 'La e.firma sirve para identificarte ante el SAT y realizar trámites en su portal. Por seguridad regulatoria, el SAT prohíbe facturar directamente con ella. Para emitir CFDIs desde sistemas automáticos o de terceros, debes tramitar un Certificado de Sello Digital (CSD), el cual se compone de un archivo .cer, una llave .key y su propia contraseña.'
  },
  {
    question: '¿Cómo obtengo mis Sellos CSD de Facturación?',
    answer: 'Se obtienen de manera gratuita en el portal del SAT utilizando tu e.firma a través del programa oficial "Certifica". El trámite genera un par de archivos (.key y requerimiento) que posteriormente descargas en formato .cer firmado por la autoridad fiscal.'
  },
  {
    question: '¿Por qué mis sellos nuevos marcan error de LCO?',
    answer: 'Cuando el SAT emite o renueva un CSD, debe incluirlo en la Lista de Contribuyentes Obligados (LCO) para que los PACs (como Facturapi) puedan validarlo y timbrarlo. Este proceso de sincronización no depende de Néctar Labs y toma de 24 a 72 horas hábiles. Nuestro sistema capturará automáticamente esta latencia y reintentará el timbrado en segundo plano.'
  },
  {
    question: '¿Los sellos digitales CSD se guardan en sus servidores?',
    answer: 'No. Por estricta política de cumplimiento y seguridad, tus archivos criptográficos .cer, .key y contraseña nunca tocan ni se almacenan en la base de datos de Néctar Labs. La API los transmite mediante HTTPS directamente a los Hardware Security Modules (HSM) certificados del PAC para su resguardo legal.'
  },
  {
    question: '¿Cómo funciona la facturación integrada con Stripe?',
    answer: 'Cuando tu cliente compra en tu subdominio (por ejemplo, mediante checkout.session.completed), Stripe le pregunta si requiere factura. Si selecciona "Sí", el sistema solicita sus datos fiscales y timbra automáticamente el CFDI con IVA del 16% desglosado de manera transparente.'
  }
];

export default function InvoicingGuidePage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };
  
  // Interactive Simulator States
  const [currentSimStep, setCurrentSimStep] = useState(1);
  const [simRfc, setSimRfc] = useState('NLA260529AAA');
  const [simRazon, setSimRazon] = useState('NÉCTAR LABS SA DE CV');
  const [simRegimen, setSimRegimen] = useState('601');
  const [simCp, setSimCp] = useState('06000');
  
  const [simCerFile, setSimCerFile] = useState<string | null>(null);
  const [simKeyFile, setSimKeyFile] = useState<string | null>(null);
  const [simPassword, setSimPassword] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  
  const [lcoProgress, setLcoProgress] = useState(0);
  const [lcoStatus, setLcoStatus] = useState<'pending' | 'syncing' | 'active'>('pending');
  
  const [testClientRfc, setTestClientRfc] = useState('XAXX010101000');
  const [testClientName, setTestClientName] = useState('PÚBLICO EN GENERAL');
  const [testAmount, setTestAmount] = useState('1500.00');
  const [testDesc, setTestDesc] = useState('Licencia de Software SaaS Multi-tenant');
  const [stampingStatus, setStampingStatus] = useState<'idle' | 'stamping' | 'success' | 'error'>('idle');
  const [stampedInvoice, setStampedInvoice] = useState<{ uuid: string; id: string; total: string; xml: string } | null>(null);

  // Trigger simulated upload of CSD
  const handleSimulateUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simCerFile || !simKeyFile || !simPassword) return;
    setUploadStatus('uploading');
    setTimeout(() => {
      setUploadStatus('success');
      setTimeout(() => setCurrentSimStep(4), 1000);
    }, 1500);
  };

  // Simulate LCO 72h delay
  const handleSimulateLco = () => {
    setLcoStatus('syncing');
    const interval = setInterval(() => {
      setLcoProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setLcoStatus('active');
          setTimeout(() => setCurrentSimStep(5), 1000);
          return 100;
        }
        return prev + 20;
      });
    }, 300);
  };

  // Simulate test stamping
  const handleSimulateStamping = (e: React.FormEvent) => {
    e.preventDefault();

    // Edge case: Validate receptor RFC structure
    const rfcRegex = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i;
    if (!rfcRegex.test(testClientRfc)) {
      showToast("El RFC del Receptor no tiene el formato oficial del SAT (e.g., XAXX010101000).", "error");
      return;
    }

    setStampingStatus('stamping');
    setTimeout(() => {
      const mockUuid = '7e5d16cc-3db2-4d2c-8067-172ab67262ba';
      setStampedInvoice({
        id: 'inv_mock_9999',
        uuid: mockUuid,
        total: (parseFloat(testAmount) * 1.16).toFixed(2),
        xml: `<?xml version="1.0" encoding="utf-8"?>\n<cfdi:Comprobante Version="4.0" Serie="F" Folio="9999" fecha="2026-05-30T14:30:00" UUID="${mockUuid}" SubTotal="${parseFloat(testAmount).toFixed(2)}" Total="${(parseFloat(testAmount) * 1.16).toFixed(2)}">\n  <cfdi:Emisor Rfc="${simRfc}" Nombre="${simRazon}" RegimenFiscal="${simRegimen}"/>\n  <cfdi:Receptor Rfc="${testClientRfc}" Nombre="${testClientName}" RegimenFiscal="616" DomicilioFiscalReceptor="01000" UsoCFDI="G03"/>\n</cfdi:Comprobante>`
      });
      setStampingStatus('success');
    }, 1800);
  };

  const downloadXml = () => {
    if (!stampedInvoice) return;
    const element = document.createElement("a");
    const file = new Blob([stampedInvoice.xml], { type: 'text/xml' });
    element.href = URL.createObjectURL(file);
    element.download = `factura_${stampedInvoice.id}.xml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast("XML CFDI 4.0 de prueba descargado con éxito.", "success");
  };

  const downloadPdf = () => {
    if (!stampedInvoice) return;
    
    // Generate a simple valid PDF client-side with diagonal watermarks to prevent abuse
    const pdfData = `%PDF-1.4\n` +
      `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
      `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n` +
      `4 0 obj\n<< /Length 600 >>\nstream\n` +
      `BT\n/F1 36 Tf\n0.92 0.92 0.92 rg\n` +
      `0.707 0.707 -0.707 0.707 80 200 Tm\n(SIMULACION - NO VALIDO) Tj\n` +
      `0.707 0.707 -0.707 0.707 180 350 Tm\n(SIMULACION - NO VALIDO) Tj\n` +
      `0.707 0.707 -0.707 0.707 280 500 Tm\n(SIMULACION - NO VALIDO) Tj\n` +
      `ET\n` +
      `BT\n/F1 10 Tf\n0 0 0 rg\n` +
      `1 0 0 1 50 800 Tm\n(FACTURA ELECTRONICA CFDI 4.0 - SIMULADOR NECTAR LABS) Tj\n` +
      `0 -30 Td\n(UUID: ${stampedInvoice.uuid}) Tj\n` +
      `0 -20 Td\n(Emisor: ${simRazon}) Tj\n` +
      `0 -15 Td\n(RFC Emisor: ${simRfc} | CP: ${simCp} | Regimen: ${simRegimen}) Tj\n` +
      `0 -20 Td\n(Receptor: ${testClientName}) Tj\n` +
      `0 -15 Td\n(RFC Receptor: ${testClientRfc}) Tj\n` +
      `0 -30 Td\n(Concepto: ${testDesc}) Tj\n` +
      `0 -20 Td\n(Subtotal: $${parseFloat(testAmount).toFixed(2)} MXN) Tj\n` +
      `0 -15 Td\n(IVA 16%: $${(parseFloat(testAmount) * 0.16).toFixed(2)} MXN) Tj\n` +
      `0 -20 Td\n(TOTAL FACTURADO: $${stampedInvoice.total} MXN) Tj\n` +
      `0 -40 Td\n(Representacion impresa simulada sin valor fiscal y con fines didacticos.) Tj\n` +
      `ET\nendstream\nendobj\n` +
      `xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000215 00000 n\n` +
      `trailer\n<< /Size 5 /Root 1 0 R >>\n` +
      `startxref\n415\n%%EOF`;
      
    const element = document.createElement("a");
    const file = new Blob([pdfData], { type: 'application/pdf' });
    element.href = URL.createObjectURL(file);
    element.download = `factura_${stampedInvoice.id}_simulada.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast("Representación impresa PDF con marca de agua descargada.", "success");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <DashboardSidebar />

      {/* Main Container */}
      <main className="flex-1 p-8 md:p-12 lg:p-16 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Header Block */}
        <header className="mb-12 relative overflow-hidden p-8 rounded-[2rem] border border-card-border/60 bg-card-bg shadow-xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[120px] opacity-10 bg-nectar-gold pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-nectar-gold/10 border border-nectar-gold/20 flex items-center justify-center text-3xl shrink-0">
              🧾
            </div>
            <div className="space-y-1">
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                MÓDULO ADQUIRIDO (ADD-ON)
              </span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2 text-foreground">
                Facturación SAT Marca Blanca
              </h1>
              <p className="text-xs text-muted max-w-2xl mt-1 leading-relaxed">
                Esta guía detalla el flujo de onboarding para que tus clientes del subdominio puedan dar de alta sus sellos digitales, configurar su régimen ante el SAT y emitir CFDIs de forma automática o manual.
              </p>
            </div>
          </div>
        </header>

        {/* Grid layout for Onboarding Steps & Interactive Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
          
          {/* Timeline Onboarding (Left Column - 5 spans) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card-bg border border-card-border rounded-[2rem] p-6 shadow-lg space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-nectar-gold">Ruta del Cliente (Onboarding)</h3>
                <p className="text-[8px] text-muted uppercase tracking-widest mt-1">Pasos requeridos para timbrar CFDI 4.0</p>
              </div>

              {/* Steps timeline vertical */}
              <div className="relative border-l border-card-border/60 ml-4 pl-6 space-y-8">
                
                {/* Step 1 */}
                <div className="relative">
                  <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                    currentSimStep >= 1 ? 'bg-nectar-gold text-background border-nectar-gold' : 'bg-background text-muted border-card-border'
                  }`}>
                    1
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wide text-foreground">Activar Add-on de Facturación</h4>
                    <p className="text-[10px] text-muted leading-relaxed">
                      El administrador (tú) o el cliente adquiere el módulo `mexico-invoicing` en la tienda de addons. Esto habilita las vistas en su subdominio.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                    currentSimStep >= 2 ? 'bg-nectar-gold text-background border-nectar-gold' : 'bg-background text-muted border-card-border'
                  }`}>
                    2
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wide text-foreground">Perfil Fiscal Emisor</h4>
                    <p className="text-[10px] text-muted leading-relaxed">
                      El inquilino completa sus datos fiscales oficiales: RFC, Razón Social, Régimen de tributación del SAT y Código Postal de domicilio fiscal.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                    currentSimStep >= 3 ? 'bg-nectar-gold text-background border-nectar-gold' : 'bg-background text-muted border-card-border'
                  }`}>
                    3
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wide text-foreground">Carga Segura de CSD</h4>
                    <p className="text-[10px] text-muted leading-relaxed">
                      Se suben los certificados .cer y .key. Se envían mediante HTTPS directo a los HSMs del PAC sin guardarse localmente en la base de datos.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative">
                  <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                    currentSimStep >= 4 ? 'bg-nectar-gold text-background border-nectar-gold' : 'bg-background text-muted border-card-border'
                  }`}>
                    4
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wide text-foreground">Sincronización LCO (SAT)</h4>
                    <p className="text-[10px] text-muted leading-relaxed">
                      Esperar de 24 a 72 horas hábiles a que el SAT dé de alta el certificado en la lista de contribuyentes oficiales obligados a facturar.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="relative">
                  <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                    currentSimStep >= 5 ? 'bg-nectar-gold text-background border-nectar-gold' : 'bg-background text-muted border-card-border'
                  }`}>
                    5
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wide text-foreground">Consola de Facturación Activa</h4>
                    <p className="text-[10px] text-muted leading-relaxed">
                      El módulo queda 100% activo. Se pueden emitir comprobantes de cobro automatizados a clientes de compras y realizar timbrados manuales.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Interactive Simulator Panel (Right Column - 7 spans) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-card-bg border border-card-border rounded-[2rem] p-8 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[500px]">
              
              {/* Simulator Header */}
              <div className="border-b border-card-border pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Consola de Simulación Interactiva</h3>
                  <p className="text-[8px] text-nectar-gold uppercase tracking-widest mt-1">Prueba el flujo del cliente en tiempo real</p>
                </div>
                <span className="px-2.5 py-0.5 bg-nectar-gold/5 text-nectar-gold border border-nectar-gold/20 text-[7px] font-mono font-black uppercase rounded-full tracking-widest">
                  Paso {currentSimStep} de 5
                </span>
              </div>

              {/* Step 1: Active Module */}
              {currentSimStep === 1 && (
                <div className="py-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-2xl">🐝</span>
                    <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Paso 1: Módulo mexico-invoicing Habilitado</h4>
                    <p className="text-xs text-muted leading-relaxed">
                      Como primer paso, el cliente adquiere el Add-on desde la tienda de Néctar Labs. Para fines de simulación, este Add-on se encuentra actualmente **ACTIVO** para tu cuenta. Esto desbloquea el formulario de configuración en el subdominio.
                    </p>
                  </div>
                  <div className="pt-6 flex justify-end">
                    <button
                      onClick={() => setCurrentSimStep(2)}
                      className="px-6 py-3 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-102 transition-all cursor-pointer shadow-lg shadow-nectar-gold/20"
                    >
                      Configurar Perfil Fiscal →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Fiscal Profile Form */}
              {currentSimStep === 2 && (
                <div className="py-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-xl">📝</span>
                      <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Paso 2: Datos Oficiales del Emisor</h4>
                      <p className="text-[10px] text-muted leading-relaxed">
                        Ingresa los datos fiscales simulados del negocio. El RFC debe medir entre 12 y 13 caracteres.
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">Razón Social</label>
                        <input
                          type="text"
                          value={simRazon}
                          onChange={(e) => setSimRazon(e.target.value.toUpperCase())}
                          className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">RFC Emisor</label>
                          <input
                            type="text"
                            maxLength={13}
                            value={simRfc}
                            onChange={(e) => setSimRfc(e.target.value.toUpperCase())}
                            className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">Código Postal</label>
                          <input
                            type="text"
                            maxLength={5}
                            value={simCp}
                            onChange={(e) => setSimCp(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">Régimen Fiscal (SAT)</label>
                        <select
                          value={simRegimen}
                          onChange={(e) => setSimRegimen(e.target.value)}
                          className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all"
                        >
                          <option value="601">601 - General de Ley Personas Morales</option>
                          <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                          <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-between gap-4">
                    <button
                      onClick={() => setCurrentSimStep(1)}
                      className="px-4 py-3 border border-card-border hover:bg-foreground/5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={() => {
                        if (simRfc.length < 12 || simRfc.length > 13) {
                          alert('El RFC debe medir 12 o 13 caracteres.');
                          return;
                        }
                        setCurrentSimStep(3);
                      }}
                      className="px-6 py-3 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-102 transition-all cursor-pointer shadow-lg shadow-nectar-gold/20"
                    >
                      Guardar y Subir Sellos →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: CSD Upload Form */}
              {currentSimStep === 3 && (
                <div className="py-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-xl">🔑</span>
                      <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Paso 3: Cargar Sellos CSD del SAT</h4>
                      <p className="text-[10px] text-muted leading-relaxed">
                        Sube archivos simulados .cer y .key. En producción, el backend los valida contra el SAT y los resguarda de forma segura en el PAC.
                      </p>
                    </div>

                    <form onSubmit={handleSimulateUpload} className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">Archivo Certificado (.cer)</label>
                          <div className="border border-dashed border-card-border/80 rounded-xl p-3 bg-background flex flex-col items-center justify-center cursor-pointer text-center relative hover:border-nectar-gold/40 transition-colors">
                            {simCerFile ? (
                              <span className="text-[9px] text-green-400 font-mono">✓ {simCerFile}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSimCerFile('CSD_EMISOR.cer')}
                                className="text-[9px] text-muted hover:text-nectar-gold uppercase tracking-wider font-black bg-transparent border-0 cursor-pointer"
                              >
                                Seleccionar .cer
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">Llave Privada (.key)</label>
                          <div className="border border-dashed border-card-border/80 rounded-xl p-3 bg-background flex flex-col items-center justify-center cursor-pointer text-center relative hover:border-nectar-gold/40 transition-colors">
                            {simKeyFile ? (
                              <span className="text-[9px] text-green-400 font-mono">✓ {simKeyFile}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSimKeyFile('CSD_EMISOR.key')}
                                className="text-[9px] text-muted hover:text-nectar-gold uppercase tracking-wider font-black bg-transparent border-0 cursor-pointer"
                              >
                                Seleccionar .key
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">Contraseña de la Llave Privada</label>
                        <input
                          type="password"
                          placeholder="Introduce tu contraseña"
                          required
                          value={simPassword}
                          onChange={(e) => setSimPassword(e.target.value)}
                          className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all"
                        />
                      </div>

                      {uploadStatus === 'uploading' && (
                        <div className="p-3 bg-nectar-gold/5 border border-nectar-gold/10 text-nectar-gold text-[9px] uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-t-nectar-gold border-nectar-gold/10 animate-spin"></span>
                          Estableciendo canal SSL y cargando sellos directamente al PAC...
                        </div>
                      )}
                      
                      {uploadStatus === 'success' && (
                        <div className="p-3 bg-green-500/10 border border-green-500/25 text-green-400 text-[9px] uppercase tracking-wider font-bold rounded-xl text-center">
                          ✓ Sellos validados y almacenados en Facturapi con éxito.
                        </div>
                      )}
                    </form>
                  </div>

                  <div className="pt-6 flex justify-between gap-4">
                    <button
                      onClick={() => setCurrentSimStep(2)}
                      disabled={uploadStatus === 'uploading'}
                      className="px-4 py-3 border border-card-border hover:bg-foreground/5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-40"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      onClick={handleSimulateUpload}
                      disabled={!simCerFile || !simKeyFile || !simPassword || uploadStatus !== 'idle'}
                      className="px-6 py-3 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-102 transition-all cursor-pointer shadow-lg shadow-nectar-gold/20 disabled:opacity-40 disabled:scale-100"
                    >
                      Validar y Cargar al PAC
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: LCO Sync delay simulator */}
              {currentSimStep === 4 && (
                <div className="py-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-xl">⏳</span>
                      <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Paso 4: Latencia LCO del SAT</h4>
                      <p className="text-[10px] text-muted leading-relaxed">
                        El SAT puede tardar de 24 a 72 horas en indexar sellos nuevos. Si el cliente intenta facturar inmediatamente, el PAC retornará una excepción del tipo **`LCOSyncError`** y pasará la factura a estado `LCO_SYNC_PENDING` (Pendiente).
                      </p>
                    </div>

                    <div className="border border-card-border bg-background rounded-xl p-4 space-y-3">
                      <div className="flex justify-between text-[8px] font-black uppercase tracking-wider">
                        <span className="text-muted">Estado del CSD en LCO del SAT</span>
                        <span className={`${lcoStatus === 'active' ? 'text-green-400' : 'text-amber-400'}`}>
                          {lcoStatus === 'pending' ? 'INACTIVO (LCO Sync Pendiente)' : lcoStatus === 'syncing' ? 'SINCRONIZANDO...' : 'ACTIVO Y LISTO'}
                        </span>
                      </div>
                      
                      <div className="w-full bg-card-border/50 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${lcoStatus === 'active' ? 'bg-green-400' : 'bg-nectar-gold'}`}
                          style={{ width: `${lcoProgress}%` }}
                        ></div>
                      </div>
                      
                      <p className="text-[8px] text-muted/60 leading-relaxed uppercase">
                        El SaaS ejecutará tareas automáticas (cron) para reintentar el timbrado de forma transparente tan pronto como el SAT actualice su lista LCO.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-between gap-4">
                    <button
                      onClick={() => setCurrentSimStep(3)}
                      disabled={lcoStatus === 'syncing'}
                      className="px-4 py-3 border border-card-border hover:bg-foreground/5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-40"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleSimulateLco}
                      disabled={lcoStatus !== 'pending'}
                      className="px-6 py-3 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-102 transition-all cursor-pointer shadow-lg shadow-nectar-gold/20 disabled:opacity-40"
                    >
                      {lcoStatus === 'pending' ? 'Simular 72 horas (Sync SAT)' : lcoStatus === 'syncing' ? 'Sincronizando...' : 'Completado ✓'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Test Stamping Sandbox Console */}
              {currentSimStep === 5 && (
                <div className="py-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-xl">🚀</span>
                      <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Paso 5: Consola Sandbox de Timbrado</h4>
                      <p className="text-[10px] text-muted leading-relaxed">
                        ¡Todo listo! Simula la emisión de una factura de tu cliente (Emisor: **{simRazon}**) a un cliente final.
                      </p>
                    </div>

                    {!stampedInvoice ? (
                      <form onSubmit={handleSimulateStamping} className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">RFC del Cliente</label>
                            <input
                              type="text"
                              required
                              value={testClientRfc}
                              onChange={(e) => setTestClientRfc(e.target.value.toUpperCase())}
                              className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">Monto Base (MXN)</label>
                            <input
                              type="number"
                              required
                              value={testAmount}
                              onChange={(e) => setTestAmount(e.target.value)}
                              className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">Razón Social Cliente</label>
                          <input
                            type="text"
                            required
                            value={testClientName}
                            onChange={(e) => setTestClientName(e.target.value.toUpperCase())}
                            className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-wider font-black text-foreground/50">Concepto de Facturación</label>
                          <input
                            type="text"
                            required
                            value={testDesc}
                            onChange={(e) => setTestDesc(e.target.value)}
                            className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all"
                          />
                        </div>

                        {stampingStatus === 'stamping' && (
                          <div className="p-3 bg-nectar-gold/5 border border-nectar-gold/10 text-nectar-gold text-[9px] uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-t-nectar-gold border-nectar-gold/10 animate-spin"></span>
                            Firmando XML y solicitando timbrado fiscal ante el SAT...
                          </div>
                        )}
                      </form>
                    ) : (
                      <div className="border border-card-border bg-background rounded-xl p-4 space-y-4 text-left animate-in fade-in duration-300">
                        <div className="flex justify-between items-start border-b border-card-border/60 pb-2">
                          <div>
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[6.5px] font-black uppercase rounded-full tracking-widest">
                              TIMBRADA CON ÉXITO
                            </span>
                            <h5 className="text-[10px] font-black uppercase tracking-wide text-foreground mt-1.5">CFDI Emitido por {simRazon}</h5>
                            <p className="text-[7.5px] text-muted font-mono mt-0.5">UUID SAT: {stampedInvoice.uuid}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[7.5px] text-muted block uppercase font-bold">Total Facturado</span>
                            <span className="text-xs font-black text-foreground font-mono">${stampedInvoice.total} MXN</span>
                          </div>
                        </div>

                        {/* XML Code preview */}
                        <div className="space-y-1">
                          <span className="text-[7.5px] text-muted uppercase font-bold tracking-widest block">Vista de Comprobante CFDI XML</span>
                          <pre className="text-[6.5px] text-green-400 bg-[#020403] border border-card-border rounded-lg p-2.5 overflow-x-auto font-mono max-h-[100px] leading-tight">
                            {stampedInvoice.xml}
                          </pre>
                        </div>

                        {/* PDF / XML Mock Downloads */}
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            onClick={downloadXml}
                            className="px-2.5 py-1.5 bg-foreground/5 hover:bg-foreground/10 border border-card-border text-[7.5px] font-black uppercase tracking-widest rounded transition-all text-foreground hover:text-nectar-gold active:scale-95"
                          >
                            Descargar XML
                          </button>
                          <button
                            onClick={downloadPdf}
                            className="px-2.5 py-1.5 bg-foreground/5 hover:bg-foreground/10 border border-card-border text-[7.5px] font-black uppercase tracking-widest rounded transition-all text-foreground hover:text-nectar-gold active:scale-95"
                          >
                            Descargar PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 flex justify-between gap-4">
                    <button
                      onClick={() => {
                        setStampedInvoice(null);
                        setStampingStatus('idle');
                        setCurrentSimStep(4);
                      }}
                      disabled={stampingStatus === 'stamping'}
                      className="px-4 py-3 border border-card-border hover:bg-foreground/5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-40"
                    >
                      Atrás
                    </button>
                    {!stampedInvoice ? (
                      <button
                        type="submit"
                        onClick={handleSimulateStamping}
                        disabled={stampingStatus === 'stamping'}
                        className="px-6 py-3 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-102 transition-all cursor-pointer shadow-lg shadow-nectar-gold/20 disabled:opacity-40"
                      >
                        Timbrar Factura de Prueba
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setStampedInvoice(null);
                          setStampingStatus('idle');
                          setCurrentSimStep(2);
                        }}
                        className="px-6 py-3 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-102 transition-all cursor-pointer shadow-lg"
                      >
                        Reiniciar Simulación ↺
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* FAQs Accordion Block (Under timeline) */}
        <section className="bg-card-bg border border-card-border rounded-[2rem] p-8 shadow-xl">
          <div className="border-b border-card-border pb-4 mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-nectar-gold">Preguntas Frecuentes de Integración SAT</h3>
            <p className="text-[8px] text-muted uppercase tracking-widest mt-1">Conoce a fondo las políticas y reglas del SAT</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={`faq-${idx}`}
                  className="border border-card-border rounded-2xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex justify-between items-center bg-foreground/[0.01] hover:bg-foreground/[0.03] transition-colors"
                  >
                    <span className="text-xs font-bold text-foreground pr-4">{faq.question}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className={`w-3.5 h-3.5 text-muted transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-90 text-nectar-gold' : ''}`}
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-6 py-4 bg-background/40 border-t border-card-border text-[10.5px] text-muted leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>
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
