import { Monitor, Moon, Sun, Accessibility, Check, Palette, SlidersHorizontal } from 'lucide-react';
import { AccountSettings } from '../components/AccountSettings';
import { usePreferences } from '../hooks/usePreferences';
import type { Theme } from '../utils/preferences';
import { PageHeading } from '../components/PageHeading';
import { AnimatedRegion } from '../components/AnimatedRegion';
export function Settings() {
  const { preferences, update } = usePreferences();
  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ];
  return (
    <AnimatedRegion identity="settings">
      <PageHeading
        eyebrow="HACÉ ESTE ESPACIO TUYO"
        title={
          <>
            A tu manera.
            <br />
            <em>A tu ritmo.</em>
          </>
        }
        description="Pequeñas decisiones para sentirte en tu lugar."
      />
      <section className="card settings-section" data-reveal>
        <div className="settings-title">
          <Palette size={19} />
          <div>
            <h2>Apariencia</h2>
            <p>Elegí la luz con la que querés ver las cosas.</p>
          </div>
          <span className="local-badge">EN ESTE DISPOSITIVO</span>
        </div>
        <fieldset className="theme-options">
          <legend className="sr-only">Seleccionar tema</legend>
          {themes.map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className={`theme-option ${preferences.theme === value ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={preferences.theme === value}
                onChange={() => update({ theme: value })}
              />
              <div className={`theme-preview theme-preview-${value}`} aria-hidden="true">
                <span />
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <span>
                <Icon size={14} />
                {label}
                {preferences.theme === value && <Check size={13} />}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="settings-row">
          <div>
            <SlidersHorizontal size={17} />
            <span>
              <strong>Vista compacta</strong>
              <small>Menos espacio entre elementos, más contenido a la vista.</small>
            </span>
          </div>
          <button
            className="switch"
            role="switch"
            aria-label="Vista compacta"
            aria-checked={preferences.compact}
            onClick={() => update({ compact: !preferences.compact })}
          >
            <span />
          </button>
        </div>
        <div className="settings-row">
          <div>
            <Accessibility size={18} />
            <span>
              <strong>Reducir movimiento</strong>
              <small>Limitá las animaciones. Siempre respetamos la preferencia del sistema.</small>
            </span>
          </div>
          <button
            className="switch"
            role="switch"
            aria-label="Reducir movimiento"
            aria-checked={preferences.motion === 'reduced'}
            onClick={() =>
              update({ motion: preferences.motion === 'reduced' ? 'system' : 'reduced' })
            }
          >
            <span />
          </button>
        </div>
      </section>
      <AccountSettings />
      <p className="section-footnote">
        <span />
        Tus preferencias visuales se guardan solo en este navegador.
      </p>
    </AnimatedRegion>
  );
}
