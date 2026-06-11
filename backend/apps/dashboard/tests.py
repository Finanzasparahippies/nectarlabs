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


class ProjectQuoteAPITests(APITestCase):
    def setUp(self):
        self.ceo = User.objects.create_user(
            username="saul_ceo",
            email="saul@nectarlabs.dev",
            password="securepassword",
            role=User.Role.ADMIN,
            is_staff=True
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

    def test_create_project_quote_as_ceo(self):
        from apps.dashboard.models import ProjectQuote
        self.client.force_authenticate(user=self.ceo)
        response = self.client.post(reverse('quote-list'), {
            "client_name": "Prospect Client Ltd",
            "client_email": "prospect@example.com",
            "project_name": "E-Commerce custom portal",
            "description": "Custom portal description",
            "estimated_delivery_weeks": 8,
            "modules": [
                {"name": "Auth module", "description": "Auth desc", "price": 5000.00},
                {"name": "Stripe module", "description": "Stripe desc", "price": 10000.00}
            ]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        quote = ProjectQuote.objects.get(project_name="E-Commerce custom portal")
        self.assertEqual(quote.total_price, 15000.00)
        self.assertEqual(quote.status, ProjectQuote.Status.DRAFT)

    def test_create_project_quote_as_non_admin_fails(self):
        self.client.force_authenticate(user=self.client_a)
        response = self.client.post(reverse('quote-list'), {
            "client_name": "Prospect Client Ltd",
            "client_email": "prospect@example.com",
            "project_name": "E-Commerce custom portal",
            "estimated_delivery_weeks": 8,
            "modules": [
                {"name": "Auth module", "price": 5000.00}
            ]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_quote_status_approved_generates_contract_and_user(self):
        from apps.dashboard.models import ProjectQuote
        from apps.shop.models import Contract
        
        quote = ProjectQuote.objects.create(
            client_name="New Prospect",
            client_email="new_prospect@example.com",
            project_name="Custom Mobile App",
            estimated_delivery_weeks=6,
            modules=[{"name": "Auth", "price": 8000.00}],
            total_price=8000.00,
            status=ProjectQuote.Status.DRAFT
        )
        
        self.client.force_authenticate(user=self.ceo)
        url = reverse('quote-change-status', kwargs={'pk': quote.id})
        response = self.client.post(url, {'status': 'APPROVED'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check user creation
        new_user = User.objects.get(email="new_prospect@example.com")
        self.assertEqual(new_user.role, User.Role.BUSINESS)
        
        # Check contract creation
        contract = Contract.objects.get(project_quote=quote)
        self.assertEqual(contract.user, new_user)
        self.assertFalse(contract.is_fully_signed)
        self.assertEqual(contract.full_name, "New Prospect")

    def test_quote_view_isolation(self):
        from apps.dashboard.models import ProjectQuote
        quote_a = ProjectQuote.objects.create(
            client=self.client_a,
            client_name="Client A",
            client_email="client_a@example.com",
            project_name="Project A",
            total_price=5000.00
        )
        quote_b = ProjectQuote.objects.create(
            client=self.client_b,
            client_name="Client B",
            client_email="client_b@example.com",
            project_name="Project B",
            total_price=7000.00
        )

        # Client A views
        self.client.force_authenticate(user=self.client_a)
        response = self.client.get(reverse('quote-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        quote_ids = [q['id'] for q in response.data]
        self.assertIn(str(quote_a.id), quote_ids)
        self.assertNotIn(str(quote_b.id), quote_ids)

        # CEO views all
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get(reverse('quote-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        quote_ids = [q['id'] for q in response.data]
        self.assertIn(str(quote_a.id), quote_ids)
        self.assertIn(str(quote_b.id), quote_ids)


class LeadAndSalespersonQuoteTests(APITestCase):
    def setUp(self):
        self.ceo = User.objects.create_user(
            username="saul_ceo_sales",
            email="saul_sales@nectarlabs.dev",
            password="securepassword",
            role=User.Role.ADMIN,
            is_staff=True
        )
        self.salesperson_a = User.objects.create_user(
            username="seller_a",
            email="seller_a@example.com",
            password="password123",
            role=User.Role.SALES
        )
        self.salesperson_b = User.objects.create_user(
            username="seller_b",
            email="seller_b@example.com",
            password="password123",
            role=User.Role.SALES
        )
        self.client_customer = User.objects.create_user(
            username="client_cust",
            email="client_cust@example.com",
            password="password123",
            role=User.Role.CUSTOMER
        )

    def test_lead_crud_as_salesperson(self):
        from apps.dashboard.models import Lead
        # 1. Authenticate as salesperson A
        self.client.force_authenticate(user=self.salesperson_a)
        
        # 2. Create a lead -> salesperson should be auto-assigned
        response = self.client.post(reverse('lead-list'), {
            "name": "Acme Inc",
            "email": "acme@example.com",
            "phone": "123456",
            "project_idea": "Build a SaaS",
            "estimated_value": "50000.00",
            "status": "PROSPECT",
            "notes": "Spoke on phone"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['salesperson'], self.salesperson_a.id)
        
        lead_id = response.data['id']
        lead = Lead.objects.get(id=lead_id)
        self.assertEqual(lead.name, "Acme Inc")
        self.assertEqual(lead.salesperson, self.salesperson_a)
        
        # 3. Update the lead -> status change (simulates Kanban drag and drop)
        response = self.client.patch(reverse('lead-detail', kwargs={'pk': lead_id}), {
            "status": "CONTACTED"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lead.refresh_from_db()
        self.assertEqual(lead.status, "CONTACTED")

    def test_lead_access_isolation(self):
        from apps.dashboard.models import Lead
        # Create lead for salesperson A
        lead_a = Lead.objects.create(
            name="Lead A",
            salesperson=self.salesperson_a,
            estimated_value=10000.00
        )
        # Create lead for salesperson B
        lead_b = Lead.objects.create(
            name="Lead B",
            salesperson=self.salesperson_b,
            estimated_value=20000.00
        )

        # 1. Salesperson A views leads -> should see lead_a but not lead_b
        self.client.force_authenticate(user=self.salesperson_a)
        response = self.client.get(reverse('lead-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lead_ids = [l['id'] for l in response.data]
        self.assertIn(lead_a.id, lead_ids)
        self.assertNotIn(lead_b.id, lead_ids)

        # 2. Salesperson A tries to read lead_b detail -> 404 Not Found
        response = self.client.get(reverse('lead-detail', kwargs={'pk': lead_b.id}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # 3. Salesperson A tries to patch lead_b -> 404 Not Found
        response = self.client.patch(reverse('lead-detail', kwargs={'pk': lead_b.id}), {"status": "WON"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # 4. Customer tries to list leads -> 403 Forbidden
        self.client.force_authenticate(user=self.client_customer)
        response = self.client.get(reverse('lead-list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 5. CEO (Admin) views leads -> should see both
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get(reverse('lead-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lead_ids = [l['id'] for l in response.data]
        self.assertIn(lead_a.id, lead_ids)
        self.assertIn(lead_b.id, lead_ids)

    def test_salesperson_project_quote_flow(self):
        from apps.dashboard.models import ProjectQuote
        self.client.force_authenticate(user=self.salesperson_a)
        
        # 1. Salesperson A creates a quote
        response = self.client.post(reverse('quote-list'), {
            "client_name": "Prospect A",
            "client_email": "prospect_a@example.com",
            "project_name": "Mobile app",
            "description": "App description",
            "estimated_delivery_weeks": 4,
            "modules": [
                {"name": "Database", "price": 10000.00}
            ]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        quote_id = response.data['id']
        quote = ProjectQuote.objects.get(id=quote_id)
        self.assertEqual(quote.salesperson, self.salesperson_a)
        self.assertEqual(quote.total_price, 10000.00)

        # 2. Salesperson B views quotes -> should not see salesperson A's quote
        self.client.force_authenticate(user=self.salesperson_b)
        response = self.client.get(reverse('quote-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        quote_ids = [q['id'] for q in response.data]
        self.assertNotIn(str(quote.id), quote_ids)

        # 3. Salesperson B tries to delete salesperson A's quote -> 404 Not Found
        url = reverse('quote-detail', kwargs={'pk': quote.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class LeadAppointmentTests(APITestCase):
    def setUp(self):
        self.ceo = User.objects.create_user(
            username="saul_ceo_appt",
            email="saul_appt@nectarlabs.dev",
            password="securepassword",
            role=User.Role.ADMIN,
            is_staff=True
        )
        self.salesperson_a = User.objects.create_user(
            username="seller_appt_a",
            email="seller_appt_a@example.com",
            password="password123",
            role=User.Role.SALES
        )
        self.salesperson_b = User.objects.create_user(
            username="seller_appt_b",
            email="seller_appt_b@example.com",
            password="password123",
            role=User.Role.SALES
        )
        
    def test_anonymous_booking_creates_lead_and_appointment(self):
        from apps.dashboard.models import Lead, LeadAppointment
        from django.core import mail
        
        # Booking request data
        data = {
            "client_name": "Juan Perez",
            "client_email": "juan@example.com",
            "client_phone": "555-1234",
            "notes": "Interested in Live Chat addon",
            "date": "2026-06-15",
            "time": "10:00:00",
            "addon_slug": "live-chat"
        }
        
        # Anonymous post to appointments
        response = self.client.post(reverse('appointment-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify Lead creation
        lead = Lead.objects.get(email="juan@example.com")
        self.assertEqual(lead.name, "Juan Perez")
        self.assertEqual(lead.phone, "555-1234")
        self.assertEqual(lead.status, Lead.Status.PROSPECT)
        
        # Verify Appointment creation
        appt = LeadAppointment.objects.get(lead=lead)
        self.assertEqual(str(appt.date), "2026-06-15")
        self.assertEqual(str(appt.time), "10:00:00")
        self.assertFalse(appt.is_confirmed_by_client)
        self.assertEqual(appt.salesperson, self.salesperson_a) # First sales user
        
        # Verify verification email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Consulta de Software Solicitada", mail.outbox[0].subject)
        
    def test_double_booking_prevention_assigns_other_salesperson(self):
        from apps.dashboard.models import Lead, LeadAppointment
        
        # Book first appointment
        data1 = {
            "client_name": "Juan Perez",
            "client_email": "juan@example.com",
            "client_phone": "555-1234",
            "notes": "First booking",
            "date": "2026-06-15",
            "time": "10:00:00"
        }
        response = self.client.post(reverse('appointment-list'), data1, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Book second appointment at same date/time -> should assign salesperson_b
        data2 = {
            "client_name": "Maria Lopez",
            "client_email": "maria@example.com",
            "client_phone": "555-5678",
            "notes": "Second booking at same time",
            "date": "2026-06-15",
            "time": "10:00:00"
        }
        response = self.client.post(reverse('appointment-list'), data2, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        appt2 = LeadAppointment.objects.get(lead__email="maria@example.com")
        self.assertEqual(appt2.salesperson, self.salesperson_b)
        
        # Book third appointment at same date/time -> should fail because both are busy
        data3 = {
            "client_name": "Pedro Gomez",
            "client_email": "pedro@example.com",
            "date": "2026-06-15",
            "time": "10:00:00"
        }
        response = self.client.post(reverse('appointment-list'), data3, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check either string or list representation of the error
        time_error = str(response.data['time'])
        self.assertIn("Este horario ya no está disponible", time_error)
        
    def test_appointment_confirmation_flow(self):
        from apps.dashboard.models import Lead, LeadAppointment
        from django.core.signing import TimestampSigner
        
        # Create appointment manually
        lead = Lead.objects.create(
            name="Test Client",
            email="test@example.com",
            salesperson=self.salesperson_a
        )
        appt = LeadAppointment.objects.create(
            lead=lead,
            salesperson=self.salesperson_a,
            date="2026-06-16",
            time="11:00:00"
        )
        
        # Generate token
        signer = TimestampSigner()
        token = signer.sign(str(appt.id))
        
        # Confirm get request
        url = reverse('appointment-confirm') + f"?token={token}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("confirmed=true", response.url)
        
        # Refresh and verify status
        appt.refresh_from_db()
        self.assertTrue(appt.is_confirmed_by_client)
        self.assertEqual(appt.status, LeadAppointment.Status.CONFIRMED)
        
        lead.refresh_from_db()
        self.assertEqual(lead.status, Lead.Status.CONTACTED)

    def test_anonymous_booking_with_multiple_addons(self):
        from apps.dashboard.models import Lead, LeadAppointment
        from apps.shop.models import AddOn

        addon1, _ = AddOn.objects.get_or_create(
            slug="live-chat",
            defaults={
                "name": "Néctar Live Chat",
                "category_badge": "Chat",
                "description": "Live chat widget",
                "detailed_description": "Detailed live chat widget",
                "monthly_price": 50.00,
                "yearly_price": 500.00,
                "origin_project": "Nectar Chat",
                "source_reference": "ref",
                "server_requirements": "None"
            }
        )
        addon2, _ = AddOn.objects.get_or_create(
            slug="booking-signature",
            defaults={
                "name": "Néctar Booking & Signature",
                "category_badge": "Booking",
                "description": "Booking and signature",
                "detailed_description": "Detailed booking and signature",
                "monthly_price": 75.00,
                "yearly_price": 750.00,
                "origin_project": "Nectar Book",
                "source_reference": "ref",
                "server_requirements": "None"
            }
        )

        data = {
            "client_name": "Pedro Gomez Multiple",
            "client_email": "pedro_mult@example.com",
            "client_phone": "555-9999",
            "notes": "Interested in multiple addons",
            "date": "2026-06-20",
            "time": "12:00:00",
            "addon_slugs": ["live-chat", "booking-signature"]
        }

        response = self.client.post(reverse('appointment-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        appt = LeadAppointment.objects.get(lead__email="pedro_mult@example.com")
        self.assertEqual(appt.addon, addon1)
        self.assertEqual(appt.addons.count(), 2)
        self.assertIn(addon1, appt.addons.all())
        self.assertIn(addon2, appt.addons.all())


class BusinessStatsAPITests(APITestCase):
    def setUp(self):
        from apps.shop.models import Plan, AddOn
        self.ceo = User.objects.create_user(
            username="saul_ceo_stats",
            email="saul_stats@nectarlabs.dev",
            password="securepassword",
            role=User.Role.ADMIN,
            is_staff=True
        )
        self.client_user = User.objects.create_user(
            username="client_stats",
            email="client_stats@example.com",
            password="password123",
            role=User.Role.BUSINESS
        )
        self.plan = Plan.objects.create(
            name="Plan Test",
            slug="plan-test",
            description="Test Plan",
            price=1000.00
        )
        self.addon = AddOn.objects.create(
            slug="test-addon",
            name="Test Addon",
            monthly_price=200.00,
            yearly_price=2000.00,
            description="test description",
            detailed_description="detailed",
            origin_project="project",
            source_reference="ref",
            server_requirements="none"
        )
        # Activar cache para el test
        from django.core.cache import cache
        cache.clear()

    def test_stats_mrr_and_cashflow_with_addon_subscriptions(self):
        from apps.shop.models import Contract, AddOnSubscription
        from django.utils import timezone
        
        # 1. Contrato activo con plan
        contract = Contract.objects.create(
            user=self.client_user,
            plan=self.plan,
            full_name="Client Stats Company",
            tax_id='XAXX010101000',
            address='Calle 123',
            project_idea='Idea',
            signature_base64='sig',
            is_fully_signed=True,
            is_active=True,
            next_payment_date=timezone.now().date()
        )
        
        # 2. Suscripción de Addon activa (debería sumarse al MRR y aparecer en calendario)
        sub1 = AddOnSubscription.objects.create(
            user=self.client_user,
            addon=self.addon,
            status='active',
            billing_cycle='monthly',
            price_paid=200.00
        )
        
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get(reverse('business_stats'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # MRR total = Plan (1000) + Addon sub (200) = 1200
        self.assertEqual(response.data['financials']['contracts_mrr'], 1200.00)
        self.assertEqual(response.data['financials']['gross_sales'], 1200.00)
        
        # Ambos deben aparecer en client_billing
        billing_ids = [b['id'] for b in response.data['client_billing']]
        self.assertIn(contract.id, billing_ids)
        self.assertIn(f"addon-{sub1.id}", billing_ids)

    def test_stats_no_double_counting_planless_contracts(self):
        from apps.shop.models import Contract, AddOnSubscription
        from django.utils import timezone
        
        # Contrato sin plan pero con el addon en la relación ManyToMany
        contract = Contract.objects.create(
            user=self.client_user,
            plan=None,
            full_name="Client Stats Company 2",
            tax_id='XAXX010101000',
            address='Calle 123',
            project_idea='Idea',
            signature_base64='sig',
            is_fully_signed=True,
            is_active=True,
            next_payment_date=timezone.now().date()
        )
        contract.addons.add(self.addon)
        
        # Suscripción de Addon activa para el mismo addon
        sub1 = AddOnSubscription.objects.create(
            user=self.client_user,
            addon=self.addon,
            status='active',
            billing_cycle='monthly',
            price_paid=200.00
        )
        
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get(reverse('business_stats'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # El addon vale 200. No se debe contar doble: MRR = 200 (del contrato o la suscripción, deduplicado)
        self.assertEqual(response.data['financials']['contracts_mrr'], 200.00)


