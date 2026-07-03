import { describe, it, expect } from 'vitest';
import { expectedScore, calculateElo, getWinScore } from './elo';

describe('expectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 2);
  });

  it('favors higher rated player', () => {
    const score = expectedScore(1500, 1200);
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(1);
  });

  it('favors lower rated player when they are lower', () => {
    const score = expectedScore(1200, 1500);
    expect(score).toBeLessThan(0.5);
    expect(score).toBeGreaterThan(0);
  });
});

describe('calculateElo', () => {
  it('returns updated ratings after a win', () => {
    const result = calculateElo(1200, 1200, 1);
    expect(result.newRatingA).toBeGreaterThan(1200);
    expect(result.newRatingB).toBeLessThan(1200);
    const diff = result.newRatingA - 1200;
    expect(diff).toBe(16);
    expect(1200 - result.newRatingB).toBe(16);
  });

  it('returns updated ratings after a loss', () => {
    const result = calculateElo(1200, 1200, 0);
    expect(result.newRatingA).toBeLessThan(1200);
    expect(result.newRatingB).toBeGreaterThan(1200);
  });

  it('handles draw correctly', () => {
    const result = calculateElo(1200, 1200, 0.5);
    expect(result.newRatingA).toBe(1200);
    expect(result.newRatingB).toBe(1200);
  });

  it('higher rated player loses fewer points when losing', () => {
    const higher = calculateElo(1600, 1200, 0);
    expect(higher.newRatingA).toBe(1600 - 29);
    expect(higher.newRatingB).toBe(1200 + 29);
  });

  it('lower rated player gains more points when winning', () => {
    const lower = calculateElo(1200, 1600, 1);
    expect(lower.newRatingA).toBe(1200 + 29);
    expect(lower.newRatingB).toBe(1600 - 29);
  });

  it('accepts custom kFactor', () => {
    const result = calculateElo(1200, 1200, 1, 64);
    expect(result.newRatingA).toBe(1232);
    expect(result.newRatingB).toBe(1168);
  });

  it('rounds to integers', () => {
    const result = calculateElo(1200, 1201, 1);
    expect(Number.isInteger(result.newRatingA)).toBe(true);
    expect(Number.isInteger(result.newRatingB)).toBe(true);
  });
});

describe('getWinScore', () => {
  it('returns 1 for normal win', () => {
    expect(getWinScore(1)).toBe(1);
  });

  it('returns 1.5 for gammon', () => {
    expect(getWinScore(2)).toBe(1.5);
  });

  it('returns 2 for backgammon', () => {
    expect(getWinScore(3)).toBe(2);
  });

  it('returns 1 for unknown win value', () => {
    expect(getWinScore(4)).toBe(1);
  });
});
