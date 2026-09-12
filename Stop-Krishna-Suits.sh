#!/bin/sh
set -eu

PIDS="$(lsof -tiTCP:3737 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  kill $PIDS
fi