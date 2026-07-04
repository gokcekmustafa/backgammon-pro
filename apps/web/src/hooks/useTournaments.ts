import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TournamentItem {
  id: string;
  name: string;
  description: string | null;
  type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN';
  status: 'DRAFT' | 'REGISTRATION' | 'READY' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  visibility: 'PUBLIC' | 'PRIVATE';
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
  bracket: BracketRound[];
  players: TournamentPlayerInfo[];
  prizes: TournamentPrizeInfo[];
}

export interface BracketRound {
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

interface ListTournamentsResponse {
  tournaments: TournamentItem[];
  total: number;
}

export function useTournaments(params: {
  offset?: number;
  limit?: number;
  status?: string;
  type?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.offset) searchParams.set('offset', String(params.offset));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.status) searchParams.set('status', params.status);
  if (params.type) searchParams.set('type', params.type);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['tournaments', params],
    queryFn: () => api<ListTournamentsResponse>(`/api/tournaments${qs ? `?${qs}` : ''}`),
  });
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: ['tournament', id],
    queryFn: () => api<TournamentDetail>(`/api/tournaments/${id}`),
    enabled: !!id,
  });
}

export function useTournamentStatus(id: string) {
  return useQuery({
    queryKey: ['tournament', id, 'status'],
    queryFn: () => api<{ registered: boolean }>(`/api/tournaments/${id}/status`),
    enabled: !!id,
  });
}

export function useRegisterTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/tournaments/${id}/register`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournaments'] });
      qc.invalidateQueries({ queryKey: ['tournament'] });
    },
  });
}

export function useUnregisterTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/tournaments/${id}/unregister`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournaments'] });
      qc.invalidateQueries({ queryKey: ['tournament'] });
    },
  });
}

// Admin hooks
export function useAdminTournaments() {
  return useQuery({
    queryKey: ['admin', 'tournaments'],
    queryFn: () => api<ListTournamentsResponse>('/api/tournaments'),
  });
}

export function useCreateTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/api/admin/tournaments', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tournaments'] });
      qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useAdminTournamentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api(`/api/admin/tournaments/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tournaments'] });
      qc.invalidateQueries({ queryKey: ['tournaments'] });
      qc.invalidateQueries({ queryKey: ['tournament'] });
    },
  });
}