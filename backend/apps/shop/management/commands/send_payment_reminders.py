from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.shop.models import PaymentInstallment
from apps.shop.utils import send_payment_reminder_email

class Command(BaseCommand):
    help = 'Sends payment reminders to clients with pending installments due in 3 days or less'

    def handle(self, *args, **options):
        today = timezone.now().date()
        reminder_threshold = today + timedelta(days=3)
        
        # Query installments that are PENDING, reminder not yet sent, and due date is close or overdue
        installments = PaymentInstallment.objects.filter(
            status=PaymentInstallment.Status.PENDING,
            reminder_sent=False,
            due_date__lte=reminder_threshold
        ).select_related('contract__user')

        self.stdout.write(f"[{timezone.now().isoformat()}] Found {installments.count()} pending installments to process for reminders.")

        sent_count = 0
        failed_count = 0

        for inst in installments:
            self.stdout.write(f"Processing installment #{inst.id} for {inst.contract.full_name} (Due: {inst.due_date})")
            success = send_payment_reminder_email(inst)
            if success:
                inst.reminder_sent = True
                inst.save(update_fields=['reminder_sent'])
                sent_count += 1
                self.stdout.write(self.style.SUCCESS(f"✓ Sent payment reminder to {inst.contract.user.email}"))
            else:
                failed_count += 1
                self.stdout.write(self.style.ERROR(f"✗ Failed to send reminder for installment #{inst.id}"))

        self.stdout.write(self.style.SUCCESS(
            f"Reminders processing finished. Sent: {sent_count}, Failed: {failed_count}."
        ))
