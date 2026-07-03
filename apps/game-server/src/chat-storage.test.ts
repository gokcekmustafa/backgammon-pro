import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryChatStorage } from './chat-storage';
import type { ChatMessage } from './chat-manager';

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg_1',
    userId: null,
    username: 'User',
    text: 'Hello',
    timestamp: Date.now(),
    roomId: null,
    tableId: null,
    isSystemMessage: false,
    ...overrides,
  };
}

describe('InMemoryChatStorage', () => {
  let storage: InMemoryChatStorage;

  beforeEach(() => {
    storage = new InMemoryChatStorage();
  });

  it('stores and retrieves room messages', () => {
    const msg = makeMsg({ roomId: 'lobby' });
    storage.store(msg);
    const history = storage.getHistory('lobby', null);
    expect(history).toHaveLength(1);
    expect(history[0].text).toBe('Hello');
  });

  it('stores and retrieves table messages', () => {
    const msg = makeMsg({ tableId: 'table1' });
    storage.store(msg);
    const history = storage.getHistory(null, 'table1');
    expect(history).toHaveLength(1);
    expect(history[0].text).toBe('Hello');
  });

  it('returns empty array for unknown scope', () => {
    expect(storage.getHistory('unknown', null)).toEqual([]);
    expect(storage.getHistory(null, 'unknown')).toEqual([]);
  });

  it('keeps separate histories per room', () => {
    storage.store(makeMsg({ roomId: 'lobby', text: 'Lobby msg' }));
    storage.store(makeMsg({ roomId: 'room2', text: 'Room2 msg' }));

    expect(storage.getHistory('lobby', null)).toHaveLength(1);
    expect(storage.getHistory('room2', null)).toHaveLength(1);
    expect(storage.getHistory('lobby', null)[0].text).toBe('Lobby msg');
  });

  it('limits to 100 messages', () => {
    for (let i = 0; i < 105; i++) {
      storage.store(makeMsg({ roomId: 'lobby', text: `msg ${i}` }));
    }
    const history = storage.getHistory('lobby', null);
    expect(history).toHaveLength(100);
    expect(history[0].text).toBe('msg 5');
  });

  it('reset clears all history', () => {
    storage.store(makeMsg({ roomId: 'lobby' }));
    storage.reset();
    expect(storage.getHistory('lobby', null)).toEqual([]);
  });
});
