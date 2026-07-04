import type { ConnectionManager } from './connection-manager';
import type { TableState, TableStatus } from './types';
import { createServerMessage } from './types';

let nextTableId = 1;

function generateTableId(): string {
  return `table_${nextTableId++}`;
}

export class TableManager {
  private tables = new Map<string, TableState>();
  private connectionTables = new Map<string, string[]>();

  constructor(private connections: ConnectionManager) {}

  create(name: string, roomId: string, creatorId: string): TableState {
    const id = generateTableId();
    const table: TableState = {
      id,
      roomId,
      name,
      connectionIds: [creatorId],
      status: 'waiting',
      locked: false,
      spectatorIds: [],
      createdAt: Date.now(),
    };
    this.tables.set(id, table);

    const tables = this.connectionTables.get(creatorId) ?? [];
    tables.push(id);
    this.connectionTables.set(creatorId, tables);

    const conn = this.connections.get(creatorId);
    if (conn) {
      conn.send(
        createServerMessage('TABLE_CREATED', {
          tableId: id,
          name,
          roomId,
        }),
      );
    }

    this.broadcastTableUpdate(roomId);
    return table;
  }

  get(id: string): TableState | undefined {
    return this.tables.get(id);
  }

  getByRoom(roomId: string): TableState[] {
    return Array.from(this.tables.values()).filter((t) => t.roomId === roomId);
  }

  getAll(): TableState[] {
    return Array.from(this.tables.values());
  }

  join(connectionId: string, tableId: string): TableState | undefined {
    const table = this.tables.get(tableId);
    if (!table) return undefined;
    if (table.locked) return undefined;
    if (table.status !== 'waiting') return undefined;
    if (table.connectionIds.includes(connectionId)) return table;

    table.connectionIds.push(connectionId);

    const tables = this.connectionTables.get(connectionId) ?? [];
    tables.push(tableId);
    this.connectionTables.set(connectionId, tables);

    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.send(
        createServerMessage('TABLE_JOINED', {
          tableId,
          name: table.name,
          roomId: table.roomId,
        }),
      );
    }

    this.broadcastTableUpdate(table.roomId);
    return table;
  }

  leave(connectionId: string, tableId: string): TableState | undefined {
    const table = this.tables.get(tableId);
    if (!table) return undefined;

    table.connectionIds = table.connectionIds.filter((id) => id !== connectionId);

    const tables = this.connectionTables.get(connectionId);
    if (tables) {
      const idx = tables.indexOf(tableId);
      if (idx !== -1) tables.splice(idx, 1);
      if (tables.length === 0) this.connectionTables.delete(connectionId);
    }

    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.send(createServerMessage('TABLE_LEFT', { tableId }));
    }

    if (table.connectionIds.length === 0 && !table.locked) {
      this.tables.delete(tableId);
    }

    this.broadcastTableUpdate(table.roomId);
    return table;
  }

  leaveAll(connectionId: string): void {
    const tables = this.connectionTables.get(connectionId);
    if (!tables) return;

    for (const tableId of [...tables]) {
      this.leave(connectionId, tableId);
    }
  }

  updateStatus(tableId: string, status: TableStatus): void {
    const table = this.tables.get(tableId);
    if (!table) return;
    table.status = status;
    this.broadcastTableUpdate(table.roomId);
  }

  getConnectionTables(connectionId: string): string[] {
    return [...(this.connectionTables.get(connectionId) ?? [])];
  }

  lock(tableId: string): boolean {
    const table = this.tables.get(tableId);
    if (!table) return false;
    table.locked = true;
    this.broadcastToTable(tableId, createServerMessage('ADMIN_TABLE_LOCKED', { tableId }));
    this.broadcastTableUpdate(table.roomId);
    return true;
  }

  unlock(tableId: string): boolean {
    const table = this.tables.get(tableId);
    if (!table) return false;
    table.locked = false;
    this.broadcastToTable(tableId, createServerMessage('ADMIN_TABLE_UNLOCKED', { tableId }));
    this.broadcastTableUpdate(table.roomId);
    return true;
  }

  closeTable(tableId: string): boolean {
    const table = this.tables.get(tableId);
    if (!table) return false;
    this.broadcastToTable(tableId, createServerMessage('ADMIN_TABLE_CLOSED', { tableId }));
    for (const cid of [...table.connectionIds]) {
      this.leave(cid, tableId);
    }
    this.tables.delete(tableId);
    return true;
  }

  removePlayer(tableId: string, connectionId: string): boolean {
    const table = this.tables.get(tableId);
    if (!table) return false;
    if (!table.connectionIds.includes(connectionId)) return false;
    this.leave(connectionId, tableId);
    return true;
  }

  sendWarning(tableId: string, message: string): boolean {
    const table = this.tables.get(tableId);
    if (!table) return false;
    this.broadcastToTable(tableId, createServerMessage('ADMIN_WARNING', { tableId, message }));
    return true;
  }

  broadcastMessage(tableId: string, message: string): boolean {
    const table = this.tables.get(tableId);
    if (!table) return false;
    this.broadcastToTable(tableId, createServerMessage('ADMIN_BROADCAST', { tableId, message }));
    return true;
  }

  addSpectator(tableId: string, connectionId: string): boolean {
    const table = this.tables.get(tableId);
    if (!table) return false;
    if (!table.spectatorIds.includes(connectionId)) {
      table.spectatorIds.push(connectionId);
    }
    return true;
  }

  removeSpectator(tableId: string, connectionId: string): boolean {
    const table = this.tables.get(tableId);
    if (!table) return false;
    table.spectatorIds = table.spectatorIds.filter((id) => id !== connectionId);
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.send(createServerMessage('TABLE_LEFT', { tableId }));
    }
    return true;
  }

  private broadcastToTable(tableId: string, message: ReturnType<typeof createServerMessage>): void {
    const table = this.tables.get(tableId);
    if (!table) return;
    this.connections.broadcastTo(table.connectionIds, message);
  }

  private broadcastTableUpdate(roomId: string): void {
    const tables = this.getByRoom(roomId);
    const payload = {
      roomId,
      tables: tables.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        locked: t.locked,
        playerCount: t.connectionIds.length,
      })),
    };

    for (const table of tables) {
      this.connections.broadcastTo(
        table.connectionIds,
        createServerMessage('TABLE_UPDATE', payload),
      );
    }
  }

  reset(): void {
    this.tables.clear();
    this.connectionTables.clear();
    nextTableId = 1;
  }
}
