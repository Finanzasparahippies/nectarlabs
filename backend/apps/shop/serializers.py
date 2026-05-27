from rest_framework import serializers
from .models import Plan, Product, Contract, PaymentInstallment, AddOn

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

class ContractSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    addons = serializers.SlugRelatedField(many=True, slug_field='slug', queryset=AddOn.objects.all(), required=False)
    addons_details = AddOnSerializer(source='addons', many=True, read_only=True)

    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ('user', 'pdf_file', 'signed_at')

class PaymentInstallmentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='contract.full_name', read_only=True)
    client_email = serializers.CharField(source='contract.user.email', read_only=True)
    project_name = serializers.SerializerMethodField(read_only=True)
    project_id = serializers.SerializerMethodField(read_only=True)
    installment_type_display = serializers.CharField(source='get_installment_type_display', read_only=True)

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
