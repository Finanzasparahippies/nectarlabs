from rest_framework import serializers
from .models import BookingInquiry, BookingContract, CustomContractTemplate, CustomContract, CustomContractSignatory

class BookingInquirySerializer(serializers.ModelSerializer):
    contract_id = serializers.IntegerField(source='contract.id', read_only=True, allow_null=True)

    class Meta:
        model = BookingInquiry
        fields = ['id', 'tenant', 'name', 'email', 'phone', 'company', 'date', 'venue_type', 'message', 'created_at', 'is_reviewed', 'contract_id']
        read_only_fields = ['id', 'tenant', 'created_at', 'is_reviewed', 'contract_id']

class BookingContractSerializer(serializers.ModelSerializer):
    inquiry = BookingInquirySerializer(read_only=True)
    class Meta:
        model = BookingContract
        fields = ['id', 'inquiry', 'fee', 'signature_base64', 'signed_at', 'manager_signature', 'manager_signed_at', 'is_fully_signed', 'created_at', 'pdf_file']
        read_only_fields = ['id', 'inquiry', 'fee', 'signed_at', 'manager_signed_at', 'is_fully_signed', 'created_at', 'pdf_file']


class CustomContractTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomContractTemplate
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class CustomContractSignatorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomContractSignatory
        fields = ['id', 'name', 'email', 'role', 'signature_base64', 'signed_at', 'ip_address', 'token']
        read_only_fields = ['id', 'signed_at', 'ip_address', 'token']


class CustomContractSerializer(serializers.ModelSerializer):
    signatories = CustomContractSignatorySerializer(many=True, required=False)

    class Meta:
        model = CustomContract
        fields = ['id', 'template', 'tenant', 'title', 'logo', 'header_design', 'proemio', 'declarations', 'clauses', 'pdf_file', 'is_fully_signed', 'created_at', 'updated_at', 'signatories']
        read_only_fields = ['id', 'pdf_file', 'is_fully_signed', 'created_at', 'updated_at']

    def create(self, validated_data):
        signatories_data = validated_data.pop('signatories', [])
        contract = CustomContract.objects.create(**validated_data)
        for sig_data in signatories_data:
            CustomContractSignatory.objects.create(contract=contract, **sig_data)
        return contract

