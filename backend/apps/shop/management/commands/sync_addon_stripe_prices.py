from django.core.management.base import BaseCommand
from apps.shop.models import AddOn

class Command(BaseCommand):
    help = 'Syncs Stripe prices for all AddOn objects, clearing and regenerating mismatched price IDs'

    def handle(self, *args, **options):
        addons = AddOn.objects.all()
        self.stdout.write(f"Found {addons.count()} addons to process.")
        for addon in addons:
            self.stdout.write(f"Syncing addon: {addon.name} (Slug: {addon.slug}, Monthly: {addon.monthly_price}, Yearly: {addon.yearly_price})")
            old_price_id = addon.stripe_price_id
            old_yearly_price_id = addon.stripe_yearly_price_id
            
            addon.save()
            
            if old_price_id != addon.stripe_price_id or old_yearly_price_id != addon.stripe_yearly_price_id:
                self.stdout.write(self.style.SUCCESS(
                    f"✓ Re-synced prices for {addon.name}:\n"
                    f"  Monthly Price ID: {old_price_id} -> {addon.stripe_price_id}\n"
                    f"  Yearly Price ID: {old_yearly_price_id} -> {addon.stripe_yearly_price_id}"
                ))
            else:
                self.stdout.write(self.style.SUCCESS(f"✓ No change required for {addon.name}."))
