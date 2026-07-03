import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { parse } from 'url';
import dotenv from 'dotenv';
import pool from './db.js';
import { generateAiReplyStream } from './ai.js';
import http from 'http';

dotenv.config();

// ==============================================================================
// CONFIGURACIÓN DE PUERTOS Y LLAVES DE AUTENTICACIÓN
// ==============================================================================
// PORT: Puerto en el que corre el servidor WebSocket de cara a los clientes (vía proxy inverso en Nginx).
// SECRET_KEY: Llave simétrica para verificar la firma de los tokens JWT de Django (mismo SECRET_KEY de Django).
const PORT = parseInt(process.env.PORT || '4000', 10);
const SECRET_KEY = process.env.DJANGO_SECRET_KEY || process.env.SECRET_KEY || 'django-insecure-default-key';

// ------------------------------------------------------------------------------
// ESTRUCTURA DE CLIENTES CONECTADOS (IN-MEMORY STATE)
// ------------------------------------------------------------------------------
interface ClientConnection {
  ws: WebSocket;                // Instancia de conexión activa
  userId: number;               // ID de usuario (mapeado de Django auth_user)
  email: string;                // Correo electrónico del usuario
  role: string;                 // Rol (ADMIN, BUSINESS, CUSTOMER, etc.)
  subscribedChatId: number | null; // ID del chat al que está suscrito actualmente (room pattern)
}

// conexiones WebSocket en memoria
const connections = new Set<ClientConnection>();

// Servidor WebSocket principal
const wss = new WebSocketServer({ port: PORT });

console.log(`[Realtime] Servidor de WebSockets iniciado en el puerto ${PORT}`);

// ------------------------------------------------------------------------------
// MÉTODOS AUXILIARES DE DIFUSIÓN (BROADCAST HELPERS)
// ------------------------------------------------------------------------------

/**
 * Difunde un mensaje en formato JSON a todos los clientes que estén suscritos
 * activamente a una sala de chat específica (chatId).
 */
