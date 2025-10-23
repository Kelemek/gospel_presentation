import { NextRequest, NextResponse } from 'next/server'
import { githubDataService } from '@/lib/github-data-service'

export async function GET() {
  try {
    const data = await githubDataService.getData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gospel presentation data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data, password, commitMessage } = await request.json()
    
    // Validate password
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate data structure
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    // Save to GitHub
    const message = commitMessage || `Update gospel presentation data - ${new Date().toISOString()}`
    await githubDataService.saveData(data, message)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Gospel presentation data updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to save gospel presentation data' },
      { status: 500 }
    )
  }
}