from rest_framework import status
from apps.tenants.test_base import BaseTenantAddonTestCase, logger
from apps.shop.models import Contract

class DeliveryAddonTests(BaseTenantAddonTestCase):
    def test_delivery_requires_addon_permission_denied(self):
        """
        Verify that client/manager cannot access delivery config/vehicles if addon is not active.
        """
        logger.info("Executing test_delivery_requires_addon_permission_denied...")
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/delivery/vehicles/', {'tenant_id': str(self.tenant_a.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        logger.info("Test passed: Delivery permission correctly denied.")

    def test_delivery_fleet_and_gps_success(self):
        """
        Verify delivery fleet and GPS location tracking operations with active addon.
        """
        logger.info("Executing test_delivery_fleet_and_gps_success...")
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
        contract.addons.add(self.delivery_addon)

        self.client.force_authenticate(user=self.owner_a)
        # Create vehicle
        response = self.client.post(
            '/api/delivery/vehicles/',
            data={'name': 'Truck 01', 'plate_number': 'ABC-1234', 'driver_name': 'Carlos Gomez', 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        vehicle_id = response.data['id']

        # Update location
        response = self.client.post(
            '/api/delivery/location/update/',
            data={'vehicle_id': vehicle_id, 'latitude': 25.6866, 'longitude': -100.3161, 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['latitude']), 25.6866)

        # Create stop
        response = self.client.post(
            '/api/delivery/stops/',
            data={'vehicle': vehicle_id, 'name': 'Stop A', 'address': 'Main Av 100', 'latitude': 25.7000, 'longitude': -100.3200, 'scheduled_time': '2026-06-01T12:00:00Z', 'order': 1, 'tenant_id': str(self.tenant_a.id)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # List stops
        response = self.client.get('/api/delivery/stops/', {'tenant_id': str(self.tenant_a.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        logger.info("Test passed: Delivery fleet and GPS operations completed successfully.")
