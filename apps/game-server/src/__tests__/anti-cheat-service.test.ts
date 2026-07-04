import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AntiCheatService } from '../anti-cheat-service';
import type { PrismaClient } from '@backgammon/database';
import type { ConnectionManager } from '../connection-manager';
import type { SecurityService } from '../security-service';

function createService(minMoveTimeMs = 100): AntiCheatService {
  const prisma = {} as PrismaClient;
  const connections = {} as ConnectionManager;
  const security = {
    log: vi.fn().mockResolvedValue(undefined),
  } as unknown as SecurityService;
  return new AntiCheatService(prisma, connections, security, minMoveTimeMs);
}

describe('AntiCheatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateMove', () => {
    it('allows valid first move', async () => {
      const ac = createService();
      const result = await ac.validateMove('user1', 'conn1', 0, 1, 3);
      expect(result.valid).toBe(true);
    });

    it('rejects impossible timing', async () => {
      const ac = createService(1000);
      await ac.validateMove('user1', 'conn1', 0, 1, 3);
      const result = await ac.validateMove('user1', 'conn1', 1, 2, 3);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Action too fast');
    });

    it('detects duplicate moves', async () => {
      const ac = createService(0);
      await ac.validateDiceRoll('user1', 'conn1');
      await ac.validateMove('user1', 'conn1', 0, 1, 3);
      await new Promise((r) => setTimeout(r, 10));
      const result = await ac.validateMove('user1', 'conn1', 0, 1, 3);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Duplicate move detected');
    });
  });

  describe('validateDiceRoll', () => {
    it('allows valid dice roll request', async () => {
      const ac = createService();
      const result = await ac.validateDiceRoll('user1', 'conn1');
      expect(result.valid).toBe(true);
    });

    it('rejects if dice already rolled', async () => {
      const ac = createService();
      await ac.validateDiceRoll('user1', 'conn1');
      const result = await ac.validateDiceRoll('user1', 'conn1');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Dice already rolled this turn');
    });

    it('rejects client-sent dice values', async () => {
      const ac = createService();
      const result = await ac.validateDiceRoll('user1', 'conn1', { die1: 3, die2: 4 });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Dice are rolled server-side only');
    });
  });

  describe('onTurnAdvance', () => {
    it('resets dice rolled state', async () => {
      const ac = createService();
      await ac.validateDiceRoll('user1', 'conn1');
      await ac.onTurnAdvance('user1');
      const result = await ac.validateDiceRoll('user1', 'conn1');
      expect(result.valid).toBe(true);
    });
  });
});