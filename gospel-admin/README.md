# Gospel Presentation Admin Panel

This is a [Next.js](https://nextjs.org) app for biblical counseling gospel presentations, built with TypeScript and Tailwind CSS. Counselors manage profiles and content in the admin area; counselees and the public read presentations at profile URLs (for example `/default/`).

## Features

- **Supabase authentication**: Magic links and email verification codes (no env-password login in production)
- **Profile management**: Sections, subsections, scripture cards, reflection questions, and COMA templates
- **Scripture reader**: ESV, KJV, NASB, LSB, and other translations via API integrations
- **Resources library**: Spurgeon, Calvin, Henry, Edwards, and other imported corpora
- **Native apps**: Capacitor iOS/Android WebView builds with offline cache and device sync
- **Dark mode**, print/share, memorization, bookmarks, and profile help tours

## Setup

1. **Environment**: Copy secrets into `gospel-admin/.env.local` (see project root `AGENTS.md` for required keys):

   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
   - `ESV_API_TOKEN` for ESV scripture
   - Optional: `API_BIBLE_KEY` and translation IDs, `NEXT_PUBLIC_POSTHOG_KEY`

2. **Install and run** (from `gospel-admin/`):

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default presentation is at `/default/` without login.

## Commands

| Task | Command |
|------|---------|
| Tests | `npm test` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Unused code | `npm run knip` |
| Capacitor sync | `npm run cap:sync` |
| Release note | `npm run append-release-changelog -- "Your note."` |

CI runs tests on Ubuntu, Windows, and macOS, plus lint and production build on Ubuntu.

## Capacitor (iOS / Android)

Presentation backup **Save my data** on **Android** uses **`@capacitor/filesystem`** and **`@capacitor/share`**. **Share this resource** uses **`@capacitor/share`** on native when available. Resource **Listen** on the Android app uses **`@capgo/capacitor-speech-synthesis`**. After Capacitor or native plugin bumps, run `npx cap sync` and ship new App Store / Play Store builds.

**Deploy update notice** polls for missed release notes; append plain-language notes with `npm run append-release-changelog` (see `.cursor/rules/deploy-update-message.mdc`).

## Documentation

- [docs/README.md](../docs/README.md) — feature and infrastructure docs
- [AGENTS.md](../AGENTS.md) — agent/CI commands, imports, and deployment notes

## Deploy on Vercel

Production deploys from this repo’s Vercel project. See [docs/DEPLOYMENT_CHECKLIST.md](../docs/DEPLOYMENT_CHECKLIST.md) and [docs/05-INFRASTRUCTURE.md](../docs/05-INFRASTRUCTURE.md).
