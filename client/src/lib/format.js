// Locale-aware formatting based on the active UI language (Intl API).
import i18n from '../i18n/index.js';

const locale = () => (i18n.resolvedLanguage === 'de' ? 'de-DE' : 'en-GB');

/** Parses 'YYYY-MM-DD' as a local calendar date (no timezone shift). */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function formatDate(value, options = { dateStyle: 'medium' }) {
  const d = parseDate(value);
  return d ? new Intl.DateTimeFormat(locale(), options).format(d) : '';
}

export function formatShortDate(value) {
  return formatDate(value, { day: 'numeric', month: 'short' });
}

export function formatDateTime(value) {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatTime(value) {
  return formatDate(value, { timeStyle: 'short' });
}

export function formatNumber(value, maximumFractionDigits = 2) {
  if (value == null || value === '') return '';
  return new Intl.NumberFormat(locale(), { maximumFractionDigits }).format(Number(value));
}

/** "in 3 days" / "vor 2 Tagen" relative to today, in whole days. */
export function formatRelativeDays(value, today = new Date()) {
  const d = parseDate(value);
  if (!d) return '';
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((d - start) / 86_400_000);
  return new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' }).format(diff, 'day');
}

/** Age in years/months as a localized string, e.g. "3 years". */
export function formatAge(birthDate, t, today = new Date()) {
  const d = parseDate(birthDate);
  if (!d) return '';
  let months = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
  if (today.getDate() < d.getDate()) months -= 1;
  if (months < 0) return '';
  if (months < 12) return t('common.ageMonths', { count: months });
  return t('common.ageYears', { count: Math.floor(months / 12) });
}

export function todayIso(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Value for <input type="datetime-local"> from an ISO timestamp. */
export function toDateTimeLocal(value) {
  const d = value ? new Date(value) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
