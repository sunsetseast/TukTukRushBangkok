#!/bin/bash
set -euo pipefail
# Replit may invoke this hook outside the workspace root.
cd "$(dirname "$0")/.."
# Finish dependency synchronization before restarting the frontend. This game
# does not need database credentials or schema writes to start.
CI=true pnpm install --frozen-lockfile --prefer-offline
