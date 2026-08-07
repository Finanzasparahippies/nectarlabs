from django.test import TestCase
from apps.common.utils import sanitize_sensitive_info

class CommonUtilsTestCase(TestCase):
    def test_sanitize_sensitive_info_empty(self):
        self.assertEqual(sanitize_sensitive_info(None), "")
        self.assertEqual(sanitize_sensitive_info(""), "")

    def test_sanitize_bearer_token(self):
        text = "Authorization: Bearer secret_jwt_token_here_12345"
        result = sanitize_sensitive_info(text)
        self.assertIn("Authorization: Bearer [REDACTED_TOKEN]", result)
        self.assertNotIn("secret_jwt_token_here_12345", result)

    def test_sanitize_credentials_and_api_keys(self):
        text = "Connecting with api_key=sk_live_123456789 and client_secret=sec_abc123"
        result = sanitize_sensitive_info(text)
        self.assertIn("api_key=[REDACTED]", result)
        self.assertIn("client_secret=[REDACTED]", result)
        self.assertNotIn("sk_live_123456789", result)
        self.assertNotIn("sec_abc123", result)
