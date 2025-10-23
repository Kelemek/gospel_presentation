import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Redirect favicon.ico requests to our SVG icon
  return Response.redirect(new URL('/icon.svg', request.url), 301)
}