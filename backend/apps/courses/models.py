import uuid
from django.db import models
from django.conf import settings


class Course(models.Model):
    """
    Representa un curso en la plataforma.
    """
    slug = models.SlugField(max_length=100, unique=True, primary_key=True, help_text="Identificador único del curso, ej: 'ingeniero-python'")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='courses',
        null=True,
        blank=True,
        help_text="Tenant propietario del curso (nulo si es un curso global de Nectar Labs)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Curso'
        verbose_name_plural = 'Cursos'

    def __str__(self):
        return self.title


class CourseModule(models.Model):
    """
    Representa un módulo temático dentro de un curso, almacenando su teoría,
    ejemplos y ejercicios en la base de datos.
    """
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    module_id = models.CharField(max_length=10, help_text="ID del módulo, ej: '01', '02'")
    title = models.CharField(max_length=255)
    badge = models.CharField(max_length=50, help_text="Badge del módulo, ej: 'MÓDULO 01'")
    folder = models.CharField(max_length=150, help_text="Nombre de la carpeta del módulo")
    teoria = models.TextField(blank=True, help_text="Contenido teórico en Markdown")
    ejemplos = models.TextField(blank=True, help_text="Código de ejemplo")
    ejercicios = models.TextField(blank=True, help_text="Código base del ejercicio")
    language = models.CharField(max_length=20, default='python')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('course', 'module_id')
        ordering = ['course', 'module_id']
        verbose_name = 'Módulo de Curso'
        verbose_name_plural = 'Módulos de Cursos'

    def __str__(self):
        return f"{self.course.title} | {self.badge} - {self.title}"


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
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='exercise_submissions',
        null=True,
        blank=True,
        help_text="Tenant en el cual se almacena el progreso de este ejercicio"
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
        unique_together = ('user', 'course_slug', 'module_id', 'tenant')
        ordering = ['course_slug', 'module_id']
        verbose_name = 'Entrega de Ejercicio'
        verbose_name_plural = 'Entregas de Ejercicios'

    def __str__(self):
        return f"{self.user.email} | {self.course_slug} | Módulo {self.module_id} | {self.score}%"
