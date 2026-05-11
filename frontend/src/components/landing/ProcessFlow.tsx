'use client';

import React from 'react';

const steps = [
  {
    title: "El Caos Creativo",
    description: "Todo comienza con una visión. Un negocio sin sistema es un organigrama en desorden. Escuchamos tu idea y analizamos los cuellos de botella operativos.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    label: "Fase 01: Consultoría"
  },
  {
    title: "Arquitectura de Orden",
    description: "Traducimos el caos en lógica pura. Diseñamos un organigrama digital donde cada proceso, desde el inventario hasta la nómina, tiene un flujo automatizado y predecible.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    label: "Fase 02: Blueprint"
  },
  {
    title: "Ingeniería de Alta Fidelidad",
    description: "Construimos tu plataforma con Next.js y Django. No usamos plantillas; forjamos cada línea de código para que el sistema se adapte a tu negocio, y no al revés.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    label: "Fase 03: Desarrollo"
  },
  {
    title: "Activo Digital Vivo",
    description: "Tu aplicación toma vida. Desplegamos en infraestructura dedicada con Docker. Tu negocio ahora es una máquina organizada, escalable y lista para dominar su mercado.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    label: "Fase 04: Evolución"
  }
];

export default function ProcessFlow() {
  return (
    <section className="w-full py-40 px-6 max-w-7xl mx-auto relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-nectar-gold/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>

      <div className="text-center mb-32 relative">
        <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter text-nectar-forest dark:text-nectar-cream leading-tight">
          Del Caos al <span className="text-nectar-gold italic">Sistema</span>
        </h2>
        <p className="max-w-3xl mx-auto text-xl opacity-60 font-bold leading-relaxed">
          Un negocio sin software personalizado es un organigrama en desorden. En Néctar Labs, transformamos tu visión en una ventaja competitiva blindada por tecnología.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
        {/* Connecting Line (Desktop) */}
        <div className="hidden lg:block absolute top-[4.5rem] left-0 w-full h-[2px] bg-nectar-forest/10 -z-10">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-nectar-gold/30 to-transparent"></div>
        </div>

        {steps.map((step, index) => (
          <div key={index} className="group relative flex flex-col items-center text-center">
            {/* Phase Bubble */}
            <div className="w-36 h-36 rounded-[2.5rem] bg-card-bg border-2 border-card-border flex items-center justify-center mb-10 group-hover:border-nectar-gold group-hover:-translate-y-4 transition-all duration-700 shadow-2xl relative overflow-hidden">
               {/* Bubble Glow */}
              <div className="absolute inset-0 bg-nectar-gold/0 group-hover:bg-nectar-gold/5 transition-colors duration-700"></div>
              <div className="text-nectar-forest group-hover:text-nectar-gold transition-colors duration-500 relative z-10 scale-125">
                {step.icon}
              </div>
            </div>

            <div className="space-y-4 px-4">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-nectar-gold bg-nectar-gold/5 px-4 py-1.5 rounded-full">
                {step.label}
              </span>
              <h3 className="text-2xl font-black text-foreground tracking-tight leading-none group-hover:text-nectar-gold transition-colors duration-500">
                {step.title}
              </h3>
              <p className="text-sm opacity-60 leading-relaxed font-bold">
                {step.description}
              </p>
            </div>

            {/* Vertical Line for Mobile */}
            {index < steps.length - 1 && (
              <div className="md:hidden w-[2px] h-16 bg-nectar-forest/10 my-8"></div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-32 p-12 rounded-[4rem] bg-nectar-forest text-white flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[80px] -translate-y-1/2 translate-x-1/2 rounded-full group-hover:bg-nectar-gold/10 transition-colors duration-1000"></div>
        
        <div className="max-w-2xl relative z-10">
          <h4 className="text-3xl md:text-4xl font-black mb-4 tracking-tighter leading-none">Organiza hasta el más extenso organigrama.</h4>
          <p className="text-white/60 text-lg font-bold">Tu negocio merece una arquitectura a medida, no parches tecnológicos.</p>
        </div>

        <button className="px-12 py-6 bg-nectar-gold text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white hover:text-nectar-forest transition-all scale-100 hover:scale-105 active:scale-95 shadow-xl relative z-10">
          Agendar Consultoría
        </button>
      </div>
    </section>
  );
}
