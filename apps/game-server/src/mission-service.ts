import type { PrismaClient, MissionPeriod } from '@backgammon/database';
import type { ConnectionManager } from './connection-manager';
import type { XpService } from './xp-service';
import { createServerMessage } from './types';

export interface MissionInfo {
  id: string;
  missionId: string;
  title: string;
  description: string | null;
  xpReward: number;
  requirementType: string;
  requirementValue: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  status: string;
  expiresAt: string | null;
}

export class MissionService {
  constructor(
    private prisma: PrismaClient,
    private connections: ConnectionManager,
    private xp: XpService,
  ) {}

  async getDailyMissions(userId: string): Promise<MissionInfo[]> {
    return this.getMissions(userId, 'DAILY');
  }

  async getWeeklyMissions(userId: string): Promise<MissionInfo[]> {
    return this.getMissions(userId, 'WEEKLY');
  }

  private async getMissions(userId: string, period: MissionPeriod): Promise<MissionInfo[]> {
    const missions = await this.prisma.dailyMission.findMany({
      where: { period, isActive: true },
    });

    const progress = await this.prisma.missionProgress.findMany({
      where: { userId, missionId: { in: missions.map((m) => m.id) } },
    });
    const progressMap = new Map(progress.map((p) => [p.missionId, p]));

    return missions.map((m) => {
      const p = progressMap.get(m.id);
      return {
        id: p?.id ?? '',
        missionId: m.id,
        title: m.title,
        description: m.description,
        xpReward: m.xpReward,
        requirementType: m.requirementType,
        requirementValue: m.requirementValue,
        progress: p?.progress ?? 0,
        completed: p?.completed ?? false,
        claimed: p?.claimed ?? false,
        status: p?.status ?? 'ACTIVE',
        expiresAt: p?.expiresAt?.toISOString() ?? null,
      };
    });
  }

  async updateProgress(userId: string, requirementType: string, increment = 1): Promise<{ completed: MissionInfo[] }> {
    const missions = await this.prisma.dailyMission.findMany({
      where: { isActive: true, requirementType },
    });

    const completed: MissionInfo[] = [];
    for (const mission of missions) {
      let progress = await this.prisma.missionProgress.findUnique({
        where: { userId_missionId: { userId, missionId: mission.id } },
      });

      if (progress && progress.completed) continue;

      if (progress) {
        progress = await this.prisma.missionProgress.update({
          where: { userId_missionId: { userId, missionId: mission.id } },
          data: { progress: progress.progress + increment },
        });
      } else {
        const now = new Date();
        const expiresAt = mission.period === 'DAILY'
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          : new Date(now.getTime() + 7 * 86400000);
        progress = await this.prisma.missionProgress.create({
          data: {
            userId, missionId: mission.id, progress: increment,
            expiresAt, status: 'ACTIVE',
          },
        });
      }

      if (progress.progress >= mission.requirementValue && !progress.completed) {
        progress = await this.prisma.missionProgress.update({
          where: { userId_missionId: { userId, missionId: mission.id } },
          data: { completed: true, status: 'COMPLETED' },
        });

        const info: MissionInfo = {
          id: progress.id, missionId: mission.id, title: mission.title,
          description: mission.description, xpReward: mission.xpReward,
          requirementType: mission.requirementType, requirementValue: mission.requirementValue,
          progress: progress.progress, completed: true, claimed: false,
          status: 'COMPLETED', expiresAt: progress.expiresAt?.toISOString() ?? null,
        };
        completed.push(info);

        const connId = this.connections.getConnectionIdByUserId(userId);
        if (connId) {
          const conn = this.connections.get(connId);
          if (conn) {
            conn.send(createServerMessage('MISSION_COMPLETED', { mission: info }));
          }
        }
      }
    }

    return { completed };
  }

  async claimReward(userId: string, missionId: string): Promise<{ xpAwarded: number }> {
    const progress = await this.prisma.missionProgress.findUnique({
      where: { userId_missionId: { userId, missionId } },
      include: { mission: true },
    });
    if (!progress || !progress.completed || progress.claimed) {
      throw new Error('Cannot claim this reward');
    }

    await this.prisma.missionProgress.update({
      where: { userId_missionId: { userId, missionId } },
      data: { claimed: true },
    });

    const reason = progress.mission.period === 'DAILY' ? 'DAILY_MISSION' : 'WEEKLY_MISSION';
    await this.xp.awardXp(userId, progress.mission.xpReward, reason, missionId, { missionKey: progress.mission.key });
    return { xpAwarded: progress.mission.xpReward };
  }
}