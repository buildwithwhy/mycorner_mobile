// Subscription Configuration
// Single source of truth for all subscription-related settings

// ============================================================================
// PRODUCT CONFIGURATION
// These IDs must match exactly what's configured in:
// - App Store Connect (iOS)
// - Google Play Console (Android)
// ============================================================================

export const PRODUCTS = {
  // Subscription product IDs - same on both platforms for simplicity
  MONTHLY: 'mycorner_premium_monthly',
  YEARLY: 'mycorner_premium_yearly',
} as const;

export type ProductId = typeof PRODUCTS[keyof typeof PRODUCTS];

// ============================================================================
// ENTITLEMENT CONFIGURATION
// Entitlements are configured in RevenueCat dashboard
// They map products to access levels
// ============================================================================

export const ENTITLEMENTS = {
  PREMIUM: 'Kallidao', // Main premium entitlement (matches RevenueCat)
} as const;

export type EntitlementId = typeof ENTITLEMENTS[keyof typeof ENTITLEMENTS];

// ============================================================================
// SUBSCRIPTION STATES
// ============================================================================

export type SubscriptionStatus =
  | 'none'           // No subscription
  | 'active'         // Active subscription
  | 'trial'          // In free trial
  | 'grace_period'   // Billing issue, still has access
  | 'expired'        // Subscription expired
  | 'cancelled';     // Cancelled but still active until period end

export interface SubscriptionState {
  status: SubscriptionStatus;
  productId: ProductId | null;
  expiresAt: Date | null;
  willRenew: boolean;
  isProUser: boolean; // Convenience flag
}

export const DEFAULT_SUBSCRIPTION_STATE: SubscriptionState = {
  status: 'none',
  productId: null,
  expiresAt: null,
  willRenew: false,
  isProUser: false,
};

// ============================================================================
// DEV/TEST MODE
// Set to true to bypass subscription checks during development
// IMPORTANT: Set to false before production release!
// ============================================================================

export const DEV_MODE = {
  // Unlock all features without subscription (for testing)
  // Set to false to test paywall flow, true to bypass for development
  BYPASS_SUBSCRIPTION: false, // __DEV__ - temporarily disabled for testing

  // Show debug logs for subscription events
  VERBOSE_LOGGING: __DEV__,

  // Use sandbox/test environment
  USE_SANDBOX: __DEV__,
};

// ============================================================================
// FEATURE DEFINITIONS
// Maps features to whether they require Pro subscription
// ============================================================================

export type FeatureKey =
  | 'ai_matcher'
  | 'unlimited_comparisons'
  | 'unlimited_destinations'
  | 'personalized_scores'
  | 'save_places'
  | 'add_notes'
  | 'add_photos'
  | 'sharing'
  | 'explore_spots'
  | 'full_nearby_results'
  | 'save_itinerary';

export interface FeatureDefinition {
  name: string;
  description: string;
  requiresPro: boolean;
  requiresLogin: boolean;
  freeLimit?: number;
  proLimit?: number;
}

export const FEATURES: Record<FeatureKey, FeatureDefinition> = {
  // Free features (login required)
  save_places: {
    name: 'Save Places',
    description: 'Save neighborhoods to your lists',
    requiresPro: false,
    requiresLogin: true,
  },
  add_notes: {
    name: 'Add Notes',
    description: 'Add personal notes to neighborhoods',
    requiresPro: false,
    requiresLogin: true,
  },
  add_photos: {
    name: 'Add Photos',
    description: 'Add your own photos to neighborhoods',
    requiresPro: false,
    requiresLogin: true,
  },
  sharing: {
    name: 'Share',
    description: 'Share neighborhoods with friends',
    requiresPro: false,
    requiresLogin: false,
  },

  // Premium features
  ai_matcher: {
    name: 'AI Neighborhood Matcher',
    description: 'Get personalized recommendations based on your lifestyle',
    requiresPro: true,
    requiresLogin: true,
  },
  unlimited_comparisons: {
    name: 'Unlimited Comparisons',
    description: 'Compare up to 10 neighborhoods side by side',
    requiresPro: true,
    requiresLogin: false,
    freeLimit: 2,
    proLimit: 10,
  },
  personalized_scores: {
    name: 'Personalized Scoring',
    description: 'Weight criteria and get custom match scores',
    requiresPro: true,
    requiresLogin: false,
  },
  unlimited_destinations: {
    name: 'Unlimited Destinations',
    description: 'Add as many commute destinations as you need',
    requiresPro: true,
    requiresLogin: true,
    freeLimit: 1,
    proLimit: undefined, // Unlimited
  },

  // Explore & Itinerary features
  explore_spots: {
    name: 'Explore Local Spots',
    description: 'Discover local businesses and landmarks',
    requiresPro: false,
    requiresLogin: false,
  },
  full_nearby_results: {
    name: 'Full Search Results',
    description: 'See all nearby places, not just the top 5',
    requiresPro: true,
    requiresLogin: false,
    freeLimit: 5,
    proLimit: 20,
  },
  save_itinerary: {
    name: 'Save Itineraries',
    description: 'Save and revisit your planned routes',
    requiresPro: false,
    requiresLogin: true,
    freeLimit: 1,
    proLimit: undefined,
  },
};

// Get all pro features for display on paywall
export const getPremiumFeatures = (): FeatureDefinition[] => {
  return Object.values(FEATURES).filter(f => f.requiresPro);
};

// Check if a feature requires pro
export const featureRequiresPro = (feature: FeatureKey): boolean => {
  return FEATURES[feature]?.requiresPro ?? false;
};

// Get feature limit for current subscription status
export const getFeatureLimit = (feature: FeatureKey, isPro: boolean): number | null => {
  const def = FEATURES[feature];
  if (!def) return null;
  if (isPro) return def.proLimit ?? null;
  return def.freeLimit ?? null;
};

