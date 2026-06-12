"""
Management command to test addon subscription notifications manually.

Usage:
    docker exec nectar_backend_staging python manage.py test_addon_notification <user_id> <addon_id>

Example:
    docker exec nectar_backend_staging python manage.py test_addon_notification 13 1
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Test addon subscription notification: sends email to soporte@ and broadcasts realtime event'

    def add_arguments(self, parser):
        parser.add_argument('user_id', type=int, help='ID of the user who subscribed')
        parser.add_argument('addon_id', type=int, help='ID of the addon subscribed to')

    def handle(self, *args, **options):
        from apps.shop.models import AddOn
        from apps.shop.utils import notify_support_addon_subscription

        User = get_user_model()

        # Fetch user
        try:
            user = User.objects.get(id=options['user_id'])
        except User.DoesNotExist:
            raise CommandError(f"User with id={options['user_id']} not found.")

        # Fetch addon
        try:
            addon = AddOn.objects.get(id=options['addon_id'])
        except AddOn.DoesNotExist:
            raise CommandError(f"AddOn with id={options['addon_id']} not found.")

        # Resolve tenant
        tenant = None
        try:
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.filter(owner=user).first()
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Could not resolve tenant: {e}'))

        self.stdout.write(f'Testing notification for: {user.email} | addon: {addon.name} | tenant: {tenant}')

        try:
            notify_support_addon_subscription(user, addon, tenant=tenant)
            self.stdout.write(self.style.SUCCESS('✓ notify_support_addon_subscription() completed without exception.'))
        except Exception as e:
            raise CommandError(f'notify_support_addon_subscription() raised: {e}')
