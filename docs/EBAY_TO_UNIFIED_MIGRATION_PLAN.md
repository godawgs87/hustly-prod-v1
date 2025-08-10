# eBay to Unified Platform Migration Plan

## Overview
This document provides a detailed, component-by-component migration plan to transform eBay-specific components into platform-agnostic components that work for all marketplaces.

## Migration Priority Levels

- **🔴 Priority 1**: Core functionality (must migrate first)
- **🟡 Priority 2**: Important features (migrate second)
- **🟢 Priority 3**: Nice-to-have features (migrate last)

## Component Migration Map

### 🔴 Priority 1: Core Components (Week 1)

#### 1. EbaySyncButton → PlatformSyncButton
**Current Location**: `src/components/inventory/EbaySyncButton.tsx`
**New Location**: `src/components/platform/PlatformSyncButton.tsx`

**Migration Steps**:
1. Create new `PlatformSyncButton` component
2. Add `platformId` prop to specify which platform
3. Use `PlatformRegistry.get(platformId)` to get adapter
4. Update all imports from `EbaySyncButton` to `PlatformSyncButton`
5. Delete old component

**Usage Change**:
```typescript
// Before
<EbaySyncButton listingId={listing.id} />

// After
<PlatformSyncButton platformId="ebay" listingId={listing.id} />
<PlatformSyncButton platformId="poshmark" listingId={listing.id} />
```

#### 2. EbayConnectionCard → PlatformConnectionCard
**Current Location**: `src/components/user-settings/connections/EbayConnectionCard.tsx`
**New Location**: `src/components/platform/PlatformConnectionCard.tsx`

**Migration Steps**:
1. Create generic `PlatformConnectionCard`
2. Use platform adapter for connection logic
3. Support OAuth, API key, and username/password auth types
4. Update UserConnectionsTab to use new component
5. Delete old component

#### 3. BulkEbaySyncManager → BulkPlatformSyncManager
**Current Location**: `src/components/inventory/BulkEbaySyncManager.tsx`
**New Location**: `src/components/platform/BulkPlatformSyncManager.tsx`

**Migration Steps**:
1. Create `BulkPlatformSyncManager` with multi-platform support
2. Add platform selection UI
3. Process listings in parallel across platforms
4. Update InventorySyncManager to use new component
5. Delete old component

### 🟡 Priority 2: Policy & Category Components (Week 2)

#### 4. EbayPolicyManager → PlatformPolicyManager
**Current Location**: `src/components/user-settings/connections/EbayPolicyManager.tsx`
**New Location**: `src/components/platform/PlatformPolicyManager.tsx`

**Migration Steps**:
1. Create abstract policy interface
2. Support different policy types per platform
3. Handle platforms without policies gracefully
4. Migrate existing eBay policy logic

**Policy Interface**:
```typescript
interface PlatformPolicy {
  id: string;
  platformId: string;
  type: 'shipping' | 'return' | 'payment';
  name: string;
  settings: Record<string, any>;
}
```

#### 5. EbayCategorySelector → PlatformCategorySelector
**Current Location**: `src/components/listings/table-row/cells/EbayCategorySelector.tsx`
**New Location**: `src/components/platform/PlatformCategorySelector.tsx`

**Migration Steps**:
1. Use existing CategoryManager service
2. Add platform switcher if multiple platforms selected
3. Show category mappings across platforms
4. Support platform-specific category features

#### 6. EbayCategorySync → PlatformCategorySync
**Current Location**: `src/components/user-settings/connections/EbayCategorySync.tsx`
**New Location**: `src/components/platform/PlatformCategorySync.tsx`

**Migration Steps**:
1. Support category sync for all platforms
2. Show sync status per platform
3. Handle platforms without category API
4. Batch sync across platforms

### 🟢 Priority 3: Status & Warning Components (Week 3)

#### 7. EbayTokenExpiryWarning → PlatformAuthWarning
**Current Location**: `src/components/EbayTokenExpiryWarning.tsx`
**New Location**: `src/components/platform/PlatformAuthWarning.tsx`

**Migration Steps**:
1. Check auth status for all connected platforms
2. Show appropriate warning per auth type
3. Support different expiry periods
4. Provide re-auth actions

#### 8. EbayPolicyStatusCard → PlatformPolicyStatusCard
**Current Location**: `src/components/user-settings/connections/EbayPolicyStatusCard.tsx`
**New Location**: `src/components/platform/PlatformPolicyStatusCard.tsx`

**Migration Steps**:
1. Show policy status for platforms that support policies
2. Hide for platforms without policy support
3. Unify status indicators

#### 9. EbaySuccessSection → PlatformSuccessSection
**Current Location**: `src/components/user-settings/connections/EbaySuccessSection.tsx`
**New Location**: `src/components/platform/PlatformSuccessSection.tsx`

**Migration Steps**:
1. Generic success messaging
2. Platform-specific success actions
3. Multi-platform success state

## Service Layer Migration

### useEbayConnection → usePlatformConnection
**Current Location**: `src/components/user-settings/connections/useEbayConnection.ts`
**New Location**: `src/hooks/usePlatformConnection.ts`

