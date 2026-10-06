import { describe, it, expect } from 'vitest';
import {
  medicationOccurrences,
  nextOccurrence,
  isScheduledOn,
  preventionDueDate,
  preventionStatus,
  daysBetween,
  isLowStock,
} from '../src/services/reminder-schedule.js';

const med = (over = {}) => ({
  times: ['08:00', '20:00'],
  interval_days: 1,
  start_date: '2026-03-01',
  end_date: null,
  ...over,
});
const utc = (s) => new Date(s);

describe('isScheduledOn', () => {
  it('respects start, end and interval', () => {
    const m = med({ interval_days: 3, end_date: '2026-03-10' });
    expect(isScheduledOn(m, '2026-02-28')).toBe(false);
    expect(isScheduledOn(m, '2026-03-01')).toBe(true);
    expect(isScheduledOn(m, '2026-03-02')).toBe(false);
    expect(isScheduledOn(m, '2026-03-04')).toBe(true);
    expect(isScheduledOn(m, '2026-03-10')).toBe(true);
    expect(isScheduledOn(m, '2026-03-13')).toBe(false);
  });
});

describe('medicationOccurrences', () => {
  it('returns all times in a half-open window (from, to]', () => {
    const occ = medicationOccurrences(
      med(),
      utc('2026-03-01T08:00:00Z'),
      utc('2026-03-02T08:00:00Z'),
    );
    expect(occ.map((o) => o.at.toISOString())).toEqual([
      '2026-03-01T20:00:00.000Z',
      '2026-03-02T08:00:00.000Z',
    ]);
  });

  it('interprets times in the configured timezone', () => {
    const occ = medicationOccurrences(
      med({ times: ['08:00'] }),
      utc('2026-03-05T00:00:00Z'),
      utc('2026-03-05T23:59:00Z'),
      'Europe/Berlin',
    );
    expect(occ[0].at.toISOString()).toBe('2026-03-05T07:00:00.000Z'); // CET = UTC+1
  });

  it('handles the DST switch (Europe/Berlin, last Sunday of March)', () => {
    const occ = medicationOccurrences(
      med({ times: ['08:00'] }),
      utc('2026-03-28T12:00:00Z'),
      utc('2026-03-30T12:00:00Z'),
      'Europe/Berlin',
    );
    expect(occ.map((o) => o.at.toISOString())).toEqual([
      '2026-03-29T06:00:00.000Z',
      '2026-03-30T06:00:00.000Z',
    ]);
  });

  it('returns nothing for medications without times', () => {
    expect(medicationOccurrences(med({ times: [] }), utc('2026-03-01'), utc('2026-03-09'))).toEqual(
      [],
    );
  });
});

describe('nextOccurrence', () => {
  it('finds the next dose for weekly schedules', () => {
    const next = nextOccurrence(
      med({ times: ['09:00'], interval_days: 7 }),
      utc('2026-03-02T00:00:00Z'),
    );
    expect(next.at.toISOString()).toBe('2026-03-08T09:00:00.000Z');
  });
  it('returns null after the end date', () => {
    expect(nextOccurrence(med({ end_date: '2026-03-02' }), utc('2026-03-03T00:00:00Z'))).toBeNull();
  });
});

describe('prevention', () => {
  it('computes due date and status', () => {
    const item = { last_date: '2026-01-01', interval_days: 30 };
    expect(preventionDueDate(item)).toBe('2026-01-31');
    expect(preventionStatus(item, '2026-01-10')).toBe('ok');
    expect(preventionStatus(item, '2026-01-20')).toBe('due_soon');
    expect(preventionStatus(item, '2026-02-01')).toBe('overdue');
    expect(preventionStatus({ last_date: null, interval_days: 30 }, '2026-01-01')).toBe('unknown');
  });
  it('counts days across month and leap-year boundaries', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
});

describe('isLowStock', () => {
  it('only reports when both values are set', () => {
    expect(isLowStock({ stock: 5, low_stock_threshold: 5 })).toBe(true);
    expect(isLowStock({ stock: 6, low_stock_threshold: 5 })).toBe(false);
    expect(isLowStock({ stock: null, low_stock_threshold: 5 })).toBe(false);
  });
});
