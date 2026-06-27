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
  });

  it('has exactly 7 message types', () => {
    expect(CLIENT_MESSAGE_TYPES).toHaveLength(7);
  });
});
