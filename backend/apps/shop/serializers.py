from rest_framework import serializers
from .models import Plan, Product, Contract, PaymentInstallment

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ('user', 'pdf_file', 'signed_at')

class PaymentInstallmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentInstallment
        fields = '__all__'
        read_only_fields = ('contract', 'installment_number', 'due_date', 'amount')
