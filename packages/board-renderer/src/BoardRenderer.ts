import type {
  BoardGeometry,
  ColorScheme,
  CheckerPlacement,
  RenderOptions,
  BoardRendererResult,
} from './types';
import { createBoardGeometry, computeCheckerDiameter } from './Geometry';
import { svgRenderBoard, svgRenderCheckers, buildSvgDocument, DEFAULT_COLORS } from './SvgBoard';

export const DEFAULT_CHECKER_GAP = 2;
export const DEFAULT_CHECKER_PADDING_RATIO = 0.75;

export function renderBoard(
  boardWidth: number,
  boardHeight?: number,
  options: RenderOptions = {},
): BoardRendererResult {
  const geometry = createBoardGeometry(boardWidth, boardHeight);

  const content = svgRenderBoard(geometry, options);

  const svg = buildSvgDocument(geometry.boardWidth, geometry.boardHeight, content);

  return { svg, geometry };
}

export function renderBoardWithCheckers(
  boardWidth: number,
  checkers: CheckerPlacement[],
  boardHeight?: number,
  options: RenderOptions = {},
): BoardRendererResult {
  const geometry = createBoardGeometry(boardWidth, boardHeight);

  const checkerDiameter =
    options.checkerRadius != null
      ? options.checkerRadius * 2
      : computeCheckerDiameter(geometry.pointWidth, DEFAULT_CHECKER_PADDING_RATIO);

  const gap = options.checkerGap ?? DEFAULT_CHECKER_GAP;

  const boardSvg = svgRenderBoard(geometry, options);
  const checkerSvg = svgRenderCheckers(checkers, geometry.points, checkerDiameter, gap);

  const svg = buildSvgDocument(
    geometry.boardWidth,
    geometry.boardHeight,
    boardSvg + '\n' + checkerSvg,
  );

  return { svg, geometry };
}
