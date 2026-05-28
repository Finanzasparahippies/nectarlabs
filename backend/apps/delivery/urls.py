from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeliveryConfigViewSet, VehicleViewSet, VehicleLocationViewSet, StopViewSet

router = DefaultRouter()
router.register('config', DeliveryConfigViewSet, basename='delivery-config')
router.register('vehicles', VehicleViewSet, basename='delivery-vehicles')
router.register('location', VehicleLocationViewSet, basename='delivery-location')
router.register('stops', StopViewSet, basename='delivery-stops')

urlpatterns = [
    path('', include(router.urls)),
]
