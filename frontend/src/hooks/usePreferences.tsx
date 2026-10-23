import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  defaultPreferences,
  readPreferences,
  savePreferences,
  type Preferences,
} from '../utils/preferences';
const PreferencesContext = createContext<{
  preferences: Preferences;
  update: (value: Partial<Preferences>) => void;
}>({ preferences: defaultPreferences, update: () => {} });
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        preferences.theme === 'system' ? (query.matches ? 'dark' : 'light') : preferences.theme;
      document.documentElement.dataset.compact = String(preferences.compact);
      document.documentElement.dataset.motion = preferences.motion;
    };
    apply();
    query.addEventListener('change', apply);
    savePreferences(preferences);
    return () => query.removeEventListener('change', apply);
  }, [preferences]);
  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        update: (value) => setPreferences((previous) => ({ ...previous, ...value })),
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
export const usePreferences = () => useContext(PreferencesContext);
