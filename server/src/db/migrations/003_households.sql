-- Multiple households per instance. Every user and every pet belongs to exactly
-- one household; all pet data (health, medication, illness, ...) hangs off pets
-- and is therefore separated per household. The catalog stays instance-wide.

CREATE TABLE IF NOT EXISTS households (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  -- Per-household settings (ntfy, notificationLocale). Values are JSON.
  settings    jsonb NOT NULL DEFAULT '{}',
  -- Lets new accounts join this household. NULL = no invite active.
  invite_code text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS household_id integer REFERENCES households (id) ON DELETE RESTRICT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS household_id integer REFERENCES households (id) ON DELETE CASCADE;

-- Existing instances: everything moves into one household, together with the
-- notification settings that used to be instance-wide.
DO $$
DECLARE
  hid integer;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE household_id IS NULL)
     OR EXISTS (SELECT 1 FROM pets WHERE household_id IS NULL) THEN
    INSERT INTO households (name, settings)
    VALUES (
      'Household',
      COALESCE(
        (SELECT jsonb_object_agg(key, value) FROM settings WHERE key IN ('ntfy', 'notificationLocale')),
        '{}'::jsonb
      )
    )
    RETURNING id INTO hid;
    UPDATE users SET household_id = hid WHERE household_id IS NULL;
    UPDATE pets SET household_id = hid WHERE household_id IS NULL;
    -- Anonymous mode (if enabled) keeps showing this household.
    INSERT INTO settings (key, value) VALUES ('anonymousHouseholdId', to_jsonb(hid))
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;

DELETE FROM settings WHERE key IN ('ntfy', 'notificationLocale');

ALTER TABLE users ALTER COLUMN household_id SET NOT NULL;
ALTER TABLE pets ALTER COLUMN household_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS users_household_idx ON users (household_id);
CREATE INDEX IF NOT EXISTS pets_household_idx ON pets (household_id, archived);
