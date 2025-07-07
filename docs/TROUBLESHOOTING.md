
# Database Timeout Troubleshooting Guide

## Common Symptoms
- ❌ "Query timeout" errors
- ❌ Infinite loading states
- ❌ "canceling statement due to statement timeout" in logs
- ❌ Pages hanging or becoming unresponsive

## Quick Fixes

### 1. Check Query Complexity
**Problem:** Using `SELECT *` or complex operations
```typescript
// ❌ AVOID - Complex and slow
.select('*')
.or(`title.ilike.%${term}%,description.ilike.%${term}%`)

// ✅ USE - Simple and fast
.select('id, title, price, status, category, condition, created_at, user_id')
.ilike('title', `%${term}%`)
```

### 2. Implement Timeout Protection
```typescript
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('Query timeout')), 3000)
);

const result = await Promise.race([queryPromise, timeoutPromise]);
```

### 3. Reduce Data Limits
```typescript
// Start with small limits
const limit = Math.min(options.limit || 10, 10);
```

### 4. Add Caching Strategy
```typescript
// Always maintain cached data for fallback
const [cachedListings, setCachedListings] = useState<Listing[]>([]);

// Use cached data when fresh queries fail
if (cachedListings.length > 0) {
  setListings(cachedListings);
  setUsingFallback(true);
}
```

## Database Performance Checklist
- [ ] Queries select only needed columns
- [ ] Timeouts are set to 3 seconds or less
- [ ] Result limits are conservative (≤10 items initially)
- [ ] Complex searches are simplified
- [ ] Fallback mechanisms are in place
- [ ] Error handling provides user feedback

## Monitoring
Watch for these patterns in logs:
- Multiple "canceling statement due to statement timeout" errors
- Long-running queries (>5 seconds)
- High memory usage during data fetching
- Frequent connection drops

## Emergency Fixes
If queries are still timing out:
1. Reduce `limit` to 5 items
2. Remove all filters temporarily
3. Use only basic `id, title` selection
4. Implement pagination immediately
