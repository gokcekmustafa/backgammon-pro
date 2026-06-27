import type { DiceRoll } from './types';

export const DICE_MIN = 1;
export const DICE_MAX = 6;
export const DICE_COUNT = 2;
export const DOUBLES_MULTIPLIER = 2;
export const DOUBLES_DIE_COUNT = 4;

function randomDie(): number {
  return Math.floor(Math.random() * DICE_MAX) + DICE_MIN;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) % DICE_MAX) + 1;
  };
}

export function rollDice(): DiceRoll {
  const d1 = randomDie();
  const d2 = randomDie();
  return { die1: d1, die2: d2, isDouble: d1 === d2 };
}

export function rollDiceSeeded(seed: number): DiceRoll {
  const rng = seededRandom(seed);
  const d1 = rng();
  const d2 = rng();
  return { die1: d1, die2: d2, isDouble: d1 === d2 };
}

export function rollSpecificDice(d1: number, d2: number): DiceRoll {
  return { die1: d1, die2: d2, isDouble: d1 === d2 };
}

export function getDiceValues(roll: DiceRoll): number[] {
  if (roll.isDouble) {
    return [roll.die1, roll.die1, roll.die1, roll.die1];
  }
  return [roll.die1, roll.die2];
}

export function getUniqueDiceValues(roll: DiceRoll): number[] {
  if (roll.isDouble) {
    return [roll.die1];
  }
  if (roll.die1 === roll.die2) {
    return [roll.die1];
  }
  return [roll.die1, roll.die2].filter((v, i, a) => a.indexOf(v) === i);
}

export function removeDie(values: number[], dieValue: number): number[] {
  const index = values.indexOf(dieValue);
  if (index === -1) return [...values];
  const result = [...values];
  result.splice(index, 1);
  return result;
}

export function isDiceRoll(value: unknown): value is DiceRoll {
  if (typeof value !== 'object' || value === null) return false;
  const roll = value as Record<string, unknown>;
  return (
    typeof roll.die1 === 'number' &&
    typeof roll.die2 === 'number' &&
    typeof roll.isDouble === 'boolean' &&
    roll.die1 >= DICE_MIN &&
    roll.die1 <= DICE_MAX &&
    roll.die2 >= DICE_MIN &&
    roll.die2 <= DICE_MAX &&
    roll.isDouble === (roll.die1 === roll.die2)
  );
}

export function createDiceRoll(die1: number, die2: number): DiceRoll {
  return { die1, die2, isDouble: die1 === die2 };
}
