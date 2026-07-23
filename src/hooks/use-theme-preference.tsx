import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

/**
 * Holds the user's manual light/dark override (docs/DESIGN_SYSTEM.md §9).
 * In-memory only for Phase 1 — there is no persistence layer yet, so the
 * override resets on relaunch rather than being backed by fake persistence.
 */
export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const [preference, setPreference] = useState<ThemePreference>('system');

  const value = useMemo(() => ({ preference, setPreference }), [preference]);

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  }
  return context;
}
