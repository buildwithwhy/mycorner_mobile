// Feature Gating System
// Defines features, limits, and access levels for different user tiers

// User tiers
export type UserTier = 'anonymous' | 'free' | 'premium';

// Feature identifiers
export type FeatureId =
  | 'save_places'
  | 'add_notes'
  | 'add_photos'
  | 'compare_neighborhoods'
  | 'advanced_filters'
  | 'ai_matcher'
  | 'commute_calculator'
  | 'personalized_scores'
  | 'shared_lists'
  | 'export_pdf'
  | 'unlimited_comparisons';

// Feature configuration
export interface FeatureConfig {
  id: FeatureId;
  name: string;
  description: string;
  // Which tiers have access (true = full access, number = limited, false = no access)
  access: {
    anonymous: boolean | number;
    free: boolean | number;
    premium: boolean | number;
  };
  // If limited, what's the limit for each tier?
  limits?: {
    anonymous?: number;
    free?: number;
    premium?: number;
  };
}

// Feature definitions
export const FEATURES: Record<FeatureId, FeatureConfig> = {
  save_places: {
    id: 'save_places',
    name: 'Save Places',
    description: 'Save neighborhoods to your lists',
    access: { anonymous: false, free: true, premium: true },
  },
  add_notes: {
    id: 'add_notes',
    name: 'Add Notes',
    description: 'Add personal notes to neighborhoods',
    access: { anonymous: false, free: true, premium: true },
  },
  add_photos: {
    id: 'add_photos',
    name: 'Add Photos',
    description: 'Add your own photos to neighborhoods',
    access: { anonymous: false, free: true, premium: true },
  },
  compare_neighborhoods: {
    id: 'compare_neighborhoods',
    name: 'Compare Neighborhoods',
    description: 'Compare neighborhoods side by side',
    access: { anonymous: 2, free: 3, premium: true },
    limits: { anonymous: 2, free: 3, premium: 6 }, // Premium has soft limit for UI
  },
  advanced_filters: {
    id: 'advanced_filters',
    name: 'Advanced Filters',
    description: 'Use advanced filter combinations and save presets',
    access: { anonymous: false, free: false, premium: true },
  },
  ai_matcher: {
    id: 'ai_matcher',
    name: 'AI Neighborhood Matcher',
    description: 'Get personalized neighborhood recommendations',
    access: { anonymous: false, free: false, premium: true },
  },
  commute_calculator: {
    id: 'commute_calculator',
    name: 'Commute Calculator',
    description: 'Calculate commute times from neighborhoods',
    access: { anonymous: false, free: false, premium: true },
  },
  personalized_scores: {
    id: 'personalized_scores',
    name: 'Personalized Scores',
    description: 'Weight criteria and get personalized scores',
    access: { anonymous: false, free: false, premium: true },
  },
  shared_lists: {
    id: 'shared_lists',
    name: 'Shared Lists',
    description: 'Share lists and collaborate with others',
    access: { anonymous: false, free: false, premium: true },
  },
  export_pdf: {
    id: 'export_pdf',
    name: 'Export PDF Reports',
    description: 'Download neighborhood comparisons as PDF',
    access: { anonymous: false, free: false, premium: true },
  },
  unlimited_comparisons: {
    id: 'unlimited_comparisons',
    name: 'Unlimited Comparisons',
    description: 'Compare more than 3 neighborhoods at once',
    access: { anonymous: false, free: false, premium: true },
  },
};

// Get the comparison limit for a tier
export const getComparisonLimit = (tier: UserTier): number => {
  const limits = FEATURES.compare_neighborhoods.limits;
  return limits?.[tier] ?? (tier === 'premium' ? 6 : tier === 'free' ? 3 : 2);
};

// Check if a feature is available for a tier
export const isFeatureAvailable = (featureId: FeatureId, tier: UserTier): boolean => {
  const feature = FEATURES[featureId];
  if (!feature) return false;

  const access = feature.access[tier];
  return access === true || (typeof access === 'number' && access > 0);
};

// Get the limit for a feature and tier (returns null if unlimited)
export const getFeatureLimit = (featureId: FeatureId, tier: UserTier): number | null => {
  const feature = FEATURES[featureId];
  if (!feature) return null;

  const access = feature.access[tier];
  if (access === true) {
    // Check if there's still a soft limit
    return feature.limits?.[tier] ?? null;
  }
  if (typeof access === 'number') {
    return access;
  }
  return null;
};

// Check if user has exceeded a limit
export const hasExceededLimit = (
  featureId: FeatureId,
  tier: UserTier,
  currentCount: number
): boolean => {
  const limit = getFeatureLimit(featureId, tier);
  if (limit === null) return false;
  return currentCount >= limit;
};

// Get all premium-only features
export const getPremiumFeatures = (): FeatureConfig[] => {
  return Object.values(FEATURES).filter(
    (f) => f.access.premium === true && f.access.free === false
  );
};

// Get upgrade message for a feature
export const getUpgradeMessage = (featureId: FeatureId): string => {
  const feature = FEATURES[featureId];
  if (!feature) return 'Upgrade to premium to unlock this feature.';

  return `${feature.name} is a premium feature. ${feature.description}. Upgrade to unlock!`;
};
