# COMA Templates RLS Policy Fix

## Issue
The COMA method instructions modal was not rendering text for counselees because the `coma_templates` table had RLS policies that only allowed authenticated admin users to read the templates.

## Solution
Updated RLS policies to allow public read access to COMA templates while restricting write operations to admins only.

## Migration Required
Run the following SQL in Supabase to fix the RLS policies:

```sql
-- See: sql/fix_coma_templates_rls.sql
```

Or execute directly in Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Run the contents of `sql/fix_coma_templates_rls.sql`

## Changes Made

### Database (sql/fix_coma_templates_rls.sql)
- Dropped the overly restrictive "Admins can manage COMA templates" policy
- Created new policy "Anyone can read COMA templates" for SELECT operations (public access)
- Re-created "Admins can manage COMA templates" policy for INSERT, UPDATE, DELETE operations (admin only)

### Frontend (src/components/ComaModal.tsx)
- Improved error handling and user-friendly messages
- Added automatic conversion of plain text to HTML formatting
- Better handling of empty/missing instructions
- Added logging for debugging RLS issues

## Testing
After running the migration:
1. Open the gospel presentation as a counselee (unauthenticated user)
2. Click on a COMA button in the content
3. Verify that the instructions modal displays the content correctly

## Date
November 4, 2025
