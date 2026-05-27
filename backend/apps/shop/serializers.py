from rest_framework import serializers
from .models import Plan, Product, Contract, PaymentInstallment, AddOn, PromoCode, SalesCommission

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class AddOnSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddOn
        fields = '__all__'

class PromoCodeSerializer(serializers.ModelSerializer):
    referrer_email = serializers.CharField(source='referrer.email', read_only=True)

    class Meta:
        model = PromoCode
        fields = '__all__'

class SalesCommissionSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='installment.contract.full_name', read_only=True)
    installment_number = serializers.IntegerField(source='installment.installment_number', read_only=True)
    installment_amount = serializers.DecimalField(source='installment.amount', max_digits=10, decimal_places=2, read_only=True)
    salesperson_email = serializers.CharField(source='salesperson.email', read_only=True)

    class Meta:
        model = SalesCommission
        fields = '__all__'

class ContractSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    addons = serializers.SlugRelatedField(many=True, slug_field='slug', queryset=AddOn.objects.all(), required=False)
    addons_details = AddOnSerializer(source='addons', many=True, read_only=True)
    tenant_subdomain = serializers.SerializerMethodField(read_only=True)
    tenant_name = serializers.SerializerMethodField(read_only=True)
    promo_code = serializers.SlugRelatedField(slug_field='code', queryset=PromoCode.objects.all(), required=False, allow_null=True)
    promo_code_details = PromoCodeSerializer(source='promo_code', read_only=True)

    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ('user', 'pdf_file', 'signed_at')

    def get_tenant_subdomain(self, obj):
        tenant = obj.user.owned_tenants.first()
        return tenant.subdomain if tenant else None

    def get_tenant_name(self, obj):
        tenant = obj.user.owned_tenants.first()
        return tenant.name if tenant else None

class PaymentInstallmentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='contract.full_name', read_only=True)
    client_email = serializers.CharField(source='contract.user.email', read_only=True)
    project_name = serializers.SerializerMethodField(read_only=True)
    project_id = serializers.SerializerMethodField(read_only=True)
    installment_type_display = serializers.CharField(source='get_installment_type_display', read_only=True)
    promo_code = serializers.SlugRelatedField(slug_field='code', queryset=PromoCode.objects.all(), required=False, allow_null=True)

    class Meta:
        model = PaymentInstallment
        fields = '__all__'
        read_only_fields = ('contract', 'installment_number', 'due_date', 'amount')

    def get_project_name(self, obj):
        from apps.dashboard.models import Project
        project = Project.objects.filter(client=obj.contract.user, plan=obj.contract.plan).first()
        return project.name if project else "Ecosistema (Sin proyecto activo)"

    def get_project_id(self, obj):
        from apps.dashboard.models import Project
        project = Project.objects.filter(client=obj.contract.user, plan=obj.contract.plan).first()
        return project.id if project else None
