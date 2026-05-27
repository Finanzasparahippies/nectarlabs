from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.dashboard.models import Project, TimeLog

User = get_user_model()

class DashboardRoleAuthorizationTests(APITestCase):
    def setUp(self):
        # Create different roles
        self.ceo = User.objects.create_user(
            username="saul_ceo",
            email="saul@nectarlabs.dev",
            password="securepassword",
            role=User.Role.ADMIN,
            is_staff=True
        )
        self.developer = User.objects.create_user(
            username="dev_member",
            email="dev@nectarlabs.dev",
            password="devpassword",
            role=User.Role.DEVELOPER
        )
        self.designer = User.objects.create_user(
            username="design_member",
            email="designer@nectarlabs.dev",
            password="designpassword",
            role=User.Role.DESIGNER
        )
        self.client_a = User.objects.create_user(
            username="client_a",
            email="client_a@example.com",
            password="clientpassword",
            role=User.Role.BUSINESS
        )
        self.client_b = User.objects.create_user(
            username="client_b",
            email="client_b@example.com",
            password="clientpassword",
            role=User.Role.BUSINESS
        )
        
        # Create projects
        self.project_a = Project.objects.create(
            name="Project Alpha",
            client=self.client_a,
            designer=self.designer,
            is_active=True
        )
        self.project_b = Project.objects.create(
            name="Project Beta",
            client=self.client_b,
            is_active=True
        )

    def test_client_project_isolation(self):
        """
        Verify that clients can only view their own projects and cannot access stats or modify projects.
        """
        # Client A view
        self.client.force_authenticate(user=self.client_a)
        response = self.client.get(reverse('project-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Client A should see project_a but not project_b
        project_ids = [p['id'] for p in response.data]
        self.assertIn(self.project_a.id, project_ids)
        self.assertNotIn(self.project_b.id, project_ids)

        # Client A access stats -> expect 403 Forbidden
        response = self.client.get(reverse('project-business-metrics'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Client A start activity -> expect 403 Forbidden
        url = reverse('project-start-activity', kwargs={'pk': self.project_a.id})
        response = self.client.post(url, {'description': 'coding'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_designer_project_isolation(self):
        """
        Verify that designers can only view projects assigned to them and can log activities on them.
        """
        self.client.force_authenticate(user=self.designer)
        response = self.client.get(reverse('project-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        project_ids = [p['id'] for p in response.data]
        # Designer should see project_a (assigned) but not project_b (not assigned)
        self.assertIn(self.project_a.id, project_ids)
        self.assertNotIn(self.project_b.id, project_ids)

        # Designer starts activity on project_a -> expect 200 OK
        url = reverse('project-start-activity', kwargs={'pk': self.project_a.id})
        response = self.client.post(url, {'description': 'UI design session'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_developer_access_permissions(self):
        """
        Verify that developers can see all projects and record work, but cannot view business metrics.
        """
        self.client.force_authenticate(user=self.developer)
        response = self.client.get(reverse('project-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        project_ids = [p['id'] for p in response.data]
        # Developer should see all projects
        self.assertIn(self.project_a.id, project_ids)
        self.assertIn(self.project_b.id, project_ids)

        # Developer starts activity on project_b -> expect 200 OK
        url = reverse('project-start-activity', kwargs={'pk': self.project_b.id})
        response = self.client.post(url, {'description': 'backend deployment'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Developer access business metrics -> expect 403 Forbidden
        response = self.client.get(reverse('project-business-metrics'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ceo_full_access(self):
        """
        Verify that the CEO (Admin) has full access to view projects and business metrics.
        """
        self.client.force_authenticate(user=self.ceo)
        
        # View all projects
        response = self.client.get(reverse('project-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        project_ids = [p['id'] for p in response.data]
        self.assertIn(self.project_a.id, project_ids)
        self.assertIn(self.project_b.id, project_ids)

        # Access business metrics -> expect 200 OK
        response = self.client.get(reverse('project-business-metrics'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_projects', response.data)
        self.assertIn('active_projects', response.data)

    def test_project_deletion_permissions(self):
        """
        Verify that only the CEO/Admin can delete projects, while other roles get 403.
        """
        # Client tries to delete project_a -> expect 403
        self.client.force_authenticate(user=self.client_a)
        url = reverse('project-detail', kwargs={'pk': self.project_a.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Designer tries to delete project_a -> expect 403
        self.client.force_authenticate(user=self.designer)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Developer tries to delete project_a -> expect 403
        self.client.force_authenticate(user=self.developer)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # CEO/Admin deletes project_a -> expect 204 No Content
        self.client.force_authenticate(user=self.ceo)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Project.objects.filter(id=self.project_a.id).exists())

    def test_developer_cannot_create_or_update_project(self):
        """
        Verify that developers cannot create or update projects directly since they are supervised under the CEO.
        """
        self.client.force_authenticate(user=self.developer)
        
        # Try to create a project -> expect 403
        response = self.client.post(reverse('project-list'), {
            'name': 'New Supervised Project',
            'client': self.client_a.id
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Try to update a project -> expect 403
        url = reverse('project-detail', kwargs={'pk': self.project_a.id})
        response = self.client.put(url, {
            'name': 'Malicious Update Project'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
