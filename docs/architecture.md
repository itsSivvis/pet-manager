# Architecture overview

```
 Browser (React PWA)                        Server (Node.js 22, Express 5)            PostgreSQL 16
┌──────────────────────────┐   /api/* JSON  ┌──────────────────────────────┐   pg    ┌──────────────┐
│ React 19 + MUI 9         │ ─────────────▶ │ routes → zod validation      │ ──────▶ │ tables,      │
│ React Router, React Query│ ◀───────────── │ auth (JWT) · helmet · CORS   │         │ migrations   │
│ i18next (en/de)          │  /uploads/*    │ reminder scheduler (1/min) ──┼──▶ ntfy └──────────────┘
│ theme tokens → MUI theme │ ◀───────────── │ static client (production)   │
└──────────────────────────┘                └──────────────────────────────┘
                                                      │ photos
                                                      ▼
                                                 UPLOAD_DIR (volume)
```

In production a **single container** serves both the API and the built client;
PostgreSQL runs in its own container. A reverse proxy terminates HTTPS.

## Repository layout

```
client/                 React app (Vite, PWA)
  src/api/              fetch wrapper (error codes) + React Query hooks
  src/auth/             auth context (login, register, anonymous mode)
  src/components/       shared UI (Layout, FormDialog, ThemePicker, charts, illness PDF …)
  src/i18n/             i18next setup + en/de JSON
  src/pages/            routes; pages/pet/* are the tabs of a pet
  src/theme/            design tokens, MUI theme factory, contrast tests
  public/theme-init.js  applies the stored theme before the first paint
server/
  src/config.js         all environment variables, validated (JWT_SECRET in prod!)
  src/app.js            Express app: security middleware, routing, error handler
  src/db/               pool, migration runner, CLI (migrate/seed), demo seed
  src/db/migrations/    numbered SQL migrations
  src/middleware/auth.js JWT + anonymous mode + admin guard
  src/routes/           REST endpoints (+ zod schemas)
  src/lib/crud.js       generic CRUD router for pet sub-resources
  src/services/         reminder schedule (pure), scheduler, ntfy, settings store
  src/i18n/messages.js  push notification texts (en/de)
  test/                 vitest unit + integration tests (real PostgreSQL)
e2e/                    Playwright smoke test
scripts/                i18n check, license check, screenshots, icon generation
docs/                   this documentation, OpenAPI spec, screenshots
```

## Data model

All logged-in users share the same data (one household per instance).

| Table                                   | Content                                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `users`                                 | accounts (`admin` / `user`), preferred language, `password_changed_at`                        |
| `settings`                              | instance settings as JSON (`requireLogin`, `allowRegistration`, `ntfy`, `notificationLocale`) |
| `pets`                                  | pets incl. photo file name and `archived` flag                                                |
| `health_entries`                        | weight, vet visits, vaccinations, observations                                                |
| `medications` / `medication_doses`      | schedule (times of day, every _n_ days, start/end), stock; doses actually given               |
| `appointments`                          | date/time, location, reminder offset                                                          |
| `feeding_plans`                         | food (optionally from catalog), amount, times                                                 |
| `prevention_items`                      | deworming, flea & tick … with last date + interval → due date                                 |
| `illnesses` / `illness_entries`         | illness course with daily entries                                                             |
| `catalog_foods` / `catalog_medications` | shared catalog for quick entry                                                                |
| `reminder_log`                          | sent reminders (prevents duplicates after restarts)                                           |
| `schema_migrations`                     | applied migration files                                                                       |

## Key flows

**Authentication.** `POST /api/auth/login` returns a JWT (HS256, `JWT_EXPIRES_IN`).
The client stores it in `localStorage` and sends `Authorization: Bearer …`.
Every request loads the user from the database, so role changes and deleted
accounts take effect immediately; tokens issued before a password change are
rejected.

**Anonymous mode.** If the server runs with `ALLOW_ANONYMOUS_MODE=true` **and**
an admin turns off "Require login", requests without a token act as a
synthetic guest user with access to all data routes. `/api/admin/*` always
requires a real admin token. See the README for the security implications.

**Reminders.** `services/reminders.js` runs every `REMINDER_INTERVAL_SECONDS`.
It looks 15 minutes back, computes due medication doses
(`reminder-schedule.js`, timezone-aware via `TZ`), appointment reminders,
prevention items due today (from 09:00) and low stock. Each reminder has a
unique key that is inserted into `reminder_log` before sending – so every
reminder is sent at most once, even with restarts. If ntfy fails, the key is
removed again and the reminder is retried on the next tick. Doses marked as
given within ±2 h are not reminded.

**Migrations.** `db/migrate.js` takes a PostgreSQL advisory lock, applies every
`*.sql` file not yet in `schema_migrations` in lexical order, each in its own
transaction. The server migrates automatically on start; `npm run db:migrate`
does it manually.

**Errors.** The API responds with `{ "error": { "code", "message", "details" } }`.
`code` is stable and translated by the client (`errors.<CODE>`).

## Frontend performance

- Route-level code splitting (`React.lazy`): pet pages (with Recharts), admin
  (with MUI DataGrid) and settings load on demand.
- jsPDF is loaded via dynamic `import()` only when a PDF is generated.
- The service worker precaches the app shell but never API responses or photos.
- Fonts are self-hosted; only the Latin subsets are precached.
