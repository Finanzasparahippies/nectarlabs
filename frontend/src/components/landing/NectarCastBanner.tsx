'use client';

import React from 'react';
import Link from 'next/link';

export default function NectarCastBanner() {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-12">
      <div className="relative rounded-[2.5rem] bg-gradient-to-r from-card-bg via-card-bg/90 to-nectar-forest/40 border border-nectar-gold/30 p-8 sm:p-14 overflow-hidden backdrop-blur-xl shadow-2xl">
        {/* Glow Element */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-nectar-gold/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-[10px] sm:text-xs font-black tracking-widest text-nectar-gold uppercase border border-nectar-gold/30 rounded-full bg-nectar-gold/10">
              <span className="w-2 h-2 rounded-full bg-nectar-gold animate-ping" />
              Software Gratuito • Ecosistema Nectar-Labs
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
              Transmite a múltiples redes con <span className="text-nectar-gold italic">Néctar Cast</span> 📡
            </h2>

            <p className="text-sm sm:text-base text-foreground/80 font-medium leading-relaxed mb-6">
              Nuestra aplicación de escritorio 100% portable y local para streamers. Duplica tus transmisiones de OBS Studio hacia YouTube, Facebook, Twitch e Instagram con <strong>0% de consumo de CPU adicional</strong> y chat unificado por voz.
            </p>

            <div className="flex flex-wrap gap-4 text-xs font-bold text-foreground/70">
              <span className="flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 rounded-lg border border-card-border">
                ⚡ Copy Codec (0% CPU)
              </span>
              <span className="flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 rounded-lg border border-card-border">
                🗣️ Chat IA con Voz (TTS)
              </span>
              <span className="flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 rounded-lg border border-card-border">
                💻 Windows • macOS • Linux
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full lg:w-auto shrink-0">
            <Link
              href="/nectarcast"
              className="px-8 py-5 bg-nectar-gold text-background font-black rounded-2xl hover:scale-105 transition-all text-xs uppercase tracking-widest text-center shadow-xl shadow-nectar-gold/20 flex items-center justify-center gap-3 group"
            >
              <span>Descargar Gratis (v0.1.0)</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/nectarcast#downloads"
              className="px-8 py-4 bg-foreground/5 border border-card-border text-foreground hover:bg-foreground/10 font-bold rounded-2xl transition-all text-xs uppercase tracking-widest text-center"
            >
              Ver Enlaces de SO
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
