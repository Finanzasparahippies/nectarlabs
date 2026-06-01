from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock
from decimal import Decimal
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.tenants.models import Tenant
from apps.shop.models import Plan, Contract, PaymentInstallment, AddOn
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

        # Create the invoicing addon and associate it with the contract
        self.invoicing_addon = AddOn.objects.create(
            slug="mexico-invoicing",
            name="Facturación SAT México",
            category_badge="CONTABILIDAD Y FISCAL",
            description="Módulo de facturación fiscal electrónica",
            detailed_description="Detalles del módulo",
            monthly_price=299.00,
            yearly_price=2990.00,
            complexity=AddOn.Complexity.HIGH
        )
        self.contract.addons.add(self.invoicing_addon)

        # Create a PaymentInstallment
        self.installment = PaymentInstallment.objects.create(
            contract=self.contract,
            installment_number=1,
            due_date=timezone.now().date(),
            base_amount=20000.00,
            amount=20000.00,
            status=PaymentInstallment.Status.PENDING
        )

        # Give the tenant some initial stamps for existing tests to pass
        self.tenant.stamp_balance = 100
        self.tenant.save()

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
        and stamping when a TaxProfile is configured (Parent-to-Tenant).
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
        self.assertEqual(invoice.is_tenant_to_customer, False)  # It's Parent-to-Tenant
        self.assertEqual(invoice.stripe_invoice_id, "cs_test_session123")
        expected_total = (self.installment.amount * Decimal('1.16')).quantize(Decimal('0.01'))
        self.assertEqual(invoice.total, expected_total)
        self.assertEqual(str(invoice.uuid_sat), mock_uuid)

        # Verify that the service was called with is_parent_to_tenant=True
        mock_pac.create_invoice.assert_called_once()
        args, kwargs = mock_pac.create_invoice.call_args
        self.assertTrue(kwargs.get('is_parent_to_tenant', False))

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
            total=Decimal("100.00"),
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

    # --- NEW TEST CASES FOR TENANT TO CUSTOMER INVOICING AND PERMISSIONS ---

    def test_invoicing_gated_by_addon_permission_denied(self):
        """
        Verify that a tenant without the mexico-invoicing addon gets a 403 Forbidden
        when accessing TaxProfile or Invoice endpoints.
        """
        # Create another user and tenant without the addon
        unsubscribed_user = User.objects.create_user(
            username="client_b",
            email="client_b@example.com",
            password="clientpassword",
            role=User.Role.BUSINESS
        )
        unsubscribed_tenant = Tenant.objects.create(
            owner=unsubscribed_user,
            name="Unsubscribed Workspace",
            subdomain="unsubscribed",
            is_active=True
        )
        # Create a contract with NO invoicing addon
        Contract.objects.create(
            user=unsubscribed_user,
            full_name="Client Company B",
            tax_id="RFC789",
            signed_at=timezone.now(),
            is_fully_signed=True,
            is_active=True
        )

        self.client.force_authenticate(user=unsubscribed_user)
        
        # 1. GET Tax Profile should be gated
        url_profile = reverse('billing_tax_profile')
        response = self.client.get(url_profile)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 2. GET Invoices list should be gated
        url_invoices = reverse('billing-invoice-list')
        response = self.client.get(url_invoices)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tenant_to_customer_invoicing_success(self):
        """
        Verify that a tenant can manually issue an invoice to their customer (Tenant-to-Customer).
        """
        self.client.force_authenticate(user=self.client_user)
        
        # Configure tax profile first
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="XAXX010101000",
            razon_social="Tenant Enterprise",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_tenant_123"
        )

        url = reverse('billing-invoice-list') + "issue-to-customer/"
        
        payload = {
            "customer_info": {
                "rfc": "XAXX010101000",
                "razon_social": "End Customer SA",
                "regimen_fiscal": "601",
                "codigo_postal": "01000",
                "email": "customer@gmail.com"
            },
            "items": [
                {
                    "quantity": 2,
                    "unit_price": 500.00,
                    "description": "Premium Service Consulting"
                }
            ],
            "total": 1000.00
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("uuid_sat", response.data)
        
        # Confirm Invoice model is saved with correct flags
        invoice = Invoice.objects.get(id=response.data["id"])
        self.assertEqual(invoice.is_tenant_to_customer, True)
        self.assertEqual(invoice.status, Invoice.Status.PAID)
        self.assertEqual(invoice.total, Decimal("1000.00"))

    def test_tenant_to_customer_invoicing_lco_sync(self):
        """
        Verify LCOSyncError handling during Tenant-to-Customer manual invoicing.
        """
        self.client.force_authenticate(user=self.client_user)
        
        # Configure tax profile first (with specific RFC causing LCOSyncError)
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="LCO999999AAA",
            razon_social="Tenant Enterprise LCO",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_tenant_lco"
        )

        url = reverse('billing-invoice-list') + "issue-to-customer/"
        
        payload = {
            "customer_info": {
                "rfc": "LCO999999AAA",
                "razon_social": "End Customer LCO",
                "regimen_fiscal": "601",
                "codigo_postal": "01000",
                "email": "customer_lco@gmail.com"
            },
            "items": [
                {
                    "quantity": 1,
                    "unit_price": 1000.00,
                    "description": "Sync delay test"
                }
            ],
            "total": 1000.00
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        
        # Verify invoice is saved in LCO_SYNC_PENDING state
        invoice = Invoice.objects.get(id=response.data["id"])
        self.assertEqual(invoice.is_tenant_to_customer, True)
        self.assertEqual(invoice.status, Invoice.Status.LCO_SYNC_PENDING)
        self.assertIn("LCO del SAT", invoice.error_message)

    def test_retry_tenant_to_customer_invoice(self):
        """
        Verify that a failed Tenant-to-Customer invoice can be retried by passing the payload.
        """
        self.client.force_authenticate(user=self.client_user)

        # Configure tax profile first
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="XAXX010101000",
            razon_social="Tenant Enterprise",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_tenant_123"
        )

        # Create a failed Tenant-to-Customer invoice
        failed_invoice = Invoice.objects.create(
            tenant=self.tenant,
            total=Decimal("500.00"),
            is_tenant_to_customer=True,
            status=Invoice.Status.FAILED
        )

        retry_url = reverse('billing-invoice-retry', kwargs={'pk': failed_invoice.id})
        
        # Calling retry without customer_info/items should return 400
        response = self.client.post(retry_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("customer_info", response.data["error"])

        # Calling retry WITH customer_info/items should succeed
        payload = {
            "customer_info": {
                "rfc": "XAXX010101000",
                "razon_social": "End Customer",
                "regimen_fiscal": "601",
                "codigo_postal": "01000",
                "email": "customer@gmail.com"
            },
            "items": [
                {
                    "quantity": 1,
                    "unit_price": 500.00,
                    "description": "Retried item"
                }
            ]
        }
        response = self.client.post(retry_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        failed_invoice.refresh_from_db()
        self.assertEqual(failed_invoice.status, Invoice.Status.PAID)
        self.assertIsNotNone(failed_invoice.uuid_sat)

    def test_billing_info_endpoint(self):
        """
        Verify that BillingInfoView returns the correct keys and stamp balance.
        """
        self.client.force_authenticate(user=self.client_user)
        url = reverse('billing_info')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["stamp_balance"], 100)
        self.assertTrue(response.data["is_commercial_partner"]) # contract has plan
        self.assertTrue(response.data["addon_active"])
        self.assertFalse(response.data["has_tax_profile"])

    @patch('stripe.checkout.Session.create')
    def test_buy_stamps_session_creation(self, mock_checkout):
        """
        Verify that BuyStampsView successfully creates a Stripe Checkout session.
        """
        self.client.force_authenticate(user=self.client_user)
        
        # Mock Stripe response
        mock_checkout.return_value = MagicMock(url="https://checkout.stripe.com/pay/test")
        
        url = reverse('billing_buy_stamps')
        payload = {"package_size": 100}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["url"], "https://checkout.stripe.com/pay/test")
        
        # Verify it was called with metadata
        mock_checkout.assert_called_once()
        kwargs = mock_checkout.call_args[1]
        self.assertEqual(kwargs["metadata"]["tenant_id"], str(self.tenant.id))
        self.assertEqual(kwargs["metadata"]["stamps_count"], 100)
        self.assertEqual(kwargs["metadata"]["type"], "stamp_package")
        self.assertEqual(kwargs.get("allow_promotion_codes"), True)

    def test_manual_invoicing_fails_when_no_stamps(self):
        """
        Verify manual invoicing fails when stamp balance is 0.
        """
        self.client.force_authenticate(user=self.client_user)
        self.tenant.stamp_balance = 0
        self.tenant.save()
        
        # Configure tax profile first
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="XAXX010101000",
            razon_social="Tenant Enterprise",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_tenant_123"
        )
        
        url = reverse('billing-invoice-list') + "issue-to-customer/"
        payload = {
            "customer_info": {
                "rfc": "XAXX010101000",
                "razon_social": "End Customer SA",
                "regimen_fiscal": "601",
                "codigo_postal": "01000",
                "email": "customer@gmail.com"
            },
            "items": [{"quantity": 1, "unit_price": 100.00, "description": "Consulting"}],
            "total": 100.00
        }
        
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("timbres suficientes", response.data["error"])

    def test_manual_invoicing_decrements_stamp_balance(self):
        """
        Verify manual invoicing decrements stamp balance on success.
        """
        self.client.force_authenticate(user=self.client_user)
        self.tenant.stamp_balance = 5
        self.tenant.save()
        
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="XAXX010101000",
            razon_social="Tenant Enterprise",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_tenant_123"
        )
        
        url = reverse('billing-invoice-list') + "issue-to-customer/"
        payload = {
            "customer_info": {
                "rfc": "XAXX010101000",
                "razon_social": "End Customer SA",
                "regimen_fiscal": "601",
                "codigo_postal": "01000",
                "email": "customer@gmail.com"
            },
            "items": [{"quantity": 1, "unit_price": 100.00, "description": "Consulting"}],
            "total": 100.00
        }
        
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.stamp_balance, 4)

    def test_manual_invoicing_lco_sync_pending_decrements_stamp_balance(self):
        """
        Verify manual invoicing LCOSyncError also decrements stamp balance.
        """
        self.client.force_authenticate(user=self.client_user)
        self.tenant.stamp_balance = 5
        self.tenant.save()
        
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="LCO999999AAA",  # specific RFC causing LCOSyncError
            razon_social="Tenant Enterprise LCO",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_tenant_lco"
        )
        
        url = reverse('billing-invoice-list') + "issue-to-customer/"
        payload = {
            "customer_info": {
                "rfc": "LCO999999AAA",
                "razon_social": "End Customer LCO",
                "regimen_fiscal": "601",
                "codigo_postal": "01000",
                "email": "customer_lco@gmail.com"
            },
            "items": [{"quantity": 1, "unit_price": 1000.00, "description": "Sync delay test"}],
            "total": 1000.00
        }
        
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.stamp_balance, 4)

    def test_retry_failed_invoice_checks_and_decrements_stamp_balance(self):
        """
        Verify retrying a FAILED invoice checks balance (fails if 0, decrements on success).
        """
        self.client.force_authenticate(user=self.client_user)
        
        # 1. Test when balance is 0
        self.tenant.stamp_balance = 0
        self.tenant.save()
        
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="XAXX010101000",
            razon_social="Tenant Enterprise",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_tenant_123"
        )
        
        failed_invoice = Invoice.objects.create(
            tenant=self.tenant,
            total=Decimal("500.00"),
            is_tenant_to_customer=True,
            status=Invoice.Status.FAILED
        )
        
        retry_url = reverse('billing-invoice-retry', kwargs={'pk': failed_invoice.id})
        payload = {
            "customer_info": {
                "rfc": "XAXX010101000",
                "razon_social": "End Customer",
                "regimen_fiscal": "601",
                "codigo_postal": "01000",
                "email": "customer@gmail.com"
            },
            "items": [{"quantity": 1, "unit_price": 500.00, "description": "Retried item"}]
        }
        response = self.client.post(retry_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("timbres suficientes", response.data["error"])
        
        # 2. Test when balance is > 0
        self.tenant.stamp_balance = 2
        self.tenant.save()
        
        response = self.client.post(retry_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.stamp_balance, 1)

    def test_retry_lco_sync_pending_does_not_decrement_again(self):
        """
        Verify retrying an LCO_SYNC_PENDING invoice does NOT decrement the stamp balance again.
        """
        self.client.force_authenticate(user=self.client_user)
        self.tenant.stamp_balance = 10
        self.tenant.save()
        
        profile = TaxProfile.objects.create(
            tenant=self.tenant,
            rfc="XAXX010101000",
            razon_social="Tenant Enterprise",
            regimen_fiscal="601",
            codigo_postal="06000",
            facturapi_organization_id="org_mock_tenant_123"
        )
        
        lco_invoice = Invoice.objects.create(
            tenant=self.tenant,
            total=Decimal("500.00"),
            is_tenant_to_customer=True,
            status=Invoice.Status.LCO_SYNC_PENDING
        )
        
        retry_url = reverse('billing-invoice-retry', kwargs={'pk': lco_invoice.id})
        payload = {
            "customer_info": {
                "rfc": "XAXX010101000",
                "razon_social": "End Customer",
                "regimen_fiscal": "601",
                "codigo_postal": "01000",
                "email": "customer@gmail.com"
            },
            "items": [{"quantity": 1, "unit_price": 500.00, "description": "Retried item"}]
        }
        
        response = self.client.post(retry_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.stamp_balance, 10)  # No decrement

    def test_stripe_webhook_stamp_package_credits_stamps(self):
        """
        Verify that the stamp_package webhook adds stamps.
        """
        url = reverse('stripe_webhook')
        payload = {
            "id": "evt_stamp_pack",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_stamp_pack_123",
                    "metadata": {
                        "type": "stamp_package",
                        "tenant_id": str(self.tenant.id),
                        "stamps_count": "100"
                    }
                }
            }
        }
        
        self.tenant.stamp_balance = 5
        self.tenant.save()
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = payload
            response = self.client.post(
                url, 
                payload, 
                format='json',
                HTTP_STRIPE_SIGNATURE='t=123,v1=abc'
            )
            self.assertEqual(response.status_code, 200)
            
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.stamp_balance, 105)

    @patch('stripe.Subscription.retrieve')
    def test_stripe_webhook_addon_payment_succeeded_credits_100_stamps(self, mock_sub_retrieve):
        """
        Verify that invoice.payment_succeeded webhook for mexico-invoicing credits 100 stamps.
        """
        url = reverse('stripe_webhook')
        payload = {
            "id": "evt_invoice_paid",
            "type": "invoice.payment_succeeded",
            "data": {
                "object": {
                    "id": "in_123",
                    "subscription": "sub_invoicing123"
                }
            }
        }
        
        # Mock stripe retrieve response for subscription
        mock_sub = MagicMock()
        mock_sub.get.side_effect = lambda key, default=None: {
            "metadata": {
                "type": "addon_subscription",
                "user_id": self.client_user.id,
                "addon_id": self.invoicing_addon.id
            }
        }.get(key, default)
        mock_sub_retrieve.return_value = mock_sub
        
        self.tenant.stamp_balance = 10
        self.tenant.save()
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = payload
            response = self.client.post(
                url, 
                payload, 
                format='json',
                HTTP_STRIPE_SIGNATURE='t=123,v1=abc'
            )
            self.assertEqual(response.status_code, 200)
            
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.stamp_balance, 110)

    @patch('apps.billing.services.get_pac_service')
    def test_stripe_webhook_automatic_invoicing_fails_when_no_stamps(self, mock_get_pac):
        """
        Verify automatic invoicing fails and creates FAILED invoice when stamp balance is 0.
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
        
        # Zero stamps
        self.tenant.stamp_balance = 0
        self.tenant.save()
        
        url = reverse('stripe_webhook')
        payload = {
            "id": "evt_test_zero",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_session_zero",
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
            
        # Invoice should exist in FAILED state
        invoice = Invoice.objects.filter(tenant=self.tenant).first()
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.status, Invoice.Status.FAILED)
        self.assertIn("timbres suficientes", invoice.error_message)
