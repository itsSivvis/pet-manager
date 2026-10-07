// Households separate the data of several families on one instance. Each user
// and each pet belongs to exactly one household.
import { randomBytes } from 'node:crypto';

export const HOUSEHOLD_SETTING_DEFAULTS = {
  ntfy: { enabled: false, url: 'https://ntfy.sh', topic: '', token: '' },
  notificationLocale: null, // null = DEFAULT_LOCALE from the environment
};

/** Unguessable invite code (128 bit, URL-safe). */
export const newInviteCode = () => randomBytes(16).toString('base64url');

/** Stored settings merged over the defaults. */
export function householdSettings(row) {
  return { ...structuredClone(HOUSEHOLD_SETTING_DEFAULTS), ...(row?.settings ?? {}) };
}

export async function createHousehold(db, name) {
  const { rows } = await db.query('INSERT INTO households (name) VALUES ($1) RETURNING *', [name]);
  return rows[0];
}

export async function getHouseholdSettings(db, householdId) {
  const { rows } = await db.query('SELECT settings FROM households WHERE id = $1', [householdId]);
  return householdSettings(rows[0]);
}

/** Merges `values` (known keys only) into the household's settings. */
export async function setHouseholdSettings(db, householdId, values) {
  const known = Object.fromEntries(
    Object.entries(values).filter(([k]) => k in HOUSEHOLD_SETTING_DEFAULTS),
  );
  const { rows } = await db.query(
    'UPDATE households SET settings = settings || $2::jsonb, updated_at = now() WHERE id = $1 RETURNING settings',
    [householdId, JSON.stringify(known)],
  );
  return householdSettings(rows[0]);
}
