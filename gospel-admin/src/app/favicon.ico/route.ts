import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // /icon conflicts with [slug]; serve from public/favicon.png
  return Response.redirect(new URL('/favicon.png?v=8', request.url), 301)
}