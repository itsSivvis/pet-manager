#!/bin/sh
# Creates .env from .env.example with freshly generated secrets.
# Usage: ./scripts/init-env.sh   (refuses to overwrite an existing .env)
set -eu
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  echo ".env already exists - not overwriting it." >&2
  exit 1
fi

random() { od -An -N"$1" -tx1 /dev/urandom | tr -d ' \n'; }
JWT_SECRET=$(random 32)
POSTGRES_PASSWORD=$(random 24)

awk -v jwt="$JWT_SECRET" -v pg="$POSTGRES_PASSWORD" '
  /^JWT_SECRET=/        { print "JWT_SECRET=" jwt; next }
  /^POSTGRES_PASSWORD=/ { print "POSTGRES_PASSWORD=" pg; next }
  { print }
' .env.example > .env
chmod 600 .env
echo "Created .env with random JWT_SECRET and POSTGRES_PASSWORD."
echo "Review it (e.g. TZ, CLIENT_URL) and start with: docker compose up -d"
