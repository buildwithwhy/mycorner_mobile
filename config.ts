// Configuration file for API keys and settings
// Environment variables are loaded from .env files and exposed via expo-constants
//
// Environment files:
// - .env.development  (local dev)
// - .env.staging      (staging/testing)
// - .env.production   (production builds)
//
// Switch environments: APP_ENV=staging npx expo start

import Constants from 'expo-constants';

// Current environment
export type AppEnvironment = 'development' | 'staging' | 'production';
export const APP_ENV: AppEnvironment = (Constants.expoConfig?.extra?.appEnv as AppEnvironment) || 'development';

// Environment checks
export const isDevelopment = APP_ENV === 'development';
export const isStaging = APP_ENV === 'staging';
export const isProduction = APP_ENV === 'production';

// Google Maps API Key
export const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || '';

// Supabase configuration
export const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || '';
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || '';

// Feature flags
export const ENABLE_DEBUG_LOGGING = Constants.expoConfig?.extra?.enableDebugLogging ?? isDevelopment;
export const ENABLE_ANALYTICS = Constants.expoConfig?.extra?.enableAnalytics ?? isProduction;

// Sentry error tracking
export const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn || '';

// PostHog analytics
export const POSTHOG_API_KEY = Constants.expoConfig?.extra?.posthogApiKey || '';
export const POSTHOG_HOST = Constants.expoConfig?.extra?.posthogHost || 'https://app.posthog.com';

// RevenueCat subscriptions
export const REVENUECAT_API_KEY_IOS = Constants.expoConfig?.extra?.revenueCatApiKeyIos || '';
export const REVENUECAT_API_KEY_ANDROID = Constants.expoConfig?.extra?.revenueCatApiKeyAndroid || '';

// App metadata URLs
export const PRIVACY_POLICY_URL = Constants.expoConfig?.extra?.privacyPolicyUrl || '';
export const TERMS_OF_SERVICE_URL = Constants.expoConfig?.extra?.termsOfServiceUrl || '';

// Validate required configuration
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!SUPABASE_URL) {
    errors.push('SUPABASE_URL is not configured');
  }
  if (!SUPABASE_ANON_KEY) {
    errors.push('SUPABASE_ANON_KEY is not configured');
  }
  if (!GOOGLE_MAPS_API_KEY) {
    errors.push('GOOGLE_MAPS_API_KEY is not configured');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Log current configuration (for debugging)
export const logConfig = (): void => {
  if (ENABLE_DEBUG_LOGGING) {
    console.log('=== App Configuration ===');
    console.log('Environment:', APP_ENV);
    console.log('Supabase URL:', SUPABASE_URL ? '(configured)' : '(missing)');
    console.log('Supabase Key:', SUPABASE_ANON_KEY ? '(configured)' : '(missing)');
    console.log('Google Maps:', GOOGLE_MAPS_API_KEY ? '(configured)' : '(missing)');
    console.log('Debug Logging:', ENABLE_DEBUG_LOGGING);
    console.log('Analytics:', ENABLE_ANALYTICS);
    console.log('========================');
  }
};
