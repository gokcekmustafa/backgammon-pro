import { describe, it, expect } from 'vitest';
import { calculateLayout, getOrientation, getBreakpoint, createViewport } from './calculateLayout';

describe('getOrientation', () => {
  it('returns landscape when width >= height', () => {
    expect(getOrientation(1920, 1080)).toBe('landscape');
  });

  it('returns portrait when height > width', () => {
    expect(getOrientation(768, 1024)).toBe('portrait');
  });

  it('returns landscape for square viewport', () => {
    expect(getOrientation(100, 100)).toBe('landscape');
  });
});

describe('createViewport', () => {
  it('creates viewport with correct orientation', () => {
    const result = createViewport(1920, 1080);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.orientation).toBe('landscape');
  });

  it('creates portrait viewport', () => {
    const result = createViewport(768, 1024);
    expect(result.orientation).toBe('portrait');
  });
});

describe('getBreakpoint', () => {
  it('returns desktop breakpoint for 1920x1080', () => {
    const result = getBreakpoint({ width: 1920, height: 1080, orientation: 'landscape' });
    expect(result.deviceType).toBe('desktop');
    expect(result.minWidth).toBe(1440);
  });

  it('returns laptop breakpoint for 1366x768', () => {
    const result = getBreakpoint({ width: 1366, height: 768, orientation: 'landscape' });
    expect(result.deviceType).toBe('laptop');
  });

  it('returns tablet breakpoint for 1024x768', () => {
    const result = getBreakpoint({ width: 1024, height: 768, orientation: 'landscape' });
    expect(result.deviceType).toBe('tablet');
  });

  it('returns mobile breakpoint for 480x320', () => {
    const result = getBreakpoint({ width: 480, height: 320, orientation: 'landscape' });
    expect(result.deviceType).toBe('mobile');
  });

  it('overrides with explicit device type', () => {
    const result = getBreakpoint({ width: 1920, height: 1080, orientation: 'landscape' }, 'mobile');
    expect(result.deviceType).toBe('mobile');
  });
});

describe('calculateLayout', () => {
  it('returns complete layout for desktop', () => {
    const layout = calculateLayout(1920, 1080);
    expect(layout.viewport.width).toBe(1920);
    expect(layout.viewport.height).toBe(1080);
    expect(layout.breakpoint.deviceType).toBe('desktop');
    expect(layout.scale.value).toBeGreaterThan(0);
    expect(layout.safeArea.availableWidth).toBe(1920);
    expect(layout.board.points).toHaveLength(24);
    expect(layout.board.dimensions.width).toBeGreaterThan(0);
  });

  it('returns complete layout for mobile', () => {
    const layout = calculateLayout(375, 667);
    expect(layout.breakpoint.deviceType).toBe('mobile');
    expect(layout.board.points).toHaveLength(24);
  });

  it('returns complete layout for tablet portrait', () => {
    const layout = calculateLayout(768, 1024);
    expect(layout.board.points).toHaveLength(24);
  });

  it('returns layout with all required top-level keys', () => {
    const layout = calculateLayout(1920, 1080);
    expect(layout).toHaveProperty('viewport');
    expect(layout).toHaveProperty('breakpoint');
    expect(layout).toHaveProperty('scale');
    expect(layout).toHaveProperty('safeArea');
    expect(layout).toHaveProperty('board');
  });

  it('board contains all required sub-keys', () => {
    const layout = calculateLayout(1920, 1080);
    expect(layout.board).toHaveProperty('dimensions');
    expect(layout.board).toHaveProperty('points');
    expect(layout.board).toHaveProperty('bar');
    expect(layout.board).toHaveProperty('homeBoardTop');
    expect(layout.board).toHaveProperty('homeBoardBottom');
    expect(layout.board).toHaveProperty('bearingOffTop');
    expect(layout.board).toHaveProperty('bearingOffBottom');
  });

  it('handles very small viewport without crashing', () => {
    const layout = calculateLayout(320, 480);
    expect(layout.board.points).toHaveLength(24);
  });

  it('handles very large viewport without crashing', () => {
    const layout = calculateLayout(3840, 2160);
    expect(layout.board.points).toHaveLength(24);
  });

  it('is a pure function (multiple calls return identical results)', () => {
    const a = calculateLayout(1920, 1080);
    const b = calculateLayout(1920, 1080);
    expect(a).toEqual(b);
  });
});
