import type { PrismaClient, FriendRequestStatus, PrivacySetting } from '@backgammon/database';
import type { ConnectionManager } from './connection-manager';
import { createServerMessage } from './types';

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

export interface PlayerSearchResult {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  rating: number;
  friendStatus: 'none' | 'friends' | 'pending_sent' | 'pending_received' | 'blocked';
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

export class SocialService {
  constructor(
    private prisma: PrismaClient,
    private connections: ConnectionManager,
  ) {}

  async searchPlayers(query: string, _currentUserId: string): Promise<PlayerSearchResult[]> {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
      take: 20,
      include: {
        profile: { select: { avatarUrl: true } },
        ratings: { where: { ratingType: 'standard' }, select: { rating: true }, take: 1 },
      },
    });

    return users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.profile?.avatarUrl ?? null,
      rating: u.ratings[0]?.rating ?? 1200,
      friendStatus: 'none' as const,
    }));
  }

  async sendFriendRequest(senderId: string, receiverId: string): Promise<{ success: boolean }> {
    if (senderId === receiverId) throw new Error('Cannot send friend request to yourself');

    const receiver = await this.prisma.user.findUnique({ where: { id: receiverId }, select: { id: true, deletedAt: true } });
    if (!receiver || receiver.deletedAt) throw new Error('User not found');

    const blocked = await this.prisma.blockedUser.findFirst({
      where: { OR: [{ blockerId: senderId, blockedId: receiverId }, { blockerId: receiverId, blockedId: senderId }] },
    });
    if (blocked) throw new Error('Cannot send friend request');

    const existing = await this.prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId, receiverId } },
    });
    if (existing) throw new Error('Friend request already exists');

    const reverse = await this.prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: receiverId, receiverId: senderId } },
    });
    if (reverse?.status === 'PENDING') {
      await this.acceptFriendRequest(receiverId, senderId);
      return { id: reverse.id };
    }

    await this.prisma.friendRequest.create({
      data: { senderId, receiverId, status: 'PENDING' },
    });

    const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { displayName: true } });
    const connId = this.connections.getConnectionIdByUserId(receiverId);
    if (connId) {
      const conn = this.connections.get(connId);
      if (conn) {
        conn.send(createServerMessage('FRIEND_REQUEST', {
          senderId, senderDisplayName: sender?.displayName,
        }));
      }
    }

    return { id: '' };
  }

  async acceptFriendRequest(userId: string, senderId: string): Promise<void> {
    const request = await this.prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId, receiverId: userId } },
    });
    if (!request || request.status !== 'PENDING') throw new Error('No pending request found');

    await this.prisma.$transaction([
      this.prisma.friendRequest.update({
        where: { senderId_receiverId: { senderId, receiverId: userId } },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.friendship.create({ data: { userId, friendId: senderId } }),
      this.prisma.friendship.create({ data: { userId: senderId, friendId: userId } }),
    ]);

    const connId = this.connections.getConnectionIdByUserId(senderId);
    if (connId) {
      const conn = this.connections.get(connId);
      if (conn) conn.send(createServerMessage('FRIEND_REQUEST', { accepted: true }));
    }
  }

  async rejectFriendRequest(userId: string, senderId: string): Promise<void> {
    const result = await this.prisma.friendRequest.updateMany({
      where: { senderId, receiverId: userId, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });
    if (result.count === 0) throw new Error('No pending request found');
  }

  async cancelFriendRequest(senderId: string, receiverId: string): Promise<void> {
    const result = await this.prisma.friendRequest.updateMany({
      where: { senderId, receiverId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    if (result.count === 0) throw new Error('No pending request found');
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.friendship.deleteMany({
        where: { OR: [{ userId, friendId }, { userId: friendId, friendId: userId }] },
      }),
      this.prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: userId, receiverId: friendId, status: 'ACCEPTED' },
            { senderId: friendId, receiverId: userId, status: 'ACCEPTED' },
          ],
        },
      }),
    ]);
  }

  async getFriends(userId: string): Promise<FriendInfo[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      include: {
        friend: {
          include: {
            profile: { select: { avatarUrl: true } },
            ratings: { where: { ratingType: 'standard' }, take: 1, select: { rating: true } },
          },
        },
      },
    });

    return friendships.map((f) => ({
      id: f.id,
      userId: f.friendId,
      displayName: f.friend.displayName,
      username: f.friend.username,
      avatarUrl: f.friend.profile?.avatarUrl ?? null,
      online: !!this.connections.getConnectionIdByUserId(f.friendId),
      lastSeen: null,
      rating: f.friend.ratings[0]?.rating ?? 1200,
    }));
  }

  async getFriendRequests(userId: string): Promise<FriendRequestInfo[]> {
    const requests = await this.prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: { sender: { select: { displayName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      senderId: r.senderId,
      senderDisplayName: r.sender.displayName,
      senderUsername: r.sender.username,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getSentRequests(userId: string): Promise<FriendRequestInfo[]> {
    const requests = await this.prisma.friendRequest.findMany({
      where: { senderId: userId },
      include: { receiver: { select: { displayName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      senderId: r.receiverId,
      senderDisplayName: r.receiver.displayName,
      senderUsername: r.receiver.username,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) throw new Error('Cannot block yourself');
    const blocked = await this.prisma.user.findUnique({ where: { id: blockedId }, select: { id: true, deletedAt: true } });
    if (!blocked || blocked.deletedAt) throw new Error('User not found');

    const existing = await this.prisma.blockedUser.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existing) throw new Error('User already blocked');

    await this.prisma.$transaction([
      this.prisma.blockedUser.create({ data: { blockerId, blockedId } }),
      this.prisma.friendship.deleteMany({
        where: { OR: [{ userId: blockerId, friendId: blockedId }, { userId: blockedId, friendId: blockerId }] },
      }),
      this.prisma.friendRequest.deleteMany({
        where: { OR: [{ senderId: blockerId, receiverId: blockedId }, { senderId: blockedId, receiverId: blockerId }] },
      }),
    ]);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const result = await this.prisma.blockedUser.deleteMany({
      where: { blockerId, blockedId },
    });
    if (result.count === 0) throw new Error('User is not blocked');
  }

  async getBlockedUsers(userId: string): Promise<{ id: string; displayName: string; username: string }[]> {
    const blocks = await this.prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, displayName: true, username: true } } },
    });
    return blocks.map((b) => ({ id: b.blocked.id, displayName: b.blocked.displayName, username: b.blocked.username }));
  }

  async sendInvitation(
    senderId: string, receiverId: string, type: 'MATCH' | 'TABLE' | 'TOURNAMENT',
    targetId?: string, targetName?: string,
  ): Promise<void> {
    if (senderId === receiverId) throw new Error('Cannot invite yourself');

    const existing = await this.prisma.invitation.findUnique({
      where: { senderId_receiverId_type_targetId: { senderId, receiverId, type, targetId: targetId ?? '' } },
    });
    if (existing && existing.status === 'PENDING') throw new Error('Invitation already sent');

    await this.prisma.invitation.create({
      data: { senderId, receiverId, type, targetId: targetId ?? null, targetName, status: 'PENDING' },
    });

    const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { displayName: true } });
    const connId = this.connections.getConnectionIdByUserId(receiverId);
    if (connId) {
      const conn = this.connections.get(connId);
      if (conn) {
        conn.send(createServerMessage('INVITATION_RECEIVED', {
          senderId, senderDisplayName: sender?.displayName, type, targetId, targetName,
        }));
      }
    }
  }

  async respondToInvitation(invitationId: string, userId: string, accept: boolean): Promise<void> {
    if (accept) {
      const result = await this.prisma.invitation.updateMany({
        where: { id: invitationId, receiverId: userId, status: 'PENDING' },
        data: { status: 'ACCEPTED' },
      });
      if (result.count === 0) throw new Error('Invitation not found');

      const inv = await this.prisma.invitation.findUnique({
        where: { id: invitationId },
        select: { senderId: true },
      });
      if (inv) {
        const connId = this.connections.getConnectionIdByUserId(inv.senderId);
        if (connId) {
          const conn = this.connections.get(connId);
          if (conn) conn.send(createServerMessage('INVITATION_ACCEPTED', { invitationId }));
        }
      }
    } else {
      const result = await this.prisma.invitation.updateMany({
        where: { id: invitationId, receiverId: userId, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
      if (result.count === 0) throw new Error('Invitation not found');

      const inv = await this.prisma.invitation.findUnique({
        where: { id: invitationId },
        select: { senderId: true },
      });
      if (inv) {
        const connId = this.connections.getConnectionIdByUserId(inv.senderId);
        if (connId) {
          const conn = this.connections.get(connId);
          if (conn) conn.send(createServerMessage('INVITATION_REJECTED', { invitationId }));
        }
      }
    }
  }

  async getInvitations(userId: string): Promise<InvitationInfo[]> {
    const invitations = await this.prisma.invitation.findMany({
      where: { receiverId: userId },
      include: { sender: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return invitations.map((i) => ({
      id: i.id,
      senderId: i.senderId,
      senderDisplayName: i.sender.displayName,
      type: i.type,
      targetId: i.targetId,
      targetName: i.targetName,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    }));
  }

  // Realtime online/offline
  broadcastFriendStatus(userId: string, online: boolean): void {
    this.prisma.friendship.findMany({
      where: { friendId: userId },
      select: { userId: true },
    }).then((friendships) => {
      for (const f of friendships) {
        const connId = this.connections.getConnectionIdByUserId(f.userId);
        if (connId) {
          const conn = this.connections.get(connId);
          if (conn) {
            conn.send(createServerMessage(online ? 'FRIEND_ONLINE' : 'FRIEND_OFFLINE', { userId }));
          }
        }
      }
    }).catch(() => {});
  }

  // Privacy check
  async checkPrivacy(targetUserId: string, currentUserId: string): Promise<boolean> {
    if (targetUserId === currentUserId) return true;

    const profile = await this.prisma.profile.findUnique({
      where: { userId: targetUserId },
      select: { friendsView: true },
    });

    const setting = (profile?.friendsView as PrivacySetting) ?? 'EVERYONE';

    if (setting === 'EVERYONE') return true;
    if (setting === 'NOBODY') return false;

    const friendship = await this.prisma.friendship.findFirst({
      where: { OR: [{ userId: currentUserId, friendId: targetUserId }, { userId: targetUserId, friendId: currentUserId }] },
    });
    return !!friendship;
  }
}