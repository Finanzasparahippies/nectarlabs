from rest_framework import serializers
from .models import Ticket, Message, SupportChat, SupportChatMessage

class MessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source='sender.email', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_email', 'content', 'created_at']
        read_only_fields = ['sender']


class TicketSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'client', 'client_email', 'title', 'description', 
            'category', 'status', 'priority', 'created_at', 'updated_at', 'messages'
        ]
        read_only_fields = ['client']

    def validate_status(self, value):
        user = self.context['request'].user
        if not user.is_staff and self.instance and self.instance.status != value:
            raise serializers.ValidationError("Only staff can change ticket status.")
        return value


class SupportChatMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)

    class Meta:
        model = SupportChatMessage
        fields = ['id', 'chat', 'sender', 'sender_email', 'sender_role', 'message', 'is_ai_message', 'created_at']
        read_only_fields = ['chat', 'sender', 'is_ai_message']



class SupportChatSerializer(serializers.ModelSerializer):
    messages = SupportChatMessageSerializer(many=True, read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)

    class Meta:
        model = SupportChat
        fields = [
            'id', 'client', 'client_email', 'status', 'created_at', 'updated_at', 'messages'
        ]
        read_only_fields = ['client']
