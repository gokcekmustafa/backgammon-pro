import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface LevelInfo {
  level: number;
  xp: number;
  totalXp: number;
  xpForNextLevel: number;
  progress: number;
}

export interface AchievementInfo {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  xpReward: number;
  badge: string | null;
  hidden: boolean;
  requirementType: string;
  requirementValue: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

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

export interface XpHistoryEntry {
  id: string;
  amount: number;
  reason: string;
  referenceId: string | null;
  createdAt: string;
}

export function useXp() {
  return useQuery({
    queryKey: ['progression', 'xp'],
    queryFn: () => api<LevelInfo>('/api/progression/xp'),
    staleTime: 10000,
  });
}

export function useXpHistory(limit = 20) {
  return useQuery({
    queryKey: ['progression', 'xp-history', limit],
    queryFn: () => api<{ history: XpHistoryEntry[] }>(`/api/progression/xp/history?limit=${limit}`),
    staleTime: 30000,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ['progression', 'achievements'],
    queryFn: () => api<{ groups: Record<string, AchievementInfo[]> }>('/api/progression/achievements'),
    staleTime: 15000,
  });
}

export function useUnlockedCount() {
  return useQuery({
    queryKey: ['progression', 'achievements', 'count'],
    queryFn: () => api<{ count: number }>('/api/progression/achievements/unlocked-count'),
    staleTime: 15000,
  });
}

export function useDailyMissions() {
  return useQuery({
    queryKey: ['progression', 'missions', 'daily'],
    queryFn: () => api<{ missions: MissionInfo[] }>('/api/progression/missions/daily'),
    staleTime: 10000,
  });
}

export function useWeeklyMissions() {
  return useQuery({
    queryKey: ['progression', 'missions', 'weekly'],
    queryFn: () => api<{ missions: MissionInfo[] }>('/api/progression/missions/weekly'),
    staleTime: 10000,
  });
}

export function useClaimMissionReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId: string) =>
      api<{ xpAwarded: number }>(`/api/progression/missions/${missionId}/claim`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progression'] });
    },
  });
}