from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SponsorshipConfigViewSet, SponsorTargetViewSet, SponsorshipTierViewSet, SponsorshipUpdateTagViewSet, SponsorshipUpdateViewSet, SponsorshipViewSet

router = DefaultRouter()
router.register('config', SponsorshipConfigViewSet, basename='sponsorship-config')
router.register('targets', SponsorTargetViewSet, basename='sponsorship-targets')
router.register('tiers', SponsorshipTierViewSet, basename='sponsorship-tiers')
router.register('tags', SponsorshipUpdateTagViewSet, basename='sponsorship-tags')
router.register('updates', SponsorshipUpdateViewSet, basename='sponsorship-updates')
router.register('subscriptions', SponsorshipViewSet, basename='sponsorship-subscriptions')

urlpatterns = [
    path('', include(router.urls)),
]
