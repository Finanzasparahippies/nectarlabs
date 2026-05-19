from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from apps.users.views import MyTokenObtainPairView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)


from apps.shop.views import PlanViewSet, ProductViewSet, ContractViewSet
from apps.dashboard.views import ProjectViewSet, FAQViewSet, TimeLogViewSet
from apps.blog.views import PostViewSet
from apps.tickets.views import TicketViewSet
from apps.users.views import UserViewSet

router = DefaultRouter()
router.register(r'plans', PlanViewSet)
router.register(r'products', ProductViewSet)
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'faqs', FAQViewSet)
router.register(r'logs', TimeLogViewSet, basename='timelog')
router.register(r'posts', PostViewSet)
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'users', UserViewSet, basename='user')


from django.conf import settings

from apps.users.views import RegisterView
from apps.newsletter.views import SubscribeView
from apps.dashboard.views import BusinessStatsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/performance/', include('apps.performance.urls')),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/newsletter/subscribe/', SubscribeView.as_view(), name='newsletter_subscribe'),
    path('api/dashboard/business-stats/', BusinessStatsView.as_view(), name='business_stats'),
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('rest_framework.urls')),
    path("ckeditor5/", include('django_ckeditor_5.urls')),
]



if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
