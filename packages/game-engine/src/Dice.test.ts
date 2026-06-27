import { describe, it, expect } from 'vitest';
import {
  rollDice,
  rollDiceSeeded,
  rollSpecificDice,
  getDiceValues,
  getUniqueDiceValues,
  removeDie,
  isDiceRoll,
  createDiceRoll,
  DICE_MIN,
  DICE_MAX,
} from './Dice';

describe('rollDice', () => {
  it('produces values in valid range', () => {
    for (let i = 0; i < 100; i++) {
      const roll = rollDice();
      expect(roll.die1).toBeGreaterThanOrEqual(DICE_MIN);
      expect(roll.die1).toBeLessThanOrEqual(DICE_MAX);
      expect(roll.die2).toBeGreaterThanOrEqual(DICE_MIN);
      expect(roll.die2).toBeLessThanOrEqual(DICE_MAX);
    }
  });

  it('sets isDouble correctly', () => {
    for (let i = 0; i < 100; i++) {
      const roll = rollDice();
      expect(roll.isDouble).toBe(roll.die1 === roll.die2);
    }
  });

  it('produces varying results', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const roll = rollDice();
      results.add(`${roll.die1},${roll.die2}`);
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('rollDiceSeeded', () => {
  it('produces deterministic results', () => {
    const a = rollDiceSeeded(42);
    const b = rollDiceSeeded(42);
    expect(a).toEqual(b);
  });

  it('produces different results for different seeds', () => {
    const a = rollDiceSeeded(1);
    const b = rollDiceSeeded(2);
    expect(a).not.toEqual(b);
  });
});

describe('rollSpecificDice', () => {
  it('creates a roll with specific values', () => {
    const roll = rollSpecificDice(4, 2);
    expect(roll.die1).toBe(4);
    expect(roll.die2).toBe(2);
    expect(roll.isDouble).toBe(false);
  });

  it('detects doubles', () => {
    const roll = rollSpecificDice(6, 6);
    expect(roll.isDouble).toBe(true);
  });
});

describe('getDiceValues', () => {
  it('returns two values for non-doubles', () => {
    expect(getDiceValues({ die1: 3, die2: 5, isDouble: false })).toEqual([3, 5]);
  });

  it('returns four values for doubles', () => {
    expect(getDiceValues({ die1: 4, die2: 4, isDouble: true })).toEqual([4, 4, 4, 4]);
  });
});

describe('getUniqueDiceValues', () => {
  it('returns two unique values for non-doubles', () => {
    expect(getUniqueDiceValues({ die1: 3, die2: 5, isDouble: false })).toEqual([3, 5]);
  });

  it('returns one value for doubles', () => {
    expect(getUniqueDiceValues({ die1: 4, die2: 4, isDouble: true })).toEqual([4]);
  });

  it('deduplicates equal values', () => {
    expect(getUniqueDiceValues({ die1: 2, die2: 2, isDouble: false })).toEqual([2]);
  });
});

describe('removeDie', () => {
  it('removes one occurrence of the value', () => {
    expect(removeDie([4, 3, 2], 3)).toEqual([4, 2]);
  });

  it('removes only first occurrence', () => {
    expect(removeDie([4, 3, 4], 4)).toEqual([3, 4]);
  });

  it('returns same array if value not found', () => {
    expect(removeDie([4, 3], 6)).toEqual([4, 3]);
  });

  it('does not mutate original array', () => {
    const original = [4, 3, 2];
    const result = removeDie(original, 3);
    expect(original).toEqual([4, 3, 2]);
    expect(result).toEqual([4, 2]);
  });
});

describe('isDiceRoll', () => {
  it('validates a correct dice roll', () => {
    expect(isDiceRoll({ die1: 3, die2: 5, isDouble: false })).toBe(true);
  });

  it('validates a correct double', () => {
    expect(isDiceRoll({ die1: 6, die2: 6, isDouble: true })).toBe(true);
  });

  it('rejects null', () => {
    expect(isDiceRoll(null)).toBe(false);
  });

  it('rejects invalid values', () => {
    expect(isDiceRoll({ die1: 0, die2: 5, isDouble: false })).toBe(false);
    expect(isDiceRoll({ die1: 7, die2: 3, isDouble: false })).toBe(false);
  });
});

describe('createDiceRoll', () => {
  it('creates non-double roll', () => {
    const roll = createDiceRoll(2, 4);
    expect(roll.die1).toBe(2);
    expect(roll.die2).toBe(4);
    expect(roll.isDouble).toBe(false);
  });

  it('creates double roll', () => {
    const roll = createDiceRoll(5, 5);
    expect(roll.isDouble).toBe(true);
  });
});
