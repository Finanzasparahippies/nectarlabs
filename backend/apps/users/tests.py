from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.conf import settings

from apps.users.models import User
from apps.tenants.models import Tenant

class UsersAppTests(APITestCase):
    def setUp(self):
        # Create base test users
        self.admin_user = User.objects.create_superuser(
            email='admin@example.com',
            username='admin',
            password='adminpassword',
            role=User.Role.ADMIN,
            is_email_verified=True
        )
        
        self.business_user = User.objects.create_user(
            email='business@example.com',
            username='business',
            password='bizpassword',
            role=User.Role.BUSINESS,
            is_email_verified=True
        )
        
        self.tenant = Tenant.objects.create(
            name="Test Tenant",
            subdomain="test-tenant",
            owner=self.business_user
        )
        
        self.business_staff = User.objects.create_user(
            email='staff@example.com',
            username='staff',
            password='staffpassword',
            role=User.Role.STAFF,
            tenant=self.tenant,
            is_email_verified=True
        )
        
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            username='customer',
            password='custpassword',
            role=User.Role.CUSTOMER,
            tenant=self.tenant,
            is_email_verified=True
        )

    def test_custom_jwt_claims(self):
        """Verify that token validation payload includes custom claims."""
        url = reverse('token_obtain_pair')
        data = {
            'email': 'customer@example.com',
            'password': 'custpassword'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('is_staff', response.data)
        self.assertEqual(response.data['role'], User.Role.CUSTOMER)
        self.assertEqual(response.data['email'], 'customer@example.com')

    def test_email_verification_requirement(self):
        """Verify that unverified users (who don't bypass) cannot log in."""
        unverified_user = User.objects.create_user(
            email='unverified@realclient.com',
            username='unverified',
            password='password123',
            role=User.Role.CUSTOMER,
            is_email_verified=False
        )
        
        url = reverse('token_obtain_pair')
        data = {
            'email': 'unverified@realclient.com',
            'password': 'password123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertTrue("verifica tu correo" in str(response.data['detail']))

    def test_email_verification_bypass_for_test_emails(self):
        """Verify that emails ending with @example.com bypass verification checks (for testing/bot access)."""
        unverified_test_user = User.objects.create_user(
            email='unverified@example.com',
            username='unverified_test',
            password='password123',
            role=User.Role.CUSTOMER,
            is_email_verified=False
        )
        
        url = reverse('token_obtain_pair')
        data = {
            'email': 'unverified@example.com',
            'password': 'password123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_verify_email_endpoint_success(self):
        """Verify successful email verification link execution redirects to login."""
        unverified_user = User.objects.create_user(
            email='newuser@realclient.com',
            username='newuser',
            password='password123',
            role=User.Role.CUSTOMER,
            is_email_verified=False
        )
        
        uid = urlsafe_base64_encode(force_bytes(unverified_user.pk))
        token = default_token_generator.make_token(unverified_user)
        
        url = f"/api/users/verify-email/?uid={uid}&token={token}"
        response = self.client.get(url)
        
        # Should redirect to frontend URL with verified=true
        expected_redirect = f"{settings.FRONTEND_URL}/login?verified=true"
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, expected_redirect)
        
        unverified_user.refresh_from_db()
        self.assertTrue(unverified_user.is_email_verified)

    def test_verify_email_endpoint_invalid_token(self):
        """Verify that invalid token redirect with verified=false."""
        unverified_user = User.objects.create_user(
            email='newuser2@realclient.com',
            username='newuser2',
            password='password123',
            role=User.Role.CUSTOMER,
            is_email_verified=False
        )
        
        uid = urlsafe_base64_encode(force_bytes(unverified_user.pk))
        url = f"/api/users/verify-email/?uid={uid}&token=invalid-token"
        response = self.client.get(url)
        
        expected_redirect = f"{settings.FRONTEND_URL}/login?verified=false&error=invalid_token"
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, expected_redirect)
        
        unverified_user.refresh_from_db()
        self.assertFalse(unverified_user.is_email_verified)

    def test_public_registration_requires_password_match(self):
        """Verify that public registration requires passwords to match."""
        url = reverse('register')
        data = {
            'email': 'newregistered@example.com',
            'username': 'newreg',
            'password': 'password123',
            'password_confirm': 'differentpassword'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)

    def test_public_registration_succeeds_and_forces_customer_unverified(self):
        """Verify registration forces role=CUSTOMER, is_email_verified=False and is_staff=False."""
        url = reverse('register')
        data = {
            'email': 'newregistered@example.com',
            'username': 'newreg',
            'password': 'password123',
            'password_confirm': 'password123',
            'role': 'ADMIN', # Attempt privilege escalation
            'is_staff': True,
            'is_superuser': True
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        user = User.objects.get(email='newregistered@example.com')
        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertFalse(user.is_email_verified)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_privilege_escalation_prevention_on_update(self):
        """Verify that non-admins cannot change their role or tenant."""
        self.client.force_authenticate(user=self.customer_user)
        
        # Attempt to escalate self to ADMIN and change tenant to None
        url = f"/api/users/{self.customer_user.id}/"
        data = {
            'role': 'ADMIN',
            'tenant': None
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.customer_user.refresh_from_db()
        # Role and tenant should remain unchanged
        self.assertEqual(self.customer_user.role, User.Role.CUSTOMER)
        self.assertEqual(self.customer_user.tenant, self.tenant)

    def test_business_owner_can_create_customer_and_staff(self):
        """Verify business owner can create CUSTOMER and STAFF users under their tenant."""
        self.client.force_authenticate(user=self.business_user)
        
        url = "/api/users/"
        # Create CUSTOMER
        data = {
            'email': 'bizcustomer@example.com',
            'username': 'bizcustomer',
            'role': 'CUSTOMER'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_cust = User.objects.get(email='bizcustomer@example.com')
        self.assertEqual(new_cust.tenant, self.tenant)
        self.assertEqual(new_cust.role, User.Role.CUSTOMER)
        
        # Create STAFF
        data = {
            'email': 'bizstaff@example.com',
            'username': 'bizstaff',
            'role': 'STAFF'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_staff = User.objects.get(email='bizstaff@example.com')
        self.assertEqual(new_staff.tenant, self.tenant)
        self.assertEqual(new_staff.role, User.Role.STAFF)

    def test_business_owner_cannot_escalate_roles(self):
        """Verify business owner cannot create ADMIN or BUSINESS users (forced to CUSTOMER)."""
        self.client.force_authenticate(user=self.business_user)
        
        url = "/api/users/"
        data = {
            'email': 'bizadmin@example.com',
            'username': 'bizadmin',
            'role': 'ADMIN'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email='bizadmin@example.com')
        self.assertEqual(new_user.role, User.Role.CUSTOMER)

    def test_business_owner_without_tenant_fails_to_create_user(self):
        """Verify validation error when business owner has no tenants."""
        homeless_business = User.objects.create_user(
            email='homeless@example.com',
            username='homeless',
            password='password123',
            role=User.Role.BUSINESS,
            is_email_verified=True
        )
        self.client.force_authenticate(user=homeless_business)
        
        url = "/api/users/"
        data = {
            'email': 'homelesscust@example.com',
            'username': 'homelesscust',
            'role': 'CUSTOMER'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)

    def test_business_staff_queryset_and_actions(self):
        """Verify that staff members can view and update users inside their tenant only."""
        self.client.force_authenticate(user=self.business_staff)
        
        # List users (should see staff and customer, but not admin/business since they are outside tenant)
        url = "/api/users/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = [u['id'] for u in response.data]
        self.assertIn(self.customer_user.id, user_ids)
        self.assertIn(self.business_staff.id, user_ids)
        self.assertNotIn(self.admin_user.id, user_ids)