```typescript
// New unified hook
export const usePlatformConnection = (platformId: string) => {
  const adapter = PlatformRegistry.get(platformId);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const connect = async (credentials: PlatformCredentials) => {
    setLoading(true);
    try {
      await adapter?.connect(credentials);
      setConnected(true);
    } finally {
      setLoading(false);
    }
  };
  
  return { connected, loading, connect, disconnect, adapter };
};
```

### useEbaySyncOperation → usePlatformSyncOperation
**Current Location**: `src/hooks/useEbaySyncOperation.ts`
**New Location**: `src/hooks/usePlatformSyncOperation.ts`

```typescript
export const usePlatformSyncOperation = (platformId: string) => {
  const adapter = PlatformRegistry.get(platformId);
  
  const syncListing = async (listingId: string) => {
    return await adapter?.syncListing(listingId);
  };
  
  const bulkSync = async (listingIds: string[]) => {
    if (adapter?.capabilities.bulkOperations) {
      return await adapter.bulkOperations(
        listingIds.map(id => ({ type: 'sync', listingId: id }))
      );
    }
    // Fallback to sequential sync
    return Promise.all(listingIds.map(id => syncListing(id)));
  };
  
  return { syncListing, bulkSync };
};
```

## Implementation Checklist

### Week 1: Foundation & Core Components
- [ ] Create `src/services/platforms/` directory structure
- [ ] Implement `PlatformRegistry` class
- [ ] Create `IPlatformAdapter` interface
- [ ] Implement `BasePlatformAdapter` abstract class
- [ ] Create `EbayAdapter` extending `BasePlatformAdapter`
- [ ] Migrate `EbaySyncButton` → `PlatformSyncButton`
- [ ] Migrate `EbayConnectionCard` → `PlatformConnectionCard`
- [ ] Migrate `BulkEbaySyncManager` → `BulkPlatformSyncManager`

### Week 2: Policies & Categories
- [ ] Create `PoshmarkAdapter` and `MercariAdapter`
- [ ] Migrate `EbayPolicyManager` → `PlatformPolicyManager`
- [ ] Migrate `EbayCategorySelector` → `PlatformCategorySelector`
- [ ] Migrate `EbayCategorySync` → `PlatformCategorySync`
- [ ] Update all component imports
- [ ] Test multi-platform functionality

### Week 3: Remaining Components & Cleanup
- [ ] Migrate remaining warning/status components
- [ ] Create `DepopAdapter` as proof of concept
- [ ] Remove all eBay-specific components
- [ ] Update documentation
- [ ] Performance testing
- [ ] Create migration guide for future platforms

## Testing Strategy

### Unit Tests
```typescript
describe('PlatformSyncButton', () => {
  it('should work with eBay adapter', () => {
    render(<PlatformSyncButton platformId="ebay" listingId="123" />);
    // Test eBay sync
  });
  
  it('should work with Poshmark adapter', () => {
    render(<PlatformSyncButton platformId="poshmark" listingId="123" />);
    // Test Poshmark sync
  });
  
  it('should hide for platforms without sync capability', () => {
    // Mock platform without sync
    const { container } = render(
      <PlatformSyncButton platformId="no-sync-platform" listingId="123" />
    );
    expect(container.firstChild).toBeNull();
  });
});
```

### Integration Tests
1. Test full listing flow with multiple platforms
2. Test bulk operations across platforms
3. Test platform switching in UI
4. Test tier-based platform access
5. Test error handling per platform

## Success Metrics

### Code Quality
- ✅ Zero eBay-specific components remaining
- ✅ 100% component reuse across platforms
- ✅ <5 minute platform addition time

### Performance
- ✅ No performance degradation
- ✅ Lazy loading of platform adapters
- ✅ Parallel platform operations

### User Experience
- ✅ Consistent UI across all platforms
- ✅ Clear platform capabilities indication
- ✅ Seamless platform switching

## Rollback Plan

If issues arise during migration:
1. Keep old components in `legacy/` folder
2. Use feature flags to toggle between old/new
3. Gradual rollout by component
4. A/B test with subset of users

## Post-Migration Benefits

### Immediate Benefits
- 📉 **70% code reduction** in platform-specific code
- 🚀 **10x faster** platform integration
- 🎯 **100% consistent** user experience
- 🔧 **Single point** of maintenance

### Long-term Benefits
- Easy addition of new platforms (Vinted, Grailed, etc.)
- Platform feature parity
- Reduced technical debt
- Better testability
- Cleaner codebase

## Next Steps After Migration

1. **Add More Platforms**
   - Vinted (European market)
   - Grailed (Designer/streetwear)
   - Vestiaire Collective (Luxury)
   - Facebook Marketplace (Local sales)

2. **Enhanced Features**
   - Cross-platform analytics dashboard
   - Unified messaging center
   - Smart platform recommendation engine
   - Automated cross-listing optimization

3. **Platform Intelligence**
   - ML-based platform selection
   - Optimal pricing per platform
   - Category mapping AI
   - Performance prediction

This migration transforms Hustly from an eBay tool to a true multi-platform powerhouse! 🚀
