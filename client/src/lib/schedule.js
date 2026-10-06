// Calendar helpers mirroring server/src/services/reminder-schedule.js for the UI.
const DAY = 86_400_000;
const utc = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const addDays = (date, days) => new Date(utc(date) + days * DAY).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / DAY);

export function preventionDueDate(item) {
  if (!item.last_date || !item.interval_days) return null;
  return addDays(item.last_date, item.interval_days);
}

export function preventionStatus(item, today, soonDays = 14) {
  const due = preventionDueDate(item);
  if (!due) return 'unknown';
  const diff = daysBetween(today, due);
  if (diff < 0) return 'overdue';
  if (diff <= soonDays) return 'due_soon';
  return 'ok';
}
