import React from 'react';
import BentoGrid from './landing/BentoGrid';
import InteractiveTimeline from './landing/InteractiveTimeline';
import PricingCalculator from './landing/PricingCalculator';
import SubscriptionCards from './landing/SubscriptionCards';
import Navbar from './Navbar';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center selection:bg-nectar-gold selection:text-nectar-cream">
      <Navbar />

      {/* Hero Section */}

      <section className="w-full relative overflow-hidden pt-48 pb-32 px-6 flex flex-col items-center text-center">
        {/* Subtle Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-nectar-gold/10 rounded-full blur-[150px] -z-10 animate-glow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-nectar-forest/10 rounded-full blur-[150px] -z-10 animate-glow" style={{ animationDelay: '2s' }}></div>

        <div className="inline-block px-10 py-3 mb-12 text-sm font-black tracking-[0.5em] text-nectar-gold uppercase border-2 border-nectar-gold/20 rounded-full bg-white/50 dark:bg-nectar-forest/50 glass animate-premium">
          Nectar-Labs • Soluciones a tu Medida
        </div>

        <div className="relative mb-12">
          <div className="absolute -top-64 left-1/2 -translate-x-1/2 text-[12rem] md:text-[26rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
            NECTAR
          </div>
          <h1 className="text-7xl md:text-[11rem] font-black tracking-tighter leading-[0.75] animate-premium text-foreground relative z-10" style={{ animationDelay: '0.1s' }}>
            Software <br />
            <span className="text-nectar-gold italic pr-4">Artesanal</span>
          </h1>
        </div>

        <p className="text-2xl md:text-4xl text-foreground opacity-80 max-w-6xl mb-24 animate-premium leading-[1.1] font-bold tracking-tight text-balance" style={{ animationDelay: '0.2s' }}>
          Ingeniería de software de alta fidelidad y diseño de marca estratégico. <br className="hidden md:block" />
          Construimos <span className="text-nectar-gold underline decoration-nectar-gold/30 underline-offset-[12px]">independencia técnica</span> con rendimiento industrial.
        </p>

        <div className="flex flex-col md:flex-row gap-8 animate-premium" style={{ animationDelay: '0.3s' }}>
          <a href="#pricing" className="px-16 py-8 bg-nectar-forest text-nectar-cream font-black rounded-[2rem] hover:bg-nectar-gold hover:scale-105 transition-all duration-500 text-xl uppercase tracking-widest shadow-2xl shadow-nectar-forest/20 text-center">
            Elegir Plan
          </a>
          <a href="#formula" className="px-16 py-8 border-4 border-foreground/5 text-foreground font-black rounded-[2rem] hover:bg-foreground hover:text-background transition-all duration-500 text-xl uppercase tracking-widest glass text-center">
            Nuestra Fórmula
          </a>
        </div>


        {/* Expanded Tech Stack Logos */}
        <div className="mt-48 w-full max-w-7xl">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30 mb-24">Ecosistema de Ingeniería Nectar</p>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-12 gap-y-20 items-center justify-items-center opacity-40 hover:opacity-100 transition-all duration-1000 animate-premium grayscale hover:grayscale-0" style={{ animationDelay: '0.6s' }}>

            {/* Django */}
            <div className="text-xl font-black tracking-tighter flex items-center gap-1 text-foreground">
              <span className="bg-nectar-gold text-nectar-cream px-1.5 py-0.5 rounded text-sm">dj</span>
              <span>ango</span>
            </div>

            {/* Python */}
            <div className="text-xl font-black flex items-center gap-2 text-foreground">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.997 0a.75.75 0 0 0-.75.75v2.25h1.5V.75a.75.75 0 0 0-.75-.75zm0 24a.75.75 0 0 0 .75-.75v-2.25h-1.5v2.25a.75.75 0 0 0 .75.75zM24 11.997a.75.75 0 0 0-.75-.75h-2.25v1.5h2.25a.75.75 0 0 0 .75-.75zM0 11.997a.75.75 0 0 0 .75.75h2.25v-1.5H.75a.75.75 0 0 0-.75.75z" opacity="0.3" />
                <path d="M16.037 6.134a.75.75 0 0 0-.847.114L12 9.475l-3.19-3.227a.75.75 0 0 0-1.144.975l3.75 4.5a.75.75 0 0 0 1.168 0l3.75-4.5a.75.75 0 0 0-.297-1.089z" fill="var(--color-nectar-gold)" />
                <path d="M7.963 17.866a.75.75 0 0 0 .847-.114L12 14.525l3.19 3.227a.75.75 0 0 0 1.144-.975l-3.75-4.5a.75.75 0 0 0-1.168 0l-3.75 4.5a.75.75 0 0 0 .297 1.089z" />
              </svg>
              Python
            </div>

            {/* Next.js */}
            <svg className="h-7 w-auto text-foreground" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="90" cy="90" r="90" fill="currentColor" />
              <path d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z" fill="var(--background)" />
              <rect x="115" y="54" width="12" height="72" fill="var(--background)" />
            </svg>

            {/* React */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <svg className="w-8 h-8 animate-[spin_10s_linear_infinite]" viewBox="-11.5 -10.232 23 20.463" fill="none" stroke="currentColor"><circle r="2.05" fill="currentColor" /><g strokeWidth="1.2"><ellipse rx="11" ry="4.2" /><ellipse rx="11" ry="4.2" transform="rotate(60)" /><ellipse rx="11" ry="4.2" transform="rotate(120)" /></g></svg>
              React
            </div>

            {/* TypeScript */}
            <div className="flex items-center gap-2 text-lg font-black text-foreground">
              <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center font-black rounded-md text-sm">TS</div>
              TypeScript
            </div>

            {/* JavaScript */}
            <div className="flex items-center gap-2 text-lg font-black text-foreground">
              <div className="w-8 h-8 bg-yellow-400 text-black flex items-end justify-end p-0.5 font-black rounded-md text-[10px]">JS</div>
              JavaScript
            </div>

            {/* Node.js */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-lg bg-green-600/20 text-green-600 flex items-center justify-center font-bold text-[8px]">Node</div>
              Node.js
            </div>

            {/* Supabase */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l-9.5 13.5h7.5l-2 10.5 15.5-16.5h-9l2.5-7.5z" /></svg>
              Supabase
            </div>

            {/* Docker */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M13.983 11h2.119v2.119h-2.119zM11.025 11h2.119v2.119h-2.119zM8.067 11h2.119v2.119h-2.119zM13.983 8h2.119v2.119h-2.119zM11.025 8h2.119v2.119h-2.119zM8.067 8h2.119v2.119h-2.119zM11.025 5h2.119v2.119h-2.119zM8.067 5h2.119v2.119h-2.119zM5.109 11h2.119v2.119h-2.119zM2.151 11h2.119v2.119h-2.119zM2.151 8h2.119v2.119h-2.119zM2.151 5h2.119v2.119h-2.119zM23.99 11.57c-.033-.034-.583-.566-2.417-.566-2.417 0-3.084 1.484-3.084 1.484s-.367-.167-.917-.167c-1.54 0-2.312.64-2.312.64V18.1s.627.345 1.583.345c2.417 0 4.333-1.667 5.167-3.917.4-1.066.617-2.3.617-2.3l-.034-.658" /></svg>
              Docker
            </div>

            {/* PostgreSQL */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded bg-blue-600/20 text-blue-600 flex items-center justify-center font-black text-[10px]">PS</div>
              PostgreSQL
            </div>

            {/* GitHub */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              GitHub
            </div>

            {/* Tailwind */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <svg className="w-7 h-7 text-cyan-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z" /></svg>
              Tailwind
            </div>

            {/* Leaflet / OSM */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">📍</div>
              Maps / OSM
            </div>

            {/* scikit-learn */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 flex flex-col gap-0.5">
                <div className="h-1/2 w-full bg-orange-500 rounded-t-full"></div>
                <div className="h-1/2 w-full bg-blue-500 rounded-b-full"></div>
              </div>
              scikit-learn
            </div>

            {/* React Flow */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 border-2 border-foreground/20 rounded flex items-center justify-center text-[8px]">Nodes</div>
              React Flow
            </div>

            {/* Stripe */}
            <div className="text-lg font-black flex items-center gap-1 text-foreground">
              <span className="text-nectar-gold italic">S</span>tripe
            </div>

            {/* Cloudinary */}
            <div className="text-lg font-black flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">☁️</div>
              Cloudinary
            </div>

            {/* Hetzner */}
            <div className="text-lg font-black border-4 border-foreground px-4 py-1 uppercase tracking-[0.2em] text-foreground">Hetzner</div>
          </div>
        </div>

      </section>

      {/* Main Content Sections */}
      <div className="w-full space-y-32 pb-32">
        <div id="bento">
          <BentoGrid />
        </div>

        <div id="formula" className="py-32 bg-foreground/5 border-y border-foreground/10 relative scroll-mt-24 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 2px, transparent 2px)', backgroundSize: '60px 60px' }}></div>
          <InteractiveTimeline />
        </div>

        <div id="pricing" className="scroll-mt-24">
          <SubscriptionCards />
        </div>

        <div className="py-48 bg-gradient-to-b from-transparent via-nectar-gold/5 to-transparent">
          <PricingCalculator />
        </div>
      </div>

      {/* FAQ Link Section */}
      <section className="w-full py-24 text-center border-t border-card-border">
        <h3 className="text-2xl font-bold mb-4">¿Tienes dudas técnicas?</h3>
        <p className="text-foreground/40 mb-8">Nuestra transparencia es radical. Consulta nuestro FAQ técnico o lee el contrato.</p>
        <div className="flex justify-center gap-4">
          <Link href="/contract" className="text-nectar-gold font-bold hover:underline">Visor de Contrato</Link>
          <span className="text-foreground/20">|</span>
          <Link href="/faq" className="text-nectar-gold font-bold hover:underline">FAQ Técnico</Link>
        </div>
      </section>


      {/* Footer */}
      <footer className="w-full py-12 px-6 border-t border-card-border text-center text-xs text-foreground/20 tracking-widest uppercase">
        © 2026 Nectar Labs • Hermosillo, Sonora • Tu Socio Tecnológico
      </footer>
    </div>
  );
}
