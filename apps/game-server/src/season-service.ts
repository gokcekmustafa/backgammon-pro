import type { PrismaClient, SeasonStatus, BattlePassTrack } from '@backgammon/database';
import type { ConnectionManager } from './connection-manager';
import type { CacheService } from './cache-service';
import { createServerMessage } from './types';

export interface SeasonInfo {
  id: string;
  name: string;
  description: string | null;
  seasonNumber: number;
  status: SeasonStatus;
  startsAt: string;
  endsAt: string;
  battlePasses: BattlePassInfo[];
}

export interface BattlePassInfo {
  id: string;
  seasonId: string;
  track: BattlePassTrack;
  label: string;
  maxLevel: number;
  xpPerLevel: number;
  price: number | null;
}

export interface BattlePassLevelInfo {
  id: string;
  level: number;
  xpRequired: number;
  rewards: SeasonRewardInfo[];
}

export interface SeasonRewardInfo {
  id: string;
  seasonId: string;
  levelId: string;
  rewardType: string;
  rewardValue: string;
  claimed: boolean;
  claimedAt: string | null;
}

export interface UserSeasonInfo {
  id: string;
  xp: number;
  battlePasses: UserBattlePassInfo[];
}

export interface UserBattlePassInfo {
  id: string;
  battlePassId: string;
  track: BattlePassTrack;
  level: number;
  xp: number;
  hasPremium: boolean;
  maxLevel: number;
  xpPerLevel: number;
}

export class SeasonService {
  constructor(
    private prisma: PrismaClient,
    private connections: ConnectionManager,
    private cache: CacheService,
  ) {}

  async getActiveSeason(): Promise<SeasonInfo | null> {
    return this.cache.wrap('seasons:active', async () => {
      const season = await this.prisma.season.findFirst({
        where: { status: { in: ['ACTIVE', 'ENDING_SOON'] } },
        orderBy: { seasonNumber: 'desc' },
        include: { battlePasses: true },
      });
      if (!season) return null;
      return this.toSeasonInfo(season, season.battlePasses);
    }, { ttlMs: 30_000 });
  }

  async getCurrentSeason(): Promise<SeasonInfo | null> {
    return this.getActiveSeason();
  }

  async getSeasonById(seasonId: string): Promise<SeasonInfo | null> {
    return this.cache.wrap(`seasons:${seasonId}`, async () => {
      const season = await this.prisma.season.findUnique({
        where: { id: seasonId },
        include: { battlePasses: true },
      });
      if (!season) return null;
      return this.toSeasonInfo(season, season.battlePasses);
    }, { ttlMs: 30_000 });
  }

  async listSeasons(): Promise<SeasonInfo[]> {
    return this.cache.wrap('seasons:all', async () => {
      const seasons = await this.prisma.season.findMany({
        orderBy: { seasonNumber: 'desc' },
        include: { battlePasses: true },
      });
      return seasons.map((s) => this.toSeasonInfo(s, s.battlePasses));
    }, { ttlMs: 60_000 });
  }

  async getUserSeason(userId: string, seasonId: string): Promise<UserSeasonInfo | null> {
    const [userSeason, battlePasses] = await Promise.all([
      this.prisma.userSeason.findUnique({
        where: { userId_seasonId: { userId, seasonId } },
      }),
      this.prisma.battlePass.findMany({ where: { seasonId } }),
    ]);

    if (!userSeason) {
      const created = await this.prisma.userSeason.create({
        data: { userId, seasonId },
      });
      return { id: created.id, xp: 0, battlePasses: [] };
    }

    const userBps = await this.prisma.userBattlePass.findMany({
      where: { userId, battlePassId: { in: battlePasses.map((b) => b.id) } },
    });
    const bpMap = new Map(userBps.map((b) => [b.battlePassId, b]));

    const userBpInfos: UserBattlePassInfo[] = battlePasses.map((bp) => {
      const ubp = bpMap.get(bp.id);
      return {
        id: ubp?.id ?? '',
        battlePassId: bp.id,
        track: bp.track,
        level: ubp?.level ?? 1,
        xp: ubp?.xp ?? 0,
        hasPremium: ubp?.hasPremium ?? false,
        maxLevel: bp.maxLevel,
        xpPerLevel: bp.xpPerLevel,
      };
    });

    return { id: userSeason.id, xp: userSeason.xp, battlePasses: userBpInfos };
  }

