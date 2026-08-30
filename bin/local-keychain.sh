#!/bin/sh
# Launch gsc-mcp-server (stdio) with credentials pulled from the macOS
# Keychain at start time, so nothing sensitive sits in config files.
#
# Expected Keychain items (create with:
#   security add-generic-password -U -a "$USER" -s <service> -w <value> ):
#   gsc-mcp-client-id      -> GOOGLE_CLIENT_ID
#   gsc-mcp-client-secret  -> GOOGLE_CLIENT_SECRET
#   gsc-mcp-refresh-token  -> GOOGLE_REFRESH_TOKEN

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"

GOOGLE_CLIENT_ID="$(security find-generic-password -s gsc-mcp-client-id -w)"
GOOGLE_CLIENT_SECRET="$(security find-generic-password -s gsc-mcp-client-secret -w)"
GOOGLE_REFRESH_TOKEN="$(security find-generic-password -s gsc-mcp-refresh-token -w)"
export GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_REFRESH_TOKEN

exec node "$DIR/dist/index.js" "$@"
