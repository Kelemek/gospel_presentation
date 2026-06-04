// Dynamic route for custom gospel presentation profiles
// This handles routes like /myprofile, /youthgroup, etc.
// Uses cache-first: ProfilePageClient loads from localStorage first, only hits DB when admin updates
import { notFound, redirect } from 'next/navigation'
import { Metadata } from 'next'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { createClient } from '@/lib/supabase/server'
import { getProfileMeta } from '@/lib/supabase-data-service'
import ProfilePageClient from './ProfilePageClient'

// Configure dynamic routes
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ProfilePageProps {
  params: Promise<{
    slug: string
  }>
}

// Generate metadata for SEO (lightweight - only title, description)
export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { slug } = await params
  const meta = await getProfileMeta(slug)

  if (!meta) {
    return {
      title: 'Profile Not Found',
      description: 'The requested gospel presentation profile could not be found.'
    }
  }

  return {
    title: meta.title,
    description: meta.description || `${meta.title} - A personalized gospel presentation`,
    openGraph: {
      title: meta.title,
      description: meta.description || `${meta.title} - A personalized gospel presentation`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: meta.title,
      description: meta.description || `${meta.title} - A personalized gospel presentation`,
    }
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params

  // Lightweight check: does profile exist? (for redirect/404)
  const meta = await getProfileMeta(slug)

  if (!meta) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect(`/login?redirect=/${slug}`)
    }
    notFound()
  }

  return (
    <ErrorBoundary>
      <ProfilePageClient key={slug} slug={slug} />
    </ErrorBoundary>
  )
}

// Static generation - generate pages for existing profiles at build time
export async function generateStaticParams() {
  return []
}
