import Fastify from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage } from './types';
import { ConnectionManager } from './connection-manager';
import { RoomManager } from './room-manager';
import { TableManager } from './table-manager';
import { EventDispatcher } from './event-dispatcher';
import { registerAuthRoutes } from './auth/routes';
import prisma from './lib/prisma';

const HTTP_PORT = parseInt(process.env.HTTP_PORT ?? '3001', 10);
const WS_PORT = parseInt(process.env.WS_PORT ?? '3002', 10);

const app = Fastify({ logger: true });

registerAuthRoutes(app, prisma);

const connections = new ConnectionManager();
const rooms = new RoomManager(connections);
const tables = new TableManager(connections);
const dispatcher = new EventDispatcher(connections, rooms, tables);

dispatcher.registerRoomHandlers();
dispatcher.registerTableHandlers();
dispatcher.registerChatHandler();

function onMessage(connectionId: string, raw: string): void {
  try {
    const message: ClientMessage = JSON.parse(raw);
    dispatcher.dispatch(connectionId, message);
  } catch {
    const conn = connections.get(connectionId);
    if (conn) {
      conn.send({
        type: 'ERROR',
        payload: { message: 'Invalid JSON' },
        timestamp: Date.now(),
      } as never);
    }
  }
}

function onClose(connectionId: string): void {
  dispatcher.handleDisconnect(connectionId);
  connections.remove(connectionId);
}

const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (socket: WebSocket) => {
  const connection = connections.add(
    (msg) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
      }
    },
    () => {
      socket.close();
    },
  );

  socket.on('message', (data) => {
    const raw = typeof data === 'string' ? data : data.toString();
    onMessage(connection.id, raw);
  });

  socket.on('close', () => {
    onClose(connection.id);
  });

  socket.on('error', () => {
    onClose(connection.id);
  });
});

app.listen({ port: HTTP_PORT }).catch((err) => {
  console.error(err);
  process.exit(1);
});

export { connections, rooms, tables, dispatcher, wss, app, prisma };
export { ConnectionManager } from './connection-manager';
export { RoomManager } from './room-manager';
export { TableManager } from './table-manager';
export { EventDispatcher } from './event-dispatcher';
export type * from './types';
