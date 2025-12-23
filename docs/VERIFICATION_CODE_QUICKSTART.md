# Quick Start: Email Verification Code Authentication

This guide walks you through setting up email-based verification code authentication in under 30 minutes.

## Prerequisites Checklist

- [ ] Supabase project created
- [ ] Azure AD/O365 account with admin access
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Database access (Supabase dashboard or psql)

---

## Step 1: Run Database Migration (5 minutes)

### Option A: Via Supabase Dashboard
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy contents from `gospel-admin/sql/migrations/20251223_create_verification_codes.sql`
6. Click **Run**
7. Verify success message

### Option B: Via Command Line
```bash
psql $DATABASE_URL -f gospel-admin/sql/migrations/20251223_create_verification_codes.sql
```

**Verification:**
```sql
-- Check tables exist
SELECT * FROM verification_codes LIMIT 0;
SELECT verification_code_length FROM admin_settings WHERE id = 1;
```

---

## Step 2: Configure Microsoft Graph API (10 minutes)

### 2.1 Register App in Azure

1. Go to https://portal.azure.com
2. Navigate: **Azure Active Directory** → **App registrations** → **New registration**
3. Enter name: `Gospel Presentation Email`
4. Select: **Accounts in this organizational directory only**
5. Click **Register**

### 2.2 Grant Permissions

1. In app: **API permissions** → **Add a permission**
2. Choose: **Microsoft Graph** → **Application permissions**
3. Search and add: `Mail.Send`
4. Click **Grant admin consent for [Your Org]**
5. Verify status shows green checkmark

### 2.3 Create Secret

1. Go to: **Certificates & secrets** → **New client secret**
2. Description: `Edge Functions`
3. Expires: `24 months`
4. Click **Add**
5. **Copy the Value immediately** (you can't view it again!)

### 2.4 Copy Credentials

You need three values:

1. **Tenant ID**: Azure AD → Overview → Tenant ID
2. **Client ID**: Your app → Overview → Application (client) ID  
3. **Client Secret**: The value you just copied

---

## Step 3: Deploy Edge Functions (10 minutes)

### 3.1 Login & Link

```bash
# Login to Supabase
supabase login

# Link to your project (get ref from dashboard URL)
cd /path/to/gospel_presentation
supabase link --project-ref your-project-ref-here
```

### 3.2 Set Secrets

Replace placeholders with your actual values:

```bash
# Microsoft Graph credentials from Step 2
supabase secrets set MICROSOFT_GRAPH_TENANT_ID="12345678-1234-1234-1234-123456789abc"
supabase secrets set MICROSOFT_GRAPH_CLIENT_ID="87654321-4321-4321-4321-cba987654321"
supabase secrets set MICROSOFT_GRAPH_CLIENT_SECRET="your~secret~value~here"

# Email configuration (must be valid O365 mailbox)
supabase secrets set EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
supabase secrets set EMAIL_FROM_NAME="Gospel Presentation"

# App settings
supabase secrets set APP_NAME="Gospel Presentation"
supabase secrets set APP_URL="https://yourdomain.com"
```

### 3.3 Deploy Functions

```bash
supabase functions deploy send-email
supabase functions deploy send-verification-code
supabase functions deploy verify-code
```

**Verification:**
```bash
supabase functions list
# Should show all three functions with "deployed" status
```

---

## Step 4: Enable Feature (2 minutes)

1. Log in to your app as **admin**
2. Navigate to: `/admin/settings`
3. Toggle **Enable Verification Code Login** to **ON**
4. Configure settings:
   - Code Length: `6 digits` (recommended)
   - Expiry Time: `15 minutes` (recommended)
5. Click **Save Changes**

---

## Step 5: Test (3 minutes)

### 5.1 Test Send Code

1. Navigate to `/login-code`
2. Enter your email address
3. Click "Send Verification Code"
4. Check your email inbox (and spam folder)

**Expected:** Email arrives within 30 seconds with 6-digit code

### 5.2 Test Valid Code

1. Copy code from email
2. Enter in the code input field
3. Should auto-submit when complete

**Expected:** Redirected to appropriate page based on your role

### 5.3 Test Expiration

1. Request new code
2. Wait for expiration (or change expiry to 5 minutes in settings)
3. Try to use expired code

**Expected:** Error message "This code has expired"

### 5.4 Test Resend

1. Request code
2. Click "Resend Code"
3. Check email for new code

**Expected:** New email received, old code no longer works

---

## Common Issues & Quick Fixes

### "Failed to send verification email"

**Fix:** Check secrets are set correctly
```bash
supabase secrets list
# Verify all 6 secrets are present
```

### "Verification code login is currently disabled"

**Fix:** Enable in admin settings
- Go to `/admin/settings`
- Toggle to ON
- Save

### Email not received

**Fixes:**
1. Check spam/junk folder
2. Verify `EMAIL_FROM_ADDRESS` is valid O365 mailbox
3. Check Edge Function logs:
   ```bash
   supabase functions logs send-email --tail
   ```

### "Invalid verification code"

**Fixes:**
1. Double-check code entry (no spaces)
2. Check if code expired (timer shows 00:00)
3. Request new code

---

## Quick Reference

### URLs
- Login page: `/login-code`
- Admin settings: `/admin/settings`
- Magic link (existing): `/login`

### Edge Functions
- `send-email` - Microsoft Graph email delivery
- `send-verification-code` - Generate and send codes
- `verify-code` - Validate codes and create sessions

### Database Tables
- `verification_codes` - Active verification codes
- `admin_settings` - Configuration (row id=1)

### Useful Commands

```bash
# View function logs
supabase functions logs send-verification-code --tail

# Update a secret
supabase secrets set SECRET_NAME="new-value"

# Redeploy a function
supabase functions deploy function-name

# Cleanup old codes
psql $DATABASE_URL -c "SELECT cleanup_expired_verification_codes();"
```

---

## Next Steps

- ✅ **Done!** Verification code login is now active
- 📧 Add link to `/login-code` in your login page
- 🔐 Review [full documentation](./VERIFICATION_CODE_AUTH.md) for security best practices
- 📊 Set up monitoring for email delivery
- ⏰ Schedule daily cleanup job for expired codes
- 🔄 Configure rate limiting (recommended for production)

---

## Support

For detailed information, see [VERIFICATION_CODE_AUTH.md](./VERIFICATION_CODE_AUTH.md)

Having issues? Check:
1. Supabase project logs (Dashboard → Logs)
2. Edge Function logs (`supabase functions logs`)
3. Browser console (F12)
4. Email delivery logs in Azure portal
