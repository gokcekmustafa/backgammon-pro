import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  isActive: boolean;
  bannedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUser {
  updatedAt: string;
  emailVerifiedAt: string | null;
  profile: {
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
  } | null;
  _count: {
    convertedGuests: number;
  };
}

interface ListUsersResponse {
  users: AdminUser[];
  total: number;
  offset: number;
  limit: number;
}

interface AuditLogEntry {
  id: string;
  actor: { id: string; username: string; displayName: string } | null;
  target: { id: string; username: string; displayName: string } | null;
  action: string;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  offset: number;
  limit: number;
}

interface DashboardStats {
  totalUsers: number;
  bannedUsers: number;
  activeTables: number;
  gamesToday: number;
  newUsersToday: number;
  onlineUsers: number;
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api<DashboardStats>('/api/admin/dashboard'),
    staleTime: 30_000,
    gcTime: 120_000,
  });
}

export function useAdminUsers(params: {
  offset?: number;
  limit?: number;
  search?: string;
  role?: string;
  banned?: string;
  deleted?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.offset) searchParams.set('offset', String(params.offset));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.role) searchParams.set('role', params.role);
  if (params.banned) searchParams.set('banned', params.banned);
  if (params.deleted) searchParams.set('deleted', params.deleted);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => api<ListUsersResponse>(`/api/admin/users${qs ? `?${qs}` : ''}`),
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => api<AdminUserDetail>(`/api/admin/users/${id}`),
    enabled: !!id,
  });
}

export function useChangeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api(`/api/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user'] });
    },
  });
}

export function useToggleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/api/admin/users/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user'] });
    },
  });
}

export function useToggleBan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) =>
      api(`/api/admin/users/${id}/ban`, {
        method: 'PUT',
        body: JSON.stringify({ banned }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user'] });
      qc.invalidateQueries({ queryKey: ['admin', 'banned'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user'] });
    },
  });
}

export function useAdminBanned() {
  return useQuery({
    queryKey: ['admin', 'banned'],
    queryFn: () =>
      api<{ users: AdminUser[] }>('/api/admin/users/banned'),
  });
}

export function useAdminModerators() {
  return useQuery({
    queryKey: ['admin', 'moderators'],
    queryFn: () =>
      api<{ users: AdminUser[] }>('/api/admin/users/moderators'),
  });
}

export function useToggleModerator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, promote }: { id: string; promote: boolean }) =>
      api(`/api/admin/users/${id}/moderator`, {
        method: 'PUT',
        body: JSON.stringify({ promote }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'moderators'] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user'] });
    },
  });
}

export function useAdminAudit(params: { offset?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params.offset) searchParams.set('offset', String(params.offset));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => api<AuditLogResponse>(`/api/admin/audit${qs ? `?${qs}` : ''}`),
  });
}

export interface AdminTableInfo {
  id: string;
  roomId: string;
  name: string;
  status: string;
  locked: boolean;
  playerCount: number;
  spectatorCount: number;
  createdAt: string;
  duration: number;
}

export interface AdminGameInfo {
  tableId: string;
  p1UserId: string;
  p2UserId: string;
  status: string;
  currentPlayer: string | null;
  matchScore: { p1: number; p2: number };
  disconnectedUserId: string | null;
  createdAt: number;
}

export function useAdminTables() {
  return useQuery({
    queryKey: ['admin', 'tables'],
    queryFn: () => api<{ tables: AdminTableInfo[] }>('/api/admin/tables'),
  });
}

export function useAdminGames() {
  return useQuery({
    queryKey: ['admin', 'games'],
    queryFn: () => api<{ games: AdminGameInfo[] }>('/api/admin/games'),
  });
}

export function useAdminTableAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, action, body }: { tableId: string; action: string; body?: Record<string, unknown> }) =>
      api(`/api/admin/tables/${tableId}/${action}`, {
        method: action === 'remove-player' ? 'POST' : 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tables'] });
    },
  });
}

export function useAdminGameAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, action, body }: { gameId: string; action: string; body?: Record<string, unknown> }) =>
      api(`/api/admin/games/${gameId}/${action}`, {
        method: action === 'force-resign' || action === 'force-draw' || action === 'kick' ? 'POST' : 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'games'] });
      qc.invalidateQueries({ queryKey: ['admin', 'tables'] });
    },
  });
}
