from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import ExerciseSubmission
from .serializers import (
    ExerciseSubmissionSerializer,
    ExerciseSubmitSerializer,
    CourseProgressSerializer,
)
from .evaluator import evaluate_exercise


class SubmitExerciseView(APIView):
    """
    POST /api/courses/submit/
    Recibe el código del alumno, lo evalúa (sandbox Docker + static),
    y hace upsert del resultado en ExerciseSubmission.

    Body JSON:
      { course_slug, module_id, code, language }

    Responde con el objeto ExerciseSubmission actualizado + score + feedback.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = ExerciseSubmitSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        # Evaluar el código
        result = evaluate_exercise(d['course_slug'], d['module_id'], d['code'])

        # Upsert: un registro por (user, course_slug, module_id)
        submission, _ = ExerciseSubmission.objects.update_or_create(
            user=request.user,
            course_slug=d['course_slug'],
            module_id=d['module_id'],
            defaults={
                'code': d['code'],
                'language': d['language'],
                'score': result['score'],
                'feedback': result['feedback'],
                'stdout': result['stdout'],
                'stderr': result['stderr'],
                'execution_time_ms': result['execution_time_ms'],
                'is_completed': result['is_completed'],
            }
        )

        return Response(
            ExerciseSubmissionSerializer(submission).data,
            status=status.HTTP_200_OK
        )


class CourseProgressView(APIView):
    """
    GET /api/courses/progress/?course_slug=ingeniero-python
    Retorna el progreso del usuario autenticado para el curso indicado.
    Responde con una lista de {module_id, score, is_completed, updated_at}.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        course_slug = request.query_params.get('course_slug', '')
        if not course_slug:
            return Response(
                {'error': 'Se requiere el parámetro course_slug.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        submissions = ExerciseSubmission.objects.filter(
            user=request.user,
            course_slug=course_slug,
        ).values('module_id', 'score', 'is_completed', 'updated_at')

        return Response(list(submissions), status=status.HTTP_200_OK)


class ExerciseDetailView(APIView):
    """
    GET /api/courses/submission/?course_slug=ingeniero-python&module_id=01
    Retorna la última entrega del alumno para un módulo específico,
    incluyendo el código guardado para pre-poblar el editor.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        course_slug = request.query_params.get('course_slug', '')
        module_id = request.query_params.get('module_id', '')

        if not course_slug or not module_id:
            return Response(
                {'error': 'Se requieren course_slug y module_id.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission = ExerciseSubmission.objects.filter(
            user=request.user,
            course_slug=course_slug,
            module_id=module_id,
        ).first()

        if not submission:
            return Response(None, status=status.HTTP_200_OK)

        return Response(
            ExerciseSubmissionSerializer(submission).data,
            status=status.HTTP_200_OK
        )
