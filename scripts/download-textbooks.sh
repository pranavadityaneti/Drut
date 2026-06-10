#!/bin/bash
# Download every file in the Supabase 'textbooks' storage bucket into
# docs/question-generation/textbooks/ — ground truth for question generation.
#
# USAGE (from any directory, in YOUR terminal — needs your `supabase login`):
#   bash ~/projects/Drut/scripts/download-textbooks.sh
#
# SECURITY: the service-role key is fetched via your Supabase CLI session,
# held in a shell variable inside this process only, and passed to node via
# env. It is never printed, never written to disk.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$REPO/docs/question-generation/textbooks"
mkdir -p "$DEST"

echo "Fetching service key via your Supabase CLI session (not displayed)..."
SB_KEY=$(supabase projects api-keys --project-ref ukrtaerwaxekonislnpw -o json 2>/dev/null \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d);const k=a.find(x=>x.name==='service_role')||a.find(x=>/service/.test(x.name));if(!k){console.error('service_role key not found');process.exit(1)};console.log(k.api_key||k.value)})")
export SB_KEY

node "$REPO/scripts/download-textbooks.mjs" "$DEST"
