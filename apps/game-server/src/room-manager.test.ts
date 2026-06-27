import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionManager } from './connection-manager';
import { RoomManager } from './room-manager';
import type { ServerMessage } from './types';

describe('RoomManager', () => {
  let connections: ConnectionManager;
  let rooms: RoomManager;

  beforeEach(() => {
    connections = new ConnectionManager();
    connections.reset();
    rooms = new RoomManager(connections);
    rooms.reset();
  });

  function addConn() {
    const sent: ServerMessage[] = [];
    const conn = connections.add(
      (msg) => {
        sent.push(msg);
      },
      () => {},
    );
    // Clear the CONNECTED message
    sent.length = 0;
    return { connection: conn, sent };
  }

  it('creates a room', () => {
    const room = rooms.create('lobby', 'Lobby');
    expect(room.id).toBe('lobby');
    expect(room.name).toBe('Lobby');
    expect(room.connectionIds).toEqual([]);
  });

  it('returns all rooms', () => {
    rooms.create('a', 'A');
    rooms.create('b', 'B');
    expect(rooms.getAll()).toHaveLength(2);
  });

  it('gets a room by ID', () => {
    rooms.create('lobby', 'Lobby');
    const room = rooms.get('lobby');
    expect(room).toBeDefined();
    expect(room!.name).toBe('Lobby');
  });

  it('returns undefined for unknown room', () => {
    expect(rooms.get('unknown')).toBeUndefined();
  });

  it('joins a room', () => {
    rooms.create('lobby', 'Lobby');
    const { connection, sent } = addConn();

    const result = rooms.join(connection.id, 'lobby');
    expect(result).toBeDefined();
    expect(result!.connectionIds).toContain(connection.id);
    expect(sent.some((m) => m.type === 'ROOM_JOINED')).toBe(true);
  });

  it('sends ROOM_UPDATE on join', () => {
    rooms.create('lobby', 'Lobby');
    const { connection, sent } = addConn();

    rooms.join(connection.id, 'lobby');
    expect(sent.some((m) => m.type === 'ROOM_UPDATE')).toBe(true);
  });

  it('does not join unknown room', () => {
    const { connection } = addConn();
    const result = rooms.join(connection.id, 'unknown');
    expect(result).toBeUndefined();
  });

  it('leaves a room', () => {
    rooms.create('lobby', 'Lobby');
    const { connection, sent } = addConn();
    rooms.join(connection.id, 'lobby');
    sent.length = 0;

    const result = rooms.leave(connection.id, 'lobby');
    expect(result).toBeDefined();
    expect(result!.connectionIds).not.toContain(connection.id);
  });

  it('sends ROOM_LEFT on leave', () => {
    rooms.create('lobby', 'Lobby');
    const { connection, sent } = addConn();
    rooms.join(connection.id, 'lobby');
    sent.length = 0;

    rooms.leave(connection.id, 'lobby');
    expect(sent.some((m) => m.type === 'ROOM_LEFT')).toBe(true);
  });

  it('handles leaving unknown room', () => {
    const { connection } = addConn();
    const result = rooms.leave(connection.id, 'unknown');
    expect(result).toBeUndefined();
  });

  it('leaves all rooms for a connection', () => {
    rooms.create('a', 'A');
    rooms.create('b', 'B');
    const { connection } = addConn();
    rooms.join(connection.id, 'a');
    rooms.join(connection.id, 'b');

    rooms.leaveAll(connection.id);
    expect(rooms.getConnectionRooms(connection.id)).toEqual([]);
  });

  it('tracks which rooms a connection is in', () => {
    rooms.create('a', 'A');
    rooms.create('b', 'B');
    const { connection } = addConn();

    expect(rooms.getConnectionRooms(connection.id)).toEqual([]);

    rooms.join(connection.id, 'a');
    expect(rooms.getConnectionRooms(connection.id)).toEqual(['a']);

    rooms.join(connection.id, 'b');
    expect(rooms.getConnectionRooms(connection.id)).toContain('a');
    expect(rooms.getConnectionRooms(connection.id)).toContain('b');
  });

  it('handles duplicate join gracefully', () => {
    rooms.create('lobby', 'Lobby');
    const { connection } = addConn();
    rooms.join(connection.id, 'lobby');
    rooms.join(connection.id, 'lobby');
    expect(rooms.get('lobby')!.connectionIds).toHaveLength(1);
  });

  it('removes empty room entry on leaveAll', () => {
    rooms.create('lobby', 'Lobby');
    const { connection } = addConn();
    rooms.join(connection.id, 'lobby');
    rooms.leaveAll(connection.id);
    expect(rooms.get('lobby')!.connectionIds).toEqual([]);
  });
});
