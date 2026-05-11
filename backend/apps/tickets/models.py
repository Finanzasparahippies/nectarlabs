from django.db import models
from django.conf import settings

class Ticket(models.Model):
    class Category(models.TextChoices):
        IMPLEMENTATION = 'IMPLEMENTATION', 'Implementación'
        IDEA = 'IDEA', 'Nueva Idea'
        QUESTION = 'QUESTION', 'Pregunta'
        ISSUE = 'ISSUE', 'Problema Técnico'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Abierto'
        IN_PROGRESS = 'IN_PROGRESS', 'En Progreso'
        RESOLVED = 'RESOLVED', 'Resuelto'
        CLOSED = 'CLOSED', 'Cerrado'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Baja'
        MEDIUM = 'MEDIUM', 'Media'
        HIGH = 'HIGH', 'Alta'
        URGENT = 'URGENT', 'Urgente'

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tickets')
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.QUESTION)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.category}] {self.title} ({self.status})"

class Message(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.sender.email} on Ticket #{self.ticket.id}"
