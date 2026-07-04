import type { PrismaClient, TournamentType, TournamentStatus, SubscriptionPlanType } from '@backgammon/database';
import type { ConnectionManager } from './connection-manager';
import { createServerMessage } from './types';
import { generateSingleElimination, generateRoundRobin } from './bracket-engine';

export interface TournamentItem {
  id: string;
  name: string;
  description: string | null;
  type: TournamentType;
  status: TournamentStatus;
  visibility: string;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  minPlayers: number;
  startsAt: string;
  registrationEndsAt: string | null;
  playerCount: number;
  createdBy: { id: string; displayName: string } | null;
  createdAt: string;
}

export interface TournamentDetail extends TournamentItem {
  bracket: BracketRoundInfo[];
  players: TournamentPlayerInfo[];
  prizes: TournamentPrizeInfo[];
}

export interface BracketRoundInfo {
  round: number;
  matches: BracketMatchInfo[];
}

export interface BracketMatchInfo {
  id: string;
  round: number;
  matchIndex: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  status: string;
  player1Score: number;
  player2Score: number;
  startedAt: string | null;
  completedAt: string | null;
  player1Name?: string;
  player2Name?: string;
}

export interface TournamentPlayerInfo {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  status: string;
  seed: number;
  registeredAt: string;
}

export interface TournamentPrizeInfo {
  id: string;
  position: number;
  label: string | null;
  amount: number;
  percentage: number | null;
}

export class TournamentService {
  constructor(
    private prisma: PrismaClient,
    private connections: ConnectionManager,
  ) {}

