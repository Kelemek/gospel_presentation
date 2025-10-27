// Dynamic route for custom gospel presentation profiles
// This handles routes like /myprofile, /youthgroup, etc.
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import ProfileContent from './ProfileContent'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { GospelProfile } from '@/lib/types'

// Configure dynamic routes
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ProfilePageProps {
  params: Promise<{
    slug: string
  }>
}

// Fetch profile data
async function getProfile(slug: string): Promise<GospelProfile | null> {
  try {
    // For server-side rendering, import the data service directly
    if (typeof window === 'undefined') {
      const { getProfileBySlug } = await import('@/lib/blob-data-service')
      return await getProfileBySlug(slug)
    }
    
    // For client-side, use fetch with proper URL handling
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com')
      : 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/profiles/${slug}`, {
      cache: 'no-store' // Always get fresh data
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.profile
  } catch (error) {
    console.error('Error fetching profile:', error)
    return null
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { slug } = await params
  const profile = await getProfile(slug)
  
  if (!profile) {
    return {
      title: 'Profile Not Found',
      description: 'The requested gospel presentation profile could not be found.'
    }
  }

  return {
    title: profile.title,
    description: profile.description || `${profile.title} - A personalized gospel presentation`,
    openGraph: {
      title: profile.title,
      description: profile.description || `${profile.title} - A personalized gospel presentation`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: profile.title,
      description: profile.description || `${profile.title} - A personalized gospel presentation`,
    }
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params
  const profile = await getProfile(slug)

  // If profile doesn't exist, show 404
  if (!profile) {
    notFound()
  }

  const { gospelData } = profile

  // Extract favorite scripture references for the table of contents
  const favoriteScriptures: string[] = []
  
  gospelData.forEach(section => {
    section.subsections.forEach(subsection => {
      subsection.scriptureReferences?.forEach(ref => {
        if (ref.favorite) {
          favoriteScriptures.push(ref.reference)
        }
      })
      
      // Check nested subsections too
      subsection.nestedSubsections?.forEach(nestedSub => {
        nestedSub.scriptureReferences?.forEach(ref => {
          if (ref.favorite) {
            favoriteScriptures.push(ref.reference)
          }
        })
      })
    })
  })

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-br from-slate-700 to-slate-800 text-white text-center py-10 shadow-lg">
          <div className="container mx-auto px-5">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              The Gospel Presentation
            </h1>
          </div>
        </header>

        {/* Gospel Sections with Hamburger Menu */}
        <ProfileContent 
          sections={gospelData} 
          profileInfo={{
            title: profile.title,
            description: profile.description,
            slug: slug,
            favoriteScriptures: favoriteScriptures
          }}
          profile={profile}
        />
      </div>
    </ErrorBoundary>
  )
}

// Static generation - generate pages for existing profiles at build time
export async function generateStaticParams() {
  // In production, you'd fetch this from your database
  // For now, return empty array to use dynamic rendering
  return []
}