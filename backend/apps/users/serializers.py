from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'password', 'role', 'is_approved_seller', 'tenant')

    def create(self, validated_data):
        # Extract fields to pass to create_user or save after
        tenant = validated_data.pop('tenant', None)
        is_approved_seller = validated_data.pop('is_approved_seller', False)
        is_staff = validated_data.pop('is_staff', False)
        is_superuser = validated_data.pop('is_superuser', False)

        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            role=validated_data.get('role', User.Role.CUSTOMER)
        )

        # Save additional fields
        if tenant is not None:
            user.tenant = tenant
        user.is_approved_seller = is_approved_seller
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.save()
        return user

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if 'is_approved_seller' in validated_data:
            # Only admin, business or staff can update approval status
            if not (request and (request.user.is_staff or request.user.role in ['ADMIN', 'BUSINESS'])):
                validated_data.pop('is_approved_seller')
        return super().update(instance, validated_data)
