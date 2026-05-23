'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api';

interface Addon {
  id: string;
  dbId?: number;
  name: string;
  categoryBadge: string;
  description: string;
  detailedDescription: string;
  monthlyPrice: number;
  yearlyPrice: number;
  originProject: string;
  sourceReference: string;
  complexity: 'Baja' | 'Media' | 'Alta' | 'Muy Alta';
  serverRequirements: string;
  technicalDetails: string[];
  icon: React.ReactNode;
}

const getAddonIcon = (id: string) => {
  switch (id) {
    case 'live-chat':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case 'booking-signature':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      );
    case 'logistics-gps':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'patreon-sponsorship':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'analytics-apm':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      );
    case 'newsletter-campaigner':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      );
  }
};

const fallbackAddons: Omit<Addon, 'icon'>[] = [
  {
    id: 'live-chat',
    name: 'Néctar Live Chat',
    categoryBadge: 'COMUNICACIÓN EN VIVO',
    description: 'Widget de chat flotante en tiempo real y consola multi-agente con historial persistente.',
    detailedDescription: 'Un canal de comunicación instantáneo integrado para retención y soporte de usuarios. Los clientes ven un widget interactivo de chat, mientras que los agentes de soporte gestionan las conversaciones desde una consola interna dedicada.',
    monthlyPrice: 79,
    yearlyPrice: 790,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/tickets (SupportChat, SupportChatMessage)',
    complexity: 'Media',
    serverRequirements: 'Django Channels (ASGI) con servidor de caché Redis + Base de Datos relacional.',
    technicalDetails: [
      'Widget JS reactivo y ligero incrustable',
      'Polling persistente o WebSocket fallback',
      'Asignación dinámica de chats a staff técnico',
      'Marcado de estado abierto/resuelto/cerrado'
    ]
  },
  {
    id: 'booking-signature',
    name: 'Néctar Booking & Signature',
    categoryBadge: 'CONTRATOS Y CITAS',
    description: 'Motor de reserva de citas integrado con firma digital de propuestas y generación de PDFs con firma incrustada.',
    detailedDescription: 'Ideal para digitalizar acuerdos contractuales. Permite configurar calendarios interactivos, generar propuestas en PDF al vuelo a partir de plantillas y capturar firmas táctiles o con mouse seguras con marcas de tiempo criptográficas.',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    originProject: 'ms-ambar',
    sourceReference: 'ms-ambar/backend/apps/bookings & templates/emails',
    complexity: 'Alta',
    serverRequirements: 'Almacenamiento seguro en la nube (AWS S3, Azure Blob o similar) para resguardar PDFs + Biblioteca ReportLab.',
    technicalDetails: [
      'Lienzo de firma en React (Canvas HTML5)',
      'Generación de documentos PDF vía backend',
      'Notificaciones de propuesta por correo electrónico con templates HTML',
      'Control de flujos y estados de aprobación'
    ]
  },
  {
    id: 'logistics-gps',
    name: 'Néctar Logistics & GPS',
    categoryBadge: 'LOGÍSTICA Y CONTROL',
    description: 'Seguimiento en tiempo real de repartidores, trazado de rutas óptimas de paradas y cálculo de ETA en mapa interactivo.',
    detailedDescription: 'Módulo de geolocalización industrial. Registra rutas y telemetría GPS, ofreciendo una experiencia interactiva tanto al administrador (consola de flotas) como al usuario final (seguimiento del pedido en tiempo real).',
    monthlyPrice: 249,
    yearlyPrice: 2490,
    originProject: 'losplacosones',
    sourceReference: 'losplacosones/backend/apps/delivery',
    complexity: 'Muy Alta',
    serverRequirements: 'Acceso a Mapbox API o Google Maps API para cálculo de rutas + Telemetría persistente de alta frecuencia.',
    technicalDetails: [
      'WebSockets / Polling optimizado para actualización GPS',
      'Consola administrativa con mapas interactivos de flotas',
      'Cálculo inteligente de rutas y paradas ordenadas',
      'Estimaciones de tiempo de entrega basadas en tráfico'
    ]
  },
  {
    id: 'patreon-sponsorship',
    name: 'Néctar Patreon/Sponsorship',
    categoryBadge: 'MONETIZACIÓN',
    description: 'Pasarela de suscripciones recurrentes de Stripe con control de acceso a feeds exclusivos y niveles de membresía.',
    detailedDescription: 'Permite monetizar tu contenido, comunidad o SaaS de manera flexible. Automatiza cobros recurrentes de Stripe, gestiona roles y bloquea o desbloquea secciones de contenido multimedia basándose en el nivel del suscriptor.',
    monthlyPrice: 129,
    yearlyPrice: 1290,
    originProject: 'tierraviva',
    sourceReference: 'tierraviva/tierraViva-backend-main/sponsorship',
    complexity: 'Media',
    serverRequirements: 'Cuenta comercial de Stripe + Configuración de endpoint para Webhooks HTTPS del backend.',
    technicalDetails: [
      'Integración con Stripe Billing API y Webhooks',
      'Definición de tiers o niveles dinámicos desde Django Admin',
      'Validación automatizada de estatus de membresías en backend',
      'Portal de auto-gestión del suscriptor'
    ]
  },
  {
    id: 'analytics-apm',
    name: 'Néctar Analytics APM',
    categoryBadge: 'MONITOREO DE DESEMPEÑO',
    description: 'Monitor de Core Web Vitals en navegador y telemetría de base de datos con conteo de queries e hilos en tiempo real.',
    detailedDescription: 'Optimiza la infraestructura midiendo el impacto real. Este middleware inyecta telemetría que calcula Web Vitals (LCP, FID, CLS) desde el lado del cliente y registra el tiempo de respuesta y la eficiencia de las consultas SQL en Django.',
    monthlyPrice: 59,
    yearlyPrice: 590,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/performance (PerformanceMiddleware, models.py)',
    complexity: 'Media',
    serverRequirements: 'Módulo de Middleware Django instalado + Agregación de logs asíncrona para no afectar el flujo principal.',
    technicalDetails: [
      'Detección automática de consultas duplicadas (N+1)',
      'Monitoreo del hardware del servidor (CPU/RAM/SSD)',
      'Alertas configurables por lentitud de base de datos',
      'Registro detallado de Web Vitals del navegador del cliente'
    ]
  },
  {
    id: 'newsletter-campaigner',
    name: 'Néctar Newsletter',
    categoryBadge: 'EMAIL MARKETING',
    description: 'Gestor de suscripciones, programador de campañas con plantillas HTML y envío masivo optimizado para SMTP/SES.',
    detailedDescription: 'Envía boletines interactivos a tu base de contactos. Cuenta con un sistema automático de tokens únicos de cancelación de suscripción para cumplir con las normativas internacionales de correo, además de plantillas HTML prediseñadas.',
    monthlyPrice: 39,
    yearlyPrice: 390,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/newsletter (Subscriber, send_newsletter_email)',
    complexity: 'Baja',
    serverRequirements: 'Servicio de entrega de correos electrónicos configurado (AWS SES, Resend, Sendgrid o un SMTP privado).',
    technicalDetails: [
      'Tokens únicos de desuscripción seguros (UUID)',
      'Render de templates de correo HTML con Django Template Loader',
      'Manejo de estados activos / inactivos de la base de datos',
      'Soporte multi-idioma de plantillas'
    ]
  }
];

