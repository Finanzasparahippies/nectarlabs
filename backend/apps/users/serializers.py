from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'password', 'role', 'is_approved_seller', 'tenant', 'is_email_verified', 'referral_code')

    def create(self, validated_data):
        # Extract fields to pass to create_user or save after
        tenant = validated_data.pop('tenant', None)
        is_approved_seller = validated_data.pop('is_approved_seller', False)
        is_staff = validated_data.pop('is_staff', False)
        is_superuser = validated_data.pop('is_superuser', False)
        is_email_verified = validated_data.pop('is_email_verified', False)

        email = validated_data['email']
        username = validated_data.get('username')
        if not username:
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

        password = validated_data.get('password')
        if not password:
            password = User.objects.make_random_password()

        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            role=validated_data.get('role', User.Role.CUSTOMER)
        )

        # Save additional fields
        if tenant is not None:
            user.tenant = tenant
        user.is_approved_seller = is_approved_seller
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.is_email_verified = is_email_verified
        user.save()
        return user

    def update(self, instance, validated_data):
        request = self.context.get('request')
        
        if 'is_approved_seller' in validated_data:
            # Only admin, business or staff can update approval status
            if not (request and (request.user.is_staff or request.user.role in ['ADMIN', 'BUSINESS'])):
                validated_data.pop('is_approved_seller')

        # Guard role and tenant fields from unauthorized updates
        if request and request.user:
            request_user = request.user
            is_super_admin = request_user.is_staff or request_user.role == 'ADMIN'
            
            # Role protection
            if 'role' in validated_data and validated_data['role'] != instance.role:
                if not is_super_admin:
                    new_role = validated_data['role']
                    is_biz_or_staff = request_user.role in [User.Role.BUSINESS, User.Role.STAFF]
                    is_other_user = instance != request_user
                    
                    if is_biz_or_staff and is_other_user and new_role in [User.Role.CUSTOMER, User.Role.STAFF]:
                        user_tenant = request_user.owned_tenants.first() if request_user.role == User.Role.BUSINESS else request_user.tenant
                        if user_tenant and instance.tenant == user_tenant:
                            pass  # Allowed
                        else:
                            validated_data.pop('role')
                    else:
                        validated_data.pop('role')

            # Tenant protection
            if 'tenant' in validated_data and validated_data['tenant'] != instance.tenant:
                if not is_super_admin:
                    new_tenant = validated_data['tenant']
                    is_biz = request_user.role == User.Role.BUSINESS
                    is_staff = request_user.role == User.Role.STAFF
                    
                    if is_biz and new_tenant in request_user.owned_tenants.all():
                        pass
                    elif is_staff and new_tenant == request_user.tenant:
                        pass
                    else:
                        validated_data.pop('tenant')
        
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password_confirm = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.CUSTOMER, required=False)
    referral_code = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password_confirm', 'role', 'referral_code')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
            
        referral_code = attrs.get('referral_code')
        if referral_code:
            from apps.shop.models import PromoCode
            try:
                promo = PromoCode.objects.get(code=referral_code.strip().upper())
                if not promo.is_valid():
                    raise serializers.ValidationError({"referral_code": "El código de referido ha expirado o no es válido."})
            except PromoCode.DoesNotExist:
                raise serializers.ValidationError({"referral_code": "El código de referido no existe."})
                
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        referral_code = validated_data.pop('referral_code', None)
        
        email = validated_data['email']
        username = validated_data.get('username')
        if not username:
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
        
        requested_role = validated_data.get('role', User.Role.CUSTOMER)
        if requested_role not in [User.Role.CUSTOMER, User.Role.SALES]:
            role_to_assign = User.Role.CUSTOMER
        else:
            role_to_assign = requested_role
                
        user = User.objects.create_user(
            email=email,
            username=username,
            password=validated_data['password'],
            role=role_to_assign
        )
        
        # Public registrations start as email unverified
        user.is_email_verified = False
        if referral_code:
            user.referral_code = referral_code.strip().upper()
        user.save()
        return user
