import type { PrismaClient } from '@backgammon/database';
import type { ConnectionManager } from './connection-manager';
import type { SecurityService } from './security-service';

interface PlayerActionRecord {
  timestamp: number;
  actionType: string;
  payload: string;
}

interface AntiCheatSession {
  userId: string;
  lastActionTimestamp: number;
  actionHistory: PlayerActionRecord[];
  processedMoveHashes: Set<string>;
  diceRolled: boolean;
  lastDiceTimestamp: number;
  consecutiveInvalidActions: number;
  flagged: boolean;
}

export class AntiCheatService {
  private sessions = new Map<string, AntiCheatSession>();
  private readonly MIN_MOVE_INTERVAL_MS: number;
  private readonly MAX_ACTION_HISTORY = 100;
  private readonly MAX_INVALID_ACTIONS_BEFORE_FLAG = 5;

  constructor(
    private prisma: PrismaClient,
    private connections: ConnectionManager,
    private security: SecurityService,
    minMoveTimeMs = 100,
  ) {
    this.MIN_MOVE_INTERVAL_MS = minMoveTimeMs;
  }

  private getOrCreateSession(userId: string): AntiCheatSession {
    let session = this.sessions.get(userId);
    if (!session) {
      session = {
        userId,
        lastActionTimestamp: 0,
        actionHistory: [],
        processedMoveHashes: new Set(),
        diceRolled: false,
        lastDiceTimestamp: 0,
        consecutiveInvalidActions: 0,
        flagged: false,
      };
      this.sessions.set(userId, session);
    }
    return session;
  }

  private getConnectionIp(connectionId: string): string | undefined {
    return undefined;
  }

  async validateMove(
    userId: string,
    connectionId: string,
    from: number,
    to: number,
    diceUsed: number,
  ): Promise<{ valid: boolean; reason?: string }> {
    const session = this.getOrCreateSession(userId);
    const now = Date.now();

    // Impossible move timing
    const timeSinceLastAction = now - session.lastActionTimestamp;
    if (session.lastActionTimestamp > 0 && timeSinceLastAction < this.MIN_MOVE_INTERVAL_MS) {
      session.consecutiveInvalidActions++;
      await this.security.log({
        eventType: 'CHEAT_ATTEMPT',
        severity: 'WARN',
        userId,
        details: {
          reason: 'impossible_timing',
          timeSinceLastAction,
          minRequired: this.MIN_MOVE_INTERVAL_MS,
          from, to, diceUsed,
        },
      });
      return { valid: false, reason: 'Action too fast' };
    }

    // Duplicate move detection
    const moveHash = `${from}-${to}-${diceUsed}`;
    if (session.processedMoveHashes.has(moveHash) && session.diceRolled) {
      session.consecutiveInvalidActions++;
      await this.security.log({
        eventType: 'CHEAT_ATTEMPT',
        severity: 'WARN',
        userId,
        details: {
          reason: 'duplicate_move',
          moveHash,
          from, to, diceUsed,
        },
      });
      return { valid: false, reason: 'Duplicate move detected' };
    }

    // Replay attack detection
    if (this.isReplayAttack(session, moveHash, now)) {
      session.consecutiveInvalidActions++;
      await this.security.log({
        eventType: 'REPLAY_ATTACK',
        severity: 'ERROR',
        userId,
        details: { reason: 'replay_attack_detected', moveHash, from, to, diceUsed },
      });
      return { valid: false, reason: 'Replay attack detected' };
    }

    // Record the action
    session.processedMoveHashes.add(moveHash);
    session.actionHistory.push({
      timestamp: now,
      actionType: 'move',
      payload: moveHash,
    });
    if (session.actionHistory.length > this.MAX_ACTION_HISTORY) {
      session.actionHistory.shift();
    }
    session.lastActionTimestamp = now;
    session.consecutiveInvalidActions = 0;

    return { valid: true };
  }

  async validateDiceRoll(
    userId: string,
    connectionId: string,
    clientRoll?: { die1: number; die2: number },
  ): Promise<{ valid: boolean; reason?: string }> {
    const session = this.getOrCreateSession(userId);

    // Dice already rolled
    if (session.diceRolled) {
      await this.security.log({
        eventType: 'INVALID_DICE_SYNC',
        severity: 'WARN',
        userId,
        details: { reason: 'dice_already_rolled' },
      });
      return { valid: false, reason: 'Dice already rolled this turn' };
    }

    // Client should not send dice values; server generates them
    if (clientRoll) {
      session.consecutiveInvalidActions++;
      await this.security.log({
        eventType: 'CHEAT_ATTEMPT',
        severity: 'WARN',
        userId,
        details: { reason: 'client_sent_dice_values', clientRoll },
      });
      return { valid: false, reason: 'Dice are rolled server-side only' };
    }

    session.diceRolled = true;
    session.lastDiceTimestamp = Date.now();
    return { valid: true };
  }

  async onTurnAdvance(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      session.diceRolled = false;
      session.processedMoveHashes.clear();
    }
  }

  private isReplayAttack(session: AntiCheatSession, moveHash: string, now: number): boolean {
    const recent = session.actionHistory.filter(
      (a) => a.actionType === 'move' && a.payload === moveHash && now - a.timestamp < 5000,
    );
    return recent.length >= 3;
  }

  async isFlagged(userId: string): Promise<boolean> {
    const session = this.sessions.get(userId);
    return session?.flagged ?? false;
  }

  async flagUser(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      session.flagged = true;
    }
    await this.security.log({
      eventType: 'SUSPICIOUS_ACTIVITY',
      severity: 'WARN',
      userId,
      details: { reason: 'flagged_by_anti_cheat' },
    });
  }

  cleanup(userId: string): void {
    this.sessions.delete(userId);
  }

  reset(): void {
    this.sessions.clear();
  }
}