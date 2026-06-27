import type { Viewport, DeviceType, Scale } from './types';

export const DEFAULT_CONSTRAINTS = {
  referenceWidth: 1920,
  referenceHeight: 1080,
  referenceBoardWidth: 700,
  boardAspectRatio: 2.15,
  boardOccupancyFraction: 0.36,
  scaleMin: 0.3,
  scaleMax: 1.5,
};

const DEVICE_OCCUPANCY: Record<DeviceType, number> = {
  desktop: 0.36,
  laptop: 0.4,
  tablet: 0.65,
  mobile: 1.0,
};

export function getDeviceType(viewport: Viewport): DeviceType {
  if (viewport.orientation === 'portrait' && viewport.width <= 480) {
    return 'mobile';
  }
  if (viewport.orientation === 'landscape' && viewport.width <= 768) {
    return 'mobile';
  }
  if (viewport.width >= 1440) {
    return 'desktop';
  }
  if (viewport.width >= 1025) {
    return 'laptop';
  }
  return 'tablet';
}

export function getBoardOccupancyFraction(viewport: Viewport, deviceType?: DeviceType): number {
  const resolved = deviceType ?? getDeviceType(viewport);
  return DEVICE_OCCUPANCY[resolved];
}

export function calculateScale(viewport: Viewport, deviceType?: DeviceType): Scale {
  const occupancy = getBoardOccupancyFraction(viewport, deviceType);

  const availableWidth = viewport.width * occupancy;
  const availableHeight = viewport.height * 0.7;

  const maxBoardWidthFromWidth = availableWidth;
  const maxBoardWidthFromHeight = availableHeight * DEFAULT_CONSTRAINTS.boardAspectRatio;

  const boardWidth = Math.min(maxBoardWidthFromWidth, maxBoardWidthFromHeight);

  const raw = boardWidth / DEFAULT_CONSTRAINTS.referenceBoardWidth;

  const value = Math.min(Math.max(raw, DEFAULT_CONSTRAINTS.scaleMin), DEFAULT_CONSTRAINTS.scaleMax);

  return {
    value,
    min: DEFAULT_CONSTRAINTS.scaleMin,
    max: DEFAULT_CONSTRAINTS.scaleMax,
  };
}

export function boardWidthFromScale(scale: number): number {
  return scale * DEFAULT_CONSTRAINTS.referenceBoardWidth;
}

export function boardHeightFromScale(scale: number): number {
  return boardWidthFromScale(scale) / DEFAULT_CONSTRAINTS.boardAspectRatio;
}
