from django.apps import AppConfig


class DashboardConfig(AppConfig):
    name = 'apps.dashboard'

    def ready(self):
        import apps.dashboard.signals
