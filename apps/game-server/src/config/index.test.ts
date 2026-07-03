import { describe, it, expect } from 'vitest';
import { ConfigService } from './index';

describe('ConfigService', () => {
  it('returns profanity list', () => {
    const config = new ConfigService();
    const list = config.getProfanityList();
    expect(list).toContain('fuck');
    expect(list).toContain('shit');
    expect(list).toContain('ass');
    expect(list).toContain('bitch');
    expect(list).toContain('cunt');
  });

  it('returns a copy of the list', () => {
    const config = new ConfigService();
    const list1 = config.getProfanityList();
    const list2 = config.getProfanityList();
    expect(list1).not.toBe(list2);
  });
});
