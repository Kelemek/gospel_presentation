// Verify Code Edge Function
// Based on: https://github.com/Kelemek/angular_prayerapp
// Purpose: Validate verification codes and authenticate users
// Flow: Check code exists → Validate expiry → Mark as used → Sign in user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface VerifyCodeRequest {
  email: string;
  code: string;
  actionType?: string;
}

interface VerifyCodeResponse {
  success: boolean;
  valid?: boolean;
  session?: any;
  user?: any;
  actionData?: Record<string, any>;
  error?: string;
  errorCode?: string;
}

interface VerificationCode {
  id: string;
  email: string;
  code: string;
  action_type: string;
  action_data: Record<string, any>;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  // CORS headers for local development
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    // Parse request body
    const requestData: VerifyCodeRequest = await req.json();
    const { email, code, actionType = "user_login" } = requestData;

    // Validate input
    if (!email || !code) {
      return new Response(
        JSON.stringify({ 
          error: "Email and code are required",
          errorCode: "MISSING_PARAMS" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error",
          errorCode: "CONFIG_ERROR"
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up verification code
    const { data: verificationCodes, error: lookupError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", normalizedCode)
      .eq("action_type", actionType)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lookupError) {
      console.error("Database lookup error:", lookupError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to verify code",
          errorCode: "DB_ERROR"
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if code exists
    if (!verificationCodes || verificationCodes.length === 0) {
      console.log(`No matching code found for ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          valid: false,
          error: "Invalid verification code",
          errorCode: "INVALID_CODE"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const verificationCode = verificationCodes[0] as VerificationCode;

    // Check if code has already been used
    if (verificationCode.used_at) {
      console.log(`Code already used for ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          valid: false,
          error: "This code has already been used",
          errorCode: "CODE_USED"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if code has expired
    const expiresAt = new Date(verificationCode.expires_at);
    const now = new Date();
    
    if (now > expiresAt) {
      console.log(`Code expired for ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          valid: false,
          error: "This code has expired. Please request a new one.",
          errorCode: "CODE_EXPIRED"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Mark code as used
    const { error: updateError } = await supabase
      .from("verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", verificationCode.id);

    if (updateError) {
      console.error("Failed to mark code as used:", updateError);
      // Continue anyway - code is valid
    }

    // Check if user exists in auth.users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === normalizedEmail
    );

    let session = null;
    let user = null;

    if (existingUser) {
      // User exists - create a session token for them
      console.log(`Creating session for existing user: ${normalizedEmail}`);
      
      // Generate a magic link that contains session tokens
      // This uses the admin API to create a valid session
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
      });

      if (linkError || !linkData) {
        console.error("Failed to generate session link:", linkError);
        return new Response(
          JSON.stringify({ 
            success: false,
            valid: true,  // Code was valid, but session creation failed
            error: "Failed to create session",
            errorCode: "SESSION_ERROR",
            details: linkError?.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      // The hashed_token from generateLink is the token we need
      // It's not in the URL hash, it's in the properties object
      const hashed_token = linkData.properties.hashed_token;
      
      console.log("Link data keys:", Object.keys(linkData.properties));

      if (!hashed_token) {
        console.error("No hashed_token in link data. Available keys:", Object.keys(linkData.properties));
        return new Response(
          JSON.stringify({ 
            success: false,
            valid: true,
            error: "Failed to create session tokens",
            errorCode: "SESSION_ERROR",
            debug: {
              properties: Object.keys(linkData.properties),
              user: !!linkData.user
            }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      // Return the session with the hashed token
      // The client will use this token with setSession or verifyOtp
      session = {
        access_token: hashed_token,
        refresh_token: hashed_token,
        expires_in: 3600,
        token_type: 'bearer',
      };
      user = linkData.user;

      console.log(`Session created successfully for ${normalizedEmail}`);
    } else {
      // User doesn't exist - return valid code but indicate signup needed
      console.log(`User not found: ${normalizedEmail}. Signup may be required.`);
      
      // For new users, we'll let the client handle signup flow
      // The client can use the verified email to create an account
      return new Response(
        JSON.stringify({ 
          success: true,
          valid: true,
          actionData: verificationCode.action_data,
          newUser: true,
          error: "Account not found. Signup may be required.",
          errorCode: "USER_NOT_FOUND"
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Return success response with session
    const response: VerifyCodeResponse = {
      success: true,
      valid: true,
      session,
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
      },
      actionData: verificationCode.action_data,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in verify-code:", error);
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: "Internal server error",
        errorCode: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
