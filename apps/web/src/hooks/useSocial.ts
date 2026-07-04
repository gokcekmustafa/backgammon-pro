import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface FriendInfo {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  online: boolean;
  lastSeen: string | null;
  rating: number;
}

export interface FriendRequestInfo {
  id: string;
  senderId: string;
  senderDisplayName: string;
  senderUsername: string;
  status: string;
  createdAt: string;
}

export interface InvitationInfo {
  id: string;
  senderId: string;
  senderDisplayName: string;
  type: string;
  targetId: string | null;
  targetName: string | null;
  status: string;
  createdAt: string;
}

export interface PlayerSearchResult {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  rating: number;
  friendStatus: string;
}

// Search
export function usePlayerSearch(query: string) {
  return useQuery({
    queryKey: ['social', 'search', query],
    queryFn: () => api<{ results: PlayerSearchResult[] }>(`/api/social/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}

// Friends
export function useFriends() {
  return useQuery({
    queryKey: ['social', 'friends'],
    queryFn: () => api<{ friends: FriendInfo[] }>('/api/social/friends'),
  });
}

// Friend Requests
export function useFriendRequests() {
  return useQuery({
    queryKey: ['social', 'requests'],
    queryFn: () => api<{ requests: FriendRequestInfo[]; sent: FriendRequestInfo[] }>('/api/social/requests'),
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receiverId: string) =>
      api('/api/social/requests', { method: 'POST', body: JSON.stringify({ receiverId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useRespondToRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ senderId, accept }: { senderId: string; accept: boolean }) =>
      api('/api/social/requests/respond', { method: 'PUT', body: JSON.stringify({ senderId, accept }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api(`/api/social/requests/${userId}/cancel`, { method: 'PUT' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api(`/api/social/friends/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

// Blocks
export function useBlockedUsers() {
  return useQuery({
    queryKey: ['social', 'blocked'],
    queryFn: () => api<{ users: { id: string; displayName: string; username: string }[] }>('/api/social/blocked'),
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api('/api/social/block', { method: 'POST', body: JSON.stringify({ receiverId: userId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api('/api/social/unblock', { method: 'POST', body: JSON.stringify({ receiverId: userId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

// Invitations
export function useInvitations() {
  return useQuery({
    queryKey: ['social', 'invitations'],
    queryFn: () => api<{ invitations: InvitationInfo[] }>('/api/social/invitations'),
  });
}

export function useSendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { receiverId: string; type: string; targetId?: string; targetName?: string }) =>
      api('/api/social/invitations', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useRespondToInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invitationId, accept }: { invitationId: string; accept: boolean }) =>
      api(`/api/social/invitations/${invitationId}`, { method: 'PUT', body: JSON.stringify({ accept }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}