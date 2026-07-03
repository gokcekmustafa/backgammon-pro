import type {
  Rect,
  Circle,
  Point,
  PointGeometry,
  BoardGeometry,
  ColorScheme,
  CheckerPlacement,
  RenderOptions,
} from './types';
import { getTrianglePoints, trianglePointsToString, getCheckerPositions } from './Geometry';

export const DEFAULT_COLORS: ColorScheme = {
  boardFill: '#1a5c2a',
  boardStroke: '#5c3a1a',
  pointColors: ['#f5deb3', '#8b4513'],
  barFill: '#1a5c2a',
  homeBoardFill: 'rgba(255,255,255,0.06)',
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function svgAttr(key: string, value: string | number): string {
  return ` ${key}="${escapeXml(String(value))}"`;
}

function svgTag(tag: string, attrs: Record<string, string | number>, content?: string): string {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => svgAttr(k, v))
    .join('');
  if (content !== undefined) {
    return `<${tag}${attrStr}>${content}</${tag}>`;
  }
  return `<${tag}${attrStr}/>`;
}

export function svgBoardBackground(
  rect: Rect,
  color: string,
  stroke: string,
  cornerRadius: number,
): string {
  return svgTag('rect', {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rx: cornerRadius,
    fill: color,
    stroke,
    'stroke-width': 4,
  });
}

export function svgHomeBoard(rect: Rect, fill: string): string {
  return svgTag('rect', {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    fill,
    'pointer-events': 'none',
  });
}

export function svgTriangle(points: Point[], fill: string): string {
  const pointStr = trianglePointsToString(points);
  return svgTag('polygon', {
    points: pointStr,
    fill,
    'pointer-events': 'none',
  });
}

export function svgBar(rect: Rect, fill: string): string {
  return svgTag('rect', {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    fill,
    'pointer-events': 'none',
  });
}

export function svgChecker(circle: Circle, fill: string, stroke?: string): string {
  const attrs: Record<string, string | number> = {
    cx: circle.cx,
    cy: circle.cy,
    r: circle.radius,
    fill,
    'pointer-events': 'none',
  };
  if (stroke) {
    attrs.stroke = stroke;
    attrs['stroke-width'] = 1;
  }
  return svgTag('circle', attrs);
}

export function svgRenderPoints(points: PointGeometry[], pointColors: [string, string]): string {
  return points
    .map((pt) => {
      const triangle = getTrianglePoints(pt.rect, pt.direction);
      const color = pt.index % 2 === 0 ? pointColors[0] : pointColors[1];
      return svgTriangle(triangle, color);
    })
    .join('');
}

export function svgRenderCheckers(
  placements: CheckerPlacement[],
  points: PointGeometry[],
  checkerDiameter: number,
  gap: number,
): string {
  const pointMap = new Map(points.map((p) => [p.index, p]));

  return placements
    .map((placement) => {
      const pt = pointMap.get(placement.pointIndex);
      if (!pt) return '';

      const positions = getCheckerPositions(
        pt.rect,
        pt.direction,
        placement.count,
        checkerDiameter,
        gap,
      );

      return positions
        .map((circle) => svgChecker(circle, placement.color, placement.strokeColor))
        .join('');
    })
    .join('');
}

export function buildSvgDocument(width: number, height: number, children: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${children}
</svg>`;
}

export function svgRenderBoard(geometry: BoardGeometry, options: RenderOptions = {}): string {
  const colors: ColorScheme = { ...DEFAULT_COLORS, ...options.colorScheme };
  const cornerRadius = options.cornerRadius ?? 12;

  const parts: string[] = [];

  parts.push(
    svgBoardBackground(
      { x: 0, y: 0, width: geometry.boardWidth, height: geometry.boardHeight },
      colors.boardFill,
      colors.boardStroke,
      cornerRadius,
    ),
  );

  if (options.showHomeBoardShading) {
    const homeRightX = geometry.bar.x + geometry.bar.width;
    parts.push(
      svgHomeBoard(
        { x: homeRightX, y: 0, width: geometry.rightTableWidth, height: geometry.halfHeight },
        colors.homeBoardFill,
      ),
    );
    parts.push(
      svgHomeBoard(
        {
          x: homeRightX,
          y: geometry.halfHeight,
          width: geometry.rightTableWidth,
          height: geometry.halfHeight,
        },
        colors.homeBoardFill,
      ),
    );
  }

  parts.push(svgRenderPoints(geometry.points, colors.pointColors));

  parts.push(svgBar(geometry.bar, colors.barFill));

  return parts.join('\n');
}
