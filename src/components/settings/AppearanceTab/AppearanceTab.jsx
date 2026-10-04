'use client';

import { MODE_LIST, ACCENT_LIST, getMode, getAccent } from '../../../themes/index.js';
import { getThemePreview } from '../../../theme/theme-preview.js';
import { resolveSecondaryTokens } from '../../../theme/theme-utils.js';
import { useThemePreference } from '../../../hooks/useThemePreference.js';
import ThemeCard from '../ThemeCard/ThemeCard.jsx';
import styles from './AppearanceTab.module.css';

// Three independent choices: Mode (light or dark: backgrounds, text, code blocks), Accent (the brand color) and Partner
// (the second colour used in gradients and the background glow; Auto uses the accent's own, or take any other accent's,
// so primaries and partners can be mixed). There is no color list in this file: a mode or accent added to the registry
// (src/themes/index.js) appears here with its preview. Cards are painted with the visitor's current selections, so
// each shows exactly what picking it would look like. `modes`/`accents` exist so tests can render other lists.
export default function AppearanceTab({ modes = MODE_LIST, accents = ACCENT_LIST }) {
  const { mode, accent, secondary, setMode, setAccent, setSecondary } = useThemePreference();
  const currentMode = getMode(mode) ?? modes[0];
  const currentAccent = getAccent(accent) ?? accents[0];
  const partner = secondary ? getAccent(secondary) : null;
  const partnerName = (partner ?? currentAccent).name;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Appearance</h2>
        <p>
          Pick a mode, an accent and a partner colour. Applies immediately and stays on this device.
          {' '}Using <b>{currentMode.name}</b> with <b>{currentAccent.name}</b> and <b>{partnerName}</b> as partner.
        </p>
      </div>

      <div className={styles.group} role="group" aria-label="Mode">
        <div className={styles.groupHead}>
          <h3>Mode</h3>
          <span>Light or dark surfaces, code blocks follow</span>
        </div>
        <div className={styles.grid}>
          {modes.map((m) => (
            <ThemeCard
              key={m.id}
              name={m.name}
              description={m.description}
              palette={getThemePreview(m, currentAccent, partner)}
              swatch={false}
              active={mode === m.id}
              onSelect={() => setMode(m.id)}
            />
          ))}
        </div>
      </div>

      <div className={styles.group} role="group" aria-label="Accent">
        <div className={styles.groupHead}>
          <h3>Accent</h3>
          <span>Previewed on {currentMode.name.toLowerCase()} mode</span>
        </div>
        <div className={styles.grid}>
          {accents.map((a) => (
            <ThemeCard
              key={a.id}
              name={a.name}
              description={a.description}
              palette={getThemePreview(currentMode, a, partner)}
              active={accent === a.id}
              onSelect={() => setAccent(a.id)}
            />
          ))}
        </div>
      </div>

      <div className={styles.group} role="group" aria-label="Partner colour">
        <div className={styles.groupHead}>
          <h3>Partner colour</h3>
          <span>Gradients and glow. Pair {currentAccent.name} with any accent&apos;s partner</span>
        </div>
        <div className={styles.chips}>
          <button
            type="button"
            className={`${styles.chip} ${secondary === null ? styles.chipActive : ''}`}
            aria-pressed={secondary === null}
            onClick={() => setSecondary(null)}
          >
            <i className={styles.chipDot} style={{ background: resolveSecondaryTokens(currentAccent)['accent-2'] }} />
            Auto
          </button>
          {accents.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`${styles.chip} ${secondary === a.id ? styles.chipActive : ''}`}
              aria-pressed={secondary === a.id}
              onClick={() => setSecondary(a.id)}
            >
              <i className={styles.chipDot} style={{ background: resolveSecondaryTokens(a)['accent-2'] }} />
              {a.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
