#!/usr/bin/env bash
set -euo pipefail

cd /app
echo "🚀 BOOT WRAPPER channel-gateway"
echo "PWD: $(pwd)"
echo "Checking for dist file..."
test -f apps/channel-gateway/dist/index.js || (echo "FATAL: no existe apps/channel-gateway/dist/index.js" && pwd && ls -la && ls -la apps && ls -la apps/channel-gateway && exit 1)
echo "✅ Found apps/channel-gateway/dist/index.js"
exec node apps/channel-gateway/dist/index.js
