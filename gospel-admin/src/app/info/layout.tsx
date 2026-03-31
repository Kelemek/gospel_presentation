import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'About the app — The Gospel Presentation',
  description:
    'The Gospel Presentation: gospel in context, scripture, reflection questions, and mobile apps. QR codes for web, App Store, and Google Play.',
}

export default function InfoLayout({ children }: { children: ReactNode }) {
  return children
}
