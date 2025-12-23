// Send Verification Code Edge Function
// Based on: https://github.com/Kelemek/angular_prayerapp
// Purpose: Generate and send email verification codes for authentication
// Flow: Generate code → Store in DB → Send email → Return codeId

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface SendCodeRequest {
  email: string;
  actionType?: "user_login" | "admin_login" | "counselor_login" | "password_reset" | "email_verification";
  actionData?: Record<string, any>;
}

interface SendCodeResponse {
  success: boolean;
  codeId?: string;
  expiresAt?: string;
  error?: string;
}

interface AdminSettings {
  verification_code_length: number;
  verification_code_expiry_minutes: number;
  enable_verification_code_login: boolean;
}

// ============================================================================
// Code Generation
// ============================================================================

/**
 * Generate a random numeric verification code
 * @param length - Number of digits (4, 6, or 8)
 */
function generateVerificationCode(length: number): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  return code.toString().padStart(length, "0");
}

// ============================================================================
// Email Template
// ============================================================================

/**
 * Generate HTML email body for verification code
 */
function generateEmailBody(code: string, expiryMinutes: number, appName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Verification Code</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        h1 {
          color: #2c5282;
          font-size: 24px;
          margin: 0 0 10px 0;
        }
        .code-container {
          background-color: #f7fafc;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 30px;
          text-align: center;
          margin: 30px 0;
        }
        .code {
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #2d3748;
          font-family: 'Courier New', monospace;
        }
        .expiry {
          color: #718096;
          font-size: 14px;
          margin-top: 15px;
        }
        .warning {
          background-color: #fff5f5;
          border-left: 4px solid #fc8181;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning-text {
          color: #c53030;
          font-size: 14px;
          margin: 0;
        }
        .footer {
          text-align: center;
          color: #a0aec0;
          font-size: 12px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
          <p>Your verification code is ready</p>
        </div>
        
        <p>Hello,</p>
        <p>You requested to sign in to your account. Use the verification code below to complete your login:</p>
        
        <div class="code-container">
          <div class="code">${code}</div>
          <div class="expiry">This code expires in ${expiryMinutes} minutes</div>
        </div>
        
        <div class="warning">
          <p class="warning-text">
            <strong>Security Notice:</strong> If you didn't request this code, please ignore this email. 
            Do not share this code with anyone.
          </p>
        </div>
        
        <p>If you're having trouble logging in, please contact support.</p>
        
        <div class="footer">
          <p>This is an automated message from ${appName}.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
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
    const requestData: SendCodeRequest = await req.json();
    const { email, actionType = "user_login", actionData = {} } = requestData;

    // Validate email
    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email address is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get admin settings for code configuration
    const { data: settings, error: settingsError } = await supabase
      .from("admin_settings")
      .select("verification_code_length, verification_code_expiry_minutes, enable_verification_code_login")
      .eq("id", 1)
      .single();

    if (settingsError) {
      console.error("Failed to fetch admin settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch configuration" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const adminSettings = settings as AdminSettings;

    // Check if verification code login is enabled
    if (!adminSettings.enable_verification_code_login) {
      return new Response(
        JSON.stringify({ error: "Verification code login is currently disabled" }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Generate verification code
    const codeLength = adminSettings.verification_code_length || 6;
    const expiryMinutes = adminSettings.verification_code_expiry_minutes || 15;
    const code = generateVerificationCode(codeLength);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    // Store verification code in database
    const { data: verificationCode, error: insertError } = await supabase
      .from("verification_codes")
      .insert({
        email: normalizedEmail,
        code,
        action_type: actionType,
        action_data: actionData,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to insert verification code:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate verification code" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Send email via send-email function
    const appName = Deno.env.get("APP_NAME") || "Gospel Presentation";
    const emailBody = generateEmailBody(code, expiryMinutes, appName);

    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    const emailResponse = await fetch(sendEmailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: normalizedEmail,
        subject: `Your ${appName} Verification Code: ${code}`,
        body: emailBody,
        isHtml: true,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Failed to send email:", errorText);
      
      // Delete the verification code since email failed
      await supabase
        .from("verification_codes")
        .delete()
        .eq("id", verificationCode.id);

      return new Response(
        JSON.stringify({ error: "Failed to send verification email" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Verification code sent to ${normalizedEmail}`);

    // Return success response
    const response: SendCodeResponse = {
      success: true,
      codeId: verificationCode.id,
      expiresAt,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
