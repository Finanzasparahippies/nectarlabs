from rest_framework import serializers
from .models import ExerciseSubmission


class ExerciseSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseSubmission
        fields = [
            'id', 'course_slug', 'module_id', 'code', 'language',
            'score', 'feedback', 'stdout', 'stderr',
            'execution_time_ms', 'is_completed',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'score', 'feedback', 'stdout', 'stderr',
            'execution_time_ms', 'is_completed', 'created_at', 'updated_at',
        ]


class ExerciseSubmitSerializer(serializers.Serializer):
    """Serializer de entrada para el endpoint de submit."""
    course_slug = serializers.SlugField(max_length=100)
    module_id = serializers.CharField(max_length=10)
    code = serializers.CharField(
        max_length=50_000,
        allow_blank=False,
        trim_whitespace=False,
    )
    language = serializers.ChoiceField(
        choices=['python', 'typescript', 'elixir', 'yaml', 'hcl'],
        default='python',
    )


class CourseProgressSerializer(serializers.Serializer):
    """Serializer de salida para el progreso del curso."""
    module_id = serializers.CharField()
    score = serializers.IntegerField()
    is_completed = serializers.BooleanField()
    updated_at = serializers.DateTimeField()


class CourseModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseModule
        fields = [
            'id', 'module_id', 'title', 'badge', 'folder',
            'teoria', 'ejemplos', 'ejercicios', 'language'
        ]

