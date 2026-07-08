'use client';

import { useTranslation } from '@/lib/i18n';
import { useGame } from '@/providers/GameProvider';
import { useEffect, useRef, useState } from 'react';

const DICE_SPRITE_PATH = '/assets/dice-roll-sprite.png';
const DICE_SPRITE_COLUMNS = 15;
const DICE_SPRITE_ROWS = 7;
const DICE_SPRITE_ALPHA_THRESHOLD = 16;
const DICE_SPRITE_RANDOM_FRAME_COUNT = 24;
const DICE_ROLL_TOTAL_MS = 1750;
const DICE_ROLL_STAGGER_MS = 120;

let spriteSheetPromise: Promise<HTMLCanvasElement | null> | null = null;

function loadDiceSpriteSheet(): Promise<HTMLCanvasElement | null> {
  if (spriteSheetPromise) return spriteSheetPromise;
  spriteSheetPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        resolve(null);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const pixels = imageData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (
          pixels[i] <= DICE_SPRITE_ALPHA_THRESHOLD &&
          pixels[i + 1] <= DICE_SPRITE_ALPHA_THRESHOLD &&
          pixels[i + 2] <= DICE_SPRITE_ALPHA_THRESHOLD
        ) {
          pixels[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => resolve(null);
    img.src = DICE_SPRITE_PATH;
  });
  return spriteSheetPromise;
}

if (typeof window !== 'undefined') {
  loadDiceSpriteSheet();
}

function buildDiceFrameSequence(value: number): number[] {
  const randomFrames: number[] = [];
  const startRow = Math.floor(Math.random() * DICE_SPRITE_ROWS);
  const startCol = Math.floor(Math.random() * DICE_SPRITE_COLUMNS);
  const stride = 1 + Math.floor(Math.random() * 3);
  const rowBumpEvery = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < DICE_SPRITE_RANDOM_FRAME_COUNT; i++) {
    const col = (startCol + i * stride) % DICE_SPRITE_COLUMNS;
    const rowShift = Math.floor(i / rowBumpEvery);
    const row = (startRow + rowShift) % DICE_SPRITE_ROWS;
    randomFrames.push(row * DICE_SPRITE_COLUMNS + col);
  }
  const settleRow = Math.max(0, Math.min(5, value - 1));
  const settleCols = [3, 6, 8, 10, 11, 12, 13];
  const settleFrames = settleCols.map((col) => settleRow * DICE_SPRITE_COLUMNS + col);
  return [...randomFrames, ...settleFrames];
}

function getSpriteMeta(sheet: HTMLCanvasElement) {
  return {
    srcW: Math.floor(sheet.width / DICE_SPRITE_COLUMNS) || 1,
    srcH: Math.floor(sheet.height / DICE_SPRITE_ROWS) || 1,
    maxIndex: DICE_SPRITE_COLUMNS * DICE_SPRITE_ROWS - 1,
  };
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  pixelSize: number,
  frameIndex: number,
  sheet: HTMLCanvasElement,
) {
  const meta = getSpriteMeta(sheet);
  const safeIndex = Math.max(0, Math.min(meta.maxIndex, frameIndex));
  const col = safeIndex % DICE_SPRITE_COLUMNS;
  const row = Math.floor(safeIndex / DICE_SPRITE_COLUMNS);
  ctx.clearRect(0, 0, pixelSize, pixelSize);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    sheet,
    col * meta.srcW,
    row * meta.srcH,
    meta.srcW,
    meta.srcH,
    0,
    0,
    pixelSize,
    pixelSize,
  );
}

function AnimatedDieCanvas({
  value,
  index,
  size = 52,
}: {
  value: number;
  index: number;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixelSize = Math.round(size * dpr);
    canvas.width = pixelSize;
    canvas.height = pixelSize;

    const delay = index * DICE_ROLL_STAGGER_MS;
    const frameSequence = buildDiceFrameSequence(value);
    let lastFrame = -1;
    let startTime: number | null = null;
    let animId: number;
    let sheet: HTMLCanvasElement | null = null;

    function tick(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      if (elapsed < delay) {
        animId = requestAnimationFrame(tick);
        return;
      }
      const adjusted = elapsed - delay;
      const progress = Math.min(1, adjusted / DICE_ROLL_TOTAL_MS);
      const frameIndex = Math.min(
        frameSequence.length - 1,
        Math.floor(progress * (frameSequence.length - 1)),
      );
      if (frameIndex !== lastFrame) {
        if (sheet) drawFrame(ctx!, pixelSize, frameSequence[frameIndex], sheet);
        lastFrame = frameIndex;
      }
      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      }
    }

    loadDiceSpriteSheet().then((s) => {
      sheet = s;
      if (s) {
        drawFrame(ctx!, pixelSize, frameSequence[0], s);
        lastFrame = 0;
      }
      animId = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(animId);
  }, [value, index, size]);

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          display: 'block',
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.42))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -7,
          width: '86%',
          height: '34%',
          transform: 'translateX(-50%)',
          background: 'url(/assets/dice-shadow.png) center / 100% 100% no-repeat',
          opacity: 0.5,
          filter: 'blur(0.1px)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export default function DiceArea() {
  const t = useTranslation();
  const { gameState, canRoll, rollDiceAction } = useGame();
  const roll = gameState.diceRoll;
  const remaining = gameState.remainingDice;
  const [rolling, setRolling] = useState(false);
  const [animValues, setAnimValues] = useState<{ die1: number; die2: number } | null>(null);
  const prevRollRef = useRef(roll);

  useEffect(() => {
    if (roll && !prevRollRef.current) {
      setAnimValues({ die1: roll.die1, die2: roll.die2 });
      setRolling(true);
      const totalMs = DICE_ROLL_TOTAL_MS + DICE_ROLL_STAGGER_MS + 200;
      const timer = setTimeout(() => setRolling(false), totalMs);
      return () => clearTimeout(timer);
    }
    prevRollRef.current = roll;
  }, [roll]);

  const isDieAvailable = (val: number, instance: number): boolean => {
    const count = remaining.filter((d) => d === val).length;
    return count > instance;
  };

  if (rolling && animValues) {
    return (
      <div className="flex items-center gap-3">
        <button
          disabled
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-stone-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t.table.rolled}
        </button>
        <div className="flex gap-2 items-center">
          <AnimatedDieCanvas value={animValues.die1} index={0} />
          <AnimatedDieCanvas value={animValues.die2} index={1} />
        </div>
      </div>
    );
  }

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
