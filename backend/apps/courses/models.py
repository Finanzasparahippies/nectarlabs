import uuid
from django.db import models
from django.conf import settings


class ExerciseSubmission(models.Model):
    """
    Almacena el último intento de ejercicio de un alumno por módulo.
    unique_together garantiza un solo registro activo (upsert por update_or_create).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='exercise_submissions'
    )
    course_slug = models.SlugField(
        max_length=100,
        help_text="Identificador del curso, ej: 'ingeniero-python'"
    )
    module_id = models.CharField(
        max_length=10,
        help_text="ID del módulo, ej: '01', '02'"
    )
    code = models.TextField(
        help_text="Código escrito por el alumno"
    )
    language = models.CharField(
        max_length=20,
        default='python',
        help_text="Lenguaje del ejercicio: python, typescript, elixir, yaml, hcl"
    )
    score = models.PositiveSmallIntegerField(
        default=0,
        help_text="Puntaje de 0 a 100 otorgado por el evaluador"
    )
    feedback = models.TextField(
        blank=True,
        help_text="Retroalimentación detallada del evaluador"
    )
    stdout = models.TextField(
        blank=True,
        help_text="Salida estándar del sandbox de ejecución"
    )
    stderr = models.TextField(
        blank=True,
        help_text="Salida de error del sandbox de ejecución"
    )
    execution_time_ms = models.PositiveIntegerField(
        default=0,
        help_text="Tiempo de ejecución en milisegundos"
    )
    is_completed = models.BooleanField(
        default=False,
        help_text="True si el score >= 60 (umbral de aprobación)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'course_slug', 'module_id')
        ordering = ['course_slug', 'module_id']
        verbose_name = 'Entrega de Ejercicio'
        verbose_name_plural = 'Entregas de Ejercicios'

    def __str__(self):
        return f"{self.user.email} | {self.course_slug} | Módulo {self.module_id} | {self.score}%"
