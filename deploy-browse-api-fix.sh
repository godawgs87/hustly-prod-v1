#!/bin/bash

echo "🚀 DEPLOYING eBay Browse API Fix"
echo "================================"

# Check directory
if [ ! -f "supabase/functions/ebay-api-client/index.ts" ]; then
    echo "❌ Error: Run from project root"
    exit 1
fi

# Verify Browse API implementation
echo "🔍 Verifying Browse API implementation..."
if grep -q "https://api.ebay.com/buy/browse/v1/item_summary/search" supabase/functions/ebay-api-client/index.ts; then
    echo "✅ Browse API endpoint found"
else
    echo "❌ ERROR: Browse API not found - apply the code changes first!"
    exit 1
fi

# Deploy
echo "📦 Deploying to Supabase..."
npx supabase functions deploy ebay-api-client --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "========================="
    echo ""
    echo "🎯 Fixed:"
    echo "• Finding API → Browse API (1000x better rate limits)"
    echo "• Application token with buy.browse scope"
    echo "• Single optimized search call"
    echo ""
    echo "🧪 Test at: https://hustly.app/create-listing"
    echo "Search: Ford F-150 Lightning Smart Key Fob"
else
    echo "❌ DEPLOYMENT FAILED"
    exit 1
fi
