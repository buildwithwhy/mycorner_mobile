// Sentry Error Tracking Service
// Initializes Sentry for crash reporting and error tracking

import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, APP_ENV, isProduction, isDevelopment } from '../../config';

// Initialize Sentry - call this early in app startup
export const initSentry = (): void => {
  // Only initialize if DSN is configured
  if (!SENTRY_DSN) {
    if (isDevelopment) {
      console.log('[Sentry] DSN not configured, skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,

    // Enable debug mode in development
    debug: isDevelopment,

    // Set sample rates
    tracesSampleRate: isProduction ? 0.2 : 1.0, // 20% in prod, 100% in dev

    // Don't send events in development unless explicitly configured
    enabled: isProduction || !!SENTRY_DSN,

    // Attach user info when available
    beforeSend(event) {
      // You can modify or filter events here
      // For example, remove sensitive data
      return event;
    },
  });

  if (isDevelopment) {
    console.log('[Sentry] Initialized for environment:', APP_ENV);
  }
};

// Capture an exception manually
export const captureException = (error: Error, context?: Record<string, unknown>): void => {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};

// Capture a message
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info'): void => {
  Sentry.captureMessage(message, level);
};

// Set user context (call after login)
export const setUser = (user: { id: string; email?: string; username?: string } | null): void => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
};

// Add breadcrumb for debugging
export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, unknown>
): void => {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
};

// Set custom tag
export const setTag = (key: string, value: string): void => {
  Sentry.setTag(key, value);
};

// Wrap a component with Sentry error boundary
export const withErrorBoundary = Sentry.withErrorBoundary;

// Export the wrap function for navigation
export const wrap = Sentry.wrap;

export default {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  setTag,
  withErrorBoundary,
  wrap,
};
