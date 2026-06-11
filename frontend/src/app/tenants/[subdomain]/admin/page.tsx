'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api';
import Toast from '@/components/ui/Toast';
import ThemeToggle from '@/components/ThemeToggle';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  welcome_message: string;
  portal_title: string | null;
  footer_text: string | null;
  require_customer_info: boolean;
  theme_color: string;
  accent_color: string;
  bg_color: string;
  card_bg_color: string;
  text_color: string;
  border_color: string;
  active_addons?: string[];
  owner: number;
  
  // Custom fields
  stamp_balance?: number;
  newsletter_plan?: 'TRIAL' | 'PREMIUM';
  newsletter_sent_this_month?: number;
  newsletter_extra_credits?: number;
  is_ambassador?: boolean;
  free_stamps_left?: number;
  stamps_used_this_month?: number;
  subscriber_count?: number;
  
  // Custom SMTP
  custom_smtp_host?: string | null;
  custom_smtp_port?: number | null;
  custom_smtp_username?: string | null;
  custom_smtp_from_email?: string | null;
  custom_smtp_use_tls?: boolean;
  has_custom_smtp_password?: boolean;

  // Skydropx
  has_skydropx_api_key?: boolean;
  shipping_markup_percentage?: string;
  shipping_origin_name?: string | null;
  shipping_origin_phone?: string | null;
  shipping_origin_street?: string | null;
  shipping_origin_suburb?: string | null;
  shipping_origin_city?: string | null;
  shipping_origin_state?: string | null;
  shipping_origin_zip_code?: string | null;
}

