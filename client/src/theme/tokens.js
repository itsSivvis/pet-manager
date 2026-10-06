// Design tokens: the single source of truth for every color, radius and font
// used in the app. Components must read colors from the MUI theme (which is
// built from these tokens), never hard-code them. See docs/theming.md.

export const SPECIES = [
  'dog',
  'cat',
  'rabbit',
  'rodent',
  'bird',
  'fish',
  'reptile',
  'horse',
  'other',
];

const FONT_INTER =
  '"Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_NUNITO =
  '"Nunito Variable", "Nunito", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_FREDOKA = '"Fredoka", "Nunito Variable", system-ui, sans-serif';

/**
 * Each theme defines:
 * - mode: 'light' | 'dark' (drives MUI defaults and the browser color-scheme)
 * - colors: semantic colors. Optional `accent` is purely decorative (never text).
 *   Text colors (text, textMuted, primary, secondary, status colors) must reach
 *   4.5:1 on background and surface. `onPrimary` etc. is the text color used on top of
 *   the filled color and must reach WCAG AA (4.5:1) – enforced by a unit test.
 * - species: accent color per animal species (avatars, card accents, charts)
 * - shape/typography/effects: radius, fonts, shadows and motion
 */
export const THEMES = {
  'neutral-light': {
    id: 'neutral-light',
    mode: 'light',
    colors: {
      background: '#F5F6F8',
      surface: '#FFFFFF',
      surfaceRaised: '#FFFFFF',
      text: '#16181D',
      textMuted: '#4A515E',
      border: '#DADDE3',
      primary: '#2F55C4',
      onPrimary: '#FFFFFF',
      secondary: '#4A515E',
      onSecondary: '#FFFFFF',
      success: '#1C7A43',
      warning: '#9A5B00',
      error: '#C0262D',
      info: '#2F55C4',
      focus: '#2F55C4',
    },
    species: {
      dog: '#8A5A12',
      cat: '#7A3E8E',
      rabbit: '#5B5F97',
      rodent: '#7C5A3A',
      bird: '#2D7A4F',
      fish: '#1F6F8B',
      reptile: '#4F7A28',
      horse: '#8B4A2B',
      other: '#4A515E',
    },
    shape: { radius: 8, cardRadius: 10 },
    typography: { body: FONT_INTER, heading: FONT_INTER, headingWeight: 650 },
    effects: { shadows: 'flat', motion: 'subtle', playful: false },
  },

  'neutral-dark': {
    id: 'neutral-dark',
    mode: 'dark',
    colors: {
      background: '#121417',
      surface: '#1A1D21',
      surfaceRaised: '#23272D',
      text: '#E8EAED',
      textMuted: '#A9B0BB',
      border: '#30353D',
      primary: '#8AB0FF',
      onPrimary: '#0B1530',
      secondary: '#C3C9D3',
      onSecondary: '#16181D',
      success: '#6FCF97',
      warning: '#F2C14E',
      error: '#FF8A80',
      info: '#8AB0FF',
      focus: '#8AB0FF',
    },
    species: {
      dog: '#E3B26B',
      cat: '#D49BE6',
      rabbit: '#A9ADEB',
      rodent: '#CFAE8B',
      bird: '#7FD3A2',
      fish: '#7CC8E5',
      reptile: '#A9D67B',
      horse: '#E59F7F',
      other: '#C3C9D3',
    },
    shape: { radius: 8, cardRadius: 10 },
    typography: { body: FONT_INTER, heading: FONT_INTER, headingWeight: 650 },
    effects: { shadows: 'none', motion: 'subtle', playful: false },
  },

  playful: {
    id: 'playful',
    mode: 'light',
    colors: {
      background: '#FFF7EC',
      surface: '#FFFFFF',
      surfaceRaised: '#FFFFFF',
      text: '#2B2148',
      textMuted: '#5D5578',
      border: '#F0E2CF',
      primary: '#6B3FD9',
      onPrimary: '#FFFFFF',
      secondary: '#C2335F',
      onSecondary: '#FFFFFF',
      success: '#16794A',
      warning: '#9C5700',
      error: '#C4233A',
      info: '#1F6FB8',
      focus: '#6B3FD9',
    },
    species: {
      dog: '#F59E0B',
      cat: '#EC4899',
      rabbit: '#8B5CF6',
      rodent: '#C2853D',
      bird: '#10B981',
      fish: '#0EA5E9',
      reptile: '#65A30D',
      horse: '#EA580C',
      other: '#6366F1',
    },
    shape: { radius: 16, cardRadius: 24 },
    typography: { body: FONT_NUNITO, heading: FONT_FREDOKA, headingWeight: 600 },
    effects: { shadows: 'soft', motion: 'lively', playful: true },
  },

  // The original "Meadow" look, kept as an optional fourth theme for existing users.
  meadow: {
    id: 'meadow',
    mode: 'light',
    colors: {
      background: '#F6F3EC',
      surface: '#FFFFFF',
      surfaceRaised: '#FFFFFF',
      text: '#1F2A27',
      textMuted: '#4F5D58',
      border: '#E4DED0',
      primary: '#0E7C66',
      onPrimary: '#FFFFFF',
      // The signature coral #F4845F is too light for text; it is kept as `accent`
      // (decorative only) and a darker coral is used wherever text is involved.
      secondary: '#B84A28',
      onSecondary: '#FFFFFF',
      accent: '#F4845F',
      success: '#1C7A43',
      warning: '#965A00',
      error: '#BF2F2F',
      info: '#226C9B',
      focus: '#0E7C66',
    },
    species: {
      dog: '#C77B30',
      cat: '#B0567D',
      rabbit: '#7A6BB8',
      rodent: '#9C7650',
      bird: '#3C9A62',
      fish: '#2F86A8',
      reptile: '#6E9431',
      horse: '#B3613A',
      other: '#0E7C66',
    },
    shape: { radius: 12, cardRadius: 16 },
    typography: { body: FONT_NUNITO, heading: FONT_NUNITO, headingWeight: 800 },
    effects: { shadows: 'soft', motion: 'subtle', playful: false },
  },
};

export const THEME_IDS = Object.keys(THEMES);
export const DEFAULT_LIGHT = 'neutral-light';
export const DEFAULT_DARK = 'neutral-dark';
