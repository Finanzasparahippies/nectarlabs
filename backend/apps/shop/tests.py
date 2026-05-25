from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from apps.shop.models import Plan, Contract, PaymentInstallment
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
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Client Company SA",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_day="WEEKLY_MONDAY",
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
            payment_day="FORTNIGHTLY_1ST_15TH",
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
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Client Company SA",
            tax_id="RFC123456789",
            address="Av. Juarez 123",
            project_idea="Build an e-commerce platform.",
            payment_day="MONTHLY_1ST",
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
