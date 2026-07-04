import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface NotificationItem {
  id: string;
  type: 'SYSTEM_ANNOUNCEMENT' | 'MAINTENANCE_NOTICE' | 'USER_WARNING' | 'MODERATOR_MESSAGE' | 'FRIEND_REQUEST' | 'TOURNAMENT_INVITATION' | 'MATCH_INVITATION' | 'ACHIEVEMENT_UNLOCKED';
  title: string;
  body: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isRead: boolean;
  isArchived: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface ListNotificationsResponse {
  notifications: NotificationItem[];
  total: number;
}

export function useNotifications(params: {
  offset?: number;
  limit?: number;
  isRead?: boolean;
  isArchived?: boolean;
  priority?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.offset) searchParams.set('offset', String(params.offset));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.isRead !== undefined) searchParams.set('isRead', String(params.isRead));
  if (params.isArchived !== undefined) searchParams.set('isArchived', String(params.isArchived));
  if (params.priority) searchParams.set('priority', params.priority);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => api<ListNotificationsResponse>(`/api/notifications${qs ? `?${qs}` : ''}`),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api<{ count: number }>('/api/notifications/unread'),
    refetchInterval: 30000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api('/api/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useArchiveNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/notifications/${id}/archive`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
