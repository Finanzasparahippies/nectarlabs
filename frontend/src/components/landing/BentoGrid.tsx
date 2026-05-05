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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 auto-rows-[480px]">
        {/* Container Isolation */}
        <BentoCard 
          color="nectar-gold"
          className="md:col-span-2"
          title="Aislamiento de Infraestructura"
          description="Cada socio recibe un entorno Docker dedicado y totalmente aislado. Sin 'vecinos ruidosos', garantizando que el rendimiento de tu negocio sea constante y predecible."
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />

        {/* SSL & Security */}
        <BentoCard 
          color="nectar-gold"
          title="Seguridad Industrial"
          description="Certificados SSL automatizados y firewalls de capa 7 para blindar tus datos y la confianza de tus clientes."
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        {/* Code Ownership */}
        <BentoCard 
          color="nectar-gold"
          title="Propiedad Intelectual"
          description="El código es tuyo. Entregamos el repositorio Git completo y las llaves del servidor. Independencia técnica total."
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          }
        />

        {/* Scalability */}
        <BentoCard 
          color="nectar-gold"
          className="md:col-span-2"
          title="Escalabilidad Sin Límites"
          description="Arquitectura Next.js + Django diseñada para evolucionar. Desde un lanzamiento local hasta una expansión masiva sin reescrituras de código."
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>
    </section>
  );
}
