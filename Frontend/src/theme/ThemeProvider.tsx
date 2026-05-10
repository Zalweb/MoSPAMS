import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { ThemeMode, AccentColor, ThemeState } from './themes';
import { DEFAULT_THEME, getAccentHex, getAccentHsl } from './themes';

interface ThemeContextValue {
  mode: ThemeMode;
  accent: AccentColor;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  accentHex: string;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'mospams-theme';

function loadTheme(): ThemeState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        mode: parsed.mode ?? DEFAULT_THEME.mode,
        accent: parsed.accent ?? DEFAULT_THEME.accent,
      };
    }
  } catch {}
  return { ...DEFAULT_THEME };
}

function saveTheme(state: ThemeState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function applyCssVariables(mode: ThemeMode, accent: AccentColor) {
  const root = document.documentElement;
  const accentHsl = getAccentHsl(accent);

  root.classList.remove('light', 'dark');
  root.classList.add(mode);
  root.style.setProperty('--accent', accentHsl);
  root.style.setProperty('--accent-foreground', mode === 'dark' ? '0 0% 100%' : '0 0% 100%');
  root.style.setProperty('--accent-hex', getAccentHex(accent));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(loadTheme);

  useEffect(() => {
    applyCssVariables(state.mode, state.accent);
    saveTheme(state);
  }, [state]);

  const toggleMode = useCallback(() => {
    setState(prev => ({ ...prev, mode: prev.mode === 'dark' ? 'light' : 'dark' }));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setState(prev => ({ ...prev, mode }));
  }, []);

  const setAccent = useCallback((accent: AccentColor) => {
    setState(prev => ({ ...prev, accent }));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        mode: state.mode,
        accent: state.accent,
        toggleMode,
        setMode,
        setAccent,
        accentHex: getAccentHex(state.accent),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
