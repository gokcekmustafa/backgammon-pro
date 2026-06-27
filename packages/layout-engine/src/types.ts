export type Orientation = 'landscape' | 'portrait';

export type DeviceType = 'desktop' | 'laptop' | 'tablet' | 'mobile';

export type Half = 'top' | 'bottom';

export type PointDirection = 'up' | 'down';

export interface Viewport {
  width: number;
  height: number;
  orientation: Orientation;
}

export interface Breakpoint {
  minWidth: number;
  maxWidth: number | null;
  deviceType: DeviceType;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SafeArea {
  insets: SafeAreaInsets;
  availableWidth: number;
  availableHeight: number;
}

export interface Scale {
  value: number;
  min: number;
  max: number;
}

export interface BoardDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface BoardPoint {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  half: Half;
  direction: PointDirection;
  isTopHalf: boolean;
}

export interface BoardRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoardLayout {
  dimensions: BoardDimensions;
  points: BoardPoint[];
  bar: BoardRegion;
  homeBoardTop: BoardRegion;
  homeBoardBottom: BoardRegion;
  bearingOffTop: BoardRegion;
  bearingOffBottom: BoardRegion;
}

export interface Layout {
  viewport: Viewport;
  breakpoint: Breakpoint;
  scale: Scale;
  safeArea: SafeArea;
  board: BoardLayout;
}

export interface LayoutConstraints {
  referenceWidth: number;
  referenceHeight: number;
  referenceBoardWidth: number;
  boardAspectRatio: number;
  boardOccupancyFraction: number;
  scaleMin: number;
  scaleMax: number;
}

export interface LayoutOptions {
  deviceType?: DeviceType;
  constraints?: Partial<LayoutConstraints>;
}
