import { describe, it, expect } from 'vitest';
import { calculateBoard } from './calculateBoard';
import type { Viewport } from './types';

describe('calculateBoard', () => {
  const desktopViewport: Viewport = { width: 1920, height: 1080, orientation: 'landscape' };

  it('returns correct number of points', () => {
    const result = calculateBoard(desktopViewport);
    expect(result.points).toHaveLength(24);
  });

  it('returns points with sequential indices 0-23', () => {
    const result = calculateBoard(desktopViewport);
    const indices = result.points.map((p) => p.index);
    expect(indices).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });

  it('returns board dimensions with correct aspect ratio', () => {
    const result = calculateBoard(desktopViewport);
    expect(result.dimensions.width).toBeGreaterThan(0);
    expect(result.dimensions.height).toBeGreaterThan(0);
    expect(result.dimensions.aspectRatio).toBeCloseTo(
      result.dimensions.width / result.dimensions.height,
      2,
    );
  });

  it('positions top half points at y=0', () => {
    const result = calculateBoard(desktopViewport);
    const topPoints = result.points.filter((p) => p.isTopHalf);
    expect(topPoints.length).toBe(12);
    topPoints.forEach((p) => {
      expect(p.y).toBe(0);
    });
  });

  it('positions top points with down direction', () => {
    const result = calculateBoard(desktopViewport);
    const topPoints = result.points.filter((p) => p.isTopHalf);
    topPoints.forEach((p) => {
      expect(p.direction).toBe('down');
    });
  });

  it('positions bottom points with up direction', () => {
    const result = calculateBoard(desktopViewport);
    const bottomPoints = result.points.filter((p) => !p.isTopHalf);
    bottomPoints.forEach((p) => {
      expect(p.direction).toBe('up');
    });
  });

  it('positions bottom half points at half height', () => {
    const result = calculateBoard(desktopViewport);
    const bottomPoints = result.points.filter((p) => !p.isTopHalf);
    const halfHeight = result.dimensions.height / 2;
    bottomPoints.forEach((p) => {
      expect(p.y).toBe(halfHeight);
    });
  });

  it('has equal point width for all points', () => {
    const result = calculateBoard(desktopViewport);
    const widths = result.points.map((p) => p.width);
    widths.forEach((w) => {
      expect(w).toBeCloseTo(widths[0], 2);
    });
  });

  it('returns bar region spanning full height', () => {
    const result = calculateBoard(desktopViewport);
    expect(result.bar.height).toBe(result.dimensions.height);
    expect(result.bar.width).toBeGreaterThan(0);
    expect(result.bar.y).toBe(0);
  });

  it('returns bearing off regions at top and bottom edges', () => {
    const result = calculateBoard(desktopViewport);
    expect(result.bearingOffTop.y).toBe(0);
    expect(result.bearingOffBottom.y + result.bearingOffBottom.height).toBe(
      result.dimensions.height,
    );
  });

  it('returns home board regions on the right side', () => {
    const result = calculateBoard(desktopViewport);
    expect(result.homeBoardTop.x).toBeGreaterThan(result.dimensions.width / 3);
    expect(result.homeBoardBottom.x).toBeGreaterThan(result.dimensions.width / 3);
  });

  it('returns smaller board for mobile viewport', () => {
    const mobileViewport: Viewport = { width: 480, height: 320, orientation: 'landscape' };
    const desktop = calculateBoard(desktopViewport);
    const mobile = calculateBoard(mobileViewport);
    expect(mobile.dimensions.width).toBeLessThan(desktop.dimensions.width);
    expect(mobile.dimensions.height).toBeLessThan(desktop.dimensions.height);
  });

  it('produces consistent results for same input', () => {
    const a = calculateBoard(desktopViewport);
    const b = calculateBoard(desktopViewport);
    expect(a).toEqual(b);
  });
});
