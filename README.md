<p align="center">
  <img src="client/public/pwa-192.png" width="96" height="96" alt="" />
</p>

<h1 align="center">Pet Manager</h1>

<p align="center">
  Self-hosted pet care manager for your household: health records, medication
  schedules with push reminders, appointments, feeding plans, prevention and
  illness timelines – in a friendly, installable web app.
</p>

<p align="center">
  <a href="https://github.com/itsSivvis/pet-manager/actions/workflows/ci.yml"><img src="https://github.com/itsSivvis/pet-manager/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="README.de.md">🇩🇪 Deutsch</a>
</p>

---

## Screenshots

Three built-in themes (plus the classic _Meadow_), switchable at runtime:

| Neutral Light                                                                      | Neutral Dark                                                                       | Playful                                                                |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ![Dashboard – Neutral Light](docs/screenshots/neutral-light/desktop-dashboard.png) | ![Dashboard – Neutral Dark](docs/screenshots/neutral-dark/desktop-dashboard.png)   | ![Dashboard – Playful](docs/screenshots/playful/desktop-dashboard.png) |
| ![Mobile – Neutral Light](docs/screenshots/neutral-light/mobile-pet-overview.png)  | ![Mobile – Neutral Dark](docs/screenshots/neutral-dark/mobile-pet-medications.png) | ![Mobile – Playful](docs/screenshots/playful/mobile-illness.png)       |

More screenshots (every page, theme and viewport) are in [`docs/screenshots`](docs/screenshots).

## Features

