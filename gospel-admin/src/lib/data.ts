// Gospel Presentation Data - Now managed via GitHub API
import { GospelSection } from './types'

// This function fetches the latest data from GitHub API
export async function getGospelPresentationData(): Promise<GospelSection[]> {
  try {
    const response = await fetch('/api/data', {
      cache: 'no-store' // Always fetch fresh data
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch data')
    }
    
    return await response.json()
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

// For server-side usage where we can directly call the GitHub service
export { githubDataService } from './github-data-service'

// Legacy export for backward compatibility (now empty, will be populated by API calls)
export const gospelPresentationData: GospelSection[] = []