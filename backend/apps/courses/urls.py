from django.urls import path
from .views import SubmitExerciseView, CourseProgressView, ExerciseDetailView

urlpatterns = [
    path('submit/', SubmitExerciseView.as_view(), name='course_submit'),
    path('progress/', CourseProgressView.as_view(), name='course_progress'),
    path('submission/', ExerciseDetailView.as_view(), name='course_submission_detail'),
]
