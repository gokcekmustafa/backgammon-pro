import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionManager } from './connection-manager';
import { TableManager } from './table-manager';
import type { ServerMessage } from './types';

describe('TableManager', () => {
  let connections: ConnectionManager;
  let tables: TableManager;

  beforeEach(() => {
    connections = new ConnectionManager();
    connections.reset();
    tables = new TableManager(connections);
    tables.reset();
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

  it('creates a table and sends TABLE_CREATED', () => {
    const { connection, sent } = addConn();
    const table = tables.create('My Table', 'room_1', connection.id);

    expect(table.id).toMatch(/^table_\d+$/);
    expect(table.name).toBe('My Table');
    expect(table.roomId).toBe('room_1');
    expect(table.connectionIds).toEqual([connection.id]);
    expect(table.status).toBe('waiting');
    expect(sent.some((m) => m.type === 'TABLE_CREATED')).toBe(true);
  });

  it('generates unique table IDs', () => {
    const c1 = addConn().connection;
    const c2 = addConn().connection;
    const t1 = tables.create('A', 'r1', c1.id);
    const t2 = tables.create('B', 'r2', c2.id);
    expect(t1.id).not.toBe(t2.id);
  });

  it('gets a table by ID', () => {
    const { connection } = addConn();
    const created = tables.create('T', 'r1', connection.id);
    expect(tables.get(created.id)?.name).toBe('T');
  });

  it('returns undefined for unknown table', () => {
    expect(tables.get('unknown')).toBeUndefined();
  });

  it('lists tables in a room', () => {
    const c1 = addConn().connection;
    const c2 = addConn().connection;
    tables.create('A', 'r1', c1.id);
    tables.create('B', 'r1', c2.id);
    tables.create('C', 'r2', c1.id);

    expect(tables.getByRoom('r1')).toHaveLength(2);
    expect(tables.getByRoom('r2')).toHaveLength(1);
  });

  it('returns all tables', () => {
    const c1 = addConn().connection;
    const c2 = addConn().connection;
    tables.create('A', 'r1', c1.id);
    tables.create('B', 'r2', c2.id);
    expect(tables.getAll()).toHaveLength(2);
  });

  it('joins a table', () => {
    const owner = addConn().connection;
    const joiner = addConn();
    const table = tables.create('T', 'r1', owner.id);

    const result = tables.join(joiner.connection.id, table.id);
    expect(result).toBeDefined();
    expect(result!.connectionIds).toContain(joiner.connection.id);
    expect(joiner.sent.some((m) => m.type === 'TABLE_JOINED')).toBe(true);
  });

  it('does not join a full/playing table', () => {
    const c1 = addConn().connection;
    const c2 = addConn().connection;
    const c3 = addConn();
    const table = tables.create('T', 'r1', c1.id);
    tables.join(c2.id, table.id);
    tables.updateStatus(table.id, 'playing');

    const result = tables.join(c3.connection.id, table.id);
    expect(result).toBeUndefined();
  });

  it('does not join unknown table', () => {
    const { connection } = addConn();
    const result = tables.join(connection.id, 'unknown');
    expect(result).toBeUndefined();
  });

  it('leaves a table', () => {
    const owner = addConn().connection;
    const table = tables.create('T', 'r1', owner.id);
    const result = tables.leave(owner.id, table.id);
    expect(result).toBeDefined();
    expect(result!.connectionIds).not.toContain(owner.id);
  });

  it('removes table when last participant leaves', () => {
    const owner = addConn().connection;
    const table = tables.create('T', 'r1', owner.id);
    tables.leave(owner.id, table.id);
    expect(tables.get(table.id)).toBeUndefined();
  });

  it('handles leaving unknown table', () => {
    const { connection } = addConn();
    const result = tables.leave(connection.id, 'unknown');
    expect(result).toBeUndefined();
  });

  it('leaves all tables for a connection', () => {
    const owner = addConn().connection;
    tables.create('A', 'r1', owner.id);
    tables.create('B', 'r1', owner.id);

    tables.leaveAll(owner.id);
    expect(tables.getConnectionTables(owner.id)).toEqual([]);
  });

  it('updates table status', () => {
    const owner = addConn().connection;
    const table = tables.create('T', 'r1', owner.id);
    tables.updateStatus(table.id, 'playing');
    expect(tables.get(table.id)?.status).toBe('playing');
  });

  it('tracks which tables a connection is at', () => {
    const owner = addConn().connection;
    const joiner = addConn().connection;

    expect(tables.getConnectionTables(owner.id)).toEqual([]);

    const t1 = tables.create('A', 'r1', owner.id);
    expect(tables.getConnectionTables(owner.id)).toEqual([t1.id]);

    tables.join(joiner, t1.id);
    expect(tables.getConnectionTables(joiner)).toEqual([t1.id]);
  });
});
