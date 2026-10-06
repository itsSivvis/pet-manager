-- Initial schema. Migrations must be safe on an empty database and are applied
-- exactly once (tracked in schema_migrations). Use IF NOT EXISTS where possible
-- so a partially restored database can still be migrated.

CREATE TABLE IF NOT EXISTS users (
  id            serial PRIMARY KEY,
  email         text NOT NULL,
  display_name  text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  locale        text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'de')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- Key/value instance settings (login requirement, ntfy, ...). Values are JSON.
CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pets (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  species     text NOT NULL DEFAULT 'other'
              CHECK (species IN ('dog', 'cat', 'rabbit', 'rodent', 'bird', 'fish', 'reptile', 'horse', 'other')),
  breed       text,
  sex         text CHECK (sex IN ('male', 'female', 'unknown')),
  neutered    boolean NOT NULL DEFAULT false,
  birth_date  date,
  color       text,
  microchip   text,
  notes       text,
  photo       text,
  archived    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_entries (
  id         serial PRIMARY KEY,
  pet_id     integer NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  date       date NOT NULL,
  type       text NOT NULL CHECK (type IN ('weight', 'vet_visit', 'vaccination', 'observation', 'other')),
  title      text,
  weight_kg  numeric(7, 3) CHECK (weight_kg IS NULL OR weight_kg > 0),
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS health_entries_pet_date_idx ON health_entries (pet_id, date DESC);

CREATE TABLE IF NOT EXISTS catalog_foods (
  id             serial PRIMARY KEY,
  name           text NOT NULL,
  brand          text,
  kcal_per_100g  numeric(7, 2),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_medications (
  id             serial PRIMARY KEY,
  name           text NOT NULL,
  active_ingredient text,
  default_dose   numeric(10, 3),
  unit           text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medications (
  id                  serial PRIMARY KEY,
  pet_id              integer NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  catalog_id          integer REFERENCES catalog_medications (id) ON DELETE SET NULL,
  name                text NOT NULL,
  dose                numeric(10, 3),
  unit                text,
  -- Times of day ('HH:MM', instance timezone) at which a dose is due.
  times               text[] NOT NULL DEFAULT '{}',
  -- 1 = every day, 2 = every other day, 7 = weekly, ...
  interval_days       integer NOT NULL DEFAULT 1 CHECK (interval_days BETWEEN 1 AND 365),
  start_date          date NOT NULL DEFAULT CURRENT_DATE,
  end_date            date,
  stock               numeric(10, 3),
  low_stock_threshold numeric(10, 3),
  reminders_enabled   boolean NOT NULL DEFAULT true,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS medications_pet_idx ON medications (pet_id);

-- Doses that were actually given (decrement stock when recorded).
CREATE TABLE IF NOT EXISTS medication_doses (
  id            serial PRIMARY KEY,
  medication_id integer NOT NULL REFERENCES medications (id) ON DELETE CASCADE,
  given_at      timestamptz NOT NULL DEFAULT now(),
  amount        numeric(10, 3),
  given_by      integer REFERENCES users (id) ON DELETE SET NULL,
  notes         text
);
CREATE INDEX IF NOT EXISTS medication_doses_med_idx ON medication_doses (medication_id, given_at DESC);

CREATE TABLE IF NOT EXISTS appointments (
  id                     serial PRIMARY KEY,
  pet_id                 integer NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  title                  text NOT NULL,
  starts_at              timestamptz NOT NULL,
  location               text,
  notes                  text,
  remind_minutes_before  integer CHECK (remind_minutes_before IS NULL OR remind_minutes_before BETWEEN 0 AND 20160),
  done                   boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointments_starts_idx ON appointments (starts_at);

CREATE TABLE IF NOT EXISTS feeding_plans (
  id         serial PRIMARY KEY,
  pet_id     integer NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  food_id    integer REFERENCES catalog_foods (id) ON DELETE SET NULL,
  food_name  text NOT NULL,
  amount     numeric(10, 2),
  unit       text,
  times      text[] NOT NULL DEFAULT '{}',
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prevention_items (
  id            serial PRIMARY KEY,
  pet_id        integer NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('deworming', 'flea_tick', 'vaccination', 'dental', 'grooming', 'other')),
  product       text,
  last_date     date,
  interval_days integer CHECK (interval_days IS NULL OR interval_days BETWEEN 1 AND 3650),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS illnesses (
  id          serial PRIMARY KEY,
  pet_id      integer NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  title       text NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'chronic', 'resolved')),
  started_on  date NOT NULL DEFAULT CURRENT_DATE,
  ended_on    date,
  diagnosis   text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_on IS NULL OR ended_on >= started_on)
);

CREATE TABLE IF NOT EXISTS illness_entries (
  id            serial PRIMARY KEY,
  illness_id    integer NOT NULL REFERENCES illnesses (id) ON DELETE CASCADE,
  date          date NOT NULL,
  severity      smallint CHECK (severity IS NULL OR severity BETWEEN 1 AND 5),
  temperature_c numeric(4, 1),
  symptoms      text,
  treatment     text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS illness_entries_illness_idx ON illness_entries (illness_id, date);

-- One row per reminder that has been sent, so restarts never send duplicates.
CREATE TABLE IF NOT EXISTS reminder_log (
  key     text PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);
