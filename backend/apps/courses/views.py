from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

import json
import re
import logging
from django.conf import settings

from .models import ExerciseSubmission, Course, CourseModule
from .serializers import (
    ExerciseSubmissionSerializer,
    ExerciseSubmitSerializer,
    CourseProgressSerializer,
    CourseModuleSerializer,
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


MODULES_METADATA = {
    "00": {"title": "Preparación IA y Berribot", "folder": "00_preparacion_ia_y_berribot", "language": "python"},
    "01": {"title": "Python Avanzado y Edge Cases", "folder": "01_python_avanzado", "language": "python"},
    "02": {"title": "Concurrencia, Paralelismo y Rendimiento", "folder": "02_concurrencia_y_rendimiento", "language": "python"},
    "03": {"title": "Diseño Orientado a Objetos y Arquitectura Limpia", "folder": "03_diseno_y_arquitectura", "language": "python"},
    "04": {"title": "Robustez, Calidad de Código y Testing", "folder": "04_robustez_y_testing", "language": "python"},
    "05": {"title": "Bases de Datos, ORMs y APIs Modernas", "folder": "05_bases_de_datos_y_apis", "language": "python"},
    "06": {"title": "Retos Algorítmicos y Optimización Big-O", "folder": "06_retos_algoritmicos", "language": "python"},
    "07": {"title": "Sistemas Distribuidos y Estrategias de Caché", "folder": "07_sistemas_distribuidos", "language": "python"},
    "08": {"title": "Tips, Tricks y Secretos Ocultos de Python", "folder": "08_tips_and_tricks", "language": "python"},
    "09": {"title": "Machine Learning, Pipelines y Teorema de Bayes", "folder": "09_machine_learning_y_bayes", "language": "python"},
    "10": {"title": "TypeScript Backend Development", "folder": "10_typescript_backend", "language": "typescript"},
    "11": {"title": "Elixir, Concurrencia Ligera y OTP", "folder": "11_elixir_concurrencia_otp", "language": "elixir"},
    "12": {"title": "Arquitectura AWS, Microservicios y DevOps", "folder": "12_arquitectura_aws_devops", "language": "yaml"}
}

def load_and_seed_course_data():
    """
    Auto-puebla los módulos y la teoría en la base de datos a partir de course_data.js.
    """
    import os
    import json

    # 1. Asegurar el curso global de Python
    course, _ = Course.objects.get_or_create(
        slug='ingeniero-python',
        defaults={
            'title': 'Curso de Ingeniería Python',
            'description': 'Curso avanzado de desarrollo de software, patrones de diseño y edge cases en Python.'
        }
    )

    # 2. Si no hay módulos cargados, realizar el seed
    if not CourseModule.objects.filter(course=course).exists():
        js_path = os.path.join(os.path.dirname(__file__), "course_data.js")
        if not os.path.exists(js_path):
            logger.error(f"Archivo de seed no encontrado en {js_path}")
            return

        try:
            with open(js_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Extraer el JSON del archivo JS
            start_idx = content.find("const COURSE_DATA =")
            if start_idx == -1:
                logger.error("No se encontró la constante COURSE_DATA en course_data.js")
                return

            json_str = content[start_idx + len("const COURSE_DATA ="):].strip()
            if json_str.endswith(";"):
                json_str = json_str[:-1]

            data = json.loads(json_str)

            for mod_id, mod_content in data.items():
                meta = MODULES_METADATA.get(mod_id, {
                    "title": f"Módulo {mod_id}",
                    "folder": f"{mod_id}_modulo",
                    "language": "python"
                })

                CourseModule.objects.update_or_create(
                    course=course,
                    module_id=mod_id,
                    defaults={
                        'title': meta['title'],
                        'badge': f"MÓDULO {mod_id}",
                        'folder': meta['folder'],
                        'teoria': mod_content.get('teoria', ''),
                        'ejemplos': mod_content.get('ejemplos', ''),
                        'ejercicios': mod_content.get('ejercicios', ''),
                        'language': meta['language']
                    }
                )
            logger.info("Base de datos de cursos poblada exitosamente desde course_data.js")
        except Exception as e:
            logger.error(f"Error al realizar el seed de cursos: {str(e)}")


class CourseModuleListView(APIView):
    """
    GET /api/courses/modules/?course_slug=ingeniero-python
    Retorna la lista de módulos disponibles para un curso.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        course_slug = request.query_params.get('course_slug', 'ingeniero-python')

        # Auto-poblar de ser necesario
        load_and_seed_course_data()

        modules = CourseModule.objects.filter(course_id=course_slug).order_by('module_id')

        # Lista liviana
        data = [{
            'module_id': m.module_id,
            'title': m.title,
            'badge': m.badge,
            'folder': m.folder,
            'language': m.language
        } for m in modules]

        return Response(data, status=status.HTTP_200_OK)


class CourseModuleDetailView(APIView):
    """
    GET /api/courses/modules/<module_id>/?course_slug=ingeniero-python
    Retorna el contenido detallado de un módulo específico.
    """
    permission_classes = [AllowAny]

    def get(self, request, module_id):
        course_slug = request.query_params.get('course_slug', 'ingeniero-python')

        # Auto-poblar de ser necesario
        load_and_seed_course_data()

        module = CourseModule.objects.filter(course_id=course_slug, module_id=module_id).first()
        if not module:
            return Response(
                {'error': f'Módulo {module_id} no encontrado para el curso {course_slug}.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = CourseModuleSerializer(module)
        return Response(serializer.data, status=status.HTTP_200_OK)

