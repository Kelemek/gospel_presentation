import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1, // Reduced to 10% for free tier

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  // Monitor Supabase operations
  beforeSend(event, hint) {
    // Add Supabase context to errors
    if (hint.originalException) {
      const error = hint.originalException as any;
      if (error?.message?.includes('supabase') || error?.code) {
        Sentry.setContext('supabase', {
          errorCode: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message,
        });
      }
    }
    return event;
  },
});
