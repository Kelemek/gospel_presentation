# Deployment Checklist: Email Verification Code Authentication

Use this checklist to ensure all components are properly deployed and configured.

## ✅ Pre-Deployment Checklist

### Database
- [ ] Backup existing database before migration
- [ ] Run migration: `20251223_create_verification_codes.sql`
- [ ] Run migration: `20260514_admin_only_staff_remove_profile_assignment.sql` (admin-only staff; clears legacy `profile_access` rows; adjust roles/policies per file comments)
- [ ] Optional: run migration `20260516_drop_profile_access_table.sql` after deploying app/Edge changes that remove `profile_access` (drops table, auth trigger, and excludes it from `get_backup_tables()`)
- [ ] Optional: run migration `20260515_drop_bible_verses_table.sql` only if you are removing the unused bulk-verse table (app scripture uses API.Bible + `scripture_cache`; backup verse data first if needed)
- [ ] Verify `verification_codes` table exists
- [ ] Verify `admin_settings` has new columns:
  - `verification_code_length`
  - `verification_code_expiry_minutes`
  - `enable_verification_code_login`
- [ ] Test cleanup function: `SELECT cleanup_expired_verification_codes();`

### Azure AD / Microsoft Graph API
- [ ] Register application in Azure AD
- [ ] Grant `Mail.Send` application permission
- [ ] Admin consent granted (green checkmark)
- [ ] Client secret created and saved securely
- [ ] Tenant ID copied
- [ ] Application (client) ID copied
- [ ] Verified sender email address (`EMAIL_FROM_ADDRESS`) is valid O365 mailbox

### Supabase Edge Functions
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Logged in: `supabase login`
- [ ] Project linked: `supabase link --project-ref YOUR_REF`
- [ ] Secrets configured (see section below)
- [ ] Functions deployed:
  - [ ] `send-email`
  - [ ] `send-verification-code`
  - [ ] `verify-code`
- [ ] Function deployment verified: `supabase functions list`

### Environment Secrets

Run each command and verify success:

```bash
# Microsoft Graph credentials
supabase secrets set MICROSOFT_GRAPH_TENANT_ID="..."
supabase secrets set MICROSOFT_GRAPH_CLIENT_ID="..."
supabase secrets set MICROSOFT_GRAPH_CLIENT_SECRET="..."

# Email configuration
supabase secrets set EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
supabase secrets set EMAIL_FROM_NAME="Gospel Presentation"

# Application settings
supabase secrets set APP_NAME="Gospel Presentation"
supabase secrets set APP_URL="https://yourdomain.com"
```

Verify all secrets:
```bash
supabase secrets list
```

Expected output: 7 secrets listed

### Next.js Application
- [ ] Files committed to git:
  - [ ] `gospel-admin/src/components/VerificationCodeInput.tsx`
  - [ ] `gospel-admin/src/app/login-code/page.tsx`
  - [ ] `gospel-admin/src/app/api/auth/send-code/route.ts`
  - [ ] `gospel-admin/src/app/api/auth/verify-code/route.ts`
  - [ ] `gospel-admin/src/app/admin/settings/page.tsx`
- [ ] Supabase directory committed:
  - [ ] `supabase/functions/send-email/index.ts`
  - [ ] `supabase/functions/send-verification-code/index.ts`
  - [ ] `supabase/functions/verify-code/index.ts`
  - [ ] `supabase/deno.json`
  - [ ] `supabase/.env.example`
- [ ] Migration file committed:
  - [ ] `gospel-admin/sql/migrations/20251223_create_verification_codes.sql`
- [ ] Documentation committed:
  - [ ] `docs/VERIFICATION_CODE_AUTH.md`
  - [ ] `docs/VERIFICATION_CODE_QUICKSTART.md`
  - [ ] `README.md` updated

### Deployment
- [ ] Code pushed to git repository
- [ ] Vercel/hosting deployment triggered
- [ ] Build completed successfully
- [ ] No TypeScript errors
- [ ] Environment variables set in hosting platform (if needed)

---

## ✅ Post-Deployment Testing

### Test 1: Enable Feature
- [ ] Log in as admin
- [ ] Navigate to `/admin/settings`
- [ ] Page loads without errors
- [ ] Toggle "Enable Verification Code Login" to ON
- [ ] Select code length: 6 digits
- [ ] Select expiry: 15 minutes
- [ ] Click "Save Changes"
- [ ] Success message appears
- [ ] Reload page - settings persist

### Test 2: Send Verification Code
- [ ] Navigate to `/login-code`
- [ ] Page loads correctly
- [ ] Enter valid user email
- [ ] Click "Send Verification Code"
- [ ] No errors in browser console
- [ ] Success message: "Verification code sent to..."
- [ ] UI switches to code entry step
- [ ] Email received within 60 seconds
  - [ ] Check inbox
  - [ ] Check spam/junk folder
- [ ] Email formatting looks professional
- [ ] Code is clearly displayed (6 digits)
- [ ] Expiration time is shown (15 minutes)

### Test 3: Valid Code Entry
- [ ] Copy code from email
- [ ] Paste into input field (auto-focus works)
- [ ] Code auto-submits when complete
- [ ] Loading spinner appears
- [ ] Success message: "Login successful! Redirecting..."
- [ ] Redirect occurs within 1-2 seconds
- [ ] Correct page based on role:
  - Admin/Counselor → `/admin/dashboard`
  - Counselee → `/profile`
