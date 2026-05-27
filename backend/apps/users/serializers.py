from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'password', 'role', 'is_approved_seller')

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            role=validated_data.get('role', User.Role.CUSTOMER)
        )
        return user

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if 'is_approved_seller' in validated_data:
            # Only admin, business or staff can update approval status
            if not (request and (request.user.is_staff or request.user.role in ['ADMIN', 'BUSINESS'])):
                validated_data.pop('is_approved_seller')
        return super().update(instance, validated_data)
