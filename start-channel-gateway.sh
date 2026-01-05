#!/usr/bin/env bash
set -euo pipefail

echo "=== FORCED START: channel-gateway ==="
pwd
node -v
pnpm -v || true

# build gateway (asegura dist actualizado)
pnpm -C apps/channel-gateway clean || true
pnpm -C apps/channel-gateway build

# run gateway
exec node apps/channel-gateway/dist/index.js
