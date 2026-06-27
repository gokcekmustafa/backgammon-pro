import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from './password';

describe('password utilities', () => {
  it('hashes a password', async () => {
    const hash = await hashPassword('test123');
    expect(hash).toBeTruthy();
    expect(hash).not.toBe('test123');
  });

  it('verifies correct password', async () => {
    const hash = await hashPassword('test123');
    const valid = await comparePassword('test123', hash);
    expect(valid).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const hash = await hashPassword('test123');
    const valid = await comparePassword('wrong', hash);
    expect(valid).toBe(false);
  });

  it('produces different hashes for same password', async () => {
    const h1 = await hashPassword('same');
    const h2 = await hashPassword('same');
    expect(h1).not.toBe(h2);
  });
});
