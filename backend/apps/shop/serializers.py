from rest_framework import serializers
from .models import Plan, Product, Contract, PaymentInstallment, AddOn, PromoCode, SalesCommission, Order, OrderItem, AddOnSubscription

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

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        is_staff = request and request.user and request.user.is_authenticated and (request.user.is_staff or getattr(request.user, 'role', None) == 'ADMIN')
        if not is_staff:
            ret.pop('origin_project', None)
            ret.pop('source_reference', None)
        return ret

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
    due_date = serializers.DateField(source='installment.due_date', read_only=True)
    plan_name = serializers.SerializerMethodField(read_only=True)
    contract_id = serializers.IntegerField(source='installment.contract.id', read_only=True)

    class Meta:
        model = SalesCommission
        fields = '__all__'

    def get_plan_name(self, obj):
        plan = obj.installment.contract.plan
        return plan.name if plan else 'Sin Plan'

class ContractSerializer(serializers.ModelSerializer):
    plan_name = serializers.SerializerMethodField(read_only=True)
    addons = serializers.SlugRelatedField(many=True, slug_field='slug', queryset=AddOn.objects.all(), required=False)
    addons_details = AddOnSerializer(source='addons', many=True, read_only=True)
    tenant_subdomain = serializers.SerializerMethodField(read_only=True)
    tenant_name = serializers.SerializerMethodField(read_only=True)
    tenant_custom_domain = serializers.SerializerMethodField(read_only=True)
    tenant_use_custom_domain = serializers.SerializerMethodField(read_only=True)
    promo_code = serializers.SlugRelatedField(slug_field='code', queryset=PromoCode.objects.all(), required=False, allow_null=True)
    promo_code_details = PromoCodeSerializer(source='promo_code', read_only=True)

    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ('user', 'pdf_file', 'signed_at')

    def get_plan_name(self, obj):
        if obj.plan:
            return obj.plan.name
        if obj.project_quote:
            return f"Proyecto: {obj.project_quote.project_name}"
        return "Solo Add-ons / Complementos"

    def get_tenant_subdomain(self, obj):
        tenant = obj.user.owned_tenants.first()
        return tenant.subdomain if tenant else None

    def get_tenant_name(self, obj):
        tenant = obj.user.owned_tenants.first()
        return tenant.name if tenant else None

    def get_tenant_custom_domain(self, obj):
        tenant = obj.user.owned_tenants.first()
        return tenant.custom_domain if (tenant and tenant.custom_domain) else None

    def get_tenant_use_custom_domain(self, obj):
        tenant = obj.user.owned_tenants.first()
        return tenant.use_custom_domain if tenant else False

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


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = '__all__'


class AddOnSubscriptionSerializer(serializers.ModelSerializer):
    addon_details = AddOnSerializer(source='addon', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    tenant_subdomain = serializers.CharField(source='tenant.subdomain', read_only=True)

    class Meta:
        model = AddOnSubscription
        fields = '__all__'
        read_only_fields = ['user', 'tenant', 'stripe_subscription_id', 'status', 'price_paid', 'is_activated']

