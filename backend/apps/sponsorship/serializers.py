from rest_framework import serializers
from .models import SponsorshipConfig, SponsorTarget, SponsorshipTier, Sponsorship, SponsorshipUpdateTag, SponsorshipUpdate, SponsorshipUpdateImage

class SponsorshipConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SponsorshipConfig
        fields = ['id', 'tenant', 'membership_name', 'currency', 'welcome_message', 'public_feed_title']
        read_only_fields = ['id', 'tenant']

class SponsorTargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = SponsorTarget
        fields = ['id', 'tenant', 'name', 'description', 'image']
        read_only_fields = ['id', 'tenant']

class SponsorshipTierSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SponsorshipTier
        fields = ['id', 'tenant', 'name', 'level', 'type', 'is_active', 'price', 'price_annual', 'stripe_price_id', 'stripe_price_id_annual', 'description', 'image', 'image_url']
        read_only_fields = ['id', 'tenant', 'stripe_price_id', 'stripe_price_id_annual']

    def get_image_url(self, obj):
        if obj.image:
            try:
                return obj.image.url
            except Exception:
                return None
        return None

class SponsorshipSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source='user.email')
    tier_name = serializers.ReadOnlyField(source='tier.name')
    target_name = serializers.ReadOnlyField(source='target.name')

    class Meta:
        model = Sponsorship
        fields = ['id', 'tenant', 'user', 'user_email', 'target', 'target_name', 'tier', 'tier_name', 'billing_cycle', 'amount', 'stripe_subscription_id', 'stripe_payment_intent', 'active', 'start_date']
        read_only_fields = ['id', 'tenant', 'user', 'stripe_subscription_id', 'stripe_payment_intent', 'start_date']

class SponsorshipUpdateTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = SponsorshipUpdateTag
        fields = ['id', 'tenant', 'name', 'slug']
        read_only_fields = ['id', 'tenant']

class SponsorshipUpdateImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SponsorshipUpdateImage
        fields = ['id', 'image', 'image_url', 'caption', 'order']

    def get_image_url(self, obj):
        if obj.image:
            try:
                return obj.image.url
            except Exception:
                return None
        return None

class SponsorshipUpdateSerializer(serializers.ModelSerializer):
    tags = SponsorshipUpdateTagSerializer(many=True, read_only=True)
    gallery = SponsorshipUpdateImageSerializer(many=True, read_only=True)
    author_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SponsorshipUpdate
        fields = ['id', 'tenant', 'title', 'author', 'author_name', 'content', 'image', 'image_url', 'min_tier_level', 'tags', 'gallery', 'created_at', 'updated_at']
        read_only_fields = ['id', 'tenant', 'author', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.email
        return "Admin"

    def get_image_url(self, obj):
        if obj.image:
            try:
                return obj.image.url
            except Exception:
                return None
        return None
