# Email Verification Code Authentication

This document describes the email-based verification code authentication system, which provides an alternative to magic link authentication using numeric codes sent via email.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Configuration](#configuration)
5. [User Flow](#user-flow)
6. [API Reference](#api-reference)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Verification Code Authentication?

Verification code authentication allows users to log in by entering a numeric code (4-8 digits) sent to their email address. This is an alternative to the existing magic link system and can be more user-friendly for users who:

- Have email clients that don't easily support clicking links
- Prefer typing a short code
- Are on mobile devices where switching between apps is inconvenient

### Key Features

- ✅ Configurable code length (4, 6, or 8 digits)
- ✅ Configurable expiry time (5-60 minutes)
- ✅ Email delivery via Microsoft Graph API (O365)
- ✅ Real-time expiration countdown
- ✅ Code validation and anti-reuse protection
- ✅ Admin toggle to enable/disable
- ✅ Runs in parallel with existing magic link authentication

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│  /login-code page                                            │
│  VerificationCodeInput component                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    API Routes Layer                          │
├─────────────────────────────────────────────────────────────┤
│  /api/auth/send-code       POST - Request verification code │
│  /api/auth/verify-code     POST - Validate code & login     │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Supabase Edge Functions Layer                   │
├─────────────────────────────────────────────────────────────┤
│  send-verification-code    Generate & store code            │
│  verify-code               Validate & create session        │
│  send-email                Microsoft Graph email delivery   │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Database Layer                            │
├─────────────────────────────────────────────────────────────┤
│  verification_codes table  Store active codes               │
│  admin_settings table      Configuration settings           │
│  user_profiles table       User authentication data         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Request Code**
   - User enters email at `/login-code`
   - API route calls `send-verification-code` Edge Function
   - Edge Function generates random code, stores in DB
   - Edge Function calls `send-email` to deliver code
   - User receives email with code

2. **Verify Code**
   - User enters code in UI
   - API route calls `verify-code` Edge Function
   - Edge Function validates code (exists, not expired, not used)
   - Edge Function marks code as used
   - Edge Function creates Supabase Auth session
   - User is redirected to appropriate page

---

## Setup Instructions

### Prerequisites

- Supabase project with PostgreSQL database
- Azure AD account with O365/Microsoft Graph API access
- Node.js 18+ and npm/yarn
- Supabase CLI installed

### Step 1: Database Migration

Run the SQL migration to create required tables and columns:

```bash
psql $DATABASE_URL -f gospel-admin/sql/migrations/20251223_create_verification_codes.sql
```

Or use Supabase dashboard:
1. Go to SQL Editor
2. Create new query
3. Paste contents of `20251223_create_verification_codes.sql`
4. Run query

This creates:
- `verification_codes` table with indexes and RLS policies
- New columns in `admin_settings`: `verification_code_length`, `verification_code_expiry_minutes`, `enable_verification_code_login`
- Cleanup function for expired codes

### Step 2: Configure Microsoft Graph API

#### 2.1 Register Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Enter application name (e.g., "Gospel Presentation Email Service")
5. Select **Accounts in this organizational directory only**
6. Leave Redirect URI blank
7. Click **Register**

#### 2.2 Grant API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph** > **Application permissions**
4. Search for and add: **Mail.Send**
5. Click **Grant admin consent** (requires admin role)

#### 2.3 Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description (e.g., "Edge Functions")
4. Select expiration (recommend 24 months)
5. Click **Add**
6. **IMPORTANT:** Copy the secret value immediately (you cannot view it again)

#### 2.4 Get Tenant ID

1. Go to **Azure Active Directory** > **Overview**
2. Copy the **Tenant ID** (UUID format)

You now have three credentials needed:
- Tenant ID
- Application (client) ID
- Client secret

### Step 3: Deploy Edge Functions

#### 3.1 Install Supabase CLI

```bash
npm install -g supabase
```

#### 3.2 Login to Supabase

```bash
supabase login
```

#### 3.3 Link Project

```bash
cd /path/to/gospel_presentation
supabase link --project-ref YOUR_PROJECT_REF
```

#### 3.4 Set Environment Secrets

```bash
# Microsoft Graph API credentials
supabase secrets set MICROSOFT_GRAPH_TENANT_ID="your-tenant-id-here"
supabase secrets set MICROSOFT_GRAPH_CLIENT_ID="your-client-id-here"
supabase secrets set MICROSOFT_GRAPH_CLIENT_SECRET="your-client-secret-here"

# Email configuration
supabase secrets set EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
supabase secrets set EMAIL_FROM_NAME="Gospel Presentation"

# Application settings
supabase secrets set APP_NAME="Gospel Presentation"
supabase secrets set APP_URL="https://yourdomain.com"
```

**Important:** `EMAIL_FROM_ADDRESS` must be a valid mailbox in your O365 tenant.

#### 3.5 Deploy Functions

```bash
# Deploy all Edge Functions
supabase functions deploy send-email
supabase functions deploy send-verification-code
supabase functions deploy verify-code
```

Verify deployment:
```bash
supabase functions list
```

### Step 4: Enable in Admin Settings

1. Log in as admin
2. Navigate to `/admin/settings`
3. Toggle **Enable Verification Code Login** to ON
4. Configure code length and expiry time (defaults: 6 digits, 15 minutes)
5. Click **Save Changes**

### Step 5: Test the System

1. Navigate to `/login-code`
2. Enter a valid user email
3. Check email for verification code
4. Enter code and verify login works
5. Test expiration by waiting for code to expire
6. Test resend functionality

---

## Configuration

### Admin Settings

Accessible at `/admin/settings`:

| Setting | Description | Options | Default |
|---------|-------------|---------|---------|
| Enable Verification Code Login | Master toggle for the feature | ON/OFF | OFF |
| Verification Code Length | Number of digits in code | 4, 6, 8 | 6 |
| Code Expiry Time | Minutes before code expires | 5, 10, 15, 30, 60 | 15 |

### Environment Variables

Set in Supabase Edge Functions secrets:

| Variable | Required | Description |
|----------|----------|-------------|
| `MICROSOFT_GRAPH_TENANT_ID` | ✅ Yes | Azure AD tenant ID |
| `MICROSOFT_GRAPH_CLIENT_ID` | ✅ Yes | Azure app registration client ID |
| `MICROSOFT_GRAPH_CLIENT_SECRET` | ✅ Yes | Azure app client secret |
| `EMAIL_FROM_ADDRESS` | ✅ Yes | Sender email (must be valid O365 mailbox) |
| `EMAIL_FROM_NAME` | No | Sender display name |
| `APP_NAME` | No | Application name shown in emails |
| `APP_URL` | No | Application URL for links |

### Database Configuration

The `admin_settings` table stores configuration:

```sql
SELECT 
  verification_code_length,
  verification_code_expiry_minutes,
  enable_verification_code_login
FROM admin_settings 
WHERE id = 1;
```

---

## User Flow

### Step-by-Step User Experience

#### Step 1: Navigate to Login

User visits `/login-code` (separate from magic link `/login`)

#### Step 2: Enter Email

- Input email address
- Click "Send Verification Code"
- System validates user exists in database
- System checks if verification code login is enabled

#### Step 3: Receive Code

- Email sent via Microsoft Graph API
- Professional HTML template with:
  - Large, easy-to-read code display
  - Expiration countdown
  - Security warnings

#### Step 4: Enter Code

- Visual digit display (6 separate boxes)
- Real-time expiration timer
- Auto-focus and paste support
- Validation on each digit

#### Step 5: Validation

- Code checked for:
  - Existence in database
  - Expiration status
  - Previous use
- If valid, session created and user redirected
- If invalid, clear error message displayed

#### Step 6: Redirect

User redirected after successful verification:
- **`admin`:** `/admin/dashboard`
- **Any other role:** `/admin` (non-admins should not rely on staff tools; prefer promoting accounts to `admin` in Supabase when they are ministry staff)

---

## API Reference

### POST /api/auth/send-code

Request a verification code to be sent via email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "actionType": "user_login",
  "actionData": {}
}
```

`actionType` is optional; typical values include `user_login` and `admin_login` (and other strings your Edge Function recognizes).

**Response (Success):**
```json
{
  "success": true,
  "codeId": "uuid-here",
  "expiresAt": "2025-01-23T10:30:00.000Z"
}
```

**Response (Error):**
```json
{
  "error": "Error message",
  "details": "Additional details"
}
```

**Status Codes:**
- `200` - Code sent successfully
- `400` - Invalid request (bad email, user not found)
- `403` - Feature disabled
- `500` - Server error

---

### POST /api/auth/verify-code

Verify a code and create authentication session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "actionType": "user_login"  // Optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "redirectUrl": "/admin/dashboard"
}
```

**Response (Invalid Code):**
```json
{
  "success": false,
  "valid": false,
  "error": "Invalid verification code",
  "errorCode": "INVALID_CODE"
}
```

**Error Codes:**
- `INVALID_CODE` - Code doesn't exist or doesn't match
- `CODE_EXPIRED` - Code has expired
- `CODE_USED` - Code already used
- `USER_NOT_FOUND` - User doesn't exist (new signup required)

**Status Codes:**
- `200` - Verification successful
- `400` - Invalid code/expired/used
- `500` - Server error

---

## Security Considerations

### Code Generation

- Uses `Math.random()` for code generation
- Consider upgrading to `crypto.getRandomValues()` for production
- Codes are numeric only (easy to type, harder to phish than links)

### Expiration

- Default 15-minute expiry balances security and usability
- Codes auto-expire and cannot be reused
- Expired codes remain in database for 24 hours (audit trail)

### Rate Limiting

- No built-in rate limiting currently implemented
- Recommend adding Supabase Rate Limiting or Cloudflare
- Consider limiting requests per email per hour

### Email Security

- Microsoft Graph API with OAuth2 (no password storage)
- Access tokens cached for 55 minutes, refreshed automatically
- Emails sent from verified O365 domain (SPF/DKIM/DMARC)

### Database Security

- Row Level Security (RLS) enabled on `verification_codes`
- Service role key used only in Edge Functions (never exposed to client)
- Codes marked as used (single-use only)

### Session Management

- Uses Supabase Auth session management
- Cookie-based sessions with httpOnly flag
- Sessions tied to user_id in database

---

## Troubleshooting

### Issue: "Failed to send verification email"

**Possible Causes:**
1. Microsoft Graph API credentials incorrect
2. Email address not valid O365 mailbox
3. API permissions not granted

**Solutions:**
- Verify secrets: `supabase secrets list`
- Check Azure AD app permissions
- Test email address in O365 admin center
- Check Edge Function logs: `supabase functions logs send-email`

---

### Issue: "Verification code login is currently disabled"

**Cause:** Admin setting not enabled

**Solution:**
1. Go to `/admin/settings`
2. Toggle "Enable Verification Code Login" to ON
3. Save changes

---

### Issue: Code not received in email

**Possible Causes:**
1. Email in spam folder
2. Microsoft Graph API rate limits
3. Email address typo
4. O365 tenant misconfiguration

**Solutions:**
- Check spam/junk folder
- Verify email address spelling
- Check Edge Function logs
- Test with different email address
- Verify O365 mailbox is active

---

### Issue: "Invalid verification code"

**Possible Causes:**
1. Code entered incorrectly
2. Code expired
3. Code already used
4. Database synchronization issue

**Solutions:**
- Double-check code entry
- Request new code
- Check expiration timer
- Verify database connection

---

### Issue: "Code has expired"

**Expected behavior** - codes expire after configured time

**Solution:** Click "Resend Code" to receive new code

---

### Issue: Session not created after valid code

**Possible Causes:**
1. Supabase Auth misconfiguration
2. User not in database
3. Cookie issues

**Solutions:**
- Check Supabase Auth settings
- Verify user exists in `user_profiles`
- Clear browser cookies and retry
- Check browser console for errors

---

### Debug Mode

Enable detailed logging:

```typescript
// In Edge Functions, set LOG_LEVEL
Deno.env.set("LOG_LEVEL", "debug");
```

View logs:
```bash
supabase functions logs send-verification-code --tail
supabase functions logs verify-code --tail
supabase functions logs send-email --tail
```

---

## Maintenance

### Cleanup Expired Codes

Run periodically (e.g., daily cron job):

```sql
SELECT cleanup_expired_verification_codes();
```

This removes codes older than 24 hours.

### Monitor Usage

Track verification code usage:

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as codes_sent,
  COUNT(used_at) as codes_used,
  COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired
FROM verification_codes
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Update Microsoft Graph Credentials

If client secret expires:

1. Generate new secret in Azure Portal
2. Update Supabase secret:
   ```bash
   supabase secrets set MICROSOFT_GRAPH_CLIENT_SECRET="new-secret"
   ```
3. Redeploy functions:
   ```bash
   supabase functions deploy send-email
   ```

---

## Related Documentation

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Microsoft Graph API - Send Mail](https://learn.microsoft.com/en-us/graph/api/user-sendmail)
- [OAuth 2.0 Client Credentials Flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## Support

For issues or questions:
1. Check this documentation
2. Review Edge Function logs
3. Check Supabase project logs
4. Contact system administrator
