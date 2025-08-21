#!/bin/bash

# Deploy eBay Trading API with leaf category fix
# This script deploys the corrected eBay Trading API edge function that fixes the 'Invalid category. The category selected is not a leaf category' error

echo "🚀 Deploying eBay Trading API with leaf category fix..."
echo "This fixes the 'Invalid category. The category selected is not a leaf category' error"
echo ""

# Check if we're in the right directory
if [ ! -f "supabase/functions/ebay-trading-api/index.ts" ]; then
    echo "❌ Error: Not in the correct directory. Please run from the project root."
    exit 1
fi

# Deploy the edge function
echo "📦 Deploying ebay-trading-api edge function to Supabase..."
npx supabase functions deploy ebay-trading-api --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Deployment complete!"
    echo ""
    echo "📝 What was fixed:"
    echo "  - Changed category 6028 (parent) to 33765 (leaf) for key fobs"
    echo "  - Added specific leaf categories for automotive parts"
    echo "  - Fixed eBay sync errors for individual sellers"
    echo ""
    echo "🧪 Test with: Create a listing with 'Ford F-150 Lightning Smart Key Fob'"
    echo "   It should now sync to eBay without category errors"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
