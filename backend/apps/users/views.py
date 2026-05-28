from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UserSerializer
from .models import User

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Claims personalizados
        token['is_staff'] = user.is_staff
        token['role'] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Info extra
        data['is_staff'] = self.user.is_staff
        data['role'] = self.user.role
        data['email'] = self.user.email
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer

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
        elif user.role == User.Role.DESIGNER:
            return User.objects.filter(role=User.Role.CUSTOMER).order_by('username')
        else:
            return User.objects.filter(id=user.id)

    def check_permissions(self, request):
        super().check_permissions(request)
        user = request.user
        is_allowed_role = user.is_staff or user.role in [User.Role.ADMIN, User.Role.BUSINESS, User.Role.ANALYST, User.Role.DESIGNER]
        
        if self.action in ['list', 'create'] and not is_allowed_role:
            self.permission_denied(request, message="No tienes permisos para realizar esta acción.")
        elif self.action in ['update', 'partial_update', 'destroy']:
            is_admin = user.is_staff or user.role == User.Role.ADMIN
            is_business = user.role == User.Role.BUSINESS
            
            if not is_admin and not is_business and not (self.action in ['update', 'partial_update'] and self.get_object() == user):
                self.permission_denied(request, message="No tienes permisos para modificar o eliminar este usuario.")
            
            # If business owner, verify they own the tenant of the user they want to modify
            if is_business:
                obj = self.get_object()
                if obj != user and (not obj.tenant or obj.tenant not in user.owned_tenants.all()):
                    self.permission_denied(request, message="No tienes permisos para modificar o eliminar un usuario de otro negocio.")

    def perform_create(self, serializer):
        user = self.request.user
        role_to_assign = serializer.validated_data.get('role', User.Role.CUSTOMER)
        
        is_super_admin = user.is_superuser or user.role == User.Role.ADMIN
        
        if not is_super_admin:
            role_to_assign = User.Role.CUSTOMER
            is_staff_to_assign = False
        else:
            is_staff_to_assign = role_to_assign in [User.Role.ADMIN, User.Role.BUSINESS]
            
        # Associate user with the business owner's tenant if created by BUSINESS role
        tenant_to_assign = None
        if user.role == User.Role.BUSINESS:
            tenant_to_assign = user.owned_tenants.first()
        else:
            tenant_to_assign = serializer.validated_data.get('tenant', None)
            
        serializer.save(
            role=role_to_assign,
            is_staff=is_staff_to_assign,
            is_superuser=False,
            tenant=tenant_to_assign
        )
