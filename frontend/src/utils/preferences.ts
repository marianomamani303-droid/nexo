export type Theme = 'light' | 'dark' | 'system';
export type Motion = 'system' | 'reduced';
export interface Preferences {
  theme: Theme;
  motion: Motion;
  compact: boolean;
}
export const defaultPreferences: Preferences = { theme: 'light', motion: 'system', compact: false };
const key = 'nexo.visual-preferences';
export function readPreferences(): Preferences {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    if (!raw || typeof raw !== 'object') return defaultPreferences;
    const value = raw as Record<string, unknown>;
    return {
      theme: value.theme === 'dark' || value.theme === 'system' ? value.theme : 'light',
      motion: value.motion === 'reduced' ? 'reduced' : 'system',
      compact: value.compact === true,
    };
  } catch {
    return defaultPreferences;
  }
}
export function savePreferences(value: Preferences) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Preferencias de sesión si el almacenamiento está bloqueado. */
  }
}
