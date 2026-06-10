import { NextResponse } from 'next/server'

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
  return NextResponse.json(
    { version: resolveAppDeployVersion() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
