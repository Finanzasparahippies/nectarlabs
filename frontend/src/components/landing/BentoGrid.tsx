'use client';

import React from 'react';

const BentoCard = ({ title, description, icon, className, color }: { title: string, description: string, icon: React.ReactNode, className?: string, color: string }) => (
  <div className={`p-10 rounded-[2.5rem] border-2 border-card-border bg-card-bg flex flex-col justify-between group shadow-xl hover:shadow-[var(--shadow-premium)] hover:-translate-y-2 hover:border-nectar-gold transition-all duration-700 relative overflow-hidden ${className}`}>
    {/* Hover Accent Glow - More prominent */}
    <div className={`absolute -top-24 -right-24 w-96 h-96 bg-nectar-gold/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000`}></div>
    
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-10 text-nectar-cream bg-nectar-forest group-hover:bg-nectar-gold group-hover:rotate-12 transition-all duration-500 shadow-lg relative z-10`}>
      {icon}
    </div>
    <div className="relative z-10">
      <h3 className="text-3xl md:text-4xl font-black mb-6 tracking-tighter text-foreground leading-[0.9] group-hover:text-nectar-gold transition-colors duration-500">{title}</h3>
      <p className="text-foreground opacity-80 leading-relaxed text-lg font-bold">{description}</p>
    </div>
  </div>
);


export default function BentoGrid() {
  return (
    <section className="w-full py-32 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 auto-rows-[520px]">
        
        {/* Software de Alto Rendimiento */}
        <BentoCard 
          color="nectar-gold"
          className="md:col-span-2"
          title="Ingeniería de Software de Alto Rendimiento"
          description="Desarrollamos plataformas SaaS, Marketplaces y sistemas internos complejos. Ejemplos: Motores de reserva masivos, dashboards de análisis de datos en tiempo real e integraciones críticas con Stripe o SAP."
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          }
        />

        {/* Brand Design */}
        <BentoCard 
          color="nectar-gold"
          title="Diseño de Marca & Identidad"
          description="No solo construimos el motor, también la carrocería. Identidad visual, manuales de marca y UX/UI que comunican autoridad y exclusividad."
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.172-1.172a4 4 0 115.656 5.656l-1.172 1.172" />
            </svg>
          }
        />

        {/* Automatización & IA */}
        <BentoCard 
          color="nectar-gold"
          title="Automatización & IA"
          description="Optimizamos tu operación con agentes de IA personalizados y flujos de trabajo automatizados que ahorran cientos de horas hombre al mes."
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />

        {/* Infraestructura Dedicada */}
        <BentoCard 
          color="nectar-gold"
          className="md:col-span-2"
          title="Infraestructura y Aislamiento Total"
          description="Cada socio recibe un entorno Docker dedicado. Garantizamos independencia técnica absoluta: entregamos el código fuente, las llaves del servidor y la propiedad intelectual total."
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
      </div>
    </section>
  );
}
