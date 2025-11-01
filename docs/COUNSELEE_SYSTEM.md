# Counselor/Counselee Role System Implementation Guide

## Overview
This update adds a comprehensive role-based access system for counselors and counselees:
- **Counselors** can create profiles and invite counselees (view-only users)
- **Counselees** receive email invitations and can view profiles they're granted access to
- **Admins** retain full access to all profiles
- Profile slugs are now **UUID-based** for security (no more guessable URLs)

## Database Changes

### 1. Run SQL Migration
Execute the following SQL file in your Supabase SQL Editor:
```
gospel-admin/sql/add_counselee_system.sql
```

This migration will:
- Add 'counselee' to the `user_role` enum
- Create the `profile_access` table to manage counselee access
- Update RLS policies for profile visibility based on access grants
- Create triggers to link user accounts when counselees sign up
- Set up proper permissions

### 2. New Database Table: `profile_access`
```sql
profile_access (
  id UUID PRIMARY KEY,
  profile_id UUID → references profiles(id),
  user_email TEXT → email of the counselee
  user_id UUID → populated when user signs up
  access_role TEXT → 'counselee' or 'counselor'
  granted_by UUID → user who granted access
  created_at TIMESTAMPTZ
)
```

## Code Changes

### Type System Updates

#### database.types.ts
- Added `'counselee'` to `UserRole` type
- Added `profile_access` table definition

#### types.ts
- Added `ProfileAccess` interface for access records
- Updated `GospelProfile` to include `accessList?: ProfileAccess[]`
- Updated `CreateProfileRequest` to include:
  - `slug?: string` (now optional, auto-generated if not provided)
  - `counseleeEmails?: string[]` (list of emails to invite)

### Service Layer Updates

#### profile-service.ts
- Added `generateSecureSlug()` function that creates UUID-based slugs
- Updated `validateCreateProfileRequest()` to auto-generate slugs
- Updated `createProfileFromRequest()` to use generated slugs

#### supabase-data-service.ts
- Modified `createProfile()` to:
  - Auto-generate secure UUID-based slugs
  - Grant access to counselee emails if provided
- Added new functions:
  - `grantProfileAccess(profileId, emails, grantedBy)` - Grants access to counselees
  - `revokeProfileAccess(profileId, email)` - Removes access
  - `getProfileAccessList(profileId)` - Lists users with access
  - `inviteCounseleeUsers(emails, profileId)` - Creates accounts for new users

## UI Changes

### Admin Dashboard (src/app/admin/page.tsx)
**Create Profile Form:**
- **Removed** manual URL/slug input field (now auto-generated)
- **Added** "Invite Counselees" section with:
  - Email input field
  - Add/Remove email buttons
  - List of invited emails
  - Validation for email format

## Access Control Logic

### Profile Visibility (RLS)
Profiles are visible to users based on these rules:
1. **Public:** Can view default profile (is_default = true)
2. **Admins:** Can view ALL profiles
3. **Counselors:** Can view profiles they created (created_by = their user_id)
4. **Counselees:** Can view profiles where they have a record in `profile_access`

### Profile Creation
1. Counselor creates a new profile
2. System generates a secure UUID-based slug (e.g., `a1b2c3d4`)
3. Profile is automatically owned by the counselor (created_by set)
4. If counselee emails are provided:
   - Records are created in `profile_access` table
   - System attempts to create auth accounts for new users
   - Invitations can be sent (future enhancement)

### Counselee Account Creation
When counselee emails are added:
1. System checks if user accounts already exist
2. For new emails, creates auth accounts with:
   - Temporary random password
   - `email_confirm = false` (requires email verification)
   - User metadata: `{ role: 'counselee' }`
3. When user signs up/confirms, trigger links their `user_id` in `profile_access`

## Security Features

### Secure Profile URLs
- **Old system:** Slugs based on titles (e.g., `/youthgroup` - guessable)
- **New system:** UUID-based slugs (e.g., `/a1b2c3d4` - unguessable)
- Makes profiles private unless shared explicitly

**Important:** Profile slugs use the first 8 characters of a UUID, stored in the `slug` column (separate from the `id` UUID). This design choice ensures:
- When a profile is deleted and restored from backup, it retains the same slug
- Access grants in `profile_access` table reference `profile_id` (the UUID), not the slug
- Backups include both the profile and its access grants, maintaining the relationship

### Backup/Restore Considerations

