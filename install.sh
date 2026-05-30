#!/usr/bin/env sh
# envlint installer — builds a single binary with Bun and installs it to ~/.local/bin
set -e

command -v bun >/dev/null 2>&1 || { echo "error: bun is required (https://bun.sh)"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "-> Fetching envlint..."
git clone --depth 1 https://github.com/ArisRhiannon/envlint "$TMP/envlint" >/dev/null 2>&1
cd "$TMP/envlint"

echo "-> Building..."
bun build src/cli.ts --compile --outfile envlint >/dev/null

DEST="${PREFIX:-$HOME/.local/bin}"
mkdir -p "$DEST"
mv envlint "$DEST/envlint"

echo "Installed to $DEST/envlint"
echo "Make sure $DEST is on your PATH."
