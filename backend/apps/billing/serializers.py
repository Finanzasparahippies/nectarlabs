from rest_framework import serializers
from .models import TaxProfile, Invoice, SATProductKey, SATUnitKey, SalesNote, SalesNoteItem
    
class TaxProfileSerializer(serializers.ModelSerializer):
    # Transient fields for uploading certificates directly to the PAC
    cer_file = serializers.FileField(write_only=True, required=False, help_text="Archivo de certificado CSD (.cer)")
    key_file = serializers.FileField(write_only=True, required=False, help_text="Archivo de llave privada CSD (.key)")
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'}, help_text="Contraseña de llave privada CSD")

    class Meta:
        model = TaxProfile
        fields = [
            'id', 'rfc', 'razon_social', 'regimen_fiscal', 'codigo_postal', 
            'facturapi_organization_id', 'cer_file', 'key_file', 'password',
            'default_product_key', 'default_unit_key', 'default_unit_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'facturapi_organization_id', 'created_at', 'updated_at']

    def validate_rfc(self, value):
        rfc = value.strip().upper()
        if len(rfc) not in [12, 13]:
            raise serializers.ValidationError("El RFC debe medir 12 (Persona Moral) o 13 (Persona Física) caracteres.")
        return rfc

    def validate(self, data):
        # Si se incluye alguno de los campos del sello, se deben incluir todos para poder timbrar
        has_cer = 'cer_file' in data
        has_key = 'key_file' in data
        has_pwd = 'password' in data
        
        if (has_cer or has_key or has_pwd) and not (has_cer and has_key and has_pwd):
            raise serializers.ValidationError(
                "Para actualizar los sellos digitales CSD, debes subir los archivos .cer, .key y proporcionar la contraseña."
            )
        return data


class InvoiceSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    xml_url = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'tenant_name', 'stripe_invoice_id', 'facturapi_invoice_id', 'uuid_sat',
            'total', 'status', 'status_display', 'xml_file', 'pdf_file', 
            'xml_url', 'pdf_url', 'error_message', 'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_xml_url(self, obj):
        return obj.xml_file.url if obj.xml_file else None

    def get_pdf_url(self, obj):
        return obj.pdf_file.url if obj.pdf_file else None


class SATProductKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = SATProductKey
        fields = ['id', 'code', 'description', 'is_active']


class SATUnitKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = SATUnitKey
        fields = ['id', 'code', 'name', 'description', 'is_active']


class SalesNoteItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesNoteItem
        fields = ['id', 'sales_note', 'description', 'quantity', 'unit_price', 'product_key', 'unit_key']
        read_only_fields = ['id', 'sales_note']


class SalesNoteSerializer(serializers.ModelSerializer):
    items = SalesNoteItemSerializer(many=True, required=False)

    class Meta:
        model = SalesNote
        fields = [
            'id', 'tenant', 'folio', 'total', 'payment_method', 
            'status', 'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['id', 'folio', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        sales_note = SalesNote.objects.create(**validated_data)
        for item_data in items_data:
            SalesNoteItem.objects.create(sales_note=sales_note, **item_data)
        return sales_note

