import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface BattlePassInfo {
  id: string;
  seasonId: string;
  track: 'FREE' | 'PREMIUM';
  label: string;
  maxLevel: number;
  xpPerLevel: number;
  price: number | null;
}

export interface SeasonInfo {
  id: string;
  name: string;
  description: string | null;
  seasonNumber: number;
  status: 'UPCOMING' | 'ACTIVE' | 'ENDING_SOON' | 'COMPLETED' | 'ARCHIVED';
  startsAt: string;
  endsAt: string;
  battlePasses: BattlePassInfo[];
}

export interface UserBattlePassInfo {
  id: string;
  battlePassId: string;
  track: 'FREE' | 'PREMIUM';
  level: number;
  xp: number;
  hasPremium: boolean;
  maxLevel: number;
  xpPerLevel: number;
}

export interface UserSeasonInfo {
  id: string;
  xp: number;
  battlePasses: UserBattlePassInfo[];
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

export interface BattlePassLevelInfo {
  id: string;
  level: number;
  xpRequired: number;
  rewards: SeasonRewardInfo[];
}

const STALE_TIMES = {
  active: 30_000,
  list: 120_000,
  detail: 60_000,
  user: 15_000,
  levels: 120_000,
  rewards: 15_000,
};

export function useActiveSeason() {
  return useQuery({
    queryKey: ['seasons', 'active'],
    queryFn: () => api<SeasonInfo>('/api/seasons/active'),
    staleTime: STALE_TIMES.active,
    retry: false,
    gcTime: 120_000,
  });
}

export function useSeasons() {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: () => api<{ seasons: SeasonInfo[] }>('/api/seasons'),
    staleTime: STALE_TIMES.list,
    gcTime: 300_000,
  });
}

export function useSeason(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['seasons', seasonId],
    queryFn: () => api<SeasonInfo>(`/api/seasons/${seasonId}`),
    enabled: !!seasonId,
    staleTime: STALE_TIMES.detail,
    gcTime: 120_000,
  });
}

export function useUserSeason(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['seasons', seasonId, 'user'],
    queryFn: () => api<UserSeasonInfo>(`/api/seasons/${seasonId}/user`),
    enabled: !!seasonId,
    staleTime: STALE_TIMES.user,
    gcTime: 60_000,
  });
}

export function useSeasonLevels(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['seasons', seasonId, 'levels'],
    queryFn: () => api<{ levels: Record<string, BattlePassLevelInfo[]> }>(`/api/seasons/${seasonId}/levels`),
    enabled: !!seasonId,
    staleTime: STALE_TIMES.levels,
    gcTime: 300_000,
  });
}

export function useSeasonRewards(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['seasons', seasonId, 'rewards'],
    queryFn: () => api<{ rewards: SeasonRewardInfo[] }>(`/api/seasons/${seasonId}/rewards`),
    enabled: !!seasonId,
    staleTime: STALE_TIMES.rewards,
    gcTime: 60_000,
  });
}

export function useClaimReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string) =>
      api<SeasonRewardInfo>(`/api/seasons/rewards/${rewardId}/claim`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });
}