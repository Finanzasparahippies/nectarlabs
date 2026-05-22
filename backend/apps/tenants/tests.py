from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase
from apps.tenants.models import Tenant
from apps.shop.models import Plan, Contract, AddOn
from apps.newsletter.models import Subscriber

User = get_user_model()

class TenantsAddonIsolationTests(APITestCase):
    def setUp(self):
        # Create Owner/Business Users
        self.owner_a = User.objects.create_user(
            username="owner_a",
            email="owner_a@example.com",
            password="password123",
            role=User.Role.BUSINESS
        )
        self.owner_b = User.objects.create_user(
            username="owner_b",
            email="owner_b@example.com",
            password="password123",
            role=User.Role.BUSINESS
        )

        # Create Tenants
        self.tenant_a = Tenant.objects.create(
            name="Tenant A",
            subdomain="tenanta",
            owner=self.owner_a
        )
        self.tenant_b = Tenant.objects.create(
            name="Tenant B",
            subdomain="tenantb",
            owner=self.owner_b
        )

        # Create Customer Users
        self.customer_a = User.objects.create_user(
            username="customer_a",
            email="customer_a@example.com",
            password="password123",
            role=User.Role.CUSTOMER,
            tenant=self.tenant_a
        )
        self.customer_b = User.objects.create_user(
            username="customer_b",
            email="customer_b@example.com",
            password="password123",
            role=User.Role.CUSTOMER,
            tenant=self.tenant_b
        )

        # Create Plans and AddOns
        self.plan_6m = Plan.objects.create(
            name="6 Months Plan",
            price=3000.00,
            hours=20,
            description="6 months plan"
        )
        self.live_chat_addon = AddOn.objects.create(
            slug="live-chat",
            name="Live Chat",
            category_badge="Support",
            description="Live Chat Widget",
            detailed_description="Detailed Live Chat Widget",
            monthly_price=500.00,
            yearly_price=5000.00,
            origin_project="Nectar",
            source_reference="Ref"
        )
        self.newsletter_addon = AddOn.objects.create(
            slug="newsletter-campaigner",
            name="Newsletter Campaigner",
            category_badge="Marketing",
            description="Newsletter description",
            detailed_description="Newsletter detailed",
            monthly_price=300.00,
            yearly_price=3000.00,
            origin_project="Nectar",
            source_reference="Ref"
        )

    def test_live_chat_requires_addon_permission_denied(self):
        """
        Verify that a client cannot access support-chats endpoint if the tenant
        does not have the 'live-chat' addon active.
        """
        self.client.force_authenticate(user=self.customer_a)
        response = self.client.get(reverse('support-chat-list'))
        # Should return 403 Forbidden since no contract is active for tenant_a
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("no está habilitado para tu portal", response.data['detail'])

    def test_live_chat_allowed_via_plan_contract(self):
        """
        Verify that a client CAN access support-chats endpoint if the owner
        has a signed active contract with a plan (which activates all addons).
        """
        Contract.objects.create(
            user=self.owner_a,
            plan=self.plan_6m,
            full_name="Owner A Contract",
            tax_id="TAXA123",
            address="Address A",
            project_idea="Idea A",
            signature_base64="signature",
            is_fully_signed=True,
            is_active=True
        )
        
        self.client.force_authenticate(user=self.customer_a)
        response = self.client.get(reverse('support-chat-list'))
        # Should succeed (return 200 OK) because owner_a has a signed contract with a plan
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_live_chat_allowed_via_manual_addon_contract(self):
        """
        Verify that a client CAN access support-chats endpoint if the owner
        has a signed active contract specifically purchasing the 'live-chat' addon.
        """
        contract = Contract.objects.create(
            user=self.owner_a,
            plan=None, # Flex contract / manual addon only
            full_name="Owner A Contract",
            tax_id="TAXA123",
            address="Address A",
            project_idea="Idea A",
            signature_base64="signature",
            is_fully_signed=True,
            is_active=True
        )
        contract.addons.add(self.live_chat_addon)

        self.client.force_authenticate(user=self.customer_a)
        response = self.client.get(reverse('support-chat-list'))
        # Should succeed because live-chat addon was manually associated to the active contract
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_newsletter_subscribe_permission_and_isolation(self):
        """
        Verify subscription permissions and subscriber isolation per tenant.
        """
        # Initially, subscribing without the addon active returns 403
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'sub@example.com', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Activate newsletter addon for Tenant A via contract
        contract_a = Contract.objects.create(
            user=self.owner_a,
            plan=None,
            full_name="Owner A Contract",
            tax_id="TAXA123",
            address="Address A",
            project_idea="Idea A",
            signature_base64="signature",
            is_fully_signed=True,
            is_active=True
        )
        contract_a.addons.add(self.newsletter_addon)

        # Now subscription on Tenant A should succeed
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'sub@example.com', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Subscriber.objects.filter(email='sub@example.com', tenant=self.tenant_a).exists())

        # Attempt to subscribe same email to Tenant B -> should fail with 403 (Tenant B has no active addon)
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'sub@example.com', 'tenant_id': str(self.tenant_b.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Activate newsletter addon for Tenant B
        contract_b = Contract.objects.create(
            user=self.owner_b,
            plan=None,
            full_name="Owner B Contract",
            tax_id="TAXB123",
            address="Address B",
 project_idea="Idea B",
            signature_base64="signature",
            is_fully_signed=True,
            is_active=True
        )
        contract_b.addons.add(self.newsletter_addon)

        # Now subscription on Tenant B should succeed for the exact same email
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'sub@example.com', 'tenant_id': str(self.tenant_b.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Subscriber.objects.filter(email='sub@example.com', tenant=self.tenant_b).exists())

        # Subscribing again on Tenant A should report already subscribed and return 200 OK
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'sub@example.com', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("ya se encuentra suscrito", response.data['message'])

        # Verify welcome email sent
        self.assertEqual(len(mail.outbox), 2)  # Two successful subscriptions
