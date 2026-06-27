import type { ClientMessage, ServerMessage } from './types';
import { CLIENT_MESSAGE_TYPES, createServerMessage } from './types';
import type { ConnectionManager } from './connection-manager';
import type { RoomManager } from './room-manager';
import type { TableManager } from './table-manager';

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

  dispatch(connectionId: string, message: ClientMessage): ServerMessage | void {
    if (!CLIENT_MESSAGE_TYPES.includes(message.type)) {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.send(
          createServerMessage('ERROR', {
            message: `Unknown message type: ${message.type}`,
          }),
        );
      }
      return;
    }

    const handler = this.handlers.get(message.type);
    if (!handler) {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.send(
          createServerMessage('ERROR', {
            message: `No handler registered for: ${message.type}`,
          }),
        );
      }
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
      this.rooms.leave(connectionId, roomId);
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

  registerChatHandler(): void {
    this.on('CHAT_MESSAGE', (connectionId, payload) => {
      const roomId = payload?.roomId as string | undefined;
      const content = payload?.content as string | undefined;
      const tableId = payload?.tableId as string | undefined;

      if (!content) {
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.send(createServerMessage('ERROR', { message: 'CHAT_MESSAGE requires content' }));
        }
        return;
      }

      const scope = tableId ?? roomId;
      if (!scope) {
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.send(
            createServerMessage('ERROR', { message: 'CHAT_MESSAGE requires roomId or tableId' }),
          );
        }
        return;
      }

      const broadcastMessage = createServerMessage('CHAT_MESSAGE', {
        connectionId,
        content,
        scope,
        scopeType: tableId ? 'table' : 'room',
      });

      let recipients: string[] = [];

      if (tableId) {
        const table = this.tables.get(tableId);
        if (table) recipients = table.connectionIds;
      } else if (roomId) {
        const room = this.rooms.get(roomId);
        if (room) recipients = room.connectionIds;
      }

      this.connections.broadcastTo(recipients, broadcastMessage);
    });
  }

  handleDisconnect(connectionId: string): void {
    this.rooms.leaveAll(connectionId);

    const tableIds = this.tables.getConnectionTables(connectionId);
    this.tables.leaveAll(connectionId);

    for (const tableId of tableIds) {
      const table = this.tables.get(tableId);
      if (table) {
        this.connections.broadcastTo(
          table.connectionIds,
          createServerMessage('DISCONNECTED', { connectionId }),
        );
      }
    }

    const roomIds = this.rooms.getConnectionRooms(connectionId);
    for (const roomId of roomIds) {
      const room = this.rooms.get(roomId);
      if (room) {
        this.connections.broadcastTo(
          room.connectionIds,
          createServerMessage('DISCONNECTED', { connectionId }),
        );
      }
    }
  }

  reset(): void {
    this.handlers.clear();
    this.registerDefaults();
  }
}
