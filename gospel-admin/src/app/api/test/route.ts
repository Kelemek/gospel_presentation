// Simple test route to check if Next.js is working
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  logger.debug('[TEST] Simple test route called')
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Server is working',
    timestamp: new Date().toISOString() 
  })
}