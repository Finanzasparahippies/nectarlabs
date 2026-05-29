'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '../../../lib/api';
import DashboardSidebar from '../../../components/DashboardSidebar';
import Toast from '../../../components/ui/Toast';
import ConfirmModal from '../../../components/ui/ConfirmModal';

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
  theme_color_light?: string;
  accent_color_light?: string;
  bg_color_light?: string;
  card_bg_color_light?: string;
  text_color_light?: string;
  border_color_light?: string;
  pollen_active: boolean;
  pollen_icon: string;
  pollen_color: string;
  pollen_count?: number;
  pollen_blur?: number;
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

  // Light Mode Palette
  const [editThemeColorLight, setEditThemeColorLight] = useState('#C68A1E');
  const [editAccentColorLight, setEditAccentColorLight] = useState('#10B981');
  const [editBgColorLight, setEditBgColorLight] = useState('#FAFAFA');
  const [editCardBgColorLight, setEditCardBgColorLight] = useState('#FFFFFF');
  const [editTextColorLight, setEditTextColorLight] = useState('#111827');
  const [editBorderColorLight, setEditBorderColorLight] = useState('#E5E7EB');

  const [editPollenActive, setEditPollenActive] = useState(true);
  const [editPollenIcon, setEditPollenIcon] = useState('⚫');
  const [editPollenColor, setEditPollenColor] = useState('#C68A1E');
  const [editPollenCount, setEditPollenCount] = useState(6);
  const [editPollenBlur, setEditPollenBlur] = useState(0.2);

  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editWelcomeMessage, setEditWelcomeMessage] = useState('');
  const [editPortalTitle, setEditPortalTitle] = useState('');
  const [editFooterText, setEditFooterText] = useState('');
  const [editRequireCustomerInfo, setEditRequireCustomerInfo] = useState(true);
  const [editAllowedOrigins, setEditAllowedOrigins] = useState('');

  // Undo History & Custom Particle settings
  const [historyLength, setHistoryLength] = useState(0);
  const [customPollenIcon, setCustomPollenIcon] = useState('');
  const [previewDarkMode, setPreviewDarkMode] = useState(true);

  const formStateRef = React.useRef<any>(null);
  const undoStackRef = React.useRef<any[]>([]);

  const getFormSnapshot = () => ({
    editName,
    editSubdomain,
    editCustomDomain,
    editThemeColor,
    editAccentColor,
    editBgColor,
    editCardBgColor,
    editTextColor,
    editBorderColor,
    editThemeColorLight,
    editAccentColorLight,
    editBgColorLight,
    editCardBgColorLight,
    editTextColorLight,
    editBorderColorLight,
    editPollenActive,
    editPollenIcon,
    editPollenColor,
    editPollenCount,
    editPollenBlur,
    editLogoUrl,
    editWelcomeMessage,
    editPortalTitle,
    editFooterText,
    editRequireCustomerInfo,
    editAllowedOrigins,
  });

  useEffect(() => {
    formStateRef.current = getFormSnapshot();
  }, [
    editName, editSubdomain, editCustomDomain, editThemeColor, editAccentColor, editBgColor, editCardBgColor, editTextColor, editBorderColor,
    editThemeColorLight, editAccentColorLight, editBgColorLight, editCardBgColorLight, editTextColorLight, editBorderColorLight,
    editPollenActive, editPollenIcon, editPollenColor, editPollenCount, editPollenBlur,
    editLogoUrl, editWelcomeMessage, editPortalTitle, editFooterText, editRequireCustomerInfo, editAllowedOrigins
  ]);

  const pushToHistory = () => {
    if (formStateRef.current) {
      undoStackRef.current.push(formStateRef.current);
      if (undoStackRef.current.length > 50) {
        undoStackRef.current.shift();
      }
      setHistoryLength(undoStackRef.current.length);
    }
  };

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;
    const previousState = undoStackRef.current.pop();
    setHistoryLength(undoStackRef.current.length);

    if (previousState) {
      setEditName(previousState.editName);
      setEditSubdomain(previousState.editSubdomain);
      setEditCustomDomain(previousState.editCustomDomain);
      setEditThemeColor(previousState.editThemeColor);
      setEditAccentColor(previousState.editAccentColor);
      setEditBgColor(previousState.editBgColor);
      setEditCardBgColor(previousState.editCardBgColor);
      setEditTextColor(previousState.editTextColor);
      setEditBorderColor(previousState.editBorderColor);

      setEditThemeColorLight(previousState.editThemeColorLight);
      setEditAccentColorLight(previousState.editAccentColorLight);
      setEditBgColorLight(previousState.editBgColorLight);
      setEditCardBgColorLight(previousState.editCardBgColorLight);
      setEditTextColorLight(previousState.editTextColorLight);
      setEditBorderColorLight(previousState.editBorderColorLight);

      setEditPollenActive(previousState.editPollenActive);
      setEditPollenIcon(previousState.editPollenIcon);
      setEditPollenColor(previousState.editPollenColor);
      setEditPollenCount(previousState.editPollenCount);
      setEditPollenBlur(previousState.editPollenBlur);

      setEditLogoUrl(previousState.editLogoUrl);
      setEditWelcomeMessage(previousState.editWelcomeMessage);
      setEditPortalTitle(previousState.editPortalTitle);
      setEditFooterText(previousState.editFooterText);
      setEditRequireCustomerInfo(previousState.editRequireCustomerInfo);
      setEditAllowedOrigins(previousState.editAllowedOrigins);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const predefinedIcons = ['⚫', '🌸', '❄️', '✨', '🍂', '🐝'];

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

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

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
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const urlTenantId = urlParams ? urlParams.get('tenant') : null;

        const tenantData = await fetcher('/tenants/');
        setTenants(tenantData);
        if (tenantData.length > 0) {
          let activeTenant = tenantData[0];
          if (urlTenantId) {
            const found = tenantData.find((t: any) => String(t.id) === urlTenantId);
            if (found) activeTenant = found;
          }
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

    setEditThemeColorLight(tenant.theme_color_light || '#C68A1E');
    setEditAccentColorLight(tenant.accent_color_light || '#10B981');
    setEditBgColorLight(tenant.bg_color_light || '#FAFAFA');
    setEditCardBgColorLight(tenant.card_bg_color_light || '#FFFFFF');
    setEditTextColorLight(tenant.text_color_light || '#111827');
    setEditBorderColorLight(tenant.border_color_light || '#E5E7EB');

    setEditPollenActive(tenant.pollen_active !== false); // default to true if undefined
    setEditPollenIcon(tenant.pollen_icon || '⚫');
    setEditPollenColor(tenant.pollen_color || '#C68A1E');
    setEditPollenCount(tenant.pollen_count !== undefined ? tenant.pollen_count : 6);
    setEditPollenBlur(tenant.pollen_blur !== undefined ? tenant.pollen_blur : 0.2);

    const isCustom = !predefinedIcons.includes(tenant.pollen_icon || '⚫');
    if (isCustom) {
      setCustomPollenIcon(tenant.pollen_icon);
    } else {
      setCustomPollenIcon('');
    }

    setEditLogoUrl(tenant.logo_url || '');
    setEditLogoFile(null);
    setEditLogoPreview(null);
    setEditWelcomeMessage(tenant.welcome_message || '');
    setEditPortalTitle(tenant.portal_title || '');
    setEditFooterText(tenant.footer_text || '');
    setEditRequireCustomerInfo(tenant.require_customer_info);
    setEditAllowedOrigins(tenant.allowed_origins || '');
    setDomainValidationResult(null);

    undoStackRef.current = [];
    setHistoryLength(0);
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
      showToast('Configuración de negocio iniciada correctamente.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al inicializar la configuración de tu negocio.', 'error');
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

      formData.append('theme_color_light', editThemeColorLight);
      formData.append('accent_color_light', editAccentColorLight);
      formData.append('bg_color_light', editBgColorLight);
      formData.append('card_bg_color_light', editCardBgColorLight);
      formData.append('text_color_light', editTextColorLight);
      formData.append('border_color_light', editBorderColorLight);

      formData.append('pollen_active', String(editPollenActive));
      formData.append('pollen_icon', editPollenIcon);
      formData.append('pollen_color', editPollenColor);
      formData.append('pollen_count', String(editPollenCount));
      formData.append('pollen_blur', String(editPollenBlur));
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
      showToast('Configuración guardada correctamente.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar los cambios.', 'error');
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
        showToast('Producto actualizado con éxito.', 'success');
      } else {
        const created = await fetcher('/products/', {
          method: 'POST',
          body: formData,
        });
        setProducts(prev => [created, ...prev]);
        showToast('Producto creado con éxito.', 'success');
      }
      setShowProductModal(false);
    } catch (err: any) {
      showToast(err.message || 'Error al guardar el producto.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    setConfirmModal({
      title: 'Eliminar Producto',
      message: '¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await fetcher(`/products/${id}/`, { method: 'DELETE' });
          setProducts(prev => prev.filter(p => p.id !== id));
          showToast('Producto eliminado con éxito.', 'success');
        } catch (err: any) {
          showToast(err.message || 'Error al eliminar el producto.', 'error');
        }
      }
    });
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
        showToast('Usuario actualizado con éxito.', 'success');
      } else {
        const created = await fetcher('/users/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setUsersList(prev => [created, ...prev]);
        showToast('Usuario creado con éxito.', 'success');
      }
      setShowUserModal(false);
    } catch (err: any) {
      showToast(err.message || 'Error al guardar el usuario.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    setConfirmModal({
      title: 'Eliminar Usuario',
      message: '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await fetcher(`/users/${id}/`, { method: 'DELETE' });
          setUsersList(prev => prev.filter(u => u.id !== id));
          showToast('Usuario eliminado con éxito.', 'success');
        } catch (err: any) {
          showToast(err.message || 'Error al eliminar el usuario.', 'error');
        }
      }
    });
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
              <h2 className="text-xl font-black uppercase tracking-wider text-foreground">Activa tu Configuración de Negocio</h2>
              <p className="text-xs text-foreground/50 max-w-sm mx-auto mt-2 leading-relaxed">
                Antes de comenzar a gestionar tus productos y usuarios, define un subdominio y nombre de marca para tu portal comercial.
              </p>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Nombre de tu Negocio / Marca</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="Ej. Mi Tienda Néctar"
                  required
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Subdominio Comercial</label>
                <div className="flex items-center bg-background border border-card-border rounded-xl px-4 py-3 focus-within:border-nectar-gold transition-all">
                  <input
                    type="text"
                    value={newTenantSubdomain}
                    onChange={(e) => setNewTenantSubdomain(e.target.value)}
                    placeholder="mi-negocio"
                    required
                    className="flex-1 bg-transparent text-xs text-foreground focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-nectar-gold pl-2">.nectarlabs.dev</span>
                </div>
                <p className="text-[8px] text-foreground/30 uppercase mt-1">Define la dirección web pública de tu portal de cliente.</p>
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
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeSubTab === 'branding' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
                      }`}
                  >
                    Portal y Negocio
                    {activeSubTab === 'branding' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                  <button
                    onClick={() => setActiveSubTab('colors')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeSubTab === 'colors' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
                      }`}
                  >
                    Colores y Branding
                    {activeSubTab === 'colors' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                  <button
                    onClick={() => setActiveSubTab('products')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeSubTab === 'products' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
                      }`}
                  >
                    Productos
                    {activeSubTab === 'products' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                  <button
                    onClick={() => setActiveSubTab('users')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${activeSubTab === 'users' ? 'text-nectar-gold' : 'text-foreground/45 hover:text-foreground'
                      }`}
                  >
                    Usuarios
                    {activeSubTab === 'users' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nectar-gold"></span>}
                  </button>
                </div>

                {/* Sub Tab Content */}
                {activeSubTab === 'branding' && (
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-card-border pb-4 mb-6">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-nectar-gold">Portal y Negocio</h4>
                        <p className="text-[8px] text-foreground/45 uppercase tracking-wider mt-1">Configuración general de tu portal público</p>
                      </div>

                      {/* History controls */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={historyLength === 0}
                          onClick={handleUndo}
                          className="px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 border border-card-border text-foreground text-[8px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-30 cursor-pointer"
                        >
                          ↩ Deshacer (Ctrl+Z)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            pushToHistory();
                            initTenantFields(selectedTenant!);
                            showToast('Configuración original restaurada.', 'info');
                          }}
                          className="px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                        >
                          ↺ Restaurar Original
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Nombre del Negocio / Portal</label>
                        <input
                          type="text"
                          value={editName}
                          onFocus={pushToHistory}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Título del Portal (Pestaña del Navegador)</label>
                        <input
                          type="text"
                          value={editPortalTitle}
                          onFocus={pushToHistory}
                          onChange={(e) => setEditPortalTitle(e.target.value)}
                          placeholder="Ej. Mi Tienda Néctar"
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Logotipo (Subir Archivo)</label>
                        <div className="flex flex-col sm:flex-row gap-4 items-center bg-background border border-card-border rounded-xl p-4">
                          <div className="relative w-16 h-16 rounded-xl border border-card-border overflow-hidden bg-background flex items-center justify-center shrink-0">
                            {editLogoPreview || editLogoUrl ? (
                              <img
                                src={editLogoPreview || editLogoUrl}
                                alt="Logo Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-foreground/30 uppercase font-black text-center p-1">Sin Logo</span>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                pushToHistory();
                                const file = e.target.files?.[0];
                                if (file) {
                                  setEditLogoFile(file);
                                  setEditLogoPreview(URL.createObjectURL(file));
                                }
                              }}
                              className="text-xs text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-foreground/5 file:text-foreground hover:file:bg-foreground/10 w-full"
                            />
                            {(editLogoPreview || editLogoUrl) && (
                              <button
                                type="button"
                                onClick={() => {
                                  pushToHistory();
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
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">O URL Externa del Logo</label>
                        <input
                          type="url"
                          value={editLogoUrl}
                          onFocus={pushToHistory}
                          onChange={(e) => setEditLogoUrl(e.target.value)}
                          placeholder="https://ejemplo.com/logo.png"
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-card-border">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Subdominio del Negocio</label>
                        <div className="flex items-center bg-background border border-card-border rounded-xl px-4 py-3 focus-within:border-nectar-gold transition-all">
                          <input
                            type="text"
                            value={editSubdomain}
                            onFocus={pushToHistory}
                            onChange={(e) => setEditSubdomain(e.target.value)}
                            required
                            className="flex-1 bg-transparent text-xs text-foreground focus:outline-none"
                          />
                          <span className="text-[10px] font-bold text-nectar-gold pl-2">.nectarlabs.dev</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Dominio Personalizado (CNAME Mapping)</label>
                        <input
                          type="text"
                          value={editCustomDomain}
                          onFocus={pushToHistory}
                          onChange={(e) => setEditCustomDomain(e.target.value)}
                          placeholder="Ej. tienda.minegocio.com"
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                        />
                        <p className="text-[8px] text-foreground/30 uppercase mt-1">
                          Apunta tu CNAME en tu proveedor de DNS hacia <span className="text-nectar-gold">nectarlabs.dev</span>.
                        </p>

                        {editCustomDomain.trim() && (
                          <div className="mt-3 space-y-3">
                            <button
                              type="button"
                              onClick={handleValidateDomain}
                              disabled={isValidatingDomain}
                              className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 border border-card-border text-foreground rounded-lg text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                              {isValidatingDomain ? 'Validando...' : 'Verificar DNS'}
                            </button>
                            {domainValidationResult && (
                              <div
                                className={`p-3 rounded-lg border text-[10px] ${domainValidationResult.is_valid
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
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Mensaje de Bienvenida del Portal</label>
                        <textarea
                          value={editWelcomeMessage}
                          onFocus={pushToHistory}
                          onChange={(e) => setEditWelcomeMessage(e.target.value)}
                          rows={3}
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all resize-none"
                        ></textarea>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Texto de Pie de Página (Footer)</label>
                        <textarea
                          value={editFooterText}
                          onFocus={pushToHistory}
                          onChange={(e) => setEditFooterText(e.target.value)}
                          rows={3}
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all resize-none"
                        ></textarea>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-card-border">
                      <div className="flex items-center justify-between p-4 bg-background/50 border border-card-border rounded-xl">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wide text-foreground">Exigir Registro / Datos de Cliente</h4>
                          <p className="text-[9px] text-foreground/40 uppercase mt-0.5">Exige nombre y correo electrónico antes de permitir iniciar una sesión de soporte o compra.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editRequireCustomerInfo}
                            onChange={(e) => { pushToHistory(); setEditRequireCustomerInfo(e.target.checked); }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-card-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nectar-gold"></div>
                        </label>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Orígenes Permitidos (Widget CORS Security)</label>
                        <textarea
                          value={editAllowedOrigins}
                          onFocus={pushToHistory}
                          onChange={(e) => setEditAllowedOrigins(e.target.value)}
                          placeholder="https://minegocio.com, https://app.minegocio.com"
                          rows={2}
                          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all resize-none"
                        ></textarea>
                        <p className="text-[8px] text-foreground/30 uppercase mt-1">Dominios desde los que se autoriza embeber el widget del portal.</p>
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
                  <form onSubmit={handleSaveSettings} className="space-y-8 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-card-border pb-4 mb-6">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-nectar-gold">Colores y Branding</h4>
                        <p className="text-[8px] text-foreground/45 uppercase tracking-wider mt-1">Configura la identidad de marca de tu Colmena</p>
                      </div>

                      {/* History controls */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={historyLength === 0}
                          onClick={handleUndo}
                          className="px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 border border-card-border text-foreground text-[8px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-30 cursor-pointer"
                        >
                          ↩ Deshacer (Ctrl+Z)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            pushToHistory();
                            initTenantFields(selectedTenant!);
                            showToast('Configuración original restaurada.', 'info');
                          }}
                          className="px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                        >
                          ↺ Restaurar Original
                        </button>
                      </div>
                    </div>

                    {/* Modo Oscuro */}
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Paleta de Colores (Modo Oscuro)</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* 1. Theme Color */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Primario (Tema)</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editThemeColor}
                              onChange={(e) => { pushToHistory(); setEditThemeColor(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editThemeColor}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditThemeColor(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* 2. Accent Color */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Acento</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editAccentColor}
                              onChange={(e) => { pushToHistory(); setEditAccentColor(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editAccentColor}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditAccentColor(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* 3. Text Color */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Texto Principal</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editTextColor}
                              onChange={(e) => { pushToHistory(); setEditTextColor(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editTextColor}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditTextColor(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* 4. Canvas BG Color */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Fondo Lienzo</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editBgColor}
                              onChange={(e) => { pushToHistory(); setEditBgColor(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editBgColor}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditBgColor(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* 5. Card BG Color */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Fondo Tarjetas</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editCardBgColor}
                              onChange={(e) => { pushToHistory(); setEditCardBgColor(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editCardBgColor}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditCardBgColor(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* 6. Border Color */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Bordes y Divisiones</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editBorderColor}
                              onChange={(e) => { pushToHistory(); setEditBorderColor(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editBorderColor}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditBorderColor(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modo Claro */}
                    <div className="space-y-4 pt-6 border-t border-card-border">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Paleta de Colores (Modo Claro)</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* 1. Theme Color Light */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Primario (Tema) Claro</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editThemeColorLight}
                              onChange={(e) => { pushToHistory(); setEditThemeColorLight(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editThemeColorLight}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditThemeColorLight(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* 2. Accent Color Light */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Acento Claro</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editAccentColorLight}
                              onChange={(e) => { pushToHistory(); setEditAccentColorLight(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editAccentColorLight}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditAccentColorLight(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* 3. Text Color Light */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Texto Principal Claro</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editTextColorLight}
                              onChange={(e) => { pushToHistory(); setEditTextColorLight(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editTextColorLight}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditTextColorLight(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* 4. Canvas BG Color Light */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Fondo Lienzo Claro</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editBgColorLight}
                              onChange={(e) => { pushToHistory(); setEditBgColorLight(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editBgColorLight}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditBgColorLight(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* 5. Card BG Color Light */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Fondo Tarjetas Claro</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editCardBgColorLight}
                              onChange={(e) => { pushToHistory(); setEditCardBgColorLight(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editCardBgColorLight}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditCardBgColorLight(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* 6. Border Color Light */}
                        <div className="p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Bordes y Divisiones Claro</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editBorderColorLight}
                              onChange={(e) => { pushToHistory(); setEditBorderColorLight(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editBorderColorLight}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditBorderColorLight(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Mockup Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pt-6 border-t border-card-border">
                      <div
                        className="sm:col-span-2 xl:col-span-3 p-6 rounded-[2rem] border transition-all duration-500 shadow-xl"
                        style={{
                          backgroundColor: previewDarkMode ? editBgColor : editBgColorLight,
                          borderColor: previewDarkMode ? editBorderColor : editBorderColorLight
                        }}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <span
                            className="text-[8px] font-black uppercase tracking-widest opacity-60"
                            style={{ color: previewDarkMode ? editTextColor : editTextColorLight }}
                          >
                            Vista Previa en Tiempo Real
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setPreviewDarkMode(!previewDarkMode)}
                              className="px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all hover:bg-foreground/5"
                              style={{
                                color: previewDarkMode ? editTextColor : editTextColorLight,
                                borderColor: previewDarkMode ? editBorderColor : editBorderColorLight
                              }}
                            >
                              {previewDarkMode ? '☀️ Preview Modo Claro' : '🌙 Preview Modo Oscuro'}
                            </button>
                            <span
                              className="w-3 h-3 rounded-full animate-pulse"
                              style={{
                                backgroundColor: previewDarkMode ? editThemeColor : editThemeColorLight,
                                boxShadow: `0 0 12px ${previewDarkMode ? editThemeColor : editThemeColorLight}`
                              }}
                            ></span>
                          </div>
                        </div>

                        <div
                          className="p-6 rounded-2xl border space-y-3 transition-all duration-300"
                          style={{
                            backgroundColor: previewDarkMode ? editCardBgColor : editCardBgColorLight,
                            borderColor: previewDarkMode ? editBorderColor : editBorderColorLight
                          }}
                        >
                          <h5
                            className="text-xs font-black uppercase tracking-widest"
                            style={{ color: previewDarkMode ? editThemeColor : editThemeColorLight }}
                          >
                            Módulo Principal
                          </h5>
                          <p
                            className="text-[10px] leading-relaxed font-semibold"
                            style={{ color: previewDarkMode ? editTextColor : editTextColorLight }}
                          >
                            Esta tarjeta simula la combinación exacta de colores para el fondo, bordes, tarjetas y fuentes de tu portal público.
                          </p>
                          <div className="flex gap-2 pt-2">
                            <span
                              className="px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                              style={{
                                backgroundColor: previewDarkMode ? editAccentColor : editAccentColorLight,
                                color: '#FFFFFF'
                              }}
                            >
                              Botón de Acción
                            </span>
                            <span
                              className="px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all"
                              style={{
                                borderColor: previewDarkMode ? editBorderColor : editBorderColorLight,
                                color: previewDarkMode ? editTextColor : editTextColorLight
                              }}
                            >
                              Secundario
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Visual Effect Customization Section */}
                    <div className="pt-6 border-t border-card-border space-y-6">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-nectar-gold">Efecto Visual de la Colmena</h4>
                        <p className="text-[8px] text-foreground/45 uppercase tracking-wider mt-1">Configura las partículas animadas que caen en tu portal público</p>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl">
                        <input
                          type="checkbox"
                          id="pollen-active"
                          checked={editPollenActive}
                          onChange={(e) => { pushToHistory(); setEditPollenActive(e.target.checked); }}
                          className="w-4 h-4 rounded border-card-border bg-background text-nectar-gold focus:ring-nectar-gold cursor-pointer"
                        />
                        <label htmlFor="pollen-active" className="text-[10px] font-black uppercase tracking-widest text-foreground cursor-pointer select-none">
                          Activar lluvia de partículas / polen en el portal público
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Particle Icon Select */}
                        <div className="space-y-2 p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Icono del Efecto</label>
                          <select
                            value={predefinedIcons.includes(editPollenIcon) ? editPollenIcon : 'custom'}
                            onChange={(e) => {
                              pushToHistory();
                              const val = e.target.value;
                              if (val === 'custom') {
                                setEditPollenIcon(customPollenIcon || '⭐');
                              } else {
                                setEditPollenIcon(val);
                              }
                            }}
                            className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-bold appearance-none cursor-pointer"
                          >
                            <option value="⚫">⚫ Punto Clásico</option>
                            <option value="🌸">🌸 Pétalo de Flor</option>
                            <option value="❄️">❄️ Copo de Nieve</option>
                            <option value="✨">✨ Destello Mágico</option>
                            <option value="🍂">🍂 Hoja de Otoño</option>
                            <option value="🐝">🐝 Abeja Forrajera</option>
                            <option value="custom">✨ Personalizado (Emoji / Carácter)</option>
                          </select>

                          {!predefinedIcons.includes(editPollenIcon) && (
                            <div className="mt-2 space-y-1">
                              <label className="text-[8px] font-black uppercase tracking-widest text-foreground/40">Emoji o Carácter Personalizado</label>
                              <input
                                type="text"
                                maxLength={10}
                                value={editPollenIcon}
                                onFocus={pushToHistory}
                                onChange={(e) => {
                                  setEditPollenIcon(e.target.value);
                                  setCustomPollenIcon(e.target.value);
                                }}
                                placeholder="Ej: ⭐, 🍯, 🎈"
                                className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-bold"
                              />
                            </div>
                          )}
                        </div>

                        {/* Particle Color Picker */}
                        <div className="space-y-2 p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Color de las Partículas</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editPollenColor}
                              onChange={(e) => { pushToHistory(); setEditPollenColor(e.target.value); }}
                              className="shrink-0 w-11 h-11 rounded-xl cursor-pointer border border-card-border bg-transparent p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-105"
                            />
                            <input
                              type="text"
                              value={editPollenColor}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditPollenColor(e.target.value)}
                              className="flex-1 bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-nectar-gold uppercase text-center font-mono font-bold tracking-wider"
                            />
                          </div>
                        </div>

                        {/* Particle Count Input */}
                        <div className="space-y-2 p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Cantidad de Partículas</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={editPollenCount}
                            onFocus={pushToHistory}
                            onChange={(e) => setEditPollenCount(parseInt(e.target.value) || 6)}
                            className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold font-bold"
                          />
                          <p className="text-[8px] text-foreground/30 uppercase mt-1">Controla cuántas partículas flotan simultáneamente en la pantalla.</p>
                        </div>

                        {/* Particle Blur Strength */}
                        <div className="space-y-2 p-4 bg-foreground/[0.01] border border-card-border/40 rounded-2xl">
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 block">Desenfoque de Partículas (Blur en px)</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={10}
                              step={0.1}
                              value={editPollenBlur}
                              onFocus={pushToHistory}
                              onChange={(e) => setEditPollenBlur(parseFloat(e.target.value) || 0)}
                              className="flex-1 accent-nectar-gold cursor-pointer"
                            />
                            <span className="w-12 bg-background border border-card-border rounded-xl py-2 text-center text-xs font-mono font-bold text-foreground">
                              {editPollenBlur}px
                            </span>
                          </div>
                          <p className="text-[8px] text-foreground/30 uppercase mt-1">Nivel de desenfoque aplicado a cada partícula para dar profundidad.</p>
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
                      <h3 className="text-xs font-black uppercase tracking-wider text-foreground/40">Mis Productos</h3>
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
                                <span className="text-[10px] text-foreground/20 uppercase font-black">📦</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-foreground truncate">{prod.name}</h4>
                              <p className="text-[10px] text-foreground/50 truncate max-w-[200px]">{prod.description || 'Sin descripción'}</p>
                              <div className="flex gap-3 items-center mt-1">
                                <span className="text-xs font-bold text-nectar-gold">${prod.price}</span>
                                <span className="text-[8px] font-black uppercase tracking-wider text-foreground/30">Stock: {prod.stock}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditProduct(prod)}
                              className="p-2 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-lg border border-card-border"
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
                      <h3 className="text-xs font-black uppercase tracking-wider text-foreground/40">Usuarios de mi Negocio</h3>
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
                                <span className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-full ${userItem.role === 'BUSINESS'
                                    ? 'bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/20'
                                    : 'bg-foreground/5 text-foreground/70 border border-card-border/50'
                                  }`}>
                                  {userItem.role}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="inline-flex gap-2">
                                  <button
                                    onClick={() => openEditUser(userItem)}
                                    className="px-2 py-1 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded text-[10px]"
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
                    <span className="text-[8px] font-black uppercase tracking-widest text-foreground/30">Vista Previa Visual</span>
                    <h4 className="text-xs font-black uppercase text-foreground tracking-tight mt-2">Portal Comercial</h4>
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

                  <span className="text-[7.5px] font-black tracking-widest uppercase text-foreground/20">
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
        <div
          onClick={() => setShowProductModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card-bg border border-card-border rounded-[2rem] max-w-md w-full p-8 relative space-y-6 cursor-default"
          >
            <h3 className="text-xl font-black uppercase tracking-wide text-foreground">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/45">Nombre del Producto</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/45">Descripción</label>
                <textarea
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-foreground/45">Precio (MXN)</label>
                  <input
                    type="number"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    required
                    min="0"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-foreground/45">Stock</label>
                  <input
                    type="number"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    required
                    min="0"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/45">Imagen del Producto (Archivo)</label>
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
                    className="text-xs text-foreground w-full file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-foreground/5 file:text-foreground hover:file:bg-foreground/10"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-3 bg-foreground/5 hover:bg-foreground/10 border border-card-border text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
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
        <div
          onClick={() => setShowUserModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card-bg border border-card-border rounded-[2rem] max-w-md w-full p-8 relative space-y-6 cursor-default"
          >
            <h3 className="text-xl font-black uppercase tracking-wide text-foreground">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/45">Username</label>
                <input
                  type="text"
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  required
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/45">Correo Electrónico</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/45">Contraseña {editingUser && '(Dejar vacío para mantener)'}</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  required={!editingUser}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/45">Rol de Usuario</label>
                <select
                  value={userRoleSelect}
                  onChange={(e) => setUserRoleSelect(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-nectar-gold transition-all appearance-none"
                >
                  <option value="CUSTOMER" className="bg-background text-foreground">Cliente Final / Customer</option>
                  <option value="ANALYST" className="bg-background text-foreground">Analista / Analyst</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-3 bg-foreground/5 hover:bg-foreground/10 border border-card-border text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(null);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
