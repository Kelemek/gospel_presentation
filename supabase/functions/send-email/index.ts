// Microsoft Graph Email Sending Edge Function
// Based on: https://github.com/Kelemek/angular_prayerapp
// Purpose: Send emails via Microsoft Graph API with OAuth2 client credentials
// Features: Token caching, BCC batching, single/bulk email support

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface EmailRequest {
  to?: string | string[];           // Single or multiple recipients
  bcc?: string[];                   // BCC recipients for bulk sends
  subject: string;
  body: string;
  isHtml?: boolean;
}

interface GraphTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;  // Unix timestamp in milliseconds
}

// ============================================================================
// Configuration
// ============================================================================

const GRAPH_TOKEN_URL = (tenantId: string) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
const GRAPH_SEND_MAIL_URL = (fromAddress: string) =>
  `https://graph.microsoft.com/v1.0/users/${fromAddress}/sendMail`;

// Token is cached for 55 minutes (tokens last 60min, we refresh at 55)
const TOKEN_CACHE_DURATION = 55 * 60 * 1000;

// Microsoft Graph rate limits: 30 emails per minute
const BATCH_SIZE = 500;  // Max BCC recipients per email
const BATCH_DELAY_MS = 2000;  // 2 seconds between batches

// Global token cache (persists across function invocations in the same instance)
let tokenCache: CachedToken | null = null;

// ============================================================================
// Microsoft Graph OAuth Token Management
// ============================================================================

/**
 * Get a valid Microsoft Graph API access token
 * Uses cached token if still valid, otherwise fetches new one
 */
async function getGraphAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    console.log("Using cached Microsoft Graph token");
    return tokenCache.token;
  }

  console.log("Fetching new Microsoft Graph token");

  // Request new token using client credentials flow
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(GRAPH_TOKEN_URL(tenantId), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Graph token error:", errorText);
    throw new Error(`Failed to get Graph token: ${response.status} ${errorText}`);
  }

  const data: GraphTokenResponse = await response.json();

  // Cache the token (expires in 55 minutes)
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + TOKEN_CACHE_DURATION,
  };

  return data.access_token;
}

// ============================================================================
// Email Sending Functions
// ============================================================================

/**
 * Send a single email via Microsoft Graph API
 */
async function sendSingleEmail(
  accessToken: string,
  fromAddress: string,
  fromName: string,
  to: string | string[],
  subject: string,
  body: string,
  isHtml: boolean,
  bcc?: string[]
): Promise<void> {
  // Prepare recipients
  const toRecipients = (Array.isArray(to) ? to : [to]).map((email) => ({
    emailAddress: { address: email },
  }));

  const bccRecipients = (bcc || []).map((email) => ({
    emailAddress: { address: email },
  }));

  // Construct message payload
  const message = {
    message: {
      subject,
      body: {
        contentType: isHtml ? "HTML" : "Text",
        content: body,
      },
      from: {
        emailAddress: {
          address: fromAddress,
          name: fromName,
        },
      },
      toRecipients,
      ...(bccRecipients.length > 0 && { bccRecipients }),
    },
    saveToSentItems: false,  // Don't clutter sent items for automated emails
  };

  const response = await fetch(GRAPH_SEND_MAIL_URL(fromAddress), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Graph send mail error:", errorText);
    throw new Error(`Failed to send email: ${response.status} ${errorText}`);
  }

  console.log(`Email sent successfully to: ${Array.isArray(to) ? to.join(", ") : to}`);
}

/**
 * Send bulk emails in batches using BCC
 * Respects Microsoft Graph rate limits (30 emails/min)
 */
async function sendBulkEmails(
  accessToken: string,
  fromAddress: string,
  fromName: string,
  bccList: string[],
  subject: string,
  body: string,
  isHtml: boolean
): Promise<void> {
  console.log(`Sending bulk email to ${bccList.length} recipients in batches`);

  // Split recipients into batches of BATCH_SIZE
  const batches: string[][] = [];
  for (let i = 0; i < bccList.length; i += BATCH_SIZE) {
    batches.push(bccList.slice(i, i + BATCH_SIZE));
  }

  // Send each batch with delay between them
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Sending batch ${i + 1}/${batches.length} (${batch.length} recipients)`);

    await sendSingleEmail(
      accessToken,
      fromAddress,
      fromName,
      fromAddress,  // Send to self as primary recipient
      subject,
      body,
      isHtml,
      batch  // BCC list
    );

    // Wait between batches to respect rate limits (except for last batch)
    if (i < batches.length - 1) {
      console.log(`Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`Bulk email complete: sent to ${bccList.length} recipients`);
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body
    const emailRequest: EmailRequest = await req.json();
    const { to, bcc, subject, body, isHtml = true } = emailRequest;

    // Validate request
    if (!subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject, body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!to && (!bcc || bcc.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Must provide either 'to' or 'bcc' recipients" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const tenantId = Deno.env.get("MICROSOFT_GRAPH_TENANT_ID");
    const clientId = Deno.env.get("MICROSOFT_GRAPH_CLIENT_ID");
    const clientSecret = Deno.env.get("MICROSOFT_GRAPH_CLIENT_SECRET");
    const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS");
    const fromName = Deno.env.get("EMAIL_FROM_NAME") || "Gospel Presentation";

    // Validate environment configuration
    if (!tenantId || !clientId || !clientSecret || !fromAddress) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({
          error: "Server configuration error: missing Microsoft Graph credentials",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get access token
    const accessToken = await getGraphAccessToken(tenantId, clientId, clientSecret);

    // Determine sending mode: single or bulk
    if (bcc && bcc.length > 0 && !to) {
      // Bulk mode: use BCC batching
      await sendBulkEmails(
        accessToken,
        fromAddress,
        fromName,
        bcc,
        subject,
        body,
        isHtml
      );
    } else {
      // Single/standard mode
      await sendSingleEmail(
        accessToken,
        fromAddress,
        fromName,
        to!,
        subject,
        body,
        isHtml,
        bcc
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email sending error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
