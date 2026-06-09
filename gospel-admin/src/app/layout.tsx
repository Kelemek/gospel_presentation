import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { PostHogPageView } from "@/components/PostHogPageView";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ApplyTheme } from "@/components/ApplyTheme";
import { CapacitorKeepLinksInApp } from "@/components/CapacitorKeepLinksInApp";
import { CapacitorProfileHelpTourNavigation } from "@/components/CapacitorProfileHelpTourNavigation";
import { GospelClientStorageHydration } from "@/components/GospelClientStorageHydration";
import { ProfileAppLaunchResume } from "@/components/ProfileAppLaunchResume";
import { NativeAppInstallBanner } from "@/components/NativeAppInstallBanner";
import { SplashScreenController } from "@/components/SplashScreenController";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TextSizeProvider } from "@/contexts/TextSizeContext";
import { ApplyTextSize } from "@/components/ApplyTextSize";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { AlertModalProvider } from "@/contexts/AlertModalContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // Enables safe-area-inset-* for Capacitor/iOS notch
  // Resize the layout viewport when the virtual keyboard opens (same as Android Chrome).
  // iOS default overlays the keyboard, which desyncs `position: sticky` from the visible area.
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "The Gospel Presentation",
  description: "A comprehensive gospel presentation by Dr. Stuart Scott with integrated scripture references, favorites navigation, and admin management system.",
  keywords: ["gospel", "presentation", "scripture", "bible", "evangelism", "salvation"],
  authors: [{ name: "Dr. Stuart Scott" }],
  icons: {
    icon: [{ url: '/favicon.png?v=8', type: 'image/png' }],
    shortcut: '/favicon.png?v=8',
    apple: '/apple-touch-icon.png?v=8',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
(function() {
  var key = 'gospel-profile-theme';
  var stored = typeof localStorage !== 'undefined' && (localStorage.getItem(key) === 'light' || localStorage.getItem(key) === 'dark')
    ? localStorage.getItem(key)
    : null;
  var theme = stored || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  if (document.body) document.body.classList.toggle('dark', isDark);
})();
  `.trim()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>
          <ThemeProvider>
            <ApplyTheme />
            <TextSizeProvider>
              <ApplyTextSize />
              <CapacitorKeepLinksInApp />
              <GospelClientStorageHydration />
              <ProfileAppLaunchResume />
              <CapacitorProfileHelpTourNavigation />
              <SplashScreenController />
              <Suspense fallback={null}>
                <PostHogPageView />
              </Suspense>
              <TranslationProvider>
                <AlertModalProvider>
                  <NativeAppInstallBanner />
                  {children}
                </AlertModalProvider>
              </TranslationProvider>
            </TextSizeProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
