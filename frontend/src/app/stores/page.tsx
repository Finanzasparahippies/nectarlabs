'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { fetcher } from '@/lib/api';

interface TenantStore {
  id: string;
  name: string;
  store_category: string;
  subdomain: string;
  logo_url: string | null;
  welcome_message: string;
  custom_domain: string | null;
  use_custom_domain: boolean;
  theme_color?: string;
  accent_color?: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  image: string | null;
  tenant: string | null; // UUID of tenant
}

const CATEGORIES = [
  'Todas',
  'Consumibles',
  'Ropa',
  'Tecnología',
  'Salud',
  'Servicios',
  'General'
];

export default function StoresDirectory() {
  const [tenants, setTenants] = useState<TenantStore[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [activeTab, setActiveTab] = useState<'stores' | 'products'>('stores');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load active tenants and all active products globally
        const [tenantsData, productsData] = await Promise.all([
          fetcher('/tenants/').catch(() => []),
          fetcher('/products/?global=true').catch(() => [])
        ]);
        setTenants(tenantsData);
        setProducts(productsData);
      } catch (err) {
        console.error('Error loading stores directory:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getTenantUrl = (tenant: TenantStore) => {
    if (tenant.use_custom_domain && tenant.custom_domain) {
      return `https://${tenant.custom_domain}`;
    }
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      const protocol = window.location.protocol;
      if (host.includes('localhost')) {
        const port = host.split(':')[1] || '3000';
        return `${protocol}//${tenant.subdomain}.localhost`;
      }
      if (host.includes('127.0.0.1')) {
        const port = host.split(':')[1] || '3000';
        return `${protocol}//${tenant.subdomain}.127.0.0.1`;
      }
      let baseDomain = 'nectarlabs.dev';
      if (host.includes('staging.nectarlabs.dev')) {
        baseDomain = 'staging.nectarlabs.dev';
      }
      return `${protocol}//${tenant.subdomain}.${baseDomain}`;
    }
    return '#';
  };

  // Category filter mapping for partial matches
  const getFilteredTenants = () => {
    let list = tenants;
    if (selectedCategory !== 'Todas') {
      list = tenants.filter(t =>
        (t.store_category || 'General').toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.welcome_message.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const getFilteredProducts = () => {
    let list = products;
    if (selectedCategory !== 'Todas') {
      // Find tenants matching category
      const tenantIdsWithCategory = tenants
        .filter(t => (t.store_category || 'General').toLowerCase().includes(selectedCategory.toLowerCase()))
        .map(t => t.id);
      list = products.filter(p => p.tenant && tenantIdsWithCategory.includes(p.tenant));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const filteredTenants = getFilteredTenants();
  const filteredProducts = getFilteredProducts();

  const getTenantName = (tenantId: string | null) => {
    if (!tenantId) return 'Néctar Store';
    const found = tenants.find(t => t.id === tenantId);
    return found ? found.name : 'Néctar Store';
  };

  const getTenantCategory = (tenantId: string | null) => {
    if (!tenantId) return 'General';
    const found = tenants.find(t => t.id === tenantId);
    return found ? (found.store_category || 'General') : 'General';
  };

  const getProductTenantUrl = (tenantId: string | null) => {
    if (!tenantId) return '#';
    const found = tenants.find(t => t.id === tenantId);
    return found ? getTenantUrl(found) : '#';
  };

  return (
    <div className="min-h-screen bg-[#020403] text-foreground flex flex-col selection:bg-nectar-gold selection:text-background">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-32 sm:pt-40 pb-20">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-nectar-gold/5 rounded-full blur-[150px] -z-10 animate-glow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[150px] -z-10 animate-glow" style={{ animationDelay: '2s' }}></div>

        {/* Header */}
        <header className="mb-12 text-center max-w-2xl mx-auto">
          <span className="inline-block px-5 py-1.5 mb-4 text-[10px] font-black tracking-[0.4em] text-nectar-gold uppercase border border-nectar-gold/25 rounded-full bg-nectar-gold/5">
            Directorio Comercial
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4">
            Explora las <span className="text-nectar-gold italic">Colmenas</span>
          </h1>
          <p className="text-xs md:text-sm text-foreground/50 leading-relaxed uppercase tracking-wider">
            Encuentra tiendas y productos locales integrados en el ecosistema digital de Nectar Labs.
          </p>
        </header>

        {/* Search & Tabs Controls */}
        <div className="mb-12 space-y-6 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-card-bg/40 border border-card-border p-3 rounded-2xl backdrop-blur-xl">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 text-xs">🔍</span>
              <input
                type="text"
                placeholder={activeTab === 'stores' ? "Buscar tiendas por nombre o descripción..." : "Buscar productos por nombre o detalles..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background/50 border border-card-border/60 rounded-xl pl-10 pr-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
              />
            </div>

            {/* Tab selector */}
            <div className="flex bg-background border border-card-border p-1 rounded-xl w-full sm:w-auto shrink-0 select-none">
              <button
                onClick={() => setActiveTab('stores')}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'stores' ? 'bg-nectar-gold text-background' : 'text-foreground/60 hover:text-foreground'
                  }`}
              >
                Tiendas
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-nectar-gold text-background' : 'text-foreground/60 hover:text-foreground'
                  }`}
              >
                Productos
              </button>
            </div>
          </div>

          {/* Categories Horizontal Scroller */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide select-none max-w-full justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 border text-[9px] font-black uppercase tracking-wider rounded-full transition-all shrink-0 cursor-pointer ${selectedCategory === cat
                  ? 'border-nectar-gold bg-nectar-gold/10 text-nectar-gold'
                  : 'border-card-border bg-card-bg/40 text-foreground/50 hover:border-foreground/30 hover:text-foreground'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Cargando directorio...</p>
          </div>
        ) : (
          <>
            {/* STORES TAB VIEW */}
            {activeTab === 'stores' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="group relative bg-card-bg border border-card-border hover:border-nectar-gold/30 rounded-[2.5rem] p-6 md:p-8 flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 shadow-xl hover:shadow-2xl hover:shadow-nectar-gold/5 overflow-hidden"
                  >
                    <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-nectar-gold/5 blur-xl group-hover:scale-150 transition-all duration-700"></div>

                    <div className="space-y-4">
                      {/* Logo and store category */}
                      <div className="flex justify-between items-start">
                        <div className="w-14 h-14 rounded-2xl border border-card-border/80 overflow-hidden bg-background flex items-center justify-center shrink-0 shadow-inner p-1">
                          {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt={tenant.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl font-bold italic text-nectar-gold/50">{tenant.name.charAt(0)}</span>
                          )}
                        </div>
                        <span className="px-3.5 py-1 text-[8px] font-black uppercase tracking-widest text-nectar-gold border border-nectar-gold/20 rounded-full bg-nectar-gold/5">
                          {tenant.store_category || 'General'}
                        </span>
                      </div>

                      {/* Store info */}
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-foreground">{tenant.name}</h3>
                        <p className="text-[10px] font-bold text-nectar-gold tracking-widest uppercase mt-0.5">
                          {tenant.subdomain}.nectarlabs.dev
                        </p>
                        <p className="text-xs text-foreground/50 leading-relaxed mt-3 line-clamp-3">
                          {tenant.welcome_message}
                        </p>
                      </div>
                    </div>

                    {/* Visit Button */}
                    <div className="pt-6 border-t border-card-border mt-6">
                      <a
                        href={getTenantUrl(tenant)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-foreground/5 group-hover:bg-nectar-gold text-foreground group-hover:text-background border border-card-border/85 group-hover:border-nectar-gold rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all duration-300"
                      >
                        <span>Visitar Tienda</span>
                        <span className="text-[11px] group-hover:translate-x-1 transition-transform">→</span>
                      </a>
                    </div>
                  </div>
                ))}

                {filteredTenants.length === 0 && (
                  <div className="col-span-full py-24 text-center border-2 border-dashed border-card-border rounded-3xl opacity-30 text-[10px] font-black uppercase tracking-wider">
                    Ninguna tienda coincide con los criterios de búsqueda.
                  </div>
                )}
              </div>
            )}

            {/* PRODUCTS TAB VIEW */}
            {activeTab === 'products' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="group bg-card-bg border border-card-border hover:border-nectar-gold/25 rounded-[2rem] p-5 flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 shadow-md hover:shadow-2xl hover:shadow-nectar-gold/5"
                  >
                    <div className="space-y-4">
                      {/* Product image */}
                      <div className="aspect-square w-full rounded-2xl bg-[#080d09] border border-card-border overflow-hidden flex items-center justify-center relative shadow-inner">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                          <span className="text-4xl filter grayscale opacity-25">📦</span>
                        )}
                        <span className="absolute top-3 right-3 px-2.5 py-1 text-[7px] font-black uppercase tracking-wider text-nectar-gold border border-nectar-gold/15 bg-background/90 backdrop-blur-md rounded-full shadow-md">
                          {getTenantCategory(prod.tenant)}
                        </span>
                      </div>

                      {/* Product text details */}
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold block">
                          {getTenantName(prod.tenant)}
                        </span>
                        <h3 className="font-bold text-sm text-foreground truncate">{prod.name}</h3>
                        <p className="text-[10px] text-foreground/45 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                          {prod.description || 'Sin descripción disponible.'}
                        </p>
                      </div>
                    </div>

                    {/* Pricing & link */}
                    <div className="pt-4 border-t border-card-border mt-4 flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-foreground/30">Precio</span>
                        <span className="text-sm font-black text-foreground">${prod.price} MXN</span>
                      </div>

                      <a
                        href={getProductTenantUrl(prod.tenant)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-nectar-gold text-background rounded-lg font-black uppercase tracking-widest text-[8px] flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-nectar-gold/10 hover:shadow-nectar-gold/25"
                      >
                        Comprar 🚀
                      </a>
                    </div>
                  </div>
                ))}

                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-24 text-center border-2 border-dashed border-card-border rounded-3xl opacity-30 text-[10px] font-black uppercase tracking-wider">
                    Ningún producto coincide con los criterios de búsqueda.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-6 border-t border-card-border text-center text-xs text-foreground/20 tracking-widest uppercase mt-auto">
        © 2026 Nectar Labs • Tu Socio Tecnológico
      </footer>
    </div>
  );
}
