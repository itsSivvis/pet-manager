import { THEMES, DEFAULT_DARK, DEFAULT_LIGHT } from './tokens.js';

/** Resolves a stored choice ('system' or a theme id) to an actual theme id. */
export function resolveThemeId(choice, prefersDark) {
  if (THEMES[choice]) return choice;
  return prefersDark ? DEFAULT_DARK : DEFAULT_LIGHT;
}