const broadcastToRoom = (chatId: number, data: any) => {
  const payload = JSON.stringify(data);
  for (const client of connections) {
    if (client.subscribedChatId === chatId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
};

/**
 * Envía un mensaje a TODOS los administradores conectados a la plataforma.
 * Se utiliza para reportar nuevos tickets, alertas del sistema o asignación de chats.
 */
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

  // ----------------------------------------------------------------------------
  // MANEJADOR DE MENSAJES RECIBIDOS (SWIFT ROUTER DE EVENTOS)
  // Procesa las solicitudes del cliente de acuerdo al tipo de evento recibido.
  // ----------------------------------------------------------------------------
  const handleMessage = async (messageData: any) => {
    if (!clientConn) return;
    try {
      const data = JSON.parse(messageData.toString());
      console.log(`[Realtime] Mensaje recibido de ${clientConn.email}:`, data);
      
      switch (data.type) {
        // Evento 1: Suscribirse a una sala de chat específica
        case 'subscribe': {
          const chatId = parseInt(data.chatId, 10);
          console.log(`[Realtime] Intento de suscripción al chat #${chatId} por el usuario ${clientConn.email} (ID: ${clientConn.userId}, Rol: ${clientConn.role})`);
          if (isNaN(chatId)) {
            console.warn(`[Realtime] Suscripción fallida: chatId no es un número válido (${data.chatId})`);
            return;
          }

          // Verificar autorización en la base de datos (PostgreSQL)
          const chatRes = await pool.query('SELECT * FROM tickets_supportchat WHERE id = $1', [chatId]);
          console.log(`[Realtime] Búsqueda de chat en DB para #${chatId}. Encontrado: ${chatRes.rows.length > 0}`);
          if (chatRes.rows.length === 0) {
            console.warn(`[Realtime] Suscripción fallida: Chat #${chatId} no encontrado en la DB.`);
            ws.send(JSON.stringify({ type: 'error', message: 'Chat no encontrado.' }));
            return;
          }

          const chat = chatRes.rows[0];
          console.log(`[Realtime] Datos del Chat: ID cliente en DB: ${chat.client_id} (Tipo: ${typeof chat.client_id}), ID usuario: ${clientConn.userId} (Tipo: ${typeof clientConn.userId})`);
          
          // Regla de Acceso: Agentes de soporte (ADMIN, BUSINESS, DEVELOPER) o el cliente dueño del chat.
          const isAgent = clientConn.role === 'ADMIN' || clientConn.role === 'BUSINESS' || clientConn.role === 'DEVELOPER';
          if (!isAgent && chat.client_id !== clientConn.userId) {
            console.warn(`[Realtime] Suscripción fallida: Usuario ${clientConn.email} (ID ${clientConn.userId}) no autorizado para chat #${chatId} (Propietario: ${chat.client_id}).`);
            ws.send(JSON.stringify({ type: 'error', message: 'No autorizado para acceder a este chat.' }));
            return;
          }

          // Registrar la suscripción del cliente
          clientConn.subscribedChatId = chatId;
          console.log(`[Realtime] Cliente ${clientConn.email} se suscribió con éxito al chat #${chatId}`);
          
          // Confirmar suscripción exitosa al cliente
          ws.send(JSON.stringify({ type: 'subscribed', chatId }));
          break;
        }

        // Evento 2: Envío de un mensaje de texto
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

          // Doble verificación del estado del chat en la DB
          const chatRes = await pool.query('SELECT * FROM tickets_supportchat WHERE id = $1', [chatId]);
          if (chatRes.rows.length === 0) return;
          const chat = chatRes.rows[0];

          if (chat.status === 'CLOSED') {
            ws.send(JSON.stringify({ type: 'error', message: 'Este chat se encuentra cerrado.' }));
            return;
          }

          // Guardar el mensaje del usuario en la base de datos PostgreSQL
          const insertRes = await pool.query(
            `INSERT INTO tickets_supportchatmessage (chat_id, sender_id, message, is_ai_message, created_at)
             VALUES ($1, $2, $3, false, NOW())
             RETURNING id, chat_id, sender_id, message, is_ai_message, created_at`,
            [chatId, clientConn.userId, text]
          );
          
          const savedMsg = insertRes.rows[0];
          
          // Difundir el mensaje del usuario a todos los miembros de la sala (clientes o agentes en tiempo real)
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

          // Actualizar marca de tiempo de actividad en la tabla del Chat
          await pool.query('UPDATE tickets_supportchat SET updated_at = NOW() WHERE id = $1', [chatId]);

          // Si un agente de soporte responde a un chat "OPEN", cambia el estado automáticamente a "IN_PROGRESS"
          const isAgent = clientConn.role === 'ADMIN' || clientConn.role === 'BUSINESS' || clientConn.role === 'DEVELOPER';
          if (isAgent && chat.status === 'OPEN') {
            await pool.query("UPDATE tickets_supportchat SET status = 'IN_PROGRESS' WHERE id = $1", [chatId]);
            broadcastToRoom(chatId, {
              type: 'status_change',
              chatId,
              status: 'IN_PROGRESS',
            });
          }

          // Si el chat sigue "OPEN" y es el cliente quien escribe, se activa el chatbot de asistencia asíncrona de IA
          if (chat.status === 'OPEN' && !isAgent) {
            console.log(`[Realtime] Generando respuesta de IA para Chat #${chatId}...`);
            
            let aiResponseText = '';
            let streamStarted = false;

            // Iniciar flujo de streaming con Groq API
            await generateAiReplyStream(
              chatId,
              text,
              // Callback de cada token recibido de la IA en tiempo real (streaming a los clientes)
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
              // Callback al completarse el stream: se guarda la respuesta en la base de datos
              async (fullText) => {
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

                  // Actualiza updated_at del chat
                  await pool.query('UPDATE tickets_supportchat SET updated_at = NOW() WHERE id = $1', [chatId]);
                } catch (dbErr) {
                  console.error('[Realtime] Error saving AI message to DB:', dbErr);
                }
              },
              // Callback en caso de error de streaming
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

  // ----------------------------------------------------------------------------
  // HANDSHAKE INICIAL Y AUTENTICACIÓN DEL CLIENTE (JWT)
  // Extrae y valida el JWT provisto en los query parameters del WebSocket
  // ----------------------------------------------------------------------------
  try {
    const parameters = parse(req.url || '', true).query;
    const token = parameters.token as string;

    if (!token) {
      console.warn('[Realtime] Intento de conexión rechazado: Token faltante.');
      ws.close(4001, 'Authentication error: Token missing');
      return;
    }

    // Verificar la firma del JWT usando el SECRET_KEY compartido
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

    // Consultar detalles finales del usuario (email, rol) en la base de datos de Django
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

    // Añadir conexión activa al listado in-memory
    connections.add(clientConn);
    console.log(`[Realtime] Cliente conectado: ${user.email} (Rol: ${user.role}). Total conexiones: ${connections.size}`);

    // Procesar cualquier mensaje recibido de forma prematura durante la autenticación
    isReady = true;
    for (const msg of queue) {
      handleMessage(msg);
    }

  } catch (err) {
    console.error('[Realtime] Error durante la inicialización de la conexión:', err);
    try { ws.close(4000, 'Internal Server Error'); } catch {}
  }
});

// ─── SERVIDOR HTTP INTERNO PARA COMUNICACIÓN DJANGO -> REALTIME ───────────────
// Este servidor HTTP acepta peticiones POST exclusivas desde la red de Docker (localhost/django)
// para realizar difusiones del backend a los administradores en tiempo real (por ejemplo, notificar tickets nuevos).
const INTERNAL_PORT = parseInt(process.env.INTERNAL_PORT || '4001', 10);
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'nectar-internal-secret';

const internalServer = http.createServer((req, res) => {
  // Limitar enrutamiento solo a POST /internal/broadcast-admin
  if (req.method !== 'POST' || req.url !== '/internal/broadcast-admin') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Validar cabecera de secreto interno para prevenir inyecciones externas
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
      // Difundir información a todos los administradores en línea
      broadcastToAdmins(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, admins_online: [...connections].filter(c => c.role === 'ADMIN').length }));
    } catch (e) {
      res.writeHead(400);
      res.end('Invalid JSON');
    }
  });
});

internalServer.listen(INTERNAL_PORT, '0.0.0.0', () => {
  console.log(`[Realtime] Servidor HTTP interno escuchando en 0.0.0.0:${INTERNAL_PORT} (acceso inter-contenedor habilitado)`);
});

