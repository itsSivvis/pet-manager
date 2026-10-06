// Fields copied when an illness entry is duplicated ("same as yesterday").
const COPY_FIELDS = ['severity', 'temperature_c', 'symptoms', 'treatment', 'notes'];

/**
 * Returns form values for a new entry based on an existing one: all clinical
 * fields are copied, identity fields are dropped and the date is set to
 * `date` (default: today). The original entry is never modified.
 */
export function duplicateEntry(entry, date) {
  if (!entry) throw new TypeError('entry is required');
  const copy = { date };
  for (const field of COPY_FIELDS) {
    if (entry[field] !== undefined) copy[field] = entry[field];
  }
  return copy;
}

/** Picks the most recent entry (by date, then id) as the duplication source. */
export function latestEntry(entries) {
  return (
    [...(entries ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0] ?? null
  );
}
