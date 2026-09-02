'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { fetcher } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Toast from '@/components/ui/Toast';

interface Plan {
  id: number;
  name: string;
  price: string;
  hours: number;
  discount_percentage?: string;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sigCanvas = useRef<SignatureCanvas>(null);

  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (step === 4) {
      const interval = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  useEffect(() => {
    if (step === 4 && redirectCountdown <= 0) {
      router.push('/dashboard');
    }
  }, [step, redirectCountdown, router]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [formData, setFormData] = useState<{
    plan: string;
    payment_day: 'WEEKLY_MONDAY' | 'FORTNIGHTLY_1ST_15TH' | 'MONTHLY_1ST';
    full_name: string;
    tax_id: string;
    address: string;
    project_idea: string;
    brand_design_tier: string;
    brand_design_price: number;
  }>({
    plan: '',
    payment_day: 'MONTHLY_1ST',
    full_name: '',
    tax_id: '',
    address: '',
    project_idea: '',
    brand_design_tier: 'NONE',
    brand_design_price: 0,
  });

  const selectedPlanObj = plans.find(p => p.id.toString() === formData.plan.toString());

  const roundCurrency = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  const getFrequencyBreakdown = (frequency: 'WEEKLY_MONDAY' | 'FORTNIGHTLY_1ST_15TH' | 'MONTHLY_1ST') => {
    if (!selectedPlanObj) return null;
    const baseMonthly = parseFloat(selectedPlanObj.price) || 0;
    const planDisc = parseFloat(selectedPlanObj.discount_percentage || '0');
    const promoDisc = appliedPromo ? parseFloat(appliedPromo.discount_percentage || '0') : 0;

    let installmentsPerMonth = 1;
    let label = 'Mensual';
    let shortLabel = 'mes';
    let totalInstallments = 6;
    let desc = 'Abonos mensuales (Día 1ero de cada mes)';

    if (frequency === 'WEEKLY_MONDAY') {
      installmentsPerMonth = 4;
      label = 'Semanal';
      shortLabel = 'semana';
      totalInstallments = 24;
      desc = 'Abonos semanales (Lunes de cada semana)';
    } else if (frequency === 'FORTNIGHTLY_1ST_15TH') {
      installmentsPerMonth = 2;
      label = 'Quincenal';
      shortLabel = 'quincena';
      totalInstallments = 12;
      desc = 'Abonos quincenales (Días 1 y 15 de cada mes)';
    }

    const rawInstallment = baseMonthly / installmentsPerMonth;
    const baseInstallment = roundCurrency(rawInstallment);
    const planDiscountedInstallment = roundCurrency(baseInstallment * (1 - planDisc / 100));
    const promoDiscountedInstallment = promoDisc > 0 ? roundCurrency(baseInstallment * (1 - promoDisc / 100)) : planDiscountedInstallment;

    const MIN_AMOUNT = 50.0;
    const isValid = baseInstallment >= MIN_AMOUNT;

    return {
      frequency,
      label,
      shortLabel,
      totalInstallments,
      installmentsPerMonth,
      desc,
      baseMonthly,
      baseInstallment,
      planDiscountedInstallment,
      promoDiscountedInstallment,
      planDisc,
      promoDisc,
      isValid,
    };
  };

  useEffect(() => {
    setIsMounted(true);
    const planFromUrl = searchParams.get('plan');
    if (planFromUrl) {
      setFormData(prev => ({ ...prev, plan: planFromUrl }));
    }
  }, [searchParams]);

  const validatePromoCode = async (code: string) => {
    if (!code.trim()) return;
    setValidatingPromo(true);
    setPromoError('');
    try {
      const res = await fetcher(`/promo-codes/validate/?code=${code}`);
      if (res.is_valid) {
        setAppliedPromo(res);
        setPromoError('');
      } else {
        setAppliedPromo(null);
        setPromoError(res.message || 'Código promocional no válido.');
      }
    } catch (err: any) {
      setAppliedPromo(null);
      setPromoError('Error al validar el código.');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleValidatePromo = async () => {
    await validatePromoCode(promoCodeInput);
  };

  useEffect(() => {
    if (!isMounted) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/onboarding');
      return;
    }

    Promise.all([
      fetcher('/users/me/').catch(() => null),
      fetcher('/plans/').catch(() => [])
    ]).then(([userData, plansData]) => {
      setPlans(plansData);
      if (userData && userData.referral_code) {
        setPromoCodeInput(userData.referral_code);
        validatePromoCode(userData.referral_code);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Error during onboarding initialization:", err);
      setLoading(false);
    });
  }, [isMounted, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const [termsAccepted, setTermsAccepted] = useState(false);

  const generateContractHash = async (contentStr: string): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(contentStr);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return 'hash_v2_onboarding_nectar';
    }
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      showToast("Por favor, confirma la lectura y aceptación del alcance y propiedad intelectual.", "warning");
      return;
    }

    if (sigCanvas.current?.isEmpty()) {
      showToast("Por favor, firma el contrato antes de continuar.", "warning");
      return;
    }

    setSubmitting(true);
    const signatureBase64 = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');

    const contractRawText = `CONTRACT_v2:${formData.plan}:${formData.payment_day}:${formData.full_name}:${formData.tax_id}:${formData.address}:${formData.project_idea}`;
    const contractHash = await generateContractHash(contractRawText);

    try {
      await fetcher('/contracts/', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          signature_base64: signatureBase64,
          promo_code: appliedPromo ? appliedPromo.code : null,
          contract_version_hash: contractHash,
          accepted_terms_at: new Date().toISOString(),
        }),
      });
      setStep(4);
    } catch (err) {
      console.error("Error signing contract:", err);
      showToast("Hubo un error al procesar tu contrato. Verifica tu sesión y conexión.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isMounted) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">CARGANDO ECOSISTEMA...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-nectar-gold">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-48 pb-12">
        <Link href="/" className="inline-block mb-12 text-2xs font-black uppercase tracking-widest opacity-40 hover:opacity-100">
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
                <label className="text-2xs font-black uppercase tracking-widest opacity-40">Plan Seleccionado</label>
                <select
                  name="plan"
                  value={formData.plan}
                  onChange={handleInputChange}
                  className="w-full bg-card-bg border-2 border-card-border rounded-2xl p-6 font-bold focus:border-nectar-gold outline-none appearance-none"
                >
                  <option value="">Selecciona un plan...</option>
                  {plans.map(p => {
                    const discount = parseFloat(p.discount_percentage || '0');
                    const origPrice = parseFloat(p.price);
                    const discPrice = discount > 0 ? origPrice * (1 - discount / 100) : origPrice;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} - {discount > 0 ? `$${discPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN (Promo: ${discount}% OFF, antes $${origPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })})` : `$${origPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedPlanObj && (() => {
                const discount = parseFloat(selectedPlanObj.discount_percentage || '0');
                const origPrice = parseFloat(selectedPlanObj.price);
                const discPrice = discount > 0 ? origPrice * (1 - discount / 100) : origPrice;
                if (discount <= 0) return null;
                return (
                  <div className="p-5 rounded-2xl bg-green-500/5 border border-green-500/25 flex items-center justify-between text-xs animate-in fade-in zoom-in-95">
                    <div>
                      <span className="text-2xs font-black uppercase tracking-widest text-green-500 block mb-1">¡Descuento Promocional Activado!</span>
                      <p className="text-foreground/80 font-bold">
                        Tienes un <span className="text-green-400 font-extrabold">{discount}% de descuento</span> en este plan de ingeniería.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xs line-through opacity-50 block font-mono">${origPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                      <span className="text-sm font-black text-green-400 font-mono">${discPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                    </div>
                  </div>
                );
              })()}

              {/* Selector Interactivo de Frecuencia de Cobro Desacoplado */}
              {selectedPlanObj && (
                <div className="space-y-3 p-6 rounded-3xl bg-card-bg/60 border-2 border-card-border/80 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="flex items-center justify-between">
                    <label className="text-2xs font-black uppercase tracking-widest text-nectar-gold">
                      Elige la frecuencia de pagos de tu plan.
                    </label>
                    <span className="text-2xs uppercase font-bold opacity-50">6 meses de compromiso</span>
                  </div>
                  <p className="text-xs text-foreground/70 font-semibold">
                    Divide el monto total de tu plan en el periodo que mejor se adapte al flujo de tu negocio.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {(['WEEKLY_MONDAY', 'FORTNIGHTLY_1ST_15TH', 'MONTHLY_1ST'] as const).map((freq) => {
                      const breakdown = getFrequencyBreakdown(freq);
                      if (!breakdown) return null;
                      const isSelected = formData.payment_day === freq;

                      return (
                        <button
                          key={freq}
                          type="button"
                          disabled={!breakdown.isValid}
                          onClick={() => setFormData(prev => ({ ...prev, payment_day: freq }))}
                          className={`relative p-5 rounded-2xl border-2 transition-all duration-300 text-left flex flex-col justify-between ${isSelected
                            ? 'border-nectar-gold bg-nectar-gold/10 shadow-[0_0_25px_rgba(198,138,30,0.15)] scale-[1.02]'
                            : breakdown.isValid
                              ? 'border-card-border hover:border-nectar-gold/40 hover:bg-card-bg'
                              : 'border-red-500/20 bg-red-500/5 opacity-50 cursor-not-allowed'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-black uppercase tracking-wider text-foreground">
                              {breakdown.label}
                            </span>
                            <span className={`text-2xs font-black px-2 py-0.5 rounded-full uppercase ${isSelected ? 'bg-nectar-gold text-background' : 'bg-card-border text-foreground/60'
                              }`}>
                              {breakdown.installmentsPerMonth} / mes
                            </span>
                          </div>

                          <div className="space-y-1 mb-3">
                            {appliedPromo ? (
                              <>
                                <span className="text-2xs line-through opacity-40 font-mono block">
                                  ${breakdown.baseInstallment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} / {breakdown.shortLabel}
                                </span>
                                <span className="text-lg font-black font-mono text-green-400 block">
                                  ${breakdown.promoDiscountedInstallment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  <span className="text-2xs font-bold text-foreground/60"> / {breakdown.shortLabel}</span>
                                </span>
                              </>
                            ) : breakdown.planDisc > 0 ? (
                              <>
                                <span className="text-2xs line-through opacity-40 font-mono block">
                                  ${breakdown.baseInstallment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} / {breakdown.shortLabel}
                                </span>
                                <span className="text-lg font-black font-mono text-green-400 block">
                                  ${breakdown.planDiscountedInstallment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  <span className="text-2xs font-bold text-foreground/60"> / {breakdown.shortLabel}</span>
                                </span>
                              </>
                            ) : (
                              <span className="text-lg font-black font-mono text-nectar-gold block">
                                ${breakdown.baseInstallment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                <span className="text-2xs font-bold text-foreground/60"> / {breakdown.shortLabel}</span>
                              </span>
                            )}
                          </div>

                          <div className="text-2xs opacity-60 font-medium border-t border-card-border/40 pt-2">
                            Total: {breakdown.totalInstallments} exhibiciones
                          </div>

                          {!breakdown.isValid && (
                            <div className="text-2xs font-bold text-red-400 mt-2">
                              ⚠ Inferior al mínimo permitido por pasarela ($50.00 MXN)
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Promo Code Input Block */}
              {formData.plan && (
                <div className="space-y-3 p-6 rounded-2xl bg-card-bg/50 border border-card-border/80 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <label className="text-2xs font-black uppercase tracking-widest opacity-40 block">¿Tienes un Código de Referido o Promocional?</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="CÓDIGO DE REFERIDO"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-background border border-card-border rounded-xl px-4 py-3.5 text-xs font-mono focus:outline-none focus:border-nectar-gold text-foreground uppercase font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleValidatePromo}
                      disabled={validatingPromo}
                      className="px-6 bg-foreground hover:bg-nectar-gold text-background rounded-xl text-2xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95"
                    >
                      {validatingPromo ? 'Validando...' : 'Aplicar'}
                    </button>
                  </div>
                  {appliedPromo && (
                    <div className="text-2xs text-green-400 font-bold mt-2 flex items-center gap-1 bg-green-500/5 p-3 rounded-lg border border-green-500/10">
                      <span>✓</span> Código promocional <span className="underline">{appliedPromo.code}</span> aplicado con éxito: <strong>-{appliedPromo.discount_percentage}% de descuento</strong> en tu primer pago.
                    </div>
                  )}
                  {promoError && (
                    <div className="text-2xs text-red-500 font-bold mt-2 bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                      ✗ {promoError}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-2xs font-black uppercase tracking-widest opacity-40">Idea del Proyecto (Un párrafo)</label>
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
                <label className="text-2xs font-black uppercase tracking-widest opacity-40">¿Requieres Diseño de Marca? (Opcional)</label>
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
                <label className="text-2xs font-black uppercase tracking-widest opacity-40">Nombre Completo o Razón Social</label>
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
                  <label className="text-2xs font-black uppercase tracking-widest opacity-40">RFC</label>
                  <input
                    type="text"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                    className="w-full bg-card-bg border-2 border-card-border rounded-2xl p-6 font-bold focus:border-nectar-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-2xs font-black uppercase tracking-widest opacity-40">Dirección Fiscal</label>
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

            <div className="bg-card-bg/85 backdrop-blur-md border border-nectar-gold/25 rounded-3xl overflow-hidden flex flex-col min-h-[68vh] max-h-[78vh] md:max-h-[82vh] shadow-[0_0_50px_rgba(198,138,30,0.08)] relative">
              <style>{`
                .custom-contract-scrollbar::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-contract-scrollbar::-webkit-scrollbar-track {
                  background: rgba(0, 0, 0, 0.2);
                  border-radius: 10px;
                }
                .custom-contract-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(198, 138, 30, 0.3);
                  border-radius: 10px;
                  border: 2px solid #121815;
                }
                .custom-contract-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(198, 138, 30, 0.5);
                }
              `}</style>

              {/* Contract Preview Document */}
              <div className="p-8 md:p-12 overflow-y-auto custom-contract-scrollbar flex-1 bg-background/30 selection:bg-nectar-gold selection:text-background">
                <header className="mb-12 border-b border-card-border/60 pb-8">
                  <h2 className="text-2xl font-black tracking-tighter mb-2">CONTRATO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS</h2>
                  <p className="text-nectar-gold font-bold uppercase tracking-widest text-2xs">Modalidad: Partner Tecnológico</p>
                </header>

                <div className="prose prose-invert max-w-none space-y-10 text-sm leading-relaxed opacity-85">
                  <section>
                    <p>Este contrato se celebra entre <strong>Néctar Labs</strong>, representado por <strong>Jesus Saul Villegas Cruz</strong>, en adelante "EL DESARROLLADOR", y <strong>{formData.full_name || '[Nombre del Cliente]'}</strong>, en adelante "EL CLIENTE".</p>
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">DECLARACIONES Y DATOS DE LAS PARTES</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 p-5 bg-background/80 rounded-2xl border border-card-border/60 text-xs">
                        <h4 className="font-black text-2xs uppercase text-nectar-gold">EL DESARROLLADOR</h4>
                        <p><strong>Jesus Saul Villegas Cruz</strong></p>
                        <p>RFC: VICJ911227KY2</p>
                        <p>Domicilio: Poder Legislativo 345, col. Ley 57. Hermosillo, Sonora.</p>
                        <p>Email: contacto@finanzasparahippies.com</p>
                      </div>
                      <div className="space-y-2 p-5 bg-background/80 rounded-2xl border border-card-border/60 text-xs">
                        <h4 className="font-black text-2xs uppercase text-nectar-gold">EL CLIENTE</h4>
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
                    <div className="p-4 border-l-4 border-nectar-gold bg-nectar-gold/5 italic text-nectar-gold font-bold rounded-r-xl">
                      "{formData.project_idea || 'Idea del proyecto no especificada.'}"
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">3. ESQUEMA DE INVERSIÓN SELECCIONADO</h3>
                    {selectedPlanObj && (() => {
                      const currentBreakdown = getFrequencyBreakdown(formData.payment_day);
                      if (!currentBreakdown) return null;

                      return (
                        <div className="space-y-3">
                          {appliedPromo ? (
                            <div className="p-5 border-2 border-green-500/30 bg-green-500/5 rounded-xl font-black text-foreground space-y-2 animate-fadeIn">
                              <div className="flex justify-between items-center text-xs opacity-60">
                                <span>Inversión Base del Plan ({selectedPlanObj.name}):</span>
                                <span className="font-mono">${currentBreakdown.baseMonthly.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN / Mes</span>
                              </div>
                              <div className="flex justify-between items-center text-2xs text-green-400">
                                <span>Descuento de Referido/Promo ({appliedPromo.code}) en primer pago:</span>
                                <span>-{appliedPromo.discount_percentage}%</span>
                              </div>
                              <div className="h-[1px] bg-card-border/40 my-2" />
                              <div className="flex justify-between items-center text-nectar-gold">
                                <span>Primer Pago con Código ({currentBreakdown.label}):</span>
                                <span className="font-mono text-base">${currentBreakdown.promoDiscountedInstallment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN / {currentBreakdown.shortLabel}</span>
                              </div>
                              <div className="flex justify-between items-center text-foreground/80 text-xs pt-1">
                                <span>Cuotas Subsecuentes ({currentBreakdown.totalInstallments - 1} abonos):</span>
                                <span className="font-mono">${currentBreakdown.planDiscountedInstallment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN / {currentBreakdown.shortLabel}</span>
                              </div>
                            </div>
                          ) : currentBreakdown.planDisc > 0 ? (
                            <div className="p-5 border-2 border-green-500/30 bg-green-500/5 rounded-xl font-black text-foreground space-y-2">
                              <div className="flex justify-between items-center text-xs opacity-60">
                                <span>Inversión Normal del Plan ({selectedPlanObj.name}):</span>
                                <span className="line-through font-mono">${currentBreakdown.baseMonthly.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN / Mes</span>
                              </div>
                              <div className="flex justify-between items-center text-2xs text-green-400">
                                <span>Descuento Promocional Aplicado:</span>
                                <span>-{currentBreakdown.planDisc}%</span>
                              </div>
                              <div className="h-[1px] bg-card-border/40 my-2" />
                              <div className="flex justify-between items-center text-nectar-gold">
                                <span>Inversión por Cuota ({currentBreakdown.label}):</span>
                                <span className="font-mono">${currentBreakdown.planDiscountedInstallment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN / {currentBreakdown.shortLabel}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 border-2 border-nectar-gold bg-nectar-gold/5 rounded-xl font-black text-nectar-gold flex justify-between items-center">
                              <span>Plan de Ingeniería: {selectedPlanObj.name} ({currentBreakdown.label})</span>
                              <span className="font-mono">${currentBreakdown.baseInstallment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN / {currentBreakdown.shortLabel}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="p-4 border border-card-border/60 bg-background/50 rounded-xl font-bold flex justify-between items-center text-xs">
                      <span>Frecuencia y Día de Pago:</span>
                      <span className="text-nectar-gold font-black">
                        {formData.payment_day === 'WEEKLY_MONDAY' ? 'Abonos semanales (Lunes de cada semana)' :
                          formData.payment_day === 'FORTNIGHTLY_1ST_15TH' ? 'Abonos quincenales (Días 1 y 15 de cada mes)' :
                            'Abonos mensuales (Día 1ero de cada mes)'}
                      </span>
                    </div>
                    {formData.brand_design_tier !== 'NONE' && (
                      <div className="p-4 border border-card-border/60 bg-foreground/5 rounded-xl font-bold flex justify-between items-center text-xs">
                        <span>Complemento: Diseño de Marca ({formData.brand_design_tier})</span>
                        <span className="text-nectar-gold font-black">+ ${formData.brand_design_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
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
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">5. GESTIÓN DE ALCANCE, CADUCIDAD DE HORAS Y PROPIEDAD DE CÓDIGO</h3>
                    <p><strong>Periodo Obligatorio:</strong> El presente contrato contempla una duración mínima obligatoria de 6 meses de compromiso.</p>
                    <p><strong>Bolsa de Horas Técnica:</strong> El plan <strong>{selectedPlanObj?.name || 'seleccionado'}</strong> contempla una asignación de <strong>{selectedPlanObj?.hours || 0} horas mensuales</strong> de ingeniería.</p>
                    <p><strong>Política de Caducidad de Horas (Use-It-Or-Lose-It):</strong> Las horas de desarrollo asignadas vencen automáticamente al término de cada periodo mensual de facturación y <strong>no son acumulables ni transferibles</strong> para meses posteriores.</p>
                    <p><strong>Propiedad Intelectual:</strong> {selectedPlanObj?.name?.toLowerCase().includes('premium')
                      ? 'La propiedad intelectual de los desarrollos a medida y del código fuente se consolidará a favor de EL CLIENTE únicamente al cumplir satisfactoriamente los 6 meses de contrato.'
                      : 'El presente plan otorga un derecho exclusivo de uso licenciado sobre los add-ons, sistemas y plantillas. No contempla la transferencia de propiedad intelectual del código fuente.'}</p>
                  </section>

                  <section className="space-y-3 font-semibold text-foreground/80">
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">6. CONTINUIDAD POST-COMPROMISO (MES 7+)</h3>
                    <p>Al finalizar el periodo obligatorio de 6 meses, EL CLIENTE podrá renovar su suscripción de Partner Tecnológico o migrar a mantenimiento autónomo de la colmena digital.</p>
                  </section>
                </div>
              </div>

              {/* Tech-Organic Scope Card & Feature Inclusion Summary */}
              {selectedPlanObj && (
                <div className="px-8 pt-6 pb-2 bg-[#361542] text-[#f2ecdc] border-t border-nectar-gold/30">
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                    <div>
                      <span className="text-2xs font-black uppercase tracking-widest text-[#0de5a8] block mb-0.5">
                        Resumen de Alcance Técnico & Propiedad Intelectual
                      </span>
                      <h4 className="text-lg font-black text-white tracking-tight">
                        {selectedPlanObj.name}
                      </h4>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-nectar-gold/20 border border-nectar-gold/40 text-nectar-gold font-mono font-black text-xs">
                      {selectedPlanObj.hours ? `${selectedPlanObj.hours} hrs / mes` : '0 hrs / mes'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-4">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 font-black text-[#0de5a8] text-xs">
                        <span>⚡</span>
                        <span>Bolsa de Horas de Ingeniería</span>
                      </div>
                      <p className="opacity-80 text-xs leading-relaxed">
                        {selectedPlanObj.name.toLowerCase().includes('premium')
                          ? '12 hrs/mes para desarrollos a medida desde cero o adaptación de plantillas.'
                          : selectedPlanObj.name.toLowerCase().includes('mid')
                          ? '5 hrs/mes dedicadas a la personalización de add-ons existentes de Nectar Labs.'
                          : 'Sin horas de desarrollo a medida. Uso autónomo mediante herramientas nativas.'}
                      </p>
                      {selectedPlanObj.hours > 0 ? (
                        <span className="inline-block text-2xs font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full">
                          ⚠ Bolsa mensual no acumulable (Use-it-or-lose-it)
                        </span>
                      ) : (
                        <span className="inline-block text-2xs font-black uppercase tracking-wider text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
                          Personalización autónoma por el usuario
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 font-black text-[#0de5a8] text-xs">
                        <span>🛡️</span>
                        <span>Propiedad Intelectual (IP)</span>
                      </div>
                      <p className="opacity-80 text-xs leading-relaxed">
                        {selectedPlanObj.name.toLowerCase().includes('premium')
                          ? 'Transferencia y consolidación total de propiedad del código al cumplir 6 meses.'
                          : 'Derecho de uso licenciado de add-ons y plantillas oficiales. No incluye propiedad de código fuente.'}
                      </p>
                      <span className="inline-block text-2xs font-black uppercase tracking-wider text-[#0de5a8] bg-[#0de5a8]/10 px-2 py-0.5 rounded-full">
                        {selectedPlanObj.name.toLowerCase().includes('premium')
                          ? '✓ Consolidación IP de Código al Mes 6'
                          : '✓ Derecho de Uso Licenciado (Software)'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Signature Area */}
              <div className="p-8 bg-card-bg/95 border-t border-card-border/60 space-y-6">
                {/* Defensiva de Aceptación Consciente */}
                <label className="flex items-start gap-3 p-4 rounded-2xl bg-background/80 border border-card-border/80 cursor-pointer hover:border-nectar-gold transition-all select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-nectar-gold rounded cursor-pointer"
                  />
                  <span className="text-xs text-foreground/90 font-bold leading-relaxed">
                    Confirmación explícita: He leído, comprendo y acepto las condiciones de alcance técnico (<strong>{selectedPlanObj?.hours || 0} hrs/mes no acumulables</strong>) y los términos de propiedad intelectual descritos para el <strong>{selectedPlanObj?.name || 'plan seleccionado'}</strong>.
                  </span>
                </label>

                <div className="bg-white rounded-2xl overflow-hidden border border-nectar-gold/20 shadow-[0_4px_25px_rgba(0,0,0,0.3)] relative group">
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor='black'
                    canvasProps={{ className: 'w-full h-64 cursor-crosshair' }}
                  />
                  <div className="absolute inset-0 pointer-events-none border border-transparent group-hover:border-nectar-gold/10 transition-colors rounded-2xl"></div>
                </div>

                <div className="flex justify-between items-center">
                  <button onClick={clearSignature} className="text-2xs font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors active:scale-95">
                    Borrar Trazo
                  </button>
                  <p className="text-2xs font-black uppercase tracking-widest text-nectar-gold">Firma aquí con tu mouse o dedo</p>
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
                disabled={submitting || !termsAccepted}
                className="flex-[2] py-6 bg-nectar-forest text-nectar-cream font-black uppercase tracking-widest rounded-2xl hover:bg-nectar-gold transition-all shadow-xl shadow-nectar-forest/20 disabled:opacity-30 disabled:cursor-not-allowed"
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
            <div className="text-2xs font-black uppercase tracking-widest text-nectar-gold animate-pulse">
              Redirigiendo a tu Dashboard en {redirectCountdown} segundos...
            </div>
            <div className="pt-12">
              <Link href="/dashboard" className="px-12 py-6 bg-foreground text-background font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform inline-block">
                Ir al Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
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
