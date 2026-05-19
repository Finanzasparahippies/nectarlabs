from rest_framework import generics, permissions, viewsets
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

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('email')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
