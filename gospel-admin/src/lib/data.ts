// Gospel Presentation Data - Managed via Profile System
import { GospelSection } from './types'

// This function fetches data from the profile system
export async function getGospelPresentationData(): Promise<GospelSection[]> {
  try {
    const response = await fetch('/api/profiles/default', {
      cache: 'no-store' // Always fetch fresh data
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch data from profile system')
    }
    
    const profile = await response.json()
    return profile.content.sections || []
  } catch (error) {
    console.error('Error fetching gospel presentation data:', error)
    // Return fallback data if API fails
    return getFallbackData()
  }
}

// Fallback data in case GitHub API is unavailable
function getFallbackData(): GospelSection[] {
  return [
    {
      "section": "1",
      "title": "God",
      "subsections": [
        {
          "title": "A. God is Holy",
          "content": "God is separate from and exalted above His creation. He is morally pure, perfect, and untainted by sin.",
          "scriptureReferences": [
            { "reference": "Isaiah 6:3" },
            { "reference": "1 Peter 1:15-16" }
          ]
        }
      ]
    }
    // Truncated for brevity - full data is now in GitHub
  ]
}

// Legacy export for backward compatibility (now populated via profile system)
export const gospelPresentationData: GospelSection[] = []