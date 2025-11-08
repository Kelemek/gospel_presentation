# Session Expiry Fix

## Problem
Users were staying logged in even after their session should have expired. When returning to the site after some time, they would appear logged in but their session was actually expired.

## Root Cause
The authentication checks were using `supabase.auth.getUser()` which only checks if a token exists in cookies, but doesn't validate if the token is expired. Supabase JWT tokens expire after 1 hour by default, but the app wasn't checking expiry.

## Solution

### 1. Updated Proxy Middleware (`src/proxy.ts`)
Changed from using `getUser()` to `getSession()` which properly validates token expiry:

```typescript
// OLD: Only checked if user exists
const { data: { user } } = await supabase.auth.getUser()

// NEW: Validates session expiry
const { data: { session }, error } = await supabase.auth.getSession()

// Check if session is expired
const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
const now = Date.now()

if (expiresAt && expiresAt < now) {
  // Redirect to login
}
```

### 2. Updated Admin Page Auth Check (`src/app/admin/page.tsx`)
Added session validation and automatic refresh attempt:

```typescript
// Get session instead of just user
const { data: { session }, error } = await supabase.auth.getSession()

// Check if expired and try to refresh
if (expiresAt && expiresAt < now) {
  const { data: { session: refreshedSession }, error } = 
    await supabase.auth.refreshSession()
  
  if (!refreshedSession || error) {
    // Refresh failed, redirect to login
    router.push('/login')
    return
  }
}
```

### 3. Added Session Monitor Hook (`src/hooks/useSessionMonitor.ts`)
Created a new hook that continuously monitors session validity:

- Checks session every 60 seconds
- Automatically attempts to refresh expired sessions
- Logs user out if refresh fails
- Can be customized with options:
  ```typescript
  useSessionMonitor({
    checkInterval: 60000, // Check every minute
    enabled: !!user,
    onSessionExpired: () => router.push('/login')
  })
  ```

## How It Works Now

### On Initial Page Load
1. Proxy middleware checks if session exists and is valid
2. If expired, immediately redirects to login
3. If valid, allows access to protected routes

### While Using the App
1. Admin page checks session on mount
2. Attempts to refresh if expired
3. Session monitor runs every 60 seconds
4. Auto-refreshes or logs out as needed

### Session Lifecycle
```
User logs in
  ↓
Session valid for 1 hour (Supabase default)
  ↓
After 50 minutes: Session monitor detects approaching expiry
  ↓
Attempts refresh (new 1-hour token issued)
  ↓
If refresh succeeds: User stays logged in
  ↓
If refresh fails: User redirected to login
```

## Default Supabase Session Settings

From Supabase Dashboard → Authentication → Settings:

- **JWT Expiry**: 3600 seconds (1 hour)
- **Refresh Token Expiry**: 2,592,000 seconds (30 days)
- **Refresh Token Rotation**: Enabled (recommended)

## Customizing Session Duration

To change session duration in Supabase Dashboard:

1. Go to **Authentication** → **Settings**
2. Update **JWT expiry limit** (in seconds)
   - Minimum: 300 (5 minutes)
   - Maximum: 604800 (7 days)
   - Recommended: 3600 (1 hour)
3. Update **Refresh token expiry** (in seconds)
   - Controls how long users can stay logged in total
   - Default: 30 days

## Testing the Fix

### Manual Test
1. Log in to the app
2. Wait for session to expire (default: 1 hour)
3. Try to navigate or refresh the page
4. Should be redirected to login immediately

### Developer Test
To test without waiting 1 hour:

1. Set JWT expiry to 60 seconds in Supabase Dashboard
2. Log in
3. Wait 2 minutes
4. Try to use the app
5. Should auto-logout or redirect to login

### Verify in Browser DevTools
```javascript
// In browser console
const supabase = createClient()
const { data } = await supabase.auth.getSession()
console.log('Expires at:', new Date(data.session.expires_at * 1000))
console.log('Now:', new Date())
```

## Files Changed

1. **src/proxy.ts** - Added session expiry validation to middleware
2. **src/app/admin/page.tsx** - Added session check with refresh attempt
3. **src/hooks/useSessionMonitor.ts** - New hook for continuous session monitoring

## Next Steps (Optional)

### Show Session Timeout Warning
Add a countdown/warning before auto-logout:

```typescript
useSessionMonitor({
  checkInterval: 60000,
  onSessionExpired: () => {
    // Show warning 5 minutes before expiry
    alert('Your session will expire in 5 minutes')
  }
})
```

### Persist User Activity
Extend session on user activity (clicks, typing):

```typescript
// Track last activity
useEffect(() => {
  const handleActivity = async () => {
    const supabase = createClient()
    await supabase.auth.refreshSession()
  }
  
  window.addEventListener('click', handleActivity)
  window.addEventListener('keypress', handleActivity)
  
  return () => {
    window.removeEventListener('click', handleActivity)
    window.removeEventListener('keypress', handleActivity)
  }
}, [])
```

## Commit Message
```
Fix session expiry validation and auto-logout

- Updated proxy middleware to check session expiry before allowing access
- Added session refresh logic to admin page auth check
- Created useSessionMonitor hook for continuous session validation
- Properly handles expired sessions by redirecting to login
- Prevents users from appearing logged in with expired sessions
```
