import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { THEMES, SPECIES } from './tokens.js';
import { contrastRatio, mix } from './contrast.js';
import { createAppTheme } from './createAppTheme.js';

const AA_TEXT = 4.5;
const AA_UI = 3; // WCAG 1.4.11 non-text contrast (input borders, focus ring)
const TEXT_COLORS = [
  'text',
  'textMuted',
  'primary',
  'secondary',
  'success',
  'warning',
  'error',
  'info',
];

describe.each(Object.values(THEMES))('theme $id', (theme) => {
  const c = theme.colors;

  it.each(TEXT_COLORS)('%s reaches WCAG AA on background, surface and raised surface', (key) => {
    for (const bg of ['background', 'surface', 'surfaceRaised']) {
      expect(contrastRatio(c[key], c[bg]), `${key} on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('button text reaches WCAG AA on filled buttons', () => {
    expect(contrastRatio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(c.onSecondary, c.secondary)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('input borders and focus ring are distinguishable (3:1)', () => {
    expect(contrastRatio(mix(c.text, c.surface, 0.45), c.surface)).toBeGreaterThanOrEqual(AA_UI);
    expect(contrastRatio(c.focus, c.background)).toBeGreaterThanOrEqual(AA_UI);
  });

  it('defines an accent color for every species', () => {
    expect(Object.keys(theme.species).sort()).toEqual([...SPECIES].sort());
  });

  it('produces a MUI theme whose status contrast texts are readable', () => {
    const mui = createAppTheme(theme.id);
    for (const key of ['primary', 'secondary', 'success', 'warning', 'error', 'info']) {
      const { main, contrastText } = mui.palette[key];
      expect(contrastRatio(contrastText, main), key).toBeGreaterThanOrEqual(AA_TEXT);
    }
    expect(mui.palette.mode).toBe(theme.mode);
  });

  it('avatar text on species colors is readable', () => {
    const mui = createAppTheme(theme.id);
    for (const s of SPECIES) {
      expect(contrastRatio(mui.custom.speciesText(s), theme.species[s]), s).toBeGreaterThanOrEqual(
        AA_UI,
      );
    }
  });
});

describe('dark theme', () => {
  it('does not use pure black', () => {
    expect(THEMES['neutral-dark'].colors.background.toUpperCase()).not.toBe('#000000');
  });
});

describe('theme-init.js (pre-render script)', () => {
  it('knows the background of every theme', () => {
    const script = readFileSync(new URL('../../public/theme-init.js', import.meta.url), 'utf8');
    for (const t of Object.values(THEMES)) {
      expect(script, t.id).toMatch(
        new RegExp(`'?${t.id}'?: \\['${t.colors.background}', '${t.mode}'\\]`),
      );
    }
  });
});
