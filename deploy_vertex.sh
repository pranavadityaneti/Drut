#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Vertex AI Deployment..."

# 1. Check for Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please run 'npm install -g supabase' first."
    exit 1
fi

echo "⚠️  Ensure you have run 'supabase login' before continuing."
echo "   If not, press Ctrl+C, run 'supabase login', and try again."
echo "   Waiting 3 seconds..."
sleep 3

# 2. Copy Service Account Key
echo "🔑 Setting up credentials..."
if [ -f "/Users/apple/Downloads/gen-lang-client-0555018920-c3abedb3a871.json" ]; then
    cp "/Users/apple/Downloads/gen-lang-client-0555018920-c3abedb3a871.json" ./service-account-key.json
else
    echo "❌ Service account key not found in Downloads!"
    exit 1
fi

# 3. Link Project
echo "🔗 Linking Supabase project..."
# Use --password if you have the db password, otherwise it might prompt
supabase link --project-ref ukrtaerwaxekonislnpw

# 4. Set Secrets
echo "🔒 Setting secrets..."
supabase secrets set GOOGLE_SERVICE_ACCOUNT_KEY="$(cat service-account-key.json)"
supabase secrets set VERTEX_AI_PROJECT_ID="gen-lang-client-0555018920"
supabase secrets set VERTEX_AI_LOCATION="us-central1"

# 5. Deploy Functions
echo "🚀 Deploying functions (Gemini 3 Pro)..."
supabase functions deploy generate-question --no-verify-jwt
supabase functions deploy generate-batch --no-verify-jwt
supabase functions deploy generate-tips --no-verify-jwt

# 6. Cleanup
echo "🧹 Cleaning up..."
rm service-account-key.json

echo "✅ Deployment Complete! Gemini 3 Pro is live."
