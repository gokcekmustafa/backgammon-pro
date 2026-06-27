export type PointDirection = 'up' | 'down';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  cx: number;
  cy: number;
  radius: number;
}

export interface PointGeometry {
  index: number;
  rect: Rect;
  direction: PointDirection;
  isTopHalf: boolean;
}

export interface BoardGeometry {
  boardWidth: number;
  boardHeight: number;
  pointWidth: number;
  pointHeight: number;
  halfHeight: number;
  leftTableWidth: number;
  rightTableWidth: number;
  barWidth: number;
  points: PointGeometry[];
  bar: Rect;
}

export interface ColorScheme {
  boardFill: string;
  boardStroke: string;
  pointColors: [string, string];
  barFill: string;
  homeBoardFill: string;
}

export interface CheckerPlacement {
  pointIndex: number;
  count: number;
  color: string;
  strokeColor?: string;
}

export interface RenderOptions {
  colorScheme?: Partial<ColorScheme>;
  checkerRadius?: number;
  checkerGap?: number;
  cornerRadius?: number;
  showHomeBoardShading?: boolean;
}

export interface BoardRendererResult {
  svg: string;
  geometry: BoardGeometry;
}
