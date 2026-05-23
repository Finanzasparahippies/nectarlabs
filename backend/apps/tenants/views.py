from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.tokens import RefreshToken
import uuid

from .models import Tenant
from .serializers import TenantSerializer, TenantPublicSerializer

User = get_user_model()

class TenantViewSet(viewsets.ModelViewSet):
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'ADMIN':
            return Tenant.objects.all().order_by('-created_at')
        return Tenant.objects.filter(owner=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def regenerate_api_key(self, request, pk=None):
        tenant = self.get_object()
        tenant.api_key = uuid.uuid4()
        tenant.save()
        return Response({
            'detail': 'API Key successfully regenerated.',
            'api_key': str(tenant.api_key)
        })

    @action(detail=True, methods=['post'], url_path='validate-domain')
    def validate_domain(self, request, pk=None):
        tenant = self.get_object()
        domain = tenant.custom_domain
        if not domain:
            return Response({
                'is_valid': False,
                'message': 'No se ha configurado ningún dominio personalizado para este portal.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        import socket
        try:
            resolved_ip = socket.gethostbyname(domain.strip())
            return Response({
                'is_valid': True,
                'resolved_ip': resolved_ip,
                'message': f'El dominio resuelve correctamente a la IP {resolved_ip}.'
            })
        except socket.gaierror:
            return Response({
                'is_valid': False,
                'message': 'No se pudo resolver el dominio. Verifica la configuración CNAME en tu proveedor de DNS.'
            })
        except Exception as e:
            return Response({
                'is_valid': False,
                'message': f'Error durante la comprobación: {str(e)}'
            })



@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_config(request):
    """
    Public endpoint to fetch tenant styling configuration by subdomain, custom domain, or API key.
    Useful for iframe embedding and dynamic host routing.
    """
    subdomain = request.query_params.get('subdomain')
    api_key = request.query_params.get('api_key')
    tenant_id = request.query_params.get('tenant_id')
    host = request.query_params.get('host')
    
    tenant = None
    
    if tenant_id:
        try:
            tenant = Tenant.objects.filter(id=uuid.UUID(tenant_id), is_active=True).first()
        except ValueError:
            return Response({'error': 'Invalid tenant_id format'}, status=status.HTTP_400_BAD_REQUEST)
    elif api_key:
        try:
            tenant = Tenant.objects.filter(api_key=uuid.UUID(api_key), is_active=True).first()
        except ValueError:
            return Response({'error': 'Invalid API Key format'}, status=status.HTTP_400_BAD_REQUEST)
    elif subdomain:
        tenant = Tenant.objects.filter(subdomain=subdomain.lower(), is_active=True).first()
    elif host:
        # Check custom domain first
        tenant = Tenant.objects.filter(custom_domain=host.lower(), is_active=True).first()
        
        # If not found and it's a *.nectarlabs.dev or staging.nectarlabs.dev subdomain, parse it
        if not tenant:
            host_parts = host.split('.')
            if len(host_parts) >= 3:
                # e.g. client.nectarlabs.dev or client.localhost:3000
                potential_sub = host_parts[0]
                # Filter out system subdomains
                if potential_sub not in ['www', 'api', 'admin', 'staging']:
                    tenant = Tenant.objects.filter(subdomain=potential_sub.lower(), is_active=True).first()

    if not tenant:
        return Response({'error': 'Tenant not found or inactive'}, status=status.HTTP_404_NOT_FOUND)
        
    serializer = TenantPublicSerializer(tenant)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def guest_auth(request):
    """
    Endpoint for final customers (CUSTOMER role) to authenticate or register in a Tenant context.
    Requires:
      - tenant_id (UUID)
      - email (string)
      - name (string) (optional, if require_customer_info is True)
    """
    tenant_id = request.data.get('tenant_id')
    email = request.data.get('email')
    name = request.data.get('name', '').strip()
    
    if not tenant_id or not email:
        return Response({'error': 'tenant_id and email are required fields'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        tenant = Tenant.objects.filter(id=uuid.UUID(tenant_id), is_active=True).first()
    except ValueError:
        return Response({'error': 'Invalid tenant_id format'}, status=status.HTTP_400_BAD_REQUEST)
        
    if not tenant:
        return Response({'error': 'Tenant not found or inactive'}, status=status.HTTP_404_NOT_FOUND)
        
    # Check if we require customer info and name wasn't provided for new signup
    if tenant.require_customer_info and not name:
        # Look up existing user first. If not exists, we require name.
        if not User.objects.filter(email=email).exists():
            return Response({'error': 'name is required to initiate support session for this tenant'}, status=status.HTTP_400_BAD_REQUEST)
            
    # Get or create User associated with this tenant
    # Since username is unique, we slugify or use email as username
    user = User.objects.filter(email=email).first()
    
    if user:
        # Always update tenant context for CUSTOMER users to match current portal
        if user.role == User.Role.CUSTOMER and user.tenant != tenant:
            user.tenant = tenant
            user.save()
    else:
        # Create a new CUSTOMER user
        username = email.split('@')[0]
        # Ensure username uniqueness
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
            
        first_name = name.split(' ')[0] if name else ''
        last_name = ' '.join(name.split(' ')[1:]) if name and len(name.split(' ')) > 1 else ''
        
        user = User.objects.create_user(
            email=email,
            username=username,
            password=User.objects.make_random_password(),
            role=User.Role.CUSTOMER,
            first_name=first_name,
            last_name=last_name,
            tenant=tenant
        )

    # Verify user is CUSTOMER of this tenant or belongs to it (or is staff/owner of tenant)
    is_staff = user.is_staff or user.role == 'ADMIN'
    is_owner = tenant.owner == user
    is_customer = user.role == User.Role.CUSTOMER and user.tenant == tenant
    
    if not (is_staff or is_owner or is_customer):
        return Response({'error': 'Unauthorized access to this tenant context'}, status=status.HTTP_403_FORBIDDEN)
        
    # Generate simple JWT tokens
    refresh = RefreshToken.for_user(user)
    
    # Customize token payload if needed (normally done in claims, but return in dict)
    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'email': user.email,
        'username': user.username,
        'user_role': user.role,
        'is_staff': user.is_staff or user.role in ['ADMIN', 'BUSINESS']
    })
