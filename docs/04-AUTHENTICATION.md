# Authentication & Email

Complete authentication and email communication system.

## Authentication System

### Magic Links
- Users sign in via magic link sent to their email
- No passwords required
- Links expire after 24 hours
- Each user has one active session

**Process**:
1. User enters email
2. System sends magic link
3. User clicks link
4. Redirected to `/auth/callback`
5. Session established
6. User logged in

### Session Management
- Sessions expire after inactivity
- Admin can log out all sessions
- Token-based (Supabase JWT)
- Refresh tokens handle expiry

**Fixes**:
- Session expiry now properly enforced
- Users can't stay logged in after session expires
- Backend validates all requests

## Welcome email & invitations

Staff accounts receive magic links or verification-code emails per your Supabase and Edge Function configuration. After a successful magic-link exchange, the app redirects to **`/admin`**. User creation from **Manage users** always provisions **`admin`** profiles.

### Email configuration

**Environment**:
```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

**Supabase Setup**:
- Email Templates → Invite User template
- Configure sender and subject
- Add production URL to redirect list

**SMTP (Production)**:
- Custom SMTP via Resend, SendGrid, etc.
- Default: Supabase email service (limited)
- Recommended: Resend (modern, reliable)

### Email Template
```html
<h2>Welcome to Gospel Presentation</h2>
<p>You've been invited to access {{ .Data.profile_title }}</p>
<a href="{{ .ConfirmationURL }}">Access Your Profile</a>
```

## Magic Link Troubleshooting

| Issue | Solution |
|-------|----------|
| Link not working | Verify NEXT_PUBLIC_SITE_URL matches domain |
| Wrong redirect | Add URL to Supabase allowed redirects |
| Link expired | User can request new magic link |
| Email not received | Check spam, verify SMTP settings, check Supabase logs |

## Security

- Magic links expire after 24 hours
- Links are single-use
- User can only sign in with invited email
- Role cannot be changed by user
- All API calls require valid session

## Related Documentation
- Magic link details: [SUPABASE_MAGIC_LINK_FIX.md](SUPABASE_MAGIC_LINK_FIX.md)
- Welcome email details: [WELCOME_EMAIL.md](WELCOME_EMAIL.md)
- Full user system: [01-USERS_AND_ACCESS.md](01-USERS_AND_ACCESS.md)
