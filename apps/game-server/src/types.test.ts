import { describe, it, expect } from 'vitest';
import { createServerMessage, CLIENT_MESSAGE_TYPES } from './types';

describe('createServerMessage', () => {
  it('creates a message with the given type', () => {
    const msg = createServerMessage('CONNECTED');
    expect(msg.type).toBe('CONNECTED');
  });

  it('includes a timestamp', () => {
    const msg = createServerMessage('PONG');
    expect(msg.timestamp).toBeGreaterThan(0);
  });

  it('includes optional payload', () => {
    const msg = createServerMessage('ERROR', { message: 'test' });
    expect(msg.payload).toEqual({ message: 'test' });
  });

  it('works without payload', () => {
    const msg = createServerMessage('ROOM_JOINED');
    expect(msg.payload).toBeUndefined();
  });
});

describe('CLIENT_MESSAGE_TYPES', () => {
  it('contains all expected message types', () => {
    expect(CLIENT_MESSAGE_TYPES).toContain('JOIN_ROOM');
    expect(CLIENT_MESSAGE_TYPES).toContain('LEAVE_ROOM');
    expect(CLIENT_MESSAGE_TYPES).toContain('CREATE_TABLE');
    expect(CLIENT_MESSAGE_TYPES).toContain('JOIN_TABLE');
    expect(CLIENT_MESSAGE_TYPES).toContain('LEAVE_TABLE');
    expect(CLIENT_MESSAGE_TYPES).toContain('CHAT_MESSAGE');
    expect(CLIENT_MESSAGE_TYPES).toContain('PING');
    expect(CLIENT_MESSAGE_TYPES).toContain('AUTHENTICATE');
    expect(CLIENT_MESSAGE_TYPES).toContain('ROLL_DICE');
    expect(CLIENT_MESSAGE_TYPES).toContain('MAKE_MOVE');
    expect(CLIENT_MESSAGE_TYPES).toContain('RESIGN_GAME');
    expect(CLIENT_MESSAGE_TYPES).toContain('RECONNECT_GAME');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_CLOSE_TABLE');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_LOCK_TABLE');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_UNLOCK_TABLE');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_FORCE_REMOVE');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_SEND_WARNING');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_BROADCAST');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_PAUSE_GAME');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_RESUME_GAME');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_TERMINATE_GAME');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_FORCE_RESIGN');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_FORCE_DRAW');
    expect(CLIENT_MESSAGE_TYPES).toContain('ADMIN_KICK_SPECTATOR');
  });

  it('has exactly 24 message types', () => {
    expect(CLIENT_MESSAGE_TYPES).toHaveLength(24);
  });
});
