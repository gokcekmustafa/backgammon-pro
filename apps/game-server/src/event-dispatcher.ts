import type { ClientMessage, ServerMessage } from './types';
import { CLIENT_MESSAGE_TYPES, createServerMessage } from './types';
import type { ConnectionManager } from './connection-manager';
import type { RoomManager } from './room-manager';
import type { TableManager } from './table-manager';
import type { GameSessionManager } from './game-session-manager';
import { ChatManager } from './chat-manager';

type MessageHandler = (
  connectionId: string,
  payload: Record<string, unknown> | undefined,
) => ServerMessage | void;

export class EventDispatcher {
  private handlers = new Map<string, MessageHandler>();

  constructor(
    private connections: ConnectionManager,
    private rooms: RoomManager,
    private tables: TableManager,
    private chat: ChatManager,
    private gameSessions?: GameSessionManager,
  ) {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.on('PING', (connectionId) => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.send(createServerMessage('PONG'));
      }
    });
  }

  on(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  off(type: string): void {
    this.handlers.delete(type);
  }

  private sendError(connectionId: string, message: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.send(createServerMessage('ERROR', { message }));
    }
  }

  dispatch(connectionId: string, message: ClientMessage): ServerMessage | void {
    if (!CLIENT_MESSAGE_TYPES.includes(message.type)) {
      this.sendError(connectionId, `Unknown message type: ${message.type}`);
      return;
    }

    if (this.connections.isRateLimited(connectionId)) {
      this.sendError(connectionId, 'Rate limited. Slow down.');
      return;
    }

    if (
      message.type !== 'AUTHENTICATE' &&
      message.type !== 'PING' &&
      !this.connections.isAuthenticated(connectionId)
    ) {
      this.sendError(connectionId, 'Authenticate before sending messages');
      return;
    }

    const handler = this.handlers.get(message.type);
    if (!handler) {
      this.sendError(connectionId, `No handler registered for: ${message.type}`);
      return;
    }

    return handler(connectionId, message.payload);
  }

  registerRoomHandlers(): void {
    this.on('JOIN_ROOM', (connectionId, payload) => {
      const roomId = payload?.roomId as string | undefined;
      if (!roomId) {
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.send(createServerMessage('ERROR', { message: 'JOIN_ROOM requires roomId' }));
        }
        return;
      }
      this.rooms.join(connectionId, roomId);
      const username = (payload?.username as string) ?? 'A user';
      this.chat.addSystemMessage(`${username} joined the room`, roomId, null);
    });

    this.on('LEAVE_ROOM', (connectionId, payload) => {
      const roomId = payload?.roomId as string | undefined;
      if (!roomId) {
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.send(createServerMessage('ERROR', { message: 'LEAVE_ROOM requires roomId' }));
        }
        return;
      }
      const username = (payload?.username as string) ?? 'A user';
      this.rooms.leave(connectionId, roomId);
      this.chat.addSystemMessage(`${username} left the room`, roomId, null);
    });
  }

  registerTableHandlers(): void {
    this.on('CREATE_TABLE', (connectionId, payload) => {
      const name = (payload?.name as string) ?? `Table ${Date.now()}`;
      const roomId = payload?.roomId as string | undefined;
      if (!roomId) {
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.send(createServerMessage('ERROR', { message: 'CREATE_TABLE requires roomId' }));
        }
        return;
      }
      this.tables.create(name, roomId, connectionId);
    });

    this.on('JOIN_TABLE', (connectionId, payload) => {
      const tableId = payload?.tableId as string | undefined;
      if (!tableId) {
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.send(createServerMessage('ERROR', { message: 'JOIN_TABLE requires tableId' }));
        }
        return;
      }
      this.tables.join(connectionId, tableId);
    });

    this.on('LEAVE_TABLE', (connectionId, payload) => {
      const tableId = payload?.tableId as string | undefined;
      if (!tableId) {
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.send(createServerMessage('ERROR', { message: 'LEAVE_TABLE requires tableId' }));
        }
        return;
      }
      this.tables.leave(connectionId, tableId);
    });
  }

  registerChatHandlers(): void {
    this.on('CHAT_MESSAGE', (connectionId, payload) => {
      this.chat.handleChatMessage(connectionId, payload ?? {});
    });
  }

  registerChatHandler(): void {
    this.registerChatHandlers();
  }

  registerGameHandlers(): void {
    if (!this.gameSessions) return;

    this.on('ROLL_DICE', (connectionId) => {
      this.gameSessions!.handleRoll(connectionId);
    });

    this.on('MAKE_MOVE', (connectionId, payload) => {
      const from = payload?.from as number | undefined;
      const to = payload?.to as number | undefined;
      const diceUsed = payload?.diceUsed as number | undefined;
      if (from === undefined || to === undefined || diceUsed === undefined) {
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.send(
            createServerMessage('ERROR', { message: 'MAKE_MOVE requires from, to, diceUsed' }),
          );
        }
        return;
      }
      this.gameSessions!.handleMove(connectionId, from, to, diceUsed);
    });

    this.on('RESIGN_GAME', (connectionId) => {
      this.gameSessions!.handleResign(connectionId);
    });

    this.on('RECONNECT_GAME', (connectionId) => {
      this.gameSessions!.handleReconnect(connectionId);
    });
  }

  handleDisconnect(connectionId: string): void {
    if (this.gameSessions) {
      this.gameSessions.handleDisconnect(connectionId);
    }

    const roomIds = this.rooms.getConnectionRooms(connectionId);
    this.rooms.leaveAll(connectionId);
    for (const roomId of roomIds) {
      const room = this.rooms.get(roomId);
      if (room) {
        this.connections.broadcastTo(
          room.connectionIds,
          createServerMessage('DISCONNECTED', { connectionId }),
        );
        this.chat.addSystemMessage('A user disconnected', roomId, null);
      }
    }

    const tableIds = this.tables.getConnectionTables(connectionId);
    this.tables.leaveAll(connectionId);
    for (const tableId of tableIds) {
      const table = this.tables.get(tableId);
      if (table) {
        this.connections.broadcastTo(
          table.connectionIds,
          createServerMessage('DISCONNECTED', { connectionId }),
        );
        this.chat.addSystemMessage('A user disconnected', null, tableId);
      }
    }
  }

  reset(): void {
    this.handlers.clear();
    this.registerDefaults();
  }
}
