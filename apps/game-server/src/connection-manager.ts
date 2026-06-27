import type { Connection, ServerMessage } from './types';
import { createServerMessage } from './types';

let nextId = 1;

function generateId(): string {
  return `conn_${nextId++}`;
}

export class ConnectionManager {
  private connections = new Map<string, Connection>();

  add(send: (message: ServerMessage) => void, close: () => void): Connection {
    const id = generateId();
    const connection: Connection = { id, send, close };
    this.connections.set(id, connection);
    connection.send(createServerMessage('CONNECTED', { connectionId: id }));
    return connection;
  }

  remove(id: string): boolean {
    return this.connections.delete(id);
  }

  get(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  has(id: string): boolean {
    return this.connections.has(id);
  }

  getAll(): Connection[] {
    return Array.from(this.connections.values());
  }

  broadcast(message: ServerMessage): void {
    for (const conn of this.connections.values()) {
      conn.send(message);
    }
  }

  broadcastTo(ids: string[], message: ServerMessage): void {
    for (const id of ids) {
      const conn = this.connections.get(id);
      if (conn) conn.send(message);
    }
  }

  size(): number {
    return this.connections.size;
  }

  reset(): void {
    this.connections.clear();
    nextId = 1;
  }
}
