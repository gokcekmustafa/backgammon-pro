'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useGameEngine, type UseGameEngineReturn } from '@/hooks/useGameEngine';
import { useOnlineGame } from '@/hooks/useOnlineGame';

type GameContextType = UseGameEngineReturn & {
  localPlayer?: number | null;
  connectionStatus?: string;
};

const GameContext = createContext<GameContextType | null>(null);

interface GameProviderProps {
  children: ReactNode;
  tableId?: string;
  aiMode?: boolean;
}

export function GameProvider({ children, tableId, aiMode }: GameProviderProps) {
  const localGame = useGameEngine(aiMode);
  const onlineGame = useOnlineGame(tableId ?? null);

  const game = tableId && onlineGame ? onlineGame : localGame;

  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
