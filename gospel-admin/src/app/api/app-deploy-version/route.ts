import { NextResponse } from 'next/server'
import { readDeployUpdateChangelog } from '@/lib/deployUpdateMessage'

export const dynamic = 'force-dynamic'

/** Identifies the currently running server deployment (changes on each Vercel deploy). */
function resolveAppDeployVersion(): string {
  return (
    process.env.VERCEL_DEPLOYMENT_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.npm_package_version ??
    'dev'
  )
}

export async function GET() {
  const version = resolveAppDeployVersion()
  const changelog = readDeployUpdateChangelog()
  const body: { version: string; changelog?: string[] } = { version }
  if (changelog.length > 0) {
    body.changelog = changelog
  }

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
