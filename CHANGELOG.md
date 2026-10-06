# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - YYYY-MM-DD

First public release.

### Added

- Pets with photos, archive, health records and weight chart.
- Medication schedules with times of day and intervals, recorded doses
  ("mark as given", undo) and stock tracking with low-stock warnings.
- Appointments, feeding plans and prevention items (deworming, flea & tick,
  vaccinations …) with due dates.
- Illness timelines with daily entries, "duplicate entry" and PDF export
  with preview.
- Dashboard with today's doses, upcoming appointments, due prevention and
  items that need attention.
- Push reminders via [ntfy](https://ntfy.sh), localized (English/German).
- Administration: login requirement, registration, ntfy, users, food and
  medication catalog.
- Four themes (Neutral Light, Neutral Dark, Playful, Meadow) selectable at
  runtime; default follows the system light/dark preference.
- English (default) and German translations with automatic browser detection.
- Installable PWA with pull-to-refresh, self-hosted fonts.
- Docker image (non-root, health check) and Docker Compose setup.
- Optional fictional demo data (`npm run db:seed`).

### Security

- Server refuses to start in production without a strong `JWT_SECRET`.
- Rate-limited login/registration, bcrypt password hashing, password policy.
- Login requirement can only be disabled when `ALLOW_ANONYMOUS_MODE=true`;
  the admin area always requires an admin login.
- Strict Content Security Policy and security headers (helmet).
- Uploads validated by file signature and size; stored under random names.
- Changing the password signs out all other sessions.

[Unreleased]: https://github.com/OWNER/pet-manager/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/OWNER/pet-manager/releases/tag/v0.1.0
