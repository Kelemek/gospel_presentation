# Gospel Presentation Admin Panel

This is a [Next.js](https://nextjs.org) admin interface for managing the Gospel Presentation content, built with TypeScript and Tailwind CSS.

## Features

- ✅ **Secure Authentication**: Session-based auth with environment variable passwords
- ✅ **Content Management**: Edit sections, subsections, and scripture references
- ✅ **Scripture Favorites**: Mark important scripture references for visual emphasis
- ✅ **GitHub Integration**: Automatic saving to GitHub repository
- ✅ **Responsive Design**: Works on desktop and mobile devices
- ✅ **Live Preview**: Changes are reflected immediately in the presentation

## Security

The admin panel uses secure session-based authentication:
- Passwords are stored in environment variables, never hardcoded
- Session tokens expire after 24 hours
- Unauthorized requests automatically log out users
- API routes validate session tokens for all mutations

## Setup

1. **Environment Configuration**: Copy `.env.example` to `.env.local` and set your passwords:

```bash
cp .env.example .env.local
```

Update the following in `.env.local`:
- `ADMIN_PASSWORD`: Set a secure password for admin access
- `GITHUB_TOKEN`: Your GitHub personal access token
- Other configuration as needed

2. **Install Dependencies**:

```bash
npm install
```

3. **Run Development Server**:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**Unused code:** `npm run knip` runs [Knip](https://knip.dev/) against `knip.json` (unused files and dependency checks; not wired into CI by default).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Capacitor (iOS / Android app)

Presentation backup **Save my data** on **Android** uses **`@capacitor/filesystem`** and **`@capacitor/share`** (see `gospelLocalUserDataBackup.ts`). The shared file is named **`.txt`** so Android’s share sheet treats it as **`text/plain`** and typically shows more save targets (e.g. **Files**); the payload is still JSON. After pulling these dependencies, run `npx cap sync` and ship a **new Play Store build** for Android users to get that path. **iOS** still uses the in-WebView **Web Share API** for the same button; you can defer an App Store update until convenient—the server JS only loads the new plugins on Android.

**Share this resource** (sticky profile header, **to the right of Bookmarks**) and admin **Copy URL** use **`@capacitor/share`** on native when available (share a presentation URL), then the **Web Share API** in supporting browsers, then **clipboard** copy. Uses the existing **`@capacitor/share`** dependency—no new native plugins.
