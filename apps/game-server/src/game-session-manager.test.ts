import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameSessionManager } from './game-session-manager';
import { ConnectionManager } from './connection-manager';
import { Player, GamePhase, createValidator } from '@backgammon/game-engine';
import type { ServerMessage } from './types';

function createMockSend() {
  return vi.fn();
}

describe('GameSessionManager', () => {
  let connections: ConnectionManager;
  let gsm: GameSessionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    connections = new ConnectionManager();
    gsm = new GameSessionManager(connections);
  });

  afterEach(() => {
    vi.useRealTimers();
    gsm.reset();
    connections.reset();
  });

  it('creates a session and sends GAME_STATE_SYNC to both players', () => {
    const p1Send = createMockSend();
    const p2Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(p2Send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');

    gsm.createSession('table1', 'user1', 'user2');

    expect(p1Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_STATE_SYNC' }));
    expect(p2Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_STATE_SYNC' }));
  });

  it('does not create duplicate sessions', () => {
    const send1 = createMockSend();
    const send2 = createMockSend();
    const c1 = connections.add(send1, vi.fn());
    const c2 = connections.add(send2, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');

    gsm.createSession('table1', 'user1', 'user2');
    const calls1 = send1.mock.calls.filter((c) => c[0].type === 'GAME_STATE_SYNC').length;
    const calls2 = send2.mock.calls.filter((c) => c[0].type === 'GAME_STATE_SYNC').length;

    // Create again (should be no-op)
    gsm.createSession('table1', 'user1', 'user2');

    const calls1b = send1.mock.calls.filter((c) => c[0].type === 'GAME_STATE_SYNC').length;
    const calls2b = send2.mock.calls.filter((c) => c[0].type === 'GAME_STATE_SYNC').length;

    expect(calls1).toBe(1);
    expect(calls2).toBe(1);
    expect(calls1b).toBe(1);
    expect(calls2b).toBe(1);
  });

  it('handleRoll rolls dice and broadcasts updated state', () => {
    const p1Send = createMockSend();
    const p2Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(p2Send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    p1Send.mockClear();
    p2Send.mockClear();

    gsm.handleRoll(c1.id);

    // Both players should get state sync with dice info
    expect(p1Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_STATE_SYNC' }));
    expect(p2Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_STATE_SYNC' }));

    const msg1 = p1Send.mock.calls[0][0] as ServerMessage;
    const state = msg1.payload?.gameState as any;
    expect(state.diceRoll).not.toBeNull();
    expect(state.turn.phase).toBe('waiting_for_move');
  });

  it('handleRoll rejects when not players turn', () => {
    const p1Send = createMockSend();
    const p2Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(p2Send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    p1Send.mockClear();
    p2Send.mockClear();

    // Player 2 tries to roll (but it's Player 1's turn)
    gsm.handleRoll(c2.id);

    expect(p2Send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_STATE_SYNC' }));
  });

  it('handleRoll rejects when already rolled', () => {
    const p1Send = createMockSend();
    const p2Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(p2Send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    gsm.handleRoll(c1.id); // First roll works
    p1Send.mockClear();

    gsm.handleRoll(c1.id); // Second roll should be rejected
    expect(p1Send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_STATE_SYNC' }));
  });

  it('handleMove validates and applies a move', () => {
    const p1Send = createMockSend();
    const p2Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(p2Send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    // Roll dice with specific values so we know what moves are valid
    gsm.handleRoll(c1.id);
    p1Send.mockClear();
    p2Send.mockClear();

    // Get the current game state to find a legal move
    const session = gsm.getSession('table1')!;
    const validator = createValidator();
    const legalMoves = validator.getLegalMoves(session.gameState);

    if (legalMoves.length > 0) {
      const move = legalMoves[0];
      gsm.handleMove(c1.id, move.from, move.to, move.diceUsed);

      expect(p1Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_STATE_SYNC' }));
      expect(p2Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_STATE_SYNC' }));
    }
  });

  it('handleMove rejects invalid moves', () => {
    const p1Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(createMockSend(), vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    gsm.handleRoll(c1.id);
    p1Send.mockClear();

    // Try invalid move (to point 0, which we already occupy)
    gsm.handleMove(c1.id, 0, 0, 3);

    expect(p1Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_MOVE_REJECTED' }));
  });

  it('handleResign ends the game', () => {
    const p1Send = createMockSend();
    const p2Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(p2Send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    p1Send.mockClear();
    p2Send.mockClear();

    gsm.handleResign(c1.id);

    const msg1 = p1Send.mock.calls[0][0] as ServerMessage;
    const state = msg1.payload?.gameState as any;
    expect(state.phase).toBe(GamePhase.Finished);
    expect(state.winner).toBe(Player.Two);
    expect(state.winType).toBe('resignation');
  });

  it('handleDisconnect notifies opponent and starts timer', () => {
    const p1Send = createMockSend();
    const p2Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(p2Send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    p2Send.mockClear();

    gsm.handleDisconnect(c1.id);

    expect(p2Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'OPPONENT_DISCONNECTED' }));
  });

  it('disconnect timer triggers auto-resign after 2 minutes', () => {
    const p1Send = createMockSend();
    const p2Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(p2Send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    p1Send.mockClear();
    p2Send.mockClear();

    gsm.handleDisconnect(c1.id);

    p1Send.mockClear();
    p2Send.mockClear();

    vi.advanceTimersByTime(120_000);

    // Opponent (Player 2) should auto-win
    expect(p1Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_STATE_SYNC' }));
    const msg = p1Send.mock.calls[0][0] as ServerMessage;
    const state = msg.payload?.gameState as any;
    expect(state.phase).toBe(GamePhase.Finished);
    expect(state.winner).toBe(Player.Two);
  });

  it('handleReconnect cancels timer and notifies opponent', () => {
    const p1Send = createMockSend();
    const p2Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(p2Send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    gsm.handleDisconnect(c1.id);
    p1Send.mockClear();
    p2Send.mockClear();

    // Reconnect
    gsm.handleReconnect(c1.id);

    expect(p2Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'OPPONENT_RECONNECTED' }));
    expect(p1Send).toHaveBeenCalledWith(expect.objectContaining({ type: 'GAME_STATE_SYNC' }));

    // Advance timer - should NOT trigger auto-resign
    p1Send.mockClear();
    p2Send.mockClear();
    vi.advanceTimersByTime(120_000);
    expect(p1Send).not.toHaveBeenCalled();
  });

  it('rejects actions from unauthenticated connections', () => {
    const send = createMockSend();
    const conn = connections.add(send, vi.fn());
    // Don't bind user

    gsm.handleRoll(conn.id);
    const gameMessages = send.mock.calls.filter(
      (c) => c[0].type !== 'CONNECTED' && c[0].type !== 'GAME_STATE_SYNC',
    );
    expect(gameMessages).toHaveLength(0);
  });

  it('rejects actions for non-existent sessions', () => {
    const send = createMockSend();
    const conn = connections.add(send, vi.fn());
    connections.bindUser(conn.id, 'user1');

    gsm.handleRoll(conn.id);
    const gameMessages = send.mock.calls.filter(
      (c) => c[0].type !== 'CONNECTED' && c[0].type !== 'GAME_STATE_SYNC',
    );
    expect(gameMessages).toHaveLength(0);
  });

  it('cleanup removes session after game finished', () => {
    const p1Send = createMockSend();
    const p2Send = createMockSend();
    const c1 = connections.add(p1Send, vi.fn());
    const c2 = connections.add(p2Send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    gsm.handleResign(c1.id);
    const session = gsm.getSession('table1');
    expect(session).toBeUndefined();
  });

  it('reset clears all sessions', () => {
    const send = createMockSend();
    const c1 = connections.add(send, vi.fn());
    const c2 = connections.add(send, vi.fn());
    connections.bindUser(c1.id, 'user1');
    connections.bindUser(c2.id, 'user2');
    gsm.createSession('table1', 'user1', 'user2');

    gsm.reset();
    expect(gsm.getSession('table1')).toBeUndefined();
  });

  describe('admin methods', () => {
    beforeEach(() => {
      const send1 = createMockSend();
      const send2 = createMockSend();
      const c1 = connections.add(send1, vi.fn());
      const c2 = connections.add(send2, vi.fn());
      connections.bindUser(c1.id, 'user1');
      connections.bindUser(c2.id, 'user2');
      gsm.createSession('table1', 'user1', 'user2');
    });

    it('getAllSessions returns session info', () => {
      const sessions = gsm.getAllSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].tableId).toBe('table1');
      expect(sessions[0].status).toBe('active');
    });

    it('pauseSession sets status to paused', () => {
      const result = gsm.pauseSession('table1');
      expect(result).toBe(true);
      const session = gsm.getSession('table1');
      expect(session?.status).toBe('paused');
    });

    it('resumeSession sets status back to active', () => {
      gsm.pauseSession('table1');
      const result = gsm.resumeSession('table1');
      expect(result).toBe(true);
      const session = gsm.getSession('table1');
      expect(session?.status).toBe('active');
    });

    it('terminateSession finishes the game', () => {
      const result = gsm.terminateSession('table1');
      expect(result).toBe(true);
      expect(gsm.getSession('table1')).toBeUndefined();
    });

    it('forceResignPlayer forces player 1 to resign', () => {
      const result = gsm.forceResignPlayer('table1', 1);
      expect(result).toBe(true);
      expect(gsm.getSession('table1')).toBeUndefined();
    });

    it('forceDraw ends the game with no winner', () => {
      const result = gsm.forceDraw('table1');
      expect(result).toBe(true);
      expect(gsm.getSession('table1')).toBeUndefined();
    });

    it('returns false for non-existent table', () => {
      expect(gsm.pauseSession('nonexistent')).toBe(false);
      expect(gsm.resumeSession('nonexistent')).toBe(false);
      expect(gsm.terminateSession('nonexistent')).toBe(false);
      expect(gsm.forceResignPlayer('nonexistent', 1)).toBe(false);
      expect(gsm.forceDraw('nonexistent')).toBe(false);
    });
  });
});
