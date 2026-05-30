import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { parse } from 'url';
import dotenv from 'dotenv';
import pool from './db.js';
import { generateAiReplyStream } from './ai.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);
const SECRET_KEY = process.env.DJANGO_SECRET_KEY || process.env.SECRET_KEY || 'django-insecure-default-key';

// Keep track of connected clients and their active chat subscriptions
interface ClientConnection {
  ws: WebSocket;
  userId: number;
  email: string;
  role: string;
  subscribedChatId: number | null;
}

const connections = new Set<ClientConnection>();

const wss = new WebSocketServer({ port: PORT });

console.log(`[Realtime] Servidor de WebSockets iniciado en el puerto ${PORT}`);

// Helper to broadcast JSON data to all clients subscribed to a specific chat room
const broadcastToRoom = (chatId: number, data: any) => {
  const payload = JSON.stringify(data);
  for (const client of connections) {
    if (client.subscribedChatId === chatId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
};

wss.on('connection', async (ws, req) => {
  try {
    const parameters = parse(req.url || '', true).query;
    const token = parameters.token as string;

    if (!token) {
      console.warn('[Realtime] Intento de conexión rechazado: Token faltante.');
      ws.close(4001, 'Authentication error: Token missing');
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
    } catch (err) {
      console.warn('[Realtime] Intento de conexión rechazado: Token inválido.', err);
      ws.close(4002, 'Authentication error: Invalid token');
      return;
    }

    const userId = decoded.user_id;
    if (!userId) {
      console.warn('[Realtime] Token válido pero no contiene user_id.');
      ws.close(4003, 'Authentication error: User ID missing in token');
      return;
    }

    // Query user details from DB
    const userRes = await pool.query('SELECT id, email, role FROM users_user WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      console.warn(`[Realtime] Usuario con ID ${userId} no encontrado en la DB.`);
      ws.close(4004, 'Authentication error: User not found');
      return;
    }

    const user = userRes.rows[0];
    const clientConn: ClientConnection = {
      ws,
      userId: user.id,
      email: user.email,
      role: user.role,
      subscribedChatId: null,
    };

    connections.add(clientConn);
    console.log(`[Realtime] Cliente conectado: ${user.email} (Rol: ${user.role}). Total conexiones: ${connections.size}`);

    ws.on('message', async (messageData) => {
      try {
        const data = JSON.parse(messageData.toString());
        
        switch (data.type) {
          case 'subscribe': {
            const chatId = parseInt(data.chatId, 10);
            if (isNaN(chatId)) return;

            // Verify authorization
            const chatRes = await pool.query('SELECT * FROM tickets_supportchat WHERE id = $1', [chatId]);
            if (chatRes.rows.length === 0) {
              ws.send(JSON.stringify({ type: 'error', message: 'Chat no encontrado.' }));
              return;
            }

            const chat = chatRes.rows[0];
            const isAgent = user.role === 'ADMIN' || user.role === 'BUSINESS' || user.role === 'DEVELOPER';
            if (!isAgent && chat.client_id !== user.id) {
              ws.send(JSON.stringify({ type: 'error', message: 'No autorizado para acceder a este chat.' }));
              return;
            }

            clientConn.subscribedChatId = chatId;
            console.log(`[Realtime] Cliente ${user.email} se suscribió al chat #${chatId}`);
            
            // Send connection confirmation
            ws.send(JSON.stringify({ type: 'subscribed', chatId }));
            break;
          }

          case 'message': {
            const chatId = clientConn.subscribedChatId;
            if (!chatId) {
              ws.send(JSON.stringify({ type: 'error', message: 'No estás suscrito a ningún chat activo. Envía un evento subscribe primero.' }));
              return;
            }

            const text = data.message?.trim();
            if (!text) return;

            // Double check authorization and status
            const chatRes = await pool.query('SELECT * FROM tickets_supportchat WHERE id = $1', [chatId]);
            if (chatRes.rows.length === 0) return;
            const chat = chatRes.rows[0];

            if (chat.status === 'CLOSED') {
              ws.send(JSON.stringify({ type: 'error', message: 'Este chat se encuentra cerrado.' }));
              return;
            }

            // Save user message to PostgreSQL
            const insertRes = await pool.query(
              `INSERT INTO tickets_supportchatmessage (chat_id, sender_id, message, is_ai_message, created_at)
               VALUES ($1, $2, $3, false, NOW())
               RETURNING id, chat_id, sender_id, message, is_ai_message, created_at`,
              [chatId, user.id, text]
            );
            
            const savedMsg = insertRes.rows[0];
            
            // Format and broadcast the message immediately to all room subscribers
            const broadcastPayload = {
              id: savedMsg.id,
              sender_email: user.email,
              sender_role: user.role,
              message: savedMsg.message,
              is_ai_message: savedMsg.is_ai_message,
              created_at: savedMsg.created_at.toISOString(),
            };

            broadcastToRoom(chatId, {
              type: 'message',
              chatId,
              message: broadcastPayload,
            });

            // Update chat updated_at
            await pool.query('UPDATE tickets_supportchat SET updated_at = NOW() WHERE id = $1', [chatId]);

            // If a human agent replies and the chat was 'OPEN', update status to 'IN_PROGRESS'
            const isAgent = user.role === 'ADMIN' || user.role === 'BUSINESS' || user.role === 'DEVELOPER';
            if (isAgent && chat.status === 'OPEN') {
              await pool.query("UPDATE tickets_supportchat SET status = 'IN_PROGRESS' WHERE id = $1", [chatId]);
              broadcastToRoom(chatId, {
                type: 'status_change',
                chatId,
                status: 'IN_PROGRESS',
              });
            }

            // Trigger AI assistant if status is still 'OPEN' (no agent claimed it)
            if (chat.status === 'OPEN' && !isAgent) {
              console.log(`[Realtime] Generando respuesta de IA para Chat #${chatId}...`);
              
              let aiResponseText = '';
              let streamStarted = false;

              await generateAiReplyStream(
                chatId,
                text,
                (token) => {
                  if (!streamStarted) {
                    broadcastToRoom(chatId, {
                      type: 'ai_stream_start',
                      chatId,
                    });
                    streamStarted = true;
                  }
                  aiResponseText += token;
                  broadcastToRoom(chatId, {
                    type: 'ai_stream_token',
                    chatId,
                    token,
                  });
                },
                async (fullText) => {
                  // AI complete! Save bot message to DB
                  try {
                    // System user ID or agent ID fallback for AI sender
                    // In Django, views.py uses `request.user` as sender. We will associate it with the same client id or admin user.
                    // Let's check which user is the author of AI messages. In views.py, it sets `sender=request.user` which is the client.
                    const aiInsertRes = await pool.query(
                      `INSERT INTO tickets_supportchatmessage (chat_id, sender_id, message, is_ai_message, created_at)
                       VALUES ($1, $2, $3, true, NOW())
                       RETURNING id, chat_id, sender_id, message, is_ai_message, created_at`,
                      [chatId, chat.client_id, fullText]
                    );
                    const savedAiMsg = aiInsertRes.rows[0];

                    const aiPayload = {
                      id: savedAiMsg.id,
                      sender_email: 'bot@nectarlabs.dev',
                      sender_role: 'BOT',
                      message: savedAiMsg.message,
                      is_ai_message: true,
                      created_at: savedAiMsg.created_at.toISOString(),
                    };

                    broadcastToRoom(chatId, {
                      type: 'ai_stream_complete',
                      chatId,
                      message: aiPayload,
                    });

                    // Update chat updated_at
                    await pool.query('UPDATE tickets_supportchat SET updated_at = NOW() WHERE id = $1', [chatId]);
                  } catch (dbErr) {
                    console.error('[Realtime] Error saving AI message to DB:', dbErr);
                  }
                },
                (err) => {
                  console.error('[Realtime] AI stream error:', err);
                  broadcastToRoom(chatId, {
                    type: 'error',
                    message: 'Hubo un inconveniente al generar la respuesta de la IA.',
                  });
                }
              );
            }
            break;
          }
        }
      } catch (err) {
        console.error('[Realtime] Error parsing client message:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Formato de mensaje inválido.' }));
      }
    });

    ws.on('close', () => {
      connections.delete(clientConn);
      console.log(`[Realtime] Cliente desconectado: ${user.email}. Restantes: ${connections.size}`);
    });

    ws.on('error', (err) => {
      console.error(`[Realtime] Error en conexión de ${user.email}:`, err);
      connections.delete(clientConn);
    });

  } catch (err) {
    console.error('[Realtime] Error durante la inicialización de la conexión:', err);
    try { ws.close(4000, 'Internal Server Error'); } catch {}
  }
});
