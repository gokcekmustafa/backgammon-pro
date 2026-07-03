import {
  createInitialState,
  setDiceRoll,
  applyMove,
  advanceTurn,
  completeGame,
  detectGameEnd,
  detectWinType,
  calculateWinValue,
  resignGame,
  rollDice,
  createValidator,
  Player,
  TurnPhase,
} from '@backgammon/game-engine';
import type { GameState, Move, Player as P } from '@backgammon/game-engine';
import { createServerMessage } from './types';
import type { ServerMessageType } from './types';
import type { ConnectionManager } from './connection-manager';

const RECONNECT_INTERVALS = [1000, 2000, 5000, 10_000, 30_000];

interface GameSession {
  tableId: string;
  gameState: GameState;
  p1UserId: string;
  p2UserId: string;
  status: 'active' | 'finished';
  disconnectTimer: ReturnType<typeof setTimeout> | null;
  disconnectedUserId: string | null;
}

export class GameSessionManager {
  private sessions = new Map<string, GameSession>();
  private userSessions = new Map<string, string>();
  private validator = createValidator();

  constructor(
    private connections: ConnectionManager,
    private onGameComplete?: (
      tableId: string,
      p1UserId: string,
      p2UserId: string,
      winner: 1 | 2 | null,
    ) => void,
  ) {}

  createSession(tableId: string, p1UserId: string, p2UserId: string): void {
    if (this.sessions.has(tableId)) return;
    const gameState = createInitialState();
    const session: GameSession = {
      tableId,
      gameState,
      p1UserId,
      p2UserId,
      status: 'active',
      disconnectTimer: null,
      disconnectedUserId: null,
    };
    this.sessions.set(tableId, session);
    this.userSessions.set(p1UserId, tableId);
    this.userSessions.set(p2UserId, tableId);
    this.sendGameStateToUser(session, p1UserId);
    this.sendGameStateToUser(session, p2UserId);
  }

  getSession(tableId: string): GameSession | undefined {
    return this.sessions.get(tableId);
  }

  getSessionByUserId(userId: string): GameSession | undefined {
    const tableId = this.userSessions.get(userId);
    if (!tableId) return undefined;
    return this.sessions.get(tableId);
  }

  handleRoll(connectionId: string): void {
    const userId = this.connections.getUserId(connectionId);
    if (!userId) return;
    const session = this.getSessionByUserId(userId);
    if (!session || session.status !== 'active') return;

    const player = this.getPlayerForUser(session, userId);
    if (session.gameState.currentPlayer !== player) return;
    if (session.gameState.turn.phase !== TurnPhase.WaitingForRoll) return;

    const roll = rollDice();
    session.gameState = setDiceRoll(session.gameState, roll);

    const legalMoves = this.validator.getLegalMoves(session.gameState);
    if (legalMoves.length === 0 && session.gameState.remainingDice.length > 0) {
      session.gameState = advanceTurn(session.gameState);
    }

    this.broadcastGameState(session);
  }

  handleMove(connectionId: string, from: number, to: number, diceUsed: number): void {
    const userId = this.connections.getUserId(connectionId);
    if (!userId) return;
    const session = this.getSessionByUserId(userId);
    if (!session || session.status !== 'active') return;

    const player = this.getPlayerForUser(session, userId);
    if (session.gameState.currentPlayer !== player) return;

    const move: Move = { from, to, diceUsed, player, wasHit: false };
    const validation = this.validator.validateMove(session.gameState, move);

    if (!validation.isValid) {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.send(createServerMessage('GAME_MOVE_REJECTED', { reason: validation.reason }));
      }
      return;
    }

    session.gameState = applyMove(session.gameState, move);

    const gameEnd = detectGameEnd(session.gameState);
    if (gameEnd !== null) {
      const winType = detectWinType(session.gameState, gameEnd);
      const winValue = calculateWinValue(winType);
      session.gameState = completeGame(session.gameState, gameEnd, winType, winValue);
      session.status = 'finished';
      this.broadcastGameState(session);
      this.onGameComplete?.(
        session.tableId,
        session.p1UserId,
        session.p2UserId,
        gameEnd === Player.One ? 1 : 2,
      );
      this.cleanupSession(session.tableId);
      return;
    }

    if (session.gameState.remainingDice.length > 0) {
      const remainingMoves = this.validator.getLegalMoves(session.gameState);
      if (remainingMoves.length === 0) {
        session.gameState = advanceTurn(session.gameState);
      }
    }

