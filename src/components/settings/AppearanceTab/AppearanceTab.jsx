'use client';

import { useEffect, useState } from 'react';
import { MODE_LIST, COLOR_LIST, getMode, getColor, DEFAULT_MODE_ID, DEFAULT_ACCENT_ID, DEFAULT_SECONDARY_ID } from '../../../themes/index.js';
import { useThemePreference } from '../../../hooks/useThemePreference.js';
import SwatchGroup from './SwatchGroup.jsx';
import PreviewPanel from './PreviewPanel.jsx';
import styles from './AppearanceTab.module.css';

// A DRAFT editor: the visitor picks a mode
export default function AppearanceTab({ modes = MODE_LIST, colors = COLOR_LIST }) {
  const { mode, accent, secondary, apply } = useThemePreference();
  const [edits, setEdits] = useState({});
  const [applied, setApplied] = useState(false);
  const draft = { mode, accent, secondary, ...edits };

  const dirty = draft.mode !== mode || draft.accent !== accent || draft.secondary !== secondary;
  const isDefault = draft.mode === DEFAULT_MODE_ID && draft.accent === DEFAULT_ACCENT_ID && draft.secondary === DEFAULT_SECONDARY_ID;

  useEffect(() => {
    if (!applied) return undefined;
    const timer = setTimeout(() => setApplied(false), 2500);
    return () => clearTimeout(timer);
  }, [applied]);

  const edit = (patch) => {
    setApplied(false);
    setEdits((current) => ({ ...current, ...patch }));
  };

  const draftMode = getMode(draft.mode) ?? modes[0];
  const draftAccent = getColor(draft.accent) ?? colors[0];
  const draftSecondary = draft.secondary ? getColor(draft.secondary) : null;

  const shade = (color) => color[draftMode.id].primary;
  const colorItems = colors.map((c) => ({ id: c.id, name: c.name, hex: shade(c) }));
  const modeItems = modes.map((m) => ({ id: m.id, name: m.name, hex: m.colors.background }));
  const secondaryItems = [{ id: null, name: 'None', hex: null }, ...colorItems];

  function onApply() {
    if (!apply(draft)) return;
    setEdits({});
    setApplied(true);
  }
  function onCancel() {
    setEdits({});
    setApplied(false);
  }

  const summary = `${draftMode.name} mode, ${draftAccent.name} as primary, ${draftSecondary ? `${draftSecondary.name} as secondary` : 'no secondary'}. Not applied yet.`;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Appearance</h2>
        <p>Choose a mode, a primary colour and, if you like, a secondary colour. Preview first, then Apply. Stays on this device.</p>
      </div>

      <div className={styles.sticky}>
        <PreviewPanel mode={draftMode} accent={draftAccent} secondary={draftSecondary} />
        <div className={styles.actions}>
          <button type="button" className={styles.reset} onClick={() => edit({ mode: DEFAULT_MODE_ID, accent: DEFAULT_ACCENT_ID, secondary: DEFAULT_SECONDARY_ID })} disabled={isDefault}>
            Reset to default
          </button>
          <span className={styles.status} role="status" aria-live="polite">
            {dirty ? summary : applied ? 'Applied.' : ''}
          </span>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={!dirty}>Cancel</button>
          <button type="button" className={styles.apply} onClick={onApply} disabled={!dirty}>Apply</button>
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupHead}><h3>Mode</h3><span>Required</span></div>
        <SwatchGroup label="Mode" items={modeItems} value={draft.mode} onChange={(id) => edit({ mode: id })} />
      </div>

      <div className={styles.group}>
        <div className={styles.groupHead}><h3>Primary</h3><span>Required</span></div>
        <SwatchGroup label="Primary colour" items={colorItems} value={draft.accent} onChange={(id) => edit({ accent: id })} />
      </div>

      <div className={styles.group}>
        <div className={styles.groupHead}><h3>Secondary</h3><span>Optional</span></div>
        <SwatchGroup label="Secondary colour" items={secondaryItems} value={draft.secondary} onChange={(id) => edit({ secondary: id })} />
      </div>
    </section>
  );
}
