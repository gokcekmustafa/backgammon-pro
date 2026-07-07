'use client';

import { useTranslation } from '@/lib/i18n';
import { useGame } from '@/providers/GameProvider';

export default function DiceArea() {
  const t = useTranslation();
  const { gameState, canRoll, rollDiceAction } = useGame();
  const roll = gameState.diceRoll;
  const remaining = gameState.remainingDice;

  const isDieAvailable = (val: number, instance: number): boolean => {
    const count = remaining.filter((d) => d === val).length;
    return count > instance;
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={rollDiceAction}
        disabled={!canRoll}
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {canRoll ? t.table.rollDice : t.table.rolled}
      </button>
      {roll ? (
        <div className="flex gap-1.5">
          {roll.die1 === roll.die2 ? (
            <DieFace value={roll.die1} available={isDieAvailable(roll.die1, 0)} />
          ) : (
            <>
              <DieFace value={roll.die1} available={isDieAvailable(roll.die1, 0)} />
              <DieFace value={roll.die2} available={isDieAvailable(roll.die2, 0)} />
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-1.5">
          <DieFace value={null} available={false} />
          <DieFace value={null} available={false} />
        </div>
      )}
    </div>
  );
}

function DieFace({ value, available }: { value: number | null; available: boolean }) {
  const dim = value === null;
  const dots = value ?? 0;
  const positions = getDotPositions(dots);

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-lg border p-1.5 transition-opacity ${
        dim || !available
          ? 'border-stone-700 bg-stone-900 opacity-30'
          : 'border-stone-600 bg-stone-800'
      }`}
    >
      {dim ? (
        <span className="text-xs font-bold text-stone-600">?</span>
      ) : (
        <div className="grid grid-cols-3 grid-rows-3 h-full w-full">
          {positions.map((pos, i) => (
            <span
              key={i}
              className={`inline-block h-1.5 w-1.5 rounded-full place-self-center ${
                pos ? 'bg-amber-400' : ''
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getDotPositions(value: number): boolean[] {
  const positions = [false, false, false, false, false, false, false, false, false];
  switch (value) {
    case 1:
      positions[4] = true;
      break;
    case 2:
      positions[2] = true;
      positions[6] = true;
      break;
    case 3:
      positions[2] = true;
      positions[4] = true;
      positions[6] = true;
      break;
    case 4:
      positions[0] = true;
      positions[2] = true;
      positions[6] = true;
      positions[8] = true;
      break;
    case 5:
      positions[0] = true;
      positions[2] = true;
      positions[4] = true;
      positions[6] = true;
      positions[8] = true;
      break;
    case 6:
      positions[0] = true;
      positions[2] = true;
      positions[3] = true;
      positions[5] = true;
      positions[6] = true;
      positions[8] = true;
      break;
  }
  return positions;
}
