import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MatchEntry {
  id: string;
  result: 'win' | 'loss' | 'draw';
  score: string;
  duration: number | null;
  completedAt: string;
  opponent: {
    id: string;
    playerType: 'user' | 'guest';
  } | null;
}

export function useMatchHistory(playerId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['match-history', playerId, limit],
    queryFn: () => api<MatchEntry[]>(`/api/players/${playerId}/matches?limit=${limit}`),
    enabled: !!playerId,
    staleTime: 15000,
  });
}