    this.broadcastGameState(session);
  }

  handleResign(connectionId: string): void {
    const userId = this.connections.getUserId(connectionId);
    if (!userId) return;
    const session = this.getSessionByUserId(userId);
    if (!session || session.status !== 'active') return;

    const player = this.getPlayerForUser(session, userId);
    session.gameState = resignGame(session.gameState, player);
    session.status = 'finished';
    this.broadcastGameState(session);
    const resignWinner = player === Player.One ? 2 : 1;
    this.onGameComplete?.(session.tableId, session.p1UserId, session.p2UserId, resignWinner);
    this.cleanupSession(session.tableId);
  }

  handleDisconnect(connectionId: string): void {
    const userId = this.connections.getUserId(connectionId);
    if (!userId) return;
    const session = this.getSessionByUserId(userId);
    if (!session || session.status !== 'active') return;

    const opponentId = this.getOpponentUserId(session, userId);
    this.sendToUser(session, opponentId, 'OPPONENT_DISCONNECTED', { userId });

    session.disconnectedUserId = userId;
    this.scheduleDisconnectStep(session, userId, 0);
  }

  private scheduleDisconnectStep(session: GameSession, userId: string, step: number): void {
    if (step >= RECONNECT_INTERVALS.length) return;

    session.disconnectTimer = setTimeout(() => {
      if (session.status !== 'active') return;
      if (session.disconnectedUserId !== userId) return;

      if (step === RECONNECT_INTERVALS.length - 1) {
        const disconnectedPlayer = this.getPlayerForUser(session, userId);
        session.gameState = resignGame(session.gameState, disconnectedPlayer);
        session.status = 'finished';
        this.broadcastGameState(session);
        const timeoutWinner = disconnectedPlayer === Player.One ? 2 : 1;
        this.onGameComplete?.(session.tableId, session.p1UserId, session.p2UserId, timeoutWinner);
        this.cleanupSession(session.tableId);
      } else {
        this.scheduleDisconnectStep(session, userId, step + 1);
      }
    }, RECONNECT_INTERVALS[step]);
  }

  handleReconnect(connectionId: string): void {
    const userId = this.connections.getUserId(connectionId);
    if (!userId) return;
    const session = this.getSessionByUserId(userId);
    if (!session) return;

    if (session.disconnectTimer) {
      clearTimeout(session.disconnectTimer);
      session.disconnectTimer = null;
      session.disconnectedUserId = null;
    }

    const opponentId = this.getOpponentUserId(session, userId);
    this.sendToUser(session, opponentId, 'OPPONENT_RECONNECTED', { userId });
    this.sendGameStateToUser(session, userId);
  }

  private getPlayerForUser(session: GameSession, userId: string): P {
    return session.p1UserId === userId ? Player.One : Player.Two;
  }

  private getOpponentUserId(session: GameSession, userId: string): string {
    return session.p1UserId === userId ? session.p2UserId : session.p1UserId;
  }

  private sendToUser(
    session: GameSession,
    userId: string,
    type: ServerMessageType,
    payload: Record<string, unknown>,
  ): void {
    const connectionId = this.connections.getConnectionIdByUserId(userId);
    if (!connectionId) return;
    const conn = this.connections.get(connectionId);
    if (conn) conn.send(createServerMessage(type, payload));
  }

  private sendGameStateToUser(session: GameSession, userId: string): void {
    const player = this.getPlayerForUser(session, userId);
    this.sendToUser(session, userId, 'GAME_STATE_SYNC', {
      gameState: session.gameState,
      player,
      tableId: session.tableId,
    });
  }

  private broadcastGameState(session: GameSession): void {
    this.sendGameStateToUser(session, session.p1UserId);
    this.sendGameStateToUser(session, session.p2UserId);
  }

  private cleanupSession(tableId: string): void {
    const session = this.sessions.get(tableId);
    if (!session) return;
    if (session.disconnectTimer) {
      clearTimeout(session.disconnectTimer);
    }
    this.userSessions.delete(session.p1UserId);
    this.userSessions.delete(session.p2UserId);
    this.sessions.delete(tableId);
  }

  reset(): void {
    for (const session of this.sessions.values()) {
      if (session.disconnectTimer) {
        clearTimeout(session.disconnectTimer);
      }
    }
    this.sessions.clear();
    this.userSessions.clear();
  }
}
