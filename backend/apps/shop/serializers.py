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
    class Meta:
        model = PaymentInstallment
        fields = '__all__'
        read_only_fields = ('contract', 'installment_number', 'due_date', 'amount')
