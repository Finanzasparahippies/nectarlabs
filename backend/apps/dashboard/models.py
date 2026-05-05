from django.db import models
from django.conf import settings

class Project(models.Model):
    class Status(models.TextChoices):
        MVP = 'MVP', 'MVP'
        STAGING = 'STAGING', 'Staging'
        PRODUCTION = 'PRODUCTION', 'Production'

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.MVP)
    staging_url = models.URLField(blank=True, null=True)
    production_url = models.URLField(blank=True, null=True)
    server_ip = models.GenericIPAddressField(blank=True, null=True)
    progress_percentage = models.IntegerField(default=0, help_text="Percentage of completion (0-100)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return self.name

class TimeLog(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='logs')
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.TextField()

    def __str__(self):
        return f"{self.project.name} - {self.date} ({self.hours}h)"

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
