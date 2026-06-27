import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from './jwt';

describe('JWT utilities', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken({ sub: 'user_1', type: 'user' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user_1');
    expect(payload.type).toBe('user');
  });

  it('signs and verifies a guest access token', () => {
    const token = signAccessToken({ sub: 'guest_1', type: 'guest' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('guest_1');
    expect(payload.type).toBe('guest');
  });

  it('signs and verifies a refresh token', () => {
    const token = signRefreshToken({ sub: 'user_1', sessionId: 'sess_1' });
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user_1');
    expect(payload.sessionId).toBe('sess_1');
  });

  it('throws on invalid access token', () => {
    expect(() => verifyAccessToken('invalid')).toThrow();
  });

  it('throws on invalid refresh token', () => {
    expect(() => verifyRefreshToken('invalid')).toThrow();
  });

  it('produces distinct tokens for different payloads', () => {
    const t1 = signAccessToken({ sub: 'a', type: 'user' });
    const t2 = signAccessToken({ sub: 'b', type: 'user' });
    expect(t1).not.toBe(t2);
  });
});
