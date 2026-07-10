from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.tenants.models import Tenant
from apps.shop.models import Plan, Contract, Order
from apps.tenants.test_base import BaseTenantAddonTestCase, logger, User

from apps.newsletter.models import Subscriber
from apps.tickets.models import SupportChat, SupportChatMessage
from apps.bookings.models import BookingInquiry
from apps.sponsorship.models import SponsorshipTier, SponsorTarget, SponsorshipUpdate
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

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

        # 3. Dynamic custom domain passed in POST body
        response = self.client.post(url, {'custom_domain': 'another-unresolvable-xyz.org'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_valid'])
        self.assertIn("No se pudo resolver el dominio", response.data['message'])

        # 4. Custom domain containing "nectarlabs"
        response = self.client.post(url, {'custom_domain': 'portal.nectarlabs.dev'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("no puede pertenecer a los subdominios de Nectar Labs", response.data['message'])

        # 5. Custom domain with invalid format (spaces/no dot)
        response = self.client.post(url, {'custom_domain': 'invalid domain'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Por favor ingresa un dominio válido", response.data['message'])

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
            self.assertIn("Tenant A", from_email)
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

    def test_start_trial_flow_success(self):
        """
        Verify that a tenant owner can successfully activate the 14-day free trial,
        updating the trial_ends_at field and activating all add-ons.
        """
        logger.info("Executing test_start_trial_flow_success...")
        from django.utils import timezone
        from datetime import timedelta
        
        self.client.force_authenticate(user=self.owner_a)
        
        # Ensure trial is not started
        self.tenant_a.trial_ends_at = None
        self.tenant_a.save()
        
        url = reverse('tenant-start-trial', kwargs={'pk': str(self.tenant_a.id)})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('trial_ends_at', response.data)
        
        # Refresh and verify db
        self.tenant_a.refresh_from_db()
        self.assertIsNotNone(self.tenant_a.trial_ends_at)
        
        expected_ends_at = timezone.now() + timedelta(days=14)
        # Check that trial_ends_at is set to roughly 14 days in future (allowing 5s window)
        time_diff = abs((self.tenant_a.trial_ends_at - expected_ends_at).total_seconds())
        self.assertTrue(time_diff < 5.0)
        
        # Verify that all active add-ons are now available in trial
        active_addons = self.tenant_a.active_addons
        from apps.shop.models import AddOn
        all_active_addons_slugs = list(AddOn.objects.filter(is_active=True).values_list('slug', flat=True).distinct())
        for slug in all_active_addons_slugs:
            self.assertIn(slug, active_addons)
            
        logger.info("Test passed: Trial activation flow success verified.")

    def test_start_trial_already_started(self):
        """
        Verify that requesting to start a trial on a tenant that already had one is rejected.
        """
        logger.info("Executing test_start_trial_already_started...")
        from django.utils import timezone
        from datetime import timedelta
        
        self.client.force_authenticate(user=self.owner_a)
        
        # Simulating trial already started
        self.tenant_a.trial_ends_at = timezone.now() + timedelta(days=10)
        self.tenant_a.save()
        
        url = reverse('tenant-start-trial', kwargs={'pk': str(self.tenant_a.id)})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("La prueba gratuita ya fue solicitada", response.data['error'])
        logger.info("Test passed: Duplicate trial activation request correctly rejected.")

    def test_start_trial_non_owner_forbidden(self):
        """
        Verify that a non-owner user cannot start a trial for another user's tenant (returns 404).
        """
        logger.info("Executing test_start_trial_non_owner_forbidden...")
        self.client.force_authenticate(user=self.owner_b)
        
        # Attempt to activate trial for tenant_a owned by owner_a
        url = reverse('tenant-start-trial', kwargs={'pk': str(self.tenant_a.id)})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        logger.info("Test passed: Non-owner is forbidden from activating trial (returned 404).")

    def test_tenant_serializer_includes_server_time(self):
        """
        Verify that the Tenant configuration response contains the server's timezone.now()
        time under 'server_time' in ISO format, preventing client side time bypasses.
        """
        logger.info("Executing test_tenant_serializer_includes_server_time...")
        self.client.force_authenticate(user=self.owner_a)
        
        # Test private config detail endpoint
        url = reverse('tenant-detail', kwargs={'pk': str(self.tenant_a.id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('server_time', response.data)
        
        from django.utils.dateparse import parse_datetime
        server_dt = parse_datetime(response.data['server_time'])
        self.assertIsNotNone(server_dt)
        
        # Test public config lookup endpoint
        url_public = reverse('tenant_public_config')
        response_public = self.client.get(f"{url_public}?tenant_id={self.tenant_a.id}")
        self.assertEqual(response_public.status_code, status.HTTP_200_OK)
        self.assertIn('server_time', response_public.data)
        
        server_dt_pub = parse_datetime(response_public.data['server_time'])
        self.assertIsNotNone(server_dt_pub)
        logger.info("Test passed: Tenant serializers successfully include valid server_time.")

    def test_tenant_custom_styles_and_urls_admin_access(self):
        """
        Verify that an administrator user (staff or role=ADMIN) can configure custom CSS, JS,
        and custom backend/frontend URLs.
        """
        logger.info("Executing test_tenant_custom_styles_and_urls_admin_access...")
        # Authenticate as admin user
        self.owner_a.is_staff = True
        self.owner_a.save()
        self.client.force_authenticate(user=self.owner_a)

        url = reverse('tenant-detail', kwargs={'pk': str(self.tenant_a.id)})
        response = self.client.patch(
            url,
            data={
                'custom_css': 'body { color: red; }',
                'custom_js': 'console.log("hello");',
                'custom_backend_url': 'https://api.mi-cliente.com',
                'custom_frontend_url': 'https://tienda.mi-cliente.com'
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant_a.refresh_from_db()
        self.assertEqual(self.tenant_a.custom_css, 'body { color: red; }')
        self.assertEqual(self.tenant_a.custom_js, 'console.log("hello");')
        self.assertEqual(self.tenant_a.custom_backend_url, 'https://api.mi-cliente.com')
        self.assertEqual(self.tenant_a.custom_frontend_url, 'https://tienda.mi-cliente.com')
        logger.info("Test passed: Admin user successfully saved custom code and URLs.")

    def test_tenant_custom_styles_and_urls_unauthorized_access(self):
        """
        Verify that a normal tenant owner (non-admin) cannot modify custom CSS, JS,
        or custom URLs, raising a ValidationError (400).
        """
        logger.info("Executing test_tenant_custom_styles_and_urls_unauthorized_access...")
        # Ensure owner_a is not staff/admin
        self.owner_a.is_staff = False
        self.owner_a.role = 'USER'
        self.owner_a.save()
        self.client.force_authenticate(user=self.owner_a)

        url = reverse('tenant-detail', kwargs={'pk': str(self.tenant_a.id)})
        
        # Try to modify custom_css
        response = self.client.patch(
            url,
            data={'custom_css': 'body { color: blue; }'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Solo el CEO o administradores", str(response.data))

        # Try to modify custom_backend_url
        response = self.client.patch(
            url,
            data={'custom_backend_url': 'https://hacker-api.com'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Solo el CEO o administradores", str(response.data))
        logger.info("Test passed: Normal tenant owner was blocked from editing custom CSS and URLs.")

    def test_tenant_custom_styles_and_urls_public_config(self):
        """
        Verify that custom CSS, JS, and custom URLs are correctly returned via the public config endpoint.
        """
        logger.info("Executing test_tenant_custom_styles_and_urls_public_config...")
        self.tenant_a.custom_css = 'body { background: black; }'
        self.tenant_a.custom_js = 'alert("xss");'
        self.tenant_a.custom_backend_url = 'https://api.test.com'
        self.tenant_a.custom_frontend_url = 'https://frontend.test.com'
        self.tenant_a.save()

        response = self.client.get(
            reverse('tenant_public_config'),
            {'tenant_id': str(self.tenant_a.id)}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['custom_css'], 'body { background: black; }')
        self.assertEqual(response.data['custom_js'], 'alert("xss");')
        self.assertEqual(response.data['custom_backend_url'], 'https://api.test.com')
        self.assertEqual(response.data['custom_frontend_url'], 'https://frontend.test.com')
        logger.info("Test passed: Custom code and URLs returned in public config.")

    def test_tenant_backend_proxy_success(self):
        """
        Verify that the dynamic backend proxy correctly forwards HTTP requests
        using urllib and returns the appropriate headers and status code.
        """
        logger.info("Executing test_tenant_backend_proxy_success...")
        self.tenant_a.custom_backend_url = 'https://api.external-tenant.com'
        self.tenant_a.save()

        from unittest.mock import patch, MagicMock
        with patch('urllib.request.urlopen') as mock_urlopen:
            mock_response = MagicMock()
            mock_response.read.return_value = b'{"status": "proxied_ok"}'
            mock_response.status = 200
            mock_response.headers = {'Content-Type': 'application/json', 'X-Custom-Response-Header': 'Verified'}
            mock_urlopen.return_value.__enter__.return_value = mock_response

            self.client.force_authenticate(user=self.owner_a)
            url = reverse('tenant-backend-proxy', kwargs={'pk': str(self.tenant_a.id), 'sub_path': 'v1/data'})
            response = self.client.get(url + "?param=abc")

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.content, b'{"status": "proxied_ok"}')
            self.assertEqual(response.headers.get('X-Custom-Response-Header'), 'Verified')
            
            args, kwargs = mock_urlopen.call_args
            req_obj = args[0]
            self.assertEqual(req_obj.full_url, 'https://api.external-tenant.com/v1/data?param=abc')
        logger.info("Test passed: Backend proxy successfully validated using mocked urllib requests.")

    def test_tenant_backend_proxy_missing_url(self):
        """
        Verify that attempting to call the proxy on a tenant without a custom backend url
        results in a 400 Bad Request error.
        """
        logger.info("Executing test_tenant_backend_proxy_missing_url...")
        self.tenant_a.custom_backend_url = None
        self.tenant_a.save()

        self.client.force_authenticate(user=self.owner_a)
        url = reverse('tenant-backend-proxy', kwargs={'pk': str(self.tenant_a.id), 'sub_path': 'v1/data'})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("no tiene un backend personalizado", str(response.data))
        logger.info("Test passed: Proxy attempt without config correctly returned 400.")


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


class TenantTrialLimitsTests(BaseTenantAddonTestCase):
    def setUp(self):
        super().setUp()
        # Set tenant_a to trial mode
        self.tenant_a.trial_ends_at = timezone.now() + timedelta(days=14)
        self.tenant_a.save()

    def test_billing_trial_stamps(self):
        """1. Trial tenants have 0 free stamps and must purchase them."""
        self.assertTrue(self.tenant_a.is_in_trial)
        self.assertEqual(self.tenant_a.free_stamps_left, 0)
        self.assertFalse(self.tenant_a.has_available_stamps())
        
        # Adding balance allows stamps
        self.tenant_a.stamp_balance = 10
        self.tenant_a.save()
        self.assertTrue(self.tenant_a.has_available_stamps())

    def test_user_seat_limit(self):
        """2. Trial restricts user seats to max 2 (owner + 1 collaborator)."""
        self.client.force_authenticate(user=self.owner_a)
        
        # First collaborator -> success
        url = reverse('user-list')
        response = self.client.post(url, {
            'username': 'collab_1',
            'email': 'collab_1@example.com',
            'password': 'password123',
            'role': 'STAFF'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Second collaborator (total users = owner + collab_1 + collab_2 = 3) -> should fail
        response_fail = self.client.post(url, {
            'username': 'collab_2',
            'email': 'collab_2@example.com',
            'password': 'password123',
            'role': 'STAFF'
        })
        self.assertEqual(response_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prueba está limitado a un máximo de 2 usuarios", response_fail.data['detail'])

    def test_newsletter_daily_limit(self):
        """3. Newsletter limits campaign sending to max 300 emails/day."""
        self.client.force_authenticate(user=self.owner_a)
        
        # Create 301 subscribers
        subscribers = []
        for i in range(301):
            subscribers.append(Subscriber(email=f"sub_{i}@example.com", tenant=self.tenant_a, is_active=True))
        Subscriber.objects.bulk_create(subscribers)
        
        # 3.1 SendCampaignView pre-check daily limit
        send_url = reverse('newsletter_send_campaign')
        response = self.client.post(send_url, {
            'subject': 'Test Subject',
            'content': 'Test Content'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Límite diario excedido", response.data['error'])

    def test_shipping_balance_requirement(self):
        """4. Trial requires shipping guide payment (custom key or shipping_wallet_balance)."""
        from apps.shop.shipping import generate_shipping_label
        
        # Create a mock order
        order = Order.objects.create(
            tenant=self.tenant_a,
            user=self.customer_a,
            total=Decimal('500.00'),
            shipping_cost_base=Decimal('150.00'),
            skydropx_rate_id='rate_mock_123',
            status=Order.Status.PENDING
        )
        
        # With 0 balance and no custom key -> label generation fails
        success = generate_shipping_label(order)
        self.assertFalse(success)
        
        # Adding balance to shipping wallet -> success (exceeding minimum requirement of $250)
        self.tenant_a.shipping_wallet_balance = Decimal('300.00')
        self.tenant_a.save()
        success = generate_shipping_label(order)
        self.assertTrue(success)
        self.tenant_a.refresh_from_db()
        self.assertEqual(self.tenant_a.shipping_wallet_balance, Decimal('150.00'))

    def test_live_chat_limits(self):
        """5. Live Chat limit to 5 chats and AI assistant to 50 messages."""
        self.client.force_authenticate(user=self.customer_a)
        
        # Create 5 support chats -> success
        chat_url = reverse('support-chat-list')
        for i in range(5):
            response = self.client.post(chat_url, {'status': 'OPEN'})
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            
        # 6th chat -> fails
        response_fail = self.client.post(chat_url, {'status': 'OPEN'})
        self.assertEqual(response_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prueba está limitado a un máximo de 5 chats", response_fail.data['detail'])

        # AI replies limit test
        from apps.tickets.models import SupportChatMessage
        chat_instance = SupportChat.objects.filter(tenant=self.tenant_a).first()
        
        # Create 50 AI messages
        ai_messages = []
        for i in range(50):
            ai_messages.append(SupportChatMessage(chat=chat_instance, sender=self.customer_a, message="AI reply", is_ai_message=True))
        SupportChatMessage.objects.bulk_create(ai_messages)
        
        # 51st message triggers limit message
        from apps.tickets.ai_service import generate_ai_reply
        reply = generate_ai_reply(chat_instance, "hello assistance")
        self.assertIn("límite de mensajes", reply)

    def test_bookings_limit(self):
        """6. Limit of 10 booking inquiries/contracts."""
        # BookingInquiryViewSet: url = '/api/bookings/inquiries/'
        inquiry_url = '/api/bookings/inquiries/'
        self.client.force_authenticate(user=self.owner_a)
        
        for i in range(10):
            response = self.client.post(inquiry_url, {
                'name': f'Inquiry {i}',
                'email': f'inq_{i}@example.com',
                'phone': '1234567890',
                'venue_type': 'festival',
                'message': 'Test booking'
            })
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            
        # 11th inquiry -> fails
        response_fail = self.client.post(inquiry_url, {
            'name': 'Inquiry Fail',
            'email': 'fail@example.com',
            'phone': '1234567890',
            'venue_type': 'festival',
            'message': 'Test booking fail'
        })
        self.assertEqual(response_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prueba está limitado a un máximo de 10 consultas de reserva", response_fail.data['detail'])

    def test_sponsorship_limits(self):
        """7. Sponsorship limits (3 tiers, 2 targets, 5 updates)."""
        self.client.force_authenticate(user=self.owner_a)
        
        # 7.1 Sponsorship Tiers (max 3)
        tier_url = reverse('sponsorship-tiers-list')
        for i in range(3):
            response = self.client.post(tier_url, {
                'name': f'Tier {i}',
                'description': f'Desc {i}',
                'price': 100 + i * 50,
                'level': i + 1
            })
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # 4th tier -> fails
        response_fail = self.client.post(tier_url, {
            'name': 'Tier Fail',
            'description': 'Desc Fail',
            'price': 500,
            'level': 4
        })
        self.assertEqual(response_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prueba está limitado a un máximo de 3 niveles", response_fail.data['detail'])

        # 7.2 Sponsor Targets (max 2)
        target_url = reverse('sponsorship-targets-list')
        for i in range(2):
            response = self.client.post(target_url, {
                'name': f'Target {i}',
                'description': f'Desc {i}',
                'target_amount': 1000 + i * 500
            })
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # 3rd target -> fails
        response_fail = self.client.post(target_url, {
            'name': 'Target Fail',
            'description': 'Desc Fail',
            'target_amount': 5000
        })
        self.assertEqual(response_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prueba está limitado a un máximo de 2 metas", response_fail.data['detail'])

        # 7.3 Sponsorship Updates (max 5)
        update_url = reverse('sponsorship-updates-list')
        for i in range(5):
            response = self.client.post(update_url, {
                'title': f'Update {i}',
                'content': f'Content {i}',
                'min_tier_level': 0
            })
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # 6th update -> fails
        response_fail = self.client.post(update_url, {
            'title': 'Update Fail',
            'content': 'Content Fail',
            'min_tier_level': 0
        })
        self.assertEqual(response_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prueba está limitado a un máximo de 5 publicaciones de actualización", response_fail.data['detail'])

