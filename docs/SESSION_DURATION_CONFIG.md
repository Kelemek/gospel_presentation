# Session Duration Configuration

## Overview

By default with automatic logout disabled, users can stay logged in for **7 days** (Supabase default refresh token duration). This document explains how to extend or modify session duration.

## Current Settings

### Access Token Duration
- **Location**: `supabase/functions/verify-code/index.ts` line 268
- **Current Value**: 3600 seconds (1 hour)
- **What it does**: How long the JWT token is valid before requiring a refresh

### Refresh Token Duration  
- **Controlled by**: Supabase Auth settings (not in code)
- **Current Value**: 7 days (Supabase default)
- **What it does**: How long before user must log in again

## Extending Session Duration

### Option A: Extend Access Token (Quick Fix)
Increase how long the access token lasts before requiring a refresh. This doesn't change the ultimate session limit, but reduces refresh cycles.

**Example: 24-hour access tokens**
```typescript
// In supabase/functions/verify-code/index.ts line 268
session = {
  access_token: hashed_token,
  refresh_token: hashed_token,
  expires_in: 86400,  // 24 hours (was 3600 = 1 hour)
  token_type: 'bearer',
};
```

### Option B: Configure Supabase Refresh Token Duration (Recommended)

**Steps**:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Settings → Authentication → Providers → Email

2. **Find these settings**:
   - "JWT expiry" = Access token duration
   - "JWT secret" = Signing key (don't change)
   - Session duration settings (varies by Supabase version)

3. **Adjust Values**:
   - Increase JWT expiry for longer access token duration
   - Some Supabase versions allow configuring session/refresh token duration
   - Supabase Cloud may default to 7 days but can be configured

4. **Notes**:
   - Changes take effect immediately for new logins
   - Existing sessions are not affected
   - Check your Supabase documentation for your specific version

### Option C: Implement Custom Long-Lived Sessions

If you need sessions lasting months/years beyond Supabase's limits:

1. Create an `app_sessions` table with custom expiry
2. Store refresh logic in your Edge Functions
3. Implement server-side session validation

**Example implementation**:
```sql
-- Custom session table
CREATE TABLE app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_refreshed_at TIMESTAMP DEFAULT NOW()
);
```

Then modify `verify-code` to:
1. Create tokens as usual
2. Store in `app_sessions` with custom expiry
3. Add custom refresh logic

## Testing Your Configuration

1. **Log in** and note the time
2. **Wait past 1 hour** (default access token expiry)
   - App should still work (auto-refresh)
3. **Wait past configured session duration** 
   - App should require re-login

## Recommended Configuration

**For most use cases**:
- Access token: 1-2 hours (current: 1 hour ✓)
- Refresh token: 30 days (current: 7 days)
- Auto-logout disabled: ✓

This gives users flexibility while maintaining security.

## Related Files

- `supabase/functions/verify-code/index.ts` - Token generation
- `gospel-admin/src/hooks/useSessionMonitor.ts` - Session monitoring (currently disabled)
- `gospel-admin/src/app/admin/page.tsx` - Dashboard session config

## See Also

- [04-AUTHENTICATION.md](04-AUTHENTICATION.md) - Auth system overview
- [VERIFICATION_CODE_AUTH.md](VERIFICATION_CODE_AUTH.md) - Verification code flow
