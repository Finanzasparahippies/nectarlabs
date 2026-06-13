'use client';

import React, { useState, useEffect } from 'react';
import { fetcher } from '@/lib/api';
import SATAutocomplete from '@/components/ui/SATAutocomplete';

interface FacturapiManagerProps {
  tenantId?: string;
  primaryColor?: string;
}

interface Customer {
  id: string;
  legal_name: string;
  tax_id: string;
  tax_system: string;
  email?: string;
  phone?: string;
  address?: {
    zip?: string;
  };
}

interface Product {
  id: string;
  description: string;
  price: number;
  product_key: string;
  unit_key: string;
}

interface Receipt {
  id: string;
  folio_number: number;
  payment_form: string;
  total: number;
  status: string;
  created_at: string;
}

interface Retention {
  id: string;
  customer: {
    legal_name: string;
    tax_id: string;
  };
  cve_retenc: string;
  status: string;
  created_at: string;
}

export default function FacturapiManager({
  tenantId,
  primaryColor = '#C68A1E'
}: FacturapiManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'products' | 'receipts' | 'retentions'>('customers');

  // --- STATE: CUSTOMERS ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState('');
  const [custRfc, setCustRfc] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custZip, setCustZip] = useState('');
  const [custRegimen, setCustRegimen] = useState('601');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);

  // --- STATE: PRODUCTS ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodKey, setProdKey] = useState('43231500');
  const [prodUnitKey, setProdUnitKey] = useState('E48');
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // --- STATE: RECEIPTS ---
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [recFolio, setRecFolio] = useState('');
  const [recPaymentForm, setRecPaymentForm] = useState('01');
  const [recItems, setRecItems] = useState<{ quantity: number; product: Partial<Product> }[]>([
    { quantity: 1, product: { description: '', price: 0, product_key: '43231500', unit_key: 'E48' } }
  ]);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  // --- STATE: RETENTIONS ---
  const [retentions, setRetentions] = useState<Retention[]>([]);
  const [loadingRetentions, setLoadingRetentions] = useState(false);
  const [retentionSearch, setRetentionSearch] = useState('');
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [retCustName, setRetCustName] = useState('');
  const [retCustRfc, setRetCustRfc] = useState('');
  const [retCustEmail, setRetCustEmail] = useState('');
  const [retCustZip, setRetCustZip] = useState('');
  const [retCustRegimen, setRetCustRegimen] = useState('616');
  const [retCve, setRetCve] = useState('03');
  const [retMesIni, setRetMesIni] = useState('1');
  const [retMesFin, setRetMesFin] = useState('1');
  const [retEjerc, setRetEjerc] = useState(new Date().getFullYear().toString());
  const [retMontoOper, setRetMontoOper] = useState('');
  const [retMontoExent, setRetMontoExent] = useState('0');
  const [retImps, setRetImps] = useState<{ impuesto: 'ISR' | 'IVA'; tipo_pago_ret: string; monto_ret: number }[]>([
    { impuesto: 'ISR', tipo_pago_ret: '04', monto_ret: 0 }
  ]);
  const [savingRetention, setSavingRetention] = useState(false);
  const [retentionError, setRetentionError] = useState<string | null>(null);

  // --- TOAST HELPER ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- UTILS: GET QUERY PARAMS ---
  const getParams = () => {
    return tenantId ? `?tenant_id=${tenantId}` : '';
  };

  // --- API CALLS ---
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const data = await fetcher(`/billing/facturapi-customers/${getParams()}`);
      setCustomers(data?.customers ?? []);
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await fetcher(`/billing/facturapi-products/${getParams()}`);
      setProducts(data?.products ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchReceipts = async () => {
    setLoadingReceipts(true);
    try {
      const data = await fetcher(`/billing/facturapi-receipts/${getParams()}`);
      setReceipts(data?.receipts ?? data ?? []);
    } catch {
      setReceipts([]);
    } finally {
      setLoadingReceipts(false);
    }
  };

  const fetchRetentions = async () => {
    setLoadingRetentions(true);
    try {
      const data = await fetcher(`/billing/facturapi-retentions/${getParams()}`);
      setRetentions(data?.retentions ?? data ?? []);
    } catch {
      setRetentions([]);
    } finally {
      setLoadingRetentions(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'customers') fetchCustomers();
    if (activeSubTab === 'products') fetchProducts();
    if (activeSubTab === 'receipts') fetchReceipts();
    if (activeSubTab === 'retentions') fetchRetentions();
  }, [activeSubTab, tenantId]);

  // --- HANDLERS: CUSTOMERS ---
  const openCustomerModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustName(customer.legal_name);
      setCustRfc(customer.tax_id);
      setCustEmail(customer.email ?? '');
      setCustPhone(customer.phone ?? '');
      setCustZip(customer.address?.zip ?? '');
      setCustRegimen(customer.tax_system);
    } else {
      setEditingCustomer(null);
      setCustName('');
      setCustRfc('');
      setCustEmail('');
      setCustPhone('');
      setCustZip('');
      setCustRegimen('601');
    }
    setCustomerError(null);
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCustomer(true);
    setCustomerError(null);
    const payload = {
      rfc: custRfc.trim().toUpperCase(),
      legal_name: custName.trim(),
      email: custEmail.trim(),
      phone: custPhone.trim(),
      zip: custZip.trim(),
      tax_system: custRegimen,
      ...(tenantId ? { tenant_id: tenantId } : {})
    };
    try {
      if (editingCustomer) {
        await fetcher(`/billing/facturapi-customers/${editingCustomer.id}/${getParams()}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showToast('Cliente actualizado con éxito.');
      } else {
        await fetcher(`/billing/facturapi-customers/${getParams()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showToast('Cliente registrado con éxito.');
      }
      setShowCustomerModal(false);
      fetchCustomers();
    } catch (err: any) {
      setCustomerError(err.message || 'Error al guardar cliente.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setDeletingCustomerId(id);
    try {
      await fetcher(`/billing/facturapi-customers/${id}/${getParams()}`, {
        method: 'DELETE',
      });
      showToast('Cliente eliminado del catálogo.');
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar cliente.', 'error');
    } finally {
      setDeletingCustomerId(null);
    }
  };

  // --- HANDLERS: PRODUCTS ---
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProdDesc(product.description);
      setProdPrice(product.price.toString());
      setProdKey(product.product_key);
      setProdUnitKey(product.unit_key);
    } else {
      setEditingProduct(null);
      setProdDesc('');
      setProdPrice('');
      setProdKey('43231500');
      setProdUnitKey('E48');
    }
    setProductError(null);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setProductError(null);
    const payload = {
      description: prodDesc.trim(),
      price: parseFloat(prodPrice),
      product_key: prodKey,
      unit_key: prodUnitKey,
      ...(tenantId ? { tenant_id: tenantId } : {})
    };
    try {
      if (editingProduct) {
        await fetcher(`/billing/facturapi-products/${editingProduct.id}/${getParams()}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showToast('Producto actualizado con éxito.');
      } else {
        await fetcher(`/billing/facturapi-products/${getParams()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showToast('Producto registrado con éxito.');
      }
      setShowProductModal(false);
      fetchProducts();
    } catch (err: any) {
      setProductError(err.message || 'Error al guardar producto.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setDeletingProductId(id);
    try {
      await fetcher(`/billing/facturapi-products/${id}/${getParams()}`, {
        method: 'DELETE',
      });
      showToast('Producto eliminado del catálogo.');
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar producto.', 'error');
    } finally {
      setDeletingProductId(null);
    }
  };

  // --- HANDLERS: RECEIPTS ---
  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingReceipt(true);
    setReceiptError(null);
    const payload = {
      folio_number: recFolio ? parseInt(recFolio) : undefined,
      payment_form: recPaymentForm,
      items: recItems.map(item => ({
        quantity: item.quantity,
        product: {
          description: item.product.description,
          price: parseFloat(item.product.price?.toString() || '0'),
          product_key: item.product.product_key,
          unit_key: item.product.unit_key
        }
      })),
      ...(tenantId ? { tenant_id: tenantId } : {})
    };
    try {
      await fetcher(`/billing/facturapi-receipts/${getParams()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('Nota de venta / Recibo emitido con éxito.');
      setShowReceiptModal(false);
      fetchReceipts();
      setRecFolio('');
      setRecPaymentForm('01');
      setRecItems([{ quantity: 1, product: { description: '', price: 0, product_key: '43231500', unit_key: 'E48' } }]);
    } catch (err: any) {
      setReceiptError(err.message || 'Error al emitir recibo.');
    } finally {
      setSavingReceipt(false);
    }
  };

  // --- HANDLERS: RETENTIONS ---
  const handleSaveRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRetention(true);
    setRetentionError(null);
    const payload = {
      customer: {
        legal_name: retCustName.trim(),
        tax_id: retCustRfc.trim().toUpperCase(),
        tax_system: retCustRegimen,
        email: retCustEmail.trim(),
        address: { zip: retCustZip.trim() }
      },
      cve_retenc: retCve,
      periodo: {
        mes_ini: parseInt(retMesIni),
        mes_fin: parseInt(retMesFin),
        ejerc: parseInt(retEjerc)
      },
      totales: {
        monto_tot_operacion: parseFloat(retMontoOper),
        monto_tot_exent: parseFloat(retMontoExent),
        imp_retenidos: retImps.map(imp => ({
          monto_ret: imp.monto_ret,
          tipo_pago_ret: imp.tipo_pago_ret,
          impuesto: imp.impuesto
        }))
      },
      ...(tenantId ? { tenant_id: tenantId } : {})
    };
    try {
      await fetcher(`/billing/facturapi-retentions/${getParams()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('Retención fiscal emitida con éxito.');
      setShowRetentionModal(false);
      fetchRetentions();
      setRetCustName('');
      setRetCustRfc('');
      setRetCustEmail('');
      setRetCustZip('');
      setRetMontoOper('');
    } catch (err: any) {
      setRetentionError(err.message || 'Error al emitir retención.');
    } finally {
      setSavingRetention(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-card-bg/95 backdrop-blur-md border border-card-border p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fadeIn">
          <span className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
          <p className="text-[10px] font-black uppercase tracking-wider text-foreground">{toast.message}</p>
        </div>
      )}

      {/* Selector de sub-pestañas */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-background/50 border border-card-border/80 w-fit">
        {[
          { id: 'customers', label: 'Clientes' },
          { id: 'products', label: 'Productos / Conceptos' },
          { id: 'receipts', label: 'Notas de Venta' },
          { id: 'retentions', label: 'Retenciones' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeSubTab === tab.id
                ? 'text-background shadow-md'
                : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
            }`}
            style={{
              backgroundColor: activeSubTab === tab.id ? primaryColor : 'transparent',
              color: activeSubTab === tab.id ? '#000000' : ''
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- CONTENT: CUSTOMERS --- */}
      {activeSubTab === 'customers' && (
        <div className="admin-card border rounded-[2rem] p-6 shadow-lg space-y-6 text-left relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Receptores Fiscales</h3>
              <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1">Directorio de clientes para timbrado</p>
            </div>
            <button
              onClick={() => openCustomerModal()}
              className="px-3 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              + Nuevo Cliente
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar por RFC o razón social..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
          />

          {loadingCustomers ? (
            <div className="py-8 flex items-center justify-center gap-2 text-white/30">
              <span className="w-4 h-4 rounded-full border-2 border-t-white/50 border-white/10 animate-spin"></span>
              <span className="text-[9px] uppercase tracking-widest font-black">Cargando catálogo...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-2">👥</span>
              <p className="text-[8px] uppercase font-black tracking-widest text-white/30">Sin clientes registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customers
                .filter(c => {
                  if (!customerSearch.trim()) return true;
                  const q = customerSearch.toLowerCase();
                  return (c.tax_id || '').toLowerCase().includes(q) || (c.legal_name || '').toLowerCase().includes(q);
                })
                .map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 font-black" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                      {(customer.legal_name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-white truncate">{customer.legal_name}</p>
                      <p className="text-[8px] text-white/40 font-mono">{customer.tax_id} • R.F. {customer.tax_system}</p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => openCustomerModal(customer)}
                        className="px-2 py-1 text-[7px] font-black uppercase tracking-wider border border-white/10 hover:border-white/30 text-white/50 hover:text-white rounded-lg cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar a ${customer.legal_name}?`)) {
                            handleDeleteCustomer(customer.id);
                          }
                        }}
                        disabled={deletingCustomerId === customer.id}
                        className="px-2 py-1 text-[7px] font-black uppercase tracking-wider border border-red-500/20 hover:border-red-500/40 text-red-500/50 hover:text-red-400 rounded-lg cursor-pointer"
                      >
                        {deletingCustomerId === customer.id ? '...' : 'Borrar'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* --- CONTENT: PRODUCTS --- */}
      {activeSubTab === 'products' && (
        <div className="admin-card border rounded-[2rem] p-6 shadow-lg space-y-6 text-left relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Catálogo de Productos</h3>
              <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1">Conceptos registrados para facturación rápida</p>
            </div>
            <button
              onClick={() => openProductModal()}
              className="px-3 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              + Nuevo Producto
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
          />

          {loadingProducts ? (
            <div className="py-8 flex items-center justify-center gap-2 text-white/30">
              <span className="w-4 h-4 rounded-full border-2 border-t-white/50 border-white/10 animate-spin"></span>
              <span className="text-[9px] uppercase tracking-widest font-black">Cargando catálogo...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-2">📦</span>
              <p className="text-[8px] uppercase font-black tracking-widest text-white/30">Sin productos registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {products
                .filter(p => {
                  if (!productSearch.trim()) return true;
                  return (p.description || '').toLowerCase().includes(productSearch.toLowerCase());
                })
                .map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-white truncate">{product.description}</p>
                      <p className="text-[8px] text-white/40 font-mono">
                        ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN • Clave SAT: {product.product_key}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => openProductModal(product)}
                        className="px-2 py-1 text-[7px] font-black uppercase tracking-wider border border-white/10 hover:border-white/30 text-white/50 hover:text-white rounded-lg cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar ${product.description}?`)) {
                            handleDeleteProduct(product.id);
                          }
                        }}
                        disabled={deletingProductId === product.id}
                        className="px-2 py-1 text-[7px] font-black uppercase tracking-wider border border-red-500/20 hover:border-red-500/40 text-red-500/50 hover:text-red-400 rounded-lg cursor-pointer"
                      >
                        {deletingProductId === product.id ? '...' : 'Borrar'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* --- CONTENT: RECEIPTS --- */}
      {activeSubTab === 'receipts' && (
        <div className="admin-card border rounded-[2rem] p-6 shadow-lg space-y-6 text-left relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Notas de Venta / Recibos</h3>
              <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1">Notas simplificadas emitidas ante Facturapi</p>
            </div>
            <button
              onClick={() => setShowReceiptModal(true)}
              className="px-3 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              + Emitir Nota
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar por folio..."
            value={receiptSearch}
            onChange={(e) => setReceiptSearch(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-bold"
          />

          {loadingReceipts ? (
            <div className="py-8 flex items-center justify-center gap-2 text-white/30">
              <span className="w-4 h-4 rounded-full border-2 border-t-white/50 border-white/10 animate-spin"></span>
              <span className="text-[9px] uppercase tracking-widest font-black">Cargando notas...</span>
            </div>
          ) : receipts.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-2">🧾</span>
              <p className="text-[8px] uppercase font-black tracking-widest text-white/30">Sin notas de venta emitidas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[9px] border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 uppercase tracking-widest">
                    <th className="py-3 px-2">ID Nota</th>
                    <th className="py-3 px-2">Folio</th>
                    <th className="py-3 px-2">Forma de Pago</th>
                    <th className="py-3 px-2 text-right">Total</th>
                    <th className="py-3 px-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts
                    .filter(r => {
                      if (!receiptSearch.trim()) return true;
                      return String(r.folio_number || '').includes(receiptSearch);
                    })
                    .map((rec) => (
                      <tr key={rec.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                        <td className="py-3 px-2 text-white/60 font-mono">{rec.id}</td>
                        <td className="py-3 px-2 text-white/80 font-bold">{rec.folio_number || '—'}</td>
                        <td className="py-3 px-2 text-white/60 font-bold">F.P. {rec.payment_form}</td>
                        <td className="py-3 px-2 text-right font-black text-white font-mono">
                          ${parseFloat(rec.total?.toString() || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2.5 py-0.5 border text-[7px] font-black uppercase tracking-widest rounded-full ${
                            rec.status === 'valid'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-white/5 text-white/40 border-white/10'
                          }`}>
                            {rec.status === 'valid' ? 'Activo' : rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- CONTENT: RETENTIONS --- */}
      {activeSubTab === 'retentions' && (
        <div className="admin-card border rounded-[2rem] p-6 shadow-lg space-y-6 text-left relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Retenciones Fiscales</h3>
              <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1">Declaraciones de retención emitidas</p>
            </div>
            <button
              onClick={() => setShowRetentionModal(true)}
              className="px-3 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              + Emitir Retención
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar por RFC de receptor..."
            value={retentionSearch}
            onChange={(e) => setRetentionSearch(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-bold"
          />

          {loadingRetentions ? (
            <div className="py-8 flex items-center justify-center gap-2 text-white/30">
              <span className="w-4 h-4 rounded-full border-2 border-t-white/50 border-white/10 animate-spin"></span>
              <span className="text-[9px] uppercase tracking-widest font-black">Cargando retenciones...</span>
            </div>
          ) : retentions.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-2">📑</span>
              <p className="text-[8px] uppercase font-black tracking-widest text-white/30">Sin retenciones emitidas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[9px] border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 uppercase tracking-widest">
                    <th className="py-3 px-2">ID Retención</th>
                    <th className="py-3 px-2">Receptor</th>
                    <th className="py-3 px-2">Clave Retenc.</th>
                    <th className="py-3 px-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {retentions
                    .filter(r => {
                      if (!retentionSearch.trim()) return true;
                      return (r.customer?.tax_id || '').toLowerCase().includes(retentionSearch.toLowerCase());
                    })
                    .map((ret) => (
                      <tr key={ret.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                        <td className="py-3 px-2 text-white/60 font-mono">{ret.id}</td>
                        <td className="py-3 px-2">
                          <p className="font-bold text-white">{ret.customer?.legal_name || '—'}</p>
                          <p className="text-[7.5px] text-white/40 font-mono">{ret.customer?.tax_id}</p>
                        </td>
                        <td className="py-3 px-2 text-white/70 font-mono">Tipo {ret.cve_retenc}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2.5 py-0.5 border text-[7px] font-black uppercase tracking-widest rounded-full ${
                            ret.status === 'valid'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-white/5 text-white/40 border-white/10'
                          }`}>
                            {ret.status === 'valid' ? 'Activo' : ret.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL: CLIENTE --- */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-card-bg border border-card-border p-6 rounded-[2.5rem] shadow-2xl space-y-6 text-left animate-premium">
            <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-3">
              {editingCustomer ? 'Editar Receptor Fiscal' : 'Registrar Nuevo Receptor'}
            </h3>

            {customerError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase tracking-wider font-bold rounded-xl">
                ⚠️ {customerError}
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Razón Social</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. JOHN DOE"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
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
                    placeholder="Ej. XAXX010101000"
                    value={custRfc}
                    onChange={(e) => setCustRfc(e.target.value.toUpperCase())}
                    className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Código Postal</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="Ej. 83240"
                    value={custZip}
                    onChange={(e) => setCustZip(e.target.value.replace(/\D/g, ''))}
                    className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Régimen Fiscal (SAT)</label>
                <select
                  value={custRegimen}
                  onChange={(e) => setCustRegimen(e.target.value)}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Teléfono</label>
                  <input
                    type="text"
                    placeholder="10 dígitos"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 text-[8px] font-black uppercase tracking-widest border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-6 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer font-bold disabled:opacity-40"
                  style={{ backgroundColor: primaryColor, color: '#000' }}
                >
                  {savingCustomer ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: PRODUCTO --- */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-card-bg border border-card-border p-6 rounded-[2.5rem] shadow-2xl space-y-6 text-left animate-premium">
            <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-3">
              {editingProduct ? 'Editar Producto / Concepto' : 'Registrar Nuevo Producto'}
            </h3>

            {productError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase tracking-wider font-bold rounded-xl">
                ⚠️ {productError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Descripción del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Renta de equipo o Licencia mensual"
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Precio Unitario (MXN)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] uppercase tracking-wider font-black text-white/50 block">Clave SAT de Producto</label>
                <SATAutocomplete
                  mode="product"
                  value={prodKey}
                  onChange={(code) => setProdKey(code)}
                  primaryColor={primaryColor}
                  placeholder="Buscar clave de producto..."
                  tenantId={tenantId}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] uppercase tracking-wider font-black text-white/50 block">Clave SAT de Unidad</label>
                <SATAutocomplete
                  mode="unit"
                  value={prodUnitKey}
                  onChange={(code) => setProdUnitKey(code)}
                  primaryColor={primaryColor}
                  placeholder="Buscar clave de unidad..."
                  tenantId={tenantId}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-[8px] font-black uppercase tracking-widest border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-6 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer font-bold disabled:opacity-40"
                  style={{ backgroundColor: primaryColor, color: '#000' }}
                >
                  {savingProduct ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EMISIÓN RECIBO --- */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-card-bg border border-card-border p-6 rounded-[2.5rem] shadow-2xl space-y-6 text-left animate-premium">
            <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-3">
              Emitir Nota de Venta / Recibo Simplificado
            </h3>

            {receiptError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase tracking-wider font-bold rounded-xl">
                ⚠️ {receiptError}
              </div>
            )}

            <form onSubmit={handleSaveReceipt} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Folio de la Nota (Opcional)</label>
                  <input
                    type="number"
                    placeholder="Auto-incrementable si se deja vacío"
                    value={recFolio}
                    onChange={(e) => setRecFolio(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Forma de Pago</label>
                  <select
                    value={recPaymentForm}
                    onChange={(e) => setRecPaymentForm(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                  >
                    <option value="01">01 - Efectivo</option>
                    <option value="03">03 - Transferencia electrónica de fondos</option>
                    <option value="04">04 - Tarjeta de crédito</option>
                    <option value="08">08 - Vales de despensa</option>
                    <option value="28">28 - Tarjeta de débito</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-white">Desglose de Conceptos</h4>
                  <button
                    type="button"
                    onClick={() => setRecItems(prev => [...prev, { quantity: 1, product: { description: '', price: 0, product_key: '43231500', unit_key: 'E48' } }])}
                    className="px-2.5 py-1 text-[7px] font-black uppercase tracking-wider bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-white cursor-pointer"
                  >
                    + Agregar Fila
                  </button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {recItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end p-3 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="w-14 shrink-0">
                        <label className="text-[6.5px] uppercase font-black text-white/40 block mb-1">Cant.</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setRecItems(prev => prev.map((it, idx) => idx === index ? { ...it, quantity: val } : it));
                          }}
                          className="w-full border rounded-xl px-2 py-1.5 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[6.5px] uppercase font-black text-white/40 block mb-1">Descripción</label>
                        <input
                          type="text"
                          required
                          placeholder="Concepto..."
                          value={item.product.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRecItems(prev => prev.map((it, idx) => idx === index ? { ...it, product: { ...it.product, description: val } } : it));
                          }}
                          className="w-full border rounded-xl px-2.5 py-1.5 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                        />
                      </div>
                      <div className="w-20 shrink-0">
                        <label className="text-[6.5px] uppercase font-black text-white/40 block mb-1">Precio Unit.</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={item.product.price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setRecItems(prev => prev.map((it, idx) => idx === index ? { ...it, product: { ...it.product, price: val } } : it));
                          }}
                          className="w-full border rounded-xl px-2.5 py-1.5 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                        />
                      </div>
                      {recItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRecItems(prev => prev.filter((_, idx) => idx !== index))}
                          className="w-8 h-8 rounded-xl border border-red-500/20 text-red-500/60 hover:text-red-400 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 text-[8px] font-black uppercase tracking-widest border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingReceipt}
                  className="px-6 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer font-bold disabled:opacity-40"
                  style={{ backgroundColor: primaryColor, color: '#000' }}
                >
                  {savingReceipt ? 'Procesando...' : 'Emitir Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EMISIÓN RETENCIÓN --- */}
      {showRetentionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-card-bg border border-card-border p-6 rounded-[2.5rem] shadow-2xl space-y-6 text-left animate-premium">
            <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-3">
              Emitir Declaración de Retención Fiscal
            </h3>

            {retentionError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase tracking-wider font-bold rounded-xl">
                ⚠️ {retentionError}
              </div>
            )}

            <form onSubmit={handleSaveRetention} className="space-y-4">
              {/* Receptor Info */}
              <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-wider text-white">Receptor de Retención</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Razón Social</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. JOHN DOE"
                      value={retCustName}
                      onChange={(e) => setRetCustName(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/50">RFC</label>
                    <input
                      type="text"
                      required
                      maxLength={13}
                      placeholder="Ej. XAXX010101000"
                      value={retCustRfc}
                      onChange={(e) => setRetCustRfc(e.target.value.toUpperCase())}
                      className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      value={retCustEmail}
                      onChange={(e) => setRetCustEmail(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/50">C.P.</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="Ej. 83240"
                      value={retCustZip}
                      onChange={(e) => setRetCustZip(e.target.value.replace(/\D/g, ''))}
                      className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Régimen Fiscal (Receptor)</label>
                  <select
                    value={retCustRegimen}
                    onChange={(e) => setRetCustRegimen(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input"
                  >
                    <option value="601">601 - General de Ley Personas Morales</option>
                    <option value="616">616 - Sin obligaciones fiscales</option>
                    <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                  </select>
                </div>
              </div>

              {/* Retention Details */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <h4 className="text-[9px] font-black uppercase tracking-wider text-white">Declaración Fiscal</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Tipo de Retención (Clave)</label>
                    <select
                      value={retCve}
                      onChange={(e) => setRetCve(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-bold"
                    >
                      <option value="03">03 - Regalias por derechos de autor</option>
                      <option value="04">04 - Autotransporte terrestre de carga</option>
                      <option value="25">25 - Otro tipo de retenciones</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Año Fiscal</label>
                    <input
                      type="number"
                      required
                      value={retEjerc}
                      onChange={(e) => setRetEjerc(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Mes Inicial</label>
                    <select
                      value={retMesIni}
                      onChange={(e) => setRetMesIni(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Mes Final</label>
                    <select
                      value={retMesFin}
                      onChange={(e) => setRetMesFin(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Monto Operación (MXN)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={retMontoOper}
                      onChange={(e) => setRetMontoOper(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider font-black text-white/50">Monto Exento (MXN)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={retMontoExent}
                      onChange={(e) => setRetMontoExent(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Impuestos Retenidos desglosados */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-white">Impuestos Retenidos</h4>
                  <button
                    type="button"
                    onClick={() => setRetImps(prev => [...prev, { impuesto: 'ISR', tipo_pago_ret: '04', monto_ret: 0 }])}
                    className="px-2.5 py-1 text-[7px] font-black uppercase tracking-wider bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-white cursor-pointer"
                  >
                    + Agregar Impuesto
                  </button>
                </div>

                <div className="space-y-3 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {retImps.map((imp, idx) => (
                    <div key={idx} className="flex gap-2 items-end p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                      <div className="flex-1">
                        <label className="text-[6.5px] uppercase font-black text-white/40 block mb-1">Impuesto</label>
                        <select
                          value={imp.impuesto}
                          onChange={(e) => {
                            const val = e.target.value as 'ISR' | 'IVA';
                            setRetImps(prev => prev.map((im, i) => i === idx ? { ...im, impuesto: val } : im));
                          }}
                          className="w-full border rounded-xl px-2 py-1 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-bold"
                        >
                          <option value="ISR">ISR</option>
                          <option value="IVA">IVA</option>
                        </select>
                      </div>
                      <div className="w-20 shrink-0">
                        <label className="text-[6.5px] uppercase font-black text-white/40 block mb-1">Monto Ret.</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={imp.monto_ret}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setRetImps(prev => prev.map((im, i) => i === idx ? { ...im, monto_ret: val } : im));
                          }}
                          className="w-full border rounded-xl px-2.5 py-1 text-[10px] focus:outline-none focus:border-nectar-gold transition-all admin-input font-mono"
                        />
                      </div>
                      {retImps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRetImps(prev => prev.filter((_, i) => i !== idx))}
                          className="w-7 h-7 rounded-xl border border-red-500/20 text-red-500/60 hover:text-red-400 flex items-center justify-center shrink-0 cursor-pointer text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowRetentionModal(false)}
                  className="px-4 py-2 text-[8px] font-black uppercase tracking-widest border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRetention}
                  className="px-6 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer font-bold disabled:opacity-40"
                  style={{ backgroundColor: primaryColor, color: '#000' }}
                >
                  {savingRetention ? 'Procesando...' : 'Emitir Retención'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