export default function AddonsPage() {
  const router = useRouter();
  const [isStaff, setIsStaff] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
  const [requestAddon, setRequestAddon] = useState<Addon | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [addonsList, setAddonsList] = useState<Addon[]>([]);
  const [hasPlanContract, setHasPlanContract] = useState(false);

  // States for subdomains / tenants
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('new');
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSubdomain, setNewTenantSubdomain] = useState('');
  const [tenantErrorMsg, setTenantErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const staff = localStorage.getItem('is_staff') === 'true';
    const role = localStorage.getItem('user_role') || '';
    setUserRole(role);
    setIsStaff((staff || role === 'ADMIN' || role === 'BUSINESS') && role !== 'DESIGNER');

    const loadAddons = async () => {
      try {
        // Fetch contract information to check for active 6-month plan contracts
        try {
          const contractsData = await fetcher('/contracts/');
          if (Array.isArray(contractsData)) {
            const planContractExists = contractsData.some(
              (c: any) => c.is_active && c.is_fully_signed && c.plan !== null && c.plan !== undefined
            );
            setHasPlanContract(planContractExists);
          }
        } catch (contractErr) {
          console.error("Error loading contracts:", contractErr);
        }

        // Fetch tenants owned by the user
        try {
          const tenantsData = await fetcher('/tenants/');
          if (Array.isArray(tenantsData)) {
            setTenants(tenantsData);
            if (tenantsData.length > 0) {
              setSelectedTenantId(tenantsData[0].id);
            } else {
              setSelectedTenantId('new');
            }
          }
        } catch (tenantsErr) {
          console.error("Error loading tenants:", tenantsErr);
        }

        const data = await fetcher('/addons/');
        if (Array.isArray(data)) {
          const mapped: Addon[] = data.map((item: any) => ({
            id: item.slug,
            dbId: item.id,
            name: item.name,
            categoryBadge: item.category_badge,
            description: item.description,
            detailedDescription: item.detailed_description,
            monthlyPrice: parseFloat(item.monthly_price),
            yearlyPrice: parseFloat(item.yearly_price),
            originProject: item.origin_project,
            sourceReference: item.source_reference,
            complexity: item.complexity,
            serverRequirements: item.server_requirements,
            technicalDetails: item.technical_details || [],
            icon: getAddonIcon(item.slug),
          }));
          setAddonsList(mapped);

          // Auto-select or request from params
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const selectId = params.get('select');
            const requestId = params.get('request');
            if (selectId) {
              const found = mapped.find(a => a.id === selectId);
              if (found) setSelectedAddon(found);
            } else if (requestId) {
              const found = mapped.find(a => a.id === requestId);
              if (found) setRequestAddon(found);
            }
          }
        } else {
          await useFallback();
        }
      } catch (error) {
        console.error("Error loading addons, falling back to static config:", error);
        await useFallback();
      } finally {
        setLoading(false);
      }
    };

    const useFallback = async () => {
      try {
        const contractsData = await fetcher('/contracts/');
        if (Array.isArray(contractsData)) {
          const planContractExists = contractsData.some(
            (c: any) => c.is_active && c.is_fully_signed && c.plan !== null && c.plan !== undefined
          );
          setHasPlanContract(planContractExists);
        }
      } catch (contractErr) {
        console.error("Error loading contracts in fallback:", contractErr);
      }

      try {
        const tenantsData = await fetcher('/tenants/');
        if (Array.isArray(tenantsData)) {
          setTenants(tenantsData);
          if (tenantsData.length > 0) {
            setSelectedTenantId(tenantsData[0].id);
          } else {
            setSelectedTenantId('new');
          }
        }
      } catch (tenantsErr) {
        console.error("Error loading tenants in fallback:", tenantsErr);
      }

      const mapped = fallbackAddons.map(a => ({
        ...a,
        icon: getAddonIcon(a.id)
      })) as Addon[];
      setAddonsList(mapped);

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const selectId = params.get('select');
        const requestId = params.get('request');
        if (selectId) {
          const found = mapped.find(a => a.id === selectId);
          if (found) setSelectedAddon(found);
        } else if (requestId) {
          const found = mapped.find(a => a.id === requestId);
          if (found) setRequestAddon(found);
        }
      }
    };

    loadAddons();
  }, []);

  const handleRequestIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestAddon) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setTenantErrorMsg(null);
    setSuccessTicketId(null);

    let portalInfo = "";

    // If customer selected to create a new portal or has no portals
    if (selectedTenantId === 'new') {
      try {
        if (!newTenantName.trim() || !newTenantSubdomain.trim()) {
          setTenantErrorMsg("Por favor ingresa el nombre de la empresa y el subdominio deseado.");
          setIsSubmitting(false);
          return;
        }
        if (!/^[a-z0-9-]+$/.test(newTenantSubdomain.trim())) {
          setTenantErrorMsg("El subdominio solo puede contener letras minúsculas, números y guiones.");
          setIsSubmitting(false);
          return;
        }
        
        const createdTenant = await fetcher('/tenants/', {
          method: 'POST',
          body: JSON.stringify({
            name: newTenantName.trim(),
            subdomain: newTenantSubdomain.trim().toLowerCase()
          })
        });

        // Add newly created tenant to list
        setTenants(prev => [...prev, createdTenant]);
        setSelectedTenantId(createdTenant.id);
        portalInfo = `${newTenantSubdomain.trim().toLowerCase()}.nectarlabs.dev`;
      } catch (err: any) {
        console.error("Error creating tenant:", err);
        setTenantErrorMsg(err.message || "El subdominio ya está ocupado o es inválido. Por favor intenta con otro.");
        setIsSubmitting(false);
        return;
      }
    } else {
      const selectedTenant = tenants.find(t => t.id === selectedTenantId);
      if (selectedTenant) {
        portalInfo = `${selectedTenant.subdomain}.nectarlabs.dev`;
      }
    }

    // Prepare comments with portal info included
    const checkoutComments = `[Portal: ${portalInfo}] ${comments.trim()}`;

    // If client does NOT have a plan contract (paid add-on), redirect to Stripe checkout subscription flow
    if (!hasPlanContract) {
      try {
        const addonId = requestAddon.dbId || requestAddon.id;
        const data = await fetcher(`/addons/${addonId}/subscribe/`, {
          method: 'POST',
          body: JSON.stringify({
            comments: checkoutComments
          })
        });
        if (data.url) {
          window.location.href = data.url;
          return;
        } else {
          throw new Error("No se recibió la URL de Stripe.");
        }
      } catch (err: any) {
        console.error("Stripe Checkout error:", err);
        setErrorMsg(err.message || "Ocurrió un error al conectar con Stripe. Por favor intenta de nuevo.");
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    // Otherwise, if they have an active plan (free add-on), we create a support ticket directly
    const title = `[Solicitud Add-on Gratis] ${requestAddon.name} - Con Contrato Activo`;

    const priceText = `$0 MXN (Incluido en plan de desarrollo de 6 meses)`;

    const schemeText = `Gratuito / Incluido (Servicio técnico integrado - Restando de horas de desarrollo correspondientes)`;

    const description = `## Solicitud de Integración de Add-on

El cliente solicita la integración de un módulo aislado del ecosistema Néctar Labs.

### Portal Destino
- **Página de Integración**: ${portalInfo}

### Detalles del Módulo
- **Módulo**: ${requestAddon.name}
- **Esquema de Pago**: ${schemeText}
- **Precio Acordado**: ${priceText}
- **Referencia Técnica en Ecosistema**: \`${requestAddon.sourceReference}\`
- **Complejidad del Módulo**: ${requestAddon.complexity}
- **Requerimiento del Servidor**: ${requestAddon.serverRequirements}

### Notas del Cliente / Requerimientos Particulares:
${comments.trim() ? comments : '_El cliente no ingresó comentarios adicionales._'}

---
*Generado automáticamente desde la sección de Catálogo de Add-ons.*`;

    try {
      const data = await fetcher('/tickets/', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category: 'IMPLEMENTATION',
          priority: 'HIGH'
        })
      });
      setSuccessTicketId(data.id);
      setComments('');
      setNewTenantName('');
      setNewTenantSubdomain('');
      setRequestAddon(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-nectar-gold border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-black uppercase tracking-[0.4em] opacity-20 text-[10px] animate-pulse">Sincronizando Módulos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Sidebar - Consistent with Dashboard */}
      <aside className="w-full lg:w-72 bg-card-bg border-b lg:border-r border-card-border p-8 flex flex-col justify-between">
        <div>
          <Link href="/" className="inline-block text-xl font-black tracking-tighter mb-16">
            NECTAR <span className="text-nectar-gold">LABS</span>
          </Link>
          
          <nav className="space-y-4">
            <Link href="/dashboard" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Dashboard
            </Link>

            {isStaff && (
              <Link href="/dashboard?tab=business" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
                <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
                Control Negocio
              </Link>
            )}

            {isStaff && (
              <Link href="/dashboard/performance" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
                <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
                Rendimiento
              </Link>
            )}

            <Link href="/tickets" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              {isStaff ? 'Gestión Tickets' : 'Soporte'}
            </Link>
            
            <Link href="/projects" className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-foreground/20 rounded-full"></div>
              Proyectos
            </Link>

            <Link href="/dashboard/addons" className="flex items-center gap-4 px-6 py-4 bg-nectar-gold/10 text-nectar-gold rounded-2xl font-black uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 bg-nectar-gold rounded-full"></div>
              Catálogo Add-ons
            </Link>
          </nav>
        </div>

        <button
          onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          className="mt-20 flex items-center gap-4 px-6 py-4 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px]"
        >
          <span>Cerrar Sesión</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-12 lg:p-16 overflow-y-auto">
        <header className="mb-16 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">
              Módulos & Add-ons
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-nectar-gold opacity-80">
              Servicios Aislados y Funcionalidades en Suscripción
            </p>
          </div>

          {/* Billing Cycle Switcher or Contract Active Notice */}
          {hasPlanContract ? (
            <div className="bg-nectar-gold/10 border border-nectar-gold/25 p-4 rounded-2xl flex items-center gap-3 max-w-md shadow-sm">
              <div className="p-2 bg-nectar-gold/20 rounded-xl text-nectar-gold">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-nectar-gold">Plan de 6 Meses Activo</p>
                <p className="text-[9px] text-muted leading-tight mt-0.5">Todos los Add-ons están incluidos sin costo adicional. La integración se deduce de tus horas de desarrollo.</p>
              </div>
            </div>
          ) : (
            <div className="bg-card-bg border border-card-border p-1.5 rounded-2xl flex items-center gap-2 relative z-10 shadow-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-nectar-gold text-background shadow-md'
                    : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                Pago Mensual
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${
                  billingCycle === 'yearly'
                    ? 'bg-nectar-gold text-background shadow-md'
                    : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                Pago Anual <span className="text-[7px] text-nectar-forest dark:text-nectar-cream bg-white/20 px-1 py-0.5 rounded ml-1 font-bold">2 meses gratis</span>
              </button>
            </div>
          )}
        </header>

        {/* Global Notifications */}
        {successTicketId && (
          <div className="mb-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-8 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 animate-premium">
            <div>
              <h3 className="text-lg font-black tracking-tight mb-1">¡Solicitud Enviada con Éxito!</h3>
              <p className="text-xs opacity-75">Se ha creado el ticket de implementación con alta prioridad para que nuestro equipo técnico coordine la integración contigo.</p>
            </div>
            <Link href="/tickets" className="px-8 py-3 bg-emerald-500 text-background font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-105 active:scale-95 transition-all text-center">
              Ir a mis Tickets
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="mb-12 bg-red-500/10 border border-red-500/30 text-red-400 p-8 rounded-[2rem] animate-premium">
            <h3 className="text-lg font-black tracking-tight mb-1">Error de envío</h3>
            <p className="text-xs opacity-75">{errorMsg}</p>
          </div>
        )}

        {/* Add-ons Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {addonsList.map((addon) => {
            const price = billingCycle === 'monthly' ? addon.monthlyPrice : addon.yearlyPrice;
            const savings = billingCycle === 'yearly' ? addon.monthlyPrice * 2 : 0;
            return (
              <div
                key={addon.id}
                className="bg-card-bg border border-card-border p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-nectar-gold/50 hover:shadow-[0_20px_50px_rgba(198,138,30,0.08)] transition-all duration-500 flex flex-col justify-between min-h-[420px]"
              >
                {/* Accent Background Glow on Hover */}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-nectar-gold/5 blur-[80px] rounded-full group-hover:bg-nectar-gold/10 transition-all duration-700 pointer-events-none -z-10"></div>

                <div>
                  {/* Category Badge & Icon */}
                  <div className="flex justify-between items-start mb-8">
                    <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold bg-nectar-gold/5 border border-nectar-gold/15 px-3 py-1.5 rounded-full">
                      {addon.categoryBadge}
                    </span>
                    <div className="p-3 bg-foreground/5 rounded-2xl group-hover:bg-nectar-gold/10 group-hover:scale-110 transition-all duration-500">
                      {addon.icon}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-2xl font-black tracking-tight mb-3 group-hover:text-nectar-gold transition-colors duration-300">
                    {addon.name}
                  </h3>
                  <p className="text-xs text-muted mb-6 leading-relaxed">
                    {addon.description}
                  </p>
                </div>

                {/* Pricing & Call to Action */}
                <div>
                  <div className="border-t border-card-border/80 pt-6 mb-6 flex items-baseline justify-between">
                    <div>
                      {hasPlanContract ? (
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black tracking-tighter text-nectar-gold">$0 MXN</span>
                            <span className="text-[8px] font-black text-nectar-gold bg-nectar-gold/10 border border-nectar-gold/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Incluido
                            </span>
                          </div>
                          <p className="text-[9px] text-muted mt-1">
                            Soporte técnico integrado • <span className="line-through opacity-50">${addon.monthlyPrice}/mes</span>
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black tracking-tighter text-foreground">${price.toLocaleString('es-MX')}</span>
                            <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider text-muted">
                              MXN / {billingCycle === 'monthly' ? 'mes' : 'año'}
                            </span>
                          </div>
                          {billingCycle === 'yearly' && (
                            <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider mt-1">
                              Ahorro anual de ${savings.toLocaleString('es-MX')} MXN
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                      addon.complexity === 'Muy Alta' ? 'text-red-400 bg-red-400/5 border-red-400/20' :
                      addon.complexity === 'Alta' ? 'text-orange-400 bg-orange-400/5 border-orange-400/20' :
                      addon.complexity === 'Media' ? 'text-yellow-400 bg-yellow-400/5 border-yellow-400/20' :
                      'text-emerald-400 bg-emerald-400/5 border-emerald-400/20'
                    }`}>
                      Complejidad: {addon.complexity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setSelectedAddon(addon)}
                      className="w-full py-4 text-[9px] font-black uppercase tracking-widest text-nectar-gold hover:text-foreground hover:bg-foreground/5 rounded-xl border border-nectar-gold/20 hover:border-transparent transition-all duration-300 text-center"
                    >
                      Ver Ficha
                    </button>
                    <button
                      onClick={() => setRequestAddon(addon)}
                      className="w-full py-4 text-[9px] font-black uppercase tracking-widest bg-nectar-gold text-background hover:scale-[1.03] active:scale-95 transition-all rounded-xl shadow-lg shadow-nectar-gold/10 hover:shadow-nectar-gold/25"
                    >
                      {hasPlanContract ? 'Solicitar Gratis' : 'Solicitar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Modal: View Details / Ficha Técnica */}
        {selectedAddon && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-premium">
            <div className="bg-card-bg border border-card-border w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <button
                onClick={() => setSelectedAddon(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-full flex items-center justify-center text-lg font-bold transition-all"
              >
                ✕
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-nectar-gold/10 rounded-2xl">
                  {selectedAddon.icon}
                </div>
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold block mb-1">
                    Ficha Técnica de Add-on
                  </span>
                  <h2 className="text-3xl font-black tracking-tight">{selectedAddon.name}</h2>
                </div>
              </div>

              <p className="text-xs text-muted mb-8 leading-relaxed">
                {selectedAddon.detailedDescription}
              </p>

              <div className="space-y-6 border-t border-card-border pt-8 mb-8">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-3">
                    Funcionalidades Clave
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedAddon.technicalDetails.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-xs text-foreground/80">
                        <span className="w-1.5 h-1.5 bg-nectar-gold rounded-full shrink-0"></span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-card-border/50 pt-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-2">
                      Origen en el Ecosistema
                    </h4>
                    <p className="text-xs font-mono bg-background/50 border border-card-border/80 p-3.5 rounded-xl truncate text-foreground/80" title={selectedAddon.sourceReference}>
                      {selectedAddon.sourceReference}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-nectar-gold mb-2">
                      Requerimientos de Infraestructura
                    </h4>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {selectedAddon.serverRequirements}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setRequestAddon(selectedAddon);
                    setSelectedAddon(null);
                  }}
                  className="flex-1 py-4 text-xs font-black uppercase tracking-widest bg-nectar-gold text-background hover:scale-[1.02] active:scale-95 transition-all rounded-xl text-center shadow-lg"
                >
                  {hasPlanContract
                    ? `Solicitar este Add-on Gratis (Incluido en tu Plan)`
                    : `Solicitar este Add-on ($${billingCycle === 'monthly' ? selectedAddon.monthlyPrice.toLocaleString('es-MX') : selectedAddon.yearlyPrice.toLocaleString('es-MX')} MXN)`}
                </button>
                <button
                  onClick={() => setSelectedAddon(null)}
                  className="px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-foreground/5 rounded-xl border border-card-border text-center transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Request / Solicitar Integración Form */}
        {requestAddon && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-premium">
            <div className="bg-card-bg border border-card-border w-full max-w-xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setRequestAddon(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-full flex items-center justify-center text-lg font-bold transition-all"
              >
                ✕
              </button>

              <div className="mb-8">
                <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold block mb-1">
                  Nueva Solicitud de Integración
                </span>
                <h2 className="text-3xl font-black tracking-tight mb-2">Configurar {requestAddon.name}</h2>
                <p className="text-xs text-muted leading-relaxed">
                  {hasPlanContract
                    ? 'Como cliente con plan activo, estás solicitando este módulo gratis. Se creará un ticket de alta prioridad en Soporte y las horas se deducirán de tu plan.'
                    : 'Estás solicitando la adición del módulo en tu plan de servicio. Esto creará un ticket en tu panel de Soporte para coordinar la implementación y facturación.'}
                </p>
              </div>

              <form onSubmit={handleRequestIntegration} className="space-y-6">
                <div className="bg-background/50 border border-card-border p-6 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[8px] font-bold opacity-50 uppercase tracking-widest text-muted block mb-0.5">Módulo Seleccionado</span>
                    <span className="font-bold text-sm text-foreground">{requestAddon.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold opacity-50 uppercase tracking-widest text-muted block mb-0.5">Precio de Integración</span>
                    {hasPlanContract ? (
                      <span className="font-black text-lg text-nectar-gold text-right">
                        $0 MXN
                        <span className="text-[9px] font-bold text-muted opacity-60 block">
                          Incluido en tu Plan
                        </span>
                      </span>
                    ) : (
                      <span className="font-black text-lg text-nectar-gold text-right">
                        ${billingCycle === 'monthly' ? requestAddon.monthlyPrice.toLocaleString('es-MX') : requestAddon.yearlyPrice.toLocaleString('es-MX')} MXN
                        <span className="text-[9px] font-bold text-muted opacity-60 block">
                          / {billingCycle === 'monthly' ? 'mes' : 'año'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 border-t border-card-border/50 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-nectar-gold block">
                    Portal de Destino
                  </label>
                  
                  {tenants.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[8px] font-bold opacity-50 uppercase tracking-widest text-muted block">
                        Selecciona tu Portal
                      </span>
                      <select
                        value={selectedTenantId}
                        onChange={(e) => {
                          setSelectedTenantId(e.target.value);
                          setTenantErrorMsg(null);
                        }}
                        className="w-full bg-background/50 border border-card-border focus:border-nectar-gold/60 outline-none rounded-2xl p-4 text-xs text-foreground transition-colors"
                      >
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.subdomain}.nectarlabs.dev)
                          </option>
                        ))}
                        <option value="new">+ Registrar un nuevo portal...</option>
                      </select>
                    </div>
                  )}

                  {selectedTenantId === 'new' && (
                    <div className="space-y-4 bg-foreground/[0.02] border border-card-border p-5 rounded-2xl animate-premium">
                      <span className="text-[8px] font-black text-nectar-gold uppercase tracking-widest block mb-2">
                        Configurar Nuevo Portal
                      </span>
                      
                      <div className="space-y-2">
                        <label htmlFor="newTenantName" className="text-[8px] font-bold opacity-50 uppercase tracking-widest text-muted block">
                          Nombre del Portal / Empresa
                        </label>
                        <input
                          id="newTenantName"
                          type="text"
                          value={newTenantName}
                          onChange={(e) => setNewTenantName(e.target.value)}
                          placeholder="Ej: Mi Empresa S.A."
                          className="w-full bg-background/50 border border-card-border focus:border-nectar-gold/60 outline-none rounded-2xl p-4 text-xs text-foreground transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="newTenantSubdomain" className="text-[8px] font-bold opacity-50 uppercase tracking-widest text-muted block">
                          Sufijo / Subdominio
                        </label>
                        <div className="flex items-center gap-2 bg-background/50 border border-card-border focus-within:border-nectar-gold/60 rounded-2xl px-4 py-3.5 transition-colors">
                          <input
                            id="newTenantSubdomain"
                            type="text"
                            value={newTenantSubdomain}
                            onChange={(e) => setNewTenantSubdomain(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            placeholder="mi-empresa"
                            className="bg-transparent border-none outline-none text-xs text-foreground flex-1"
                          />
                          <span className="text-xs text-muted font-bold font-mono">.nectarlabs.dev</span>
                        </div>
                        <p className="text-[7.5px] opacity-40 leading-normal mt-1">
                          Solo minúsculas, números y guiones. Será la URL final donde se desplegarán tus Add-ons activos.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {tenantErrorMsg && (
                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider bg-red-400/5 border border-red-400/20 px-4 py-2.5 rounded-xl">
                      ⚠️ {tenantErrorMsg}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="comments" className="text-[10px] font-black uppercase tracking-widest text-nectar-gold block mb-3">
                    Comentarios o Requerimientos Especiales (Opcional)
                  </label>
                  <textarea
                    id="comments"
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Describe cualquier detalle sobre cómo esperas que se integre en tu plataforma (ej. qué vistas lo contendrán, endpoints específicos, etc.)..."
                    className="w-full bg-background/50 border border-card-border focus:border-nectar-gold/60 outline-none rounded-2xl p-4 text-xs text-foreground placeholder:text-muted/50 transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest bg-nectar-gold text-background hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all rounded-xl text-center shadow-lg flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                        Enviando Solicitud...
                      </>
                    ) : (
                      hasPlanContract ? 'Confirmar y Solicitar Gratis' : 'Pagar Suscripción en Stripe'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestAddon(null)}
                    className="px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-foreground/5 rounded-xl border border-card-border text-center transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
