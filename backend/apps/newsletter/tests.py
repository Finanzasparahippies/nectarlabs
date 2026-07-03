from django.urls import reverse
from django.core import mail
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.test_base import BaseTenantAddonTestCase, logger
from apps.shop.models import Contract
from apps.newsletter.models import Subscriber

class NewsletterAddonTests(BaseTenantAddonTestCase):
    def setUp(self):
        super().setUp()
        from django.utils import timezone
        future = timezone.now() + timezone.timedelta(days=14)
        self.tenant_a.trial_ends_at = future
        self.tenant_a.shipping_wallet_balance = 100.00
        self.tenant_a.save()
        self.tenant_b.trial_ends_at = future
        self.tenant_b.shipping_wallet_balance = 100.00
        self.tenant_b.save()
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
        Verify that trial/free accounts can send up to 300 emails per day for free
        without wallet deduction, whereas non-trial paid accounts without custom SMTP
        require enough balance in shipping_wallet_balance and are charged $0.01 MXN per email.
        """
        logger.info("Executing test_newsletter_limits_for_trial_and_paid_plans with trial and prepaid logic...")
        
        # Ensure custom_smtp_host is empty
        self.tenant_a.custom_smtp_host = ""
        
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
            is_active=True
        )
        contract_a.addons.add(self.newsletter_addon)
        
        # Scenario A: Tenant is in trial
        from django.utils import timezone
        self.tenant_a.trial_ends_at = timezone.now() + timezone.timedelta(days=14)
        self.tenant_a.shipping_wallet_balance = 0.00
        self.tenant_a.save()
        
        from apps.newsletter.models import send_newsletter_email
        recipients = ["rec1@example.com", "rec2@example.com"]
        
        mail.outbox = []
        logger.info("Verifying that trial tenants can send emails for free...")
        send_newsletter_email("Test Subject", "welcome", {}, recipients, tenant=self.tenant_a)
        self.assertEqual(len(mail.outbox), 1)
        self.tenant_a.refresh_from_db()
        self.assertEqual(self.tenant_a.shipping_wallet_balance, 0.00) # No deduction
        self.assertEqual(self.tenant_a.newsletter_sent_today, 2)
        
        # Scenario B: Tenant is NOT in trial
        self.tenant_a.trial_ends_at = timezone.now() - timezone.timedelta(days=1)
        self.tenant_a.shipping_wallet_balance = 0.00
        self.tenant_a.save()
        
        logger.info("Verifying that non-trial tenants with 0 balance raise ValueError...")
        with self.assertRaises(ValueError) as ctx:
            send_newsletter_email("Test Subject", "welcome", {}, recipients, tenant=self.tenant_a)
        self.assertIn("Saldo insuficiente", str(ctx.exception))
        
        # Set sufficient balance and test sending
        self.tenant_a.shipping_wallet_balance = 100.00
        self.tenant_a.save()
        
        mail.outbox = []
        logger.info("Sending email campaign with sufficient balance as non-trial...")
        send_newsletter_email("Test Subject", "welcome", {}, recipients, tenant=self.tenant_a)
        self.assertEqual(len(mail.outbox), 1)
        
        # Verify that balance was deducted by $0.02 (2 recipients * $0.01)
        self.tenant_a.refresh_from_db()
        self.assertEqual(self.tenant_a.shipping_wallet_balance, 99.98) # 100.00 - 0.02
        self.assertEqual(self.tenant_a.newsletter_sent_this_month, 4)

    def test_system_admin_send_campaign(self):
        """
        Verify that a system admin (staff) can send a campaign to main platform subscribers (tenant = None).
        """
        logger.info("Executing test_system_admin_send_campaign...")
        
        # Create a system admin user
        admin_user = get_user_model().objects.create_user(
            username="sysadmin",
            email="admin@nectarlabs.dev",
            password="password123",
            role=get_user_model().Role.ADMIN,
            is_staff=True
        )
        
        # Create subscribers for the main platform (tenant = None)
        Subscriber.objects.create(email="platform_sub1@example.com", tenant=None, is_active=True)
        Subscriber.objects.create(email="platform_sub2@example.com", tenant=None, is_active=True)
        
        self.client.force_authenticate(user=admin_user)
        
        url = reverse('newsletter_send_campaign')
        payload = {
            "subject": "Platform Update",
            "title": "Welcome to the New Nectar Labs Platform!",
            "content": "<p>We have launched new modular updates.</p>"
        }
        
        mail.outbox = []
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['sent_count'], 2)
        self.assertEqual(len(mail.outbox), 2)

    def test_marketing_list_isolation(self):
        """
        Verify that a BUSINESS tenant can manage their marketing lists and cannot access lists of other tenants.
        """
        logger.info("Executing test_marketing_list_isolation...")
        from apps.newsletter.models import MarketingList

        # Activate newsletter addon for Tenant A and Tenant B
        contract_a = Contract.objects.create(
            user=self.owner_a, plan=None, full_name="Owner A", is_fully_signed=True, is_active=True
        )
        contract_a.addons.add(self.newsletter_addon)

        contract_b = Contract.objects.create(
            user=self.owner_b, plan=None, full_name="Owner B", is_fully_signed=True, is_active=True
        )
        contract_b.addons.add(self.newsletter_addon)

        # 1. Authenticate as Owner A
        self.client.force_authenticate(user=self.owner_a)

        # 2. Create a marketing list for Tenant A
        url = reverse('marketinglist-list')
        payload = {
            "name": "Lista Cliente A",
            "description": "Lista de prueba para cliente A"
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        list_a = MarketingList.objects.get(name="Lista Cliente A")
        self.assertEqual(list_a.tenant, self.tenant_a)

        # 3. Authenticate as Owner B and verify they cannot see Tenant A's lists
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should not contain Tenant A's list
        list_ids = [item['id'] for item in response.data]
        self.assertNotIn(list_a.id, list_ids)

    def test_email_campaign_creation_and_send(self):
        """
        Verify that a BUSINESS tenant can create a campaign and send it.
        """
        logger.info("Executing test_email_campaign_creation_and_send...")
        from apps.newsletter.models import MarketingList, EmailCampaign

        # Activate newsletter addon for Tenant A
        contract_a = Contract.objects.create(
            user=self.owner_a, plan=None, full_name="Owner A", is_fully_signed=True, is_active=True
        )
        contract_a.addons.add(self.newsletter_addon)

        # Create subscribers and a marketing list for Tenant A
        sub1 = Subscriber.objects.create(email="sub1@tenant-a.com", tenant=self.tenant_a, is_active=True)
        sub2 = Subscriber.objects.create(email="sub2@tenant-a.com", tenant=self.tenant_a, is_active=True)
        
        m_list = MarketingList.objects.create(name="Lista Campaña", tenant=self.tenant_a)
        m_list.subscribers.add(sub1, sub2)

        # Authenticate as Owner A
        self.client.force_authenticate(user=self.owner_a)

        # Create Email Campaign
        url = reverse('emailcampaign-list')
        payload = {
            "marketing_list": m_list.id,
            "subject": "Nueva Colección",
            "content": "Descubre las novedades de nuestra tienda.",
            "template_type": "moss",
            "cta_text": "Ver Catálogo",
            "cta_link": "https://example.com/shop",
            "ctas": [],
            "custom_styles": {
                "title_color": "#ffffff",
                "body_color": "#e0e0e0"
            }
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        campaign = EmailCampaign.objects.get(subject="Nueva Colección")
        self.assertEqual(campaign.tenant, self.tenant_a)
        self.assertEqual(campaign.template_type, "moss")
        self.assertFalse(campaign.is_sent)

        # Send Campaign
        mail.outbox = []
        send_url = reverse('emailcampaign-send-campaign', kwargs={'pk': campaign.id})
        response = self.client.post(send_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("segundo plano", response.data['message'])

        # Wait briefly for thread to finish (in testing sync execution is normal or we can mock/assert DB fields directly)
        # Reload campaign
        campaign.refresh_from_db()
        self.assertTrue(campaign.is_sent)
        self.assertIsNotNone(campaign.sent_at)

    def test_import_csv_contacts_and_list_association(self):
        """
        Verify CSV contacts import and their association to a marketing list.
        """
        logger.info("Executing test_import_csv_contacts_and_list_association...")
        from apps.newsletter.models import MarketingList
        import io

        # Activate newsletter addon for Tenant A
        contract_a = Contract.objects.create(
            user=self.owner_a, plan=None, full_name="Owner A", is_fully_signed=True, is_active=True
        )
        contract_a.addons.add(self.newsletter_addon)

        # 1. Create a marketing list for Tenant A
        m_list = MarketingList.objects.create(name="Lista CSV", tenant=self.tenant_a)

        # 2. Authenticate as Owner A
        self.client.force_authenticate(user=self.owner_a)

        # 3. Create dummy CSV file content
        csv_content = (
            "email,name,status,premium\n"
            "csv1@tenant-a.com,Contacto Uno,active,yes\n"
            "csv2@tenant-a.com,Contacto Dos,inactive,no\n"
            "csv3@tenant-a.com,,active,yes\n"
        )
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'contacts.csv'

        # 4. Import via API
        url = reverse('subscriber-import-csv')
        response = self.client.post(
            url,
            {'file': csv_file, 'marketing_list_id': m_list.id},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("3 suscriptores", response.data['message'])

        # 5. Verify database records
        c1 = Subscriber.objects.get(email="csv1@tenant-a.com", tenant=self.tenant_a)
        self.assertEqual(c1.name, "Contacto Uno")
        self.assertTrue(c1.is_active)
        self.assertTrue(c1.is_premium)
        self.assertTrue(m_list.subscribers.filter(id=c1.id).exists())

        c2 = Subscriber.objects.get(email="csv2@tenant-a.com", tenant=self.tenant_a)
        self.assertEqual(c2.name, "Contacto Dos")
        self.assertFalse(c2.is_active)
        self.assertFalse(c2.is_premium)
        self.assertTrue(m_list.subscribers.filter(id=c2.id).exists())


