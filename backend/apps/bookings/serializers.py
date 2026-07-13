import logging
from rest_framework import serializers
from .models import BookingInquiry, BookingContract, CustomContractTemplate, CustomContract, CustomContractSignatory

logger = logging.getLogger(__name__)

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
        fields = ['id', 'name', 'email', 'role', 'signature_base64', 'signed_at', 'ip_address', 'token', 'sig_page', 'sig_x', 'sig_y', 'sig_w', 'sig_h']
        read_only_fields = ['id', 'signed_at', 'ip_address', 'token']


class CustomContractSerializer(serializers.ModelSerializer):
    signatories = CustomContractSignatorySerializer(many=True, required=False)

    class Meta:
        model = CustomContract
        fields = ['id', 'template', 'tenant', 'title', 'logo', 'header_design', 'proemio', 'declarations', 'clauses', 'pdf_file', 'uploaded_pdf', 'is_fully_signed', 'created_at', 'updated_at', 'signatories']
        read_only_fields = ['id', 'pdf_file', 'is_fully_signed', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        if hasattr(data, 'dict'):
            mutable_data = data.dict()
        else:
            mutable_data = dict(data)

        sig_raw = mutable_data.get('signatories')
        if sig_raw and isinstance(sig_raw, str):
            import json
            try:
                mutable_data['signatories'] = json.loads(sig_raw)
            except json.JSONDecodeError as e:
                logger.error(f"Error decodificando la cadena JSON de signatories: {e.msg} en la línea {e.lineno}, col {e.colno}")
                
        return super().to_internal_value(mutable_data)

    def create(self, validated_data):
        signatories_data = validated_data.pop('signatories', [])

        contract = CustomContract.objects.create(**validated_data)
        for sig_data in signatories_data:
            name = sig_data.get('name')
            email = sig_data.get('email')
            role = sig_data.get('role', 'Firmante')
            sig_page = sig_data.get('sig_page', 1)
            sig_x = sig_data.get('sig_x')
            sig_y = sig_data.get('sig_y')
            sig_w = sig_data.get('sig_w', 150)
            sig_h = sig_data.get('sig_h', 80)
            
            try:
                sig_page = int(sig_page) if sig_page is not None else 1
                sig_x = float(sig_x) if sig_x is not None else None
                sig_y = float(sig_y) if sig_y is not None else None
                sig_w = float(sig_w) if sig_w is not None else 150
                sig_h = float(sig_h) if sig_h is not None else 80
            except (ValueError, TypeError):
                pass

            CustomContractSignatory.objects.create(
                contract=contract,
                name=name,
                email=email,
                role=role,
                sig_page=sig_page,
                sig_x=sig_x,
                sig_y=sig_y,
                sig_w=sig_w,
                sig_h=sig_h
            )
        return contract

