# ==============================================================================
# CONFIGURACIÓN DE ENRUTAMIENTO GLOBAL (ENTRYPOINTS DE API)
# ==============================================================================
# Este archivo define la estructura de enrutamiento de Nectar Labs.
# Divide los endpoints en:
# 1. API ViewSets Autogenerados (Django Rest Framework DefaultRouter) en '/api/'
# 2. Endpoints Personalizados / URLs de Apps Locales (bookings, delivery, etc.)
# 3. Webhooks de Pasarelas y Facturación (Stripe, Facturapi)
# 4. Servicios de Autenticación y Registro (SimpleJWT, verificación de correo)
# ==============================================================================

from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from apps.users.views import MyTokenObtainPairView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)


from apps.shop.views import PlanViewSet, ProductViewSet, ContractViewSet, PaymentInstallmentViewSet, AddOnViewSet, PromoCodeViewSet, SalesCommissionViewSet, ShopCheckoutView, GetShippingRatesView, AddOnSubscriptionViewSet, OrderStatusView, OrderViewSet
from apps.dashboard.views import ProjectViewSet, FAQViewSet, TimeLogViewSet, ProjectQuoteViewSet, LeadViewSet, LeadAppointmentViewSet
from apps.blog.views import PostViewSet
from apps.tickets.views import TicketViewSet, SupportChatViewSet
from apps.users.views import UserViewSet
from apps.tenants.views import TenantViewSet, public_config, guest_auth
from apps.billing.views import (
    TaxProfileView, InvoiceViewSet, BillingInfoView, BuyStampsView,
    BuyEmailCreditsView, SATProductKeySearchView, SATUnitKeySearchView,
    UploadCSDView, CSDStatusView, FacturapiCustomerView,
    FacturapiProductView, FacturapiReceiptView, FacturapiRetentionView,
    BuyShippingFundsView, SalesNoteViewSet
)

# ------------------------------------------------------------------------------
# ROUTER GLOBAL DE DJANGO REST FRAMEWORK
# Registra los ViewSets que generan automáticamente endpoints CRUD de REST.
# Ejemplo: 'api/plans/' -> list, create, retrieve, update, partial_update, destroy
# ------------------------------------------------------------------------------
router = DefaultRouter()

# Tienda y Suscripciones (Módulos, Planes, Facturas, Comisiones)
router.register(r'plans', PlanViewSet)
router.register(r'products', ProductViewSet, basename='product')
router.register(r'addons', AddOnViewSet, basename='addon')
router.register(r'addon-subscriptions', AddOnSubscriptionViewSet, basename='addonsubscription')
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'installments', PaymentInstallmentViewSet, basename='installment')
router.register(r'promo-codes', PromoCodeViewSet, basename='promocode')
router.register(r'sales-commissions', SalesCommissionViewSet, basename='salescommission')
router.register(r'shop/orders', OrderViewSet, basename='shop-order')

# Control de Negocio y Prospectos (Proyectos, Cotizaciones, Leads, Horarios)
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'quotes', ProjectQuoteViewSet, basename='quote')
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'appointments', LeadAppointmentViewSet, basename='appointment')
router.register(r'faqs', FAQViewSet)
router.register(r'logs', TimeLogViewSet, basename='timelog')

# Blog y Contenidos
router.register(r'posts', PostViewSet)

# Soporte y Chats en Tiempo Real
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'support-chats', SupportChatViewSet, basename='support-chat')

# Gestión de Usuarios y Multi-tenant (Colmenas)
router.register(r'users', UserViewSet, basename='user')
router.register(r'tenants', TenantViewSet, basename='tenant')

# Facturación y SAT
router.register(r'billing/invoices', InvoiceViewSet, basename='billing-invoice')
router.register(r'billing/sales-notes', SalesNoteViewSet, basename='billing-salesnote')


from django.conf import settings

from apps.users.views import RegisterView, VerifyEmailView, ConfirmEmailView, BecomeDriverView
from apps.dashboard.views import BusinessStatsView
from apps.shop.views import stripe_webhook, facturapi_webhook

