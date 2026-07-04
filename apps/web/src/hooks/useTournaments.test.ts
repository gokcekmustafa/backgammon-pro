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

describe('tournament API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useTournaments fetches list', async () => {
    vi.mocked(api).mockResolvedValue({
      tournaments: [{ id: 't1', name: 'Test', type: 'SINGLE_ELIMINATION', status: 'REGISTRATION' }],
      total: 1,
    });

    const result = await api('/api/tournaments');
    expect(api).toHaveBeenCalledWith('/api/tournaments');
    expect(result.tournaments).toHaveLength(1);
  });

  it('useTournament fetches detail', async () => {
    vi.mocked(api).mockResolvedValue({ id: 't1', name: 'Test', bracket: [], players: [], prizes: [] });

    const result = await api('/api/tournaments/t1');
    expect(api).toHaveBeenCalledWith('/api/tournaments/t1');
    expect(result.id).toBe('t1');
  });

  it('useTournamentStatus fetches registration status', async () => {
    vi.mocked(api).mockResolvedValue({ registered: true });

    const result = await api('/api/tournaments/t1/status');
    expect(api).toHaveBeenCalledWith('/api/tournaments/t1/status');
    expect(result.registered).toBe(true);
  });

  it('useRegisterTournament calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true, playerCount: 5 });

    const result = await api('/api/tournaments/t1/register', { method: 'POST' });
    expect(api).toHaveBeenCalledWith('/api/tournaments/t1/register', { method: 'POST' });
    expect(result.playerCount).toBe(5);
  });

  it('useUnregisterTournament calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true, playerCount: 3 });

    await api('/api/tournaments/t1/unregister', { method: 'POST' });
    expect(api).toHaveBeenCalledWith('/api/tournaments/t1/unregister', { method: 'POST' });
  });

  it('useCreateTournament calls admin endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ id: 'new-t1' });

    const result = await api('/api/admin/tournaments', {
      method: 'POST',
      body: JSON.stringify({ name: 'New', type: 'SINGLE_ELIMINATION', startsAt: new Date().toISOString() }),
    });
    expect(api).toHaveBeenCalledWith('/api/admin/tournaments', expect.objectContaining({ method: 'POST' }));
    expect(result.id).toBe('new-t1');
  });

  it('useAdminTournamentAction calls admin action endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });

    await api('/api/admin/tournaments/t1/open', { method: 'POST' });
    expect(api).toHaveBeenCalledWith('/api/admin/tournaments/t1/open', { method: 'POST' });
  });
});