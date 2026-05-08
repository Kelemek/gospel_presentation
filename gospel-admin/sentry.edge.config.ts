import * as Sentry from "@sentry/nextjs";
import { attachSupabaseContextFromHint } from "@/lib/sentrySupabaseHintContext";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1, // Reduced to 10% for free tier

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  // Monitor Supabase operations
  beforeSend(event, hint) {
    attachSupabaseContextFromHint(hint, false);
    return event;
  },
});