  async listTournaments(params: {
    offset?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<{ tournaments: TournamentItem[]; total: number }> {
    const offset = Math.max(0, params.offset ?? 0);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;

    const [tournaments, total] = await Promise.all([
      this.prisma.tournament.findMany({
        where: where as any,
        orderBy: { startsAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          _count: { select: { players: true } },
          createdBy: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.tournament.count({ where: where as any }),
    ]);

    return {
      tournaments: tournaments.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type,
        status: t.status,
        visibility: t.visibility,
        entryFee: Number(t.entryFee),
        prizePool: Number(t.prizePool),
        maxPlayers: t.maxPlayers,
        minPlayers: t.minPlayers,
        startsAt: t.startsAt.toISOString(),
        registrationEndsAt: t.registrationEndsAt?.toISOString() ?? null,
        playerCount: t._count.players,
        createdBy: t.createdBy ? { id: t.createdBy.id, displayName: t.createdBy.displayName } : null,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
    };
  }

  async getTournament(id: string): Promise<TournamentDetail | null> {
    const t = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: { select: { players: true } },
        createdBy: { select: { id: true, displayName: true } },
        players: {
          include: { user: { select: { id: true, username: true, displayName: true } } },
          orderBy: { seed: 'asc' },
        },
        matches: { orderBy: [{ round: 'asc' }, { matchIndex: 'asc' }] },
        prizes: { orderBy: { position: 'asc' } },
      },
    });

    if (!t) return null;

    const userMap = new Map<string, { username: string; displayName: string }>();
    for (const p of t.players) {
      userMap.set(p.userId, { username: p.user.username, displayName: p.user.displayName });
    }

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.type,
      status: t.status,
      visibility: t.visibility,
      entryFee: Number(t.entryFee),
      prizePool: Number(t.prizePool),
      maxPlayers: t.maxPlayers,
      minPlayers: t.minPlayers,
      startsAt: t.startsAt.toISOString(),
      registrationEndsAt: t.registrationEndsAt?.toISOString() ?? null,
      playerCount: t._count.players,
      createdBy: t.createdBy ? { id: t.createdBy.id, displayName: t.createdBy.displayName } : null,
      createdAt: t.createdAt.toISOString(),
      bracket: t.matches.reduce<BracketRoundInfo[]>((acc, m) => {
        let round = acc.find((r) => r.round === m.round);
        if (!round) {
          round = { round: m.round, matches: [] };
          acc.push(round);
        }
        round.matches.push({
          id: m.id,
          round: m.round,
          matchIndex: m.matchIndex,
          player1Id: m.player1Id,
          player2Id: m.player2Id,
          winnerId: m.winnerId,
          status: m.status,
          player1Score: m.player1Score,
          player2Score: m.player2Score,
          startedAt: m.startedAt?.toISOString() ?? null,
          completedAt: m.completedAt?.toISOString() ?? null,
          player1Name: m.player1Id ? userMap.get(m.player1Id)?.displayName : undefined,
          player2Name: m.player2Id ? userMap.get(m.player2Id)?.displayName : undefined,
        });
        return acc;
      }, []),
      players: t.players.map((p) => ({
        id: p.id,
        userId: p.userId,
        username: p.user.username,
        displayName: p.user.displayName,
        status: p.status,
        seed: p.seed,
        registeredAt: p.registeredAt.toISOString(),
      })),
      prizes: t.prizes.map((p) => ({
        id: p.id,
        position: p.position,
        label: p.label,
        amount: Number(p.amount),
        percentage: p.percentage ? Number(p.percentage) : null,
      })),
    };
  }

  async register(tournamentId: string, userId: string): Promise<{ success: boolean; playerCount: number }> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { players: true } } },
    });

    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'REGISTRATION') throw new Error('Registration is not open');
    if (tournament._count.players >= tournament.maxPlayers) throw new Error('Tournament is full');

    const existing = await this.prisma.tournamentPlayer.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) throw new Error('Already registered');

    if (Number(tournament.entryFee) > 0) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: { select: { planType: true } } },
      });
      const planType = subscription?.plan.planType ?? 'FREE';
      if (planType === 'FREE') throw new Error('Premium subscription required for paid tournaments');
    }

    const playerCount = await this.prisma.tournamentPlayer.count({
      where: { tournamentId },
    });

    await this.prisma.tournamentPlayer.create({
      data: {
        tournamentId,
        userId,
        status: 'REGISTERED',
        seed: playerCount + 1,
      },
    });

    const newCount = playerCount + 1;
    this.sendRealTimeRegistration(tournamentId, userId, newCount);

    return { success: true, playerCount: newCount };
  }

  async unregister(tournamentId: string, userId: string): Promise<{ success: boolean; playerCount: number }> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) throw new Error('Tournament not found');
    if (!['DRAFT', 'REGISTRATION'].includes(tournament.status)) throw new Error('Cannot unregister at this stage');

    const result = await this.prisma.tournamentPlayer.deleteMany({
      where: { tournamentId, userId },
    });
    if (result.count === 0) throw new Error('Not registered');

    const playerCount = await this.prisma.tournamentPlayer.count({
      where: { tournamentId },
    });

    this.sendRealTimeRegistration(tournamentId, userId, playerCount);
    return { success: true, playerCount };
  }

  async getPlayerStatus(tournamentId: string, userId: string): Promise<{ registered: boolean }> {
    const existing = await this.prisma.tournamentPlayer.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    return { registered: !!existing };
  }

  // ── Internal helpers ────────────────────────────────────────────────

  async generateBracket(tournamentId: string): Promise<void> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { players: { where: { status: 'REGISTERED' }, orderBy: { seed: 'asc' } } },
    });

    if (!tournament) throw new Error('Tournament not found');

    const playerIds = tournament.players.map((p) => p.userId);

    let rounds;
    if (tournament.type === 'SINGLE_ELIMINATION') {
      rounds = generateSingleElimination(playerIds);
    } else if (tournament.type === 'ROUND_ROBIN') {
      rounds = generateRoundRobin(playerIds);
    } else {
      throw new Error(`Bracket generation not supported for type: ${tournament.type}`);
    }

    const matchData: {
      tournamentId: string;
      round: number;
      matchIndex: number;
      player1Id: string | null;
      player2Id: string | null;
    }[] = [];

    for (const round of rounds) {
      for (const match of round.matches) {
        matchData.push({
          tournamentId,
          round: match.round,
          matchIndex: match.matchIndex,
          player1Id: match.player1Id,
          player2Id: match.player2Id,
        });
      }
    }

    await this.prisma.tournamentMatch.createMany({ data: matchData });
  }

  private sendRealTimeRegistration(tournamentId: string, _userId: string, playerCount: number): void {
    const message = createServerMessage('TOURNAMENT_REGISTRATION_UPDATE', { tournamentId, playerCount });
    this.broadcastToTournament(tournamentId, message);
  }

  private broadcastToTournament(tournamentId: string, message: ReturnType<typeof createServerMessage>): void {
    const allConnections = this.connections.getAll();
    for (const conn of allConnections) {
      const userId = this.connections.getUserId(conn.id);
      if (userId) {
        this.prisma.tournamentPlayer.findUnique({
          where: { tournamentId_userId: { tournamentId, userId } },
        }).then((player) => {
          if (player) {
            conn.send(message);
          }
        }).catch(() => {});
      }
    }
  }
}