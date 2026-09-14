/**
 * Utilidad universal para resolución de URLs de Tenants en el ecosistema Nectar Labs.
 * Soporta de forma idempotente los 3 escenarios:
 * 1. Dominio personalizado propio (ej. kores.vip / staging.kores.vip)
 * 2. Subdominio nativo con plantilla Nectar (ej. sushilo.nectarlabs.dev)
 * 3. Subdominio con frontend externo o código aislado (ej. cliente.nectarlabs.dev)
 */

export interface TenantUrlData {
  subdomain: string;
  custom_domain?: string | null;
  use_custom_domain?: boolean;
  custom_frontend_url?: string | null;
}

export function getTenantPublicUrl(tenant: TenantUrlData, currentHost?: string): string {
  // 1. Detectar entorno actual
  let host = currentHost || '';
  if (!host && typeof window !== 'undefined') {
    host = window.location.host;
  }

  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const isStaging = host.includes('staging.nectarlabs.dev') || host.includes('-staging');

  // Mapeo canónico para proyectos dedicados autónomos (ej: Kōres)
  const isKores = tenant.subdomain === 'kores' || tenant.subdomain === 'kores-mexico';
  if (isKores) {
    if (isStaging) return 'https://staging.kores.vip';
    if (!isLocalhost) return 'https://kores.vip';
  }

  // 2. Escenario 1: Dominio Personalizado Propio
  if (tenant.use_custom_domain && tenant.custom_domain) {
    const rawDomain = tenant.custom_domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (isStaging && !rawDomain.startsWith('staging.')) {
      return `https://staging.${rawDomain}`;
    }
    return `https://${rawDomain}`;
  }

  // 3. Entorno Local de Desarrollo
  if (isLocalhost) {
    const port = host.split(':')[1];
    if (port) {
      return `http://${host}/tenants/${tenant.subdomain}`;
    }
    return `http://${tenant.subdomain}.localhost`;
  }

  // 4. Escenario 2 & 3: Subdominio Nectar Labs (Nativo o Personalizado Aislado)
  const baseDomain = isStaging ? 'staging.nectarlabs.dev' : 'nectarlabs.dev';
  return `https://${tenant.subdomain}.${baseDomain}`;
}
