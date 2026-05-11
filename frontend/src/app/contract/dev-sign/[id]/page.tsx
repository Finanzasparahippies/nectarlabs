"use client";

import { useState, useRef, useEffect } from "react";
import SignaturePad from "react-signature-canvas";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function DevSignPage() {
  const { id } = useParams();
  const router = useRouter();
  const sigPad = useRef<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchContract() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contracts/${id}/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("No tienes permiso o el contrato no existe");
        const data = await res.json();
        setContract(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchContract();
  }, [id]);

  const handleSign = async () => {
    if (!sigPad.current || sigPad.current.isEmpty()) return alert("Por favor firma antes de continuar");
    
    setSaving(true);
    const signatureBase64 = sigPad.current.getTrimmedCanvas().toDataURL("image/png");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contracts/${id}/dev_sign/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ signature: signatureBase64 })
      });

      if (!res.ok) throw new Error("Error al procesar la firma");
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err: any) {
      setError(err.message);
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
      <h2 className="text-4xl font-black text-foreground mb-4">Contrato Cerrado</h2>
      <p className="text-muted font-bold uppercase tracking-widest text-[10px]">Redirigiendo a tu Centro de Control...</p>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-nectar-gold font-black text-[10px] uppercase tracking-widest animate-pulse">Sincronizando Contrato...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6 bg-background p-6 text-center">
      <div className="text-red-500 font-black text-xs uppercase tracking-widest bg-red-500/10 px-6 py-3 rounded-xl border border-red-500/20 max-w-md w-full">
        {error}
      </div>
      <Link href="/login" className="text-[10px] font-black uppercase tracking-[0.3em] text-nectar-gold hover:underline">Reintentar con nueva sesión</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8 md:p-24 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-nectar-forest dark:text-nectar-cream">
            Cierre de <span className="text-nectar-gold italic">Contrato</span>
          </h1>
          <p className="text-muted text-sm uppercase tracking-widest font-bold">Néctar Labs • Socio Tecnológico</p>
        </div>

        {/* Resumen del Contrato */}
        {contract && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card-bg p-8 rounded-[3rem] border border-card-border shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-nectar-gold/5 rounded-full blur-3xl"></div>
            <div className="space-y-6 border-r border-card-border/50 pr-8">
              <h3 className="text-nectar-gold font-black uppercase text-[10px] tracking-[0.3em]">Detalles del Proyecto</h3>
              <div className="space-y-2">
                <p className="text-[9px] text-muted uppercase font-black tracking-widest">Cliente</p>
                <p className="text-xl font-black text-foreground">{contract.full_name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] text-muted uppercase font-black tracking-widest">Plan Seleccionado</p>
                <p className="text-xl font-black text-nectar-gold">{contract.plan_name || 'Partner Tecnológico'}</p>
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-nectar-gold font-black uppercase text-[10px] tracking-[0.3em]">Idea de Negocio</h3>
              <p className="text-foreground/80 text-sm leading-relaxed italic border-l-2 border-nectar-gold pl-4 py-2 bg-background/50 rounded-r-2xl">
                "{contract.project_idea}"
              </p>
            </div>
          </div>
        )}

        {/* Pad de Firma */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-black text-foreground">Firma del Desarrollador</h2>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-2">Dibuja tu firma para formalizar el acuerdo</p>
          </div>
          
          <div className="bg-white rounded-[2rem] border-2 border-nectar-forest/10 overflow-hidden shadow-2xl h-64 md:h-80 relative group">
            <SignaturePad
              ref={sigPad}
              canvasProps={{ className: "w-full h-full cursor-crosshair" }}
              penColor="#1E3A2F"
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
              className={`px-12 py-4 bg-nectar-forest text-nectar-cream rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-nectar-gold hover:scale-105 active:scale-95 transition-all ${saving ? 'opacity-50 cursor-wait' : ''}`}
            >
              {saving ? "Sellando Contrato..." : "Firmar y Activar Proyecto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
