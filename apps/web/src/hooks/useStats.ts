import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PlayerStatsResponse {
  id: string;
  username: string | null;
  displayName: string | null;
  type: 'user' | 'guest';
  rating: number | null;
  peakRating: number | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  lastGameAt: string | null;
  avatarUrl: string | null;
  country: string | null;
  currentStreak: number;
  bestStreak: number;
  leaderboardRank: number | null;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string;
  rating: number;
  peakRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  lastGameAt: string;
  rank: number;
}

export interface LeaderboardResponse {
  players: LeaderboardEntry[];
  total: number;
  offset: number;
  limit: number;
}

export function usePlayerStats(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-stats', playerId],
    queryFn: () => api<PlayerStatsResponse>(`/api/players/${playerId}/stats`),
    enabled: !!playerId,
    staleTime: 15000,
  });
}

export function useLeaderboard(offset = 0, limit = 100, search?: string) {
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
  return useQuery({
    queryKey: ['leaderboard', offset, limit, search],
    queryFn: () =>
      api<LeaderboardResponse>(`/api/leaderboard?offset=${offset}&limit=${limit}${searchParam}`),
    staleTime: 15000,
  });
}
