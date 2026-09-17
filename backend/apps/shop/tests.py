from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from apps.shop.models import Plan, Contract, PaymentInstallment, AddOn, PromoCode, SalesCommission, AddOnSubscription
from apps.tenants.models import Tenant
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

User = get_user_model()

class ContractInstallmentGenerationTests(APITestCase):
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
        
        # Create a Plan
        self.plan = Plan.objects.create(
            name="Plan Pro-Dev",
            price=20000.00,
            hours=40,
            description="Dedicated developer plan"
        )
        
    def test_weekly_monday_installment_generation(self):
        """
        Verify that signing a contract with WEEKLY_MONDAY generates 24 weekly installments,
        each being 1/4 of the total monthly amount, with due dates on Mondays.
        """
        weekly_plan = Plan.objects.create(
            name="Plan Basico",
            price=20000.00,
            hours=40,
            description="Dedicated developer plan"
        )
        contract = Contract.objects.create(
            user=self.client_user,
            plan=weekly_plan,
            payment_day=Contract.PaymentDay.WEEKLY_MONDAY,
            full_name="Client Company SA",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_commitment_method="SPEI",
            signed_at=timezone.now()
        )
        
        self.client.force_authenticate(user=self.ceo)
        url = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        response = self.client.post(url, {'signature': 'DeveloperSignatureXYZ'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contract.refresh_from_db()
        self.assertTrue(contract.is_fully_signed)
        
        installments = contract.installments.all().order_by('installment_number')
        self.assertEqual(installments.count(), 24)
        
        expected_amount = (20000.00) / 4 # 5000.00
        for idx, inst in enumerate(installments):
            self.assertEqual(inst.amount, expected_amount)
            if idx > 0:
                # Verify due_date is a Monday (weekday() == 0 in python)
                self.assertEqual(inst.due_date.weekday(), 0)
            
            # Verify dates are consecutive weeks
            if idx > 0:
                day_difference = (inst.due_date - installments[idx - 1].due_date).days
                if idx > 1:
                    # For consecutive scheduled weeks (i.e. between idx 1 and idx 2, etc.)
                    self.assertEqual(day_difference, 7)

    def test_fortnightly_1st_15th_installment_generation(self):
        """
        Verify that signing a contract with FORTNIGHTLY_1ST_15TH generates 12 fortnightly installments,
        each being 1/2 of the total monthly amount, due on the 1st and 15th.
        """
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            payment_day=Contract.PaymentDay.FORTNIGHTLY_1ST_15TH,
            full_name="Client Company SA",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_commitment_method="SPEI",
            signed_at=timezone.now()
        )
        
        self.client.force_authenticate(user=self.ceo)
        url = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        response = self.client.post(url, {'signature': 'DeveloperSignatureXYZ'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contract.refresh_from_db()
        
        installments = contract.installments.all().order_by('installment_number')
        self.assertEqual(installments.count(), 12)
        
        expected_amount = (20000.00) / 2 # 10000.00
        for idx, inst in enumerate(installments):
            self.assertEqual(inst.amount, expected_amount)
            if idx > 0:
                # Verify day of month is either 1 or 15
                self.assertIn(inst.due_date.day, [1, 15])
            # Verify they are chronologically ordered and >= today
            self.assertTrue(inst.due_date >= timezone.now().date())

    def test_monthly_1st_installment_generation(self):
        """
        Verify that signing a contract with MONTHLY_1ST generates 6 monthly installments,
        each being the full monthly amount, due strictly on the 1st of each month.
        """
        monthly_plan = Plan.objects.create(
            name="Plan Premium",
            price=20000.00,
            hours=40,
            description="Dedicated developer plan"
        )
        contract = Contract.objects.create(
            user=self.client_user,
            plan=monthly_plan,
            full_name="Client Company SA",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_commitment_method="SPEI",
            signed_at=timezone.now()
        )
        
        self.client.force_authenticate(user=self.ceo)
        url = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        response = self.client.post(url, {'signature': 'DeveloperSignatureXYZ'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contract.refresh_from_db()
        
        installments = contract.installments.all().order_by('installment_number')
        self.assertEqual(installments.count(), 6)
        
        expected_amount = 20000.00
        for idx, inst in enumerate(installments):
            self.assertEqual(inst.amount, expected_amount)
            if idx > 0:
                # Verify day of month is strictly 1
                self.assertEqual(inst.due_date.day, 1)
            # Verify they are chronologically ordered and >= today
            self.assertTrue(inst.due_date >= timezone.now().date())

    def test_automatic_project_generation_on_signature(self):
        """
        Verify that signing a contract automatically creates a Project
        associated with the client, status MVP, progress 0%, and matching plan.
        """
        from apps.dashboard.models import Project
        
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Auto Project Co",
            tax_id="RFC123456789",
            address="Av. Reforma 456",
            project_idea="Build a high performance SaaS.",
            payment_day="MONTHLY_1ST",
            payment_commitment_method="SPEI",
            signed_at=timezone.now()
        )
        
        # Ensure no project exists yet
        self.assertFalse(Project.objects.filter(client=self.client_user, plan=self.plan).exists())
        
        self.client.force_authenticate(user=self.ceo)
        url = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        response = self.client.post(url, {'signature': 'DevSignatureABC'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contract.refresh_from_db()
        self.assertTrue(contract.is_fully_signed)
        
        # Verify that project was automatically generated
        project = Project.objects.filter(client=self.client_user, plan=self.plan).first()
        self.assertIsNotNone(project)
        self.assertEqual(project.name, f"Ecosistema {self.plan.name} - {contract.full_name}")
        self.assertEqual(project.status, Project.Status.MVP)
        self.assertEqual(project.progress_percentage, 0)
        self.assertTrue(project.is_active)


class PromoCodeAndCommissionTests(APITestCase):
    def setUp(self):
        self.ceo = User.objects.create_user(
            username="saul_ceo",
            email="saul@nectarlabs.dev",
            password="securepassword",
            role=User.Role.ADMIN,
            is_staff=True
        )
        self.salesperson = User.objects.create_user(
            username="vendedor_x",
            email="vendedor@nectarlabs.dev",
            password="vendedorpassword",
            role=User.Role.SALES
        )
        self.client_user = User.objects.create_user(
            username="client_b",
            email="client_b@example.com",
            password="clientpassword",
            role=User.Role.CUSTOMER
        )
        
        # Create a Plan
        self.plan = Plan.objects.create(
            name="Plan Premium-Dev",
            price=10000.00,
            hours=40,
            description="Premium development plan",
            discount_percentage=5.00  # 5% seasonal discount
        )
        
        # Create promo codes
        self.seller_promo = PromoCode.objects.create(
            code="VENDEDOR20",
            code_type=PromoCode.CodeType.SELLER,
            discount_percentage=20.00,
            referrer=self.salesperson
        )
        self.client_promo = PromoCode.objects.create(
            code="CLIENTE10",
            code_type=PromoCode.CodeType.CLIENT,
            discount_percentage=10.00,
            referrer=self.client_user
        )

    def test_promo_code_validation_endpoint(self):
        """Verify that the validate promo code endpoint works."""
        self.client.force_authenticate(user=self.client_user)
        url = reverse('promocode-validate')
        response = self.client.get(f"{url}?code=VENDEDOR20")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_valid'])
        self.assertEqual(response.data['discount_percentage'], 20.00)

    def test_onboarding_promo_code_application(self):
        """
        Verify that creating a contract with a seller promo code:
        1. Correctly saves the promo code reference on the contract.
        2. Applies the promo discount to the first installment only.
        3. Applies the plan seasonal discount to the remaining installments.
        """
        # Create contract with promo code
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Referral Customer Co",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_commitment_method="SPEI",
            promo_code=self.seller_promo,
            signed_at=timezone.now()
        )
        
        # Sign the contract to trigger installment generation
        self.client.force_authenticate(user=self.ceo)
        url = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        response = self.client.post(url, {'signature': 'DeveloperSignatureXYZ'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        contract.refresh_from_db()
        self.assertEqual(contract.promo_code, self.seller_promo)
        
        # Verify installments
        installments = contract.installments.filter(installment_type='DEVELOPMENT').order_by('installment_number')
        self.assertEqual(installments.count(), 6)
        
        # First installment: 20% discount (seller promo code) -> base amount 10000.00 -> final 8000.00
        first_inst = installments.first()
        self.assertEqual(first_inst.installment_number, 1)
        self.assertEqual(first_inst.discount_percentage, 20.00)
        self.assertEqual(first_inst.amount, 8000.00)
        
        # Second installment: 5% discount (plan seasonal discount) -> base amount 10000.00 -> final 9500.00
        second_inst = installments[1]
        self.assertEqual(second_inst.installment_number, 2)
        self.assertEqual(second_inst.discount_percentage, 5.00)
        self.assertEqual(second_inst.amount, 9500.00)

    def test_retroactive_promo_code_application(self):
        """
        Verify that applying a promo code retroactively:
        1. Correctly sets the promo code on the contract.
        2. Recalculates the amount only for the NEXT pending installment.
        """
        # Create normal contract (no promo code)
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Retroactive Co",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_commitment_method="SPEI",
            signed_at=timezone.now()
        )
        
        # Sign the contract to trigger installment generation
        self.client.force_authenticate(user=self.ceo)
        url_sign = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        self.client.post(url_sign, {'signature': 'DeveloperSignatureXYZ'})
        
        # Retrieve generated installments
        installments = contract.installments.filter(installment_type='DEVELOPMENT').order_by('installment_number')
        first_inst = installments.first()
        second_inst = installments[1]
        
        # Before applying promo code retroactively, verify both have plan discount
        self.assertEqual(first_inst.discount_percentage, 5.00)
        self.assertEqual(first_inst.amount, 9500.00)
        self.assertEqual(second_inst.discount_percentage, 5.00)
        
        # Apply promo code retroactively via endpoint
        self.client.force_authenticate(user=self.client_user)
        url_apply = reverse('contract-apply-promo-code', kwargs={'pk': contract.id})
        response = self.client.post(url_apply, {'code': 'CLIENTE10'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        contract.refresh_from_db()
        self.assertEqual(contract.promo_code, self.client_promo)
        
        # Verify first pending installment has updated discount and amount
        first_inst.refresh_from_db()
        self.assertEqual(first_inst.discount_percentage, 10.00)
        self.assertEqual(first_inst.amount, 9000.00)
        
        # Verify second installment remains unchanged (plan discount of 5%)
        second_inst.refresh_from_db()
        self.assertEqual(second_inst.discount_percentage, 5.00)
        self.assertEqual(second_inst.amount, 9500.00)

    def test_sales_commission_generation(self):
        """
        Verify that marking an installment as PAID generates salesperson commissions
        for an APPROVED salesperson using the restructured rates:
        - Month 1: 10%
        - Month 2: 5%
        - Month 3+: 2%
        """
        # Approve the salesperson first
        self.salesperson.is_approved_seller = True
        self.salesperson.save()

        # Create contract with seller promo code
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Salesperson referred client",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_commitment_method="SPEI",
            promo_code=self.seller_promo,
            signed_at=timezone.now()
        )
        
        # Sign contract to generate installments
        self.client.force_authenticate(user=self.ceo)
        url_sign = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        self.client.post(url_sign, {'signature': 'DeveloperSignatureXYZ'})
        
        # Verify no commissions exist initially
        self.assertEqual(SalesCommission.objects.count(), 0)
        
        # Get Month 1 installment and mark as PAID
        installments = contract.installments.filter(installment_type='DEVELOPMENT').order_by('installment_number')
        first_inst = installments.first()
        first_inst.status = PaymentInstallment.Status.PAID
        first_inst.save()
        
        # Verify commission generated for Month 1 (10% of 8000.00 = 800.00)
        self.assertEqual(SalesCommission.objects.count(), 1)
        comm1 = SalesCommission.objects.first()
        self.assertEqual(comm1.salesperson, self.salesperson)
        self.assertEqual(comm1.installment, first_inst)
        self.assertEqual(comm1.commission_percentage, 10.00)
        self.assertEqual(comm1.amount, 800.00)
        
        # Mark Month 2 installment as PAID
        second_inst = installments[1]
        second_inst.status = PaymentInstallment.Status.PAID
        second_inst.save()
        
        # Verify commission generated for Month 2 (5% of 9500.00 = 475.00)
        self.assertEqual(SalesCommission.objects.count(), 2)
        comm2 = SalesCommission.objects.filter(installment=second_inst).first()
        self.assertEqual(comm2.commission_percentage, 5.00)
        self.assertEqual(comm2.amount, 475.00)

        # Mark Month 3 installment as PAID
        third_inst = installments[2]
        third_inst.status = PaymentInstallment.Status.PAID
        third_inst.save()
        
        # Verify commission generated for Month 3 (2% of 9500.00 = 190.00)
        self.assertEqual(SalesCommission.objects.count(), 3)
        comm3 = SalesCommission.objects.filter(installment=third_inst).first()
        self.assertEqual(comm3.commission_percentage, 2.00)
        self.assertEqual(comm3.amount, 190.00)

    def test_unapproved_sales_commission_generation(self):
        """
        Verify that marking an installment as PAID does NOT generate salesperson commissions
        if the salesperson is NOT approved by the admin.
        """
        # Ensure salesperson is NOT approved (default)
        self.salesperson.is_approved_seller = False
        self.salesperson.save()

        # Create contract with seller promo code
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Salesperson referred client",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_commitment_method="SPEI",
            promo_code=self.seller_promo,
            signed_at=timezone.now()
        )
        
        # Sign contract to generate installments
        self.client.force_authenticate(user=self.ceo)
        url_sign = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        self.client.post(url_sign, {'signature': 'DeveloperSignatureXYZ'})
        
        # Get Month 1 installment and mark as PAID
        installments = contract.installments.filter(installment_type='DEVELOPMENT').order_by('installment_number')
        first_inst = installments.first()
        first_inst.status = PaymentInstallment.Status.PAID
        first_inst.save()
        
        # Verify NO commission is generated
        self.assertEqual(SalesCommission.objects.count(), 0)

    def test_sales_commission_for_quote_contract(self):
        """
        Verify that marking the advance payment (installment 1) of a quote contract
        as PAID generates a unique 20% commission on the total quote value.
        Verify that subsequent payments (installment 2) generate no commission.
        """
        # Approve the salesperson first
        self.salesperson.is_approved_seller = True
        self.salesperson.save()

        # Create a project quote
        from apps.dashboard.models import ProjectQuote
        quote = ProjectQuote.objects.create(
            client_name="Quote Client",
            client_email="client_b@example.com",
            project_name="Custom CRM Project",
            total_price=50000.00,
            estimated_delivery_weeks=12
        )

        # Create contract for custom quote with seller promo code
        contract = Contract.objects.create(
            user=self.client_user,
            project_quote=quote,
            full_name="Quote Client Company",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build custom CRM.",
            payment_commitment_method="SPEI",
            promo_code=self.seller_promo,
            signed_at=timezone.now()
        )

        # Sign contract to generate installments
        self.client.force_authenticate(user=self.ceo)
        url_sign = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        self.client.post(url_sign, {'signature': 'DeveloperSignatureXYZ'})

        # Get generated installments
        installments = contract.installments.all().order_by('installment_number')
        self.assertEqual(installments.count(), 2)

        # Mark Month 1 (anticipo) installment as PAID
        first_inst = installments[0]
        first_inst.status = PaymentInstallment.Status.PAID
        first_inst.save()

        # Verify commission generated for Month 1 (15% of 50000.00 = 7500.00)
        self.assertEqual(SalesCommission.objects.count(), 1)
        comm1 = SalesCommission.objects.first()
        self.assertEqual(comm1.salesperson, self.salesperson)
        self.assertEqual(comm1.installment, first_inst)
        self.assertEqual(comm1.commission_percentage, 15.00)
        self.assertEqual(comm1.amount, 7500.00)

        # Mark Month 2 (liquidación) installment as PAID
        second_inst = installments[1]
        second_inst.status = PaymentInstallment.Status.PAID
        second_inst.save()

        # Verify no new commission was generated
        self.assertEqual(SalesCommission.objects.count(), 1)

    def test_promo_code_crud_as_admin(self):
        """Verify that an admin (CEO) can list, create, retrieve, update, and delete promo codes."""
        self.client.force_authenticate(user=self.ceo)
        url = reverse('promocode-list')
        
        # 1. List
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)
        
        # 2. Create
        create_data = {
            'code': 'NUEVO50',
            'code_type': 'CLIENT',
            'discount_percentage': '50.00',
            'max_uses': 5,
            'valid_until': '2026-12-31'
        }
        response = self.client.post(url, create_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_promo_id = response.data['id']
        
        # 3. Retrieve
        detail_url = reverse('promocode-detail', kwargs={'pk': new_promo_id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'NUEVO50')
        self.assertEqual(float(response.data['discount_percentage']), 50.00)
        
        # 4. Update (PUT)
        update_data = {
            'code': 'NUEVO50_MOD',
            'code_type': 'CLIENT',
            'discount_percentage': '40.00',
            'max_uses': 10,
            'valid_until': '2027-01-01'
        }
        response = self.client.put(detail_url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'NUEVO50_MOD')
        self.assertEqual(float(response.data['discount_percentage']), 40.00)
        self.assertEqual(response.data['max_uses'], 10)
        
        # 5. Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify it is deleted from DB
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_promo_code_crud_forbidden_for_regular_user(self):
        """Verify that a regular user or customer cannot create, update, or delete promo codes."""
        self.client.force_authenticate(user=self.client_user)
        url = reverse('promocode-list')
        
        # 1. Attempt create (POST) -> 403
        create_data = {
            'code': 'HACKED99',
            'code_type': 'CLIENT',
            'discount_percentage': '99.00'
        }
        response = self.client.post(url, create_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 2. Attempt update (PUT) -> 403
        detail_url = reverse('promocode-detail', kwargs={'pk': self.seller_promo.id})
        response = self.client.put(detail_url, {
            'code': 'VENDEDOR20_HACKED',
            'code_type': 'SELLER',
            'discount_percentage': '90.00'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 3. Attempt delete (DELETE) -> 403
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_validate_promo_code_not_found(self):
        """Verify validate endpoint returns proper error response when code is not found."""
        self.client.force_authenticate(user=self.client_user)
        url = reverse('promocode-validate')
        response = self.client.get(f"{url}?code=NONEXISTENT")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_valid'])
        self.assertIn("no encontrado", response.data['message'].lower())


class ContractSignatureTests(APITestCase):
    def setUp(self):
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
        self.other_client = User.objects.create_user(
            username="client_b",
            email="client_b@example.com",
            password="clientpassword",
            role=User.Role.BUSINESS
        )

    def test_client_signature_flow(self):
        from apps.dashboard.models import ProjectQuote
        quote = ProjectQuote.objects.create(
            client_name="Quote Client",
            client_email="client_a@example.com",
            project_name="Custom CRM",
            total_price=50000.00,
            estimated_delivery_weeks=12
        )
        contract = Contract.objects.create(
            user=self.client_user,
            project_quote=quote,
            full_name="Original Name",
            is_fully_signed=False
        )

        self.client.force_authenticate(user=self.client_user)
        url = reverse('contract-client-sign', kwargs={'pk': contract.id})
        response = self.client.post(url, {
            'signature': 'data:image/png;base64,ClientSignatureBase64...',
            'full_name': 'New Client Name',
            'tax_id': 'RFCNEW999',
            'address': 'Fiscal Address 123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        contract.refresh_from_db()
        self.assertEqual(contract.signature_base64, 'data:image/png;base64,ClientSignatureBase64...')
        self.assertEqual(contract.full_name, 'New Client Name')
        self.assertEqual(contract.tax_id, 'RFCNEW999')
        self.assertEqual(contract.address, 'Fiscal Address 123')
        self.assertIsNotNone(contract.signed_at)
        self.assertFalse(contract.is_fully_signed)
        self.assertTrue(bool(contract.pdf_file))

    def test_client_signature_permissions(self):
        from apps.dashboard.models import ProjectQuote
        quote = ProjectQuote.objects.create(
            client_name="Quote Client",
            client_email="client_a@example.com",
            project_name="Custom CRM",
            total_price=50000.00,
            estimated_delivery_weeks=12
        )
        contract = Contract.objects.create(
            user=self.client_user,
            project_quote=quote,
            full_name="Original Name",
            is_fully_signed=False
        )

        self.client.force_authenticate(user=self.other_client)
        url = reverse('contract-client-sign', kwargs={'pk': contract.id})
        response = self.client.post(url, {
            'signature': 'data:image/png;base64,ClientSignatureBase64...'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_dev_signature_flow_for_quote_contract(self):
        from apps.dashboard.models import ProjectQuote
        from apps.tenants.models import Tenant
        from apps.dashboard.models import Project
        
        quote = ProjectQuote.objects.create(
            client_name="Quote Client",
            client_email="client_a@example.com",
            project_name="Custom CRM",
            total_price=50000.00,
            estimated_delivery_weeks=12
        )
        contract = Contract.objects.create(
            user=self.client_user,
            project_quote=quote,
            full_name="Quote Client Company",
            signature_base64="data:image/png;base64,ClientSignatureBase64...",
            is_fully_signed=False
        )

        self.client.force_authenticate(user=self.ceo)
        url = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        response = self.client.post(url, {
            'signature': 'data:image/png;base64,DevSignatureBase64...'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        contract.refresh_from_db()
        self.assertEqual(contract.developer_signature, 'data:image/png;base64,DevSignatureBase64...')
        self.assertTrue(contract.is_fully_signed)

        # Check tenant creation
        self.assertTrue(Tenant.objects.filter(owner=self.client_user).exists())

        # Check project creation in MVP state
        project = Project.objects.get(client=self.client_user)
        self.assertEqual(project.status, Project.Status.MVP)

        # Check exactly 2 50/50 installments
        installments = contract.installments.all().order_by('installment_number')
        self.assertEqual(installments.count(), 2)
        
        inst1 = installments[0]
        self.assertEqual(inst1.installment_number, 1)
        self.assertEqual(inst1.amount, 25000.00)
        self.assertEqual(inst1.status, PaymentInstallment.Status.PENDING)
        
        inst2 = installments[1]
        self.assertEqual(inst2.installment_number, 2)
        self.assertEqual(inst2.amount, 25000.00)
        self.assertEqual(inst2.status, PaymentInstallment.Status.PENDING)
        
        # Check due dates spacing (12 weeks)
        due_diff = inst2.due_date - inst1.due_date
        self.assertEqual(due_diff.days, 12 * 7)

    def test_create_contract_with_audit_trail(self):
        """
        Validate:
        - Successful contract creation via POST /api/contracts/
        - Persistence of audit fields (contract_version_hash, accepted_terms_at, ip_address)
        - PaymentInstallment generation with 2-decimal rounding and minimum amount ($50.00 MXN)
        """
        plan = Plan.objects.create(
            name="Plan Pro-Dev Test",
            price=20000.00,
            hours=40,
            description="Dedicated developer plan"
        )
        self.client.force_authenticate(user=self.client_user)
        url = reverse('contract-list')
        payload = {
            'plan': plan.id,
            'full_name': 'Test Client Legal Name',
            'tax_id': 'TLN900101XXX',
            'address': 'Av. Insurgentes Sur 123',
            'project_idea': 'Plataforma E-commerce Multi-tenant',
            'signature_base64': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'brand_design_tier': Contract.BrandDesignTier.MONTHLY,
            'payment_commitment_method': Contract.PaymentMethod.SPEI,
            'payment_day': Contract.PaymentDay.MONTHLY_1ST
        }

        response = self.client.post(url, payload, format='json', REMOTE_ADDR='203.0.113.195')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        contract = Contract.objects.get(id=response.data['id'])
        self.assertEqual(contract.user, self.client_user)
        self.assertEqual(contract.full_name, 'Test Client Legal Name')
        self.assertIsNotNone(contract.accepted_terms_at)
        self.assertIsNotNone(contract.contract_version_hash)
        self.assertEqual(len(contract.contract_version_hash), 64)
        self.assertEqual(contract.ip_address, '203.0.113.195')

        # Dev signature to generate installments
        self.client.force_authenticate(user=self.ceo)
        dev_sign_url = reverse('contract-dev-sign', kwargs={'pk': contract.id})
        dev_response = self.client.post(dev_sign_url, {'signature': 'data:image/png;base64,DevSig'}, format='json')
        self.assertEqual(dev_response.status_code, status.HTTP_200_OK)

        contract.refresh_from_db()
        installments = contract.installments.all()
        self.assertTrue(installments.exists())
        from decimal import Decimal
        for inst in installments:
            # Validate 2 decimals rounding
            self.assertEqual(inst.amount, inst.amount.quantize(Decimal('0.01')))
            # Validate minimum amount threshold ($50.00 MXN)
            self.assertGreaterEqual(inst.amount, Decimal('50.00'))

    def test_contract_list_and_retrieve_isolation(self):
        # Create a contract for client_user
        contract_a = Contract.objects.create(
            user=self.client_user,
            full_name="Contract A",
            is_fully_signed=True
        )
        # Create a contract for other_client
        contract_b = Contract.objects.create(
            user=self.other_client,
            full_name="Contract B",
            is_fully_signed=True
        )

        # 1. CEO / Admin should see both contracts in list
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get(reverse('contract-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contract_ids = [c['id'] for c in response.data]
        self.assertIn(contract_a.id, contract_ids)
        self.assertIn(contract_b.id, contract_ids)

        # 2. client_user should only see contract_a in list
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(reverse('contract-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contract_ids = [c['id'] for c in response.data]
        self.assertIn(contract_a.id, contract_ids)
        self.assertNotIn(contract_b.id, contract_ids)

        # 3. client_user should be able to retrieve contract_a
        response = self.client.get(reverse('contract-detail', kwargs={'pk': contract_a.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 4. client_user should NOT be able to retrieve contract_b (returns 404)
        response = self.client.get(reverse('contract-detail', kwargs={'pk': contract_b.id}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)



class SecureFileViewerTests(APITestCase):
    def setUp(self):
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
        self.other_client = User.objects.create_user(
            username="client_b",
            email="client_b@example.com",
            password="clientpassword",
            role=User.Role.BUSINESS
        )
        
        # Create quote, contract, installment with dummy files
        from apps.dashboard.models import ProjectQuote
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        self.quote = ProjectQuote.objects.create(
            client_name="Quote Client",
            client_email="client_a@example.com",
            project_name="Custom CRM",
            total_price=50000.00,
            estimated_delivery_weeks=12,
            pdf_file=SimpleUploadedFile('test_quote.pdf', b'fake pdf content', content_type='application/pdf')
        )
        self.contract = Contract.objects.create(
            user=self.client_user,
            full_name="Quote Client Company",
            project_quote=self.quote,
            pdf_file=SimpleUploadedFile('test_contract.pdf', b'fake pdf content', content_type='application/pdf'),
            is_fully_signed=True
        )
        self.installment = PaymentInstallment.objects.create(
            contract=self.contract,
            installment_number=1,
            amount=25000.00,
            due_date=timezone.now().date(),
            receipt_file=SimpleUploadedFile('receipt.png', b'fake image content', content_type='image/png')
        )

    @patch('requests.get')
    def test_view_quote_pdf_success_with_token(self, mock_get):
        class MockResponse:
            content = b"fake pdf content"
            headers = {'Content-Type': 'application/pdf'}
        mock_get.return_value = MockResponse()

        from rest_framework_simplejwt.tokens import AccessToken
        token = str(AccessToken.for_user(self.client_user))

        url = reverse('quote-view-pdf', kwargs={'pk': self.quote.id})
        response = self.client.get(f"{url}?token={token}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.content, b"fake pdf content")
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('inline', response['Content-Disposition'])

    @patch('requests.get')
    def test_view_contract_pdf_success_with_token(self, mock_get):
        class MockResponse:
            content = b"fake pdf content"
            headers = {'Content-Type': 'application/pdf'}
        mock_get.return_value = MockResponse()

        from rest_framework_simplejwt.tokens import AccessToken
        token = str(AccessToken.for_user(self.client_user))

        url = reverse('contract-view-pdf', kwargs={'pk': self.contract.id})
        response = self.client.get(f"{url}?token={token}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.content, b"fake pdf content")
        self.assertEqual(response['Content-Type'], 'application/pdf')

    @patch('requests.get')
    def test_view_receipt_success_with_token(self, mock_get):
        class MockResponse:
            content = b"fake image content"
            headers = {'Content-Type': 'image/png'}
        mock_get.return_value = MockResponse()

        from rest_framework_simplejwt.tokens import AccessToken
        token = str(AccessToken.for_user(self.client_user))

        url = reverse('installment-view-receipt', kwargs={'pk': self.installment.id})
        response = self.client.get(f"{url}?token={token}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.content, b"fake image content")
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertIn('Comprobante', response['Content-Disposition'])

    def test_view_file_unauthorized_token(self):
        url = reverse('quote-view-pdf', kwargs={'pk': self.quote.id})
        response = self.client.get(f"{url}?token=invalid_token")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_view_file_forbidden_access(self):
        from rest_framework_simplejwt.tokens import AccessToken
        token = str(AccessToken.for_user(self.other_client))

        url = reverse('contract-view-pdf', kwargs={'pk': self.contract.id})
        response = self.client.get(f"{url}?token={token}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class StripeAddonSubscriptionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="addon-client",
            email="addon_client@example.com",
            password="password123",
            role=User.Role.CUSTOMER
        )
        self.addon = AddOn.objects.create(
            slug="live-chat-test",
            name="Test Live Chat",
            category_badge="CHAT",
            description="Short desc",
            detailed_description="Long desc",
            monthly_price=100.00,
            yearly_price=1000.00,
            origin_project="project",
            source_reference="ref",
            complexity=AddOn.Complexity.LOW,
            server_requirements="none",
            technical_details=[],
            stripe_price_id="price_mock_123",
            stripe_yearly_price_id="price_mock_yearly_123"
        )

    @patch('stripe.checkout.Session.create')
    def test_addon_subscribe_creates_checkout_session(self, mock_checkout_create):
        mock_checkout_create.return_value.url = "https://checkout.stripe.com/pay/mock_session_123"
        
        self.client.force_authenticate(user=self.user)
        url = reverse('addon-subscribe', kwargs={'pk': self.addon.id})
        response = self.client.post(url, {'billing_cycle': 'monthly', 'comments': 'Please install ASAP'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['url'], "https://checkout.stripe.com/pay/mock_session_123")
        
        # Verify Stripe SDK was called with correct payload
        mock_checkout_create.assert_called_once()
        args, kwargs = mock_checkout_create.call_args
        self.assertEqual(kwargs['line_items'][0]['price'], 'price_mock_123')
        self.assertEqual(kwargs['mode'], 'subscription')
        self.assertEqual(kwargs['allow_promotion_codes'], True)
        self.assertEqual(kwargs['metadata']['user_id'], self.user.id)
        self.assertEqual(kwargs['metadata']['addon_id'], self.addon.id)
        self.assertEqual(kwargs['metadata']['comments'], 'Please install ASAP')

    @patch('stripe.checkout.Session.create')
    def test_addon_subscribe_with_valid_django_promo_code(self, mock_checkout_create):
        mock_checkout_create.return_value.url = "https://checkout.stripe.com/pay/mock_session_123"
        
        # Create a valid PromoCode in Django
        PromoCode.objects.create(
            code="ADDON50",
            code_type=PromoCode.CodeType.CLIENT,
            discount_percentage=50.00,
            is_active=True
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('addon-subscribe', kwargs={'pk': self.addon.id})
        response = self.client.post(url, {
            'billing_cycle': 'monthly',
            'comments': 'Please install ASAP',
            'promo_code': 'ADDON50'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['url'], "https://checkout.stripe.com/pay/mock_session_123")
        
        mock_checkout_create.assert_called_once()
        kwargs = mock_checkout_create.call_args[1]
        self.assertEqual(kwargs['discounts'], [{'coupon': 'dummy_coupon_id'}])

    def test_addon_subscribe_with_invalid_django_promo_code(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('addon-subscribe', kwargs={'pk': self.addon.id})
        response = self.client.post(url, {
            'billing_cycle': 'monthly',
            'promo_code': 'NON_EXISTENT_CODE'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'Código promocional no encontrado.')

    def test_addon_subscribe_with_expired_django_promo_code(self):
        # Create an inactive PromoCode
        PromoCode.objects.create(
            code="EXPIRED20",
            code_type=PromoCode.CodeType.CLIENT,
            discount_percentage=20.00,
            is_active=False
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('addon-subscribe', kwargs={'pk': self.addon.id})
        response = self.client.post(url, {
            'billing_cycle': 'monthly',
            'promo_code': 'EXPIRED20'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'Este código promocional ha expirado o no es válido.')

    @patch('stripe.Coupon.retrieve')
    @patch('stripe.Coupon.create')
    def test_get_or_create_stripe_coupon_creation(self, mock_coupon_create, mock_coupon_retrieve):
        from django.test import override_settings
        from apps.shop.views import get_or_create_stripe_coupon
        
        # Test retrieve behavior when coupon already exists in Stripe
        mock_coupon_retrieve.return_value.id = "django_addon50"
        promo = PromoCode.objects.create(
            code="ADDON50_TEST",
            code_type=PromoCode.CodeType.CLIENT,
            discount_percentage=50.00,
            is_active=True
        )
        
        with override_settings(TESTING=False, STRIPE_SECRET_KEY="sk_test_mock"):
            coupon_id = get_or_create_stripe_coupon(promo)
            self.assertEqual(coupon_id, "django_addon50")
            mock_coupon_retrieve.assert_called_once_with("django_addon50_test")
            mock_coupon_create.assert_not_called()
            
        mock_coupon_retrieve.reset_mock()
        mock_coupon_create.reset_mock()
        
        # Test create behavior when coupon does not exist (retrieve throws error)
        import stripe
        mock_coupon_retrieve.side_effect = stripe.error.InvalidRequestError("No such coupon", "id")
        mock_coupon_create.return_value.id = "django_addon50_test"
        
        with override_settings(TESTING=False, STRIPE_SECRET_KEY="sk_test_mock"):
            coupon_id = get_or_create_stripe_coupon(promo)
            self.assertEqual(coupon_id, "django_addon50_test")
            mock_coupon_retrieve.assert_called_once_with("django_addon50_test")
            mock_coupon_create.assert_called_once()
            create_kwargs = mock_coupon_create.call_args[1]
            self.assertEqual(create_kwargs["id"], "django_addon50_test")
            self.assertEqual(create_kwargs["percent_off"], 50.00)
            self.assertEqual(create_kwargs["duration"], "forever")

    @patch('stripe.Webhook.construct_event')
    def test_stripe_webhook_addon_subscription_activation(self, mock_construct_event):
        # Verify user is initially CUSTOMER and has no contract / tenant
        self.assertEqual(self.user.role, User.Role.CUSTOMER)
        self.assertFalse(Contract.objects.filter(user=self.user).exists())
        
        from apps.tenants.models import Tenant
        self.assertFalse(Tenant.objects.filter(owner=self.user).exists())

        # Mock webhook payload
        webhook_payload = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_123",
                    "metadata": {
                        "type": "addon_subscription",
                        "user_id": str(self.user.id),
                        "addon_id": str(self.addon.id),
                        "comments": "Need live chat module config"
                    }
                }
            }
        }
        mock_construct_event.return_value = webhook_payload

        # Call Stripe webhook endpoint
        url = reverse('stripe_webhook')
        response = self.client.post(
            url,
            data=webhook_payload,
            format='json',
            HTTP_STRIPE_SIGNATURE='t=123,v1=mock_sig'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 1. Verify user upgraded to BUSINESS
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.Role.BUSINESS)

        # 2. Verify Contract was created and includes the addon
        contract = Contract.objects.filter(user=self.user).first()
        self.assertIsNotNone(contract)
        self.assertTrue(contract.is_fully_signed)
        self.assertIn(self.addon, contract.addons.all())

        # 3. Verify Tenant was created and is active (Reserved-to-Active status gating checks)
        tenant = Tenant.objects.filter(owner=self.user).first()
        self.assertIsNotNone(tenant)
        self.assertTrue(tenant.is_active)
        self.assertEqual(tenant.subdomain, "addon-client") # slugified username

        # 4. Verify support/implementation Ticket was automatically generated
        from apps.tickets.models import Ticket
        ticket = Ticket.objects.filter(client=self.user).first()
        self.assertIsNotNone(ticket)
        self.assertEqual(ticket.category, Ticket.Category.IMPLEMENTATION)
        self.assertEqual(ticket.priority, Ticket.Priority.HIGH)
        self.assertIn(self.addon.name, ticket.title)
        self.assertIn("Need live chat module config", ticket.description)


class StripePlanInstallmentCheckoutTests(APITestCase):
    def setUp(self):
        self.ceo = User.objects.create_user(
            username="saul_ceo_stripe",
            email="saul_stripe@nectarlabs.dev",
            password="securepassword",
            role=User.Role.ADMIN,
            is_staff=True
        )
        self.client_user = User.objects.create_user(
            username="client_stripe",
            email="client_stripe@example.com",
            password="clientpassword",
            role=User.Role.BUSINESS
        )
        self.plan = Plan.objects.create(
            name="Plan Test Stripe",
            price=5000.00,
            hours=20,
            description="Stripe testing plan",
            stripe_product_id="prod_mock_plan_123",
            stripe_price_id="price_mock_plan_123"
        )
        self.contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Stripe Client Company",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_commitment_method="SPEI",
            payment_day="WEEKLY_MONDAY",
            signed_at=timezone.now()
        )
        
        # Sign the contract to generate installments
        self.client.force_authenticate(user=self.ceo)
        url_sign = reverse('contract-dev-sign', kwargs={'pk': self.contract.id})
        self.client.post(url_sign, {'signature': 'DeveloperSignatureXYZ'})
        
        self.installment = self.contract.installments.filter(installment_type='DEVELOPMENT').first()

    @patch('stripe.checkout.Session.create')
    def test_installment_checkout_uses_preexisting_plan_product(self, mock_checkout_create):
        mock_checkout_create.return_value.url = "https://checkout.stripe.com/pay/mock_session_123"
        
        self.client.force_authenticate(user=self.client_user)
        url = reverse('installment-checkout-session', kwargs={'pk': self.installment.id})
        response = self.client.post(url, {'wants_invoice': False}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify Stripe Checkout Session was created using the plan's stripe_product_id in price_data.product
        mock_checkout_create.assert_called_once()
        args, kwargs = mock_checkout_create.call_args
        line_item_price_data = kwargs['line_items'][0]['price_data']
        self.assertEqual(line_item_price_data['product'], 'prod_mock_plan_123')
        self.assertNotIn('product_data', line_item_price_data)
        self.assertEqual(line_item_price_data['unit_amount'], 125000) # (5000 / 4) * 100

    from django.test import override_settings

    @override_settings(TESTING=False, STRIPE_SECRET_KEY="sk_test_mock")
    @patch('stripe.checkout.Session.create')
    @patch('stripe.Product.list')
    def test_custom_project_checkout_uses_generic_product(self, mock_product_list, mock_checkout_create):
        # Setup mock for listing to return a mocked product ID instead of calling API
        from unittest.mock import MagicMock
        mock_prod = MagicMock()
        mock_prod.id = "prod_mock_custom_dev"
        mock_prod.active = True
        mock_prod.metadata = {"special_product": "custom_development"}
        mock_product_list.return_value.auto_paging_iter.return_value = [mock_prod]
        
        mock_checkout_create.return_value.url = "https://checkout.stripe.com/pay/mock_session_123"
        
        # Create a contract with a project quote (custom project, no plan)
        from apps.dashboard.models import ProjectQuote
        quote = ProjectQuote.objects.create(
            client_name="Quote Client Stripe",
            client_email="client_stripe@example.com",
            project_name="Custom CRM Stripe",
            total_price=40000.00,
            estimated_delivery_weeks=8
        )
        custom_contract = Contract.objects.create(
            user=self.client_user,
            project_quote=quote,
            full_name="Custom CRM Company",
            signature_base64="data:image/png;base64,ClientSignatureBase64...",
            is_fully_signed=False
        )
        
        # Dev sign
        self.client.force_authenticate(user=self.ceo)
        url_sign = reverse('contract-dev-sign', kwargs={'pk': custom_contract.id})
        self.client.post(url_sign, {'signature': 'DeveloperSignatureXYZ'})
        
        custom_installment = custom_contract.installments.filter(installment_type='DEVELOPMENT').first()
        
        # Checkout session
        self.client.force_authenticate(user=self.client_user)
        url = reverse('installment-checkout-session', kwargs={'pk': custom_installment.id})
        response = self.client.post(url, {'wants_invoice': False}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify it lists products with special_product metadata and uses it in price_data.product
        mock_product_list.assert_called()
        mock_checkout_create.assert_called_once()
        args, kwargs = mock_checkout_create.call_args
        line_item_price_data = kwargs['line_items'][0]['price_data']
        self.assertEqual(line_item_price_data['product'], 'prod_mock_custom_dev')
        self.assertNotIn('product_data', line_item_price_data)


class EnviaAndStripeIdempotencyTests(APITestCase):
    def setUp(self):
        self.ceo = User.objects.create_user(
            username="saul_ceo_envia",
            email="saul_envia@nectarlabs.dev",
            password="securepassword",
            role=User.Role.ADMIN,
            is_staff=True
        )
        self.client_user = User.objects.create_user(
            username="client_envia",
            email="client_envia@example.com",
            password="clientpassword",
            role=User.Role.BUSINESS
        )
        # Create a Tenant with wallet balance and commission
        self.tenant = Tenant.objects.create(
            owner=self.client_user,
            name="Envia Workspace",
            subdomain="envia-workspace",
            shipping_markup_percentage=15.00,
            platform_shipping_fee=Decimal("10.00"),
            shipping_wallet_balance=Decimal("500.00"),
            is_active=True,
            trial_ends_at=timezone.now() + timedelta(days=14),
            preferred_shipping_provider=Tenant.ShippingProvider.ENVIA
        )

    def test_get_shipping_rates_applies_nectar_commission_and_markup(self):
        """
        Verifica que get_shipping_rates calcula:
        1. Costo Tenant = Costo Base Envia + Comisión fija de Néctar Labs ($10.00 MXN)
        2. Total Comprador = Costo Tenant * (1 + markup/100)
        """
        from apps.shop.shipping import get_shipping_rates
        destination = {
            "name": "Destinatario Test",
            "street": "Calle Destino 789",
            "suburb": "Pitic",
            "city": "Hermosillo",
            "state": "Sonora",
            "zip_code": "83150"
        }
        
        # En modo testing:
        # mock_base_1 = 115.00, nectar_fee = 10.00 -> tenant_cost = 125.00 -> total = 125.00 * 1.15 = 143.75
        # mock_base_2 = 175.00, nectar_fee = 10.00 -> tenant_cost = 185.00 -> total = 185.00 * 1.15 = 212.75
        rates = get_shipping_rates(destination, tenant=self.tenant)
        self.assertEqual(len(rates), 2)
        
        self.assertEqual(rates[0]["amount"], 115.00)
        self.assertEqual(rates[0]["nectar_fee"], 10.00)
        self.assertEqual(rates[0]["tenant_cost"], 125.00)
        self.assertEqual(rates[0]["total_amount"], 143.75)
        
        self.assertEqual(rates[1]["amount"], 175.00)
        self.assertEqual(rates[1]["nectar_fee"], 10.00)
        self.assertEqual(rates[1]["tenant_cost"], 185.00)
        self.assertEqual(rates[1]["total_amount"], 212.75)

        # Actualizar markup a 20%
        self.tenant.shipping_markup_percentage = 20.00
        self.tenant.save()
        
        rates = get_shipping_rates(destination, tenant=self.tenant)
        # Rate 1: 125.00 * 1.20 = 150.00
        self.assertEqual(rates[0]["total_amount"], 150.00)
        # Rate 2: 185.00 * 1.20 = 222.00
        self.assertEqual(rates[1]["total_amount"], 222.00)

    def test_get_shipping_rates_dynamic_best_aggregates_both_providers(self):
        """
        Verifica que get_shipping_rates con DYNAMIC_BEST agrega tarifas de ambos proveedores
        (2 de Envia.com + 3 de Skydropx Pro = 5 tarifas).
        """
        from apps.shop.shipping import get_shipping_rates
        self.tenant.preferred_shipping_provider = Tenant.ShippingProvider.DYNAMIC_BEST
        self.tenant.save()

        destination = {
            "name": "Destinatario Test",
            "street": "Calle Destino 789",
            "suburb": "Pitic",
            "city": "Hermosillo",
            "state": "Sonora",
            "zip_code": "83150"
        }
        rates = get_shipping_rates(destination, tenant=self.tenant)
        self.assertEqual(len(rates), 5)

    def test_generate_shipping_label_deducts_wallet_and_logs_ledger(self):
        """
        Verifica que emitir una guía descuente de la billetera del tenant (Costo Base + $10 MXN)
        y registre la transacción en ShippingWalletTransaction.
        """
        from apps.shop.models import Order, ShippingWalletTransaction
        from apps.shop.shipping import generate_shipping_label
        from decimal import Decimal

        initial_balance = Decimal("500.00")
        self.tenant.shipping_wallet_balance = initial_balance
        self.tenant.save()

        order = Order.objects.create(
            tenant=self.tenant,
            user=self.client_user,
            total=Decimal("300.00"),
            shipping_cost_base=Decimal("115.00"),
            shipping_rate_id="rate_envia_mock_fedex",
            full_name="Cliente Prueba",
            postal_code="83150",
            status=Order.Status.PAID
        )

        success = generate_shipping_label(order)
        self.assertTrue(success)

        self.tenant.refresh_from_db()
        # Costo debitado: 115.00 + 10.00 = 125.00
        expected_balance = initial_balance - Decimal("125.00")
        self.assertEqual(self.tenant.shipping_wallet_balance, expected_balance)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.SHIPPED)
        self.assertTrue(order.tracking_number.startswith(f"ENVIA-{self.tenant.subdomain.upper()}"))
        self.assertEqual(order.shipping_cost_real, Decimal("115.00"))
        self.assertEqual(order.shipping_cost_tenant, Decimal("125.00"))

        # Validar Ledger con desglose explícito de conceptos (Courier Base + Fee Néctar)
        tx = ShippingWalletTransaction.objects.filter(order=order).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, Decimal("-125.00"))
        self.assertEqual(tx.balance_after, expected_balance)
        self.assertEqual(tx.transaction_type, ShippingWalletTransaction.TransactionType.LABEL_DEBIT)
        self.assertEqual(tx.courier_cost, Decimal("115.00"))
        self.assertEqual(tx.platform_fee, Decimal("10.00"))
        self.assertIsNotNone(tx.idempotency_key)

        # 2. Prueba de Idempotencia Estricta: segunda invocación no genera cobro doble ni duplicidad de registros
        initial_tx_count = ShippingWalletTransaction.objects.filter(order=order).count()
        second_call = generate_shipping_label(order)
        self.assertTrue(second_call)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.shipping_wallet_balance, expected_balance)
        self.assertEqual(ShippingWalletTransaction.objects.filter(order=order).count(), initial_tx_count)

    def test_envia_webhook_tracking_and_surcharge(self):
        """
        Verifica el procesamiento del webhook de Envia:
        1. Actualización de tracking (tracking.simple).
        2. Cargo por sobrepeso (surcharge) descontado atómicamente de la billetera.
        3. Idempotencia ante retransmisiones del webhook.
        """
        from apps.shop.models import Order, EnviaWebhookEventLog, ShippingWalletTransaction
        from decimal import Decimal

        order = Order.objects.create(
            tenant=self.tenant,
            user=self.client_user,
            total=Decimal("300.00"),
            tracking_number="ENVIA-TRACK-99999",
            status=Order.Status.SHIPPED
        )

        webhook_url = reverse('envia-webhook')

        # 1. Evento tracking.simple -> DELIVERED
        payload_tracking = {
            "type": "tracking.simple",
            "data": {
                "tracking_number": "ENVIA-TRACK-99999",
                "status": "delivered",
                "status_code": "001"
            }
        }
        res = self.client.post(
            webhook_url,
            payload_tracking,
            format='json',
            HTTP_X_WEBHOOK_EVENT="tracking.simple",
            HTTP_X_WEBHOOK_ID="wh_track_001"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.DELIVERED)

        # Verificar log de webhook
        log = EnviaWebhookEventLog.objects.filter(event_id="wh_track_001").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, EnviaWebhookEventLog.Status.PROCESSED)

        # Idempotencia: reenviar mismo evento
        res_dup = self.client.post(
            webhook_url,
            payload_tracking,
            format='json',
            HTTP_X_WEBHOOK_EVENT="tracking.simple",
            HTTP_X_WEBHOOK_ID="wh_track_001"
        )
        self.assertEqual(res_dup.status_code, status.HTTP_200_OK)
        self.assertEqual(res_dup.data.get("status"), "already_processed")

        # 2. Evento surcharge -> Débito por sobrepeso
        prev_balance = self.tenant.shipping_wallet_balance
        payload_surcharge = {
            "type": "surcharge",
            "data": {
                "tracking_number": "ENVIA-TRACK-99999",
                "surcharge_id": "sur_98765",
                "surcharge_data": {
                    "transaction_type": "surcharge",
                    "amount": 35.50,
                    "surcharge_type": "Sobrepeso 1.5kg"
                }
            }
        }
        res_sur = self.client.post(
            webhook_url,
            payload_surcharge,
            format='json',
            HTTP_X_WEBHOOK_EVENT="surcharge",
            HTTP_X_WEBHOOK_ID="sur_98765"
        )
        self.assertEqual(res_sur.status_code, status.HTTP_200_OK)

        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.shipping_wallet_balance, prev_balance - Decimal("35.50"))

        sur_tx = ShippingWalletTransaction.objects.filter(reference_id="sur_98765").first()
        self.assertIsNotNone(sur_tx)
        self.assertEqual(sur_tx.transaction_type, ShippingWalletTransaction.TransactionType.SURCHARGE_DEBIT)
        self.assertEqual(sur_tx.amount, Decimal("-35.50"))
        self.assertEqual(sur_tx.adjustment_fee, Decimal("35.50"))
        self.assertEqual(sur_tx.idempotency_key, "envia_surcharge_sur_98765_surcharge")

        # Idempotencia: reenviar el mismo evento de surcharge no genera cobro doble ni transacciones duplicadas
        res_sur_dup = self.client.post(
            webhook_url,
            payload_surcharge,
            format='json',
            HTTP_X_WEBHOOK_EVENT="surcharge",
            HTTP_X_WEBHOOK_ID="sur_98765"
        )
        self.assertEqual(res_sur_dup.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.shipping_wallet_balance, prev_balance - Decimal("35.50"))
        self.assertEqual(ShippingWalletTransaction.objects.filter(reference_id="sur_98765").count(), 1)

    def test_idempotency_key_database_unique_constraint(self):
        """
        Verifica a nivel de base de datos que el campo idempotency_key en ShippingWalletTransaction
        posee restricción UNIQUE y previene inserciones concurrentes duplicadas vía IntegrityError.
        """
        from apps.shop.models import ShippingWalletTransaction
        from django.db.utils import IntegrityError
        from decimal import Decimal

        idemp_key = "test_unique_idemp_key_12345"
        ShippingWalletTransaction.objects.create(
            tenant=self.tenant,
            amount=Decimal("-10.00"),
            balance_after=Decimal("290.00"),
            transaction_type=ShippingWalletTransaction.TransactionType.LABEL_DEBIT,
            idempotency_key=idemp_key
        )

        with self.assertRaises(IntegrityError):
            ShippingWalletTransaction.objects.create(
                tenant=self.tenant,
                amount=Decimal("-10.00"),
                balance_after=Decimal("280.00"),
                transaction_type=ShippingWalletTransaction.TransactionType.LABEL_DEBIT,
                idempotency_key=idemp_key
            )

    def test_generate_label_distributed_lock_concurrency(self):
        """
        Verifica que generate_shipping_label adquiera y respete el lock distribuido en Redis/Caché
        (lock:generate_label:order_{id}), evitando ejecuciones paralelas que generen doble cobro.
        """
        from apps.shop.models import Order, ShippingWalletTransaction
        from apps.shop.shipping import generate_shipping_label
        from django.core.cache import cache
        from decimal import Decimal

        order = Order.objects.create(
            tenant=self.tenant,
            user=self.client_user,
            total=Decimal("300.00"),
            shipping_cost_base=Decimal("115.00"),
            shipping_rate_id="rate_lock_test",
            status=Order.Status.PAID
        )

        lock_key = f"lock:generate_label:order_{order.id}"
        cache.set(lock_key, True, timeout=60)
        try:
            success = generate_shipping_label(order)
            self.assertFalse(success)
            self.assertEqual(ShippingWalletTransaction.objects.filter(order=order).count(), 0)
            order.refresh_from_db()
            self.assertEqual(order.status, Order.Status.PAID)
        finally:
            cache.delete(lock_key)

    @patch('apps.shop.views.get_shipping_rates')
    def test_get_shipping_rates_resolves_custom_domain(self, mock_get_shipping_rates):
        """
        Verifica que GetShippingRatesView resuelva el inquilino correspondiente a través del
        header Host de dominio personalizado (ej: msambar.com), utilizando la configuración
        y el origen del tenant de forma transparente sin requerir tenant_id manual.
        """
        from decimal import Decimal

        self.tenant.custom_domain = "msambar.com"
        self.tenant.postal_code = "83000"
        self.tenant.shipping_wallet_balance = Decimal("500.00")
        self.tenant.shipping_markup_percentage = Decimal("0.00")
        self.tenant.save()

        mock_get_shipping_rates.return_value = [
            {
                "provider": "ENVIA",
                "carrier": "fedex",
                "service": "Express",
                "total_price": 120.0,
                "currency": "MXN",
                "rate_id": "rate_mock_domain_123"
            }
        ]

        url = reverse('shop_shipping_rates')
        payload = {
            "destination": {
                "zip_code": "06600",
                "city": "Ciudad de México",
                "state": "CDMX",
                "country": "MX"
            }
        }

        res = self.client.post(url, payload, format='json', HTTP_HOST="msambar.com")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        mock_get_shipping_rates.assert_called_once()
        call_kwargs = mock_get_shipping_rates.call_args[1]
        self.assertEqual(call_kwargs.get("tenant"), self.tenant)

    @override_settings(
        ENVIA_WEBHOOK_TOKENS=[
            "mock_staging_status_token",
            "mock_staging_eco_token",
            "mock_prod_eco_token",
        ]
    )
    def test_envia_webhook_bearer_auth_and_legacy_payload(self):
        """
        Verifica la ingesta de webhooks reales registrados en Envia (Tipo 1 onShipmentStatusUpdate):
        - Autenticación con Header Authorization: Bearer <auth_token>
        - Payload con claves en la raíz en camelCase: trackingNumber, carrierName, status
        - Soporte para endpoint ecommerceTracking
        """
        from apps.shop.models import Order, EnviaWebhookEventLog
        from decimal import Decimal

        order = Order.objects.create(
            tenant=self.tenant,
            user=self.client_user,
            total=Decimal("250.00"),
            tracking_number="ENVIA-LEGACY-777",
            status=Order.Status.SHIPPED
        )

        # Usar auth_token registrado de prueba
        token = "mock_staging_status_token"
        webhook_url = reverse('envia_webhook')

        payload = {
            "carrierName": "paquetexpress",
            "trackingNumber": "ENVIA-LEGACY-777",
            "status": "Delivered"
        }

        # 1. Petición válida con Bearer token
        res = self.client.post(
            webhook_url,
            payload,
            format='json',
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.DELIVERED)

        # 2. Petición al endpoint alternativo ecommerceTracking
        ecommerce_url = reverse('envia_webhook_ecommerce')
        payload_eco = {
            "carrierName": "fedex",
            "trackingNumber": "ENVIA-LEGACY-777",
            "status": "Cancelled"
        }
        token_eco = "mock_staging_eco_token"
        res_eco = self.client.post(
            ecommerce_url,
            payload_eco,
            format='json',
            HTTP_AUTHORIZATION=f"Bearer {token_eco}"
        )
        self.assertEqual(res_eco.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)

        # 3. Petición al endpoint ecommerceTracking con Token alternativo
        prod_eco_token = "mock_prod_eco_token"
        payload_prod = {
            "carrierName": "estafeta",
            "trackingNumber": "ENVIA-LEGACY-777",
            "status": "Delivered"
        }
        res_prod = self.client.post(
            ecommerce_url,
            payload_prod,
            format='json',
            HTTP_AUTHORIZATION=f"Bearer {prod_eco_token}"
        )
        self.assertEqual(res_prod.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.DELIVERED)

        # 4. Petición con Bearer token no autorizado
        res_unauth = self.client.post(
            webhook_url,
            payload,
            format='json',
            HTTP_AUTHORIZATION="Bearer token_invalido_malicioso"
        )
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_stripe_webhook_wallet_recharge_idempotency(self):
        """
        Verifica que el webhook de Stripe:
        1. Abone saldo correctamente con metadata 'shipping_funds_package'.
        2. Abone saldo correctamente con metadata 'shipping_wallet_recharge'.
        3. Sea 100% idempotente y no duplique saldo ante reintentos del mismo session_id.
        """
        from apps.shop.views import stripe_webhook
        from apps.shop.models import ShippingWalletTransaction
        from decimal import Decimal
        from unittest.mock import patch

        initial_balance = Decimal("300.00")
        self.tenant.shipping_wallet_balance = initial_balance
        self.tenant.save()

        # Simular evento de Stripe checkout.session.completed para shipping_wallet_recharge
        event_recharge = {
            "id": "evt_test_wallet_001",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_wallet_session_123",
                    "metadata": {
                        "type": "shipping_wallet_recharge",
                        "tenant_id": str(self.tenant.id),
                        "amount": "500.00"
                    }
                }
            }
        }

        with patch('stripe.Webhook.construct_event', return_value=event_recharge):
            # Primera llamada: Debe acreditar +$500.00 MXN
            res1 = self.client.post(
                reverse('stripe_webhook'),
                event_recharge,
                format='json',
                HTTP_STRIPE_SIGNATURE="mock_signature"
            )
            self.assertEqual(res1.status_code, status.HTTP_200_OK)

            self.tenant.refresh_from_db()
            self.assertEqual(self.tenant.shipping_wallet_balance, initial_balance + Decimal("500.00"))

            # Segunda llamada (reintento con mismo session.id): Idempotente, no debe alterar el saldo
            res2 = self.client.post(
                reverse('stripe_webhook'),
                event_recharge,
                format='json',
                HTTP_STRIPE_SIGNATURE="mock_signature"
            )
            self.assertEqual(res2.status_code, status.HTTP_200_OK)

            self.tenant.refresh_from_db()
            self.assertEqual(self.tenant.shipping_wallet_balance, initial_balance + Decimal("500.00"))

            # Validar que solo existe un registro en el ledger
            tx_count = ShippingWalletTransaction.objects.filter(reference_id="cs_test_wallet_session_123").count()
            self.assertEqual(tx_count, 1)


    @patch('stripe.Product.create')
    @patch('stripe.Product.list')
    @patch('stripe.Price.create')
    @patch('stripe.Price.list')
    def test_stripe_plan_creation_idempotency(self, mock_price_list, mock_price_create, mock_product_list, mock_product_create):
        """
        Verify that creating a Plan triggers Stripe Product and Price creations with deterministic idempotency keys.
        """
        from django.test import override_settings
        
        mock_product_list.return_value.auto_paging_iter.return_value = []
        mock_prod = MagicMock()
        mock_prod.id = "prod_plan_test_999"
        mock_prod.active = True
        mock_prod.name = "[Nectar Labs Plan] Plan Idempotente"
        mock_prod.description = "Test Description"
        mock_prod.metadata = {"plan_id": "999", "plan_slug": "plan-idempotente"}
        mock_product_create.return_value = mock_prod

        mock_price_list.return_value.data = []
        mock_price = MagicMock()
        mock_price.id = "price_plan_test_999"
        mock_price_create.return_value = mock_price

        # Save Plan outside testing mode to trigger Stripe calls
        with override_settings(TESTING=False, STRIPE_SECRET_KEY="sk_test_mock"):
            plan = Plan.objects.create(
                id=999,
                name="Plan Idempotente",
                price=1000.00,
                hours=10,
                description="Test Description"
            )
            self.assertEqual(plan.stripe_product_id, "prod_plan_test_999")
            self.assertEqual(plan.stripe_price_id, "price_plan_test_999")

            # Verify idempotency keys
            mock_product_create.assert_called_once()
            prod_kwargs = mock_product_create.call_args[1]
            self.assertEqual(prod_kwargs["idempotency_key"], "plan_product_999")

            mock_price_create.assert_called_once()
            price_kwargs = mock_price_create.call_args[1]
            self.assertEqual(price_kwargs["idempotency_key"], "plan_price_999_100000")

    @patch('stripe.Product.create')
    @patch('stripe.Product.list')
    @patch('stripe.Price.create')
    @patch('stripe.Price.list')
    def test_stripe_addon_creation_idempotency(self, mock_price_list, mock_price_create, mock_product_list, mock_product_create):
        """
        Verify that creating an AddOn triggers Stripe Product and Price creations with deterministic idempotency keys.
        """
        from django.test import override_settings
        
        mock_product_list.return_value.auto_paging_iter.return_value = []
        mock_prod = MagicMock()
        mock_prod.id = "prod_addon_test_slug"
        mock_prod.active = True
        mock_prod.name = "[Nectar Labs Add-on] Addon Idempotente"
        mock_prod.description = "Test Description"
        mock_prod.metadata = {"addon_slug": "addon-idempotente"}
        mock_product_create.return_value = mock_prod

        mock_price_list.return_value.data = []
        mock_price = MagicMock()
        mock_price.id = "price_addon_test_slug"
        mock_price_create.return_value = mock_price

        with override_settings(TESTING=False, STRIPE_SECRET_KEY="sk_test_mock"):
            addon = AddOn.objects.create(
                slug="addon-idempotente",
                name="Addon Idempotente",
                monthly_price=500.00,
                yearly_price=5000.00,
                description="Test Description",
                complexity=AddOn.Complexity.LOW
            )
            self.assertEqual(addon.stripe_price_id, "price_addon_test_slug")
            self.assertEqual(addon.stripe_yearly_price_id, "price_addon_test_slug")

            # Verify idempotency keys
            mock_product_create.assert_called_once()
            prod_kwargs = mock_product_create.call_args[1]
            self.assertEqual(prod_kwargs["idempotency_key"], "addon_product_addon-idempotente")

            # Mock price create should have been called twice (monthly and yearly)
            self.assertEqual(mock_price_create.call_count, 2)
            first_call_args = mock_price_create.call_args_list[0][1]
            second_call_args = mock_price_create.call_args_list[1][1]
            
            self.assertEqual(first_call_args["idempotency_key"], "addon_price_monthly_addon-idempotente_50000")
            self.assertEqual(second_call_args["idempotency_key"], "addon_price_yearly_addon-idempotente_500000")


class AddOnSubscriptionViewSetTests(APITestCase):
    def setUp(self):
        self.ceo = User.objects.create_user(
            username="saul_ceo_addon",
            email="saul_ceo@nectarlabs.dev",
            password="securepassword",
            role=User.Role.ADMIN,
            is_staff=True
        )
        self.client_user = User.objects.create_user(
            username="client_addon",
            email="client_addon@example.com",
            password="clientpassword",
            role=User.Role.BUSINESS
        )
        self.plan = Plan.objects.create(
            name="Plan Test",
            price=5000.00,
            hours=20,
            description="Testing plan"
        )
        self.addon = AddOn.objects.create(
            slug="test-addon",
            name="Test Addon",
            monthly_price=150.00,
            yearly_price=1500.00,
            complexity=AddOn.Complexity.LOW
        )

    def test_perform_create_with_active_contract_plan(self):
        # Create an active contract with a plan for the user
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Plan Client Company",
            is_active=True,
            is_fully_signed=True
        )
        
        self.client.force_authenticate(user=self.client_user)
        url = reverse('addonsubscription-list')
        response = self.client.post(url, {
            'addon': self.addon.id,
            'billing_cycle': 'monthly'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        sub = AddOnSubscription.objects.get(id=response.data['id'])
        self.assertFalse(sub.is_activated)
        self.assertEqual(sub.price_paid, 0.00)

    def test_perform_create_without_active_contract_plan(self):
        self.client.force_authenticate(user=self.client_user)
        url = reverse('addonsubscription-list')
        response = self.client.post(url, {
            'addon': self.addon.id,
            'billing_cycle': 'monthly'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        sub = AddOnSubscription.objects.get(id=response.data['id'])
        self.assertTrue(sub.is_activated)

    def test_admin_activate_and_deactivate(self):
        # Create subscription with is_activated=False
        sub = AddOnSubscription.objects.create(
            user=self.client_user,
            addon=self.addon,
            is_activated=False,
            price_paid=0.00
        )
        
        # Create contract for user
        contract = Contract.objects.create(
            user=self.client_user,
            full_name="Client Company",
            is_active=True,
            is_fully_signed=True
        )
        
        # 1. Non-staff try to activate
        self.client.force_authenticate(user=self.client_user)
        url_activate = reverse('addonsubscription-activate', kwargs={'pk': sub.id})
        response = self.client.post(url_activate, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 2. Admin activates
        self.client.force_authenticate(user=self.ceo)
        response = self.client.post(url_activate, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        sub.refresh_from_db()
        self.assertTrue(sub.is_activated)
        self.assertIn(self.addon, contract.addons.all())
        
        # 3. Admin deactivates
        url_deactivate = reverse('addonsubscription-deactivate', kwargs={'pk': sub.id})
        response = self.client.post(url_deactivate, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        sub.refresh_from_db()
        self.assertFalse(sub.is_activated)
        self.assertNotIn(self.addon, contract.addons.all())


class PaymentReminderCommandTests(APITestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        self.client_user = get_user_model().objects.create_user(
            username="client_reminder",
            email="reminder_client@example.com",
            password="clientpassword",
            role="BUSINESS"
        )
        self.contract = Contract.objects.create(
            user=self.client_user,
            full_name="Reminder Client Company",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="CRM platform",
            signed_at=timezone.now()
        )
        
    def test_payment_reminder_command_sends_reminders(self):
        """
        Verify that the send_payment_reminders command:
        1. Identifies PENDING installments due in <= 3 days.
        2. Sends email reminders (using django.core.mail outbox).
        3. Sets reminder_sent to True.
        4. Excludes already notified or future installments.
        """
        from datetime import date, timedelta
        from django.core import mail
        from django.core.management import call_command
        
        today = timezone.now().date()
        
        # 1. Installment due today (should trigger reminder)
        inst_due_today = PaymentInstallment.objects.create(
            contract=self.contract,
            installment_number=1,
            amount=5000.00,
            due_date=today,
            status=PaymentInstallment.Status.PENDING,
            reminder_sent=False
        )
        
        # 2. Installment due in 3 days (should trigger reminder)
        inst_due_in_3_days = PaymentInstallment.objects.create(
            contract=self.contract,
            installment_number=2,
            amount=5000.00,
            due_date=today + timedelta(days=3),
            status=PaymentInstallment.Status.PENDING,
            reminder_sent=False
        )
        
        # 3. Installment due in 4 days (should NOT trigger reminder yet)
        inst_due_in_4_days = PaymentInstallment.objects.create(
            contract=self.contract,
            installment_number=3,
            amount=5000.00,
            due_date=today + timedelta(days=4),
            status=PaymentInstallment.Status.PENDING,
            reminder_sent=False
        )
        
        # 4. Installment already notified (should NOT trigger reminder again)
        inst_already_notified = PaymentInstallment.objects.create(
            contract=self.contract,
            installment_number=4,
            amount=5000.00,
            due_date=today,
            status=PaymentInstallment.Status.PENDING,
            reminder_sent=True
        )
        
        # 5. Paid installment (should NOT trigger reminder)
        inst_paid = PaymentInstallment.objects.create(
            contract=self.contract,
            installment_number=5,
            amount=5000.00,
            due_date=today,
            status=PaymentInstallment.Status.PAID,
            reminder_sent=False
        )
        
        # Reset outbox
        mail.outbox = []
        
        # Call command
        call_command('send_payment_reminders')
        
        # Verify 2 emails sent
        self.assertEqual(len(mail.outbox), 2)
        recipients = [msg.to[0] for msg in mail.outbox]
        self.assertEqual(recipients, ["reminder_client@example.com", "reminder_client@example.com"])
        
        # Refresh from db
        inst_due_today.refresh_from_db()
        inst_due_in_3_days.refresh_from_db()
        inst_due_in_4_days.refresh_from_db()
        inst_already_notified.refresh_from_db()
        
        # Verify flags
        self.assertTrue(inst_due_today.reminder_sent)
        self.assertTrue(inst_due_in_3_days.reminder_sent)
        self.assertFalse(inst_due_in_4_days.reminder_sent)
        self.assertTrue(inst_already_notified.reminder_sent)