  async addSeasonXp(userId: string, seasonId: string, amount: number): Promise<{ xp: number; bpLevelUps: { battlePassId: string; newLevel: number }[] }> {
    const [userSeason, battlePasses] = await Promise.all([
      this.prisma.userSeason.upsert({
        where: { userId_seasonId: { userId, seasonId } },
        create: { userId, seasonId, xp: amount },
        update: { xp: { increment: amount } },
      }),
      this.prisma.battlePass.findMany({ where: { seasonId } }),
    ]);

    const existingUbps = await this.prisma.userBattlePass.findMany({
      where: { userId, battlePassId: { in: battlePasses.map((b) => b.id) } },
    });
    const ubpMap = new Map(existingUbps.map((u) => [u.battlePassId, u]));

    const bpLevelUps: { battlePassId: string; newLevel: number }[] = [];

    const updates: { battlePassId: string; newLevel: number; track: BattlePassTrack }[] = [];

    for (const bp of battlePasses) {
      const existing = ubpMap.get(bp.id);
      const prevLevel = existing?.level ?? 1;
      const prevXp = existing?.xp ?? 0;
      const newXp = prevXp + amount;

      let newLevel = 1;
      let xpNeeded = bp.xpPerLevel;
      let remainingXp = newXp;
      while (remainingXp >= xpNeeded && newLevel < bp.maxLevel) {
        remainingXp -= xpNeeded;
        newLevel++;
        xpNeeded = bp.xpPerLevel;
      }

      if (existing) {
        await this.prisma.userBattlePass.update({
          where: { userId_battlePassId: { userId, battlePassId: bp.id } },
          data: { xp: newXp, level: newLevel },
        });
      } else {
        await this.prisma.userBattlePass.create({
          data: { userId, battlePassId: bp.id, xp: newXp, level: newLevel, hasPremium: false },
        });
      }

      if (newLevel > prevLevel) {
        bpLevelUps.push({ battlePassId: bp.id, newLevel });
        updates.push({ battlePassId: bp.id, newLevel, track: bp.track });
      }
    }

    for (const u of updates) {
      const connId = this.connections.getConnectionIdByUserId(userId);
      if (connId) {
        const conn = this.connections.get(connId);
        if (conn) {
          conn.send(createServerMessage('BATTLE_PASS_LEVEL_UP', {
            battlePassId: u.battlePassId,
            track: u.track,
            level: u.newLevel,
          }));
        }
      }
    }

    this.cache.del(`seasons:user:${userId}`);
    return { xp: userSeason.xp, bpLevelUps };
  }

  async getUserSeasons(userId: string): Promise<UserSeasonInfo[]> {
    const cacheKey = `seasons:user:${userId}`;
    const cached = await this.cache.get<UserSeasonInfo[]>(cacheKey);
    if (cached) return cached;

    const userSeasons = await this.prisma.userSeason.findMany({
      where: { userId },
      include: { season: { include: { battlePasses: true } } },
    });

    const allBpIds = userSeasons.flatMap((us) => us.season.battlePasses.map((b) => b.id));
    const userBps = allBpIds.length > 0
      ? await this.prisma.userBattlePass.findMany({
          where: { userId, battlePassId: { in: allBpIds } },
        })
      : [];
    const bpMap = new Map(userBps.map((b) => [b.battlePassId, b]));

    const results: UserSeasonInfo[] = userSeasons.map((us) => {
      const bps: UserBattlePassInfo[] = us.season.battlePasses.map((bp) => {
        const ubp = bpMap.get(bp.id);
        return {
          id: ubp?.id ?? '',
          battlePassId: bp.id,
          track: bp.track,
          level: ubp?.level ?? 1,
          xp: ubp?.xp ?? 0,
          hasPremium: ubp?.hasPremium ?? false,
          maxLevel: bp.maxLevel,
          xpPerLevel: bp.xpPerLevel,
        };
      });
      return { id: us.id, xp: us.xp, battlePasses: bps };
    });

    this.cache.set(cacheKey, results, { ttlMs: 30_000 });
    return results;
  }

