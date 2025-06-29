import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry once
if (typeof window !== 'undefined' && !window.__sentryInit__) {
  window.__sentryInit__ = true;
  window.__sentryReplayInit__ = true;
  
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // Set tracesSampleRate to 1.0 to capture 100% of transactions
    // We recommend adjusting this value in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture replay sessions
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    debug: false,

    integrations: [
      // Automatically instrument your app
      ...(typeof window !== 'undefined' && !window.__sentryReplayInit__ ? [
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ] : []),
    ],

    // Filter out certain errors
    beforeSend(event, hint) {
      // Filter out non-critical errors
      if (event.exception) {
        const error = hint.originalException as any;
        // Filter out canceled requests
        if (error && error.message && error.message.includes('ERR_CANCELED')) {
          return null;
        }
        // Filter out font loading errors
        if (error && error.message && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('Geist.ttf') ||
          error.message.includes('Failed to load resource')
        )) {
          return null;
        }
      }
      return event;
    },
  });
}

// Type declaration for window
declare global {
  interface Window {
    __sentryInit__?: boolean;
    __sentryReplayInit__?: boolean;
  }
}