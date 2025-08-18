#!/bin/bash

# Deploy eBay API Client with Browse API Fix
# This script deploys the corrected eBay API client that uses Browse API instead of Finding API

echo "🚀 Deploying eBay API Client with Browse API fix..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "supabase/functions/ebay-api-client/index.ts" ]; then
    echo "❌ Error: Not in the correct directory. Please run from the project root."
    exit 1
fi

# Deploy the function
echo "📦 Deploying ebay-api-client function to Supabase..."
npx supabase functions deploy ebay-api-client

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🧪 Test the fix on production:"
    echo "1. Go to https://hustly.app/create-listing"
    echo "2. Enter a test item like 'Ford F-150 Lightning Smart Key Fob'"
    echo "3. Click Price Research"
    echo ""
    echo "📊 What was fixed:"
    echo "- Switched from Finding API (rate limited) to Browse API"
    echo "- Using application token with buy.browse scope"
    echo "- Single optimized API call instead of progressive search"
    echo "- Better price calculation algorithm"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
