import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number) {
      super(`API Error: ${status}`);
      this.status = status;
    }
  },
}));

describe('notification API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useNotifications fetches list', async () => {
    vi.mocked(api).mockResolvedValue({
      notifications: [{ id: 'n1', type: 'SYSTEM_ANNOUNCEMENT', title: 'Test', body: null, priority: 'MEDIUM', isRead: false, isArchived: false, expiresAt: null, createdAt: '2026-01-01T00:00:00.000Z' }],
      total: 1,
    });

    const result = await api('/api/notifications?offset=0&limit=20');

    expect(api).toHaveBeenCalledWith('/api/notifications?offset=0&limit=20');
    expect(result.notifications).toHaveLength(1);
  });

  it('useNotifications with filters builds correct query', async () => {
    vi.mocked(api).mockResolvedValue({ notifications: [], total: 0 });

    await api('/api/notifications?isRead=true&priority=HIGH');

    expect(api).toHaveBeenCalledWith('/api/notifications?isRead=true&priority=HIGH');
  });

  it('useUnreadCount fetches unread count', async () => {
    vi.mocked(api).mockResolvedValue({ count: 5 });

    const result = await api('/api/notifications/unread');

    expect(api).toHaveBeenCalledWith('/api/notifications/unread');
    expect(result.count).toBe(5);
  });

  it('useMarkRead calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });

    await api('/api/notifications/n1/read', { method: 'PATCH' });

    expect(api).toHaveBeenCalledWith('/api/notifications/n1/read', { method: 'PATCH' });
  });

  it('useMarkAllRead calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true, count: 3 });

    await api('/api/notifications/read-all', { method: 'PATCH' });

    expect(api).toHaveBeenCalledWith('/api/notifications/read-all', { method: 'PATCH' });
  });

  it('useArchiveNotification calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });

    const result = await api('/api/notifications/n1/archive', { method: 'PATCH' });

    expect(api).toHaveBeenCalledWith('/api/notifications/n1/archive', { method: 'PATCH' });
    expect(result.success).toBe(true);
  });

  it('useDeleteNotification calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });

    await api('/api/notifications/n1', { method: 'DELETE' });

    expect(api).toHaveBeenCalledWith('/api/notifications/n1', { method: 'DELETE' });
  });
});
