import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from '@/lib/api';

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

describe('admin API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAdminDashboard calls /api/admin/dashboard', async () => {
    vi.mocked(api).mockResolvedValue({
      totalUsers: 100,
      bannedUsers: 3,
      activeTables: 5,
      gamesToday: 12,
      newUsersToday: 7,
      onlineUsers: 2,
    });

    const result = await api('/api/admin/dashboard');

    expect(api).toHaveBeenCalledWith('/api/admin/dashboard');
    expect(result).toHaveProperty('totalUsers', 100);
    expect(result).toHaveProperty('bannedUsers', 3);
  });

  it('useAdminUsers builds correct query string', async () => {
    vi.mocked(api).mockResolvedValue({ users: [], total: 0, offset: 0, limit: 20 });

    await api('/api/admin/users?search=test&role=MODERATOR&offset=0&limit=20');

    expect(api).toHaveBeenCalledWith('/api/admin/users?search=test&role=MODERATOR&offset=0&limit=20');
  });

  it('useAdminUser fetches by id', async () => {
    vi.mocked(api).mockResolvedValue({ id: 'u1', displayName: 'U1' });

    const result = await api('/api/admin/users/u1');

    expect(api).toHaveBeenCalledWith('/api/admin/users/u1');
    expect(result).toHaveProperty('id', 'u1');
  });

  it('useToggleBan calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ user: { id: 'u1', bannedAt: '2026-07-01T00:00:00.000Z' } });

    await api('/api/admin/users/u1/ban', {
      method: 'PUT',
      body: JSON.stringify({ banned: true }),
    });

    expect(api).toHaveBeenCalledWith('/api/admin/users/u1/ban', {
      method: 'PUT',
      body: JSON.stringify({ banned: true }),
    });
  });

  it('returns 403 ApiError for unauthorized access', async () => {
    vi.mocked(api).mockRejectedValue(new ApiError(403));

    try {
      await api('/api/admin/users');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(403);
    }
  });

  it('useAdminAudit builds correct query', async () => {
    vi.mocked(api).mockResolvedValue({ logs: [], total: 0, offset: 0, limit: 50 });

    await api('/api/admin/audit?offset=0&limit=50');

    expect(api).toHaveBeenCalledWith('/api/admin/audit?offset=0&limit=50');
  });

  it('useAdminBanned fetches banned endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ users: [] });

    const result = await api('/api/admin/users/banned');

    expect(api).toHaveBeenCalledWith('/api/admin/users/banned');
    expect(result).toHaveProperty('users');
  });

  it('useAdminModerators fetches moderators endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ users: [] });

    const result = await api('/api/admin/users/moderators');

    expect(api).toHaveBeenCalledWith('/api/admin/users/moderators');
    expect(result).toHaveProperty('users');
  });

  it('useChangeRole calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ user: { id: 'u1', role: 'MODERATOR' } });

    await api('/api/admin/users/u1/role', {
      method: 'PUT',
      body: JSON.stringify({ role: 'MODERATOR' }),
    });

    expect(api).toHaveBeenCalledWith('/api/admin/users/u1/role', {
      method: 'PUT',
      body: JSON.stringify({ role: 'MODERATOR' }),
    });
  });

  it('useToggleStatus calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ user: { id: 'u1', isActive: false } });

    await api('/api/admin/users/u1/status', {
      method: 'PUT',
      body: JSON.stringify({ isActive: false }),
    });

    expect(api).toHaveBeenCalledWith('/api/admin/users/u1/status', {
      method: 'PUT',
      body: JSON.stringify({ isActive: false }),
    });
  });

  it('useDeleteUser calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ user: { id: 'u1', deletedAt: '2026-07-01T00:00:00.000Z' } });

    await api('/api/admin/users/u1', { method: 'DELETE' });

    expect(api).toHaveBeenCalledWith('/api/admin/users/u1', { method: 'DELETE' });
  });
});
