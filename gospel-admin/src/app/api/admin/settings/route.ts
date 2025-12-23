// API Route: Get Admin Settings
// Purpose: Fetch admin settings (code length, expiry, etc.) for public access
// Used by: Login page to dynamically configure verification code input

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch admin settings
    const { data: settings, error } = await supabase
      .from("admin_settings")
      .select("verification_code_length, verification_code_expiry_minutes, enable_verification_code_login")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Failed to fetch admin settings:", error);
      // Return defaults if settings not found
      return NextResponse.json({
        verification_code_length: 6,
        verification_code_expiry_minutes: 15,
        enable_verification_code_login: true,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("API route error:", error);
    // Return defaults on error
    return NextResponse.json({
      verification_code_length: 6,
      verification_code_expiry_minutes: 15,
      enable_verification_code_login: true,
    });
  }
}

// Reject other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed. Use GET." },
    { status: 405 }
  );
}
