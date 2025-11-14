# Scripture Caching System

This implements database caching for ESV API and API.Bible responses to reduce external API calls and stay within free tier limits.

## Setup

### 1. Run the SQL Migration

Execute the migration in your Supabase SQL editor:

```bash
# Copy the contents of sql/create_scripture_cache.sql and run in Supabase SQL Editor
```

This creates:
- `scripture_cache` table
- Helper functions for cache management
- RLS policies

### 2. Cache Configuration

Cache TTL is configured in `/api/scripture/route.ts`:

```typescript
const CACHE_TTL_DAYS = 30 // Adjust this value (1-365 days)
```

## How It Works

### Automatic Caching

1. User requests scripture via `/api/scripture?reference=John 3:16&translation=esv`
2. System checks cache for entry less than 30 days old
3. **Cache hit**: Returns cached text immediately
4. **Cache miss**: Fetches from external API, caches result, returns text

### Cache Headers

Responses include browser caching headers:
```
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```
- Browser caches for 24 hours
- Serves stale for up to 7 days while revalidating

## Cache Management

### Automatic LRU (Least Recently Used) Enforcement

**ESV API Compliance:**
The system automatically enforces the ESV API's 500-verse cache limit using LRU eviction:
- When ESV cache exceeds 500 verses, least-recently-used entries are automatically deleted
- This happens automatically after each new ESV verse is cached
- Frequently accessed verses stay in cache longer
- Ensures compliance with ESV API terms

**API.Bible:**
- No automatic eviction (unlimited caching allowed)
- Only removed during scheduled 30-day TTL cleanup

### View Cache Statistics

```bash
curl https://your-domain.com/api/scripture/cache
```

Returns:
```json
{
  "totalEntries": 350,
  "esvCache": {
    "entries": 283,
    "maxLimit": 500,
    "compliance": "283/500 verses"
  },
  "apiBibleCache": {
    "entries": 67,
    "maxLimit": "Unlimited"
  },
  "cacheTTLDays": 30
}
```

### Manual Cleanup

Remove entries older than specified days:

```bash
curl -X POST https://your-domain.com/api/scripture/cache \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 30}'
```

### Automatic Cleanup (Recommended)

#### Option 1: GitHub Actions (Configured)

A GitHub Actions workflow runs daily at 3 AM UTC:

- **File**: `.github/workflows/cleanup-cache.yml`
- **Schedule**: Daily at 3 AM UTC (after database backup)
- **Default TTL**: 30 days
- **Manual trigger**: Can run manually with custom `days_to_keep` parameter

To adjust the TTL, edit the workflow file or run manually:

```bash
# Via GitHub UI: Actions → Cleanup Scripture Cache → Run workflow
# Set "days_to_keep" to desired value
```

#### Option 2: Vercel Cron (alternative)

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/scripture/cache",
    "schedule": "0 3 * * *"
  }]
}
```

#### Option 3: pg_cron (Supabase extension)

Enable pg_cron in Supabase and uncomment the cron schedule in the migration SQL:

```sql
SELECT cron.schedule(
  'cleanup-scripture-cache',
  '0 3 * * *',
  $$SELECT cleanup_old_scripture_cache(30)$$
);
```

## Storage Estimates & Compliance

### Cache Size
- **Average cache entry**: ~600 bytes
- **283 verses (ESV)**: ~0.17 MB
- **283 verses per API.Bible translation**: ~0.17 MB each
- **Full cache (1 ESV + 3 API.Bible versions)**: ~0.68 MB

Supabase free tier provides 500 MB, so caching is negligible.

### API License Compliance

**ESV API (Free Tier)**
- ✅ **Cache limit**: 500 verses maximum
- ✅ **Enforcement**: Automatic LRU eviction when limit exceeded
- ✅ **Current compliance**: Real-time monitoring via cache stats endpoint
- Cache entries older than 30 days also removed automatically

**API.Bible (Free Tier)**
- ✅ **Cache limit**: Unlimited (no restriction)
- Uses FUMS Fair Use Management System for usage tracking
- Caching is explicitly permitted
- Entries removed only after 30-day TTL expires

## Monitoring

Check cache effectiveness:

```sql
-- See cache statistics
SELECT 
  translation,
  COUNT(*) as entries,
  MIN(cached_at) as oldest,
  MAX(cached_at) as newest
FROM scripture_cache
GROUP BY translation;

-- See most cached verses
SELECT reference, translation, cached_at
FROM scripture_cache
ORDER BY cached_at DESC
LIMIT 20;
```

## Adjusting Cache Duration

To change cache TTL:

1. Edit `CACHE_TTL_DAYS` in `/api/scripture/route.ts`
2. Redeploy application
3. Run cleanup to remove old entries:
   ```bash
   curl -X POST https://your-domain.com/api/scripture/cache \
     -d '{"daysToKeep": 7}'
   ```

## Recommendations

- **Development**: 1-7 days for faster iteration
- **Production**: 30-90 days (scripture never changes)
- **Heavy traffic**: 90-365 days maximum caching

## Benefits

✅ Reduces external API calls by 95%+  
✅ Stays within free tier limits (500-5000 requests/day)  
✅ Faster response times for users  
✅ Works across all translations (ESV, KJV, NASB)  
✅ Automatic cleanup prevents database bloat  
✅ Browser caching for repeat visitors
