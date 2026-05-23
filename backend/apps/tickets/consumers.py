import json
import os
from channels.generic.websocket import AsyncWebsocketConsumer
from groq import Groq

class SupportChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        
        # Historial de la sesión para que mantenga memoria del chat
        self.history = [
            {
                "role": "system",
                "content": (
                    "Eres el asistente multitenant de Nectar Labs. Ayuda al usuario a navegar "
                    "por la plataforma. Rutas: /dashboard, /shop, /tickets."
                    "Nunca des información sobre precios, suscripciones o datos sensibles."
                    "Responde siempre de forma breve, util y en español latinoamericano o el idioma que hable el usuario."
                    "Si el usuario pregunta sobre temas sensibles o que no conoces, redirígelo al soporte humano."
                    "Intenta que los temas no se desvien mucho sobre lo que es Nectar Labs o sus productos."
                )
            }
        ]

    async def receive(self, text_data):
        data = json.loads(text_data)
        user_message = data.get('message')

        if user_message:
            # Añadimos el mensaje del usuario al historial
            self.history.append({"role": "user", "content": user_message})

            try:
                # Petición a Groq Cloud (Tarda milisegundos en responder)
                chat_completion = self.client.chat.completions.create(
                    messages=self.history,
                    model="llama-3.1-8b-instant",
                    temperature=0.5,
                )
                
                bot_response = chat_completion.choices[0].message.content
                
                # Guardamos lo que respondió la IA en el historial
                self.history.append({"role": "assistant", "content": bot_response})

                await self.send(text_data=json.dumps({
                    'sender': 'bot',
                    'message': bot_response
                }))
            except Exception as e:
                await self.send(text_data=json.dumps({
                    'sender': 'bot',
                    'message': "Hubo un parpadeo en la red. ¿Me repites la pregunta?"
                }))