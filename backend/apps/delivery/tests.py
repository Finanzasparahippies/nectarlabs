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

    def test_driver_profile_nearest_available(self):
        """
        Verify DriverProfileManager.nearest_available correctly sorts and filters by distance.
        """
        logger.info("Executing test_driver_profile_nearest_available...")
        from .models import DriverProfile

        # Point of origin (lat, lon) = CDMX center: 19.4326, -99.1332
        origin_lat = 19.4326
        origin_lon = -99.1332

        # 1. Driver close (approx 5km)
        d_close = DriverProfile.objects.create(
            name="Repartidor Cercano",
            is_available=True,
            current_latitude=19.4500,
            current_longitude=-99.1000
        )
        # 2. Driver far (approx 50km)
        d_far = DriverProfile.objects.create(
            name="Repartidor Lejano",
            is_available=True,
            current_latitude=19.8000,
            current_longitude=-99.2000
        )
        # 3. Driver close but unavailable
        d_unavailable = DriverProfile.objects.create(
            name="Repartidor Ocupado",
            is_available=False,
            current_latitude=19.4300,
            current_longitude=-99.1300
        )

        # Query with 30km radius
        candidates_30km = DriverProfile.objects.nearest_available(origin_lat, origin_lon, radius_km=30)
        self.assertEqual(len(candidates_30km), 1)
        self.assertEqual(candidates_30km[0][1].pk, d_close.pk)

        # Query with 100km radius (should include far one, but exclude unavailable)
        candidates_100km = DriverProfile.objects.nearest_available(origin_lat, origin_lon, radius_km=100)
        self.assertEqual(len(candidates_100km), 2)
        # Verify ordering: closest first
        self.assertEqual(candidates_100km[0][1].pk, d_close.pk)
        self.assertEqual(candidates_100km[1][1].pk, d_far.pk)
        logger.info("Test passed: nearest_available correctly sorts and filters geographically.")

    def test_driver_assignment_idempotency_and_fallback(self):
        """
        Verify idempotent behavior of /api/delivery/orders/assign-driver/ and fallback logic.
        """
        logger.info("Executing test_driver_assignment_idempotency_and_fallback...")
        from .models import DriverProfile, DeliveryOrder

        contract = Contract.objects.create(
            user=self.owner_a,
            full_name="Owner A Contract",
            tax_id="TAXA123",
            address="Address A",
            is_fully_signed=True,
            is_active=True
        )
        contract.addons.add(self.delivery_addon)

        self.client.force_authenticate(user=self.owner_a)

        # Create delivery order
        order = DeliveryOrder.objects.create(
            tenant=self.tenant_a,
            recipient_name="Juan Perez",
            delivery_address="Reforma 100, CDMX",
            delivery_latitude=19.4326,
            delivery_longitude=-99.1332
        )

        # Try assigning when no drivers are available (should return 503 Service Unavailable)
        response = self.client.post(
            '/api/delivery/orders/assign-driver/',
            data={
                'delivery_order_id': order.id,
                'origin_latitude': 19.4326,
                'origin_longitude': -99.1332,
                'idempotency_key': 'key-test-123',
                'tenant_id': str(self.tenant_a.id)
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

        # Register an available driver
        driver = DriverProfile.objects.create(
            name="Driver Test",
            is_available=True,
            current_latitude=19.4350,
            current_longitude=-99.1350
        )

        # Try assigning again (should succeed)
        response = self.client.post(
            '/api/delivery/orders/assign-driver/',
            data={
                'delivery_order_id': order.id,
                'origin_latitude': 19.4326,
                'origin_longitude': -99.1332,
                'idempotency_key': 'key-test-123',
                'tenant_id': str(self.tenant_a.id)
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['driver'], driver.id)
        self.assertEqual(response.data['status'], 'ASSIGNED')

        # Test Idempotency (repeating exact request must yield same assignment response)
        response_dup = self.client.post(
            '/api/delivery/orders/assign-driver/',
            data={
                'delivery_order_id': order.id,
                'origin_latitude': 19.4326,
                'origin_longitude': -99.1332,
                'idempotency_key': 'key-test-123',
                'tenant_id': str(self.tenant_a.id)
            },
            format='json'
        )
        self.assertEqual(response_dup.status_code, status.HTTP_200_OK)
        self.assertEqual(response_dup.data['id'], response.data['id'])
        self.assertEqual(response_dup.data['driver'], driver.id)
        logger.info("Test passed: assign-driver endpoint respects idempotency and handles fallback.")

    def test_store_config_retrieve_and_update(self):
        """
        Verify StoreConfig CRUD endpoints for admin configuration management.
        """
        logger.info("Executing test_store_config_retrieve_and_update...")
        contract = Contract.objects.create(
            user=self.owner_a,
            full_name="Owner A Contract",
            tax_id="TAXA123",
            address="Address A",
            is_fully_signed=True,
            is_active=True
        )
        contract.addons.add(self.delivery_addon)

        self.client.force_authenticate(user=self.owner_a)

        # GET store config (should auto-create default)
        response = self.client.get('/api/delivery/store-config/', {'tenant_id': str(self.tenant_a.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['has_skydropx_api_key'])

        # UPDATE store config (with masked write-only Skydropx key)
        response = self.client.put(
            '/api/delivery/store-config/',
            data={
                'available_box_sizes': 'S,M',
                'offers_national_shipping': True,
                'skydropx_api_key': 'sk_test_mock_secret_key',
                'origin_name': 'Almacen Norte',
                'tenant_id': str(self.tenant_a.id)
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available_box_sizes'], 'S,M')
        self.assertTrue(response.data['offers_national_shipping'])
        self.assertTrue(response.data['has_skydropx_api_key'])
        # Verify key itself is write-only / not leaked back to client
        self.assertNotIn('skydropx_api_key', response.data)
        logger.info("Test passed: StoreConfig CRUD tested successfully.")

