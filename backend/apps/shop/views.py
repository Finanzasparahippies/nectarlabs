from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.db import transaction
import stripe
from .models import Plan, Product, Contract, PaymentInstallment, AddOn, PromoCode, SalesCommission, AddOnSubscription, Order, OrderItem
from .serializers import PlanSerializer, ProductSerializer, ContractSerializer, PaymentInstallmentSerializer, AddOnSerializer, PromoCodeSerializer, SalesCommissionSerializer, AddOnSubscriptionSerializer, OrderSerializer
from .utils import generate_contract_pdf, send_contract_emails, send_payment_receipt_email, send_addon_payment_receipt_email, notify_support_addon_subscription


stripe.api_key = settings.STRIPE_SECRET_KEY

def get_frontend_origin(request):
    origin = request.META.get('HTTP_ORIGIN')
    if origin:
        return origin
    referer = request.META.get('HTTP_REFERER')
    if referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        return f"{parsed.scheme}://{parsed.netloc}"
    return settings.FRONTEND_URL

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plan.objects.filter(is_active=True).order_by('price')
    serializer_class = PlanSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Product.objects.all()
        
        # Filter by tenant parameter if present
        tenant_id = self.request.query_params.get('tenant_id')
        subdomain = self.request.query_params.get('subdomain')
        is_global = self.request.query_params.get('global') == 'true'
        
        from apps.tenants.models import Tenant
        import uuid
        from apps.users.models import User

        if tenant_id:
            try:
                queryset = queryset.filter(tenant_id=uuid.UUID(str(tenant_id)))
            except (ValueError, TypeError):
                queryset = queryset.none()
        elif subdomain:
            queryset = queryset.filter(tenant__subdomain=subdomain.lower())
        elif is_global:
            # Global listing for store directory
            queryset = queryset.filter(tenant__is_active=True)
        else:
            # Fallback to user context if authenticated
            user = self.request.user
            if user and user.is_authenticated:
                if user.is_staff or user.role == User.Role.ADMIN:
                    # Admins see everything
                    pass
                elif user.role == User.Role.BUSINESS:
                    # Business owner sees products of their owned tenants
                    queryset = queryset.filter(tenant__in=user.owned_tenants.all())
                elif user.tenant:
                    queryset = queryset.filter(tenant=user.tenant)
                else:
                    queryset = queryset.none()
            else:
                # If anonymous and no tenant context is provided, return empty
                queryset = queryset.none()
                
        return queryset

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Resolve tenant
        tenant_id = request.data.get('tenant')
        from apps.tenants.models import Tenant
        tenant = None
        if tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Exception:
                pass
        
        if not tenant:
            user = request.user
            if user and user.is_authenticated and hasattr(user, 'owned_tenants'):
                tenant = user.owned_tenants.first()
        
        # Idempotency check: check if product with same name already exists for this tenant
        name = request.data.get('name')
        if tenant and name:
            existing = Product.objects.filter(tenant=tenant, name__iexact=name.strip()).first()
            if existing:
                # Return existing product instead of duplicating
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)
                
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        from apps.users.models import User as UserModel
        
        # Prioritize tenant explicitly provided in serializer validated data
        if 'tenant' in serializer.validated_data:
            product = serializer.save()
        elif user and user.is_authenticated and user.role == UserModel.Role.BUSINESS:
            tenant = user.owned_tenants.first()
            product = serializer.save(tenant=tenant)
        else:
            product = serializer.save()
            
        self.sync_with_stripe(product)

    def perform_update(self, serializer):
        product = serializer.save()
        self.sync_with_stripe(product)

    def sync_with_stripe(self, product):
        """
        Sincroniza el producto y su precio con la cuenta de Stripe del inquilino (si está configurada).
        Si el precio cambia, genera un nuevo Price ID en Stripe.
        """
        tenant = product.tenant
        if not tenant or not tenant.stripe_secret_key:
            return

        import stripe
        
        # 1. Resolver o Crear Producto en Stripe
        stripe_product_id = None
        try:
            for p in stripe.Product.list(limit=100, api_key=tenant.stripe_secret_key).auto_paging_iter():
                if p.metadata.get('local_product_id') == str(product.id):
                    stripe_product_id = p.id
                    break
        except Exception:
            pass

        if not stripe_product_id:
            try:
                sp = stripe.Product.create(
                    name=product.name,
                    description=product.description or '',
                    metadata={'local_product_id': str(product.id)},
                    api_key=tenant.stripe_secret_key
                )
                stripe_product_id = sp.id
            except Exception as e:
                print(f"Error creating Stripe product: {str(e)}")
                return

        # 2. Resolver o Crear Precio en Stripe
        price_changed = True
        if product.stripe_price_id:
            try:
                sp_price = stripe.Price.retrieve(product.stripe_price_id, api_key=tenant.stripe_secret_key)
                current_amount = sp_price.unit_amount  # en centavos
                target_amount = int(product.price * 100)
                if current_amount == target_amount:
                    price_changed = False
            except Exception:
                pass

        if price_changed and stripe_product_id:
            try:
                sp_price = stripe.Price.create(
                    product=stripe_product_id,
                    unit_amount=int(product.price * 100),
                    currency='mxn',
                    api_key=tenant.stripe_secret_key
                )
                product.stripe_price_id = sp_price.id
                product.save(update_fields=['stripe_price_id'])
            except Exception as e:
                print(f"Error creating Stripe price: {str(e)}")

