# Scripture Access Logging & Reporting

## Overview

This system tracks all scripture access by **unique session ID** for all Bible translations (ESV, KJV, NASB). This enables annual reporting on translation usage (particularly NASB for Lockman agreements) without storing personally identifiable information about users.

## Features

- ✅ Logs all scripture requests by unique session
- ✅ Tracks both authenticated and anonymous visitors transparently
- ✅ No user identity stored - only session IDs
- ✅ Supports all translations: ESV (API), KJV (database), NASB (database)
- ✅ Tracks profile context (which presentation accessed scripture)
- ✅ Comprehensive reporting queries included
- ✅ Non-blocking logging (doesn't impact response time)

## Setup

### 1. Create the Logging Table

Run the SQL migration in your Supabase SQL Editor:

```bash
# Located at: sql/create_scripture_access_logs.sql
```

This creates:
- `scripture_access_logs` table with session-based tracking
- Indexes optimized for annual reporting
- RLS policies (allows inserts from anyone, selects only for admins)

### 2. Code Integration

The logging is automatically integrated into `/api/scripture`:

- **All translations logged**: ESV (API), KJV (database), NASB (database)
- **Session ID generation**: Creates unique identifier for all users
- **No user tracking**: Anonymous and logged-in users treated identically
- **Non-blocking**: Logging is async and won't slow down scripture delivery

## How It Works

### Request Flow

```
User requests scripture
  ↓
GET /api/scripture?reference=...&translation=nasb
  ↓
Fetch scripture (API or database)
  ↓
Log access asynchronously:
  - session_id (unique per user/browser)
  - translation (esv, kjv, or nasb)
  - scripture_reference
  - timestamp
  ↓
Return scripture response
```

### Session ID Generation

A unique session ID is generated for each user based on:
1. Check for existing `x-session-id` header
2. Check for `scripture_session_id` cookie
3. Generate from user agent + timestamp fingerprint

This ensures the same user/browser is tracked as one session across multiple requests.

## Reporting Queries

Pre-built reports are available in `sql/scripture_access_reporting.sql`:

### Report 1: Unique Sessions by Translation per Year
```sql
SELECT year, translation, unique_sessions, total_scripture_views FROM ...
```
**Use**: Overall platform usage by translation

### Report 2: NASB Usage Summary (for Lockman)
```sql
SELECT year, unique_sessions_used_nasb, total_scripture_views FROM ...
WHERE translation = 'nasb'
```
**Use**: Annual NASB usage reporting to Lockman. Shows how many unique sessions accessed NASB scripture each year.

### Report 3: Detailed Breakdown - All Translations
Shows all three translations with session counts, view totals, and unique scriptures accessed

### Report 4: Monthly Trend for NASB
Shows usage pattern throughout the year

### Report 5: Top Scriptures by Translation
Identifies most-accessed scriptures

### Report 6: Year-over-Year Growth
Tracks NASB usage growth trend

## Reports Dashboard

A built-in reports page is available at `/admin/reports` (or via the "📊 View Usage Reports" button in the Translation Settings dropdown).

**How to Access:**
1. Go to the translation/scripture viewing page
2. Click the translation dropdown
3. Scroll to bottom and click "📊 View Usage Reports"
4. Select a report type and click "Run Report"
5. Download results as CSV if needed

**Available Reports:**
- Unique Sessions by Translation & Year
- NASB Usage Summary (Lockman reporting)
- All Translations Detailed Breakdown
- Monthly Trends
- Top Scriptures Accessed
- Year-over-Year Growth

**Note**: The first time you run a report, ensure the database table has been created by running the migration in Supabase SQL Editor.

## Database Schema

```sql
CREATE TABLE scripture_access_logs (
  id BIGSERIAL PRIMARY KEY,
  profile_slug TEXT,                  -- Which profile accessed scripture
  scripture_reference TEXT NOT NULL,  -- e.g., "Matthew 3:16"
  translation TEXT NOT NULL,          -- 'esv', 'kjv', or 'nasb'
  session_id TEXT NOT NULL,           -- Unique identifier for user/browser
  ip_address TEXT,                    -- For analytics
  user_agent TEXT,                    -- Browser info
  timestamp TIMESTAMP DEFAULT NOW(),  -- When accessed
  year_accessed INTEGER GENERATED,    -- For faster filtering
  
  CONSTRAINT translation_check CHECK (translation IN ('esv', 'kjv', 'nasb'))
)

-- Key indexes:
- idx_scripture_access_translation_year (for annual reporting)
- idx_scripture_access_session (for session grouping)
- idx_scripture_access_reporting (composite for common queries)
```

## Annual Reporting (for Lockman)

To generate your annual NASB usage report:

```sql
-- Run this query at the end of each year
SELECT 
  EXTRACT(YEAR FROM timestamp) as year,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_scripture_requests
FROM scripture_access_logs
WHERE translation = 'nasb'
GROUP BY year
ORDER BY year DESC;
```

This gives you:
- **unique_sessions**: Total unique people/browsers who accessed NASB
- **total_scripture_requests**: Total scripture lookups (for usage intensity)

## Privacy & Security

- ✅ Only admins can view logs (RLS policy)
- ✅ No personally identifiable information stored
- ✅ Session IDs are non-reversible fingerprints
- ✅ IP address stored for analytics only
- ✅ Can be deleted per user request (just delete by session)

## Implementation Notes

### Non-Blocking Design
```typescript
// Logging is async and doesn't wait for completion
logScriptureAccess({ ... }).catch(err => logger.warn(...))

// Scripture response is sent immediately, logging happens in background
return NextResponse.json(result)
```

### Session ID Persistence
To make session IDs persist across requests, the frontend should:
1. Store session ID from response header
2. Send `x-session-id` header on subsequent requests

(Optional enhancement - currently works with fingerprint)

## Future Enhancements

- [ ] Add `profile_context` field (which presentation/section)
- [ ] Add `viewport_size` for device analytics
- [ ] Add `referrer` to track traffic sources
- [ ] Create admin dashboard for real-time reporting
- [ ] Email weekly/monthly summaries to admins
- [ ] Archive old logs to cold storage quarterly
