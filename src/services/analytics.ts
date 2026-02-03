// Analytics Service
// Tracks user behavior using PostHog
// PostHog is initialized via PostHogProvider in App.tsx

import { usePostHog } from 'posthog-react-native';

// ===== Hook for components =====
export { usePostHog };

// ===== Pre-defined Event Helpers =====
// These are meant to be used with the usePostHog hook in components

// User actions
export const trackSignUp = (posthog: ReturnType<typeof usePostHog>, method: 'email' | 'google'): void => {
  posthog?.capture('user_signed_up', { method });
};

export const trackSignIn = (posthog: ReturnType<typeof usePostHog>, method: 'email' | 'google'): void => {
  posthog?.capture('user_signed_in', { method });
};

export const trackSignOut = (posthog: ReturnType<typeof usePostHog>): void => {
  posthog?.capture('user_signed_out');
};

// Neighborhood interactions
export const trackNeighborhoodView = (
  posthog: ReturnType<typeof usePostHog>,
  neighborhoodId: string,
  neighborhoodName: string,
  cityId: string
): void => {
  posthog?.capture('neighborhood_viewed', {
    neighborhood_id: neighborhoodId,
    neighborhood_name: neighborhoodName,
    city_id: cityId,
  });
};

export const trackNeighborhoodStatusChange = (
  posthog: ReturnType<typeof usePostHog>,
  neighborhoodId: string,
  status: string,
  previousStatus: string | null
): void => {
  posthog?.capture('neighborhood_status_changed', {
    neighborhood_id: neighborhoodId,
    new_status: status,
    previous_status: previousStatus,
  });
};

export const trackNeighborhoodCompare = (
  posthog: ReturnType<typeof usePostHog>,
  neighborhoodIds: string[]
): void => {
  posthog?.capture('neighborhoods_compared', {
    neighborhood_count: neighborhoodIds.length,
    neighborhood_ids: neighborhoodIds,
  });
};

export const trackNeighborhoodNote = (
  posthog: ReturnType<typeof usePostHog>,
  neighborhoodId: string,
  action: 'added' | 'updated'
): void => {
  posthog?.capture('neighborhood_note_' + action, {
    neighborhood_id: neighborhoodId,
  });
};

export const trackPhotoAdded = (
  posthog: ReturnType<typeof usePostHog>,
  neighborhoodId: string
): void => {
  posthog?.capture('photo_added', {
    neighborhood_id: neighborhoodId,
  });
};

// Search & filter
export const trackSearch = (
  posthog: ReturnType<typeof usePostHog>,
  query: string,
  resultCount: number
): void => {
  posthog?.capture('search_performed', {
    query_length: query.length,
    result_count: resultCount,
  });
};

export const trackFilterApplied = (
  posthog: ReturnType<typeof usePostHog>,
  filterName: string,
  filterValue: string | number | boolean
): void => {
  posthog?.capture('filter_applied', {
    filter_name: filterName,
    filter_value: filterValue,
  });
};

// City switching
export const trackCitySwitch = (
  posthog: ReturnType<typeof usePostHog>,
  fromCity: string,
  toCity: string
): void => {
  posthog?.capture('city_switched', {
    from_city: fromCity,
    to_city: toCity,
  });
};

// Feature usage
export const trackFeatureUsed = (
  posthog: ReturnType<typeof usePostHog>,
  featureName: string,
  properties?: Record<string, string | number | boolean>
): void => {
  posthog?.capture('feature_used', {
    feature_name: featureName,
    ...properties,
  });
};

// Subscription events
export const trackSubscriptionStarted = (
  posthog: ReturnType<typeof usePostHog>,
  plan: string,
  price: number
): void => {
  posthog?.capture('subscription_started', {
    plan,
    price,
  });
};

export const trackSubscriptionCancelled = (
  posthog: ReturnType<typeof usePostHog>,
  plan: string,
  reason?: string
): void => {
  posthog?.capture('subscription_cancelled', {
    plan,
    reason: reason ?? '',
  });
};

export const trackPaywallViewed = (
  posthog: ReturnType<typeof usePostHog>,
  source: string
): void => {
  posthog?.capture('paywall_viewed', {
    source,
  });
};

export const trackScreen = (
  posthog: ReturnType<typeof usePostHog>,
  screenName: string,
  properties?: Record<string, string | number | boolean>
): void => {
  posthog?.screen(screenName, properties);
};
