#!/bin/sh
set -e

echo "Applying database migrations"
alembic upgrade head

case "$(echo "${SEED_DEMO:-false}" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes)
    python -m app.seed
    ;;
esac

exec "$@"
