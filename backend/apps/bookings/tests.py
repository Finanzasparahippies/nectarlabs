from rest_framework import status
from apps.tenants.test_base import BaseTenantAddonTestCase, logger
from apps.shop.models import Contract
from apps.bookings.models import BookingConfig, BookingInquiry, BookingContract

class BookingsAddonTests(BaseTenantAddonTestCase):
    def test_booking_requires_addon_permission_denied(self):
        """
        Verify that a client cannot access booking inquiry creation if the tenant
        does not have the 'booking-signature' addon active.
        """
        logger.info("Executing test_booking_requires_addon_permission_denied...")
        response = self.client.post(
            '/api/bookings/inquiries/',
            data={'name': 'Test Event', 'email': 'event@example.com', 'phone': '12345', 'venue_type': 'festival', 'message': 'Hi', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        logger.info("Test passed: Booking permission correctly denied.")

    def test_booking_flow_success(self):
        """
        Verify successful booking flow: inquiry creation, contract generation, signing.
        """
        logger.info("Executing test_booking_flow_success...")
        # Activate addon
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
        contract.addons.add(self.booking_addon)

        # Create Custom BookingConfig
        BookingConfig.objects.create(
            tenant=self.tenant_a,
            default_fee=35000.00,
            contract_template="Custom clauses for {{client_name}} on {{event_date}}"
        )

        response = self.client.post(
            '/api/bookings/inquiries/',
            data={'name': 'Festival de Rock', 'email': 'rock@example.com', 'phone': '555-5555', 'venue_type': 'festival', 'message': 'Rock band contract', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify inquiry and contract creation with custom fee
        inquiry = BookingInquiry.objects.get(email='rock@example.com')
        contract_proposal = BookingContract.objects.get(inquiry=inquiry)
        self.assertEqual(contract_proposal.fee, 35000.00)

        # Sign the contract as client
        response = self.client.post(
            f'/api/bookings/contracts/{contract_proposal.id}/sign/',
            data={'signature': 'data:image/png;base64,client_signature_base64_data'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contract_proposal.refresh_from_db()
        self.assertIsNotNone(contract_proposal.signature_base64)
        self.assertFalse(contract_proposal.is_fully_signed)

        # Manager sign
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(
            f'/api/bookings/contracts/{contract_proposal.id}/manager_sign/',
            data={'signature': 'data:image/png;base64,manager_signature_base64_data'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contract_proposal.refresh_from_db()
        self.assertTrue(contract_proposal.is_fully_signed)
        logger.info("Test passed: Full booking and signature flow completed successfully.")
