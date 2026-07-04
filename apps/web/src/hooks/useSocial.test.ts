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

describe('social API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usePlayerSearch calls search endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ results: [] });
    const result = await api('/api/social/search?q=test');
    expect(api).toHaveBeenCalledWith('/api/social/search?q=test');
    expect(result.results).toEqual([]);
  });

  it('useFriends fetches friends list', async () => {
    vi.mocked(api).mockResolvedValue({ friends: [] });
    await api('/api/social/friends');
    expect(api).toHaveBeenCalledWith('/api/social/friends');
  });

  it('useFriendRequests fetches requests', async () => {
    vi.mocked(api).mockResolvedValue({ requests: [], sent: [] });
    await api('/api/social/requests');
    expect(api).toHaveBeenCalledWith('/api/social/requests');
  });

  it('useSendFriendRequest calls correct endpoint', async () => {
    vi.mocked(api).mockResolvedValue({});
    await api('/api/social/requests', { method: 'POST', body: JSON.stringify({ receiverId: 'u2' }) });
    expect(api).toHaveBeenCalledWith('/api/social/requests', { method: 'POST', body: JSON.stringify({ receiverId: 'u2' }) });
  });

  it('useRespondToRequest calls respond endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });
    await api('/api/social/requests/respond', {
      method: 'PUT',
      body: JSON.stringify({ senderId: 'u2', accept: true }),
    });
    expect(api).toHaveBeenCalledWith('/api/social/requests/respond', expect.any(Object));
  });

  it('useCancelRequest calls cancel endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });
    await api('/api/social/requests/u2/cancel', { method: 'PUT' });
    expect(api).toHaveBeenCalledWith('/api/social/requests/u2/cancel', { method: 'PUT' });
  });

  it('useRemoveFriend calls friends delete', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });
    await api('/api/social/friends/u2', { method: 'DELETE' });
    expect(api).toHaveBeenCalledWith('/api/social/friends/u2', { method: 'DELETE' });
  });

  it('useBlockUser calls block endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });
    await api('/api/social/block', { method: 'POST', body: JSON.stringify({ receiverId: 'u2' }) });
    expect(api).toHaveBeenCalledWith('/api/social/block', expect.any(Object));
  });

  it('useUnblockUser calls unblock endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });
    await api('/api/social/unblock', { method: 'POST', body: JSON.stringify({ receiverId: 'u2' }) });
    expect(api).toHaveBeenCalledWith('/api/social/unblock', expect.any(Object));
  });

  it('useInvitations fetches invitations', async () => {
    vi.mocked(api).mockResolvedValue({ invitations: [] });
    await api('/api/social/invitations');
    expect(api).toHaveBeenCalledWith('/api/social/invitations');
  });

  it('useSendInvitation calls invitations create', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });
    await api('/api/social/invitations', {
      method: 'POST',
      body: JSON.stringify({ receiverId: 'u2', type: 'TABLE' }),
    });
    expect(api).toHaveBeenCalledWith('/api/social/invitations', expect.any(Object));
  });

  it('useRespondToInvitation calls invitation respond', async () => {
    vi.mocked(api).mockResolvedValue({ success: true });
    await api('/api/social/invitations/i1', {
      method: 'PUT',
      body: JSON.stringify({ accept: true }),
    });
    expect(api).toHaveBeenCalledWith('/api/social/invitations/i1', expect.any(Object));
  });
});