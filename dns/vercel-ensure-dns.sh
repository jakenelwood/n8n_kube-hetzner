#!/usr/bin/env bash
set -euo pipefail

# Ensure A record for n8n.quotennica.com points to the given IP using Vercel CLI
# Usage: VERCEL_TOKEN=... ./vercel-ensure-dns.sh <zone> <hostname> <ipv4>
# Example: VERCEL_TOKEN=xxxxx ./vercel-ensure-dns.sh quotennica.com n8n 203.0.113.10

if [ $# -ne 3 ]; then
  echo "Usage: $0 <zone> <hostname> <ipv4>" >&2
  exit 2
fi

ZONE=$1
HOST=$2
IP=$3

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI not found. Install with: npm i -g vercel" >&2
  exit 1
fi

export VERCEL_TOKEN=${VERCEL_TOKEN:-}
if [ -z "${VERCEL_TOKEN}" ]; then
  echo "VERCEL_TOKEN env var is required" >&2
  exit 1
fi

FQDN="${HOST}.${ZONE}"

set +e
EXISTING=$(vercel dns ls "$ZONE" --token "$VERCEL_TOKEN" | awk -v fqdn="$FQDN" '$0 ~ fqdn && $2 == "A" {print $4" "$1}')
set -e

if [ -n "$EXISTING" ]; then
  CURRENT_IP=$(echo "$EXISTING" | awk '{print $1}')
  ID=$(echo "$EXISTING" | awk '{print $2}')
  if [ "$CURRENT_IP" == "$IP" ]; then
    echo "A record for $FQDN already set to $IP"
    exit 0
  else
    echo "Updating A record $FQDN from $CURRENT_IP to $IP"
    vercel dns rm "$ID" --token "$VERCEL_TOKEN" -y
  fi
fi

echo "Creating A record $FQDN -> $IP"
vercel dns add "$ZONE" A "$HOST" "$IP" --token "$VERCEL_TOKEN"
echo "Done."

