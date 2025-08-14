# eBay Trading API Integration

## Overview

This document describes the eBay Trading API integration implemented for Hustly to support individual sellers who cannot or do not want to use business policies.

## Problem Statement

The eBay Inventory API requires all sellers (including individuals) to have business policies set up:
- Payment Policy
- Fulfillment Policy  
- Return Policy

Individual sellers often cannot create these policies, leading to listing failures with errors like:
- "Could not serialize field [paymentMethods.null.paymentMethodType]"
- "Could not serialize field [shippingOptions.null.costType]"
- Error 25007: "Seller opted out of business policies"

## Solution: Trading API

The eBay Trading API (used by successful platforms like Nifty and Vendoo) allows sellers to specify payment, shipping, and return details inline within each listing, eliminating the need for business policies.

## Implementation

### 1. Business Type Detection

The system automatically determines which API to use based on the user's business type setting:

- **Individual / Sole Proprietorship** → Trading API (no policies required)
- **LLC / Corporation** → Inventory API (can create business policies)

This is configured in the Business tab of user settings.

### 2. Trading API Service

**File:** `src/services/api/ebayTradingService.ts`

Key methods:
- `createListing()` - Creates a new eBay listing using AddFixedPriceItem
- `updateListing()` - Updates an existing listing using ReviseFixedPriceItem
- `endListing()` - Ends a listing using EndFixedPriceItem
- `shouldUseTradingAPI()` - Determines which API to use based on business type
- `syncListing()` - Automatically routes to the appropriate API

### 3. Edge Function

**File:** `supabase/functions/ebay-trading-api/index.ts`

The edge function handles:
- XML payload construction for Trading API calls
- OAuth token management
- Inline policy details (payment, shipping, returns)
- Error handling and response parsing

### 4. Key Features

#### Inline Payment Details
```xml
<PaymentMethods>PayPal</PaymentMethods>
<PaymentMethods>CreditCard</PaymentMethods>
```

#### Inline Shipping Details
```xml
<ShippingDetails>
  <ShippingType>Flat</ShippingType>
  <ShippingServiceOptions>
    <ShippingService>USPSPriority</ShippingService>
    <ShippingServiceCost>10.00</ShippingServiceCost>
  </ShippingServiceOptions>
</ShippingDetails>
```

#### Inline Return Policy
```xml
<ReturnPolicy>
  <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
  <RefundOption>MoneyBack</RefundOption>
  <ReturnsWithinOption>Days_30</ReturnsWithinOption>
  <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
</ReturnPolicy>
```

## Usage

### For Individual Sellers

1. Set business type to "Individual" or "Sole Proprietorship" in Settings → Business
2. Connect eBay account as usual
3. Create/sync listings - the system automatically uses Trading API
4. No business policies required!

### For Business Sellers

1. Set business type to "LLC" or "Corporation" in Settings → Business
2. Connect eBay account
3. Set up business policies on eBay (if not already done)
4. Create/sync listings - the system uses Inventory API with policies

## Benefits

1. **No Policy Requirements** - Individual sellers can list immediately
2. **Simplified Setup** - No need to navigate eBay's business policy creation
3. **Proven Approach** - Same method used by Nifty and Vendoo
4. **Automatic Routing** - System chooses the right API based on user type
5. **Fallback Support** - Gracefully handles missing data with defaults

## Migration Path

Existing users can switch between APIs by updating their business type:
- Individual/Sole Prop → Trading API
- LLC/Corporation → Inventory API

The system will automatically use the appropriate API for future listings.

## Error Handling

The Trading API provides clearer error messages and doesn't fail on missing policies:
- Missing images → Uses placeholder
- Missing shipping → Uses default service
- Missing returns → Defaults to no returns accepted

## Testing

To test the Trading API integration:

1. Set business type to "Individual" in Settings
2. Create a test listing with basic details
3. Sync to eBay
4. Verify listing appears on eBay without policy errors

## Environment Variables

Required for Trading API:
```
EBAY_APP_ID=your_app_id
EBAY_DEV_ID=your_dev_id  
EBAY_CERT_ID=your_cert_id
```

## Deployment

Deploy the Trading API edge function:
```bash
npx supabase functions deploy ebay-trading-api
```

## Troubleshooting

### Common Issues

1. **"No eBay account found"** - User needs to connect eBay account first
2. **XML parsing errors** - Check for special characters in listing data
3. **Authentication failures** - Verify OAuth token is valid
4. **Category errors** - Ensure eBay category ID is valid for the marketplace

### Debug Mode

Enable detailed logging by checking console output:
- Frontend: Browser DevTools Console
- Edge Function: Supabase Dashboard → Functions → Logs

## Future Enhancements

1. Support for variations (multi-SKU listings)
2. Scheduled listings
3. Bulk operations
4. International shipping options
5. Business policy migration tool (Inventory → Trading API)