export default function TenantAdminPage() {
  const params = useParams();
  const router = useRouter();
  const rawSubdomain = params?.subdomain as string;
  const [subdomain, setSubdomain] = useState<string>('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userMe, setUserMe] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'branding' | 'billing' | 'integrations'>('metrics');

  // Customization Form State
  const [editName, setEditName] = useState('');
  const [editPortalTitle, setEditPortalTitle] = useState('');
  const [editWelcomeMessage, setEditWelcomeMessage] = useState('');
  const [editFooterText, setEditFooterText] = useState('');
  const [editRequireCustomerInfo, setEditRequireCustomerInfo] = useState(true);
  
  const [editThemeColor, setEditThemeColor] = useState('#C68A1E');
  const [editAccentColor, setEditAccentColor] = useState('#10B981');
  const [editBgColor, setEditBgColor] = useState('#020403');
  const [editCardBgColor, setEditCardBgColor] = useState('#050a06');
  const [editTextColor, setEditTextColor] = useState('#FFFFFF');
  const [editBorderColor, setEditBorderColor] = useState('#151F18');
  
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Billing tab states
  const [taxProfile, setTaxProfile] = useState<any | null>(null);
  const [billingInfo, setBillingInfo] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [isSavingTaxProfile, setIsSavingTaxProfile] = useState(false);
  const [taxProfileError, setTaxProfileError] = useState<string | null>(null);
  const [invoicingMode, setInvoicingMode] = useState('AUTOMATIC');
  const [buyingPackage, setBuyingPackage] = useState<number | null>(null);

  // Manual Invoices Custom Modal states
  const [showManualInvoiceModal, setShowManualInvoiceModal] = useState(false);
  const [manualRfc, setManualRfc] = useState('');
  const [manualRazonSocial, setManualRazonSocial] = useState('');
  const [manualRegimenFiscal, setManualRegimenFiscal] = useState('601');
  const [manualCodigoPostal, setManualCodigoPostal] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualItems, setManualItems] = useState<Array<{ quantity: number; unit_price: number; description: string }>>([
    { quantity: 1, unit_price: 0, description: '' }
  ]);
  const [isSubmittingManualInvoice, setIsSubmittingManualInvoice] = useState(false);

  // ConfirmModal dynamic state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Cancel Invoice Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelInvoiceId, setCancelInvoiceId] = useState<number | null>(null);
  const [cancelMotive, setCancelMotive] = useState('02');
  const [cancelSubstitution, setCancelSubstitution] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // New Client Modal states
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientUsername, setNewClientUsername] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientEmailVerified, setNewClientEmailVerified] = useState(true);
  const [isSubmittingNewClient, setIsSubmittingNewClient] = useState(false);

  // Tax Profile Form State
  const [rfc, setRfc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [regimenFiscal, setRegimenFiscal] = useState('601');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [privateKeyPassword, setPrivateKeyPassword] = useState('');

  // Integrations state
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [smtpFromEmail, setSmtpFromEmail] = useState('');

  const [skydropxApiKey, setSkydropxApiKey] = useState('');
  const [shippingMarkupPercentage, setShippingMarkupPercentage] = useState('15.00');
  
  const [originName, setOriginName] = useState('');
  const [originPhone, setOriginPhone] = useState('');
  const [originStreet, setOriginStreet] = useState('');
  const [originSuburb, setOriginSuburb] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [originState, setOriginState] = useState('');
  const [originZipCode, setOriginZipCode] = useState('');

  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);

  // Newsletter campaign states
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [showOverLimitModal, setShowOverLimitModal] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignContent, setCampaignContent] = useState('');
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>('');

  // Advanced Marketing customizations state
  const [templateType, setTemplateType] = useState('minimalist');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgOpacity, setBgOpacity] = useState('1.0');
  const [bgSaturation, setBgSaturation] = useState('100');
  const [bgPosition, setBgPosition] = useState('center');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [fontFamily, setFontFamily] = useState('serif');
  const [titleFontFamily, setTitleFontFamily] = useState('serif');
  const [footerFontFamily, setFooterFontFamily] = useState('serif');
  const [emailTitle, setEmailTitle] = useState('');
  const [footerText, setFooterText] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Handle URL query parameters for success/cancel redirects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      if (paymentStatus === 'success') {
        const pkg = urlParams.get('package');
        showToast(`¡Pago exitoso! Se han acreditado ${pkg || ''} timbres a tu balance.`, 'success');
        // Clean URL parameters
        const newUrl = window.location.pathname + '?tab=billing';
        window.history.replaceState({}, '', newUrl);
      } else if (paymentStatus === 'cancel') {
        showToast('La compra de timbres fue cancelada.', 'info');
        const newUrl = window.location.pathname + '?tab=billing';
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  // Initialize active tab from URL param if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'metrics' || tabParam === 'branding' || tabParam === 'billing' || tabParam === 'integrations') {
        setActiveTab(tabParam as any);
      }
    }
  }, [subdomain]);

  const loadBillingData = async () => {
    if (!tenantConfig) return;
    setLoadingBilling(true);
    try {
      try {
        const info = await fetcher(`/billing/info/?tenant_id=${tenantConfig.id}`);
        setBillingInfo(info);
        if (info.tax_profile) {
          setTaxProfile(info.tax_profile);
          setRfc(info.tax_profile.rfc || '');
          setRazonSocial(info.tax_profile.razon_social || '');
          setRegimenFiscal(info.tax_profile.regimen_fiscal || '601');
          setCodigoPostal(info.tax_profile.codigo_postal || '');
        }
      } catch (err: any) {
        console.error('Error fetching billing info:', err);
      }

      const invs = await fetcher(`/billing/invoices/?tenant_id=${tenantConfig.id}`);
      setInvoices(invs.results || invs || []);
    } catch (err: any) {
      console.error('Error loading billing data:', err);
    } finally {
      setLoadingBilling(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'billing' && tenantConfig) {
      loadBillingData();
    }
  }, [activeTab, tenantConfig]);

  const handleBuyStamps = async (size: number) => {
    if (!tenantConfig) return;
    setBuyingPackage(size);
    try {
      const response = await fetcher(`/billing/buy-stamps/?tenant_id=${tenantConfig.id}`, {
        method: 'POST',
        body: JSON.stringify({ package_size: size }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.url) {
        window.location.href = response.url;
      } else {
        showToast('No se recibió la URL de pago de Stripe.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al iniciar la compra de timbres.', 'error');
    } finally {
      setBuyingPackage(null);
    }
  };

  const handleSaveTaxProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantConfig) return;
    setIsSavingTaxProfile(true);
    setTaxProfileError(null);

    try {
      const formData = new FormData();
      formData.append('rfc', rfc.trim().toUpperCase());
      formData.append('razon_social', razonSocial.trim());
      formData.append('regimen_fiscal', regimenFiscal);
      formData.append('codigo_postal', codigoPostal.trim());

      if (cerFile && keyFile && privateKeyPassword) {
        formData.append('cer_file', cerFile);
        formData.append('key_file', keyFile);
        formData.append('password', privateKeyPassword);
      }

      const profile = await fetcher(`/billing/tax-profile/?tenant_id=${tenantConfig.id}`, {
        method: 'POST',
        body: formData,
      });

      // También guardar la preferencia de facturación en el inquilino (Tenant)
      const updatedTenant = await fetcher(`/tenants/${tenantConfig.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invoicing_mode: invoicingMode })
      });

      setTaxProfile(profile);
      setTenantConfig(updatedTenant);
      setPrivateKeyPassword('');
      setCerFile(null);
      setKeyFile(null);
      showToast('Perfil fiscal y certificados CSD guardados con éxito.', 'success');
      loadBillingData();
    } catch (err: any) {
      const msg = err.message || 'Error al guardar perfil fiscal';
      setTaxProfileError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSavingTaxProfile(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: number, motive: string = '02', substitution: string = '') => {
    try {
      const updatedInvoice = await fetcher(`/billing/invoices/${invoiceId}/cancel/?tenant_id=${tenantConfig?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motive, substitution })
      });
      showToast('Cancelación solicitada con éxito.', 'success');
      setInvoices(invoices.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
    } catch (err: any) {
      showToast(err.message || 'Error al solicitar la cancelación.', 'error');
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientEmail.trim()) {
      showToast('El email es obligatorio.', 'warning');
      return;
    }
    setIsSubmittingNewClient(true);
    try {
      const payload: any = {
        email: newClientEmail.trim(),
        role: 'CUSTOMER',
        is_email_verified: newClientEmailVerified
      };
      if (newClientUsername.trim()) payload.username = newClientUsername.trim();
      if (newClientPassword.trim()) payload.password = newClientPassword.trim();
      if (tenantConfig?.id) payload.tenant = parseInt(tenantConfig.id);

      const data = await fetcher('/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      showToast(`Cliente ${data.email} creado con éxito.`, 'success');
      setShowNewClientModal(false);
      setNewClientEmail('');
      setNewClientUsername('');
      setNewClientPassword('');
      setNewClientEmailVerified(true);
    } catch (err: any) {
      showToast(err.message || 'Error al crear el cliente.', 'error');
    } finally {
      setIsSubmittingNewClient(false);
    }
  };

  const handleRetryInvoice = async (invoiceId: number) => {
    try {
      const updatedInvoice = await fetcher(`/billing/invoices/${invoiceId}/retry/?tenant_id=${tenantConfig?.id}`, {
        method: 'POST',
      });
      showToast('Factura timbrada con éxito.', 'success');
      setInvoices(invoices.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
    } catch (err: any) {
      showToast(err.message || 'Error al reintentar el timbrado.', 'error');
    }
  };

  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantConfig) {
      showToast('No se cargó la configuración del portal.', 'warning');
      return;
    }

    for (const item of manualItems) {
      if (!item.description.trim() || item.unit_price <= 0 || item.quantity <= 0) {
        showToast('Todos los conceptos deben tener descripción, cantidad y precio válido.', 'warning');
        return;
      }
    }

    const subtotal = manualItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const total = parseFloat((subtotal * 1.16).toFixed(2));

    setIsSubmittingManualInvoice(true);
    try {
      const response = await fetcher(`/billing/invoices/issue-tenant-to-client/?tenant_id=${tenantConfig.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_info: {
            rfc: manualRfc.trim().toUpperCase(),
            razon_social: manualRazonSocial.trim(),
            regimen_fiscal: manualRegimenFiscal,
            codigo_postal: manualCodigoPostal.trim(),
            email: manualEmail.trim()
          },
          items: manualItems,
          total: total
        })
      });

      showToast('Factura manual emitida y timbrada con éxito.', 'success');
      setShowManualInvoiceModal(false);

      setManualRfc('');
      setManualRazonSocial('');
      setManualRegimenFiscal('601');
      setManualCodigoPostal('');
      setManualEmail('');
      setManualItems([{ quantity: 1, unit_price: 0, description: '' }]);

      loadBillingData();
    } catch (err: any) {
      showToast(err.message || 'Error al crear la factura manual.', 'error');
    } finally {
      setIsSubmittingManualInvoice(false);
    }
  };

  // Parse Subdomain from Route or Hostname
  useEffect(() => {
    if (rawSubdomain) {
      setSubdomain(rawSubdomain);
      return;
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      let parsed = '';
      if (hostname.includes('.staging.nectarlabs.dev')) {
        parsed = hostname.split('.staging.nectarlabs.dev')[0];
      } else if (hostname.includes('.nectarlabs.dev')) {
        parsed = hostname.split('.nectarlabs.dev')[0];
      } else if (hostname.includes('.localhost:3000')) {
        parsed = hostname.split('.localhost:3000')[0];
      } else if (hostname.includes('.localhost:3002')) {
        parsed = hostname.split('.localhost:3002')[0];
      } else if (hostname.includes('.localhost')) {
        parsed = hostname.split('.localhost')[0];
      }

      if (parsed && parsed !== 'www' && parsed !== 'api' && parsed !== 'admin' && parsed !== 'staging') {
        setSubdomain(parsed);
      }
    }
  }, [rawSubdomain]);

  // Load and check credentials
  useEffect(() => {
    if (!subdomain) return;

    const loadAdminData = async () => {
      try {
        // Fetch public tenant info to resolve owner ID and name
        const res = await fetch(`/api/tenants/public-config/?subdomain=${subdomain}`);
        if (!res.ok) throw new Error('Portal no encontrado o inactivo');
        const config: TenantConfig = await res.json();
        setTenantConfig(config);

        // Populate customization states
        setEditName(config.name);
        setEditPortalTitle(config.portal_title || '');
        setEditWelcomeMessage(config.welcome_message);
        setEditFooterText(config.footer_text || '');
        setEditRequireCustomerInfo(config.require_customer_info);
        setEditThemeColor(config.theme_color);
        setEditAccentColor(config.accent_color);
        setEditBgColor(config.bg_color);
        setEditCardBgColor(config.card_bg_color);
        setEditTextColor(config.text_color);
        setEditBorderColor(config.border_color);
        setEditLogoUrl(config.logo_url || '');

        // Fetch current user me to validate ownership
        const me = await fetcher('/users/me/');
        setUserMe(me);

        const isOwner = me.id === config.owner;
        const isSystemAdmin = me.is_staff || me.role === 'ADMIN';

        if (isOwner || isSystemAdmin) {
          setAuthorized(true);
          try {
            const fullConfig = await fetcher(`/tenants/${config.id}/`);
            setTenantConfig(fullConfig);
            setInvoicingMode(fullConfig.invoicing_mode || 'AUTOMATIC');
            setSmtpHost(fullConfig.custom_smtp_host || '');
            setSmtpPort(fullConfig.custom_smtp_port ? String(fullConfig.custom_smtp_port) : '587');
            setSmtpUsername(fullConfig.custom_smtp_username || '');
            setSmtpUseTls(fullConfig.custom_smtp_use_tls ?? true);
            setSmtpFromEmail(fullConfig.custom_smtp_from_email || '');
            setShippingMarkupPercentage(fullConfig.shipping_markup_percentage || '15.00');
            setOriginName(fullConfig.shipping_origin_name || '');
            setOriginPhone(fullConfig.shipping_origin_phone || '');
            setOriginStreet(fullConfig.shipping_origin_street || '');
            setOriginSuburb(fullConfig.shipping_origin_suburb || '');
            setOriginCity(fullConfig.shipping_origin_city || '');
            setOriginState(fullConfig.shipping_origin_state || '');
            setOriginZipCode(fullConfig.shipping_origin_zip_code || '');
          } catch (err) {
            console.error('Error loading full tenant config:', err);
          }
          try {
            const postsData = await fetcher('/posts/', { isPublic: true });
            setBlogPosts(postsData.results || postsData || []);
          } catch (postErr) {
            console.error('Error fetching blog posts for campaigner:', postErr);
          }
        } else {
          setAuthorized(false);
        }
      } catch (err: any) {
        console.error('Error loading admin settings:', err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [subdomain]);

  const getNewsletterLimit = () => {
    if (!tenantConfig) return 1000;
    const baseLimit = tenantConfig.is_ambassador ? 1000 : (tenantConfig.newsletter_plan === 'PREMIUM' || (tenantConfig.active_addons || []).includes('newsletter-campaigner') ? 10000 : 1000);
    return baseLimit + (tenantConfig.newsletter_extra_credits || 0);
  };

  const handleBuyEmailCredits = async () => {
    if (!tenantConfig) return;
    try {
      const response = await fetcher(`/billing/buy-email-credits/?tenant_id=${tenantConfig.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.url) {
        window.location.href = response.url;
      } else {
        showToast('No se recibió la URL de pago de Stripe.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al iniciar la compra de créditos de correo.', 'error');
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantConfig) return;
    setIsSendingCampaign(true);
    try {
      const response = await fetcher('/newsletter/send-campaign/', {
        method: 'POST',
        body: JSON.stringify({
          subject: campaignSubject.trim(),
          title: campaignTitle.trim() || campaignSubject.trim(),
          content: campaignContent.trim(),
          template_type: templateType,
          bg_image_url: bgImageUrl.trim() || null,
          bg_opacity: parseFloat(bgOpacity),
          bg_saturation: parseInt(bgSaturation),
          bg_position: bgPosition,
          cta_text: ctaText.trim() || null,
          cta_link: ctaLink.trim() || null,
          font_family: fontFamily,
          title_font_family: titleFontFamily,
          footer_font_family: footerFontFamily,
          email_title: emailTitle.trim() || null,
          footer_text: footerText.trim() || null,
          image_url: imageUrl.trim() || null
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      showToast(response.message || 'Campaña enviada con éxito.', 'success');
      setShowNewsletterModal(false);
      setCampaignSubject('');
      setCampaignTitle('');
      setCampaignContent('');
      setTemplateType('minimalist');
      setBgImageUrl('');
      setBgOpacity('1.0');
      setBgSaturation('100');
      setBgPosition('center');
      setCtaText('');
      setCtaLink('');
      setFontFamily('serif');
      setTitleFontFamily('serif');
      setFooterFontFamily('serif');
      setEmailTitle('');
      setFooterText('');
      setImageUrl('');
      // Reload tenant config to update sent count
      const updated = await fetcher(`/tenants/${tenantConfig.id}/`);
      setTenantConfig(updated);
    } catch (err: any) {
      showToast(err.message || 'Error al enviar la campaña.', 'error');
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantConfig) return;
    setIsSavingIntegrations(true);
    try {
      const payload: any = {
        custom_smtp_host: smtpHost.trim() || null,
        custom_smtp_port: smtpPort ? parseInt(smtpPort) : null,
        custom_smtp_username: smtpUsername.trim() || null,
        custom_smtp_use_tls: smtpUseTls,
        custom_smtp_from_email: smtpFromEmail.trim() || null,
        shipping_markup_percentage: shippingMarkupPercentage,
        shipping_origin_name: originName.trim() || null,
        shipping_origin_phone: originPhone.trim() || null,
        shipping_origin_street: originStreet.trim() || null,
        shipping_origin_suburb: originSuburb.trim() || null,
        shipping_origin_city: originCity.trim() || null,
        shipping_origin_state: originState.trim() || null,
        shipping_origin_zip_code: originZipCode.trim() || null,
      };

      if (smtpPassword) {
        payload.custom_smtp_password = smtpPassword;
      }
      if (skydropxApiKey) {
        payload.skydropx_api_key = skydropxApiKey;
      }

      const updated = await fetcher(`/tenants/${tenantConfig.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      setTenantConfig(updated);
      setSmtpPassword('');
      setSkydropxApiKey('');
      showToast('Integraciones actualizadas con éxito.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar integraciones.', 'error');
    } finally {
      setIsSavingIntegrations(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantConfig) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('portal_title', editPortalTitle.trim());
      formData.append('welcome_message', editWelcomeMessage.trim());
      formData.append('footer_text', editFooterText.trim());
      formData.append('require_customer_info', String(editRequireCustomerInfo));
      formData.append('theme_color', editThemeColor);
      formData.append('accent_color', editAccentColor);
      formData.append('bg_color', editBgColor);
      formData.append('card_bg_color', editCardBgColor);
      formData.append('text_color', editTextColor);
      formData.append('border_color', editBorderColor);

      if (editLogoFile) {
        formData.append('logo', editLogoFile);
      } else {
        formData.append('logo_url', editLogoUrl.trim());
      }

      const updated = await fetcher(`/tenants/${tenantConfig.id}/`, {
        method: 'PATCH',
        body: formData
      });

      setTenantConfig(updated);
      showToast('Configuración de marca actualizada con éxito.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar configuraciones', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditLogoFile(file);
      setEditLogoPreview(URL.createObjectURL(file));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020403] text-white flex flex-col items-center justify-center font-sans">
        <span className="w-8 h-8 rounded-full border-4 border-t-white border-white/10 animate-spin"></span>
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-white/50">Cargando Panel de Control...</p>
      </div>
    );
  }

  if (!authorized || !tenantConfig) {
    return (
      <div className="min-h-screen bg-[#020403] text-white flex flex-col items-center justify-center font-sans px-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center text-3xl mb-6">
          🔒
        </div>
        <h1 className="text-xl font-black text-white uppercase tracking-widest mb-2">Acceso Denegado</h1>
        <p className="text-sm text-white/50 max-w-sm leading-relaxed">
          No tienes permisos para administrar este portal. Debes iniciar sesión como el propietario del Tenant o administrador del sistema.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="mt-8 px-8 py-3.5 bg-nectar-gold text-background rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-nectar-gold/25 font-bold"
        >
          Iniciar Sesión
        </button>
      </div>
    );
  }

  const activeAddonsList = tenantConfig.active_addons || [];
  const primaryColor = tenantConfig.theme_color || '#C68A1E';

  return (
    <div id="tenant-admin-root" className="min-h-screen flex flex-col font-sans">
      <style>{`
        #tenant-admin-root {
          background-color: ${tenantConfig.bg_color || '#020403'} !important;
          color: ${tenantConfig.text_color || '#FFFFFF'} !important;
        }
        #tenant-admin-root .admin-header {
          background-color: ${tenantConfig.card_bg_color || '#050a06'}80 !important;
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
        }
        #tenant-admin-root .admin-card {
          background-color: ${tenantConfig.card_bg_color || '#050a06'}a0 !important;
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
        }
        #tenant-admin-root .admin-input {
          background-color: ${tenantConfig.bg_color || '#020403'} !important;
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
          color: ${tenantConfig.text_color || '#FFFFFF'} !important;
        }
        #tenant-admin-root .admin-border {
          border-color: ${tenantConfig.border_color || '#151F18'} !important;
        }
      `}</style>

      {/* Header Panel */}
      <header className="border-b backdrop-blur-md sticky top-0 z-40 admin-header">
        <div className="max-w-7xl mx-auto px-6 h-18 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {tenantConfig.logo_url ? (
              <img src={tenantConfig.logo_url} alt={tenantConfig.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
            ) : (
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-background" style={{ backgroundColor: primaryColor }}>
                {tenantConfig.name.substring(0,1).toUpperCase()}
              </span>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black uppercase tracking-tight text-white">{tenantConfig.name}</h1>
                <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/20 text-[6px] font-black rounded-full uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
              <p className="text-[8px] uppercase tracking-widest font-black opacity-50 mt-0.5">Control de Configuración y Add-ons</p>
            </div>
          </div>

          {/* Navigation Tab selectors */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('metrics')}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer"
              style={{
                backgroundColor: activeTab === 'metrics' ? `${primaryColor}15` : 'transparent',
                borderColor: activeTab === 'metrics' ? primaryColor : 'transparent',
                color: activeTab === 'metrics' ? primaryColor : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              📊 Métricas Add-ons
            </button>
            <button
              onClick={() => setActiveTab('branding')}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer"
              style={{
                backgroundColor: activeTab === 'branding' ? `${primaryColor}15` : 'transparent',
                borderColor: activeTab === 'branding' ? primaryColor : 'transparent',
                color: activeTab === 'branding' ? primaryColor : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              🎨 Personalizar Portal
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer"
              style={{
                backgroundColor: activeTab === 'billing' ? `${primaryColor}15` : 'transparent',
                borderColor: activeTab === 'billing' ? primaryColor : 'transparent',
                color: activeTab === 'billing' ? primaryColor : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              🧾 Facturación CFDI
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer"
              style={{
                backgroundColor: activeTab === 'integrations' ? `${primaryColor}15` : 'transparent',
                borderColor: activeTab === 'integrations' ? primaryColor : 'transparent',
                color: activeTab === 'integrations' ? primaryColor : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              🔌 Integraciones
            </button>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-white/80"
            >
              Volver a Néctar
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col">
        {activeTab === 'metrics' && (
          /* Metrics Dashboard */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header info */}
            <div className="admin-card border rounded-[2rem] p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
              <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>
              <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] flex items-center justify-center text-3xl border border-white/5">
                📊
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Analíticas de Ecosistema</h2>
                <p className="text-xs text-white/50 leading-relaxed">
                  Monitorea el uso, tráfico, conversiones y cuotas contratadas de tus módulos activos dentro de tu inquilino de Néctar Labs.
                </p>
              </div>
              <div className="px-4 py-2 bg-foreground/5 rounded-2xl border border-white/5 flex flex-col items-center shrink-0">
                <span className="text-[7px] uppercase font-black tracking-widest text-white/40">Add-ons Contratados</span>
                <span className="text-xl font-black text-nectar-gold mt-1">{activeAddonsList.length} / 6</span>
              </div>
            </div>

            {/* Grid layout for addons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 1. Live Chat */}
              <AddonMetricCard
                slug="live-chat"
                title="Soporte en Vivo (ChatWidget)"
                icon="💬"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Chats Hoy",
                  leftVal: "48",
                  rightLabel: "Resp. Promedio",
                  rightVal: "1.4 min"
                }}
              >
                <div className="h-28 flex items-end justify-between px-2 pt-4">
                  {/* Mock Bar Chart */}
                  {[35, 42, 28, 55, 64, 48, 70].map((h, i) => (
                    <div key={i} className="w-[11%] flex flex-col items-center gap-1.5 group cursor-pointer">
                      <span className="text-[7px] font-mono text-nectar-gold opacity-0 group-hover:opacity-100 transition-opacity">{h}</span>
                      <div className="w-full bg-nectar-gold/10 group-hover:bg-nectar-gold/30 rounded-t-md transition-all duration-300" style={{ height: `${h}%` }}></div>
                      <span className="text-[7px] text-white/30 uppercase font-black tracking-widest">{['L','M','X','J','V','S','D'][i]}</span>
                    </div>
                  ))}
                </div>
              </AddonMetricCard>

              {/* 2. Booking Signature */}
              <AddonMetricCard
                slug="booking-signature"
                title="Agenda y Citas (BookingCanvas)"
                icon="📅"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Citas Confirmadas",
                  leftVal: "112",
                  rightLabel: "Conversión",
                  rightVal: "18.4%"
                }}
              >
                {/* SVG Curve for Appointments */}
                <div className="h-28 relative pt-4 flex items-center justify-center">
                  <svg className="w-full h-20 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient-booking" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Background Fill under line */}
                    <path d="M 0 30 L 10 20 L 30 25 L 50 12 L 70 18 L 90 5 L 100 10 L 100 30 Z" fill="url(#gradient-booking)" />
                    {/* Stroke line */}
                    <path d="M 0 30 L 10 20 L 30 25 L 50 12 L 70 18 L 90 5 L 100 10" fill="none" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Highlight Dot */}
                    <circle cx="90" cy="5" r="2.5" fill="#10B981" className="animate-ping origin-center" />
                    <circle cx="90" cy="5" r="1.5" fill="#FFFFFF" />
                  </svg>
                  <div className="absolute bottom-0 inset-x-0 flex justify-between px-2 text-[6px] text-white/30 font-bold uppercase tracking-widest">
                    <span>Ene</span>
                    <span>Mar</span>
                    <span>May</span>
                  </div>
                </div>
              </AddonMetricCard>

              {/* 3. Logistics GPS */}
              <AddonMetricCard
                slug="logistics-gps"
                title="GPS y Logística (FleetMap)"
                icon="📍"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Vehículos Activos",
                  leftVal: "14",
                  rightLabel: "Entregas Hoy",
                  rightVal: "96.8%"
                }}
              >
                {/* Visual Route Mockup */}
                <div className="h-28 flex flex-col justify-center px-4 space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold">
                      <span className="text-white/60">Camión A-102 (En Ruta)</span>
                      <span className="text-nectar-gold font-mono">82%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-nectar-gold h-full rounded-full animate-[pulse_2s_infinite]" style={{ width: '82%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold">
                      <span className="text-white/60">Camión B-305 (En Reparto)</span>
                      <span className="text-emerald-400 font-mono">94%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                </div>
              </AddonMetricCard>

              {/* 4. Patreon Sponsorship */}
              <AddonMetricCard
                slug="patreon-sponsorship"
                title="Patrocinios (SponsorTiers)"
                icon="💎"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Patrocinadores",
                  leftVal: "384",
                  rightLabel: "Ingresos MRR",
                  rightVal: "$12,450"
                }}
              >
                <div className="h-28 relative pt-4 flex items-center justify-center">
                  <svg className="w-full h-20 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient-patreon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C68A1E" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#C68A1E" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 30 L 15 28 L 30 20 L 45 22 L 60 14 L 75 10 L 90 6 L 100 2 L 100 30 Z" fill="url(#gradient-patreon)" />
                    <path d="M 0 30 L 15 28 L 30 20 L 45 22 L 60 14 L 75 10 L 90 6 L 100 2" fill="none" stroke="#C68A1E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="100" cy="2" r="2.5" fill="#C68A1E" className="animate-ping origin-center" />
                    <circle cx="100" cy="2" r="1.5" fill="#FFFFFF" />
                  </svg>
                  <div className="absolute bottom-0 inset-x-0 flex justify-between px-2 text-[6px] text-white/30 font-bold uppercase tracking-widest">
                    <span>Sem 1</span>
                    <span>Sem 2</span>
                    <span>Sem 3</span>
                    <span>Sem 4</span>
                  </div>
                </div>
              </AddonMetricCard>

              {/* 5. APM / Analítica */}
              <AddonMetricCard
                slug="analytics-apm"
                title="Métricas APM (Telemetry)"
                icon="📊"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Latencia Promedio",
                  leftVal: "142 ms",
                  rightLabel: "Llamadas API",
                  rightVal: "2.4M / mes"
                }}
              >
                {/* SVG APM Ring and Bar */}
                <div className="h-28 flex items-center justify-around px-4 pt-2">
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-white/5" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-emerald-400" strokeDasharray="98, 100" strokeWidth="3.2" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="absolute text-[8px] font-black text-emerald-400 font-mono">99.8%</span>
                  </div>
                  <div className="flex-1 max-w-[120px] flex flex-col justify-center gap-2">
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[7px] font-bold text-white/55">
                        <span>CPU Load</span>
                        <span className="font-mono">24%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: '24%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[7px] font-bold text-white/55">
                        <span>Memory</span>
                        <span className="font-mono">68%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: '68%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </AddonMetricCard>

              {/* 6. Newsletter Campaigner */}
              <AddonMetricCard
                slug="newsletter-campaigner"
                title="Campañas y Boletines (Subscribe)"
                icon="✉️"
                activeList={activeAddonsList}
                primaryColor={primaryColor}
                metrics={{
                  leftLabel: "Suscriptores",
                  leftVal: String(tenantConfig?.subscriber_count ?? 0),
                  rightLabel: tenantConfig?.custom_smtp_host ? "Canal Email" : "Uso de Límite",
                  rightVal: tenantConfig?.custom_smtp_host ? "Propio (SMTP)" : `${Math.min(100, Math.round(((tenantConfig?.newsletter_sent_this_month ?? 0) / getNewsletterLimit()) * 100))}%`
                }}
              >
                <div className="h-28 flex flex-col justify-between px-2 pt-2 pb-1 text-left">
                  <div className="flex items-center justify-around">
                    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-white/5" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-nectar-gold" strokeDasharray={`${tenantConfig?.custom_smtp_host ? 0 : Math.min(100, Math.round(((tenantConfig?.newsletter_sent_this_month ?? 0) / getNewsletterLimit()) * 100))}, 100`} strokeWidth="3.2" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span className="absolute text-[7px] font-black text-nectar-gold font-mono">
                        {tenantConfig?.custom_smtp_host ? '∞' : `${Math.min(100, Math.round(((tenantConfig?.newsletter_sent_this_month ?? 0) / getNewsletterLimit()) * 100))}%`}
                      </span>
                    </div>
                    <div className="text-left space-y-0.5">
                      <span className="text-[6px] uppercase font-black tracking-widest text-white/30 block">Consumo Mensual</span>
                      <h4 className="text-[10px] font-black text-white font-mono leading-none">
                        {tenantConfig?.custom_smtp_host ? 'Ilimitado (BYO SMTP)' : `${tenantConfig?.newsletter_sent_this_month ?? 0} / ${getNewsletterLimit()}`}
                      </h4>
                      <p className="text-[6.5px] text-white/40 font-bold">
                        {tenantConfig?.is_ambassador ? 'Límite Partner Embajador' : 'Límite Plan Regular'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const sent = tenantConfig?.newsletter_sent_this_month ?? 0;
                      const limit = getNewsletterLimit();
                      const hasSmtp = Boolean(tenantConfig?.custom_smtp_host);
                      if (!hasSmtp && sent >= limit) {
                        setShowOverLimitModal(true);
                      } else {
                        setShowNewsletterModal(true);
                      }
                    }}
                    className="w-full py-2 bg-nectar-gold text-background hover:bg-nectar-gold/90 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all font-bold mt-2 shadow-md shadow-nectar-gold/10 cursor-pointer"
                  >
                    🚀 Redactar Boletín / Nueva Campaña
                  </button>
                </div>
              </AddonMetricCard>

            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          /* Portal Customization Form */
          <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
            <form onSubmit={handleSaveConfig} className="space-y-8">
              <div className="admin-card border rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden text-left space-y-6">
                
                <div>
                  <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                    Estilo e Identidad
                  </span>
                  <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none text-white">Ajustes de Marca</h2>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Configura cómo verán tus clientes el portal de soporte y tus addons</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-nectar-gold border-b border-white/5 pb-2">Información General</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Nombre del Negocio</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Título del Portal Público</label>
                      <input
                        type="text"
                        placeholder="Ej. Centro de Ayuda e Innovación"
                        value={editPortalTitle}
                        onChange={(e) => setEditPortalTitle(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Mensaje de Bienvenida</label>
                      <textarea
                        required
                        rows={3}
                        value={editWelcomeMessage}
                        onChange={(e) => setEditWelcomeMessage(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Texto de Pie de Página (Footer)</label>
                      <input
                        type="text"
                        placeholder="Ej. Todos los derechos reservados."
                        value={editFooterText}
                        onChange={(e) => setEditFooterText(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={editRequireCustomerInfo}
                        onChange={(e) => setEditRequireCustomerInfo(e.target.checked)}
                        className="w-4 h-4 accent-nectar-gold"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">Requerir Nombre antes de Chatear</span>
                    </label>
                  </div>

                  {/* Visual Style Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-nectar-gold border-b border-white/5 pb-2">Colores de Interfaz (CSS Palette)</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Color Primario</label>
                        <div className="flex gap-2">
                          <input type="color" value={editThemeColor} onChange={(e) => setEditThemeColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editThemeColor} onChange={(e) => setEditThemeColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Color Acento</label>
                        <div className="flex gap-2">
                          <input type="color" value={editAccentColor} onChange={(e) => setEditAccentColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editAccentColor} onChange={(e) => setEditAccentColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Fondo General</label>
                        <div className="flex gap-2">
                          <input type="color" value={editBgColor} onChange={(e) => setEditBgColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editBgColor} onChange={(e) => setEditBgColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Fondo Tarjetas</label>
                        <div className="flex gap-2">
                          <input type="color" value={editCardBgColor} onChange={(e) => setEditCardBgColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editCardBgColor} onChange={(e) => setEditCardBgColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Color del Texto</label>
                        <div className="flex gap-2">
                          <input type="color" value={editTextColor} onChange={(e) => setEditTextColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editTextColor} onChange={(e) => setEditTextColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Bordes / Divisiones</label>
                        <div className="flex gap-2">
                          <input type="color" value={editBorderColor} onChange={(e) => setEditBorderColor(e.target.value)} className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent" />
                          <input type="text" value={editBorderColor} onChange={(e) => setEditBorderColor(e.target.value)} className="flex-1 border rounded-lg px-2 text-[10px] font-mono admin-input" />
                        </div>
                      </div>
                    </div>

                    {/* Logo Section */}
                    <div className="space-y-2 pt-2">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block">Logotipo del Portal</label>
                      <div className="flex items-center gap-4">
                        {(editLogoPreview || editLogoUrl) ? (
                          <img src={editLogoPreview || editLogoUrl} alt="Logo Preview" className="w-14 h-14 rounded-2xl object-cover border border-white/10 bg-black/40 shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl border border-dashed border-white/15 bg-white/[0.01] flex items-center justify-center text-xl shrink-0">
                            🖼️
                          </div>
                        )}
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                            id="logo-upload-input"
                          />
                          <label
                            htmlFor="logo-upload-input"
                            className="inline-block px-4 py-2 border border-white/10 hover:border-nectar-gold bg-foreground/5 text-white text-[9px] font-black uppercase tracking-widest rounded-xl cursor-pointer hover:scale-102 active:scale-95 transition-all text-center"
                          >
                            Subir Logotipo
                          </label>
                          <input
                            type="text"
                            placeholder="O introduce una URL de imagen..."
                            value={editLogoUrl}
                            onChange={(e) => {
                              setEditLogoUrl(e.target.value);
                              setEditLogoFile(null);
                              setEditLogoPreview(null);
                            }}
                            className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-3.5 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg shadow-nectar-gold/25"
                  >
                    {isSaving ? 'Guardando Ajustes...' : 'Guardar Cambios'}
                  </button>
                </div>

              </div>
            </form>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header card */}
            <div className="admin-card border rounded-[2rem] p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
              <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>
              <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] flex items-center justify-center text-3xl border border-white/5">
                🧾
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Facturación CFDI 4.0</h2>
                <p className="text-xs text-white/50 leading-relaxed">
                  Configura tu perfil fiscal emisor ante el SAT, sube tus sellos CSD y administra tus facturas timbradas de forma automática.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Column */}
              <div className="lg:col-span-5 space-y-6">
                {/* Control de Timbres Card */}
                <div className="admin-card border rounded-[2rem] p-6 shadow-lg space-y-6 relative overflow-hidden text-left">
                  {/* Decorative background glow */}
                  <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-10 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>
                  
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Balance de Timbres</h3>
                    <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1">Control de consumo y paquetes</p>
                  </div>

                  {billingInfo?.is_ambassador ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div>
                          <span className="text-[7px] uppercase font-black tracking-widest text-white/40 block">Esquema Actual</span>
                          <span className="mt-1 inline-block px-2.5 py-0.5 border text-[7px] font-black uppercase tracking-widest rounded-full bg-nectar-gold/10 text-nectar-gold border-nectar-gold/20">
                            Embajador de Marca (Influencer)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[7px] uppercase font-black tracking-widest text-white/40 block">Timbres Totales</span>
                          <span className="text-xl font-black text-white font-mono mt-1 block">
                            {(billingInfo?.free_stamps_left ?? 0) + (billingInfo?.stamp_balance ?? 0)}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-center">
                        <div>
                          <span className="text-[7px] uppercase font-black tracking-widest text-white/40 block">Timbres de Cortesía</span>
                          <span className="text-sm font-black text-white font-mono mt-1 block">{(billingInfo?.free_stamps_left ?? 0)} / 20</span>
                        </div>
                        <div>
                          <span className="text-[7px] uppercase font-black tracking-widest text-white/40 block">Timbres Adicionales</span>
                          <span className="text-sm font-black text-white font-mono mt-1 block">{(billingInfo?.stamp_balance ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div>
                        <span className="text-[7px] uppercase font-black tracking-widest text-white/40 block">Timbres Disponibles</span>
                        <span className="text-3xl font-black text-white font-mono leading-none mt-1 block">
                          {billingInfo ? billingInfo.stamp_balance : 0}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[7px] uppercase font-black tracking-widest text-white/40 block">Esquema Actual</span>
                        <span className="mt-1 inline-block px-2.5 py-0.5 border text-[7px] font-black uppercase tracking-widest rounded-full bg-nectar-gold/10 text-nectar-gold border-nectar-gold/20">
                          {billingInfo?.is_commercial_partner ? 'Socio Comercial' : 'Suscripción Add-on'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Plan Description details */}
                  <div className="text-[9px] text-white/50 leading-relaxed space-y-1.5 p-3 rounded-xl bg-white/[0.01] border border-white/5">
                    {billingInfo?.is_ambassador ? (
                      <p>
                        ✨ Al ser **Embajador de Marca**, dispones de **20 timbres de cortesía al mes**. Si los consumes por completo, podrás seguir facturando adquiriendo timbres adicionales.
                      </p>
                    ) : billingInfo?.is_commercial_partner ? (
                      <p>
                        ✨ Al ser **Socio Comercial**, tu módulo de facturación es gratuito. Solo pagas por tus paquetes de timbres conforme los consumes.
                      </p>
                    ) : (
                      <p>
                        💼 Tu suscripción incluye **100 timbres mensuales** que se renuevan automáticamente en tu fecha de facturación.
                      </p>
                    )}
                  </div>

                  {/* Packages Section */}
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-white">Adquirir Paquetes de Timbres</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { size: 50, price: 75, desc: '50 Timbres' },
                        { size: 100, price: 150, desc: '100 Timbres' },
                        { size: 500, price: 750, desc: '500 Timbres' }
                      ].map((pkg) => (
                        <button
                          key={pkg.size}
                          onClick={() => handleBuyStamps(pkg.size)}
                          disabled={buyingPackage !== null}
                          className="flex flex-col items-center justify-between p-3 rounded-xl border border-white/5 hover:border-nectar-gold bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer group text-center disabled:opacity-40"
                        >
                          <span className="text-[8px] font-black text-white/70 group-hover:text-nectar-gold uppercase tracking-wider">
                            {pkg.desc}
                          </span>
                          <span className="text-xs font-black text-white font-mono mt-2">
                            ${pkg.price}
                          </span>
                          <span className="text-[6px] text-white/30 uppercase font-black mt-1">
                            MXN
                          </span>
                          <div className="w-full mt-3 py-1 bg-white/5 group-hover:bg-nectar-gold group-hover:text-background text-white text-[6px] font-black uppercase tracking-wider rounded-md transition-all">
                            {buyingPackage === pkg.size ? 'Cargando...' : 'Comprar'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Configuración Fiscal Card */}
                <div className="admin-card border rounded-[2rem] p-6 shadow-lg space-y-6 text-left">
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Configuración Fiscal</h3>
                    <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1">Perfil emisor registrado ante el SAT</p>
                  </div>

                  {taxProfileError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase tracking-wider font-bold rounded-xl">
                      ⚠️ {taxProfileError}
                    </div>
                  )}

                  <form onSubmit={handleSaveTaxProfile} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Razón Social o Nombre Oficial</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. NÉCTAR LABS SA DE CV"
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-wider font-black text-white/50">RFC</label>
                        <input
                          type="text"
                          required
                          maxLength={13}
                          placeholder="Ej. NLA260529AAA"
                          value={rfc}
                          onChange={(e) => setRfc(e.target.value.toUpperCase())}
                          className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Código Postal</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          placeholder="Ej. 06000"
                          value={codigoPostal}
                          onChange={(e) => setCodigoPostal(e.target.value.replace(/\D/g, ''))}
                          className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Régimen Fiscal (SAT)</label>
                      <select
                        value={regimenFiscal}
                        onChange={(e) => setRegimenFiscal(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      >
                        <option value="601">601 - General de Ley Personas Morales</option>
                        <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                        <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                        <option value="606">606 - Arrendamiento</option>
                        <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                        <option value="616">616 - Sin obligaciones fiscales</option>
                        <option value="621">621 - Incorporación Fiscal</option>
                        <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Preferencia de Facturación</label>
                      <select
                        value={invoicingMode}
                        onChange={(e) => setInvoicingMode(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      >
                        <option value="AUTOMATIC">Facturación Automática (al pagar)</option>
                        <option value="MANUAL_CLIENT">Manual por el Cliente</option>
                        <option value="MANUAL_ADMIN">Manual por el Administrador</option>
                      </select>
                    </div>

                    <div className="border-t border-white/5 pt-4 mt-6 space-y-4">
                      <div>
                        <h4 className="text-[9px] font-black uppercase tracking-wide text-white">Certificados de Sello Digital (CSD)</h4>
                        <p className="text-[7px] text-white/40 leading-relaxed mt-1">
                          Sube tus archivos de sellos para timbrar. Néctar Labs delega de forma segura el resguardo directamente al PAC (Facturapi) a través de su API. Las llaves nunca tocan nuestros servidores.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[8px] uppercase tracking-wider font-black text-white/50 block">Archivo Certificado (.cer)</label>
                        <input
                          type="file"
                          accept=".cer"
                          onChange={(e) => setCerFile(e.target.files?.[0] || null)}
                          className="text-[9px] text-white/60 block w-full file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[8px] file:font-black file:uppercase file:bg-white/5 file:text-white file:cursor-pointer hover:file:bg-white/10"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[8px] uppercase tracking-wider font-black text-white/50 block">Archivo Llave Privada (.key)</label>
                        <input
                          type="file"
                          accept=".key"
                          onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                          className="text-[9px] text-white/60 block w-full file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[8px] file:font-black file:uppercase file:bg-white/5 file:text-white file:cursor-pointer hover:file:bg-white/10"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Contraseña de la Llave Privada</label>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={privateKeyPassword}
                          onChange={(e) => setPrivateKeyPassword(e.target.value)}
                          className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingTaxProfile}
                        className="px-6 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg"
                        style={{ backgroundColor: primaryColor, color: '#000000' }}
                      >
                        {isSavingTaxProfile ? 'Guardando Ajustes...' : 'Guardar Configuración'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Invoices List Column */}
              <div className="lg:col-span-7 space-y-6">
                <div className="admin-card border rounded-[2rem] p-6 shadow-lg space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white">Historial de CFDIs</h3>
                      <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1">Facturas emitidas y timbradas</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setManualRfc('');
                          setManualRazonSocial('');
                          setManualRegimenFiscal('601');
                          setManualCodigoPostal('');
                          setManualEmail('');
                          setManualItems([{ quantity: 1, unit_price: 0, description: '' }]);
                          setShowManualInvoiceModal(true);
                        }}
                        className="px-3 py-1.5 bg-nectar-gold text-background hover:bg-nectar-gold/90 border border-nectar-gold/20 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer font-bold"
                      >
                        + Factura Manual
                      </button>
                      <button
                        onClick={() => {
                          setNewClientEmail('');
                          setNewClientUsername('');
                          setNewClientPassword('');
                          setNewClientEmailVerified(true);
                          setShowNewClientModal(true);
                        }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all text-white cursor-pointer font-bold"
                      >
                        + Nuevo Cliente
                      </button>
                      <button
                        onClick={loadBillingData}
                        disabled={loadingBilling}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all text-white/80 cursor-pointer"
                      >
                        {loadingBilling ? 'Sincronizando...' : '🔄 Actualizar'}
                      </button>
                    </div>
                  </div>

                  {loadingBilling ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3">
                      <span className="w-6 h-6 rounded-full border-2 border-t-white border-white/10 animate-spin"></span>
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Cargando Facturas...</p>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="py-16 text-center text-white/40 uppercase font-black tracking-widest text-[9px]">
                      No se han emitido facturas para este portal aún.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[9px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-white/40 uppercase tracking-widest">
                            <th className="py-3 px-2">Fecha</th>
                            <th className="py-3 px-2">UUID SAT</th>
                            <th className="py-3 px-2 text-right">Total</th>
                            <th className="py-3 px-2 text-center">Estado</th>
                            <th className="py-3 px-2 text-center">Documentos</th>
                            <th className="py-3 px-2 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                              <td className="py-3 px-2 text-white/60 font-mono">
                                {new Date(inv.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                              </td>
                              <td className="py-3 px-2 font-mono text-white/80 select-all" title={inv.uuid_sat || 'No timbrado'}>
                                {inv.uuid_sat ? `${inv.uuid_sat.substring(0, 8)}...` : <span className="text-white/30 italic">No disponible</span>}
                              </td>
                              <td className="py-3 px-2 text-right font-black text-white font-mono">
                                ${parseFloat(inv.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`px-2 py-0.5 border text-[7px] font-black uppercase tracking-widest rounded-full ${
                                  inv.status === 'PAID'
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : inv.status === 'LCO_SYNC_PENDING'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                    : inv.status === 'FAILED'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : inv.status === 'CANCELLED'
                                    ? 'bg-white/5 text-white/40 border-white/10'
                                    : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                }`}>
                                  {inv.status_display}
                                </span>
                                {inv.error_message && inv.status !== 'PAID' && (
                                  <div className="text-[6px] text-red-400/80 mt-1 max-w-[120px] mx-auto truncate font-mono" title={inv.error_message}>
                                    {inv.error_message}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {inv.xml_url ? (
                                    <a
                                      href={inv.xml_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-white text-[7px] font-black uppercase tracking-widest rounded transition-all"
                                    >
                                      XML
                                    </a>
                                  ) : (
                                    <span className="text-white/20 select-none text-[7px]">-</span>
                                  )}
                                  {inv.pdf_url ? (
                                    <a
                                      href={inv.pdf_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-white text-[7px] font-black uppercase tracking-widest rounded transition-all"
                                    >
                                      PDF
                                    </a>
                                  ) : (
                                    <span className="text-white/20 select-none text-[7px]">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {(inv.status === 'LCO_SYNC_PENDING' || inv.status === 'FAILED' || inv.status === 'PENDING') && (
                                    <button
                                      onClick={() => handleRetryInvoice(inv.id)}
                                      disabled={(!billingInfo?.is_ambassador && (billingInfo?.stamp_balance ?? 0) === 0) || (billingInfo?.is_ambassador && ((billingInfo?.free_stamps_left ?? 0) + (billingInfo?.stamp_balance ?? 0)) === 0)}
                                      className="px-2 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-[7.5px] font-black uppercase tracking-widest rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      Reintentar
                                    </button>
                                  )}
                                  {(inv.status === 'PAID' || inv.status === 'CANCEL_REQUESTED') && (
                                    <button
                                      onClick={() => {
                                        setCancelInvoiceId(inv.id);
                                        setCancelMotive('02');
                                        setCancelSubstitution('');
                                        setShowCancelModal(true);
                                      }}
                                      className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[7.5px] font-black uppercase tracking-widest rounded transition-all"
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
            <form onSubmit={handleSaveIntegrations} className="space-y-8">
              <div className="admin-card border rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden text-left space-y-6">
                
                <div>
                  <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                    🔌 Conectividad & Canales Externos
                  </span>
                  <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none text-white">Configuración de Integraciones</h2>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Conecta tus propias APIs de mensajería, paquetería y logística</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* SMTP/Amazon SES Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-nectar-gold border-b border-white/5 pb-2">Amazon SES / SMTP Personalizado</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Host SMTP</label>
                      <input
                        type="text"
                        placeholder="Ej. email-smtp.us-east-1.amazonaws.com"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Puerto SMTP</label>
                        <input
                          type="text"
                          placeholder="587"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value.replace(/\D/g, ''))}
                          className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                        />
                      </div>
                      <div className="flex flex-col justify-end pb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={smtpUseTls}
                            onChange={(e) => setSmtpUseTls(e.target.checked)}
                            className="w-3.5 h-3.5 accent-nectar-gold"
                          />
                          <span className="text-[9px] font-bold uppercase tracking-wide text-white/75">TLS</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Usuario SMTP (SMTP Username)</label>
                      <input
                        type="text"
                        placeholder="Ej. AKIAIOSFODNN7EXAMPLE"
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Contraseña SMTP (SMTP Password)</label>
                      <input
                        type="password"
                        placeholder={tenantConfig?.has_custom_smtp_password ? '••••••••••••' : 'Nueva contraseña SMTP'}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Remitente Autorizado (From Email)</label>
                      <input
                        type="email"
                        placeholder="Ej. boletin@minegocio.com"
                        value={smtpFromEmail}
                        onChange={(e) => setSmtpFromEmail(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                      />
                      <p className="text-[7px] text-white/45 leading-relaxed">
                        ⚠️ Asegúrate de que esta dirección de correo esté previamente verificada y autorizada en tu consola de Amazon SES u otro proveedor SMTP.
                      </p>
                    </div>
                  </div>

                  {/* Skydropx & Logistics Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-nectar-gold border-b border-white/5 pb-2">Configuración Skydropx</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">API Key de Skydropx</label>
                      <input
                        type="password"
                        placeholder={tenantConfig?.has_skydropx_api_key ? '••••••••••••' : 'Introduce tu API Key de Skydropx'}
                        value={skydropxApiKey}
                        onChange={(e) => setSkydropxApiKey(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Margen de Ganancia de Envío (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="15.00"
                        value={shippingMarkupPercentage}
                        onChange={(e) => setShippingMarkupPercentage(e.target.value)}
                        className="w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                      />
                      <p className="text-[7px] text-white/45 leading-relaxed">
                        Porcentaje adicional cargado al cliente final sobre la cotización base de Skydropx.
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-4 mt-2 space-y-3">
                      <h4 className="text-[9px] font-black uppercase tracking-wide text-white font-bold">Dirección de Origen para Envíos</h4>
                      
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-45">Nombre del Remitente</label>
                        <input
                          type="text"
                          placeholder="Ej. Almacén Central"
                          value={originName}
                          onChange={(e) => setOriginName(e.target.value)}
                          className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest opacity-45">Teléfono</label>
                          <input
                            type="text"
                            placeholder="Ej. 5512345678"
                            value={originPhone}
                            onChange={(e) => setOriginPhone(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest opacity-45">Código Postal</label>
                          <input
                            type="text"
                            maxLength={5}
                            placeholder="Ej. 06000"
                            value={originZipCode}
                            onChange={(e) => setOriginZipCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-45">Calle y Número</label>
                        <input
                          type="text"
                          placeholder="Ej. Av. Paseo de la Reforma 123"
                          value={originStreet}
                          onChange={(e) => setOriginStreet(e.target.value)}
                          className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest opacity-45">Colonia</label>
                          <input
                            type="text"
                            placeholder="Juárez"
                            value={originSuburb}
                            onChange={(e) => setOriginSuburb(e.target.value)}
                            className="w-full border rounded-xl px-2.5 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest opacity-45">Ciudad</label>
                          <input
                            type="text"
                            placeholder="CDMX"
                            value={originCity}
                            onChange={(e) => setOriginCity(e.target.value)}
                            className="w-full border rounded-xl px-2.5 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest opacity-45">Estado</label>
                          <input
                            type="text"
                            placeholder="CDMX"
                            value={originState}
                            onChange={(e) => setOriginState(e.target.value)}
                            className="w-full border rounded-xl px-2.5 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingIntegrations}
                    className="px-8 py-3.5 bg-nectar-gold text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg shadow-nectar-gold/25 cursor-pointer"
                  >
                    {isSavingIntegrations ? 'Guardando Integraciones...' : 'Guardar Integraciones'}
                  </button>
                </div>

              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="border-t py-6 admin-header mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-bold text-white/30 uppercase tracking-widest">
          <span>&copy; {new Date().getFullYear()} {tenantConfig.name} - Centro de Control</span>
          <span>Desarrollado bajo licencia de Néctar Labs</span>
        </div>
      </footer>

      {/* 📧 Modal: Redactar Boletín */}
      {showNewsletterModal && (
        <div className="fixed inset-0 z-55 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="admin-card border rounded-[2rem] p-8 max-w-4xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowNewsletterModal(false)}
              className="absolute top-6 right-6 text-white/40 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
            <div className="border-b border-white/5 pb-4">
              <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Email Campaigner
              </span>
              <h3 className="text-lg font-black uppercase tracking-tight text-white mt-2">Nueva Campaña de Boletín</h3>
              <p className="text-[7.5px] text-white/40 uppercase tracking-wider mt-0.5">Enviar un correo masivo a todos los suscriptores activos</p>
            </div>
            
            <form onSubmit={handleSendCampaign} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Form inputs */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Importar Post del Blog (Opcional)</label>
                  <select
                    value={selectedPostId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedPostId(val);
                      if (val) {
                        const post = blogPosts.find(p => String(p.id) === val);
                        if (post) {
                          setCampaignSubject(`Nuevo Post: ${post.title}`);
                          setCampaignTitle(post.title);
                          setCampaignContent(post.content);
                        }
                      } else {
                        setCampaignSubject('');
                        setCampaignTitle('');
                        setCampaignContent('');
                      }
                    }}
                    className="w-full border rounded-xl px-3 py-2.5 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-bold"
                  >
                    <option value="">-- Redactar en Blanco --</option>
                    {blogPosts.map((post) => (
                      <option key={post.id} value={String(post.id)}>
                        {post.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Asunto del Correo (Subject)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. ¡Nueva colección disponible en nuestra tienda!"
                    value={campaignSubject}
                    onChange={(e) => setCampaignSubject(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Título de Cabecera (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. ¡Grandes Noticias!"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Contenido del Mensaje (HTML/Texto)</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Escribe el cuerpo del mensaje. Puedes usar etiquetas HTML básicas..."
                    value={campaignContent}
                    onChange={(e) => setCampaignContent(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input resize-none font-mono"
                  />
                </div>

                {/* Estilo y Tipografía */}
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
                  <h4 className="text-[8px] font-black uppercase tracking-widest text-white/40 pb-1.5 border-b border-white/5">
                    Diseño & Tipografía
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[7px] uppercase tracking-wider font-black text-white/50 block">Plantilla</label>
                      <select
                        value={templateType}
                        onChange={(e) => setTemplateType(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-bold"
                      >
                        <option value="minimalist">Minimalista</option>
                        <option value="moss">Moss (Verde)</option>
                        <option value="cosmic">Cosmic (Nebulosa)</option>
                        <option value="glow">Glow (Cyber)</option>
                        <option value="mist">Mist (Teal)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] uppercase tracking-wider font-black text-white/50 block">Fuentes Título</label>
                      <select
                        value={titleFontFamily}
                        onChange={(e) => setTitleFontFamily(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-bold"
                      >
                        <option value="serif">Serif</option>
                        <option value="sans-serif">Sans-Serif</option>
                        <option value="monospace">Monospace</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[7px] uppercase tracking-wider font-black text-white/50 block">Fuentes Cuerpo</label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-bold"
                      >
                        <option value="serif">Serif</option>
                        <option value="sans-serif">Sans-Serif</option>
                        <option value="monospace">Monospace</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] uppercase tracking-wider font-black text-white/50 block">Fuentes Footer</label>
                      <select
                        value={footerFontFamily}
                        onChange={(e) => setFooterFontFamily(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-bold"
                      >
                        <option value="serif">Serif</option>
                        <option value="sans-serif">Sans-Serif</option>
                        <option value="monospace">Monospace</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Llamado a la Acción (CTA) */}
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
                  <h4 className="text-[8px] font-black uppercase tracking-widest text-white/40 pb-1.5 border-b border-white/5">
                    Llamado a la Acción (CTA)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[7px] uppercase tracking-wider font-black text-white/50 block">Texto Botón</label>
                      <input
                        type="text"
                        placeholder="ej: Registrarme"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] uppercase tracking-wider font-black text-white/50 block">Enlace Botón (URL)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={ctaLink}
                        onChange={(e) => setCtaLink(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Imagen y Fondo */}
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
                  <h4 className="text-[8px] font-black uppercase tracking-widest text-white/40 pb-1.5 border-b border-white/5">
                    Imágenes de Portada & Fondo
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[7px] uppercase tracking-wider font-black text-white/50 block">Portada URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[7px] uppercase tracking-wider font-black text-white/50 block">Fondo URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={bgImageUrl}
                      onChange={(e) => setBgImageUrl(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[6px] uppercase tracking-wider font-black text-white/40 block">Opacidad</label>
                      <input
                        type="number"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={bgOpacity}
                        onChange={(e) => setBgOpacity(e.target.value)}
                        className="w-full border rounded-xl px-2 py-1.5 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[6px] uppercase tracking-wider font-black text-white/40 block">Saturación %</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={bgSaturation}
                        onChange={(e) => setBgSaturation(e.target.value)}
                        className="w-full border rounded-xl px-2 py-1.5 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[6px] uppercase tracking-wider font-black text-white/40 block">Posición</label>
                      <select
                        value={bgPosition}
                        onChange={(e) => setBgPosition(e.target.value)}
                        className="w-full border rounded-xl px-2 py-1.5 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-bold"
                      >
                        <option value="center">Centro</option>
                        <option value="top">Arriba</option>
                        <option value="bottom">Abajo</option>
                        <option value="left">Izquierda</option>
                        <option value="right">Derecha</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Footer Text */}
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
                  <h4 className="text-[8px] font-black uppercase tracking-widest text-white/40 pb-1.5 border-b border-white/5">
                    Footer
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[7px] uppercase tracking-wider font-black text-white/50 block">Texto Adicional Footer</label>
                    <input
                      type="text"
                      placeholder="ej: Visita nuestra web o redes."
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[9px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Preview */}
              <div className="flex flex-col h-full min-h-[400px]">
                <span className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block mb-2">Vista Previa (Branded)</span>
                
                {(() => {
                  const themePreviewStyles = {
                    minimalist: {
                      bg: '#ffffff',
                      text: '#111827',
                      headerBg: '#f3f4f6',
                      headerText: '#1f2937',
                      border: '#e5e7eb',
                      ctaBg: '#111827',
                      ctaText: '#ffffff'
                    },
                    moss: {
                      bg: '#f4f6f4',
                      text: '#1e2d24',
                      headerBg: '#2d4a36',
                      headerText: '#ffffff',
                      border: '#d2dbd3',
                      ctaBg: '#2d4a36',
                      ctaText: '#ffffff'
                    },
                    cosmic: {
                      bg: '#0f0c1b',
                      text: '#f3f0ff',
                      headerBg: '#1a103c',
                      headerText: '#a78bfa',
                      border: '#2e1f5e',
                      ctaBg: '#7c3aed',
                      ctaText: '#ffffff'
                    },
                    glow: {
                      bg: '#0d0d0d',
                      text: '#e5e7eb',
                      headerBg: '#1a1a1a',
                      headerText: '#22d3ee',
                      border: '#262626',
                      ctaBg: '#22d3ee',
                      ctaText: '#000000'
                    },
                    mist: {
                      bg: '#f0f4f8',
                      text: '#243b53',
                      headerBg: '#d9e2ec',
                      headerText: '#102a43',
                      border: '#bcccdc',
                      ctaBg: '#102a43',
                      ctaText: '#ffffff'
                    }
                  };

                  const selectedTheme = themePreviewStyles[templateType as keyof typeof themePreviewStyles] || themePreviewStyles.minimalist;
                  
                  return (
                    <div
                      style={{
                        backgroundColor: selectedTheme.bg,
                        color: selectedTheme.text,
                        borderColor: selectedTheme.border,
                        backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none',
                        backgroundPosition: bgPosition,
                        backgroundSize: 'cover',
                        filter: bgImageUrl ? `saturate(${bgSaturation}%)` : 'none',
                        opacity: bgImageUrl ? parseFloat(bgOpacity) : 1
                      }}
                      className="border rounded-2xl p-5 flex flex-1 flex-col justify-between overflow-y-auto text-black animate-fadeIn"
                    >
                      <div>
                        <div
                          style={{
                            backgroundColor: selectedTheme.headerBg,
                            borderColor: selectedTheme.border,
                            fontFamily: titleFontFamily === 'serif' ? 'Georgia, serif' : titleFontFamily === 'sans-serif' ? 'sans-serif' : 'monospace'
                          }}
                          className="border-b-2 pb-4 mb-4 text-center rounded-xl p-3"
                        >
                          {imageUrl && (
                            <img src={imageUrl} alt="Portada" className="max-h-20 mx-auto mb-2 rounded object-cover" />
                          )}
                          <h1 style={{ color: selectedTheme.headerText }} className="text-base font-extrabold tracking-tight">
                            {tenantConfig.name}
                          </h1>
                          <p className="text-[7px] uppercase tracking-widest opacity-60">Boletín Informativo</p>
                        </div>

                        <h2 style={{ fontFamily: titleFontFamily === 'serif' ? 'Georgia, serif' : titleFontFamily === 'sans-serif' ? 'sans-serif' : 'monospace' }} className="text-sm font-bold mb-3">
                          {campaignTitle || campaignSubject || 'Título del Boletín'}
                        </h2>

                        <div
                          style={{ fontFamily: fontFamily === 'serif' ? 'Georgia, serif' : fontFamily === 'sans-serif' ? 'sans-serif' : 'monospace' }}
                          className="text-[11px] leading-relaxed space-y-3"
                          dangerouslySetInnerHTML={{ __html: campaignContent || '<p className="italic opacity-40">Escribe el contenido para previsualizarlo aquí...</p>' }}
                        />

                        {ctaText && (
                          <div className="mt-4 text-center">
                            <a
                              href={ctaLink || '#'}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                backgroundColor: selectedTheme.ctaBg,
                                color: selectedTheme.ctaText,
                                fontFamily: fontFamily === 'serif' ? 'Georgia, serif' : fontFamily === 'sans-serif' ? 'sans-serif' : 'monospace'
                              }}
                              className="inline-block px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all font-bold"
                            >
                              {ctaText}
                            </a>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          borderColor: selectedTheme.border,
                          fontFamily: footerFontFamily === 'serif' ? 'Georgia, serif' : footerFontFamily === 'sans-serif' ? 'sans-serif' : 'monospace'
                        }}
                        className="border-t pt-4 mt-6 text-center text-[7.5px] opacity-50 space-y-0.5"
                      >
                        <p>© {new Date().getFullYear()} {tenantConfig.name}. Todos los derechos reservados.</p>
                        {footerText && <p>{footerText}</p>}
                        <p>Recibes este correo porque te suscribiste a nuestro boletín oficial.</p>
                        <p className="font-semibold cursor-pointer text-amber-500">Desuscribirse</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-4 flex justify-end gap-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => setShowNewsletterModal(false)}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-white/80 cursor-pointer font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingCampaign || !campaignSubject.trim() || !campaignContent.trim()}
                    className="px-6 py-2 bg-nectar-gold text-background hover:bg-nectar-gold/90 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all font-bold shadow-md cursor-pointer"
                  >
                    {isSendingCampaign ? 'Enviando...' : '🚀 Enviar Campaña'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚨 Modal: Límite de Partner Excedido */}
      {showOverLimitModal && (
        <div className="fixed inset-0 z-55 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="admin-card border rounded-[2rem] p-6 max-w-md w-full space-y-5 shadow-2xl relative text-center">
            <button 
              onClick={() => setShowOverLimitModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-tight text-white">Límite de Envíos Superado</h3>
              <p className="text-[10px] text-white/70 leading-relaxed font-medium">
                Has superado el límite de Partner. Boton para comprar mas Correos Masivos en modulos de 1000 correos, o Conecta tus propias llaves API de Amazon SES en tu configuración para envíos ilimitados
              </p>
            </div>
            
            <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
              <button
                onClick={async () => {
                  setShowOverLimitModal(false);
                  await handleBuyEmailCredits();
                }}
                className="w-full py-3 bg-nectar-gold text-background hover:bg-nectar-gold/90 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all font-bold shadow-md shadow-nectar-gold/10 cursor-pointer"
              >
                💳 Comprar 1,000 Correos Masivos ($15.00 MXN)
              </button>
              
              <button
                onClick={() => {
                  setShowOverLimitModal(false);
                  setActiveTab('integrations');
                }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-white font-bold cursor-pointer"
              >
                ⚙️ Conectar Amazon SES / SMTP Propio
              </button>
              
              <button
                type="button"
                onClick={() => setShowOverLimitModal(false)}
                className="w-full py-2.5 text-[8px] font-black uppercase tracking-wider transition-all text-white/40 hover:text-white/60 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FACTURA MANUAL (TENANT TO CLIENT) ── */}
      {showManualInvoiceModal && (
        <div
          onClick={() => setShowManualInvoiceModal(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: tenantConfig.card_bg_color || '#050a06',
              borderColor: tenantConfig.border_color || '#151F18'
            }}
            className="w-full max-w-2xl border p-8 md:p-10 rounded-[3rem] shadow-2xl relative space-y-6 text-left cursor-default animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto admin-card"
          >
            <button
              onClick={() => setShowManualInvoiceModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl font-bold cursor-pointer admin-border"
            >
              ×
            </button>

            <div>
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Facturación SAT
              </span>
              <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none">
                Emitir Factura Manual a Cliente
              </h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                Genera y timbra una factura personalizada para tu cliente. Esta acción consumirá 1 timbre de tu balance.
              </p>
            </div>

            <form onSubmit={handleCreateManualInvoice} className="space-y-6">
              {/* Datos Fiscales */}
              <div className="bg-background/40 border border-white/5 p-5 rounded-2xl space-y-4 admin-card">
                <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50 border-b border-white/5 pb-2">
                  Datos de Facturación del Cliente
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">RFC</label>
                    <input
                      type="text"
                      required
                      placeholder="XAXX010101000"
                      value={manualRfc}
                      onChange={(e) => setManualRfc(e.target.value.toUpperCase())}
                      className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono uppercase tracking-wider admin-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Razón Social</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre o Razón Social"
                      value={manualRazonSocial}
                      onChange={(e) => setManualRazonSocial(e.target.value)}
                      className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground admin-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Régimen Fiscal</label>
                    <select
                      value={manualRegimenFiscal}
                      onChange={(e) => setManualRegimenFiscal(e.target.value)}
                      className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold admin-input"
                    >
                      <option value="601">601 - General de Ley Personas Morales</option>
                      <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                      <option value="605">605 - Sueldos y Salarios</option>
                      <option value="606">606 - Arrendamiento</option>
                      <option value="608">608 - Demás ingresos</option>
                      <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                      <option value="616">616 - Sin obligaciones fiscales</option>
                      <option value="621">621 - Incorporación Fiscal</option>
                      <option value="625">625 - Régimen de las Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</option>
                      <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Código Postal</label>
                    <input
                      type="text"
                      required
                      placeholder="00000"
                      value={manualCodigoPostal}
                      onChange={(e) => setManualCodigoPostal(e.target.value)}
                      className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono admin-input"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Email de Envío de Factura</label>
                  <input
                    type="email"
                    required
                    placeholder="correo@cliente.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground admin-input"
                  />
                </div>
              </div>

              {/* Conceptos (Items) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-50">Conceptos / Ítems de la Factura</label>
                  <button
                    type="button"
                    onClick={() => {
                      setManualItems(prev => [...prev, { quantity: 1, unit_price: 0, description: '' }]);
                    }}
                    className="text-[8px] font-black text-nectar-gold hover:underline uppercase tracking-widest font-bold cursor-pointer"
                  >
                    + Agregar Concepto
                  </button>
                </div>

                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {manualItems.map((item, idx) => (
                    <div key={idx} className="p-4 bg-background border border-white/5 rounded-xl space-y-3 relative text-left admin-card">
                      {manualItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualItems(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-2 right-3 text-red-500 hover:text-red-700 text-[8px] font-black uppercase tracking-wider cursor-pointer"
                        >
                          remover
                        </button>
                      )}
                      
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest opacity-40">Descripción</label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-1.5 bg-background border border-white/10 rounded-lg text-[9px] font-bold text-foreground admin-input"
                            placeholder="ej. Servicio de Consultoría"
                            value={item.description}
                            onChange={(e) => {
                              const newDesc = e.target.value;
                              setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, description: newDesc } : it));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest opacity-40">Cant.</label>
                          <input
                            type="number"
                            required
                            min="1"
                            className="w-full px-3 py-1.5 bg-background border border-white/10 rounded-lg text-[9px] font-bold text-center text-foreground font-mono admin-input"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: newQty } : it));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase tracking-widest opacity-40">Precio Unit. (MXN)</label>
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            className="w-full px-3 py-1.5 bg-background border border-white/10 rounded-lg text-[9px] font-bold text-right text-foreground font-mono admin-input"
                            placeholder="0.00"
                            value={item.unit_price || ''}
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value) || 0;
                              setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: newPrice } : it));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales y Timbrado */}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between text-left">
                {(() => {
                  const subtotal = manualItems.reduce((acc, item) => acc + (item.quantity * (item.unit_price || 0)), 0);
                  const iva = parseFloat((subtotal * 0.16).toFixed(2));
                  const total = parseFloat((subtotal + iva).toFixed(2));

                  return (
                    <div className="grid grid-cols-3 gap-6 text-[9px] font-black uppercase tracking-widest">
                      <div>
                        <span className="opacity-40 block">Subtotal</span>
                        <span className="text-xs font-mono font-bold text-white/80">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="opacity-40 block">IVA (16%)</span>
                        <span className="text-xs font-mono font-bold text-white/80">${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-nectar-gold block">Total Facturado</span>
                        <span className="text-sm font-mono font-black text-nectar-gold">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-3 shrink-0 font-bold">
                  <button
                    type="button"
                    onClick={() => setShowManualInvoiceModal(false)}
                    className="px-5 py-3 border border-white/10 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingManualInvoice}
                    className="px-6 py-3 bg-nectar-gold text-background hover:bg-nectar-gold/90 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all font-bold shadow-md cursor-pointer"
                  >
                    {isSubmittingManualInvoice ? 'Emitiendo...' : 'Timbrar Factura'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewClientModal && tenantConfig && (
        <div
          onClick={() => setShowNewClientModal(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: tenantConfig.card_bg_color || '#050a06',
              borderColor: tenantConfig.border_color || '#151F18'
            }}
            className="w-full max-w-md border p-8 md:p-10 rounded-[3rem] shadow-2xl relative space-y-6 text-left cursor-default animate-in fade-in zoom-in-95 duration-200 admin-card"
          >
            <button
              onClick={() => setShowNewClientModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl font-bold cursor-pointer admin-border"
            >
              ×
            </button>

            <div>
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Clientes
              </span>
              <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none text-white">
                Nuevo Cliente / Usuario
              </h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                Registra un nuevo cliente para este portal. El rol será automáticamente asignado como Cliente.
              </p>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Email Principal *</label>
                <input
                  type="email"
                  required
                  placeholder="cliente@correo.com"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground admin-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Nombre de Usuario (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. clientejuan"
                  value={newClientUsername}
                  onChange={(e) => setNewClientUsername(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground admin-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Contraseña (Opcional)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newClientPassword}
                  onChange={(e) => setNewClientPassword(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono admin-input"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="newClientEmailVerified"
                  checked={newClientEmailVerified}
                  onChange={(e) => setNewClientEmailVerified(e.target.checked)}
                  className="w-4 h-4 bg-background border border-white/10 rounded accent-nectar-gold"
                />
                <label htmlFor="newClientEmailVerified" className="text-[9px] font-black uppercase tracking-widest opacity-60 cursor-pointer text-white/80">
                  Email Verificado
                </label>
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-5 py-3 border border-white/10 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer text-white/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewClient}
                  className="px-6 py-3 bg-nectar-gold text-background text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all font-bold shadow-lg shadow-nectar-gold/25 cursor-pointer"
                >
                  {isSubmittingNewClient ? 'Creando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCancelModal && tenantConfig && (
        <div
          onClick={() => setShowCancelModal(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: tenantConfig.card_bg_color || '#050a06',
              borderColor: tenantConfig.border_color || '#151F18'
            }}
            className="w-full max-w-md border p-8 md:p-10 rounded-[3rem] shadow-2xl relative space-y-6 text-left cursor-default animate-in fade-in zoom-in-95 duration-200 admin-card"
          >
            <button
              onClick={() => setShowCancelModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl font-bold cursor-pointer admin-border"
            >
              ×
            </button>

            <div>
              <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-red-500/20">
                Cancelación SAT
              </span>
              <h2 className="text-2xl font-black tracking-tighter mt-4 leading-none text-white">
                Cancelar Factura CFDI
              </h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                Selecciona el motivo de cancelación ante el SAT.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!cancelInvoiceId) return;
                if (cancelMotive === '01' && !cancelSubstitution.trim()) {
                  showToast('El folio sustituto es obligatorio para el motivo 01.', 'warning');
                  return;
                }
                setIsSubmittingCancel(true);
                try {
                  await handleCancelInvoice(cancelInvoiceId, cancelMotive, cancelSubstitution.trim());
                  setShowCancelModal(false);
                } finally {
                  setIsSubmittingCancel(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Motivo de Cancelación *</label>
                <select
                  value={cancelMotive}
                  onChange={(e) => {
                    setCancelMotive(e.target.value);
                    if (e.target.value !== '01') setCancelSubstitution('');
                  }}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-bold admin-input"
                >
                  <option value="02">02 - Comprobante emitido con errores sin relación</option>
                  <option value="03">03 - Operación no realizada</option>
                  <option value="01">01 - Comprobante emitido con errores con relación</option>
                  <option value="04">04 - Operación nominativa relacionada en la factura global</option>
                </select>
              </div>

              {cancelMotive === '01' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Folio Sustituto (UUID o ID de Facturapi) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. 123e4567-e89b-12d3-a456-426614174000"
                    value={cancelSubstitution}
                    onChange={(e) => setCancelSubstitution(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nectar-gold text-foreground font-mono admin-input"
                  />
                  <p className="text-[8px] opacity-40 uppercase tracking-widest">
                    Especifica el UUID de la factura que reemplaza a la factura actual.
                  </p>
                </div>
              )}

              <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-5 py-3 border border-white/10 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer text-white/80"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all font-bold shadow-lg cursor-pointer"
                >
                  {isSubmittingCancel ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal !== null}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        onConfirm={confirmModal?.onConfirm || (() => {})}
        onCancel={() => setConfirmModal(null)}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

interface AddonCardProps {
  slug: string;
  title: string;
  icon: string;
  activeList: string[];
  primaryColor: string;
  metrics: {
    leftLabel: string;
    leftVal: string;
    rightLabel: string;
    rightVal: string;
  };
  children?: React.ReactNode;
}

function AddonMetricCard({ slug, title, icon, activeList, primaryColor, metrics, children }: AddonCardProps) {
  const isActive = activeList.includes(slug);

  return (
    <div className="admin-card border rounded-[2rem] p-6 shadow-lg flex flex-col justify-between relative overflow-hidden group">
      
      {/* 1. Header (Icon + Title) */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-white/5 flex items-center justify-center text-lg shrink-0">
            {icon}
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wide text-white leading-tight">{title}</h4>
            <span className="text-[6.5px] uppercase tracking-widest font-black opacity-45">Slug: {slug}</span>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 border text-[7px] font-black uppercase tracking-widest rounded-full ${
          isActive 
            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>
          {isActive ? 'Activo' : 'Bloqueado'}
        </span>
      </div>

      {/* 2. Visual Content Area */}
      <div className={`relative flex-1 ${!isActive ? 'blur-sm select-none pointer-events-none' : ''}`}>
        {children ? children : (
          <div className="h-28 flex items-center justify-center text-[10px] text-white/20 uppercase font-black tracking-widest">
            Sin Vista Previa de Datos
          </div>
        )}
      </div>

      {/* 3. Highlight numbers footer */}
      <div className={`grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-4 ${!isActive ? 'blur-sm select-none pointer-events-none' : ''}`}>
        <div className="text-left">
          <span className="text-[7px] uppercase font-black tracking-widest text-white/35 block">{metrics.leftLabel}</span>
          <span className="text-base font-black text-white font-mono mt-0.5 block">{metrics.leftVal}</span>
        </div>
        <div className="text-right">
          <span className="text-[7px] uppercase font-black tracking-widest text-white/35 block">{metrics.rightLabel}</span>
          <span className="text-base font-black text-white font-mono mt-0.5 block" style={{ color: isActive ? primaryColor : '#C68A1E' }}>{metrics.rightVal}</span>
        </div>
      </div>

      {/* 4. Active Addon Gating Overlay (Visual Guard) */}
      {!isActive && (
        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[3px] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-xl bg-nectar-gold/10 border border-nectar-gold/20 text-nectar-gold flex items-center justify-center text-lg shadow-lg shadow-nectar-gold/10 mb-3 animate-[bounce_3s_infinite]">
            🔒
          </div>
          <h5 className="text-[10px] font-black uppercase tracking-wider text-white">Módulo No Contratado</h5>
          <p className="text-[8px] text-white/50 max-w-[180px] leading-relaxed mt-1 mb-4">
            Adquiere este Add-on en el Catálogo de Néctar Labs para habilitar sus analíticas en tiempo real.
          </p>
          <a
            href="/dashboard/addons"
            className="px-4 py-2 bg-nectar-gold text-background text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md font-bold"
          >
            Adquirir Add-on
          </a>
        </div>
      )}

    </div>
  );
}