- 🐾 **Pets** – profile with photo, species, breed, birthday, microchip; archive instead of delete.
- 🩺 **Health records** – weight (with chart), vet visits, vaccinations, observations.
- 💊 **Medication** – times of day, every _n_ days, start/end date; mark doses as given (with undo), stock tracking and low-stock warnings.
- 📅 **Appointments** with reminders, 🥣 **feeding plans**, 🛡️ **prevention** (deworming, flea & tick, vaccinations …) with due dates.
- 📈 **Illness timelines** – daily entries with severity and temperature, "same as last entry", **PDF export** with preview.
- 🏠 **Dashboard** – today's doses, upcoming appointments, due prevention, things that need attention.
- 🔔 **Push reminders** via [ntfy](https://ntfy.sh) (self-hostable), in English or German.
- 🎨 **Themes** – Neutral Light, Neutral Dark, Playful and Meadow; follows your system's light/dark setting by default. WCAG AA contrast is enforced by tests.
- 🌍 **English and German**, more languages are easy to add.
- 📱 **Installable PWA**, mobile-first, pull-to-refresh, works great on phones.
- 👥 **Multi-user household** – all accounts share the same pets; admin area for users, catalog and notifications.
- 🔒 **Privacy-friendly** – your data stays on your server; no trackers, no external CDNs (fonts are self-hosted).

## Quick start (Docker)

Requirements: Docker with the Compose plugin.

```bash
git clone https://github.com/itsSivvis/pet-manager.git && cd pet-manager && ./scripts/init-env.sh && docker compose up -d
```

`init-env.sh` creates `.env` with a random `JWT_SECRET` and database password.
Then open **http://localhost:3000** and create the first account – it becomes the administrator.

> The app is published on `127.0.0.1:3000` only. To use it from other devices,
> put a reverse proxy with HTTPS in front of it (see below).

Want something to look at right away? Load fictional demo pets:

```bash
docker compose exec app node server/src/db/cli.js seed
```

## Manual installation (without Docker)

Requirements: Node.js 22+, PostgreSQL 14+ (16 recommended).

```bash
git clone https://github.com/itsSivvis/pet-manager.git && cd pet-manager
npm ci
npm run build                                   # builds the web app into client/dist

# create a database and user, e.g.:
#   CREATE ROLE petmanager LOGIN PASSWORD '…'; CREATE DATABASE petmanager OWNER petmanager;

export NODE_ENV=production
export JWT_SECRET="$(openssl rand -hex 32)"     # store it permanently, e.g. in a systemd unit
export DATABASE_URL=postgres://petmanager:…@localhost:5432/petmanager
export STATIC_DIR="$PWD/client/dist" UPLOAD_DIR=/var/lib/pet-manager/uploads TZ=Europe/Berlin
npm start                                       # migrates the database and listens on :3000
```

For development see [CONTRIBUTING.md](CONTRIBUTING.md).

## Configuration

All settings are environment variables (see the commented [`.env.example`](.env.example)).
ntfy, the login requirement and registration are configured in the web UI under **Administration**.

| Variable                        | Default                                                      | Description                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `JWT_SECRET`                    | – (**required in production**)                               | Secret for signing login tokens, ≥ 32 random characters (`openssl rand -hex 32`). The server refuses to start without it.            |
| `DATABASE_URL`                  | `postgres://petmanager:petmanager@localhost:5432/petmanager` | PostgreSQL connection string. Set automatically in `docker-compose.yml`.                                                             |
| `POSTGRES_PASSWORD`             | – (required for Compose)                                     | Password of the database container.                                                                                                  |
| `POSTGRES_USER` / `POSTGRES_DB` | `petmanager`                                                 | Database user/name for Compose.                                                                                                      |
| `PORT`                          | `3000`                                                       | Port the server listens on.                                                                                                          |
| `APP_PORT`                      | `3000`                                                       | Host port published by Compose (bound to `127.0.0.1`).                                                                               |
| `TZ`                            | `UTC`                                                        | Timezone for medication times, "today" and reminders (e.g. `Europe/Berlin`).                                                         |
| `DEFAULT_LOCALE`                | `en`                                                         | Language of push notifications unless set in the admin area (`en`, `de`).                                                            |
| `CLIENT_URL`                    | –                                                            | Allowed CORS origin(s), comma-separated. Only needed if the web app is served from another origin (e.g. the Vite dev server).        |
| `TRUST_PROXY`                   | `0`                                                          | Number of reverse proxies in front of the app (use `1` behind Caddy/nginx/Traefik) – needed for correct client IPs in rate limiting. |
| `JWT_EXPIRES_IN`                | `7d`                                                         | Session lifetime.                                                                                                                    |
| `AUTH_RATE_LIMIT`               | `10`                                                         | Failed login/registration attempts per IP per 15 minutes.                                                                            |
| `UPLOAD_DIR`                    | `server/uploads` (`/data/uploads` in Docker)                 | Where pet photos are stored.                                                                                                         |
| `MAX_UPLOAD_MB`                 | `5`                                                          | Maximum photo size.                                                                                                                  |
| `STATIC_DIR`                    | – (`/app/client/dist` in Docker)                             | Directory of the built web app served by the server.                                                                                 |
| `REMINDERS_ENABLED`             | `true`                                                       | Turn the reminder scheduler off (e.g. on additional replicas).                                                                       |
| `REMINDER_INTERVAL_SECONDS`     | `60`                                                         | How often reminders are checked.                                                                                                     |
| `ALLOW_ANONYMOUS_MODE`          | `false`                                                      | ⚠️ Allows an admin to switch off the login requirement – see [Security](#security).                                                  |
| `PET_MANAGER_IMAGE`             | `ghcr.io/itssivvis/pet-manager:latest`                       | Image used by Compose.                                                                                                               |

### Push notifications (ntfy)

1. Install the [ntfy app](https://ntfy.sh) on your phone and subscribe to a topic with a hard-to-guess name (e.g. `pets-7f3a9c`), or use your own ntfy server.
2. In Pet Manager go to **Administration → Push notifications**, enter the server URL (`https://ntfy.sh` or e.g. `https://ntfy.example.com`), the topic and – for protected topics – an access token.
3. Click **Send test notification**.

Reminders are sent for due medication doses (not if already marked as given), appointments (configurable lead time), prevention items due today (from 09:00) and low stock.

## Reverse proxy & HTTPS

Always serve Pet Manager over HTTPS. Set `TRUST_PROXY=1` when running behind a proxy.

**Caddy** (automatic Let's Encrypt certificates):

```caddyfile
pets.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

**nginx**:

```nginx
server {
    listen 443 ssl http2;
    server_name pets.example.com;

    ssl_certificate     /etc/letsencrypt/live/pets.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pets.example.com/privkey.pem;

    client_max_body_size 6m;   # photo uploads (MAX_UPLOAD_MB + overhead)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name pets.example.com;
    return 301 https://$host$request_uri;
}
```

## Backup & restore

Back up **both** the database and the uploaded photos. Run the commands in the directory with `docker-compose.yml`:

```bash
# Backup
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > pet-manager-$(date +%F).dump
docker compose exec -T app tar czf - -C /data/uploads . > pet-manager-uploads-$(date +%F).tgz

# Restore (the stack must be running; existing data is replaced)
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < pet-manager-YYYY-MM-DD.dump
docker compose exec -T app tar xzf - -C /data/uploads < pet-manager-uploads-YYYY-MM-DD.tgz
docker compose restart app
```

Store backups somewhere else (another disk, off-site) and test a restore now and then.
Without Docker use `pg_dump`/`pg_restore` directly and copy `UPLOAD_DIR`.

## Updating

```bash
# 1. make a backup (see above)
git pull                               # gets the latest docker-compose.yml and docs
docker compose pull                    # or: docker compose up -d --build to build locally
docker compose up -d
```

Database migrations run automatically on start. Read the [CHANGELOG](CHANGELOG.md) before major updates.
To pin a version, set `PET_MANAGER_IMAGE=ghcr.io/itssivvis/pet-manager:0.1.0` in `.env`.

## Security

- **Run behind HTTPS** and keep the instance updated.
- `JWT_SECRET` must be long and random; the server does not start in production without it. Changing it logs out all users.
- The **first account becomes admin**. Registration is **closed** afterwards – the admin can open it under _Administration_. New accounts are always regular users.
- All accounts share the same pets and records (one household per instance).
- Login and registration are **rate limited**, passwords need ≥ 10 characters and are hashed with bcrypt. Changing a password signs out all other sessions.
- Uploaded photos are checked by their file content (JPEG/PNG/WebP/GIF), limited in size and stored under random names. They are accessible without login to anyone who knows the (unguessable) URL.

### Disabling the login requirement ("anonymous mode")

On a trusted home network you may want to use Pet Manager without logging in. This needs **two** steps:

1. Start the server with `ALLOW_ANONYMOUS_MODE=true`.
2. As admin, switch off **Administration → Access & security → Require login**.

> [!WARNING]
> In anonymous mode **everyone who can reach the instance can read, change and delete all pets and records** – without an account.
> **Never use it on an instance reachable from the internet** (port forwarding, public reverse proxy, tunnels).
> The administration area always requires an admin login, so anonymous visitors cannot change instance settings.

Without `ALLOW_ANONYMOUS_MODE=true` the switch is locked, and the API rejects any attempt to turn the login requirement off.

Report vulnerabilities privately – see [SECURITY.md](SECURITY.md).

## Documentation

- [Architecture overview](docs/architecture.md)
- [API reference (OpenAPI)](docs/api/openapi.yaml)
- [Theming guide – add your own theme](docs/theming.md)
- [Translation guide – add a language](docs/translations.md)
- [Design decisions](docs/design-decisions.md)
- [Contributing](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Changelog](CHANGELOG.md)

## Roadmap

Ideas for future versions – contributions welcome:

- [ ] Multiple households per instance (separate data per family)
- [ ] Server-side image resizing/thumbnails
- [ ] Calendar export (iCal) for appointments and doses
- [ ] More notification channels (e-mail, Gotify, Web Push)
- [ ] CSV/JSON export and import of all data
- [ ] Weight goals and growth charts for young animals
- [ ] Attachments (lab results, invoices) for health records
- [ ] More languages (help wanted!)
- [ ] Sessions in HttpOnly cookies, optional OIDC login

## License

[MIT](LICENSE) © `itsSivvis`

Fonts: Inter, Nunito and Fredoka under the SIL Open Font License 1.1 (via Fontsource).
Icons: Material Icons (Apache License 2.0) via `@mui/icons-material`.
