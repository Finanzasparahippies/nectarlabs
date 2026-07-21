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

        tenant = getattr(request.user, 'tenant', None)
        custom_backend_success = False
        result = None

        if tenant and tenant.custom_backend_url:
            import requests
            import logging
            logger = logging.getLogger("apps")
            
            target_base = tenant.custom_backend_url.rstrip('/')
            if not target_base.startswith('http://') and not target_base.startswith('https://'):
                scheme = 'https' if request.is_secure() else 'http'
                host = request.get_host()
                target_base = f"{scheme}://{host}{target_base}"
                
            target_url = f"{target_base}/api/courses/submit/"
            
            headers = {'Content-Type': 'application/json'}
            auth_header = request.headers.get('Authorization')
            if auth_header:
                headers['Authorization'] = auth_header
                
            try:
                logger.info(f"[SubmitExerciseView] Proxying evaluation to custom backend: {target_url}")
                response = requests.post(target_url, json=request.data, headers=headers, timeout=15)
                if response.status_code == 200:
                    result = response.json()
                    custom_backend_success = True
                else:
                    logger.warning(f"[SubmitExerciseView] Custom backend returned status code {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"[SubmitExerciseView] Error proxying to custom backend: {e}", exc_info=True)

        if not custom_backend_success:
            # Evaluar el código localmente en el sandbox
            result = evaluate_exercise(d['module_id'], d['code'])

        # Upsert: un registro por (user, course_slug, module_id)
        submission, _ = ExerciseSubmission.objects.update_or_create(
            user=request.user,
            course_slug=d['course_slug'],
            module_id=d['module_id'],
            defaults={
                'code': d['code'],
                'language': d['language'],
                'score': result.get('score', 0),
                'feedback': result.get('feedback', ''),
                'stdout': result.get('stdout', ''),
                'stderr': result.get('stderr', ''),
                'execution_time_ms': result.get('execution_time_ms', 0),
                'is_completed': result.get('is_completed', False),
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
