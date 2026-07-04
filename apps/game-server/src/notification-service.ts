import type { PrismaClient, NotificationType, NotificationPriority } from '@backgammon/database';
import type { ConnectionManager } from './connection-manager';
import { createServerMessage } from './types';
import type { ServerMessage } from './types';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  priority?: NotificationPriority;
  expiresAt?: Date;
  createdBy?: string;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  priority: NotificationPriority;
  isRead: boolean;
  isArchived: boolean;
  expiresAt: string | null;
  createdAt: string;
}

function toResponse(n: {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  priority: NotificationPriority;
  isRead: boolean;
  isArchived: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}): NotificationResponse {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    priority: n.priority,
    isRead: n.isRead,
    isArchived: n.isArchived,
    expiresAt: n.expiresAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

interface ScheduledNotification {
  timer: ReturnType<typeof setTimeout>;
  input: CreateNotificationInput & { userIds: string[] };
}

export class NotificationService {
  private scheduled = new Map<string, ScheduledNotification>();

  constructor(
    private prisma: PrismaClient,
    private connections: ConnectionManager,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        priority: input.priority ?? 'MEDIUM',
        expiresAt: input.expiresAt,
        createdBy: input.createdBy,
      },
    });
    this.sendRealTime(input.userId, notification);
    return toResponse(notification);
  }

  async createForMultiple(
    inputs: CreateNotificationInput[],
  ): Promise<NotificationResponse[]> {
    const now = new Date();
    const data = inputs.map((i) => ({
      userId: i.userId,
      type: i.type,
      title: i.title,
      body: i.body ?? null,
      priority: i.priority ?? 'MEDIUM' as NotificationPriority,
      expiresAt: i.expiresAt ?? null,
      createdBy: i.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    }));
    await this.prisma.notification.createMany({ data });
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId: { in: inputs.map((i) => i.userId) },
        createdAt: now,
      },
      orderBy: { createdAt: 'desc' },
    });
    for (const n of notifications) {
      this.sendRealTime(n.userId, n);
    }
    return notifications.map(toResponse);
  }

  async list(
    userId: string,
    params: {
      offset?: number;
      limit?: number;
      isRead?: boolean;
      isArchived?: boolean;
      priority?: NotificationPriority;
    },
  ): Promise<{ notifications: NotificationResponse[]; total: number }> {
    const offset = Math.max(0, params.offset ?? 0);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const where: Record<string, unknown> = { userId };
    if (params.isRead !== undefined) where.isRead = params.isRead;
    if (params.isArchived !== undefined) where.isArchived = params.isArchived;
    if (params.priority) where.priority = params.priority;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.notification.count({ where: where as any }),
    ]);

    return { notifications: notifications.map(toResponse), total };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false, isArchived: false },
    });
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return result.count > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }

  async archive(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isArchived: true },
    });
    return result.count > 0;
  }

  schedule(
    key: string,
    input: CreateNotificationInput & { userIds: string[] },
    delayMs: number,
  ): void {
    this.cancelSchedule(key);
    const timer = setTimeout(async () => {
      const inputs = input.userIds.map((uid) => ({
        userId: uid,
        type: input.type,
        title: input.title,
        body: input.body,
        priority: input.priority,
        expiresAt: input.expiresAt,
        createdBy: input.createdBy,
      }));
      await this.createForMultiple(inputs);
      this.scheduled.delete(key);
    }, delayMs);
    this.scheduled.set(key, { timer, input });
  }

  cancelSchedule(key: string): boolean {
    const existing = this.scheduled.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      this.scheduled.delete(key);
      return true;
    }
    return false;
  }

  private sendRealTime(userId: string, notification: {
    id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    priority: NotificationPriority;
    isRead: boolean;
    isArchived: boolean;
    expiresAt: Date | null;
    createdAt: Date;
  }): void {
    const connId = this.connections.getConnectionIdByUserId(userId);
    if (!connId) return;
    const conn = this.connections.get(connId);
    if (!conn) return;
    conn.send(createServerMessage('NOTIFICATION', {
      notification: {
        ...toResponse(notification),
      },
    }));
  }
}
