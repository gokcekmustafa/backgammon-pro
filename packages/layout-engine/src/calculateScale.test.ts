import { describe, it, expect } from 'vitest';
import {
  calculateScale,
  getDeviceType,
  getBoardOccupancyFraction,
  boardWidthFromScale,
  boardHeightFromScale,
} from './calculateScale';

describe('getDeviceType', () => {
  it('returns desktop for wide viewports', () => {
    expect(getDeviceType({ width: 1920, height: 1080, orientation: 'landscape' })).toBe('desktop');
  });

  it('returns laptop for mid-range viewports', () => {
    expect(getDeviceType({ width: 1366, height: 768, orientation: 'landscape' })).toBe('laptop');
  });

  it('returns tablet for 1024x768 landscape', () => {
    expect(getDeviceType({ width: 1024, height: 768, orientation: 'landscape' })).toBe('tablet');
  });

  it('returns mobile for narrow landscape', () => {
    expect(getDeviceType({ width: 480, height: 320, orientation: 'landscape' })).toBe('mobile');
  });

  it('returns mobile for small portrait', () => {
    expect(getDeviceType({ width: 375, height: 667, orientation: 'portrait' })).toBe('mobile');
  });

  it('returns tablet for 768x1024 portrait', () => {
    expect(getDeviceType({ width: 768, height: 1024, orientation: 'portrait' })).toBe('tablet');
  });
});

describe('getBoardOccupancyFraction', () => {
  it('returns desktop occupancy', () => {
    expect(getBoardOccupancyFraction({ width: 1920, height: 1080, orientation: 'landscape' })).toBe(
      0.36,
    );
  });

  it('returns mobile occupancy', () => {
    expect(
      getBoardOccupancyFraction({ width: 480, height: 320, orientation: 'landscape' }, 'mobile'),
    ).toBe(1.0);
  });
});

describe('calculateScale', () => {
  it('returns scale near 1.0 for desktop', () => {
    const result = calculateScale({ width: 1920, height: 1080, orientation: 'landscape' });
    expect(result.value).toBeGreaterThan(0.8);
    expect(result.value).toBeLessThan(1.2);
  });

  it('returns smaller scale for mobile', () => {
    const desktop = calculateScale({ width: 1920, height: 1080, orientation: 'landscape' });
    const mobile = calculateScale({ width: 480, height: 320, orientation: 'landscape' });
    expect(mobile.value).toBeLessThan(desktop.value);
  });

  it('clamps scale to minimum', () => {
    const result = calculateScale({ width: 200, height: 200, orientation: 'landscape' });
    expect(result.value).toBe(result.min);
  });

  it('clamps scale to maximum', () => {
    const result = calculateScale({ width: 4000, height: 4000, orientation: 'landscape' });
    expect(result.value).toBe(result.max);
  });

  it('returns scale with min and max bounds', () => {
    const result = calculateScale({ width: 1920, height: 1080, orientation: 'landscape' });
    expect(result.min).toBe(0.3);
    expect(result.max).toBe(1.5);
  });
});

describe('boardWidthFromScale', () => {
  it('returns reference board width at scale 1.0', () => {
    expect(boardWidthFromScale(1.0)).toBe(700);
  });

  it('scales linearly', () => {
    expect(boardWidthFromScale(0.5)).toBe(350);
    expect(boardWidthFromScale(2.0)).toBe(1400);
  });
});

describe('boardHeightFromScale', () => {
  it('returns correct height for given scale', () => {
    const height = boardHeightFromScale(1.0);
    expect(height).toBeCloseTo(700 / 2.15, 2);
  });
});
