# Supabase Migration - Next Steps

## Current Status

✅ **Completed:**
- Migration documentation created (`docs/SUPABASE_MIGRATION.md`)
- Database type definitions (`src/lib/supabase/database.types.ts`)
- Supabase client helpers (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`)
- Data service replacement (`src/lib/supabase-data-service.ts`)
- Migration script (`scripts/migrate-to-supabase.ts`)

⚠️ **Needs Fixing:**
- Install required npm packages
- Fix TypeScript errors
- Create remaining files

## Step 1: Install Required Packages

```bash
cd gospel-admin
npm install @supabase/supabase-js @supabase/ssr dotenv
npm install --save-dev @types/node
```

## Step 2: Fix TypeScript Errors

After installing packages, fix the implicit `any` type in `src/lib/supabase-data-service.ts` line 46:

```typescript
// Change this:
.map((row) => ({

// To this:
.map((row: Database['public']['Tables']['profiles']['Row']) => ({
```

Also fix in `scripts/migrate-to-supabase.ts` line 53:

```typescript
// Change this:
const existingSlugs = new Set(existingProfiles?.map(p => p.slug) || [])

// To this:
const existingSlugs = new Set(existingProfiles?.map((p: any) => p.slug) || [])
```

## Step 3: Create Login Page

File: `src/app/login/page.tsx`
- Email/password login form
- Error handling
- Redirect after successful login
- Link to password reset

## Step 4: Create Auth Middleware

File: `src/middleware.ts`
- Protect `/admin` routes
- Redirect unauthenticated users to `/login`
- Allow public routes

## Step 5: Create User Management Page

File: `src/app/admin/users/page.tsx`
- List all users (admin only)
- Change user roles
- Invite new users
- Deactivate users

## Step 6: Update API Routes

Update these files to use `supabase-data-service` instead of `blob-data-service`:
- `src/app/api/profiles/route.ts`
- `src/app/api/profiles/[slug]/route.ts`

## Step 7: Create SQL Function

In your Supabase SQL editor, create the increment function:

```sql
CREATE OR REPLACE FUNCTION increment_visit_count(profile_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles 
  SET 
    visit_count = visit_count + 1,
    last_visited = NOW(),
    updated_at = NOW()
  WHERE slug = profile_slug;
END;
$$;
```

## Step 8: Setup Supabase Project

1. Go to https://supabase.com
2. Create new project
3. Run the SQL schema from `docs/SUPABASE_MIGRATION.md`
4. Add environment variables to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   ```

## Step 9: Run Migration

```bash
npm run migrate-to-supabase
```

## Step 10: Create First Admin User

1. Go to Supabase Auth dashboard
2. Create a new user manually
3. Note their user ID
4. In SQL Editor, run:
   ```sql
   UPDATE user_profiles 
   SET role = 'admin' 
   WHERE id = 'user-id-here';
   ```

## Step 11: Test Everything

- [ ] Login works
- [ ] Admin can see all profiles
- [ ] Admin can create profiles
- [ ] Counselor can only see own profiles
- [ ] Counselor cannot see other counselors' profiles
- [ ] Backup/restore still works
- [ ] All tests pass

## Step 12: Deploy

1. Update environment variables in Vercel
2. Deploy to production
3. Test on live site

---

**Need help with any step?** Let me know and I can create the remaining files or help troubleshoot!
