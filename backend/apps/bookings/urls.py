from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BookingInquiryViewSet, 
    BookingContractViewSet, 
    CustomContractTemplateViewSet, 
    CustomContractViewSet
)

router = DefaultRouter()
router.register('inquiries', BookingInquiryViewSet, basename='booking-inquiry')
router.register('contracts', BookingContractViewSet, basename='booking-contract')
router.register('custom-templates', CustomContractTemplateViewSet, basename='custom-contract-template')
router.register('custom-contracts', CustomContractViewSet, basename='custom-contract')

urlpatterns = [
    path('', include(router.urls)),
]

