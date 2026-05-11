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

router = DefaultRouter()
router.register(r'plans', PlanViewSet)
router.register(r'products', ProductViewSet)
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'faqs', FAQViewSet)
router.register(r'logs', TimeLogViewSet, basename='timelog')
router.register(r'posts', PostViewSet)
router.register(r'tickets', TicketViewSet, basename='ticket')


from django.conf import settings

from apps.users.views import RegisterView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('rest_framework.urls')),
    path("ckeditor5/", include('django_ckeditor_5.urls')),
]



if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
