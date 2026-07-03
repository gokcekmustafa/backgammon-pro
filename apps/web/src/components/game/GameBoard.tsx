'use client';

import { useMemo, useRef, useCallback, useState, type ReactNode } from 'react';
import {
  createBoardGeometry,
  getCheckerPosition,
  computeCheckerDiameter,
} from '@backgammon/board-renderer';
import { Player, BAR_INDEX, BEAR_OFF_INDEX } from '@backgammon/game-engine';
import type { GameState, Move } from '@backgammon/game-engine';
import type { PointGeometry } from '@backgammon/board-renderer';

const POINT_COLORS: [string, string] = ['#f5deb3', '#8b4513'];
const BOARD_FILL = '#1a5c2a';
const BOARD_STROKE = '#5c3a1a';
const BAR_FILL = '#1a5c2a';
const P1_CHECKER_FILL = '#f0d9b5';
const P1_CHECKER_STROKE = '#c4a882';
const P2_CHECKER_FILL = '#5c3a1a';
const P2_CHECKER_STROKE = '#3d2510';
const LEGAL_MOVE_FILL = 'rgba(255, 255, 200, 0.6)';
const HIGHLIGHT_STROKE = '#fbbf24';
const DRAG_TARGET_FILL = 'rgba(255, 255, 200, 0.35)';

interface GameBoardProps {
  gameState: GameState;
  selectedPoint: number | null;
  legalMoves: Move[];
  allLegalMoves: Move[];
  boardWidth: number;
  checkerPaddingRatio: number;
  checkerGap: number;
  onPointClick: (pointIndex: number) => void;
  onMakeMove: (from: number, to: number) => void;
}

function checkerColor(player: Player): { fill: string; stroke: string } {
  return player === Player.One
    ? { fill: P1_CHECKER_FILL, stroke: P1_CHECKER_STROKE }
    : { fill: P2_CHECKER_FILL, stroke: P2_CHECKER_STROKE };
}

const STACK_SEPARATOR = 0.5;

function svgCoord(e: React.PointerEvent, svg: SVGSVGElement): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

export function findDropTarget(
  x: number,
  y: number,
  from: number,
  allLegalMoves: Move[],
  points: PointGeometry[],
  boardWidth: number,
  boardHeight: number,
): number | null {
  const legalFrom = allLegalMoves.filter((m) => m.from === from);
  if (legalFrom.length === 0) return null;

  const destinations = new Set(legalFrom.map((m) => m.to));

  for (const destIdx of destinations) {
    if (destIdx < 0 || destIdx >= 24) continue;
    const pt = points[destIdx];
    const margin = 8;
    if (
      x >= pt.rect.x - margin &&
      x <= pt.rect.x + pt.rect.width + margin &&
      y >= pt.rect.y - margin &&
      y <= pt.rect.y + pt.rect.height + margin
    ) {
      return destIdx;
    }
  }

  if (destinations.has(-1) || destinations.has(BEAR_OFF_INDEX)) {
    if (x < 0 || x > boardWidth || y < 0 || y > boardHeight) {
      return BEAR_OFF_INDEX;
    }
  }

  if (x < 0 || x > boardWidth || y < 0 || y > boardHeight) {
    return null;
  }

  let bestIdx: number | null = null;
  let bestDist = Infinity;
  for (const destIdx of destinations) {
    if (destIdx < 0 || destIdx >= 24) continue;
    const pt = points[destIdx];
    const cx = pt.rect.x + pt.rect.width / 2;
    const cy = pt.rect.y + pt.rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = destIdx;
    }
  }
  return bestIdx;
}

