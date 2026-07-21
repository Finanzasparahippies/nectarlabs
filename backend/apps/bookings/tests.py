from rest_framework import status
from apps.tenants.test_base import BaseTenantAddonTestCase, logger
from apps.shop.models import Contract
from apps.bookings.models import (
    BookingConfig, BookingInquiry, BookingContract,
    CustomContractTemplate, CustomContract, CustomContractSignatory
)

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

    def test_custom_contract_requires_addon(self):
        """
        Verify that custom contract operations (templates and contracts) require
        the 'booking-signature' addon active on the tenant.
        """
        logger.info("Executing test_custom_contract_requires_addon...")
        # Authenticate as owner_a (BUSINESS) without active addon
        self.client.force_authenticate(user=self.owner_a)

        # Attempt to create template without addon
        response = self.client.post(
            '/api/bookings/custom-templates/',
            data={
                'title': 'Test Template',
                'proemio': 'Proemio text',
                'declarations': 'Declarations text',
                'clauses': 'Clauses text'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        logger.info("Access correctly restricted without addon active.")

        # Activate addon for tenant_a
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

        # Retry template creation with addon active
        response = self.client.post(
            '/api/bookings/custom-templates/',
            data={
                'title': 'Test Template',
                'proemio': 'Proemio text',
                'declarations': 'Declarations text',
                'clauses': 'Clauses text'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        logger.info("Test passed: Addon authorization works successfully.")

    def test_template_tenant_isolation(self):
        """
        Verify that a BUSINESS user can only modify their own tenant templates
        and cannot access or modify templates from another tenant.
        """
        logger.info("Executing test_template_tenant_isolation...")
        # Activate addon for Tenant A (owner_a)
        contract_a = Contract.objects.create(
            user=self.owner_a,
            full_name="Owner A Contract",
            tax_id="TAXA123",
            address="Address A",
            is_fully_signed=True,
            is_active=True
        )
        contract_a.addons.add(self.booking_addon)

        # Activate addon for Tenant B (owner_b)
        contract_b = Contract.objects.create(
            user=self.owner_b,
            full_name="Owner B Contract",
            tax_id="TAXB123",
            address="Address B",
            is_fully_signed=True,
            is_active=True
        )
        contract_b.addons.add(self.booking_addon)

        # Create template under Tenant A
        template_a = CustomContractTemplate.objects.create(
            tenant=self.tenant_a,
            title="Tenant A Template",
            proemio="Proemio A",
            declarations="Declarations A",
            clauses="Clauses A"
        )

        # Authenticate as owner_b and try to patch template_a
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.patch(
            f'/api/bookings/custom-templates/{template_a.id}/',
            data={'title': 'Hacked Title'},
            format='json'
        )
        # Should return 404 (because it is excluded from queryset) or 403 Forbidden
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # Verify template title did not change in DB
        template_a.refresh_from_db()
        self.assertEqual(template_a.title, "Tenant A Template")
        logger.info("Test passed: Tenant isolation on custom templates is secure.")

    def test_non_tenant_user_template_modification(self):
        """
        Verify that a logged-in user without a tenant (like a regular customer)
        cannot create or modify custom templates.
        """
        logger.info("Executing test_non_tenant_user_template_modification...")
        # Authenticate as customer_a
        self.client.force_authenticate(user=self.customer_a)

        # Attempt to create template
        response = self.client.post(
            '/api/bookings/custom-templates/',
            data={
                'title': 'Customer Template Attempt',
                'proemio': 'Proemio text',
                'declarations': 'Declarations text',
                'clauses': 'Clauses text'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        logger.info("Test passed: Non-tenant / non-business user modification correctly blocked.")

    def test_custom_contract_signing_flow(self):
        """
        Verify the entire multi-signatory digital signature pipeline using unique tokens.
        """
        logger.info("Executing test_custom_contract_signing_flow...")
        # Activate addon for Tenant A
        contract_a = Contract.objects.create(
            user=self.owner_a,
            full_name="Owner A Contract",
            tax_id="TAXA123",
            address="Address A",
            is_fully_signed=True,
            is_active=True
        )
        contract_a.addons.add(self.booking_addon)

        # Create Custom Contract as owner_a with 2 signatories
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(
            '/api/bookings/custom-contracts/',
            data={
                'title': 'Contrato de Desarrollo',
                'proemio': 'Proemio de desarrollo...',
                'declarations': 'Declaraciones de desarrollo...',
                'clauses': 'Clausulas de desarrollo...',
                'signatories': [
                    {'name': 'Juan Rep', 'email': 'juan@example.com', 'role': 'Representante'},
                    {'name': 'Pedro Cliente', 'email': 'pedro@example.com', 'role': 'Cliente'}
                ]
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify created contract in database
        db_contract = CustomContract.objects.get(title='Contrato de Desarrollo')
        self.assertFalse(db_contract.is_fully_signed)
        self.assertEqual(db_contract.signatories.count(), 2)

        sig_1 = db_contract.signatories.get(name='Juan Rep')
        sig_2 = db_contract.signatories.get(name='Pedro Cliente')

        # Verify token generation
        self.assertIsNotNone(sig_1.token)
        self.assertIsNotNone(sig_2.token)

        # Step 1: Read contract details publicly by token (No Authentication)
        self.client.logout()
        response = self.client.get(
            f'/api/bookings/custom-contracts/by_token/?token={sig_1.token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Contrato de Desarrollo')
        self.assertEqual(response.data['current_signatory']['name'], 'Juan Rep')
        self.assertFalse(response.data['current_signatory']['has_signed'])

        # Step 2: Sign contract as Signatory 1
        response = self.client.post(
            '/api/bookings/custom-contracts/sign_by_token/',
            data={
                'token': str(sig_1.token),
                'signature': 'data:image/png;base64,firmabase64part1'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh and verify
        sig_1.refresh_from_db()
        self.assertEqual(sig_1.signature_base64, 'data:image/png;base64,firmabase64part1')
        self.assertIsNotNone(sig_1.signed_at)
        
        # Verify contract is not fully signed yet
        db_contract.refresh_from_db()
        self.assertFalse(db_contract.is_fully_signed)

        # Step 3: Prevent duplicate signature attempt
        response = self.client.post(
            '/api/bookings/custom-contracts/sign_by_token/',
            data={
                'token': str(sig_1.token),
                'signature': 'data:image/png;base64,anotherfirmabase64'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Step 4: Sign contract as Signatory 2 (Final Signatory)
        response = self.client.post(
            '/api/bookings/custom-contracts/sign_by_token/',
            data={
                'token': str(sig_2.token),
                'signature': 'data:image/png;base64,firmabase64part2'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify final signature and full validation status
        sig_2.refresh_from_db()
        self.assertEqual(sig_2.signature_base64, 'data:image/png;base64,firmabase64part2')
        self.assertIsNotNone(sig_2.signed_at)

        db_contract.refresh_from_db()
        self.assertTrue(db_contract.is_fully_signed)
        logger.info("Test passed: Full custom contract signing flow completed with success.")
