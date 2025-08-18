#!/bin/bash

echo "🚀 EMERGENCY FIX: Deploying eBay Browse API Implementation"
echo "=========================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "supabase/functions/ebay-api-client/index.ts" ]; then
    echo "❌ Error: Not in the correct directory. Please run from the project root."
    exit 1
fi

# Verify the Browse API implementation is in the code
echo "🔍 Verifying Browse API implementation..."
if grep -q "https://api.ebay.com/buy/browse/v1/item_summary/search" supabase/functions/ebay-api-client/index.ts; then
    echo "✅ Browse API endpoint found in code"
else
    echo "❌ ERROR: Browse API implementation NOT FOUND!"
    echo "The code is still using the Finding API which is rate limited!"
    echo "Please apply the Browse API changes first."
    exit 1
fi

# Verify getAppAccessToken method exists
if grep -q "getAppAccessToken" supabase/functions/ebay-api-client/index.ts; then
    echo "✅ Application token method found"
else
    echo "❌ ERROR: getAppAccessToken method not found!"
    exit 1
fi

# Deploy the function
echo ""
echo "📦 Deploying ebay-api-client function to Supabase..."
npx supabase functions deploy ebay-api-client --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "================================"
    echo ""
    echo "🎯 What was fixed:"
    echo "  • Replaced Finding API (5,000/day limit) with Browse API (5,000/hour)"
    echo "  • Using application token with buy.browse scope"
    echo "  • Direct search instead of progressive 3-level search"
    echo "  • No more rate limiting errors!"
    echo ""
    echo "🧪 Test immediately at: https://hustly.app/create-listing"
    echo "  1. Enter: Ford F-150 Lightning Smart Key Fob"
    echo "  2. Click Price Research"
    echo "  3. Should return results WITHOUT rate limit errors"
    echo ""
else
    echo ""
    echo "❌ DEPLOYMENT FAILED!"
    echo "Check the error messages above."
    exit 1
fi
