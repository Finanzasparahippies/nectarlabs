import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { parse } from 'url';
import dotenv from 'dotenv';
import pool from './db.js';
import { generateAiReplyStream } from './ai.js';
import http from 'http';

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

// Helper to broadcast JSON data to ALL connected ADMIN users regardless of chat subscription
const broadcastToAdmins = (data: any) => {
  const payload = JSON.stringify(data);
  let count = 0;
  for (const client of connections) {
    if (client.role === 'ADMIN' && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
      count++;
    }
  }
  console.log(`[Realtime] broadcastToAdmins: enviado a ${count} administradores conectados.`);
};

wss.on('connection', async (ws, req) => {
  let clientConn: ClientConnection | null = null;
  let isReady = false;
  const queue: any[] = [];

  const handleMessage = async (messageData: any) => {
    if (!clientConn) return;
    try {
      const data = JSON.parse(messageData.toString());
      console.log(`[Realtime] Mensaje recibido de ${clientConn.email}:`, data);
      
      switch (data.type) {
        case 'subscribe': {
          const chatId = parseInt(data.chatId, 10);
          console.log(`[Realtime] Intento de suscripción al chat #${chatId} por el usuario ${clientConn.email} (ID: ${clientConn.userId}, Rol: ${clientConn.role})`);
          if (isNaN(chatId)) {
            console.warn(`[Realtime] Suscripción fallida: chatId no es un número válido (${data.chatId})`);
            return;
          }

          // Verify authorization
          const chatRes = await pool.query('SELECT * FROM tickets_supportchat WHERE id = $1', [chatId]);
          console.log(`[Realtime] Búsqueda de chat en DB para #${chatId}. Encontrado: ${chatRes.rows.length > 0}`);
          if (chatRes.rows.length === 0) {
            console.warn(`[Realtime] Suscripción fallida: Chat #${chatId} no encontrado en la DB.`);
            ws.send(JSON.stringify({ type: 'error', message: 'Chat no encontrado.' }));
            return;
          }

          const chat = chatRes.rows[0];
          console.log(`[Realtime] Datos del Chat: ID cliente en DB: ${chat.client_id} (Tipo: ${typeof chat.client_id}), ID usuario: ${clientConn.userId} (Tipo: ${typeof clientConn.userId})`);
          
          const isAgent = clientConn.role === 'ADMIN' || clientConn.role === 'BUSINESS' || clientConn.role === 'DEVELOPER';
          if (!isAgent && chat.client_id !== clientConn.userId) {
            console.warn(`[Realtime] Suscripción fallida: Usuario ${clientConn.email} (ID ${clientConn.userId}) no autorizado para chat #${chatId} (Propietario: ${chat.client_id}).`);
            ws.send(JSON.stringify({ type: 'error', message: 'No autorizado para acceder a este chat.' }));
            return;
          }

          clientConn.subscribedChatId = chatId;
          console.log(`[Realtime] Cliente ${clientConn.email} se suscribió con éxito al chat #${chatId}`);
          
          // Send connection confirmation
          ws.send(JSON.stringify({ type: 'subscribed', chatId }));
          break;
        }

        case 'message': {
          const chatId = clientConn.subscribedChatId;
          console.log(`[Realtime] Mensaje recibido de ${clientConn.email} para chat #${chatId}: "${data.message}"`);
          if (!chatId) {
            console.warn(`[Realtime] Mensaje rechazado: Cliente ${clientConn.email} no está suscrito a ningún chat.`);
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
            [chatId, clientConn.userId, text]
          );
          
          const savedMsg = insertRes.rows[0];
          
          // Format and broadcast the message immediately to all room subscribers
          const broadcastPayload = {
            id: savedMsg.id,
            sender_email: clientConn.email,
            sender_role: clientConn.role,
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
          const isAgent = clientConn.role === 'ADMIN' || clientConn.role === 'BUSINESS' || clientConn.role === 'DEVELOPER';
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
  };

  ws.on('message', (messageData) => {
    if (!isReady) {
      queue.push(messageData);
    } else {
      handleMessage(messageData);
    }
  });

  ws.on('close', () => {
    if (clientConn) {
      connections.delete(clientConn);
      console.log(`[Realtime] Cliente desconectado: ${clientConn.email}. Restantes: ${connections.size}`);
    }
  });

  ws.on('error', (err) => {
    if (clientConn) {
      console.error(`[Realtime] Error en conexión de ${clientConn.email}:`, err);
      connections.delete(clientConn);
    }
  });

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
    clientConn = {
      ws,
      userId: user.id,
      email: user.email,
      role: user.role,
      subscribedChatId: null,
    };

    connections.add(clientConn);
    console.log(`[Realtime] Cliente conectado: ${user.email} (Rol: ${user.role}). Total conexiones: ${connections.size}`);

    isReady = true;
    for (const msg of queue) {
      handleMessage(msg);
    }

  } catch (err) {
    console.error('[Realtime] Error durante la inicialización de la conexión:', err);
    try { ws.close(4000, 'Internal Server Error'); } catch {}
  }
});

// ─── Internal HTTP Server for backend-to-realtime broadcasts ─────────────────
// Only accepts connections from localhost/127.0.0.1
const INTERNAL_PORT = parseInt(process.env.INTERNAL_PORT || '4001', 10);
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'nectar-internal-secret';

const internalServer = http.createServer((req, res) => {
  // Only POST to /internal/broadcast-admin
  if (req.method !== 'POST' || req.url !== '/internal/broadcast-admin') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Validate internal secret header
  const secret = req.headers['x-internal-secret'];
  if (secret !== INTERNAL_SECRET) {
    res.writeHead(401);
    res.end('Unauthorized');
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const payload = JSON.parse(body);
      broadcastToAdmins(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, admins_online: [...connections].filter(c => c.role === 'ADMIN').length }));
    } catch (e) {
      res.writeHead(400);
      res.end('Invalid JSON');
    }
  });
});

internalServer.listen(INTERNAL_PORT, '127.0.0.1', () => {
  console.log(`[Realtime] Servidor HTTP interno escuchando en 127.0.0.1:${INTERNAL_PORT}`);
});