  async claimReward(userId: string, rewardId: string): Promise<SeasonRewardInfo> {
    const reward = await this.prisma.seasonReward.findUnique({
      where: { id: rewardId },
      include: { level: { include: { battlePass: true } } },
    });
    if (!reward) throw new Error('Reward not found');
    if (reward.claimed) throw new Error('Reward already claimed');

    const bp = reward.level.battlePass;
    if (bp.track === 'PREMIUM') {
      const ubp = await this.prisma.userBattlePass.findUnique({
        where: { userId_battlePassId: { userId, battlePassId: bp.id } },
      });
      if (!ubp?.hasPremium) throw new Error('Premium subscription required for this reward');
    }

    const ubp = await this.prisma.userBattlePass.findUnique({
      where: { userId_battlePassId: { userId, battlePassId: bp.id } },
    });
    if (!ubp || ubp.level < reward.level.level) {
      throw new Error('Battle pass level not high enough');
    }

    const updated = await this.prisma.seasonReward.update({
      where: { id: rewardId },
      data: { claimed: true, claimedAt: new Date(), userId },
    });

    this.cache.del(`seasons:rewards:${reward.seasonId}`);

    const connId = this.connections.getConnectionIdByUserId(userId);
    if (connId) {
      const conn = this.connections.get(connId);
      if (conn) {
        conn.send(createServerMessage('REWARD_CLAIMED', {
          reward: this.toRewardInfo(updated),
        }));
      }
    }

    return this.toRewardInfo(updated);
  }

  async getLevels(battlePassId: string): Promise<BattlePassLevelInfo[]> {
    const levels = await this.prisma.battlePassLevel.findMany({
      where: { battlePassId },
      orderBy: { level: 'asc' },
      include: { rewards: true },
    });
    return levels.map((l) => ({
      id: l.id,
      level: l.level,
      xpRequired: l.xpRequired,
      rewards: l.rewards.map((r) => this.toRewardInfo(r)),
    }));
  }

  async getRewards(userId: string, seasonId: string): Promise<SeasonRewardInfo[]> {
    return this.cache.wrap(`seasons:rewards:${seasonId}:user:${userId}`, async () => {
      const rewards = await this.prisma.seasonReward.findMany({
        where: { seasonId },
        include: { level: { include: { battlePass: true } } },
        orderBy: { level: { level: 'asc' } },
      });

      const bpIds = [...new Set(rewards.map((r) => r.level.battlePassId))];
      const userBps = await this.prisma.userBattlePass.findMany({
        where: { userId, battlePassId: { in: bpIds } },
      });
      const userBpMap = new Map(userBps.map((b) => [b.battlePassId, b]));

      return rewards.map((r) => {
        const ubp = userBpMap.get(r.level.battlePassId);
        return {
          id: r.id,
          seasonId: r.seasonId,
          levelId: r.levelId,
          rewardType: r.rewardType,
          rewardValue: r.rewardValue,
          claimed: r.claimed && r.userId === userId,
          claimedAt: r.claimedAt?.toISOString() ?? null,
        };
      });
    }, { ttlMs: 30_000 });
  }

  async createSeason(data: {
    name: string;
    description?: string;
    seasonNumber: number;
    startsAt: string;
    endsAt: string;
    battlePasses: { track: BattlePassTrack; label: string; maxLevel: number; xpPerLevel: number; price?: number }[];
  }): Promise<SeasonInfo> {
    const season = await this.prisma.season.create({
      data: {
        name: data.name,
        description: data.description,
        seasonNumber: data.seasonNumber,
        status: 'UPCOMING',
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        battlePasses: {
          create: data.battlePasses.map((bp) => ({
            track: bp.track,
            label: bp.label,
            maxLevel: bp.maxLevel,
            xpPerLevel: bp.xpPerLevel,
            price: bp.price ?? 0,
          })),
        },
      },
      include: { battlePasses: true },
    });

    for (const bp of season.battlePasses) {
      const levelsData = [];
      for (let i = 1; i <= bp.maxLevel; i++) {
        levelsData.push({
          battlePassId: bp.id,
          level: i,
          xpRequired: bp.xpPerLevel,
        });
      }
      await this.prisma.battlePassLevel.createMany({ data: levelsData });
    }

    this.cache.delPattern('seasons:');
    return this.toSeasonInfo(season, season.battlePasses);
  }

  async updateSeason(id: string, data: Partial<{
    name: string;
    description: string;
    status: SeasonStatus;
    startsAt: string;
    endsAt: string;
  }>): Promise<SeasonInfo> {
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.startsAt) updateData.startsAt = new Date(data.startsAt);
    if (data.endsAt) updateData.endsAt = new Date(data.endsAt);

