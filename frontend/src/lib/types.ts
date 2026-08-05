// ==============================================================================
// SISTEMA UNIFICADO DE TIPOS DTO & INTERFACES PARA NECTAR-LABS FRONTEND
// ==============================================================================

export type UserRole = 
  | 'ADMIN' 
  | 'BUSINESS' 
  | 'STAFF' 
  | 'CLIENT' 
  | 'DRIVER' 
  | 'DEVELOPER' 
  | 'DESIGNER' 
  | 'SALES'
  | string;

export interface User {
  id: number | string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  additional_roles?: string[];
  is_staff?: boolean;
}

export interface Tenant {
  id: number | string;
  name: string;
  subdomain: string;
  custom_domain?: string;
  use_custom_domain?: boolean;
  is_active: boolean;
  logo?: string;
  created_at: string;
  owner?: User;
  active_addons?: string[];
  trial_ends_at?: string;
}

export interface Plan {
  id: number | string;
  name: string;
  slug: string;
  price: number | string;
  yearly_price?: number | string;
  features?: string[];
  stripe_product_id?: string;
  stripe_price_id?: string;
}

export interface AddOn {
  id: number | string;
  name: string;
  slug: string;
  description?: string;
  price: number | string;
  stripe_product_id?: string;
  stripe_price_id?: string;
  icon?: string;
}

export interface Contract {
  id: number | string;
  full_name: string;
  company_name?: string;
  user: User;
  plan?: Plan;
  addons?: AddOn[];
  is_fully_signed: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  tenant?: Tenant;
  user?: User;
  facturapi_invoice_id?: string;
  uuid_sat?: string;
  status: 'PAID' | 'PENDING' | 'CANCELLED' | 'FAILED';
  total: number;
  pdf_url?: string;
  xml_url?: string;
  created_at: string;
}

export interface FacturapiTaxProfile {
  id?: string;
  rfc: string;
  razon_social: string;
  regimen_fiscal: string;
  codigo_postal: string;
  email?: string;
  facturapi_organization_id?: string;
}

export interface OrderItem {
  id: number | string;
  product: number | string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  tenant?: Tenant;
  user?: User;
  user_email?: string;
  total: number;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';
  items: OrderItem[];
  created_at: string;
}

export interface APIErrorResponse {
  detail?: string;
  error?: string;
  message?: string;
  [key: string]: string | string[] | undefined;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err && typeof err === 'object') {
    const errorObj = err as APIErrorResponse;
    if (errorObj.detail) return errorObj.detail;
    if (errorObj.error) return errorObj.error;
    if (errorObj.message) return errorObj.message;
  }
  return 'Ocurrió un error inesperado.';
}
