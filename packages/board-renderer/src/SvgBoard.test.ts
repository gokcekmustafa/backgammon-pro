import { describe, it, expect } from 'vitest';
import {
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
import { createBoardGeometry } from './Geometry';
import type { CheckerPlacement } from './types';

describe('svgBoardBackground', () => {
  it('produces a rect element', () => {
    const result = svgBoardBackground(
      { x: 0, y: 0, width: 800, height: 372 },
      '#1a5c2a',
      '#5c3a1a',
      12,
    );
    expect(result).toContain('<rect');
    expect(result).toContain('width="800"');
    expect(result).toContain('height="372"');
    expect(result).toContain('rx="12"');
    expect(result).toContain('fill="#1a5c2a"');
  });
});

describe('svgHomeBoard', () => {
  it('produces a rect with fill', () => {
    const result = svgHomeBoard(
      { x: 350, y: 0, width: 200, height: 186 },
      'rgba(255,255,255,0.06)',
    );
    expect(result).toContain('<rect');
    expect(result).toContain('x="350"');
    expect(result).toContain('width="200"');
  });
});

describe('svgTriangle', () => {
  it('produces a polygon element', () => {
    const result = svgTriangle(
      [
        { x: 0, y: 0 },
        { x: 60, y: 0 },
        { x: 30, y: 200 },
      ],
      '#f5deb3',
    );
    expect(result).toContain('<polygon');
    expect(result).toContain('points="0,0 60,0 30,200"');
    expect(result).toContain('fill="#f5deb3"');
  });
});

describe('svgBar', () => {
  it('produces a rect at the bar position', () => {
    const result = svgBar({ x: 356, y: 0, width: 88, height: 372 }, '#1a5c2a');
    expect(result).toContain('<rect');
    expect(result).toContain('x="356"');
    expect(result).toContain('width="88"');
  });
});

describe('svgChecker', () => {
  it('produces a circle element', () => {
    const result = svgChecker({ cx: 30, cy: 40, radius: 20 }, '#ffffff');
    expect(result).toContain('<circle');
    expect(result).toContain('cx="30"');
    expect(result).toContain('cy="40"');
    expect(result).toContain('r="20"');
    expect(result).toContain('fill="#ffffff"');
  });

  it('includes stroke when provided', () => {
    const result = svgChecker({ cx: 30, cy: 40, radius: 20 }, '#ffffff', '#cccccc');
    expect(result).toContain('stroke="#cccccc"');
  });
});

describe('svgRenderPoints', () => {
  it('renders all 24 points', () => {
    const geo = createBoardGeometry(800);
    const result = svgRenderPoints(geo.points, DEFAULT_COLORS.pointColors);
    const count = result.split('<polygon').length - 1;
    expect(count).toBe(24);
  });

  it('alternates colors between points', () => {
    const geo = createBoardGeometry(800);
    const result = svgRenderPoints(geo.points, ['#colorA', '#colorB']);
    const firstColorIdx = result.indexOf('#colorA');
    const secondColorIdx = result.indexOf('#colorB');
    expect(firstColorIdx).toBeGreaterThan(0);
    expect(secondColorIdx).toBeGreaterThan(0);
  });
});

describe('svgRenderCheckers', () => {
  it('renders checkers on specified points', () => {
    const geo = createBoardGeometry(800);
    const placements: CheckerPlacement[] = [
      { pointIndex: 0, count: 2, color: '#ffffff', strokeColor: '#cccccc' },
      { pointIndex: 12, count: 3, color: '#333333' },
    ];
    const result = svgRenderCheckers(placements, geo.points, 40, 2);
    const count = result.split('<circle').length - 1;
    expect(count).toBe(5);
  });

  it('returns empty for no placements', () => {
    const geo = createBoardGeometry(800);
    const result = svgRenderCheckers([], geo.points, 40, 2);
    expect(result).toBe('');
  });

  it('skips invalid point indices', () => {
    const geo = createBoardGeometry(800);
    const placements: CheckerPlacement[] = [{ pointIndex: 99, count: 1, color: '#fff' }];
    const result = svgRenderCheckers(placements, geo.points, 40, 2);
    expect(result).toBe('');
  });
});

describe('buildSvgDocument', () => {
  it('wraps content in SVG document', () => {
    const result = buildSvgDocument(800, 372, '<rect x="0" y="0" width="100" height="100"/>');
    expect(result).toContain('<?xml version="1.0"');
    expect(result).toContain('<svg');
    expect(result).toContain('viewBox="0 0 800 372"');
    expect(result).toContain('</svg>');
  });
});

describe('svgRenderBoard', () => {
  it('renders a complete board with all elements', () => {
    const geo = createBoardGeometry(800);
    const result = svgRenderBoard(geo, { showHomeBoardShading: true });
    expect(result).toContain('<rect');
    expect(result).toContain('<polygon');
    expect(result).not.toContain('<circle');
  });

  it('renders board without home board shading by default', () => {
    const geo = createBoardGeometry(800);
    const result = svgRenderBoard(geo);
    expect(result).toContain('<rect');
    expect(result).toContain('<polygon');
  });

  it('uses custom color scheme when provided', () => {
    const geo = createBoardGeometry(800);
    const result = svgRenderBoard(geo, {
      colorScheme: { boardFill: '#ff0000', barFill: '#ff0000' },
    });
    expect(result).toContain('fill="#ff0000"');
  });
});
