import type {
  Viewport,
  DeviceType,
  BoardLayout,
  BoardDimensions,
  BoardPoint,
  BoardRegion,
} from './types';
import { calculateScale, boardWidthFromScale, boardHeightFromScale } from './calculateScale';

const LEFT_TABLE_RATIO = 0.445;
const RIGHT_TABLE_RATIO = 0.445;
const BAR_RATIO = 1 - LEFT_TABLE_RATIO - RIGHT_TABLE_RATIO;

const POINTS_PER_HALF = 6;

export function calculateBoard(viewport: Viewport, deviceType?: DeviceType): BoardLayout {
  const scale = calculateScale(viewport, deviceType);

  const boardWidth = boardWidthFromScale(scale.value);
  const boardHeight = boardHeightFromScale(scale.value);
  const aspectRatio = boardWidth / boardHeight;

  const dimensions: BoardDimensions = { width: boardWidth, height: boardHeight, aspectRatio };

  const leftTableWidth = boardWidth * LEFT_TABLE_RATIO;
  const rightTableWidth = boardWidth * RIGHT_TABLE_RATIO;
  const barWidth = boardWidth * BAR_RATIO;

  const halfHeight = boardHeight / 2;
  const pointWidth = leftTableWidth / POINTS_PER_HALF;

  const points = calculatePoints(
    boardWidth,
    leftTableWidth,
    rightTableWidth,
    barWidth,
    halfHeight,
    pointWidth,
  );

  const bar: BoardRegion = {
    x: leftTableWidth,
    y: 0,
    width: barWidth,
    height: boardHeight,
  };

  const barRightEdge = leftTableWidth + barWidth;

  const homeBoardTop: BoardRegion = {
    x: barRightEdge,
    y: 0,
    width: rightTableWidth,
    height: halfHeight,
  };

  const homeBoardBottom: BoardRegion = {
    x: barRightEdge,
    y: halfHeight,
    width: rightTableWidth,
    height: halfHeight,
  };

  const bearingOffSideWidth = pointWidth * 0.5;

  const bearingOffTop: BoardRegion = {
    x: 0,
    y: 0,
    width: boardWidth,
    height: bearingOffSideWidth,
  };

  const bearingOffBottom: BoardRegion = {
    x: 0,
    y: boardHeight - bearingOffSideWidth,
    width: boardWidth,
    height: bearingOffSideWidth,
  };

  return {
    dimensions,
    points,
    bar,
    homeBoardTop,
    homeBoardBottom,
    bearingOffTop,
    bearingOffBottom,
  };
}

function calculatePoints(
  boardWidth: number,
  leftTableWidth: number,
  rightTableWidth: number,
  barWidth: number,
  halfHeight: number,
  pointWidth: number,
): BoardPoint[] {
  const points: BoardPoint[] = [];

  const barX = leftTableWidth;
  const rightTableX = barX + barWidth;

  for (let i = 0; i < POINTS_PER_HALF; i++) {
    const x = i * pointWidth;

    points.push({
      index: i,
      x,
      y: 0,
      width: pointWidth,
      height: halfHeight,
      half: 'top',
      direction: 'down',
      isTopHalf: true,
    });

    const rightIndex = POINTS_PER_HALF + i;
    const rightX = rightTableX + i * pointWidth;

    points.push({
      index: rightIndex,
      x: rightX,
      y: 0,
      width: pointWidth,
      height: halfHeight,
      half: 'top',
      direction: 'down',
      isTopHalf: true,
    });
  }

  for (let i = 0; i < POINTS_PER_HALF; i++) {
    const x = i * pointWidth;

    points.push({
      index: POINTS_PER_HALF * 2 + i,
      x,
      y: halfHeight,
      width: pointWidth,
      height: halfHeight,
      half: 'bottom',
      direction: 'up',
      isTopHalf: false,
    });

    const rightIndex = POINTS_PER_HALF * 2 + POINTS_PER_HALF + i;

    if (rightIndex < 24) {
      const rightX = rightTableX + i * pointWidth;

      points.push({
        index: rightIndex,
        x: rightX,
        y: halfHeight,
        width: pointWidth,
        height: halfHeight,
        half: 'bottom',
        direction: 'up',
        isTopHalf: false,
      });
    }
  }

  points.sort((a, b) => a.index - b.index);

  return points;
}
