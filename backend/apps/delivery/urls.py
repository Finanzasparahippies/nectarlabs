from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DeliveryConfigViewSet, VehicleViewSet, VehicleLocationViewSet, StopViewSet,
    DriverProfileViewSet, DeliveryOrderViewSet, StoreConfigView
)

router = DefaultRouter()
router.register('config', DeliveryConfigViewSet, basename='delivery-config')
router.register('vehicles', VehicleViewSet, basename='delivery-vehicles')
router.register('location', VehicleLocationViewSet, basename='delivery-location')
router.register('stops', StopViewSet, basename='delivery-stops')
router.register('drivers', DriverProfileViewSet, basename='delivery-drivers')
router.register('orders', DeliveryOrderViewSet, basename='delivery-orders')

urlpatterns = [
    path('store-config/', StoreConfigView.as_view(), name='delivery-store-config'),
    path('', include(router.urls)),
]

