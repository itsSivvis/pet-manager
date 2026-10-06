# Contributing to Pet Manager

Thanks for your interest in improving Pet Manager! Bug reports, translations,
themes, documentation and code are all welcome.

## Ground rules

- Be kind – this project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- Security issues: please report privately, see [SECURITY.md](SECURITY.md).
- For larger changes, open an issue first so we can agree on the approach.

## Development setup

Requirements: Node.js 22, npm 10, Docker (or a local PostgreSQL 16).

```bash
git clone https://github.com/itsSivvis/pet-manager.git
cd pet-manager
npm install
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL (+ test database)
npm run db:seed                                   # optional fictional demo data
npm run dev                                       # API on :3000, web app on :5173
```

Open http://localhost:5173 – the first account you register becomes the admin.

## Checks

All of these run in CI and must pass:

```bash
npm run lint        # ESLint + Prettier (npm run lint:fix to auto-fix)
npm test            # translation check + server (needs PostgreSQL) + client tests
npm run build       # production build of the client
npm run licenses    # dependency license allowlist
npm run test:e2e    # Playwright smoke test (needs a build and E2E_DATABASE_URL)
```

The server integration tests use `TEST_DATABASE_URL`
(default `postgres://petmanager:petmanager@localhost:5432/petmanager_test`).
**That database is wiped by the tests.**

## Conventions

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:` …).
- **Code style:** Prettier + ESLint, see root config. EditorConfig is provided.
- **UI texts:** never hard-code text. Add keys to `client/src/i18n/locales/en.json`
  **and** `de.json` – see [docs/translations.md](docs/translations.md).
- **Colors:** never hard-code colors in components. Use the MUI theme, which
  is built from the tokens in `client/src/theme/tokens.js` – see
  [docs/theming.md](docs/theming.md).
- **API errors:** throw `ApiError(status, 'SOME_CODE', 'English message')`
  and add `errors.SOME_CODE` to both locale files (the i18n check enforces it).
- **Database:** add a **new** numbered file in `server/src/db/migrations/`.
  Never change a migration that has been released. Migrations must work on an
  empty database and should use `IF NOT EXISTS` where possible.
- **Tests:** add or update tests for logic you change (auth, scheduling,
  migrations, …).
- Update `CHANGELOG.md` (section _Unreleased_) for user-facing changes.

## Pull requests

1. Fork and create a branch from `main`.
2. Make focused commits; keep PRs small.
3. Fill in the PR template checklist.
4. CI must be green before review.
