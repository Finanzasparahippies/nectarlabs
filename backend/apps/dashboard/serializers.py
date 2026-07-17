from rest_framework import serializers
from .models import Project, TimeLog, FAQ, ProjectAdvance, ProjectQuote, Lead, LeadAppointment



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
            except (ValueError, TypeError) as e:
                import logging
                logging.getLogger(__name__).warning(f"Formato de precio inválido en cotización de módulo: {mod.get('price')} - {e}")
                raise serializers.ValidationError({"modules": f"El precio del módulo '{mod.get('name', 'Sin Nombre')}' debe ser un valor numérico válido."})
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


class LeadAppointmentSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.name', read_only=True)
    lead_email = serializers.EmailField(source='lead.email', read_only=True)
    lead_phone = serializers.CharField(source='lead.phone', read_only=True)
    addon_name = serializers.CharField(source='addon.name', read_only=True)
    addons_details = serializers.SerializerMethodField()
    salesperson_email = serializers.EmailField(source='salesperson.email', read_only=True)
    
    # Custom input fields to allow creating a Lead on-the-fly
    client_name = serializers.CharField(write_only=True, required=False)
    client_email = serializers.EmailField(write_only=True, required=False)
    client_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    addon_slug = serializers.CharField(write_only=True, required=False, allow_blank=True)
    addon_slugs = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)

    class Meta:
        model = LeadAppointment
        fields = [
            'id', 'lead', 'lead_name', 'lead_email', 'lead_phone', 'addon', 'addon_name',
            'addons_details',
            'salesperson', 'salesperson_email', 'date', 'time', 'status', 'notes',
            'is_confirmed_by_client', 'created_at', 'updated_at',
            'client_name', 'client_email', 'client_phone', 'addon_slug', 'addon_slugs',
            'consulting_type', 'interview_answers'
        ]
        read_only_fields = ('lead', 'salesperson', 'is_confirmed_by_client')

    def get_addons_details(self, obj):
        from apps.shop.serializers import AddOnSerializer
        return AddOnSerializer(obj.addons.all(), many=True).data

    def create(self, validated_data):
        validated_data.pop('client_name', None)
        validated_data.pop('client_email', None)
        validated_data.pop('client_phone', None)
        validated_data.pop('addon_slug', None)
        validated_data.pop('addon_slugs', None)
        return super().create(validated_data)



