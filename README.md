# Gospel Presentation - Next.js Application

A Next.js application for presenting "The Gospel in its Context" by Dr. Stuart Scott, featuring multi-user authentication, role-based access control, and comprehensive content management capabilities.

## 🌟 Overview

This platform enables counselors and educators to create, customize, and share personalized gospel presentations with counselees. Built on Next.js 16, Supabase, and featuring ESV Bible API integration.

## ✨ Key Features

### 📖 **Presentation Features**
- **Dynamic Content**: Rich gospel presentation with sections, subsections, and scripture references
- **Scripture Modal**: Click any scripture reference to view the full text (ESV, KJV, NASB, LSB); compare two translations side-by-side
- **Reflection Questions**: Add custom questions to subsections for deeper engagement
- **Answer Tracking**: Users can answer questions and save responses locally (localStorage)
- **Favorite Scripture Navigation**: Mark and navigate between key scriptures with keyboard shortcuts
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Print & Share Ready**: Clean URLs and print-friendly formatting

### 🔐 **Authentication & Access Control**
- **Dual Authentication Methods**: 
  - **Magic Links**: Passwordless email links (existing)
  - **Verification Codes**: Email-based numeric codes (NEW! ✨)
- **Multi-User System**: Admin, Counselor, and Counselee roles
- **Role-Based Access**: 
  - **Admins**: Full access to all profiles and system settings
  - **Counselors**: Create and manage their own profiles, invite counselees
  - **Counselees**: View-only access to profiles shared with them
- **Secure Profile URLs**: UUID-based slugs prevent URL guessing
- **Row-Level Security**: Database-level access control via Supabase RLS policies
- **Microsoft Graph Integration**: Enterprise-grade email delivery via O365

### 👥 **Counselor Features**
- **Profile Creation**: Create unlimited customized gospel presentations
- **Content Editing**: Full WYSIWYG editing of all sections and content
- **Template System**: Clone from default template or other profiles
- **Counselee Invitations**: Invite counselees by email with automatic access grants
- **Profile Sharing**: One-click URL copying for easy sharing
- **Backup & Restore**: Export/import profiles as JSON files
- **Questions**: Add reflection questions to any subsection

### 📊 **Admin Dashboard**
- **User Management**: View and manage all users (admins, counselors, counselees)
- **Profile Overview**: Access and manage all profiles across the system
- **Template Management**: Designate profiles as templates for others to clone
- **Analytics**: Track visit counts and profile usage
- **Bulk Operations**: Search, filter, and manage multiple profiles

## 🏗️ Project Structure

