import {
  medicationOccurrences,
  preventionDueDate,
  todayIn,
  isLowStock,
} from './reminder-schedule.js';
import { sendNtfy } from './ntfy.js';
import { t, formatDate, formatTime, formatNumber } from '../i18n/messages.js';

// How far back each run looks. Together with reminder_log this makes reminders
// robust against short downtimes without ever sending duplicates.
const LOOKBACK_MS = 15 * 60 * 1000;
// A dose recorded this long before a scheduled time counts as "already given".
const GIVEN_TOLERANCE_MS = 2 * 60 * 60 * 1000;
const PREVENTION_HOUR = 9;

/**
 * Computes all reminders due at `now`. Returns `{ key, title, message, tags }`
 * objects; duplicates are filtered later via reminder_log.
 */
export async function collectReminders({ pool, tz, locale, now = new Date() }) {
  const from = new Date(now.getTime() - LOOKBACK_MS);
  const out = [];

  const meds = await pool.query(`
    SELECT m.*, p.name AS pet_name,
      (SELECT max(given_at) FROM medication_doses d WHERE d.medication_id = m.id) AS last_given
    FROM medications m JOIN pets p ON p.id = m.pet_id
    WHERE m.reminders_enabled AND NOT p.archived`);
  for (const med of meds.rows) {
    for (const occ of medicationOccurrences(med, from, now, tz)) {
      if (med.last_given && occ.at - med.last_given < GIVEN_TOLERANCE_MS) continue;
      const dose = med.dose != null ? `${formatNumber(locale, med.dose)} ${med.unit ?? ''}` : '';
      out.push({
        key: `med:${med.id}:${occ.at.toISOString()}`,
        title: t(locale, 'medicationDue.title', { pet: med.pet_name }),
        message: t(locale, 'medicationDue.body', { medication: med.name, dose, time: occ.time }),
        tags: ['pill'],
      });
    }
    if (isLowStock(med)) {
      out.push({
        key: `stock:${med.id}:${todayIn(tz, now)}`,
        title: t(locale, 'lowStock.title', { medication: med.name }),
        message: t(locale, 'lowStock.body', {
          stock: `${formatNumber(locale, med.stock)} ${med.unit ?? ''}`.trim(),
          pet: med.pet_name,
        }),
        tags: ['warning'],
      });
    }
  }

  const appts = await pool.query(
    `SELECT a.*, p.name AS pet_name FROM appointments a JOIN pets p ON p.id = a.pet_id
     WHERE NOT a.done AND a.remind_minutes_before IS NOT NULL
       AND a.starts_at - make_interval(mins => a.remind_minutes_before) BETWEEN $1 AND $2`,
    [from, now],
  );
  for (const a of appts.rows) {
    out.push({
      key: `appt:${a.id}:${a.starts_at.toISOString()}`,
      title: t(locale, 'appointment.title', { pet: a.pet_name }),
      message: t(locale, 'appointment.body', {
        title: a.title,
        date: formatDate(locale, a.starts_at, tz),
        time: formatTime(locale, a.starts_at, tz),
      }),
      tags: ['calendar'],
    });
  }

  const today = todayIn(tz, now);
  const localHour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(
      now,
    ),
  );
  if (localHour >= PREVENTION_HOUR) {
    const prev = await pool.query(
      `SELECT i.*, p.name AS pet_name FROM prevention_items i JOIN pets p ON p.id = i.pet_id
       WHERE NOT p.archived AND i.last_date IS NOT NULL AND i.interval_days IS NOT NULL`,
    );
    for (const item of prev.rows) {
      const due = preventionDueDate(item);
      if (due !== today) continue;
      out.push({
        key: `prev:${item.id}:${due}`,
        title: t(locale, 'preventionDue.title', { pet: item.pet_name }),
        message: t(locale, 'preventionDue.body', {
          type: t(locale, `prevention.${item.type}`),
          product: item.product ? `(${item.product})` : '',
        }),
        tags: ['shield'],
      });
    }
  }
  return out;
}

/** One scheduler tick: collect, de-duplicate via reminder_log, send. */
export async function runReminders({
  pool,
  settings,
  config,
  now = new Date(),
  send = sendNtfy,
  log = console,
}) {
  const ntfy = await settings.get('ntfy');
  if (!ntfy?.enabled || !ntfy.topic) return 0;
  const locale = (await settings.get('notificationLocale')) || config.defaultLocale;
  const reminders = await collectReminders({ pool, tz: config.timezone, locale, now });
  let sent = 0;
  for (const r of reminders) {
    const { rowCount } = await pool.query(
      'INSERT INTO reminder_log (key) VALUES ($1) ON CONFLICT DO NOTHING',
      [r.key],
    );
    if (!rowCount) continue;
    try {
      await send(ntfy, r);
      sent++;
    } catch (err) {
      // Allow a retry on the next tick.
      await pool.query('DELETE FROM reminder_log WHERE key = $1', [r.key]);
      log.warn?.(`reminder ${r.key} failed: ${err.message}`);
    }
  }
  return sent;
}

export function startReminderLoop(deps) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runReminders(deps);
      // Keep the log small: entries older than 60 days are no longer needed.
      await deps.pool.query("DELETE FROM reminder_log WHERE sent_at < now() - interval '60 days'");
    } catch (err) {
      deps.log?.error?.(`reminder loop error: ${err.message}`);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, deps.config.reminderIntervalMs);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}
