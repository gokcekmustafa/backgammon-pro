import { describe, it, expect } from 'vitest';
import { calculateSafeArea, getSafeAreaInsets } from './calculateSafeArea';
import type { Viewport } from './types';

describe('getSafeAreaInsets', () => {
  it('returns no insets for desktop', () => {
    const viewport: Viewport = { width: 1920, height: 1080, orientation: 'landscape' };
    const insets = getSafeAreaInsets(viewport, 'desktop');
    expect(insets).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('returns no insets for laptop', () => {
    const viewport: Viewport = { width: 1366, height: 768, orientation: 'landscape' };
    const insets = getSafeAreaInsets(viewport, 'laptop');
    expect(insets).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('returns vertical insets for tablet', () => {
    const viewport: Viewport = { width: 768, height: 1024, orientation: 'portrait' };
    const insets = getSafeAreaInsets(viewport, 'tablet');
    expect(insets).toEqual({ top: 20, right: 0, bottom: 20, left: 0 });
  });

  it('returns larger insets for mobile', () => {
    const viewport: Viewport = { width: 375, height: 667, orientation: 'portrait' };
    const insets = getSafeAreaInsets(viewport, 'mobile');
    expect(insets).toEqual({ top: 44, right: 0, bottom: 34, left: 0 });
  });
});

describe('calculateSafeArea', () => {
  it('returns full available area for desktop', () => {
    const viewport: Viewport = { width: 1920, height: 1080, orientation: 'landscape' };
    const result = calculateSafeArea(viewport, 'desktop');
    expect(result.availableWidth).toBe(1920);
    expect(result.availableHeight).toBe(1080);
  });

  it('reduces available height for mobile', () => {
    const viewport: Viewport = { width: 375, height: 667, orientation: 'portrait' };
    const result = calculateSafeArea(viewport, 'mobile');
    expect(result.availableWidth).toBe(375);
    expect(result.availableHeight).toBe(667 - 44 - 34);
  });

  it('returns correct insets in result', () => {
    const viewport: Viewport = { width: 1024, height: 1366, orientation: 'portrait' };
    const result = calculateSafeArea(viewport, 'tablet');
    expect(result.insets.top).toBe(20);
    expect(result.insets.bottom).toBe(20);
  });
});
