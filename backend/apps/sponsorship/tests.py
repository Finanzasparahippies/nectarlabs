from rest_framework import status
from unittest.mock import patch, MagicMock
from apps.tenants.test_base import BaseTenantAddonTestCase, logger
from apps.shop.models import Contract
from apps.sponsorship.models import SponsorshipConfig, SponsorshipTier, Sponsorship, SponsorshipUpdate

class SponsorshipAddonTests(BaseTenantAddonTestCase):
    def test_sponsorship_requires_addon_permission_denied(self):
        """
        Verify that a client cannot access sponsorship endpoints if the tenant
        does not have the 'patreon-sponsorship' addon active.
        """
        logger.info("Executing test_sponsorship_requires_addon_permission_denied...")
        response = self.client.get('/api/sponsorship/tiers/', {'tenant_id': str(self.tenant_a.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        logger.info("Test passed: Sponsorship permission correctly denied.")

    def test_sponsorship_and_exclusive_feed_flow(self):
        """
        Verify successful sponsorship tier checkout and membership-only updates isolation.
        """
        logger.info("Executing test_sponsorship_and_exclusive_feed_flow...")
        contract = Contract.objects.create(
            user=self.owner_a,
            full_name="Owner A Contract",
            tax_id="TAXA123",
            address="Address A",
            project_idea="Idea A",
            signature_base64="signature",
            is_fully_signed=True,
            is_active=True
        )
        contract.addons.add(self.sponsorship_addon)

        # Setup sponsorship details
        SponsorshipConfig.objects.create(
            tenant=self.tenant_a,
            membership_name="Patrono",
            welcome_message="¡Gracias por el apoyo!"
        )

        tier_gold = SponsorshipTier.objects.create(
            tenant=self.tenant_a,
            name="Gold Member",
            level=3,
            price=200.00,
            is_active=True
        )

        # Anonymous / unauthenticated checks
        response = self.client.get('/api/sponsorship/tiers/', {'tenant_id': str(self.tenant_a.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Create member-only update (level 3 required)
        update = SponsorshipUpdate.objects.create(
            tenant=self.tenant_a,
            title="Gold Exclusive News",
            content="Top Secret!",
            min_tier_level=3,
            author=self.owner_a
        )

        # Customer A tries to view updates -> gets empty list since not sponsoring
        self.client.force_authenticate(user=self.customer_a)
        response = self.client.get('/api/sponsorship/updates/', {'tenant_id': str(self.tenant_a.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # Mock Stripe webhook payment to become a sponsor
        from unittest.mock import patch
        webhook_data = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "subscription": "sub_gold_123",
                    "payment_intent": "pi_gold_123",
                    "metadata": {
                        "tenant_id": str(self.tenant_a.id),
                        "user_id": str(self.customer_a.id),
                        "tier_id": str(tier_gold.id),
                        "billing_cycle": "MONTHLY",
                        "type": "patreon_sponsorship"
                    }
                }
            }
        }
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_data
            response = self.client.post(
                '/api/shop/stripe-webhook/',
                data=webhook_data,
                format='json',
                HTTP_STRIPE_SIGNATURE='t=123,v1=mock_sig'
            )
        self.assertEqual(response.status_code, 200)

        # Customer A now has active sponsorship
        self.assertTrue(Sponsorship.objects.filter(user=self.customer_a, tier=tier_gold, active=True).exists())

        # Customer A tries to view updates again -> can now see Gold updates!
        self.client.force_authenticate(user=self.customer_a)
        response = self.client.get('/api/sponsorship/updates/', {'tenant_id': str(self.tenant_a.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Gold Exclusive News")

        # Customer B (other tenant customer) tries to view Tenant A's Gold updates -> gets empty/restricted
        self.client.force_authenticate(user=self.customer_b)
        response = self.client.get('/api/sponsorship/updates/', {'tenant_id': str(self.tenant_a.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
        logger.info("Test passed: Sponsorship subscription and updates isolation verified.")

    @patch('stripe.Product.create')
    @patch('stripe.Product.list')
    @patch('stripe.Price.create')
    @patch('stripe.Price.list')
    def test_stripe_sponsorship_tier_idempotency(self, mock_price_list, mock_price_create, mock_product_list, mock_product_create):
        """
        Verify that creating Stripe Product and Prices for a SponsorshipTier passes deterministic idempotency keys.
        """
        from apps.sponsorship.utils import create_stripe_product_and_price
        from django.test import override_settings
        from unittest.mock import MagicMock
        
        # Setup sponsorship details
        SponsorshipConfig.objects.create(
            tenant=self.tenant_a,
            membership_name="Patrono",
            welcome_message="¡Gracias por el apoyo!"
        )

        tier = SponsorshipTier.objects.create(
            id=777,
            tenant=self.tenant_a,
            name="Platinum Sponsor",
            level=5,
            price=1000.00,
            price_annual=10000.00,
            type="SUBSCRIPTION",
            is_active=True
        )

        # Mock Stripe
        mock_product_list.return_value.auto_paging_iter.return_value = []
        mock_prod = MagicMock()
        mock_prod.id = "prod_sponsorship_test_777"
        mock_prod.active = True
        mock_product_create.return_value = mock_prod

        mock_price_list.return_value.data = []
        mock_price = MagicMock()
        mock_price.id = "price_sponsorship_test_777"
        mock_price_create.return_value = mock_price

        with override_settings(TESTING=False, STRIPE_SECRET_KEY="sk_test_mock"):
            price_ids = create_stripe_product_and_price(tier)
            self.assertEqual(price_ids['monthly'], "price_sponsorship_test_777")
            self.assertEqual(price_ids['annual'], "price_sponsorship_test_777")

            # Check that Product.create was called with idempotency_key
            mock_product_create.assert_called_once()
            prod_kwargs = mock_product_create.call_args[1]
            self.assertEqual(prod_kwargs["idempotency_key"], "sponsorship_product_777")

            # Check Price.create calls and their idempotency_keys
            self.assertEqual(mock_price_create.call_count, 2)
            monthly_price_args = mock_price_create.call_args_list[0][1]
            annual_price_args = mock_price_create.call_args_list[1][1]

            self.assertEqual(monthly_price_args["idempotency_key"], "sponsorship_price_monthly_777_100000")
            self.assertEqual(annual_price_args["idempotency_key"], "sponsorship_price_annual_777_1000000")

