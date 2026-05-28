from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from apps.tenants.models import Tenant
from apps.shop.models import Plan, AddOn
import logging

logger = logging.getLogger("tests")
User = get_user_model()

class BaseTenantAddonTestCase(APITestCase):
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
        self.booking_addon = AddOn.objects.create(
            slug="booking-signature",
            name="Booking & Signature",
            category_badge="Operations",
            description="Booking & Signature description",
            detailed_description="Detailed Booking & Signature",
            monthly_price=1000.00,
            yearly_price=10000.00,
            origin_project="Nectar",
            source_reference="Ref"
        )
        self.delivery_addon = AddOn.objects.create(
            slug="logistics-gps",
            name="Logistics & GPS",
            category_badge="Operations",
            description="Logistics & GPS description",
            detailed_description="Detailed Logistics & GPS",
            monthly_price=1500.00,
            yearly_price=15000.00,
            origin_project="Nectar",
            source_reference="Ref"
        )
        self.sponsorship_addon = AddOn.objects.create(
            slug="patreon-sponsorship",
            name="Patreon & Sponsorship",
            category_badge="Marketing",
            description="Patreon & Sponsorship description",
            detailed_description="Detailed Patreon & Sponsorship",
            monthly_price=800.00,
            yearly_price=8000.00,
            origin_project="Nectar",
            source_reference="Ref"
        )
        logger.info("Test workspace initialized successfully.")