- [ ] Session is established (check browser cookies)

### Test 4: Invalid Code
- [ ] Request new code
- [ ] Enter wrong code (e.g., 999999)
- [ ] Click verify or auto-submit
- [ ] Error message: "Invalid verification code"
- [ ] Code input clears
- [ ] Can try again

### Test 5: Expired Code
- [ ] Change expiry to 5 minutes in admin settings
- [ ] Request new code
- [ ] Wait 5+ minutes
- [ ] Try to use expired code
- [ ] Error message: "This code has expired"
- [ ] Timer shows "Code expired"

### Test 6: Resend Code
- [ ] Request code
- [ ] Click "Resend Code" button
- [ ] New code sent (different from first)
- [ ] First code no longer works
- [ ] Second code works correctly

### Test 7: Code Already Used
- [ ] Request code
- [ ] Use code successfully to log in
- [ ] Log out
- [ ] Try to use same code again
- [ ] Error message: "This code has already been used"

### Test 8: Non-existent User
- [ ] Try email not in database
- [ ] Error message: "This email is not authorized to access the system"
- [ ] No code sent

### Test 9: Feature Disabled
- [ ] Go to `/admin/settings`
- [ ] Toggle "Enable Verification Code Login" to OFF
- [ ] Save changes
- [ ] Navigate to `/login-code`
- [ ] Try to send code
- [ ] Error message: "Verification code login is currently disabled"

### Test 10: Edge Function Logs
- [ ] Check logs for errors:
  ```bash
  supabase functions logs send-email --tail
  supabase functions logs send-verification-code --tail
  supabase functions logs verify-code --tail
  ```
- [ ] No unexpected errors
- [ ] Successful operations logged

---

## ✅ Monitoring Setup (Optional but Recommended)

### Database Cleanup
- [x] Schedule daily cleanup job (implemented via GitHub Action)
  - Workflow: `.github/workflows/cleanup-verification-codes.yml`
  - Runs daily at 3 AM UTC and on manual `workflow_dispatch`
  - Calls `cleanup_expired_verification_codes()` via Supabase RPC
  - Only removes codes expired/used **more than 24 hours ago** (audit retention)
  - Optional: Run `gospel-admin/sql/migrations/20250301_cleanup_return_count.sql` so the workflow logs the deleted row count

### Usage Monitoring
- [ ] Set up query to track usage:
  ```sql
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as codes_sent,
    COUNT(used_at) as codes_used,
    AVG(EXTRACT(EPOCH FROM (used_at - created_at))) as avg_time_to_use
  FROM verification_codes
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
  ```

### Rate Limiting (Recommended for Production)
- [ ] Configure Supabase Rate Limiting
- [ ] Or use Cloudflare rate limiting
- [ ] Limit: 5 requests per email per hour suggested

### Email Delivery Monitoring
- [ ] Monitor Microsoft Graph API quota usage
- [ ] Set up alerts for delivery failures
- [ ] Monitor Edge Function error rates in Supabase

---

## ✅ Rollback Plan (If Needed)

If issues occur, rollback steps:

### 1. Disable Feature
```sql
UPDATE admin_settings SET enable_verification_code_login = false WHERE id = 1;
```

### 2. Rollback Database (if needed)
```sql
-- Remove verification codes table
DROP TABLE IF EXISTS verification_codes CASCADE;

-- Remove admin_settings columns
ALTER TABLE admin_settings 
DROP COLUMN IF EXISTS verification_code_length,
DROP COLUMN IF EXISTS verification_code_expiry_minutes,
DROP COLUMN IF EXISTS enable_verification_code_login;
```

### 3. Undeploy Edge Functions (optional)
```bash
supabase functions delete send-email
supabase functions delete send-verification-code
supabase functions delete verify-code
```

### 4. Revert Code Changes
```bash
git revert <commit-hash>
git push
```

Magic link authentication remains unaffected throughout.

---

## ✅ Success Criteria

All of the following should be true:

- ✅ Database migration completed without errors
- ✅ All 3 Edge Functions deployed and accessible
- ✅ All 7 secrets configured correctly
- ✅ Feature can be enabled in admin settings
- ✅ Emails are delivered successfully
- ✅ Valid codes authenticate users correctly
- ✅ Invalid/expired/used codes show proper errors
- ✅ Magic link authentication still works (unaffected)
- ✅ No TypeScript compilation errors
- ✅ No runtime errors in browser console
- ✅ Documentation accessible and accurate

---

## 📞 Support

If any checklist item fails:

1. **Check logs:**
   - Browser console (F12)
   - Supabase project logs
   - Edge Function logs (`supabase functions logs`)

2. **Review documentation:**
   - [VERIFICATION_CODE_AUTH.md](./VERIFICATION_CODE_AUTH.md)
   - [VERIFICATION_CODE_QUICKSTART.md](./VERIFICATION_CODE_QUICKSTART.md)

3. **Common issues:**
   - Email not received → Check spam, verify O365 mailbox
   - Invalid credentials → Verify Azure AD secrets
   - Database errors → Check migration ran successfully

4. **Contact:**
   - System administrator
   - Review GitHub issues (if open source)

---

## 📝 Sign-off

**Deployed by:** ___________________  
**Date:** ___________________  
**Environment:** [ ] Development [ ] Staging [ ] Production  
**All tests passed:** [ ] Yes [ ] No  
**Notes:** ___________________________________________
