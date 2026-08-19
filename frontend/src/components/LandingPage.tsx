'use client';

import React, { useState } from 'react';
import BentoGrid from './landing/BentoGrid';
import ProcessFlow from './landing/ProcessFlow';
import InteractiveTimeline from './landing/InteractiveTimeline';
import PricingCalculator from './landing/PricingCalculator';
import SubscriptionCards from './landing/SubscriptionCards';
import AddonShowcase from './landing/AddonShowcase';
import NectarCastBanner from './landing/NectarCastBanner';
import SellerProgram from './landing/SellerProgram';
import Navbar from './Navbar';
import Link from 'next/link';
import ConsultationScheduler from './landing/ConsultationScheduler';
import PartnersShowcase from './landing/PartnersShowcase';
import { LandingDataProvider } from '../context/LandingDataContext';

export default function LandingPage() {
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [schedulerAddonSlug, setSchedulerAddonSlug] = useState('');

  const openScheduler = (slug = '') => {
    setSchedulerAddonSlug(slug);
    setIsSchedulerOpen(true);
  };

  return (
    <LandingDataProvider>
      <div className="min-h-screen flex flex-col items-center selection:bg-nectar-gold selection:text-nectar-cream">
        <Navbar />

        {/* Hero Section */}
        <section className="w-full relative overflow-hidden pt-32 sm:pt-48 pb-20 sm:pb-32 px-6 flex flex-col items-center text-center">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-nectar-gold/10 rounded-full blur-[150px] -z-10 animate-glow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-nectar-forest/10 rounded-full blur-[150px] -z-10 animate-glow" style={{ animationDelay: '2s' }}></div>

          <div className="inline-block px-6 py-2.5 sm:px-10 sm:py-3 mb-10 sm:mb-12 text-[10px] sm:text-sm font-black tracking-[0.3em] sm:tracking-[0.5em] text-nectar-gold uppercase border-2 border-nectar-gold/20 rounded-full bg-white/50 dark:bg-nectar-forest/50 glass animate-premium">
            Nectar-Labs • Soluciones a tu Medida
          </div>

          <div className="relative mb-10 sm:mb-12 w-full max-w-4xl">
            <div className="absolute -top-16 sm:-top-32 md:-top-48 lg:-top-64 left-1/2 -translate-x-1/2 text-[5rem] sm:text-[10rem] md:text-[18rem] lg:text-[26rem] font-black text-punch opacity-60 dark:opacity-80 select-none pointer-events-none whitespace-nowrap z-0">
              NECTAR
            </div>
            <h1 className="text-4xl sm:text-7xl md:text-[9rem] lg:text-[11rem] font-black tracking-tighter leading-[0.8] sm:leading-[0.75] animate-premium text-foreground relative z-10" style={{ animationDelay: '0.1s' }}>
              Software <br />
              <span className="text-nectar-gold italic pr-4">Artesanal</span>
            </h1>
          </div>

          <p className="text-base sm:text-2xl md:text-4xl text-foreground opacity-80 max-w-6xl mb-16 sm:mb-24 animate-premium leading-[1.2] sm:leading-[1.1] font-bold tracking-tight text-balance px-4" style={{ animationDelay: '0.2s' }}>
            Ingeniería de software de alta fidelidad y diseño de marca estratégico. <br className="hidden md:block" />
            Construimos <span className="text-nectar-gold underline decoration-nectar-gold/30 underline-offset-[8px] sm:underline-offset-[12px]">independencia técnica</span> con rendimiento industrial.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 animate-premium w-full sm:w-auto px-6 sm:px-0" style={{ animationDelay: '0.3s' }}>
            <a href="#pricing" className="px-8 py-4 sm:px-16 sm:py-8 bg-nectar-forest text-nectar-cream font-black rounded-[1.5rem] sm:rounded-[2rem] hover:bg-nectar-gold hover:scale-105 transition-all duration-500 text-sm sm:text-xl uppercase tracking-widest shadow-2xl shadow-nectar-forest/20 text-center">
              Elegir Plan
            </a>
            <a href="#formula" className="px-8 py-4 sm:px-16 sm:py-8 border-2 sm:border-4 border-foreground/5 text-foreground font-black rounded-[1.5rem] sm:rounded-[2rem] hover:bg-foreground hover:text-nectar-gold transition-all duration-500 text-sm sm:text-xl uppercase tracking-widest glass text-center">
              Nuestra Fórmula
            </a>
          </div>
        </section>

        {/* Main Content Sections */}
        <div className="w-full space-y-32 pb-32">
          <PartnersShowcase />

          <div id="bento">
            <BentoGrid />
          </div>

          <div id="process">
            <ProcessFlow onOpenScheduler={openScheduler} />
          </div>

          <div id="formula" className="py-32 bg-foreground/5 border-y border-foreground/10 relative scroll-mt-24 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 2px, transparent 2px)', backgroundSize: '60px 60px' }}></div>
            <InteractiveTimeline />
          </div>

          <div id="pricing" className="scroll-mt-24">
            <SubscriptionCards />
          </div>

          <div id="addons" className="scroll-mt-24">
            <AddonShowcase />
          </div>

          <div id="nectarcast-promo" className="scroll-mt-24">
            <NectarCastBanner />
          </div>

          <div className="py-48 bg-gradient-to-b from-transparent via-nectar-gold/5 to-transparent">
            <PricingCalculator onOpenScheduler={openScheduler} />
          </div>

          <div id="seller-program" className="border-t border-card-border scroll-mt-24">
            <SellerProgram />
          </div>
        </div>

        {/* Tech Stack Section */}
        <section id="tech-stack" className="w-full py-32 px-6 border-t border-card-border relative overflow-hidden flex flex-col items-center bg-gradient-to-b from-transparent via-nectar-gold/5 to-transparent">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-nectar-gold/5 rounded-full blur-[150px] -z-10"></div>
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 2px, transparent 2px)', backgroundSize: '60px 60px' }}></div>

          <div className="w-full max-w-7xl text-center">
            <span className="inline-block px-8 py-2.5 mb-6 text-[10px] font-black tracking-[0.5em] text-nectar-gold uppercase border border-nectar-gold/20 rounded-full bg-nectar-gold/5">
              Ecosistema Tecnológico
            </span>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-foreground">
              Nuestra <span className="text-nectar-gold italic">Infraestructura</span> de Ingeniería
            </h2>
            <p className="text-base md:text-lg text-foreground/60 max-w-3xl mx-auto mb-24 leading-relaxed">
              Combinamos las tecnologías más robustas, estables y eficientes del mercado para construir plataformas escalables con total soberanía e independencia técnica.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-x-6 gap-y-10 items-center justify-items-center">
              {/* Django */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-[#092e20]/40 border border-[#092e20] flex items-center justify-center shadow-lg group-hover:border-emerald-400 group-hover:bg-[#092e20]/80 group-hover:shadow-emerald-500/20 transition-all">
                  <span className="text-xl font-black text-emerald-400 font-mono tracking-tighter">dj</span>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-emerald-400 transition-all font-mono">Django 5</span>
              </div>

              {/* Python */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex items-center justify-center shadow-lg group-hover:border-blue-400 group-hover:bg-blue-950/60 group-hover:shadow-blue-500/20 transition-all">
                  <svg className="w-7 h-7" viewBox="0 0 24 24">
                    <path d="M11.927 0C5.787 0 6.136 2.668 6.136 2.668l.006 2.763h5.928v.838H3.843S0 5.798 0 11.954c0 6.157 3.35 5.94 3.35 5.94h2.001v-2.831s-.11-3.376 3.315-3.376h5.717s3.155.053 3.155-3.048V3.155S18.067 0 11.927 0zm-3.23 1.838a1.001 1.001 0 1 1 0 2.002 1.001 1.001 0 0 1 0-2.002z" fill="#3776AB"/>
                    <path d="M12.073 24c6.14 0 5.791-2.668 5.791-2.668l-.006-2.763H11.93v-.838h8.227S24 18.202 24 12.046c0-6.157-3.35-5.94-3.35-5.94h-2.001v2.831s.11 3.376-3.315 3.376H9.617s-3.155-.053-3.155 3.048v6.241S5.933 24 12.073 24zm3.23-1.838a1.001 1.001 0 1 1 0-2.002 1.001 1.001 0 0 1 0 2.002z" fill="#FFD43B"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-blue-400 transition-all font-mono">Python 3.12</span>
              </div>

              {/* Next.js */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900/50 border border-zinc-700/40 flex items-center justify-center shadow-lg group-hover:border-white group-hover:bg-zinc-900/90 group-hover:shadow-white/10 transition-all">
                  <svg className="w-7 h-7 text-foreground" viewBox="0 0 180 180" fill="none">
                    <circle cx="90" cy="90" r="90" fill="currentColor"/>
                    <path d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z" fill="var(--background)"/>
                    <rect x="115" y="54" width="12" height="72" fill="var(--background)"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-white transition-all font-mono">Next.js 16</span>
              </div>

              {/* React */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-center shadow-lg group-hover:border-cyan-400 group-hover:bg-cyan-950/60 group-hover:shadow-cyan-500/20 transition-all">
                  <svg className="w-7 h-7 text-cyan-400 animate-[spin_12s_linear_infinite]" viewBox="-11.5 -10.232 23 20.463" fill="none" stroke="currentColor">
                    <circle r="2.05" fill="currentColor"/>
                    <g strokeWidth="1.2">
                      <ellipse rx="11" ry="4.2"/>
                      <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
                      <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
                    </g>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-cyan-400 transition-all font-mono">React 19</span>
              </div>

              {/* TypeScript */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-[#3178C6]/20 border border-[#3178C6]/40 flex items-center justify-center shadow-lg group-hover:border-[#3178C6] group-hover:bg-[#3178C6]/40 group-hover:shadow-blue-500/20 transition-all">
                  <div className="w-7 h-7 rounded bg-[#3178C6] text-white flex items-end justify-end p-0.5 font-black text-[10px] leading-none font-mono">
                    TS
                  </div>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-[#3178C6] transition-all font-mono">TypeScript</span>
              </div>

              {/* JavaScript */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-yellow-950/30 border border-yellow-500/30 flex items-center justify-center shadow-lg group-hover:border-yellow-400 group-hover:bg-yellow-950/60 group-hover:shadow-yellow-500/20 transition-all">
                  <div className="w-7 h-7 rounded bg-yellow-400 text-black flex items-end justify-end p-0.5 font-black text-[10px] leading-none font-mono">
                    JS
                  </div>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-yellow-400 transition-all font-mono">JavaScript</span>
              </div>

              {/* Node.js */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-center shadow-lg group-hover:border-emerald-400 group-hover:bg-emerald-950/60 group-hover:shadow-emerald-500/20 transition-all">
                  <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1.407a1.69 1.69 0 0 0-.84.225L2.476 6.643a1.69 1.69 0 0 0-.846 1.465v9.784c0 .604.32 1.16.846 1.465l8.684 5.011a1.69 1.69 0 0 0 1.68 0l8.684-5.011a1.69 1.69 0 0 0 .846-1.465V8.108c0-.604-.32-1.16-.846-1.465L12.84 1.632a1.69 1.69 0 0 0-.84-.225zm0 2.215l7.55 4.359-7.55 4.359-7.55-4.359z"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-emerald-400 transition-all font-mono">Node.js 20</span>
              </div>

              {/* Supabase */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-center shadow-lg group-hover:border-emerald-400 group-hover:bg-emerald-950/60 group-hover:shadow-emerald-500/20 transition-all">
                  <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.362 9.354H12V.301L2.638 14.646H12v9.053l9.362-14.345z"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-emerald-400 transition-all font-mono">Supabase</span>
              </div>

              {/* Docker */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-sky-950/30 border border-sky-500/30 flex items-center justify-center shadow-lg group-hover:border-sky-400 group-hover:bg-sky-950/60 group-hover:shadow-sky-500/20 transition-all">
                  <svg className="w-7 h-7 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.983 11h2.119v2.119h-2.119zM11.025 11h2.119v2.119h-2.119zM8.067 11h2.119v2.119h-2.119zM13.983 8h2.119v2.119h-2.119zM11.025 8h2.119v2.119h-2.119zM8.067 8h2.119v2.119h-2.119zM11.025 5h2.119v2.119h-2.119zM8.067 5h2.119v2.119h-2.119zM5.109 11h2.119v2.119h-2.119zM2.151 11h2.119v2.119h-2.119zM2.151 8h2.119v2.119h-2.119zM2.151 5h2.119v2.119h-2.119zM23.99 11.57c-.033-.034-.583-.566-2.417-.566-2.417 0-3.084 1.484-3.084 1.484s-.367-.167-.917-.167c-1.54 0-2.312.64-2.312.64V18.1s.627.345 1.583.345c2.417 0 4.333-1.667 5.167-3.917.4-1.066.617-2.3.617-2.3l-.034-.658"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-sky-400 transition-all font-mono">Docker</span>
              </div>

              {/* PostgreSQL */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-center shadow-lg group-hover:border-blue-400 group-hover:bg-blue-950/60 group-hover:shadow-blue-500/20 transition-all">
                  <svg className="w-7 h-7 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.968.001C9.697 0 7.37.585 5.568 1.796 2.68 3.737.946 7.159.566 11.04c-.38 3.882.684 7.674 2.923 10.354.276.33.684.52 1.11.52h14.802c.427 0 .835-.19 1.11-.52 2.24-2.68 3.304-6.472 2.924-10.354-.38-3.881-2.115-7.303-5.003-9.244C16.568.585 14.241.001 11.968.001zM12 2.164c3.488 0 6.643 1.866 8.358 4.935 1.714 3.07 1.714 6.797 0 9.867C18.643 20.035 15.488 21.9 12 21.9s-6.643-1.865-8.358-4.934c-1.714-3.07-1.714-6.797 0-9.867C5.357 4.03 8.512 2.164 12 2.164z"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-blue-400 transition-all font-mono">PostgreSQL</span>
              </div>

              {/* Tailwind CSS */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-center shadow-lg group-hover:border-cyan-400 group-hover:bg-cyan-950/60 group-hover:shadow-cyan-500/20 transition-all">
                  <svg className="w-7 h-7 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-cyan-400 transition-all font-mono">Tailwind</span>
              </div>

              {/* Tauri */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-center shadow-lg group-hover:border-amber-400 group-hover:bg-amber-950/60 group-hover:shadow-amber-500/20 transition-all">
                  <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.777 4.223a8.956 8.956 0 0 0-12.664 0A8.956 8.956 0 0 0 4.223 18.777a8.956 8.956 0 0 0 12.664 0 8.956 8.956 0 0 0 1.89-14.554zm-3.693 9.471a5.374 5.374 0 0 1-7.598 0 5.374 5.374 0 0 1 0-7.598 5.374 5.374 0 0 1 7.598 0 5.374 5.374 0 0 1 0 7.598z"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-amber-400 transition-all font-mono">Tauri v2</span>
              </div>

              {/* GitHub */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900/50 border border-zinc-700/40 flex items-center justify-center shadow-lg group-hover:border-white group-hover:bg-zinc-900/90 group-hover:shadow-white/10 transition-all">
                  <svg className="w-7 h-7 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-white transition-all font-mono">GitHub</span>
              </div>

              {/* Redis */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-center shadow-lg group-hover:border-rose-400 group-hover:bg-rose-950/60 group-hover:shadow-rose-500/20 transition-all">
                  <svg className="w-7 h-7 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L1.5 6v12L12 24l10.5-6V6L12 0zm-1.5 18.75l-6-3.46v-3l6 3.46v3zm0-4.5l-6-3.46v-3l6 3.46v3zm0-4.5l-6-3.46v-3l6 3.46v3zm9 9l-6 3.46v-3l6-3.46v3zm0-4.5l-6 3.46v-3l6-3.46v3zm0-4.5l-6 3.46v-3l6-3.46v3z"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-rose-400 transition-all font-mono">Redis</span>
              </div>

              {/* Stripe */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-center shadow-lg group-hover:border-indigo-400 group-hover:bg-indigo-950/60 group-hover:shadow-indigo-500/20 transition-all">
                  <svg className="w-7 h-7 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C17.519.742 14.821.1 12.3.1 6.844.1 3.01 2.871 3.01 7.218c0 5.922 8.163 6.182 8.163 9.356 0 .979-.81 1.488-2.227 1.488-2.583 0-5.719-1.272-7.51-2.296l-.92 5.568c2.26 1.139 5.378 1.848 8.152 1.848 5.767 0 9.771-2.732 9.771-7.29 0-6.196-8.463-6.425-8.463-9.744z"/>
                  </svg>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-indigo-400 transition-all font-mono">Stripe</span>
              </div>

              {/* Hetzner Cloud */}
              <div className="flex flex-col items-center gap-2.5 group transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-red-950/30 border border-red-500/30 flex items-center justify-center shadow-lg group-hover:border-red-400 group-hover:bg-red-950/60 group-hover:shadow-red-500/20 transition-all">
                  <span className="text-xl font-black text-red-500 tracking-tighter font-mono">H</span>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-red-400 transition-all font-mono">Hetzner Cloud</span>
              </div>
            </div>
          </div>
        </section>

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

        <ConsultationScheduler
          isOpen={isSchedulerOpen}
          onClose={() => setIsSchedulerOpen(false)}
          initialAddonSlug={schedulerAddonSlug}
        />
      </div>
    </LandingDataProvider>
  );
}
