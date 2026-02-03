// Subscription Configuration
// Single source of truth for all subscription-related settings

import { Platform } from 'react-native';

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
  LIFETIME: 'mycorner_premium_lifetime',
} as const;

export type ProductId = typeof PRODUCTS[keyof typeof PRODUCTS];

// All product IDs as array (for fetching)
export const ALL_PRODUCT_IDS: ProductId[] = [PRODUCTS.MONTHLY, PRODUCTS.YEARLY, PRODUCTS.LIFETIME];

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
// PRICING DISPLAY (fallback when store prices unavailable)
// ============================================================================

export const FALLBACK_PRICING = {
  [PRODUCTS.MONTHLY]: {
    price: Platform.OS === 'ios' ? 4.99 : 4.99,
    currency: Platform.OS === 'ios' ? 'USD' : 'USD',
    period: 'month' as const,
  },
  [PRODUCTS.YEARLY]: {
    price: Platform.OS === 'ios' ? 39.99 : 39.99,
    currency: Platform.OS === 'ios' ? 'USD' : 'USD',
    period: 'year' as const,
  },
  [PRODUCTS.LIFETIME]: {
    price: Platform.OS === 'ios' ? 99.99 : 99.99,
    currency: Platform.OS === 'ios' ? 'USD' : 'USD',
    period: 'lifetime' as const,
  },
};

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
  | 'sharing';

interface FeatureDefinition {
  name: string;
  description: string;
  requiresPro: boolean;
  // For limited features: how many can free users access?
  freeLimit?: number;
  proLimit?: number;
}

export const FEATURES: Record<FeatureKey, FeatureDefinition> = {
  // Free features
  save_places: {
    name: 'Save Places',
    description: 'Save neighborhoods to your lists',
    requiresPro: false,
  },
  add_notes: {
    name: 'Add Notes',
    description: 'Add personal notes to neighborhoods',
    requiresPro: false,
  },
  add_photos: {
    name: 'Add Photos',
    description: 'Add your own photos to neighborhoods',
    requiresPro: false,
  },
  sharing: {
    name: 'Share',
    description: 'Share neighborhoods with friends',
    requiresPro: false,
  },

  // Premium features (only list features that actually exist)
  ai_matcher: {
    name: 'AI Neighborhood Matcher',
    description: 'Get personalized recommendations based on your lifestyle',
    requiresPro: true,
  },
  unlimited_comparisons: {
    name: 'Unlimited Comparisons',
    description: 'Compare up to 10 neighborhoods side by side',
    requiresPro: true,
    freeLimit: 2,
    proLimit: 10,
  },
  personalized_scores: {
    name: 'Personalized Scoring',
    description: 'Weight criteria and get custom match scores',
    requiresPro: true,
  },
  unlimited_destinations: {
    name: 'Unlimited Destinations',
    description: 'Add as many commute destinations as you need',
    requiresPro: true,
    freeLimit: 1,
    proLimit: undefined, // Unlimited
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

// ============================================================================
// BACKWARDS COMPATIBILITY
// These types and functions maintain compatibility with existing code
// ============================================================================

// Legacy tier type (used by StatusComparisonContext)
export type UserTier = 'anonymous' | 'free' | 'premium';

// Comparison limits by tier
const COMPARISON_LIMITS: Record<UserTier, number> = {
  anonymous: 2,
  free: 2,
  premium: 10,
};

// Get comparison limit for a tier
export const getComparisonLimit = (tier: UserTier): number => {
  return COMPARISON_LIMITS[tier];
};
