"use client";

import { useState, useRef, useEffect } from "react";
import SignaturePad from "react-signature-canvas";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetcher } from "@/lib/api";

export default function ClientSignPage() {
  const { id } = useParams();
  const router = useRouter();
  const sigPad = useRef<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Billing states
  const [fullName, setFullName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    async function fetchContract() {
      try {
        const data = await fetcher(`/contracts/${id}/`);
        setContract(data);
        if (data) {
          setFullName(data.full_name || "");
          setTaxId(data.tax_id || "");
          setAddress(data.address || "");
        }
      } catch (err: any) {
        setError(err.message || "No tienes permiso o el contrato no existe");
      } finally {
        setLoading(false);
      }
    }
    fetchContract();
  }, [id]);

  const handleSign = async () => {
    if (!fullName.trim()) {
      return alert("El Nombre Completo o Razón Social es requerido para el contrato.");
    }
    if (!taxId.trim()) {
      return alert("El RFC o Tax ID es requerido para la facturación.");
    }
    if (!address.trim()) {
      return alert("La Dirección Fiscal es requerida.");
    }
    if (!sigPad.current || sigPad.current.isEmpty()) {
      return alert("Por favor, dibuja tu firma antes de continuar.");
    }
    
    setSaving(true);
    const signatureBase64 = sigPad.current.getTrimmedCanvas().toDataURL("image/png");

    try {
      await fetcher(`/contracts/${id}/client-sign/`, {
        method: "POST",
        body: JSON.stringify({
          signature: signatureBase64,
          full_name: fullName,
          tax_id: taxId,
          address: address,
        })
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Error al procesar tu firma");
      setSaving(false);
    }
  };

  if (success) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-24 h-24 bg-nectar-gold rounded-full flex items-center justify-center mb-8 animate-bounce shadow-2xl shadow-nectar-gold/50">
        <svg className="w-12 h-12 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-4xl font-black text-foreground mb-4">Contrato Firmado con Éxito</h2>
      <p className="text-muted font-bold uppercase tracking-widest text-[10px]">Guardando propuesta y notificando a ingeniería...</p>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-nectar-gold font-black text-[10px] uppercase tracking-widest animate-pulse">Generando Documento de Contrato...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6 bg-background p-6 text-center">
      <div className="text-red-500 font-black text-xs uppercase tracking-widest bg-red-500/10 px-6 py-3 rounded-xl border border-red-500/20 max-w-md w-full">
        {error}
      </div>
      <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-[0.3em] text-nectar-gold hover:underline">Volver al Centro de Control</Link>
    </div>
  );

  const quote = contract?.project_quote;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-16 flex flex-col items-center selection:bg-nectar-gold selection:text-background">
      <div className="w-full max-w-4xl space-y-12">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
            ← Cancelar y Volver
          </Link>
          <span className="text-[9px] font-mono text-nectar-gold uppercase tracking-wider bg-nectar-gold/10 border border-nectar-gold/20 px-3 py-1 rounded-full">
            Propuesta de Proyecto Custom
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
            Firma tu <span className="text-nectar-gold italic">Propuesta Comercial</span>
          </h1>
          <p className="text-muted text-xs uppercase tracking-[0.2em] font-bold">Néctar Labs • Contrato de Ingeniería</p>
        </div>

        {/* Contract Viewer / Quote Summary */}
        <div className="bg-card-bg p-8 md:p-12 rounded-[2.5rem] border border-card-border shadow-2xl relative overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-nectar-gold mb-3">1. Proyecto Cotizado</h3>
            {quote ? (
              <div className="space-y-4">
                <div className="bg-background/40 border border-card-border/60 p-6 rounded-2xl">
                  <h4 className="text-2xl font-black text-white">{quote.project_name}</h4>
                  <p className="text-xs text-foreground/60 mt-1 uppercase tracking-wider">Duración de desarrollo: <strong>{quote.estimated_delivery_weeks} semanas</strong></p>
                  {quote.description && (
                    <p className="text-xs text-foreground/80 mt-4 leading-relaxed bg-background/50 p-4 rounded-xl border border-card-border/30 italic">
                      "{quote.description}"
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <h5 className="text-[10px] font-black uppercase tracking-widest opacity-40">Módulos y Funcionalidades Incluidas</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quote.modules && quote.modules.map((mod: any, index: number) => (
                      <div key={index} className="p-4 rounded-xl bg-background/50 border border-card-border/40 flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-black text-white block">{mod.name}</span>
                          <span className="text-[10px] text-foreground/60 leading-normal block mt-1">{mod.description || "Alcance estándar del módulo."}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-nectar-gold mt-3 block">
                          ${parseFloat(mod.price || "0").toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-card-border/40 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-wider text-foreground/50">Costo Total de Inversión</span>
                  <span className="text-3xl font-black text-nectar-gold font-mono">
                    ${parseFloat(quote.total_price || "0").toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-nectar-gold/5 border border-nectar-gold/15 text-[10px] leading-relaxed text-foreground/70 uppercase">
                  ℹ️ <strong>Esquema de Abono:</strong> 50% de anticipo obligatorio (${(parseFloat(quote.total_price || "0") / 2).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN) para iniciar ingeniería y 50% de liquidación (${(parseFloat(quote.total_price || "0") / 2).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN) contra entrega.
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-background/30 border border-card-border/50">
                <p className="text-xs font-bold">{contract?.plan_name || "Partner Tecnológico de Ingeniería"}</p>
                <p className="text-[10px] text-foreground/60 mt-1">Idea de Proyecto: {contract?.project_idea}</p>
              </div>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-nectar-gold">2. Términos y Cláusulas Clave</h3>
            <div className="text-[10px] text-foreground/60 leading-relaxed space-y-2 uppercase tracking-wide">
              <p><strong>Cláusula Primera:</strong> EL DESARROLLADOR se compromete a entregar los módulos listados en la Sección 1 en el plazo estipulado.</p>
              <p><strong>Cláusula Segunda:</strong> EL CLIENTE autoriza a EL DESARROLLADOR a comenzar el aprovisionamiento de servidores una vez recibido el pago del primer abono (50% de anticipo).</p>
              <p><strong>Cláusula Tercera:</strong> El código fuente y los activos digitales del proyecto serán propiedad intelectual del cliente una vez liquidada la totalidad del proyecto.</p>
            </div>
          </div>
        </div>

        {/* Signature & Billing Info Form */}
        <div className="bg-card-bg p-8 md:p-12 rounded-[2.5rem] border border-card-border shadow-2xl relative overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-nectar-gold/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-nectar-gold mb-6">3. Información Fiscal y Firma Digital</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Nombre Completo o Razón Social</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ej. Juan Pérez o Néctar Labs S.A. de C.V."
                  className="w-full bg-background/50 border border-card-border rounded-xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-xs font-bold text-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">RFC / ID Fiscal (Tax ID)</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                  placeholder="ej. VICJ911227KY2"
                  className="w-full bg-background/50 border border-card-border rounded-xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-xs font-bold text-foreground"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Dirección Fiscal Completa</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, Número, Colonia, C.P., Ciudad, Estado"
                  className="w-full bg-background/50 border border-card-border rounded-xl p-4 focus:outline-none focus:border-nectar-gold transition-all text-xs font-bold text-foreground"
                />
              </div>
            </div>

            {/* Signature Canvas */}
            <div className="space-y-4">
              <div className="text-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Traza tu Firma Digital en el recuadro</span>
              </div>
              <div className="bg-white rounded-[2rem] border-2 border-nectar-gold/10 overflow-hidden shadow-2xl h-64 relative group">
                <SignaturePad
                  ref={sigPad}
                  canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                  penColor="#D4AF37"
                />
                <div className="absolute inset-0 pointer-events-none border-4 border-transparent group-hover:border-nectar-gold/10 transition-colors rounded-[2rem]"></div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 justify-center pt-4">
                <button
                  onClick={() => sigPad.current?.clear()}
                  className="px-8 py-4 border border-card-border rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all active:scale-95"
                >
                  Limpiar Lienzo
                </button>
                <button
                  onClick={handleSign}
                  disabled={saving}
                  className={`px-12 py-4 bg-nectar-gold text-background rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all font-bold ${saving ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {saving ? "Registrando tu Firma..." : "Firmar Contrato e Iniciar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
