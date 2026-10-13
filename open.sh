#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node sync-status.mjs
echo "Serving DIO office at http://localhost:8765/"
echo "Ctrl+C to stop."
exec python3 -m http.server 8765
