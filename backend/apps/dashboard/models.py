import uuid
from django.db import models
from django.conf import settings

class Project(models.Model):
    class Status(models.TextChoices):
        MVP = 'MVP', 'MVP'
        STAGING = 'STAGING', 'Staging'
        PRODUCTION = 'PRODUCTION', 'Production'

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plan = models.ForeignKey('shop.Plan', on_delete=models.SET_NULL, null=True, blank=True, related_name='projects', help_text="Plan directly associated with this project")
    designer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_projects', limit_choices_to={'role': 'DESIGNER'}, help_text="Diseñador asignado")
    designer_plan = models.ForeignKey('shop.Plan', on_delete=models.SET_NULL, null=True, blank=True, related_name='designer_projects', help_text="Plan de diseño asociado")
    name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.MVP)
    staging_url = models.URLField(blank=True, null=True)
    production_url = models.URLField(blank=True, null=True)
    server_ip = models.GenericIPAddressField(blank=True, null=True)
    progress_percentage = models.IntegerField(default=0, help_text="Percentage of completion (0-100)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Activity tracking
    current_activity_start = models.DateTimeField(null=True, blank=True)
    current_activity_description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    @property
    def plan_hours(self):
        if self.plan:
            return self.plan.hours
        # Fallback to contract for legacy projects
        from apps.shop.models import Contract
        contract = Contract.objects.filter(user=self.client, is_active=True).first()
        return contract.plan.hours if (contract and contract.plan) else 0

    @property
    def designer_plan_hours(self):
        if self.designer_plan:
            return self.designer_plan.hours
        # Fallback to contract brand design tier
        from apps.shop.models import Contract
        contract = Contract.objects.filter(user=self.client, is_active=True).first()
        if contract:
            tier = contract.brand_design_tier
            if tier == Contract.BrandDesignTier.WEEKLY:
                return 5
            elif tier == Contract.BrandDesignTier.BIWEEKLY:
                return 10
            elif tier == Contract.BrandDesignTier.MONTHLY:
                return 20
        return 0

    @property
    def used_hours_current_month(self):
        from django.utils import timezone
        from django.db.models import Sum, Q
        start_of_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total = self.logs.filter(
            date__gte=start_of_month.date()
        ).filter(
            Q(user__isnull=True) | ~Q(user__role='DESIGNER')
        ).aggregate(Sum('hours'))['hours__sum'] or 0
        return float(total)

    @property
    def designer_used_hours_current_month(self):
        from django.utils import timezone
        from django.db.models import Sum
        start_of_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total = self.logs.filter(
            date__gte=start_of_month.date(),
            user__role='DESIGNER'
        ).aggregate(Sum('hours'))['hours__sum'] or 0
        return float(total)

    @property
    def remaining_hours_current_month(self):
        return max(0.0, float(self.plan_hours) - self.used_hours_current_month)

    @property
    def designer_remaining_hours_current_month(self):
        return max(0.0, float(self.designer_plan_hours) - self.designer_used_hours_current_month)

    @property
    def designer_email(self):
        return self.designer.email if self.designer else None

    @property
    def unlocked_milestones(self):
        from django.utils import timezone
        plan_h = float(self.plan_hours)
        if plan_h <= 0:
            return []
        
        used_h = self.used_hours_current_month
        start_of_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Get milestones already delivered this month
        delivered = set(self.advances.filter(
            delivered_at__gte=start_of_month
        ).values_list('milestone', flat=True))
        
        milestones = [
            ('25', 0.25),
            ('50', 0.50),
            ('75', 0.75),
            ('100', 1.00)
        ]
        
        unlocked = []
        for key, fraction in milestones:
            if used_h >= (plan_h * fraction) and key not in delivered:
                unlocked.append(key)
                
        return unlocked

class TimeLog(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='time_logs')
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.TextField()

    def __str__(self):
        return f"{self.project.name} - {self.date} ({self.hours}h)"

class ProjectAdvance(models.Model):
    class Milestone(models.TextChoices):
        M25 = '25', '25%'
        M50 = '50', '50%'
        M75 = '75', '75%'
        M100 = '100', '100%'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='advances')
    milestone = models.CharField(max_length=10, choices=Milestone.choices)
    title = models.CharField(max_length=200)
    description = models.TextField()
    delivered_at = models.DateTimeField(auto_now_add=True)
    delivered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.project.name} - Avance {self.milestone}% ({self.delivered_at.strftime('%Y-%m')})"

