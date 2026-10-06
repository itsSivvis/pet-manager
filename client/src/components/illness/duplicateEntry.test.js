import { describe, it, expect } from 'vitest';
import { duplicateEntry, latestEntry } from './duplicateEntry.js';

const entry = {
  id: 7,
  illness_id: 3,
  created_at: '2026-01-02T10:00:00Z',
  date: '2026-01-02',
  severity: 3,
  temperature_c: 39.1,
  symptoms: 'Coughing',
  treatment: 'Rest',
  notes: null,
};

describe('duplicateEntry', () => {
  it('copies clinical fields and sets the new date', () => {
    expect(duplicateEntry(entry, '2026-01-03')).toEqual({
      date: '2026-01-03',
      severity: 3,
      temperature_c: 39.1,
      symptoms: 'Coughing',
      treatment: 'Rest',
      notes: null,
    });
  });

  it('drops identity fields and does not mutate the original', () => {
    const copy = duplicateEntry(entry, '2026-01-03');
    expect(copy).not.toHaveProperty('id');
    expect(copy).not.toHaveProperty('illness_id');
    expect(copy).not.toHaveProperty('created_at');
    copy.symptoms = 'changed';
    expect(entry.symptoms).toBe('Coughing');
  });

  it('throws without an entry', () => {
    expect(() => duplicateEntry(null, '2026-01-01')).toThrow(TypeError);
  });
});

describe('latestEntry', () => {
  it('returns the newest entry by date then id', () => {
    const entries = [
      { id: 1, date: '2026-01-01' },
      { id: 3, date: '2026-01-05' },
      { id: 2, date: '2026-01-05' },
    ];
    expect(latestEntry(entries).id).toBe(3);
    expect(latestEntry([])).toBeNull();
  });
});
