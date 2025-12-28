# Vertex AI Deployment Guide

## Prerequisites

✅ **Step 1: Copy Service Account JSON**

Copy your service account JSON file to the project:
```bash
cp /Users/apple/Downloads/gen-lang-client-0555018920-c3abedb3a871.json /Users/apple/Durt/Drut/service-account-key.json
```

✅ **Step 2: Install Supabase CLI** (if not already installed)
```bash
npm install -g supabase
```

---

## Deployment Steps

### 1. Login to Supabase
```bash
cd /Users/apple/Durt/Drut
supabase login
```

### 2. Link to Your Project
```bash
supabase link --project-ref ukrtaerwaxekonislnpw
```

### 3. Set Secrets
```bash
# Read the service account key and set it as a secret
supabase secrets set GOOGLE_SERVICE_ACCOUNT_KEY="$(cat service-account-key.json)"

# Set project ID and location
supabase secrets set VERTEX_AI_PROJECT_ID="gen-lang-client-0555018920"
supabase secrets set VERTEX_AI_LOCATION="us-central1"
```

### 4. Deploy Edge Functions
```bash
# Deploy all three functions
supabase functions deploy generate-question
supabase functions deploy generate-batch
supabase functions deploy generate-tips
```

### 5. Verify Deployment
```bash
# Check function status
supabase functions list
```

---

## Testing

### Test Locally (Optional)
```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve

# Test in another terminal
curl -X POST http://localhost:54321/functions/v1/generate-question \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Math","subtopic":"Algebra","examProfile":"jee_main","difficulty":"Medium"}'
```

### Test in Production
1. Open your app at http://localhost:3000
2. Login
3. Navigate to Practice mode
4. Click "Next Question"
5. ✅ Question should generate successfully using Vertex AI!

---

## Cleanup

After successful deployment, you can safely delete the local service account file:
```bash
rm /Users/apple/Durt/Drut/service-account-key.json
```

**Security Note**: The service account JSON is now securely stored in Supabase secrets and never exposed to the frontend.

---

## Troubleshooting

**Error: "Failed to get access token"**
- Check that `GOOGLE_SERVICE_ACCOUNT_KEY` secret is set correctly
- Verify the service account has "Vertex AI User" role

**Error: "API keys are not supported"**
- This is expected! We're now using OAuth2 via Edge Functions
- Frontend calls Edge Functions, Edge Functions call Vertex AI

**Error: "Function not found"**
- Make sure functions are deployed: `supabase functions list`
- Check function names match exactly

**Questions not generating**
- Check browser console for errors
- Check Supabase function logs: `supabase functions logs generate-question`
- Verify secrets are set: `supabase secrets list`

---

## Cost Monitoring

Monitor your Vertex AI usage in Google Cloud Console:
1. Go to https://console.cloud.google.com
2. Navigate to "Billing" → "Reports"
3. Filter by "Vertex AI"
4. Set up budget alerts if needed

**Expected costs**: ~$0.0004 per question = $4 per 10,000 questions
