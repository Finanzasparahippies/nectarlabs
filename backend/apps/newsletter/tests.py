from django.urls import reverse
from django.core import mail
from rest_framework import status
from apps.tenants.test_base import BaseTenantAddonTestCase, logger
from apps.shop.models import Contract
from apps.newsletter.models import Subscriber

class NewsletterAddonTests(BaseTenantAddonTestCase):
    def test_newsletter_subscribe_permission_and_isolation(self):
        """
        Verify subscription permissions and subscriber isolation per tenant.
        """
        logger.info("Executing test_newsletter_subscribe_permission_and_isolation...")
        
        logger.info("Step 1: Attempt subscription on Tenant A without active addon...")
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'sub@example.com', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        logger.info(f"Response status: {response.status_code}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        logger.info("Step 2: Activate newsletter addon for Tenant A...")
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

        logger.info("Step 3: Attempt subscription on Tenant A with active addon...")
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'sub@example.com', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        logger.info(f"Response status: {response.status_code}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Subscriber.objects.filter(email='sub@example.com', tenant=self.tenant_a).exists())

        logger.info("Step 4: Attempt subscription on Tenant B without active addon...")
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'sub@example.com', 'tenant_id': str(self.tenant_b.id)},
            format='json'
        )
        logger.info(f"Response status: {response.status_code}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        logger.info("Step 5: Activate newsletter addon for Tenant B...")
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

        logger.info("Step 6: Attempt subscription on Tenant B (same email)...")
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'sub@example.com', 'tenant_id': str(self.tenant_b.id)},
            format='json'
        )
        logger.info(f"Response status: {response.status_code}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Subscriber.objects.filter(email='sub@example.com', tenant=self.tenant_b).exists())

        logger.info("Step 7: Attempt duplicate subscription on Tenant A...")
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'sub@example.com', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        logger.info(f"Response status: {response.status_code}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("ya se encuentra suscrito", response.data['message'])

        logger.info("Step 8: Verify welcome emails sent...")
        self.assertEqual(len(mail.outbox), 2)  # Two successful subscriptions
        logger.info("Test passed: Subscriber isolation and duplicate prevention verified successfully.")
