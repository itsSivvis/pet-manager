# Security Policy

## Supported versions

Only the latest release receives security fixes. Please keep your installation
up to date (see "Updating" in the README).

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report vulnerabilities privately via
[GitHub Security Advisories](https://github.com/OWNER/pet-manager/security/advisories/new)
or by e-mail to `<security-contact@example.com>`.

Please include:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if possible),
- the affected version / Docker image tag.

You can expect an acknowledgement within 7 days. We will keep you informed
about the fix and credit you in the release notes unless you prefer otherwise.

## Security model (summary)

- Pet Manager is designed for self-hosting by a household or small group.
  All logged-in users share the same pets and records.
- The first registered account becomes the administrator; registration is
  closed afterwards unless an admin opens it.
- The login requirement can only be switched off if the server is started with
  `ALLOW_ANONYMOUS_MODE=true`. In that mode **everyone who can reach the
  instance has full access to all data** (but never to the admin area). Never
  use it on an instance reachable from the internet.
- Always run behind HTTPS (see the reverse proxy section in the README).
- Login tokens are stored in the browser's `localStorage` and expire after
  `JWT_EXPIRES_IN` (default 7 days). Changing the password invalidates all
  other sessions. A strict Content Security Policy (no inline scripts) reduces
  the XSS risk.
- Pet photos are served under random, unguessable file names without
  authentication (so they can be used in `<img>` tags). Do not upload images
  that must stay secret.
