'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetcher } from '@/lib/api';

interface TenantPageData {
  id: string;
  title: string;
  slug: string;
  page_type: string;
  is_homepage: boolean;
  is_standalone_isolated: boolean;
  hero_title?: string;
  hero_subtitle?: string;
  hero_image_url?: string;
  cta_text?: string;
  cta_url?: string;
  content_json?: any;
  custom_html?: string;
  meta_title?: string;
  meta_description?: string;
}

export default function TenantSubPage() {
  const params = useParams();
  const subdomain = params?.subdomain as string;
  const slug = params?.slug as string;

  const [page, setPage] = useState<TenantPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subdomain || !slug) return;

    let isMounted = true;
    setLoading(true);

    fetcher(`/api/tenant-pages/?subdomain=${subdomain}&slug=${slug}`)
      .then((data) => {
        if (!isMounted) return;
        const pageItem = Array.isArray(data) ? data[0] : (data?.results?.[0] || data);
        if (pageItem && pageItem.slug === slug) {
          setPage(pageItem);
        } else {
          setError('Página no encontrada.');
        }
      })
      .catch((err) => {
        if (isMounted) setError('No se pudo cargar la página.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [subdomain, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020403] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#C68A1E]" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-[#020403] text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-4xl font-bold mb-4">404 - Página no encontrada</h1>
        <p className="text-gray-400 mb-6">{error || 'La página que buscas no existe o ha sido despublicada.'}</p>
        <a href="/" className="px-6 py-2 bg-[#C68A1E] text-black font-semibold rounded-lg hover:opacity-90">
          Volver al Inicio
        </a>
      </div>
    );
  }

  // Si la página está marcada como 100% aislada (standalone), renderizar código HTML/JS/CSS limpio sin layout
  if (page.is_standalone_isolated || page.page_type === 'ISOLATED_CODE') {
    return (
      <div 
        className="w-screen h-screen overflow-auto bg-[#020403]"
        dangerouslySetInnerHTML={{ __html: page.custom_html || `<div class="p-8 text-white">${page.title}</div>` }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#020403] text-white font-sans flex flex-col">
      {/* Header básico de navegación de retorno */}
      <header className="border-b border-[#151F18] p-4 bg-[#050a06]/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <a href="/" className="text-lg font-bold text-[#C68A1E] hover:underline">
          ← Volver al Inicio
        </a>
        <h1 className="text-xl font-bold">{page.title}</h1>
        <div />
      </header>

      {/* Contenido principal de la sub-página */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8">
        {page.hero_title && (
          <section className="text-center py-12 border-b border-[#151F18]">
            <h1 className="text-4xl font-extrabold mb-4">{page.hero_title}</h1>
            {page.hero_subtitle && <p className="text-lg text-gray-300 max-w-2xl mx-auto">{page.hero_subtitle}</p>}
            {page.cta_text && page.cta_url && (
              <a 
                href={page.cta_url} 
                className="inline-block mt-6 px-8 py-3 bg-[#C68A1E] text-black font-bold rounded-lg shadow-lg hover:opacity-90 transition-all"
              >
                {page.cta_text}
              </a>
            )}
          </section>
        )}

        {page.custom_html ? (
          <div dangerouslySetInnerHTML={{ __html: page.custom_html }} />
        ) : (
          <article className="prose prose-invert max-w-none text-gray-200">
            <p>{page.hero_subtitle || 'Bienvenido a la página.'}</p>
          </article>
        )}
      </main>

      <footer className="border-t border-[#151F18] p-6 text-center text-sm text-gray-500 bg-[#050a06]">
        &copy; {new Date().getFullYear()} Nectar-Labs Multi-Tenant. Todos los derechos reservados.
      </footer>
    </div>
  );
}
