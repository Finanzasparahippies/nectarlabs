'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '../../../lib/api';
import DashboardSidebar from '../../../components/DashboardSidebar';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  owner: number;
  api_key: string;
  allowed_origins: string;
  custom_domain: string | null;
  theme_color: string;
  accent_color: string;
  bg_color: string;
  card_bg_color: string;
  text_color: string;
  border_color: string;
  logo_url: string | null;
  welcome_message: string;
  portal_title: string | null;
  footer_text: string | null;
  require_customer_info: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string | null;
}

interface UserItem {
  id: number;
  email: string;
  username: string;
  role: string;
}

export default function TenantSettingsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [origin, setOrigin] = useState('https://nectarlabs.dev');
  const [activeSubTab, setActiveSubTab] = useState<'branding' | 'colors' | 'products' | 'users'>('branding');
  
  // DNS verification states
  const [isValidatingDomain, setIsValidatingDomain] = useState(false);
  const [domainValidationResult, setDomainValidationResult] = useState<{ is_valid: boolean; resolved_ip?: string; message: string } | null>(null);

  // New Tenant Form State
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSubdomain, setNewTenantSubdomain] = useState('');
  
  // Edit tenant fields
  const [editName, setEditName] = useState('');
  const [editSubdomain, setEditSubdomain] = useState('');
  const [editCustomDomain, setEditCustomDomain] = useState('');
  const [editThemeColor, setEditThemeColor] = useState('#C68A1E');
  const [editAccentColor, setEditAccentColor] = useState('#10B981');
  const [editBgColor, setEditBgColor] = useState('#020403');
  const [editCardBgColor, setEditCardBgColor] = useState('#050a06');
  const [editTextColor, setEditTextColor] = useState('#FFFFFF');
  const [editBorderColor, setEditBorderColor] = useState('#151F18');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editWelcomeMessage, setEditWelcomeMessage] = useState('');
  const [editPortalTitle, setEditPortalTitle] = useState('');
  const [editFooterText, setEditFooterText] = useState('');
  const [editRequireCustomerInfo, setEditRequireCustomerInfo] = useState(true);
  const [editAllowedOrigins, setEditAllowedOrigins] = useState('');

  // Product Modals & Forms States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPrice, setProductPrice] = useState('0');
  const [productStock, setProductStock] = useState('0');
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);

  // User Modals & Forms States
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRoleSelect, setUserRoleSelect] = useState('CUSTOMER');
  
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    const checkAuth = () => {
      const staff = localStorage.getItem('is_staff') === 'true';
      const role = localStorage.getItem('user_role') || '';
      setUserRole(role);
      setIsStaff((staff || role === 'ADMIN' || role === 'BUSINESS') && role !== 'DESIGNER');
    };

    const loadInitialData = async () => {
      try {
        const tenantData = await fetcher('/tenants/');
        setTenants(tenantData);
        if (tenantData.length > 0) {
          const activeTenant = tenantData[0];
          setSelectedTenant(activeTenant);
          initTenantFields(activeTenant);
          
          // Load products and users scoped to this tenant
          const [productsData, usersData] = await Promise.all([
            fetcher('/products/').catch(() => []),
            fetcher('/users/').catch(() => [])
          ]);
          setProducts(productsData);
          setUsersList(usersData);
        }
      } catch (err) {
        console.error('Error loading tenant settings data:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    loadInitialData();
  }, []);

  const initTenantFields = (tenant: Tenant) => {
    setEditName(tenant.name);
    setEditSubdomain(tenant.subdomain);
    setEditCustomDomain(tenant.custom_domain || '');
    setEditThemeColor(tenant.theme_color || '#C68A1E');
    setEditAccentColor(tenant.accent_color || '#10B981');
    setEditBgColor(tenant.bg_color || '#020403');
    setEditCardBgColor(tenant.card_bg_color || '#050a06');
    setEditTextColor(tenant.text_color || '#FFFFFF');
    setEditBorderColor(tenant.border_color || '#151F18');
    setEditLogoUrl(tenant.logo_url || '');
    setEditLogoFile(null);
    setEditLogoPreview(null);
    setEditWelcomeMessage(tenant.welcome_message || '');
    setEditPortalTitle(tenant.portal_title || '');
    setEditFooterText(tenant.footer_text || '');
    setEditRequireCustomerInfo(tenant.require_customer_info);
    setEditAllowedOrigins(tenant.allowed_origins || '');
    setDomainValidationResult(null);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim() || !newTenantSubdomain.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await fetcher('/tenants/', {
        method: 'POST',
        body: JSON.stringify({
          name: newTenantName.trim(),
          subdomain: newTenantSubdomain.trim().toLowerCase(),
        }),
      });
      setTenants([created]);
      setSelectedTenant(created);
      initTenantFields(created);
      setNewTenantName('');
      setNewTenantSubdomain('');
      alert('Configuración de negocio iniciada correctamente.');
    } catch (err: any) {
      alert(err.message || 'Error al inicializar la configuración de tu negocio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('subdomain', editSubdomain.trim().toLowerCase());
      formData.append('custom_domain', editCustomDomain.trim() || '');
      formData.append('theme_color', editThemeColor);
      formData.append('accent_color', editAccentColor);
      formData.append('bg_color', editBgColor);
      formData.append('card_bg_color', editCardBgColor);
      formData.append('text_color', editTextColor);
      formData.append('border_color', editBorderColor);
      formData.append('welcome_message', editWelcomeMessage.trim());
      formData.append('portal_title', editPortalTitle.trim());
      formData.append('footer_text', editFooterText.trim());
      formData.append('require_customer_info', String(editRequireCustomerInfo));
      formData.append('allowed_origins', editAllowedOrigins.trim());

      if (editLogoFile) {
        formData.append('logo', editLogoFile);
      } else {
        formData.append('logo_url', editLogoUrl.trim() || '');
      }

      const updated = await fetcher(`/tenants/${selectedTenant.id}/`, {
        method: 'PATCH',
        body: formData,
      });

      setTenants([updated]);
      setSelectedTenant(updated);
      initTenantFields(updated);
      alert('Configuración guardada correctamente.');
    } catch (err: any) {
      alert(err.message || 'Error al guardar los cambios.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateDomain = async () => {
    if (!selectedTenant || !editCustomDomain.trim()) return;

    setIsValidatingDomain(true);
    setDomainValidationResult(null);
    try {
      const res = await fetcher(`/tenants/${selectedTenant.id}/validate-domain/`, {
        method: 'POST',
      });
      setDomainValidationResult(res);
    } catch (err: any) {
      setDomainValidationResult({
        is_valid: false,
        message: err.message || 'Error al validar el dominio.',
      });
    } finally {
      setIsValidatingDomain(false);
    }
  };

  // --- PRODUCT MANAGEMENT ---
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductName('');
    setProductDesc('');
    setProductPrice('0');
    setProductStock('0');
    setProductImageFile(null);
    setProductImagePreview(null);
    setShowProductModal(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductName(prod.name);
    setProductDesc(prod.description);
    setProductPrice(String(prod.price));
    setProductStock(String(prod.stock));
    setProductImageFile(null);
    setProductImagePreview(prod.image);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !productPrice || !productStock) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', productName.trim());
      formData.append('description', productDesc.trim());
      formData.append('price', productPrice);
      formData.append('stock', productStock);
      
      if (productImageFile) {
        formData.append('image', productImageFile);
      }

      if (editingProduct) {
        const updated = await fetcher(`/products/${editingProduct.id}/`, {
          method: 'PATCH',
          body: formData,
        });
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
        alert('Producto actualizado con éxito.');
      } else {
        const created = await fetcher('/products/', {
          method: 'POST',
          body: formData,
        });
        setProducts(prev => [created, ...prev]);
        alert('Producto creado con éxito.');
      }
      setShowProductModal(false);
    } catch (err: any) {
      alert(err.message || 'Error al guardar el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
    try {
      await fetcher(`/products/${id}/`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
      alert('Producto eliminado con éxito.');
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el producto.');
    }
  };

  // --- USER MANAGEMENT ---
  const openAddUser = () => {
    setEditingUser(null);
    setUserEmail('');
    setUserUsername('');
    setUserPassword('');
    setUserRoleSelect('CUSTOMER');
    setShowUserModal(true);
  };

  const openEditUser = (user: UserItem) => {
    setEditingUser(user);
    setUserEmail(user.email);
    setUserUsername(user.username);
    setUserPassword('');
    setUserRoleSelect(user.role);
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim() || !userUsername.trim() || (!editingUser && !userPassword)) return;

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        email: userEmail.trim(),
        username: userUsername.trim(),
        role: userRoleSelect,
      };
      
      if (userPassword) {
        payload.password = userPassword;
      }

      if (editingUser) {
        const updated = await fetcher(`/users/${editingUser.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setUsersList(prev => prev.map(u => u.id === updated.id ? updated : u));
        alert('Usuario actualizado con éxito.');
      } else {
        const created = await fetcher('/users/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setUsersList(prev => [created, ...prev]);
        alert('Usuario creado con éxito.');
      }
      setShowUserModal(false);
    } catch (err: any) {
      alert(err.message || 'Error al guardar el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      await fetcher(`/users/${id}/`, { method: 'DELETE' });
      setUsersList(prev => prev.filter(u => u.id !== id));
      alert('Usuario eliminado con éxito.');
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el usuario.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px]">Cargando Configuración...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <DashboardSidebar />

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-12 lg:p-16 overflow-y-auto">
        <header className="mb-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">
            Configuración del Negocio
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-nectar-gold opacity-80 animate-pulse">
            Configuración de tu portal, branding, productos y usuarios
          </p>
        </header>

        {tenants.length === 0 ? (
          /* Empty State - Create Tenant Settings */
          <div className="max-w-xl bg-card-bg border border-card-border rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-nectar-gold/5 blur-3xl"></div>
            
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-nectar-gold/10 text-nectar-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">Activa tu Configuración de Negocio</h2>
              <p className="text-xs text-white/50 max-w-sm mx-auto mt-2 leading-relaxed">
                Antes de comenzar a gestionar tus productos y usuarios, define un subdominio y nombre de marca para tu portal comercial.
              </p>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Nombre de tu Negocio / Marca</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="Ej. Mi Tienda Néctar"
                  required
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Subdominio Comercial</label>
                <div className="flex items-center bg-background border border-card-border rounded-xl px-4 py-3 focus-within:border-nectar-gold transition-all">
                  <input
                    type="text"
                    value={newTenantSubdomain}
                    onChange={(e) => setNewTenantSubdomain(e.target.value)}
                    placeholder="mi-negocio"
                    required
                    className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-nectar-gold pl-2">.nectarlabs.dev</span>
                </div>
                <p className="text-[8px] text-white/30 uppercase mt-1">Define la dirección web pública de tu portal de cliente.</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background font-black uppercase tracking-widest text-[10px] rounded-xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 mt-6 cursor-pointer"
              >
                {isSubmitting ? 'Iniciando...' : 'Guardar y Continuar'}
              </button>
            </form>
          </div>
        ) : (
          /* Main Tab Layout */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
            <div className="xl:col-span-12 flex flex-col lg:flex-row gap-8">
              {/* Form Config (70% column width on lg) */}
              <div className="flex-1 bg-card-bg border border-card-border rounded-[3rem] p-8 md:p-10 shadow-xl">
                {/* Form Tabs */}
                <div className="flex border-b border-card-border pb-px mb-8 gap-6 overflow-x-auto">
                  <button
                    onClick={() => setActiveSubTab('branding')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${
                      activeSubTab === 'branding' ? 'text-nectar-gold' : 'text-white/45 hover:text-white'
                    }`}
                  >
                    Portal y Negocio
                    {activeSubTab === 'branding' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                  <button
                    onClick={() => setActiveSubTab('colors')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${
                      activeSubTab === 'colors' ? 'text-nectar-gold' : 'text-white/45 hover:text-white'
                    }`}
                  >
                    Colores y Branding
                    {activeSubTab === 'colors' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                  <button
                    onClick={() => setActiveSubTab('products')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${
                      activeSubTab === 'products' ? 'text-nectar-gold' : 'text-white/45 hover:text-white'
                    }`}
                  >
                    Productos
                    {activeSubTab === 'products' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                  <button
                    onClick={() => setActiveSubTab('users')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${
                      activeSubTab === 'users' ? 'text-nectar-gold' : 'text-white/45 hover:text-white'
                    }`}
                  >
                    Usuarios
                    {activeSubTab === 'users' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                </div>

                {/* Sub Tab Content */}
                {activeSubTab === 'branding' && (
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Nombre del Negocio / Portal</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Título del Portal (Pestaña del Navegador)</label>
                        <input
                          type="text"
                          value={editPortalTitle}
                          onChange={(e) => setEditPortalTitle(e.target.value)}
                          placeholder="Ej. Mi Tienda Néctar"
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Logotipo (Subir Archivo)</label>
                        <div className="flex flex-col sm:flex-row gap-4 items-center bg-background border border-card-border rounded-xl p-4">
                          <div className="relative w-16 h-16 rounded-xl border border-card-border overflow-hidden bg-background flex items-center justify-center shrink-0">
                            {editLogoPreview || editLogoUrl ? (
                              <img
                                src={editLogoPreview || editLogoUrl}
                                alt="Logo Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-white/30 uppercase font-black text-center p-1">Sin Logo</span>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setEditLogoFile(file);
                                  setEditLogoPreview(URL.createObjectURL(file));
                                }
                              }}
                              className="text-xs text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white/5 file:text-white hover:file:bg-white/10 w-full"
                            />
                            {(editLogoPreview || editLogoUrl) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditLogoFile(null);
                                  setEditLogoPreview(null);
                                  setEditLogoUrl('');
                                }}
                                className="text-[8px] font-black uppercase tracking-widest text-red-500 hover:underline block"
                              >
                                Remover Logo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 flex flex-col justify-end">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">O URL Externa del Logo</label>
                        <input
                          type="url"
                          value={editLogoUrl}
                          onChange={(e) => setEditLogoUrl(e.target.value)}
                          placeholder="https://ejemplo.com/logo.png"
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-card-border">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Subdominio del Negocio</label>
                        <div className="flex items-center bg-background border border-card-border rounded-xl px-4 py-3 focus-within:border-nectar-gold transition-all">
                          <input
                            type="text"
                            value={editSubdomain}
                            onChange={(e) => setEditSubdomain(e.target.value)}
                            required
                            className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                          />
                          <span className="text-[10px] font-bold text-nectar-gold pl-2">.nectarlabs.dev</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Dominio Personalizado (CNAME Mapping)</label>
                        <input
                          type="text"
                          value={editCustomDomain}
                          onChange={(e) => setEditCustomDomain(e.target.value)}
                          placeholder="Ej. tienda.minegocio.com"
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                        />
                        <p className="text-[8px] text-white/30 uppercase mt-1">
                          Apunta tu CNAME en tu proveedor de DNS hacia <span className="text-nectar-gold">nectarlabs.dev</span>.
                        </p>
                        
                        {editCustomDomain.trim() && (
                          <div className="mt-3 space-y-3">
                            <button
                              type="button"
                              onClick={handleValidateDomain}
                              disabled={isValidatingDomain}
                              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                              {isValidatingDomain ? 'Validando...' : 'Verificar DNS'}
                            </button>
                            {domainValidationResult && (
                              <div
                                className={`p-3 rounded-lg border text-[10px] ${
                                  domainValidationResult.is_valid
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                                }`}
                              >
                                <p className="font-bold">
                                  {domainValidationResult.is_valid ? '✓ DNS Correcto' : '✗ Configuración DNS incompleta'}
                                </p>
                                <p className="mt-1 opacity-90">{domainValidationResult.message}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-card-border">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Mensaje de Bienvenida del Portal</label>
                        <textarea
                          value={editWelcomeMessage}
                          onChange={(e) => setEditWelcomeMessage(e.target.value)}
                          rows={3}
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all resize-none"
                        ></textarea>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Texto de Pie de Página (Footer)</label>
                        <textarea
                          value={editFooterText}
                          onChange={(e) => setEditFooterText(e.target.value)}
                          rows={3}
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all resize-none"
                        ></textarea>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-card-border">
                      <div className="flex items-center justify-between p-4 bg-background/50 border border-card-border rounded-xl">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wide text-white">Exigir Registro / Datos de Cliente</h4>
                          <p className="text-[9px] text-white/40 uppercase mt-0.5">Exige nombre y correo electrónico antes de permitir iniciar una sesión de soporte o compra.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editRequireCustomerInfo}
                            onChange={(e) => setEditRequireCustomerInfo(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-card-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nectar-gold"></div>
                        </label>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Orígenes Permitidos (Widget CORS Security)</label>
                        <textarea
                          value={editAllowedOrigins}
                          onChange={(e) => setEditAllowedOrigins(e.target.value)}
                          placeholder="https://minegocio.com, https://app.minegocio.com"
                          rows={2}
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all resize-none"
                        ></textarea>
                        <p className="text-[8px] text-white/30 uppercase mt-1">Dominios desde los que se autoriza embeber el widget del portal.</p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-card-border flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background font-black uppercase tracking-widest text-[10px] rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
                      </button>
                    </div>
                  </form>
                )}

                {activeSubTab === 'colors' && (
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold">Paleta de Colores de tu Negocio</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {/* 1. Theme Color */}
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Primario (Tema)</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={editThemeColor}
                            onChange={(e) => setEditThemeColor(e.target.value)}
                            className="w-10 h-10 bg-background border border-card-border rounded-xl cursor-pointer p-1"
                          />
                          <input
                            type="text"
                            value={editThemeColor}
                            onChange={(e) => setEditThemeColor(e.target.value)}
                            className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono"
                          />
                        </div>
                      </div>

                      {/* 2. Accent Color */}
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Acento</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={editAccentColor}
                            onChange={(e) => setEditAccentColor(e.target.value)}
                            className="w-10 h-10 bg-background border border-card-border rounded-xl cursor-pointer p-1"
                          />
                          <input
                            type="text"
                            value={editAccentColor}
                            onChange={(e) => setEditAccentColor(e.target.value)}
                            className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono"
                          />
                        </div>
                      </div>

                      {/* 3. Text Color */}
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Texto Principal</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={editTextColor}
                            onChange={(e) => setEditTextColor(e.target.value)}
                            className="w-10 h-10 bg-background border border-card-border rounded-xl cursor-pointer p-1"
                          />
                          <input
                            type="text"
                            value={editTextColor}
                            onChange={(e) => setEditTextColor(e.target.value)}
                            className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono"
                          />
                        </div>
                      </div>

                      {/* 4. Canvas BG Color */}
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Fondo Lienzo</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={editBgColor}
                            onChange={(e) => setEditBgColor(e.target.value)}
                            className="w-10 h-10 bg-background border border-card-border rounded-xl cursor-pointer p-1"
                          />
                          <input
                            type="text"
                            value={editBgColor}
                            onChange={(e) => setEditBgColor(e.target.value)}
                            className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono"
                          />
                        </div>
                      </div>

                      {/* 5. Card BG Color */}
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Fondo Tarjetas</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={editCardBgColor}
                            onChange={(e) => setEditCardBgColor(e.target.value)}
                            className="w-10 h-10 bg-background border border-card-border rounded-xl cursor-pointer p-1"
                          />
                          <input
                            type="text"
                            value={editCardBgColor}
                            onChange={(e) => setEditCardBgColor(e.target.value)}
                            className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono"
                          />
                        </div>
                      </div>

                      {/* 6. Border Color */}
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/45">Bordes y Divisiones</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={editBorderColor}
                            onChange={(e) => setEditBorderColor(e.target.value)}
                            className="w-10 h-10 bg-background border border-card-border rounded-xl cursor-pointer p-1"
                          />
                          <input
                            type="text"
                            value={editBorderColor}
                            onChange={(e) => setEditBorderColor(e.target.value)}
                            className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nectar-gold uppercase text-center font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-card-border flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-4 bg-nectar-gold hover:bg-nectar-gold/90 text-background font-black uppercase tracking-widest text-[10px] rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? 'Guardando...' : 'Guardar Colores'}
                      </button>
                    </div>
                  </form>
                )}

                {activeSubTab === 'products' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase tracking-wider text-white/40">Mis Productos</h3>
                      <button
                        onClick={openAddProduct}
                        className="px-4 py-2 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer"
                      >
                        + Agregar Producto
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products.map((prod) => (
                        <div key={prod.id} className="p-5 rounded-2xl bg-background border border-card-border flex gap-4 items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-card-bg border border-card-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {prod.image ? (
                                <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] text-white/20 uppercase font-black">📦</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-white truncate">{prod.name}</h4>
                              <p className="text-[10px] text-white/50 truncate max-w-[200px]">{prod.description || 'Sin descripción'}</p>
                              <div className="flex gap-3 items-center mt-1">
                                <span className="text-xs font-bold text-nectar-gold">${prod.price}</span>
                                <span className="text-[8px] font-black uppercase tracking-wider text-white/30">Stock: {prod.stock}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditProduct(prod)}
                              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/25 text-red-500 rounded-lg border border-red-500/10"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                      {products.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-card-border rounded-3xl opacity-30 text-[10px] font-black uppercase tracking-wider">
                          No tienes productos registrados para este negocio.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSubTab === 'users' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase tracking-wider text-white/40">Usuarios de mi Negocio</h3>
                      <button
                        onClick={openAddUser}
                        className="px-4 py-2 bg-nectar-gold hover:bg-nectar-gold/90 text-background text-[9px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer"
                      >
                        + Registrar Usuario
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                            <th className="pb-4">Username</th>
                            <th className="pb-4">Correo Electrónico</th>
                            <th className="pb-4">Rol</th>
                            <th className="pb-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map((userItem) => (
                            <tr key={userItem.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.01] transition-colors">
                              <td className="py-4 font-bold text-xs">{userItem.username}</td>
                              <td className="py-4 text-xs opacity-80 select-all">{userItem.email}</td>
                              <td className="py-4">
                                <span className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-full ${
                                  userItem.role === 'BUSINESS' 
                                    ? 'bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/20' 
                                    : 'bg-white/5 text-white/70 border border-white/10'
                                }`}>
                                  {userItem.role}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="inline-flex gap-2">
                                  <button
                                    onClick={() => openEditUser(userItem)}
                                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px]"
                                  >
                                    Editar
                                  </button>
                                  {userItem.id !== selectedTenant?.owner && (
                                    <button
                                      onClick={() => handleDeleteUser(userItem.id)}
                                      className="px-2 py-1 bg-red-500/10 hover:bg-red-500/25 text-red-500 rounded text-[10px]"
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time branding visual preview (30% column width on lg) */}
              {(activeSubTab === 'branding' || activeSubTab === 'colors') && (
                <div className="w-full lg:w-80 bg-card-bg border border-card-border rounded-[3rem] p-6 flex flex-col items-center justify-between shrink-0 shadow-lg relative overflow-hidden h-[450px]">
                  <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: editThemeColor }}></div>
                  
                  <div className="text-center pt-4">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Vista Previa Visual</span>
                    <h4 className="text-xs font-black uppercase text-white tracking-tight mt-2">Portal Comercial</h4>
                  </div>

                  {/* Mock Widget UI */}
                  <div
                    className="w-full border rounded-2xl p-4 flex flex-col space-y-3 shadow-inner my-4 flex-1"
                    style={{
                      backgroundColor: editBgColor,
                      borderColor: editBorderColor,
                      color: editTextColor
                    }}
                  >
                    <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: editBorderColor }}>
                      {editLogoPreview || editLogoUrl ? (
                        <img
                          src={editLogoPreview || editLogoUrl}
                          alt="Logo"
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                          style={{ backgroundColor: editThemeColor }}
                        >
                          {editName ? editName.substring(0, 1).toUpperCase() : 'S'}
                        </span>
                      )}
                      <div>
                        <p className="text-[9px] font-black uppercase" style={{ color: editTextColor }}>{editName || 'Negocio'}</p>
                        <p className="text-[6.5px] font-bold uppercase tracking-wider" style={{ color: editAccentColor }}>{editSubdomain ? `${editSubdomain}.nectarlabs.dev` : 'Subdominio'}</p>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end space-y-2">
                      <div className="flex justify-start">
                        <div
                          className="border p-2 rounded-xl rounded-tl-none max-w-[90%]"
                          style={{
                            backgroundColor: editCardBgColor,
                            borderColor: editBorderColor,
                            color: editTextColor
                          }}
                        >
                          <p className="text-[9px] leading-relaxed">{editWelcomeMessage || '¡Hola! Bienvenido a nuestro portal.'}</p>
                        </div>
                      </div>

                      {editRequireCustomerInfo && (
                        <div
                          className="border rounded-lg p-2 space-y-1.5"
                          style={{
                            backgroundColor: editCardBgColor,
                            borderColor: editBorderColor
                          }}
                        >
                          <div className="h-4 rounded border opacity-20" style={{ borderColor: editBorderColor }}></div>
                          <div className="h-4 rounded border opacity-20" style={{ borderColor: editBorderColor }}></div>
                          <div className="h-4 rounded flex items-center justify-center text-[7px] font-black uppercase tracking-wider cursor-default" style={{ backgroundColor: editThemeColor, color: editBgColor }}>
                            Ingresar
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[7.5px] font-black tracking-widest uppercase text-white/20">
                    Powered by Néctar Labs
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Product Creation/Editing Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-bg border border-card-border rounded-[2rem] max-w-md w-full p-8 relative space-y-6">
            <h3 className="text-xl font-black uppercase tracking-wide text-white">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Nombre del Producto</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Descripción</label>
                <textarea
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Precio (MXN)</label>
                  <input
                    type="number"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    required
                    min="0"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Stock</label>
                  <input
                    type="number"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    required
                    min="0"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Imagen del Producto (Archivo)</label>
                <div className="flex gap-4 items-center bg-background border border-card-border rounded-xl p-3">
                  <div className="w-10 h-10 bg-card-bg rounded-lg border border-card-border overflow-hidden flex items-center justify-center shrink-0">
                    {productImagePreview ? (
                      <img src={productImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span>📦</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProductImageFile(file);
                        setProductImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="text-xs text-white w-full"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-nectar-gold hover:bg-nectar-gold/90 text-background rounded-xl text-[10px] font-black uppercase tracking-widest transition-all font-bold"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Creation/Editing Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-bg border border-card-border rounded-[2rem] max-w-md w-full p-8 relative space-y-6">
            <h3 className="text-xl font-black uppercase tracking-wide text-white">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Username</label>
                <input
                  type="text"
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  required
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Correo Electrónico</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Contraseña {editingUser && '(Dejar vacío para mantener)'}</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  required={!editingUser}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Rol de Usuario</label>
                <select
                  value={userRoleSelect}
                  onChange={(e) => setUserRoleSelect(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-nectar-gold transition-all appearance-none"
                >
                  <option value="CUSTOMER">Cliente Final / Customer</option>
                  <option value="ANALYST">Analista / Analyst</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-nectar-gold hover:bg-nectar-gold/90 text-background rounded-xl text-[10px] font-black uppercase tracking-widest transition-all font-bold"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
