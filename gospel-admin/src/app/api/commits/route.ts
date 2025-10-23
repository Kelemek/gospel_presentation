import { NextRequest, NextResponse } from 'next/server'
import { githubDataService } from '@/lib/github-data-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const commits = await githubDataService.getCommitHistory(limit)
    return NextResponse.json(commits)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commit history' },
      { status: 500 }
    )
  }
}