```
gospel-admin/              # Main Next.js application
├── src/
│   ├── app/              # Next.js 16 App Router pages
│   │   ├── admin/        # Admin dashboard and management
│   │   ├── api/          # API routes (profiles, auth, etc.)
│   │   ├── auth/         # Authentication pages
│   │   └── [slug]/       # Dynamic profile routes
│   ├── components/       # React components
│   │   ├── AdminHeader.tsx
│   │   ├── GospelSection.tsx
│   │   ├── ScriptureModal.tsx
│   │   └── ComaModal.tsx
│   ├── lib/              # Core utilities and services
│   │   ├── supabase/     # Supabase client configuration
│   │   ├── auth.ts       # Authentication utilities
│   │   ├── profile-service.ts
│   │   └── data-service.ts
│   └── types/            # TypeScript type definitions
├── sql/                  # Database migration scripts
├── scripts/              # Utility scripts (backup, restore)
└── docs/                 # Documentation

docs/                     # Project documentation
├── 01-USERS_AND_ACCESS.md        # User roles, counselee assignment, access control
├── 02-BIBLE_AND_SCRIPTURE.md     # Bible translations, KJV database, ESV caching
├── 03-FEATURES.md                # Questions, answers, COMA, profiles, backup
├── 04-AUTHENTICATION.md          # Magic links, email invitations, sessions
├── 05-INFRASTRUCTURE.md          # Supabase setup, security, RLS, deployment
├── 06-REFERENCE.md               # Licenses, templates, testing reference
├── VERIFICATION_CODE_AUTH.md     # Email verification codes (NEW! ✨)
├── VERIFICATION_CODE_QUICKSTART.md # Quick setup guide for verification codes
└── README.md                      # Documentation quick start

backups/                  # Profile backup storage
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier available)
- ESV API key (free for non-commercial use)

### 1. **Clone and Install**
```bash
git clone https://github.com/Kelemek/gospel_presentation.git
cd gospel_presentation/gospel-admin
npm install
```

### 2. **Supabase Setup**
1. Create a project at [supabase.com](https://supabase.com)
2. Run database migrations from `gospel-admin/sql/`:
   - `add_counselee_system.sql` (core tables and RLS)
   - Other migration files as needed
3. Get your project credentials from Settings → API

### 3. **Environment Configuration**
Create `gospel-admin/.env.local`:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# ESV Bible API (Required)
ESV_API_TOKEN=your-esv-api-token-here

# App Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Get API Keys:**
- ESV API: https://api.esv.org/account/create-application/
- Supabase: Your project's Settings → API page

### 4. **Run Development Server**
```bash
npm run dev
```

**Access the app:**
- **Public Profiles**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Login (Magic Link)**: http://localhost:3000/login
- **Login (Verification Code)**: http://localhost:3000/login-code *(requires setup)*

### 5. **Create First Admin User**
1. Visit http://localhost:3000/login
2. Sign up with email
3. Check your email for magic link
4. In Supabase dashboard, go to Authentication → Users
5. Find your user and note the UUID
6. In SQL Editor, run:
   ```sql
   INSERT INTO user_profiles (id, role, display_name)
   VALUES ('your-user-uuid', 'admin', 'Your Name');
   ```

## 📘 Usage Guide

### For Counselors

**Creating a Profile:**
1. Log in at `/login`
2. Navigate to `/admin`
3. Click "Create New Profile"
4. Enter title, description
5. Optionally add counselee emails
6. Profile is created with secure UUID slug

**Editing Content:**
1. Find your profile in the dashboard
2. Click "Edit Content"
3. Add/edit sections, subsections, scriptures
4. Add reflection questions to subsections
5. Changes save automatically to Supabase

**Inviting Counselees:**
1. In profile list, click "Manage Access"
2. Enter counselee email addresses
3. They receive access and can view the profile
4. Share profile URL (click "Share" to copy)

**Backup & Restore:**
- Click "Backup" to download profile JSON
- Use "Restore" to import from backup file
- Backups include all content and questions

### For Counselees

1. Receive profile URL from counselor
2. Log in with email (magic link)
3. View profile content (read-only)
4. Answer reflection questions
5. Answers save locally in your browser

### For Admins

- Access all profiles and users
- Manage user roles (promote to admin/counselor)
- Designate profiles as templates
- View system-wide analytics
- **Configure verification code login** at `/admin/settings`

## 🆕 Email Verification Code Authentication (NEW!)

An alternative to magic link authentication using numeric codes sent via email.

### Features
- ✅ 4-8 digit verification codes
- ✅ Configurable expiration (5-60 minutes)
- ✅ Real-time countdown timer
- ✅ Microsoft Graph API email delivery (O365)
- ✅ Admin toggle to enable/disable
- ✅ Works alongside existing magic links

### Quick Setup

1. **Run database migration:**
   ```bash
   psql $DATABASE_URL -f gospel-admin/sql/migrations/20251223_create_verification_codes.sql
   ```

2. **Set up Microsoft Graph API:**
   - Register app in Azure AD: https://portal.azure.com
   - Grant `Mail.Send` permission
   - Create client secret
   - See [Quick Start Guide](docs/VERIFICATION_CODE_QUICKSTART.md)

3. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy send-email
   supabase functions deploy send-verification-code
   supabase functions deploy verify-code
   ```

4. **Configure secrets:**
   ```bash
   supabase secrets set MICROSOFT_GRAPH_TENANT_ID="your-tenant-id"
   supabase secrets set MICROSOFT_GRAPH_CLIENT_ID="your-client-id"
   supabase secrets set MICROSOFT_GRAPH_CLIENT_SECRET="your-secret"
   supabase secrets set EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
   ```

5. **Enable in admin settings:**
   - Go to `/admin/settings`
   - Toggle "Enable Verification Code Login" to ON
   - Configure code length and expiry
   - Save changes

**Documentation:**
- 📚 [Full Documentation](docs/VERIFICATION_CODE_AUTH.md)
- ⚡ [Quick Start Guide](docs/VERIFICATION_CODE_QUICKSTART.md)

**User Access:**
- Login page: `/login-code`
- Standard magic link still available at `/login`

## 🔧 Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Links)
- **API**: ESV Bible API
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel
- **Storage**: Supabase Storage + Local Backups

## 📦 Key Dependencies

```json
{
  "next": "16.0.0",
  "react": "19.2.0",
  "@supabase/supabase-js": "^2.78.0",
  "@supabase/ssr": "^0.7.0",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode
npm run test:ci
```