class AddOnViewSet(viewsets.ModelViewSet):
    serializer_class = AddOnSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and (user.is_staff or getattr(user, 'role', None) == 'ADMIN'):
            return AddOn.objects.all()
        return AddOn.objects.filter(is_active=True)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def subscribe(self, request, pk=None):
        addon = self.get_object()
        billing_cycle = request.data.get('billing_cycle', 'monthly')
        
        # Auto-healer: Validate price existence on Stripe and heal if needed
        if getattr(settings, "STRIPE_SECRET_KEY", None) and not getattr(settings, "TESTING", False):
            stripe.api_key = settings.STRIPE_SECRET_KEY
            healed = False
            if billing_cycle == 'yearly' and addon.stripe_yearly_price_id:
                try:
                    stripe.Price.retrieve(addon.stripe_yearly_price_id)
                except Exception:
                    addon.stripe_yearly_price_id = None
                    healed = True
            elif billing_cycle != 'yearly' and addon.stripe_price_id:
                try:
                    stripe.Price.retrieve(addon.stripe_price_id)
                except Exception:
                    addon.stripe_price_id = None
                    healed = True
            
            if healed:
                addon.save()
                addon.refresh_from_db()

        if billing_cycle == 'yearly':
            price_id = addon.stripe_yearly_price_id
            cycle_name = 'anual'
        else:
            price_id = addon.stripe_price_id
            cycle_name = 'mensual'
            
        if not price_id:
            return Response({'error': f'Este Add-on no está configurado para la suscripción {cycle_name} de Stripe.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not price_id.startswith('price_'):
            return Response({'error': f'Configuración de Stripe incorrecta para el Add-on "{addon.name}" (suscripción {cycle_name}): El ID "{price_id}" parece ser un ID de Producto (empieza con prod_) o es inválido. Debes ingresar el ID de Precio de Stripe (que empieza con price_) en el Django Admin.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            comments = request.data.get('comments', '')
            comments_truncated = comments[:450] if comments else ''
            
            annexed_addons = request.data.get('annexed_addons', [])
            
            # Build line items
            line_items = [{
                'price': price_id,
                'quantity': 1,
            }]
            
            valid_annexed_slugs = []
            for slug in annexed_addons:
                try:
                    ann_addon = AddOn.objects.get(slug=slug)
                    ann_price_id = ann_addon.stripe_yearly_price_id if billing_cycle == 'yearly' else ann_addon.stripe_price_id
                    if ann_price_id and ann_price_id.startswith('price_'):
                        line_items.append({
                            'price': ann_price_id,
                            'quantity': 1
                        })
                        valid_annexed_slugs.append(slug)
                except AddOn.DoesNotExist:
                    pass
            
            annexed_addons_str = ",".join(valid_annexed_slugs)

            discounts = []
            promo_code_str = request.data.get('promo_code', '').strip().upper()
            if promo_code_str:
                try:
                    promo = PromoCode.objects.get(code=promo_code_str)
                    if not promo.is_valid():
                        return Response({'error': 'Este código promocional ha expirado o no es válido.'}, status=status.HTTP_400_BAD_REQUEST)
                    stripe_coupon_id = get_or_create_stripe_coupon(promo)
                    if stripe_coupon_id:
                        discounts.append({'coupon': stripe_coupon_id})
                except PromoCode.DoesNotExist:
                    return Response({'error': 'Código promocional no encontrado.'}, status=status.HTTP_400_BAD_REQUEST)

            session_kwargs = {
                'payment_method_types': ['card'],
                'line_items': line_items,
                'mode': 'subscription',
                'allow_promotion_codes': True,
                'subscription_data': {
                    'metadata': {
                        'user_id': request.user.id,
                        'addon_id': addon.id,
                        'addon_slug': addon.slug, 
                        'type': 'addon_subscription',
                        'billing_cycle': billing_cycle,
                        'annexed_addons': annexed_addons_str,
                        'comments': comments_truncated
                    }
                },
                'success_url': f"{get_frontend_origin(request)}/dashboard?payment=success&addon_slug={addon.slug}&session_id={{CHECKOUT_SESSION_ID}}",
                'cancel_url': f"{get_frontend_origin(request)}/dashboard?payment=cancel",
                'metadata': {
                    'user_id': request.user.id,
                    'addon_id': addon.id,
                    'addon_slug': addon.slug,
                    'type': 'addon_subscription',
                    'billing_cycle': billing_cycle,
                    'annexed_addons': annexed_addons_str,
                    'comments': comments_truncated
                }
            }
            if discounts:
                session_kwargs['discounts'] = discounts

            session = stripe.checkout.Session.create(**session_kwargs)
            return Response({'url': session.url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='sync-checkout-session', permission_classes=[permissions.IsAuthenticated])
    def sync_checkout_session(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({'error': 'Falta el parámetro session_id.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not getattr(settings, "STRIPE_SECRET_KEY", None):
            return Response({'error': 'Stripe no está configurado.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            if session.get('payment_status') != 'paid':
                return Response({'status': 'pending', 'message': 'El pago no ha sido completado.'}, status=status.HTTP_200_OK)
                
            metadata = session.get('metadata', {})
            if metadata.get('type') != 'addon_subscription':
                return Response({'error': 'Sesión inválida.'}, status=status.HTTP_400_BAD_REQUEST)
                
            user_id = metadata.get('user_id')
            addon_id = metadata.get('addon_id')
            addon_slug = metadata.get('addon_slug')
            comments = metadata.get('comments', '')
            
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=user_id)
            
            if user.role == User.Role.CUSTOMER:
                user.role = User.Role.BUSINESS
                user.save()
                
            contract = Contract.objects.filter(user=user, is_active=True).first()
            if not contract:
                contract = Contract.objects.create(
                    user=user,
                    full_name=user.get_full_name() or user.username,
                    tax_id='XAXX010101000',
                    address='Suscripción Digital (Stripe)',
                    project_idea='Suscripción a Add-ons y Complementos',
                    signature_base64='STRIPE_SUBSCRIPTION_ACTIVE',
                    is_fully_signed=True,
                    payment_commitment_method='STRIPE'
                )
            
            addon = None
            if addon_id:
                try:
                    addon = AddOn.objects.get(id=addon_id)
                except AddOn.DoesNotExist:
                    pass
            if not addon and addon_slug:
                try:
                    addon = AddOn.objects.get(slug=addon_slug)
                    addon_id = addon.id
                except AddOn.DoesNotExist:
                    pass
                    
            if not addon:
                return Response({'error': 'Módulo no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
                
            contract.addons.add(addon)
            
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.filter(owner=contract.user).first()
            subscription_id = session.get('subscription')
            billing_cycle = metadata.get('billing_cycle', 'monthly')
            price = addon.yearly_price if billing_cycle == 'yearly' else addon.monthly_price
            
            addon_sub, created = AddOnSubscription.objects.update_or_create(
                user=user,
                addon=addon,
                defaults={
                    'tenant': tenant,
                    'stripe_subscription_id': subscription_id,
                    'status': 'active',
                    'billing_cycle': billing_cycle,
                    'price_paid': price,
                    'is_activated': True
                }
            )
            
            # Activate any annexed addons in user's contract and subscriptions
            annexed_addons_str = metadata.get('annexed_addons', '')
            if annexed_addons_str:
                annexed_slugs = [s.strip() for s in annexed_addons_str.split(',') if s.strip()]
                for slug in annexed_slugs:
                    try:
                        ann_addon = AddOn.objects.get(slug=slug)
                        contract.addons.add(ann_addon)
                        AddOnSubscription.objects.update_or_create(
                            user=user,
                            addon=ann_addon,
                            defaults={
                                'tenant': tenant,
                                'stripe_subscription_id': subscription_id,
                                'status': 'active',
                                'billing_cycle': billing_cycle,
                                'price_paid': ann_addon.yearly_price if billing_cycle == 'yearly' else ann_addon.monthly_price,
                                'is_activated': True
                            }
                        )
                    except AddOn.DoesNotExist:
                        pass
            
            if not tenant:
                from django.utils.text import slugify
                base_subdomain = slugify(contract.full_name or contract.user.username)
                if not base_subdomain:
                    base_subdomain = slugify(contract.user.username) or f"client-{contract.user.id}"
                
                subdomain = base_subdomain
                counter = 1
                while Tenant.objects.filter(subdomain=subdomain).exists():
                    subdomain = f"{base_subdomain}-{counter}"
                    counter += 1
                
                tenant = Tenant.objects.create(
                    owner=contract.user,
                    name=contract.full_name or f"Portal de {contract.user.get_full_name() or contract.user.username}",
                    subdomain=subdomain,
                    is_active=True
                )
                addon_sub.tenant = tenant
                addon_sub.save()
            else:
                if not tenant.is_active:
                    tenant.is_active = True
                    tenant.save()
            
            if tenant and (addon.slug == 'facturacion-cfdi' or addon.slug == 'mexico-invoicing'):
                tenant.stamp_balance = max(tenant.stamp_balance, 100)
                tenant.save(update_fields=['stamp_balance'])
                    
            return Response({
                'status': 'success',
                'addon_slug': addon.slug,
                'active_addons': tenant.active_addons
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def customer_portal(self, request):
        try:
            customers = stripe.Customer.list(email=request.user.email).data
            if customers:
                customer_id = customers[0].id
            else:
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=request.user.get_full_name() or request.user.username
                )
                customer_id = customer.id
                
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{get_frontend_origin(request)}/dashboard"
            )
            return Response({'url': session.url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AddOnSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = AddOnSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role in ['ADMIN', 'BUSINESS']:
            return AddOnSubscription.objects.all().order_by('-created_at')
        return AddOnSubscription.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        addon = serializer.validated_data.get('addon')
        from apps.tenants.models import Tenant
        tenant = Tenant.objects.filter(owner=user).first()
        
        # Check if they have an active plan contract (so they get it for free)
        has_plan = Contract.objects.filter(
            user=user,
            is_active=True,
            plan__isnull=False
        ).exists()
        
        if has_plan:
            # It's a free request, set is_activated=False (pending admin review/activation)
            addon_sub = serializer.save(
                user=user,
                tenant=tenant,
                is_activated=False,
                price_paid=0.00,
                status=AddOnSubscription.Status.ACTIVE
            )
            
            # Send notification to support team
            try:
                from apps.shop.utils import notify_support_addon_subscription, send_addon_contracted_email
                notify_support_addon_subscription(user, addon, tenant=tenant)
                
                # Send confirmation email to client (is_activated=False)
                tenant_subdomain = tenant.subdomain if tenant else None
                send_addon_contracted_email(user, addon, tenant_subdomain, is_activated=False)
            except Exception as notify_err:
                import logging
                logging.getLogger("apps").error(f"Error notifying support/client for free addon request: {notify_err}", exc_info=True)
        else:
            # Paid flow - Stripe webhook will handle creation, but if created directly, default to True
            serializer.save(user=user, tenant=tenant, is_activated=True)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def activate(self, request, pk=None):
        if not (request.user.is_staff or request.user.role == 'ADMIN'):
            return Response({'error': 'No tienes permisos para activar add-ons'}, status=status.HTTP_403_FORBIDDEN)
            
        addon_sub = self.get_object()
        addon_sub.is_activated = True
        addon_sub.save()
        
        # Add the addon to their active contract to keep contract addons in sync
        contract = Contract.objects.filter(user=addon_sub.user, is_active=True).first()
        if contract:
            contract.addons.add(addon_sub.addon)
            
        # Send confirmation email to client
        try:
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.filter(owner=addon_sub.user).first()
            from apps.shop.utils import send_addon_activated_email
            tenant_subdomain = tenant.subdomain if tenant else None
            send_addon_activated_email(addon_sub.user, addon_sub.addon, tenant_subdomain)
        except Exception as email_err:
            import logging
            logging.getLogger("apps").error(f"Error sending activation email: {email_err}", exc_info=True)
            
        return Response({'status': 'activated', 'is_activated': True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def deactivate(self, request, pk=None):
        if not (request.user.is_staff or request.user.role == 'ADMIN'):
            return Response({'error': 'No tienes permisos para desactivar add-ons'}, status=status.HTTP_403_FORBIDDEN)
            
        addon_sub = self.get_object()
        addon_sub.is_activated = False
        addon_sub.save()
        
        # Remove the addon from their active contract
        contract = Contract.objects.filter(user=addon_sub.user, is_active=True).first()
        if contract:
            contract.addons.remove(addon_sub.addon)
            
        return Response({'status': 'deactivated', 'is_activated': False}, status=status.HTTP_200_OK)



class ContractViewSet(viewsets.ModelViewSet):
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='toggle-addon', permission_classes=[permissions.IsAuthenticated])
    def toggle_addon(self, request):
        if not (request.user.is_staff or getattr(request.user, 'role', '') == 'ADMIN'):
            return Response({'error': 'No tienes permisos para realizar esta acción.'}, status=status.HTTP_403_FORBIDDEN)
            
        tenant_id = request.data.get('tenant_id')
        addon_slug = request.data.get('addon_slug')
        is_active = request.data.get('is_active')
        
        if not tenant_id or not addon_slug:
            return Response({'error': 'Faltan parámetros tenant_id o addon_slug'}, status=status.HTTP_400_BAD_REQUEST)
            
        from apps.tenants.models import Tenant
        from django.shortcuts import get_object_or_404
        tenant = get_object_or_404(Tenant, id=tenant_id)
        user = tenant.owner
        
        contract = Contract.objects.filter(user=user, is_active=True).first()
        if not contract:
            contract = Contract.objects.create(
                user=user,
                full_name=user.get_full_name() or user.username,
                tax_id='XAXX010101000',
                address='Asignación Manual de Add-ons (Admin)',
                project_idea='Asignación Manual de Add-ons',
                signature_base64='MANUAL_ASSIGNMENT_ACTIVE',
                is_fully_signed=True,
                payment_commitment_method='CASH'
            )
            
        try:
            addon = AddOn.objects.get(slug=addon_slug)
        except AddOn.DoesNotExist:
            return Response({'error': f'Add-on con slug {addon_slug} no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
            
        if is_active:
            contract.addons.add(addon)
            AddOnSubscription.objects.update_or_create(
                user=user,
                addon=addon,
                defaults={
                    'tenant': tenant,
                    'status': 'active',
                    'is_activated': True
                }
            )
            if addon.slug == 'facturacion-cfdi' or addon.slug == 'mexico-invoicing':
                tenant.stamp_balance = max(tenant.stamp_balance, 100)
                tenant.save(update_fields=['stamp_balance'])
        else:
            contract.addons.remove(addon)
            AddOnSubscription.objects.filter(user=user, addon=addon).update(is_activated=False)
            
        return Response({
            'status': 'success',
            'active_addons': tenant.active_addons
        })

    def get_queryset(self):
        # Auto-healer: ensure all signed contracts have a tenant
        from apps.tenants.models import Tenant
        from django.utils.text import slugify
        for contract in Contract.objects.filter(is_fully_signed=True):
            if not Tenant.objects.filter(owner=contract.user).exists():
                try:
                    base_subdomain = slugify(contract.full_name or contract.user.username)
                    if not base_subdomain:
                        base_subdomain = slugify(contract.user.username) or f"client-{contract.user.id}"
                    
                    subdomain = base_subdomain
                    counter = 1
                    while Tenant.objects.filter(subdomain=subdomain).exists():
                        subdomain = f"{base_subdomain}-{counter}"
                        counter += 1
                    
                    Tenant.objects.create(
                        owner=contract.user,
                        name=contract.full_name or f"Portal de {contract.user.get_full_name() or contract.user.username}",
                        subdomain=subdomain,
                        is_active=False
                    )
                except Exception as e:
                    import logging
                    logging.error(f"Error auto-healing tenant: {e}", exc_info=True)

        user = self.request.user
        if user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            return Contract.objects.all()
        elif getattr(user, 'role', '') == 'BUSINESS':
            from django.db.models import Q
            return Contract.objects.filter(Q(user=user) | Q(user__tenant__in=user.owned_tenants.all())).distinct()
        elif getattr(user, 'role', '') == 'STAFF':
            if user.tenant:
                return Contract.objects.filter(user__tenant=user.tenant)
            return Contract.objects.filter(id=user.id)
        # Los clientes solo ven sus propios contratos
        return Contract.objects.filter(user=user)

    def perform_create(self, serializer):
        # Asignar el usuario actual al contrato
        contract = serializer.save(user=self.request.user)
        
        # Generar el PDF Parcial e iniciar flujo de firmas
        try:
            if generate_contract_pdf(contract):
                send_contract_emails(contract)
        except Exception as e:
            import logging
            logging.error(f"Error in contract creation flow: {e}", exc_info=True)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def dev_sign(self, request, pk=None):
        if not (request.user.is_staff or request.user.role in ['ADMIN', 'BUSINESS']):
            return Response({'error': 'No tienes permisos para firmar contratos'}, status=status.HTTP_403_FORBIDDEN)
            
        contract = self.get_object()
        signature = request.data.get('signature')
        
        if not signature:
            return Response({'error': 'Firma del desarrollador requerida'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Registrar firma del socio tecnológico
        contract.developer_signature = signature
        contract.developer_signed_at = timezone.now()
        contract.is_fully_signed = True
        contract.save()

        # Generar automáticamente abonos obligatorios de forma independiente para desarrollo y diseño
        if contract.plan or contract.project_quote:
            from apps.shop.utils import generate_installments_for_contract
            generate_installments_for_contract(contract)
            # Auto-populate next_payment_date with the due date of the first generated installment
            first_inst = contract.installments.order_by('due_date').first()
            if first_inst:
                contract.next_payment_date = first_inst.due_date
                contract.save()
        
        # --- AUTO-CREATE TENANT ---
        try:
            from apps.tenants.models import Tenant
            from django.utils.text import slugify
            if not Tenant.objects.filter(owner=contract.user).exists():
                base_subdomain = slugify(contract.full_name or contract.user.username)
                if not base_subdomain:
                    base_subdomain = slugify(contract.user.username) or f"client-{contract.user.id}"
                
                subdomain = base_subdomain
                counter = 1
                while Tenant.objects.filter(subdomain=subdomain).exists():
                    subdomain = f"{base_subdomain}-{counter}"
                    counter += 1
                
                Tenant.objects.create(
                    owner=contract.user,
                    name=contract.full_name or f"Portal de {contract.user.get_full_name() or contract.user.username}",
                    subdomain=subdomain,
                    is_active=False
                )
        except Exception as tenant_err:
            import logging
            logging.error(f"Error creating tenant automatically: {tenant_err}", exc_info=True)

        # Initialize stamp balance to 100 for plan contracts
        try:
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.filter(owner=contract.user).first()
            if tenant and contract.plan:
                tenant.stamp_balance = max(tenant.stamp_balance, 100)
                tenant.save(update_fields=['stamp_balance'])
        except Exception as stamp_err:
            import logging
            logging.error(f"Error initializing stamp balance for contract owner: {stamp_err}", exc_info=True)

        # --- AUTO-CREATE PROJECT ---
        try:
            from apps.dashboard.models import Project
            plan_name = contract.plan.name if contract.plan else 'Personalizado'
            project_name = f"Ecosistema - {contract.full_name} ({plan_name})"
            if not Project.objects.filter(client=contract.user, plan=contract.plan).exists():
                Project.objects.create(
                    client=contract.user,
                    plan=contract.plan,
                    name=project_name,
                    status=Project.Status.MVP,
                    is_active=True
                )
        except Exception as proj_err:
            import logging
            logging.error(f"Error creating project automatically: {proj_err}", exc_info=True)

        # Regenerar PDF FINAL y enviar copias certificadas
        try:
            if generate_contract_pdf(contract):
                send_contract_emails(contract)
                return Response({'message': 'Contrato cerrado, mensualidades generadas, proyecto creado y correo enviado con éxito'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({'error': 'Error al procesar el cierre'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='client-sign', permission_classes=[permissions.IsAuthenticated])
    def client_sign(self, request, pk=None):
        contract = self.get_object()
        if contract.user != request.user and not request.user.is_staff:
            return Response({'error': 'No tienes permisos para firmar este contrato'}, status=status.HTTP_403_FORBIDDEN)
            
        signature = request.data.get('signature')
        if not signature:
            return Response({'error': 'Firma del cliente requerida'}, status=status.HTTP_400_BAD_REQUEST)
            
        full_name = request.data.get('full_name')
        tax_id = request.data.get('tax_id')
        address = request.data.get('address')
        
        if full_name:
            contract.full_name = full_name
        if tax_id:
            contract.tax_id = tax_id
        if address:
            contract.address = address
            
        contract.signature_base64 = signature
        contract.signed_at = timezone.now()
        contract.save()
        
        try:
            if generate_contract_pdf(contract):
                send_contract_emails(contract)
                return Response({'message': 'Contrato firmado por el cliente. Pendiente de firma de Néctar Labs.'})
        except Exception as e:
            import logging
            logging.error(f"Error in client_sign flow: {e}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({'error': 'Error al procesar la firma del cliente'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='apply-promo-code', permission_classes=[permissions.IsAuthenticated])
    def apply_promo_code(self, request, pk=None):
        contract = self.get_object()
        code_str = request.data.get('code', '').strip().upper()
        
        if not code_str:
            return Response({'error': 'Código promocional no especificado.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            promo = PromoCode.objects.get(code=code_str)
            if not promo.is_valid():
                return Response({'error': 'Este código promocional ya no es válido o ha expirado.'}, status=status.HTTP_400_BAD_REQUEST)
                
            # Override contract's discount percentage with promo code's discount percentage
            contract.promo_code = promo
            contract.discount_percentage = promo.discount_percentage
            contract.save()
            
            # Recalculate only the next pending installment's amount
            from .utils import update_remaining_installments_amounts
            update_remaining_installments_amounts(contract)
            
            return Response({
                'message': f'Código {promo.code} aplicado con éxito. El próximo pago pendiente ha sido recalculado.',
                'discount_percentage': float(promo.discount_percentage),
                'contract_discount': float(contract.discount_percentage)
            })
        except PromoCode.DoesNotExist:
            return Response({'error': 'Código promocional no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def view_pdf(self, request, pk=None):
        user = request.user
        if not user or not user.is_authenticated:
            token = request.query_params.get('token')
            if token:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                try:
                    validated_token = JWTAuthentication().get_validated_token(token)
                    user = JWTAuthentication().get_user(validated_token)
                    request.user = user
                    self.request.user = user
                except Exception:
                    from django.http import HttpResponse
                    return HttpResponse("Token no válido o expirado.", status=401)
        
        if not user or not user.is_authenticated:
            from django.http import HttpResponse
            return HttpResponse("No autorizado.", status=401)

        from django.shortcuts import get_object_or_404
        contract = get_object_or_404(Contract, pk=pk)
        
        if not user.is_staff and contract.user != user:
            from django.http import HttpResponse
            return HttpResponse("No tienes acceso a este contrato.", status=403)

        if not contract.pdf_file:
            from django.http import HttpResponse
            return HttpResponse("PDF no generado para este contrato.", status=404)
        
        from django.http import HttpResponse
        try:
            contract.pdf_file.open('rb')
            pdf_content = contract.pdf_file.read()
            contract.pdf_file.close()
            django_response = HttpResponse(pdf_content, content_type='application/pdf')
            django_response['Content-Disposition'] = f'inline; filename="Contrato_{contract.id}.pdf"'
            return django_response
        except Exception as e:
            return HttpResponse(f"Error al recuperar el archivo PDF: {e}", status=500)

def get_or_create_generic_stripe_product(name, description, metadata_key, metadata_val):
    if getattr(settings, "TESTING", False) or not getattr(settings, "STRIPE_SECRET_KEY", None):
        return "dummy_product_id"
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        product_id = None
        for p in stripe.Product.list(limit=100).auto_paging_iter():
            if p.active and p.metadata.get(metadata_key) == metadata_val:
                product_id = p.id
                break
        if product_id:
            return product_id
        else:
            prod = stripe.Product.create(
                name=name,
                description=description,
                metadata={metadata_key: metadata_val}
            )
            return prod.id
    except Exception as e:
        import logging
        logging.getLogger("apps").error(f"Error creating generic product {name}: {e}")
        return None

def get_or_create_stripe_coupon(promo):
    if getattr(settings, "TESTING", False) or not getattr(settings, "STRIPE_SECRET_KEY", None):
        return "dummy_coupon_id"
    stripe.api_key = settings.STRIPE_SECRET_KEY
    coupon_id = f"django_{promo.code.lower()}"
    try:
        return stripe.Coupon.retrieve(coupon_id).id
    except Exception:
        duration = "once" if promo.code_type == PromoCode.CodeType.SELLER else "forever"
        coupon = stripe.Coupon.create(
            id=coupon_id,
            percent_off=float(promo.discount_percentage),
            duration=duration,
            metadata={"promo_code": promo.code}
        )
        return coupon.id

class PaymentInstallmentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentInstallmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Auto-healer: generate missing installments for already signed contracts (only if they have a plan)
        for contract in Contract.objects.filter(is_fully_signed=True, plan__isnull=False):
            if contract.installments.count() == 0:
                from apps.shop.utils import generate_installments_for_contract
                generate_installments_for_contract(contract)
            # Auto-healer for next_payment_date
            if not contract.next_payment_date:
                first_inst = contract.installments.order_by('due_date').first()
                if first_inst:
                    contract.next_payment_date = first_inst.due_date
                    contract.save()

        is_admin_or_business = self.request.user.is_staff or self.request.user.role in ['ADMIN', 'BUSINESS']
        if is_admin_or_business:
            return PaymentInstallment.objects.all().order_by('due_date')
        return PaymentInstallment.objects.filter(contract__user=self.request.user).order_by('due_date')

    def perform_update(self, serializer):
        is_admin_or_business = self.request.user.is_staff or self.request.user.role in ['ADMIN', 'BUSINESS']
        if not is_admin_or_business:
            wants_inv = self.request.data.get('wants_invoice')
            wants_inv_bool = wants_inv == 'true' or wants_inv is True
            instance = serializer.save(
                receipt_file=self.request.data.get('receipt_file'),
                payment_method=self.request.data.get('payment_method'),
                wants_invoice=wants_inv_bool
            )
        else:
            instance = serializer.save()

        # Si el estatus cambió a PAID y no tiene CFDI, la emitimos si se solicitó explícitamente (wants_invoice) o si la facturación es AUTOMATIC y el tenant tiene contratado el agregado.
        if instance.status == 'PAID' and not instance.cfdi_uuid:
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.filter(owner=instance.contract.user).first()
            if instance.wants_invoice or (tenant and tenant.invoicing_mode == Tenant.InvoicingMode.AUTOMATIC and 'automatic-invoicing' in tenant.active_addons):
                from apps.billing.services import issue_invoice_for_installment
                try:
                    issue_invoice_for_installment(instance)
                except Exception as e:
                    import logging
                    logging.getLogger("apps").error(f"Error al emitir CFDI automático en status update: {e}")

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def checkout_session(self, request, pk=None):
        installment = self.get_object()
        
        # Validar que no esté ya pagada
        if installment.status == PaymentInstallment.Status.PAID:
            return Response({'error': 'Esta mensualidad ya ha sido pagada.'}, status=status.HTTP_400_BAD_REQUEST)
            
        wants_invoice = request.data.get('wants_invoice', False)
        
        # Calcular monto final agregando 16% IVA si eligen facturar
        from decimal import Decimal
        base_amount = Decimal(str(installment.amount))
        if wants_invoice:
            final_amount = (base_amount * Decimal('1.16')).quantize(Decimal('0.01'))
            product_name = f"Mensualidad {installment.installment_number}/6 (Con Factura) - Nectar Labs"
        else:
            final_amount = base_amount.quantize(Decimal('0.01'))
            product_name = f"Mensualidad {installment.installment_number}/6 - Nectar Labs"

        # Resolver ID de producto Stripe
        stripe_product_id = None
        if installment.installment_type == PaymentInstallment.InstallmentType.DESIGN:
            stripe_product_id = get_or_create_generic_stripe_product(
                "[Néctar Labs] Diseño de Marca",
                "Servicios de diseño de marca e identidad visual",
                "special_product",
                "brand_design"
            )
        else:
            plan = installment.contract.plan
            if plan:
                if not plan.stripe_product_id:
                    try:
                        plan.save()
                    except Exception:
                        pass
                stripe_product_id = plan.stripe_product_id
            
            if not stripe_product_id:
                stripe_product_id = get_or_create_generic_stripe_product(
                    "[Néctar Labs] Desarrollo Personalizado",
                    "Servicios de desarrollo de software a la medida",
                    "special_product",
                    "custom_development"
                )

        try:
            price_data = {
                'currency': 'mxn',
                'unit_amount': int(final_amount * 100),  # Stripe requiere centavos
            }
            if stripe_product_id and stripe_product_id != "dummy_product_id":
                price_data['product'] = stripe_product_id
            else:
                price_data['product_data'] = {
                    'name': product_name,
                    'description': f"Cliente: {installment.contract.full_name}",
                }

            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': price_data,
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f"{get_frontend_origin(request)}/dashboard?payment=success&installment_id={installment.id}",
                cancel_url=f"{get_frontend_origin(request)}/dashboard?payment=cancel",
                metadata={
                    'installment_id': installment.id,
                    'wants_invoice': 'true' if wants_invoice else 'false'
                }
            )
            return Response({'url': session.url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def view_receipt(self, request, pk=None):
        user = request.user
        if not user or not user.is_authenticated:
            token = request.query_params.get('token')
            if token:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                try:
                    validated_token = JWTAuthentication().get_validated_token(token)
                    user = JWTAuthentication().get_user(validated_token)
                    request.user = user
                    self.request.user = user
                except Exception:
                    from django.http import HttpResponse
                    return HttpResponse("Token no válido o expirado.", status=401)
        
        if not user or not user.is_authenticated:
            from django.http import HttpResponse
            return HttpResponse("No autorizado.", status=401)

        from django.shortcuts import get_object_or_404
        installment = get_object_or_404(PaymentInstallment, pk=pk)
        
        is_admin_or_business = user.is_staff or user.role in ['ADMIN', 'BUSINESS']
        if not is_admin_or_business and installment.contract.user != user:
            from django.http import HttpResponse
            return HttpResponse("No tienes acceso a esta mensualidad.", status=403)

        if not installment.receipt_file:
            from django.http import HttpResponse
            return HttpResponse("No hay comprobante cargado para esta mensualidad.", status=404)
        
        import requests
        from django.http import HttpResponse
        try:
            response = requests.get(installment.receipt_file.url, timeout=10)
            content_type = response.headers.get('Content-Type', 'application/octet-stream')
            filename = f"Comprobante_{installment.id}"
            if "pdf" in content_type:
                filename += ".pdf"
            elif "png" in content_type:
                filename += ".png"
            elif "jpeg" in content_type or "jpg" in content_type:
                filename += ".jpg"
                
            django_response = HttpResponse(response.content, content_type=content_type)
            django_response['Content-Disposition'] = f'inline; filename="{filename}"'
            return django_response
        except Exception as e:
            return HttpResponse(f"Error al recuperar el archivo: {e}", status=500)
@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
    if webhook_secret:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError:
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError:
            # Fallback for non-production environments to allow Stripe CLI forwarding
            if getattr(settings, 'ENVIRONMENT', 'local') != 'production':
                import json
                try:
                    event = json.loads(payload.decode('utf-8'))
                except (ValueError, UnicodeDecodeError):
                    return HttpResponse(status=400)
            else:
                return HttpResponse(status=400)
    else:
        import json
        try:
            event = json.loads(payload.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return HttpResponse(status=400)

    # Idempotency check
    from .models import StripeEvent
    event_id = event.get('id')
    if event_id:
        if StripeEvent.objects.filter(event_id=event_id).exists():
            return HttpResponse("Event already processed.", status=200)
        try:
            StripeEvent.objects.create(event_id=event_id)
        except Exception:
            return HttpResponse("Event processing already in progress.", status=200)

    # Procesar pago exitoso
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Caso 1: Pago de una mensualidad (Installment)
        installment_id = session.get('metadata', {}).get('installment_id')
        if installment_id:
            try:
                installment = PaymentInstallment.objects.get(id=installment_id)
                installment.status = PaymentInstallment.Status.PAID
                installment.stripe_invoice_id = session.get('id')  # ID de sesión o pago
                installment.paid_at = timezone.now()
                installment.payment_method = 'STRIPE'
                installment.save()
                
                # Actualizar la fecha del siguiente pago en el contrato
                contract = installment.contract
                contract.next_payment_date = installment.due_date + timedelta(days=30)
                contract.save()
                
                # Generar factura CFDI automática si la preferencia del inquilino es AUTOMATIC y posee el agregado, o si solicitó facturar
                from apps.tenants.models import Tenant
                tenant = Tenant.objects.filter(owner=contract.user).first()
                wants_invoice = session.get('metadata', {}).get('wants_invoice') == 'true'
                if wants_invoice or (tenant and tenant.invoicing_mode == Tenant.InvoicingMode.AUTOMATIC and 'automatic-invoicing' in tenant.active_addons):
                    from apps.billing.services import issue_invoice_for_installment
                    try:
                        issue_invoice_for_installment(installment)
                    except Exception as cfdi_err:
                        import logging
                        logging.getLogger(__name__).error(f"Error en facturación automática Stripe Webhook: {cfdi_err}", exc_info=True)
                
                # Enviar correo de confirmación de pago (solo si no se facturó automáticamente para evitar duplicidad)
                if not installment.cfdi_uuid:
                    try:
                        send_payment_receipt_email(installment)
                    except Exception as mail_err:
                        import logging
                        logging.getLogger(__name__).error(f"Error sending payment receipt email: {mail_err}", exc_info=True)
            except PaymentInstallment.DoesNotExist:
                pass

        # Caso 2: Suscripción a un Add-on individual
        elif session.get('metadata', {}).get('type') == 'addon_subscription':
            user_id = session.get('metadata', {}).get('user_id')
            addon_id = session.get('metadata', {}).get('addon_id')
            addon_slug = session.get('metadata', {}).get('addon_slug')
            comments = session.get('metadata', {}).get('comments', '')
            import logging as _logging
            _webhook_logger = _logging.getLogger(__name__)
            _webhook_logger.info(f"[stripe_webhook] addon_subscription recibido: user_id={user_id} addon_id={addon_id} addon_slug={addon_slug}")
            if user_id and (addon_id or addon_slug):

                contract = None
                user = None
                try:

                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    user = User.objects.get(id=user_id)

                    # Upgrade role to BUSINESS if they are currently a CUSTOMER
                    if user.role == User.Role.CUSTOMER:
                        user.role = User.Role.BUSINESS
                        user.save()

                    # Buscar el contrato activo del usuario para agregarle el addon
                    contract = Contract.objects.filter(user=user, is_active=True).first()
                    if not contract:
                        # Si no tiene contrato activo, crear uno básico
                        contract = Contract.objects.create(
                            user=user,
                            full_name=user.get_full_name() or user.username,
                            tax_id='XAXX010101000',
                            address='Suscripción Digital (Stripe)',
                            project_idea='Suscripción a Add-ons y Complementos',
                            signature_base64='STRIPE_SUBSCRIPTION_ACTIVE',
                            is_fully_signed=True,
                            payment_commitment_method='STRIPE'
                        )
                    
                    addon = None
                    if addon_id:
                        try:
                            addon = AddOn.objects.get(id=addon_id)
                        except AddOn.DoesNotExist:
                            pass
                    if not addon and addon_slug:
                        try:
                            addon = AddOn.objects.get(slug=addon_slug)
                            addon_id = addon.id
                        except AddOn.DoesNotExist:
                            pass
                            
                    if addon:
                        contract.addons.add(addon)
                    
                        # --- CREATE OR UPDATE AddOnSubscription ---
                        try:
                            from apps.tenants.models import Tenant
                            tenant = Tenant.objects.filter(owner=contract.user).first()
                            subscription_id = session.get('subscription')
                            billing_cycle = session.get('metadata', {}).get('billing_cycle', 'monthly')
                            
                            price = addon.yearly_price if billing_cycle == 'yearly' else addon.monthly_price

                            AddOnSubscription.objects.update_or_create(
                                user=user,
                                addon=addon,
                                defaults={
                                    'tenant': tenant,
                                    'stripe_subscription_id': subscription_id,
                                    'status': 'active',
                                    'billing_cycle': billing_cycle,
                                    'price_paid': price,
                                    'is_activated': True
                                }
                            )

                            # Activate annexed addons
                            annexed_addons_str = session.get('metadata', {}).get('annexed_addons', '')
                            if annexed_addons_str:
                                annexed_slugs = [s.strip() for s in annexed_addons_str.split(',') if s.strip()]
                                for slug in annexed_slugs:
                                    try:
                                        ann_addon = AddOn.objects.get(slug=slug)
                                        contract.addons.add(ann_addon)
                                        AddOnSubscription.objects.update_or_create(
                                            user=user,
                                            addon=ann_addon,
                                            defaults={
                                                'tenant': tenant,
                                                'stripe_subscription_id': subscription_id,
                                                'status': 'active',
                                                'billing_cycle': billing_cycle,
                                                'price_paid': ann_addon.yearly_price if billing_cycle == 'yearly' else ann_addon.monthly_price,
                                                'is_activated': True
                                            }
                                        )
                                    except AddOn.DoesNotExist:
                                        pass
                        except Exception as sub_err:
                            _webhook_logger.error(f"[stripe_webhook] Error creating/updating AddOnSubscription in webhook: {sub_err}", exc_info=True)
                except Exception as core_err:
                    _webhook_logger.error(
                        f"[stripe_webhook] addon_subscription: error in core activation for user={user_id} addon={addon_id}: {core_err}",
                        exc_info=True
                    )

                # --- AUTO-CREATE TENANT ---
                try:
                    from apps.tenants.models import Tenant
                    from django.utils.text import slugify
                    if contract:
                        tenant = Tenant.objects.filter(owner=contract.user).first()
                        if not tenant:
                            base_subdomain = slugify(contract.full_name or contract.user.username)
                            if not base_subdomain:
                                base_subdomain = slugify(contract.user.username) or f"client-{contract.user.id}"
                            
                            subdomain = base_subdomain
                            counter = 1
                            while Tenant.objects.filter(subdomain=subdomain).exists():
                                subdomain = f"{base_subdomain}-{counter}"
                                counter += 1
                            
                            tenant = Tenant.objects.create(
                                owner=contract.user,
                                name=contract.full_name or f"Portal de {contract.user.get_full_name() or contract.user.username}",
                                subdomain=subdomain,
                                is_active=True
                            )
                        else:
                            if not tenant.is_active:
                                tenant.is_active = True
                                tenant.save()
                        
                        # Sync it back to the newly created/activated tenant in AddOnSubscription
                        try:
                            addon = AddOn.objects.get(id=addon_id)
                            AddOnSubscription.objects.filter(user=user, addon=addon).update(tenant=tenant)
                            
                            annexed_addons_str = session.get('metadata', {}).get('annexed_addons', '')
                            if annexed_addons_str:
                                annexed_slugs = [s.strip() for s in annexed_addons_str.split(',') if s.strip()]
                                for slug in annexed_slugs:
                                    try:
                                        ann_addon = AddOn.objects.get(slug=slug)
                                        AddOnSubscription.objects.filter(user=user, addon=ann_addon).update(tenant=tenant)
                                    except Exception:
                                        pass
                        except Exception:
                            pass
                except Exception as tenant_err:
                    _webhook_logger.error(f"Error creating/activating tenant on addon subscription: {tenant_err}", exc_info=True)

                # Enviar correo de confirmación de pago del Add-on (facturación)
                try:
                    if contract:
                        addon = AddOn.objects.get(id=addon_id)
                        send_addon_payment_receipt_email(contract.user, addon, session)
                        try:
                            from apps.shop.utils import send_addon_contracted_email
                            from apps.tenants.models import Tenant
                            _tenant_obj = Tenant.objects.filter(owner=contract.user).first()
                            tenant_subdomain = _tenant_obj.subdomain if _tenant_obj else None
                            send_addon_contracted_email(contract.user, addon, tenant_subdomain, is_activated=True)
                        except Exception as contracted_mail_err:
                            _webhook_logger.error(f"[stripe_webhook] Error sending addon contracted email: {contracted_mail_err}", exc_info=True)
                except Exception as mail_err:
                    _webhook_logger.error(f"Error sending addon subscription payment receipt email: {mail_err}", exc_info=True)

                # Notificar al equipo de soporte (email + realtime frontend admin)
                try:
                    _notify_user = contract.user if contract else user
                    _webhook_logger.info(f"[stripe_webhook] Intentando notify_support: user={getattr(_notify_user, 'email', None)} contract={getattr(contract, 'id', None)}")
                    if _notify_user:
                        addon_obj = AddOn.objects.get(id=addon_id)
                        _tenant_obj = None
                        try:
                            from apps.tenants.models import Tenant as _Tenant
                            _tenant_obj = _Tenant.objects.filter(owner=_notify_user).first()
                        except Exception:
                            pass
                        _webhook_logger.info(f"[stripe_webhook] Llamando notify_support_addon_subscription addon={addon_obj.name} tenant={getattr(_tenant_obj, 'name', None)}")
                        notify_support_addon_subscription(_notify_user, addon_obj, tenant=_tenant_obj)
                        _webhook_logger.info("[stripe_webhook] notify_support_addon_subscription completado sin excepción")
                    else:
                        _webhook_logger.warning("[stripe_webhook] No se encontró usuario para enviar notificación de soporte")
                except Exception as notify_err:
                    _webhook_logger.error(f"[stripe_webhook] Error sending support notification for addon subscription: {notify_err}", exc_info=True)


                
                # --- AUTO-CREATE IMPLEMENTATION TICKET ---
                try:
                    if contract:
                        from apps.tickets.models import Ticket
                        addon = AddOn.objects.get(id=addon_id)
                        ticket_title = f"[Suscripción Stripe] Integración de Add-on: {addon.name}"
                        ticket_description = (
                            f"## Nueva Suscripción Recurrente a Add-on (Pago Exitoso)\n\n"
                            f"El cliente ha realizado el pago en Stripe para suscribirse al módulo.\n\n"
                            f"### Detalles del Módulo\n"
                            f"- **Módulo**: {addon.name}\n"
                            f"- **Esquema de Pago**: Suscripción Mensual\n"
                            f"- **Precio**: ${addon.monthly_price} MXN/mes\n"
                            f"- **Referencia Técnica**: `{addon.source_reference}`\n"
                            f"- **Complejidad**: {addon.complexity}\n"
                            f"- **Requerimientos Servidor**: {addon.server_requirements}\n\n"
                            f"### Notas del Cliente / Requerimientos Particulares:\n"
                            f"{comments if comments.strip() else '_El cliente no ingresó comentarios adicionales._'}\n\n"
                            f"---\n"
                            f"*Creado automáticamente tras confirmación de Stripe Webhook.*"
                        )
                        Ticket.objects.create(
                            client=contract.user,
                            tenant=contract.user.owned_tenants.first() or contract.user.tenant,
                            title=ticket_title,
                            description=ticket_description,
                            category=Ticket.Category.IMPLEMENTATION,
                            priority=Ticket.Priority.HIGH,
                            status=Ticket.Status.OPEN
                        )
                except Exception as ticket_err:
                    _webhook_logger.error(f"Error creating ticket on webhook: {ticket_err}", exc_info=True)

        # Caso 3: Suscripción / Pago de Sponsorship (Patreon) para un cliente del Tenant
        elif session.get('metadata', {}).get('type') == 'patreon_sponsorship':
            tenant_id = session.get('metadata', {}).get('tenant_id')
            user_id = session.get('metadata', {}).get('user_id')
            tier_id = session.get('metadata', {}).get('tier_id')
            target_id = session.get('metadata', {}).get('target_id')
            billing_cycle = session.get('metadata', {}).get('billing_cycle', 'MONTHLY')
            
            if tenant_id and user_id and tier_id:
                try:
                    from apps.tenants.models import Tenant
                    from apps.sponsorship.models import SponsorshipTier, SponsorTarget, Sponsorship
                    from django.contrib.auth import get_user_model
                    
                    User = get_user_model()
                    tenant = Tenant.objects.get(id=tenant_id)
                    user = User.objects.get(id=user_id)
                    tier = SponsorshipTier.objects.get(id=tier_id, tenant=tenant)
                    
                    target = None
                    if target_id:
                        target = SponsorTarget.objects.filter(id=target_id, tenant=tenant).first()
                        
                    Sponsorship.objects.create(
                        tenant=tenant,
                        user=user,
                        target=target,
                        tier=tier,
                        billing_cycle=billing_cycle,
                        amount=tier.price_annual if billing_cycle == 'ANNUAL' else tier.price,
                        stripe_subscription_id=session.get('subscription'),
                        stripe_payment_intent=session.get('payment_intent'),
                        active=True
                    )
                except Exception as webhook_err:
                    import logging
                    logging.getLogger("apps").error(f"Error handling patreon_sponsorship webhook: {webhook_err}", exc_info=True)

        # Caso 4: Compra de paquete de timbres
        elif session.get('metadata', {}).get('type') == 'stamp_package':
            tenant_id = session.get('metadata', {}).get('tenant_id')
            stamps_count = session.get('metadata', {}).get('stamps_count')
            if tenant_id and stamps_count:
                try:
                    from apps.tenants.models import Tenant
                    tenant = Tenant.objects.get(id=tenant_id)
                    tenant.stamp_balance = (tenant.stamp_balance or 0) + int(stamps_count)
                    tenant.save()
                except Exception as e:
                    import logging
                    logging.getLogger("apps").error(f"Error updating stamp balance in webhook: {e}", exc_info=True)

        # Caso 5: Compra en la Tienda del Inquilino (Shop Purchase)
        elif session.get('metadata', {}).get('type') == 'shop_purchase':
            order_id = session.get('metadata', {}).get('order_id')
            if order_id:
                try:
                    from django.db import transaction
                    from .models import Order, Product
                    with transaction.atomic():
                        order = Order.objects.select_for_update().get(id=order_id)
                        if order.status == Order.Status.PENDING:
                            order.status = Order.Status.PAID
                            order.stripe_payment_intent = session.get('payment_intent')
                            order.stripe_session_id = session.get('id')
                            order.save()
                            
                            # Decrementar stock
                            for item in order.items.all():
                                product = Product.objects.select_for_update().get(id=item.product.id)
                                product.stock = max(0, product.stock - item.quantity)
                                product.save()
                                
                            from .shipping import generate_shipping_label
                            from .utils import send_order_confirmation_email
                            
                            def process_fulfillment(order_obj):
                                is_local = order_obj.shipping_provider and "Nectar Delivery" in order_obj.shipping_provider
                                if is_local:
                                    try:
                                        from apps.delivery.models import Vehicle, Stop
                                        rate_id = order_obj.skydropx_rate_id
                                        v_type = 'MOTORCYCLE'
                                        if rate_id == 'rate_nectar_BICYCLE':
                                            v_type = 'BICYCLE'
                                        elif rate_id == 'rate_nectar_CAR':
                                            v_type = 'CAR'
                                        
                                        # Find first active vehicle of the requested type
                                        vehicle = Vehicle.objects.filter(tenant=order_obj.tenant, vehicle_type=v_type, is_active=True).first()
                                        if not vehicle:
                                            # Fallback to any active vehicle
                                            vehicle = Vehicle.objects.filter(tenant=order_obj.tenant, is_active=True).first()

                                        # Extract client coordinates from Stripe session metadata
                                        lat_str = session.get('metadata', {}).get('latitude', '')
                                        lon_str = session.get('metadata', {}).get('longitude', '')
                                        lat = float(lat_str) if lat_str else 19.432608
                                        lon = float(lon_str) if lon_str else -99.133209

                                        # Create delivery stop in database
                                        Stop.objects.create(
                                            tenant=order_obj.tenant,
                                            vehicle=vehicle,
                                            name=f"Entrega: {order_obj.full_name or order_obj.user_email}",
                                            address=f"{order_obj.street_and_number or ''}, {order_obj.suburb or ''}, {order_obj.city or ''}, {order_obj.state or ''}",
                                            latitude=lat,
                                            longitude=lon,
                                            scheduled_time=timezone.now() + timedelta(hours=1), # Delivery in 1 hour
                                            status=Stop.Status.PENDING,
                                            order=Stop.objects.filter(tenant=order_obj.tenant, vehicle=vehicle).count() + 1 if vehicle else 1
                                        )

                                        # Update order info with local tracking details
                                        order_obj.tracking_number = f"DELIV-{order_obj.id:05d}"
                                        order_obj.tracking_url = f"/tenants/{order_obj.tenant.subdomain}/?addon=delivery-tracking"
                                        order_obj.status = Order.Status.SHIPPED
                                        order_obj.save()
                                    except Exception as local_err:
                                        import logging
                                        logging.getLogger("apps").error(f"Error creating local Nectar Delivery stop in webhook: {local_err}", exc_info=True)
                                else:
                                    # Fallback to standard Skydropx courier label generation
                                    generate_shipping_label(order_obj)
                                
                                send_order_confirmation_email(order_obj)
                                
                            transaction.on_commit(lambda: process_fulfillment(order))
                except Exception as e:
                    import logging
                    logging.getLogger("apps").error(f"Error processing shop purchase webhook: {e}", exc_info=True)

        # Caso 6: Compra de paquete de correos masivos (Email Credits)
        elif session.get('metadata', {}).get('type') == 'email_credits_package':
            tenant_id = session.get('metadata', {}).get('tenant_id')
            credits_count = session.get('metadata', {}).get('credits_count')
            if tenant_id and credits_count:
                try:
                    from apps.tenants.models import Tenant
                    tenant = Tenant.objects.get(id=tenant_id)
                    tenant.newsletter_extra_credits = (tenant.newsletter_extra_credits or 0) + int(credits_count)
                    tenant.save()
                except Exception as e:
                    import logging
                    logging.getLogger("apps").error(f"Error updating newsletter email credits in webhook: {e}", exc_info=True)

        # Caso 7: Compra de fondos para guías de envío (Shipping Wallet Funds)
        elif session.get('metadata', {}).get('type') == 'shipping_funds_package':
            tenant_id = session.get('metadata', {}).get('tenant_id')
            amount = session.get('metadata', {}).get('amount')
            if tenant_id and amount:
                try:
                    from apps.tenants.models import Tenant
                    from decimal import Decimal
                    tenant = Tenant.objects.get(id=tenant_id)
                    tenant.shipping_wallet_balance = (tenant.shipping_wallet_balance or Decimal('0.00')) + Decimal(str(amount))
                    tenant.save()
                except Exception as e:
                    import logging
                    logging.getLogger("apps").error(f"Error updating shipping wallet balance in webhook: {e}", exc_info=True)

    # Procesar cancelación de suscripción
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        subscription_id = subscription.get('id')
        metadata = subscription.get('metadata', {})
        user_id = metadata.get('user_id')
        addon_id = metadata.get('addon_id')
        addon_slug = metadata.get('addon_slug')
        
        try:
            addon_sub = None
            if subscription_id:
                addon_sub = AddOnSubscription.objects.filter(stripe_subscription_id=subscription_id).first()
            if not addon_sub and user_id and (addon_id or addon_slug):
                from django.db.models import Q
                q = Q(user_id=user_id)
                if addon_id:
                    q &= Q(addon_id=addon_id)
                elif addon_slug:
                    q &= Q(addon__slug=addon_slug)
                addon_sub = AddOnSubscription.objects.filter(q).first()
            
            if addon_sub:
                addon_sub.status = 'canceled'
                addon_sub.save()
                
                # Buscar el contrato activo del usuario y remover el add-on
                contract = Contract.objects.filter(user=addon_sub.user, is_active=True).first()
                if contract:
                    contract.addons.remove(addon_sub.addon)
            elif user_id and addon_id:
                # Fallback anterior
                contract = Contract.objects.filter(user_id=user_id, is_active=True).first()
                if contract:
                    contract.addons.remove(addon_id)
        except Exception as del_err:
            import logging
            logging.getLogger("apps").error(f"Error handling customer.subscription.deleted: {del_err}", exc_info=True)

    # Procesar actualización de suscripción (ej. pagos fallidos o exitosos cambiantes)
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        subscription_id = subscription.get('id')
        stripe_status = subscription.get('status') # active, past_due, trialing, incomplete, etc.
        metadata = subscription.get('metadata', {})
        user_id = metadata.get('user_id')
        addon_id = metadata.get('addon_id')
        addon_slug = metadata.get('addon_slug')
        
        try:
            addon_sub = None
            if subscription_id:
                addon_sub = AddOnSubscription.objects.filter(stripe_subscription_id=subscription_id).first()
            if not addon_sub and user_id and (addon_id or addon_slug):
                from django.db.models import Q
                q = Q(user_id=user_id)
                if addon_id:
                    q &= Q(addon_id=addon_id)
                elif addon_slug:
                    q &= Q(addon__slug=addon_slug)
                addon_sub = AddOnSubscription.objects.filter(q).first()
                
            if addon_sub:
                addon_sub.status = stripe_status
                addon_sub.save()
                
                # Sincronizar el add-on en el contrato activo
                contract = Contract.objects.filter(user=addon_sub.user, is_active=True).first()
                if contract:
                    if stripe_status in ['active', 'trialing']:
                        contract.addons.add(addon_sub.addon)
                    else:
                        contract.addons.remove(addon_sub.addon)
        except Exception as upd_err:
            import logging
            logging.getLogger("apps").error(f"Error handling customer.subscription.updated: {upd_err}", exc_info=True)

    # Acreditación de timbres en renovación/primer pago de suscripción mensual
    elif event['type'] == 'invoice.payment_succeeded':
        invoice_obj = event['data']['object']
        subscription_id = invoice_obj.get('subscription')
        if subscription_id:
            try:
                stripe.api_key = settings.STRIPE_SECRET_KEY
                
                subscription = stripe.Subscription.retrieve(subscription_id)
                metadata = subscription.get('metadata', {})
                if metadata.get('type') == 'addon_subscription':
                    user_id = metadata.get('user_id')
                    addon_id = metadata.get('addon_id')
                    addon_slug = metadata.get('addon_slug')
                    if user_id and (addon_id or addon_slug):
                        from django.contrib.auth import get_user_model
                        from apps.tenants.models import Tenant

                        User = get_user_model()
                        user = User.objects.get(id=user_id)
                        
                        addon = None
                        if addon_id:
                            try:
                                addon = AddOn.objects.get(id=addon_id)
                            except AddOn.DoesNotExist:
                                pass
                        if not addon and addon_slug:
                            try:
                                addon = AddOn.objects.get(slug=addon_slug)
                                addon_id = addon.id
                            except AddOn.DoesNotExist:
                                pass
                                
                        if addon:
                            tenant = Tenant.objects.filter(owner=user).first()
                            if addon.slug in ['facturacion-cfdi', 'ecommerce-combo']:
                                # Encontrar o crear Tenant
                                if not tenant:
                                    from django.utils.text import slugify
                                    contract = Contract.objects.filter(user=user, is_active=True).first()
                                    full_name = contract.full_name if contract else (user.get_full_name() or user.username)
                                    base_subdomain = slugify(full_name) or f"client-{user.id}"
                                    subdomain = base_subdomain
                                    counter = 1
                                    while Tenant.objects.filter(subdomain=subdomain).exists():
                                        subdomain = f"{base_subdomain}-{counter}"
                                        counter += 1
                                    tenant = Tenant.objects.create(
                                        owner=user,
                                        name=f"Portal de {full_name}",
                                        subdomain=subdomain,
                                        is_active=True
                                    )
                                if tenant:
                                    if addon.slug == 'facturacion-cfdi':
                                        tenant.stamp_balance = max(tenant.stamp_balance or 0, 100)
                                    else:
                                        tenant.stamp_balance = (tenant.stamp_balance or 0) + 20
                                    tenant.save()

                        # --- BUCLE INVERTIDO: Autofacturar la suscripción del inquilino ---
                        try:
                            from apps.billing.models import TaxProfile, Invoice
                            from apps.billing.services import get_pac_service, PACError, LCOSyncError
                            from decimal import Decimal
                            
                            tenant = Tenant.objects.filter(owner=user).first()
                            if tenant and hasattr(tenant, 'tax_profile') and tenant.tax_profile.facturapi_organization_id:
                                profile = tenant.tax_profile
                                
                                # Monto pagado en pesos (amount_paid está en centavos)
                                amount_paid = Decimal(str(invoice_obj.get('amount_paid', 0))) / Decimal('100.00')
                                if amount_paid > 0:
                                    # El total pagado ya incluye IVA del 16%, base = total / 1.16
                                    price_base = (amount_paid / Decimal('1.16')).quantize(Decimal('0.01'))
                                    invoice_total = amount_paid.quantize(Decimal('0.01'))
                                    
                                    # Crear registro de factura
                                    invoice = Invoice.objects.create(
                                        tenant=tenant,
                                        stripe_invoice_id=invoice_obj.get('id') or invoice_obj.get('charge'),
                                        total=invoice_total,
                                        status=Invoice.Status.PENDING
                                    )
                                    
                                    # La autofacturación consume un timbre del inquilino (Parent-to-Tenant)
                                    if not tenant.has_available_stamps():
                                        invoice.status = Invoice.Status.FAILED
                                        invoice.error_message = "No tienes timbres suficientes para autofacturación."
                                        invoice.save()
                                    else:
                                        customer_info = {
                                            "razon_social": user.get_full_name() or user.username,
                                            "rfc": profile.rfc,
                                            "regimen_fiscal": profile.regimen_fiscal,
                                            "codigo_postal": profile.codigo_postal,
                                            "email": user.email
                                        }
                                        items = [{
                                            "quantity": 1,
                                            "unit_price": float(price_base),
                                            "description": f"Suscripción Mensual Add-on: {addon.name} ({tenant.name})"
                                        }]
                                        
                                        pac = get_pac_service()
                                        try:
                                            res = pac.create_invoice(invoice, profile, customer_info, items, is_parent_to_tenant=True)
                                            invoice.facturapi_invoice_id = res["facturapi_invoice_id"]
                                            invoice.uuid_sat = res["uuid_sat"]
                                            invoice.xml_file.save(res["xml_file"].name, res["xml_file"], save=False)
                                            invoice.pdf_file.save(res["pdf_file"].name, res["pdf_file"], save=False)
                                            invoice.status = Invoice.Status.PAID
                                            invoice.error_message = None
                                            invoice.save()
                                            
                                            tenant.consume_stamp()
                                            
                                            # Enviar factura por correo electrónico
                                            from .utils import send_autofactura_email
                                            send_autofactura_email(user, invoice)
                                        except LCOSyncError as e:
                                            invoice.status = Invoice.Status.LCO_SYNC_PENDING
                                            invoice.error_message = str(e)
                                            invoice.save()
                                            tenant.consume_stamp()
                                        except PACError as e:
                                            invoice.status = Invoice.Status.FAILED
                                            invoice.error_message = str(e)
                                            invoice.save()
                        except Exception as auto_inv_err:
                            import logging
                            logging.getLogger("apps").error(f"Error en bucle invertido de facturación: {auto_inv_err}", exc_info=True)
            except Exception as e:
                import logging
                logging.getLogger("apps").error(f"Error handling invoice.payment_succeeded webhook: {e}", exc_info=True)

    return HttpResponse(status=200)


@csrf_exempt
def facturapi_webhook(request):
    import json
    import hmac
    import hashlib
    import logging
    import requests
    from django.http import HttpResponse
    from django.db import transaction
    from django.core.files.base import ContentFile
    from django.conf import settings
    from apps.billing.models import Invoice, TaxProfile
    from apps.shop.models import PaymentInstallment
    from decimal import Decimal

    logger = logging.getLogger("apps")

    if request.method != 'POST':
        return HttpResponse("Only POST requests allowed", status=405)

    signature = request.headers.get('Facturapi-Signature')
    payload_body = request.body

    # Verify signature if secret is configured
    webhook_secret = getattr(settings, 'FACTURAPI_WEBHOOK_SECRET', '')
    if webhook_secret:
        if not signature:
            logger.warning("[facturapi_webhook] Missing Facturapi-Signature header.")
            return HttpResponse("Missing signature", status=400)
        
        secret = bytes(webhook_secret, 'utf-8')
        digest = hmac.new(secret, msg=payload_body, digestmod=hashlib.sha256)
        calculated = digest.hexdigest()
        
        if not hmac.compare_digest(calculated, signature):
            logger.warning("[facturapi_webhook] Signature verification failed.")
            return HttpResponse("Invalid signature", status=401)

    try:
        payload = json.loads(payload_body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError) as e:
        logger.error(f"[facturapi_webhook] JSON parse error: {e}")
        return HttpResponse("Invalid JSON", status=400)

    event_type = payload.get('type')
    event_data = payload.get('data', {}).get('object', {})
    facturapi_invoice_id = event_data.get('id')

    if not event_type or not facturapi_invoice_id:
        return HttpResponse("Missing event metadata", status=400)

    logger.info(f"[facturapi_webhook] Received event {event_type} for invoice {facturapi_invoice_id}")

    if event_type == 'invoice.created':
        uuid_sat = event_data.get('uuid')
        
        # Look up the invoice first (without blocking transaction) to see if we can fetch/create it
        invoice = Invoice.objects.filter(facturapi_invoice_id=facturapi_invoice_id).first()
        
        # Handle creating invoice if created directly on Facturapi
        if not invoice:
            organization_id = payload.get('organization')
            if organization_id:
                profile = TaxProfile.objects.filter(facturapi_organization_id=organization_id).first()
                if profile:
                    try:
                        invoice = Invoice.objects.create(
                            tenant=profile.tenant,
                            facturapi_invoice_id=facturapi_invoice_id,
                            total=Decimal(str(event_data.get('total', 0))),
                            status=Invoice.Status.PENDING,
                            is_tenant_to_customer=True
                        )
                        logger.info(f"[facturapi_webhook] Created local invoice for external Facturapi invoice {facturapi_invoice_id}")
                    except Exception as create_err:
                        logger.error(f"[facturapi_webhook] Error creating local invoice record: {create_err}")

        xml_file = None
        pdf_file = None

        if invoice and (not invoice.xml_file or not invoice.pdf_file):
            try:
                headers = {
                    "Authorization": f"Bearer {settings.PAC_API_KEY}",
                    "Content-Type": "application/json"
                }
                if invoice.is_tenant_to_customer:
                    tax_profile = getattr(invoice.tenant, 'tax_profile', None)
                    if tax_profile and tax_profile.facturapi_organization_id:
                        headers["Facturapi-Organization"] = tax_profile.facturapi_organization_id
                
                base_url = "https://www.facturapi.io/v2/invoices"
                xml_resp = requests.get(f"{base_url}/{facturapi_invoice_id}/xml", headers=headers, timeout=10)
                pdf_resp = requests.get(f"{base_url}/{facturapi_invoice_id}/pdf", headers=headers, timeout=10)
                
                if xml_resp.status_code == 200:
                    xml_file = ContentFile(xml_resp.content, name=f"{uuid_sat}.xml")
                if pdf_resp.status_code == 200:
                    pdf_file = ContentFile(pdf_resp.content, name=f"{uuid_sat}.pdf")
            except Exception as file_err:
                logger.error(f"[facturapi_webhook] Error downloading invoice files: {file_err}")

        if invoice:
            with transaction.atomic():
                # Lock the invoice
                invoice = Invoice.objects.select_for_update().filter(id=invoice.id).first()
                if invoice and invoice.status != Invoice.Status.PAID:
                    # Check if we should decrement stamp balance (if not already decremented)
                    if invoice.status in [Invoice.Status.PENDING, Invoice.Status.FAILED]:
                        tenant = invoice.tenant
                        tenant.stamp_balance = max(0, tenant.stamp_balance - 1)
                        tenant.save()
                    
                    invoice.status = Invoice.Status.PAID
                    invoice.uuid_sat = uuid_sat
                    invoice.error_message = None
                    if xml_file:
                        invoice.xml_file.save(xml_file.name, xml_file, save=False)
                    if pdf_file:
                        invoice.pdf_file.save(pdf_file.name, pdf_file, save=False)
                    invoice.save()
                    logger.info(f"[facturapi_webhook] Marked invoice {facturapi_invoice_id} as PAID")
                    
                    # If this is parent-to-tenant invoice, link to PaymentInstallment and send confirmation email
                    if not invoice.is_tenant_to_customer:
                        inst = PaymentInstallment.objects.filter(stripe_invoice_id=invoice.stripe_invoice_id).first()
                        if inst:
                            inst.cfdi_uuid = str(uuid_sat)
                            inst.save(update_fields=['cfdi_uuid'])
                            try:
                                from .utils import send_payment_receipt_email
                                send_payment_receipt_email(inst)
                            except Exception as mail_err:
                                logger.error(f"[facturapi_webhook] Error sending payment receipt email: {mail_err}")

    elif event_type == 'invoice.cancelled':
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().filter(facturapi_invoice_id=facturapi_invoice_id).first()
            if invoice and invoice.status != Invoice.Status.CANCELLED:
                invoice.status = Invoice.Status.CANCELLED
                invoice.save(update_fields=['status'])
                logger.info(f"[facturapi_webhook] Marked invoice {facturapi_invoice_id} as CANCELLED")

    elif event_type == 'invoice.failed':
        message = event_data.get('message') or event_data.get('error', {}).get('message') or "Unknown error"
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().filter(facturapi_invoice_id=facturapi_invoice_id).first()
            if invoice and invoice.status != Invoice.Status.FAILED:
                invoice.status = Invoice.Status.FAILED
                invoice.error_message = message
                invoice.save(update_fields=['status', 'error_message'])
                logger.info(f"[facturapi_webhook] Marked invoice {facturapi_invoice_id} as FAILED: {message}")

    return HttpResponse("OK", status=200)


class PromoCodeViewSet(viewsets.ModelViewSet):
    serializer_class = PromoCodeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            user = request.user
            is_admin = user.is_staff or getattr(user, 'role', '') == 'ADMIN'
            if not is_admin:
                self.permission_denied(request, message="No tienes permisos para administrar códigos de referido.")

    def get_queryset(self):
        # Staff/admin see ALL codes (including inactive), regular users see only active
        user = self.request.user
        if user.is_staff or getattr(user, 'role', '') in ['ADMIN', 'BUSINESS']:
            return PromoCode.objects.all().order_by('-created_at')
        return PromoCode.objects.filter(is_active=True)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def validate(self, request):
        code_str = request.query_params.get('code', '').strip().upper()
        if not code_str:
            return Response({'is_valid': False, 'message': 'Código promocional no especificado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            promo = PromoCode.objects.get(code=code_str)
            if promo.is_valid():
                return Response({
                    'is_valid': True,
                    'code': promo.code,
                    'discount_percentage': float(promo.discount_percentage),
                    'code_type': promo.code_type,
                    'message': f'Código {promo.code} aplicado con éxito (-{promo.discount_percentage}% en tu primer mes).'
                })
            else:
                return Response({
                    'is_valid': False,
                    'message': 'Este código promocional ya no es válido o ha expirado.'
                })
        except PromoCode.DoesNotExist:
            return Response({
                'is_valid': False,
                'message': 'Código promocional no encontrado.'
            })

    @action(detail=False, methods=['get'], url_path='my-referral-code')
    def my_referral_code(self, request):
        user = request.user
        if user.role == 'SALES' and not getattr(user, 'is_approved_seller', False):
            return Response({
                'code': None,
                'code_type': 'SELLER',
                'discount_percentage': 10.00,
                'used_count': 0
            })

        code_str = f"NECTAR-{user.username.upper()}"
        
        # Determine code type based on user role
        code_type = PromoCode.CodeType.SELLER if user.role == 'SALES' else PromoCode.CodeType.CLIENT
        discount = 10.00
        
        promo, created = PromoCode.objects.get_or_create(
            referrer=user,
            defaults={
                'code': code_str,
                'code_type': code_type,
                'discount_percentage': discount,
                'is_active': True,
            }
        )
        return Response({
            'code': promo.code,
            'code_type': promo.code_type,
            'discount_percentage': float(promo.discount_percentage),
            'used_count': promo.used_count
        })


class SalesCommissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SalesCommissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role in ['ADMIN', 'BUSINESS']:
            return SalesCommission.objects.all().order_by('-created_at')
        return SalesCommission.objects.filter(salesperson=user).order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        user = request.user
        commissions = self.get_queryset()
        paid_total = sum(c.amount for c in commissions.filter(status='PAID'))
        pending_total = sum(c.amount for c in commissions.filter(status='PENDING'))
        
        # Referred contracts count
        if user.is_staff or user.role in ['ADMIN', 'BUSINESS']:
            # Admin sees global: total unique sellers, total referred contracts
            from apps.users.models import User as UserModel
            active_sellers = UserModel.objects.filter(role='SALES').count()
            referred_contracts_count = Contract.objects.filter(
                promo_code__code_type='SELLER'
            ).distinct().count()
        else:
            active_sellers = None
            referred_contracts_count = Contract.objects.filter(
                promo_code__referrer=user,
                promo_code__code_type='SELLER'
            ).distinct().count()

        return Response({
            'paid_total': float(paid_total),
            'pending_total': float(pending_total),
            'referred_contracts_count': referred_contracts_count,
            'active_sellers': active_sellers,
        })

    @action(detail=True, methods=['post'], url_path='mark-paid', permission_classes=[permissions.IsAuthenticated])
    def mark_paid(self, request, pk=None):
        """Admin-only: mark a SalesCommission as PAID."""
        user = request.user
        if not (user.is_staff or getattr(user, 'role', '') in ['ADMIN', 'BUSINESS']):
            return Response({'error': 'No tienes permiso para realizar esta acción.'}, status=status.HTTP_403_FORBIDDEN)

        commission = self.get_object()
        if commission.status == SalesCommission.Status.PAID:
            return Response({'error': 'Esta comisión ya fue marcada como pagada.'}, status=status.HTTP_400_BAD_REQUEST)

        commission.status = SalesCommission.Status.PAID
        commission.save()

        serializer = self.get_serializer(commission)
        return Response(serializer.data, status=status.HTTP_200_OK)


from rest_framework.views import APIView
from django.db import transaction
from decimal import Decimal
from apps.tenants.models import Tenant
from .models import Order, OrderItem
from .shipping import get_shipping_rates

class GetShippingRatesView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        tenant_id = request.data.get('tenant_id')
        subdomain = request.data.get('subdomain')
        tenant = None
        
        if tenant_id:
            tenant = Tenant.objects.filter(id=tenant_id, is_active=True).first()
        elif subdomain:
            tenant = Tenant.objects.filter(subdomain=subdomain.lower(), is_active=True).first()

        if not tenant:
            return Response({"error": "No se pudo identificar un inquilino (tenant) válido."}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce minimum balance of $250 MXN for quotations and labels
        if tenant.shipping_wallet_balance < 250.00:
            return Response({
                "error": "Saldo insuficiente en tu Cartera de Envíos. Se requiere un saldo mínimo de $250.00 MXN para cotizar y generar guías."
            }, status=status.HTTP_400_BAD_REQUEST)

        destination = request.data.get('destination')
        if not destination or not (destination.get('zip_code') or destination.get('postal_code')):
            return Response({"error": "La dirección de destino con código postal es obligatoria."}, status=status.HTTP_400_BAD_REQUEST)

        if not destination.get('zip_code') and destination.get('postal_code'):
            destination['zip_code'] = destination['postal_code']

        parcel = request.data.get('parcel')
        rates = get_shipping_rates(destination, parcel=parcel, tenant=tenant)

        # Si el tenant tiene activo el add-on de Nectar Delivery / GPS, ofrecer tarifas dinámicas
        if 'delivery-tracking' in tenant.active_addons or 'logistics-gps' in tenant.active_addons:
            from apps.delivery.models import DeliveryConfig
            config = DeliveryConfig.objects.filter(tenant=tenant).first()
            origin_lat = float(config.map_center_latitude) if config else 19.432608
            origin_lon = float(config.map_center_longitude) if config else -99.133209

            # Obtener coordenadas de destino del cliente
            dest_lat = destination.get('latitude') or request.data.get('latitude')
            dest_lon = destination.get('longitude') or request.data.get('longitude')

            distance_km = 0.0
            if dest_lat is not None and dest_lon is not None:
                try:
                    import math
                    lat1, lon1 = math.radians(float(origin_lat)), math.radians(float(origin_lon))
                    lat2, lon2 = math.radians(float(dest_lat)), math.radians(float(dest_lon))
                    dlat = lat2 - lat1
                    dlon = lon2 - lon1
                    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    distance_km = 6371.0 * c
                    # Control de edge cases: distancias negativas
                    if distance_km < 0:
                        distance_km = 0.0
                except Exception:
                    distance_km = 3.0  # fallback
            else:
                distance_km = 3.0  # fallback if no coords are specified

            # Calcular costos dinámicos de envío local por tipo de vehículo
            # Bicicleta (Eco-friendly): Costo base $15 + $5 por km (tarifa más conveniente para promover esfuerzo)
            bici_amount = max(15.0, 15.0 + 5.0 * distance_km)
            # Motocicleta: Costo base $25 + $8 por km
            moto_amount = max(25.0, 25.0 + 8.0 * distance_km)
            # Automóvil: Costo base $40 + $12 por km
            car_amount = max(40.0, 40.0 + 12.0 * distance_km)

            rates.append({
                "id": "rate_nectar_BICYCLE",
                "provider": "Nectar Delivery (Bici Eco)",
                "service_level_name": f"Entrega Ecológica en Bicicleta ({distance_km:.1f} km)",
                "days": "Hoy (Express)",
                "amount": str(round(bici_amount, 2))
            })
            rates.append({
                "id": "rate_nectar_MOTORCYCLE",
                "provider": "Nectar Delivery (Moto)",
                "service_level_name": f"Entrega Rápida en Motocicleta ({distance_km:.1f} km)",
                "days": "Hoy (Express)",
                "amount": str(round(moto_amount, 2))
            })
            rates.append({
                "id": "rate_nectar_CAR",
                "provider": "Nectar Delivery (Auto)",
                "service_level_name": f"Entrega Segura en Automóvil ({distance_km:.1f} km)",
                "days": "Hoy (Express)",
                "amount": str(round(car_amount, 2))
            })

        return Response({"rates": rates}, status=status.HTTP_200_OK)


class ShopCheckoutView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        data = request.data
        tenant_id = data.get('tenant_id')
        subdomain = data.get('subdomain')
        
        tenant = None
        if tenant_id:
            tenant = Tenant.objects.select_for_update().filter(id=tenant_id, is_active=True).first()
        elif subdomain:
            tenant = Tenant.objects.select_for_update().filter(subdomain=subdomain.lower(), is_active=True).first()

        if not tenant:
            return Response({"error": "No se pudo identificar un inquilino (tenant) válido."}, status=status.HTTP_400_BAD_REQUEST)

        email = data.get('email')
        full_name = data.get('full_name')
        phone = data.get('phone', '')
        street_and_number = data.get('street_and_number')
        suburb = data.get('suburb')
        city = data.get('city')
        state = data.get('state')
        postal_code = data.get('postal_code')
        country = data.get('country', 'MX')
        items_data = data.get('items', [])
        
        skydropx_rate_id = data.get('skydropx_rate_id')
        shipping_cost = data.get('shipping_cost')
        shipping_cost_base = data.get('shipping_cost_base')
        shipping_provider = data.get('shipping_provider', 'FedEx')

        if not all([email, full_name, street_and_number, suburb, city, state, postal_code, items_data]):
            return Response({"error": "Todos los campos de entrega e ítems son requeridos."}, status=status.HTTP_400_BAD_REQUEST)

        if skydropx_rate_id is None or shipping_cost is None:
            return Response({"error": "Debes seleccionar una tarifa de envío válida."}, status=status.HTTP_400_BAD_REQUEST)

        total_products_amount = Decimal('0.00')
        order_items_to_prepare = []
        line_items = []

        for item in items_data:
            prod_id = item.get('product_id')
            qty = int(item.get('quantity', 1))

            try:
                product = Product.objects.select_for_update().get(id=prod_id, tenant=tenant)
            except Product.DoesNotExist:
                return Response({"error": f"Producto con ID {prod_id} no encontrado en este catálogo."}, status=status.HTTP_404_NOT_FOUND)

            if product.stock < qty:
                return Response({"error": f"Stock insuficiente para {product.name}."}, status=status.HTTP_400_BAD_REQUEST)

            total_products_amount += product.price * qty
            order_items_to_prepare.append({'product': product, 'quantity': qty, 'price': product.price})

            price_id = product.stripe_price_id
            if not price_id or not price_id.startswith('price_'):
                line_items.append({
                    'price_data': {
                        'currency': 'mxn',
                        'product_data': {
                            'name': product.name,
                            'description': product.description,
                        },
                        'unit_amount': int(product.price * 100),
                    },
                    'quantity': qty,
                })
            else:
                line_items.append({
                    'price': price_id,
                    'quantity': qty,
                })

        line_items.append({
            'price_data': {
                'currency': 'mxn',
                'product_data': {
                    'name': f"Envío ({shipping_provider})",
                },
                'unit_amount': int(Decimal(str(shipping_cost)) * 100),
            },
            'quantity': 1,
        })

        total_order_amount = total_products_amount + Decimal(str(shipping_cost))
        order = Order.objects.create(
            tenant=tenant,
            user=request.user if request.user.is_authenticated else None,
            user_email=email,
            total=total_order_amount,
            status=Order.Status.PENDING,
            full_name=full_name,
            phone=phone,
            street_and_number=street_and_number,
            suburb=suburb,
            city=city,
            state=state,
            postal_code=postal_code,
            country=country,
            shipping_provider=shipping_provider,
            shipping_cost=Decimal(str(shipping_cost)),
            shipping_cost_base=Decimal(str(shipping_cost_base or shipping_cost)),
            skydropx_rate_id=skydropx_rate_id
        )

        for item_data in order_items_to_prepare:
            OrderItem.objects.create(
                order=order,
                product=item_data['product'],
                quantity=item_data['quantity'],
                price=item_data['price']
            )

        frontend_url = settings.FRONTEND_URL
        if tenant.use_custom_domain and tenant.custom_domain:
            base_url = tenant.custom_domain if tenant.custom_domain.startswith(('http://', 'https://')) else f"https://{tenant.custom_domain}"
        else:
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(frontend_url)
            if parsed.netloc:
                netloc = f"{tenant.subdomain}.{parsed.netloc}"
                base_url = urlunparse(parsed._replace(netloc=netloc))
            else:
                base_url = f"https://{tenant.subdomain}.nectarlabs.dev"

        success_url = f"{base_url}/shop/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{base_url}/shop/cart"

        latitude = data.get('latitude')
        longitude = data.get('longitude')

        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=email,
                metadata={
                    'order_id': str(order.id),
                    'type': 'shop_purchase',
                    'latitude': str(latitude) if latitude is not None else '',
                    'longitude': str(longitude) if longitude is not None else ''
                }
            )
            
            return Response({
                "checkout_url": checkout_session.url,
                "order_id": order.id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import logging
            logging.getLogger("apps").error(f"Error creating Stripe Session for shop checkout: {e}", exc_info=True)
            return Response({"error": "No se pudo procesar la pasarela de pago."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrderStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response({"error": "Falta el parámetro session_id."}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import Order
        order = Order.objects.filter(stripe_session_id=session_id).first()
        if not order:
            return Response({"error": "Pedido no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            
        return Response({
            "id": order.id,
            "status": order.status,
            "total": str(order.total),
            "full_name": order.full_name,
            "shipping_provider": order.shipping_provider,
            "tracking_number": order.tracking_number,
            "tracking_url": order.tracking_url
        }, status=status.HTTP_200_OK)


from django.db import transaction
from decimal import Decimal
import uuid
from apps.tenants.models import Tenant

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Order.objects.all()
        tenant_id = self.request.query_params.get('tenant_id')
        if tenant_id:
            try:
                queryset = queryset.filter(tenant_id=uuid.UUID(str(tenant_id)))
            except (ValueError, TypeError):
                queryset = queryset.none()
        return queryset

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            return Response({"detail": "Se requiere tenant_id."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            tenant = Tenant.objects.select_for_update().get(id=tenant_id)
        except (Tenant.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "Tenant no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            
        items_data = data.get('items', [])
        if not items_data:
            return Response({"detail": "La orden debe contener al menos un producto."}, status=status.HTTP_400_BAD_REQUEST)

        total_amount = Decimal('0.00')
        order_items_to_create = []
        
        # Validar stocks
        for item in items_data:
            prod_id = item.get('product_id')
            qty = int(item.get('quantity', 1))
            try:
                product = Product.objects.select_for_update().get(id=prod_id, tenant=tenant)
            except Product.DoesNotExist:
                return Response({"detail": f"Producto con ID {prod_id} no encontrado en este catálogo."}, status=status.HTTP_404_NOT_FOUND)
                
            if product.stock < qty:
                return Response({"detail": f"Stock insuficiente para {product.name} (Disponible: {product.stock})."}, status=status.HTTP_400_BAD_REQUEST)
                
            # Restar del stock
            product.stock -= qty
            product.save(update_fields=['stock'])
            
            unit_price = Decimal(str(item.get('unit_price', product.price)))
            total_amount += unit_price * qty
            order_items_to_create.append((product, qty, unit_price))

        user = request.user if request.user.is_authenticated else None
        payment_method = data.get('payment_method', 'CASH')
        
        order = Order.objects.create(
            tenant=tenant,
            user=user,
            user_email=data.get('recipient_email') or (user.email if user else None),
            total=total_amount,
            status=Order.Status.PENDING,
            payment_method=payment_method,
            full_name=data.get('recipient_name', ''),
            phone=data.get('recipient_phone', ''),
            street_and_number=data.get('delivery_address', '')
        )

        for product, qty, price in order_items_to_create:
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=qty,
                price=price
            )

        stripe_session_url = None
        if payment_method == 'STRIPE':
            if not tenant.stripe_secret_key:
                # Si se selecciona tarjeta pero el tenant no cargó credenciales, lanzar error explicativo
                return Response(
                    {"detail": "Esta tienda no tiene configurada su pasarela de pagos Stripe para recibir tarjetas bancarias."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Formatear productos para Stripe Checkout
            line_items = []
            for product, qty, price in order_items_to_create:
                line_items.append({
                    'price_data': {
                        'currency': 'mxn',
                        'product_data': {
                            'name': product.name,
                            'description': product.description or '',
                        },
                        'unit_amount': int(price * 100),  # Stripe recibe centavos
                    },
                    'quantity': qty,
                })
                
            import stripe
            try:
                # Construir URLs de redirección dinámicas basadas en el origen HTTP del request (el portal público del tenant)
                referrer = request.META.get('HTTP_REFERER') or ''
                if '?' in referrer:
                    referrer = referrer.split('?')[0]
                
                success_url = f"{referrer}?payment_success=true&shop_order_id={order.id}&session_id={{CHECKOUT_SESSION_ID}}"
                cancel_url = f"{referrer}?payment_cancel=true"
                
                # Crear sesión de pago en Stripe utilizando el API Key secreto configurado por el tenant
                session = stripe.checkout.Session.create(
                    api_key=tenant.stripe_secret_key,
                    payment_method_types=['card'],
                    line_items=line_items,
                    mode='payment',
                    success_url=success_url,
                    cancel_url=cancel_url,
                    metadata={
                        'order_id': str(order.id),
                        'tenant_id': str(tenant.id)
                    }
                )
                stripe_session_url = session.url
                order.stripe_session_id = session.id
                order.save(update_fields=['stripe_session_id'])
            except Exception as e:
                return Response(
                    {"detail": f"Error al inicializar sesión de Stripe con la llave del inquilino: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        serializer = self.get_serializer(order)
        res_data = serializer.data
        res_data['stripe_session_url'] = stripe_session_url
        return Response(res_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='verify-stripe-payment')
    def verify_stripe_payment(self, request, pk=None):
        """
        Endpoint auto-healer para verificar el estado de un pago en Stripe
        y actualizar el estado local del pedido de forma segura.
        """
        order = self.get_object()
        tenant = order.tenant
        if not tenant or not tenant.stripe_secret_key:
            return Response(
                {"detail": "Llave secreta de Stripe no configurada por este inquilino."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        session_id = request.data.get('session_id') or order.stripe_session_id
        if not session_id:
            return Response(
                {"detail": "No se encontró un ID de sesión Stripe válido para esta orden."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        import stripe
        try:
            session = stripe.checkout.Session.retrieve(session_id, api_key=tenant.stripe_secret_key)
            if session.get('payment_status') == 'paid':
                order.status = Order.Status.PAID
                order.save(update_fields=['status'])
                return Response({
                    "success": True,
                    "status": order.status,
                    "message": "Pago verificado y registrado de manera exitosa."
                })
            else:
                return Response({
                    "success": False,
                    "status": order.status,
                    "message": f"El pago no se ha completado en Stripe. Estado actual: {session.get('payment_status')}"
                })
        except Exception as e:
            return Response(
                {"detail": f"Error al consultar la API de Stripe del inquilino: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

