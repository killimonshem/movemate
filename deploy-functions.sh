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

echo "All functions deployed successfully!"
echo ""
echo "Make sure to set the following environment variables in your Supabase dashboard:"
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo "- DVLA_API_KEY (for the vehicle enquiry API)" 