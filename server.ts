/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

// ============================================================================
// MARK: - Server Configuration & Constants
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_PORT: number = parseInt(process.env.PORT || '3000', 10);
const IS_PRODUCTION_MODE: boolean = process.env.NODE_ENV === 'production';

/**
 * Allowed cozy mood emojis that listeners are permitted to broadcast.
 */
const ALLOWED_VIBE_EMOJIS: readonly string[] = ['☕', '✨', '🎧', '💻', '❤️', '🌧️'];

// ============================================================================
// MARK: - Express App & HTTP Server Creation
// ============================================================================

const app = express();
const httpServer = http.createServer(app);

// Enable JSON body parsing for REST fallback endpoints
app.use(express.json());

// ============================================================================
// MARK: - Real-Time Multi-User WebSocket Synchronization Hub
// ============================================================================

/**
 * WebSocket server attached to the HTTP server for low-latency multi-user broadcasts.
 */
const webSocketServer = new WebSocketServer({
  server: httpServer,
  path: '/ws/vibes',
});

/**
 * Active connected client sessions mapped by their unique client UUID.
 */
const connectedClientsMap = new Map<string, WebSocket>();

/**
 * Broadcasts a structured JSON payload to all currently connected WebSocket clients.
 * @param payload - The data object to serialize and transmit.
 */
function broadcastToAllClients(payload: object): void {
  const serializedMessage = JSON.stringify(payload);
  for (const clientSocket of connectedClientsMap.values()) {
    if (clientSocket.readyState === WebSocket.OPEN) {
      try {
        clientSocket.send(serializedMessage);
      } catch (transmissionError) {
        console.error('Error sending message to client socket:', transmissionError);
      }
    }
  }
}

/**
 * Broadcasts the genuine, authoritative connected listener count to everyone.
 */
function broadcastListenerPresenceCount(): void {
  const activeListenerCount = connectedClientsMap.size;
  broadcastToAllClients({
    type: 'presence_update',
    count: activeListenerCount,
    timestamp: Date.now(),
  });
}

// Handle incoming client WebSocket connections
webSocketServer.on('connection', (socket: WebSocket, incomingRequest) => {
  const clientSessionId = crypto.randomUUID();
  connectedClientsMap.set(clientSessionId, socket);

  // Send initial welcome message with genuine current listener count and assigned session ID
  socket.send(
    JSON.stringify({
      type: 'connection_established',
      sessionId: clientSessionId,
      currentListenerCount: connectedClientsMap.size,
      timestamp: Date.now(),
    })
  );

  // Notify all connected clients of the updated listener presence
  broadcastListenerPresenceCount();

  // Listen for incoming vibe transmissions from this client
  socket.on('message', (rawBuffer) => {
    try {
      const incomingMessage = JSON.parse(rawBuffer.toString());

      if (incomingMessage.type === 'send_vibe') {
        const requestedEmoji = incomingMessage.emoji;

        // Strict validation: Ensure emoji is one of the allowed cozy vibes
        if (typeof requestedEmoji === 'string' && ALLOWED_VIBE_EMOJIS.includes(requestedEmoji)) {
          const vibeBroadcastPayload = {
            type: 'vibe_broadcast',
            id: crypto.randomUUID(),
            senderId: incomingMessage.senderId || clientSessionId,
            emoji: requestedEmoji,
            timestamp: Date.now(),
          };

          // Broadcast real-time vibe to every active listener
          broadcastToAllClients(vibeBroadcastPayload);
        }
      }
    } catch (parseError) {
      console.warn('Received unparseable WebSocket message:', parseError);
    }
  });

  // Handle client disconnection
  socket.on('close', () => {
    connectedClientsMap.delete(clientSessionId);
    broadcastListenerPresenceCount();
  });

  socket.on('error', (socketError) => {
    console.error(`Socket error for client [${clientSessionId}]:`, socketError);
    connectedClientsMap.delete(clientSessionId);
    broadcastListenerPresenceCount();
  });
});

// Periodic heartbeat ping to prune stale connections
const heartbeatInterval = setInterval(() => {
  for (const [clientId, socket] of connectedClientsMap.entries()) {
    if (socket.readyState !== WebSocket.OPEN) {
      connectedClientsMap.delete(clientId);
    }
  }
}, 30000);

heartbeatInterval.unref();

// ============================================================================
// MARK: - HTTP API Fallback Routes
// ============================================================================

/**
 * Returns genuine connected listener presence.
 */
app.get('/api/presence', (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: connectedClientsMap.size,
  });
});

/**
 * REST endpoint for clients to transmit a vibe if WebSockets are unavailable.
 */
app.post('/api/vibes', (req: Request, res: Response) => {
  const { emoji, senderId } = req.body || {};

  if (!emoji || !ALLOWED_VIBE_EMOJIS.includes(emoji)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or missing emoji in vibe payload.',
    });
  }

  const broadcastEvent = {
    type: 'vibe_broadcast',
    id: crypto.randomUUID(),
    senderId: senderId || 'http-guest',
    emoji,
    timestamp: Date.now(),
  };

  // Broadcast to all active WebSocket listeners
  broadcastToAllClients(broadcastEvent);

  res.json({
    success: true,
    broadcast: broadcastEvent,
  });
});

// ============================================================================
// MARK: - Vite Integration & Server Startup
// ============================================================================

async function startFullStackServer(): Promise<void> {
  if (!IS_PRODUCTION_MODE) {
    // In development mode, mount Vite middleware for instant HMR and asset serving
    const viteDevelopmentServer = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(viteDevelopmentServer.middlewares);
  } else {
    // In production mode, serve compiled static assets from dist/
    const staticDistPath = path.resolve(__dirname, 'dist');
    app.use(express.static(staticDistPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(staticDistPath, 'index.html'));
    });
  }

  httpServer.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`[Lofi Code Radio] Server listening on port ${SERVER_PORT} (Mode: ${IS_PRODUCTION_MODE ? 'production' : 'development'})`);
    console.log(`[Lofi Code Radio] Real-time WebSocket endpoint available at ws://0.0.0.0:${SERVER_PORT}/ws/vibes`);
  });
}

startFullStackServer().catch((startupError) => {
  console.error('Fatal error during full-stack server startup:', startupError);
  process.exit(1);
});
