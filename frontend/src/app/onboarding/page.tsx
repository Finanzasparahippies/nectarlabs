'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { fetcher } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface Plan {
  id: number;
  name: string;
  price: string;
  hours: number;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sigCanvas = useRef<SignatureCanvas>(null);

  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [formData, setFormData] = useState({
    plan: '',
    full_name: '',
    tax_id: '',
    address: '',
    project_idea: '',
    brand_design_tier: 'NONE',
    brand_design_price: 0,
    payment_day: 'MONTHLY_1ST',
  });

  const selectedPlanObj = plans.find(p => p.id.toString() === formData.plan.toString());

  useEffect(() => {
    setIsMounted(true);
    const planFromUrl = searchParams.get('plan');
    if (planFromUrl) {
      setFormData(prev => ({ ...prev, plan: planFromUrl }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isMounted) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/onboarding');
      return;
    }

    fetcher('/plans/')
      .then(data => {
        setPlans(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching plans:", err);
        setLoading(false);
      });
  }, [isMounted, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSubmit = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert("Por favor, firma el contrato antes de continuar.");
      return;
    }

    setSubmitting(true);
    const signatureBase64 = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');

    try {
      await fetcher('/contracts/', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          signature_base64: signatureBase64,
        }),
      });
      setStep(4);
    } catch (err) {
      console.error("Error signing contract:", err);
      alert("Hubo un error al procesar tu contrato. Verifica tu sesión y conexión.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isMounted) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">CARGANDO ECOSISTEMA...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-nectar-gold">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-48 pb-12">
        <Link href="/" className="inline-block mb-12 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">
          ← Cancelar Proceso
        </Link>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-nectar-gold' : 'bg-card-border'}`}></div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-5xl font-black tracking-tighter">Inicia tu Legado</h1>
            <p className="text-xl opacity-60">Selecciona tu plan de inversión tecnológica y cuéntanos sobre tu visión.</p>

            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Plan Seleccionado</label>
                <select
                  name="plan"
                  value={formData.plan}
                  onChange={handleInputChange}
                  className="w-full bg-card-bg border-2 border-card-border rounded-2xl p-6 font-bold focus:border-nectar-gold outline-none appearance-none"
                >
                  <option value="">Selecciona un plan...</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - ${parseFloat(p.price).toLocaleString()} MXN</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Esquema y Día de Pago Preferido</label>
                <select
                  name="payment_day"
                  value={formData.payment_day}
                  onChange={handleInputChange}
                  className="w-full bg-card-bg border-2 border-card-border rounded-2xl p-6 font-bold focus:border-nectar-gold outline-none appearance-none"
                >
                  <option value="MONTHLY_1ST">Mensual - Día 1ero de cada mes</option>
                  <option value="FORTNIGHTLY_1ST_15TH">Quincenal - Días 1 y 15 de cada mes</option>
                  <option value="WEEKLY_MONDAY">Semanal - Lunes de cada semana</option>
                </select>
                <p className="text-[9px] text-foreground/40 mt-1 uppercase font-bold">Elige el esquema de abonos periódicos que mejor se adapte al flujo de tu negocio.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Idea del Proyecto (Un párrafo)</label>
                <textarea
                  name="project_idea"
                  placeholder="Describe la esencia de tu proyecto..."
                  rows={4}
                  value={formData.project_idea}
                  onChange={handleInputChange}
                  className="w-full bg-card-bg border-2 border-card-border rounded-2xl p-6 font-bold focus:border-nectar-gold outline-none"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">¿Requieres Diseño de Marca? (Opcional)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'NONE', name: 'Sin Diseño', price: 0, display: '' },
                    { id: 'WEEKLY', name: 'Semanal', price: 500 * 4, display: '$500 / sem' },
                    { id: 'BIWEEKLY', name: 'Quincenal', price: 900 * 2, display: '$900 / qna' },
                    { id: 'MONTHLY', name: 'Mensual', price: 1600, display: '$1,600 / mes' },
                  ].map(tier => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, brand_design_tier: tier.id, brand_design_price: tier.price }))}
                      className={`p-4 rounded-xl border-2 transition-all text-center text-xs font-bold ${formData.brand_design_tier === tier.id ? 'border-nectar-gold bg-nectar-gold/5' : 'border-card-border hover:border-nectar-gold/30'}`}
                    >
                      {tier.name}
                      {tier.price > 0 && <div className="text-nectar-gold mt-1">{tier.display}</div>}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!formData.plan || !formData.project_idea}
                className="w-full py-6 bg-foreground text-background font-black uppercase tracking-widest rounded-2xl hover:bg-nectar-gold transition-colors disabled:opacity-20"
              >
                Continuar a Datos Legales
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-5xl font-black tracking-tighter">Datos de Facturación</h1>
            <p className="text-xl opacity-60">Esta información se utilizará para generar el contrato legal.</p>

            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nombre Completo o Razón Social</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full bg-card-bg border-2 border-card-border rounded-2xl p-6 font-bold focus:border-nectar-gold outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">RFC</label>
                  <input
                    type="text"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                    className="w-full bg-card-bg border-2 border-card-border rounded-2xl p-6 font-bold focus:border-nectar-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Dirección Fiscal</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full bg-card-bg border-2 border-card-border rounded-2xl p-6 font-bold focus:border-nectar-gold outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-6 border-2 border-card-border font-black uppercase tracking-widest rounded-2xl hover:bg-card-bg"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!formData.full_name || !formData.tax_id || !formData.address}
                  className="flex-[2] py-6 bg-foreground text-background font-black uppercase tracking-widest rounded-2xl hover:bg-nectar-gold transition-colors disabled:opacity-20"
                >
                  Revisar y Firmar
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-5xl font-black tracking-tighter">Firma Digital</h1>
            <p className="text-xl opacity-60">Revisa cuidadosamente los términos del contrato antes de firmar.</p>

            <div className="bg-card-bg border-2 border-card-border rounded-3xl overflow-hidden flex flex-col max-h-[60vh]">
              {/* Contract Preview Document */}
              <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1 bg-background/50">
                <header className="mb-12 border-b border-card-border pb-8">
                  <h2 className="text-2xl font-black tracking-tighter mb-2">CONTRATO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS</h2>
                  <p className="text-nectar-gold font-bold uppercase tracking-widest text-[10px]">Modalidad: Partner Tecnológico</p>
                </header>

                <div className="prose prose-invert max-w-none space-y-10 text-sm leading-relaxed opacity-80">
                  <section>
                    <p>Este contrato se celebra entre <strong>Néctar Labs</strong>, representado por <strong>Jesus Saul Villegas Cruz</strong>, en adelante "EL DESARROLLADOR", y <strong>{formData.full_name || '[Nombre del Cliente]'}</strong>, en adelante "EL CLIENTE".</p>
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">DECLARACIONES Y DATOS DE LAS PARTES</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 p-5 bg-background/80 rounded-2xl border border-card-border text-xs">
                        <h4 className="font-black text-[9px] uppercase text-nectar-gold">EL DESARROLLADOR</h4>
                        <p><strong>Jesus Saul Villegas Cruz</strong></p>
                        <p>RFC: VICJ911227KY2</p>
                        <p>Domicilio: Poder Legislativo 345, col. Ley 57. Hermosillo, Sonora.</p>
                        <p>Email: contacto@finanzasparahippies.com</p>
                      </div>
                      <div className="space-y-2 p-5 bg-background/80 rounded-2xl border border-card-border text-xs">
                        <h4 className="font-black text-[9px] uppercase text-nectar-gold">EL CLIENTE</h4>
                        <p><strong>{formData.full_name || '___________________'}</strong></p>
                        <p>RFC: {formData.tax_id || '__________________________'}</p>
                        <p>Domicilio: {formData.address || '______________________'}</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">1. OBJETO DEL SERVICIO</h3>
                    <p>EL DESARROLLADOR se compromete a brindar servicios de desarrollo, mantenimiento y soporte técnico para los activos digitales de EL CLIENTE, bajo la modalidad de Partner Tecnológico con un enfoque de mejora continua y estabilidad de sistemas.</p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">2. OBJETIVO ESPECÍFICO DEL PROYECTO</h3>
                    <p>El enfoque principal durante el periodo inicial será el desarrollo del siguiente proyecto tecnológico:</p>
                    <div className="p-4 border-l-4 border-nectar-gold bg-nectar-gold/5 italic text-nectar-gold font-bold">
                      "{formData.project_idea || 'Idea del proyecto no especificada.'}"
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">3. ESQUEMA DE INVERSIÓN SELECCIONADO</h3>
                    <div className="p-4 border-2 border-nectar-gold bg-nectar-gold/5 rounded-xl font-black text-nectar-gold flex justify-between items-center">
                      <span>Plan de Ingeniería: {selectedPlanObj ? selectedPlanObj.name : 'No seleccionado'}</span>
                      <span>${selectedPlanObj ? parseFloat(selectedPlanObj.price).toLocaleString() : '0.00'} MXN / Mes</span>
                    </div>
                    <div className="p-4 border-2 border-foreground/20 bg-background/50 rounded-xl font-bold flex justify-between items-center text-xs">
                      <span>Frecuencia y Día de Pago:</span>
                      <span className="text-nectar-gold">
                        {formData.payment_day === 'WEEKLY_MONDAY' ? 'Abonos semanales (Lunes de cada semana)' :
                         formData.payment_day === 'FORTNIGHTLY_1ST_15TH' ? 'Abonos quincenales (Días 1 y 15 de cada mes)' :
                         'Abonos mensuales (Día 1ero de cada mes)'}
                      </span>
                    </div>
                    {formData.brand_design_tier !== 'NONE' && (
                      <div className="p-4 border-2 border-foreground/20 bg-foreground/5 rounded-xl font-bold flex justify-between items-center text-xs">
                        <span>Complemento: Diseño de Marca ({formData.brand_design_tier})</span>
                        <span>+ ${formData.brand_design_price.toLocaleString()} MXN</span>
                      </div>
                    )}
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">4. BENEFICIOS TÉCNICOS INCLUIDOS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <p><strong>Contenedores Docker:</strong> Aislamiento total de procesos.</p>
                      <p><strong>Seguridad SSL:</strong> Certificados HTTPS incluidos.</p>
                      <p><strong>Arquitectura Next.js + Django:</strong> Escalabilidad industrial.</p>
                      <p><strong>Hetzner Cloud:</strong> Administración de alto rendimiento.</p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">5. GESTIÓN DE HORAS Y PROPIEDAD</h3>
                    <p><strong>Límite de Horas:</strong> El paquete incluye {selectedPlanObj?.hours || 0} horas de ingeniería mensuales dedicadas al proyecto.</p>
                    <p><strong>Excedentes (Mes 1-6):</strong> Las horas adicionales de ingeniería solicitadas se facturarán a una tasa de <strong>$225 MXN</strong> por hora.</p>
                    <p><strong>Propiedad Intelectual:</strong> La propiedad del código fuente y los activos de diseño se transfieren a EL CLIENTE tras la liquidación del periodo obligatorio (6 meses).</p>
                  </section>
                  
                  <section className="space-y-3">
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">6. CONTINUIDAD POST-COMPROMISO (MES 7+)</h3>
                    <p>Al finalizar el periodo inicial de 6 meses, EL CLIENTE podrá optar por suscripción continua (mantiene beneficios y horas) o Servicio por Evento (On-Demand) a $500 MXN/hora.</p>
                  </section>
                </div>
              </div>

              {/* Signature Area */}
              <div className="p-8 bg-card-bg border-t border-card-border space-y-6">
                <div className="bg-white rounded-2xl overflow-hidden border-2 border-card-border shadow-inner">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor='black'
                  canvasProps={{ className: 'w-full h-64 cursor-crosshair' }}
                />
              </div>

              <div className="flex justify-between items-center">
                <button onClick={clearSignature} className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">
                  Borrar Trazo
                </button>
                <p className="text-[10px] font-black uppercase tracking-widest text-nectar-gold">Firma aquí con tu mouse o dedo</p>
              </div>
            </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-6 border-2 border-card-border font-black uppercase tracking-widest rounded-2xl hover:bg-card-bg"
              >
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-[2] py-6 bg-nectar-forest text-nectar-cream font-black uppercase tracking-widest rounded-2xl hover:bg-nectar-gold transition-all shadow-xl shadow-nectar-forest/20 disabled:opacity-50"
              >
                {submitting ? 'GENERANDO CONTRATO...' : 'FIRMAR Y FINALIZAR'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-8 py-24 animate-in zoom-in-95 duration-700">
            <div className="w-32 h-32 bg-nectar-gold text-nectar-cream rounded-[3rem] flex items-center justify-center mx-auto text-5xl shadow-2xl animate-bounce">
              ✓
            </div>
            <h1 className="text-6xl font-black tracking-tighter">¡Bienvenido a Néctar!</h1>
            <p className="text-xl opacity-60 max-w-md mx-auto">
              Tu contrato ha sido generado y firmado. En breve recibirás un correo con el PDF y los detalles de nuestra primera sesión de planeación.
            </p>
            <div className="pt-12">
              <Link href="/dashboard" className="px-12 py-6 bg-foreground text-background font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform inline-block">
                Ir al Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black animate-pulse">SINCRONIZANDO...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
