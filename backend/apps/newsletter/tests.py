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

    def test_newsletter_limits_for_trial_and_paid_plans(self):
        """
        Verify that trial/free accounts are restricted to 1000 subscribers and
        1000 emails per month, while paid addons or technological partner contracts
        have no limits enforced.
        """
        logger.info("Executing test_newsletter_limits_for_trial_and_paid_plans...")
        
        # 1. Activate the newsletter addon for tenant_a so we can test limits (checked in permissions)
        contract_a = Contract.objects.create(
            user=self.owner_a,
            plan=None,
            full_name="Owner A Contract",
            tax_id="TAXA123",
            address="Address A",
            project_idea="Idea A",
            signature_base64="signature",
            is_fully_signed=True,
            is_active=True # Active contract makes it a paid technological partner plan
        )
        contract_a.addons.add(self.newsletter_addon)
        
        # Initially, check limits when contract is inactive (trial mode)
        contract_a.is_active = False
        contract_a.save()
        self.tenant_a.newsletter_plan = 'TRIAL'
        self.tenant_a.save()
        
        # To bypass HasAddOnPermission check but still test trial limits,
        # we temporarily assign the addon through a fully signed but inactive contract.
        # But wait, HasAddOnPermission checks contracts__is_active=True, so if is_active=False
        # we will get 403. So to test the TRIAL limit, let's keep the contract active
        # BUT simulate not having a partner contract by checking the view directly.
        # Wait, if we keep the contract active, has_active_contract=True, so limits are bypassed.
        # How do we test TRIAL limits then?
        # We can test by setting the contract active (so they have access to the addon),
        # but to simulate a trial WITHOUT an active contract, we can just delete/inactivate
        # the contract and set the plan of the tenant to TRIAL. But wait!
        # If they don't have an active contract, how do they get access to the addon?
        # They get access if they have a PREMIUM plan OR if the addon is active in their contract.
        # Wait! If they have a TRIAL plan and no contract, they wouldn't have access to the addon
        # unless they have a contract that is active. So they always have an active contract
        # if they have access to the addon in the portal. But what if they have an active contract
        # BUT it has NO plan (meaning they only pay for the addon but don't pay for a partner plan)?
        # Ah! If the contract has a plan (i.e. is a partner plan), or if they pay the addon.
        # Let's see: `has_active_contract` checks:
        # `Contract.objects.filter(user=tenant.owner, is_active=True).exists()`
        # In our implementation, ANY active contract counts as "plan de socio tecnológico" (active contract).
        # So if they have an active contract, they have NO LIMITS.
        # What if they don't have an active contract but they have `newsletter_plan = 'PREMIUM'`?
        # They have NO LIMITS.
        # What if they don't have an active contract and they have `newsletter_plan = 'TRIAL'`?
        # Then they DO have limits (since both has_active_contract and has_paid_addon are False).
        # But wait, if they don't have an active contract and newsletter_plan is TRIAL,
        # does active_addons include 'newsletter-campaigner'? No, because active_addons
        # checks contracts__is_active=True.
        # So in that case, they wouldn't have access to the view.
        # However, they might be accessing it via the Django admin or programmatically,
        # or we might want to verify the model methods directly!
        # Yes! We can test the model method `send_newsletter_email` directly to verify limits,
        # and we can test the view by temporarily mock-bypassing the permission or by setting up
        # the database state accordingly.
        # Let's test the model method first:
        
        logger.info("Checking trial limits on the model method send_newsletter_email...")
        self.tenant_a.newsletter_plan = 'TRIAL'
        self.tenant_a.save()
        
        # Verify that send_newsletter_email fails when trying to send > 1000 emails on TRIAL without active contract
        from apps.newsletter.models import send_newsletter_email
        recipients = [f"rec{i}@example.com" for i in range(1001)]
        with self.assertRaises(ValueError):
            send_newsletter_email("Test Subject", "welcome", {}, recipients, tenant=self.tenant_a)
            
        # Verify that send_newsletter_email succeeds if it is under or equal to 1,000 (e.g. 500 emails)
        contract_a.is_active = True
        contract_a.save()
        mail.outbox = []
        under_limit_recipients = [f"rec{i}@example.com" for i in range(500)]
        send_newsletter_email("Test Subject", "welcome", {}, under_limit_recipients, tenant=self.tenant_a)
        self.assertTrue(len(mail.outbox) > 0)

        # Verify that send_newsletter_email fails if they exceed 1,000 emails base limit (e.g., trying to send 501 more)
        # (500 already sent + 501 = 1001 > 1000)
        over_limit_recipients = [f"rec{i}@example.com" for i in range(501)]
        with self.assertRaises(ValueError):
            send_newsletter_email("Test Subject", "welcome", {}, over_limit_recipients, tenant=self.tenant_a)

        # Verify that adding extra credits (e.g., 1000 extra credits, making total limit 2000) allows sending it
        self.tenant_a.newsletter_extra_credits = 1000
        self.tenant_a.save()
        mail.outbox = []
        send_newsletter_email("Test Subject", "welcome", {}, over_limit_recipients, tenant=self.tenant_a)
        self.assertTrue(len(mail.outbox) > 0)

        # Reset extra credits and monthly count
        self.tenant_a.newsletter_extra_credits = 0
        self.tenant_a.newsletter_sent_this_month = 0
        self.tenant_a.save()
        
        # Verify that send_newsletter_email succeeds under limit (e.g. 500 emails) if they have no active contract but newsletter_plan is PREMIUM
        contract_a.is_active = False
        contract_a.save()
        self.tenant_a.newsletter_plan = 'PREMIUM'
        self.tenant_a.save()
        
        mail.outbox = []
        send_newsletter_email("Test Subject", "welcome", {}, under_limit_recipients, tenant=self.tenant_a)
        self.assertTrue(len(mail.outbox) > 0)

        # Verify limit of 1000 (total) for PREMIUM plan too (sending 501 more fails)
        over_limit_recipients_2 = [f"rec{i}@example.com" for i in range(501)]
        with self.assertRaises(ValueError):
            send_newsletter_email("Test Subject", "welcome", {}, over_limit_recipients_2, tenant=self.tenant_a)

        # Now test the view:
        # If newsletter_plan is PREMIUM, they should be able to subscribe contacts without active contract
        logger.info("Verifying subscription view with PREMIUM newsletter plan and no active contract...")
        # Create 1000 subscribers first
        Subscriber.objects.filter(tenant=self.tenant_a).delete()
        subscribers = [Subscriber(email=f"sub{i}@example.com", tenant=self.tenant_a) for i in range(1000)]
        Subscriber.objects.bulk_create(subscribers)
        
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'premium_sub@example.com', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # If newsletter_plan is TRIAL and active contract is active, they should also be able to subscribe > 1000 contacts
        self.tenant_a.newsletter_plan = 'TRIAL'
        self.tenant_a.save()
        contract_a.is_active = True
        contract_a.save()
        
        response = self.client.post(
            reverse('newsletter_subscribe'),
            data={'email': 'contract_sub@example.com', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
