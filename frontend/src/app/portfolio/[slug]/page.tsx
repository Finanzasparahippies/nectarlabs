import React from 'react';
import { fetcher } from '../../../lib/api';

export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  const posts = await fetcher('/posts/?is_case_study=true');
  return posts.map((post: any) => ({
    slug: post.slug,
  }));
}

export default async function CaseStudyPage({ params }: { params: { slug: string } }) {
  const post = await fetcher(`/posts/${params.slug}/`);

  return (
    <div className="min-h-screen bg-background pt-32 pb-24 px-6">
      <article className="max-w-4xl mx-auto">
        <header className="mb-12">
          <div className="flex gap-2 mb-6">
            {post.tech_stack.map((tech: string, i: number) => (
              <span key={i} className="px-3 py-1 rounded-full bg-nectar-coral/10 border border-nectar-coral/20 text-nectar-coral text-xs font-bold uppercase tracking-widest">
                {tech}
              </span>
            ))}
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none">{post.title}</h1>
          <div className="flex items-center gap-4 text-foreground/40 text-sm">
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span>Caso de Estudio Ingeniería</span>
          </div>
        </header>

        {post.featured_image && (
          <div className="w-full aspect-video rounded-3xl overflow-hidden mb-16 border border-white/5">
            <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="prose prose-invert prose-nectar max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
        
        <div className="mt-24 p-12 rounded-3xl bg-nectar-purple/5 border border-nectar-purple/20">
          <h3 className="text-2xl font-bold mb-4">¿Te interesa un sistema similar?</h3>
          <p className="text-foreground/60 mb-8 max-w-xl">
            Este proyecto fue desarrollado bajo nuestro modelo de Partner Tecnológico. 
            Podemos implementar una arquitectura robusta para tu negocio hoy mismo.
          </p>
          <button className="px-8 py-4 bg-nectar-lime text-nectar-black font-black rounded-xl hover:scale-105 transition-all">
            Agendar Consulta Técnica
          </button>
        </div>
      </article>
    </div>
  );
}
