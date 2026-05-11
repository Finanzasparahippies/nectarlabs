'use client';

import React, { useState } from 'react';

const steps = [
  {
    month: "Mes 1",
    title: "Lanzamiento MVP",
    description: "Despliegue de infraestructura crítica en Hetzner y activación del núcleo operativo de tu plataforma.",
    color: "nectar-gold"
  },
  {
    month: "Mes 2",
    title: "Blindaje Operativo",
    description: "Optimización de seguridad avanzada, refinamiento de UX y ajustes basados en tracción real.",
    color: "nectar-leaf"
  },
  {
    month: "Meses 3-6",
    title: "Escalado Masivo",
    description: "Expansión de funcionalidades, SEO de alta autoridad y preparación para el tráfico global.",
    color: "nectar-forest"
  }
];

export default function InteractiveTimeline() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="w-full px-6 max-w-7xl mx-auto" id="formula">
      <div className="text-center mb-16 relative">
        <div className="absolute -top-44 left-1/2 -translate-x-1/2 text-[10rem] md:text-[20rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
          BITACORA
        </div>
        <h2 className="relative text-6xl md:text-8xl font-black mb-4 tracking-tighter text-nectar-forest dark:text-nectar-cream leading-none z-10">
          Nuestra <span className="text-nectar-gold">Hoja de Ruta</span>
        </h2>
        <p className="text-[10px] text-nectar-gold font-black uppercase tracking-[0.5em] relative z-10">Ingeniería Predictiva</p>
      </div>

      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-10 left-0 w-full h-1.5 bg-nectar-forest/10 -translate-y-1/2 hidden md:block rounded-full"></div>
        <div
          className="absolute top-10 left-0 h-1.5 bg-nectar-gold -translate-y-1/2 transition-all duration-1000 hidden md:block rounded-full shadow-[0_0_15px_rgba(198,138,30,0.5)]"
          style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
        ></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`relative z-10 cursor-pointer group flex flex-col items-center text-center`}
              onClick={() => setActiveStep(index)}
            >
              {/* Step Number Bubble */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-10 text-2xl font-black transition-all duration-500 shadow-2xl border-4 ${activeStep === index ? 'bg-nectar-gold text-nectar-cream border-nectar-cream scale-110 shadow-nectar-gold/20' : 'bg-card-bg text-nectar-forest border-nectar-forest/20'}`}>
                {index + 1}
              </div>

              {/* Step Card Content */}
              <div className={`p-10 md:p-12 rounded-[3.5rem] border-2 transition-all duration-500 w-full shadow-lg flex flex-col items-center ${activeStep === index ? 'border-nectar-gold bg-nectar-forest text-nectar-cream shadow-[var(--shadow-premium)]' : 'border-card-border bg-card-bg text-foreground'}`}>
                <h4 className={`text-xs uppercase tracking-[0.4em] mb-4 font-black ${activeStep === index ? 'text-nectar-gold' : 'text-nectar-gold/60'}`}>{step.month}</h4>
                <h3 className={`text-3xl md:text-4xl font-black mb-8 tracking-tighter leading-none ${activeStep === index ? 'text-nectar-cream' : 'text-foreground'}`}>{step.title}</h3>
                <p className={`leading-relaxed text-lg font-bold ${activeStep === index ? 'text-nectar-cream/90' : 'text-foreground opacity-80'}`}>
                  {step.description}
                </p>
              </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
