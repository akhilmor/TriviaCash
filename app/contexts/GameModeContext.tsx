import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setMultiplayerAllowed } from '../hooks/useMatchmaking';

export type GameMode = 'single' | 'multi' | null;

interface GameModeContextType {
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
}

const GameModeContext = createContext<GameModeContextType | undefined>(undefined);

export function GameModeProvider({ children }: { children: ReactNode }) {
  const [gameMode, setGameMode] = useState<GameMode>(null);

  // Update matchmaking hook when mode changes
  useEffect(() => {
    setMultiplayerAllowed(gameMode === 'multi');
  }, [gameMode]);

  return (
    <GameModeContext.Provider value={{ gameMode, setGameMode }}>
      {children}
    </GameModeContext.Provider>
  );
}

export function useGameMode() {
  const context = useContext(GameModeContext);
  if (!context) {
    throw new Error('useGameMode must be used within GameModeProvider');
  }
  return context;
}

// Prevent route warnings - this file is not a route
export default function Placeholder() {
  return null;
}

