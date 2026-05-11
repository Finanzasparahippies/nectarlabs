from rest_framework import generics, permissions
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Añadir claims personalizados al token si es necesario
        token['is_staff'] = user.is_staff
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Añadir información extra a la respuesta JSON
        data['is_staff'] = self.user.is_staff
        data['email'] = self.user.email
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    from .serializers import UserSerializer
    from .models import User
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer
