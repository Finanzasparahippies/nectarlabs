from rest_framework import generics, permissions, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.shortcuts import redirect
from django.conf import settings

from .serializers import UserSerializer, RegisterSerializer
from .models import User
from .utils import send_verification_email

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Custom claims
        token['is_staff'] = user.is_staff
        token['role'] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Enforce email verification (bypass staff, admin, and test/bot emails ending with example.com)
        is_special_bypass = (
            self.user.is_staff or 
            self.user.role == User.Role.ADMIN or 
            self.user.email.endswith('@example.com')
        )
        if not self.user.is_email_verified and not is_special_bypass:
            raise serializers.ValidationError({
                "detail": "Por favor, verifica tu correo electrónico antes de acceder al dashboard."
            })
            
        data['is_staff'] = self.user.is_staff
        data['role'] = self.user.role
        data['email'] = self.user.email
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        send_verification_email(user, self.request)

class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        uidb64 = request.query_params.get('uid')
        token = request.query_params.get('token')
        
        frontend_url = settings.FRONTEND_URL
        # Dynamic environment redirect: if settings.FRONTEND_URL is configured as localhost
        # but the request is coming from a remote staging/production domain, use the request host
        # to ensure the user redirects to the correct environment.
        request_host = request.get_host()
        if request_host and not any(h in request_host.lower() for h in ["localhost", "127.0.0.1", "testserver", "backend"]):
            if any(h in frontend_url.lower() for h in ["localhost", "127.0.0.1"]):
                scheme = "https" if request.is_secure() or request.META.get('HTTP_X_FORWARDED_PROTO') == 'https' else "http"
                frontend_url = f"{scheme}://{request_host}"

        if not uidb64 or not token:
            return redirect(f"{frontend_url}/login?verified=false&error=missing_params")
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
            
        if user is not None and default_token_generator.check_token(user, token):
            user.is_email_verified = True
            user.save()
            return redirect(f"{frontend_url}/login?verified=true")
        else:
            return redirect(f"{frontend_url}/login?verified=false&error=invalid_token")

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == User.Role.ADMIN:
            return User.objects.all().order_by('username')
        elif user.role == User.Role.BUSINESS:
            # Business owners can only see users of their own tenants
            return User.objects.filter(tenant__in=user.owned_tenants.all()).order_by('username')
        elif user.role == User.Role.STAFF:
            # Business staff can see users of their tenant
            if user.tenant:
                return User.objects.filter(tenant=user.tenant).order_by('username')
            return User.objects.filter(id=user.id)
        elif user.role == User.Role.DESIGNER:
            return User.objects.filter(role=User.Role.CUSTOMER).order_by('username')
        else:
            return User.objects.filter(id=user.id)

    def check_permissions(self, request):
        super().check_permissions(request)
        user = request.user
        is_allowed_role = user.is_staff or user.role in [
            User.Role.ADMIN, User.Role.BUSINESS, User.Role.ANALYST, 
            User.Role.DESIGNER, User.Role.STAFF
        ]
        
        if self.action in ['list', 'create'] and not is_allowed_role:
            self.permission_denied(request, message="No tienes permisos para realizar esta acción.")
        elif self.action in ['update', 'partial_update', 'destroy']:
            is_admin = user.is_staff or user.role == User.Role.ADMIN
            is_business = user.role == User.Role.BUSINESS
            is_staff_role = user.role == User.Role.STAFF
            
            if not is_admin and not is_business and not is_staff_role and not (self.action in ['update', 'partial_update'] and self.get_object() == user):
                self.permission_denied(request, message="No tienes permisos para modificar o eliminar este usuario.")
            
            # If business owner or business staff, verify they own the tenant of the user they want to modify
            if is_business:
                obj = self.get_object()
                if obj != user and (not obj.tenant or obj.tenant not in user.owned_tenants.all()):
                    self.permission_denied(request, message="No tienes permisos para modificar o eliminar un usuario de otro negocio.")
            elif is_staff_role:
                obj = self.get_object()
                if obj != user and (not obj.tenant or obj.tenant != user.tenant):
                    self.permission_denied(request, message="No tienes permisos para modificar o eliminar un usuario de otro negocio.")

    def perform_create(self, serializer):
        user = self.request.user
        role_to_assign = serializer.validated_data.get('role', User.Role.CUSTOMER)
        
        is_super_admin = user.is_superuser or user.role == User.Role.ADMIN
        
        if not is_super_admin:
            if user.role in [User.Role.BUSINESS, User.Role.STAFF]:
                if role_to_assign not in [User.Role.CUSTOMER, User.Role.STAFF]:
                    role_to_assign = User.Role.CUSTOMER
            else:
                role_to_assign = User.Role.CUSTOMER
            is_staff_to_assign = False
        else:
            is_staff_to_assign = role_to_assign in [User.Role.ADMIN, User.Role.BUSINESS]
            
        # Associate user with the business owner's tenant if created by BUSINESS role or STAFF
        tenant_to_assign = None
        if user.role == User.Role.BUSINESS:
            tenant_to_assign = user.owned_tenants.first()
            if not tenant_to_assign:
                raise serializers.ValidationError({"detail": "El usuario de tipo negocio debe poseer al menos un tenant para poder crear usuarios."})
        elif user.role == User.Role.STAFF:
            tenant_to_assign = user.tenant
            if not tenant_to_assign:
                raise serializers.ValidationError({"detail": "El usuario de tipo staff debe pertenecer a un tenant para poder crear usuarios."})
        else:
            tenant_to_assign = serializer.validated_data.get('tenant', None)
            
        serializer.save(
            role=role_to_assign,
            is_staff=is_staff_to_assign,
            is_superuser=False,
            tenant=tenant_to_assign
        )
