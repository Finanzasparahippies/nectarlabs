'use client';

import React, { useEffect, useState } from 'react';
import { fetcher } from '../../lib/api';
import Navbar from '../../components/Navbar';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');

  useEffect(() => {
    fetcher('/faqs/')
      .then(data => {
        setFaqs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching FAQs:", err);
        setLoading(false);
      });
  }, []);

  const filteredFaqs = activeCategory === 'ALL' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-background pb-24 px-6">
      <Navbar />
      <div className="max-w-4xl mx-auto pt-48">
        <h1 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter">Transparencia Radical: FAQ</h1>
        
        <div className="flex gap-4 mb-12 overflow-x-auto pb-4">
          {['ALL', 'TECHNICAL', 'BILLING', 'GENERAL'].map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-nectar-lime text-nectar-black' : 'bg-white/5 border border-white/10'}`}
            >
              {cat === 'ALL' ? 'Todos' : cat}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {filteredFaqs.map(faq => (
            <div key={faq.id} className="p-8 rounded-2xl bg-nectar-black border border-white/5 hover:border-white/10 transition-all">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-nectar-lime"></span>
                {faq.question}
              </h3>
              <p className="text-foreground/60 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
