import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionManager } from './connection-manager';
import { RoomManager } from './room-manager';
import { TableManager } from './table-manager';
import { ChatManager } from './chat-manager';
import type { ServerMessage } from './types';

describe('ChatManager', () => {
  let connections: ConnectionManager;
  let rooms: RoomManager;
  let tables: TableManager;
  let chat: ChatManager;

  beforeEach(() => {
    connections = new ConnectionManager();
    connections.reset();
    rooms = new RoomManager(connections);
    rooms.reset();
    tables = new TableManager(connections);
    tables.reset();
    chat = new ChatManager(connections, rooms, tables);
    chat.reset();
  });

  function addConn() {
    const sent: ServerMessage[] = [];
    const conn = connections.add(
      (msg) => {
        sent.push(msg);
      },
      () => {},
    );
    sent.length = 0;
    return { connection: conn, sent };
  }

  describe('validateMessage', () => {
    it('returns error when both roomId and tableId are missing', () => {
      expect(chat.validateMessage('Hello', null, null)).toBe('Message requires roomId or tableId');
    });

    it('returns error when text is empty', () => {
      expect(chat.validateMessage('', 'room1', null)).toBe('Message text is required');
    });

    it('returns error when text is whitespace', () => {
      expect(chat.validateMessage('   ', 'room1', null)).toBe('Message cannot be empty');
    });

    it('returns error when text exceeds max length', () => {
      const longText = 'a'.repeat(301);
      expect(chat.validateMessage(longText, 'room1', null)).toContain('exceeds');
    });

    it('returns null for valid message', () => {
      expect(chat.validateMessage('Hello', 'room1', null)).toBeNull();
      expect(chat.validateMessage('Hello', null, 'table1')).toBeNull();
    });
  });

  describe('handleChatMessage', () => {
    it('validates and processes a chat message in a room', () => {
      rooms.create('lobby', 'Lobby');
      const { connection, sent } = addConn();
      rooms.join(connection.id, 'lobby');
      sent.length = 0;

      const result = chat.handleChatMessage(connection.id, {
        roomId: 'lobby',
        text: 'Hello world',
        username: 'Alice',
      });

      expect(result).not.toBeNull();
      expect(result!.text).toBe('Hello world');
      expect(result!.username).toBe('Alice');
      expect(result!.roomId).toBe('lobby');
      expect(result!.tableId).toBeNull();
      expect(result!.isSystemMessage).toBe(false);
      expect(typeof result!.id).toBe('string');
      expect(typeof result!.timestamp).toBe('number');
    });

    it('sends ERROR when user is not in room', () => {
      rooms.create('lobby', 'Lobby');
      const { connection, sent } = addConn();

      chat.handleChatMessage(connection.id, {
        roomId: 'lobby',
        text: 'Hello',
        username: 'Alice',
      });

      expect(sent.some((m) => m.type === 'ERROR')).toBe(true);
    });

    it('sanitizes profanity', () => {
      rooms.create('lobby', 'Lobby');
      const { connection } = addConn();
      rooms.join(connection.id, 'lobby');

      const result = chat.handleChatMessage(connection.id, {
        roomId: 'lobby',
        text: 'that is shit indeed',
        username: 'Alice',
      });

      expect(result).not.toBeNull();
      expect(result!.text).toBe('that is **** indeed');
    });

    it('broadcasts message to room occupants', () => {
      rooms.create('lobby', 'Lobby');
      const c1 = addConn();
      const c2 = addConn();
      rooms.join(c1.connection.id, 'lobby');
      rooms.join(c2.connection.id, 'lobby');
      c1.sent.length = 0;
      c2.sent.length = 0;

      chat.handleChatMessage(c1.connection.id, {
        roomId: 'lobby',
        text: 'Hello',
        username: 'Alice',
      });

      const c1Msg = c1.sent.find((m) => m.type === 'CHAT_MESSAGE');
      const c2Msg = c2.sent.find((m) => m.type === 'CHAT_MESSAGE');
      expect(c1Msg).toBeDefined();
      expect(c2Msg).toBeDefined();
    });

    it('processes table chat message', () => {
      const c1 = addConn();
      const table = tables.create('Table 1', 'r1', c1.connection.id);

      const result = chat.handleChatMessage(c1.connection.id, {
        tableId: table.id,
        text: 'Good luck!',
        username: 'Bob',
      });

      expect(result).not.toBeNull();
      expect(result!.tableId).toBe(table.id);
      expect(result!.text).toBe('Good luck!');
    });

    it('rejects message from user not at the table', () => {
      const c1 = addConn();
      const { sent } = addConn();
      tables.create('Table 1', 'r1', c1.connection.id);

      // This connection is not at the table
      const result = chat.handleChatMessage(sent[0]?.connectionId ?? 'unknown', {
        tableId: 'table_1',
        text: 'Hello',
        username: 'Eve',
      });

      expect(result).toBeNull();
    });
  });

  describe('addSystemMessage', () => {
    it('creates and broadcasts a system message', () => {
      rooms.create('lobby', 'Lobby');
      const c1 = addConn();
      rooms.join(c1.connection.id, 'lobby');
      c1.sent.length = 0;

      chat.addSystemMessage('User joined the room', 'lobby', null);

      const msg = c1.sent.find((m) => m.type === 'CHAT_MESSAGE');
      expect(msg).toBeDefined();
      const payload = msg!.payload as Record<string, unknown>;
      expect(payload.text).toBe('User joined the room');
      expect(payload.isSystemMessage).toBe(true);
      expect(payload.username).toBe('System');
    });
  });

  describe('getHistory', () => {
    it('returns stored message history for a room', () => {
      rooms.create('lobby', 'Lobby');
      const { connection } = addConn();
      rooms.join(connection.id, 'lobby');

      chat.handleChatMessage(connection.id, {
        roomId: 'lobby',
        text: 'First',
        username: 'Alice',
      });
      chat.handleChatMessage(connection.id, {
        roomId: 'lobby',
        text: 'Second',
        username: 'Bob',
      });

      const history = chat.getHistory('lobby', null);
      expect(history).toHaveLength(2);
      expect(history[0].text).toBe('First');
      expect(history[1].text).toBe('Second');
    });

    it('keeps at most 100 messages', () => {
      rooms.create('lobby', 'Lobby');
      const { connection } = addConn();
      rooms.join(connection.id, 'lobby');

      for (let i = 0; i < 105; i++) {
        chat.handleChatMessage(connection.id, {
          roomId: 'lobby',
          text: `msg ${i}`,
          username: 'User',
        });
      }

      const history = chat.getHistory('lobby', null);
      expect(history).toHaveLength(100);
      expect(history[0].text).toBe('msg 5');
    });

    it('returns separate history for different rooms', () => {
      rooms.create('lobby', 'Lobby');
      rooms.create('room2', 'Room 2');
      const c1 = addConn();
      const c2 = addConn();
      rooms.join(c1.connection.id, 'lobby');
      rooms.join(c2.connection.id, 'room2');

      chat.handleChatMessage(c1.connection.id, {
        roomId: 'lobby',
        text: 'Lobby msg',
        username: 'User1',
      });
      chat.handleChatMessage(c2.connection.id, {
        roomId: 'room2',
        text: 'Room2 msg',
        username: 'User2',
      });

      expect(chat.getHistory('lobby', null)).toHaveLength(1);
      expect(chat.getHistory('room2', null)).toHaveLength(1);
      expect(chat.getHistory('lobby', null)[0].text).toBe('Lobby msg');
      expect(chat.getHistory('room2', null)[0].text).toBe('Room2 msg');
    });
  });

  describe('handleChatMessage - room membership validation', () => {
    it('allows chat from user in the room', () => {
      rooms.create('lobby', 'Lobby');
      const c1 = addConn();
      rooms.join(c1.connection.id, 'lobby');

      const result = chat.handleChatMessage(c1.connection.id, {
        roomId: 'lobby',
        text: 'Hello!',
        username: 'Alice',
      });
      expect(result).not.toBeNull();
    });

    it('rejects chat from user not in the room', () => {
      rooms.create('lobby', 'Lobby');
      const { sent } = addConn();

      const result = chat.handleChatMessage(sent[0]?.connectionId ?? 'unknown', {
        roomId: 'lobby',
        text: 'Hello!',
        username: 'Alice',
      });
      expect(result).toBeNull();
    });
  });
});
