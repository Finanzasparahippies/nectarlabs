'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetcher } from '../../lib/api';

interface Post {
  id: number;
  title: string;
  slug: string;
  category_name: string;
  featured_image: string | null;
  created_at: string;
  tech_stack: string[];
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [newsletterMsg, setNewsletterMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    async function loadPosts() {
      try {
        const data = await fetcher('/posts/');
        setPosts(data);
      } catch (err) {
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribing(true);
    setNewsletterMsg({ text: '', type: '' });

    try {
      const res = await fetcher('/newsletter/subscribe/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setNewsletterMsg({ text: res.message, type: 'success' });
      setEmail('');
    } catch (err: any) {
      setNewsletterMsg({ text: err.message || "Error al suscribirse.", type: 'error' });
    } finally {
      setSubscribing(false);
    }
  };

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-nectar-gold selection:text-background">
      {/* Top Premium Navbar */}
      <header className="border-b border-card-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <Link href="/" className="text-xl font-black tracking-tighter">
            NECTAR <span className="text-nectar-gold">LABS</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all">
              Inicio
            </Link>
            <Link href="/portfolio" className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all">
              Portafolio
            </Link>
            <Link href="/dashboard" className="px-5 py-2 bg-nectar-gold/10 hover:bg-nectar-gold text-nectar-gold hover:text-background border border-nectar-gold/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Hero Section */}
        <section className="mb-20 text-center md:text-left max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-none">
            DIARIOS DE <span className="text-nectar-gold">INGENIERÍA</span>
          </h1>
          <p className="text-lg text-foreground/60 leading-relaxed font-medium">
            Lecciones de arquitectura de software, escalabilidad, y la transición del caos operativo a sistemas automatizados de alto rendimiento.
          </p>
        </section>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Cargando Conocimiento...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Left Content Area (Asymmetric Grid) */}
            <div className="lg:col-span-2 space-y-16">
              {featuredPost && (
                <article className="group relative overflow-hidden rounded-[2.5rem] bg-card-bg border border-card-border p-8 md:p-12 hover:border-nectar-gold transition-all duration-500 shadow-2xl">
                  {featuredPost.featured_image && (
                    <div className="w-full h-80 rounded-[1.5rem] overflow-hidden mb-8 relative">
                      <img 
                        src={featuredPost.featured_image} 
                        alt={featuredPost.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-6 left-6 px-4 py-2 bg-background/80 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-nectar-gold">
                        Destacado
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="flex gap-4 items-center">
                      <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full">
                        {featuredPost.category_name || "Tecnología"}
                      </span>
                      <time className="text-[10px] font-bold opacity-40 uppercase">
                        {new Date(featuredPost.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </time>
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight group-hover:text-nectar-gold transition-colors">
                      <Link href={`/blog/${featuredPost.slug}`}>
                        {featuredPost.title}
                      </Link>
                    </h2>
                    
                    <div className="flex flex-wrap gap-2 pt-4">
                      {featuredPost.tech_stack.map((tech, idx) => (
                        <span key={idx} className="px-3 py-1 bg-foreground/5 text-foreground/60 text-[8px] font-bold rounded-lg uppercase">
                          {tech}
                        </span>
                      ))}
                    </div>
                    
                    <div className="pt-8">
                      <Link 
                        href={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-nectar-gold hover:underline"
                      >
                        Leer Artículo Completo <span>→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              )}

              {/* Grid for other posts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {otherPosts.map(post => (
                  <article key={post.id} className="group p-8 rounded-[2rem] bg-card-bg border border-card-border hover:border-nectar-gold transition-all duration-500 flex flex-col justify-between">
                    <div>
                      {post.featured_image && (
                        <div className="w-full h-48 rounded-[1.2rem] overflow-hidden mb-6">
                          <img 
                            src={post.featured_image} 
                            alt={post.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div className="flex gap-4 items-center">
                          <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold">
                            {post.category_name || "Tecnología"}
                          </span>
                          <time className="text-[8px] font-bold opacity-40 uppercase">
                            {new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </time>
                        </div>
                        <h3 className="text-xl font-black tracking-tight leading-snug group-hover:text-nectar-gold transition-colors">
                          <Link href={`/blog/${post.slug}`}>
                            {post.title}
                          </Link>
                        </h3>
                      </div>
                    </div>
                    
                    <div className="pt-6">
                      <Link 
                        href={`/blog/${post.slug}`}
                        className="text-[8px] font-black uppercase tracking-widest text-nectar-gold hover:underline"
                      >
                        Leer más <span>→</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {posts.length === 0 && (
                <div className="py-20 text-center border border-dashed border-card-border rounded-[2.5rem] opacity-35">
                  <p className="font-bold uppercase tracking-widest text-xs">Aún no se han publicado artículos.</p>
                </div>
              )}
            </div>

            {/* Right Sidebar (Newsletter & Ads) */}
            <aside className="space-y-12 lg:sticky lg:top-32 h-fit">
              {/* Premium Newsletter Widget */}
              <div className="p-8 rounded-[2.5rem] bg-card-bg border border-card-border relative overflow-hidden group shadow-xl">
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-nectar-gold/5 blur-3xl rounded-full"></div>
                
                <h3 className="text-2xl font-black tracking-tight mb-4">Mantenla <span className="text-nectar-gold">Curada</span></h3>
                <p className="text-xs text-foreground/60 leading-relaxed mb-8">
                  Recibe avances técnicos exclusivos de nuestros proyectos en vivo, lanzamientos arquitectónicos y consejos DevOps directo en tu buzón.
                </p>

                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div>
                    <input 
                      type="email" 
                      placeholder="Tu correo electrónico" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-background border border-card-border focus:border-nectar-gold focus:outline-none rounded-xl text-xs font-bold transition-colors"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={subscribing}
                    className="w-full py-4 bg-nectar-gold text-background hover:scale-[1.02] disabled:opacity-50 text-center rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-nectar-gold/15"
                  >
                    {subscribing ? 'Suscribiendo...' : 'Suscribirse al Newsletter'}
                  </button>
                </form>

                {newsletterMsg.text && (
                  <div className={`mt-4 p-4 rounded-xl text-[10px] font-bold ${newsletterMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {newsletterMsg.text}
                  </div>
                )}
              </div>

              {/* Google AdSense Space */}
              <div className="p-8 rounded-[2.5rem] bg-card-bg/40 border border-dashed border-card-border flex flex-col items-center justify-center min-h-[250px] relative text-center">
                <span className="text-[7px] font-black tracking-[0.4em] uppercase opacity-20 absolute top-4">Patrocinado</span>
                <div className="space-y-2 max-w-[200px]">
                  {/* Google AdSense Element */}
                  <ins className="adsbygoogle"
                       style={{ display: 'block' }}
                       data-ad-client="ca-pub-2582703158474486"
                       data-ad-slot="auto"
                       data-ad-format="auto"
                       data-full-width-responsive="true"></ins>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-25">Publicidad Responsiva</p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border/30 bg-card-bg/10 py-12 text-center text-[9px] font-black uppercase tracking-[0.2em] opacity-45">
        &copy; {new Date().getFullYear()} Néctar Labs. Todos los derechos reservados.
      </footer>
    </div>
  );
}
