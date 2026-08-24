'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetcher } from '@/lib/api';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  use_custom_domain: boolean;
  logo_url: string | null;
  theme_color?: string;
  accent_color?: string;
  is_active: boolean;
}

export interface Plan {
  id: number;
  name: string;
  price: string;
  hours: number;
  description: string;
  is_recommended: boolean;
}

export interface Addon {
  id: string;
  name: string;
  categoryBadge: string;
  description: string;
  detailedDescription: string;
  monthlyPrice: number;
  yearlyPrice: number;
  complexity: 'Baja' | 'Media' | 'Alta' | 'Muy Alta';
  serverRequirements: string;
  technicalDetails: string[];
}

export interface LandingDataContextType {
  tenants: Tenant[];
  plans: Plan[];
  addons: Addon[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const CACHE_KEY = 'nectar_landing_data_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de tiempo de vida de la caché SWR

const DEFAULT_PLANS: Plan[] = [
  {
    id: 1,
    name: "Plan Básico",
    price: "2999.00",
    hours: 0,
    description: "Contrato a 6 meses. Acceso completo a todos los add-ons utilizables dentro de las plantillas oficiales de Nectar Labs. Personalización autónoma mediante herramientas nativas.",
    is_recommended: false
  },
  {
    id: 2,
    name: "Plan Mid",
    price: "3499.00",
    hours: 0,
    description: "Contrato a 6 meses. Soporte para todos los add-ons personalizados a la marca del cliente. Restringido exclusivamente al uso y customización de plantillas oficiales.",
    is_recommended: false
  },
  {
    id: 3,
    name: "Plan Premium",
    price: "3999.00",
    hours: 12,
    description: "Contrato a 6 meses. 12 horas dedicadas de ingeniería mensual. Personalización total de marca y creación de funcionalidades a medida desde cero o sobre plantillas.",
    is_recommended: true
  }
];

const DEFAULT_ADDONS: Addon[] = [
  {
    id: 'pack-ecommerce-lite',
    name: 'Paquete E-commerce Lite',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Solución integral de comercio electrónico para marcas en crecimiento con envíos y facturación SAT.',
    detailedDescription: 'Lanza tu canal de ventas en línea con control total de productos, cobro con tarjeta vía Stripe, cálculo automático de envíos nacionales Skydropx, facturación SAT y boletines masivos.',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    complexity: 'Alta',
    serverRequirements: 'Sincronización en tiempo real de inventarios y webhooks de pasarela.',
    technicalDetails: [
      'Tienda en línea completa con carrito y checkout optimizado',
      'Integración nativa con Skydropx para guías de envío',
      'Facturación SAT CFDI 4.0 automatizada (100 timbres)',
      'Boletines masivos con Campaigner Lite'
    ]
  },
  {
    id: 'pack-pos-ecommerce',
    name: 'Paquete POS & E-commerce Pro',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Punto de venta físico, Tienda en línea, Envíos automatizados, Facturación SAT y Campaigner Lite.',
    detailedDescription: 'La solución comercial definitiva para negocios omnicanal. Conecta tu mostrador físico (POS) con tu tienda digital mediante inventario unificado en tiempo real, facturación fiscal SAT y marketing automatizado.',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    complexity: 'Muy Alta',
    serverRequirements: 'Sincronización omnicanal multi-dispositivo para mostrador físico y tienda online.',
    technicalDetails: [
      'Consola POS ultra-rápida con soporte para lector de código de barras',
      'Sincronización de inventario físico y digital en tiempo real',
      'Acceso completo a Tienda + Envíos Nacionales',
      'Facturación SAT con 100 timbres incluidos',
      'Campaigner Lite para fidelización de clientes'
    ]
  },
  {
    id: 'pack-blog-sponsors',
    name: 'Paquete Blog & Sponsors',
    categoryBadge: 'PAQUETE PRINCIPAL',
    description: 'Monetiza tu contenido: Blog corporativo, Sponsors recurrentes, Tienda Online, Facturación SAT y Campaigner.',
    detailedDescription: 'El paquete ideal para creadores de contenido y marcas. Monetiza tu audiencia mediante membresías y patrocinios recurrentes con Stripe, vende productos físicos o digitales y emite facturas SAT integradas.',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    complexity: 'Media',
    serverRequirements: 'Configuración ágil y cobranza automatizada vía Stripe Connect.',
    technicalDetails: [
      'Suscripciones recurrentes de patrocinadores con niveles flexibles',
      'Feeds y contenido exclusivo para miembros y patrocinios',
      'Acceso completo a Tienda Online',
      'Facturación SAT automatizada',
      'Boletines informativos con Campaigner'
    ]
  },
  {
    id: 'campaigner',
    name: 'Campaigner Masivo',
    categoryBadge: 'EMAIL MARKETING',
    description: 'Envío de boletines y campañas de email masivo con analítica en tiempo real para acelerar tus ventas.',
    detailedDescription: 'Diseña y envía campañas masivas de correo electrónico con plantillas profesionales, control de bajas automático y medición de conversiones para mantener a tu audiencia comprometida.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    complexity: 'Baja',
    serverRequirements: 'Envío asistido de alta entregabilidad por infraestructura prepago ($0.01 MXN/correo).',
    technicalDetails: [
      'Desuscripción segura en un clic y protección anti-spam',
      'Editor visual de correos HTML interactivos',
      'Cobro transparente a $0.01 MXN por correo enviado',
      'Métricas detalladas de apertura y clics'
    ]
  },
  {
    id: 'booking-signature',
    name: 'Néctar Contratos Digitales',
    categoryBadge: 'CONTRATOS DIGITALES',
    description: 'Motor de contratos digitales con firma en pantalla táctil y generación automática de PDFs legales.',
    detailedDescription: 'Digitaliza el cierre de acuerdos comerciales. Genera cotizaciones y contratos profesionales, envía enlaces de firma digital a tus clientes y almacena evidencias firmadas de forma segura.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    complexity: 'Alta',
    serverRequirements: 'Bóveda digital de almacenamiento seguro en la nube con sellado de tiempo.',
    technicalDetails: [
      'Lienzo de firma digital compatible con móviles y computadoras',
      'Generación instantánea de documentos PDF con identidad de marca',
      'Notificaciones y alertas de propuesta por correo electrónico',
      'Firma ilimitada de documentos sin costo adicional por firmante'
    ]
  },
  {
    id: 'booking',
    name: 'Agendador de Citas & Kanban',
    categoryBadge: 'GESTIÓN Y CITAS',
    description: 'Gestor de reservas y citas interactivo integrado con un tablero Kanban para seguimiento operativo.',
    detailedDescription: 'Permite a tus clientes agendar citas directamente desde tu web. Configura tu disponibilidad, evita cruces de agenda y gestiona el estado de cada servicio en un tablero Kanban intuitivo.',
    monthlyPrice: 49,
    yearlyPrice: 490,
    complexity: 'Media',
    serverRequirements: 'Control inteligente de horarios y prevención de solapamientos.',
    technicalDetails: [
      'Calendario de reservas en tiempo real disponible 24/7',
      'Tablero Kanban operativo para seguimiento de citas',
      'Horarios flexibles por especialista o tipo de servicio',
      'Recordatorios automáticos por correo para reducir ausentismo'
    ]
  },
  {
    id: 'bot-chat',
    name: 'Néctar AI Chat Bot',
    categoryBadge: 'COMUNICACIÓN EN VIVO',
    description: 'Widget de chat flotante en tiempo real y consola multi-agente con asistencia inteligente.',
    detailedDescription: 'Aumenta la conversión atendiendo las dudas de tus prospectos al instante. Widget flotante configurable en tu sitio web con panel de atención para tu equipo o asistencia inteligente.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    complexity: 'Media',
    serverRequirements: 'Comunicación en vivo instantánea con resiliencia de conexión.',
    technicalDetails: [
      'Widget flotante elegante e incrustable en cualquier página',
      'Consola de atención unificada para tu equipo de ventas',
      'Asignación ágil de conversaciones y seguimiento de estado',
      'Historial persistente de conversaciones por cliente'
    ]
  }
];

const LandingDataContext = createContext<LandingDataContextType>({
  tenants: [],
  plans: DEFAULT_PLANS,
  addons: DEFAULT_ADDONS,
  loading: true,
  error: null,
  refreshData: async () => {},
});

export const LandingDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [addons, setAddons] = useState<Addon[]>(DEFAULT_ADDONS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializar estado con datos guardados en caché SWR si existen
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedStr = sessionStorage.getItem(CACHE_KEY);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            if (Array.isArray(cached.tenants)) setTenants(cached.tenants);
            if (Array.isArray(cached.plans) && cached.plans.length > 0) setPlans(cached.plans);
            if (Array.isArray(cached.addons) && cached.addons.length > 0) setAddons(cached.addons);
            setLoading(false);
          }
        }
      } catch (e) {
        console.warn('[LandingDataContext] Error leyendo caché SWR local:', e);
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const fetchOptions = { isPublic: true, retries: 3, retryDelay: 500 };

    try {
      const [tenantsRes, plansRes, addonsRes] = await Promise.allSettled([
        fetcher('/tenants/', fetchOptions),
        fetcher('/plans/', fetchOptions),
        fetcher('/addons/', fetchOptions),
      ]);

      let newTenants: Tenant[] = [];
      let newPlans: Plan[] = DEFAULT_PLANS;
      let newAddons: Addon[] = DEFAULT_ADDONS;

      if (tenantsRes.status === 'fulfilled' && Array.isArray(tenantsRes.value)) {
        newTenants = tenantsRes.value.filter((t: Tenant) => t.is_active !== false);
      }

      if (plansRes.status === 'fulfilled' && Array.isArray(plansRes.value) && plansRes.value.length > 0) {
        newPlans = plansRes.value.map((p: any) => ({
          id: p.id,
          name: p.name || 'Plan',
          price: String(p.price || p.totalMonthly || '2999.00'),
          hours: p.hours || 0,
          description: p.description || '',
          is_recommended: !!p.is_recommended,
        }));
      }

      if (addonsRes.status === 'fulfilled' && Array.isArray(addonsRes.value) && addonsRes.value.length > 0) {
        newAddons = addonsRes.value.map((a: any) => {
          const rawTech = a.technical_details;
          let techDetails: string[] = [];
          if (Array.isArray(rawTech)) {
            techDetails = rawTech;
          } else if (typeof rawTech === 'string' && rawTech.trim()) {
            try {
              const parsed = JSON.parse(rawTech);
              if (Array.isArray(parsed)) techDetails = parsed;
            } catch {
              techDetails = rawTech.split('\n').map(s => s.trim()).filter(Boolean);
            }
          }

          return {
            id: a.slug || a.id,
            name: a.name || 'Módulo',
            categoryBadge: a.category_badge || 'MÓDULO ADICIONAL',
            description: a.description || '',
            detailedDescription: a.detailed_description || a.description || '',
            monthlyPrice: parseFloat(a.monthly_price) || 0,
            yearlyPrice: parseFloat(a.yearly_price) || 0,
            complexity: a.complexity || 'Media',
            serverRequirements: a.server_requirements || 'Infraestructura asistida.',
            technicalDetails: techDetails,
          };
        });
      }

      setTenants(newTenants);
      setPlans(newPlans);
      setAddons(newAddons);

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              tenants: newTenants,
              plans: newPlans,
              addons: newAddons,
            })
          );
        } catch (e) {
          console.warn('[LandingDataContext] Error al guardar en caché SWR:', e);
        }
      }
    } catch (err: any) {
      console.warn('[LandingDataContext] Degradación defensiva activada:', err);
      setError(err.message || 'Error de sincronización con la API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <LandingDataContext.Provider
      value={{
        tenants,
        plans,
        addons,
        loading,
        error,
        refreshData: loadData,
      }}
    >
      {children}
    </LandingDataContext.Provider>
  );
};

export const useLandingData = () => useContext(LandingDataContext);