interface DragState {
  from: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

export default function GameBoard({
  gameState,
  selectedPoint,
  legalMoves,
  allLegalMoves,
  boardWidth,
  checkerPaddingRatio,
  checkerGap,
  onPointClick,
  onMakeMove,
}: GameBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const geometry = useMemo(() => createBoardGeometry(boardWidth), [boardWidth]);
  const checkerDiam = useMemo(
    () => computeCheckerDiameter(geometry.pointWidth, checkerPaddingRatio),
    [geometry.pointWidth, checkerPaddingRatio],
  );
  const bw = geometry.boardWidth;
  const bh = geometry.boardHeight;

  const legalDestinations = useMemo(() => new Set(legalMoves.map((m) => m.to)), [legalMoves]);

  const points = geometry.points;

  const dragTargets = useMemo(() => {
    if (!drag?.isDragging) return new Set<number>();
    return new Set(allLegalMoves.filter((m) => m.from === drag.from).map((m) => m.to));
  }, [drag, allLegalMoves]);

  const canDragFrom = useCallback(
    (pointIndex: number): boolean => {
      if (gameState.phase !== 'playing') return false;
      if (pointIndex >= 0 && pointIndex < 24) {
        const pt = gameState.board[pointIndex];
        return pt.player === gameState.currentPlayer && pt.count > 0;
      }
      if (pointIndex === BAR_INDEX) {
        const playerIdx = gameState.currentPlayer === Player.One ? 0 : 1;
        return gameState.players[playerIdx].checkersOnBar > 0;
      }
      return false;
    },
    [gameState],
  );

  const startReturnAnimation = useCallback(
    (from: number) => {
      const d = dragRef.current;
      if (!d) return;

      let targetCx: number;
      let targetCy: number;

      if (from >= 0 && from < 24) {
        const sourceGeo = points[from];
        const count = gameState.board[from]?.count ?? 1;
        const pos = getCheckerPosition(
          sourceGeo.rect,
          sourceGeo.direction,
          count - 1,
          checkerDiam,
          checkerGap,
        );
        targetCx = pos.cx;
        targetCy = pos.cy;
      } else if (from === BAR_INDEX) {
        const barCx = geometry.bar.x + geometry.bar.width / 2;
        const playerIdx = gameState.currentPlayer === Player.One ? 0 : 1;
        const barCount = gameState.players[playerIdx].checkersOnBar;
        const barTopY = 10 + checkerDiam / 2;
        const barBotY = bh - 10 - checkerDiam / 2;

        targetCx = barCx;
        targetCy =
          gameState.currentPlayer === Player.One
            ? barTopY + (barCount - 1) * (checkerDiam + checkerGap)
            : barBotY - (barCount - 1) * (checkerDiam + checkerGap);
      } else {
        setDrag(null);
        dragRef.current = null;
        return;
      }

      const startX = d.currentX;
      const startY = d.currentY;
      const duration = 200;
      const startTime = performance.now();

      function animate(now: number) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const easeT = 1 - (1 - t) * (1 - t);

        const x = startX + (targetCx - startX) * easeT;
        const y = startY + (targetCy - startY) * easeT;

        if (dragRef.current) {
          dragRef.current = { ...dragRef.current, currentX: x, currentY: y };
          setDrag({ ...dragRef.current! });
        }

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          setDrag(null);
          dragRef.current = null;
        }
      }

      requestAnimationFrame(animate);
    },
    [points, gameState, checkerDiam, checkerGap, geometry, bh],
  );

  const handlePointerDown = useCallback(
    (pointIndex: number, e: React.PointerEvent) => {
      if (!canDragFrom(pointIndex)) return;

      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;

      svg.setPointerCapture(e.pointerId);

      const pt = svgCoord(e, svg);
      if (!pt) return;

      const ds: DragState = {
        from: pointIndex,
        startX: pt.x,
        startY: pt.y,
        currentX: pt.x,
        currentY: pt.y,
        isDragging: false,
      };
      dragRef.current = ds;
      setDrag(ds);
    },
    [canDragFrom],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;

    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const pt = svgCoord(e, svg);
    if (!pt) return;

    const dx = pt.x - d.startX;
    const dy = pt.y - d.startY;
    const isDragging = d.isDragging || dx * dx + dy * dy > 25;

    const updated = { ...d, currentX: pt.x, currentY: pt.y, isDragging };
    dragRef.current = updated;
    setDrag(updated);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const svg = svgRef.current;
      if (!svg) return;

      if (svg.hasPointerCapture(e.pointerId)) {
        svg.releasePointerCapture(e.pointerId);
      }

      if (d.isDragging) {
        const pt = svgCoord(e, svg);
        if (pt) {
          const target = findDropTarget(pt.x, pt.y, d.from, allLegalMoves, points, bw, bh);
          if (target !== null) {
            onMakeMove(d.from, target);
            setDrag(null);
            dragRef.current = null;
          } else {
            startReturnAnimation(d.from);
          }
        } else {
          startReturnAnimation(d.from);
        }
      } else {
        if (d.from >= 0 && d.from < 24) {
          onPointClick(d.from);
        } else if (d.from === BAR_INDEX) {
          onPointClick(BAR_INDEX);
        }
        setDrag(null);
        dragRef.current = null;
      }
    },
    [allLegalMoves, onPointClick, onMakeMove, points, bw, bh, startReturnAnimation],
  );

  const handleLostPointerCapture = useCallback(() => {
    if (dragRef.current) {
      setDrag(null);
      dragRef.current = null;
    }
  }, []);

  const triangleElements = useMemo(
    () =>
      points.map((pt) => {
        const color = pt.index % 2 === 0 ? POINT_COLORS[0] : POINT_COLORS[1];
        return (
          <polygon
            key={`tri-${pt.index}`}
            points={`${pt.rect.x},${pt.rect.y} ${pt.rect.x + pt.rect.width},${pt.rect.y} ${pt.rect.x + pt.rect.width / 2},${pt.direction === 'down' ? pt.rect.y + pt.rect.height : pt.rect.y}`}
            fill={color}
          />
        );
      }),
    [points],
  );

  const pointClickAreas = useMemo(
    () =>
      points.map((pt) => (
        <rect
          key={`click-${pt.index}`}
          x={pt.rect.x}
          y={pt.rect.y}
          width={pt.rect.width}
          height={pt.rect.height}
          fill="transparent"
          style={{ cursor: drag?.isDragging ? 'grabbing' : 'pointer' }}
          onClick={() => onPointClick(pt.index)}
          onPointerDown={(e) => handlePointerDown(pt.index, e)}
        />
      )),
    [points, onPointClick, handlePointerDown, drag],
  );

  const checkerElements = useMemo(() => {
    const els: JSX.Element[] = [];

    for (let i = 0; i < 24; i++) {
      const pt = gameState.board[i];
      if (!pt.player || pt.count === 0) continue;

      let count = pt.count;
      const isDragSource = drag?.isDragging && drag.from === i;
      if (isDragSource) {
        count -= 1;
      }
      if (count <= 0) continue;

      const geo = points[i];
      const colors = checkerColor(pt.player);
      const isSelected = selectedPoint === i;

      for (let j = 0; j < count; j++) {
        const pos = getCheckerPosition(geo.rect, geo.direction, j, checkerDiam, checkerGap);
        els.push(
          <circle
            key={`c-${i}-${j}`}
            cx={pos.cx}
            cy={pos.cy}
            r={pos.radius}
            fill={colors.fill}
            stroke={isSelected ? HIGHLIGHT_STROKE : colors.stroke}
            strokeWidth={isSelected ? 2.5 : 1}
            style={{
              cursor: pt.player === gameState.currentPlayer ? 'grab' : 'default',
              transition: 'cx 0.3s ease, cy 0.3s ease',
            }}
            onClick={() => {
              if (pt.player === gameState.currentPlayer) {
                onPointClick(i);
              }
            }}
            onPointerDown={(e) => handlePointerDown(i, e)}
          />,
        );
      }
    }
    return els;
  }, [
    gameState,
    selectedPoint,
    points,
    checkerDiam,
    checkerGap,
    drag,
    onPointClick,
    handlePointerDown,
  ]);

  const barPlayerOne = gameState.players[0].checkersOnBar;
  const barPlayerTwo = gameState.players[1].checkersOnBar;

  const barElements = useMemo(() => {
    const els: JSX.Element[] = [];
    const barCx = geometry.bar.x + geometry.bar.width / 2;
    const barTopY = 10 + checkerDiam / 2;
    const barBotY = bh - 10 - checkerDiam / 2;

    let displayP1 = barPlayerOne;
    let displayP2 = barPlayerTwo;
    const isBarDragSource = drag?.isDragging && drag.from === BAR_INDEX;
    if (isBarDragSource && gameState.currentPlayer === Player.One) {
      displayP1 = Math.max(0, displayP1 - 1);
    }
    if (isBarDragSource && gameState.currentPlayer === Player.Two) {
      displayP2 = Math.max(0, displayP2 - 1);
    }

    for (let i = 0; i < displayP1; i++) {
      els.push(
        <circle
          key={`bar-p1-${i}`}
          cx={barCx}
          cy={barTopY + i * (checkerDiam + checkerGap)}
          r={checkerDiam / 2}
          fill={P1_CHECKER_FILL}
          stroke={P1_CHECKER_STROKE}
          strokeWidth={1}
          style={{
            transition: 'cy 0.3s ease',
            cursor: gameState.currentPlayer === Player.One ? 'grab' : 'default',
          }}
          onClick={() => {
            if (gameState.currentPlayer === Player.One) onPointClick(BAR_INDEX);
          }}
          onPointerDown={(e) => handlePointerDown(BAR_INDEX, e)}
        />,
      );
    }
    for (let i = 0; i < displayP2; i++) {
      els.push(
        <circle
          key={`bar-p2-${i}`}
          cx={barCx}
          cy={barBotY - i * (checkerDiam + checkerGap)}
          r={checkerDiam / 2}
          fill={P2_CHECKER_FILL}
          stroke={P2_CHECKER_STROKE}
          strokeWidth={1}
          style={{
            transition: 'cy 0.3s ease',
            cursor: gameState.currentPlayer === Player.Two ? 'grab' : 'default',
          }}
          onClick={() => {
            if (gameState.currentPlayer === Player.Two) onPointClick(BAR_INDEX);
          }}
          onPointerDown={(e) => handlePointerDown(BAR_INDEX, e)}
        />,
      );
    }
    return els;
  }, [
    barPlayerOne,
    barPlayerTwo,
    geometry,
    checkerDiam,
    checkerGap,
    bh,
    drag,
    gameState,
    onPointClick,
    handlePointerDown,
  ]);

  const legalMoveIndicators = useMemo(() => {
    if (legalDestinations.size === 0) return null;
    return Array.from(legalDestinations).map((destIdx) => {
      if (destIdx < 0 || destIdx >= 24) return null;
      const geo = points[destIdx];
      const pos = getCheckerPosition(
        geo.rect,
        geo.direction,
        STACK_SEPARATOR,
        checkerDiam * 0.35,
        0,
      );
      return (
        <circle
          key={`legal-${destIdx}`}
          cx={pos.cx}
          cy={pos.cy}
          r={Math.max(checkerDiam * 0.2, 6)}
          fill={LEGAL_MOVE_FILL}
          style={{ cursor: 'pointer' }}
          onClick={() => onPointClick(destIdx)}
          onPointerDown={(e) => e.stopPropagation()}
        />
      );
    });
  }, [legalDestinations, points, checkerDiam, onPointClick]);

  const dragTargetHighlights = useMemo((): ReactNode | null => {
    if (!drag?.isDragging || dragTargets.size === 0) return null;
    return Array.from(dragTargets).map((destIdx) => {
      if (destIdx < 0 || destIdx >= 24) return null;
      const pt = points[destIdx];
      return (
        <rect
          key={`drag-target-${destIdx}`}
          x={pt.rect.x}
          y={pt.rect.y}
          width={pt.rect.width}
          height={pt.rect.height}
          fill={DRAG_TARGET_FILL}
          rx={4}
        />
      );
    });
  }, [drag, dragTargets, points]);

  const dragOverlay = useMemo((): ReactNode | null => {
    if (!drag) return null;

    const from = drag.from;
    let colors: { fill: string; stroke: string };

    if (from >= 0 && from < 24) {
      const pt = gameState.board[from];
      if (!pt.player) return null;
      colors = checkerColor(pt.player);
    } else if (from === BAR_INDEX) {
      colors = checkerColor(gameState.currentPlayer);
    } else {
      return null;
    }

    return (
      <circle
        cx={drag.currentX}
        cy={drag.currentY}
        r={checkerDiam / 2}
        fill={colors.fill}
        stroke={HIGHLIGHT_STROKE}
        strokeWidth={2.5}
        style={{
          pointerEvents: 'none',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
        }}
      />
    );
  }, [drag, checkerDiam, gameState]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${bw} ${bh}`}
      className="game-board-svg"
      style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
      role="application"
      aria-label="Backgammon game board"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onLostPointerCapture={handleLostPointerCapture}
    >
      <rect
        x={0}
        y={0}
        width={bw}
        height={bh}
        rx={12}
        fill={BOARD_FILL}
        stroke={BOARD_STROKE}
        strokeWidth={4}
      />
      {triangleElements}
      <rect x={geometry.bar.x} y={0} width={geometry.bar.width} height={bh} fill={BAR_FILL} />
      {pointClickAreas}
      {checkerElements}
      {barElements}
      {legalMoveIndicators}
      {dragTargetHighlights}
      {dragOverlay}
    </svg>
  );
}
