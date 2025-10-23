// Dynamic route for custom gospel presentation profiles
// This handles routes like /myprofile, /youthgroup, etc.
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import GospelSection from '@/components/GospelSection'
import TableOfContents from '@/components/TableOfContents'
import { GospelProfile } from '@/lib/types'

interface ProfilePageProps {
  params: {
    slug: string
  }
}

// Fetch profile data
async function getProfile(slug: string): Promise<GospelProfile | null> {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_BASE_URL 
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
  const profile = await getProfile(params.slug)
  
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
  const profile = await getProfile(params.slug)

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Profile Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {profile.title}
          </h1>
          {profile.description && (
            <p className="text-lg text-gray-600">
              {profile.description}
            </p>
          )}
          {favoriteScriptures.length > 0 && (
            <p className="text-sm text-blue-600 mt-2">
              📖 {favoriteScriptures.length} favorite scripture{favoriteScriptures.length !== 1 ? 's' : ''} highlighted
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Table of Contents */}
        <div className="mb-8">
          <TableOfContents sections={gospelData} />
        </div>

        {/* Gospel Sections */}
        <div className="space-y-8">
          {gospelData.map((section) => (
            <GospelSection 
              key={section.section} 
              section={section}
              onScriptureClick={(reference: string) => {
                // For now, just log the scripture click
                // Later we can add modal functionality or other interactions
                console.log('Scripture clicked:', reference)
              }}
            />
          ))}
        </div>

        {/* Profile Footer */}
        <div className="mt-16 text-center border-t pt-8">
          <p className="text-gray-500 text-sm">
            This is a personalized gospel presentation
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Profile: {params.slug} • Last updated: {new Date(profile.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}

// Static generation - generate pages for existing profiles at build time
export async function generateStaticParams() {
  // In production, you'd fetch this from your database
  // For now, return empty array to use dynamic rendering
  return []
}