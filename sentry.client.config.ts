import * as Sentry from '@sentry/nextjs';

// SENTRY_DSN is a server-only env var. On the client side, @sentry/nextjs
// reads the DSN from the NEXT_PUBLIC_SENTRY_DSN env var automatically.
// If neither is available, Sentry gracefully becomes a no-op.
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  
  // Free tier optimization: sample 10% of transactions
  tracesSampleRate: 0.1,
  
  // Disable session replay on free tier (costs events)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  
  environment: process.env.NODE_ENV,
  
  // Only send errors in production, and only if DSN is available
  enabled: process.env.NODE_ENV === 'production' && !!dsn,
});
