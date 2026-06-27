import { describe, it, expect } from 'vitest';
import { renderBoard, renderBoardWithCheckers } from './BoardRenderer';
import type { CheckerPlacement } from './types';

describe('renderBoard', () => {
  it('returns svg and geometry', () => {
    const result = renderBoard(800);
    expect(result).toHaveProperty('svg');
    expect(result).toHaveProperty('geometry');
  });

  it('produces valid SVG structure', () => {
    const { svg } = renderBoard(800);
    expect(svg).toContain('<?xml version="1.0"');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('contains board elements in SVG', () => {
    const { svg } = renderBoard(800);
    expect(svg).toContain('<rect');
    expect(svg).toContain('<polygon');
  });

  it('uses provided board dimensions', () => {
    const { geometry } = renderBoard(800, 400);
    expect(geometry.boardWidth).toBe(800);
    expect(geometry.boardHeight).toBe(400);
  });

  it('computes height from aspect ratio when not given', () => {
    const { geometry } = renderBoard(800);
    expect(geometry.boardHeight).toBeGreaterThan(0);
    expect(geometry.boardWidth).toBe(800);
  });

  it('returns 24 points in geometry', () => {
    const { geometry } = renderBoard(800);
    expect(geometry.points).toHaveLength(24);
  });

  it('creates consistent output for same input', () => {
    const a = renderBoard(800);
    const b = renderBoard(800);
    expect(a.svg).toBe(b.svg);
  });
});

describe('renderBoardWithCheckers', () => {
  const sampleCheckers: CheckerPlacement[] = [
    { pointIndex: 0, count: 2, color: '#ffffff', strokeColor: '#cccccc' },
    { pointIndex: 5, count: 5, color: '#333333' },
    { pointIndex: 11, count: 3, color: '#ffffff', strokeColor: '#cccccc' },
    { pointIndex: 18, count: 5, color: '#333333' },
    { pointIndex: 23, count: 2, color: '#ffffff', strokeColor: '#cccccc' },
  ];

  it('returns svg and geometry', () => {
    const result = renderBoardWithCheckers(800, sampleCheckers);
    expect(result).toHaveProperty('svg');
    expect(result).toHaveProperty('geometry');
  });

  it('includes circle elements for checkers', () => {
    const { svg } = renderBoardWithCheckers(800, sampleCheckers);
    const circleCount = svg.split('<circle').length - 1;
    const totalCheckers = sampleCheckers.reduce((sum, c) => sum + c.count, 0);
    expect(circleCount).toBe(totalCheckers);
  });

  it('includes board elements alongside checkers', () => {
    const { svg } = renderBoardWithCheckers(800, sampleCheckers);
    expect(svg).toContain('<polygon');
    expect(svg).toContain('<circle');
  });

  it('handles empty checkers array', () => {
    const { svg } = renderBoardWithCheckers(800, []);
    expect(svg).toContain('<polygon');
    expect(svg).not.toContain('<circle');
  });

  it('renders whole board SVG', () => {
    const { svg } = renderBoardWithCheckers(800, sampleCheckers);
    expect(svg).toContain('<?xml version="1.0"');
    expect(svg).toContain('</svg>');
  });

  it('produces consistent output for same input', () => {
    const a = renderBoardWithCheckers(800, sampleCheckers);
    const b = renderBoardWithCheckers(800, sampleCheckers);
    expect(a.svg).toBe(b.svg);
  });

  it('uses custom checker radius when provided', () => {
    const resultSmall = renderBoardWithCheckers(800, sampleCheckers, undefined, {
      checkerRadius: 5,
    });
    const resultLarge = renderBoardWithCheckers(800, sampleCheckers, undefined, {
      checkerRadius: 20,
    });
    expect(resultSmall.svg).not.toBe(resultLarge.svg);
  });
});
