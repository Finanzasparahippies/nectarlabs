from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Contract
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Contract)
def create_project_on_fully_signed_contract(sender, instance, created, **kwargs):
    # Only generate the project if the contract is fully signed
    if instance.is_fully_signed:
        from apps.dashboard.models import Project
        
        # Determine name of the project
        plan_name = instance.plan.name if instance.plan else 'Ecosistema'
        project_name = f"Ecosistema {plan_name} - {instance.full_name}"
        
        # Check if project already exists for this contract client and plan to prevent duplication
        project, project_created = Project.objects.get_or_create(
            client=instance.user,
            plan=instance.plan,
            defaults={
                'name': project_name,
                'status': Project.Status.MVP,
                'is_active': True,
                'progress_percentage': 0,
            }
        )
        
        if project_created:
            logger.info(f"Project '{project_name}' automatically generated for Contract #{instance.id}.")
