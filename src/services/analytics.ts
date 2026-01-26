// Analytics Service
// Tracks user behavior using PostHog

import PostHog from 'posthog-react-native';
import {
  POSTHOG_API_KEY,
  POSTHOG_HOST,
  ENABLE_ANALYTICS,
  APP_ENV,
  isDevelopment,
} from '../../config';

let posthog: PostHog | null = null;

// Initialize PostHog - call this early in app startup
export const initAnalytics = async (): Promise<void> => {
  // Only initialize if analytics is enabled and API key is configured
  if (!ENABLE_ANALYTICS || !POSTHOG_API_KEY) {
    if (isDevelopment) {
      console.log('[Analytics] Disabled or not configured, skipping initialization');
    }
    return;
  }

  try {
    posthog = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      // Don't capture in development unless explicitly enabled
      disabled: !ENABLE_ANALYTICS,
    });

    // Register super properties that apply to all events
    posthog.register({
      app_env: APP_ENV,
      platform: 'mobile',
    });

    if (isDevelopment) {
      console.log('[Analytics] PostHog initialized');
    }
  } catch (error) {
    console.error('[Analytics] Failed to initialize PostHog:', error);
  }
};

// Identify user (call after login)
export const identifyUser = (
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>
): void => {
  if (!posthog) return;

  posthog.identify(userId, properties);
};

// Reset user identity (call on logout)
export const resetUser = (): void => {
  if (!posthog) return;

  posthog.reset();
};

// Track a custom event
export const trackEvent = (
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>
): void => {
  if (!posthog) return;

  posthog.capture(eventName, properties);
};

// Track screen view
export const trackScreen = (
  screenName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>
): void => {
  if (!posthog) return;

  posthog.screen(screenName, properties);
};

// ===== Pre-defined Event Helpers =====

// User actions
export const trackSignUp = (method: 'email' | 'google'): void => {
  trackEvent('user_signed_up', { method });
};

export const trackSignIn = (method: 'email' | 'google'): void => {
  trackEvent('user_signed_in', { method });
};

export const trackSignOut = (): void => {
  trackEvent('user_signed_out');
};

// Neighborhood interactions
export const trackNeighborhoodView = (
  neighborhoodId: string,
  neighborhoodName: string,
  cityId: string
): void => {
  trackEvent('neighborhood_viewed', {
    neighborhood_id: neighborhoodId,
    neighborhood_name: neighborhoodName,
    city_id: cityId,
  });
};

export const trackNeighborhoodStatusChange = (
  neighborhoodId: string,
  status: string,
  previousStatus: string | null
): void => {
  trackEvent('neighborhood_status_changed', {
    neighborhood_id: neighborhoodId,
    new_status: status,
    previous_status: previousStatus,
  });
};

export const trackNeighborhoodCompare = (neighborhoodIds: string[]): void => {
  trackEvent('neighborhoods_compared', {
    neighborhood_count: neighborhoodIds.length,
    neighborhood_ids: neighborhoodIds,
  });
};

export const trackNeighborhoodNote = (neighborhoodId: string, action: 'added' | 'updated'): void => {
  trackEvent('neighborhood_note_' + action, {
    neighborhood_id: neighborhoodId,
  });
};

export const trackPhotoAdded = (neighborhoodId: string): void => {
  trackEvent('photo_added', {
    neighborhood_id: neighborhoodId,
  });
};

// Search & filter
export const trackSearch = (query: string, resultCount: number): void => {
  trackEvent('search_performed', {
    query_length: query.length,
    result_count: resultCount,
  });
};

export const trackFilterApplied = (filterName: string, filterValue: unknown): void => {
  trackEvent('filter_applied', {
    filter_name: filterName,
    filter_value: filterValue,
  });
};

// City switching
export const trackCitySwitch = (fromCity: string, toCity: string): void => {
  trackEvent('city_switched', {
    from_city: fromCity,
    to_city: toCity,
  });
};

// Feature usage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trackFeatureUsed = (featureName: string, properties?: Record<string, any>): void => {
  trackEvent('feature_used', {
    feature_name: featureName,
    ...properties,
  });
};

// Subscription events (for paid tier)
export const trackSubscriptionStarted = (plan: string, price: number): void => {
  trackEvent('subscription_started', {
    plan,
    price,
  });
};

export const trackSubscriptionCancelled = (plan: string, reason?: string): void => {
  trackEvent('subscription_cancelled', {
    plan,
    reason,
  });
};

export const trackPaywallViewed = (source: string): void => {
  trackEvent('paywall_viewed', {
    source,
  });
};

// Shutdown analytics (call on app close if needed)
export const shutdownAnalytics = async (): Promise<void> => {
  if (posthog) {
    await posthog.flush();
  }
};

export default {
  initAnalytics,
  identifyUser,
  resetUser,
  trackEvent,
  trackScreen,
  trackSignUp,
  trackSignIn,
  trackSignOut,
  trackNeighborhoodView,
  trackNeighborhoodStatusChange,
  trackNeighborhoodCompare,
  trackNeighborhoodNote,
  trackPhotoAdded,
  trackSearch,
  trackFilterApplied,
  trackCitySwitch,
  trackFeatureUsed,
  trackSubscriptionStarted,
  trackSubscriptionCancelled,
  trackPaywallViewed,
  shutdownAnalytics,
};
