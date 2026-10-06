#!/bin/bash
# Run on the server (Ubuntu) after files are uploaded.
# Restores the DB dump and starts everything.
# Usage: bash migrate-import.sh   (run from the deploy/ folder)
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Starting database + redis first..."
cd immich
docker compose up -d database redis

echo "==> Waiting for postgres to be healthy..."
for i in $(seq 1 30); do
  if docker exec immich_postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "postgres is ready."
    break
  fi
  sleep 5
  if [ "$i" = "30" ]; then echo "ERROR: postgres never became ready."; exit 1; fi
done

echo "==> Restoring database dump (takes a few minutes)..."
docker exec -i immich_postgres psql -U postgres -d immich < ../immich-db-dump.sql
echo "Restore done."

echo "==> Starting Immich server + ML (first boot downloads ~2GB of models, be patient)..."
docker compose up -d
docker compose ps

echo ""
echo "==> Starting wedding app (needs the 'immich_default' network from above)..."
cd ../wedding
docker compose up -d --build
docker compose ps

echo ""
echo "==> Health checks:"
curl -sf http://localhost:8000/api/health && echo "backend OK"
curl -sf http://localhost:3000 >/dev/null && echo "frontend OK"
echo ""
echo "All up. Next: point your reverse proxy at http://localhost:3000 (see README step 7)."
