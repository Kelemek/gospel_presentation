# Counselor User Dropdown Access

## Problem
Counselors need to see all users in the "Select existing user..." dropdown when creating new profiles, but currently they can only see their own user account due to RLS policies on the `user_profiles` table.

## Solution

### Database Changes Required
Run the SQL script in Supabase SQL Editor:
```sql
-- File: sql/allow_counselors_view_all_users.sql
```

This adds a new RLS policy that allows counselors to SELECT from the `user_profiles` table to see all user accounts.

### Important Security Note
This change is **safe** because:

1. **Two Different Tables:**
   - `user_profiles` = User accounts/authentication (email, role)
   - `profiles` = Gospel presentation content profiles

2. **Separate RLS Policies:**
   - The new policy only affects `user_profiles` (user accounts for dropdown)
   - The existing policies on `profiles` still restrict counselors to only see:
     - Their own profiles (`created_by = auth.uid()`)
     - The default profile (`is_default = true`)
     - Template profiles (`is_template = true`)
     - Profiles they've been granted access to (via `profile_access` table)

3. **What Counselors CAN See:**
   - ✅ All user emails/accounts in the dropdown (for assigning to profiles)
   - ✅ Their own gospel presentation profiles
   - ✅ Template profiles (read-only)
   - ✅ Default profile
   - ✅ Profiles they've been granted access to

4. **What Counselors CANNOT See:**
   - ❌ Other counselors' or admins' gospel presentation profiles (unless explicitly granted access)

## Testing
Tests have been created in:
- `src/app/admin/__tests__/page.counselor-user-visibility.test.ts`

All 6 tests pass, verifying:
- Counselors can see all users in the dropdown
- Counselors cannot see all profiles (only their own + templates + default)
- Admins can see all users and all profiles
- Counselees can only see their own user account

## Implementation Steps
1. ✅ Created SQL migration: `sql/allow_counselors_view_all_users.sql`
2. ✅ Created tests: `src/app/admin/__tests__/page.counselor-user-visibility.test.ts`
3. ⏳ **TODO: Run the SQL script in Supabase SQL Editor**
4. ⏳ **TODO: Verify in production that counselors can now see all users in dropdown**

## To Apply This Change
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `sql/allow_counselors_view_all_users.sql`
3. Execute the script
4. Verify the policy was created by checking the output
