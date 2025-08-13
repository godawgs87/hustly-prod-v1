# eBay API Comprehensive Audit & Fix Plan

## 🔴 CRITICAL ISSUE IDENTIFIED

The root cause of ALL our eBay sync failures is that we're using **fake/placeholder policy IDs** that don't actually exist in eBay's system:
- `INDIVIDUAL_DEFAULT_PAYMENT`
- `INDIVIDUAL_DEFAULT_FULFILLMENT` 
- `INDIVIDUAL_DEFAULT_RETURN`

**These are NOT valid eBay policy IDs!** eBay is rejecting them with error 25709: "Invalid value for fulfillmentPolicyId"

## 📊 The Real Problem

### What We're Doing Wrong:
1. **Assuming default policies exist** - We're using placeholder strings for individual accounts
2. **Not fetching actual policies** - We never retrieve the user's real eBay business policies
3. **Hardcoding fake IDs** - These "INDIVIDUAL_DEFAULT_*" strings are made up, not from eBay

### What Actually Happens:
- Individual sellers on eBay **DO have business policies** (they're just created automatically)
- These policies have **real IDs** (like "5733588000", not "INDIVIDUAL_DEFAULT_PAYMENT")
- We need to **fetch these IDs** from eBay's Account API

## ✅ The Correct Solution

### For Individual Accounts:
1. **Option A: Omit policies entirely**
   - Don't send `listingPolicies` at all for individual accounts
   - Let eBay apply the account's default policies automatically

2. **Option B: Fetch real policy IDs**
   - Call eBay's Account API: `GET /sell/account/v1/fulfillment_policy`
   - Store the actual policy IDs in our database
   - Use these real IDs when creating offers

### For Business Accounts:
- Continue using stored policy IDs (these are already real IDs from eBay)
- Use `fulfillmentDetails` for custom shipping options

## 🔧 Implementation Plan

### Phase 1: Quick Fix (Immediate)
**File**: `/supabase/functions/ebay-inventory-sync/ebay-offer-manager.ts`

```typescript
// REMOVE the fake default policies
// DON'T send listingPolicies for individual accounts at all

if (isIndividual) {
  // Don't include listingPolicies in the offer data
  const offerData = {
    sku,
    marketplaceId: "EBAY_US",
    format: "FIXED_PRICE",
    availableQuantity: 1,
    categoryId: listing.ebay_category_id,
    merchantLocationKey: ebayLocationKey,
    pricingSummary: {
      price: {
        value: listing.price.toString(),
        currency: "USD"
      }
    },
    listingDescription: listing.description
    // NO listingPolicies field!
  };
} else {
  // Business account - use real stored policy IDs
  // Include listingPolicies with actual IDs from database
}
```

### Phase 2: Proper Solution (Next Sprint)
1. **Add policy fetching to OAuth flow**
   - When user connects eBay, fetch their actual policy IDs
   - Store real IDs in database

2. **Create policy management UI**
   - Show user their actual eBay policies
   - Allow selection of which policies to use

3. **Update sync logic**
   - Use real policy IDs from database
   - Handle policy updates/changes

## 📋 All Identified Issues

### 1. **Invalid Policy IDs** (CRITICAL)
- **Issue**: Using fake "INDIVIDUAL_DEFAULT_*" strings
- **Fix**: Omit policies or fetch real IDs

### 2. **Account Type Detection**
- **Issue**: Complex logic trying to detect individual vs business
- **Fix**: Simplify - check if user has real policy IDs stored

### 3. **Error Handling**
- **Issue**: Not catching policy-specific errors properly
- **Fix**: Add specific handling for error 25709

### 4. **Token Management**
- **Issue**: Tokens expiring too frequently
- **Fix**: Already implemented refresh logic, needs testing

### 5. **Shipping Services**
- **Issue**: Validation running when not needed
- **Fix**: Already fixed - skip for individual accounts

## 🚀 Action Items

### Immediate (Do Now):
1. ✅ Remove fake "INDIVIDUAL_DEFAULT_*" policy IDs
2. ✅ Omit `listingPolicies` field for individual accounts
3. ✅ Test sync without policies for individual accounts

### Short Term (This Week):
1. Add eBay Account API integration to fetch real policies
2. Update database schema to store real policy IDs
3. Update OAuth flow to fetch policies on connection

### Long Term (Next Sprint):
1. Build policy management UI
2. Add policy selection during listing creation
3. Implement policy sync/refresh functionality

## 🧪 Testing Checklist

- [ ] Individual account can sync without policies
- [ ] Business account still works with real policies
- [ ] Error handling catches invalid policy errors
- [ ] Token refresh works for 180-day lifecycle
- [ ] Bulk sync works for multiple items

## 📝 Notes

The fundamental issue is that we invented placeholder policy IDs that don't exist in eBay's system. Individual sellers DO have policies - they're just created automatically by eBay and have real IDs we need to fetch. The quick fix is to omit policies entirely and let eBay use defaults. The proper fix is to fetch and store the real policy IDs.
