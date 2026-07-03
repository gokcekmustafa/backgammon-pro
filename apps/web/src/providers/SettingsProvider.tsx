'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type AnimationSpeed = 'normal' | 'fast' | 'off';

interface Settings {
  soundEnabled: boolean;
  animationSpeed: AnimationSpeed;
}

interface SettingsContextType extends Settings {
  setSoundEnabled: (v: boolean) => void;
  setAnimationSpeed: (v: AnimationSpeed) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = 'bp_settings';

function getStoredSettings(): Settings {
  if (typeof window === 'undefined') {
    return { soundEnabled: true, animationSpeed: 'normal' };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore parse errors */
  }
  return { soundEnabled: true, animationSpeed: 'normal' };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(getStoredSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setSoundEnabled = useCallback((soundEnabled: boolean) => {
    setSettings((prev) => ({ ...prev, soundEnabled }));
  }, []);

  const setAnimationSpeed = useCallback((animationSpeed: AnimationSpeed) => {
    setSettings((prev) => ({ ...prev, animationSpeed }));
  }, []);

  return (
    <SettingsContext.Provider value={{ ...settings, setSoundEnabled, setAnimationSpeed }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
