#!/bin/bash

echo "🚀 Deploying Enhanced eBay Trading API..."
echo "=================================="
echo ""
echo "Features included:"
echo "✅ Comprehensive shipping services (USPS, UPS, FedEx)"
echo "✅ Multiple payment methods (PayPal, Credit Cards)"
echo "✅ Item specifics for categories (Clothing, Electronics, Automotive)"
echo "✅ Improved photo upload handling"
echo "✅ Business policies support"
echo "✅ International shipping options"
echo ""

# Deploy the Trading API function
echo "📦 Deploying ebay-trading-api function..."
npx supabase functions deploy ebay-trading-api --no-verify-jwt

echo ""
echo "✅ Enhanced Trading API deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Test listing creation with photos"
echo "2. Verify shipping options are working"
echo "3. Check item specifics for different categories"
echo ""
