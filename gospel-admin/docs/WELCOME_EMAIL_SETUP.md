# Welcome Email Setup Guide

## Overview
When a counselee is added to a profile, they will automatically receive a welcome email with a magic link to set up their account.

## What We Changed

### Code Changes
1. **Updated `inviteCounseleeUsers()` function** in `/src/lib/supabase-data-service.ts`
   - Now uses `supabase.auth.admin.inviteUserByEmail()` instead of creating users with temp passwords
   - Automatically sends a welcome email with a magic link
   - Includes profile information in the user metadata

### Environment Setup

Add this to your `.env.local`:
```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

For local development, use:
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Supabase Email Template Configuration

### Step 1: Access Email Templates
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `mchtyihbwlzjhkcmdvib`
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Configure "Invite User" Template

Click on **Invite User** template and customize it:

```html
<h2>Welcome to Gospel Presentation</h2>

<p>Hi there,</p>

<p>You've been invited to access the <strong>{{ .Data.profile_title }}</strong> profile on Gospel Presentation.</p>

<p>This is a personalized biblical counseling resource designed to help you walk through Scripture and apply it to your life.</p>

<h3>Getting Started</h3>

<p>Click the button below to set up your account and access your profile:</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Access Your Profile</a></p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<h3>What You Can Do</h3>
<ul>
  <li>Read through Scripture in context</li>
  <li>Answer reflection questions</li>
  <li>Track your progress</li>
  <li>Mark favorite verses</li>
</ul>

<p>If you have any questions, please contact your counselor.</p>

<p>God bless,<br>The Gospel Presentation Team</p>
```

### Step 3: Configure Email Settings

1. In **Authentication** → **Email Templates** → **Settings**
2. Set **Site URL**: `https://your-production-domain.com`
3. Set **Redirect URLs**: Add your callback URL:
   - `https://your-production-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for dev)

### Step 4: SMTP Configuration (Recommended for Production)

By default, Supabase uses their email service (limited emails). For production:

1. Go to **Project Settings** → **Authentication** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Use a service like:
   - **Resend** (recommended, modern API)
   - **SendGrid**
   - **AWS SES**
   - **Gmail** (for testing only)

Example with Resend:
```
Host: smtp.resend.com
Port: 587
Username: resend
Password: [Your Resend API Key]
Sender email: noreply@yourdomain.com
```

## How It Works

### When a Counselee is Added

1. Admin/Counselor adds counselee email to a profile
2. System checks if user exists
3. If new user:
   - Creates account via `inviteUserByEmail()`
   - Sends welcome email with magic link
   - Includes profile info in user metadata
4. User clicks magic link → redirected to `/auth/callback` → signed in → redirected to their profile

### User Metadata Included
```javascript
{
  role: 'counselee',
  invited_for_profile: '[profile-id]',
  profile_title: 'Gospel Presentation',
  profile_slug: 'john-3-16'
}
```

## Testing

### Local Testing
1. Add `.env.local` variable:
   ```bash
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Add a test counselee email (use your own email for testing)

4. Check your email for the welcome message

### Production Testing
1. Deploy to Vercel/production
2. Add production URL to `.env.local` or Vercel environment variables
3. Update Supabase redirect URLs to include production domain
4. Test with a real email address

## Customization Options

### Add More Profile Info to Email
In `supabase-data-service.ts`, you can pass more data:

```typescript
const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
  data: {
    role: 'counselee',
    invited_for_profile: profileId,
    profile_title: profile?.title,
    profile_slug: profile?.slug,
    counselor_name: 'Pastor John', // Add counselor info
    church_name: 'First Baptist',  // Add church info
    custom_message: 'Looking forward to our session' // Personal note
  }
})
```

Then use in email template:
```html
<p>Your counselor {{ .Data.counselor_name }} has invited you...</p>
```

### Resend Welcome Email
Create an API endpoint to resend invitations:

```typescript
// /api/users/resend-invite/route.ts
export async function POST(request: Request) {
  const { email } = await request.json()
  const supabase = await createAdminClient()
  
  await supabase.auth.admin.inviteUserByEmail(email)
  
  return NextResponse.json({ success: true })
}
```

## Troubleshooting

### Emails Not Sending
1. Check Supabase email rate limits (limited on free tier)
2. Verify SMTP settings if using custom provider
3. Check spam folder
4. Look at Supabase Dashboard → Logs → Auth logs

### Wrong Redirect URL
1. Verify `NEXT_PUBLIC_SITE_URL` matches your actual domain
2. Add URL to Supabase allowed redirect URLs
3. Check callback handler exists at `/auth/callback`

### User Not Created
1. Check Supabase logs for errors
2. Verify service role key has admin permissions
3. Check if email already exists in auth.users

## Next Steps

1. ✅ Code updated (already done)
2. ⏳ Add `NEXT_PUBLIC_SITE_URL` to `.env.local`
3. ⏳ Configure Supabase email template
4. ⏳ Set up SMTP (optional but recommended for production)
5. ⏳ Test with a real email
6. ⏳ Deploy to production

## Security Notes

- Magic links expire after 24 hours by default
- Users can only sign in with the email they were invited with
- Role is set to 'counselee' and cannot be changed by the user
- Profile access is controlled via RLS policies
