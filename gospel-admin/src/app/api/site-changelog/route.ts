import { NextResponse } from 'next/server'
import { groupSiteChangelogByMonth, readSiteChangelog } from '@/lib/siteChangelog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const entries = readSiteChangelog()
  const groups = groupSiteChangelogByMonth(entries)

  return NextResponse.json(
    { groups },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
