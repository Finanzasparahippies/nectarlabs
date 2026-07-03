from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Contract
import logging

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------------------
# SEÑAL DE SOCIO Y PROYECTO (AUTOMATED PROVISIONING)
# Escucha el evento post_save del modelo Contract para crear el Proyecto (MVP)
# en el dashboard del cliente una vez que el contrato ha sido firmado por ambas partes.
# ------------------------------------------------------------------------------

@receiver(post_save, sender=Contract)
def create_project_on_fully_signed_contract(sender, instance, created, **kwargs):
    """
    Callback disparado después de guardar un contrato.
    Valida si el contrato se encuentra firmado tanto por el cliente como por el desarrollador
    (is_fully_signed = True) para provisionar el ecosistema digital del cliente.
    """
    if instance.is_fully_signed:
        from apps.dashboard.models import Project
        
        # Determinar el nombre del proyecto de desarrollo modular
        plan_name = instance.plan.name if instance.plan else 'Ecosistema'
        project_name = f"Ecosistema {plan_name} - {instance.full_name}"
        
        # Matriz de Edge Cases - Idempotencia:
        # Busca si ya existe un proyecto asignado a este contrato/plan/usuario para evitar duplicados
        # si se vuelve a guardar el contrato en el panel de administración.
        project, project_created = Project.objects.get_or_create(
            client=instance.user,
            plan=instance.plan,
            defaults={
                'name': project_name,
                'status': Project.Status.MVP,       # Estatus inicial: MVP
                'is_active': True,
                'progress_percentage': 0,
            }
        )
        
        if project_created:
            logger.info(f"Project '{project_name}' automatically generated for Contract #{instance.id}.")
