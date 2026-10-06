// WCAG 2.x relative luminance and contrast ratio.
function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((x) => x + x).join('') : h;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Picks black-ish or white text, whichever has more contrast on `bg`. */
export function readableTextOn(bg, dark = '#16181D', light = '#FFFFFF') {
  return contrastRatio(bg, dark) >= contrastRatio(bg, light) ? dark : light;
}

/** Mixes a hex color with another (0..1 of `other`). */
export function mix(hex, other, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
