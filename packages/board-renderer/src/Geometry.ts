import type { Point, Rect, PointDirection, PointGeometry, BoardGeometry, Circle } from './types';

export const DEFAULT_BOARD_ASPECT_RATIO = 572 / 390;
export const LEFT_TABLE_RATIO = 0.445;
export const RIGHT_TABLE_RATIO = 0.445;
export const BAR_RATIO = 1 - LEFT_TABLE_RATIO - RIGHT_TABLE_RATIO;
export const POINTS_PER_HALF = 6;
export const TOTAL_POINTS = 24;

export function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

export function createBoardGeometry(boardWidth: number, boardHeight?: number): BoardGeometry {
  const height = boardHeight ?? boardWidth / DEFAULT_BOARD_ASPECT_RATIO;

  const leftTableWidth = boardWidth * LEFT_TABLE_RATIO;
  const rightTableWidth = boardWidth * RIGHT_TABLE_RATIO;
  const barWidth = boardWidth * BAR_RATIO;
  const halfHeight = height / 2;
  const pointWidth = leftTableWidth / POINTS_PER_HALF;

  const points: PointGeometry[] = [];

  const barX = leftTableWidth;
  const rightTableX = barX + barWidth;

  for (let i = 0; i < POINTS_PER_HALF; i++) {
    points.push({
      index: POINTS_PER_HALF * 2 + i,
      rect: rect(i * pointWidth, 0, pointWidth, halfHeight),
      direction: 'down',
      isTopHalf: true,
    });
  }

  for (let i = 0; i < POINTS_PER_HALF; i++) {
    points.push({
      index: POINTS_PER_HALF * 3 + i,
      rect: rect(rightTableX + i * pointWidth, 0, pointWidth, halfHeight),
      direction: 'down',
      isTopHalf: true,
    });
  }

  for (let i = 0; i < POINTS_PER_HALF; i++) {
    points.push({
      index: POINTS_PER_HALF * 2 - 1 - i,
      rect: rect(i * pointWidth, halfHeight, pointWidth, halfHeight),
      direction: 'up',
      isTopHalf: false,
    });
  }

  for (let i = 0; i < POINTS_PER_HALF; i++) {
    points.push({
      index: POINTS_PER_HALF - 1 - i,
      rect: rect(rightTableX + i * pointWidth, halfHeight, pointWidth, halfHeight),
      direction: 'up',
      isTopHalf: false,
    });
  }

  const bar: Rect = rect(barX, 0, barWidth, height);

  return {
    boardWidth,
    boardHeight: height,
    pointWidth,
    pointHeight: halfHeight,
    halfHeight,
    leftTableWidth,
    rightTableWidth,
    barWidth,
    points,
    bar,
  };
}

export function getTrianglePoints(rect: Rect, direction: PointDirection): Point[] {
  const { x, y, width, height } = rect;

  if (direction === 'down') {
    return [
      { x, y },
      { x: x + width, y },
      { x: x + width / 2, y: y + height },
    ];
  }

  return [
    { x: x + width / 2, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

export function trianglePointsToString(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

export function getCheckerPosition(
  rect: Rect,
  direction: PointDirection,
  stackIndex: number,
  checkerDiameter: number,
  gap: number,
): Circle {
  const radius = checkerDiameter / 2;
  const cx = rect.x + rect.width / 2;

  let cy: number;

  if (direction === 'down') {
    cy = rect.y + radius + stackIndex * (checkerDiameter + gap);
  } else {
    cy = rect.y + rect.height - radius - stackIndex * (checkerDiameter + gap);
  }

  return { cx, cy, radius };
}

export function getCheckerPositions(
  rect: Rect,
  direction: PointDirection,
  count: number,
  checkerDiameter: number,
  gap: number,
): Circle[] {
  const positions: Circle[] = [];

  for (let i = 0; i < count; i++) {
    positions.push(getCheckerPosition(rect, direction, i, checkerDiameter, gap));
  }

  return positions;
}

export function computeCheckerDiameter(pointWidth: number, paddingRatio: number = 0.75): number {
  return pointWidth * paddingRatio;
}
