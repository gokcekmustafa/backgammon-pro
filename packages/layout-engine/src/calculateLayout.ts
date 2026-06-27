import type { Viewport, Orientation, DeviceType, Breakpoint, Layout, LayoutOptions } from './types';
import { calculateScale, getDeviceType } from './calculateScale';
import { calculateSafeArea } from './calculateSafeArea';
import { calculateBoard } from './calculateBoard';

const BREAKPOINTS: Breakpoint[] = [
  { minWidth: 1440, maxWidth: null, deviceType: 'desktop' },
  { minWidth: 1025, maxWidth: 1439, deviceType: 'laptop' },
  { minWidth: 768, maxWidth: 1024, deviceType: 'tablet' },
  { minWidth: 481, maxWidth: 767, deviceType: 'mobile' },
  { minWidth: 0, maxWidth: 480, deviceType: 'mobile' },
];

export function getOrientation(width: number, height: number): Orientation {
  return width >= height ? 'landscape' : 'portrait';
}

export function getBreakpoint(viewport: Viewport, deviceType?: DeviceType): Breakpoint {
  if (deviceType) {
    const match = BREAKPOINTS.find((bp) => bp.deviceType === deviceType);
    if (match) return match;
  }

  const device = getDeviceType(viewport);
  const match = BREAKPOINTS.find((bp) => bp.deviceType === device);
  if (match) return match;

  return BREAKPOINTS[BREAKPOINTS.length - 1];
}

export function createViewport(width: number, height: number): Viewport {
  return {
    width,
    height,
    orientation: getOrientation(width, height),
  };
}

export function calculateLayout(width: number, height: number, options?: LayoutOptions): Layout {
  const viewport = createViewport(width, height);

  const deviceType = options?.deviceType ?? getDeviceType(viewport);

  const scale = calculateScale(viewport, deviceType);
  const safeArea = calculateSafeArea(viewport, deviceType);
  const board = calculateBoard(viewport, deviceType);
  const breakpoint = getBreakpoint(viewport, deviceType);

  return {
    viewport,
    breakpoint,
    scale,
    safeArea,
    board,
  };
}
