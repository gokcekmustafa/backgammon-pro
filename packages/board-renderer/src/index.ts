export type {
  PointDirection,
  Point,
  Rect,
  Circle,
  PointGeometry,
  BoardGeometry,
  ColorScheme,
  CheckerPlacement,
  RenderOptions,
  BoardRendererResult,
} from './types';

export {
  createBoardGeometry,
  getTrianglePoints,
  trianglePointsToString,
  getCheckerPosition,
  getCheckerPositions,
  computeCheckerDiameter,
  DEFAULT_BOARD_ASPECT_RATIO,
  LEFT_TABLE_RATIO,
  RIGHT_TABLE_RATIO,
  BAR_RATIO,
  POINTS_PER_HALF,
  TOTAL_POINTS,
} from './Geometry';

export {
  svgBoardBackground,
  svgHomeBoard,
  svgTriangle,
  svgBar,
  svgChecker,
  svgRenderPoints,
  svgRenderCheckers,
  buildSvgDocument,
  svgRenderBoard,
  DEFAULT_COLORS,
} from './SvgBoard';

export {
  renderBoard,
  renderBoardWithCheckers,
  DEFAULT_CHECKER_GAP,
  DEFAULT_CHECKER_PADDING_RATIO,
} from './BoardRenderer';
