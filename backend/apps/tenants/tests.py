from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase
from apps.tenants.models import Tenant
from apps.shop.models import Plan, Contract, AddOn
from apps.newsletter.models import Subscriber
import logging

logger = logging.getLogger("tests")
User = get_user_model()

class TenantsAddonIsolationTests(APITestCase):
    def setUp(self):
        logger.info("Initializing test workspace...")
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
        logger.info("Test workspace initialized successfully.")

    def test_live_chat_requires_addon_permission_denied(self):
        """
        Verify that a client cannot access support-chats endpoint if the tenant
        does not have the 'live-chat' addon active.
        """
        logger.info("Executing test_live_chat_requires_addon_permission_denied...")
        self.client.force_authenticate(user=self.customer_a)
        
        logger.info("Requesting live-chat endpoint for Tenant A (without active addon)...")
        response = self.client.get(reverse('support-chat-list'))
        
        logger.info(f"Response status: {response.status_code}")
        # Should return 403 Forbidden since no contract is active for tenant_a
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("no está habilitado para tu portal", response.data['detail'])
        logger.info("Test passed: Access correctly denied with 403 Forbidden.")

    def test_live_chat_allowed_via_plan_contract(self):
        """
        Verify that a client CAN access support-chats endpoint if the owner
        has a signed active contract with a plan (which activates all addons).
        """
        logger.info("Executing test_live_chat_allowed_via_plan_contract...")
        logger.info("Creating a signed 6-month contract with Plan for Tenant A...")
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
        logger.info("Requesting live-chat endpoint for Tenant A (with active plan contract)...")
        response = self.client.get(reverse('support-chat-list'))
        
        logger.info(f"Response status: {response.status_code}")
        # Should succeed (return 200 OK) because owner_a has a signed contract with a plan
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        logger.info("Test passed: Access granted with 200 OK.")

    def test_live_chat_allowed_via_manual_addon_contract(self):
        """
        Verify that a client CAN access support-chats endpoint if the owner
        has a signed active contract specifically purchasing the 'live-chat' addon.
        """
        logger.info("Executing test_live_chat_allowed_via_manual_addon_contract...")
        logger.info("Creating contract and manually assigning 'live-chat' addon...")
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
        logger.info("Requesting live-chat endpoint for Tenant A (with manual addon)...")
        response = self.client.get(reverse('support-chat-list'))
        
        logger.info(f"Response status: {response.status_code}")
        # Should succeed because live-chat addon was manually associated to the active contract
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        logger.info("Test passed: Access granted with 200 OK.")

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

    def test_tenant_branding_customization(self):
        """
        Verify tenant branding custom colors, title, and footer properties.
        """
        logger.info("Executing test_tenant_branding_customization...")
        # Update tenant A with advanced customization
        self.tenant_a.accent_color = "#FF00FF"
        self.tenant_a.bg_color = "#111111"
        self.tenant_a.card_bg_color = "#222222"
        self.tenant_a.text_color = "#333333"
        self.tenant_a.border_color = "#444444"
        self.tenant_a.portal_title = "My Portal Custom Title"
        self.tenant_a.footer_text = "Footer Note 123"
        self.tenant_a.save()

        response = self.client.get(
            reverse('tenant_public_config'),
            {'tenant_id': str(self.tenant_a.id)}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['accent_color'], "#FF00FF")
        self.assertEqual(response.data['bg_color'], "#111111")
        self.assertEqual(response.data['card_bg_color'], "#222222")
        self.assertEqual(response.data['text_color'], "#333333")
        self.assertEqual(response.data['border_color'], "#444444")
        self.assertEqual(response.data['portal_title'], "My Portal Custom Title")
        self.assertEqual(response.data['footer_text'], "Footer Note 123")
        logger.info("Test passed: Branding customization retrieved correctly via public config API.")

    def test_tenant_domain_validation(self):
        """
        Verify custom domain validation endpoint responses.
        """
        logger.info("Executing test_tenant_domain_validation...")
        self.client.force_authenticate(user=self.owner_a)

        # 1. No custom domain set
        self.tenant_a.custom_domain = None
        self.tenant_a.save()
        url = reverse('tenant-validate-domain', kwargs={'pk': str(self.tenant_a.id)})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No se ha configurado", response.data['message'])

        # 2. Custom domain set (invalid/unresolvable example)
        self.tenant_a.custom_domain = "unresolvable-domain-xyz-12345.com"
        self.tenant_a.save()
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_valid'])
        self.assertIn("No se pudo resolver el dominio", response.data['message'])
        logger.info("Test passed: Domain validation checks returned appropriate status values.")

    def test_tenant_branding_logo_upload_and_fallback(self):
        """
        Verify tenant logo upload via API and dynamic logo_url resolution/fallback.
        """
        logger.info("Executing test_tenant_branding_logo_upload_and_fallback...")
        self.client.force_authenticate(user=self.owner_a)
        
        # 1. Check fallback: logo_url provided as string, no file uploaded
        self.tenant_a.logo = None
        self.tenant_a.logo_url = "https://external.url/logo.png"
        self.tenant_a.save()
        
        response = self.client.get(
            reverse('tenant_public_config'),
            {'tenant_id': str(self.tenant_a.id)}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['logo_url'], "https://external.url/logo.png")
        logger.info("Step 1 passed: Falls back to logo_url string when no file is uploaded.")
        
        # 2. Upload file via PATCH request
        from django.core.files.uploadedfile import SimpleUploadedFile
        # Use a dummy GIF/image file
        small_gif = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04'
            b'\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02'
            b'\x02\x4c\x01\x00\x3b'
        )
        logo_file = SimpleUploadedFile("logo.gif", small_gif, content_type="image/gif")
        
        # Call PATCH /api/tenants/<id>/
        url = reverse('tenant-detail', kwargs={'pk': str(self.tenant_a.id)})
        response = self.client.patch(
            url,
            data={
                'logo': logo_file,
                'theme_color': '#C68A1E',
                'accent_color': '#112233',
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that logo_url is resolved to the uploaded file path/URL
        self.assertIsNotNone(response.data['logo_url'])
        self.assertIn("logo.gif", response.data['logo_url'])
        self.assertEqual(response.data['accent_color'], "#112233")
        logger.info("Step 2 passed: File upload updates logo and overrides logo_url with media URL.")
        
        # Clean up files created during test
        import os
        tenant_a_updated = Tenant.objects.get(id=self.tenant_a.id)
        if tenant_a_updated.logo:
            logo_path = tenant_a_updated.logo.path
            if os.path.exists(logo_path):
                os.remove(logo_path)
        logger.info("Test passed: Logo upload and fallback behavior verified successfully.")

    def test_tenant_public_config_lookup_methods(self):
        """
        Verify that public config endpoint resolves the tenant using different parameters:
        subdomain, api_key, tenant_id, and host (custom domain and subdomains).
        """
        logger.info("Executing test_tenant_public_config_lookup_methods...")
        
        # 1. Resolve by subdomain (case insensitive check)
        response = self.client.get(reverse('tenant_public_config'), {'subdomain': 'TenantA'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.tenant_a.id))
        logger.info("Subdomain lookup verified.")

        # 2. Resolve by api_key
        response = self.client.get(reverse('tenant_public_config'), {'api_key': str(self.tenant_a.api_key)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.tenant_a.id))
        logger.info("API Key lookup verified.")

        # 3. Resolve by host: custom domain
        self.tenant_a.custom_domain = "soporte.mi-cliente.com"
        self.tenant_a.save()
        response = self.client.get(reverse('tenant_public_config'), {'host': "soporte.mi-cliente.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.tenant_a.id))
        logger.info("Host custom domain lookup verified.")

        # 4. Resolve by host: subdomain parse
        response = self.client.get(reverse('tenant_public_config'), {'host': "tenanta.nectarlabs.dev"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.tenant_a.id))
        logger.info("Host subdomain parsing lookup verified.")

        # 5. Resolve by host: system subdomain (www, api, admin, staging) should fail or return 404
        response = self.client.get(reverse('tenant_public_config'), {'host': "www.nectarlabs.dev"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        response = self.client.get(reverse('tenant_public_config'), {'host': "api.nectarlabs.dev"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        logger.info("Host system subdomain exclusion verified.")

    def test_tenant_guest_auth_flow(self):
        """
        Verify guest authentication logic, user creation, role restriction,
        and require_customer_info rules.
        """
        logger.info("Executing test_tenant_guest_auth_flow...")

        # 1. require_customer_info is True: Name is required for new signup
        self.tenant_a.require_customer_info = True
        self.tenant_a.save()

        # Call with only email -> expect 400 Bad Request
        response = self.client.post(
            reverse('tenant_guest_auth'),
            data={'tenant_id': str(self.tenant_a.id), 'email': 'new_guest@example.com'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name is required", response.data['error'])
        logger.info("Guest auth name requirement for new signup verified.")

        # Call with email and name -> expect 200 Success
        response = self.client.post(
            reverse('tenant_guest_auth'),
            data={'tenant_id': str(self.tenant_a.id), 'email': 'new_guest@example.com', 'name': 'John Doe'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['email'], 'new_guest@example.com')
        
        # Verify user is created with CUSTOMER role and linked to tenant_a
        created_user = User.objects.get(email='new_guest@example.com')
        self.assertEqual(created_user.role, User.Role.CUSTOMER)
        self.assertEqual(created_user.tenant, self.tenant_a)
        self.assertEqual(created_user.first_name, 'John')
        self.assertEqual(created_user.last_name, 'Doe')
        logger.info("New guest creation with correct tenant and role verified.")

        # Call again with only email for existing guest user -> expect success
        response = self.client.post(
            reverse('tenant_guest_auth'),
            data={'tenant_id': str(self.tenant_a.id), 'email': 'new_guest@example.com'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        logger.info("Existing guest login without name verified.")

        # 2. require_customer_info is False: succeeds without name
        self.tenant_a.require_customer_info = False
        self.tenant_a.save()
        response = self.client.post(
            reverse('tenant_guest_auth'),
            data={'tenant_id': str(self.tenant_a.id), 'email': 'another_guest@example.com'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        logger.info("Guest login without name when require_customer_info=False verified.")

        # 3. Unauthorized access: guest_auth for a customer of another tenant should fail
        response = self.client.post(
            reverse('tenant_guest_auth'),
            data={'tenant_id': str(self.tenant_a.id), 'email': self.customer_b.email},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Unauthorized access", response.data['error'])
        logger.info("Cross-tenant customer access restriction verified.")


