import type { ConnectionManager } from './connection-manager';
import type { Room } from './types';
import { createServerMessage } from './types';

export class RoomManager {
  private rooms = new Map<string, Room>();
  private connectionRooms = new Map<string, string[]>();

  constructor(private connections: ConnectionManager) {}

  create(id: string, name: string): Room {
    const room: Room = { id, name, connectionIds: [], createdAt: Date.now() };
    this.rooms.set(id, room);
    return room;
  }

  get(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  getAll(): Room[] {
    return Array.from(this.rooms.values());
  }

  join(connectionId: string, roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    if (!room.connectionIds.includes(connectionId)) {
      room.connectionIds.push(connectionId);
    }

    const rooms = this.connectionRooms.get(connectionId) ?? [];
    if (!rooms.includes(roomId)) {
      rooms.push(roomId);
      this.connectionRooms.set(connectionId, rooms);
    }

    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.send(createServerMessage('ROOM_JOINED', { roomId }));
    }

    this.broadcastRoomUpdate(roomId);
    return room;
  }

  leave(connectionId: string, roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    room.connectionIds = room.connectionIds.filter((id) => id !== connectionId);

    const rooms = this.connectionRooms.get(connectionId);
    if (rooms) {
      const idx = rooms.indexOf(roomId);
      if (idx !== -1) rooms.splice(idx, 1);
      if (rooms.length === 0) this.connectionRooms.delete(connectionId);
    }

    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.send(createServerMessage('ROOM_LEFT', { roomId }));
    }

    this.broadcastRoomUpdate(roomId);
    return room;
  }

  leaveAll(connectionId: string): void {
    const rooms = this.connectionRooms.get(connectionId);
    if (!rooms) return;

    for (const roomId of [...rooms]) {
      this.leave(connectionId, roomId);
    }
  }

  getConnectionRooms(connectionId: string): string[] {
    return [...(this.connectionRooms.get(connectionId) ?? [])];
  }

  private broadcastRoomUpdate(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.connections.broadcastTo(
      room.connectionIds,
      createServerMessage('ROOM_UPDATE', {
        roomId: room.id,
        connectionCount: room.connectionIds.length,
      }),
    );
  }

  reset(): void {
    this.rooms.clear();
    this.connectionRooms.clear();
  }
}
