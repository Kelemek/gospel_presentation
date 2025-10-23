// Simple test route to check if Next.js is working
import { NextResponse } from 'next/server'

export async function GET() {
  console.log('[TEST] Simple test route called')
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Server is working',
    timestamp: new Date().toISOString() 
  })
}