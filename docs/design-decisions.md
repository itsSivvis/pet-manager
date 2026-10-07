# Design decisions

Short records of decisions that are not obvious from the code.

## Meadow theme kept as a fourth theme

The original "Meadow" theme (teal `#0E7C66` + coral `#F4845F` on cream, Nunito)
is kept as an optional fourth theme instead of being merged into "Playful".
Reasons: existing users keep their familiar look, and Playful can go further
(violet/raspberry, per-species colors, emoji, animations) without
compromising Meadow's calmer character. Since all themes are pure token sets,
an extra theme costs almost nothing to maintain.

One change was necessary for accessibility: coral `#F4845F` only reaches 2.3:1
on the cream background, so it is now a decorative `accent` only, and a
darker coral (`#B84A28`, 4.7:1) is used wherever text is involved.

## One image, server serves the client

Instead of separate client (nginx) and server images there is a single image
in which Express serves the built client. One container is simpler to run,
update and secure, and same-origin hosting avoids CORS entirely.

## Shared household data model

All accounts see the same pets. This matches the main use case (a family or
flat-share caring for the same animals) and keeps the model simple.
Multi-household support would require a `household_id` on every table and is
on the roadmap.

## Login requirement guarded by an environment variable

Turning off the login is convenient on a trusted home network but dangerous on
the internet. The UI switch therefore only works if the operator also sets
`ALLOW_ANONYMOUS_MODE=true`, and the admin area always requires a real admin
login – so an anonymous visitor can never re-configure the instance.

## Tokens in localStorage

JWTs are kept in `localStorage` (no cookies → no CSRF handling needed). The
XSS risk is mitigated by a strict CSP without inline scripts. Moving to
HttpOnly cookies is a possible future hardening step.

## Photos without authentication

Photos are served from `/uploads/<random-uuid>.<ext>` so they work in `<img>`
tags and offline caches. File names are unguessable (122 bits of randomness),
uploads are validated by their magic bytes (JPEG/PNG/WebP/GIF only, no SVG)
and served with `nosniff` and a sandboxing CSP.

## Dependency choices

- **zod** for request validation (small, declarative, good error details).
- **@tanstack/react-query** for server state (caching, refetch on focus,
  pull-to-refresh via `refetchQueries`) instead of hand-written fetch state.
- **Major upgrades in coherent groups.** Packages that depend on each other
  (e.g. Vite + plugin-react + Vitest, ESLint + its plugins, the MUI
  packages) are upgraded together in one PR, verified with lint, tests,
  e2e and a screenshot comparison. Single-package Dependabot PRs for such
  groups are closed in favour of the grouped PR.
- No image processing library (e.g. sharp): photos are stored as uploaded
  (max. 5 MB). Server-side resizing is on the roadmap.

## License: MIT (decided)

MIT keeps the barrier for users, contributors and packagers as low as
possible and is compatible with all dependencies (see `npm run licenses`).
AGPL-3.0 was considered (it would force hosted forks to publish their
changes) but rejected in favour of the simpler, more permissive license.
