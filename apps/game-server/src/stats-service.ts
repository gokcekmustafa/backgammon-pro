import { PrismaClient, PlayerType } from '@backgammon/database';
import { calculateElo } from '@backgammon/game-engine';

const RATING_TYPE = 'standard';
const DEFAULT_RATING = 1200;

interface PlayerInfo {
  playerId: string;
  type: PlayerType;
  currentRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  peakRating: number;
}

export class StatsService {
  constructor(private prisma: PrismaClient) {}

  async onGameComplete(p1UserId: string, p2UserId: string, winner: 1 | 2 | null): Promise<void> {
    const [p1, p2] = await Promise.all([
      this.resolvePlayer(p1UserId),
      this.resolvePlayer(p2UserId),
    ]);

    const p1Score = winner === null ? 0.5 : winner === 1 ? 1 : 0;
    const p2Score = winner === null ? 0.5 : winner === 2 ? 1 : 0;

    await this.prisma.$transaction([
      this.prisma.rating
        .upsert({
          where: {
            playerType_playerId_ratingType: {
              playerType: p1.type,
              playerId: p1.playerId,
              ratingType: RATING_TYPE,
            },
          },
          create: {
            playerType: p1.type,
            playerId: p1.playerId,
            ratingType: RATING_TYPE,
            ...this.computeRatingUpdate(p1, p1Score),
          },
          update: this.computeRatingUpdate(p1, p1Score),
        })
        .then(),
      this.prisma.rating
        .upsert({
          where: {
            playerType_playerId_ratingType: {
              playerType: p2.type,
              playerId: p2.playerId,
              ratingType: RATING_TYPE,
            },
          },
          create: {
            playerType: p2.type,
            playerId: p2.playerId,
            ratingType: RATING_TYPE,
            ...this.computeRatingUpdate(p2, p2Score),
          },
          update: this.computeRatingUpdate(p2, p2Score),
        })
        .then(),
    ]);
  }

  private computeRatingUpdate(player: PlayerInfo, score: number) {
    if (player.type === 'guest') {
      return {
        rating: player.currentRating,
        peakRating: player.peakRating,
        gamesPlayed: player.gamesPlayed,
        wins: player.wins,
        losses: player.losses,
        draws: player.draws,
      };
    }

    const { newRatingA } = calculateElo(player.currentRating, DEFAULT_RATING, score);
    const newPeak = Math.max(player.peakRating, newRatingA);

    return {
      rating: newRatingA,
      peakRating: newPeak,
      gamesPlayed: player.gamesPlayed + 1,
      wins: player.wins + (score === 1 ? 1 : 0),
      losses: player.losses + (score === 0 ? 1 : 0),
      draws: player.draws + (score === 0.5 ? 1 : 0),
    };
  }

  private async resolvePlayer(playerId: string): Promise<PlayerInfo> {
    const rating = await this.prisma.rating.findUnique({
      where: {
        playerType_playerId_ratingType: {
          playerType: 'user',
          playerId,
          ratingType: RATING_TYPE,
        },
      },
    });

    if (rating) {
      return {
        playerId,
        type: 'user' as PlayerType,
        currentRating: rating.rating,
        gamesPlayed: rating.gamesPlayed,
        wins: rating.wins,
        losses: rating.losses,
        draws: rating.draws,
        peakRating: rating.peakRating,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true },
    });
    if (user) {
      return {
        playerId,
        type: 'user' as PlayerType,
        currentRating: DEFAULT_RATING,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        peakRating: DEFAULT_RATING,
      };
    }

    const guest = await this.prisma.guestUser.findUnique({
      where: { id: playerId },
      select: { id: true },
    });
    if (guest) {
      return {
        playerId,
        type: 'guest' as PlayerType,
        currentRating: DEFAULT_RATING,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        peakRating: DEFAULT_RATING,
      };
    }

    return {
      playerId,
      type: 'guest' as PlayerType,
      currentRating: DEFAULT_RATING,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      peakRating: DEFAULT_RATING,
    };
  }
}
