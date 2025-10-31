# Supabase Migration - Ready to Execute

## ✅ Implementation Complete

All code files have been created and are error-free. You're ready to migrate!

## 📦 Files Created

### Documentation
- ✅ `docs/SUPABASE_MIGRATION.md` - Complete migration guide
- ✅ `SUPABASE_NEXT_STEPS.md` - Step-by-step checklist

### Database & Types
- ✅ `src/lib/supabase/database.types.ts` - TypeScript type definitions
- ✅ `src/lib/supabase/client.ts` - Browser Supabase client
- ✅ `src/lib/supabase/server.ts` - Server Supabase client
- ✅ `src/lib/supabase-data-service.ts` - Data layer (replaces blob-data-service)
- ✅ `sql/increment_visit_count.sql` - Database function

### Migration Tools
- ✅ `scripts/migrate-to-supabase.ts` - One-time migration script
- ✅ Added `migrate-to-supabase` npm script to package.json

### Authentication & Pages
- ✅ `src/app/login/page.tsx` - Login page with email/password
- ✅ `src/middleware.ts` - Route protection middleware
- ✅ `src/app/admin/users/page.tsx` - User management (admin only)

## 🚀 Migration Steps (In Order)

### Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Create a new project:
   - Project name: `gospel-presentation`
   - Database password: (save this securely)
   - Region: (choose closest to you)
3. Wait for project to finish provisioning (~2 minutes)

### Step 2: Setup Database Schema

1. Go to SQL Editor in Supabase dashboard
2. Copy the entire SQL from `docs/SUPABASE_MIGRATION.md` (Phase 2 section)
3. Paste and run it - this creates:
   - `profiles` table
   - `user_profiles` table
   - Row-Level Security policies
   - Helper functions
   - Triggers

### Step 3: Add SQL Function

1. Still in SQL Editor, run the SQL from `sql/increment_visit_count.sql`
2. This creates the function to increment visit counts

### Step 4: Get API Keys

1. Go to Project Settings → API
2. Copy these values:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` public key
   - `service_role` secret key

### Step 5: Configure Environment Variables

Create/update `.env.local` in the `gospel-admin` folder:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Keep these for now (migration needs them)
NETLIFY_BLOBS_TOKEN=your-existing-token
ADMIN_PASSWORD=your-existing-password
```

### Step 6: Run Migration Script

```bash
cd gospel-admin
npm run migrate-to-supabase
```

This will:
- ✅ Fetch all profiles from Netlify Blobs
- ✅ Upload them to Supabase
- ✅ Preserve all data (IDs, slugs, visit counts, etc.)
- ✅ Show progress and summary

### Step 7: Create First Admin User

1. Go to Authentication → Users in Supabase dashboard
2. Click "Add user" → "Create new user"
3. Enter:
   - Email: your-email@example.com
   - Password: (secure password)
   - Auto Confirm User: ✅ ON
4. Click "Create user"
5. Copy the User ID

### Step 8: Make User an Admin

1. Go to Table Editor → `user_profiles`
2. Find the row with your user ID
3. Edit the `role` column to `admin`
4. Save

### Step 9: Test Login

```bash
cd gospel-admin
npm run dev
```

1. Visit http://localhost:3000/login
2. Login with your admin credentials
3. You should be redirected to `/admin`
4. Try:
   - Viewing profiles
   - Creating a new profile
   - Going to `/admin/users` to see user management

### Step 10: Create a Counselor (Test Permissions)

1. As admin, go to Supabase dashboard → Authentication → Users
2. Create another user (counselor1@example.com)
3. Login as counselor
4. Verify:
   - ✅ Can create profiles
   - ✅ Can only see own profiles (not admin's profiles)
   - ✅ Can edit/delete own profiles
   - ❌ Cannot access `/admin/users`

### Step 11: Update Your Code (Switch from Netlify to Supabase)

Once migration is verified, update these files to use Supabase instead of Netlify Blobs:

**Files that need updates:**
- `src/app/api/profiles/route.ts` - Change import from `blob-data-service` to `supabase-data-service`
- `src/app/api/profiles/[slug]/route.ts` - Same change
- Any other files importing from `blob-data-service`

**Example change:**
```typescript
// OLD
import { getProfiles } from '@/lib/blob-data-service'

// NEW
import { getProfiles } from '@/lib/supabase-data-service'
```

### Step 12: Deploy to Vercel

1. Push all changes to GitHub
2. Connect your repo to Vercel (if not already)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
4. Deploy!

## 🔐 Security Checklist

After migration:
- [ ] Verify RLS policies are working (counselors can't see others' profiles)
- [ ] Test backup/restore functionality
- [ ] Remove old Netlify environment variables (once confirmed working)
- [ ] Update any documentation with new login process
- [ ] Inform your counselors about the new login system

## 🆘 Troubleshooting

**Migration script fails:**
- Check `.env.local` has correct Supabase credentials
- Verify SQL schema was run successfully
- Check Netlify Blobs is still accessible

**Can't login:**
- Verify user exists in Supabase Auth dashboard
- Check user is confirmed (Auto Confirm User was ON)
- Verify user_profiles table has entry with correct role

**RLS blocking admin:**
- Make sure `role` in `user_profiles` is exactly `'admin'` (not Admin or ADMIN)
- Check the RLS policies are enabled on the tables

**Counselor can see other profiles:**
- RLS policies might not be enabled
- Check the `created_by` field is set correctly on profiles

## 📞 Need Help?

If you run into any issues during migration, let me know at which step and I can help troubleshoot!

---

**Ready to migrate?** Start with Step 1: Create your Supabase project!
