'use client';

import { useGame } from '@/providers/GameProvider';
import GameBoard from './GameBoard';

export default function BoardArea() {
  const {
    gameState,
    selectedPoint,
    legalMoves,
    allLegalMoves,
    boardWidth,
    checkerPaddingRatio,
    checkerGap,
    selectChecker,
    moveTo,
    makeMove,
  } = useGame();

  const handlePointClick = (pointIndex: number) => {
    if (selectedPoint === null) {
      selectChecker(pointIndex);
    } else if (selectedPoint === pointIndex) {
      selectChecker(pointIndex);
    } else {
      moveTo(pointIndex);
    }
  };

  return (
    <div className="flex items-center justify-center w-full max-w-lg mx-auto">
      <div className="w-full">
        <GameBoard
          gameState={gameState}
          selectedPoint={selectedPoint}
          legalMoves={legalMoves}
          allLegalMoves={allLegalMoves}
          boardWidth={boardWidth}
          checkerPaddingRatio={checkerPaddingRatio}
          checkerGap={checkerGap}
          onPointClick={handlePointClick}
          onMakeMove={makeMove}
        />
      </div>
    </div>
  );
}
