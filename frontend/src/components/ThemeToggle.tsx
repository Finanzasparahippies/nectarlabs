'use client';

import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<'light' | 'dark'>;
      setTheme(customEvent.detail);
    };

    window.addEventListener('theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    window.dispatchEvent(new CustomEvent('theme-change', { detail: nextTheme }));
  };

  if (!mounted) {
    return (
      <div className="w-18 h-9 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse border border-transparent shrink-0" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-18 h-9 rounded-full border transition-all duration-500 overflow-hidden flex items-center hover:scale-105 active:scale-95 group shrink-0 ${
        theme === 'light'
          ? 'bg-gradient-to-r from-sky-400 via-amber-200 to-amber-100 border-amber-300/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]'
          : 'bg-gradient-to-r from-slate-950 via-indigo-950 to-nectar-forest border-nectar-gold/30 shadow-[0_0_15px_rgba(198,138,30,0.15),inset_0_2px_4px_rgba(0,0,0,0.4)]'
      }`}
      aria-label="Alternar Tema"
    >
      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-nectar-gold/0 to-nectar-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      {/* LIGHT MODE BACKGROUND ELEMENTS (Clouds) */}
      <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-500 ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`}>
        {/* Cloud 1 */}
        <svg className="absolute top-[6px] left-[26px] w-[14px] h-[8px] text-white/85 fill-current animate-[pulse_3s_ease-in-out_infinite]" viewBox="0 0 24 16">
          <path d="M19.36 6.005A6 6 0 0 0 8.001 5a5.5 5.5 0 0 0-5.5 5.5c0 .17.008.34.024.507A4.5 4.5 0 0 0 6.5 15h11a5 5 0 0 0 1.86-9.995z"/>
        </svg>
        {/* Cloud 2 */}
        <svg className="absolute top-[18px] left-[14px] w-[10px] h-[6px] text-white/60 fill-current animate-[pulse_4s_ease-in-out_infinite]" viewBox="0 0 24 16">
          <path d="M19.36 6.005A6 6 0 0 0 8.001 5a5.5 5.5 0 0 0-5.5 5.5c0 .17.008.34.024.507A4.5 4.5 0 0 0 6.5 15h11a5 5 0 0 0 1.86-9.995z"/>
        </svg>
      </div>

      {/* DARK MODE BACKGROUND ELEMENTS (Stars) */}
      <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-500 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}>
        {/* Star 1 */}
        <svg className="absolute top-[7px] left-[14px] w-[5px] h-[5px] text-amber-200/90 fill-current animate-pulse" viewBox="0 0 24 24">
          <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.785 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.133 9.21l8.2-1.192z"/>
        </svg>
        {/* Star 2 */}
        <svg className="absolute top-[19px] left-[22px] w-[4px] h-[4px] text-white/80 fill-current animate-pulse [animation-delay:1s]" viewBox="0 0 24 24">
          <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.785 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.133 9.21l8.2-1.192z"/>
        </svg>
        {/* Star 3 */}
        <svg className="absolute top-[11px] left-[30px] w-[4px] h-[4px] text-yellow-100/70 fill-current animate-pulse [animation-delay:0.5s]" viewBox="0 0 24 24">
          <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.785 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.133 9.21l8.2-1.192z"/>
        </svg>
      </div>

      {/* THE MORPHING ORB (Sun / Moon) */}
      <div
        className={`absolute top-1 left-1 w-7 h-7 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden ${
          theme === 'light'
            ? 'translate-x-0 bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_2px_8px_rgba(245,158,11,0.5),0_0_0_4px_rgba(245,158,11,0.15)]'
            : 'translate-x-9 bg-gradient-to-br from-slate-100 to-slate-300 shadow-[0_2px_8px_rgba(255,255,255,0.25),0_0_0_4px_rgba(255,255,255,0.08)]'
        }`}
      >
        {/* Sun Ray Ring (Light Mode only) */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${theme === 'light' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <svg className="w-6 h-6 text-white/30 animate-[spin_10s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3">
            <circle cx="12" cy="12" r="9"/>
          </svg>
        </div>

        {/* Moon Craters (Dark Mode only) */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${theme === 'dark' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          {/* Crater 1 */}
          <div className="absolute top-[6px] left-[6px] w-[5px] h-[5px] rounded-full bg-slate-400/20 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.15)]" />
          {/* Crater 2 */}
          <div className="absolute top-[14px] left-[8px] w-[7px] h-[7px] rounded-full bg-slate-400/20 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.15)]" />
          {/* Crater 3 */}
          <div className="absolute top-[10px] left-[17px] w-[4px] h-[4px] rounded-full bg-slate-400/20 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.15)]" />
        </div>
      </div>
    </button>
  );
}