**Test Coverage Includes:**
- Profile creation and validation
- Content editing workflows
- Authentication flows
- Scripture modal interactions
- Backup/restore functionality

## 🚀 Deployment

### Vercel (Recommended)

This project is optimized for Vercel deployment:

**1. Connect Repository:**
- Push to GitHub
- Import project in [Vercel Dashboard](https://vercel.com)

**2. Configure Environment Variables:**
Add these in Vercel project settings:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
ESV_API_TOKEN=your-esv-token
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

**3. Deploy:**
- Push to main branch
- Automatic deployment triggered
- Site live in ~2 minutes

### Custom Domain
- Add domain in Vercel project settings
- Update `NEXT_PUBLIC_SITE_URL` environment variable
- DNS propagation takes 24-48 hours

### Mobile App (Capacitor)

The app can be wrapped for iOS and Android using Capacitor. The native apps load the deployed web app in a WebView.

**Prerequisites:** Xcode (Mac, for iOS), Android Studio, and a deployed production URL.

**1. Configure the Capacitor server URL:**
Copy `gospel-admin/.env.capacitor.example` to `gospel-admin/.env.capacitor` and set `CAPACITOR_SERVER_URL`:
- For local dev (iOS Simulator): `http://localhost:3000`
- For local dev (Android Emulator): `http://10.0.2.2:3000`
- For production: `https://cp-church.org` (or your deployed URL)

**2. Sync and open native projects:**
```bash
cd gospel-admin
npm run cap:sync
npm run cap:ios    # Opens Xcode
npm run cap:android  # Opens Android Studio
```

**3. Build and run:**
- In Xcode: select a simulator or device, then Run
- In Android Studio: sync Gradle, then Run

**Notes:**
- Run `npm run cap:sync` after any config changes or plugin additions
- The "Print Version" button uses native print on iOS/Android via `@capgo/capacitor-printer`
- An offline error page is shown when the device has no network

## 📚 Documentation

Comprehensive guides available in `/docs`:

- **[COUNSELEE_SYSTEM.md](docs/COUNSELEE_SYSTEM.md)** - Multi-user role system
- **[QUESTIONS_FEATURE.md](docs/QUESTIONS_FEATURE.md)** - Reflection questions guide  
- **[SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md)** - Database setup
- **[BACKUP_SYSTEM.md](docs/BACKUP_SYSTEM.md)** - Backup/restore procedures
- **[RECENT_UPDATES.md](docs/RECENT_UPDATES.md)** - Changelog and updates
- **[SECURITY.md](docs/SECURITY.md)** - Security best practices

## 🔒 Security Features

- **Row-Level Security (RLS)**: Database-level access control
- **Secure Authentication**: Magic link email authentication
- **UUID-based URLs**: Prevents profile URL guessing
- **Environment Variables**: Sensitive data never in code
- **HTTPS Only**: All production traffic encrypted
- **Session Management**: Automatic timeout and refresh

## 🐛 Troubleshooting

### Scripture Modal Not Loading
- Verify `ESV_API_TOKEN` is set correctly
- Check browser console for API errors
- Ensure you have internet connection

### Can't Access Admin Dashboard
- Ensure you're logged in
- Check that your user has correct role in `user_profiles` table
- Clear browser cache and cookies

### Profile Not Saving
- Check Supabase connection
- Verify RLS policies are active
- Check browser console for errors

### Counselee Can't Access Profile
- Verify email was added to `profile_access` table
- Ensure counselee has signed up with matching email
- Check RLS policies in Supabase

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Credits & Attribution

**Content:** Dr. Stuart Scott - "Presenting the Gospel in its Context"

**Scripture API:** ESV API by Crossway
- Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®)
- © 2001 by Crossway, a publishing ministry of Good News Publishers
- Used by permission. All rights reserved.
- Non-commercial ministry use only

**Technologies:**
- Next.js by Vercel
- Supabase
- Tailwind CSS
- ESV Bible API

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Review [RECENT_UPDATES.md](docs/RECENT_UPDATES.md) for latest changes

## 🗺️ Roadmap

**Planned Features:**
- [ ] Email notifications for counselee invitations
- [ ] Profile templates marketplace
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Offline mode support
- [ ] Multi-language support
- [ ] Audio scripture playback
- [ ] Collaborative editing

## ⚙️ Scripts

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm start            # Start production server

# Testing
npm test             # Run tests
npm run test:coverage # Generate coverage report

# Database
npm run backup       # Backup all profiles
npm run restore      # Restore from backup

# Utilities
npm run lint         # Run ESLint
```

---

**Built with ❤️ for gospel ministry and biblical counseling**