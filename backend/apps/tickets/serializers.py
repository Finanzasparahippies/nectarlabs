from rest_framework import serializers
from .models import Ticket, Message

class MessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source='sender.email', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_email', 'content', 'created_at']


class TicketSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'client', 'client_email', 'title', 'description', 
            'category', 'status', 'priority', 'created_at', 'updated_at', 'messages'
        ]
        read_only_fields = ['client', 'status']
