import { describe, it, expect } from 'vitest';
import {
  createBoardGeometry,
  getTrianglePoints,
  trianglePointsToString,
  getCheckerPosition,
  getCheckerPositions,
  computeCheckerDiameter,
  TOTAL_POINTS,
  POINTS_PER_HALF,
} from './Geometry';
import type { Rect } from './types';

describe('createBoardGeometry', () => {
  it('creates geometry with 24 points', () => {
    const geo = createBoardGeometry(800);
    expect(geo.points).toHaveLength(TOTAL_POINTS);
  });

  it('creates geometry with correct board dimensions', () => {
    const geo = createBoardGeometry(800);
    expect(geo.boardWidth).toBe(800);
    expect(geo.boardHeight).toBeGreaterThan(0);
  });

  it('accepts explicit height', () => {
    const geo = createBoardGeometry(800, 400);
    expect(geo.boardHeight).toBe(400);
  });

  it('assigns all indices 0-23 with correct visual layout', () => {
    const geo = createBoardGeometry(800);
    const indices = geo.points.map((p) => p.index);
    indices.sort((a, b) => a - b);
    expect(indices).toEqual(Array.from({ length: 24 }, (_, i) => i));
    // Top-left group (visual 0-5): indices 12, 13, 14, 15, 16, 17
    for (let i = 0; i < 6; i++) {
      expect(geo.points[i].index).toBe(12 + i);
    }
    // Top-right group (visual 6-11): indices 18, 19, 20, 21, 22, 23
    for (let i = 0; i < 6; i++) {
      expect(geo.points[6 + i].index).toBe(18 + i);
    }
    // Bottom-left group (visual 12-17): indices 11, 10, 9, 8, 7, 6
    for (let i = 0; i < 6; i++) {
      expect(geo.points[12 + i].index).toBe(11 - i);
    }
    // Bottom-right group (visual 18-23): indices 5, 4, 3, 2, 1, 0
    for (let i = 0; i < 6; i++) {
      expect(geo.points[18 + i].index).toBe(5 - i);
    }
  });

  it('positions top half points at y=0', () => {
    const geo = createBoardGeometry(800);
    const top = geo.points.filter((p) => p.isTopHalf);
    expect(top).toHaveLength(12);
    top.forEach((p) => {
      expect(p.rect.y).toBe(0);
    });
  });

  it('positions bottom half points at halfHeight', () => {
    const geo = createBoardGeometry(800);
    const bottom = geo.points.filter((p) => !p.isTopHalf);
    expect(bottom).toHaveLength(12);
    bottom.forEach((p) => {
      expect(p.rect.y).toBe(geo.halfHeight);
    });
  });

  it('gives top points down direction', () => {
    const geo = createBoardGeometry(800);
    geo.points
      .filter((p) => p.isTopHalf)
      .forEach((p) => {
        expect(p.direction).toBe('down');
      });
  });

  it('gives bottom points up direction', () => {
    const geo = createBoardGeometry(800);
    geo.points
      .filter((p) => !p.isTopHalf)
      .forEach((p) => {
        expect(p.direction).toBe('up');
      });
  });

  it('positions bar at correct x', () => {
    const geo = createBoardGeometry(800);
    expect(geo.bar.x).toBe(geo.leftTableWidth);
    expect(geo.bar.width).toBe(geo.barWidth);
    expect(geo.bar.height).toBe(geo.boardHeight);
  });

  it('produces pointWidth consistent with left table width', () => {
    const geo = createBoardGeometry(800);
    expect(geo.pointWidth * POINTS_PER_HALF).toBe(geo.leftTableWidth);
  });

  it('produces consistent geometry for same input', () => {
    const a = createBoardGeometry(800);
    const b = createBoardGeometry(800);
    expect(a).toEqual(b);
  });

  it('handles zero width gracefully', () => {
    const geo = createBoardGeometry(0);
    expect(geo.boardWidth).toBe(0);
    expect(geo.points).toHaveLength(TOTAL_POINTS);
  });
});

