"""
WebSocket consumer for real-time driver location broadcast.
Requires: channels, channels-redis (or in-memory layer for dev).

Install:
    pip install channels channels-redis

settings.py additions:
    INSTALLED_APPS += ['channels']
    ASGI_APPLICATION = 'config.asgi.application'
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {"hosts": [("redis", 6379)]},
        }
    }
"""
import json

try:
    from channels.generic.websocket import AsyncWebsocketConsumer

    class DeliveryTrackingConsumer(AsyncWebsocketConsumer):
        """
        Clients connect to:
            ws://<host>/ws/delivery/<subdomain>/
        They receive JSON messages of type:
            { "type": "driver.location", "data": { ... } }
        """

        async def connect(self):
            self.subdomain = self.scope['url_route']['kwargs']['subdomain']
            self.group_name = f"delivery_{self.subdomain}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()

        async def disconnect(self, close_code):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

        # Receive from WebSocket client (not used — clients are read-only)
        async def receive(self, text_data=None, bytes_data=None):
            pass

        # Called by channel layer when a "driver.location" message is sent to the group
        async def driver_location(self, event):
            await self.send(text_data=json.dumps({
                "type": "driver.location",
                "data": event["data"]
            }))

except ImportError:
    # django-channels not installed — no-op stub so the app still boots
    class DeliveryTrackingConsumer:  # type: ignore
        """Stub: install django-channels to enable real-time tracking."""
        pass
