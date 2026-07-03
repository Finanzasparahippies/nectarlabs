'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api';
import DashboardSidebar from '@/components/DashboardSidebar';
import Toast from '@/components/ui/Toast';

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
    case 'bot-chat':
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
    case 'delivery-tracking':
    case 'logistics-gps':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'sponsorship':
    case 'patreon-sponsorship':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'business-analytics':
    case 'analytics-apm':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      );
    case 'campaigner':
    case 'newsletter-campaigner':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'facturacion-cfdi':
    case 'mexico-invoicing':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'automatic-invoicing':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'ecommerce-combo':
      return (
        <svg className="w-8 h-8 text-nectar-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
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
    id: 'pack-ecommerce-lite',
    name: 'Paquete E-commerce Lite',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Envíos nacionales Skydropx, Facturación SAT (100 timbres), Tienda y Campaigner Lite.',
    detailedDescription: 'El paquete integral ideal para comenzar a vender en línea. Habilita de golpe las funciones de cotización y emisión de guías de envío nacionales de Skydropx, facturación fiscal automatizada CFDI 4.0 con 100 timbres base gratis al mes, y campaigner lite sin costo.',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/tenants/models.py (pack-ecommerce-lite)',
    complexity: 'Alta',
    serverRequirements: 'Configuración completa de llaves de Stripe, Skydropx API Key y Facturapi API Key.',
    technicalDetails: [
      'Acceso completo a módulo Tienda + Envíos Skydropx',
      'Acceso completo a módulo Facturación SAT (100 timbres base)',
      'Acceso completo a módulo Newsletter Masivo (Campaigner Lite)',
      'Ahorro de $148.00 MXN mensuales sobre la compra individual',
      'Configuración unificada y automatización de negocio cruzada'
    ]
  },
  {
    id: 'pack-pos-ecommerce',
    name: 'Paquete POS & E-commerce Pro',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Punto de venta físico, Tienda, Envíos Skydropx, Facturación SAT y Campaigner Lite.',
    detailedDescription: 'La solución comercial definitiva para negocios omnicanal. Integra tu tienda en línea y tu mostrador físico (POS) con inventario unificado. Incluye 100 timbres fiscales al mes, Campaigner Lite y es compatible con hardware POS comercial (pago único de hardware de $1,799.00 MXN).',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/tenants/models.py (pack-pos-ecommerce)',
    complexity: 'Muy Alta',
    serverRequirements: 'Lector de código de barras USB + Impresora térmica + Cajón de dinero RJ11 (Hardware adicional).',
    technicalDetails: [
      'Consola POS rápida con lector de barras',
      'Sincronización de inventario en tiempo real',
      'Acceso completo a Tienda + Envíos Skydropx',
      'Facturación SAT con 100 timbres incluidos',
      'Campaigner Lite sin costo'
    ]
  },
  {
    id: 'pack-blog-sponsors',
    name: 'Paquete Blog & Sponsors',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Monetiza tu contenido: Blog, Sponsors recurrentes (Stripe), Tienda, Facturación y Campaigner.',
    detailedDescription: 'El paquete ideal para creadores de contenido y marcas personales. Permite monetizar mediante suscripciones recurrentes de Stripe (Sponsors), vender productos físicos o digitales en tu tienda y emitir facturas del SAT de forma integrada, con boletines de Campaigner Lite.',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/tenants/models.py (pack-blog-sponsors)',
    complexity: 'Media',
    serverRequirements: 'Cuenta de Stripe para suscripciones + Configuración de Tienda.',
    technicalDetails: [
      'Suscripciones recurrentes de Stripe con tiers',
      'Gestión de roles y feeds exclusivos para sponsors',
      'Acceso completo a Tienda Online',
      'Facturación SAT integrada',
      'Campaigner Lite sin costo'
    ]
  },
  {
    id: 'campaigner',
    name: 'Campaigner Masivo',
    categoryBadge: 'EMAIL MARKETING',
    description: 'Envío de boletines y campañas de email masivo sin renta fija. Cobro dinámico a $0.01 MXN por correo enviado.',
    detailedDescription: 'Envía boletines interactivos a tu base de contactos usando nuestro servicio integrado. Sin renta fija mensual ni anual; solo pagas 1 centavo ($0.01 MXN) por cada correo enviado, descontado de tu Cartera Digital prepago.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/newsletter (Subscriber, send_newsletter_email)',
    complexity: 'Baja',
    serverRequirements: 'Cartera Digital con saldo positivo ($0.01 MXN por correo).',
    technicalDetails: [
      'Tokens únicos de desuscripción seguros (UUID)',
      'Render de templates de correo HTML interactivos',
      'Cobro automático por destinatario a $0.01 MXN',
      'Sin renta fija mensual o anual'
    ]
  },
  {
    id: 'booking-signature',
    name: 'Néctar Contratos Digitales',
    categoryBadge: 'CONTRATOS DIGITALES',
    description: 'Motor de contratos digitales con firma incrustada en lienzo y generación automática de PDFs. Sin límites de documentos ni de firmantes.',
    detailedDescription: 'Ideal para digitalizar acuerdos contractuales. Permite configurar contratos, generar propuestas en PDF automáticas y capturar firmas táctiles seguras con marcas de tiempo, sin límites en la cantidad de documentos o firmantes.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/contracts/models/contract.py',
    complexity: 'Alta',
    serverRequirements: 'Almacenamiento seguro en la nube para PDFs.',
    technicalDetails: [
      'Lienzo de firma en React (HTML5 Canvas)',
      'Generación de documentos PDF vía backend',
      'Notificaciones de propuesta por correo electrónico',
      'Sin límite de documentos o firmantes'
    ]
  },
  {
    id: 'booking',
    name: 'Agendador de Citas & Kanban',
    categoryBadge: 'GESTIÓN Y CITAS',
    description: 'Gestor de reservas y agendador de citas interactivo integrado con un tablero Kanban para seguimiento de estados.',
    detailedDescription: 'Permite a tus clientes agendar citas directamente desde tu portal. Gestiona la disponibilidad, envía recordatorios y organiza las reservas en un tablero Kanban interactivo para optimizar el flujo de trabajo.',
    monthlyPrice: 49,
    yearlyPrice: 490,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/bookings',
    complexity: 'Media',
    serverRequirements: 'Base de datos relacional para control de solapamiento de horarios.',
    technicalDetails: [
      'Calendario de reservas interactivo para clientes',
      'Tablero Kanban integrado para gestión interna',
      'Configuración de horarios de atención',
      'Notificaciones y recordatorios automáticos'
    ]
  },
  {
    id: 'bot-chat',
    name: 'Néctar AI Chat Bot',
    categoryBadge: 'COMUNICACIÓN EN VIVO',
    description: 'Widget de chat flotante en tiempo real y consola multi-agente con historial persistente.',
    detailedDescription: 'Un canal de comunicación instantáneo integrado para retención y soporte de usuarios. Los clientes ven un widget interactivo de chat, mientras que los agentes de soporte de IA responden y el staff técnico gestiona las conversaciones desde una consola interna dedicada.',
    monthlyPrice: 99,
    yearlyPrice: 990,
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
    id: 'delivery-tracking',
    name: 'Tienda + Envíos con Skydropx',
    categoryBadge: 'LOGÍSTICA Y CONTROL',
    description: 'Configura tus almacenes de origen, cotiza envíos en tiempo real con margen de ganancia y emite guías automáticamente.',
    detailedDescription: 'Módulo de logística inteligente integrado. Registra las tarifas reales desde la API de Skydropx y les aplica tu margen (markup) del 15% o personalizado directamente en el checkout, automatizando la generación de etiquetas en pedidos pagados.',
    monthlyPrice: 249,
    yearlyPrice: 2490,
    originProject: 'losplacosones',
    sourceReference: 'losplacosones/backend/apps/delivery',
    complexity: 'Muy Alta',
    serverRequirements: 'Cuenta en Skydropx (API Key de desarrollo o producción) + Configuración de dirección de almacén.',
    technicalDetails: [
      'Cotización dinámica multitarifa (FedEx, DHL, Estafeta)',
      'Margen (markup) de ganancia sobre tarifas base',
      'Emisión automatizada de guías tras confirmación de pago',
      'Seguimiento y URL de rastreo guardados en la orden'
    ]
  },
  {
    id: 'sponsorship',
    name: 'Néctar Sponsors & NSCAP',
    categoryBadge: 'MONETIZACIÓN',
    description: 'Pasarela de suscripciones recurrentes de Stripe con control de acceso a feeds exclusivos y niveles de membresía.',
    detailedDescription: 'Permite monetizar tu contenido, comunidad o SaaS de manera flexible. Automatiza cobros recurrentes de Stripe, gestiona roles y bloquea o desbloquea secciones de contenido multimedia basándose en el nivel del suscriptor.',
    monthlyPrice: 169,
    yearlyPrice: 1690,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/sponsorship/models/sponsorship.py',
    complexity: 'Media',
    serverRequirements: 'Cuenta comercial de Stripe + Configuración de endpoint para Webhooks HTTPS del backend.',
    technicalDetails: [
      'Integración con Stripe Billing API and Webhooks',
      'Definición de tiers o niveles dinámicos desde Django Admin',
      'Validación automatizada de estatus de membresías en backend',
      'Portal de auto-gestión del suscriptor'
    ]
  },
  {
    id: 'business-analytics',
    name: 'Néctar Administrador de Ventas y Analytics',
    categoryBadge: 'MONETIZACIÓN',
    description: 'Administrador de ventas y analytics para Nectar, con dashboard de métricas en tiempo real, gráficos interactivos y exportación de datos.',
    detailedDescription: 'Administra las ventas y analytics de tu plataforma. Con un dashboard intuitivo, podrás ver métricas en tiempo real, gráficos interactivos y exportar datos en diferentes formatos. Ideal para negocios que buscan optimizar sus ventas y analytics.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/sales (SalesMiddleware, models.py)',
    complexity: 'Media',
    serverRequirements: 'Módulo de Middleware Django instalado + Agregación de logs asíncrona para no afectar el flujo principal.',
    technicalDetails: [
      'Dashboard interactivo con métricas en tiempo real',
      'Exportación de datos en diferentes formatos',
      'Gráficos interactivos',
      'Registro detallado de transacciones'
    ]
  },
  {
    id: 'facturacion-cfdi',
    name: 'Facturación SAT México',
    categoryBadge: 'CONTABILIDAD Y FISCAL',
    description: 'Emite facturas CFDI 4.0 oficiales del SAT a tus clientes de manera automatizada y marca blanca. Incluye 20 timbres base.',
    detailedDescription: 'Módulo de facturación fiscal electrónica para México. Permite crear organizaciones subordinadas en Facturapi, subir sellos CSD y timbrar facturas CFDI 4.0 directamente desde tu portal. Incluye 20 timbres mensuales base.',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/billing (models.py, services.py, views.py)',
    complexity: 'Alta',
    serverRequirements: 'Configuración de credenciales de PAC (Facturapi API Key) en variables de entorno + HTTPS para subida segura de sellos.',
    technicalDetails: [
      'Creación dinámica de organizaciones subordinadas en el PAC',
      'Carga directa y segura de sellos CSD (.cer, .key)',
      'Soporte para 20 timbres mensuales incluidos',
      'Timbres extra a $1.50 MXN c/u en prepago',
      'Generación y timbrado automatizado de CFDI 4.0',
      'Descarga de archivos XML y PDF de facturas',
      'Manejo inteligente de sincronización LCO del SAT'
    ]
  },
  {
    id: 'automatic-invoicing',
    name: 'Facturación Automática SAT',
    categoryBadge: 'CONTABILIDAD Y FISCAL',
    description: 'Timbrado automático e inmediato de facturas CFDI 4.0 al recibir pagos de tus clientes finales.',
    detailedDescription: 'Módulo de facturación automática como agregado del módulo de facturación SAT México. Permite automatizar al 100% el timbrado de facturas al recibir pagos de abonos o mensualidades.',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    originProject: 'nectarlabs-main',
    sourceReference: 'backend/apps/shop/views.py',
    complexity: 'Media',
    serverRequirements: 'Módulo Facturación SAT México activo + Configuración fiscal completa y sellos CSD vigentes.',
    technicalDetails: [
      'Timbrado desatendido inmediato post-pago',
      'Envío automático de XML y PDF a clientes finales',
      'Notificaciones de estado de timbrado al tenant',
      'Reintentos automáticos ante caídas del PAC/SAT'
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
  const [manageAddon, setManageAddon] = useState<Addon | null>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [updatingContractId, setUpdatingContractId] = useState<number | null>(null);
  const [updatingTenantId, setUpdatingTenantId] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [addonsList, setAddonsList] = useState<Addon[]>([]);
  const [hasPlanContract, setHasPlanContract] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [tenantSearch, setTenantSearch] = useState('');

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

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
    const staffCheck = (staff || role === 'ADMIN' || role === 'BUSINESS') && role !== 'DESIGNER';
    setIsStaff(staffCheck);
    setLoading(false);
    setFetching(true);

    const loadAddons = async () => {
      try {
        // Fetch contract information to check for active 6-month plan contracts
        try {
          const contractsData = await fetcher('/contracts/');
          if (Array.isArray(contractsData)) {
            setContracts(contractsData);
            const planContractExists = contractsData.some(
              (c: any) => c.is_active && c.plan !== null && c.plan !== undefined
            );
            setHasPlanContract(planContractExists);
          }
        } catch (contractErr) {
          console.error("Error loading contracts:", contractErr);
        }

        // Fetch tenants owned by the user
        try {
          const tenantsUrl = staffCheck ? '/tenants/?all=true' : '/tenants/';
          const tenantsData = await fetcher(tenantsUrl);
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

        // Fetch active addon subscriptions
        try {
          const subsData = await fetcher('/addon-subscriptions/');
          if (Array.isArray(subsData)) {
            setSubscriptions(subsData);
          }
        } catch (subsErr) {
          console.error("Error loading subscriptions:", subsErr);
        }

        const data = await fetcher('/addons/');
        if (Array.isArray(data)) {
          const mapped: Addon[] = data.map((item: any) => {
            const isDelivery = item.slug === 'logistics-gps';
            return {
              id: item.slug,
              dbId: item.id,
              name: isDelivery ? 'Néctar Delivery' : item.name,
              categoryBadge: isDelivery ? 'LOGÍSTICA Y CONTROL' : item.category_badge,
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
            };
          });
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
        setFetching(false);
      }
    };

    const useFallback = async () => {
      try {
        const contractsData = await fetcher('/contracts/');
        if (Array.isArray(contractsData)) {
          setContracts(contractsData);
          const planContractExists = contractsData.some(
            (c: any) => c.is_active && c.plan !== null && c.plan !== undefined
          );
          setHasPlanContract(planContractExists);
        }
      } catch (contractErr) {
        console.error("Error loading contracts in fallback:", contractErr);
      }

      try {
        const tenantsUrl = staffCheck ? '/tenants/?all=true' : '/tenants/';
        const tenantsData = await fetcher(tenantsUrl);
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

      try {
        const subsData = await fetcher('/addon-subscriptions/');
        if (Array.isArray(subsData)) {
          setSubscriptions(subsData);
        }
      } catch (subsErr) {
        console.error("Error loading subscriptions in fallback:", subsErr);
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

  const handleOpenBillingPortal = async () => {
    try {
      setIsSubmitting(true);
      const data = await fetcher('/addons/customer_portal/', { method: 'POST' });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast(err.message || "Error al abrir el portal de Stripe", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAddon = async (contractId: number, addonSlug: string, isCurrentlyActive: boolean) => {
    try {
      setUpdatingContractId(contractId);
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) return;

      const currentAddons = contract.addons || [];
      const newAddons = isCurrentlyActive
        ? currentAddons.filter((slug: string) => slug !== addonSlug)
        : [...currentAddons, addonSlug];

      const updated = await fetcher(`/contracts/${contractId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ addons: newAddons })
      });

      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, addons: updated.addons } : c));
    } catch (err) {
      showToast("Error al actualizar los Add-ons del cliente.", 'error');
    } finally {
      setUpdatingContractId(null);
    }
  };

  const handleToggleTenantAddon = async (tenantId: string, addonSlug: string, isCurrentlyActive: boolean) => {
    try {
      setUpdatingTenantId(tenantId);
      const res = await fetcher('/contracts/toggle-addon/', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId, addon_slug: addonSlug, is_active: !isCurrentlyActive })
      });
      if (res.status === 'success') {
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, active_addons: res.active_addons } : t));
        showToast("Add-on actualizado exitosamente para el portal.", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Error al actualizar el Add-on.", "error");
    } finally {
      setUpdatingTenantId(null);
    }
  };

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
            comments: checkoutComments,
            billing_cycle: billingCycle
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

      // Register the pending AddOnSubscription in the backend
      const addonId = requestAddon.dbId || requestAddon.id;
      await fetcher('/addon-subscriptions/', {
        method: 'POST',
        body: JSON.stringify({
          addon: addonId,
          billing_cycle: billingCycle,
        })
      }).catch(err => {
        console.error("Error creating pending addon subscription record:", err);
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
      <DashboardSidebar />

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
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${billingCycle === 'monthly'
                  ? 'bg-nectar-gold text-background shadow-md'
                  : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
                  }`}
              >
                Pago Mensual
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${billingCycle === 'yearly'
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
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {fetching ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card-bg border border-card-border p-6 rounded-[2rem] animate-pulse flex flex-col justify-between min-h-[300px]">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="h-6 bg-foreground/10 rounded w-1/3"></div>
                      <div className="w-8 h-8 bg-foreground/10 rounded-xl"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-foreground/10 rounded w-3/4"></div>
                      <div className="h-3 bg-foreground/10 rounded w-5/6"></div>
                      <div className="h-3 bg-foreground/10 rounded w-full"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-foreground/10 rounded-lg w-full mt-6"></div>
                </div>
              ))}
            </>
          ) : addonsList.filter(addon => addon.id !== 'automatic-invoicing').map((addon) => {
            // Desacoplado: Todos los addons que vienen del backend están disponibles para contratarse de forma independiente
            const isEnabled = true;
            const price = billingCycle === 'monthly' ? addon.monthlyPrice : addon.yearlyPrice;
            const savings = billingCycle === 'yearly' ? addon.monthlyPrice * 2 : 0;

            // Buscamos el inquilino activo del usuario para mapear si ya lo tiene comprado
            const currentActiveTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];

            // SOLUCIÓN RAÍZ: Validamos usando addon.id (que tiene el string del slug según tu mapeo de API)
            const aliases: { [key: string]: string } = {
              'bot-chat': 'live-chat',
              'live-chat': 'bot-chat',
              'delivery-tracking': 'logistics-gps',
              'logistics-gps': 'delivery-tracking',
              'sponsorship': 'patreon-sponsorship',
              'patreon-sponsorship': 'sponsorship',
              'business-analytics': 'analytics-apm',
              'analytics-apm': 'business-analytics',
              'campaigner': 'newsletter-campaigner',
              'newsletter-campaigner': 'campaigner',
              'facturacion-cfdi': 'mexico-invoicing',
              'mexico-invoicing': 'facturacion-cfdi',
            };
            const addonAlias = aliases[addon.id] || addon.id;

            const isAddonActive =
              tenants.some(t => t.active_addons?.includes(addon.id) || t.active_addons?.includes(addonAlias)) ||
              (currentActiveTenant?.active_addons || []).includes(addon.id) ||
              (currentActiveTenant?.active_addons || []).includes(addonAlias) ||
              subscriptions.some(s => (s.addon_details?.slug === addon.id || s.addon_details?.slug === addonAlias) && ['active', 'trialing'].includes(s.status)) ||
              contracts.some(c => (c.addons || []).includes(addon.id) || (c.addons || []).includes(addonAlias));

            return (
              <div
                key={addon.id}
                className="bg-card-bg border border-card-border p-6 rounded-[2rem] flex flex-col justify-between min-h-[300px] relative overflow-hidden backdrop-blur-md hover:scale-[1.02] transition-all duration-300 group"
              >
                {/* Subtle Background Glow */}
                <div className="absolute -top-24 -right-24 w-40 h-40 bg-foreground/[0.02] blur-[40px] rounded-full group-hover:bg-foreground/[0.04] transition-all duration-500 pointer-events-none"></div>

                <div className="space-y-4">
                  {/* Category Badge & Icon */}
                  <div className="flex justify-between items-start">
                    <span className="text-3xl">{addon.icon}</span>
                    <div className="flex flex-col gap-1.5 items-end">
                      <span className="px-2.5 py-0.5 bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/25 text-[7px] font-black rounded-full uppercase tracking-wider font-mono">
                        {addon.categoryBadge}
                      </span>
                      {isAddonActive && (
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[7px] font-black rounded-full uppercase tracking-wider font-mono">
                          ✔️ Activo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-black uppercase text-foreground tracking-wide mt-2">{addon.name}</h3>
                    <p className="text-[10px] text-foreground/60 leading-relaxed mt-2 line-clamp-4">{addon.description}</p>
                  </div>
                </div>

                {/* Pricing & Call to Action */}
                <div className="border-t border-card-border pt-4 mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      {hasPlanContract ? (
                        <div>
                          <span className="text-[7.5px] uppercase font-black text-foreground/40 block">Esquema Comercial</span>
                          <span className="text-base font-black text-[#C68A1E] font-mono">
                            Gratuito
                          </span>
                          <p className="text-[7px] text-foreground/35 uppercase tracking-widest mt-0.5">
                            Incluido en tu Plan
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[7.5px] uppercase font-black text-foreground/40 block">
                            Precio {billingCycle === 'monthly' ? 'mensual' : 'anual'}
                          </span>
                          <span className="text-base font-black text-[#C68A1E] font-mono">
                            ${(price || 0).toLocaleString('es-MX')} MXN
                          </span>
                          {billingCycle === 'yearly' && savings > 0 && (
                            <p className="text-[7px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
                              Ahorro de ${(savings || 0).toLocaleString('es-MX')} MXN
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${addon.complexity === 'Muy Alta' ? 'text-red-400 bg-red-400/5 border-red-400/20' :
                      addon.complexity === 'Alta' ? 'text-orange-400 bg-orange-400/5 border-orange-400/20' :
                      addon.complexity === 'Media' ? 'text-yellow-400 bg-yellow-400/5 border-yellow-400/20' :
                      'text-emerald-400 bg-emerald-400/5 border-emerald-400/20'
                      }`}>
                      {addon.complexity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedAddon(addon)}
                      className="px-4 py-2 bg-foreground/[0.04] border border-card-border hover:bg-foreground/[0.08] text-foreground text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer text-center"
                    >
                      Ficha
                    </button>
                    {isStaff ? (
                      <button
                        type="button"
                        onClick={() => setManageAddon(addon)}
                        className="px-4 py-2 text-background text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer text-center"
                        style={{ backgroundColor: '#C68A1E' }}
                      >
                        Asignar
                      </button>
                    ) : isAddonActive ? (
                      hasPlanContract ? (
                        <button
                          disabled
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest rounded-lg cursor-default text-center"
                        >
                          Activo
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenBillingPortal}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer text-center"
                        >
                          {isSubmitting ? '...' : 'Gestionar'}
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRequestAddon(addon)}
                        className="px-4 py-2 text-background text-[8px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer text-center"
                        style={{ backgroundColor: '#C68A1E' }}
                      >
                        {hasPlanContract ? 'Solicitar' : 'Adquirir'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Modal: View Details / Ficha Técnica */}
        {selectedAddon && (
          <div
            onClick={() => setSelectedAddon(null)}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-premium cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-card-bg border border-card-border w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default"
            >
              <button
                type="button"
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
                {isStaff ? (
                  <button
                    type="button"
                    onClick={() => {
                      setManageAddon(selectedAddon);
                      setSelectedAddon(null);
                    }}
                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest bg-nectar-gold text-background hover:scale-[1.02] active:scale-95 transition-all rounded-xl text-center shadow-lg"
                  >
                    Asignar este Add-on a Cliente
                  </button>
                ) : (
                  <button
                    type="button"
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
                )}
                <button
                  type="button"
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
          <div
            onClick={() => setRequestAddon(null)}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-premium cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-card-bg border border-card-border w-full max-w-xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default"
            >
              <button
                type="button"
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
                    : 'Estás solicitando la adición del módulo en tu plan de servicio. Esto creará un ticket en tu panel de Soporte para koordinar la implementación y facturación.'}
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

        {/* Modal: Admin Manage Client Addons */}
        {manageAddon && (
          <div
            onClick={() => { setManageAddon(null); setTenantSearch(''); }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-premium cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-card-bg border border-card-border w-full max-w-xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default"
            >
              <button
                type="button"
                onClick={() => { setManageAddon(null); setTenantSearch(''); }}
                className="absolute top-6 right-6 w-10 h-10 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-full flex items-center justify-center text-lg font-bold transition-all"
              >
                ✕
              </button>

              <div className="mb-6">
                <span className="text-[8px] font-black uppercase tracking-widest text-nectar-gold block mb-1 font-mono">
                  Administración de Add-on · Sistema Completo
                </span>
                <h2 className="text-3xl font-black tracking-tight mb-2">Asignar {manageAddon.name}</h2>
                <p className="text-xs text-muted leading-relaxed">
                  Activa o desactiva este módulo para cualquier portal activo del ecosistema. Los cambios se aprovisionan de forma inmediata.
                </p>
              </div>

              {/* Search bar */}
              <div className="relative mb-5">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="tenant-search-admin"
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Buscar por nombre o subdominio..."
                  className="w-full bg-background/50 border border-card-border focus:border-nectar-gold/60 outline-none rounded-2xl pl-10 pr-4 py-3 text-xs text-foreground placeholder:text-muted/40 transition-colors"
                />
                {tenantSearch && (
                  <button
                    type="button"
                    onClick={() => setTenantSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors text-sm font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1 text-left">
                {(() => {
                  const filtered = tenants
                    .filter(t => t.is_active)
                    .filter(t => {
                      if (!tenantSearch.trim()) return true;
                      const q = tenantSearch.toLowerCase();
                      return t.name?.toLowerCase().includes(q) || t.subdomain?.toLowerCase().includes(q);
                    });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 text-foreground/30">
                        <p className="text-xs font-bold uppercase tracking-widest">Sin resultados</p>
                        <p className="text-[10px] mt-1">No hay portales activos que coincidan con la búsqueda.</p>
                      </div>
                    );
                  }

                  return filtered.map(tenant => {
                    const aliases: { [key: string]: string } = {
                      'bot-chat': 'live-chat',
                      'live-chat': 'bot-chat',
                      'delivery-tracking': 'logistics-gps',
                      'logistics-gps': 'delivery-tracking',
                      'sponsorship': 'patreon-sponsorship',
                      'patreon-sponsorship': 'sponsorship',
                      'business-analytics': 'analytics-apm',
                      'analytics-apm': 'business-analytics',
                      'campaigner': 'newsletter-campaigner',
                      'newsletter-campaigner': 'campaigner',
                      'facturacion-cfdi': 'mexico-invoicing',
                      'mexico-invoicing': 'facturacion-cfdi',
                    };
                    const manageAddonAlias = aliases[manageAddon.id] || manageAddon.id;
                    const isActive = (tenant.active_addons || []).includes(manageAddon.id) || (tenant.active_addons || []).includes(manageAddonAlias);
                    const isUpdating = updatingTenantId === tenant.id;

                    return (
                      <div key={tenant.id} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-card-border/60 hover:border-nectar-gold/30 transition-all">
                        <div className="min-w-0 pr-3">
                          <span className="font-bold text-xs text-foreground block truncate">
                            {tenant.name}
                          </span>
                          <span className="text-[8.5px] text-foreground/50 block font-semibold uppercase tracking-wider mt-0.5 font-mono">
                            {tenant.subdomain}.nectarlabs.dev
                          </span>
                          {isActive && (
                            <span className="text-[7px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded mt-1 inline-block">
                              ✓ Módulo Activo
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleTenantAddon(tenant.id, manageAddon.id, isActive)}
                          disabled={isUpdating}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none relative flex-shrink-0 ${isActive ? 'bg-nectar-gold' : 'bg-card-border'} ${isUpdating ? 'opacity-55 cursor-not-allowed' : ''}`}
                        >
                          {isUpdating ? (
                            <div className="w-4 h-4 rounded-full bg-white/70 flex items-center justify-center">
                              <div className="w-2 h-2 border border-nectar-gold/60 border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : (
                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                          )}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-card-border/50 mt-6">
                <span className="text-[9px] text-foreground/30 font-mono">
                  {tenants.filter(t => t.is_active).length} portales activos en el sistema
                </span>
                <button
                  type="button"
                  onClick={() => { setManageAddon(null); setTenantSearch(''); }}
                  className="px-8 py-3.5 text-xs font-black uppercase tracking-widest bg-nectar-gold text-background hover:scale-[1.02] active:scale-95 rounded-xl text-center shadow-lg transition-all"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Premium UI Overlay Elements */}
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