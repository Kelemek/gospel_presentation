# Gospel Presentation - Recent Updates

## Latest Changes (October 2025)

This document summarizes the recent updates and improvements to the Gospel Presentation application.

---

## 1. Share Profile Feature

### What Changed
Added a simple "Share" button to copy profile URLs to clipboard.

### How It Works
- Click "Share" next to any profile in the admin dashboard
- Profile URL is automatically copied to your clipboard
- Alert shows the copied URL
- Paste and share via email, text, or any messaging platform

### Implementation Details
- **File:** `src/app/admin/page.tsx`
- **Function:** `handleCopyProfileUrl(profile)`
- Uses `navigator.clipboard.writeText()` API
- Includes fallback for browsers without clipboard support

### User Experience
```
User clicks "Share" button
  ↓
URL copied: https://gospel-presentation.vercel.app/marklarson
  ↓
Alert displays with URL
  ↓
User pastes URL wherever needed
```

---

## 2. Next.js 16 Compatibility Fixes

### Middleware → Proxy Migration

**Issue:** Next.js 16 deprecated the `middleware.ts` convention  
**Solution:** Renamed to `proxy.ts` with function name change

**Changes Made:**
- Renamed: `src/middleware.ts` → `src/proxy.ts`
- Function: `middleware()` → `proxy()`
- Functionality: Unchanged (still protects `/admin` routes)

**Files Modified:**
- `gospel-admin/src/proxy.ts`

### Edge Runtime Warning Fix

**Issue:** Edge runtime warning on icon generation page  
**Solution:** Removed explicit `runtime = 'edge'` declaration

**Changes Made:**
- Removed: `export const runtime = 'edge'` from `icon.tsx`
- Next.js automatically selects correct runtime for `ImageResponse`

**Files Modified:**
- `gospel-admin/src/app/icon.tsx`

---

## 3. Environment Variables Reference

### Production (Vercel)

Required environment variables that must be set in Vercel dashboard:

```bash
# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://mchtyihbwlzjhkcmdvib.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ESV Bible API
ESV_API_TOKEN=4e9459b567a67ed91ee220b52b7c7e670dd3cee7
```

### How to Add in Vercel

1. Go to https://vercel.com/
2. Select your project: `gospel-presentation`
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable:
   - **Key:** Variable name (e.g., `ESV_API_TOKEN`)
   - **Value:** The actual value/token
   - **Environments:** Check all (Production, Preview, Development)
5. Click **Save**
6. Redeploy (or push new commit to trigger deployment)

### Local Development

All variables stored in `gospel-admin/.env.local` (not committed to git)

---

## 4. Supabase Auth URL Configuration

### Issue
Magic links were pointing to `localhost:3000` instead of production URL.

### Solution
Update Auth URLs in Supabase Dashboard:

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Update these settings:
   - **Site URL:** `https://gospel-presentation.vercel.app`
   - **Redirect URLs:** Add `https://gospel-presentation.vercel.app/auth/callback`
3. Save changes

### Why This Matters
- Magic link emails will now contain correct production URLs
- Users can authenticate from email on any device
- No more localhost redirects in production

---

## 5. Public Access to Default Profile

### Issue
Anonymous users getting 404 when visiting `/default` route.

### Solution
Run SQL policy in Supabase to allow anonymous access:

**File:** `gospel-admin/sql/allow_public_default_profile.sql`

```sql
-- Allow anonymous users to view the default profile
CREATE POLICY "Anyone can view default profile"
ON public.profiles FOR SELECT
TO anon
USING (is_default = true);
```

**How to Execute:**
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Paste the SQL from the file
4. Click **Run**

### Result
- Public can view default gospel presentation without login
- All other profiles still require authentication
- RLS continues protecting user-specific content

---

## 6. Deployment Configuration

### Vercel Setup

**Current Configuration:**

```json
// gospel-admin/vercel.json
{
  "framework": "nextjs"
}
```

**Vercel Dashboard Settings:**
- **Framework Preset:** Next.js
- **Root Directory:** `gospel-admin`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Node.js Version:** 18.x (or higher)

### Git Integration

**Repository:** `Kelemek/gospel_presentation`  
**Branch:** `main`  
**Auto-deploy:** Enabled (every push to main triggers deployment)

---

## 7. Code Organization Updates

