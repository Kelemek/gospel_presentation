import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TranslationProvider } from "@/contexts/TranslationContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TranslationProvider>
          {children}
        </TranslationProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
