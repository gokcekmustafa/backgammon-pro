'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from './useWebSocket';

export interface TableParticipant {
  id: string;
  playerType: 'user' | 'guest';
  playerId: string;
  position: number;
}

export interface TableData {
  id: string;
  name: string | null;
  roomId: string;
  status: 'open' | 'occupied' | 'playing' | 'finished' | 'closed';
  isRanked: boolean;
  matchLength: number;
  createdAt: string;
  participantCount: number;
  participants: TableParticipant[];
}

interface TablesResponse {
  tables: TableData[];
}

function invalidateLobbyQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['tables'] });
  queryClient.invalidateQueries({ queryKey: ['rooms'] });
}

export function useTableUpdates(roomId: string | null) {
  const queryClient = useQueryClient();

  useWebSocket(roomId, {
    TABLE_UPDATE: () => {
      if (roomId) {
        queryClient.invalidateQueries({ queryKey: ['tables', roomId] });
      }
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useTables(roomId: string | null) {
  useTableUpdates(roomId);

  return useQuery({
    queryKey: ['tables', roomId],
    queryFn: () => api<TablesResponse>(`/api/rooms/${roomId}/tables`),
    enabled: !!roomId,
    refetchInterval: roomId ? 30000 : false,
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      roomId: string;
      name?: string;
      isRanked?: boolean;
      matchLength?: number;
    }) =>
      api('/api/tables', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateLobbyQueries(queryClient),
  });
}

export function useJoinTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tableId: string) =>
      api<{ table: TableData }>(`/api/tables/${tableId}/join`, { method: 'POST' }),
    onSuccess: () => invalidateLobbyQueries(queryClient),
  });
}

export function useLeaveTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tableId: string) => api(`/api/tables/${tableId}/leave`, { method: 'POST' }),
    onSuccess: () => invalidateLobbyQueries(queryClient),
  });
}

export function useCloseTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tableId: string) => api(`/api/tables/${tableId}/close`, { method: 'POST' }),
    onSuccess: () => invalidateLobbyQueries(queryClient),
  });
}
