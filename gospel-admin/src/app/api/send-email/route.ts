import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

interface EmailRequest {
  to?: string | string[]
  bcc?: string[]
  subject: string
  body: string
  isHtml?: boolean
}

export async function POST(request: Request) {
  try {
    const emailRequest: EmailRequest = await request.json()

    // Validate required fields
    if (!emailRequest.subject || !emailRequest.body) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, body' },
        { status: 400 }
      )
    }

    if (!emailRequest.to && (!emailRequest.bcc || emailRequest.bcc.length === 0)) {
      return NextResponse.json(
        { error: "Must provide either 'to' or 'bcc' recipients" },
        { status: 400 }
      )
    }

    // Get the Supabase project URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      logger.error('[API] Missing NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Forward to Supabase Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`
    
    logger.debug('[API] Forwarding email request to Edge Function:', {
      url: edgeFunctionUrl,
      to: emailRequest.to,
      bcc: emailRequest.bcc?.length || 0,
      subject: emailRequest.subject
    })

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
      },
      body: JSON.stringify(emailRequest),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('[API] Edge Function error:', {
        status: response.status,
        body: errorText,
      })
      return NextResponse.json(
        { error: `Failed to send email: ${response.status}` },
        { status: response.status }
      )
    }

    const responseData = await response.text()
    logger.info('[API] Email sent successfully')
    
    try {
      return NextResponse.json(JSON.parse(responseData))
    } catch {
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    logger.error('[API] Error processing email request:', error)
    return NextResponse.json(
      { error: 'Failed to process email request' },
      { status: 500 }
    )
  }
}
