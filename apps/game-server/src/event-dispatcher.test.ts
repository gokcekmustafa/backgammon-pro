import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionManager } from './connection-manager';
import { RoomManager } from './room-manager';
import { TableManager } from './table-manager';
import { EventDispatcher } from './event-dispatcher';
import type { ServerMessage } from './types';

describe('EventDispatcher', () => {
  let connections: ConnectionManager;
  let rooms: RoomManager;
  let tables: TableManager;
  let dispatcher: EventDispatcher;

  beforeEach(() => {
    connections = new ConnectionManager();
    connections.reset();
    rooms = new RoomManager(connections);
    rooms.reset();
    tables = new TableManager(connections);
    tables.reset();
    dispatcher = new EventDispatcher(connections, rooms, tables);
    dispatcher.reset();
  });

  function addConn() {
    const sent: ServerMessage[] = [];
    const conn = connections.add(
      (msg) => {
        sent.push(msg);
      },
      () => {},
    );
    // Clear CONNECTED
    sent.length = 0;
    return { connection: conn, sent };
  }

  describe('PING', () => {
    it('responds with PONG', () => {
      const { connection, sent } = addConn();
      dispatcher.dispatch(connection.id, { type: 'PING' });
      expect(sent.some((m) => m.type === 'PONG')).toBe(true);
    });
  });

  describe('unknown message type', () => {
    it('sends ERROR for unknown type', () => {
      const { connection, sent } = addConn();
      dispatcher.dispatch(connection.id, { type: 'INVALID' as never });
      expect(sent.some((m) => m.type === 'ERROR')).toBe(true);
    });
  });

  describe('custom handlers', () => {
    it('registers and invokes a custom handler', () => {
      const { connection, sent } = addConn();
      let handled = false;

      dispatcher.on('JOIN_ROOM', (connId) => {
        handled = true;
        expect(connId).toBe(connection.id);
      });

      dispatcher.dispatch(connection.id, { type: 'JOIN_ROOM', payload: { roomId: 'lobby' } });
      expect(handled).toBe(true);
    });

    it('sends ERROR when no handler is registered', () => {
      dispatcher.reset(); // Remove non-default handlers
      const { connection, sent } = addConn();

      dispatcher.dispatch(connection.id, { type: 'JOIN_ROOM', payload: { roomId: 'lobby' } });
      expect(
        sent.some((m) => m.type === 'ERROR' && (m.payload as any)?.message?.includes('No handler')),
      ).toBe(true);
    });

    it('unregisters a handler', () => {
      const { connection, sent } = addConn();
      let count = 0;

      const handler = () => {
        count++;
      };
      dispatcher.on('JOIN_ROOM', handler);
      dispatcher.off('JOIN_ROOM');

      dispatcher.dispatch(connection.id, { type: 'JOIN_ROOM', payload: { roomId: 'lobby' } });
      expect(count).toBe(0);
    });
  });

  describe('JOIN_ROOM / LEAVE_ROOM', () => {
    it('joins a room when handler is registered', () => {
      rooms.create('lobby', 'Lobby');
      const { connection } = addConn();

      dispatcher.registerRoomHandlers();
      dispatcher.dispatch(connection.id, { type: 'JOIN_ROOM', payload: { roomId: 'lobby' } });

      expect(rooms.get('lobby')!.connectionIds).toContain(connection.id);
    });

    it('sends ERROR when JOIN_ROOM has no roomId', () => {
      const { connection, sent } = addConn();
      dispatcher.registerRoomHandlers();
      dispatcher.dispatch(connection.id, { type: 'JOIN_ROOM' });
      expect(sent.some((m) => m.type === 'ERROR')).toBe(true);
    });

    it('leaves a room', () => {
      rooms.create('lobby', 'Lobby');
      const { connection, sent } = addConn();
      rooms.join(connection.id, 'lobby');
      sent.length = 0;

      dispatcher.registerRoomHandlers();
      dispatcher.dispatch(connection.id, { type: 'LEAVE_ROOM', payload: { roomId: 'lobby' } });

      expect(rooms.get('lobby')!.connectionIds).not.toContain(connection.id);
    });

    it('sends ERROR when LEAVE_ROOM has no roomId', () => {
      const { connection, sent } = addConn();
      dispatcher.registerRoomHandlers();
      dispatcher.dispatch(connection.id, { type: 'LEAVE_ROOM' });
      expect(sent.some((m) => m.type === 'ERROR')).toBe(true);
    });
  });

  describe('CREATE_TABLE / JOIN_TABLE / LEAVE_TABLE', () => {
    it('creates a table', () => {
      rooms.create('lobby', 'Lobby');
      const { connection } = addConn();

      dispatcher.registerTableHandlers();
      dispatcher.dispatch(connection.id, {
        type: 'CREATE_TABLE',
        payload: { name: 'My Table', roomId: 'lobby' },
      });

      expect(tables.getByRoom('lobby')).toHaveLength(1);
    });

    it('sends ERROR when CREATE_TABLE has no roomId', () => {
      const { connection, sent } = addConn();
      dispatcher.registerTableHandlers();
      dispatcher.dispatch(connection.id, { type: 'CREATE_TABLE', payload: { name: 'T' } });
      expect(sent.some((m) => m.type === 'ERROR')).toBe(true);
    });

    it('joins a table', () => {
      const owner = addConn().connection;
      const joiner = addConn();
      const table = tables.create('T', 'r1', owner.id);

      dispatcher.registerTableHandlers();
      dispatcher.dispatch(joiner.connection.id, {
        type: 'JOIN_TABLE',
        payload: { tableId: table.id },
      });

      expect(tables.get(table.id)!.connectionIds).toContain(joiner.connection.id);
    });

    it('sends ERROR when JOIN_TABLE has no tableId', () => {
      const { connection, sent } = addConn();
      dispatcher.registerTableHandlers();
      dispatcher.dispatch(connection.id, { type: 'JOIN_TABLE' });
      expect(sent.some((m) => m.type === 'ERROR')).toBe(true);
    });

    it('leaves a table', () => {
      const owner = addConn().connection;
      const table = tables.create('T', 'r1', owner.id);

      dispatcher.registerTableHandlers();
      dispatcher.dispatch(owner.id, {
        type: 'LEAVE_TABLE',
        payload: { tableId: table.id },
      });

      expect(tables.get(table.id)).toBeUndefined();
    });

    it('sends ERROR when LEAVE_TABLE has no tableId', () => {
      const { connection, sent } = addConn();
      dispatcher.registerTableHandlers();
      dispatcher.dispatch(connection.id, { type: 'LEAVE_TABLE' });
      expect(sent.some((m) => m.type === 'ERROR')).toBe(true);
    });
  });

  describe('CHAT_MESSAGE', () => {
    it('broadcasts chat to room occupants', () => {
      rooms.create('lobby', 'Lobby');
      const c1 = addConn();
      const c2 = addConn();
      rooms.join(c1.connection.id, 'lobby');
      rooms.join(c2.connection.id, 'lobby');
      c1.sent.length = 0;
      c2.sent.length = 0;

      dispatcher.registerChatHandler();
      dispatcher.dispatch(c1.connection.id, {
        type: 'CHAT_MESSAGE',
        payload: { roomId: 'lobby', content: 'Hello' },
      });

      expect(c2.sent.some((m) => m.type === 'CHAT_MESSAGE')).toBe(true);
    });

    it('sends ERROR when content is missing', () => {
      const { connection, sent } = addConn();
      dispatcher.registerChatHandler();
      dispatcher.dispatch(connection.id, {
        type: 'CHAT_MESSAGE',
        payload: { roomId: 'lobby' },
      });
      expect(sent.some((m) => m.type === 'ERROR')).toBe(true);
    });

    it('sends ERROR when scope is missing', () => {
      const { connection, sent } = addConn();
      dispatcher.registerChatHandler();
      dispatcher.dispatch(connection.id, {
        type: 'CHAT_MESSAGE',
        payload: { content: 'Hello' },
      });
      expect(sent.some((m) => m.type === 'ERROR')).toBe(true);
    });
  });

  describe('handleDisconnect', () => {
    it('cleans up rooms and tables on disconnect', () => {
      rooms.create('lobby', 'Lobby');
      const c1 = addConn();
      rooms.join(c1.connection.id, 'lobby');
      tables.create('T', 'lobby', c1.connection.id);

      dispatcher.handleDisconnect(c1.connection.id);

      expect(rooms.get('lobby')!.connectionIds).not.toContain(c1.connection.id);
      expect(tables.getConnectionTables(c1.connection.id)).toEqual([]);
    });
  });
});
