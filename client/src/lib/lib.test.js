import { describe, it, expect, beforeAll } from 'vitest';
import i18n from 'i18next';
import { preventionDueDate, preventionStatus, addDays } from './schedule.js';
import { resolveThemeId } from '../theme/resolveThemeId.js';

describe('schedule helpers', () => {
  it('computes prevention due dates and status', () => {
    expect(preventionDueDate({ last_date: '2026-01-31', interval_days: 30 })).toBe('2026-03-02');
    expect(preventionStatus({ last_date: '2026-01-01', interval_days: 30 }, '2026-02-05')).toBe(
      'overdue',
    );
    expect(preventionStatus({ last_date: null }, '2026-02-05')).toBe('unknown');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('resolveThemeId', () => {
  it('follows the system preference for "system"', () => {
    expect(resolveThemeId('system', false)).toBe('neutral-light');
    expect(resolveThemeId('system', true)).toBe('neutral-dark');
  });
  it('keeps an explicit choice and ignores unknown values', () => {
    expect(resolveThemeId('playful', true)).toBe('playful');
    expect(resolveThemeId('does-not-exist', true)).toBe('neutral-dark');
  });
});

describe('format helpers', () => {
  let format;
  beforeAll(async () => {
    // format.js imports the i18n setup, which needs a minimal DOM-free environment.
    globalThis.document = { documentElement: {} };
    globalThis.window = globalThis;
    format = await import('./format.js');
  });

  it('formats dates and numbers per language', async () => {
    await i18n.changeLanguage('de');
    expect(format.formatNumber(1234.5)).toBe('1.234,5');
    expect(
      format.formatDate('2026-03-05', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    ).toBe('05.03.2026');
    await i18n.changeLanguage('en');
    expect(format.formatNumber(1234.5)).toBe('1,234.5');
  });

  it('parses calendar dates without timezone shift', () => {
    const d = format.parseDate('2026-03-05');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 5]);
  });

  it('formats ages', () => {
    const t = (key, { count }) => `${count} ${key.endsWith('Years') ? 'y' : 'm'}`;
    expect(format.formatAge('2020-06-15', t, new Date(2026, 5, 14))).toBe('5 y');
    expect(format.formatAge('2026-01-10', t, new Date(2026, 5, 14))).toBe('5 m');
  });
});
