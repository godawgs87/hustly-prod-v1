#!/bin/bash

echo "🚀 Deploying eBay Category Extraction Fix"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "supabase/functions/ebay-api-client/index.ts" ]; then
    echo "❌ Error: Not in the correct directory. Please run from the project root."
    exit 1
fi

# Verify the category extraction is in the code
echo "🔍 Verifying eBay category extraction implementation..."
if grep -q "ebayCategory:" supabase/functions/ebay-api-client/index.ts; then
    echo "✅ eBay category extraction found in code"
else
    echo "⚠️ WARNING: eBay category extraction may not be fully implemented!"
fi

# Verify getSuggestedPrice returns ebayCategory
if grep -q "ebayCategory\?" supabase/functions/ebay-api-client/index.ts; then
    echo "✅ getSuggestedPrice method returns ebayCategory"
else
    echo "⚠️ WARNING: getSuggestedPrice may not return ebayCategory!"
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
    echo "🎯 What was deployed:"
    echo "  • eBay leaf category ID extraction from comparables"
    echo "  • Category path extraction for better categorization"
    echo "  • Most frequent category selection algorithm"
    echo "  • Category data included in price research response"
    echo ""
    echo "🧪 Test the fix:"
    echo "  1. Go to https://hustly.app/create-listing"
    echo "  2. Enter: Ford F-150 Lightning Smart Key Fob"
    echo "  3. Click Price Research"
    echo "  4. Check console for ebayCategory in response"
    echo "  5. Verify listing saves with correct eBay category ID"
    echo ""
else
    echo ""
    echo "❌ DEPLOYMENT FAILED!"
    echo "Check the error messages above."
    exit 1
fi
