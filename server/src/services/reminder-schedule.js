// Pure scheduling helpers (no I/O) so they can be unit-tested in isolation.
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between two 'YYYY-MM-DD' strings (b - a), DST-independent. */
export function daysBetween(a, b) {
  return Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / DAY_MS);
}

function ymd(date) {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m - 1, d];
}

export function addDays(date, days) {
  const d = new Date(Date.UTC(...ymd(date)) + days * DAY_MS);
  return d.toISOString().slice(0, 10);
}

/** Is a dose scheduled on calendar day `date` for this medication? */
export function isScheduledOn(med, date) {
  if (date < med.start_date) return false;
  if (med.end_date && date > med.end_date) return false;
  const interval = Math.max(1, med.interval_days || 1);
  return daysBetween(med.start_date, date) % interval === 0;
}

/**
 * All scheduled dose times of a medication within the half-open interval
 * (from, to], interpreted in the given IANA timezone. Returns sorted
 * `{ at: Date, date: 'YYYY-MM-DD', time: 'HH:MM' }` objects.
 */
export function medicationOccurrences(med, from, to, tz = 'UTC') {
  const times = [...(med.times || [])].sort();
  if (!times.length) return [];
  const result = [];
  const firstDay = dayjs(from).tz(tz).format('YYYY-MM-DD');
  const lastDay = dayjs(to).tz(tz).format('YYYY-MM-DD');
  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
    if (!isScheduledOn(med, day)) continue;
    for (const time of times) {
      const at = dayjs.tz(`${day} ${time}`, 'YYYY-MM-DD HH:mm', tz).toDate();
      if (at > from && at <= to) result.push({ at, date: day, time });
    }
  }
  return result;
}

/** Next scheduled dose strictly after `now`, searching up to `horizonDays` ahead. */
export function nextOccurrence(med, now, tz = 'UTC', horizonDays = 400) {
  const to = new Date(now.getTime() + horizonDays * DAY_MS);
  // Search in monthly chunks to keep the common case cheap.
  for (let from = now; from < to;) {
    const chunkEnd = new Date(Math.min(from.getTime() + 31 * DAY_MS, to.getTime()));
    const [first] = medicationOccurrences(med, from, chunkEnd, tz);
    if (first) return first;
    from = chunkEnd;
  }
  return null;
}

/** Due date of a recurring prevention item, or null if it cannot be computed. */
export function preventionDueDate(item) {
  if (!item.last_date || !item.interval_days) return null;
  return addDays(item.last_date, item.interval_days);
}

/** 'overdue' | 'due_soon' | 'ok' | 'unknown' relative to `today` ('YYYY-MM-DD'). */
export function preventionStatus(item, today, soonDays = 14) {
  const due = preventionDueDate(item);
  if (!due) return 'unknown';
  const diff = daysBetween(today, due);
  if (diff < 0) return 'overdue';
  if (diff <= soonDays) return 'due_soon';
  return 'ok';
}

export function todayIn(tz, now = new Date()) {
  return dayjs(now).tz(tz).format('YYYY-MM-DD');
}

export function isLowStock(med) {
  return (
    med.stock != null &&
    med.low_stock_threshold != null &&
    Number(med.stock) <= Number(med.low_stock_threshold)
  );
}
