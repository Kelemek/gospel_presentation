// API Route: Verify Code
// Purpose: Proxy to Supabase Edge Function for verifying codes and creating sessions
// Flow: Validate input → Call edge function → Create session → Redirect

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, code, actionType = "user_login" } = body;

    // Validate input
    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
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

    // Call Supabase Edge Function to verify code
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/verify-code`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        "apikey": supabaseAnonKey,
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        code: code.trim(),
        actionType,
      }),
    });

    // Parse response
    const data = await response.json();

    // Handle errors from edge function
    if (!response.ok || !data.valid) {
      console.error("Verification failed:", data);
      return NextResponse.json(
        { 
          error: data.error || "Invalid verification code",
          errorCode: data.errorCode,
          valid: false 
        },
        { status: data.errorCode === "CODE_EXPIRED" || data.errorCode === "CODE_USED" ? 400 : response.status }
      );
    }

    // Check if this is a new user that needs signup
    if (data.newUser) {
      return NextResponse.json({
        success: false,
        newUser: true,
        error: data.error,
        errorCode: data.errorCode,
      }, { status: 200 });
    }

    // Get session properties from edge function response
    const { session: sessionProps } = data;

    if (!sessionProps || !sessionProps.access_token || !sessionProps.refresh_token) {
      console.error("No valid session tokens returned from edge function");
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // The hashed_token is a magic link token - verify it
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: sessionProps.access_token,
      type: 'magiclink',
    });

    if (sessionError || !sessionData.session) {
      console.error("Failed to verify magic link token and establish session:", sessionError);
      return NextResponse.json(
        { error: "Failed to establish session", details: sessionError?.message },
        { status: 500 }
      );
    }

    // Check if user exists before querying profile
    if (!sessionData.user?.id) {
      return new Response(
        JSON.stringify({ error: "Invalid user session" }),
        { status: 500 }
      );
    }

    // Get user profile to determine redirect
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", sessionData.user.id)
      .single();

    // Determine redirect URL based on role
    let redirectUrl = "/";
    
    if (userProfile && typeof userProfile === 'object' && 'role' in userProfile) {
      const role = (userProfile as { role: string }).role
      if (role === 'admin') {
        redirectUrl = '/admin/dashboard'
      } else {
        redirectUrl = '/admin'
      }
    }

    // Return success with redirect URL
    return NextResponse.json({
      success: true,
      valid: true,
      user: data.user,
      redirectUrl,
    }, { status: 200 });
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