### New Files Created
- `gospel-admin/src/proxy.ts` - Auth middleware (renamed from middleware.ts)
- `gospel-admin/sql/allow_public_default_profile.sql` - Anonymous access policy

### Files Modified
- `gospel-admin/src/app/admin/page.tsx` - Added Share button & handler
- `gospel-admin/src/app/icon.tsx` - Removed edge runtime declaration

### Files Deleted
- `gospel-admin/src/middleware.ts` - Renamed to proxy.ts
- `gospel-admin/src/app/api/profiles/[slug]/share/` - Email API route (not needed)

---

## 8. Feature Summary

### Current Features

✅ **Authentication**
- Passwordless magic link login
- Email-based user invites
- Session management via Supabase Auth

✅ **User Management**
- Two roles: Admin and Counselor
- Role-based access control
- User invitation system
- User deletion (with safeguards)

✅ **Profile Management**
- Create/edit/delete profiles
- Profile cloning
- Visit count tracking
- Public default profile

✅ **Content Management**
- Rich gospel presentation editor
- Scripture reference integration
- Table of contents
- Favorites system

✅ **Backup & Restore**
- JSON export of profiles
- Import from backup files
- Create new profiles from backups

✅ **Sharing**
- Copy profile URL to clipboard
- Simple one-click sharing

---

## 9. Quick Reference

### Common Tasks

#### Deploy to Production
```bash
git add -A
git commit -m "Your commit message"
git push origin main
# Vercel auto-deploys
```

#### Add Environment Variable
1. Vercel Dashboard → Settings → Environment Variables
2. Add variable
3. Redeploy or push new commit

#### Run SQL in Supabase
1. Supabase Dashboard → SQL Editor
2. Paste SQL
3. Click Run

#### Test Locally
```bash
cd gospel-admin
npm run dev
# Open http://localhost:3000
```

#### Check Deployment Logs
1. Vercel Dashboard → Deployments
2. Click on deployment
3. View "Build Logs" tab

---

## 10. Troubleshooting

### Build Warnings

#### npm deprecation warnings
**Issue:** `inflight@1.0.6` and `glob@7.2.3` deprecation warnings  
**Impact:** None - these are transitive dependencies  
**Action:** Safe to ignore, will be updated by Next.js team in future releases

#### Middleware deprecation (FIXED)
**Was:** Warning about `middleware.ts` convention  
**Fix:** Renamed to `proxy.ts`  
**Status:** ✅ Resolved

#### Edge runtime warning (FIXED)
**Was:** Warning about edge runtime disabling static generation  
**Fix:** Removed `runtime = 'edge'` from icon.tsx  
**Status:** ✅ Resolved

### Runtime Errors

#### "ESV API token not configured"
**Cause:** Missing `ESV_API_TOKEN` in Vercel  
**Fix:** Add environment variable in Vercel dashboard

#### 404 on /default
**Cause:** Anonymous access policy not created  
**Fix:** Run `allow_public_default_profile.sql` in Supabase

#### Magic links to localhost
**Cause:** Supabase Auth URLs not configured  
**Fix:** Update Site URL and Redirect URLs in Supabase dashboard

---

## 11. Git Commit History

Recent commits:

```
57bca6c - Fix Next.js 16 build warnings: rename middleware to proxy and remove edge runtime
56c8a27 - Add simple share button to copy profile URLs to clipboard
5fc0228 - Complete Supabase migration with magic link authentication
```

---

## 12. Next Steps

### Recommended Actions

1. ✅ **Add ESV_API_TOKEN to Vercel** (if not done)
2. ✅ **Update Supabase Auth URLs** (if not done)
3. ✅ **Run allow_public_default_profile.sql** (if not done)
4. ⏳ **Test magic link login on production**
5. ⏳ **Test profile sharing feature**
6. ⏳ **Create a counselor user to test permissions**

### Optional Enhancements

- Custom domain setup
- Email template customization in Supabase
- Analytics integration
- SEO optimization
- Performance monitoring

---

## 13. Support Resources

### Documentation
- [Supabase Migration Guide](./SUPABASE_MIGRATION.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Security Best Practices](./SECURITY.md)
- [Backup System](./BACKUP_SYSTEM.md)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

**Last Updated:** October 30, 2025  
**Application Version:** Next.js 16.0.0  
**Database:** Supabase PostgreSQL  
**Hosting:** Vercel
