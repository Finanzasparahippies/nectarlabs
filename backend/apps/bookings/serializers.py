from rest_framework import serializers
from .models import BookingInquiry, BookingContract

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
