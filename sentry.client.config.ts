import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Free tier optimization: sample 10% of transactions
  tracesSampleRate: 0.1,
  
  // Disable session replay on free tier (costs events)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  
  environment: process.env.NODE_ENV,
  
  // Only send errors in production
  enabled: process.env.NODE_ENV === 'production',
});
