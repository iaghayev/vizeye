#!/usr/bin/env bash
set -euo pipefail
SSL_DIR="$(dirname "$0")/../nginx/ssl"
mkdir -p "$SSL_DIR"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/server.key" -out "$SSL_DIR/server.crt" \
  -subj "/C=US/ST=Dev/L=Local/O=VizEye/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null
chmod 600 "$SSL_DIR/server.key"
echo "✓ SSL certificate created in $SSL_DIR"
