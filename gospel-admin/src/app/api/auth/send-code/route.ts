// API Route: Send Verification Code
// Purpose: Proxy to Supabase Edge Function for sending verification codes
// Flow: Validate input → Call edge function → Return response

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, actionType = "user_login", actionData = {} } = body;

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    // Get Supabase credentials from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Call Supabase Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-verification-code`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        "apikey": supabaseAnonKey,
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        actionType,
        actionData,
      }),
    });

    // Parse response
    const data = await response.json();

    // Handle errors from edge function
    if (!response.ok) {
      console.error("Edge function error:", data);
      return NextResponse.json(
        { 
          error: data.error || "Failed to send verification code",
          details: data.details 
        },
        { status: response.status }
      );
    }

    // Return success response
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Reject other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
