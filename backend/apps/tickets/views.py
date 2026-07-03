from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.tenants.permissions import HasAddOnPermission
from .models import Ticket, Message, SupportChat, SupportChatMessage
from .serializers import (
    TicketSerializer, MessageSerializer, 
    SupportChatSerializer, SupportChatMessageSerializer
)

class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'ADMIN':
            return Ticket.objects.all().order_by('-created_at')
        elif user.role == 'BUSINESS':
            return Ticket.objects.filter(tenant__owner=user).order_by('-created_at')
        elif user.role == 'CUSTOMER' and user.tenant:
            return Ticket.objects.filter(client=user, tenant=user.tenant).order_by('-created_at')
        return Ticket.objects.filter(client=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        tenant = None
        if user.role == 'CUSTOMER':
            tenant = user.tenant
        elif user.role == 'BUSINESS':
            tenant = user.owned_tenants.first()
        ticket = serializer.save(client=user, tenant=tenant)
        
        # Trigger email notifications for support ticket creation
        try:
            from .utils import send_ticket_creation_emails
            send_ticket_creation_emails(ticket)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send ticket creation emails: {e}", exc_info=True)

    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        ticket = self.get_object()
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            msg = serializer.save(ticket=ticket, sender=request.user)
            # Update ticket timestamp
            ticket.save() 
            
            # Trigger email notifications for ticket message reply
            try:
                from .utils import send_ticket_message_emails
                send_ticket_message_emails(ticket, msg)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to send ticket reply emails: {e}", exc_info=True)
                
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        import logging
        logging.getLogger(__name__).warning(f"MessageSerializer validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = Ticket.Status.CLOSED
        ticket.save()
        return Response({'status': 'ticket closed'})




class SupportChatViewSet(viewsets.ModelViewSet):
    serializer_class = SupportChatSerializer
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'bot-chat'


    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'ADMIN':
            return SupportChat.objects.all().order_by('-updated_at')
        elif user.role == 'BUSINESS':
            return SupportChat.objects.filter(tenant__owner=user).order_by('-updated_at')
        elif user.role == 'CUSTOMER' and user.tenant:
            return SupportChat.objects.filter(client=user, tenant=user.tenant).order_by('-updated_at')
        return SupportChat.objects.filter(client=user).order_by('-updated_at')

    def perform_create(self, serializer):
        user = self.request.user
        tenant = None
        if user.role == 'CUSTOMER':
            tenant = user.tenant
        elif user.role == 'BUSINESS':
            tenant = user.owned_tenants.first()
            
        if tenant and tenant.is_in_trial:
            existing_chats = SupportChat.objects.filter(tenant=tenant).count()
            if existing_chats >= 5:
                from rest_framework import serializers as api_serializers
                raise api_serializers.ValidationError({
                    "detail": "El período de prueba está limitado a un máximo de 5 chats de soporte. Por favor, actualiza tu plan para recibir más consultas."
                })
        serializer.save(client=user, tenant=tenant)

    @action(detail=False, methods=['get'])
    def active(self, request):
        user = request.user

        # Staff / ADMIN / BUSINESS don't have a "personal" chat session
        if user.is_staff or user.role in ['ADMIN', 'BUSINESS']:
            return Response(None, status=status.HTTP_204_NO_CONTENT)

        # For CUSTOMER users: find their open chat (tenant may be None for direct NectarLabs clients)
        active_chat = SupportChat.objects.filter(
            client=user,
            tenant=user.tenant,   # None for direct clients, UUID for tenant portal clients
            status__in=[SupportChat.Status.OPEN, SupportChat.Status.IN_PROGRESS]
        ).first()

        if active_chat:
            serializer = self.get_serializer(active_chat)
            return Response(serializer.data)
        return Response(None, status=status.HTTP_204_NO_CONTENT)


    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        """
        FALLBACK DE API REST: Agrega un mensaje a una sesión de chat activa vía HTTP POST.
        Nota de Arquitectura: Mientras que el microservicio de Realtime (Node.js) maneja
        la comunicación y el streaming WebSocket en producción, este endpoint sirve como
        puente HTTP estándar. Si el chat está 'OPEN' (sin agentes humanos) y el mensaje
        proviene del cliente, se dispara de forma síncrona la respuesta del chatbot de IA.
        """
        chat = self.get_object()
        if chat.status == SupportChat.Status.CLOSED:
            return Response({'error': 'Chat is closed'}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = SupportChatMessageSerializer(data=request.data)
        if serializer.is_valid():
            msg = serializer.save(chat=chat, sender=request.user)
            chat.save()  # Actualiza la marca de tiempo de actividad en la tabla del chat
 
            # === FALLBACK AUTO-REPLY DE IA SÍNCRONO ===
            # Solo se dispara si ningún agente humano se ha unido (estatus OPEN)
            if chat.status == SupportChat.Status.OPEN:
                try:
                    from .ai_service import generate_ai_reply
                    # Obtener respuesta síncrona completa desde la API de Groq
                    ai_text = generate_ai_reply(chat, msg.message)
                    if ai_text:
                        # Guardar el mensaje del bot en la base de datos
                        ai_msg = SupportChatMessage.objects.create(
                            chat=chat,
                            sender=request.user,   # Requerido por la sintaxis; se filtra por flag is_ai_message
                            message=ai_text,
                            is_ai_message=True,
                        )
                        chat.save()
                        
                        # Retornar tanto el mensaje original del usuario como el del bot en un solo payload
                        ai_serializer = SupportChatMessageSerializer(ai_msg)
                        return Response({
                            'message': serializer.data,
                            'ai_reply': ai_serializer.data,
                        }, status=status.HTTP_201_CREATED)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"[AI] Unexpected error in add_message: {e}")

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        import logging
        logging.getLogger(__name__).warning(f"SupportChatMessageSerializer validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        user = request.user
        if not (user.is_staff or user.role in ['ADMIN', 'BUSINESS']):
            return Response({'error': 'Only staff can join/claim chats'}, status=status.HTTP_403_FORBIDDEN)
            
        chat = self.get_object()
        if chat.status == SupportChat.Status.OPEN:
            chat.status = SupportChat.Status.IN_PROGRESS
            chat.save()
        return Response(self.get_serializer(chat).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        chat = self.get_object()
        chat.status = SupportChat.Status.CLOSED
        chat.save()
        return Response({'status': 'chat closed'})