# ------------------------------------------------------------------------------
# PATRONES DE URL GLOBALES
# Mapea las solicitudes entrantes del cliente a las vistas o routers correspondientes
# ------------------------------------------------------------------------------
urlpatterns = [
    # Panel de administración de Django nativo
    path('admin/', admin.site.urls),
    
    # Configuración de Tenant y Autenticación de Invitados (Multi-tenancy)
    path('api/tenants/public-config/', public_config, name='tenant_public_config'),
    path('api/tenants/guest-auth/', guest_auth, name='tenant_guest_auth'),
    
    # Flujo de verificación de cuenta por correo electrónico (Auth)
    path('api/users/verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('api/users/confirm-email/', ConfirmEmailView.as_view(), name='confirm_email'),
    
    # Inclusión de todas las rutas REST autogeneradas por el router
    path('api/', include(router.urls)),
    
    # Inclusión de URLs específicas de apps locales del backend
    path('api/bookings/', include('apps.bookings.urls')),       # Motor de Citas y Calendario
    path('api/delivery/', include('apps.delivery.urls')),       # Envíos y Logística de Skydropx
    path('api/sponsorship/', include('apps.sponsorship.urls')), # Membresías y Sponsors (NSCAP)
    path('api/performance/', include('apps.performance.urls')), # Middleware de Monitoreo de Rendimiento
    path('api/newsletter/', include('apps.newsletter.urls')),   # Campañas de correo masivo
    
    # Registro de Usuarios
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/users/become-driver/', BecomeDriverView.as_view(), name='become_driver'),
    
    # Estadísticas Consolidadas de Negocio para el Dashboard
    path('api/dashboard/business-stats/', BusinessStatsView.as_view(), name='business_stats'),
    
    # Autenticación basada en JSON Web Token (JWT)
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Autenticación de la UI interactiva de DRF (útil para desarrollo)
    path('api/auth/', include('rest_framework.urls')),
    
    # CKEditor 5 para el editor de textos del Blog y del Newsletter
    path("ckeditor5/", include('django_ckeditor_5.urls')),
    
    # Webhooks para integraciones de terceros (Pasarelas de Pago e Invoicing)
    path('api/shop/stripe-webhook/', stripe_webhook, name='stripe_webhook'),
    path('api/shop/facturapi-webhook/', facturapi_webhook, name='facturapi_webhook'),
    
    # Checkout y Cotización de tarifas de envío Skydropx
    path('api/shop/checkout/', ShopCheckoutView.as_view(), name='shop_checkout'),
    path('api/shop/shipping-rates/', GetShippingRatesView.as_view(), name='shop_shipping_rates'),
    path('api/shop/order-status/', OrderStatusView.as_view(), name='shop_order_status'),
    
    # endpoints de facturación del SAT México (Facturapi)
    path('api/billing/tax-profile/', TaxProfileView.as_view(), name='billing_tax_profile'),
    path('api/billing/info/', BillingInfoView.as_view(), name='billing_info'),
    path('api/billing/buy-stamps/', BuyStampsView.as_view(), name='billing_buy_stamps'),
    path('api/billing/buy-email-credits/', BuyEmailCreditsView.as_view(), name='billing_buy_email_credits'),
    path('api/billing/buy-shipping-funds/', BuyShippingFundsView.as_view(), name='billing_buy_shipping_funds'),
    
    # Búsqueda de claves SAT (Productos y Unidades)
    path('api/billing/sat/products/', SATProductKeySearchView.as_view(), name='billing_sat_products'),
    path('api/billing/sat/units/', SATUnitKeySearchView.as_view(), name='billing_sat_units'),
    
    # Carga y estado del Certificado de Sello Digital (CSD) para timbrado
    path('api/billing/upload-csd/', UploadCSDView.as_view(), name='billing_upload_csd'),
    path('api/billing/csd-status/', CSDStatusView.as_view(), name='billing_csd_status'),
    
    # Gestión de Clientes, Productos y Recibos Facturapi
    path('api/billing/facturapi-customers/', FacturapiCustomerView.as_view(), name='billing_facturapi_customers'),
    path('api/billing/facturapi-customers/<str:pac_customer_id>/', FacturapiCustomerView.as_view(), name='billing_facturapi_customer_detail'),
    path('api/billing/facturapi-products/', FacturapiProductView.as_view(), name='billing_facturapi_products'),
    path('api/billing/facturapi-products/<str:pac_product_id>/', FacturapiProductView.as_view(), name='billing_facturapi_product_detail'),
    path('api/billing/facturapi-receipts/', FacturapiReceiptView.as_view(), name='billing_facturapi_receipts'),
    path('api/billing/facturapi-retentions/', FacturapiRetentionView.as_view(), name='billing_facturapi_retentions'),
]



# Servir archivos multimedia (media) subidos por los usuarios cuando DEBUG es True
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