#### Why Slugs are Separate from UUIDs
The `profiles` table has:
- `id` (UUID) - Primary key that identifies the profile uniquely
- `slug` (TEXT) - The URL-friendly identifier (8-char random string)

This separation is important for backup/restore:
1. **Profile deleted** → `profile_access` records cascade delete
2. **Profile restored from backup** → Both `id` and `slug` are restored with original values
3. **Access records restored** → `profile_access` records reference the same `profile_id` (UUID)
4. **Result:** Counselees retain their access without manual re-granting

#### Backup Strategy
All backups now include three tables:
1. `profiles` - The gospel presentation profiles
2. `user_profiles` - User account info and roles
3. `profile_access` - Counselee access grants (**new**)

Scripts updated:
- `scripts/backup-database.js` - Now backs up `profile_access`
- `scripts/restore-backup.js` - Now restores `profile_access`
- `.github/workflows/backup-database.yml` - Automated backups include access grants

**Best Practice:** Always backup and restore all three tables together to maintain access consistency.

### Row Level Security (RLS)
All access is enforced at the database level via RLS policies:
- Counselors can only grant/revoke access to profiles they own
- Counselees can only view profiles they're granted access to
- Admins can manage all access records

## Next Steps (TODO)

### High Priority
1. **Run the SQL migration** in Supabase
2. **Test profile creation** with counselee emails
3. **Profile Settings Page:** Add UI to manage counselees on existing profiles
   - View list of counselees
   - Add new counselees
   - Remove counselees
4. **Counselee Login Flow:** Update login redirect logic
   - Counselees should see only their accessible profiles
   - Show View/Share buttons only (no Edit)

### Medium Priority
5. **Email Invitations:** Implement email sending for counselee invites
   - Use Supabase Auth email templates
   - Include profile link in invitation
6. **Profile Sharing:** Add "Share" button to copy profile link
7. **Access History:** Track when counselees view profiles

### Low Priority
8. **Bulk Import:** CSV upload for multiple counselee emails
9. **Access Expiration:** Optional expiry dates for counselee access
10. **Access Analytics:** View counselee activity on profiles

## Testing Checklist

- [ ] Run SQL migration successfully
- [ ] Create new profile as counselor without slug (auto-generated)
- [ ] Create profile with counselee emails (verify access records created)
- [ ] Verify counselee can't see other profiles
- [ ] Verify admin can see all profiles
- [ ] Test slug uniqueness and security
- [ ] Test email validation in UI
- [ ] Verify RLS policies work correctly

## API Changes

### POST /api/profiles (Create Profile)
**Request body changes:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "slug": "string (optional, auto-generated)",
  "cloneFromSlug": "string (default: 'default')",
  "isTemplate": "boolean (admin only)",
  "counseleeEmails": ["email1@example.com", "email2@example.com"]
}
```

## Migration Guide

### For Existing Profiles
Existing profiles with name-based slugs will continue to work. New profiles will use UUID-based slugs.

To migrate existing profiles to secure slugs (optional):
1. Create a script to generate new UUIDs for each profile
2. Update profile records with new slugs
3. Set up redirects from old slugs to new slugs (optional)

## Troubleshooting

### Counselee can't access profile
1. Check `profile_access` table for record
2. Verify email matches user's auth email exactly
3. Check RLS policies are enabled

### Can't create new profiles
1. Verify user has counselor or admin role in `user_profiles`
2. Check browser console for errors
3. Verify Supabase service role key is configured

### Emails not being sent
1. Configure Supabase Auth email templates
2. Check Supabase email provider settings
3. Verify SMTP configuration

## Files Changed

### New Files
- `/sql/add_counselee_system.sql` - Database migration

### Modified Files
- `/src/lib/supabase/database.types.ts` - Added counselee role and profile_access table
- `/src/lib/types.ts` - Added ProfileAccess interface, updated CreateProfileRequest
- `/src/lib/profile-service.ts` - Added generateSecureSlug(), updated validation
- `/src/lib/supabase-data-service.ts` - Added access management functions
- `/src/app/admin/page.tsx` - Removed slug input, added counselee email UI

## Notes

- Profile slugs are now 8 characters (first segment of UUID)
- Counselee accounts are created automatically when emails are added
- Users receive email confirmation link (Supabase Auth handles this)
- Access can be granted before or after user signs up
- When user signs up, their user_id is automatically linked to pending access records
