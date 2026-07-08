'use client';

import { useMemo, useRef, useCallback, useState, useEffect, type ReactNode } from 'react';
import {
  createBoardGeometry,
  getCheckerPosition,
  computeCheckerDiameter,
  getTrianglePoints,
  trianglePointsToString,
} from '@backgammon/board-renderer';
import { Player, BAR_INDEX, BEAR_OFF_INDEX } from '@backgammon/game-engine';
import type { GameState, Move } from '@backgammon/game-engine';
import type { PointGeometry } from '@backgammon/board-renderer';

const LEGAL_MOVE_FILL = 'rgba(255, 240, 200, 0.5)';
const DRAG_TARGET_FILL = 'rgba(255, 240, 200, 0.25)';
const MAX_VISIBLE_CHECKERS = 6;
const MAX_VISIBLE_BAR_CHIPS = 8;
const SOURCE_HIGHLIGHT_FILL = 'rgba(255, 224, 168, 0.08)';
const SELECTED_SOURCE_FILL = 'rgba(255, 210, 112, 0.18)';

interface GameBoardProps {
  gameState: GameState;
  selectedPoint: number | null;
  legalMoves: Move[];
  allLegalMoves: Move[];
  boardWidth: number;
  checkerPaddingRatio: number;
  checkerGap: number;
  localPlayer?: Player | null;
  onPointClick: (pointIndex: number) => void;
  onMakeMove: (from: number, to: number) => void;
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
  localPlayer,
  onPointClick,
  onMakeMove,
}: GameBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [ghostMove, setGhostMove] = useState<{ from: number; to: number; player: Player } | null>(
    null,
  );
  const [animatingPoint, setAnimatingPoint] = useState<number | null>(null);
  const [capturePoint, setCapturePoint] = useState<number | null>(null);
  const prevBoardRef = useRef<string>('');

  const geometry = useMemo(() => createBoardGeometry(boardWidth), [boardWidth]);
  const checkerDiam = useMemo(
    () => computeCheckerDiameter(geometry.pointWidth, checkerPaddingRatio),
    [geometry.pointWidth, checkerPaddingRatio],
  );
  const bw = geometry.boardWidth;
  const bh = geometry.boardHeight;

  const isFlipped = localPlayer === Player.Two;

  const visualPoints = useMemo(() => {
    if (!isFlipped) return geometry.points;
    return geometry.points.map((_pt, vi) => {
      const mirroredVi = 23 - vi;
      const origFlipped = geometry.points[mirroredVi];
      return {
        ...origFlipped,
        rect: {
          x: origFlipped.rect.x,
          y: bh - origFlipped.rect.y - geometry.pointHeight,
          width: origFlipped.rect.width,
          height: origFlipped.rect.height,
        },
        direction: origFlipped.direction === 'up' ? ('down' as const) : ('up' as const),
        isTopHalf: !origFlipped.isTopHalf,
        index: origFlipped.index,
      };
    });
  }, [geometry, isFlipped, bh]);

  const logicalToVisual = useCallback(
    (logicalIdx: number): number => {
      const nf = logicalIdx < 12 ? 11 - logicalIdx : logicalIdx;
      return isFlipped ? 23 - nf : nf;
    },
    [isFlipped],
  );

  const visualToLogical = useCallback(
    (visualIdx: number): number => {
      const uf = isFlipped ? 23 - visualIdx : visualIdx;
      return uf < 12 ? 11 - uf : uf;
    },
    [isFlipped],
  );

  const legalDestinations = useMemo(() => new Set(legalMoves.map((m) => m.to)), [legalMoves]);

  const selectableSources = useMemo(() => {
    if (gameState.phase !== 'playing') return new Set<number>();
    return new Set(allLegalMoves.map((m) => m.from));
  }, [allLegalMoves, gameState]);

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
      const pts = isFlipped ? geometry.points : geometry.points;
      let targetCx: number;
      let targetCy: number;

      if (from >= 0 && from < 24) {
        const visualFrom = logicalToVisual(from);
        const sourceGeo = pts[visualFrom];
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
            ? isFlipped
              ? barBotY - (barCount - 1) * (checkerDiam + checkerGap)
              : barTopY + (barCount - 1) * (checkerDiam + checkerGap)
            : isFlipped
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
    [geometry, gameState, checkerDiam, checkerGap, bh, isFlipped, visualToLogical],
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
          const target = findDropTarget(pt.x, pt.y, d.from, allLegalMoves, visualPoints, bw, bh);
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
    [allLegalMoves, onPointClick, onMakeMove, visualPoints, bw, bh, startReturnAnimation],
  );

  const handleLostPointerCapture = useCallback(() => {
    if (dragRef.current) {
      setDrag(null);
      dragRef.current = null;
    }
  }, []);

  useEffect(() => {
    const boardKey = JSON.stringify(gameState.board);
    if (prevBoardRef.current && prevBoardRef.current !== boardKey) {
      const prevBoard: { player: Player | null; count: number }[] = JSON.parse(
        prevBoardRef.current,
      );
      let from = -1;
      let to = -1;
      for (let i = 0; i < 24; i++) {
        const prev = prevBoard[i];
        const curr = gameState.board[i];
        if (prev.player !== curr.player || prev.count !== curr.count) {
          if (curr.count > 0 && curr.player === gameState.currentPlayer) {
            to = i;
          } else {
            from = i;
          }
        }
      }
      if (from >= 0 && to >= 0 && gameState.turn.phase !== 'waiting_for_roll') {
        const hit = gameState.board[to]?.count === 1;
        setGhostMove({ from, to, player: gameState.currentPlayer });
        setTimeout(() => {
          setAnimatingPoint(to);
          if (hit) setCapturePoint(to);
        }, 400);
        setTimeout(() => {
          setAnimatingPoint(null);
          setCapturePoint(null);
        }, 800);
      }
    }
    prevBoardRef.current = boardKey;
  }, [gameState.board, gameState.currentPlayer, gameState.turn.phase]);

  const startGhostAnimation = useCallback(
    (from: number, to: number, player: Player) => {
      const svg = svgRef.current;
      if (!svg) return;

      const fromGeo = from === BAR_INDEX ? null : visualPoints[from];
      const toGeo = to >= 0 && to < 24 ? visualPoints[to] : null;

      let svgStartX: number, svgStartY: number;
      if (from === BAR_INDEX) {
        const barCx = geometry.bar.x + geometry.bar.width / 2;
        const playerIdx = player === Player.One ? 0 : 1;
        svgStartX = barCx;
        svgStartY = isFlipped ? bh * 0.75 : bh * 0.25;
      } else if (fromGeo) {
        svgStartX = fromGeo.rect.x + fromGeo.rect.width / 2;
        svgStartY =
          fromGeo.rect.y +
          (fromGeo.direction === 'down' ? checkerDiam / 4 : fromGeo.rect.height - checkerDiam / 4);
      } else {
        return;
      }

      let svgEndX: number, svgEndY: number;
      if (to === BEAR_OFF_INDEX) {
        svgEndX = isFlipped ? geometry.bar.x / 2 : bw - geometry.bar.x / 2;
        svgEndY = bh / 2;
      } else if (toGeo) {
        svgEndX = toGeo.rect.x + toGeo.rect.width / 2;
        svgEndY =
          toGeo.rect.y +
          (toGeo.direction === 'down' ? toGeo.rect.height - checkerDiam / 4 : checkerDiam / 4);
      } else {
        return;
      }

      const svgRect = svg.getBoundingClientRect();
      const scaleX = svgRect.width / bw;
      const scaleY = svgRect.height / bh;

      const startX = svgRect.left + svgStartX * scaleX;
      const startY = svgRect.top + svgStartY * scaleY;
      const endX = svgRect.left + svgEndX * scaleX;
      const endY = svgRect.top + svgEndY * scaleY;

      const stoneFile = player === Player.One ? 'stone-light.png' : 'stone-dark.png';
      const ghost = document.createElement('div');
      ghost.className = 'checker-ghost';
      ghost.style.cssText = [
        'position:fixed',
        `left:${startX - (checkerDiam * scaleX) / 2}px`,
        `top:${startY - (checkerDiam * scaleY) / 2}px`,
        `width:${checkerDiam * scaleX}px`,
        `height:${checkerDiam * scaleY}px`,
        'pointer-events:none',
        'z-index:9999',
        'transition:left 380ms cubic-bezier(.4,0,.2,1),top 380ms cubic-bezier(.4,0,.2,1),transform 380ms ease',
        'transform:scale(1.15)',
        'box-shadow:0 10px 30px rgba(0,0,0,0.55)',
        'border-radius:50%',
        `background:url(/assets/${stoneFile}) center/cover no-repeat`,
      ].join(';');

      document.body.appendChild(ghost);
      ghost.getBoundingClientRect();
      ghost.style.left = `${endX - (checkerDiam * scaleX) / 2}px`;
      ghost.style.top = `${endY - (checkerDiam * scaleY) / 2}px`;
      ghost.style.transform = 'scale(1)';

      setTimeout(() => {
        ghost.remove();
        setGhostMove(null);
      }, 420);
    },
    [visualPoints, geometry, gameState.players, checkerDiam, bw, bh, isFlipped],
  );

  useEffect(() => {
    if (ghostMove) {
      startGhostAnimation(ghostMove.from, ghostMove.to, ghostMove.player);
    }
  }, [ghostMove, startGhostAnimation]);

  const triangleElements = useMemo(
    () =>
      visualPoints.map((pt) => {
        const triPoints = getTrianglePoints(pt.rect, pt.direction);
        return (
          <polygon
            key={`tri-${pt.index}`}
            points={trianglePointsToString(triPoints)}
            fill="transparent"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={0.5}
          />
        );
      }),
    [visualPoints],
  );

  const sourceHighlightElements = useMemo(() => {
    if (gameState.phase !== 'playing' || selectableSources.size === 0) return null;
    return Array.from(selectableSources).map((src) => {
      const vi = logicalToVisual(src);
      const pt = visualPoints[vi];
      if (!pt) return null;
      const isSelected = selectedPoint === src;
      const triPts = getTrianglePoints(pt.rect, pt.direction);
      return (
        <polygon
          key={`highlight-${src}`}
          points={trianglePointsToString(triPts)}
          fill={isSelected ? SELECTED_SOURCE_FILL : SOURCE_HIGHLIGHT_FILL}
          style={{
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            transition: 'opacity 0.12s ease',
          }}
        />
      );
    });
  }, [selectableSources, selectedPoint, visualPoints, gameState, logicalToVisual]);

  const pointClickAreas = useMemo(
    () =>
      visualPoints.map((pt) => {
        return (
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
        );
      }),
    [visualPoints, onPointClick, handlePointerDown, drag],
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

      const vi = logicalToVisual(i);
      const geo = visualPoints[vi];
      const isSelected = selectedPoint === i;
      const showCount = Math.min(count, MAX_VISIBLE_CHECKERS);

      const pointHeight = geo.rect.height;
      const idealStackH = (showCount - 1) * (checkerDiam + checkerGap);
      const maxStackH = pointHeight - checkerDiam * 0.5;
      const effectiveGap =
        idealStackH > maxStackH && showCount > 1
          ? Math.max(0, (maxStackH - (showCount - 1) * checkerDiam) / (showCount - 1))
          : checkerGap;

      for (let j = 0; j < showCount; j++) {
        const pos = getCheckerPosition(geo.rect, geo.direction, j, checkerDiam, effectiveGap);
        const size = checkerDiam;
        const isLast = j === showCount - 1;
        const arrived = isLast && animatingPoint === i;
        const captured = isLast && capturePoint === i;

        const gClasses = [arrived ? 'checker-arrived' : '', captured ? 'capture-flash' : '']
          .filter(Boolean)
          .join(' ');

        const stackDepth = showCount > 1 ? j / (showCount - 1) : 1;
        const shadowBlur = 1 + (1 - stackDepth) * 5;
        const shadowOpacity = 0.1 + (1 - stackDepth) * 0.3;
        const shadowOffset = 1 + (1 - stackDepth) * 3;

        els.push(
          <g key={`c-${i}-${j}`} className={gClasses}>
            <image
              x={pos.cx - size / 2}
              y={pos.cy - size / 2}
              width={size}
              height={size}
              href={pt.player === Player.One ? '/assets/stone-light.png' : '/assets/stone-dark.png'}
              className={isSelected ? 'checker-selected' : 'checker-normal'}
              style={{
                cursor: pt.player === gameState.currentPlayer ? 'grab' : 'default',
                transition: 'transform 0.14s ease, box-shadow 0.16s ease',
                filter: isSelected
                  ? `drop-shadow(0 0 3px rgba(251,191,36,0.45)) drop-shadow(0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity}))`
                  : `drop-shadow(0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity}))`,
              }}
              onClick={() => {
                if (pt.player === gameState.currentPlayer) {
                  onPointClick(i);
                }
              }}
              onPointerDown={(e) => handlePointerDown(i, e)}
            />
          </g>,
        );
      }

      if (count > MAX_VISIBLE_CHECKERS) {
        const lastPos = getCheckerPosition(
          geo.rect,
          geo.direction,
          showCount - 1,
          checkerDiam,
          checkerGap,
        );
        const badgeSize = Math.max(checkerDiam * 0.35, 14);
        els.push(
          <text
            key={`badge-${i}`}
            x={geo.rect.x + geo.rect.width / 2}
            y={
              lastPos.cy +
              (geo.direction === 'down'
                ? checkerDiam / 2 + badgeSize / 2
                : -checkerDiam / 2 - badgeSize / 2)
            }
            textAnchor="middle"
            dominantBaseline="central"
            fill="#d29a45"
            fontSize={`${badgeSize * 0.7}px`}
            fontWeight="700"
            style={{ pointerEvents: 'none' }}
          >
            +{count - MAX_VISIBLE_CHECKERS}
          </text>,
        );
      }
    }
    return els;
  }, [
    gameState,
    selectedPoint,
    visualPoints,
    checkerDiam,
    checkerGap,
    drag,
    onPointClick,
    handlePointerDown,
    logicalToVisual,
    animatingPoint,
    capturePoint,
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

    const renderBarChips = (player: Player.One | Player.Two, count: number, isTop: boolean) => {
      const showCount = Math.min(count, MAX_VISIBLE_BAR_CHIPS);
      const stoneHref =
        player === Player.One ? '/assets/stone-light.png' : '/assets/stone-dark.png';
      const barChipSize = checkerDiam * 0.72;

      const barStackH = (showCount - 1) * (barChipSize + checkerGap);
      const barMaxH = (isTop ? bh / 2 : bh / 2) - barChipSize * 1.2;
      const barGap =
        barStackH > barMaxH && showCount > 1
          ? Math.max(0, (barMaxH - (showCount - 1) * barChipSize) / (showCount - 1))
          : checkerGap;

      for (let i = 0; i < showCount; i++) {
        const cy = isTop
          ? barTopY + i * (barChipSize + barGap)
          : barBotY - i * (barChipSize + barGap);
        const isBarDragSourceCheck =
          (player === Player.One && isBarDragSource && gameState.currentPlayer === Player.One) ||
          (player === Player.Two && isBarDragSource && gameState.currentPlayer === Player.Two);
        const stackDepth = showCount > 1 ? i / (showCount - 1) : 1;
        const shadowBlur = 1 + (1 - stackDepth) * 4;
        const shadowOpacity = 0.08 + (1 - stackDepth) * 0.22;
        const shadowOffset = 1 + (1 - stackDepth) * 2;
        els.push(
          <image
            key={`bar-${player}-${i}`}
            x={barCx - barChipSize / 2}
            y={cy - barChipSize / 2}
            width={barChipSize}
            height={barChipSize}
            href={stoneHref}
            className={isBarDragSourceCheck ? 'checker-selected' : 'checker-normal'}
            style={{
              cursor: gameState.currentPlayer === player ? 'grab' : 'default',
              transition: 'transform 0.14s ease',
              filter: isBarDragSourceCheck
                ? `drop-shadow(0 0 3px rgba(251,191,36,0.45)) drop-shadow(0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity}))`
                : `drop-shadow(0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity}))`,
            }}
            onClick={() => {
              if (gameState.currentPlayer === player) onPointClick(BAR_INDEX);
            }}
            onPointerDown={(e) => handlePointerDown(BAR_INDEX, e)}
          />,
        );
      }

      if (count > MAX_VISIBLE_BAR_CHIPS) {
        const lastCy = isTop
          ? barTopY + (showCount - 1) * (barChipSize + barGap)
          : barBotY - (showCount - 1) * (barChipSize + barGap);
        els.push(
          <text
            key={`bar-badge-${player}`}
            x={barCx}
            y={lastCy + (isTop ? barChipSize / 2 + 10 : -barChipSize / 2 - 10)}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#d29a45"
            fontSize="11px"
            fontWeight="700"
            style={{ pointerEvents: 'none' }}
          >
            +{count - MAX_VISIBLE_BAR_CHIPS}
          </text>,
        );
      }
    };

    if (isFlipped) {
      renderBarChips(Player.Two, displayP2, true);
      renderBarChips(Player.One, displayP1, false);
    } else {
      renderBarChips(Player.One, displayP1, true);
      renderBarChips(Player.Two, displayP2, false);
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
    isFlipped,
  ]);

  const legalMoveIndicators = useMemo(() => {
    if (legalDestinations.size === 0) return null;
    return Array.from(legalDestinations).map((destIdx) => {
      if (destIdx < 0 || destIdx >= 24) return null;
      const vi = logicalToVisual(destIdx);
      const geo = visualPoints[vi];
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
          className="legal-move-dot"
          style={{ cursor: 'pointer' }}
          onClick={() => onPointClick(destIdx)}
          onPointerDown={(e) => e.stopPropagation()}
        />
      );
    });
  }, [legalDestinations, visualPoints, checkerDiam, onPointClick, logicalToVisual]);

  const guideLines = useMemo(() => {
    if (!selectedPoint && (!drag?.isDragging || !dragTargets.size)) return null;
    const sourceIdx = drag?.isDragging ? drag.from : selectedPoint;
    if (sourceIdx === null) return null;

    const targets = new Set<number>();
    if (drag?.isDragging) {
      dragTargets.forEach((t) => {
        if (t >= 0 && t < 24) targets.add(t);
      });
    } else {
      legalDestinations.forEach((t) => {
        if (t >= 0 && t < 24) targets.add(t);
      });
    }

    if (targets.size === 0) return null;

    let sourceCx: number, sourceCy: number;
    if (sourceIdx === BAR_INDEX) {
      sourceCx = geometry.bar.x + geometry.bar.width / 2;
      sourceCy = isFlipped ? bh * 0.75 : bh * 0.25;
    } else {
      const vi = logicalToVisual(sourceIdx);
      const srcGeo = visualPoints[vi];
      sourceCx = srcGeo.rect.x + srcGeo.rect.width / 2;
      sourceCy =
        srcGeo.rect.y +
        (srcGeo.direction === 'down' ? srcGeo.rect.height * 0.3 : srcGeo.rect.height * 0.7);
    }

    const paths: JSX.Element[] = [];
    targets.forEach((target) => {
      const vi = logicalToVisual(target);
      const tgtGeo = visualPoints[vi];
      const tgtCx = tgtGeo.rect.x + tgtGeo.rect.width / 2;
      const tgtCy =
        tgtGeo.rect.y +
        (tgtGeo.direction === 'down' ? tgtGeo.rect.height * 0.7 : tgtGeo.rect.height * 0.3);

      const midX = (sourceCx + tgtCx) / 2;
      const bend = Math.max(
        15,
        Math.abs(tgtCx - sourceCx) * 0.13 + Math.abs(tgtCy - sourceCy) * 0.1,
      );
      const direction = tgtCy >= sourceCy ? -1 : 1;
      const ctrlY = (sourceCy + tgtCy) / 2 + direction * bend;
      const d = `M ${sourceCx.toFixed(1)} ${sourceCy.toFixed(1)} Q ${midX.toFixed(1)} ${ctrlY.toFixed(1)} ${tgtCx.toFixed(1)} ${tgtCy.toFixed(1)}`;

      paths.push(
        <path
          key={`guide-${sourceIdx}-${target}`}
          d={d}
          fill="none"
          stroke="rgba(255, 224, 163, 0.7)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="6 7"
          className="guide-path"
        />,
      );
    });

    return <g style={{ pointerEvents: 'none' }}>{paths}</g>;
  }, [
    selectedPoint,
    drag,
    dragTargets,
    legalDestinations,
    visualPoints,
    geometry,
    bw,
    bh,
    logicalToVisual,
    isFlipped,
  ]);

  const dragTargetHighlights = useMemo((): ReactNode | null => {
    if (!drag?.isDragging || dragTargets.size === 0) return null;
    return Array.from(dragTargets).map((destIdx) => {
      if (destIdx < 0 || destIdx >= 24) return null;
      const vi = logicalToVisual(destIdx);
      const pt = visualPoints[vi];
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
  }, [drag, dragTargets, visualPoints, logicalToVisual]);

  const dragOverlay = useMemo((): ReactNode | null => {
    if (!drag) return null;

    const from = drag.from;
    let stoneHref: string;

    if (from >= 0 && from < 24) {
      const pt = gameState.board[from];
      if (!pt.player) return null;
      stoneHref = pt.player === Player.One ? '/assets/stone-light.png' : '/assets/stone-dark.png';
    } else if (from === BAR_INDEX) {
      stoneHref =
        gameState.currentPlayer === Player.One
          ? '/assets/stone-light.png'
          : '/assets/stone-dark.png';
    } else {
      return null;
    }

    const size = checkerDiam;
    return (
      <image
        href={stoneHref}
        x={drag.currentX - size / 2}
        y={drag.currentY - size / 2}
        width={size}
        height={size}
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
      width={bw}
      height={bh}
      className="game-board-svg"
      style={{
        width: '100%',
        height: 'auto',
        aspectRatio: `${bw}/${bh}`,
        display: 'block',
        touchAction: 'none',
      }}
      role="application"
      aria-label="Backgammon game board"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onLostPointerCapture={handleLostPointerCapture}
    >
      <defs>
        <linearGradient id="frame-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8e4a09" />
          <stop offset="100%" stopColor="#743807" />
        </linearGradient>

        <linearGradient id="wood-surface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
        </linearGradient>

        <linearGradient id="lighting" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>

        <radialGradient id="vignette" cx="50%" cy="50%" r="60%">
          <stop offset="40%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.24" />
        </radialGradient>

        <filter id="shadow-board">
          <feDropShadow dx="0" dy="12" stdDeviation="18" floodColor="#000" floodOpacity="0.34" />
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.16" />
        </filter>
      </defs>

      {/* Outer wood frame board shadow */}
      <rect
        x={-3}
        y={-3}
        width={bw + 6}
        height={bh + 6}
        rx={8}
        fill="none"
        filter="url(#shadow-board)"
        style={{ pointerEvents: 'none' }}
      />

      {/* Outer wood frame */}
      <rect
        x="0"
        y="0"
        width={bw}
        height={bh}
        rx="6"
        fill="url(#frame-base)"
        stroke="#5c2c03"
        strokeWidth={4}
        shapeRendering="crispEdges"
        style={{ filter: 'drop-shadow(0 1px 0 rgba(255,240,214,0.28))' }}
      />

      {/* Board surface: wood texture */}
      <image
        x={6}
        y={6}
        width={bw - 12}
        height={bh - 12}
        href="/assets/table-surface.jpg"
        preserveAspectRatio="xMidYMid slice"
        style={{ pointerEvents: 'none' }}
      />

      {/* Board surface darkening overlay */}
      <rect
        x={6}
        y={6}
        width={bw - 12}
        height={bh - 12}
        rx={4}
        fill="url(#wood-surface)"
        style={{ pointerEvents: 'none' }}
      />

      {/* Playing field inner border */}
      <rect
        x={6}
        y={6}
        width={bw - 12}
        height={bh - 12}
        rx={4}
        fill="none"
        stroke="#1f130b"
        strokeWidth={2}
        style={{ pointerEvents: 'none' }}
      />

      {triangleElements}

      {/* Lighting gradient over the board */}
      <rect
        x={6}
        y={6}
        width={bw - 12}
        height={bh - 12}
        rx={4}
        fill="url(#lighting)"
        style={{ pointerEvents: 'none', mixBlendMode: 'overlay' as any }}
      />

      {/* Vignette shadow */}
      <rect
        x={6}
        y={6}
        width={bw - 12}
        height={bh - 12}
        rx={4}
        fill="url(#vignette)"
        style={{ pointerEvents: 'none' }}
      />

      {/* Inner highlight */}
      <rect
        x={7}
        y={7}
        width={bw - 14}
        height={bh - 14}
        rx={3}
        fill="none"
        stroke="rgba(255,236,206,0.1)"
        strokeWidth={1}
        style={{ pointerEvents: 'none' }}
      />
      {/* Bar background */}
      <rect
        x={geometry.bar.x}
        y={8}
        width={geometry.bar.width}
        height={bh - 16}
        fill="rgba(0,0,0,0.32)"
      />
      <rect
        x={geometry.bar.x}
        y={8}
        width={geometry.bar.width}
        height={bh - 16}
        fill="url(#wood-surface)"
        style={{ pointerEvents: 'none' }}
      />
      <line
        x1={geometry.bar.x}
        y1={8}
        x2={geometry.bar.x}
        y2={bh - 8}
        stroke="rgba(0,0,0,0.34)"
        strokeWidth={1}
      />
      <line
        x1={geometry.bar.x + geometry.bar.width}
        y1={8}
        x2={geometry.bar.x + geometry.bar.width}
        y2={bh - 8}
        stroke="rgba(0,0,0,0.34)"
        strokeWidth={1}
      />
      {sourceHighlightElements}
      {pointClickAreas}
      {checkerElements}
      {barElements}
      {legalMoveIndicators}
      {guideLines}
      {dragTargetHighlights}
      {dragOverlay}
    </svg>
  );
}
