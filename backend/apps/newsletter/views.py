from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Subscriber

class SubscribeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if not email:
            return Response({"error": "El correo electrónico es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)
        
        subscriber, created = Subscriber.objects.get_or_create(email=email)
        if not created:
            if subscriber.is_active:
                return Response({"message": "Este correo ya se encuentra suscrito de forma activa."}, status=status.HTTP_200_OK)
            else:
                subscriber.is_active = True
                subscriber.save()
                return Response({"message": "¡Tu suscripción ha sido reactivada con éxito!"}, status=status.HTTP_200_OK)
        
        return Response({"message": "¡Te has suscrito con éxito al newsletter de Néctar Labs!"}, status=status.HTTP_201_CREATED)
