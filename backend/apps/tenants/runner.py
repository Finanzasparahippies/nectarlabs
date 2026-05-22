from django.conf import settings
from django.db import connection
from django.test.runner import DiscoverRunner

class TenantTestRunner(DiscoverRunner):
    def teardown_databases(self, old_config, **kwargs):
        """
        Terminate any other active database connections to the test database
        before attempting to drop it. This avoids the psycopg2 'ObjectInUse' 
        exception when Django attempts to drop the test database.
        """
        # Only run this if the engine is PostgreSQL
        if settings.DATABASES['default']['ENGINE'] == 'django.db.backends.postgresql':
            # At this phase, connection.settings_dict['NAME'] is already the test database name (e.g. 'test_postgres')
            test_db_name = connection.settings_dict.get('NAME')
            if not test_db_name:
                test_db_name = settings.DATABASES['default'].get('NAME')


            print(f"\n[TenantTestRunner] Terminating lingering connections to test database: {test_db_name}...")
            try:
                # Terminate other sessions using this database (excluding our own session pid)
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                        "WHERE datname = %s AND pid <> pg_backend_pid();",
                        [test_db_name]
                    )
                print("[TenantTestRunner] Lingering connections terminated successfully.")
            except Exception as e:
                print(f"[TenantTestRunner] Warning: Could not terminate connections: {e}")

        super().teardown_databases(old_config, **kwargs)
