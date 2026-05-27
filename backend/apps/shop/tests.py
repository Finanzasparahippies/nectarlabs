from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from apps.shop.models import Plan, Contract, PaymentInstallment, PromoCode, SalesCommission
from datetime import date, timedelta

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
            # Verify due_date is a Monday (weekday() == 0 in python)
            self.assertEqual(inst.due_date.weekday(), 0)
            
            # Verify dates are consecutive weeks
            if idx > 0:
                day_difference = (inst.due_date - installments[idx - 1].due_date).days
                self.assertEqual(day_difference, 7)

    def test_fortnightly_1st_15th_installment_generation(self):
        """
        Verify that signing a contract with FORTNIGHTLY_1ST_15TH generates 12 fortnightly installments,
        each being 1/2 of the total monthly amount, due on the 1st and 15th.
        """
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
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
        for inst in installments:
            self.assertEqual(inst.amount, expected_amount)
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
        for inst in installments:
            self.assertEqual(inst.amount, expected_amount)
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