class FAQ(models.Model):
    class Category(models.TextChoices):
        TECHNICAL = 'TECHNICAL', 'Technical'
        BILLING = 'BILLING', 'Billing'
        GENERAL = 'GENERAL', 'General'

    question = models.CharField(max_length=255)
    answer = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL)

    def __str__(self):
        return self.question

class ServerCost(models.Model):
    class Provider(models.TextChoices):
        HETZNER = 'HETZNER', 'Hetzner'
        AWS = 'AWS', 'AWS'
        SUPABASE = 'SUPABASE', 'Supabase'
        CLOUDFLARE = 'CLOUDFLARE', 'Cloudflare'
        ZOHO = 'ZOHO', 'Zoho Mail'
        DOMAIN = 'DOMAIN', 'Registro de Dominio'
        OTHER = 'OTHER', 'Otro'

    provider = models.CharField(max_length=50, choices=Provider.choices, default=Provider.OTHER)
    name = models.CharField(max_length=150, help_text="Ej: VPS 2GB, Base de datos Supabase, Google Workspace")
    cost = models.DecimalField(max_digits=10, decimal_places=2, help_text="Costo mensual o anual en USD")
    billing_cycle = models.CharField(max_length=20, default="Monthly", choices=[("Monthly", "Mensual"), ("Yearly", "Anual")])
    next_payment_date = models.DateField(help_text="Próxima fecha límite de pago")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_provider_display()} - {self.name} (${self.cost})"

class BusinessExpense(models.Model):
    name = models.CharField(max_length=150, help_text="Ej: Github Copilot, OpenAI API, Herramientas de Diseño")
    cost = models.DecimalField(max_digits=10, decimal_places=2, help_text="Costo mensual o anual en USD")
    billing_cycle = models.CharField(max_length=20, default="Monthly", choices=[("Monthly", "Mensual"), ("Yearly", "Anual")])
    next_payment_date = models.DateField(help_text="Próxima fecha de cobro")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (${self.cost})"

class ProjectQuote(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Borrador'
        SENT = 'SENT', 'Enviado'
        APPROVED = 'APPROVED', 'Aprobado'
        REJECTED = 'REJECTED', 'Rechazado'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='quotes'
    )
    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_quotes',
        help_text="Vendedor asignado"
    )
    client_name = models.CharField(max_length=200, help_text="Nombre o Razón Social del prospecto/cliente")
    client_email = models.EmailField(help_text="Email de contacto para la cotización")
    project_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True, help_text="Descripción o alcance general")
    modules = models.JSONField(
        default=list, 
        help_text="Listado de módulos de funcionalidad cotizados. Formato: [{'name': '...', 'description': '...', 'price': 123.00}]"
    )
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    estimated_delivery_weeks = models.PositiveIntegerField(default=4, help_text="Semanas estimadas de desarrollo")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    pdf_file = models.FileField(upload_to='project_quotes_pdf/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cotización: {self.project_name} - {self.client_name} (${self.total_price})"


class Lead(models.Model):
    class Status(models.TextChoices):
        PROSPECT = 'PROSPECT', 'Prospecto'
        CONTACTED = 'CONTACTED', 'Contactado'
        PROPOSAL = 'PROPOSAL', 'Propuesta Presentada'
        WON = 'WON', 'Ganado'
        LOST = 'LOST', 'Perdido'

    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    project_idea = models.TextField(blank=True, null=True)
    estimated_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROSPECT)
    notes = models.TextField(blank=True, null=True)
    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leads',
        help_text="Vendedor asignado a este prospecto"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.status} (${self.estimated_value})"


