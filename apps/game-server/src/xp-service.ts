import type { PrismaClient, XpReason } from '@backgammon/database';
import type { ConnectionManager } from './connection-manager';
import { createServerMessage } from './types';

const XP_PER_LEVEL = 1000;

export interface LevelInfo {
  level: number;
  xp: number;
  totalXp: number;
  xpForNextLevel: number;
  progress: number;
}

export interface XpGainResult {
  amount: number;
  reason: XpReason;
  newTotal: number;
  leveledUp: boolean;
  newLevel: number;
}

export function xpForLevel(level: number): number {
  return XP_PER_LEVEL * level;
}

export function calculateLevel(totalXp: number): number {
  let remaining = totalXp;
  let level = 1;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return level;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  let remaining = totalXp;
  let level = 1;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  const xpForNext = xpForLevel(level);
  return {
    level,
    xp: remaining,
    totalXp,
    xpForNextLevel: xpForNext,
    progress: xpForNext > 0 ? remaining / xpForNext : 0,
  };
}

export class XpService {
  constructor(
    private prisma: PrismaClient,
    private connections: ConnectionManager,
  ) {}

  async awardXp(userId: string, amount: number, reason: XpReason, referenceId?: string, metadata?: Record<string, unknown>): Promise<XpGainResult> {
    let progress = await this.prisma.userProgress.findUnique({ where: { userId } });
    if (!progress) {
      progress = await this.prisma.userProgress.create({
        data: { userId, level: 1, xp: 0, totalXp: 0 },
      });
    }

    const oldLevel = progress.level;
    const newTotalXp = progress.totalXp + amount;
    const newLevel = calculateLevel(newTotalXp);

    await this.prisma.experienceHistory.create({
      data: {
        userId, amount, reason,
        referenceId: referenceId ?? null,
        metadata: (metadata ?? null) as any,
      },
    });

    await this.prisma.userProgress.update({
      where: { userId },
      data: {
        totalXp: newTotalXp,
        level: newLevel,
        xp: getLevelInfo(newTotalXp).xp,
      },
    });

    const leveledUp = newLevel > oldLevel;

    const connId = this.connections.getConnectionIdByUserId(userId);
    if (connId) {
      const conn = this.connections.get(connId);
      if (conn) {
        conn.send(createServerMessage('XP_GAINED', { amount, reason, newTotal: newTotalXp, level: newLevel }));
        if (leveledUp) {
          conn.send(createServerMessage('LEVEL_UP', { level: newLevel }));
        }
      }
    }

    return { amount, reason, newTotal: newTotalXp, leveledUp, newLevel };
  }

  async getProgress(userId: string): Promise<LevelInfo> {
    let progress = await this.prisma.userProgress.findUnique({ where: { userId } });
    if (!progress) {
      progress = await this.prisma.userProgress.create({
        data: { userId, level: 1, xp: 0, totalXp: 0 },
      });
    }
    return getLevelInfo(progress.totalXp);
  }

  async getXpHistory(userId: string, limit = 20): Promise<{ id: string; amount: number; reason: string; referenceId: string | null; createdAt: string }[]> {
    const entries = await this.prisma.experienceHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return entries.map((e) => ({
      id: e.id, amount: e.amount, reason: e.reason, referenceId: e.referenceId, createdAt: e.createdAt.toISOString(),
    }));
  }
}