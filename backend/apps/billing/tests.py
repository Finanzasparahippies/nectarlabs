from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock
from decimal import Decimal
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.tenants.models import Tenant
from apps.shop.models import Plan, Contract, PaymentInstallment
from apps.billing.models import TaxProfile, Invoice
from apps.billing.services import get_pac_service, MockPACService, LCOSyncError, PACError

User = get_user_model()

class BillingSystemTests(APITestCase):
    def setUp(self):
        # Create users
        self.ceo = User.objects.create_user(
            username="saul_ceo",
            email="saul@nectarlabs.dev",
            password="securepassword",
            role=User.Role.ADMIN,
            is_staff=True
        )
        self.client_user = User.objects.create_user(
            username="client_a",
            email="client_a@example.com",
            password="clientpassword",
            role=User.Role.BUSINESS
        )
        
        # Create a Tenant for client
        self.tenant = Tenant.objects.create(
            owner=self.client_user,
            name="Client Workspace",
            subdomain="client-workspace",
            is_active=True
        )
        
        # Create a Plan
        self.plan = Plan.objects.create(
            name="Plan Pro-Dev",
            price=20000.00,
            hours=40,
            description="Dedicated developer plan"
        )
        
        # Create a Contract
        self.contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Client Company SA",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_commitment_method="SPEI",
            signed_at=timezone.now(),
            is_fully_signed=True,
            is_active=True
        )

        # Create a PaymentInstallment
        self.installment = PaymentInstallment.objects.create(
            contract=self.contract,
            installment_number=1,
            due_date=timezone.now().date(),
            base_amount=20000.00,
            amount=20000.00,
            status=PaymentInstallment.Status.PENDING
        )

    def test_mock_pac_service_lco_sync_handling(self):
        """
        Tests that the MockPACService raises LCOSyncError when the specific RFC 'LCO999999AAA' is used.
        """
        profile = TaxProfile(
            tenant=self.tenant,
            rfc="LCO999999AAA",
            razon_social="LCO Sync Test SA",
            regimen_fiscal="601",
            codigo_postal="12345"
        )
        
        pac = MockPACService()
        invoice = Invoice(
            tenant=self.tenant,
            total=Decimal("20000.00"),
            status=Invoice.Status.PENDING
        )
        
        customer_info = {
            "razon_social": "Client User",
            "rfc": "LCO999999AAA",
            "regimen_fiscal": "601",
            "codigo_postal": "12345"
        }
        
        items = [{"quantity": 1, "unit_price": 20000.00, "description": "Test subscription"}]
        
        with self.assertRaises(LCOSyncError):
            pac.create_invoice(invoice, profile, customer_info, items)

    def test_mock_pac_service_decimal_discrepancy(self):
        """
        Tests that MockPACService errors out if the items total is inconsistent with the invoice total by > $0.05.
        """
        profile = TaxProfile(
            tenant=self.tenant,
            rfc="XAXX010101000",
            razon_social="Tax Test SA",
            regimen_fiscal="601",
            codigo_postal="12345"
        )
        
        pac = MockPACService()
        invoice = Invoice(
            tenant=self.tenant,
            total=Decimal("20000.00"), # Invoice total is 20000.00
            status=Invoice.Status.PENDING
        )
        
        customer_info = {
            "razon_social": "Client User",
            "rfc": "XAXX010101000",
            "regimen_fiscal": "601",
            "codigo_postal": "12345"
        }
        
        # Items total is 19999.00 -> Difference is 1.00 (> 0.05)
        items = [{"quantity": 1, "unit_price": 19999.00, "description": "Discrepancy test"}]
        
        with self.assertRaises(PACError):
            pac.create_invoice(invoice, profile, customer_info, items)

    def test_tax_profile_endpoint_get_create_update(self):
        """
        Verify that we can create, retrieve, and update the tax profile for the authenticated tenant.
        """
        self.client.force_authenticate(user=self.client_user)
        url = reverse('billing_tax_profile')
        
        # GET should return 404 since it's not configured yet
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # POST to configure the profile (without sellos first)
        data = {
            "rfc": "XAXX010101000",
            "razon_social": "Client Company SA",
            "regimen_fiscal": "601",
            "codigo_postal": "06000"
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("facturapi_organization_id", response.data)
        self.assertIsNotNone(response.data["facturapi_organization_id"])
        
        # GET should now retrieve it
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rfc"], "XAXX010101000")
        
        # POST with CSD certificates (transient, uploaded to PAC)
        cer_file = SimpleUploadedFile("cert.cer", b"fake_certificate_data")
        key_file = SimpleUploadedFile("key.key", b"fake_key_data")
        data_with_sellos = {
            "rfc": "XAXX010101000",
            "razon_social": "Client Company SA (Updated)",
            "regimen_fiscal": "601",
            "codigo_postal": "06000",
            "cer_file": cer_file,
            "key_file": key_file,
            "password": "CSDpassword123"
        }
        
        with patch('apps.billing.services.MockPACService.upload_sello') as mock_upload:
            mock_upload.return_value = True
            response = self.client.post(url, data_with_sellos, format='multipart')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            mock_upload.assert_called_once()
            
        # Confirm it was updated in the DB
        profile = TaxProfile.objects.get(tenant=self.tenant)
        self.assertEqual(profile.razon_social, "Client Company SA (Updated)")

    @patch('apps.billing.services.get_pac_service')
    def test_stripe_webhook_automatic_invoicing(self, mock_get_pac):
        """
        Verify that Stripe checkout.session.completed triggers automatic invoice creation
        and stamping when a TaxProfile is configured.
        """
        # Configure tax profile first
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="XAXX010101000",
            razon_social="Client Company SA",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_12345"
        )
        
        # Setup mock PAC service response
        mock_pac = MagicMock()
        mock_uuid = "a3c428a2-25de-4dfb-90f7-872ab67262ba"
        mock_pac.create_invoice.return_value = {
            "facturapi_invoice_id": "inv_mock_123",
            "uuid_sat": mock_uuid,
            "xml_file": SimpleUploadedFile("123.xml", b"<xml></xml>"),
            "pdf_file": SimpleUploadedFile("123.pdf", b"pdf_data")
        }
        mock_get_pac.return_value = mock_pac
        
        # Webhook endpoint URL
        url = reverse('stripe_webhook')
        
        # Webhook payload for successful installment payment (wants_invoice = true)
        payload = {
            "id": "evt_test_123",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_session123",
                    "metadata": {
                        "installment_id": self.installment.id,
                        "wants_invoice": "true"
                    }
                }
            }
        }
        
        # Make the request simulating Stripe Webhook signature verification mock
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = payload
            response = self.client.post(
                url, 
                payload, 
                format='json',
                HTTP_STRIPE_SIGNATURE='t=123,v1=abc'
            )
            
            # The endpoint should return status 200
            self.assertEqual(response.status_code, 200)
            
        # Check if the installment is marked PAID
        self.installment.refresh_from_db()
        self.assertEqual(self.installment.status, PaymentInstallment.Status.PAID)
        self.assertEqual(self.installment.cfdi_uuid, mock_uuid)
        
        # Check if Invoice model instance was created and marked PAID, with 16% IVA incremented total
        invoice = Invoice.objects.filter(tenant=self.tenant).first()
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.status, Invoice.Status.PAID)
        self.assertEqual(invoice.stripe_invoice_id, "cs_test_session123")
        expected_total = (self.installment.amount * Decimal('1.16')).quantize(Decimal('0.01'))
        self.assertEqual(invoice.total, expected_total)
        self.assertEqual(str(invoice.uuid_sat), mock_uuid)

    @patch('apps.billing.services.get_pac_service')
    def test_stripe_webhook_optional_invoicing_no_creation(self, mock_get_pac):
        """
        Verify that if wants_invoice is not specified or false,
        no Invoice is created upon checkout.session.completed.
        """
        url = reverse('stripe_webhook')
        payload = {
            "id": "evt_test_123_no",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_session123_no",
                    "metadata": {
                        "installment_id": self.installment.id,
                        "wants_invoice": "false" # Explicitly false
                    }
                }
            }
        }
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = payload
            response = self.client.post(
                url, 
                payload, 
                format='json',
                HTTP_STRIPE_SIGNATURE='t=123,v1=abc'
            )
            self.assertEqual(response.status_code, 200)
            
        # Check that no invoice was created
        invoice = Invoice.objects.filter(tenant=self.tenant).first()
        self.assertIsNone(invoice)

    @patch('apps.billing.services.get_pac_service')
    def test_stripe_webhook_automatic_invoicing_lco_sync_pending(self, mock_get_pac):
        """
        Verify that if the SAT LCO sync error occurs during webhook invoicing,
        the invoice status is correctly set to LCO_SYNC_PENDING.
        """
        # Configure tax profile first
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="LCO999999AAA",  # Trigger LCO sync error
            razon_social="Client Company SA",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_12345"
        )
        
        mock_pac = MagicMock()
        mock_pac.create_invoice.side_effect = LCOSyncError("LCO Sync Issue")
        mock_get_pac.return_value = mock_pac
        
        url = reverse('stripe_webhook')
        payload = {
            "id": "evt_test_124",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_session124",
                    "metadata": {
                        "installment_id": self.installment.id,
                        "wants_invoice": "true"
                    }
                }
            }
        }
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = payload
            response = self.client.post(
                url, 
                payload, 
                format='json',
                HTTP_STRIPE_SIGNATURE='t=123,v1=abc'
            )
            self.assertEqual(response.status_code, 200)
            
        # Invoice should exist in LCO_SYNC_PENDING state
        invoice = Invoice.objects.filter(tenant=self.tenant).first()
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.status, Invoice.Status.LCO_SYNC_PENDING)
        self.assertIn("LCO Sync Issue", invoice.error_message)

    def test_invoice_cancellation_and_retry_endpoints(self):
        """
        Verify the custom action endpoints on InvoiceViewSet.
        """
        self.client.force_authenticate(user=self.client_user)
        
        # Create an existing PAID invoice to cancel
        invoice = Invoice.objects.create(
            tenant=self.tenant,
            stripe_invoice_id="cs_123",
            facturapi_invoice_id="fact_123",
            uuid_sat="a3c428a2-25de-4dfb-90f7-872ab67262ba",
            total=Decimal("20000.00"),
            status=Invoice.Status.PAID
        )
        
        # Cancel endpoint
        cancel_url = reverse('billing-invoice-cancel', kwargs={'pk': invoice.id})
        response = self.client.post(cancel_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.CANCELLED)

        # Create a FAILED invoice to retry
        failed_invoice = Invoice.objects.create(
            tenant=self.tenant,
            stripe_invoice_id="cs_456",
            total=Decimal("20000.00"),
            status=Invoice.Status.FAILED
        )
        
        # Configure tax profile to enable retries
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="XAXX010101000",
            razon_social="Client Company SA",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_12345"
        )
        
        retry_url = reverse('billing-invoice-retry', kwargs={'pk': failed_invoice.id})
        response = self.client.post(retry_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        failed_invoice.refresh_from_db()
        self.assertEqual(failed_invoice.status, Invoice.Status.PAID)
        self.assertIsNotNone(failed_invoice.uuid_sat)
