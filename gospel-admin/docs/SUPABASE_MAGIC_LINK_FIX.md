# URGENT: Supabase Configuration Required for Magic Links

## The Problem
Magic links aren't redirecting properly in production because Supabase needs to know your production URL.

## Quick Fix (Do This Now)

### 1. Go to Supabase Dashboard
https://supabase.com/dashboard/project/mchtyihbwlzjhkcmdvib/auth/url-configuration

### 2. Configure Site URL
- Set **Site URL** to your production domain
- Example: `https://gospel-presentation.vercel.app` (or whatever your Vercel URL is)

### 3. Add Redirect URLs
Under **Redirect URLs**, add:
- `https://gospel-presentation.vercel.app/auth/callback`
- `https://gospel-presentation.vercel.app/**` (allows any path)
- `http://localhost:3000/auth/callback` (for local development)
- `http://localhost:3000/**` (for local development)

### 4. Save Changes
Click **Save** at the bottom

## What This Does

When Supabase sends a magic link email, it needs to know:
1. Where to redirect users after they click the link
2. What URLs are allowed for security

Without this configuration:
- ❌ Magic links go to `localhost` (doesn't work in production)
- ❌ Links might be blocked as unauthorized redirects
- ❌ Users can't sign in

With this configuration:
- ✅ Magic links go to your production domain
- ✅ Redirects are authorized
- ✅ Users land at `/auth/callback` which handles the login

## Test It

After configuring:
1. Add a test counselee email in production
2. Check your email for the invite
3. Click the magic link
4. Should redirect to your production site and sign you in
5. Admin/counselor users → `/admin`
6. Counselees → their assigned profile page

## Additional Setup (Email Template)

While you're in Supabase:

### Configure the Invite Email Template
1. Go to **Authentication** → **Email Templates**
2. Select **Invite user**
3. Use this HTML:

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

4. Click **Save**

## Code Changes Made

Updated `inviteCounseleeUsers()` to rely on Supabase's configured Site URL instead of environment variables. This is more reliable and works correctly in all environments.

## Summary

**REQUIRED NOW:**
- [ ] Set Site URL in Supabase
- [ ] Add redirect URLs in Supabase
- [ ] Test magic link from production

**OPTIONAL BUT RECOMMENDED:**
- [ ] Customize email template
- [ ] Set up custom SMTP for production emails

Once you've configured the Site URL in Supabase, magic links will work correctly in production!
