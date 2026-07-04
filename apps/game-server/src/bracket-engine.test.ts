import { describe, it, expect } from 'vitest';
import { generateSingleElimination, generateRoundRobin } from './bracket-engine';

describe('generateSingleElimination', () => {
  it('returns empty for <2 players', () => {
    expect(generateSingleElimination([])).toHaveLength(0);
    expect(generateSingleElimination(['a'])).toHaveLength(0);
  });

  it('generates correct number of rounds and matches for power of 2', () => {
    const result = generateSingleElimination(['a', 'b', 'c', 'd']);
    expect(result).toHaveLength(2);
    expect(result[0].matches).toHaveLength(2);
    expect(result[1].matches).toHaveLength(1);
  });

  it('fills all player slots', () => {
    const result = generateSingleElimination(['a', 'b', 'c', 'd', 'e']);
    const p1Ids = result.flatMap((r) => r.matches.map((m) => m.player1Id));
    const p2Ids = result.flatMap((r) => r.matches.map((m) => m.player2Id));
    const allSlots = [...p1Ids, ...p2Ids].filter(Boolean);
    expect(new Set(allSlots).size).toBe(5);
  });
});

describe('generateRoundRobin', () => {
  it('returns empty for <2 players', () => {
    expect(generateRoundRobin([])).toHaveLength(0);
    expect(generateRoundRobin(['a'])).toHaveLength(0);
  });

  it('generates correct rounds for 4 players', () => {
    const result = generateRoundRobin(['a', 'b', 'c', 'd']);
    const totalMatches = result.reduce((sum, r) => sum + r.matches.length, 0);
    expect(totalMatches).toBe(6);
  });

  it('each pair plays once', () => {
    const result = generateRoundRobin(['a', 'b', 'c']);
    const pairs = new Set<string>();
    for (const round of result) {
      for (const m of round.matches) {
        const key = [m.player1Id, m.player2Id].sort().join('-');
        pairs.add(key);
      }
    }
    expect(pairs.has('a-b')).toBe(true);
    expect(pairs.has('a-c')).toBe(true);
    expect(pairs.has('b-c')).toBe(true);
    expect(pairs.size).toBe(3);
  });
});