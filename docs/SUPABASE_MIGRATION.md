# Supabase Migration Guide

Complete migration from Netlify Blobs + Simple Auth to Supabase with Multi-User Auth

## Overview

This migration adds:
- **Multi-user authentication** (replacing single password)
- **Two roles**: Admin (full access) and Counselor (own profiles only)
- **Row-Level Security**: Counselors can only see/edit their own profiles
- **Better data storage**: PostgreSQL instead of Blob storage
- **All existing features preserved**: Backup/restore still works the same

---

## Phase 1: Supabase Setup (30 minutes)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization (create one if needed)
4. Project details:
   - **Name**: gospel-presentation
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to you
   - **Pricing**: Free tier
5. Wait 2-3 minutes for provisioning

### Step 2: Get Credentials

In your Supabase project dashboard:
1. Go to **Settings** → **API**
2. Copy these values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_KEY` (keep secret!)

### Step 3: Add Environment Variables

Add to `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Keep existing for now (during migration)
ADMIN_PASSWORD=your-current-password
NETLIFY_TOKEN=your-netlify-token
NETLIFY_SITE_ID=your-site-id
```

---

## Phase 2: Database Schema (20 minutes)

### Step 1: Create Tables

Go to **SQL Editor** in Supabase dashboard and run:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'counselor');

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  visit_count INTEGER DEFAULT 0,
  gospel_data JSONB NOT NULL,
  last_viewed_scripture JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_visited TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9]+$'),
  CONSTRAINT slug_length CHECK (length(slug) >= 3 AND length(slug) <= 20)
);

-- User profiles (extends auth.users with role)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'counselor',
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_slug ON profiles(slug);
CREATE INDEX idx_profiles_created_by ON profiles(created_by);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Step 2: Enable Row-Level Security (RLS)

```sql
-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- PROFILES POLICIES

-- 1. SELECT: Admins see all, Counselors see only theirs + default
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  USING (
    -- Everyone can see default profile
    is_default = true
    OR
    -- Admins can see everything
    get_user_role(auth.uid()) = 'admin'
    OR
    -- Counselors can see their own profiles
    (get_user_role(auth.uid()) = 'counselor' AND created_by = auth.uid())
  );

-- 2. INSERT: Authenticated users can create profiles
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND
    -- Admins can create any profile
    (get_user_role(auth.uid()) = 'admin'
    OR
    -- Counselors can create profiles (will be owned by them)
    get_user_role(auth.uid()) = 'counselor')
  );

-- 3. UPDATE: Admins update all, Counselors update only theirs
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'admin'
    OR
    (get_user_role(auth.uid()) = 'counselor' AND created_by = auth.uid())
  );

-- 4. DELETE: Admins delete all, Counselors delete only theirs (except default)
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  USING (
    is_default = false
    AND
    (get_user_role(auth.uid()) = 'admin'
    OR
    (get_user_role(auth.uid()) = 'counselor' AND created_by = auth.uid()))
  );

-- USER_PROFILES POLICIES

-- 1. Users can view their own profile
CREATE POLICY "user_profiles_select_own"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- 2. Admins can view all user profiles
CREATE POLICY "user_profiles_select_admin"
  ON user_profiles FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- 3. Only admins can update user profiles
CREATE POLICY "user_profiles_update_admin"
  ON user_profiles FOR UPDATE
  USING (get_user_role(auth.uid()) = 'admin');

-- 4. Only admins can delete user profiles
CREATE POLICY "user_profiles_delete_admin"
  ON user_profiles FOR DELETE
  USING (get_user_role(auth.uid()) = 'admin');
```

### Step 3: Auto-create user_profile on signup

```sql
-- Trigger to create user_profile when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, role, display_name)
  VALUES (
    NEW.id,
    'counselor', -- Default role
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

## Phase 3: Install Dependencies (5 minutes)

```bash
cd gospel-admin
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

Update `package.json`:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    // ... existing dependencies
  }
}
```

---

## Phase 4: Create New Auth System (1-2 hours)

Will create these new files:
1. `src/lib/supabase/client.ts` - Supabase client
2. `src/lib/supabase/server.ts` - Server-side Supabase
3. `src/lib/supabase/database.types.ts` - TypeScript types
4. `src/lib/supabase-data-service.ts` - Replace blob-data-service
5. `src/middleware.ts` - Auth middleware
6. `src/app/login/page.tsx` - New login page
7. `src/app/admin/users/page.tsx` - User management (admins only)

---

## Phase 5: Migration Script (30 minutes)

Will create:
- `scripts/migrate-to-supabase.ts` - One-time migration of all profiles

---

## Phase 6: Testing & Cutover (1 hour)

1. Run migration script
2. Test admin login
3. Create test counselor user
4. Test counselor permissions
5. Test backup/restore
6. Verify RLS policies work
7. Switch environment variables
8. Deploy to Vercel

---

## Total Time Estimate: 4-6 hours

## Next Steps

Ready to proceed? I'll create all the necessary files for each phase.
