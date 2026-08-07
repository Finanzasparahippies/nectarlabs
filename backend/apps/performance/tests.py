from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from apps.tenants.test_base import BaseTenantAddonTestCase
from apps.performance.models import PerformanceMetric, ServerRequestLog
from apps.shop.models import AddOn, Contract

User = get_user_model()

class PerformanceMetricModelTestCase(BaseTenantAddonTestCase):
    def test_performance_metric_creation_and_str(self):
        metric = PerformanceMetric.objects.create(
            name="LCP",
            value=2.5,
            path="/dashboard/",
            user_agent="Mozilla/5.0"
        )
        self.assertEqual(str(metric), "LCP: 2.5 at /dashboard/")
        self.assertEqual(metric.name, "LCP")
        self.assertEqual(metric.value, 2.5)

class ServerRequestLogModelTestCase(BaseTenantAddonTestCase):
    def test_server_request_log_creation_and_str(self):
        log = ServerRequestLog.objects.create(
            path="/api/addons/",
            method="GET",
            status_code=200,
            response_time=0.1234,
            query_count=5
        )
        self.assertEqual(str(log), "GET /api/addons/ - 200 (0.1234s)")
        self.assertEqual(log.query_count, 5)

class PerformanceAPITestCase(BaseTenantAddonTestCase):
    def setUp(self):
        super().setUp()
        self.admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="adminpassword"
        )

    def test_report_vitals_success(self):
        url = reverse("performance-report-vitals")
        data = {
            "name": "FID",
            "value": 15.2,
            "path": "/dashboard/addons"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(PerformanceMetric.objects.filter(name="FID", value=15.2).exists())

    def test_report_vitals_invalid_data(self):
        url = reverse("performance-report-vitals")
        data = {
            "name": "INVALID",
            "value": 15.2,
            "path": "/dashboard/addons"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_summary_anonymous_denied(self):
        url = reverse("performance-get-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_summary_admin_success(self):
        # Create some dummy logs and metrics
        PerformanceMetric.objects.create(name="LCP", value=1.2, path="/")
        ServerRequestLog.objects.create(
            path="/api/addons/",
            method="GET",
            status_code=200,
            response_time=0.05,
            query_count=3
        )

        url = reverse("performance-get-summary")
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertIn("server", data)
        self.assertIn("vitals", data)
        self.assertIn("hardware", data)
        self.assertEqual(data["server"]["total_requests"], 1)
        self.assertTrue(any(v["name"] == "LCP" for v in data["vitals"]))

class PerformanceMiddlewareTestCase(BaseTenantAddonTestCase):
    def setUp(self):
        super().setUp()
        # Create business-analytics Addon
        self.apm_addon = AddOn.objects.create(
            slug="business-analytics",
            name="Néctar Analytics APM",
            category_badge="Operations",
            description="APM description",
            detailed_description="Detailed APM",
            monthly_price=500.00,
            yearly_price=5000.00,
            origin_project="Nectar",
            source_reference="Ref"
        )
        # Authenticate Owner A
        self.client.force_authenticate(user=self.owner_a)

    def test_middleware_does_not_log_without_apm_addon(self):
        # By default, owner_a doesn't have an active contract for apm_addon
        url = reverse("addon-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify no ServerRequestLog is created
        self.assertEqual(ServerRequestLog.objects.count(), 0)

    def test_middleware_logs_with_active_apm_addon(self):
        # Create fully signed contract with APM addon for owner_a
        contract = Contract.objects.create(
            user=self.owner_a,
            full_name="Owner A Contract",
            tax_id="XAXX010101000",
            address="Street 123",
            project_idea="Idea",
            is_fully_signed=True,
            is_active=True
        )
        contract.addons.add(self.apm_addon)

        # Confirm owner_a has business-analytics active
        self.assertIn("business-analytics", self.tenant_a.active_addons)

        url = reverse("addon-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify ServerRequestLog is created
        self.assertEqual(ServerRequestLog.objects.count(), 1)
        log = ServerRequestLog.objects.first()
        self.assertEqual(log.path, "/api/addons/")
        self.assertEqual(log.method, "GET")
        self.assertEqual(log.status_code, 200)

    def test_middleware_bypasses_performance_and_static_urls(self):
        # Even with APM addon, the performance and static paths should not be logged
        contract = Contract.objects.create(
            user=self.owner_a,
            full_name="Owner A Contract",
            tax_id="XAXX010101000",
            address="Street 123",
            project_idea="Idea",
            is_fully_signed=True,
            is_active=True
        )
        contract.addons.add(self.apm_addon)

        # 1. Access report vitals endpoint
        vitals_url = reverse("performance-report-vitals")
        data = {"name": "LCP", "value": 1.5, "path": "/"}
        response = self.client.post(vitals_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify no request log was created for performance endpoint
        self.assertEqual(ServerRequestLog.objects.count(), 0)

class LogManagementAndSecurityTestCase(BaseTenantAddonTestCase):
    def setUp(self):
        super().setUp()
        self.admin_user = User.objects.create_superuser(
            username="logadmin",
            email="logadmin@example.com",
            password="adminpassword123"
        )

    def test_list_logs_admin_success(self):
        url = reverse("performance-list-logs")
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertTrue(len(response.data) > 0)
        self.assertTrue(any(f["name"] == "tickets.log" for f in response.data))

    def test_list_logs_anonymous_denied(self):
        url = reverse("performance-list-logs")
        response = self.client.get(url)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_download_log_success(self):
        url = reverse("performance-download-log") + "?file=tickets.log"
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/plain; charset=utf-8")

    def test_download_log_path_traversal_prevention(self):
        self.client.force_authenticate(user=self.admin_user)
        invalid_files = [
            "../config/settings.py",
            "..\\..\\etc\\passwd",
            "/etc/passwd",
            "tickets.log/../../settings.py",
            "invalid_file.txt"
        ]
        for file_name in invalid_files:
            url = reverse("performance-download-log") + f"?file={file_name}"
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, f"Failed to reject: {file_name}")

    def test_sensitive_data_masking(self):
        from apps.common.utils import sanitize_sensitive_info
        raw_log = "User authenticated with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and api_key=secret_key_12345 & password=MySuperPassword"
        sanitized = sanitize_sensitive_info(raw_log)
        self.assertNotIn("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", sanitized)
        self.assertNotIn("secret_key_12345", sanitized)
        self.assertNotIn("MySuperPassword", sanitized)
        self.assertIn("[REDACTED_TOKEN]", sanitized)
        self.assertIn("[REDACTED]", sanitized)

    def test_safe_concurrent_rotating_file_handler_utf8(self):
        import logging
        from config.settings import SafeConcurrentRotatingFileHandler, LOGS_DIR

        test_log_path = LOGS_DIR / "test_concurrency.log"
        handler = SafeConcurrentRotatingFileHandler(
            str(test_log_path),
            maxBytes=1024,
            backupCount=2,
            encoding='utf-8'
        )
        logger = logging.getLogger("test_utf8_concurrency")
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

        # Write log with UTF-8 emojis and accents
        utf8_msg = "🚀 Néctar Labs test log con acentos y emojis 🌟 (Concurrencia multihilo)"
        logger.info(utf8_msg)

        # Verify file content
        handler.close()
        logger.removeHandler(handler)

        if test_log_path.exists():
            with open(test_log_path, 'r', encoding='utf-8') as f:
                content = f.read()
                self.assertIn("Néctar Labs test log", content)
                self.assertIn("🚀", content)

            # Cleanup test log
            try:
                test_log_path.unlink()
            except OSError:
                pass

