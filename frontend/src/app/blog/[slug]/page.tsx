'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetcher } from '../../../lib/api';

interface PostDetail {
  id: number;
  title: string;
  slug: string;
  content: string;
  category_name: string;
  featured_image: string | null;
  created_at: string;
  tech_stack: string[];
}

export default function BlogPostDetail({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = React.use(params);
  const slug = resolvedParams.slug;
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPost() {
      try {
        const data = await fetcher(`/posts/${slug}/`);
        setPost(data);
      } catch (err: any) {
        console.error("Error loading post:", err);
        setError("Lo sentimos, no pudimos encontrar el artículo solicitado.");
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      loadPost();
    }
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Cargando Diarios...</p>
    </div>
  );

  if (error || !post) return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-3xl font-black tracking-tight mb-4 text-red-500">404 - Artículo No Encontrado</h2>
      <p className="text-sm opacity-60 mb-8 max-w-sm">{error || "El artículo que buscas ha sido movido o no existe."}</p>
      <Link href="/blog" className="px-6 py-3 bg-nectar-gold text-background text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all">
        Volver al Blog
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-nectar-gold selection:text-background">
      {/* Top Navbar */}
      <header className="border-b border-card-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-4xl mx-auto px-6 py-6 flex justify-between items-center">
          <Link href="/blog" className="text-[10px] font-black uppercase tracking-widest text-nectar-gold hover:underline flex items-center gap-2">
            <span>←</span> Volver al Blog
          </Link>
          <Link href="/" className="text-sm font-black tracking-tighter">
            NECTAR <span className="text-nectar-gold">LABS</span>
          </Link>
        </div>
      </header>

      {/* Main Article Container */}
      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <article className="space-y-12">
          {/* Header Metadata */}
          <div className="space-y-6 text-center md:text-left">
            <span className="px-4 py-1.5 bg-nectar-gold/10 text-nectar-gold text-[9px] font-black uppercase tracking-widest rounded-full">
              {post.category_name || "Tecnología"}
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none mt-4">
              {post.title}
            </h1>
            <div className="flex justify-center md:justify-start gap-4 text-[10px] font-bold opacity-45 uppercase tracking-wider pt-2">
              <span>Por Néctar Labs</span>
              <span>•</span>
              <time>{new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
            </div>
          </div>

          {/* Featured Image */}
          {post.featured_image && (
            <div className="w-full h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              <img 
                src={post.featured_image} 
                alt={post.title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Tech Stack Pills */}
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {post.tech_stack.map((tech, idx) => (
              <span key={idx} className="px-4 py-2 bg-card-bg border border-card-border text-foreground/75 text-[9px] font-bold rounded-xl uppercase tracking-wider">
                {tech}
              </span>
            ))}
          </div>

          {/* AdSense Top Ad */}
          <div className="border-y border-card-border/40 py-6 my-10 flex flex-col items-center justify-center">
            <span className="text-[6px] font-black tracking-[0.4em] uppercase opacity-25 mb-2">Publicidad</span>
            <ins className="adsbygoogle"
                 style={{ display: 'block', textAlign: 'center' }}
                 data-ad-layout="in-article"
                 data-ad-format="fluid"
                 data-ad-client="ca-pub-2582703158474486"
                 data-ad-slot="auto"></ins>
          </div>

          {/* Post Content */}
          <div 
            className="prose prose-invert prose-nectar max-w-none text-foreground/80 leading-relaxed text-base md:text-lg space-y-6"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* AdSense Bottom Ad */}
          <div className="border-t border-card-border/40 pt-12 mt-16 flex flex-col items-center justify-center">
            <span className="text-[6px] font-black tracking-[0.4em] uppercase opacity-25 mb-4">Publicidad</span>
            <ins className="adsbygoogle"
                 style={{ display: 'block' }}
                 data-ad-client="ca-pub-2582703158474486"
                 data-ad-slot="auto"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border/30 bg-card-bg/10 py-12 text-center text-[9px] font-black uppercase tracking-[0.2em] opacity-45">
        &copy; {new Date().getFullYear()} Néctar Labs. Todos los derechos reservados.
      </footer>
    </div>
  );
}
