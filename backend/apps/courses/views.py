from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

import json
import re
import logging
from django.conf import settings

from .models import ExerciseSubmission
from .serializers import (
    ExerciseSubmissionSerializer,
    ExerciseSubmitSerializer,
    CourseProgressSerializer,
)
from .evaluator import evaluate_exercise
from .conceptual_data import CONCEPTUAL_SCENARIOS

logger = logging.getLogger("apps")


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


class EvaluateConceptualView(APIView):
    """
    POST /api/courses/evaluate-conceptual/
    Evalúa la respuesta conceptual del alumno para un escenario específico
    utilizando Groq (Llama 3.1) o un fallback local basado en keywords si la API no está disponible.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        module_id = request.data.get("module_id")
        respuesta_alumno = request.data.get("respuesta_alumno", "").strip()

        if not module_id or not respuesta_alumno:
            return Response(
                {"error": "Se requieren los parámetros 'module_id' y 'respuesta_alumno'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        scenario = CONCEPTUAL_SCENARIOS.get(module_id)
        if not scenario:
            return Response(
                {"error": f"No existe un escenario conceptual definido para '{module_id}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        pregunta = scenario["pregunta"]
        respuesta_modelo = scenario["respuesta_modelo"]
        conceptos_clave = scenario["conceptos_clave"]

        # Intentar evaluación con LLM (Groq)
        api_key = getattr(settings, 'GROQ_API_KEY', '') or ''
        if api_key:
            try:
                from groq import Groq
                client = Groq(api_key=api_key)

                conceptos_nombres = [c["nombre"] for c in conceptos_clave]

                prompt_sistema = (
                    "Eres un evaluador académico experto en desarrollo de software y computación.\n"
                    "Tu tarea es evaluar la respuesta de un estudiante comparándola con la respuesta esperada y la pregunta.\n"
                    "Debes responder ESTRICTAMENTE en formato JSON plano sin bloques de código markdown ni texto adicional. "
                    "El JSON debe tener exactamente esta estructura:\n"
                    "{\n"
                    '  "idea_principal": true/false,\n'
                    '  "conceptos": [\n'
                    '    {"nombre": "Nombre del Concepto", "cumple": true/false}\n'
                    '  ],\n'
                    '  "errores": ["Descripción del error conceptual o lo que falta"],\n'
                    '  "score": 0 a 100,\n'
                    '  "justificacion": "Retroalimentación detallada y constructiva en español"\n'
                    "}\n\n"
                    "Los conceptos que debes evaluar en la lista 'conceptos' son exactamente los siguientes:\n"
                    f"{json.dumps(conceptos_nombres, ensure_ascii=False)}\n\n"
                    "Sé justo pero riguroso. Si el estudiante transmite la misma idea con sinónimos o explicaciones propias, "
                    "márcalo como que cumple. Si confunde términos o dice cosas incorrectas, añade la descripción en 'errores'."
                )

                prompt_usuario = (
                    f"Pregunta:\n{pregunta}\n\n"
                    f"Respuesta Modelo / Esperada:\n{respuesta_modelo}\n\n"
                    f"Respuesta del Alumno:\n{respuesta_alumno}\n"
                )

                completion = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": prompt_sistema},
                        {"role": "user", "content": prompt_usuario}
                    ],
                    model="llama-3.1-8b-instant",
                    temperature=0.2,
                    max_tokens=600,
                    response_format={"type": "json_object"}
                )

                response_text = completion.choices[0].message.content.strip()
                result = json.loads(response_text)
                
                # Validar la estructura mínima del resultado
                if all(k in result for k in ["idea_principal", "conceptos", "errores", "score", "justificacion"]):
                    # Asegurar tipos
                    result["score"] = int(result["score"])
                    result["idea_principal"] = bool(result["idea_principal"])
                    return Response(result, status=status.HTTP_200_OK)

            except Exception as e:
                logger.error(f"[ConceptualEval] Error en la llamada al LLM Groq: {e}", exc_info=True)
                # Fallback al evaluador local en caso de error

        # Fallback local basado en expresiones regulares / keywords
        logger.info(f"[ConceptualEval] Ejecutando evaluación por fallback local para '{module_id}'")
        conceptos_evaluados = []
        matched_count = 0

        for concepto in conceptos_clave:
            nombre = concepto["nombre"]
            keywords = concepto["keywords"]
            
            # Buscar coincidencia
            cumple = False
            for kw in keywords:
                pattern = re.compile(r'\b' + re.escape(kw) + r'\b|' + re.escape(kw), re.IGNORECASE)
                if pattern.search(respuesta_alumno):
                    cumple = True
                    break

            if cumple:
                matched_count += 1

            conceptos_evaluados.append({
                "nombre": nombre,
                "cumple": cumple
            })

        total_conceptos = len(conceptos_clave)
        score = round((matched_count / total_conceptos) * 100) if total_conceptos > 0 else 50
        idea_principal = score >= 50

        # Identificar conceptos faltantes para darlos como feedback o errores
        conceptos_faltantes = [c["nombre"] for c in conceptos_evaluados if not c["cumple"]]
        errores = []
        if conceptos_faltantes:
            errores.append(f"Faltó profundizar en: {', '.join(conceptos_faltantes)}")

        justificacion = (
            "Evaluación automatizada basada en términos clave y conceptos fundamentales de diseño. "
            "[Modo de respaldo local activo]"
        )

        return Response({
            "idea_principal": idea_principal,
            "conceptos": conceptos_evaluados,
            "errores": errores,
            "score": score,
            "justificacion": justificacion
        }, status=status.HTTP_200_OK)

