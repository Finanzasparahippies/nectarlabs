from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubscribeView, UnsubscribeView, SendCampaignView,
    SubscriberViewSet, MarketingListViewSet, EmailCampaignViewSet,
    CampaignTemplateImageViewSet
)

router = DefaultRouter()
router.register(r'subscribers', SubscriberViewSet, basename='subscriber')
router.register(r'lists', MarketingListViewSet, basename='marketinglist')
router.register(r'campaigns', EmailCampaignViewSet, basename='emailcampaign')
router.register(r'template-images', CampaignTemplateImageViewSet, basename='campaigntemplateimage')

urlpatterns = [
    path('subscribe/', SubscribeView.as_view(), name='newsletter_subscribe'),
    path('unsubscribe/', UnsubscribeView.as_view(), name='newsletter_unsubscribe'),
    path('send-campaign/', SendCampaignView.as_view(), name='newsletter_send_campaign'),
    path('', include(router.urls)),
]
