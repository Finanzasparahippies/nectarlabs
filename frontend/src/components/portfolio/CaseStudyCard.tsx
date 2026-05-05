import React from 'react';
import Link from 'next/link';

interface CaseStudy {
  title: string;
  slug: string;
  featured_image: string | null;
  tech_stack: string[];
}

export default function CaseStudyCard({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <Link href={`/portfolio/${caseStudy.slug}`} className="group block relative overflow-hidden rounded-premium border border-card-border bg-card-bg transition-all hover:border-nectar-gold/50">

      <div className="aspect-video relative overflow-hidden bg-white/5">
        {caseStudy.featured_image ? (
          <img 
            src={caseStudy.featured_image} 
            alt={caseStudy.title}
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/20 font-bold uppercase tracking-widest text-xs bg-gradient-to-br from-nectar-purple/20 to-nectar-ruby/20">
            Preview No Disponible
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex gap-2 mb-4">
          {caseStudy.tech_stack.slice(0, 3).map((tech, i) => (
            <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-foreground/40 uppercase tracking-tighter">
              {tech}
            </span>
          ))}
        </div>
        <h3 className="text-xl font-bold group-hover:text-nectar-coral transition-colors">{caseStudy.title}</h3>
      </div>
    </Link>
  );
}
