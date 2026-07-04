import type { PrismaClient, AchievementCategory } from '@backgammon/database';
import type { ConnectionManager } from './connection-manager';
import type { XpService } from './xp-service';
import { createServerMessage } from './types';

export interface AchievementInfo {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: AchievementCategory;
  xpReward: number;
  badge: string | null;
  hidden: boolean;
  requirementType: string;
  requirementValue: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export class AchievementService {
  constructor(
    private prisma: PrismaClient,
    private connections: ConnectionManager,
    private xp: XpService,
  ) {}

  async list(userId: string): Promise<AchievementInfo[]> {
    const achievements = await this.prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
    });
    const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt]));

    return achievements.map((a) => ({
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      xpReward: a.xpReward,
      badge: a.badge,
      hidden: a.hidden,
      requirementType: a.requirementType,
      requirementValue: a.requirementValue,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id)?.toISOString() ?? null,
    }));
  }

  async checkAndUnlock(userId: string, requirementType: string, currentValue: number): Promise<{ unlocked: AchievementInfo[] }> {
    const candidates = await this.prisma.achievement.findMany({
      where: {
        isActive: true,
        requirementType,
        requirementValue: { lte: currentValue },
      },
    });

    const existing = await this.prisma.userAchievement.findMany({
      where: { userId, achievementId: { in: candidates.map((c) => c.id) } },
    });
    const existingIds = new Set(existing.map((ua) => ua.achievementId));

    const newlyUnlocked: AchievementInfo[] = [];
    for (const ach of candidates) {
      if (existingIds.has(ach.id)) continue;

      await this.prisma.userAchievement.create({
        data: { userId, achievementId: ach.id },
      });

      if (ach.xpReward > 0) {
        await this.xp.awardXp(userId, ach.xpReward, 'ACHIEVEMENT_UNLOCK', ach.id, { achievementKey: ach.key });
      }

      const info: AchievementInfo = {
        id: ach.id, key: ach.key, name: ach.name, description: ach.description,
        icon: ach.icon, category: ach.category, xpReward: ach.xpReward, badge: ach.badge,
        hidden: ach.hidden, requirementType: ach.requirementType, requirementValue: ach.requirementValue,
        unlocked: true, unlockedAt: new Date().toISOString(),
      };
      newlyUnlocked.push(info);

      const connId = this.connections.getConnectionIdByUserId(userId);
      if (connId) {
        const conn = this.connections.get(connId);
        if (conn) {
          conn.send(createServerMessage('ACHIEVEMENT_UNLOCKED', { achievement: info }));
        }
      }
    }

    return { unlocked: newlyUnlocked };
  }

  async getByCategory(userId: string): Promise<Record<string, AchievementInfo[]>> {
    const all = await this.list(userId);
    const grouped: Record<string, AchievementInfo[]> = {};
    for (const a of all) {
      const cat = a.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(a);
    }
    return grouped;
  }

  async getUnlockedCount(userId: string): Promise<number> {
    return this.prisma.userAchievement.count({ where: { userId } });
  }
}