from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch
from apps.courses.models import ExerciseSubmission
from apps.courses.evaluator import evaluate_exercise

User = get_user_model()

class CoursesAPITests(APITestCase):
    def setUp(self):
        # Create a user to test authentication
        self.user = User.objects.create_user(
            email="student@nectarlabs.dev",
            username="student",
            password="testpassword123"
        )
        self.client.force_authenticate(user=self.user)
        self.course_slug = "ingeniero-python"

    def test_submit_exercise_static_success(self):
        """
        Verify that submitting an exercise with static evaluation (keywords) works,
        saves the submission in the database, and returns correct score and feedback.
        """
        # Module 00 is static-only (not executable)
        # Keywords expected: try, except, backoff, wraps, docker, venv
        valid_code = """
        try:
            import tenacity
            import functools
            # wraps docker venv
        except Exception as e:
            pass
        """
        url = reverse('course_submit')
        response = self.client.post(
            url,
            data={
                'course_slug': self.course_slug,
                'module_id': '00',
                'code': valid_code,
                'language': 'python'
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('score', response.data)
        self.assertGreaterEqual(response.data['score'], 60)
        self.assertTrue(response.data['is_completed'])
        self.assertIn('try', response.data['feedback'])

        # Verify DB entry was created
        submission = ExerciseSubmission.objects.get(
            user=self.user,
            course_slug=self.course_slug,
            module_id='00'
        )
        self.assertEqual(submission.score, response.data['score'])
        self.assertEqual(submission.code, valid_code)

    @patch('apps.courses.evaluator._run_in_docker_sandbox')
    def test_submit_exercise_sandbox_success(self, mock_sandbox):
        """
        Verify that an executable exercise runs in the docker sandbox when mocked,
        returns code details and outputs correctly, and saves progress.
        """
        mock_sandbox.return_value = {
            "stdout": "TEST_PASS: limitar_llamadas correcto",
            "stderr": "",
            "exit_code": 0,
            "execution_time_ms": 45,
        }

        # Module 01 is executable and requires 'limitar_llamadas', 'limpiar_datos', 'filtrar_por_precio', 'bloqueo_recurso', 'wraps', 'yield'
        valid_code = """
        # limitar_llamadas limpiar_datos filtrar_por_precio bloqueo_recurso wraps yield
        def limitar_llamadas():
            pass
        """

        url = reverse('course_submit')
        response = self.client.post(
            url,
            data={
                'course_slug': self.course_slug,
                'module_id': '01',
                'code': valid_code,
                'language': 'python'
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['score'], 60)
        self.assertTrue(response.data['is_completed'])
        self.assertEqual(response.data['stdout'], "TEST_PASS: limitar_llamadas correcto")
        mock_sandbox.assert_called_once()

    def test_course_progress_endpoint(self):
        """
        Verify the course progress endpoint returns correct completion statuses.
        """
        # Create dummy submissions
        ExerciseSubmission.objects.create(
            user=self.user,
            course_slug=self.course_slug,
            module_id='01',
            code='print("hello")',
            score=80,
            is_completed=True
        )
        ExerciseSubmission.objects.create(
            user=self.user,
            course_slug=self.course_slug,
            module_id='02',
            code='print("world")',
            score=30,
            is_completed=False
        )

        url = reverse('course_progress')
        response = self.client.get(url, {'course_slug': self.course_slug})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # Verify specific items
        mod_01 = next(item for item in response.data if item['module_id'] == '01')
        self.assertTrue(mod_01['is_completed'])
        self.assertEqual(mod_01['score'], 80)

        mod_02 = next(item for item in response.data if item['module_id'] == '02')
        self.assertFalse(mod_02['is_completed'])
        self.assertEqual(mod_02['score'], 30)

    def test_exercise_submission_detail_endpoint(self):
        """
        Verify the detail view pre-populates/retrieves student's code.
        """
        ExerciseSubmission.objects.create(
            user=self.user,
            course_slug=self.course_slug,
            module_id='05',
            code='dummy_code_to_load = True',
            score=95,
            is_completed=True
        )

        url = reverse('course_submission_detail')
        response = self.client.get(
            url,
            {'course_slug': self.course_slug, 'module_id': '05'}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data)
        self.assertEqual(response.data['code'], 'dummy_code_to_load = True')
        self.assertEqual(response.data['score'], 95)

    def test_unauthenticated_access_denied(self):
        """
        Verify that requests without authorization token are rejected.
        """
        self.client.force_authenticate(user=None)
        
        # Submit
        response_submit = self.client.post(
            reverse('course_submit'),
            data={'course_slug': self.course_slug, 'module_id': '00', 'code': 'pass'}
        )
        self.assertEqual(response_submit.status_code, status.HTTP_401_UNAUTHORIZED)

        # Progress
        response_progress = self.client.get(reverse('course_progress'))
        self.assertEqual(response_progress.status_code, status.HTTP_401_UNAUTHORIZED)
