from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from apps.users.views import MyTokenObtainPairView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)


from apps.shop.views import PlanViewSet, ProductViewSet, ContractViewSet, PaymentInstallmentViewSet, AddOnViewSet, PromoCodeViewSet, SalesCommissionViewSet
from apps.dashboard.views import ProjectViewSet, FAQViewSet, TimeLogViewSet, ProjectQuoteViewSet, LeadViewSet, LeadAppointmentViewSet
from apps.blog.views import PostViewSet
from apps.tickets.views import TicketViewSet, SupportChatViewSet
from apps.users.views import UserViewSet
from apps.tenants.views import TenantViewSet, public_config, guest_auth
from apps.billing.views import TaxProfileView, InvoiceViewSet

router = DefaultRouter()
router.register(r'plans', PlanViewSet)
router.register(r'products', ProductViewSet, basename='product')
router.register(r'addons', AddOnViewSet, basename='addon')
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'installments', PaymentInstallmentViewSet, basename='installment')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'quotes', ProjectQuoteViewSet, basename='quote')
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'appointments', LeadAppointmentViewSet, basename='appointment')
router.register(r'faqs', FAQViewSet)
router.register(r'logs', TimeLogViewSet, basename='timelog')

router.register(r'posts', PostViewSet)
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'support-chats', SupportChatViewSet, basename='support-chat')
router.register(r'users', UserViewSet, basename='user')
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'promo-codes', PromoCodeViewSet, basename='promocode')
router.register(r'sales-commissions', SalesCommissionViewSet, basename='salescommission')
router.register(r'billing/invoices', InvoiceViewSet, basename='billing-invoice')


from django.conf import settings

from apps.users.views import RegisterView, VerifyEmailView
from apps.newsletter.views import SubscribeView, UnsubscribeView
from apps.dashboard.views import BusinessStatsView
from apps.shop.views import stripe_webhook

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/tenants/public-config/', public_config, name='tenant_public_config'),
    path('api/tenants/guest-auth/', guest_auth, name='tenant_guest_auth'),
    path('api/', include(router.urls)),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/delivery/', include('apps.delivery.urls')),
    path('api/sponsorship/', include('apps.sponsorship.urls')),
    path('api/performance/', include('apps.performance.urls')),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/users/verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('api/newsletter/subscribe/', SubscribeView.as_view(), name='newsletter_subscribe'),
    path('api/newsletter/unsubscribe/', UnsubscribeView.as_view(), name='newsletter_unsubscribe'),
    path('api/dashboard/business-stats/', BusinessStatsView.as_view(), name='business_stats'),
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('rest_framework.urls')),
    path("ckeditor5/", include('django_ckeditor_5.urls')),
    path('api/shop/stripe-webhook/', stripe_webhook, name='stripe_webhook'),
    path('api/billing/tax-profile/', TaxProfileView.as_view(), name='billing_tax_profile'),
]



if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
