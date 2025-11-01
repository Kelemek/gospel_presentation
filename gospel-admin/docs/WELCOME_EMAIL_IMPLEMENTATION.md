# Welcome Email System - Implementation Summary

## ✅ What's Been Implemented

### 1. Code Changes

#### Updated Functions
- **`inviteCounseleeUsers()`** in `src/lib/supabase-data-service.ts`
  - Changed from `createUser()` to `inviteUserByEmail()`
  - Now automatically sends welcome email with magic link
  - Includes profile info in user metadata

#### Enhanced Auth Callback
- **`src/app/auth/callback/route.ts`**
  - Now detects counselee users
  - Automatically redirects them to their assigned profile
  - Admin/counselor users still go to `/admin`

#### Environment Configuration
- **`.env.local`**
  - Added `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
  - This will be used for email redirects

### 2. How It Works Now

**When you add a counselee to a profile:**

1. System checks if user already exists
2. If new user:
   - Creates account via Supabase Auth
   - Sends automated welcome email with magic link
   - Stores profile info in user metadata:
     ```javascript
     {
       role: 'counselee',
       invited_for_profile: 'profile-uuid',
       profile_title: 'Gospel Presentation',
       profile_slug: 'john-3-16'
     }
     ```

3. **User receives email** with:
   - Welcome message
   - Magic link to sign in
   - Profile information

4. **User clicks magic link:**
   - Authenticates automatically
   - Redirected to `/auth/callback`
   - Callback checks their role
   - Counselees → redirected to `/{profile-slug}`
   - Admin/Counselors → redirected to `/admin`

### 3. Email Template Variables Available

In Supabase email templates, you can use:

```html
{{ .ConfirmationURL }}           <!-- Magic link -->
{{ .Data.profile_title }}        <!-- "Gospel Presentation" -->
{{ .Data.profile_slug }}         <!-- "john-3-16" -->
{{ .Data.role }}                 <!-- "counselee" -->
{{ .Data.invited_for_profile }}  <!-- Profile UUID -->
```

## 📋 Next Steps (You Need to Do These)

### Step 1: Configure Supabase Email Template

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/mchtyihbwlzjhkcmdvib)
2. Navigate to **Authentication** → **Email Templates**
3. Select **Invite User** template
4. Paste this customized template:

```html
<h2>Welcome to Gospel Presentation</h2>

<p>Hi there,</p>

<p>You've been invited to access the <strong>{{ .Data.profile_title }}</strong> profile.</p>

<p>This is a personalized biblical counseling resource to help you walk through Scripture and apply it to your life.</p>

<h3>Get Started</h3>

<p>Click below to access your profile:</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Access My Profile</a></p>

<p style="font-size: 12px; color: #666;">Or copy this link: {{ .ConfirmationURL }}</p>

<h3>What You Can Do</h3>
<ul>
  <li>Read Scripture in context</li>
  <li>Answer reflection questions</li>
  <li>Track your progress</li>
  <li>Mark favorite verses</li>
</ul>

<p>Questions? Contact your counselor.</p>

<p>Blessings,<br>Gospel Presentation Team</p>
```

5. Click **Save**

### Step 2: Configure Site URL

1. In same **Email Templates** section
2. Find **Site URL** setting
3. For development: `http://localhost:3000`
4. For production: `https://your-domain.com`

### Step 3: Add Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add allowed redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.com/auth/callback` (when you deploy)

### Step 4: Test It!

1. Make sure dev server is running: `npm run dev`
2. Go to `/admin`
3. Create or edit a profile
4. Add a counselee email (use your own email for testing)
5. Check your inbox for the welcome email
6. Click the magic link
7. Should redirect to the profile automatically

### Step 5: Production Setup (Optional - Later)

For production, consider setting up custom SMTP:

1. **Authentication** → **SMTP Settings**
2. Use a provider like:
   - **Resend** (recommended) - modern, developer-friendly
   - **SendGrid** - reliable, popular
   - **AWS SES** - cheap, scalable

Example Resend config:
```
Host: smtp.resend.com
Port: 587  
Username: resend
Password: [Your Resend API Key]
From: noreply@yourdomain.com
```

## 🧪 Testing Checklist

- [ ] Supabase email template configured
- [ ] Site URL set in Supabase
- [ ] Redirect URLs added
- [ ] Dev server running
- [ ] Add test counselee email
- [ ] Receive welcome email
- [ ] Click magic link
- [ ] Redirected to correct profile
- [ ] Can view profile content

## 🎯 User Experience Flow

**For Counselees:**
1. Counselor adds their email to a profile
2. They receive welcome email instantly
3. Click magic link → authenticated automatically
4. Taken directly to their assigned profile
5. Can start reading and answering questions

**For Counselors/Admins:**
1. Add counselee email via admin panel
2. System handles everything automatically
3. Can see counselee's progress (future feature)

## 🔧 Troubleshooting

**No email received?**
- Check spam folder
- Verify Supabase email settings
- Check rate limits (Supabase free tier has limits)
- Look at Supabase Logs → Auth logs

**Wrong redirect after clicking link?**
- Verify `NEXT_PUBLIC_SITE_URL` is set correctly
- Check if URL is in allowed redirect URLs
- Verify callback route exists

**User not created?**
- Check Supabase logs for errors
- Verify service role key is correct
- Check if email already exists

## 📁 Modified Files

1. `src/lib/supabase-data-service.ts` - Updated invite function
2. `src/app/auth/callback/route.ts` - Smart redirect based on role
3. `.env.local` - Added NEXT_PUBLIC_SITE_URL
4. `docs/WELCOME_EMAIL_SETUP.md` - Detailed setup guide

## 🚀 Ready to Deploy?

Before pushing to production:

1. Update `.env` on Vercel/hosting with production URL
2. Configure Supabase Site URL for production
3. Add production redirect URL to Supabase
4. Test with real email on staging/production
5. Consider setting up custom SMTP for reliability

---

**Current Status:** Code is deployed! Just need to configure Supabase email template and test.
