import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocialService } from './social-service';
import type { ConnectionManager } from './connection-manager';

function mockPrisma() {
  return {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    friendRequest: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    friendship: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    blockedUser: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    invitation: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    profile: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((cb: any) => {
      if (Array.isArray(cb)) return Promise.all(cb.map((c: any) => c));
      return cb();
    }),
  } as any;
}

function mockConnections() {
  return {
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn(),
    getUserId: vi.fn(),
    getConnectionIdByUserId: vi.fn().mockReturnValue(null),
  } as unknown as ConnectionManager;
}

describe('SocialService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let connections: ReturnType<typeof mockConnections>;
  let svc: SocialService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = mockPrisma();
    connections = mockConnections();
    svc = new SocialService(prisma as any, connections);
  });

  describe('searchPlayers', () => {
    it('returns search results', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', displayName: 'Player One', username: 'player1', profile: null, ratings: [], deletedAt: null },
      ]);
      const result = await svc.searchPlayers('player', 'me');
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('Player One');
    });
  });

  describe('sendFriendRequest', () => {
    it('throws if sending to self', async () => {
      await expect(svc.sendFriendRequest('u1', 'u1')).rejects.toThrow('Cannot send friend request to yourself');
    });

    it('throws if receiver not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.sendFriendRequest('u1', 'u2')).rejects.toThrow('User not found');
    });

    it('throws if blocked', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', deletedAt: null });
      prisma.blockedUser.findFirst.mockResolvedValue({ id: 'b1' });
      await expect(svc.sendFriendRequest('u1', 'u2')).rejects.toThrow('Cannot send friend request');
    });

    it('creates a pending request', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', deletedAt: null });
      prisma.blockedUser.findFirst.mockResolvedValue(null);
      prisma.friendRequest.findUnique.mockResolvedValue(null);
      prisma.friendRequest.create.mockResolvedValue({ id: 'fr1' });

      const result = await svc.sendFriendRequest('u1', 'u2');
      expect(result).toBeDefined();
      expect(prisma.friendRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ senderId: 'u1', receiverId: 'u2', status: 'PENDING' }) }),
      );
    });
  });

  describe('acceptFriendRequest', () => {
    it('throws if no pending request', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue(null);
      await expect(svc.acceptFriendRequest('u1', 'u2')).rejects.toThrow('No pending request found');
    });

    it('creates friendships and accepts request', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({ id: 'fr1', status: 'PENDING' });
      await svc.acceptFriendRequest('u1', 'u2');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('rejectFriendRequest', () => {
    it('throws if no pending request', async () => {
      prisma.friendRequest.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.rejectFriendRequest('u1', 'u2')).rejects.toThrow('No pending request found');
    });
  });

  describe('removeFriend', () => {
    it('deletes friendships and requests', async () => {
      await svc.removeFriend('u1', 'u2');
      expect(prisma.friendship.deleteMany).toHaveBeenCalled();
      expect(prisma.friendRequest.deleteMany).toHaveBeenCalled();
    });
  });

  describe('getFriends', () => {
    it('returns friends with online status', async () => {
      prisma.friendship.findMany.mockResolvedValue([
        { id: 'fs1', friendId: 'u2', friend: { displayName: 'Friend', username: 'f1', profile: null, ratings: [{ rating: 1300 }] } },
      ]);
      const result = await svc.getFriends('u1');
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('Friend');
      expect(result[0].rating).toBe(1300);
    });
  });

  describe('blockUser', () => {
    it('throws if blocking self', async () => {
      await expect(svc.blockUser('u1', 'u1')).rejects.toThrow('Cannot block yourself');
    });

    it('blocks user and removes friendship', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', deletedAt: null });
      prisma.blockedUser.findUnique.mockResolvedValue(null);
      await svc.blockUser('u1', 'u2');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('unblockUser', () => {
    it('throws if not blocked', async () => {
      prisma.blockedUser.deleteMany.mockResolvedValue({ count: 0 });
      await expect(svc.unblockUser('u1', 'u2')).rejects.toThrow('User is not blocked');
    });
  });

  describe('getBlockedUsers', () => {
    it('returns blocked users', async () => {
      prisma.blockedUser.findMany.mockResolvedValue([
        { blocked: { id: 'u2', displayName: 'Blocked', username: 'b1' } },
      ]);
      const result = await svc.getBlockedUsers('u1');
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('Blocked');
    });
  });

  describe('sendInvitation', () => {
    it('throws if inviting self', async () => {
      await expect(svc.sendInvitation('u1', 'u1', 'MATCH')).rejects.toThrow('Cannot invite yourself');
    });

    it('creates invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ displayName: 'Sender' });
      await svc.sendInvitation('u1', 'u2', 'TABLE', 't1', 'Table 1');
      expect(prisma.invitation.create).toHaveBeenCalled();
    });
  });

  describe('respondToInvitation', () => {
    it('rejects if not found', async () => {
      prisma.invitation.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.respondToInvitation('i1', 'u2', true)).rejects.toThrow('Invitation not found');
    });
  });

  describe('getInvitations', () => {
    it('returns invitations list', async () => {
      prisma.invitation.findMany.mockResolvedValue([
        { id: 'i1', senderId: 'u1', sender: { displayName: 'Sender' }, type: 'MATCH', targetId: null, targetName: null, status: 'PENDING', createdAt: new Date() },
      ]);
      const result = await svc.getInvitations('u2');
      expect(result).toHaveLength(1);
    });
  });
});