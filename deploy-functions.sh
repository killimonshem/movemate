#!/bin/bash

# Deploy Supabase Edge Functions
echo "Deploying Supabase Edge Functions..."

# Check if supabase CLI is available locally
if ! npx supabase --version &> /dev/null; then
    echo "Supabase CLI not found. Installing locally..."
    npm install --save-dev supabase
fi

# Deploy each function
echo "Deploying fetch-venues function..."
npx supabase functions deploy fetch-venues

echo "Deploying admin-auth function..."
npx supabase functions deploy admin-auth

echo "Deploying register-vehicle function..."
npx supabase functions deploy register-vehicle

echo "Deploying fetch-registrations function..."
npx supabase functions deploy fetch-registrations

echo "Deploying send-sms function..."
npx supabase functions deploy send-sms

echo "Deploying send-notification function..."
npx supabase functions deploy send-notification

echo "All functions deployed successfully!"
echo ""
echo "Make sure to set the following secrets in your Supabase project:"
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo "- ADMIN_SESSION_SECRET (recommended for signing admin session tokens)"
echo "- TWILIO_ACCOUNT_SID"
echo "- TWILIO_AUTH_TOKEN"
echo "- TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID)"
echo ""
echo "And set DVLA_API_KEY in Vercel / local .env for /api/vehicle-enquiry."