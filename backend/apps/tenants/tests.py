from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.tenants.models import Tenant
from apps.shop.models import Plan, Contract
from apps.tenants.test_base import BaseTenantAddonTestCase, logger, User

class TenantsCoreTests(BaseTenantAddonTestCase):
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
        self.assertTrue(response.data['logo_url'].startswith('http'))
        self.assertIn("tenant_logos/logo", response.data['logo_url'])
        self.assertEqual(response.data['accent_color'], "#112233")
        logger.info("Step 2 passed: File upload updates logo and overrides logo_url with media URL.")
        
        # Clean up files created during test
        import os
        tenant_a_updated = Tenant.objects.get(id=self.tenant_a.id)
        if tenant_a_updated.logo:
            try:
                logo_path = tenant_a_updated.logo.path
                if os.path.exists(logo_path):
                    os.remove(logo_path)
            except (NotImplementedError, AttributeError):
                # Remote storage backends like Cloudinary don't expose local .path
                pass
        logger.info("Test passed: Logo upload and fallback behavior verified successfully.")

    def test_tenant_branding_light_mode_and_particles(self):
        """
        Verify tenant light-mode branding custom colors, pollen count, and blur settings.
        """
        logger.info("Executing test_tenant_branding_light_mode_and_particles...")
        self.client.force_authenticate(user=self.owner_a)

        url = reverse('tenant-detail', kwargs={'pk': str(self.tenant_a.id)})

        # 1. Update fields via API
        response = self.client.patch(
            url,
            data={
                'theme_color_light': '#FF9900',
                'accent_color_light': '#0099FF',
                'bg_color_light': '#F0F0F0',
                'card_bg_color_light': '#FFFFFF',
                'text_color_light': '#222222',
                'border_color_light': '#DDDDDD',
                'pollen_active': False,
                'pollen_icon': '🌸',
                'pollen_color': '#FFC0CB',
                'pollen_count': 12,
                'pollen_blur': 0.5,
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify db updated
        self.tenant_a.refresh_from_db()
        self.assertEqual(self.tenant_a.theme_color_light, '#FF9900')
        self.assertEqual(self.tenant_a.pollen_count, 12)
        self.assertEqual(self.tenant_a.pollen_blur, 0.5)

        # 2. Get via public config API and check fields
        response = self.client.get(
            reverse('tenant_public_config'),
            {'tenant_id': str(self.tenant_a.id)}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['theme_color_light'], "#FF9900")
        self.assertEqual(response.data['accent_color_light'], "#0099FF")
        self.assertEqual(response.data['bg_color_light'], "#F0F0F0")
        self.assertEqual(response.data['card_bg_color_light'], "#FFFFFF")
        self.assertEqual(response.data['text_color_light'], "#222222")
        self.assertEqual(response.data['border_color_light'], "#DDDDDD")
        self.assertEqual(response.data['pollen_active'], False)
        self.assertEqual(response.data['pollen_icon'], "🌸")
        self.assertEqual(response.data['pollen_color'], "#FFC0CB")
        self.assertEqual(response.data['pollen_count'], 12)
        self.assertEqual(response.data['pollen_blur'], 0.5)

        # 3. Try to set negative pollen_count (should fail validation)
        response = self.client.patch(
            url,
            data={'pollen_count': -5},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        logger.info("Test passed: Light-mode branding and particle settings validated successfully.")

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
        self.tenant_a.use_custom_domain = True
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

    def test_get_tenant_email_connection_free_tenant(self):
        """
        Verify that a tenant without a contract defaults to the Brevo SMTP configuration.
        """
        logger.info("Executing test_get_tenant_email_connection_free_tenant...")
        from apps.tenants.utils import get_tenant_email_connection
        from django.conf import settings
        
        # Save original values
        orig_user = getattr(settings, "BREVO_EMAIL_HOST_USER", "")
        orig_pass = getattr(settings, "BREVO_EMAIL_HOST_PASSWORD", "")
        orig_host = getattr(settings, "BREVO_EMAIL_HOST", "")
        
        # Override settings for tests
        settings.BREVO_EMAIL_HOST_USER = "brevo_user"
        settings.BREVO_EMAIL_HOST_PASSWORD = "brevo_password"
        settings.BREVO_EMAIL_HOST = "smtp-relay.brevo.com"
        
        try:
            connection, from_email = get_tenant_email_connection(self.tenant_a)
            self.assertIsNotNone(connection)
            self.assertEqual(from_email, settings.BREVO_DEFAULT_FROM_EMAIL)
            self.assertEqual(connection.host, "smtp-relay.brevo.com")
            self.assertEqual(connection.username, "brevo_user")
            self.assertEqual(connection.password, "brevo_password")
        finally:
            settings.BREVO_EMAIL_HOST_USER = orig_user
            settings.BREVO_EMAIL_HOST_PASSWORD = orig_pass
            settings.BREVO_EMAIL_HOST = orig_host
            
        logger.info("Test passed: Free tenant defaults correctly to Brevo.")

    def test_get_tenant_email_connection_paid_tenant(self):
        """
        Verify that a tenant with an active plan contract routes through Amazon SES.
        """
        logger.info("Executing test_get_tenant_email_connection_paid_tenant...")
        from apps.tenants.utils import get_tenant_email_connection
        from django.conf import settings
        
        # Save original values
        orig_user = getattr(settings, "SES_EMAIL_HOST_USER", "")
        orig_pass = getattr(settings, "SES_EMAIL_HOST_PASSWORD", "")
        orig_host = getattr(settings, "SES_EMAIL_HOST", "")
        
        # Override settings for tests
        settings.SES_EMAIL_HOST_USER = "ses_user"
        settings.SES_EMAIL_HOST_PASSWORD = "ses_password"
        settings.SES_EMAIL_HOST = "email-smtp.us-east-1.amazonaws.com"
        
        # Create a signed, active contract with a plan for tenant A
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
        
        try:
            connection, from_email = get_tenant_email_connection(self.tenant_a)
            self.assertIsNotNone(connection)
            self.assertEqual(from_email, settings.SES_DEFAULT_FROM_EMAIL)
            self.assertEqual(connection.host, "email-smtp.us-east-1.amazonaws.com")
            self.assertEqual(connection.username, "ses_user")
            self.assertEqual(connection.password, "ses_password")
        finally:
            settings.SES_EMAIL_HOST_USER = orig_user
            settings.SES_EMAIL_HOST_PASSWORD = orig_pass
            settings.SES_EMAIL_HOST = orig_host
            
        logger.info("Test passed: Paid tenant routes correctly through Amazon SES.")

    def test_get_tenant_email_connection_fallback_when_credentials_missing(self):
        """
        Verify fallback to default system connection when credentials are not configured.
        """
        logger.info("Executing test_get_tenant_email_connection_fallback_when_credentials_missing...")
        from apps.tenants.utils import get_tenant_email_connection
        from django.conf import settings
        
        # Save original values
        orig_user = getattr(settings, "BREVO_EMAIL_HOST_USER", "")
        orig_pass = getattr(settings, "BREVO_EMAIL_HOST_PASSWORD", "")
        
        # Clear settings
        settings.BREVO_EMAIL_HOST_USER = ""
        settings.BREVO_EMAIL_HOST_PASSWORD = ""
        
        try:
            connection, from_email = get_tenant_email_connection(self.tenant_a)
            self.assertIsNone(connection)
            self.assertEqual(from_email, settings.DEFAULT_FROM_EMAIL)
        finally:
            settings.BREVO_EMAIL_HOST_USER = orig_user
            settings.BREVO_EMAIL_HOST_PASSWORD = orig_pass
            
        logger.info("Test passed: Missing credentials correctly fallback to default connection.")

    def test_non_owner_cannot_patch_tenant(self):
        """
        Verify that a user who is not the owner of the tenant (and not staff/admin)
        cannot customize or patch the tenant configuration (returns 404).
        """
        logger.info("Executing test_non_owner_cannot_patch_tenant...")
        # Authenticate as owner B (who doesn't own tenant A)
        self.client.force_authenticate(user=self.owner_b)
        
        url = reverse('tenant-detail', kwargs={'pk': str(self.tenant_a.id)})
        response = self.client.patch(
            url,
            data={'name': 'Hacked Tenant A Name'},
            format='json'
        )
        # It should return 404 because get_queryset() filters by owner=user
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        logger.info("Test passed: Non-owner was blocked from editing tenant (returned 404).")


class TenantActivationTests(APITestCase):
    def setUp(self):
        logger.info("Initializing TenantActivationTests workspace...")
        # Create a Client Owner
        self.owner = User.objects.create_user(
            username="owner_act_test",
            email="owner_act_test@example.com",
            password="password123",
            role=User.Role.BUSINESS
        )
        self.plan = Plan.objects.create(
            name="Developer Plan",
            price=5000.00,
            hours=30
        )
        # Create a Staff User to sign contracts
        self.staff_user = User.objects.create_user(
            username="staff_user_act",
            email="staff_act@example.com",
            password="password123",
            is_staff=True,
            role=User.Role.ADMIN
        )

    def test_tenant_creation_on_contract_sign_is_reserved_until_payment(self):
        logger.info("Executing test_tenant_creation_on_contract_sign_is_reserved_until_payment...")
        # 1. Create a contract
        contract = Contract.objects.create(
            user=self.owner,
            plan=self.plan,
            full_name="Owner Contract Test",
            tax_id="TAX123",
            address="Test Address",
            project_idea="Test Idea"
        )
        
        # Authenticate as staff
        self.client.force_authenticate(user=self.staff_user)
        
        # Call the API to sign the contract (dev_sign)
        response = self.client.post(
            reverse('contract-dev-sign', kwargs={'pk': contract.id}),
            data={'signature': 'dev_signature'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify tenant is created but is_active = False (Reserved state)
        tenant = Tenant.objects.get(owner=self.owner)
        self.assertFalse(tenant.is_active)
        logger.info("Verified: Tenant created in Reserved state (is_active=False).")

        # 1.5 Verify that a customer of this inactive/reserved tenant is gated/denied access
        customer = User.objects.create_user(
            username="customer_act_test",
            email="customer_act@example.com",
            password="password123",
            role=User.Role.CUSTOMER,
            tenant=tenant
        )
        self.client.force_authenticate(user=customer)
        gated_response = self.client.get(reverse('support-chat-list'))
        self.assertEqual(gated_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("se encuentra en estado 'Reservado'", gated_response.data['detail'])
        logger.info("Verified: Gated access is denied with custom message when tenant is Reserved.")
        
        # Restore staff authentication for step 2
        self.client.force_authenticate(user=self.staff_user)

        # Verify installment was generated
        installment = contract.installments.first()
        self.assertIsNotNone(installment)
        self.assertEqual(installment.status, 'PENDING')

        # 2. Mark installment as PAID and verify tenant activates
        installment.status = 'PAID'
        installment.save()

        tenant.refresh_from_db()
        self.assertTrue(tenant.is_active)
        logger.info("Verified: Tenant automatically transitions to Active (is_active=True) after installment payment.")
