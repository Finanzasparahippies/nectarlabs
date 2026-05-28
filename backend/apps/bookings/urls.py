from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingInquiryViewSet, BookingContractViewSet

router = DefaultRouter()
router.register('inquiries', BookingInquiryViewSet, basename='booking-inquiry')
router.register('contracts', BookingContractViewSet, basename='booking-contract')

urlpatterns = [
    path('', include(router.urls)),
]
