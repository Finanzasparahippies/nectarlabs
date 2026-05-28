from django.urls import reverse
from rest_framework import status
from apps.tenants.test_base import BaseTenantAddonTestCase, logger
from apps.shop.models import Contract

class TicketsAddonTests(BaseTenantAddonTestCase):
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
