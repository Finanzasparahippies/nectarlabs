from rest_framework import serializers
from .models import Project, TimeLog, FAQ, ProjectAdvance, ProjectQuote, Lead

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = '__all__'

class TimeLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = TimeLog
        fields = '__all__'

class ProjectAdvanceSerializer(serializers.ModelSerializer):
    delivered_by_email = serializers.EmailField(source='delivered_by.email', read_only=True)

    class Meta:
        model = ProjectAdvance
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    logs = TimeLogSerializer(many=True, read_only=True)
    advances = ProjectAdvanceSerializer(many=True, read_only=True)
    plan_hours = serializers.ReadOnlyField()
    used_hours_current_month = serializers.ReadOnlyField()
    remaining_hours_current_month = serializers.ReadOnlyField()
    unlocked_milestones = serializers.ReadOnlyField()
    designer_email = serializers.ReadOnlyField()
    designer_plan_hours = serializers.ReadOnlyField()
    designer_used_hours_current_month = serializers.ReadOnlyField()
    designer_remaining_hours_current_month = serializers.ReadOnlyField()
    client_email = serializers.EmailField(source='client.email', read_only=True)
    client_username = serializers.CharField(source='client.username', read_only=True)
    
    class Meta:
        model = Project
        fields = '__all__'

class ProjectQuoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectQuote
        fields = '__all__'
        read_only_fields = ('total_price', 'pdf_file', 'salesperson')

    def validate(self, attrs):
        # Calculate total price dynamically from modules list
        modules = attrs.get('modules', [])
        total = 0.00
        for mod in modules:
            try:
                total += float(mod.get('price', 0.00))
            except (ValueError, TypeError):
                pass
        attrs['total_price'] = total
        return attrs

    def create(self, validated_data):
        from .utils import generate_quote_pdf, send_quote_email
        quote = super().create(validated_data)
        if generate_quote_pdf(quote):
            send_quote_email(quote)
        return quote

    def update(self, instance, validated_data):
        from .utils import generate_quote_pdf
        quote = super().update(instance, validated_data)
        generate_quote_pdf(quote)
        return quote


class LeadSerializer(serializers.ModelSerializer):
    salesperson_email = serializers.EmailField(source='salesperson.email', read_only=True)
    payment_frequency = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ('salesperson',)

    def get_payment_frequency(self, obj):
        if not obj.email:
            return 'monthly'
        from apps.shop.models import Contract
        contract = Contract.objects.filter(user__email=obj.email, is_active=True).first()
        if contract:
            if contract.payment_day == 'WEEKLY_MONDAY':
                return 'weekly'
            elif contract.payment_day == 'FORTNIGHTLY_1ST_15TH':
                return 'fortnightly'
        return 'monthly'

