#!/bin/sh
set -eu

APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
NODE_BIN="$APP_DIR/runtime/node"
LOG_DIR="$HOME/Library/Logs/KrishnaSuits"
LOG_FILE="$LOG_DIR/server.log"

if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node || true)"
fi

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  printf '%s\n' "Node.js is required. Install Node.js 22 or later, then run this file again."
  read -r _
  exit 1
fi

mkdir -p "$LOG_DIR"
cd "$APP_DIR"
"$NODE_BIN" server/index.js >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 2
open "http://127.0.0.1:3737"
wait "$SERVER_PID"