describe('getTrianglePoints', () => {
  const rect: Rect = { x: 0, y: 0, width: 60, height: 200 };

  it('returns 3 points for down direction', () => {
    const pts = getTrianglePoints(rect, 'down');
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1]).toEqual({ x: 60, y: 0 });
    expect(pts[2]).toEqual({ x: 30, y: 200 });
  });

  it('returns 3 points for up direction', () => {
    const pts = getTrianglePoints(rect, 'up');
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ x: 30, y: 0 });
    expect(pts[1]).toEqual({ x: 60, y: 200 });
    expect(pts[2]).toEqual({ x: 0, y: 200 });
  });

  it('handles non-zero origin', () => {
    const r: Rect = { x: 100, y: 50, width: 40, height: 100 };
    const pts = getTrianglePoints(r, 'down');
    expect(pts[0]).toEqual({ x: 100, y: 50 });
    expect(pts[1]).toEqual({ x: 140, y: 50 });
    expect(pts[2]).toEqual({ x: 120, y: 150 });
  });
});

describe('trianglePointsToString', () => {
  it('formats points as SVG polygon string', () => {
    const result = trianglePointsToString([
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 30, y: 200 },
    ]);
    expect(result).toBe('0,0 60,0 30,200');
  });
});

describe('getCheckerPosition', () => {
  const rect: Rect = { x: 0, y: 0, width: 60, height: 200 };
  const diameter = 40;
  const gap = 2;

  it('positions first checker near top for down direction', () => {
    const pos = getCheckerPosition(rect, 'down', 0, diameter, gap);
    expect(pos.cx).toBe(30);
    expect(pos.cy).toBe(20);
    expect(pos.radius).toBe(20);
  });

  it('stacks checkers downward for down direction', () => {
    const pos0 = getCheckerPosition(rect, 'down', 0, diameter, gap);
    const pos1 = getCheckerPosition(rect, 'down', 1, diameter, gap);
    expect(pos1.cy - pos0.cy).toBe(diameter + gap);
  });

  it('positions first checker near bottom for up direction', () => {
    const pos = getCheckerPosition(rect, 'up', 0, diameter, gap);
    expect(pos.cx).toBe(30);
    expect(pos.cy).toBe(200 - 20);
  });

  it('stacks checkers upward for up direction', () => {
    const pos0 = getCheckerPosition(rect, 'up', 0, diameter, gap);
    const pos1 = getCheckerPosition(rect, 'up', 1, diameter, gap);
    expect(pos0.cy - pos1.cy).toBe(diameter + gap);
  });

  it('creates checker with correct radius', () => {
    const pos = getCheckerPosition(rect, 'down', 0, 30, 2);
    expect(pos.radius).toBe(15);
  });
});

describe('getCheckerPositions', () => {
  const rect: Rect = { x: 0, y: 0, width: 60, height: 200 };

  it('returns correct count', () => {
    const positions = getCheckerPositions(rect, 'down', 5, 30, 2);
    expect(positions).toHaveLength(5);
  });

  it('returns distinct positions', () => {
    const positions = getCheckerPositions(rect, 'down', 3, 30, 2);
    expect(positions[0].cy).not.toBe(positions[1].cy);
    expect(positions[1].cy).not.toBe(positions[2].cy);
  });

  it('returns empty array for zero count', () => {
    const positions = getCheckerPositions(rect, 'down', 0, 30, 2);
    expect(positions).toHaveLength(0);
  });
});

describe('computeCheckerDiameter', () => {
  it('returns diameter proportional to point width', () => {
    expect(computeCheckerDiameter(60, 0.75)).toBe(45);
    expect(computeCheckerDiameter(60, 0.8)).toBe(48);
  });

  it('uses default padding ratio', () => {
    expect(computeCheckerDiameter(60)).toBe(45);
  });
});
