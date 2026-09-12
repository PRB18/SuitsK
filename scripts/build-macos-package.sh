#!/bin/sh
set -eu

PROJECT_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
OUTPUT_DIR="${1:-$PROJECT_ROOT/dist/KrishnaSuits-macOS}"

if [ "$(uname -s)" != "Darwin" ]; then
  printf '%s\n' "This package must be built on macOS so native dependencies match the client machine." >&2
  exit 1
fi

command -v node >/dev/null 2>&1 || { printf '%s\n' "Node.js 22 or later is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { printf '%s\n' "npm is required." >&2; exit 1; }

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/runtime"

cp -R "$PROJECT_ROOT/public" "$PROJECT_ROOT/server" "$OUTPUT_DIR/"
cp "$PROJECT_ROOT/package.json" "$PROJECT_ROOT/package-lock.json" "$OUTPUT_DIR/"
cp "$PROJECT_ROOT/Start-Krishna-Suits.command" "$PROJECT_ROOT/Stop-Krishna-Suits.sh" "$OUTPUT_DIR/"
cp "$(command -v node)" "$OUTPUT_DIR/runtime/node"
chmod +x "$OUTPUT_DIR/Start-Krishna-Suits.command" "$OUTPUT_DIR/Stop-Krishna-Suits.sh" "$OUTPUT_DIR/runtime/node"

(cd "$OUTPUT_DIR" && npm ci --omit=dev)
printf '%s\n' "macOS package staged at: $OUTPUT_DIR"
printf '%s\n' "Zip this folder and send it to the client. The client opens Start-Krishna-Suits.command."