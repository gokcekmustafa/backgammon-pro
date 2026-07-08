'use client';

import { type ReactNode } from 'react';
import { useGame } from '@/providers/GameProvider';
import { Player, playerToIndex } from '@backgammon/game-engine';
import GameBoard from './GameBoard';

function OffArea({
  player,
  count,
  isFlipped,
  side,
}: {
  player: Player.One | Player.Two;
  count: number;
  isFlipped: boolean;
  side: 'left' | 'right';
}) {
  const MAX_VISIBLE = 10;
  const showCount = Math.min(count, MAX_VISIBLE);
  const chips: ReactNode[] = [];
  const stackFromTop = player === (isFlipped ? Player.Two : Player.One);

  for (let i = 0; i < showCount; i++) {
    chips.push(
      <div
        key={i}
        className="off-chip"
        style={{
          backgroundImage: `url(/assets/${player === Player.One ? 'stone-light.png' : 'stone-dark.png'})`,
          backgroundSize: '300% 300%',
          backgroundPosition: '50% 0%',
          backgroundRepeat: 'no-repeat',
          position: 'absolute',
          width: 34,
          height: 22,
          borderRadius: '50%',
          left: '50%',
          ...(stackFromTop ? { top: 8 + i * 11 } : { bottom: 8 + i * 11 }),
          transform: `translateX(-50%) rotateX(${stackFromTop ? -63 : 63}deg)`,
          transformOrigin: stackFromTop ? 'center top' : 'center bottom',
          zIndex: 40 + i,
          boxShadow: '0 3px 8px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.26)',
        }}
      />,
    );
  }

  const isWhite = player === Player.One;
  const bgImage = isWhite
    ? 'url(/assets/score-rail-light.png)'
    : 'url(/assets/score-rail-dark.png)';

  return (
    <div
      className="off-area"
      style={{
        width: 58,
        flexShrink: 0,
        background: `${bgImage} left center / 200% 100% no-repeat`,
        border: '1px solid rgba(213,173,117,0.46)',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 4px',
        textAlign: 'center',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 20px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        ...(side === 'left' ? { order: -1 } : { order: 1 }),
      }}
    >
      <div
        style={{
          fontSize: '0.58rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(246,232,209,0.78)',
          textShadow: '0 1px 0 rgba(0,0,0,0.5)',
        }}
      >
        {player === Player.One ? 'BEYAZ' : 'SİYAH'}
      </div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '0.82rem',
          color: '#f8ddac',
          fontWeight: 700,
          textShadow: '0 1px 0 rgba(0,0,0,0.6)',
        }}
      >
        {count} / 15
      </div>
      <div
        style={{
          flex: 1,
          width: 44,
          position: 'relative',
          marginTop: 'auto',
          ...(stackFromTop ? {} : { marginTop: 'auto' }),
        }}
      >
        {chips}
        {count > MAX_VISIBLE && (
          <div
            style={{
              position: 'absolute',
              top: stackFromTop ? 0 : undefined,
              bottom: stackFromTop ? undefined : 0,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.54rem',
              fontWeight: 700,
              color: '#d29a45',
              background: 'rgba(0,0,0,0.62)',
              border: '1px solid rgba(200,144,42,0.34)',
              borderRadius: 8,
              padding: '1px 5px',
              zIndex: 120,
            }}
          >
            +{count - MAX_VISIBLE}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BoardArea() {
  const {
    gameState,
    selectedPoint,
    legalMoves,
    allLegalMoves,
    boardWidth,
    checkerPaddingRatio,
    checkerGap,
    localPlayer,
    selectChecker,
    moveTo,
    makeMove,
  } = useGame();

  const isFlipped = localPlayer === Player.Two;

  const p1Off = gameState.players[playerToIndex(Player.One)].checkersBorneOff;
  const p2Off = gameState.players[playerToIndex(Player.Two)].checkersBorneOff;

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
    <div className="flex items-center justify-center w-full max-w-xl mx-auto">
      <div className="flex items-stretch gap-2 w-full">
        <OffArea
          player={isFlipped ? Player.Two : Player.One}
          count={isFlipped ? p2Off : p1Off}
          isFlipped={isFlipped}
          side="left"
        />
        <div className="flex-1 min-w-0">
          <GameBoard
            gameState={gameState}
            selectedPoint={selectedPoint}
            legalMoves={legalMoves}
            allLegalMoves={allLegalMoves}
            boardWidth={boardWidth}
            checkerPaddingRatio={checkerPaddingRatio}
            checkerGap={checkerGap}
            localPlayer={localPlayer as (1 | 2 | null) | undefined}
            onPointClick={handlePointClick}
            onMakeMove={makeMove}
          />
        </div>
        <OffArea
          player={isFlipped ? Player.One : Player.Two}
          count={isFlipped ? p1Off : p2Off}
          isFlipped={isFlipped}
          side="right"
        />
      </div>
    </div>
  );
}
