import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClarityProvider } from "@/components/ClarityProvider";
import { ApplyTheme } from "@/components/ApplyTheme";
import { CapacitorKeepLinksInApp } from "@/components/CapacitorKeepLinksInApp";
import { CapacitorProfileHelpTourNavigation } from "@/components/CapacitorProfileHelpTourNavigation";
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
};

export const metadata: Metadata = {
  title: "The Gospel Presentation",
  description: "A comprehensive gospel presentation by Dr. Stuart Scott with integrated scripture references, favorites navigation, and admin management system.",
  keywords: ["gospel", "presentation", "scripture", "bible", "evangelism", "salvation"],
  authors: [{ name: "Dr. Stuart Scott" }],
  icons: {
    icon: [
      { url: '/icon.svg?v=3', type: 'image/svg+xml' },
      { url: '/icon?v=3', type: 'image/png' }
    ],
    shortcut: '/icon.svg?v=3',
    apple: '/apple-touch-icon.svg',
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
        <ThemeProvider>
          <ApplyTheme />
          <TextSizeProvider>
            <ApplyTextSize />
            <CapacitorKeepLinksInApp />
            <CapacitorProfileHelpTourNavigation />
            <SplashScreenController />
            <ClarityProvider />
            <TranslationProvider>
              <AlertModalProvider>
                {children}
              </AlertModalProvider>
            </TranslationProvider>
          </TextSizeProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