    if (data.status === 'ACTIVE') {
      await this.prisma.season.updateMany({
        where: { id: { not: id }, status: { in: ['ACTIVE', 'ENDING_SOON'] } },
        data: { status: 'COMPLETED' },
      });
    }

    const season = await this.prisma.season.update({
      where: { id },
      data: updateData as any,
      include: { battlePasses: true },
    });

    this.cache.delPattern('seasons:');
    return this.toSeasonInfo(season, season.battlePasses);
  }

  async closeSeason(id: string): Promise<SeasonInfo> {
    const season = await this.prisma.season.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: { battlePasses: true },
    });
    this.cache.delPattern('seasons:');
    return this.toSeasonInfo(season, season.battlePasses);
  }

  async archiveSeason(id: string): Promise<SeasonInfo> {
    const season = await this.prisma.season.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      include: { battlePasses: true },
    });
    this.cache.delPattern('seasons:');
    return this.toSeasonInfo(season, season.battlePasses);
  }

  async resetProgression(userId: string, seasonId: string): Promise<void> {
    const [bps] = await Promise.all([
      this.prisma.battlePass.findMany({ where: { seasonId } }),
      this.prisma.userSeason.deleteMany({ where: { userId, seasonId } }),
    ]);
    await Promise.all([
      this.prisma.userBattlePass.deleteMany({
        where: { userId, battlePassId: { in: bps.map((b) => b.id) } },
      }),
      this.prisma.seasonReward.deleteMany({ where: { userId, seasonId } }),
    ]);
    this.cache.del(`seasons:user:${userId}`);
  }

  async addRewardToLevel(levelId: string, rewardType: string, rewardValue: string): Promise<SeasonRewardInfo> {
    const level = await this.prisma.battlePassLevel.findUnique({
      where: { id: levelId },
      include: { battlePass: true },
    });
    if (!level) throw new Error('Level not found');
    const reward = await this.prisma.seasonReward.create({
      data: {
        seasonId: level.battlePass.seasonId,
        levelId,
        rewardType: rewardType as any,
        rewardValue,
      },
    });
    this.cache.delPattern('seasons:rewards:');
    return this.toRewardInfo(reward);
  }

  async removeReward(rewardId: string): Promise<void> {
    const reward = await this.prisma.seasonReward.findUnique({
      where: { id: rewardId },
      select: { seasonId: true },
    });
    await this.prisma.seasonReward.delete({ where: { id: rewardId } });
    if (reward) this.cache.delPattern(`seasons:rewards:${reward.seasonId}`);
  }

  async activateSeason(seasonId: string): Promise<void> {
    await this.prisma.season.updateMany({
      where: { status: { in: ['ACTIVE', 'ENDING_SOON'] } },
      data: { status: 'COMPLETED' },
    });
    await this.prisma.season.update({
      where: { id: seasonId },
      data: { status: 'ACTIVE' },
    });
    this.cache.delPattern('seasons:');
  }

  async markSeasonsEndingSoon(): Promise<void> {
    const threshold = new Date(Date.now() + 7 * 86400000);
    await this.prisma.season.updateMany({
      where: { status: 'ACTIVE', endsAt: { lte: threshold } },
      data: { status: 'ENDING_SOON' },
    });
    this.cache.delPattern('seasons:');
  }

  private toSeasonInfo(season: any, battlePasses: any[]): SeasonInfo {
    return {
      id: season.id,
      name: season.name,
      description: season.description,
      seasonNumber: season.seasonNumber,
      status: season.status as SeasonStatus,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt.toISOString(),
      battlePasses: battlePasses.map((bp) => ({
        id: bp.id,
        seasonId: bp.seasonId,
        track: bp.track as BattlePassTrack,
        label: bp.label,
        maxLevel: bp.maxLevel,
        xpPerLevel: bp.xpPerLevel,
        price: bp.price,
      })),
    };
  }

  private toRewardInfo(r: any): SeasonRewardInfo {
    return {
      id: r.id,
      seasonId: r.seasonId,
      levelId: r.levelId,
      rewardType: r.rewardType,
      rewardValue: r.rewardValue,
      claimed: r.claimed,
      claimedAt: r.claimedAt?.toISOString() ?? null,
    };
  }
}