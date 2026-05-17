from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Ticket, Message
from .serializers import TicketSerializer, MessageSerializer

class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Ticket.objects.all()
        return Ticket.objects.filter(client=user)

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)

    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        ticket = self.get_object()
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(ticket=ticket, sender=request.user)
            # Update ticket timestamp
            ticket.save() 
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = Ticket.Status.CLOSED
        ticket.save()
        return Response({'status': 'ticket closed'})
